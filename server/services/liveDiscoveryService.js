/**
 * Live Discovery Service
 *
 * SOOP과 Chzzk의 모든 라이브 방송을 주기적으로 발견하고,
 * 상위 N개 채널에 자동으로 WebSocket 연결하여 채팅/후원 데이터를 수집합니다.
 *
 * 기능:
 * 1. 전체 라이브 방송 목록 API 폴링 (5분마다)
 * 2. 모든 방송 정보를 Snowflake에 저장
 * 3. 상위 N개 채널에 WebSocket 자동 연결
 * 4. 연결 로테이션 (방송 종료 시 다음 채널로 교체)
 */

const { logger } = require("./logger");
const { getSnowflakeService } = require("./snowflakeService");

class LiveDiscoveryService {
  constructor(options = {}) {
    // Configuration - 플랫폼별 최대 연결 수 (SOOP 500 + Chzzk 500 = 1000)
    this.maxConnectionsPerPlatform = options.maxConnectionsPerPlatform || 500;
    this.discoveryInterval = options.discoveryInterval || 5 * 60 * 1000; // 5분
    this.connectionBatchSize = options.connectionBatchSize || 50; // 한 번에 연결할 채널 수
    this.connectionDelay = options.connectionDelay || 500; // 연결 간 딜레이 (ms)

    // State
    this.isRunning = false;
    this.discoveryTimer = null;
    this.activeConnections = new Map(); // channelKey -> { adapter, platform, channelId, viewerCount }
    this.pendingConnections = new Set(); // 연결 진행 중인 채널
    this.lastDiscovery = null;
    this.stats = {
      totalDiscovered: { soop: 0, chzzk: 0 },
      activeConnections: { soop: 0, chzzk: 0 },
      totalEvents: { soop: 0, chzzk: 0 },
      lastError: null,
    };

    // Dependencies (set via setDependencies)
    this.io = null;
    this.SoopAdapter = null;
    this.ChzzkAdapter = null;
    this.normalizer = null;
  }

  /**
   * 의존성 주입
   */
  setDependencies({ io, SoopAdapter, ChzzkAdapter, normalizer }) {
    this.io = io;
    this.SoopAdapter = SoopAdapter;
    this.ChzzkAdapter = ChzzkAdapter;
    this.normalizer = normalizer;
  }

  /**
   * 서비스 시작
   */
  async start() {
    if (this.isRunning) {
      logger.warn("[discovery] Service already running");
      return;
    }

    if (!this.SoopAdapter || !this.ChzzkAdapter) {
      throw new Error("Dependencies not set. Call setDependencies first.");
    }

    this.isRunning = true;
    logger.info("[discovery] Starting Live Discovery Service", {
      maxConnectionsPerPlatform: this.maxConnectionsPerPlatform,
      totalMaxConnections: this.maxConnectionsPerPlatform * 2,
      discoveryInterval: this.discoveryInterval / 1000 + "s",
    });

    // 즉시 첫 발견 실행
    try {
      await this.discover();
    } catch (err) {
      logger.error("[discovery] First discover failed:", { error: err.message, stack: err.stack });
      throw err;
    }

    // 주기적 발견 시작
    this.discoveryTimer = setInterval(() => {
      this.discover().catch((err) => {
        logger.error("[discovery] Discovery error:", err.message);
        this.stats.lastError = err.message;
      });
    }, this.discoveryInterval);

    return this.getStatus();
  }

