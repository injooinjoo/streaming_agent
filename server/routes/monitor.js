/**
 * Monitor Routes
 * API endpoints for streaming data monitoring dashboard
 *
 * Uses unified database combining:
 * - Streaming data (events, viewer stats, categories)
 * - Overlay settings (users, settings, ads, marketplace)
 *
 * Uses cross-database compatible helpers from connections.js
 */

const express = require("express");
const { api: apiLogger } = require("../services/logger");
const { getOne, getAll, isPostgres } = require("../db/connections");

/**
 * Get placeholder for parameterized queries
 */
const p = (index) => isPostgres() ? `$${index}` : '?';

/**
 * Schema metadata with descriptions and constraints
 * Provides human-readable info for the schema viewer
 */
const SCHEMA_METADATA = {
  // ===== Core Streaming Tables =====
  persons: {
    description: "통합 사용자 (스트리머+시청자)",
    icon: "👤",
    columns: {
      id: "자동 증가 PK",
      platform: "soop, chzzk, twitch, youtube",
      platform_user_id: "플랫폼 고유 ID",
      nickname: "표시 닉네임",
      profile_image_url: "프로필 이미지",
      channel_id: "NULL=시청자, 값있음=방송자",
      channel_description: "채널 소개",
      follower_count: "팔로워 수",
      subscriber_count: "구독자 수",
      total_broadcast_minutes: "총 방송 시간",
      last_broadcast_at: "마지막 방송",
      first_seen_at: "최초 발견",
      last_seen_at: "마지막 활동",
      created_at: "생성일",
      updated_at: "수정일",
    },
    uniqueConstraints: ["(platform, platform_user_id)"],
  },
  events: {
    description: "이벤트 허브 (채팅, 후원, 구독, 팔로우)",
    icon: "💬",
    columns: {
      id: "UUID PK",
      event_type: "chat, donation, subscribe, follow, view",
      platform: "플랫폼",
      actor_person_id: "행위자 (FK → persons)",
      actor_nickname: "닉네임 (비정규화)",
      actor_role: "streamer, manager, vip, fan, system",
      target_person_id: "대상 (FK → persons)",
      target_channel_id: "대상 채널 ID",
      broadcast_id: "방송 세션 (FK → broadcasts)",
      message: "메시지 내용",
      amount: "환산 금액 (KRW)",
      original_amount: "원본 금액",
      currency: "KRW, balloon, cheese 등",
      donation_type: "cheese, star_balloon 등",
      event_timestamp: "이벤트 발생 시간",
      ingested_at: "수집 시간",
    },
    uniqueConstraints: [],
  },
  broadcasts: {
    description: "방송 세션",
    icon: "📺",
    columns: {
      id: "자동 증가 PK",
      platform: "플랫폼",
      channel_id: "채널 ID",
      broadcast_id: "플랫폼 방송 ID",
      broadcaster_person_id: "방송자 (FK → persons)",
      title: "방송 제목",
      thumbnail_url: "썸네일",
      current_viewer_count: "현재 시청자",
      peak_viewer_count: "최고 시청자",
      avg_viewer_count: "평균 시청자",
      viewer_sum: "시청자 합계 (평균 계산용)",
      snapshot_count: "스냅샷 수",
      is_live: "라이브 여부 (0/1)",
      started_at: "시작 시간",
      ended_at: "종료 시간",
      duration_minutes: "방송 시간 (분)",
      recorded_at: "생성일",
      updated_at: "수정일",
    },
    uniqueConstraints: ["(platform, channel_id, broadcast_id)"],
  },
  broadcast_segments: {
    description: "카테고리 구간 추적",
    icon: "🎬",
    columns: {
      id: "자동 증가 PK",
      broadcast_id: "방송 ID (FK → broadcasts)",
      platform: "플랫폼",
      channel_id: "채널 ID",
      category_id: "카테고리 ID",
      category_name: "카테고리명",
      segment_started_at: "구간 시작",
      segment_ended_at: "구간 종료",
      peak_viewer_count: "구간 최고 시청자",
      avg_viewer_count: "구간 평균 시청자",
    },
    uniqueConstraints: [],
  },
  categories: {
    description: "카테고리 카탈로그",
    icon: "🏷️",
    columns: {
      id: "자동 증가 PK",
      platform: "플랫폼",
      category_id: "플랫폼 카테고리 ID",
      category_name: "카테고리명",
      category_type: "game, irl, music 등",
      thumbnail_url: "썸네일",
      recorded_at: "생성일",
      updated_at: "수정일",
    },
    uniqueConstraints: ["(platform, category_id)"],
  },
  viewer_engagement: {
    description: "시청자-방송자 참여 통계",
    icon: "🤝",
    columns: {
      id: "자동 증가 PK",
      person_id: "시청자 (FK → persons)",
      platform: "플랫폼",
      channel_id: "방송 채널 ID",
      broadcaster_person_id: "방송자 (FK → persons)",
      category_id: "카테고리 ID",
      chat_count: "채팅 수",
      donation_count: "후원 횟수",
      total_donation_amount: "후원 금액 (KRW)",
      first_seen_at: "최초 참여",
      last_seen_at: "마지막 참여",
      updated_at: "수정일",
    },
    uniqueConstraints: ["(person_id, channel_id, platform, category_id)"],
  },
  viewer_snapshots: {
    description: "시청자 시계열 데이터",
    icon: "📈",
    columns: {
      id: "자동 증가 PK",
      platform: "플랫폼",
      channel_id: "채널 ID",
      broadcast_id: "방송 ID (FK → broadcasts)",
      segment_id: "세그먼트 ID (FK)",
      viewer_count: "시청자 수",
      chat_rate_per_minute: "분당 채팅 수",
      snapshot_at: "스냅샷 시간",
      ingested_at: "수집 시간",
    },
    uniqueConstraints: [],
  },
  // Legacy streaming tables
  category_game_mappings: {
    description: "카테고리-게임 매핑",
    icon: "🎮",
    columns: {},
    uniqueConstraints: [],
  },
  platform_categories: {
    description: "플랫폼별 카테고리",
    icon: "📂",
    columns: {},
    uniqueConstraints: [],
  },
  // ===== Overlay Tables =====
  users: {
    description: "사용자 계정",
    icon: "👥",
    columns: {},
    uniqueConstraints: [],
  },
  user_settings: {
    description: "사용자별 설정",
    icon: "⚙️",
    columns: {},
    uniqueConstraints: [],
  },
  settings: {
    description: "전역 설정",
    icon: "🔧",
    columns: {},
    uniqueConstraints: [],
  },
  ad_slots: {
    description: "광고 슬롯",
    icon: "📢",
    columns: {},
    uniqueConstraints: [],
  },
  ad_campaigns: {
    description: "광고 캠페인",
    icon: "📊",
    columns: {},
    uniqueConstraints: [],
  },
  ad_impressions: {
    description: "광고 노출 기록",
    icon: "👁️",
    columns: {},
    uniqueConstraints: [],
  },
  ad_settlements: {
    description: "광고 정산",
    icon: "💵",
    columns: {},
    uniqueConstraints: [],
  },
  creators: {
    description: "크리에이터 프로필",
    icon: "🎨",
    columns: {},
    uniqueConstraints: [],
  },
  designs: {
    description: "디자인 템플릿",
    icon: "🖼️",
    columns: {},
    uniqueConstraints: [],
  },
  design_reviews: {
    description: "디자인 리뷰",
    icon: "⭐",
    columns: {},
    uniqueConstraints: [],
  },
};

