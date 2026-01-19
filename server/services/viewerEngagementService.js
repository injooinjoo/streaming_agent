/**
 * ViewerEngagementService - 시청자-방송자 관계 추적 서비스
 *
 * 누가 누구를 봤는지, 카테고리별로 누적 통계 관리
 * - watch_minutes: 시청 시간 (카테고리별 누적)
 * - chat_count: 채팅 횟수
 * - donation_count: 후원 횟수
 * - donation_amount: 후원 금액
 */

const { db: dbLogger } = require("./logger");

class ViewerEngagementService {
  constructor(db) {
    this.db = db;
  }

  /**
   * 시청자 참여 기록 upsert (채팅/후원 시 호출)
   * @param {Object} data - 참여 데이터
   * @param {number} data.viewerPersonId - 시청자 Person ID
   * @param {number} [data.broadcasterPersonId] - 방송자 Person ID
   * @param {string} data.broadcasterChannelId - 방송자 채널 ID
   * @param {string} data.platform - 플랫폼
   * @param {string} [data.categoryId] - 카테고리 ID
   * @param {string} [data.categoryName] - 카테고리 이름
   * @param {string} data.eventType - 이벤트 타입 (chat, donation)
   * @param {number} [data.donationAmount] - 후원 금액 (donation일 때)
   * @returns {Promise<number>} - Engagement ID
   */
  async recordEngagement(data) {
    const {
      viewerPersonId,
      broadcasterPersonId,
      broadcasterChannelId,
      platform,
      categoryId,
      categoryName,
      eventType,
      donationAmount = 0,
    } = data;

    return new Promise((resolve, reject) => {
      // 기존 레코드 조회 (같은 viewer + broadcaster + category)
      this.db.get(
        `SELECT id, chat_count, donation_count, donation_amount
         FROM viewer_engagement
         WHERE viewer_person_id = ? AND broadcaster_channel_id = ? AND platform = ? AND category_id = ?`,
        [viewerPersonId, broadcasterChannelId, platform, categoryId || null],
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
                   donation_amount = donation_amount + ?,
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
                viewer_person_id, broadcaster_person_id, broadcaster_channel_id, platform,
                category_id, category_name, chat_count, donation_count, donation_amount
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                viewerPersonId,
                broadcasterPersonId || null,
                broadcasterChannelId,
                platform,
                categoryId || null,
                categoryName || null,
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
                    viewerPersonId,
                    broadcasterChannelId,
                    categoryName,
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
   * 시청 시간 추가 (분 단위)
   * @param {number} viewerPersonId - 시청자 Person ID
   * @param {string} broadcasterChannelId - 방송자 채널 ID
   * @param {string} platform - 플랫폼
   * @param {string} categoryId - 카테고리 ID
   * @param {number} minutes - 추가할 시청 시간 (분)
   */
  async addWatchMinutes(viewerPersonId, broadcasterChannelId, platform, categoryId, minutes) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE viewer_engagement
         SET watch_minutes = watch_minutes + ?,
             last_seen_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE viewer_person_id = ? AND broadcaster_channel_id = ? AND platform = ? AND category_id = ?`,
        [minutes, viewerPersonId, broadcasterChannelId, platform, categoryId || null],
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
   * 특정 시청자의 모든 참여 기록 조회
   * @param {number} viewerPersonId - 시청자 Person ID
   * @returns {Promise<Array>}
   */
  async getViewerEngagements(viewerPersonId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT ve.*, p.nickname as broadcaster_nickname
         FROM viewer_engagement ve
         LEFT JOIN persons p ON ve.broadcaster_person_id = p.id
         WHERE ve.viewer_person_id = ?
         ORDER BY ve.last_seen_at DESC`,
        [viewerPersonId],
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
   * @param {string} broadcasterChannelId - 방송자 채널 ID
   * @param {string} platform - 플랫폼
   * @returns {Promise<Array>}
   */
  async getBroadcasterViewerEngagements(broadcasterChannelId, platform) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT ve.*, p.nickname as viewer_nickname
         FROM viewer_engagement ve
         LEFT JOIN persons p ON ve.viewer_person_id = p.id
         WHERE ve.broadcaster_channel_id = ? AND ve.platform = ?
         ORDER BY ve.donation_amount DESC, ve.chat_count DESC`,
        [broadcasterChannelId, platform],
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
   * @param {number} viewerPersonId - 시청자 Person ID
   * @returns {Promise<Object>}
   */
  async getViewerCategorySummary(viewerPersonId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT
           category_name,
           COUNT(DISTINCT broadcaster_channel_id) as broadcaster_count,
           SUM(watch_minutes) as total_watch_minutes,
           SUM(chat_count) as total_chats,
           SUM(donation_count) as total_donations,
           SUM(donation_amount) as total_donation_amount
         FROM viewer_engagement
         WHERE viewer_person_id = ?
         GROUP BY category_id
         ORDER BY total_watch_minutes DESC`,
        [viewerPersonId],
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
}

module.exports = ViewerEngagementService;
