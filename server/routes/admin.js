/**
 * Admin Routes
 * Admin dashboard, analytics, and management APIs
 */

const express = require("express");

/**
 * Create admin router
 * @param {sqlite3.Database} db - Database instance
 * @param {Function} authenticateAdmin - Admin auth middleware
 * @param {Function} developerLogin - Developer login handler
 * @returns {express.Router}
 */
const createAdminRouter = (db, authenticateAdmin, developerLogin) => {
  const router = express.Router();

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
  router.get("/admin/overview", authenticateAdmin, (req, res) => {
    const queries = {
      totalStreamers: "SELECT COUNT(*) as count FROM users WHERE role IN ('user', 'creator')",
      totalUsers: "SELECT COUNT(*) as count FROM users",
      activeUsers: "SELECT COUNT(*) as count FROM users WHERE created_at > datetime('now', '-30 days')",
      totalRevenue: "SELECT COALESCE(SUM(revenue), 0) as total FROM ad_impressions",
      monthlyRevenue:
        "SELECT COALESCE(SUM(revenue), 0) as total FROM ad_impressions WHERE strftime('%Y-%m', timestamp) = strftime('%Y-%m', 'now')",
      activeCampaigns: "SELECT COUNT(*) as count FROM ad_campaigns WHERE status = 'active'",
      totalEvents: "SELECT COUNT(*) as count FROM events",
      totalDonations: "SELECT COALESCE(SUM(amount), 0) as total FROM events WHERE type = 'donation'",
    };

    const results = {};
    let completed = 0;
    const keys = Object.keys(queries);

    keys.forEach((key) => {
      db.get(queries[key], [], (err, row) => {
        if (err) {
          results[key] = 0;
        } else {
          results[key] = row?.count || row?.total || 0;
        }
        completed++;
        if (completed === keys.length) {
          res.json({
            totalStreamers: results.totalStreamers,
            totalUsers: results.totalUsers,
            activeUsers: results.activeUsers,
            totalRevenue: Math.round(results.totalRevenue),
            monthlyRevenue: Math.round(results.monthlyRevenue),
            activeCampaigns: results.activeCampaigns,
            totalEvents: results.totalEvents,
            totalDonations: results.totalDonations,
          });
        }
      });
    });
  });

  /**
   * GET /api/admin/streamers
   * Get streamers list with pagination
   */
  router.get("/admin/streamers", authenticateAdmin, (req, res) => {
    const { page = 1, limit = 20, search = "", sort = "created_at", order = "DESC" } = req.query;
    const offset = (page - 1) * limit;

    const allowedSortColumns = ["id", "display_name", "email", "created_at", "role"];
    const safeSort = allowedSortColumns.includes(sort) ? sort : "created_at";
    const safeOrder = order === "ASC" ? "ASC" : "DESC";

    const searchParam = `%${search}%`;

    const countQuery = `SELECT COUNT(*) as total FROM users WHERE role IN ('user', 'creator') AND (display_name LIKE ? OR email LIKE ?)`;

    const dataQuery = `
      SELECT
        u.id,
        u.email,
        u.display_name,
        u.role,
        u.created_at,
        u.overlay_hash,
        COALESCE((SELECT COUNT(*) FROM events), 0) as event_count,
        COALESCE((SELECT SUM(amount) FROM events WHERE type = 'donation'), 0) as total_donations,
        COALESCE((SELECT SUM(revenue) FROM ad_impressions WHERE streamer_id = u.id), 0) as ad_revenue
      FROM users u
      WHERE u.role IN ('user', 'creator') AND (u.display_name LIKE ? OR u.email LIKE ?)
      ORDER BY ${safeSort} ${safeOrder}
      LIMIT ? OFFSET ?
    `;

    db.get(countQuery, [searchParam, searchParam], (err, countResult) => {
      if (err) return res.status(500).json({ error: err.message });

      db.all(dataQuery, [searchParam, searchParam, parseInt(limit), offset], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        res.json({
          streamers: rows.map((row) => ({
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
            total: countResult.total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(countResult.total / limit),
          },
        });
      });
    });
  });

  /**
   * GET /api/admin/revenue
   * Get revenue analytics
   */
  router.get("/admin/revenue", authenticateAdmin, (req, res) => {
    const { period = "month" } = req.query;

    let dateFormat, dateCondition;
    switch (period) {
      case "day":
        dateFormat = "%Y-%m-%d %H:00";
        dateCondition = "timestamp > datetime('now', '-1 day')";
        break;
      case "week":
        dateFormat = "%Y-%m-%d";
        dateCondition = "timestamp > datetime('now', '-7 days')";
        break;
      default:
        dateFormat = "%Y-%m-%d";
        dateCondition = "timestamp > datetime('now', '-30 days')";
    }

    const queries = {
      adRevenueTrend: `
        SELECT strftime('${dateFormat}', timestamp) as date,
               SUM(revenue) as revenue,
               SUM(CASE WHEN event_type = 'impression' THEN 1 ELSE 0 END) as impressions,
               SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END) as clicks
        FROM ad_impressions
        WHERE ${dateCondition}
        GROUP BY date ORDER BY date
      `,
      donationTrend: `
        SELECT strftime('${dateFormat}', timestamp) as date,
               SUM(amount) as amount,
               COUNT(*) as count
        FROM events
        WHERE type = 'donation' AND ${dateCondition}
        GROUP BY date ORDER BY date
      `,
      platformRevenue: `
        SELECT platform, SUM(amount) as total, COUNT(*) as count
        FROM events WHERE type = 'donation'
        GROUP BY platform
      `,
      topStreamers: `
        SELECT u.display_name, u.id,
               COALESCE(SUM(i.revenue), 0) as ad_revenue
        FROM users u
        LEFT JOIN ad_impressions i ON i.streamer_id = u.id
        WHERE u.role IN ('user', 'creator')
        GROUP BY u.id
        ORDER BY ad_revenue DESC
        LIMIT 10
      `,
    };

    const results = {};
    let completed = 0;
    const keys = Object.keys(queries);

    keys.forEach((key) => {
      db.all(queries[key], [], (err, rows) => {
        results[key] = err ? [] : rows;
        completed++;
        if (completed === keys.length) {
          res.json({
            adRevenueTrend: results.adRevenueTrend,
            donationTrend: results.donationTrend,
            platformRevenue: results.platformRevenue,
            topStreamers: results.topStreamers.map((s) => ({
              ...s,
              ad_revenue: Math.round(s.ad_revenue),
            })),
          });
        }
      });
    });
  });

  /**
   * GET /api/admin/platforms
   * Get platform comparison stats
   */
  router.get("/admin/platforms", authenticateAdmin, (req, res) => {
    const queries = {
      eventsByPlatform: `
        SELECT platform,
               COUNT(*) as total_events,
               SUM(CASE WHEN type = 'donation' THEN 1 ELSE 0 END) as donations,
               SUM(CASE WHEN type = 'chat' THEN 1 ELSE 0 END) as chats,
               SUM(CASE WHEN type = 'subscription' THEN 1 ELSE 0 END) as subscriptions,
               SUM(CASE WHEN type = 'follow' THEN 1 ELSE 0 END) as follows,
               COALESCE(SUM(CASE WHEN type = 'donation' THEN amount ELSE 0 END), 0) as donation_amount
        FROM events
        GROUP BY platform
      `,
      recentTrend: `
        SELECT platform,
               strftime('%Y-%m-%d', timestamp) as date,
               COUNT(*) as events
        FROM events
        WHERE timestamp > datetime('now', '-7 days')
        GROUP BY platform, date
        ORDER BY date
      `,
    };

    const results = {};
    let completed = 0;
    const keys = Object.keys(queries);

    keys.forEach((key) => {
      db.all(queries[key], [], (err, rows) => {
        results[key] = err ? [] : rows;
        completed++;
        if (completed === keys.length) {
          res.json({
            platforms: results.eventsByPlatform,
            trend: results.recentTrend,
          });
        }
      });
    });
  });

  /**
   * GET /api/admin/viewership
   * Get viewership analytics (mock data)
   */
  router.get("/admin/viewership", authenticateAdmin, (req, res) => {
    const generateHourlyData = () => {
      const hours = Array.from({ length: 24 }, (_, i) => i);
      return hours.map((hour) => ({
        hour: `${hour.toString().padStart(2, "0")}:00`,
        soop: Math.floor(Math.random() * 50000) + 20000,
        chzzk: Math.floor(Math.random() * 60000) + 30000,
        youtube: Math.floor(Math.random() * 30000) + 10000,
        twitch: Math.floor(Math.random() * 10000) + 2000,
      }));
    };

    const platformStats = {
      soop: { current: 87107, peak: 361049, channels: 2144 },
      chzzk: { current: 92289, peak: 264871, channels: 2438 },
      youtube: { current: 45000, peak: 120000, channels: 850 },
      twitch: { current: 2916, peak: 4633, channels: 108 },
    };

    const streamerInfluence = [
      {
        id: 1,
        name: "감스트",
        platform: "soop",
        influenceScore: 95,
        avgViewers: 45000,
        adEfficiency: 4.8,
        donationRate: 3.2,
        trend: "up",
        mainGame: "league",
        games: ["league", "valorant", "talk"],
      },
      {
        id: 2,
        name: "풍월량",
        platform: "chzzk",
        influenceScore: 92,
        avgViewers: 38000,
        adEfficiency: 4.5,
        donationRate: 2.8,
        trend: "up",
        mainGame: "league",
        games: ["league", "minecraft"],
      },
      {
        id: 3,
        name: "우왁굳",
        platform: "soop",
        influenceScore: 88,
        avgViewers: 32000,
        adEfficiency: 4.2,
        donationRate: 4.1,
        trend: "stable",
        mainGame: "minecraft",
        games: ["minecraft", "gta", "talk"],
      },
    ];

    const topAdEfficiency = [...streamerInfluence]
      .sort((a, b) => b.adEfficiency - a.adEfficiency)
      .slice(0, 3)
      .map((s) => ({ id: s.id, name: s.name, value: s.adEfficiency, unit: "% CTR" }));

    const trendingStreamers = streamerInfluence
      .filter((s) => s.trend === "up")
      .sort((a, b) => b.influenceScore - a.influenceScore)
      .slice(0, 3)
      .map((s) => ({ id: s.id, name: s.name, value: s.influenceScore, unit: "점" }));

    const topDonationRate = [...streamerInfluence]
      .sort((a, b) => b.donationRate - a.donationRate)
      .slice(0, 3)
      .map((s) => ({ id: s.id, name: s.name, value: s.donationRate, unit: "%" }));

    res.json({
      hourlyTrend: generateHourlyData(),
      platformStats,
      totalViewers: 227312,
      peakToday: 450000,
      avgConcurrent: 180000,
      streamerInfluence,
      topAdEfficiency,
      trendingStreamers,
      topDonationRate,
    });
  });

  /**
   * GET /api/admin/streamer/:streamerId
   * Get streamer detail
   */
  router.get("/admin/streamer/:streamerId", authenticateAdmin, (req, res) => {
    const { streamerId } = req.params;

    // Try to get real user data first
    db.get("SELECT * FROM users WHERE id = ?", [streamerId], (err, user) => {
      const streamer = user
        ? {
            id: user.id,
            name: user.display_name || `스트리머 ${user.id}`,
            platform: "soop",
            profileImage: user.avatar_url,
            followers: 100000 + Math.floor(Math.random() * 500000),
            totalStreams: 500 + Math.floor(Math.random() * 2000),
            joinDate: user.created_at,
            influenceScore: 50 + Math.floor(Math.random() * 40),
            adEfficiency: 2 + Math.random() * 3,
            donationRate: 1 + Math.random() * 4,
            totalRevenue: 50000000 + Math.floor(Math.random() * 300000000),
          }
        : {
            id: parseInt(streamerId),
            name: `스트리머 ${streamerId}`,
            platform: "soop",
            profileImage: null,
            followers: 100000 + Math.floor(Math.random() * 500000),
            totalStreams: 500 + Math.floor(Math.random() * 2000),
            joinDate: "2020-01-01",
            influenceScore: 50 + Math.floor(Math.random() * 40),
            adEfficiency: 2 + Math.random() * 3,
            donationRate: 1 + Math.random() * 4,
            totalRevenue: 50000000 + Math.floor(Math.random() * 300000000),
          };

      const gamePerformance = [
        {
          game: "league",
          gameName: "리그오브레전드",
          avgViewers: 28000 + Math.floor(Math.random() * 20000),
          donations: 12500000 + Math.floor(Math.random() * 10000000),
          adEfficiency: 3.5 + Math.random() * 2,
          streamHours: 120 + Math.floor(Math.random() * 80),
        },
        {
          game: "valorant",
          gameName: "발로란트",
          avgViewers: 22000 + Math.floor(Math.random() * 15000),
          donations: 8500000 + Math.floor(Math.random() * 8000000),
          adEfficiency: 3.2 + Math.random() * 1.8,
          streamHours: 80 + Math.floor(Math.random() * 60),
        },
        {
          game: "minecraft",
          gameName: "마인크래프트",
          avgViewers: 18000 + Math.floor(Math.random() * 12000),
          donations: 6500000 + Math.floor(Math.random() * 6000000),
          adEfficiency: 2.8 + Math.random() * 1.5,
          streamHours: 60 + Math.floor(Math.random() * 50),
        },
      ];

      const performanceTrend = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return {
          date: date.toISOString().split("T")[0],
          viewers: 15000 + Math.floor(Math.random() * 25000),
          donations: 2000000 + Math.floor(Math.random() * 8000000),
          adRevenue: 500000 + Math.floor(Math.random() * 2000000),
        };
      });

      const recentBroadcasts = [
        {
          id: 1,
          title: "랭크 올리기 도전!",
          game: "리그오브레전드",
          date: "2026-01-08",
          duration: "4시간 32분",
          peakViewers: 45000,
          avgViewers: 32000,
          donations: 3500000,
        },
        {
          id: 2,
          title: "시청자 게임 같이해요",
          game: "발로란트",
          date: "2026-01-07",
          duration: "3시간 15분",
          peakViewers: 38000,
          avgViewers: 28000,
          donations: 2800000,
        },
      ];

      res.json({
        streamer,
        gamePerformance,
        performanceTrend,
        recentBroadcasts,
      });
    });
  });

  return router;
};

module.exports = createAdminRouter;