/**
 * Create monitor router
 * @param {Object} db - Database instance (kept for backward compatibility)
 * @returns {express.Router}
 */
const createMonitorRouter = (db) => {
  const router = express.Router();

  // Use cross-database compatible helpers from connections.js
  // getOne → getOne, getAll → getAll

  /**
   * GET /api/monitor/stats
   * Returns summary statistics including platform breakdown and Nexon games
   */
  router.get("/monitor/stats", async (req, res) => {
    try {
      // Nexon game category IDs by platform
      const nexonSoopCategoryIds = [
        '00040005', // 서든어택
        '00040070', // FC 온라인
        '00040032', // 메이플스토리
        '00040158', // 메이플스토리 월드
        '00360113', // 마비노기 모바일
        '00360055', // 카트라이더 러쉬플러스
        '00040004', // 던전앤파이터
        '00040065', // 바람의나라
      ];
      const nexonChzzkCategoryIds = [
        'MapleStory', 'Dungeon_Fighter_Online', 'FC_Online', 'Sudden_Attack',
        'KartRider', 'Mabinogi', 'The_First_Descendant', 'V4'
      ];
      // Generate cross-database compatible placeholders for IN clause
      const nexonSoopPlaceholders = nexonSoopCategoryIds.map((_, i) => p(i + 1)).join(',');
      const nexonChzzkPlaceholders = nexonChzzkCategoryIds.map((_, i) => p(i + 1)).join(',');
      const isLiveVal = isPostgres() ? 'TRUE' : '1';

      // Execute all stats queries in parallel
      const [
        // Overall stats
        liveBroadcasts,
        totalViewers,
        totalPersons,
        totalDonations,
        snapshotCount,
        engagementCount,
        eventCount,
        segmentCount,
        // Platform breakdown
        soopStats,
        chzzkStats,
        // Nexon games stats by platform
        nexonSoopStats,
        nexonChzzkStats,
      ] = await Promise.all([
        // Live broadcasts count (50+ viewers only)
        getOne(`SELECT COUNT(*) as count FROM broadcasts WHERE is_live = ${isLiveVal} AND current_viewer_count >= 50`),
        // Total viewers from live broadcasts (50+ viewers only)
        getOne(`SELECT COALESCE(SUM(current_viewer_count), 0) as total FROM broadcasts WHERE is_live = ${isLiveVal} AND current_viewer_count >= 50`),
        // Total persons
        getOne(`SELECT COUNT(*) as count FROM persons`),
        // Total donation amount (from events table)
        getOne(`SELECT COALESCE(SUM(amount), 0) as total FROM events WHERE event_type = 'donation'`),
        // Total viewer snapshots
        getOne(`SELECT COUNT(*) as count FROM viewer_snapshots`),
        // Total engagement records
        getOne(`SELECT COUNT(*) as count FROM viewer_engagement`),
        // Total events
        getOne(`SELECT COUNT(*) as count FROM events`),
        // Total broadcast segments
        getOne(`SELECT COUNT(*) as count FROM broadcast_segments`),
        // SOOP stats (50+ viewers only)
        getOne(`SELECT
          COUNT(*) as broadcasts,
          COALESCE(SUM(current_viewer_count), 0) as viewers
          FROM broadcasts WHERE is_live = ${isLiveVal} AND platform = 'soop' AND current_viewer_count >= 50`),
        // Chzzk stats (50+ viewers only)
        getOne(`SELECT
          COUNT(*) as broadcasts,
          COALESCE(SUM(current_viewer_count), 0) as viewers
          FROM broadcasts WHERE is_live = ${isLiveVal} AND platform = 'chzzk' AND current_viewer_count >= 50`),
        // Nexon games stats - SOOP (50+ viewers only)
        getOne(`SELECT
          COUNT(*) as broadcasts,
          COALESCE(SUM(b.current_viewer_count), 0) as viewers
          FROM broadcasts b
          INNER JOIN (
            SELECT broadcast_id, category_id,
            ROW_NUMBER() OVER (PARTITION BY broadcast_id ORDER BY segment_started_at DESC) as rn
            FROM broadcast_segments
          ) seg ON b.id = seg.broadcast_id AND seg.rn = 1
          WHERE b.is_live = ${isLiveVal} AND b.platform = 'soop' AND b.current_viewer_count >= 50 AND seg.category_id IN (${nexonSoopPlaceholders})`,
          nexonSoopCategoryIds),
        // Nexon games stats - Chzzk (50+ viewers only)
        getOne(`SELECT
          COUNT(*) as broadcasts,
          COALESCE(SUM(b.current_viewer_count), 0) as viewers
          FROM broadcasts b
          INNER JOIN (
            SELECT broadcast_id, category_id,
            ROW_NUMBER() OVER (PARTITION BY broadcast_id ORDER BY segment_started_at DESC) as rn
            FROM broadcast_segments
          ) seg ON b.id = seg.broadcast_id AND seg.rn = 1
          WHERE b.is_live = ${isLiveVal} AND b.platform = 'chzzk' AND b.current_viewer_count >= 50 AND seg.category_id IN (${nexonChzzkPlaceholders})`,
          nexonChzzkCategoryIds),
      ]);

      res.json({
        liveBroadcasts: liveBroadcasts?.count || 0,
        totalViewers: totalViewers?.total || 0,
        totalPersons: totalPersons?.count || 0,
        totalDonations: totalDonations?.total || 0,
        snapshotCount: snapshotCount?.count || 0,
        engagementCount: engagementCount?.count || 0,
        eventCount: eventCount?.count || 0,
        segmentCount: segmentCount?.count || 0,
        // Platform breakdown
        platforms: {
          soop: {
            broadcasts: soopStats?.broadcasts || 0,
            viewers: soopStats?.viewers || 0,
          },
          chzzk: {
            broadcasts: chzzkStats?.broadcasts || 0,
            viewers: chzzkStats?.viewers || 0,
          },
        },
        // Nexon games by platform
        nexon: {
          soop: {
            broadcasts: nexonSoopStats?.broadcasts || 0,
            viewers: nexonSoopStats?.viewers || 0,
          },
          chzzk: {
            broadcasts: nexonChzzkStats?.broadcasts || 0,
            viewers: nexonChzzkStats?.viewers || 0,
          },
        },
      });
    } catch (error) {
      apiLogger.error("Monitor stats error", { error: error.message });
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  /**
   * GET /api/monitor/stats/timeseries
   * Returns time series data for charts (hourly data for last 24 hours)
   */
  router.get("/monitor/stats/timeseries", async (req, res) => {
    try {
      const hours = Math.min(168, Math.max(1, parseInt(req.query.hours) || 24));

      // Cross-database date formatting and interval
      const hourFormat = isPostgres()
        ? `to_char(snapshot_at, 'YYYY-MM-DD HH24:00:00')`
        : `strftime('%Y-%m-%d %H:00:00', snapshot_at)`;
      const eventHourFormat = isPostgres()
        ? `to_char(event_timestamp, 'YYYY-MM-DD HH24:00:00')`
        : `strftime('%Y-%m-%d %H:00:00', event_timestamp)`;
      const broadcastHourFormat = isPostgres()
        ? `to_char(updated_at, 'YYYY-MM-DD HH24:00:00')`
        : `strftime('%Y-%m-%d %H:00:00', updated_at)`;
      const hoursAgo = isPostgres()
        ? `NOW() - INTERVAL '${hours} hours'`
        : `datetime('now', '-${hours} hours')`;

      // Get viewer snapshots aggregated by hour
      const viewerTimeseries = await getAll(`
        SELECT
          ${hourFormat} as hour,
          platform,
          SUM(viewer_count) as total_viewers,
          COUNT(DISTINCT channel_id) as broadcast_count
        FROM viewer_snapshots
        WHERE snapshot_at >= ${hoursAgo}
        GROUP BY ${hourFormat}, platform
        ORDER BY hour ASC
      `);

      // Get events aggregated by hour
      const eventTimeseries = await getAll(`
        SELECT
          ${eventHourFormat} as hour,
          event_type,
          COUNT(*) as count,
          COALESCE(SUM(CASE WHEN event_type = 'donation' THEN amount ELSE 0 END), 0) as total_amount
        FROM events
        WHERE event_timestamp >= ${hoursAgo}
        GROUP BY ${eventHourFormat}, event_type
        ORDER BY hour ASC
      `);

      // Get broadcast activity by hour
      const broadcastTimeseries = await getAll(`
        SELECT
          ${broadcastHourFormat} as hour,
          platform,
          COUNT(*) as active_broadcasts,
          COALESCE(SUM(current_viewer_count), 0) as total_viewers,
          COALESCE(AVG(current_viewer_count), 0) as avg_viewers
        FROM broadcasts
        WHERE updated_at >= ${hoursAgo}
        GROUP BY ${broadcastHourFormat}, platform
        ORDER BY hour ASC
      `);

      res.json({
        hours,
        viewers: viewerTimeseries,
        events: eventTimeseries,
        broadcasts: broadcastTimeseries
      });
    } catch (error) {
      apiLogger.error("Monitor timeseries error", { error: error.message });
      res.status(500).json({ error: "Failed to fetch timeseries data" });
    }
  });

  /**
   * GET /api/monitor/stats/nexon
   * Returns detailed Nexon game statistics by platform
   */
  router.get("/monitor/stats/nexon", async (req, res) => {
    try {
      // Nexon game category IDs by platform
      const nexonCategories = {
        soop: [
          '00040005', '00040070', '00040032', '00040158',
          '00360113', '00360055', '00040004', '00040065'
        ],
        chzzk: [
          'MapleStory', 'Dungeon_Fighter_Online', 'FC_Online', 'Sudden_Attack',
          'KartRider', 'Mabinogi', 'The_First_Descendant', 'V4'
        ]
      };

      const isLiveValue = isPostgres() ? 'TRUE' : '1';

      // Get SOOP Nexon broadcasts
      const soopPlaceholders = nexonCategories.soop.map((_, i) => p(i + 1)).join(',');
      const soopNexon = await getAll(`
        SELECT
          seg.category_id,
          c.category_name,
          COUNT(*) as broadcast_count,
          COALESCE(SUM(b.current_viewer_count), 0) as total_viewers
        FROM broadcasts b
        INNER JOIN (
          SELECT broadcast_id, category_id,
          ROW_NUMBER() OVER (PARTITION BY broadcast_id ORDER BY segment_started_at DESC) as rn
          FROM broadcast_segments
        ) seg ON b.id = seg.broadcast_id AND seg.rn = 1
        LEFT JOIN categories c ON seg.category_id = c.category_id AND b.platform = c.platform
        WHERE b.is_live = ${isLiveValue} AND b.platform = 'soop' AND seg.category_id IN (${soopPlaceholders})
        GROUP BY seg.category_id, c.category_name
        ORDER BY total_viewers DESC
      `, nexonCategories.soop);

      // Get Chzzk Nexon broadcasts
      const chzzkPlaceholders = nexonCategories.chzzk.map((_, i) => p(i + 1)).join(',');
      const chzzkNexon = await getAll(`
        SELECT
          seg.category_id,
          c.category_name,
          COUNT(*) as broadcast_count,
          COALESCE(SUM(b.current_viewer_count), 0) as total_viewers
        FROM broadcasts b
        INNER JOIN (
          SELECT broadcast_id, category_id,
          ROW_NUMBER() OVER (PARTITION BY broadcast_id ORDER BY segment_started_at DESC) as rn
          FROM broadcast_segments
        ) seg ON b.id = seg.broadcast_id AND seg.rn = 1
        LEFT JOIN categories c ON seg.category_id = c.category_id AND b.platform = c.platform
        WHERE b.is_live = ${isLiveValue} AND b.platform = 'chzzk' AND seg.category_id IN (${chzzkPlaceholders})
        GROUP BY seg.category_id, c.category_name
        ORDER BY total_viewers DESC
      `, nexonCategories.chzzk);

      // Aggregate totals
      const soopTotal = soopNexon.reduce((acc, g) => ({
        broadcasts: acc.broadcasts + g.broadcast_count,
        viewers: acc.viewers + g.total_viewers
      }), { broadcasts: 0, viewers: 0 });

      const chzzkTotal = chzzkNexon.reduce((acc, g) => ({
        broadcasts: acc.broadcasts + g.broadcast_count,
        viewers: acc.viewers + g.total_viewers
      }), { broadcasts: 0, viewers: 0 });

      res.json({
        platforms: {
          soop: {
            total: soopTotal,
            games: soopNexon
          },
          chzzk: {
            total: chzzkTotal,
            games: chzzkNexon
          }
        },
        total: {
          broadcasts: soopTotal.broadcasts + chzzkTotal.broadcasts,
          viewers: soopTotal.viewers + chzzkTotal.viewers
        }
      });
    } catch (error) {
      apiLogger.error("Monitor nexon stats error", { error: error.message });
      res.status(500).json({ error: "Failed to fetch nexon stats" });
    }
  });

  /**
   * GET /api/monitor/broadcasts
   * Returns paginated broadcast list with category from latest segment and stats from events
   * Query params: page (default 1), limit (default 50), live_only (default false)
   */
  router.get("/monitor/broadcasts", async (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
      const offset = (page - 1) * limit;
      const liveOnly = req.query.live_only === "true";

      const isLiveValue = isPostgres() ? 'TRUE' : '1';
      const whereClause = liveOnly ? `WHERE b.is_live = ${isLiveValue}` : "";

      // Get total count
      const countResult = await getOne(
        `SELECT COUNT(*) as total FROM broadcasts b ${whereClause}`
      );
      const total = countResult?.total || 0;

      // Get broadcasts with latest segment category and computed stats from events
      const broadcasts = await getAll(
        `SELECT
          b.id,
          b.platform,
          b.channel_id,
          b.broadcast_id,
          b.broadcaster_person_id,
          p.nickname as broadcaster_nickname,
          b.title,
          seg.category_name,
          b.current_viewer_count,
          b.peak_viewer_count,
          COALESCE(chat_stats.chat_count, 0) as total_chat_count,
          COALESCE(donation_stats.donation_amount, 0) as total_donation_amount,
          b.is_live,
          b.started_at,
          b.ended_at,
          b.duration_minutes,
          b.updated_at
        FROM broadcasts b
        LEFT JOIN persons p ON b.broadcaster_person_id = p.id
        LEFT JOIN (
          SELECT broadcast_id, category_name
          FROM broadcast_segments
          WHERE id IN (
            SELECT MAX(id) FROM broadcast_segments GROUP BY broadcast_id
          )
        ) seg ON seg.broadcast_id = b.id
        LEFT JOIN (
          SELECT broadcast_id, COUNT(*) as chat_count
          FROM events WHERE event_type = 'chat'
          GROUP BY broadcast_id
        ) chat_stats ON chat_stats.broadcast_id = b.id
        LEFT JOIN (
          SELECT broadcast_id, SUM(amount) as donation_amount
          FROM events WHERE event_type = 'donation'
          GROUP BY broadcast_id
        ) donation_stats ON donation_stats.broadcast_id = b.id
        ${whereClause}
        ORDER BY b.is_live DESC, b.current_viewer_count DESC, b.updated_at DESC
        LIMIT ${p(1)} OFFSET ${p(2)}`,
        [limit, offset]
      );

      res.json({
        data: broadcasts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      apiLogger.error("Monitor broadcasts error", { error: error.message });
      res.status(500).json({ error: "Failed to fetch broadcasts" });
    }
  });

  /**
   * GET /api/monitor/persons
   * Returns paginated persons list with stats computed from events table
   * Query params: page (default 1), limit (default 50), type (broadcaster|viewer|all)
   */
  router.get("/monitor/persons", async (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
      const offset = (page - 1) * limit;
      const type = req.query.type || "all";

      let whereClause = "";
      if (type === "broadcaster") {
        whereClause = "WHERE p.channel_id IS NOT NULL";
      } else if (type === "viewer") {
        whereClause = "WHERE p.channel_id IS NULL";
      }

      // Get total count
      const countResult = await getOne(
        `SELECT COUNT(*) as total FROM persons p ${whereClause}`
      );
      const total = countResult?.total || 0;

      // Get persons with stats computed from events
      const persons = await getAll(
        `SELECT
          p.id,
          p.platform,
          p.platform_user_id,
          p.nickname,
          p.channel_id,
          p.follower_count,
          p.subscriber_count,
          p.total_broadcast_minutes,
          COALESCE(chat_stats.chat_count, 0) as total_chat_count,
          COALESCE(donation_stats.donation_count, 0) as total_donation_count,
          COALESCE(donation_stats.donation_amount, 0) as total_donation_amount,
          p.first_seen_at,
          p.last_seen_at,
          CASE WHEN p.channel_id IS NOT NULL THEN 'broadcaster' ELSE 'viewer' END as person_type
        FROM persons p
        LEFT JOIN (
          SELECT actor_person_id, COUNT(*) as chat_count
          FROM events WHERE event_type = 'chat'
          GROUP BY actor_person_id
        ) chat_stats ON chat_stats.actor_person_id = p.id
        LEFT JOIN (
          SELECT actor_person_id, COUNT(*) as donation_count, SUM(amount) as donation_amount
          FROM events WHERE event_type = 'donation'
          GROUP BY actor_person_id
        ) donation_stats ON donation_stats.actor_person_id = p.id
        ${whereClause}
        ORDER BY p.last_seen_at DESC, COALESCE(donation_stats.donation_amount, 0) DESC
        LIMIT ${p(1)} OFFSET ${p(2)}`,
        [limit, offset]
      );

      res.json({
        data: persons,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      apiLogger.error("Monitor persons error", { error: error.message });
      res.status(500).json({ error: "Failed to fetch persons" });
    }
  });

  /**
   * GET /api/monitor/persons/:id
   * Returns detailed information about a specific person
   * Includes stats, broadcasts (if broadcaster), engagement (if viewer), and recent events
   */
  router.get("/monitor/persons/:id", async (req, res) => {
    try {
      const personId = parseInt(req.params.id);
      if (isNaN(personId)) {
        return res.status(400).json({ error: "Invalid person ID" });
      }

      // Get person basic info
      const person = await getOne(
        `SELECT
          id, platform, platform_user_id, nickname, profile_image_url,
          channel_id, channel_description, follower_count, subscriber_count,
          total_broadcast_minutes, last_broadcast_at, first_seen_at, last_seen_at
        FROM persons WHERE id = ${p(1)}`,
        [personId]
      );

      if (!person) {
        return res.status(404).json({ error: "Person not found" });
      }

      // Get stats from events table
      const stats = await getOne(
        `SELECT
          COALESCE(SUM(CASE WHEN event_type = 'chat' THEN 1 ELSE 0 END), 0) as total_chat_count,
          COALESCE(SUM(CASE WHEN event_type = 'donation' THEN 1 ELSE 0 END), 0) as total_donation_count,
          COALESCE(SUM(CASE WHEN event_type = 'donation' THEN amount ELSE 0 END), 0) as total_donation_amount
        FROM events WHERE actor_person_id = ${p(1)}`,
        [personId]
      );

      const isBroadcaster = !!person.channel_id;
      let broadcasts = [];
      let topViewers = [];
      let engagementByChannel = [];

      if (isBroadcaster) {
        // Get recent broadcasts (last 10)
        broadcasts = await getAll(
          `SELECT
            b.id, b.title, b.started_at, b.ended_at, b.duration_minutes,
            b.peak_viewer_count, b.avg_viewer_count, b.is_live,
            seg.category_name
          FROM broadcasts b
          LEFT JOIN (
            SELECT broadcast_id, category_name
            FROM broadcast_segments
            WHERE id IN (
              SELECT MAX(id) FROM broadcast_segments GROUP BY broadcast_id
            )
          ) seg ON seg.broadcast_id = b.id
          WHERE b.broadcaster_person_id = ${p(1)}
          ORDER BY b.started_at DESC
          LIMIT 10`,
          [personId]
        );

        // Get top viewers for this broadcaster (based on engagement)
        topViewers = await getAll(
          `SELECT
            p.id as person_id,
            p.nickname,
            p.profile_image_url,
            ve.chat_count,
            ve.donation_count,
            ve.total_donation_amount as donation_amount,
            ve.last_seen_at
          FROM viewer_engagement ve
          JOIN persons p ON ve.person_id = p.id
          WHERE ve.broadcaster_person_id = ${p(1)}
          ORDER BY ve.total_donation_amount DESC, ve.chat_count DESC
          LIMIT 10`,
          [personId]
        );
      } else {
        // Get engagement by channel for this viewer
        engagementByChannel = await getAll(
          `SELECT
            bp.id as broadcaster_id,
            bp.nickname as broadcaster_nickname,
            bp.profile_image_url as broadcaster_profile_image,
            bp.platform,
            ve.chat_count,
            ve.donation_count,
            ve.total_donation_amount as donation_amount,
            ve.first_seen_at,
            ve.last_seen_at
          FROM viewer_engagement ve
          JOIN persons bp ON ve.broadcaster_person_id = bp.id
          WHERE ve.person_id = ${p(1)}
          ORDER BY ve.total_donation_amount DESC, ve.chat_count DESC
          LIMIT 20`,
          [personId]
        );
      }

      // Get recent events (last 20)
      const recentEvents = await getAll(
        `SELECT
          e.id, e.event_type, e.message, e.amount, e.currency, e.donation_type,
          e.event_timestamp, e.actor_role,
          tp.nickname as target_nickname
        FROM events e
        LEFT JOIN persons tp ON e.target_person_id = tp.id
        WHERE e.actor_person_id = ${p(1)}
        ORDER BY e.event_timestamp DESC
        LIMIT 20`,
        [personId]
      );

      res.json({
        person,
        stats: stats || { total_chat_count: 0, total_donation_count: 0, total_donation_amount: 0 },
        isBroadcaster,
        broadcasts,
        topViewers,
        engagementByChannel,
        recentEvents
      });
    } catch (error) {
      apiLogger.error("Monitor person detail error", { error: error.message });
      res.status(500).json({ error: "Failed to fetch person details" });
    }
  });

  /**
   * GET /api/monitor/engagement
   * Returns paginated viewer engagement records aggregated by viewer + broadcaster
   * Query params: page (default 1), limit (default 50)
   */
  router.get("/monitor/engagement", async (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
      const offset = (page - 1) * limit;

      // Get total count of unique viewer-broadcaster pairs
      const countResult = await getOne(
        `SELECT COUNT(*) as total FROM (
          SELECT DISTINCT person_id, broadcaster_person_id FROM viewer_engagement
        )`
      );
      const total = countResult?.total || 0;

      // Get engagement records aggregated by viewer + broadcaster
      // GROUP_CONCAT (SQLite) vs STRING_AGG (PostgreSQL)
      const groupConcatFunc = isPostgres()
        ? `STRING_AGG(DISTINCT c.category_name, ',')`
        : `GROUP_CONCAT(DISTINCT c.category_name)`;
      const engagement = await getAll(
        `SELECT
          ve.platform,
          ve.person_id as viewer_person_id,
          vp.nickname as viewer_nickname,
          ve.broadcaster_person_id,
          bp.nickname as broadcaster_nickname,
          SUM(ve.chat_count) as chat_count,
          SUM(ve.donation_count) as donation_count,
          SUM(ve.total_donation_amount) as donation_amount,
          MIN(ve.first_seen_at) as first_seen_at,
          MAX(ve.last_seen_at) as last_seen_at,
          COUNT(DISTINCT ve.category_id) as category_count,
          ${groupConcatFunc} as categories
        FROM viewer_engagement ve
        LEFT JOIN persons vp ON ve.person_id = vp.id
        LEFT JOIN persons bp ON ve.broadcaster_person_id = bp.id
        LEFT JOIN categories c ON ve.category_id = c.category_id AND ve.platform = c.platform
        GROUP BY ve.person_id, ve.broadcaster_person_id, ve.platform, vp.nickname, bp.nickname
        ORDER BY MAX(ve.last_seen_at) DESC, SUM(ve.total_donation_amount) DESC
        LIMIT ${p(1)} OFFSET ${p(2)}`,
        [limit, offset]
      );

      res.json({
        data: engagement,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      apiLogger.error("Monitor engagement error", { error: error.message });
      res.status(500).json({ error: "Failed to fetch engagement" });
    }
  });

  /**
   * GET /api/monitor/schema
   * Returns database schema for unified database with metadata
   */
  router.get("/monitor/schema", async (req, res) => {
    try {
      // Get all tables - cross-database compatible
      let tables;
      if (isPostgres()) {
        tables = await getAll(
          `SELECT table_name as name FROM information_schema.tables
           WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
           ORDER BY table_name`
        );
      } else {
        tables = await getAll(
          `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`
        );
      }

      const schema = [];
      for (const table of tables) {
        let columns;
        if (isPostgres()) {
          // PostgreSQL: use information_schema.columns
          const rawColumns = await getAll(
            `SELECT
               column_name as name,
               data_type as type,
               is_nullable,
               column_default as dflt_value,
               ordinal_position
             FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = ${p(1)}
             ORDER BY ordinal_position`,
            [table.name]
          );
          // Get primary key columns
          const pkColumns = await getAll(
            `SELECT a.attname as column_name
             FROM pg_index i
             JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
             WHERE i.indrelid = ${p(1)}::regclass AND i.indisprimary`,
            [table.name]
          );
          const pkSet = new Set(pkColumns.map(pk => pk.column_name));

          columns = rawColumns.map(col => ({
            name: col.name,
            type: col.type,
            notnull: col.is_nullable === 'NO' ? 1 : 0,
            dflt_value: col.dflt_value,
            pk: pkSet.has(col.name) ? 1 : 0
          }));
        } else {
          // SQLite: use PRAGMA table_info
          columns = await getAll(`PRAGMA table_info("${table.name}")`);
        }

        // Get row count for the table
        const countResult = await getAll(`SELECT COUNT(*) as count FROM "${table.name}"`);
        const rowCount = countResult[0]?.count || 0;

        // Get metadata for this table
        const meta = SCHEMA_METADATA[table.name] || {
          description: "",
          icon: "📄",
          columns: {},
          uniqueConstraints: [],
        };

        schema.push({
          name: table.name,
          rowCount,
          description: meta.description,
          icon: meta.icon,
          uniqueConstraints: meta.uniqueConstraints,
          columns: columns.map((col) => ({
            name: col.name,
            type: col.type,
            notNull: col.notnull === 1,
            defaultValue: col.dflt_value,
            primaryKey: col.pk === 1,
            description: meta.columns[col.name] || "",
          })),
        });
      }

      // Categorize tables
      const streamingTables = [
        "persons", "events", "broadcasts", "broadcast_segments",
        "categories", "viewer_engagement", "viewer_snapshots",
        "category_game_mappings", "platform_categories"
      ];
      const overlayTables = schema
        .map(t => t.name)
        .filter(name => !streamingTables.includes(name));

      res.json({
        unifiedDb: {
          name: "unified.db",
          description: "통합 데이터베이스 (스트리밍 + 오버레이)",
          tables: schema,
          tableCount: schema.length,
        },
        categorization: {
          streaming: {
            description: "스트리밍 데이터 (이벤트, 시청자, 방송, 카테고리)",
            tables: schema.filter(t => streamingTables.includes(t.name)),
            tableCount: schema.filter(t => streamingTables.includes(t.name)).length,
          },
          overlay: {
            description: "오버레이 설정 (사용자, 설정, 광고, 마켓)",
            tables: schema.filter(t => overlayTables.includes(t.name)),
            tableCount: schema.filter(t => overlayTables.includes(t.name)).length,
          },
        },
      });
    } catch (error) {
      apiLogger.error("Monitor schema error", { error: error.message });
      res.status(500).json({ error: "Failed to fetch schema" });
    }
  });

  /**
   * GET /api/monitor/segments
   * Returns paginated broadcast segments for category change tracking
   * Query params: page (default 1), limit (default 50), broadcast_id (optional)
   */
  router.get("/monitor/segments", async (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
      const offset = (page - 1) * limit;
      const broadcastId = req.query.broadcast_id;

      let whereClause = "";
      let params;
      if (broadcastId) {
        whereClause = `WHERE bs.broadcast_id = ${p(1)}`;
        params = [broadcastId, limit, offset];
      } else {
        params = [limit, offset];
      }

      // Get total count
      const countSql = broadcastId
        ? `SELECT COUNT(*) as total FROM broadcast_segments WHERE broadcast_id = ${p(1)}`
        : `SELECT COUNT(*) as total FROM broadcast_segments`;
      const countResult = await getOne(countSql, broadcastId ? [broadcastId] : []);
      const total = countResult?.total || 0;

      // Get segments with broadcast info
      const limitPlaceholder = broadcastId ? p(2) : p(1);
      const offsetPlaceholder = broadcastId ? p(3) : p(2);
      const segments = await getAll(
        `SELECT
          bs.id,
          bs.broadcast_id,
          bs.platform,
          bs.channel_id,
          bs.category_id,
          bs.category_name,
          bs.segment_started_at,
          bs.segment_ended_at,
          bs.peak_viewer_count,
          bs.avg_viewer_count,
          b.title as broadcast_title,
          p.nickname as broadcaster_nickname
        FROM broadcast_segments bs
        LEFT JOIN broadcasts b ON bs.broadcast_id = b.id
        LEFT JOIN persons p ON b.broadcaster_person_id = p.id
        ${whereClause}
        ORDER BY bs.segment_started_at DESC
        LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}`,
        params
      );

      res.json({
        data: segments,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      apiLogger.error("Monitor segments error", { error: error.message });
      res.status(500).json({ error: "Failed to fetch segments" });
    }
  });

  /**
   * GET /api/monitor/events
   * Returns paginated events (chat, donation, etc.)
   * Query params: page (default 1), limit (default 50), type (chat|donation|all)
   */
  router.get("/monitor/events", async (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
      const offset = (page - 1) * limit;
      const type = req.query.type;

      let whereClause = "";
      let params;
      let countParams = [];

      if (type === "no_chat") {
        // Exclude chat events (default view)
        whereClause = "WHERE e.event_type != 'chat'";
        params = [limit, offset];
      } else if (type && type !== "all") {
        // Specific type filter
        whereClause = `WHERE e.event_type = ${p(1)}`;
        params = [type, limit, offset];
        countParams = [type];
      } else {
        params = [limit, offset];
      }

      // Get total count
      let countSql = `SELECT COUNT(*) as total FROM events`;
      if (type === "no_chat") {
        countSql = `SELECT COUNT(*) as total FROM events WHERE event_type != 'chat'`;
      } else if (type && type !== "all") {
        countSql = `SELECT COUNT(*) as total FROM events WHERE event_type = ${p(1)}`;
      }
      const countResult = await getOne(countSql, countParams);
      const total = countResult?.total || 0;

      // Get events with actor info
      const limitPlaceholder = (type && type !== "all" && type !== "no_chat") ? p(2) : p(1);
      const offsetPlaceholder = (type && type !== "all" && type !== "no_chat") ? p(3) : p(2);
      const events = await getAll(
        `SELECT
          e.id,
          e.event_type,
          e.platform,
          e.actor_nickname,
          e.actor_role,
          e.target_channel_id,
          e.broadcast_id,
          e.message,
          e.amount,
          e.currency,
          e.donation_type,
          e.event_timestamp,
          p.nickname as actor_nickname_resolved
        FROM events e
        LEFT JOIN persons p ON e.actor_person_id = p.id
        ${whereClause}
        ORDER BY e.event_timestamp DESC
        LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}`,
        params
      );

      res.json({
        data: events,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      apiLogger.error("Monitor events error", { error: error.message });
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  /**
   * GET /api/monitor/categories
   * Returns paginated categories list from platform_categories table
   * Query params: page (default 1), limit (default 50), platform (optional)
   */
  router.get("/monitor/categories", async (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
      const offset = (page - 1) * limit;
      const platform = req.query.platform;

      const isActiveValue = isPostgres() ? 'TRUE' : '1';
      let whereClause = `WHERE is_active = ${isActiveValue}`;
      let params;
      if (platform && platform !== "all") {
        whereClause = `WHERE is_active = ${isActiveValue} AND platform = ${p(1)}`;
        params = [platform, limit, offset];
      } else {
        params = [limit, offset];
      }

      // Get total count
      const countSql = platform && platform !== "all"
        ? `SELECT COUNT(*) as total FROM platform_categories WHERE is_active = ${isActiveValue} AND platform = ${p(1)}`
        : `SELECT COUNT(*) as total FROM platform_categories WHERE is_active = ${isActiveValue}`;
      const countResult = await getOne(countSql, platform && platform !== "all" ? [platform] : []);
      const total = countResult?.total || 0;

      // Get categories from platform_categories table
      const limitPlaceholder = (platform && platform !== "all") ? p(2) : p(1);
      const offsetPlaceholder = (platform && platform !== "all") ? p(3) : p(2);
      const categories = await getAll(
        `SELECT
          id,
          platform,
          platform_category_id as category_id,
          platform_category_name as category_name,
          category_type,
          thumbnail_url,
          viewer_count,
          streamer_count,
          first_seen_at as recorded_at,
          last_seen_at as updated_at
        FROM platform_categories
        ${whereClause}
        ORDER BY viewer_count DESC, platform_category_name ASC
        LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}`,
        params
      );

      res.json({
        data: categories,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      apiLogger.error("Monitor categories error", { error: error.message });
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  /**
   * GET /api/monitor/snapshots
   * Returns paginated viewer snapshots
   * Query params: page (default 1), limit (default 50), broadcast_id (optional)
   */
  router.get("/monitor/snapshots", async (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
      const offset = (page - 1) * limit;
      const broadcastId = req.query.broadcast_id;

      let whereClause = "";
      let params;
      if (broadcastId) {
        whereClause = `WHERE vs.broadcast_id = ${p(1)}`;
        params = [broadcastId, limit, offset];
      } else {
        params = [limit, offset];
      }

      // Get total count
      const countSql = broadcastId
        ? `SELECT COUNT(*) as total FROM viewer_snapshots WHERE broadcast_id = ${p(1)}`
        : `SELECT COUNT(*) as total FROM viewer_snapshots`;
      const countResult = await getOne(countSql, broadcastId ? [broadcastId] : []);
      const total = countResult?.total || 0;

      // Get snapshots with broadcast info
      const limitPlaceholder = broadcastId ? p(2) : p(1);
      const offsetPlaceholder = broadcastId ? p(3) : p(2);
      const snapshots = await getAll(
        `SELECT
          vs.id,
          vs.platform,
          vs.channel_id,
          vs.broadcast_id,
          vs.viewer_count,
          vs.chat_rate_per_minute,
          vs.snapshot_at,
          vs.ingested_at,
          b.title as broadcast_title,
          p.nickname as broadcaster_nickname
        FROM viewer_snapshots vs
        LEFT JOIN broadcasts b ON vs.broadcast_id = b.id
        LEFT JOIN persons p ON b.broadcaster_person_id = p.id
        ${whereClause}
        ORDER BY vs.snapshot_at DESC
        LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}`,
        params
      );

      res.json({
        data: snapshots,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      apiLogger.error("Monitor snapshots error", { error: error.message });
      res.status(500).json({ error: "Failed to fetch snapshots" });
    }
  });

  return router;
};

module.exports = { createMonitorRouter };