  /**
   * 서비스 중지
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }

    logger.info("[discovery] Stopping Live Discovery Service");

    // 타이머 정지
    if (this.discoveryTimer) {
      clearInterval(this.discoveryTimer);
      this.discoveryTimer = null;
    }

    // 모든 연결 해제
    for (const [key, conn] of this.activeConnections) {
      try {
        conn.adapter.disconnect();
      } catch (err) {
        logger.warn(`[discovery] Error disconnecting ${key}:`, err.message);
      }
    }
    this.activeConnections.clear();
    this.pendingConnections.clear();

    this.isRunning = false;
    this.stats.activeConnections = { soop: 0, chzzk: 0 };

    logger.info("[discovery] Service stopped");
    return this.getStatus();
  }

  /**
   * 방송 발견 및 연결 관리
   */
  async discover() {
    const startTime = Date.now();
    logger.info("[discovery] Starting broadcast discovery...");

    try {
      // 1. 두 플랫폼에서 라이브 방송 목록 조회 (병렬)
      const [soopBroadcasts, chzzkBroadcasts] = await Promise.all([
        this.SoopAdapter.getAllLiveBroadcasts(1000),
        this.ChzzkAdapter.getAllLiveBroadcasts(1000),
      ]);

      this.stats.totalDiscovered.soop = soopBroadcasts.length;
      this.stats.totalDiscovered.chzzk = chzzkBroadcasts.length;

      logger.info("[discovery] Discovered broadcasts", {
        soop: soopBroadcasts.length,
        chzzk: chzzkBroadcasts.length,
      });

      // 2. 모든 방송 정보를 Snowflake에 저장 (백그라운드, 논블로킹)
      this.saveBroadcastsToSnowflake(soopBroadcasts, chzzkBroadcasts);

      // 3. 플랫폼별로 중복 제거 및 상위 N개 선택
      const deduplicateAndSelectTop = (broadcasts, platform, limit) => {
        const seenChannels = new Set();
        const unique = broadcasts.filter((b) => {
          if (seenChannels.has(b.channelId)) {
            return false;
          }
          seenChannels.add(b.channelId);
          return true;
        });
        // 시청자순 정렬 후 상위 N개
        unique.sort((a, b) => b.viewerCount - a.viewerCount);
        return unique.slice(0, limit);
      };

      const topSoop = deduplicateAndSelectTop(soopBroadcasts, "soop", this.maxConnectionsPerPlatform);
      const topChzzk = deduplicateAndSelectTop(chzzkBroadcasts, "chzzk", this.maxConnectionsPerPlatform);

      logger.info(`[discovery] Top channels selected`, {
        soop: `${topSoop.length}/${soopBroadcasts.length}`,
        chzzk: `${topChzzk.length}/${chzzkBroadcasts.length}`,
        total: topSoop.length + topChzzk.length,
      });

      // 4. 플랫폼별 연결 목표 합치기
      const topChannels = [...topSoop, ...topChzzk];

      // 5. 연결 관리 (새 연결, 종료된 연결 정리)
      await this.manageConnections(topChannels);

      this.lastDiscovery = new Date().toISOString();
      const duration = Date.now() - startTime;
      logger.info("[discovery] Discovery completed", {
        duration: duration + "ms",
        activeConnections: this.activeConnections.size,
      });

    } catch (error) {
      logger.error("[discovery] Discovery failed:", error.message);
      this.stats.lastError = error.message;
      throw error;
    }
  }

