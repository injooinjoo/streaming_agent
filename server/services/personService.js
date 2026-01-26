/**
 * PersonService - 스트리머/시청자 통합 ID 관리 서비스
 *
 * persons 테이블에 대한 CRUD를 담당합니다.
 * NOTE: 채팅/후원 통계는 persons 테이블에 저장하지 않고 EVENTS에서 집계합니다.
 *
 * Uses cross-database compatible helpers from connections.js
 */

const { getOne, getAll, runQuery, runReturning, isPostgres } = require("../db/connections");
const { db: dbLogger } = require("./logger");

/**
 * Get placeholder for parameterized queries
 */
const p = (index) => isPostgres() ? `$${index}` : '?';

class PersonService {
  constructor(db) {
    // db parameter kept for backward compatibility but not used
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

    try {
      // Use cross-database compatible UPSERT with appropriate EXCLUDED syntax
      const excludedPrefix = isPostgres() ? 'EXCLUDED' : 'excluded';

      await runQuery(
        `INSERT INTO persons (
          platform, platform_user_id, nickname, profile_image_url,
          channel_id, channel_description, follower_count, subscriber_count
        ) VALUES (${p(1)}, ${p(2)}, ${p(3)}, ${p(4)}, ${p(5)}, ${p(6)}, ${p(7)}, ${p(8)})
        ON CONFLICT(platform, platform_user_id) DO UPDATE SET
          nickname = COALESCE(${excludedPrefix}.nickname, nickname),
          profile_image_url = COALESCE(${excludedPrefix}.profile_image_url, profile_image_url),
          channel_id = COALESCE(${excludedPrefix}.channel_id, channel_id),
          channel_description = COALESCE(${excludedPrefix}.channel_description, channel_description),
          follower_count = CASE WHEN ${excludedPrefix}.follower_count > 0 THEN ${excludedPrefix}.follower_count ELSE follower_count END,
          subscriber_count = CASE WHEN ${excludedPrefix}.subscriber_count > 0 THEN ${excludedPrefix}.subscriber_count ELSE subscriber_count END,
          last_seen_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP`,
        [
          platform,
          platformUserId,
          nickname || null,
          profileImageUrl || null,
          channelId || null,
          channelDescription || null,
          followerCount || 0,
          subscriberCount || 0,
        ]
      );

      // UPSERT 후 항상 SELECT로 정확한 ID 조회
      const row = await getOne(
        `SELECT id FROM persons WHERE platform = ${p(1)} AND platform_user_id = ${p(2)}`,
        [platform, platformUserId]
      );

      dbLogger.debug("Person upserted");
      return row?.id || null;
    } catch (err) {
      dbLogger.error("PersonService.upsertPerson error", { error: err.message });
      throw err;
    }
  }

  /**
   * Person ID로 조회
   * @param {number} id - Person ID
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    return await getOne(`SELECT * FROM persons WHERE id = ${p(1)}`, [id]);
  }

  /**
   * 플랫폼 사용자 ID로 조회
   * @param {string} platform - 플랫폼
   * @param {string} platformUserId - 플랫폼 사용자 ID
   * @returns {Promise<Object|null>}
   */
  async findByPlatformId(platform, platformUserId) {
    return await getOne(
      `SELECT * FROM persons WHERE platform = ${p(1)} AND platform_user_id = ${p(2)}`,
      [platform, platformUserId]
    );
  }

  /**
   * 채널 ID로 방송자 조회
   * @param {string} platform - 플랫폼
   * @param {string} channelId - 채널 ID
   * @returns {Promise<Object|null>}
   */
  async findBroadcasterByChannel(platform, channelId) {
    return await getOne(
      `SELECT * FROM persons WHERE platform = ${p(1)} AND channel_id = ${p(2)}`,
      [platform, channelId]
    );
  }

  /**
   * 방송 시간 업데이트
   * @param {number} personId - Person ID
   * @param {number} minutes - 추가 방송 시간 (분)
   * @returns {Promise<void>}
   */
  async addBroadcastMinutes(personId, minutes) {
    await runQuery(
      `UPDATE persons
       SET total_broadcast_minutes = total_broadcast_minutes + ${p(1)},
           last_broadcast_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ${p(2)}`,
      [minutes, personId]
    );
  }

