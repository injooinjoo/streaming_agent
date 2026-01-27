/**
 * Admin Routes
 * Admin dashboard, analytics, and management APIs
 * Uses cross-database compatible helpers from connections.js
 */

const express = require("express");
const { getOne, getAll, isPostgres } = require("../db/connections");
const { getSQLHelpers } = require("../config/database.config");
const { STATS_KEYS, TTL } = require("../services/statsCacheService");

/**
 * Get placeholder for parameterized queries
 */
const p = (index) => isPostgres() ? `$${index}` : '?';

/**
 * Create admin router
 * @param {Object} db - Database instance (not used directly, for backward compatibility)
 * @param {Function} authenticateAdmin - Admin auth middleware
 * @param {Function} developerLogin - Developer login handler
 * @param {Object} designService - Design service instance (optional)
 * @returns {express.Router}
 */
const createAdminRouter = (db, authenticateAdmin, developerLogin, designService = null, statsCacheService = null) => {
  const router = express.Router();
  const sql = getSQLHelpers();

  /**
   * POST /api/auth/developer-login
   * Developer/admin login
   */
  router.post("/auth/developer-login", (req, res) => {
    developerLogin(req, res);
  });

  /**
   * GET /api/admin/overview
   * Get admin overview stats
   */
  router.get("/admin/overview", authenticateAdmin, async (req, res) => {
    try {
      const computeOverview = async () => {
        const queries = {
          totalStreamers: "SELECT COUNT(*) as count FROM users WHERE role IN ('user', 'creator')",
          totalUsers: "SELECT COUNT(*) as count FROM users",
          activeUsers: `SELECT COUNT(*) as count FROM users WHERE created_at > ${sql.dateSubtract(30, 'days')}`,
          totalRevenue: "SELECT COALESCE(SUM(revenue), 0) as total FROM ad_impressions",
          monthlyRevenue: `SELECT COALESCE(SUM(revenue), 0) as total FROM ad_impressions WHERE ${sql.formatDate('timestamp', 'YYYY-MM')} = ${sql.formatDate(sql.now(), 'YYYY-MM')}`,
          activeCampaigns: "SELECT COUNT(*) as count FROM ad_campaigns WHERE status = 'active'",
          totalEvents: "SELECT COUNT(*) as count FROM events",
          totalDonations: "SELECT COALESCE(SUM(amount), 0) as total FROM events WHERE event_type = 'donation'",
        };

        const results = {};
        for (const [key, query] of Object.entries(queries)) {
          try {
            const row = await getOne(query);
            results[key] = row?.count || row?.total || 0;
          } catch {
            results[key] = 0;
          }
        }

        return {
          totalStreamers: results.totalStreamers,
          totalUsers: results.totalUsers,
          activeUsers: results.activeUsers,
          totalRevenue: Math.round(results.totalRevenue),
          monthlyRevenue: Math.round(results.monthlyRevenue),
          activeCampaigns: results.activeCampaigns,
          totalEvents: results.totalEvents,
          totalDonations: results.totalDonations,
        };
      };

      if (statsCacheService) {
        const result = await statsCacheService.getOrCompute(STATS_KEYS.ADMIN_OVERVIEW, computeOverview, TTL.SLOW);
        return res.json(result);
      }
      res.json(await computeOverview());
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/admin/streamers
   * Get streamers list with pagination
   */
  router.get("/admin/streamers", authenticateAdmin, async (req, res) => {
    try {
      const { page = 1, limit = 20, search = "", sort = "created_at", order = "DESC" } = req.query;
      const offset = (page - 1) * limit;

      const allowedSortColumns = ["id", "display_name", "email", "created_at", "role"];
      const safeSort = allowedSortColumns.includes(sort) ? sort : "created_at";
      const safeOrder = order === "ASC" ? "ASC" : "DESC";

      const searchParam = `%${search}%`;
      const likeOp = isPostgres() ? 'ILIKE' : 'LIKE';

      const countQuery = `SELECT COUNT(*) as total FROM users WHERE role IN ('user', 'creator') AND (display_name ${likeOp} ${p(1)} OR email ${likeOp} ${p(2)})`;

      const dataQuery = `
        SELECT
          u.id,
          u.email,
          u.display_name,
          u.role,
          u.created_at,
          u.overlay_hash,
          COALESCE((SELECT COUNT(*) FROM events), 0) as event_count,
          COALESCE((SELECT SUM(amount) FROM events WHERE event_type = 'donation'), 0) as total_donations,
          COALESCE((SELECT SUM(revenue) FROM ad_impressions WHERE streamer_id = u.id), 0) as ad_revenue
        FROM users u
        WHERE u.role IN ('user', 'creator') AND (u.display_name ${likeOp} ${p(1)} OR u.email ${likeOp} ${p(2)})
        ORDER BY ${safeSort} ${safeOrder}
        LIMIT ${p(3)} OFFSET ${p(4)}
      `;

      const countResult = await getOne(countQuery, [searchParam, searchParam]);
      const rows = await getAll(dataQuery, [searchParam, searchParam, parseInt(limit), offset]);

      res.json({
        streamers: (rows || []).map((row) => ({
          id: row.id,
          email: row.email,
          displayName: row.display_name,
          role: row.role,
          createdAt: row.created_at,
          overlayHash: row.overlay_hash,
          eventCount: row.event_count,
          totalDonations: row.total_donations,
          adRevenue: Math.round(row.ad_revenue || 0),
        })),
        pagination: {
          total: countResult?.total || 0,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil((countResult?.total || 0) / limit),
        },
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/admin/revenue
   * Get revenue analytics
   */
  router.get("/admin/revenue", authenticateAdmin, async (req, res) => {
    try {
      const { period = "month" } = req.query;

      let dateFormat, daysBack;
      switch (period) {
        case "day":
          dateFormat = 'YYYY-MM-DD HH24:00';
          daysBack = 1;
          break;
        case "week":
          dateFormat = 'YYYY-MM-DD';
          daysBack = 7;
          break;
        default:
          dateFormat = 'YYYY-MM-DD';
          daysBack = 30;
      }

      const queries = {
        adRevenueTrend: `
          SELECT ${sql.formatDate('timestamp', dateFormat)} as date,
                 SUM(revenue) as revenue,
                 SUM(CASE WHEN event_type = 'impression' THEN 1 ELSE 0 END) as impressions,
                 SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END) as clicks
          FROM ad_impressions
          WHERE timestamp > ${sql.dateSubtract(daysBack, 'days')}
          GROUP BY ${sql.formatDate('timestamp', dateFormat)}
          ORDER BY date
        `,
        donationTrend: `
          SELECT ${sql.formatDate('event_timestamp', dateFormat)} as date,
                 SUM(amount) as amount,
                 COUNT(*) as count
          FROM events
          WHERE event_type = 'donation' AND event_timestamp > ${sql.dateSubtract(30, 'days')}
          GROUP BY ${sql.formatDate('event_timestamp', dateFormat)}
          ORDER BY date
        `,
        platformRevenue: `
          SELECT platform, SUM(amount) as total, COUNT(*) as count
          FROM events WHERE event_type = 'donation'
          GROUP BY platform
        `,
        topStreamers: `
          SELECT u.display_name, u.id,
                 COALESCE(SUM(i.revenue), 0) as ad_revenue
          FROM users u
          LEFT JOIN ad_impressions i ON i.streamer_id = u.id
          WHERE u.role IN ('user', 'creator')
          GROUP BY u.id, u.display_name
          ORDER BY ad_revenue DESC
          LIMIT 10
        `,
      };

      const results = {};
      for (const [key, query] of Object.entries(queries)) {
        try {
          results[key] = await getAll(query);
        } catch {
          results[key] = [];
        }
      }

      res.json({
        adRevenueTrend: results.adRevenueTrend || [],
        donationTrend: results.donationTrend || [],
        platformRevenue: results.platformRevenue || [],
        topStreamers: (results.topStreamers || []).map((s) => ({
          ...s,
          ad_revenue: Math.round(s.ad_revenue),
        })),
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/admin/platforms
   * Get platform comparison stats
   */
  router.get("/admin/platforms", authenticateAdmin, async (req, res) => {
    try {
      const queries = {
        eventsByPlatform: `
          SELECT platform,
                 COUNT(*) as total_events,
                 SUM(CASE WHEN event_type = 'donation' THEN 1 ELSE 0 END) as donations,
                 SUM(CASE WHEN event_type = 'chat' THEN 1 ELSE 0 END) as chats,
                 SUM(CASE WHEN event_type = 'subscription' THEN 1 ELSE 0 END) as subscriptions,
                 SUM(CASE WHEN event_type = 'follow' THEN 1 ELSE 0 END) as follows,
                 COALESCE(SUM(CASE WHEN event_type = 'donation' THEN amount ELSE 0 END), 0) as donation_amount
          FROM events
          GROUP BY platform
        `,
        recentTrend: `
          SELECT platform,
                 ${sql.formatDate('event_timestamp', 'YYYY-MM-DD')} as date,
                 COUNT(*) as events
          FROM events
          WHERE event_timestamp > ${sql.dateSubtract(7, 'days')}
          GROUP BY platform, ${sql.formatDate('event_timestamp', 'YYYY-MM-DD')}
          ORDER BY date
        `,
      };

      const results = {};
      for (const [key, query] of Object.entries(queries)) {
        try {
          results[key] = await getAll(query);
        } catch {
          results[key] = [];
        }
      }

      res.json({
        platforms: results.eventsByPlatform || [],
        trend: results.recentTrend || [],
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/admin/viewership
   * Get viewership analytics (real data from events table)
   */
  router.get("/admin/viewership", authenticateAdmin, async (req, res) => {
    try {
      const queries = {
        hourlyTrend: `
          SELECT
            ${sql.formatDate('event_timestamp', 'HH24:00')} as hour,
            SUM(CASE WHEN platform = 'soop' THEN 1 ELSE 0 END) as soop,
            SUM(CASE WHEN platform = 'chzzk' THEN 1 ELSE 0 END) as chzzk,
            SUM(CASE WHEN platform = 'youtube' THEN 1 ELSE 0 END) as youtube,
            SUM(CASE WHEN platform = 'twitch' THEN 1 ELSE 0 END) as twitch
          FROM events
          WHERE event_timestamp >= ${sql.dateSubtract(24, 'hours')}
          GROUP BY ${sql.extractHour('event_timestamp')}
          ORDER BY hour
        `,
        platformStats: `
          SELECT
            platform,
            COUNT(*) as total_events,
            COUNT(CASE WHEN event_type = 'donation' THEN 1 END) as donations,
            COUNT(CASE WHEN event_type = 'chat' THEN 1 END) as chats,
            COALESCE(SUM(CASE WHEN event_type = 'donation' THEN amount ELSE 0 END), 0) as donation_amount,
            COUNT(DISTINCT actor_nickname) as unique_users
          FROM events
          GROUP BY platform
        `,
        todayStats: `
          SELECT
            COUNT(*) as total_events,
            COUNT(DISTINCT actor_nickname) as unique_users,
            COALESCE(SUM(CASE WHEN event_type = 'donation' THEN amount ELSE 0 END), 0) as total_donations
          FROM events
          WHERE ${sql.dateOnly('event_timestamp')} = ${sql.dateOnly(sql.now())}
        `,
        topDonors: `
          SELECT
            actor_nickname as name,
            platform,
            COUNT(*) as donation_count,
            COALESCE(SUM(amount), 0) as total_amount
          FROM events
          WHERE event_type = 'donation' AND actor_nickname IS NOT NULL AND actor_nickname != ''
          GROUP BY actor_nickname, platform
          ORDER BY total_amount DESC
          LIMIT 10
        `,
        recentActivity: `
          SELECT
            COUNT(*) as count,
            platform
          FROM events
          WHERE event_timestamp >= ${sql.dateSubtract(1, 'hours')}
          GROUP BY platform
        `
      };

      const results = {};
      for (const [key, query] of Object.entries(queries)) {
        try {
          results[key] = await getAll(query);
        } catch {
          results[key] = [];
        }
      }

      // Build hourly trend with all 24 hours
      const hourlyMap = {};
      (results.hourlyTrend || []).forEach(row => {
        hourlyMap[row.hour] = row;
      });

      const hourlyTrend = [];
      for (let i = 0; i < 24; i++) {
        const hour = `${i.toString().padStart(2, '0')}:00`;
        if (hourlyMap[hour]) {
          hourlyTrend.push(hourlyMap[hour]);
        } else {
          hourlyTrend.push({ hour, soop: 0, chzzk: 0, youtube: 0, twitch: 0 });
        }
      }

      // Build platform stats
      const platformStats = {};
      (results.platformStats || []).forEach(plat => {
        platformStats[plat.platform] = {
          current: plat.total_events || 0,
          peak: plat.donation_amount || 0,
          channels: plat.unique_users || 0,
          donations: plat.donations || 0,
          chats: plat.chats || 0
        };
      });

      // Ensure all platforms exist
      ['soop', 'chzzk', 'youtube', 'twitch'].forEach(platform => {
        if (!platformStats[platform]) {
          platformStats[platform] = { current: 0, peak: 0, channels: 0, donations: 0, chats: 0 };
        }
      });

      // Calculate totals
      const totalEvents = Object.values(platformStats).reduce((sum, plat) => sum + plat.current, 0);
      const todayData = results.todayStats?.[0] || { total_events: 0, unique_users: 0, total_donations: 0 };

      // Build top donors as "streamer influence"
      const streamerInfluence = (results.topDonors || []).map((donor, idx) => ({
        id: idx + 1,
        name: donor.name || '익명',
        platform: donor.platform || 'unknown',
        influenceScore: Math.min(100, Math.round((donor.total_amount || 0) / 10000)),
        avgViewers: donor.donation_count,
        adEfficiency: donor.donation_count > 0 ? ((donor.total_amount || 0) / donor.donation_count / 1000).toFixed(1) : 0,
        donationRate: donor.donation_count,
        trend: (donor.total_amount || 0) > 50000 ? 'up' : 'stable',
        totalAmount: donor.total_amount || 0
      }));

      // Build ranking lists from real data
      const topAdEfficiency = streamerInfluence
        .slice(0, 3)
        .map(s => ({ id: s.id, name: s.name, value: parseFloat(s.adEfficiency), unit: "천원/건" }));

      const trendingStreamers = streamerInfluence
        .filter(s => s.trend === 'up')
        .slice(0, 3)
        .map(s => ({ id: s.id, name: s.name, value: s.influenceScore, unit: "점" }));

      const topDonationRate = streamerInfluence
        .sort((a, b) => b.donationRate - a.donationRate)
        .slice(0, 3)
        .map(s => ({ id: s.id, name: s.name, value: s.donationRate, unit: "건" }));

      res.json({
        hourlyTrend,
        platformStats,
        totalViewers: totalEvents,
        peakToday: todayData.total_donations || 0,
        avgConcurrent: todayData.unique_users || 0,
        streamerInfluence,
        topAdEfficiency,
        trendingStreamers,
        topDonationRate,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/admin/streamer/:streamerId
   * Get streamer detail (real data from events table)
   */
  router.get("/admin/streamer/:streamerId", authenticateAdmin, async (req, res) => {
    try {
      const { streamerId } = req.params;

      const user = await getOne(`SELECT * FROM users WHERE id = ${p(1)}`, [streamerId]);

      const eventStats = await getOne(`
        SELECT
          COUNT(*) as total_events,
          COUNT(CASE WHEN event_type = 'donation' THEN 1 END) as donation_count,
          COUNT(CASE WHEN event_type = 'chat' THEN 1 END) as chat_count,
          COALESCE(SUM(CASE WHEN event_type = 'donation' THEN amount ELSE 0 END), 0) as total_donations,
          COUNT(DISTINCT ${sql.dateOnly('event_timestamp')}) as active_days
        FROM events
      `);

      const performanceTrend = await getAll(`
        SELECT
          ${sql.dateOnly('event_timestamp')} as date,
          COUNT(CASE WHEN event_type = 'chat' THEN 1 END) as chats,
          COUNT(CASE WHEN event_type = 'donation' THEN 1 END) as donations,
          COALESCE(SUM(CASE WHEN event_type = 'donation' THEN amount ELSE 0 END), 0) as donation_amount,
          COUNT(DISTINCT actor_nickname) as unique_users
        FROM events
        WHERE event_timestamp >= ${sql.dateSubtract(7, 'days')}
        GROUP BY ${sql.dateOnly('event_timestamp')}
        ORDER BY date
      `);

      const recentActivity = await getAll(`
        SELECT
          id,
          event_type as type,
          actor_nickname as sender,
          amount,
          message,
          platform,
          event_timestamp as timestamp
        FROM events
        WHERE event_type = 'donation'
        ORDER BY event_timestamp DESC
        LIMIT 10
      `);

      const platformBreakdown = await getAll(`
        SELECT
          platform,
          COUNT(*) as events,
          COALESCE(SUM(CASE WHEN event_type = 'donation' THEN amount ELSE 0 END), 0) as donations
        FROM events
        GROUP BY platform
      `);

      const stats = eventStats || {};

      const streamer = user ? {
        id: user.id,
        name: user.display_name || `스트리머 ${user.id}`,
        platform: "soop",
        profileImage: user.avatar_url,
        followers: stats.total_events || 0,
        totalStreams: stats.active_days || 0,
        joinDate: user.created_at,
        influenceScore: Math.min(100, Math.round((stats.total_donations || 0) / 10000)),
        adEfficiency: stats.donation_count > 0 ? ((stats.total_donations || 0) / stats.donation_count / 1000).toFixed(1) : 0,
        donationRate: stats.donation_count || 0,
        totalRevenue: stats.total_donations || 0,
      } : {
        id: parseInt(streamerId),
        name: `스트리머 ${streamerId}`,
        platform: "soop",
        profileImage: null,
        followers: 0,
        totalStreams: 0,
        joinDate: new Date().toISOString(),
        influenceScore: 0,
        adEfficiency: 0,
        donationRate: 0,
        totalRevenue: 0,
      };

      // Build platform breakdown as "game performance"
      const gamePerformance = (platformBreakdown || []).map(plat => ({
        game: plat.platform,
        gameName: plat.platform === 'soop' ? 'SOOP' : plat.platform === 'chzzk' ? '치지직' : plat.platform,
        avgViewers: plat.events || 0,
        donations: plat.donations || 0,
        adEfficiency: plat.events > 0 ? ((plat.donations || 0) / plat.events / 100).toFixed(1) : 0,
        streamHours: 0,
      }));

      // Build performance trend from real data
      const trend = (performanceTrend || []).map(day => ({
        date: day.date,
        viewers: day.unique_users || 0,
        donations: day.donation_amount || 0,
        adRevenue: 0,
        chats: day.chats || 0,
      }));

      // Fill missing days
      const filledTrend = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const existing = trend.find(t => t.date === dateStr);
        if (existing) {
          filledTrend.push(existing);
        } else {
          filledTrend.push({ date: dateStr, viewers: 0, donations: 0, adRevenue: 0, chats: 0 });
        }
      }

      // Build recent broadcasts from recent donations
      const recentBroadcasts = (recentActivity || []).slice(0, 5).map((event) => ({
        id: event.id,
        title: event.message || '후원',
        game: event.platform === 'soop' ? 'SOOP' : event.platform === 'chzzk' ? '치지직' : event.platform,
        date: event.timestamp?.split('T')[0] || '-',
        duration: '-',
        peakViewers: 0,
        avgViewers: 0,
        donations: event.amount || 0,
        sender: event.sender || '익명',
      }));

      res.json({
        streamer,
        gamePerformance,
        performanceTrend: filledTrend,
        recentBroadcasts,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/admin/run-migration
   * Run database schema migration (fixes events table columns)
   * Only available in PostgreSQL mode
   */
  router.post("/admin/run-migration", authenticateAdmin, async (req, res) => {
    if (!isPostgres()) {
      return res.json({
        success: true,
        message: "Migration not needed for SQLite",
        migrated: false,
      });
    }

    try {
      // Check current schema
      const schemaResult = await getAll(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'events'
        ORDER BY ordinal_position
      `);

      const columns = schemaResult.map((r) => r.column_name);
      const hasEventType = columns.includes("event_type");
      const hasType = columns.includes("type");

      if (hasEventType) {
        return res.json({
          success: true,
          message: "Schema is already up to date",
          migrated: false,
          columns,
        });
      }

      if (!hasType) {
        return res.json({
          success: false,
          message: "Cannot migrate: neither 'type' nor 'event_type' column found",
          columns,
        });
      }

      // Run migration - get direct db connection for DDL
      const { Pool } = require("pg");
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      });

      const client = await pool.connect();

      try {
        // Step 1: Rename columns
        const columnsToRename = [
          { old: "type", new: "event_type" },
          { old: "sender", new: "actor_nickname" },
          { old: "timestamp", new: "event_timestamp" },
        ];

        for (const col of columnsToRename) {
          if (columns.includes(col.old)) {
            await client.query(`ALTER TABLE events RENAME COLUMN ${col.old} TO ${col.new}`);
          }
        }

        // Step 2: Add missing columns
        const columnsToAdd = [
          { name: "actor_person_id", type: "INTEGER" },
          { name: "actor_role", type: "VARCHAR(50)" },
          { name: "target_person_id", type: "INTEGER" },
          { name: "target_channel_id", type: "VARCHAR(255)" },
          { name: "broadcast_id", type: "INTEGER" },
          { name: "original_amount", type: "INTEGER" },
          { name: "currency", type: "VARCHAR(10)" },
          { name: "donation_type", type: "VARCHAR(50)" },
          { name: "ingested_at", type: "TIMESTAMPTZ DEFAULT NOW()" },
        ];

        for (const col of columnsToAdd) {
          if (!columns.includes(col.name)) {
            await client.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
          }
        }

        // Step 3: Update indexes
        await client.query("DROP INDEX IF EXISTS idx_events_timestamp");
        await client.query("CREATE INDEX IF NOT EXISTS idx_events_event_timestamp ON events(event_timestamp)");
        await client.query("CREATE INDEX IF NOT EXISTS idx_events_target_channel ON events(target_channel_id)");
        await client.query("CREATE INDEX IF NOT EXISTS idx_events_target_type ON events(target_channel_id, event_type)");

        // Get final schema
        const finalSchema = await client.query(`
          SELECT column_name FROM information_schema.columns WHERE table_name = 'events'
        `);

        client.release();
        await pool.end();

        return res.json({
          success: true,
          message: "Migration completed successfully",
          migrated: true,
          columnsRenamed: columnsToRename.filter((c) => columns.includes(c.old)).map((c) => `${c.old} → ${c.new}`),
          columnsAdded: columnsToAdd.filter((c) => !columns.includes(c.name)).map((c) => c.name),
          finalColumns: finalSchema.rows.map((r) => r.column_name),
        });
      } catch (err) {
        client.release();
        throw err;
      }
    } catch (err) {
      console.error("[admin] Migration error:", err);
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  });

  // ===== Design Review APIs =====

  /**
   * GET /api/admin/designs/pending
   * Get pending designs for review
   */
  router.get("/admin/designs/pending", authenticateAdmin, async (req, res) => {
    if (!designService) {
      return res.status(501).json({ error: "Design service not available" });
    }

    try {
      const { category, limit, offset } = req.query;
      const result = await designService.getPending({
        category,
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/admin/designs/stats
   * Get design statistics
   */
  router.get("/admin/designs/stats", authenticateAdmin, async (req, res) => {
    if (!designService) {
      return res.status(501).json({ error: "Design service not available" });
    }

    try {
      const stats = await designService.getStats();
      res.json(stats);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/admin/designs/:id
   * Get design details for review
   */
  router.get("/admin/designs/:id", authenticateAdmin, async (req, res) => {
    if (!designService) {
      return res.status(501).json({ error: "Design service not available" });
    }

    try {
      const design = await designService.getById(parseInt(req.params.id));
      if (!design) {
        return res.status(404).json({ error: "디자인을 찾을 수 없습니다." });
      }
      res.json({ design });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/admin/designs/:id/approve
   * Approve a pending design
   */
  router.post("/admin/designs/:id/approve", authenticateAdmin, async (req, res) => {
    if (!designService) {
      return res.status(501).json({ error: "Design service not available" });
    }

    try {
      const design = await designService.approve(
        parseInt(req.params.id),
        req.user.id
      );

      if (!design) {
        return res.status(404).json({ error: "디자인을 찾을 수 없습니다." });
      }

      res.json({ design, message: "디자인이 승인되었습니다." });
    } catch (err) {
      if (err.message.includes('심사 대기')) {
        return res.status(400).json({ error: err.message });
      }
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/admin/designs/:id/reject
   * Reject a pending design with reason
   */
  router.post("/admin/designs/:id/reject", authenticateAdmin, async (req, res) => {
    if (!designService) {
      return res.status(501).json({ error: "Design service not available" });
    }

    try {
      const { reason } = req.body;

      const design = await designService.reject(
        parseInt(req.params.id),
        req.user.id,
        reason
      );

      if (!design) {
        return res.status(404).json({ error: "디자인을 찾을 수 없습니다." });
      }

      res.json({ design, message: "디자인이 거절되었습니다." });
    } catch (err) {
      if (err.message.includes('심사 대기') || err.message.includes('사유')) {
        return res.status(400).json({ error: err.message });
      }
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};

module.exports = createAdminRouter;
