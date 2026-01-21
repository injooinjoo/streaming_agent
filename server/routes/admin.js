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
      totalDonations: "SELECT COALESCE(SUM(amount), 0) as total FROM events WHERE event_type = 'donation'",
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
        COALESCE((SELECT SUM(amount) FROM events WHERE event_type = 'donation'), 0) as total_donations,
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
        SELECT strftime('${dateFormat}', event_timestamp) as date,
               SUM(amount) as amount,
               COUNT(*) as count
        FROM events
        WHERE event_type = 'donation' AND event_timestamp > datetime('now', '-30 days')
        GROUP BY date ORDER BY date
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
               strftime('%Y-%m-%d', event_timestamp) as date,
               COUNT(*) as events
        FROM events
        WHERE event_timestamp > datetime('now', '-7 days')
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
   * Get viewership analytics (real data from events table)
   */
  router.get("/admin/viewership", authenticateAdmin, (req, res) => {
    const queries = {
      hourlyTrend: `
        SELECT
          strftime('%H:00', event_timestamp) as hour,
          SUM(CASE WHEN platform = 'soop' THEN 1 ELSE 0 END) as soop,
          SUM(CASE WHEN platform = 'chzzk' THEN 1 ELSE 0 END) as chzzk,
          SUM(CASE WHEN platform = 'youtube' THEN 1 ELSE 0 END) as youtube,
          SUM(CASE WHEN platform = 'twitch' THEN 1 ELSE 0 END) as twitch
        FROM events
        WHERE event_timestamp >= datetime('now', '-24 hours')
        GROUP BY strftime('%H', event_timestamp)
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
        WHERE DATE(event_timestamp) = DATE('now')
      `,
      topDonors: `
        SELECT
          actor_nickname as name,
          platform,
          COUNT(*) as donation_count,
          COALESCE(SUM(amount), 0) as total_amount
        FROM events
        WHERE event_type = 'donation' AND actor_nickname IS NOT NULL AND actor_nickname != ''
        GROUP BY actor_nickname
        ORDER BY total_amount DESC
        LIMIT 10
      `,
      recentActivity: `
        SELECT
          COUNT(*) as count,
          platform
        FROM events
        WHERE event_timestamp >= datetime('now', '-1 hour')
        GROUP BY platform
      `
    };

    const results = {};
    let completed = 0;
    const keys = Object.keys(queries);

    keys.forEach((key) => {
      db.all(queries[key], [], (err, rows) => {
        results[key] = err ? [] : rows;
        completed++;

        if (completed === keys.length) {
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
          (results.platformStats || []).forEach(p => {
            platformStats[p.platform] = {
              current: p.total_events || 0,
              peak: p.donation_amount || 0,
              channels: p.unique_users || 0,
              donations: p.donations || 0,
              chats: p.chats || 0
            };
          });

          // Ensure all platforms exist
          ['soop', 'chzzk', 'youtube', 'twitch'].forEach(platform => {
            if (!platformStats[platform]) {
              platformStats[platform] = { current: 0, peak: 0, channels: 0, donations: 0, chats: 0 };
            }
          });

          // Calculate totals
          const totalEvents = Object.values(platformStats).reduce((sum, p) => sum + p.current, 0);
          const todayData = results.todayStats?.[0] || { total_events: 0, unique_users: 0, total_donations: 0 };

          // Build top donors as "streamer influence"
          const streamerInfluence = (results.topDonors || []).map((donor, idx) => ({
            id: idx + 1,
            name: donor.name || '익명',
            platform: donor.platform || 'unknown',
            influenceScore: Math.min(100, Math.round(donor.total_amount / 10000)),
            avgViewers: donor.donation_count,
            adEfficiency: donor.donation_count > 0 ? (donor.total_amount / donor.donation_count / 1000).toFixed(1) : 0,
            donationRate: donor.donation_count,
            trend: donor.total_amount > 50000 ? 'up' : 'stable',
            totalAmount: donor.total_amount
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
        }
      });
    });
  });

  /**
   * GET /api/admin/streamer/:streamerId
   * Get streamer detail (real data from events table)
   */
  router.get("/admin/streamer/:streamerId", authenticateAdmin, (req, res) => {
    const { streamerId } = req.params;

    const queries = {
      user: "SELECT * FROM users WHERE id = ?",
      eventStats: `
        SELECT
          COUNT(*) as total_events,
          COUNT(CASE WHEN event_type = 'donation' THEN 1 END) as donation_count,
          COUNT(CASE WHEN event_type = 'chat' THEN 1 END) as chat_count,
          COALESCE(SUM(CASE WHEN event_type = 'donation' THEN amount ELSE 0 END), 0) as total_donations,
          COUNT(DISTINCT DATE(event_timestamp)) as active_days
        FROM events
      `,
      performanceTrend: `
        SELECT
          DATE(event_timestamp) as date,
          COUNT(CASE WHEN event_type = 'chat' THEN 1 END) as chats,
          COUNT(CASE WHEN event_type = 'donation' THEN 1 END) as donations,
          COALESCE(SUM(CASE WHEN event_type = 'donation' THEN amount ELSE 0 END), 0) as donation_amount,
          COUNT(DISTINCT actor_nickname) as unique_users
        FROM events
        WHERE event_timestamp >= datetime('now', '-7 days')
        GROUP BY DATE(event_timestamp)
        ORDER BY date
      `,
      recentActivity: `
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
      `,
      platformBreakdown: `
        SELECT
          platform,
          COUNT(*) as events,
          COALESCE(SUM(CASE WHEN event_type = 'donation' THEN amount ELSE 0 END), 0) as donations
        FROM events
        GROUP BY platform
      `
    };

    db.get(queries.user, [streamerId], (err, user) => {
      const results = { user };
      let completed = 0;
      const otherKeys = ['eventStats', 'performanceTrend', 'recentActivity', 'platformBreakdown'];

      otherKeys.forEach(key => {
        db.all(queries[key], [], (err, rows) => {
          results[key] = err ? [] : (Array.isArray(rows) ? rows : [rows]);
          completed++;

          if (completed === otherKeys.length) {
            const eventStats = results.eventStats?.[0] || {};

            const streamer = user ? {
              id: user.id,
              name: user.display_name || `스트리머 ${user.id}`,
              platform: "soop",
              profileImage: user.avatar_url,
              followers: eventStats.total_events || 0,
              totalStreams: eventStats.active_days || 0,
              joinDate: user.created_at,
              influenceScore: Math.min(100, Math.round((eventStats.total_donations || 0) / 10000)),
              adEfficiency: eventStats.donation_count > 0 ? ((eventStats.total_donations || 0) / eventStats.donation_count / 1000).toFixed(1) : 0,
              donationRate: eventStats.donation_count || 0,
              totalRevenue: eventStats.total_donations || 0,
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
            const gamePerformance = (results.platformBreakdown || []).map(p => ({
              game: p.platform,
              gameName: p.platform === 'soop' ? 'SOOP' : p.platform === 'chzzk' ? '치지직' : p.platform,
              avgViewers: p.events || 0,
              donations: p.donations || 0,
              adEfficiency: p.events > 0 ? (p.donations / p.events / 100).toFixed(1) : 0,
              streamHours: 0,
            }));

            // Build performance trend from real data
            const performanceTrend = (results.performanceTrend || []).map(day => ({
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
              const existing = performanceTrend.find(t => t.date === dateStr);
              if (existing) {
                filledTrend.push(existing);
              } else {
                filledTrend.push({ date: dateStr, viewers: 0, donations: 0, adRevenue: 0, chats: 0 });
              }
            }

            // Build recent broadcasts from recent donations
            const recentBroadcasts = (results.recentActivity || []).slice(0, 5).map((event, idx) => {
              const eventDate = new Date(event.timestamp);
              return {
                id: event.id,
                title: event.message || '후원',
                game: event.platform === 'soop' ? 'SOOP' : event.platform === 'chzzk' ? '치지직' : event.platform,
                date: event.timestamp?.split('T')[0] || '-',
                duration: '-',
                peakViewers: 0,
                avgViewers: 0,
                donations: event.amount || 0,
                sender: event.sender || '익명',
              };
            });

            res.json({
              streamer,
              gamePerformance,
              performanceTrend: filledTrend,
              recentBroadcasts,
            });
          }
        });
      });
    });
  });

  return router;
};

module.exports = createAdminRouter;
