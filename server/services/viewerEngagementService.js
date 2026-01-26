/**
 * ViewerEngagementService - 시청자-방송자 관계 추적 서비스
 *
 * 누가 누구를 봤는지, 카테고리별로 누적 통계 관리
 * - chat_count: 채팅 횟수
 * - donation_count: 후원 횟수
 * - total_donation_amount: 후원 금액
 *
 * Schema: viewer_engagement (person_id, platform, channel_id, category_id unique)
 *
 * Uses cross-database compatible helpers from connections.js
 */

const { getOne, getAll, runQuery, isPostgres } = require("../db/connections");
const { db: dbLogger } = require("./logger");

/**
 * Get placeholder for parameterized queries
 */
const p = (index) => isPostgres() ? `$${index}` : '?';

class ViewerEngagementService {
  constructor(db) {
    // db parameter kept for backward compatibility but not used
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

    const chatIncrement = eventType === "chat" ? 1 : 0;
    const donationIncrement = eventType === "donation" ? 1 : 0;

    try {
      // UPSERT 패턴: INSERT 시도 후 충돌하면 UPDATE
      const excludedPrefix = isPostgres() ? 'EXCLUDED' : 'excluded';

      const result = await runQuery(
        `INSERT INTO viewer_engagement (
          person_id, platform, channel_id, broadcaster_person_id,
          category_id, chat_count, donation_count, total_donation_amount
        ) VALUES (${p(1)}, ${p(2)}, ${p(3)}, ${p(4)}, ${p(5)}, ${p(6)}, ${p(7)}, ${p(8)})
        ON CONFLICT(person_id, channel_id, platform, category_id) DO UPDATE SET
          chat_count = viewer_engagement.chat_count + ${excludedPrefix}.chat_count,
          donation_count = viewer_engagement.donation_count + ${excludedPrefix}.donation_count,
          total_donation_amount = viewer_engagement.total_donation_amount + ${excludedPrefix}.total_donation_amount,
          last_seen_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP`,
        [
          personId,
          platform,
          channelId,
          broadcasterPersonId || null,
          categoryId || null,
          chatIncrement,
          donationIncrement,
          donationAmount,
        ]
      );

      const changes = result.changes || result.rowCount || 0;
      if (changes > 0) {
        dbLogger.debug("Viewer engagement recorded", {
          personId,
          channelId,
          categoryId,
        });
      }
      return 0; // ID not available in cross-db manner
    } catch (err) {
      dbLogger.error("ViewerEngagementService.recordEngagement error", { error: err.message });
      throw err;
    }
  }

  /**
   * 특정 시청자의 모든 참여 기록 조회
   * @param {number} personId - 시청자 Person ID
   * @returns {Promise<Array>}
   */
  async getViewerEngagements(personId) {
    return await getAll(
      `SELECT ve.*, p.nickname as broadcaster_nickname
       FROM viewer_engagement ve
       LEFT JOIN persons p ON ve.broadcaster_person_id = p.id
       WHERE ve.person_id = ${p(1)}
       ORDER BY ve.last_seen_at DESC`,
      [personId]
    );
  }

  /**
   * 특정 방송자의 시청자 참여 기록 조회
   * @param {string} channelId - 방송자 채널 ID
   * @param {string} platform - 플랫폼
   * @returns {Promise<Array>}
   */
  async getBroadcasterViewerEngagements(channelId, platform) {
    return await getAll(
      `SELECT ve.*, p.nickname as viewer_nickname
       FROM viewer_engagement ve
       LEFT JOIN persons p ON ve.person_id = p.id
       WHERE ve.channel_id = ${p(1)} AND ve.platform = ${p(2)}
       ORDER BY ve.total_donation_amount DESC, ve.chat_count DESC`,
      [channelId, platform]
    );
  }

  /**
   * 시청자-방송자 카테고리별 통계 요약
   * @param {number} personId - 시청자 Person ID
   * @returns {Promise<Array>}
   */
  async getViewerCategorySummary(personId) {
    return await getAll(
      `SELECT
         category_id,
         COUNT(DISTINCT channel_id) as broadcaster_count,
         SUM(chat_count) as total_chats,
         SUM(donation_count) as total_donations,
         SUM(total_donation_amount) as total_donation_amount
       FROM viewer_engagement
       WHERE person_id = ${p(1)}
       GROUP BY category_id
       ORDER BY total_donation_amount DESC`,
      [personId]
    );
  }

  /**
   * 특정 채널의 상위 시청자 조회
   * @param {string} channelId - 채널 ID
   * @param {string} platform - 플랫폼
   * @param {number} limit - 조회 개수
   * @returns {Promise<Array>}
   */
  async getTopViewers(channelId, platform, limit = 10) {
    return await getAll(
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
       WHERE ve.channel_id = ${p(1)} AND ve.platform = ${p(2)}
       GROUP BY ve.person_id, p.nickname, p.profile_image_url
       ORDER BY total_donation_amount DESC, total_chats DESC
       LIMIT ${p(3)}`,
      [channelId, platform, limit]
    );
  }

  /**
   * 특정 카테고리에서의 활성 시청자 조회
   * @param {string} categoryId - 카테고리 ID
   * @param {number} limit - 조회 개수
   * @returns {Promise<Array>}
   */
  async getCategoryActiveViewers(categoryId, limit = 20) {
    return await getAll(
      `SELECT
         ve.person_id,
         p.nickname,
         COUNT(DISTINCT ve.channel_id) as channels_watched,
         SUM(ve.chat_count) as total_chats,
         SUM(ve.total_donation_amount) as total_donation_amount
       FROM viewer_engagement ve
       LEFT JOIN persons p ON ve.person_id = p.id
       WHERE ve.category_id = ${p(1)}
       GROUP BY ve.person_id, p.nickname
       ORDER BY total_donation_amount DESC
       LIMIT ${p(2)}`,
      [categoryId, limit]
    );
  }

  /**
   * 시청자의 특정 채널 참여 통계 조회
   * @param {number} personId - 시청자 Person ID
   * @param {string} channelId - 채널 ID
   * @param {string} platform - 플랫폼
   * @returns {Promise<Object|null>}
   */
  async getViewerChannelStats(personId, channelId, platform) {
    return await getOne(
      `SELECT
         SUM(chat_count) as total_chats,
         SUM(donation_count) as total_donations,
         SUM(total_donation_amount) as total_donation_amount,
         MIN(first_seen_at) as first_seen_at,
         MAX(last_seen_at) as last_seen_at,
         COUNT(DISTINCT category_id) as categories_watched
       FROM viewer_engagement
       WHERE person_id = ${p(1)} AND channel_id = ${p(2)} AND platform = ${p(3)}`,
      [personId, channelId, platform]
    );
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