  /**
   * 방송 정보를 Snowflake에 저장 (비동기, 논블로킹)
   * 연결 작업을 차단하지 않도록 백그라운드에서 실행
   */
  saveBroadcastsToSnowflake(soopBroadcasts, chzzkBroadcasts) {
    const snowflake = getSnowflakeService();
    if (!snowflake.isConnected) {
      return;
    }

    // 백그라운드에서 비동기 저장 실행
    setImmediate(async () => {
      try {
        // === 1. 스트리머 먼저 저장하고 person_id 맵 생성 ===
        const personIdMap = new Map(); // channelId -> person_id
        const seenStreamers = new Set();
        const streamersToSave = [];

        for (const b of [...soopBroadcasts, ...chzzkBroadcasts]) {
          const platform = b.platform || (b.broadNo ? "soop" : "chzzk");
          const key = `${platform}:${b.channelId}`;
          if (!seenStreamers.has(key)) {
            seenStreamers.add(key);
            streamersToSave.push({
              platform,
              channelId: b.channelId,
              streamerId: b.streamerId || b.bjId || b.channelId,
              nickname: b.nickname || b.bjNickname,
              profileImageUrl: b.profileImageUrl,
            });
          }
        }

        // 상위 200개 스트리머 저장 (병렬 10개씩)
        const streamers = streamersToSave.slice(0, 200);
        for (let i = 0; i < streamers.length; i += 10) {
          const batch = streamers.slice(i, i + 10);
          const results = await Promise.all(
            batch.map(async (streamer) => {
              try {
                const personId = await snowflake.upsertPerson({
                  platform: streamer.platform,
                  platformUserId: streamer.streamerId,
                  nickname: streamer.nickname,
                  profileImageUrl: streamer.profileImageUrl,
                  channelId: streamer.channelId,
                });
                return { channelId: streamer.channelId, personId };
              } catch {
                return null;
              }
            })
          );
          results.filter(Boolean).forEach((r) => personIdMap.set(r.channelId, r.personId));
        }

        // === 2. 방송 정보 저장 (broadcaster_person_id 포함) ===
        const allBroadcasts = [
          ...soopBroadcasts.map((b) => ({
            platform: "soop",
            channelId: b.channelId,
            broadcastId: b.broadNo,
            broadcasterPersonId: personIdMap.get(b.channelId) || null,
            title: b.title,
            categoryId: b.categoryId || b.broad_cate_no || null,
            categoryName: b.categoryName || b.cate_name || null,
            thumbnailUrl: b.thumbnailUrl,
            viewerCount: b.viewerCount,
            startedAt: b.startedAt || b.broad_start || null,
            isLive: true,
          })),
          ...chzzkBroadcasts.map((b) => ({
            platform: "chzzk",
            channelId: b.channelId,
            broadcastId: b.liveId,
            broadcasterPersonId: personIdMap.get(b.channelId) || null,
            title: b.title,
            categoryId: b.categoryId || b.liveCategory || null,
            categoryName: b.categoryName || b.liveCategoryValue || null,
            thumbnailUrl: b.thumbnailUrl,
            viewerCount: b.viewerCount,
            startedAt: b.openDate,
            isLive: true,
          })),
        ];

        // 방송 정보 배치 저장 (100개씩)
        const BATCH_SIZE = 100;
        for (let i = 0; i < allBroadcasts.length; i += BATCH_SIZE) {
          const batch = allBroadcasts.slice(i, i + BATCH_SIZE);
          await snowflake.upsertBroadcastsBatch(batch).catch(() => {});
        }

        // === 3. 카테고리 저장 (viewerCount/streamerCount 제거, thumbnailUrl 추가) ===
        const categoryMap = new Map();
        for (const b of allBroadcasts) {
          if (b.categoryId) {
            const key = `${b.platform}:${b.categoryId}`;
            if (!categoryMap.has(key)) {
              categoryMap.set(key, {
                platform: b.platform,
                categoryId: b.categoryId,
                categoryName: b.categoryName,
                thumbnailUrl: b.thumbnailUrl || null, // 첫 방송의 썸네일 사용
              });
            }
            // 중복 카테고리는 무시 (첫 번째 값 유지)
          }
        }

        // 카테고리 upsert (하루 한 번만 - 플랫폼별)
        const categories = Array.from(categoryMap.values());
        const categoriesByPlatform = {};
        for (const cat of categories) {
          if (!categoriesByPlatform[cat.platform]) {
            categoriesByPlatform[cat.platform] = [];
          }
          categoriesByPlatform[cat.platform].push(cat);
        }
        for (const [platform, cats] of Object.entries(categoriesByPlatform)) {
          await snowflake.upsertCategoriesDaily(platform, cats).catch((err) => {
            logger.error(`[discovery] upsertCategoriesDaily failed for ${platform}:`, err.message);
          });
        }

        // === 4. 활성 연결의 시청자 수 업데이트 + 카테고리 변경 감지 ===
        for (const b of allBroadcasts) {
          const key = `${b.platform}:${b.channelId}`;
          const conn = this.activeConnections.get(key);
          if (conn) {
            // 카테고리 변경 감지
            if (conn.categoryId && b.categoryId && conn.categoryId !== b.categoryId) {
              const oldCategoryId = conn.categoryId;
              // 기존 카테고리 통계 flush (is_live = false 포함)
              await this.flushBroadcastStats(conn, true);

              // 새 카테고리로 방송 레코드 생성 (rootBroadcastId 전달)
              await snowflake.upsertBroadcast({
                platform: b.platform,
                channelId: b.channelId,
                broadcastId: b.broadcastId,
                broadcasterPersonId: conn.broadcasterPersonId,
                title: b.title,
                categoryId: b.categoryId,
                categoryName: b.categoryName,
                thumbnailUrl: b.thumbnailUrl,
                viewerCount: b.viewerCount,
                startedAt: new Date().toISOString(),
                isLive: true,
                // 원본 방송 세션 연결 고리 유지
                rootBroadcastId: conn.rootBroadcastId,
              });

              // 통계 리셋 및 새 카테고리로 변경
              conn.categoryId = b.categoryId;
              conn.viewerSamples = [];
              logger.info(`[discovery] Category changed for ${key}: ${oldCategoryId} -> ${b.categoryId} (rootBroadcastId=${conn.rootBroadcastId})`);
            }

            // 시청자 샘플 업데이트
            if (b.viewerCount) {
              conn.viewerSamples = conn.viewerSamples || [];
              conn.viewerSamples.push(b.viewerCount);
              // 최근 100개 샘플만 유지
              if (conn.viewerSamples.length > 100) {
                conn.viewerSamples = conn.viewerSamples.slice(-100);
              }
              conn.viewerCount = b.viewerCount;
            }
          }
        }

        // === 5. 모든 방송 통계 flush (채팅/후원 + 평균 시청자) ===
        await this.flushAllBroadcastStats();

        logger.info("[discovery] Saved to Snowflake", {
          broadcasts: allBroadcasts.length,
          streamers: streamers.length,
          categories: categories.length,
          personIdsMapped: personIdMap.size,
        });
      } catch (err) {
        logger.warn("[discovery] Error saving to Snowflake:", err.message);
      }
    });
  }

