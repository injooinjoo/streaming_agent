/**
 * PersonService - 스트리머/시청자 통합 ID 관리 서비스
 *
 * persons 테이블에 대한 CRUD를 담당합니다.
 * NOTE: 채팅/후원 통계는 persons 테이블에 저장하지 않고 EVENTS에서 집계합니다.
 */

const { db: dbLogger } = require("./logger");

class PersonService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Person upsert (없으면 생성, 있으면 업데이트)
   * @param {Object} data - Person 데이터
   * @param {string} data.platform - 플랫폼 (soop, chzzk)
   * @param {string} data.platformUserId - 플랫폼 사용자 ID
   * @param {string} [data.nickname] - 닉네임
   * @param {string} [data.profileImageUrl] - 프로필 이미지 URL
   * @param {string} [data.channelId] - 채널 ID (방송자인 경우)
   * @param {string} [data.channelDescription] - 채널 설명
   * @param {number} [data.followerCount] - 팔로워 수
   * @param {number} [data.subscriberCount] - 구독자 수
   * @returns {Promise<number>} - Person ID
   */
  async upsertPerson(data) {
    const {
      platform,
      platformUserId,
      nickname,
      profileImageUrl,
      channelId,
      channelDescription,
      followerCount,
      subscriberCount,
    } = data;

    return new Promise((resolve, reject) => {
      // First, try to find existing person
      this.db.get(
        `SELECT id FROM persons WHERE platform = ? AND platform_user_id = ?`,
        [platform, platformUserId],
        (err, row) => {
          if (err) {
            dbLogger.error("PersonService.upsertPerson find error", { error: err.message });
            reject(err);
            return;
          }

          if (row) {
            // Update existing person
            const updates = [];
            const params = [];

            if (nickname !== undefined) {
              updates.push("nickname = ?");
              params.push(nickname);
            }
            if (profileImageUrl !== undefined) {
              updates.push("profile_image_url = ?");
              params.push(profileImageUrl);
            }
            if (channelId !== undefined) {
              updates.push("channel_id = ?");
              params.push(channelId);
            }
            if (channelDescription !== undefined) {
              updates.push("channel_description = ?");
              params.push(channelDescription);
            }
            if (followerCount !== undefined) {
              updates.push("follower_count = ?");
              params.push(followerCount);
            }
            if (subscriberCount !== undefined) {
              updates.push("subscriber_count = ?");
              params.push(subscriberCount);
            }

            updates.push("last_seen_at = CURRENT_TIMESTAMP");
            updates.push("updated_at = CURRENT_TIMESTAMP");

            params.push(row.id);

            this.db.run(
              `UPDATE persons SET ${updates.join(", ")} WHERE id = ?`,
              params,
              (updateErr) => {
                if (updateErr) {
                  dbLogger.error("PersonService.upsertPerson update error", { error: updateErr.message });
                  reject(updateErr);
                } else {
                  resolve(row.id);
                }
              }
            );
          } else {
            // Insert new person
            this.db.run(
              `INSERT INTO persons (
                platform, platform_user_id, nickname, profile_image_url,
                channel_id, channel_description, follower_count, subscriber_count
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                platform,
                platformUserId,
                nickname || null,
                profileImageUrl || null,
                channelId || null,
                channelDescription || null,
                followerCount || 0,
                subscriberCount || 0,
              ],
              function (insertErr) {
                if (insertErr) {
                  dbLogger.error("PersonService.upsertPerson insert error", { error: insertErr.message });
                  reject(insertErr);
                } else {
                  dbLogger.debug("New person created", {
                    platform,
                    platformUserId,
                    nickname,
                    id: this.lastID,
                  });
                  resolve(this.lastID);
                }
              }
            );
          }
        }
      );
    });
  }

  /**
   * Person ID로 조회
   * @param {number} id - Person ID
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    return new Promise((resolve, reject) => {
      this.db.get(`SELECT * FROM persons WHERE id = ?`, [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row || null);
        }
      });
    });
  }

  /**
   * 플랫폼 사용자 ID로 조회
   * @param {string} platform - 플랫폼
   * @param {string} platformUserId - 플랫폼 사용자 ID
   * @returns {Promise<Object|null>}
   */
  async findByPlatformId(platform, platformUserId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT * FROM persons WHERE platform = ? AND platform_user_id = ?`,
        [platform, platformUserId],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row || null);
          }
        }
      );
    });
  }

  /**
   * 채널 ID로 방송자 조회
   * @param {string} platform - 플랫폼
   * @param {string} channelId - 채널 ID
   * @returns {Promise<Object|null>}
   */
  async findBroadcasterByChannel(platform, channelId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT * FROM persons WHERE platform = ? AND channel_id = ?`,
        [platform, channelId],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row || null);
          }
        }
      );
    });
  }

  /**
   * 방송 시간 업데이트
   * @param {number} personId - Person ID
   * @param {number} minutes - 추가 방송 시간 (분)
   * @returns {Promise<void>}
   */
  async addBroadcastMinutes(personId, minutes) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE persons
         SET total_broadcast_minutes = total_broadcast_minutes + ?,
             last_broadcast_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [minutes, personId],
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  /**
   * Person의 채팅/후원 통계 조회 (EVENTS 테이블에서 집계)
   * @param {number} personId - Person ID
   * @returns {Promise<Object>}
   */
  async getPersonStats(personId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT
           COUNT(*) FILTER (WHERE event_type = 'chat') as total_chat_count,
           COUNT(*) FILTER (WHERE event_type = 'donation') as total_donation_count,
           COALESCE(SUM(CASE WHEN event_type = 'donation' THEN amount ELSE 0 END), 0) as total_donation_amount
         FROM events
         WHERE actor_person_id = ?`,
        [personId],
        (err, row) => {
          if (err) {
            // SQLite doesn't support FILTER, use CASE WHEN instead
            this.db.get(
              `SELECT
                 SUM(CASE WHEN event_type = 'chat' THEN 1 ELSE 0 END) as total_chat_count,
                 SUM(CASE WHEN event_type = 'donation' THEN 1 ELSE 0 END) as total_donation_count,
                 COALESCE(SUM(CASE WHEN event_type = 'donation' THEN amount ELSE 0 END), 0) as total_donation_amount
               FROM events
               WHERE actor_person_id = ?`,
              [personId],
              (err2, row2) => {
                if (err2) {
                  reject(err2);
                } else {
                  resolve(row2 || { total_chat_count: 0, total_donation_count: 0, total_donation_amount: 0 });
                }
              }
            );
          } else {
            resolve(row || { total_chat_count: 0, total_donation_count: 0, total_donation_amount: 0 });
          }
        }
      );
    });
  }

  /**
   * Person과 통계 함께 조회
   * @param {number} personId - Person ID
   * @returns {Promise<Object|null>}
   */
  async findByIdWithStats(personId) {
    const person = await this.findById(personId);
    if (!person) return null;

    const stats = await this.getPersonStats(personId);
    return { ...person, ...stats };
  }

  /**
   * 통계 요약 조회
   * @returns {Promise<Object>}
   */
  async getStatsSummary() {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT
           platform,
           SUM(CASE WHEN channel_id IS NOT NULL THEN 1 ELSE 0 END) as broadcasters,
           SUM(CASE WHEN channel_id IS NULL THEN 1 ELSE 0 END) as viewers,
           COUNT(*) as total
         FROM persons
         GROUP BY platform`,
        [],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row || {});
          }
        }
      );
    });
  }

  /**
   * 플랫폼별 통계 조회
   * @returns {Promise<Array>}
   */
  async getStatsByPlatform() {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT
           platform,
           SUM(CASE WHEN channel_id IS NOT NULL THEN 1 ELSE 0 END) as broadcasters,
           SUM(CASE WHEN channel_id IS NULL THEN 1 ELSE 0 END) as viewers,
           COUNT(*) as total
         FROM persons
         GROUP BY platform`,
        [],
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
   * 상위 후원자 조회 (EVENTS 기반)
   * @param {string} targetChannelId - 방송자 채널 ID
   * @param {number} limit - 조회 개수
   * @returns {Promise<Array>}
   */
  async getTopDonators(targetChannelId, limit = 10) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT
           p.id, p.nickname, p.platform, p.profile_image_url,
           COUNT(*) as donation_count,
           SUM(e.amount) as total_amount
         FROM events e
         JOIN persons p ON e.actor_person_id = p.id
         WHERE e.event_type = 'donation' AND e.target_channel_id = ?
         GROUP BY e.actor_person_id
         ORDER BY total_amount DESC
         LIMIT ?`,
        [targetChannelId, limit],
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
   * 활성 채터 조회 (EVENTS 기반)
   * @param {string} targetChannelId - 방송자 채널 ID
   * @param {number} limit - 조회 개수
   * @returns {Promise<Array>}
   */
  async getTopChatters(targetChannelId, limit = 10) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT
           p.id, p.nickname, p.platform, p.profile_image_url,
           COUNT(*) as chat_count
         FROM events e
         JOIN persons p ON e.actor_person_id = p.id
         WHERE e.event_type = 'chat' AND e.target_channel_id = ?
         GROUP BY e.actor_person_id
         ORDER BY chat_count DESC
         LIMIT ?`,
        [targetChannelId, limit],
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

  // ===== Backward Compatibility Methods =====
  // NOTE: These methods are deprecated and will be removed in future versions.
  // Chat/donation stats are now tracked via EVENTS table, not in persons table.

  /**
   * @deprecated Use eventService.recordEvent() instead
   * Kept for backward compatibility - does nothing now
   */
  async incrementChatCount(personId) {
    dbLogger.debug("incrementChatCount is deprecated - stats now tracked via EVENTS");
    // Update last_seen_at only
    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE persons SET last_seen_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [personId],
        (err) => (err ? reject(err) : resolve())
      );
    });
  }

  /**
   * @deprecated Use eventService.recordEvent() instead
   * Kept for backward compatibility - does nothing now
   */
  async incrementDonation(personId, amount) {
    dbLogger.debug("incrementDonation is deprecated - stats now tracked via EVENTS");
    // Update last_seen_at only
    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE persons SET last_seen_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [personId],
        (err) => (err ? reject(err) : resolve())
      );
    });
  }
}

module.exports = PersonService;
