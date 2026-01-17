/**
 * Analytics Collector
 *
 * 메인 수집 오케스트레이터
 * - 멀티 플랫폼 지원 (SOOP, Chzzk)
 * - API 폴링 (전체 방송 목록)
 * - WebSocket 관리 (선택적 방송 시청자/후원 수집)
 * - 스냅샷 저장 및 집계
 *
 * Snowflake 전용
 */

const EventEmitter = require("events");
const ApiCollector = require("./ApiCollector");
const WebSocketManager = require("./WebSocketManager");
const ChzzkApiCollector = require("./ChzzkApiCollector");
const ChzzkWebSocketManager = require("./ChzzkWebSocketManager");
const { logger } = require("../../services/logger");
const { getSnowflakeConnection } = require("../../db/snowflake-connection");

class AnalyticsCollector extends EventEmitter {
  /**
   * @param {Object} options - 설정 옵션
   */
  constructor(options = {}) {
    super();

    this.snowflake = null;
    this.options = {
      // 기본값
      maxWebSocketConnections: parseInt(process.env.ANALYTICS_MAX_WS, 10) || 100,
      minViewersThreshold: parseInt(process.env.ANALYTICS_MIN_VIEWERS, 10) || 100,
      snapshotIntervalSeconds: parseInt(process.env.ANALYTICS_SNAPSHOT_INTERVAL, 10) || 300,
      apiPollingIntervalSeconds: parseInt(process.env.ANALYTICS_POLL_INTERVAL, 10) || 300,
      ...options,
    };

    // SOOP 컴포넌트
    this.apiCollector = null;
    this.wsManager = null;

    // Chzzk 컴포넌트
    this.chzzkApiCollector = null;
    this.chzzkWsManager = null;

    // 상태
    this.isRunning = false;
    this.apiPollInterval = null;
    this.snapshotInterval = null;

    // 통계
    this.stats = {
      startedAt: null,
      apiPolls: 0,
      snapshots: 0,
      broadcastsTracked: 0,
      viewersTracked: 0,
      donationsTracked: 0,
      // 플랫폼별 통계
      soop: {
        broadcasts: 0,
        wsConnections: 0,
        donations: 0,
      },
      chzzk: {
        broadcasts: 0,
        wsConnections: 0,
        donations: 0,
      },
    };
  }

  /**
   * 수집기 시작
   */
  async start() {
    if (this.isRunning) {
      logger.info("[AnalyticsCollector] Already running");
      return;
    }

    logger.info("[AnalyticsCollector] Starting...");

    // Snowflake 연결 초기화
    try {
      this.snowflake = getSnowflakeConnection();
      await this.snowflake.connect();
      logger.info("[AnalyticsCollector] Snowflake connected");
    } catch (err) {
      logger.error("[AnalyticsCollector] Snowflake connection failed", { error: err.message });
      throw err;
    }

    // SOOP API Collector 초기화
    this.apiCollector = new ApiCollector();
    this.apiCollector.on("broadcast-update", (data) => this.emit("broadcast-update", data));
    this.apiCollector.on("error", (err) => this.emit("error", err));

    // SOOP WebSocket Manager 초기화
    this.wsManager = new WebSocketManager({
      maxConnections: Math.floor(this.options.maxWebSocketConnections / 2),
    });
    this.wsManager.on("viewer-list", (data) => this.handleViewerList(data));
    this.wsManager.on("donation", (data) => this.handleDonation(data, "soop"));
    this.wsManager.on("error", (err) => this.emit("error", err));

    // Chzzk API Collector 초기화
    this.chzzkApiCollector = new ChzzkApiCollector();
    this.chzzkApiCollector.on("broadcast-ended", (data) => this.emit("broadcast-ended", { ...data, platform: "chzzk" }));
    this.chzzkApiCollector.on("error", (err) => this.emit("error", err));

    // Chzzk WebSocket Manager 초기화
    this.chzzkWsManager = new ChzzkWebSocketManager({
      maxConnections: Math.floor(this.options.maxWebSocketConnections / 2),
    });
    this.chzzkWsManager.on("donation", (data) => this.handleDonation(data, "chzzk"));
    this.chzzkWsManager.on("error", (err) => this.emit("error", err));

    // isRunning과 startedAt을 먼저 설정
    this.isRunning = true;
    this.stats.startedAt = new Date();

    logger.info("[AnalyticsCollector] Components initialized, starting initial API poll...");

    // 첫 번째 폴링 즉시 실행
    try {
      await this.runApiPoll();
    } catch (err) {
      logger.error("[AnalyticsCollector] Initial API poll failed", { error: err.message, stack: err.stack });
    }

    // 주기적 API 폴링 시작
    this.apiPollInterval = setInterval(
      () => this.runApiPoll(),
      this.options.apiPollingIntervalSeconds * 1000
    );

    // 첫 번째 스냅샷은 30초 후 실행
    setTimeout(() => {
      this.runSnapshot();
    }, 30000);

    // 주기적 스냅샷 시작
    this.snapshotInterval = setInterval(
      () => this.runSnapshot(),
      this.options.snapshotIntervalSeconds * 1000
    );

    logger.info("[AnalyticsCollector] Started successfully", {
      apiPollingInterval: this.options.apiPollingIntervalSeconds,
      snapshotInterval: this.options.snapshotIntervalSeconds,
      maxWebSocketConnections: this.options.maxWebSocketConnections,
      perPlatform: Math.floor(this.options.maxWebSocketConnections / 2),
      minViewersThreshold: this.options.minViewersThreshold,
      platforms: "SOOP, Chzzk",
    });
  }