  /**
   * 연결 관리 - 새 연결 생성, 오래된 연결 종료
   */
  async manageConnections(topChannels) {
    const topChannelKeys = new Set(
      topChannels.map((ch) => `${ch.platform}:${ch.channelId}`)
    );

    // 1. 상위 목록에서 빠진 채널 연결 해제
    for (const [key, conn] of this.activeConnections) {
      if (!topChannelKeys.has(key)) {
        logger.info(`[discovery] Disconnecting ${key} (no longer in top channels)`);
        try {
          conn.adapter.disconnect();
        } catch (err) {
          // 무시
        }
        this.activeConnections.delete(key);
        this.updateConnectionStats();
      }
    }

    // 2. 새로운 채널에 연결
    const channelsToConnect = topChannels.filter((ch) => {
      const key = `${ch.platform}:${ch.channelId}`;
      return !this.activeConnections.has(key) && !this.pendingConnections.has(key);
    });

    logger.info(`[discovery] Channels to connect: ${channelsToConnect.length} (from ${topChannels.length} top channels)`);

    // 배치로 연결 (서버 부하 방지)
    const totalBatches = Math.ceil(channelsToConnect.length / this.connectionBatchSize);
    for (let i = 0; i < channelsToConnect.length; i += this.connectionBatchSize) {
      const batchNum = Math.floor(i / this.connectionBatchSize) + 1;
      const batch = channelsToConnect.slice(i, i + this.connectionBatchSize);

      logger.info(`[discovery] Processing batch ${batchNum}/${totalBatches} (${batch.length} channels)`);

      try {
        await Promise.all(
          batch.map((channel) => this.connectToChannel(channel))
        );
      } catch (batchError) {
        logger.error(`[discovery] Batch ${batchNum} failed:`, batchError.message);
      }

      // 배치 간 딜레이
      if (i + this.connectionBatchSize < channelsToConnect.length) {
        await new Promise((resolve) => setTimeout(resolve, this.connectionDelay));
      }
    }
  }

