/**
 * Analytics Query Service
 *
 * 수집된 데이터 조회 서비스
 * - 스트리머 통계
 * - 시청자 기록
 * - 겹시청자 분석
 * - 후원 랭킹
 * - 채팅 추이
 *
 * SQLite 및 Snowflake 듀얼 모드 지원
 */

const { getSnowflakeConnection } = require("../../db/snowflake-connection");

// DB 타입 설정 (환경변수로 전환 가능)
const DB_TYPE = process.env.DB_TYPE || 'sqlite'; // 'sqlite' or 'snowflake'

class AnalyticsQuery {
  /**
   * @param {sqlite3.Database} db - SQLite 인스턴스 (또는 null)
   */
  constructor(db) {
    this.db = db;
    this.dbType = DB_TYPE;
    this.snowflake = null;
  }

  /**
   * Snowflake 연결 초기화 (필요 시)
   */
  async initSnowflake() {
    if (this.dbType === 'snowflake' && !this.snowflake) {
      this.snowflake = getSnowflakeConnection();
      await this.snowflake.connect();
    }
  }

  /**
   * 스트리머 통계 조회
   * @param {string} streamerId - 스트리머 username
   * @param {Object} options - { startDate, endDate }
   * @returns {Promise<Object>}
   */
  async getStreamerStats(streamerId, options = {}) {
    const { startDate, endDate } = options;

    // 기본 스트리머 정보
    const streamer = await this.query(
      `SELECT * FROM platform_users WHERE platform = 'soop' AND platform_user_id = ? AND is_streamer = 1`,
      [streamerId]
    );

    if (!streamer) {
      return null;
    }

    // 방송 통계
    let broadcastQuery = `
      SELECT
        COUNT(*) as total_broadcasts,
        SUM(duration_seconds) as total_duration,
        AVG(avg_viewers) as avg_viewers,
        MAX(peak_viewers) as peak_viewers,
        COUNT(DISTINCT DATE(started_at)) as broadcast_days
      FROM broadcasts
      WHERE streamer_username = ?
    `;
    const params = [streamerId];

    if (startDate) {
      broadcastQuery += ` AND started_at >= ?`;
      params.push(startDate);
    }
    if (endDate) {
      broadcastQuery += ` AND started_at <= ?`;
      params.push(endDate);
    }

    const broadcastStats = await this.query(broadcastQuery, params);

    // 유니크 시청자 수
    const uniqueViewers = await this.query(
      `SELECT COUNT(DISTINCT viewer_id) as count
       FROM viewing_records vr
       JOIN broadcasts b ON vr.broadcast_id = b.id
       WHERE b.streamer_username = ?`,
      [streamerId]
    );

    // 후원 통계
    const donationStats = await this.query(
      `SELECT
        COUNT(*) as total_donations,
        SUM(amount_krw) as total_amount,
        COUNT(DISTINCT sender_username) as unique_donors
       FROM donations d
       JOIN broadcasts b ON d.broadcast_id = b.id
       WHERE b.streamer_username = ?`,
      [streamerId]
    );

    return {
      streamer,
      broadcasts: broadcastStats,
      uniqueViewers: uniqueViewers?.count || 0,
      donations: donationStats,
    };
  }