  /**
   * Person의 채팅/후원 통계 조회 (EVENTS 테이블에서 집계)
   * @param {number} personId - Person ID
   * @returns {Promise<Object>}
   */
  async getPersonStats(personId) {
    // Use CASE WHEN which works in both SQLite and PostgreSQL
    const row = await getOne(
      `SELECT
         SUM(CASE WHEN event_type = 'chat' THEN 1 ELSE 0 END) as total_chat_count,
         SUM(CASE WHEN event_type = 'donation' THEN 1 ELSE 0 END) as total_donation_count,
         COALESCE(SUM(CASE WHEN event_type = 'donation' THEN amount ELSE 0 END), 0) as total_donation_amount
       FROM events
       WHERE actor_person_id = ${p(1)}`,
      [personId]
    );
    return row || { total_chat_count: 0, total_donation_count: 0, total_donation_amount: 0 };
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
    const row = await getOne(
      `SELECT
         platform,
         SUM(CASE WHEN channel_id IS NOT NULL THEN 1 ELSE 0 END) as broadcasters,
         SUM(CASE WHEN channel_id IS NULL THEN 1 ELSE 0 END) as viewers,
         COUNT(*) as total
       FROM persons
       GROUP BY platform`,
      []
    );
    return row || {};
  }

  /**
   * 플랫폼별 통계 조회
   * @returns {Promise<Array>}
   */
  async getStatsByPlatform() {
    return await getAll(
      `SELECT
         platform,
         SUM(CASE WHEN channel_id IS NOT NULL THEN 1 ELSE 0 END) as broadcasters,
         SUM(CASE WHEN channel_id IS NULL THEN 1 ELSE 0 END) as viewers,
         COUNT(*) as total
       FROM persons
       GROUP BY platform`,
      []
    );
  }

  /**
   * 상위 후원자 조회 (EVENTS 기반)
   * @param {string} targetChannelId - 방송자 채널 ID
   * @param {number} limit - 조회 개수
   * @returns {Promise<Array>}
   */
  async getTopDonators(targetChannelId, limit = 10) {
    return await getAll(
      `SELECT
         p.id, p.nickname, p.platform, p.profile_image_url,
         COUNT(*) as donation_count,
         SUM(e.amount) as total_amount
       FROM events e
       JOIN persons p ON e.actor_person_id = p.id
       WHERE e.event_type = 'donation' AND e.target_channel_id = ${p(1)}
       GROUP BY e.actor_person_id, p.id, p.nickname, p.platform, p.profile_image_url
       ORDER BY total_amount DESC
       LIMIT ${p(2)}`,
      [targetChannelId, limit]
    );
  }

  /**
   * 활성 채터 조회 (EVENTS 기반)
   * @param {string} targetChannelId - 방송자 채널 ID
   * @param {number} limit - 조회 개수
   * @returns {Promise<Array>}
   */
  async getTopChatters(targetChannelId, limit = 10) {
    return await getAll(
      `SELECT
         p.id, p.nickname, p.platform, p.profile_image_url,
         COUNT(*) as chat_count
       FROM events e
       JOIN persons p ON e.actor_person_id = p.id
       WHERE e.event_type = 'chat' AND e.target_channel_id = ${p(1)}
       GROUP BY e.actor_person_id, p.id, p.nickname, p.platform, p.profile_image_url
       ORDER BY chat_count DESC
       LIMIT ${p(2)}`,
      [targetChannelId, limit]
    );
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
    await runQuery(
      `UPDATE persons SET last_seen_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ${p(1)}`,
      [personId]
    );
  }

  /**
   * @deprecated Use eventService.recordEvent() instead
   * Kept for backward compatibility - does nothing now
   */
  async incrementDonation(personId, amount) {
    dbLogger.debug("incrementDonation is deprecated - stats now tracked via EVENTS");
    // Update last_seen_at only
    await runQuery(
      `UPDATE persons SET last_seen_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ${p(1)}`,
      [personId]
    );
  }
}

module.exports = PersonService;