  /**
   * 개별 채널에 연결
   */
  async connectToChannel(channel) {
    const key = `${channel.platform}:${channel.channelId}`;

    if (this.activeConnections.has(key) || this.pendingConnections.has(key)) {
      return;
    }

    this.pendingConnections.add(key);

    try {
      let adapter;

      // 재연결 비활성화 - discovery 서비스가 다음 주기에 다시 연결 시도함
      const adapterOptions = {
        channelId: channel.channelId,
        maxReconnectAttempts: 0,  // 자동 재연결 비활성화
      };

      if (channel.platform === "soop") {
        adapter = new this.SoopAdapter(adapterOptions);
      } else if (channel.platform === "chzzk") {
        adapter = new this.ChzzkAdapter(adapterOptions);
      } else {
        throw new Error(`Unknown platform: ${channel.platform}`);
      }

      // 이벤트 핸들러 설정
      adapter.on("event", (event) => this.handleEvent(channel.platform, channel.channelId, event));
      adapter.on("error", (error) => this.handleError(key, error));
      adapter.on("disconnect", () => this.handleDisconnect(key));

      // 연결
      await adapter.connect();

      // === Snowflake: 방송자 PERSONS upsert & 방송 정보 저장 ===
      const snowflake = getSnowflakeService();
      let broadcasterPersonId = null;
      let broadcastId = null;

      try {
        // 방송자 정보 upsert (PERSONS)
        broadcasterPersonId = await snowflake.upsertPerson({
          platform: channel.platform,
          platformUserId: channel.streamerId || channel.channelId,
          nickname: channel.nickname,
          profileImageUrl: channel.profileImageUrl,
          channelId: channel.channelId,
        });

        // 방송 정보 저장 (BROADCASTS)
        broadcastId = channel.broadcastId || channel.broadNo || channel.liveId;
        await snowflake.upsertBroadcast({
          platform: channel.platform,
          channelId: channel.channelId,
          broadcastId,
          broadcasterPersonId,
          title: channel.title,
          categoryId: channel.categoryId,
          categoryName: channel.categoryName,
          thumbnailUrl: channel.thumbnailUrl,
          viewerCount: channel.viewerCount,
          startedAt: channel.openDate || channel.startedAt,
          isLive: true,
          // 첫 방송이므로 rootBroadcastId는 null (자동으로 자기 자신이 됨)
        });
      } catch (err) {
        logger.warn(`[discovery] Snowflake save error for ${key}:`, err.message);
      }

      // root_broadcast_id 조회 (카테고리 변경 시 연결 고리 유지용)
      let rootBroadcastId = null;
      try {
        rootBroadcastId = await snowflake.getBroadcastId(
          channel.platform,
          channel.channelId,
          broadcastId,
          channel.categoryId
        );
      } catch (err) {
        // 실패해도 계속 진행
      }

      // 연결 성공 (categoryId 추가 - 카테고리 변경 시 새 레코드 생성용)
      this.activeConnections.set(key, {
        adapter,
        platform: channel.platform,
        channelId: channel.channelId,
        broadcastId,
        categoryId: channel.categoryId,
        broadcasterPersonId,
        rootBroadcastId, // 원본 방송 세션 ID (카테고리 변경 시 유지)
        viewerCount: channel.viewerCount,
        nickname: channel.nickname,
        connectedAt: new Date().toISOString(),
        // 평균 시청자 계산용
        viewerSamples: [channel.viewerCount],
        chatCount: 0,
        donationAmount: 0,
      });

      this.updateConnectionStats();
      logger.info(`[discovery] Connected to ${channel.platform}:${channel.channelId} (${channel.nickname}, ${channel.viewerCount} viewers, person_id=${broadcasterPersonId})`);

    } catch (error) {
      logger.warn(`[discovery] Failed to connect to ${key}:`, error.message);
    } finally {
      this.pendingConnections.delete(key);
    }
  }

  /**
   * 이벤트 핸들러
   */
  handleEvent(platform, channelId, event) {
    const snowflake = getSnowflakeService();
    const key = `${platform}:${channelId}`;
    const conn = this.activeConnections.get(key);

    // Snowflake에 이벤트 저장
    snowflake.addEvent(event);

    // 유저 정보 업데이트 + VIEWER_ENGAGEMENT
    if (["chat", "donation"].includes(event.type) && event.sender?.id) {
      const isDonation = event.type === "donation";
      const amount = isDonation ? (event.content?.amount || 0) : 0;

      snowflake.upsertChatUser(
        {
          platform,
          id: event.sender.id,
          nickname: event.sender.nickname,
          profileImage: event.sender.profileImage,
          role: event.sender.role,
          channelId,
        },
        event.type,
        amount
      );

      // === 방송 통계 누적 (BROADCASTS.total_chat_count, total_donation_amount) ===
      if (conn) {
        // 메모리에 누적 (배치로 Snowflake 업데이트)
        if (event.type === "chat") {
          conn.chatCount = (conn.chatCount || 0) + 1;
        }
        if (isDonation) {
          conn.donationAmount = (conn.donationAmount || 0) + amount;
        }

        // 100개 이벤트마다 Snowflake에 반영
        const totalLocalEvents = (conn.chatCount || 0) + Math.floor((conn.donationAmount || 0) / 1000);
        if (totalLocalEvents > 0 && totalLocalEvents % 100 === 0) {
          this.flushBroadcastStats(conn);
        }
      }
    }

    // 통계 업데이트
    if (this.stats.totalEvents[platform] !== undefined) {
      this.stats.totalEvents[platform]++;
    }

    // Socket.io로 이벤트 브로드캐스트 (필요시)
    if (this.io && this.normalizer) {
      const legacyEvent = this.normalizer.toEventsFormat(event);
      this.io.emit("discovery-event", legacyEvent);
    }
  }

