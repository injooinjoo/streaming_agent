/**
 * Analytics Collector
 *
 * 메인 수집 오케스트레이터
 * - API 폴링 (전체 방송 목록)
 * - WebSocket 관리 (선택적 방송 시청자/후원 수집)
 * - 스냅샷 저장 및 집계
 */

const EventEmitter = require("events");
const ApiCollector = require("./ApiCollector");
const WebSocketManager = require("./WebSocketManager");
const { getAllConfig } = require("../../db/init-analytics");

class AnalyticsCollector extends EventEmitter {
  /**
   * @param {sqlite3.Database} db - 데이터베이스 인스턴스
   * @param {Object} options - 설정 옵션
   */
  constructor(db, options = {}) {
    super();

    this.db = db;
    this.options = {
      // 기본값 (DB 설정으로 오버라이드됨)
      maxWebSocketConnections: 100,
      minViewersThreshold: 100,
      snapshotIntervalSeconds: 300,
      apiPollingIntervalSeconds: 300,
      ...options,
    };

    // 컴포넌트
    this.apiCollector = null;
    this.wsManager = null;

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
    };
  }

  /**
   * 수집기 시작
   */
  async start() {
    if (this.isRunning) {
      console.log("[AnalyticsCollector] Already running");
      return;
    }

    console.log("[AnalyticsCollector] Starting...");

    // DB에서 설정 로드
    await this.loadConfig();

    // API Collector 초기화
    this.apiCollector = new ApiCollector(this.db);
    this.apiCollector.on("broadcast-update", (data) => this.emit("broadcast-update", data));
    this.apiCollector.on("error", (err) => this.emit("error", err));

    // WebSocket Manager 초기화
    this.wsManager = new WebSocketManager(this.db, {
      maxConnections: this.options.maxWebSocketConnections,
    });
    this.wsManager.on("viewer-list", (data) => this.handleViewerList(data));
    this.wsManager.on("donation", (data) => this.handleDonation(data));
    this.wsManager.on("error", (err) => this.emit("error", err));

    // 첫 번째 폴링 즉시 실행
    await this.runApiPoll();

    // 주기적 API 폴링 시작
    this.apiPollInterval = setInterval(
      () => this.runApiPoll(),
      this.options.apiPollingIntervalSeconds * 1000
    );

    // 첫 번째 스냅샷은 30초 후 실행 (WebSocket 연결 안정화 대기)
    setTimeout(() => {
      this.runSnapshot();
    }, 30000);

    // 주기적 스냅샷 시작 (WebSocket에서 유저 목록 수집)
    this.snapshotInterval = setInterval(
      () => this.runSnapshot(),
      this.options.snapshotIntervalSeconds * 1000
    );

    this.isRunning = true;
    this.stats.startedAt = new Date();

    console.log("[AnalyticsCollector] Started successfully");
    console.log(`  - API Polling: every ${this.options.apiPollingIntervalSeconds}s`);
    console.log(`  - Snapshot: every ${this.options.snapshotIntervalSeconds}s`);
    console.log(`  - Max WebSocket: ${this.options.maxWebSocketConnections}`);
    console.log(`  - Min Viewers: ${this.options.minViewersThreshold}`);
  }

  /**
   * 수집기 정지
   */
  async stop() {
    if (!this.isRunning) return;

    console.log("[AnalyticsCollector] Stopping...");

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

    this.isRunning = false;
    console.log("[AnalyticsCollector] Stopped");
  }

  /**
   * DB에서 설정 로드
   */
  async loadConfig() {
    try {
      const config = await getAllConfig(this.db);

      if (config.max_websocket_connections) {
        this.options.maxWebSocketConnections = parseInt(config.max_websocket_connections, 10);
      }
      if (config.min_viewers_threshold) {
        this.options.minViewersThreshold = parseInt(config.min_viewers_threshold, 10);
      }
      if (config.snapshot_interval_seconds) {
        this.options.snapshotIntervalSeconds = parseInt(config.snapshot_interval_seconds, 10);
      }
      if (config.api_polling_interval_seconds) {
        this.options.apiPollingIntervalSeconds = parseInt(config.api_polling_interval_seconds, 10);
      }

      console.log("[AnalyticsCollector] Config loaded from DB");
    } catch (err) {
      console.warn("[AnalyticsCollector] Failed to load config, using defaults:", err.message);
    }
  }

  /**
   * API 폴링 실행
   */
  async runApiPoll() {
    console.log("[AnalyticsCollector] Running API poll...");

    try {
      // 전체 라이브 방송 수집
      const broadcasts = await this.apiCollector.collectAllLiveBroadcasts();

      this.stats.apiPolls++;
      this.stats.broadcastsTracked = broadcasts.length;

      // WebSocket 연결 대상 결정
      const targetsToConnect = this.selectWebSocketTargets(broadcasts);

      // WebSocket Manager에 연결 대상 업데이트
      await this.wsManager.updateTargets(targetsToConnect);

      console.log(`[AnalyticsCollector] API poll complete: ${broadcasts.length} broadcasts, ${targetsToConnect.length} WS targets`);

      this.emit("api-poll-complete", {
        broadcastCount: broadcasts.length,
        wsTargetCount: targetsToConnect.length,
      });
    } catch (err) {
      console.error("[AnalyticsCollector] API poll error:", err.message);
      this.emit("error", err);
    }
  }

  /**
   * WebSocket 연결 대상 선택
   * @param {Array} broadcasts - 방송 목록
   * @returns {Array} 연결 대상
   */
  selectWebSocketTargets(broadcasts) {
    const targets = [];

    // 1. 수동 등록된 모니터링 대상 (우선)
    // TODO: monitoring_targets 테이블에서 조회

    // 2. 시청자 수 기준 자동 선택
    const sortedBroadcasts = [...broadcasts]
      .filter((b) => parseInt(b.total_view_cnt, 10) >= this.options.minViewersThreshold)
      .sort((a, b) => parseInt(b.total_view_cnt, 10) - parseInt(a.total_view_cnt, 10))
      .slice(0, this.options.maxWebSocketConnections);

    for (const broadcast of sortedBroadcasts) {
      targets.push({
        platform: "soop",
        broadcastId: broadcast.broad_no || broadcast.bno,
        streamerId: broadcast.user_id,
        streamerNick: broadcast.user_nick,
        viewers: parseInt(broadcast.total_view_cnt, 10),
      });
    }

    return targets;
  }

  /**
   * 스냅샷 실행 (WebSocket에서 유저 목록 수집)
   */
  async runSnapshot() {
    if (!this.wsManager) return;

    console.log("[AnalyticsCollector] Running snapshot...");

    try {
      const snapshotTime = this.roundToSnapshotTime(new Date());
      const results = await this.wsManager.collectAllViewerLists();

      let totalViewers = 0;

      for (const result of results) {
        if (result.viewers && result.viewers.length > 0) {
          await this.saveViewingRecords(result.broadcastId, result.viewers, snapshotTime);
          totalViewers += result.viewers.length;
        }
      }

      this.stats.snapshots++;
      this.stats.viewersTracked = totalViewers;

      console.log(`[AnalyticsCollector] Snapshot complete: ${results.length} broadcasts, ${totalViewers} viewers`);

      this.emit("snapshot-complete", {
        broadcastCount: results.length,
        viewerCount: totalViewers,
        snapshotTime,
      });
    } catch (err) {
      console.error("[AnalyticsCollector] Snapshot error:", err.message);
      this.emit("error", err);
    }
  }

  /**
   * 시청 기록 저장
   * @param {string} broadcastId
   * @param {Array} viewers
   * @param {Date} snapshotTime
   */
  async saveViewingRecords(broadcastId, viewers, snapshotTime) {
    const snapshotAt = snapshotTime.toISOString();

    // 배치 처리를 위해 트랜잭션 사용
    await new Promise((resolve, reject) => {
      this.db.run("BEGIN TRANSACTION", (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    let savedCount = 0;
    let errorCount = 0;

    for (const viewer of viewers) {
      try {
        // 1. platform_users에 유저 추가/업데이트하고 ID 가져오기
        const userId = await this.upsertUserAndGetId(viewer);

        if (userId) {
          // 2. viewing_records에 기록 추가 (직접 ID 사용)
          await this.insertViewingRecordDirect(broadcastId, userId, viewer, snapshotAt);
          savedCount++;
        } else {
          errorCount++;
        }
      } catch (err) {
        // 중복 등 무시할 수 있는 에러
        if (!err.message.includes("UNIQUE constraint")) {
          errorCount++;
        }
      }
    }

    // 트랜잭션 커밋
    await new Promise((resolve, reject) => {
      this.db.run("COMMIT", (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    if (errorCount > 0) {
      console.warn(`[AnalyticsCollector] Viewing records: ${savedCount} saved, ${errorCount} errors`);
    }
  }

  /**
   * 유저 추가/업데이트하고 ID 반환
   * @param {Object} viewer
   * @returns {Promise<number>} user id
   */
  upsertUserAndGetId(viewer) {
    return new Promise((resolve, reject) => {
      // INSERT OR REPLACE 후 ID 조회
      this.db.run(
        `INSERT INTO platform_users (platform, platform_user_id, username, nickname, last_seen_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(platform, platform_user_id) DO UPDATE SET
           nickname = excluded.nickname,
           last_seen_at = CURRENT_TIMESTAMP`,
        ["soop", viewer.userId, viewer.userId, viewer.nickname],
        function (err) {
          if (err) {
            reject(err);
            return;
          }
          // this.lastID는 INSERT 시에만 유효하므로, SELECT로 ID 가져오기
          resolve(this.lastID || null);
        }
      );
    }).then((lastId) => {
      if (lastId) return lastId;

      // UPDATE 경우 lastID가 없으므로 SELECT로 조회
      return new Promise((resolve, reject) => {
        this.db.get(
          `SELECT id FROM platform_users WHERE platform = ? AND platform_user_id = ?`,
          ["soop", viewer.userId],
          (err, row) => {
            if (err) reject(err);
            else resolve(row ? row.id : null);
          }
        );
      });
    });
  }

  /**
   * 유저 추가/업데이트 (하위 호환용)
   * @param {Object} viewer
   */
  upsertUser(viewer) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO platform_users (platform, platform_user_id, username, nickname, last_seen_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(platform, platform_user_id) DO UPDATE SET
           nickname = excluded.nickname,
           last_seen_at = CURRENT_TIMESTAMP`,
        ["soop", viewer.userId, viewer.userId, viewer.nickname],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  /**
   * 시청 기록 추가 (직접 ID 사용)
   * @param {string} broadcastId
   * @param {number} viewerId - platform_users.id
   * @param {Object} viewer
   * @param {string} snapshotAt
   */
  insertViewingRecordDirect(broadcastId, viewerId, viewer, snapshotAt) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT OR IGNORE INTO viewing_records
         (viewer_id, viewer_username, broadcast_id, streamer_id, snapshot_at, is_subscriber, is_fan)
         SELECT
           ?,
           ?,
           b.id,
           b.streamer_id,
           ?,
           ?,
           ?
         FROM broadcasts b
         WHERE b.platform = 'soop' AND b.broadcast_id = ?`,
        [
          viewerId,
          viewer.userId,
          snapshotAt,
          viewer.isSub ? 1 : 0,
          viewer.isFan ? 1 : 0,
          broadcastId,
        ],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  /**
   * 시청 기록 추가 (하위 호환용)
   * @param {string} broadcastId
   * @param {Object} viewer
   * @param {string} snapshotAt
   */
  insertViewingRecord(broadcastId, viewer, snapshotAt) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT OR IGNORE INTO viewing_records
         (viewer_id, viewer_username, broadcast_id, streamer_id, snapshot_at, is_subscriber, is_fan)
         SELECT
           u.id,
           ?,
           b.id,
           b.streamer_id,
           ?,
           ?,
           ?
         FROM platform_users u, broadcasts b
         WHERE u.platform = 'soop' AND u.platform_user_id = ?
           AND b.platform = 'soop' AND b.broadcast_id = ?`,
        [
          viewer.userId,
          snapshotAt,
          viewer.isSub ? 1 : 0,
          viewer.isFan ? 1 : 0,
          viewer.userId,
          broadcastId,
        ],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  /**
   * 후원 이벤트 처리
   * @param {Object} data
   */
  async handleDonation(data) {
    try {
      await this.saveDonation(data);
      this.stats.donationsTracked++;
      this.emit("donation", data);
    } catch (err) {
      console.warn("[AnalyticsCollector] Save donation error:", err.message);
    }
  }

  /**
   * 후원 저장
   * @param {Object} data
   */
  saveDonation(data) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO donations
         (sender_username, sender_nickname, receiver_username, broadcast_id,
          donation_type, item_count, amount_krw, message, donated_at)
         SELECT
           ?,
           ?,
           ?,
           b.id,
           ?,
           ?,
           ?,
           ?,
           CURRENT_TIMESTAMP
         FROM broadcasts b
         WHERE b.platform = 'soop' AND b.broadcast_id = ?`,
        [
          data.senderUserId,
          data.senderNickname,
          data.receiverUserId,
          data.donationType,
          data.count || 0,
          data.amountKrw || 0,
          data.message || null,
          data.broadcastId,
        ],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  /**
   * 시청자 목록 이벤트 처리
   * @param {Object} data
   */
  handleViewerList(data) {
    // 스냅샷 시점에 처리하므로 여기서는 조용히
    // 디버그 필요시 주석 해제
    // console.log(`[AnalyticsCollector] Viewer list: ${data.broadcastId} - ${data.viewers?.length || 0}`);
  }

  /**
   * 시간을 5분 단위로 반올림
   * @param {Date} date
   * @returns {Date}
   */
  roundToSnapshotTime(date) {
    const ms = date.getTime();
    const interval = this.options.snapshotIntervalSeconds * 1000;
    return new Date(Math.floor(ms / interval) * interval);
  }

  /**
   * 현재 상태 조회
   * @returns {Object}
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      stats: this.stats,
      wsConnections: this.wsManager ? this.wsManager.getConnectionCount() : 0,
      config: this.options,
    };
  }
}

module.exports = AnalyticsCollector;
