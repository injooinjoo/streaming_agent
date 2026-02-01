/**
 * StreamerDetailService - 스트리머 상세 페이지 데이터 서비스
 *
 * 소프트콘 스타일 스트리머 분석 페이지를 위한 쿼리 메서드들.
 * Factory function 패턴 (statsService와 동일).
 *
 * Supports both SQLite and PostgreSQL via cross-database helpers.
 */

const { getOne, getAll, isPostgres } = require("../db/connections");
const { getSQLHelpers } = require("../config/database.config");

const p = (index) => isPostgres() ? `$${index}` : '?';

const createStreamerDetailService = () => {
  const sql = getSQLHelpers();

  return {
    /**
     * 스트리머 프로필 + 요약 통계
     * @param {number} personId
     * @returns {Promise<Object|null>}
     */
    async getStreamerProfile(personId) {
      const person = await getOne(
        `SELECT * FROM persons WHERE id = ${p(1)}`,
        [personId]
      );
      if (!person) return null;

      const broadcastStats = await getOne(
        `SELECT
          COUNT(*) as total_broadcasts,
          COALESCE(SUM(duration_minutes), 0) as total_minutes,
          MAX(peak_viewer_count) as all_time_peak,
          ROUND(AVG(CASE WHEN avg_viewer_count > 0 THEN avg_viewer_count END)) as overall_avg,
          MAX(started_at) as last_broadcast_at,
          MIN(started_at) as first_broadcast_at
        FROM broadcasts
        WHERE broadcaster_person_id = ${p(1)}`,
        [personId]
      );

      const liveBroadcast = await getOne(
        `SELECT id, title, current_viewer_count, peak_viewer_count, started_at, thumbnail_url
        FROM broadcasts
        WHERE broadcaster_person_id = ${p(1)} AND is_live = TRUE
        ORDER BY started_at DESC LIMIT 1`,
        [personId]
      );

      // 이벤트 통계: target_person_id 또는 target_channel_id로 조회
      const channelId = person.channel_id;
      let eventStats = { total_chats: 0, total_donations: 0, total_donation_amount: 0 };

      if (channelId) {
        eventStats = await getOne(
          `SELECT
            SUM(CASE WHEN event_type = 'chat' THEN 1 ELSE 0 END) as total_chats,
            SUM(CASE WHEN event_type = 'donation' THEN 1 ELSE 0 END) as total_donations,
            COALESCE(SUM(CASE WHEN event_type = 'donation' THEN amount ELSE 0 END), 0) as total_donation_amount
          FROM events
          WHERE target_channel_id = ${p(1)}`,
          [channelId]
        ) || eventStats;
      }

      // 최근 방송 5개 (요약 탭용)
      const recentBroadcasts = await getAll(
        `SELECT b.id, b.platform, b.title, b.peak_viewer_count, b.avg_viewer_count,
          b.started_at, b.ended_at, b.duration_minutes, b.thumbnail_url
        FROM broadcasts b
        WHERE b.broadcaster_person_id = ${p(1)}
        ORDER BY b.started_at DESC
        LIMIT 5`,
        [personId]
      );

      // 카테고리별 뷰어십 (요약 탭 도넛차트용)
      const categoryBreakdown = await getAll(
        `SELECT
          COALESCE(bs.category_name, '기타') as category_name,
          COUNT(DISTINCT b.id) as broadcast_count,
          COALESCE(SUM(b.duration_minutes), 0) as total_minutes
        FROM broadcast_segments bs
        JOIN broadcasts b ON bs.broadcast_id = b.id
        WHERE b.broadcaster_person_id = ${p(1)}
          AND bs.category_name IS NOT NULL
          AND bs.category_name != ''
        GROUP BY bs.category_name
        ORDER BY total_minutes DESC
        LIMIT 8`,
        [personId]
      );

      return {
        person,
        stats: broadcastStats || {},
        live: liveBroadcast,
        eventStats: eventStats || {},
        recentBroadcasts: recentBroadcasts || [],
        categories: categoryBreakdown || [],
      };
    },

    /**
     * 방송 기록 (페이지네이션)
     * @param {number} personId
     * @param {number} page
     * @param {number} limit
     * @returns {Promise<Object>}
     */
    async getStreamerBroadcasts(personId, page = 1, limit = 20) {
      const offset = (page - 1) * limit;

      const countRow = await getOne(
        `SELECT COUNT(*) as total FROM broadcasts WHERE broadcaster_person_id = ${p(1)}`,
        [personId]
      );

      const broadcasts = await getAll(
        `SELECT b.id, b.platform, b.title, b.peak_viewer_count, b.avg_viewer_count,
          b.is_live, b.started_at, b.ended_at, b.duration_minutes, b.thumbnail_url,
          (SELECT GROUP_CONCAT(DISTINCT bs.category_name)
           FROM broadcast_segments bs
           WHERE bs.broadcast_id = b.id AND bs.category_name IS NOT NULL AND bs.category_name != '') as categories
        FROM broadcasts b
        WHERE b.broadcaster_person_id = ${p(1)}
        ORDER BY b.started_at DESC
        LIMIT ${p(2)} OFFSET ${p(3)}`,
        [personId, limit, offset]
      );

      return {
        broadcasts: broadcasts || [],
        total: countRow?.total || 0,
        page,
        limit,
        totalPages: Math.ceil((countRow?.total || 0) / limit),
      };
    },

    /**
     * 일별 통계 (통계 탭)
     * @param {number} personId
     * @param {string} period - '7d' or '30d'
     * @returns {Promise<Array>}
     */
    async getStreamerDailyStats(personId, period = '7d') {
      const days = period === '30d' ? 30 : 7;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];

      const rows = await getAll(
        `SELECT
          DATE(b.started_at) as date,
          MAX(b.peak_viewer_count) as peak_viewers,
          ROUND(AVG(CASE WHEN b.avg_viewer_count > 0 THEN b.avg_viewer_count END)) as avg_viewers,
          COUNT(*) as broadcast_count,
          COALESCE(SUM(b.duration_minutes), 0) as total_minutes
        FROM broadcasts b
        WHERE b.broadcaster_person_id = ${p(1)}
          AND DATE(b.started_at) >= ${p(2)}
        GROUP BY DATE(b.started_at)
        ORDER BY date ASC`,
        [personId, startDateStr]
      );

      return rows || [];
    },

    /**
     * 카테고리별 통계 (카테고리 탭)
     * @param {number} personId
     * @param {string} period
     * @returns {Promise<Array>}
     */
    async getStreamerCategories(personId, period = '7d') {
      const days = period === '30d' ? 30 : 7;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];

      const rows = await getAll(
        `SELECT
          COALESCE(bs.category_name, '기타') as category_name,
          COUNT(DISTINCT b.id) as broadcast_count,
          COALESCE(SUM(b.duration_minutes), 0) as total_minutes,
          MAX(bs.peak_viewer_count) as peak_viewers,
          ROUND(AVG(CASE WHEN bs.avg_viewer_count > 0 THEN bs.avg_viewer_count END)) as avg_viewers
        FROM broadcast_segments bs
        JOIN broadcasts b ON bs.broadcast_id = b.id
        WHERE b.broadcaster_person_id = ${p(1)}
          AND bs.segment_started_at >= ${p(2)}
          AND bs.category_name IS NOT NULL
          AND bs.category_name != ''
        GROUP BY bs.category_name
        ORDER BY total_minutes DESC`,
        [personId, startDateStr]
      );

      return rows || [];
    },

    /**
     * 상대 랭킹 (랭킹 탭)
     * @param {number} personId
     * @param {string} period
     * @returns {Promise<Object>}
     */
    async getStreamerRanking(personId, period = '7d') {
      const days = period === '30d' ? 30 : 7;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];

      // 이 스트리머의 통계
      const myStats = await getOne(
        `SELECT
          MAX(peak_viewer_count) as peak_viewers,
          ROUND(AVG(CASE WHEN avg_viewer_count > 0 THEN avg_viewer_count END)) as avg_viewers,
          COALESCE(SUM(COALESCE(avg_viewer_count, 0) * COALESCE(duration_minutes, 0)), 0) as viewership
        FROM broadcasts
        WHERE broadcaster_person_id = ${p(1)}
          AND DATE(started_at) >= ${p(2)}`,
        [personId, startDateStr]
      );

      if (!myStats || !myStats.peak_viewers) {
        return {
          peakRank: null, avgRank: null, viewershipRank: null,
          totalStreamers: 0, myStats: {},
        };
      }

      // 전체 스트리머 수
      const totalRow = await getOne(
        `SELECT COUNT(DISTINCT broadcaster_person_id) as total
        FROM broadcasts
        WHERE DATE(started_at) >= ${p(1)}
          AND broadcaster_person_id IS NOT NULL`,
        [startDateStr]
      );

      // 각 지표별 순위 계산
      const peakRankRow = await getOne(
        `SELECT COUNT(DISTINCT broadcaster_person_id) + 1 as rank_pos
        FROM broadcasts
        WHERE DATE(started_at) >= ${p(1)}
          AND broadcaster_person_id IS NOT NULL
          AND broadcaster_person_id != ${p(2)}
        GROUP BY broadcaster_person_id
        HAVING MAX(peak_viewer_count) > ${p(3)}`,
        [startDateStr, personId, myStats.peak_viewers]
      );

      const avgRankRow = await getOne(
        `SELECT COUNT(*) + 1 as rank_pos FROM (
          SELECT broadcaster_person_id,
            ROUND(AVG(CASE WHEN avg_viewer_count > 0 THEN avg_viewer_count END)) as avg_v
          FROM broadcasts
          WHERE DATE(started_at) >= ${p(1)}
            AND broadcaster_person_id IS NOT NULL
            AND broadcaster_person_id != ${p(2)}
          GROUP BY broadcaster_person_id
          HAVING avg_v > ${p(3)}
        )`,
        [startDateStr, personId, myStats.avg_viewers || 0]
      );

      const viewershipRankRow = await getOne(
        `SELECT COUNT(*) + 1 as rank_pos FROM (
          SELECT broadcaster_person_id,
            SUM(COALESCE(avg_viewer_count, 0) * COALESCE(duration_minutes, 0)) as vs
          FROM broadcasts
          WHERE DATE(started_at) >= ${p(1)}
            AND broadcaster_person_id IS NOT NULL
            AND broadcaster_person_id != ${p(2)}
          GROUP BY broadcaster_person_id
          HAVING vs > ${p(3)}
        )`,
        [startDateStr, personId, myStats.viewership || 0]
      );

      const total = totalRow?.total || 0;

      return {
        peakRank: peakRankRow?.rank_pos || 1,
        avgRank: avgRankRow?.rank_pos || 1,
        viewershipRank: viewershipRankRow?.rank_pos || 1,
        totalStreamers: total,
        myStats: {
          peakViewers: myStats.peak_viewers || 0,
          avgViewers: myStats.avg_viewers || 0,
          viewership: myStats.viewership || 0,
        },
      };
    },

    /**
     * 방송 구간 분석 (구간분석 탭)
     * @param {number} broadcastId
     * @returns {Promise<Object>}
     */
    async getStreamerSegments(broadcastId) {
      const segments = await getAll(
        `SELECT
          bs.id, bs.category_name, bs.segment_started_at, bs.segment_ended_at,
          bs.peak_viewer_count, bs.avg_viewer_count
        FROM broadcast_segments bs
        WHERE bs.broadcast_id = ${p(1)}
        ORDER BY bs.segment_started_at ASC`,
        [broadcastId]
      );

      const snapshots = await getAll(
        `SELECT snapshot_at, viewer_count, chat_rate_per_minute
        FROM viewer_snapshots
        WHERE broadcast_id = ${p(1)}
        ORDER BY snapshot_at ASC`,
        [broadcastId]
      );

      const broadcast = await getOne(
        `SELECT b.id, b.title, b.platform, b.started_at, b.ended_at,
          b.peak_viewer_count, b.avg_viewer_count, b.duration_minutes,
          p.nickname as broadcaster_name
        FROM broadcasts b
        LEFT JOIN persons p ON b.broadcaster_person_id = p.id
        WHERE b.id = ${p(1)}`,
        [broadcastId]
      );

      return {
        broadcast,
        segments: segments || [],
        snapshots: snapshots || [],
      };
    },
  };
};

module.exports = { createStreamerDetailService };