  /**
   * 방송 통계를 Snowflake에 반영 (채팅/후원 + 평균 시청자)
   */
  async flushBroadcastStats(conn, includeViewerAvg = false) {
    if (!conn) return;

    const hasStats = conn.chatCount > 0 || conn.donationAmount > 0;
    const hasViewerSamples = includeViewerAvg && conn.viewerSamples?.length > 0;

    if (!hasStats && !hasViewerSamples) return;

    const snowflake = getSnowflakeService();
    const chatCount = conn.chatCount || 0;
    const donationAmount = conn.donationAmount || 0;
    const viewerSamples = hasViewerSamples ? [...conn.viewerSamples] : null;

    // 로컬 카운터 리셋
    conn.chatCount = 0;
    conn.donationAmount = 0;

    try {
      await snowflake.updateBroadcastStats(
        conn.platform,
        conn.channelId,
        conn.broadcastId,
        conn.categoryId,  // 카테고리별 레코드 구분
        { chatCount, donationAmount, viewerSamples }
      );
    } catch (err) {
      // 실패 시 다시 누적
      conn.chatCount = chatCount;
      conn.donationAmount = donationAmount;
    }
  }

  /**
   * 모든 활성 연결의 통계를 Snowflake에 반영 (주기적 호출용)
   */
  async flushAllBroadcastStats() {
    for (const conn of this.activeConnections.values()) {
      await this.flushBroadcastStats(conn, true); // 평균 시청자도 포함
    }
  }

  /**
   * 에러 핸들러
   */
  handleError(key, error) {
    logger.warn(`[discovery] Connection error for ${key}:`, error.message);
  }

  /**
   * 연결 해제 핸들러
   */
  handleDisconnect(key) {
    logger.info(`[discovery] Disconnected: ${key}`);
    this.activeConnections.delete(key);
    this.updateConnectionStats();
  }

  /**
   * 연결 통계 업데이트
   */
  updateConnectionStats() {
    let soop = 0;
    let chzzk = 0;

    for (const conn of this.activeConnections.values()) {
      if (conn.platform === "soop") soop++;
      else if (conn.platform === "chzzk") chzzk++;
    }

    this.stats.activeConnections = { soop, chzzk };
  }

  /**
   * 서비스 상태 조회
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      maxConnectionsPerPlatform: this.maxConnectionsPerPlatform,
      totalMaxConnections: this.maxConnectionsPerPlatform * 2,
      discoveryInterval: this.discoveryInterval,
      lastDiscovery: this.lastDiscovery,
      stats: {
        ...this.stats,
        totalActiveConnections: this.activeConnections.size,
        pendingConnections: this.pendingConnections.size,
      },
      topConnections: Array.from(this.activeConnections.values())
        .sort((a, b) => b.viewerCount - a.viewerCount)
        .slice(0, 20)
        .map((c) => ({
          platform: c.platform,
          channelId: c.channelId,
          nickname: c.nickname,
          viewerCount: c.viewerCount,
          connectedAt: c.connectedAt,
        })),
    };
  }

  /**
   * 설정 업데이트
   */
  updateConfig(config) {
    if (config.maxConnectionsPerPlatform !== undefined) {
      this.maxConnectionsPerPlatform = config.maxConnectionsPerPlatform;
    }
    // 하위호환: maxConnections도 지원 (플랫폼별로 적용)
    if (config.maxConnections !== undefined) {
      this.maxConnectionsPerPlatform = config.maxConnections;
    }
    if (config.discoveryInterval !== undefined) {
      this.discoveryInterval = config.discoveryInterval;

      // 타이머 재시작
      if (this.isRunning && this.discoveryTimer) {
        clearInterval(this.discoveryTimer);
        this.discoveryTimer = setInterval(() => {
          this.discover().catch((err) => {
            logger.error("[discovery] Discovery error:", err.message);
          });
        }, this.discoveryInterval);
      }
    }

    return this.getStatus();
  }
}

// 싱글톤 인스턴스
let discoveryInstance = null;

/**
 * LiveDiscoveryService 인스턴스 가져오기
 */
const getDiscoveryService = () => {
  if (!discoveryInstance) {
    discoveryInstance = new LiveDiscoveryService();
  }
  return discoveryInstance;
};

/**
 * LiveDiscoveryService 초기화
 */
const initDiscoveryService = (options = {}) => {
  discoveryInstance = new LiveDiscoveryService(options);
  return discoveryInstance;
};

module.exports = {
  LiveDiscoveryService,
  getDiscoveryService,
  initDiscoveryService,
};