  /**
   * 시청자 시청 기록 조회
   * @param {string} userId - 시청자 username
   * @param {Object} options - { limit, offset }
   * @returns {Promise<Object>}
   */
  async getViewerHistory(userId, options = {}) {
    const { limit = 100, offset = 0 } = options;

    // 유저 정보
    const user = await this.query(
      `SELECT * FROM platform_users WHERE platform = 'soop' AND platform_user_id = ?`,
      [userId]
    );

    // 시청 세션 (스트리머별 집계)
    const sessions = await this.queryAll(
      `SELECT
        b.streamer_username,
        pu.nickname as streamer_nickname,
        COUNT(DISTINCT b.id) as broadcasts_watched,
        COUNT(*) as snapshot_count,
        MIN(vr.snapshot_at) as first_seen,
        MAX(vr.snapshot_at) as last_seen
       FROM viewing_records vr
       JOIN broadcasts b ON vr.broadcast_id = b.id
       LEFT JOIN platform_users pu ON b.streamer_id = pu.id
       WHERE vr.viewer_username = ?
       GROUP BY b.streamer_username
       ORDER BY snapshot_count DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    // 총 시청 시간 추정 (스냅샷 수 * 5분)
    const totalStats = await this.query(
      `SELECT
        COUNT(DISTINCT broadcast_id) as total_broadcasts,
        COUNT(DISTINCT streamer_id) as total_streamers,
        COUNT(*) as total_snapshots
       FROM viewing_records
       WHERE viewer_username = ?`,
      [userId]
    );

    return {
      user,
      sessions,
      totalBroadcasts: totalStats?.total_broadcasts || 0,
      totalStreamers: totalStats?.total_streamers || 0,
      estimatedWatchMinutes: (totalStats?.total_snapshots || 0) * 5,
    };
  }

  /**
   * 겹시청자 분석
   * @param {string} streamerA - 스트리머 A username
   * @param {string} streamerB - 스트리머 B username
   * @returns {Promise<Object>}
   */
  async getOverlapViewers(streamerA, streamerB) {
    // 스트리머 A의 유니크 시청자
    const viewersA = await this.query(
      `SELECT COUNT(DISTINCT vr.viewer_id) as count
       FROM viewing_records vr
       JOIN broadcasts b ON vr.broadcast_id = b.id
       WHERE b.streamer_username = ?`,
      [streamerA]
    );

    // 스트리머 B의 유니크 시청자
    const viewersB = await this.query(
      `SELECT COUNT(DISTINCT vr.viewer_id) as count
       FROM viewing_records vr
       JOIN broadcasts b ON vr.broadcast_id = b.id
       WHERE b.streamer_username = ?`,
      [streamerB]
    );

    // 겹치는 시청자
    const overlap = await this.queryAll(
      `SELECT
        vr.viewer_username,
        pu.nickname,
        COUNT(DISTINCT CASE WHEN b.streamer_username = ? THEN b.id END) as broadcasts_a,
        COUNT(DISTINCT CASE WHEN b.streamer_username = ? THEN b.id END) as broadcasts_b
       FROM viewing_records vr
       JOIN broadcasts b ON vr.broadcast_id = b.id
       LEFT JOIN platform_users pu ON vr.viewer_id = pu.id
       WHERE b.streamer_username IN (?, ?)
       GROUP BY vr.viewer_id
       HAVING broadcasts_a > 0 AND broadcasts_b > 0
       ORDER BY broadcasts_a + broadcasts_b DESC
       LIMIT 100`,
      [streamerA, streamerB, streamerA, streamerB]
    );

    const overlapCount = overlap.length;
    const totalA = viewersA?.count || 0;
    const totalB = viewersB?.count || 0;

    return {
      streamerA: { username: streamerA, uniqueViewers: totalA },
      streamerB: { username: streamerB, uniqueViewers: totalB },
      overlapCount,
      overlapRatioA: totalA > 0 ? overlapCount / totalA : 0,
      overlapRatioB: totalB > 0 ? overlapCount / totalB : 0,
      topOverlapViewers: overlap.slice(0, 20),
    };
  }

  /**
   * 후원 랭킹 조회
   * @param {string} streamerId - 스트리머 username
   * @param {Object} options - { limit, startDate, endDate }
   * @returns {Promise<Array>}
   */
  async getDonationRanking(streamerId, options = {}) {
    const { limit = 50, startDate, endDate } = options;

    let query = `
      SELECT
        d.sender_username,
        d.sender_nickname,
        COUNT(*) as donation_count,
        SUM(d.item_count) as total_items,
        SUM(d.amount_krw) as total_amount,
        GROUP_CONCAT(DISTINCT d.donation_type) as donation_types
      FROM donations d
      JOIN broadcasts b ON d.broadcast_id = b.id
      WHERE b.streamer_username = ?
    `;
    const params = [streamerId];

    if (startDate) {
      query += ` AND d.donated_at >= ?`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND d.donated_at <= ?`;
      params.push(endDate);
    }

    query += `
      GROUP BY d.sender_username
      ORDER BY total_amount DESC
      LIMIT ?
    `;
    params.push(limit);

    return this.queryAll(query, params);
  }

  /**
   * 방송별 채팅/시청자 추이 조회
   * @param {string} broadcastId - 방송 번호 (BNO)
   * @returns {Promise<Object>}
   */
  async getBroadcastTrend(broadcastId) {
    // 방송 정보
    const broadcast = await this.query(
      `SELECT * FROM broadcasts WHERE platform = 'soop' AND broadcast_id = ?`,
      [broadcastId]
    );

    if (!broadcast) {
      return null;
    }

    // 5분 단위 통계
    const stats5min = await this.queryAll(
      `SELECT * FROM broadcast_stats_5min
       WHERE broadcast_id = ?
       ORDER BY snapshot_at ASC`,
      [broadcast.id]
    );

    // 변경 이력
    const changes = await this.queryAll(
      `SELECT * FROM broadcast_changes
       WHERE broadcast_id = ?
       ORDER BY changed_at ASC`,
      [broadcast.id]
    );

    // 후원 통계
    const donations = await this.queryAll(
      `SELECT
        donation_type,
        COUNT(*) as count,
        SUM(item_count) as total_items,
        SUM(amount_krw) as total_amount
       FROM donations
       WHERE broadcast_id = ?
       GROUP BY donation_type`,
      [broadcast.id]
    );

    return {
      broadcast,
      stats5min,
      changes,
      donations,
    };
  }

