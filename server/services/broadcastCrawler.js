/**
 * BroadcastCrawler - 라이브 방송 크롤링 및 세션 추적 서비스
 *
 * SOOP과 Chzzk 플랫폼에서 라이브 방송 목록을 수집하고,
 * 방송 시작/종료를 감지하여 broadcasts 테이블에 기록합니다.
 *
 * NOTE: 카테고리 정보는 broadcast_segments 테이블에서 관리됩니다.
 * 카테고리 변경 시 새 세그먼트가 생성됩니다.
 */

const { broadcast: broadcastLogger } = require("./logger");
const PersonService = require("./personService");

// Rate limit 설정
const RATE_LIMITS = {
  soop: {
    requestsPerSecond: 2,
    maxRetries: 3,
    retryDelay: 1000,
  },
  chzzk: {
    requestsPerSecond: 5,
    maxRetries: 3,
    retryDelay: 500,
  },
};

class BroadcastCrawler {
  constructor(db, io = null, options = {}) {
    this.db = db;
    this.io = io;
    this.personService = new PersonService(db);
    this.defaultHeaders = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    };
    this.lastRequestTime = {
      soop: 0,
      chzzk: 0,
    };
    this.crawlInterval = null;
    this.crawlIntervalMs = 5 * 60 * 1000; // 5분

    // Auto-connection options
    this.ChzzkAdapter = options.ChzzkAdapter || null;
    this.SoopAdapter = options.SoopAdapter || null;
    this.activeAdapters = options.activeAdapters || new Map();
    this.normalizer = options.normalizer || null;
    this.ViewerEngagementService = options.ViewerEngagementService || null;
    this.eventService = options.eventService || null; // EventService for storing events

    // Auto-connection settings
    this.maxAutoConnections = 50; // 플랫폼당 최대 자동 연결 수
    this.autoConnectedChannels = new Set(); // 자동 연결된 채널 추적

