/**
 * UserSessionService - 시청자 입장/퇴장 세션 추적 서비스
 *
 * SOOP: 실제 입장/퇴장 패킷 기반 정확한 세션 추적
 * Chzzk: 채팅 활동 기반 추정 + 통계 보정
 *
 * Supports both SQLite (development) and PostgreSQL (production/Supabase)
 */

const { db: dbLogger } = require("./logger");
const { getSQLHelpers, isPostgres } = require("../config/database.config");

class UserSessionService {
  constructor(db) {
    this.db = db;
    // 활성 세션 메모리 캐시 (성능 최적화)
    // Key: platform:channel_id:person_id
    this.activeSessions = new Map();
  }

  /**
   * 입장 이벤트 처리 (세션 시작)
   * @param {Object} data - 입장 데이터
   * @param {number} [data.personId] - 시청자 Person ID
   * @param {string} data.userId - 플랫폼 사용자 ID
   * @param {string} data.nickname - 닉네임
   * @param {string} data.channelId - 채널 ID
   * @param {string} data.platform - 플랫폼
   * @param {number} [data.broadcastId] - 방송 ID
   * @param {string} [data.categoryId] - 카테고리 ID
   * @returns {Promise<number>} - Session ID
   */
  async handleUserEnter(data) {
    const {
      personId,
      userId,
      nickname,
      channelId,
      platform,
      broadcastId,
      categoryId,
    } = data;

    const sessionKey = `${platform}:${channelId}:${userId}`;

    // 이미 활성 세션이 있으면 무시 (중복 입장 패킷 방지)
    if (this.activeSessions.has(sessionKey)) {
      dbLogger.debug("Session already active", { sessionKey });
      return this.activeSessions.get(sessionKey).sessionId;
    }

    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO user_sessions (
          platform, channel_id, broadcast_id, person_id, user_nickname,
          session_started_at, category_id
        ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
        [platform, channelId, broadcastId, personId, nickname, categoryId],
        function (err) {
          if (err) {
            dbLogger.error("handleUserEnter error", { error: err.message, data });
            reject(err);
          } else {
            const sessionId = this.lastID;

            // 메모리 캐시에 추가
            this.activeSessions.set(sessionKey, {
              sessionId,
              startTime: Date.now(),
              broadcastId,
            });

            dbLogger.debug("User session started", {
              sessionId,
              nickname,
              channelId,
              platform,
            });

            resolve(sessionId);
          }
        }.bind(this)
      );
    });
  }

  /**
   * 퇴장 이벤트 처리 (세션 종료)
   * @param {Object} data - 퇴장 데이터
   * @param {string} data.userId - 플랫폼 사용자 ID
   * @param {string} data.channelId - 채널 ID
   * @param {string} data.platform - 플랫폼
   * @returns {Promise<void>}
   */
  async handleUserExit(data) {
    const { userId, channelId, platform } = data;
    const sessionKey = `${platform}:${channelId}:${userId}`;

    const session = this.activeSessions.get(sessionKey);

    if (!session) {
      dbLogger.debug("No active session to close", { sessionKey });
      return;
    }

    // 세션 duration 계산
    const durationSeconds = Math.floor((Date.now() - session.startTime) / 1000);

    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE user_sessions
         SET session_ended_at = CURRENT_TIMESTAMP,
             session_duration_seconds = ?
         WHERE id = ?`,
        [durationSeconds, session.sessionId],
        (err) => {
          if (err) {
            dbLogger.error("handleUserExit error", { error: err.message, sessionKey });
            reject(err);
          } else {
            dbLogger.debug("User session ended", {
              sessionId: session.sessionId,
              durationSeconds,
              channelId,
            });

            // 메모리에서 제거
            this.activeSessions.delete(sessionKey);
            resolve();
          }
        }
      );
    });
  }

  /**
   * 특정 방송의 총 시청자 수 조회 (Unique Viewers)
   * @param {number} broadcastId - 방송 ID
   * @returns {Promise<number>}
   */
  async getUniqueViewers(broadcastId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT COUNT(DISTINCT person_id) as total
         FROM user_sessions
         WHERE broadcast_id = ?`,
        [broadcastId],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row?.total || 0);
          }
        }
      );
    });
  }

  /**
   * 평균 시청 시간 조회
   * @param {number} broadcastId - 방송 ID
   * @returns {Promise<number>} - 평균 초 단위
   */
  async getAverageWatchTime(broadcastId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT AVG(session_duration_seconds) as avg_seconds
         FROM user_sessions
         WHERE broadcast_id = ? AND session_ended_at IS NOT NULL`,
        [broadcastId],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row?.avg_seconds || 0);
          }
        }
      );
    });
  }

  /**
   * 방송 종료 시 모든 활성 세션 강제 종료
   * @param {number} broadcastId - 방송 ID
   * @returns {Promise<number>} - 종료된 세션 수
   */
  async closeAllSessions(broadcastId) {
    // Cross-database duration calculation
    const durationCalc = isPostgres()
      ? `EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - session_started_at))::INTEGER`
      : `strftime('%s', CURRENT_TIMESTAMP) - strftime('%s', session_started_at)`;

    return new Promise((resolve, reject) => {
      // DB에서 세션 종료
      this.db.run(
        `UPDATE user_sessions
         SET session_ended_at = CURRENT_TIMESTAMP,
             session_duration_seconds = (${durationCalc})
         WHERE broadcast_id = ? AND session_ended_at IS NULL`,
        [broadcastId],
        function (err) {
          if (err) {
            dbLogger.error("closeAllSessions error", { error: err.message, broadcastId });
            reject(err);
          } else {
            const closedCount = this.changes;

            // 메모리 캐시에서 해당 방송 세션 제거
            for (const [key, value] of this.activeSessions.entries()) {
              if (value.broadcastId === broadcastId) {
                this.activeSessions.delete(key);
              }
            }

            dbLogger.info("All sessions closed for broadcast", {
              broadcastId,
              closedCount,
            });

            resolve(closedCount);
          }
        }.bind(this)
      );
    });
  }

  /**
   * 세션 타임아웃 처리 (1시간 이상 종료 안 된 세션)
   * Cron job에서 주기적으로 호출
   * @returns {Promise<number>} - 타임아웃 처리된 세션 수
   */
  async cleanupStaleSessions() {
    // Cross-database datetime calculations
    const endedAtCalc = isPostgres()
      ? `session_started_at + INTERVAL '1 hour'`
      : `datetime(session_started_at, '+1 hour')`;
    const oneHourAgo = isPostgres()
      ? `NOW() - INTERVAL '1 hour'`
      : `datetime('now', '-1 hour')`;

    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE user_sessions
         SET session_ended_at = ${endedAtCalc},
             session_duration_seconds = 3600
         WHERE session_ended_at IS NULL
           AND session_started_at < ${oneHourAgo}`,
        function (err) {
          if (err) {
            dbLogger.error("cleanupStaleSessions error", { error: err.message });
            reject(err);
          } else {
            const cleanedCount = this.changes;

            if (cleanedCount > 0) {
              dbLogger.info("Stale sessions cleaned up", { cleanedCount });
            }

            resolve(cleanedCount);
          }
        }
      );
    });
  }

  /**
   * 시청자의 특정 채널 방문 기록 조회
   * @param {number} personId - 시청자 Person ID
   * @param {string} channelId - 채널 ID
   * @param {string} platform - 플랫폼
   * @returns {Promise<Array>}
   */
  async getViewerHistory(personId, channelId, platform) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT
           id,
           session_started_at,
           session_ended_at,
           session_duration_seconds,
           category_id
         FROM user_sessions
         WHERE person_id = ? AND channel_id = ? AND platform = ?
         ORDER BY session_started_at DESC
         LIMIT 100`,
        [personId, channelId, platform],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows || []);
          }
        }
      );
    });
  }

  /**
   * 현재 활성 세션 수 조회 (메모리)
   * @returns {number}
   */
  getActiveSessionCount() {
    return this.activeSessions.size;
  }

  /**
   * 특정 방송의 현재 활성 세션 목록
   * @param {number} broadcastId - 방송 ID
   * @returns {Array}
   */
  getActiveSessions(broadcastId) {
    const sessions = [];
    for (const [key, value] of this.activeSessions.entries()) {
      if (value.broadcastId === broadcastId) {
        sessions.push({
          key,
          sessionId: value.sessionId,
          startTime: value.startTime,
          duration: Math.floor((Date.now() - value.startTime) / 1000),
        });
      }
    }
    return sessions;
  }
}

module.exports = UserSessionService;