  /**
   * 5분 통계 시계열 조회
   * @param {string} broadcastId - 방송 번호 (BNO)
   * @returns {Promise<Array>}
   */
  async getStats5minTimeline(broadcastId) {
    const broadcast = await this.query(
      `SELECT id FROM broadcasts WHERE platform = 'soop' AND broadcast_id = ?`,
      [broadcastId]
    );

    if (!broadcast) {
      return [];
    }

    return this.queryAll(
      `SELECT
        snapshot_at,
        viewer_count,
        subscriber_count,
        fan_count,
        subscriber_ratio,
        fan_ratio,
        chat_count,
        unique_chatters
       FROM broadcast_stats_5min
       WHERE broadcast_id = ?
       ORDER BY snapshot_at ASC`,
      [broadcast.id]
    );
  }

  /**
   * 다시청 유저 (가장 많은 방송을 본 시청자)
   * @param {Object} options - { limit, minBroadcasts }
   * @returns {Promise<Array>}
   */
  async getTopViewers(options = {}) {
    const { limit = 50, minBroadcasts = 5 } = options;

    return this.queryAll(
      `SELECT
        vr.viewer_username,
        pu.nickname,
        COUNT(DISTINCT vr.broadcast_id) as broadcasts_watched,
        COUNT(DISTINCT vr.streamer_id) as streamers_watched,
        COUNT(*) as total_snapshots,
        COUNT(*) * 5 as estimated_watch_minutes
       FROM viewing_records vr
       LEFT JOIN platform_users pu ON vr.viewer_id = pu.id
       GROUP BY vr.viewer_id
       HAVING broadcasts_watched >= ?
       ORDER BY broadcasts_watched DESC
       LIMIT ?`,
      [minBroadcasts, limit]
    );
  }

  /**
   * 일별 통계 요약
   * @param {string} date - YYYY-MM-DD
   * @returns {Promise<Object>}
   */
  async getDailySummary(date) {
    const broadcasts = await this.query(
      `SELECT
        COUNT(*) as total_broadcasts,
        COUNT(DISTINCT streamer_username) as unique_streamers,
        SUM(peak_viewers) as total_peak_viewers,
        AVG(avg_viewers) as avg_viewers
       FROM broadcasts
       WHERE DATE(started_at) = ?`,
      [date]
    );

    const viewers = await this.query(
      `SELECT COUNT(DISTINCT viewer_id) as unique_viewers
       FROM viewing_records
       WHERE DATE(snapshot_at) = ?`,
      [date]
    );

    const donations = await this.query(
      `SELECT
        COUNT(*) as total_donations,
        SUM(amount_krw) as total_amount,
        COUNT(DISTINCT sender_username) as unique_donors
       FROM donations
       WHERE DATE(donated_at) = ?`,
      [date]
    );

    return {
      date,
      broadcasts,
      uniqueViewers: viewers?.unique_viewers || 0,
      donations,
    };
  }

  // ============================================
  // 유틸리티 메서드
  // ============================================

  /**
   * SQL 쿼리 변환 (SQLite → Snowflake)
   * @param {string} sql - SQLite 쿼리
   * @returns {string} - Snowflake 호환 쿼리
   */
  convertSql(sql) {
    if (this.dbType !== 'snowflake') return sql;

    // SQLite → Snowflake 변환
    return sql
      // 테이블명 대문자로
      .replace(/\bplatform_users\b/gi, 'PLATFORM_USERS')
      .replace(/\bbroadcasts\b/gi, 'BROADCASTS')
      .replace(/\bviewing_records\b/gi, 'VIEWING_RECORDS')
      .replace(/\bdonations\b/gi, 'DONATIONS')
      .replace(/\bbroadcast_stats_5min\b/gi, 'BROADCAST_STATS_5MIN')
      .replace(/\bbroadcast_changes\b/gi, 'BROADCAST_CHANGES')
      .replace(/\bchat_messages\b/gi, 'CHAT_MESSAGES')
      .replace(/\bdaily_stats\b/gi, 'DAILY_STATS')
      // SQLite DATE() → Snowflake DATE()
      .replace(/\bDATE\s*\(([^)]+)\)/gi, 'DATE($1)')
      // GROUP_CONCAT → LISTAGG
      .replace(/GROUP_CONCAT\s*\(\s*DISTINCT\s+([^)]+)\)/gi, "LISTAGG(DISTINCT $1, ',')")
      .replace(/GROUP_CONCAT\s*\(([^)]+)\)/gi, "LISTAGG($1, ',')");
  }

  /**
   * 단일 행 조회
   * @param {string} sql
   * @param {Array} params
   * @returns {Promise<Object|null>}
   */
  async query(sql, params = []) {
    if (this.dbType === 'snowflake') {
      await this.initSnowflake();
      return this.snowflake.get(this.convertSql(sql), params);
    }

    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      });
    });
  }

  /**
   * 다중 행 조회
   * @param {string} sql
   * @param {Array} params
   * @returns {Promise<Array>}
   */
  async queryAll(sql, params = []) {
    if (this.dbType === 'snowflake') {
      await this.initSnowflake();
      return this.snowflake.all(this.convertSql(sql), params);
    }

    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  /**
   * 현재 DB 타입 조회
   * @returns {string}
   */
  getDbType() {
    return this.dbType;
  }
}

module.exports = AnalyticsQuery;