  /**
   * 수집기 정지
   */
  async stop() {
    if (!this.isRunning) return;

    logger.info("[AnalyticsCollector] Stopping...");

    // 인터벌 정리
    if (this.apiPollInterval) {
      clearInterval(this.apiPollInterval);
      this.apiPollInterval = null;
    }
    if (this.snapshotInterval) {
      clearInterval(this.snapshotInterval);
      this.snapshotInterval = null;
    }

    // WebSocket 연결 정리
    if (this.wsManager) {
      await this.wsManager.disconnectAll();
    }
    if (this.chzzkWsManager) {
      await this.chzzkWsManager.disconnectAll();
    }

    // Snowflake 연결 해제
    if (this.snowflake) {
      await this.snowflake.disconnect();
      this.snowflake = null;
    }

    this.isRunning = false;
    logger.info("[AnalyticsCollector] Stopped");
  }

  /**
   * API 폴링 실행 (SOOP + Chzzk 동시)
   */
  async runApiPoll() {
    logger.info("[AnalyticsCollector] Running API poll...");
    const startTime = Date.now();

    try {
      // 양 플랫폼 병렬 수집 (각각 60초 타임아웃)
      const timeout = (ms, promise) => Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms))
      ]);

      logger.info("[AnalyticsCollector] Fetching SOOP and Chzzk broadcasts...");

      const [soopBroadcasts, chzzkBroadcasts] = await Promise.all([
        timeout(60000, this.apiCollector.collectAllLiveBroadcasts()).catch((err) => {
          logger.error("[AnalyticsCollector] SOOP API error", { error: err.message, stack: err.stack });
          return [];
        }),
        timeout(60000, this.chzzkApiCollector.collectAllLiveBroadcasts()).catch((err) => {
          logger.error("[AnalyticsCollector] Chzzk API error", { error: err.message, stack: err.stack });
          return [];
        }),
      ]);

      logger.info("[AnalyticsCollector] Fetch complete", {
        soopBroadcasts: soopBroadcasts.length,
        chzzkBroadcasts: chzzkBroadcasts.length,
        elapsedMs: Date.now() - startTime,
      });

      this.stats.apiPolls++;
      this.stats.soop.broadcasts = soopBroadcasts.length;
      this.stats.chzzk.broadcasts = chzzkBroadcasts.length;
      this.stats.broadcastsTracked = soopBroadcasts.length + chzzkBroadcasts.length;

      // SOOP WebSocket 연결 대상 결정
      const soopTargets = this.selectSoopWebSocketTargets(soopBroadcasts);
      await this.wsManager.updateTargets(soopTargets);
      this.stats.soop.wsConnections = this.wsManager.getConnectionCount();

      // Chzzk WebSocket 연결 대상 결정
      const chzzkTargets = this.selectChzzkWebSocketTargets(chzzkBroadcasts);
      await this.chzzkWsManager.updateTargets(chzzkTargets);
      this.stats.chzzk.wsConnections = this.chzzkWsManager.getConnectionCount();

      logger.info("[AnalyticsCollector] API poll complete", {
        soop: { broadcasts: soopBroadcasts.length, wsTargets: soopTargets.length },
        chzzk: { broadcasts: chzzkBroadcasts.length, wsTargets: chzzkTargets.length },
      });

      this.emit("api-poll-complete", {
        soop: { broadcastCount: soopBroadcasts.length, wsTargetCount: soopTargets.length },
        chzzk: { broadcastCount: chzzkBroadcasts.length, wsTargetCount: chzzkTargets.length },
        total: {
          broadcastCount: soopBroadcasts.length + chzzkBroadcasts.length,
          wsTargetCount: soopTargets.length + chzzkTargets.length,
        },
      });
    } catch (err) {
      logger.error("[AnalyticsCollector] API poll error", { error: err.message, stack: err.stack });
      this.emit("error", err);
    }
  }

  /**
   * SOOP WebSocket 연결 대상 선택
   */
  selectSoopWebSocketTargets(broadcasts) {
    const maxConnections = Math.floor(this.options.maxWebSocketConnections / 2);

    const sortedBroadcasts = [...broadcasts]
      .filter((b) => parseInt(b.total_view_cnt, 10) >= this.options.minViewersThreshold)
      .sort((a, b) => parseInt(b.total_view_cnt, 10) - parseInt(a.total_view_cnt, 10))
      .slice(0, maxConnections);

    return sortedBroadcasts.map((broadcast) => ({
      platform: "soop",
      broadcastId: broadcast.broad_no || broadcast.bno,
      streamerId: broadcast.user_id,
      streamerNick: broadcast.user_nick,
      viewers: parseInt(broadcast.total_view_cnt, 10),
    }));
  }

  /**
   * Chzzk WebSocket 연결 대상 선택
   */
  selectChzzkWebSocketTargets(broadcasts) {
    const maxConnections = Math.floor(this.options.maxWebSocketConnections / 2);

    const sortedBroadcasts = [...broadcasts]
      .filter((b) => (b.concurrentUserCount || 0) >= this.options.minViewersThreshold)
      .sort((a, b) => (b.concurrentUserCount || 0) - (a.concurrentUserCount || 0))
      .slice(0, maxConnections);

    return sortedBroadcasts.map((broadcast) => ({
      platform: "chzzk",
      channelId: broadcast.channel?.channelId,
      channelName: broadcast.channel?.channelName || "Unknown",
      viewers: broadcast.concurrentUserCount || 0,
    }));
  }

  /**
   * 스냅샷 실행 (WebSocket에서 유저 목록 수집)
   */
  async runSnapshot() {
    if (!this.wsManager) return;

    logger.info("[AnalyticsCollector] Running snapshot...");

    try {
      const snapshotTime = this.roundToSnapshotTime(new Date());
      const snapshotAt = snapshotTime.toISOString();

      // 시청자 목록 수집
      const viewerResults = await this.wsManager.collectAllViewerLists();

      // 채팅 통계 수집 (5분간 누적된 데이터)
      const chatResults = this.wsManager.collectAllChatStats();

      let totalViewers = 0;

      for (const result of viewerResults) {
        if (result.viewers && result.viewers.length > 0) {
          // 시청 기록 저장
          await this.saveViewingRecords(result.broadcastId, result.viewers, snapshotTime);
          totalViewers += result.viewers.length;

          // 비율 계산
          const viewerCount = result.viewers.length;
          const subscriberCount = result.viewers.filter((v) => v.isSub).length;
          const fanCount = result.viewers.filter((v) => v.isFan).length;
          const subscriberRatio = viewerCount > 0 ? subscriberCount / viewerCount : 0;
          const fanRatio = viewerCount > 0 ? fanCount / viewerCount : 0;

          // 해당 방송의 채팅 통계 찾기
          const chatStat = chatResults.find((c) => c.broadcastId === result.broadcastId) || {
            messageCount: 0,
            uniqueChatters: 0,
          };

          // 5분 통계 저장
          await this.saveBroadcastStats5min({
            broadcastId: result.broadcastId,
            snapshotAt,
            viewerCount,
            subscriberCount,
            fanCount,
            subscriberRatio,
            fanRatio,
            chatCount: chatStat.messageCount,
            uniqueChatters: chatStat.uniqueChatters,
          });
        }
      }

      this.stats.snapshots++;
      this.stats.viewersTracked = totalViewers;

      logger.info("[AnalyticsCollector] Snapshot complete", {
        broadcasts: viewerResults.length,
        viewers: totalViewers,
      });

      this.emit("snapshot-complete", {
        broadcastCount: viewerResults.length,
        viewerCount: totalViewers,
        snapshotTime,
      });
    } catch (err) {
      logger.error("[AnalyticsCollector] Snapshot error", { error: err.message, stack: err.stack });
      this.emit("error", err);
    }
  }

  /**
   * 5분 단위 방송 통계 저장
   */
  async saveBroadcastStats5min(stats) {
    await this.snowflake.run(
      `MERGE INTO BROADCAST_STATS_5MIN AS target
       USING (
         SELECT b.ID AS BROADCAST_ID, ? AS SNAPSHOT_AT, ? AS VIEWER_COUNT,
                ? AS SUBSCRIBER_COUNT, ? AS FAN_COUNT, ? AS SUBSCRIBER_RATIO,
                ? AS FAN_RATIO, ? AS CHAT_COUNT, ? AS UNIQUE_CHATTERS
         FROM BROADCASTS b WHERE b.PLATFORM = 'soop' AND b.BROADCAST_ID = ?
       ) AS source
       ON target.BROADCAST_ID = source.BROADCAST_ID AND target.SNAPSHOT_AT = source.SNAPSHOT_AT
       WHEN MATCHED THEN UPDATE SET
         VIEWER_COUNT = source.VIEWER_COUNT,
         SUBSCRIBER_COUNT = source.SUBSCRIBER_COUNT,
         FAN_COUNT = source.FAN_COUNT,
         SUBSCRIBER_RATIO = source.SUBSCRIBER_RATIO,
         FAN_RATIO = source.FAN_RATIO,
         CHAT_COUNT = source.CHAT_COUNT,
         UNIQUE_CHATTERS = source.UNIQUE_CHATTERS
       WHEN NOT MATCHED THEN INSERT
         (BROADCAST_ID, SNAPSHOT_AT, VIEWER_COUNT, SUBSCRIBER_COUNT, FAN_COUNT,
          SUBSCRIBER_RATIO, FAN_RATIO, CHAT_COUNT, UNIQUE_CHATTERS)
       VALUES (source.BROADCAST_ID, source.SNAPSHOT_AT, source.VIEWER_COUNT,
               source.SUBSCRIBER_COUNT, source.FAN_COUNT, source.SUBSCRIBER_RATIO,
               source.FAN_RATIO, source.CHAT_COUNT, source.UNIQUE_CHATTERS)`,
      [
        stats.snapshotAt,
        stats.viewerCount,
        stats.subscriberCount,
        stats.fanCount,
        stats.subscriberRatio,
        stats.fanRatio,
        stats.chatCount,
        stats.uniqueChatters,
        stats.broadcastId,
      ]
    );
  }

  /**
   * 시청 기록 저장
   */
  async saveViewingRecords(broadcastId, viewers, snapshotTime) {
    const snapshotAt = snapshotTime.toISOString();

    await this.snowflake.beginTransaction();
    let savedCount = 0;
    let errorCount = 0;

    for (const viewer of viewers) {
      try {
        const userId = await this.upsertUserAndGetId(viewer);
        if (userId) {
          await this.insertViewingRecord(broadcastId, userId, viewer, snapshotAt);
          savedCount++;
        } else {
          errorCount++;
        }
      } catch (err) {
        if (!err.message.includes("UNIQUE_KEY") && !err.message.includes("duplicate")) {
          errorCount++;
        }
      }
    }

    await this.snowflake.commit();
    if (errorCount > 0) {
      logger.warn("[AnalyticsCollector] Viewing records", { saved: savedCount, errors: errorCount });
    }
  }

  /**
   * 유저 추가/업데이트하고 ID 반환
   */
  async upsertUserAndGetId(viewer) {
    // MERGE로 upsert
    await this.snowflake.run(
      `MERGE INTO PLATFORM_USERS AS target
       USING (SELECT 'soop' AS PLATFORM, ? AS PLATFORM_USER_ID, ? AS USERNAME, ? AS NICKNAME) AS source
       ON target.PLATFORM = source.PLATFORM AND target.PLATFORM_USER_ID = source.PLATFORM_USER_ID
       WHEN MATCHED THEN UPDATE SET NICKNAME = source.NICKNAME, LAST_SEEN_AT = CURRENT_TIMESTAMP()
       WHEN NOT MATCHED THEN INSERT (PLATFORM, PLATFORM_USER_ID, USERNAME, NICKNAME) VALUES (source.PLATFORM, source.PLATFORM_USER_ID, source.USERNAME, source.NICKNAME)`,
      [viewer.userId, viewer.userId, viewer.nickname]
    );

    // ID 조회
    const row = await this.snowflake.get(
      `SELECT ID FROM PLATFORM_USERS WHERE PLATFORM = 'soop' AND PLATFORM_USER_ID = ?`,
      [viewer.userId]
    );
    return row ? row.id : null;
  }

  /**
   * 시청 기록 추가
   */
  async insertViewingRecord(broadcastId, viewerId, viewer, snapshotAt) {
    await this.snowflake.run(
      `INSERT INTO VIEWING_RECORDS (VIEWER_ID, VIEWER_USERNAME, BROADCAST_ID, STREAMER_ID, SNAPSHOT_AT, IS_SUBSCRIBER, IS_FAN)
       SELECT ?, ?, b.ID, b.STREAMER_ID, ?, ?, ?
       FROM BROADCASTS b
       WHERE b.PLATFORM = 'soop' AND b.BROADCAST_ID = ?
       AND NOT EXISTS (
         SELECT 1 FROM VIEWING_RECORDS vr
         WHERE vr.VIEWER_ID = ? AND vr.BROADCAST_ID = b.ID AND vr.SNAPSHOT_AT = ?
       )`,
      [viewerId, viewer.userId, snapshotAt, viewer.isSub, viewer.isFan, broadcastId, viewerId, snapshotAt]
    );
  }

  /**
   * 후원 이벤트 처리
   */
  async handleDonation(data, platform = "soop") {
    try {
      await this.saveDonation(data, platform);
      this.stats.donationsTracked++;

      if (platform === "soop") {
        this.stats.soop.donations++;
      } else if (platform === "chzzk") {
        this.stats.chzzk.donations++;
      }

      this.emit("donation", { ...data, platform });
    } catch (err) {
      logger.warn("[AnalyticsCollector] Save donation error", { platform, error: err.message });
    }
  }

  /**
   * 후원 저장
   */
  async saveDonation(data, platform = "soop") {
    const broadcastIdField = platform === "chzzk" ? data.channelId : data.broadcastId;
    const receiverField = platform === "chzzk" ? data.receiverChannelId : data.receiverUserId;

    await this.snowflake.run(
      `INSERT INTO DONATIONS
       (SENDER_USERNAME, SENDER_NICKNAME, RECEIVER_USERNAME, BROADCAST_ID,
        DONATION_TYPE, ITEM_COUNT, AMOUNT_KRW, MESSAGE, DONATED_AT)
       SELECT
         ?,
         ?,
         ?,
         b.ID,
         ?,
         ?,
         ?,
         ?,
         CURRENT_TIMESTAMP()
       FROM BROADCASTS b
       WHERE b.PLATFORM = ? AND b.BROADCAST_ID = ?`,
      [
        data.senderUserId,
        data.senderNickname,
        receiverField,
        data.donationType,
        data.count || 0,
        data.amountKrw || 0,
        data.message || null,
        platform,
        broadcastIdField,
      ]
    );
  }

  /**
   * 시청자 목록 이벤트 처리
   */
  handleViewerList(data) {
    // 스냅샷 시점에 처리
  }

  /**
   * 시간을 5분 단위로 반올림
   */
  roundToSnapshotTime(date) {
    const ms = date.getTime();
    const interval = this.options.snapshotIntervalSeconds * 1000;
    return new Date(Math.floor(ms / interval) * interval);
  }

  /**
   * 현재 상태 조회
   */
  getStatus() {
    const soopWsCount = this.wsManager ? this.wsManager.getConnectionCount() : 0;
    const chzzkWsCount = this.chzzkWsManager ? this.chzzkWsManager.getConnectionCount() : 0;

    return {
      isRunning: this.isRunning,
      dbType: 'snowflake',
      snowflakeConnected: this.snowflake ? this.snowflake.isConnected : false,
      stats: this.stats,
      wsConnections: soopWsCount + chzzkWsCount,
      platforms: {
        soop: {
          broadcasts: this.stats.soop.broadcasts,
          wsConnections: soopWsCount,
          donations: this.stats.soop.donations,
        },
        chzzk: {
          broadcasts: this.stats.chzzk.broadcasts,
          wsConnections: chzzkWsCount,
          donations: this.stats.chzzk.donations,
        },
      },
      config: this.options,
    };
  }
}

module.exports = AnalyticsCollector;
