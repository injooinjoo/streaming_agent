/**
 * Monitor Routes
 * API endpoints for streaming data monitoring dashboard
 *
 * Uses unified database (unified.db) combining:
 * - Streaming data (events, viewer stats, categories)
 * - Overlay settings (users, settings, ads, marketplace)
 */

const express = require("express");
const { api: apiLogger } = require("../services/logger");

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
 * @param {sqlite3.Database} db - Unified database instance
 * @returns {express.Router}
 */
const createMonitorRouter = (db) => {
  const router = express.Router();

  /**
   * Helper: Promisify db.get
   */
  const dbGet = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  };

  /**
   * Helper: Promisify db.all
   */
  const dbAll = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  };

  /**
   * GET /api/monitor/stats
   * Returns summary statistics
   */
  router.get("/monitor/stats", async (req, res) => {
    try {
      // Execute all stats queries in parallel
      const [
        liveBroadcasts,
        totalViewers,
        totalPersons,
        totalDonations,
        snapshotCount,
        engagementCount,
        eventCount,
        segmentCount,
      ] = await Promise.all([
        // Live broadcasts count
        dbGet(`SELECT COUNT(*) as count FROM broadcasts WHERE is_live = 1`),
        // Total viewers from live broadcasts
        dbGet(`SELECT COALESCE(SUM(current_viewer_count), 0) as total FROM broadcasts WHERE is_live = 1`),
        // Total persons
        dbGet(`SELECT COUNT(*) as count FROM persons`),
        // Total donation amount (from events table)
        dbGet(`SELECT COALESCE(SUM(amount), 0) as total FROM events WHERE event_type = 'donation'`),
        // Total viewer snapshots
        dbGet(`SELECT COUNT(*) as count FROM viewer_snapshots`),
        // Total engagement records
        dbGet(`SELECT COUNT(*) as count FROM viewer_engagement`),
        // Total events
        dbGet(`SELECT COUNT(*) as count FROM events`),
        // Total broadcast segments
        dbGet(`SELECT COUNT(*) as count FROM broadcast_segments`),
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
      });
    } catch (error) {
      apiLogger.error("Monitor stats error", { error: error.message });
      res.status(500).json({ error: "Failed to fetch stats" });
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

      const whereClause = liveOnly ? "WHERE b.is_live = 1" : "";

      // Get total count
      const countResult = await dbGet(
        `SELECT COUNT(*) as total FROM broadcasts b ${whereClause}`
      );
      const total = countResult?.total || 0;

      // Get broadcasts with latest segment category and computed stats from events
      const broadcasts = await dbAll(
        `SELECT
          b.id,
          b.platform,
          b.channel_id,
          b.broadcast_id,
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
        LIMIT ? OFFSET ?`,
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
      const countResult = await dbGet(
        `SELECT COUNT(*) as total FROM persons p ${whereClause}`
      );
      const total = countResult?.total || 0;

      // Get persons with stats computed from events
      const persons = await dbAll(
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
        LIMIT ? OFFSET ?`,
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
   * GET /api/monitor/engagement
   * Returns paginated viewer engagement records
   * Query params: page (default 1), limit (default 50)
   */
  router.get("/monitor/engagement", async (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
      const offset = (page - 1) * limit;

      // Get total count
      const countResult = await dbGet(
        `SELECT COUNT(*) as total FROM viewer_engagement`
      );
      const total = countResult?.total || 0;

      // Get engagement records with joined person and category data
      const engagement = await dbAll(
        `SELECT
          ve.id,
          ve.platform,
          ve.channel_id,
          ve.category_id,
          c.category_name,
          ve.chat_count,
          ve.donation_count,
          ve.total_donation_amount as donation_amount,
          ve.first_seen_at,
          ve.last_seen_at,
          vp.nickname as viewer_nickname,
          vp.platform_user_id as viewer_user_id,
          bp.nickname as broadcaster_nickname,
          bp.channel_id as broadcaster_channel_id
        FROM viewer_engagement ve
        LEFT JOIN persons vp ON ve.person_id = vp.id
        LEFT JOIN persons bp ON ve.broadcaster_person_id = bp.id
        LEFT JOIN categories c ON ve.category_id = c.category_id AND ve.platform = c.platform
        ORDER BY ve.last_seen_at DESC, ve.total_donation_amount DESC
        LIMIT ? OFFSET ?`,
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
      // Get all tables from sqlite_master
      const tables = await dbAll(
        `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`
      );

      const schema = [];
      for (const table of tables) {
        // Get column info using PRAGMA
        const columns = await dbAll(`PRAGMA table_info("${table.name}")`);
        // Get row count for the table
        const countResult = await dbAll(`SELECT COUNT(*) as count FROM "${table.name}"`);
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
      let params = [limit, offset];
      if (broadcastId) {
        whereClause = "WHERE bs.broadcast_id = ?";
        params = [broadcastId, limit, offset];
      }

      // Get total count
      const countSql = broadcastId
        ? `SELECT COUNT(*) as total FROM broadcast_segments WHERE broadcast_id = ?`
        : `SELECT COUNT(*) as total FROM broadcast_segments`;
      const countResult = await dbGet(countSql, broadcastId ? [broadcastId] : []);
      const total = countResult?.total || 0;

      // Get segments with broadcast info
      const segments = await dbAll(
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
        LIMIT ? OFFSET ?`,
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
      let params = [limit, offset];
      if (type && type !== "all") {
        whereClause = "WHERE e.event_type = ?";
        params = [type, limit, offset];
      }

      // Get total count
      const countSql = type && type !== "all"
        ? `SELECT COUNT(*) as total FROM events WHERE event_type = ?`
        : `SELECT COUNT(*) as total FROM events`;
      const countResult = await dbGet(countSql, type && type !== "all" ? [type] : []);
      const total = countResult?.total || 0;

      // Get events with actor info
      const events = await dbAll(
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
        LIMIT ? OFFSET ?`,
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

  return router;
};

module.exports = { createMonitorRouter };