    // Track current category per broadcast for segment management
    this.broadcastCategories = new Map(); // Map<broadcastDbId, categoryId>
  }

  /**
   * Rate limiting을 위한 딜레이
   * @param {string} platform
   */
  async rateLimit(platform) {
    const config = RATE_LIMITS[platform];
    const minInterval = 1000 / config.requestsPerSecond;
    const elapsed = Date.now() - this.lastRequestTime[platform];

    if (elapsed < minInterval) {
      await new Promise((resolve) =>
        setTimeout(resolve, minInterval - elapsed)
      );
    }
    this.lastRequestTime[platform] = Date.now();
  }

  /**
   * 재시도 로직이 포함된 fetch
   * @param {string} platform
   * @param {string} url
   * @param {Object} options
   */
  async fetchWithRetry(platform, url, options = {}) {
    const config = RATE_LIMITS[platform];

    for (let attempt = 0; attempt < config.maxRetries; attempt++) {
      try {
        await this.rateLimit(platform);

        const response = await fetch(url, {
          ...options,
          headers: {
            ...this.defaultHeaders,
            ...options.headers,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        broadcastLogger.error("Fetch error", {
          platform,
          attempt: attempt + 1,
          error: error.message,
        });

        if (attempt < config.maxRetries - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, config.retryDelay * Math.pow(2, attempt))
          );
        } else {
          throw error;
        }
      }
    }
  }

  /**
   * SOOP 라이브 방송 목록 크롤링
   * @param {number} maxBroadcasts - 최대 수집 방송 수
   * @returns {Promise<Array>}
   */
  async fetchSoopLiveBroadcasts(maxBroadcasts = 10000) {
    broadcastLogger.debug("Fetching SOOP live broadcasts...");

    const allBroadcasts = [];
    const pageSize = 60;
    const maxPages = Math.ceil(maxBroadcasts / pageSize);

    for (let page = 1; page <= maxPages; page++) {
      try {
        const url = `https://live.sooplive.co.kr/api/main_broad_list_api.php?selectType=action&selectValue=all&orderType=view_cnt&pageNo=${page}&lang=ko`;
        const data = await this.fetchWithRetry("soop", url, {
          headers: {
            Origin: "https://www.sooplive.co.kr",
            Referer: "https://www.sooplive.co.kr/",
          },
        });

        if (!data || !data.broad || !Array.isArray(data.broad)) {
          break;
        }

        const broadcasts = data.broad;
        if (broadcasts.length === 0) break;

        for (const live of broadcasts) {
          allBroadcasts.push({
            platform: "soop",
            channelId: live.user_id,
            broadcastId: live.broad_no,
            streamerId: live.user_id,
            nickname: live.user_nick,
            title: live.broad_title,
            categoryId: live.broad_cate_no || null,
            categoryName: live.category_name || live.cate_name || null,
            viewerCount: parseInt(live.total_view_cnt, 10) || 0,
            thumbnailUrl: live.broad_thumb || `https://liveimg.sooplive.co.kr/m/${live.broad_no}`,
            profileImageUrl: `https://profile.img.sooplive.co.kr/LOGO/${live.user_id.substring(0, 2)}/${live.user_id}/${live.user_id}.jpg`,
            startedAt: live.broad_start || null,
          });
        }

        broadcastLogger.debug("SOOP page fetched", { page, count: broadcasts.length });

        if (broadcasts.length < pageSize || allBroadcasts.length >= maxBroadcasts) break;
      } catch (error) {
        broadcastLogger.error("SOOP page failed", { page, error: error.message });
        break;
      }
    }

    broadcastLogger.info("SOOP live broadcasts fetched", { count: allBroadcasts.length });
    return allBroadcasts.slice(0, maxBroadcasts);
  }

  /**
   * Chzzk 라이브 방송 목록 크롤링
   * @param {number} maxBroadcasts - 최대 수집 방송 수
   * @returns {Promise<Array>}
   */
  async fetchChzzkLiveBroadcasts(maxBroadcasts = 10000) {
    broadcastLogger.debug("Fetching Chzzk live broadcasts...");

    const allBroadcasts = [];
    const pageSize = 50;
    let cursor = null;
    const maxPages = Math.ceil(maxBroadcasts / pageSize);

    for (let page = 0; page < maxPages; page++) {
      try {
        let url = `https://api.chzzk.naver.com/service/v1/lives?size=${pageSize}&sortType=POPULAR`;
        if (cursor) {
          url += `&concurrentUserCount=${cursor.concurrentUserCount}&liveId=${cursor.liveId}`;
        }

        const data = await this.fetchWithRetry("chzzk", url);

        let lives = [];
        if (data?.content?.data) {
          lives = data.content.data;
        }

        if (lives.length === 0) break;

        for (const live of lives) {
          allBroadcasts.push({
            platform: "chzzk",
            channelId: live.channel?.channelId || live.channelId,
            broadcastId: String(live.liveId),
            streamerId: live.channel?.channelId || live.channelId,
            nickname: live.channel?.channelName || "Unknown",
            title: live.liveTitle || "",
            categoryId: live.liveCategory || null,
            categoryName: live.liveCategoryValue || null,
            viewerCount: live.concurrentUserCount || 0,
            thumbnailUrl: live.liveImageUrl || null,
            profileImageUrl: live.channel?.channelImageUrl || null,
            startedAt: live.openDate || null,
          });
        }

        broadcastLogger.debug("Chzzk page fetched", { page: page + 1, count: lives.length });

        // 다음 페이지 커서
        if (data?.content?.page?.next) {
          cursor = {
            concurrentUserCount: data.content.page.next.concurrentUserCount,
            liveId: data.content.page.next.liveId,
          };
        } else {
          break;
        }

        if (allBroadcasts.length >= maxBroadcasts) break;
      } catch (error) {
        broadcastLogger.error("Chzzk page failed", { page: page + 1, error: error.message });
        break;
      }
    }

    broadcastLogger.info("Chzzk live broadcasts fetched", { count: allBroadcasts.length });
    return allBroadcasts.slice(0, maxBroadcasts);
  }

  /**
   * 방송자 Person upsert
   * @param {Object} broadcast - 방송 데이터
   * @returns {Promise<number>} - Person ID
   */
  async upsertBroadcaster(broadcast) {
    return this.personService.upsertPerson({
      platform: broadcast.platform,
      platformUserId: broadcast.streamerId,
      nickname: broadcast.nickname,
      profileImageUrl: broadcast.profileImageUrl,
      channelId: broadcast.channelId,
    });
  }

  /**
   * 방송 세션 upsert (카테고리 정보는 세그먼트로 분리)
   * @param {Object} broadcast - 방송 데이터
   * @param {number} broadcasterPersonId - 방송자 Person ID
   * @returns {Promise<number>} - Broadcast ID
   */
  async upsertBroadcast(broadcast, broadcasterPersonId) {
    return new Promise((resolve, reject) => {
      // 기존 방송 조회 (UNIQUE: platform, channel_id, broadcast_id)
      this.db.get(
        `SELECT id, peak_viewer_count, viewer_sum, snapshot_count
         FROM broadcasts
         WHERE platform = ? AND channel_id = ? AND broadcast_id = ?`,
        [broadcast.platform, broadcast.channelId, broadcast.broadcastId],
        async (err, row) => {
          if (err) {
            reject(err);
            return;
          }

          if (row) {
            // 기존 방송 업데이트
            const newPeak = Math.max(row.peak_viewer_count, broadcast.viewerCount);
            const newSum = row.viewer_sum + broadcast.viewerCount;
            const newCount = row.snapshot_count + 1;
            const newAvg = Math.round(newSum / newCount);

            this.db.run(
              `UPDATE broadcasts
               SET title = ?,
                   thumbnail_url = ?,
                   current_viewer_count = ?,
                   peak_viewer_count = ?,
                   avg_viewer_count = ?,
                   viewer_sum = ?,
                   snapshot_count = ?,
                   is_live = 1,
                   updated_at = CURRENT_TIMESTAMP
               WHERE id = ?`,
              [
                broadcast.title,
                broadcast.thumbnailUrl,
                broadcast.viewerCount,
                newPeak,
                newAvg,
                newSum,
                newCount,
                row.id,
              ],
              async (updateErr) => {
                if (updateErr) {
                  reject(updateErr);
                } else {
                  // 카테고리 변경 확인 및 세그먼트 관리
                  await this.handleCategoryChange(row.id, broadcast);
                  // Insert viewer snapshot
                  const segmentId = await this.getCurrentSegmentId(row.id);
                  this.insertViewerSnapshot(row.id, broadcast, segmentId);
                  resolve(row.id);
                }
              }
            );
          } else {
            // 새 방송 생성
            const self = this;
            this.db.run(
              `INSERT INTO broadcasts (
                platform, channel_id, broadcast_id, broadcaster_person_id,
                title, thumbnail_url,
                current_viewer_count, peak_viewer_count, avg_viewer_count,
                viewer_sum, snapshot_count, is_live, started_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
              [
                broadcast.platform,
                broadcast.channelId,
                broadcast.broadcastId,
                broadcasterPersonId,
                broadcast.title,
                broadcast.thumbnailUrl,
                broadcast.viewerCount,
                broadcast.viewerCount, // peak = current initially
                broadcast.viewerCount, // avg = current initially
                broadcast.viewerCount, // sum = current initially
                1, // snapshot count = 1
                broadcast.startedAt || new Date().toISOString(),
              ],
              async function (insertErr) {
                if (insertErr) {
                  reject(insertErr);
                } else {
                  const broadcastDbId = this.lastID;
                  broadcastLogger.debug("New broadcast session", {
                    platform: broadcast.platform,
                    channelId: broadcast.channelId,
                    category: broadcast.categoryName,
                    title: broadcast.title?.substring(0, 30),
                    viewers: broadcast.viewerCount,
                  });

                  // 첫 번째 세그먼트 생성
                  const segmentId = await self.createSegment(broadcastDbId, broadcast);

                  // Insert first viewer snapshot
                  self.insertViewerSnapshot(broadcastDbId, broadcast, segmentId);
                  resolve(broadcastDbId);
                }
              }
            );
          }
        }
      );
    });
  }

  /**
   * 세그먼트 생성
   * @param {number} broadcastDbId - broadcasts 테이블 ID
   * @param {Object} broadcast - 방송 데이터
   * @returns {Promise<number>} - Segment ID
   */
  async createSegment(broadcastDbId, broadcast) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO broadcast_segments (
          broadcast_id, platform, channel_id,
          category_id, category_name,
          segment_started_at, peak_viewer_count, avg_viewer_count
        ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)`,
        [
          broadcastDbId,
          broadcast.platform,
          broadcast.channelId,
          broadcast.categoryId,
          broadcast.categoryName,
          broadcast.viewerCount,
          broadcast.viewerCount,
        ],
        function (err) {
          if (err) {
            broadcastLogger.error("Segment create error", { error: err.message });
            reject(err);
          } else {
            const segmentId = this.lastID;
            broadcastLogger.debug("New segment created", {
              broadcastId: broadcastDbId,
              segmentId,
              category: broadcast.categoryName,
            });
            resolve(segmentId);
          }
        }
      );
    });
  }

  /**
   * 현재 활성 세그먼트 ID 조회
   * @param {number} broadcastDbId - broadcasts 테이블 ID
   * @returns {Promise<number|null>}
   */
  async getCurrentSegmentId(broadcastDbId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT id FROM broadcast_segments
         WHERE broadcast_id = ? AND segment_ended_at IS NULL
         ORDER BY segment_started_at DESC LIMIT 1`,
        [broadcastDbId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row ? row.id : null);
        }
      );
    });
  }

  /**
   * 카테고리 변경 감지 및 세그먼트 관리
   * @param {number} broadcastDbId - broadcasts 테이블 ID
   * @param {Object} broadcast - 방송 데이터
   */
  async handleCategoryChange(broadcastDbId, broadcast) {
    return new Promise((resolve, reject) => {
      // 현재 활성 세그먼트 조회
      this.db.get(
        `SELECT id, category_id, peak_viewer_count FROM broadcast_segments
         WHERE broadcast_id = ? AND segment_ended_at IS NULL
         ORDER BY segment_started_at DESC LIMIT 1`,
        [broadcastDbId],
        async (err, currentSegment) => {
          if (err) {
            reject(err);
            return;
          }

          // 세그먼트가 없으면 생성
          if (!currentSegment) {
            await this.createSegment(broadcastDbId, broadcast);
            resolve();
            return;
          }

          // 카테고리가 변경되었는지 확인
          const categoryChanged = currentSegment.category_id !== broadcast.categoryId;

          if (categoryChanged) {
            broadcastLogger.info("Category changed, creating new segment", {
              broadcastId: broadcastDbId,
              from: currentSegment.category_id,
              to: broadcast.categoryId,
            });

            // 이전 세그먼트 종료
            this.db.run(
              `UPDATE broadcast_segments SET segment_ended_at = CURRENT_TIMESTAMP WHERE id = ?`,
              [currentSegment.id],
              async (updateErr) => {
                if (updateErr) {
                  broadcastLogger.error("Segment end error", { error: updateErr.message });
                }
                // 새 세그먼트 생성
                await this.createSegment(broadcastDbId, broadcast);
                resolve();
              }
            );
          } else {
            // 카테고리 동일 - 세그먼트 통계만 업데이트
            const newPeak = Math.max(currentSegment.peak_viewer_count, broadcast.viewerCount);
            this.db.run(
              `UPDATE broadcast_segments SET peak_viewer_count = ? WHERE id = ?`,
              [newPeak, currentSegment.id],
              (updateErr) => {
                if (updateErr) {
                  broadcastLogger.error("Segment update error", { error: updateErr.message });
                }
                resolve();
              }
            );
          }
        }
      );
    });
  }

  /**
   * 시청자 스냅샷 저장
   * @param {number} broadcastDbId - broadcasts 테이블 ID
   * @param {Object} broadcast - 방송 데이터
   * @param {number|null} segmentId - 세그먼트 ID
   */
  insertViewerSnapshot(broadcastDbId, broadcast, segmentId = null) {
    this.db.run(
      `INSERT INTO viewer_snapshots (platform, channel_id, broadcast_id, segment_id, viewer_count, snapshot_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [broadcast.platform, broadcast.channelId, broadcastDbId, segmentId, broadcast.viewerCount],
      (err) => {
        if (err) {
          broadcastLogger.error("Viewer snapshot insert error", { error: err.message });
        }
      }
    );
  }

  /**
   * 종료된 방송 감지 및 업데이트
   * @param {string} platform - 플랫폼
   * @param {Set<string>} currentBroadcastIds - 현재 라이브 방송 ID 세트
   * @returns {Promise<number>} - 종료 처리된 방송 수
   */
  async detectEndedBroadcasts(platform, currentBroadcastIds) {
    return new Promise((resolve, reject) => {
      // 현재 라이브인 방송 중 목록에 없는 것 찾기
      this.db.all(
        `SELECT id, broadcast_id, channel_id, started_at
         FROM broadcasts
         WHERE platform = ? AND is_live = 1`,
        [platform],
        async (err, rows) => {
          if (err) {
            reject(err);
            return;
          }

          let endedCount = 0;

          for (const row of rows) {
            if (!currentBroadcastIds.has(row.broadcast_id)) {
              // 방송 종료 처리
              await this.markBroadcastEnded(row.id, row.started_at);
              endedCount++;

              broadcastLogger.info("Broadcast ended", {
                platform,
                broadcastId: row.broadcast_id,
                channelId: row.channel_id,
              });
            }
          }

          if (endedCount > 0) {
            broadcastLogger.info(`${platform}: ${endedCount} broadcasts ended`);
          }

          resolve(endedCount);
        }
      );
    });
  }

  /**
   * 방송 종료 처리
   * @param {number} broadcastId - Broadcast 테이블 ID
   * @param {string} startedAt - 방송 시작 시간
   */
  async markBroadcastEnded(broadcastId, startedAt) {
    return new Promise((resolve, reject) => {
      const endedAt = new Date().toISOString();
      const startDate = new Date(startedAt);
      const endDate = new Date(endedAt);
      const durationMinutes = Math.round((endDate - startDate) / (1000 * 60));

      // 방송 종료
      this.db.run(
        `UPDATE broadcasts
         SET is_live = 0,
             ended_at = ?,
             duration_minutes = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [endedAt, durationMinutes, broadcastId],
        async (err) => {
          if (err) {
            reject(err);
            return;
          }

          // 열린 세그먼트 종료
          this.db.run(
            `UPDATE broadcast_segments
             SET segment_ended_at = ?
             WHERE broadcast_id = ? AND segment_ended_at IS NULL`,
            [endedAt, broadcastId],
            async (segErr) => {
              if (segErr) {
                broadcastLogger.error("Segment end error", { error: segErr.message });
              }

              // 방송자의 총 방송 시간 업데이트
              const broadcast = await this.getBroadcastById(broadcastId);
              if (broadcast && broadcast.broadcaster_person_id) {
                await this.personService.addBroadcastMinutes(
                  broadcast.broadcaster_person_id,
                  durationMinutes
                );
              }

              resolve();
            }
          );
        }
      );
    });
  }

  /**
   * Broadcast ID로 조회
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async getBroadcastById(id) {
    return new Promise((resolve, reject) => {
      this.db.get(`SELECT * FROM broadcasts WHERE id = ?`, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      });
    });
  }

  /**
   * 방송의 현재 카테고리 조회 (최신 세그먼트에서)
   * @param {number} broadcastId - broadcasts 테이블 ID
   * @returns {Promise<Object|null>}
   */
  async getBroadcastCurrentCategory(broadcastId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT category_id, category_name FROM broadcast_segments
         WHERE broadcast_id = ?
         ORDER BY segment_started_at DESC LIMIT 1`,
        [broadcastId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row || null);
        }
      );
    });
  }

  /**
   * 모든 플랫폼 크롤링 실행
   * @returns {Promise<Object>} - 크롤링 결과
   */
  async crawlAllPlatforms() {
    broadcastLogger.info("Starting broadcast crawl...");

    const results = {
      soop: { live: 0, ended: 0, segments: 0 },
      chzzk: { live: 0, ended: 0, segments: 0 },
    };

    // SOOP 크롤링
    let soopBroadcasts = [];
    try {
      soopBroadcasts = await this.fetchSoopLiveBroadcasts();
      const soopBroadcastIds = new Set();

      for (const broadcast of soopBroadcasts) {
        try {
          const personId = await this.upsertBroadcaster(broadcast);
          await this.upsertBroadcast(broadcast, personId);
          soopBroadcastIds.add(broadcast.broadcastId);
        } catch (error) {
          broadcastLogger.error("SOOP broadcast upsert error", {
            channelId: broadcast.channelId,
            error: error.message,
          });
        }
      }

      results.soop.live = soopBroadcasts.length;
      results.soop.ended = await this.detectEndedBroadcasts("soop", soopBroadcastIds);

      // 상위 50개 방송에 자동 WebSocket 연결
      await this.autoConnectTopBroadcasts(soopBroadcasts, "soop");
    } catch (error) {
      broadcastLogger.error("SOOP crawl failed", { error: error.message });
    }

    // Chzzk 크롤링
    let chzzkBroadcasts = [];
    try {
      chzzkBroadcasts = await this.fetchChzzkLiveBroadcasts();
      const chzzkBroadcastIds = new Set();

      for (const broadcast of chzzkBroadcasts) {
        try {
          const personId = await this.upsertBroadcaster(broadcast);
          await this.upsertBroadcast(broadcast, personId);
          chzzkBroadcastIds.add(broadcast.broadcastId);
        } catch (error) {
          broadcastLogger.error("Chzzk broadcast upsert error", {
            channelId: broadcast.channelId,
            error: error.message,
          });
        }
      }

      results.chzzk.live = chzzkBroadcasts.length;
      results.chzzk.ended = await this.detectEndedBroadcasts("chzzk", chzzkBroadcastIds);

      // 상위 50개 방송에 자동 WebSocket 연결
      await this.autoConnectTopBroadcasts(chzzkBroadcasts, "chzzk");
    } catch (error) {
      broadcastLogger.error("Chzzk crawl failed", { error: error.message });
    }

    // 자동 연결 상태 추가
    results.autoConnections = this.getAutoConnectionStatus();

    broadcastLogger.info("Broadcast crawl complete", results);

    // Socket.io로 실시간 업데이트 브로드캐스트
    if (this.io) {
      this.io.emit("broadcast-stats-update", results);
    }

    return results;
  }

  /**
   * 현재 라이브 방송 통계 조회
   * @returns {Promise<Object>}
   */
  async getLiveStats() {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT
           platform,
           COUNT(*) as live_count,
           SUM(current_viewer_count) as total_viewers
         FROM broadcasts
         WHERE is_live = 1
         GROUP BY platform`,
        [],
        (err, row) => {
          if (err) reject(err);
          else resolve(row || {});
        }
      );
    });
  }

  /**
   * 플랫폼별 라이브 방송 통계 조회
   * @returns {Promise<Array>}
   */
  async getLiveStatsByPlatform() {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT
           platform,
           COUNT(*) as live_count,
           SUM(current_viewer_count) as total_viewers,
           AVG(current_viewer_count) as avg_viewers,
           MAX(current_viewer_count) as max_viewers
         FROM broadcasts
         WHERE is_live = 1
         GROUP BY platform`,
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  /**
   * 주기적 크롤링 시작
   */
  startScheduledCrawl() {
    broadcastLogger.info("Starting scheduled broadcast crawl", {
      intervalMinutes: this.crawlIntervalMs / 60000,
    });

    // 즉시 첫 크롤링 실행
    this.crawlAllPlatforms().catch((err) => {
      broadcastLogger.error("Initial crawl failed", { error: err.message });
    });

    // 주기적 크롤링 설정
    this.crawlInterval = setInterval(() => {
      this.crawlAllPlatforms().catch((err) => {
        broadcastLogger.error("Scheduled crawl failed", { error: err.message });
      });
    }, this.crawlIntervalMs);
  }

  /**
   * 주기적 크롤링 중지
   */
  stopScheduledCrawl() {
    if (this.crawlInterval) {
      clearInterval(this.crawlInterval);
      this.crawlInterval = null;
      broadcastLogger.info("Scheduled broadcast crawl stopped");
    }
  }

  // ===== Auto WebSocket Connection Methods =====

  /**
   * 상위 N개 방송에 자동 WebSocket 연결
   * @param {Array} broadcasts - 시청자 수 기준 정렬된 방송 목록
   * @param {string} platform - 플랫폼 (soop, chzzk)
   */
  async autoConnectTopBroadcasts(broadcasts, platform) {
    if (!this.ChzzkAdapter || !this.SoopAdapter || !this.normalizer) {
      broadcastLogger.debug("Auto-connection disabled: adapters not configured");
      return;
    }

    const topBroadcasts = broadcasts.slice(0, this.maxAutoConnections);
    const currentChannelIds = new Set(topBroadcasts.map((b) => b.channelId));

    // 1. 새로운 채널 연결
    for (const broadcast of topBroadcasts) {
      const adapterKey = this.getAdapterKey(platform, broadcast.channelId);

      if (!this.activeAdapters.has(adapterKey)) {
        try {
          await this.connectToChannel(platform, broadcast);
        } catch (error) {
          // "not live" errors are expected during crawling - don't log as error
        }
      }
    }

    // 2. 순위 밖으로 밀려난 채널 연결 해제
    await this.disconnectOutOfRankChannels(platform, currentChannelIds);
  }

  /**
   * 어댑터 키 생성
   * @param {string} platform
   * @param {string} channelId
   * @returns {string}
   */
  getAdapterKey(platform, channelId) {
    return platform === "soop" ? `soop:${channelId}:auto` : `${channelId}:auto`;
  }

  /**
   * 채널에 WebSocket 연결
   * @param {string} platform
   * @param {Object} broadcast
   */
  async connectToChannel(platform, broadcast) {
    const AdapterClass = platform === "chzzk" ? this.ChzzkAdapter : this.SoopAdapter;
    const adapterKey = this.getAdapterKey(platform, broadcast.channelId);

    const adapter = new AdapterClass({
      channelId: broadcast.channelId,
    });

    // ViewerEngagement 서비스 생성 (필요 시)
    const viewerEngagementService = this.ViewerEngagementService
      ? new this.ViewerEngagementService(this.db)
      : null;

    // Look up broadcast DB record to get IDs for event storage
    const broadcastDbRecord = await this.getBroadcastByApiId(
      platform,
      broadcast.channelId,
      broadcast.broadcastId
    );

    // 이벤트 핸들러 설정
    adapter.on("event", async (event) => {
      // user-enter/user-exit 이벤트는 normalizer 처리 스킵 (SOOP only)
      // 이미 trackPersonAndEngagement에서 세션 처리됨
      const isSessionEvent = event.type === "user-enter" || event.type === "user-exit";

      // Person 및 Engagement 추적 + Events 테이블 저장
      await this.trackPersonAndEngagement(event, broadcast.channelId, {
        categoryId: broadcast.categoryId,
        categoryName: broadcast.categoryName,
        broadcastDbId: broadcastDbRecord?.id || null,
        broadcasterPersonId: broadcastDbRecord?.broadcaster_person_id || null,
      }, viewerEngagementService);

      // Socket.io로 브로드캐스트 (auto 연결은 특정 room 없이)
      // 세션 이벤트는 normalizer 처리 스킵 (events 테이블 제약 위반 방지)
      if (this.io && this.normalizer && !isSessionEvent) {
        const legacyEvent = this.normalizer.toEventsFormat(event);
        this.io.emit("auto-monitor-event", legacyEvent);
      }

      // viewer-update는 너무 많으므로 로그 제외
      if (event.type !== "viewer-update") {
        broadcastLogger.debug(`[${platform}:auto] Event: ${event.type} from ${event.sender?.nickname || "system"}`);
      }
    });

    adapter.on("connected", () => {
      this.autoConnectedChannels.add(adapterKey);
    });

    adapter.on("disconnected", () => {
      this.autoConnectedChannels.delete(adapterKey);
    });

    adapter.on("error", (error) => {
      // "not live" errors are expected during auto-connect - don't log
      const msg = error.message || "";
      if (!msg.includes("not live") && !msg.includes("not found")) {
        broadcastLogger.error(`[${platform}:auto] Error:`, { error: msg });
      }
    });

    await adapter.connect();
    this.activeAdapters.set(adapterKey, adapter);
    this.autoConnectedChannels.add(adapterKey);
  }

  /**
   * API broadcast ID로 DB 레코드 조회
   * @param {string} platform
   * @param {string} channelId
   * @param {string} broadcastId
   * @returns {Promise<Object|null>}
   */
  async getBroadcastByApiId(platform, channelId, broadcastId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT id, broadcaster_person_id FROM broadcasts
         WHERE platform = ? AND channel_id = ? AND broadcast_id = ?`,
        [platform, channelId, broadcastId],
        (err, row) => {
          if (err) {
            broadcastLogger.error("getBroadcastByApiId error", { error: err.message });
            resolve(null);
          } else {
            resolve(row || null);
          }
        }
      );
    });
  }

  /**
   * Person 및 Engagement 추적 + Events 테이블 저장
   * @param {Object} event - Normalized event
   * @param {string} broadcasterChannelId
   * @param {Object} broadcastInfo - { categoryId, categoryName, broadcastDbId, broadcasterPersonId }
   * @param {ViewerEngagementService} viewerEngagementService
   */
  async trackPersonAndEngagement(event, broadcasterChannelId, broadcastInfo, viewerEngagementService) {
    const hasSenderId = event.sender?.id && event.sender.id !== "system" && event.sender.id !== "unknown";
    const isDonation = event.type === "donation";

    // Skip non-donation events without valid sender.id
    if (!hasSenderId && !isDonation) return;

    try {
      let personId = null;

      // 1. Upsert person (viewer) - only if valid sender.id exists
      if (hasSenderId && this.personService) {
        personId = await this.personService.upsertPerson({
          platform: event.platform,
          platformUserId: event.sender.id,
          nickname: event.sender.nickname,
          profileImageUrl: event.sender.profileImage || event.sender.profileImageUrl,
        });
      }

      // 2. Insert event into events table (donations always stored, even anonymous)
      // Skip session events (user-enter/user-exit) - not valid for events table
      const isSessionEvent = event.type === "user-enter" || event.type === "user-exit";
      if (this.eventService && broadcasterChannelId && !isSessionEvent) {
        await this.eventService.createFromNormalized(event, {
          actorPersonId: personId,
          targetPersonId: broadcastInfo.broadcasterPersonId || null,
          targetChannelId: broadcasterChannelId,
          broadcastId: broadcastInfo.broadcastDbId || null,
        });

        // Log donation events for debugging
        if (isDonation) {
          broadcastLogger.info("[auto] Donation stored", {
            platform: event.platform,
            amount: event.content?.amount,
            senderId: event.sender?.id || "anonymous",
            nickname: event.sender?.nickname,
          });
        }
      }

      // 3. Record viewer engagement (only if personId exists)
      if (personId && viewerEngagementService && broadcasterChannelId) {
        await viewerEngagementService.recordEngagement({
          personId,
          broadcasterPersonId: broadcastInfo.broadcasterPersonId || null,
          channelId: broadcasterChannelId,
          platform: event.platform,
          categoryId: broadcastInfo.categoryId || null,
          eventType: event.type,
          donationAmount: event.content?.amount || 0,
        });
      }
    } catch (error) {
      console.error("[auto] Track error:", error?.message || String(error), "| eventType:", event.type, "| platform:", event.platform);
      if (error?.stack) console.error("  Stack:", error.stack.split('\n')[1]?.trim());
    }
  }

  /**
   * 순위 밖 채널 연결 해제
   * @param {string} platform
   * @param {Set<string>} currentChannelIds - 현재 상위 채널 ID 세트
   */
  async disconnectOutOfRankChannels(platform, currentChannelIds) {
    const prefix = platform === "soop" ? "soop:" : "";
    const suffix = ":auto";

    for (const [key, adapter] of this.activeAdapters.entries()) {
      // 자동 연결된 어댑터만 처리
      if (!key.endsWith(suffix)) continue;

      // 플랫폼 확인
      const isTargetPlatform =
        (platform === "soop" && key.startsWith("soop:")) ||
        (platform === "chzzk" && !key.startsWith("soop:"));

      if (!isTargetPlatform) continue;

      // 채널 ID 추출
      const channelId = platform === "soop"
        ? key.replace("soop:", "").replace(":auto", "")
        : key.replace(":auto", "");

      // 현재 상위 목록에 없으면 연결 해제
      if (!currentChannelIds.has(channelId)) {
        broadcastLogger.info("Disconnecting out-of-rank channel", {
          platform,
          channelId,
        });

        try {
          adapter.disconnect();
          this.activeAdapters.delete(key);
          this.autoConnectedChannels.delete(key);
        } catch (error) {
          broadcastLogger.error("Disconnect failed", {
            platform,
            channelId,
            error: error.message,
          });
        }
      }
    }
  }

  /**
   * 종료된 방송 연결 해제
   * @param {string} platform
   * @param {Set<string>} liveBroadcastIds - 현재 라이브 방송 ID 세트
   */
  async disconnectEndedBroadcasts(platform, liveBroadcastIds) {
    const suffix = ":auto";

    for (const [key, adapter] of this.activeAdapters.entries()) {
      if (!key.endsWith(suffix)) continue;

      const isTargetPlatform =
        (platform === "soop" && key.startsWith("soop:")) ||
        (platform === "chzzk" && !key.startsWith("soop:"));

      if (!isTargetPlatform) continue;

      const channelId = platform === "soop"
        ? key.replace("soop:", "").replace(":auto", "")
        : key.replace(":auto", "");

      // 채널이 더 이상 라이브가 아니면 연결 해제
      if (!liveBroadcastIds.has(channelId)) {
        broadcastLogger.info("Disconnecting ended broadcast", {
          platform,
          channelId,
        });

        try {
          adapter.disconnect();
          this.activeAdapters.delete(key);
          this.autoConnectedChannels.delete(key);
        } catch (error) {
          broadcastLogger.error("Disconnect ended broadcast failed", {
            platform,
            channelId,
            error: error.message,
          });
        }
      }
    }
  }

  /**
   * 현재 자동 연결 상태 조회
   * @returns {Object}
   */
  getAutoConnectionStatus() {
    const soopConnections = [];
    const chzzkConnections = [];

    for (const [key, adapter] of this.activeAdapters.entries()) {
      if (!key.endsWith(":auto")) continue;

      const info = adapter.getInfo ? adapter.getInfo() : {};
      const connection = { key, ...info };

      if (key.startsWith("soop:")) {
        soopConnections.push(connection);
      } else {
        chzzkConnections.push(connection);
      }
    }

    return {
      soop: {
        count: soopConnections.length,
        maxConnections: this.maxAutoConnections,
        connections: soopConnections,
      },
      chzzk: {
        count: chzzkConnections.length,
        maxConnections: this.maxAutoConnections,
        connections: chzzkConnections,
      },
      totalAutoConnected: this.autoConnectedChannels.size,
    };
  }
}

module.exports = BroadcastCrawler;
