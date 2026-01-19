/**
 * ViewerEngagementService - 시청자-방송자 관계 추적 서비스
 *
 * 누가 누구를 봤는지, 카테고리별로 누적 통계 관리
 * - chat_count: 채팅 횟수
 * - donation_count: 후원 횟수
 * - total_donation_amount: 후원 금액
 *
 * Schema: viewer_engagement (person_id, platform, channel_id, category_id unique)
 */

const { db: dbLogger } = require("./logger");

class ViewerEngagementService {
  constructor(db) {
    this.db = db;
  }

  /**
   * 시청자 참여 기록 upsert (채팅/후원 시 호출)
   * @param {Object} data - 참여 데이터
   * @param {number} data.personId - 시청자 Person ID
   * @param {number} [data.broadcasterPersonId] - 방송자 Person ID
   * @param {string} data.channelId - 방송자 채널 ID
   * @param {string} data.platform - 플랫폼
   * @param {string} [data.categoryId] - 카테고리 ID
   * @param {string} data.eventType - 이벤트 타입 (chat, donation)
   * @param {number} [data.donationAmount] - 후원 금액 (donation일 때)
   * @returns {Promise<number>} - Engagement ID
   */
  async recordEngagement(data) {
    const {
      personId,
      broadcasterPersonId,
      channelId,
      platform,
      categoryId,
      eventType,
      donationAmount = 0,
    } = data;

    return new Promise((resolve, reject) => {
      // 기존 레코드 조회 (같은 person + channel + platform + category)
      this.db.get(
        `SELECT id, chat_count, donation_count, total_donation_amount
         FROM viewer_engagement
         WHERE person_id = ? AND channel_id = ? AND platform = ? AND category_id IS ?`,
        [personId, channelId, platform, categoryId || null],
        (err, row) => {
          if (err) {
            dbLogger.error("ViewerEngagementService.recordEngagement find error", { error: err.message });
            reject(err);
            return;
          }

          if (row) {
            // 기존 레코드 업데이트
            const chatIncrement = eventType === "chat" ? 1 : 0;
            const donationIncrement = eventType === "donation" ? 1 : 0;

            this.db.run(
              `UPDATE viewer_engagement
               SET chat_count = chat_count + ?,
                   donation_count = donation_count + ?,
                   total_donation_amount = total_donation_amount + ?,
                   last_seen_at = CURRENT_TIMESTAMP,
                   updated_at = CURRENT_TIMESTAMP
               WHERE id = ?`,
              [chatIncrement, donationIncrement, donationAmount, row.id],
              (updateErr) => {
                if (updateErr) {
                  dbLogger.error("ViewerEngagementService.recordEngagement update error", { error: updateErr.message });
                  reject(updateErr);
                } else {
                  resolve(row.id);
                }
              }
            );
          } else {
            // 새 레코드 생성
            const chatCount = eventType === "chat" ? 1 : 0;
            const donationCount = eventType === "donation" ? 1 : 0;

            this.db.run(
              `INSERT INTO viewer_engagement (
                person_id, platform, channel_id, broadcaster_person_id,
                category_id, chat_count, donation_count, total_donation_amount
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                personId,
                platform,
                channelId,
                broadcasterPersonId || null,
                categoryId || null,
                chatCount,
                donationCount,
                donationAmount,
              ],
              function (insertErr) {
                if (insertErr) {
                  dbLogger.error("ViewerEngagementService.recordEngagement insert error", { error: insertErr.message });
                  reject(insertErr);
                } else {
                  dbLogger.debug("New viewer engagement created", {
                    personId,
                    channelId,
                    categoryId,
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
   * 특정 시청자의 모든 참여 기록 조회
   * @param {number} personId - 시청자 Person ID
   * @returns {Promise<Array>}
   */
  async getViewerEngagements(personId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT ve.*, p.nickname as broadcaster_nickname
         FROM viewer_engagement ve
         LEFT JOIN persons p ON ve.broadcaster_person_id = p.id
         WHERE ve.person_id = ?
         ORDER BY ve.last_seen_at DESC`,
        [personId],
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
   * 특정 방송자의 시청자 참여 기록 조회
   * @param {string} channelId - 방송자 채널 ID
   * @param {string} platform - 플랫폼
   * @returns {Promise<Array>}
   */
  async getBroadcasterViewerEngagements(channelId, platform) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT ve.*, p.nickname as viewer_nickname
         FROM viewer_engagement ve
         LEFT JOIN persons p ON ve.person_id = p.id
         WHERE ve.channel_id = ? AND ve.platform = ?
         ORDER BY ve.total_donation_amount DESC, ve.chat_count DESC`,
        [channelId, platform],
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
   * 시청자-방송자 카테고리별 통계 요약
   * @param {number} personId - 시청자 Person ID
   * @returns {Promise<Array>}
   */
  async getViewerCategorySummary(personId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT
           category_id,
           COUNT(DISTINCT channel_id) as broadcaster_count,
           SUM(chat_count) as total_chats,
           SUM(donation_count) as total_donations,
           SUM(total_donation_amount) as total_donation_amount
         FROM viewer_engagement
         WHERE person_id = ?
         GROUP BY category_id
         ORDER BY total_donation_amount DESC`,
        [personId],
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
   * 특정 채널의 상위 시청자 조회
   * @param {string} channelId - 채널 ID
   * @param {string} platform - 플랫폼
   * @param {number} limit - 조회 개수
   * @returns {Promise<Array>}
   */
  async getTopViewers(channelId, platform, limit = 10) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT
           ve.person_id,
           p.nickname,
           p.profile_image_url,
           SUM(ve.chat_count) as total_chats,
           SUM(ve.donation_count) as total_donations,
           SUM(ve.total_donation_amount) as total_donation_amount,
           MAX(ve.last_seen_at) as last_seen_at
         FROM viewer_engagement ve
         LEFT JOIN persons p ON ve.person_id = p.id
         WHERE ve.channel_id = ? AND ve.platform = ?
         GROUP BY ve.person_id
         ORDER BY total_donation_amount DESC, total_chats DESC
         LIMIT ?`,
        [channelId, platform, limit],
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
   * 특정 카테고리에서의 활성 시청자 조회
   * @param {string} categoryId - 카테고리 ID
   * @param {number} limit - 조회 개수
   * @returns {Promise<Array>}
   */
  async getCategoryActiveViewers(categoryId, limit = 20) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT
           ve.person_id,
           p.nickname,
           COUNT(DISTINCT ve.channel_id) as channels_watched,
           SUM(ve.chat_count) as total_chats,
           SUM(ve.total_donation_amount) as total_donation_amount
         FROM viewer_engagement ve
         LEFT JOIN persons p ON ve.person_id = p.id
         WHERE ve.category_id = ?
         GROUP BY ve.person_id
         ORDER BY total_donation_amount DESC
         LIMIT ?`,
        [categoryId, limit],
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
   * 시청자의 특정 채널 참여 통계 조회
   * @param {number} personId - 시청자 Person ID
   * @param {string} channelId - 채널 ID
   * @param {string} platform - 플랫폼
   * @returns {Promise<Object|null>}
   */
  async getViewerChannelStats(personId, channelId, platform) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT
           SUM(chat_count) as total_chats,
           SUM(donation_count) as total_donations,
           SUM(total_donation_amount) as total_donation_amount,
           MIN(first_seen_at) as first_seen_at,
           MAX(last_seen_at) as last_seen_at,
           COUNT(DISTINCT category_id) as categories_watched
         FROM viewer_engagement
         WHERE person_id = ? AND channel_id = ? AND platform = ?`,
        [personId, channelId, platform],
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

  // ===== Backward Compatibility Methods =====

  /**
   * @deprecated Use recordEngagement with new schema
   */
  async addWatchMinutes(viewerPersonId, broadcasterChannelId, platform, categoryId, minutes) {
    // Watch minutes tracking removed in new schema
    // This method is kept for backward compatibility but does nothing
    dbLogger.debug("addWatchMinutes is deprecated - watch_minutes removed from schema");
    return Promise.resolve();
  }
}

module.exports = ViewerEngagementService;
