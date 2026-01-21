/**
 * Statistics Routes
 * Event counts, donations, revenue analytics, and streamers data
 */

const express = require("express");

/**
 * Create stats router
 * @param {Object} eventService - Event service instance
 * @param {Object} statsService - Stats service instance
 * @param {Map} activeAdapters - Active platform adapters map
 * @param {Function} authenticateToken - Auth middleware for protected routes
 * @returns {express.Router}
 */
const createStatsRouter = (eventService, statsService, activeAdapters, authenticateToken) => {
  const router = express.Router();

  // ===== Optional Auth Middleware =====
  // Returns user if authenticated, null otherwise (for public dashboard with limited data)
  const optionalAuth = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      req.user = null;
      return next();
    }

    // If token provided, validate it
    authenticateToken(req, res, next);
  };

  // ===== Event Statistics (Protected) =====

  /**
   * GET /api/stats/events/count
   * Get total event count (requires authentication)
   */
  router.get("/stats/events/count", authenticateToken, async (req, res) => {
    try {
      const total = await eventService.getCount();
      res.json({ total });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/stats/events/by-platform
   * Get event counts grouped by platform (requires authentication)
   */
  router.get("/stats/events/by-platform", authenticateToken, async (req, res) => {
    try {
      const rows = await eventService.getCountByPlatform();
      res.json(rows || []);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===== Donation Statistics (Protected) =====

  /**
   * GET /api/stats/donations
   * Get donation statistics grouped by platform (requires authentication)
   */
  router.get("/stats/donations", authenticateToken, async (req, res) => {
    try {
      const rows = await eventService.getDonationStats();
      res.json(rows || []);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/stats/donations/trend
   * Get donation trend for last 7 days (requires authentication)
   */
  router.get("/stats/donations/trend", authenticateToken, async (req, res) => {
    try {
      const rows = await eventService.getDonationTrend();
      res.json(rows || []);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/stats/donations/top-donors
   * Get top donors ranking (requires authentication)
   */
  router.get("/stats/donations/top-donors", authenticateToken, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit, 10) || 10;
      const rows = await eventService.getTopDonors(limit);
      res.json(rows || []);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===== Revenue Statistics (Protected) =====

  /**
   * GET /api/stats/revenue
   * Get revenue summary (requires authentication)
   */
  router.get("/stats/revenue", authenticateToken, async (req, res) => {
    try {
      const days = parseInt(req.query.days, 10) || 30;
      const summary = await statsService.getRevenueSummary(days);
      res.json(summary);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/stats/revenue/trend
   * Get daily revenue trend (requires authentication)
   */
  router.get("/stats/revenue/trend", authenticateToken, async (req, res) => {
    try {
      const days = parseInt(req.query.days, 10) || 30;
      const trend = await statsService.getRevenueTrend(days);
      res.json(trend);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/stats/revenue/by-platform
   * Get revenue by platform (requires authentication)
   */
  router.get("/stats/revenue/by-platform", authenticateToken, async (req, res) => {
    try {
      const result = await statsService.getRevenueByPlatform();
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/stats/revenue/monthly
   * Get monthly revenue comparison (requires authentication)
   */
  router.get("/stats/revenue/monthly", authenticateToken, async (req, res) => {
    try {
      const months = parseInt(req.query.months, 10) || 6;
      const result = await statsService.getMonthlyRevenue(months);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/stats/revenue/top-streamers
   * Get top streamers by revenue (requires authentication)
   */
  router.get("/stats/revenue/top-streamers", authenticateToken, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit, 10) || 10;
      const result = await statsService.getTopStreamersByRevenue(limit);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===== Streamers (Protected) =====

  /**
   * GET /api/streamers
   * Get streamers list (based on donation data) (requires authentication)
   */
  router.get("/streamers", authenticateToken, async (req, res) => {
    try {
      const result = await statsService.getStreamers({
        search: req.query.search || "",
        sortBy: req.query.sortBy || "total_donations",
        sortOrder: req.query.sortOrder || "desc",
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 10,
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===== Platform Statistics (Protected) =====

  /**
   * GET /api/stats/platforms
   * Get platform comparison stats (requires authentication)
   */
  router.get("/stats/platforms", authenticateToken, async (req, res) => {
    try {
      const result = await statsService.getPlatformStats();
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===== Chat/Activity Statistics (Protected) =====

  /**
   * GET /api/stats/chat/summary
   * Get chat activity summary (requires authentication)
   */
  router.get("/stats/chat/summary", authenticateToken, async (req, res) => {
    try {
      const days = parseInt(req.query.days, 10) || 7;
      const result = await statsService.getChatActivitySummary(days);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/stats/chat/hourly
   * Get chat trend by hour (requires authentication)
   */
  router.get("/stats/chat/hourly", authenticateToken, async (req, res) => {
    try {
      const days = parseInt(req.query.days, 10) || 7;
      const result = await statsService.getChatTrendByHour(days);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/stats/chat/daily
   * Get chat trend by day of week (requires authentication)
   */
  router.get("/stats/chat/daily", authenticateToken, async (req, res) => {
    try {
      const weeks = parseInt(req.query.weeks, 10) || 4;
      const result = await statsService.getChatTrendByDayOfWeek(weeks);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/stats/activity/timeline
   * Get activity timeline (requires authentication)
   */
  router.get("/stats/activity/timeline", authenticateToken, async (req, res) => {
    try {
      const days = parseInt(req.query.days, 10) || 7;
      const result = await statsService.getActivityTimeline(days);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/stats/activity/recent
   * Get recent activity feed (requires authentication)
   */
  router.get("/stats/activity/recent", authenticateToken, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit, 10) || 20;
      const result = await statsService.getRecentActivity(limit);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/stats/yesterday
   * Get yesterday broadcast summary (requires authentication)
   */
  router.get("/stats/yesterday", authenticateToken, async (req, res) => {
    try {
      const result = await statsService.getYesterdaySummary();
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/stats/hourly-by-platform
   * Get hourly activity by platform (requires authentication)
   */
  router.get("/stats/hourly-by-platform", authenticateToken, async (req, res) => {
    try {
      const hours = parseInt(req.query.hours, 10) || 24;
      const result = await statsService.getHourlyActivityByPlatform(hours);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===== Viewer Statistics (Protected) =====

  /**
   * GET /api/stats/viewers/history
   * Get viewer count history (requires authentication)
   */
  router.get("/stats/viewers/history", authenticateToken, async (req, res) => {
    try {
      const hours = parseInt(req.query.hours, 10) || 24;
      const platform = req.query.platform || null;
      const result = await statsService.getViewerHistory(hours, platform);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/stats/viewers/peak
   * Get peak viewer count for today (requires authentication)
   */
  router.get("/stats/viewers/peak", authenticateToken, async (req, res) => {
    try {
      const result = await statsService.getPeakViewers();
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/stats/dashboard
   * Get dashboard summary (for Dashboard.jsx)
   * Uses optional auth - returns full data for authenticated users,
   * or empty/demo data for unauthenticated users
   */
  router.get("/stats/dashboard", optionalAuth, async (req, res) => {
    try {
      // channelId를 쿼리 파라미터에서 가져옴 (로그인 사용자의 채널)
      const channelId = req.query.channelId || null;
      const platform = req.query.platform || null;

      // If not authenticated and no channelId, return empty dashboard prompting login
      if (!req.user && !channelId) {
        return res.json({
          todayDonation: 0,
          peakViewers: 0,
          newSubs: 0,
          insights: [
            {
              type: "info",
              message: "로그인하여 실시간 데이터를 확인하세요",
              value: null
            }
          ],
          topCategories: [],
          requiresAuth: true
        });
      }

      // channelId가 있으면 해당 채널의 데이터만 조회
      const result = await statsService.getDashboardSummary(channelId, platform);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===== Connection Status =====

  /**
   * GET /api/connections/status
   * Get platform connection status
   */
  router.get("/connections/status", (req, res) => {
    const connections = {
      soop: [],
      chzzk: [],
    };

    for (const [key, adapter] of activeAdapters.entries()) {
      if (adapter.platform === "soop") {
        connections.soop.push({
          key,
          connected: adapter.isConnected,
          channelId: adapter.bjId,
          broadNo: adapter.broadNo,
        });
      } else if (adapter.platform === "chzzk") {
        connections.chzzk.push({
          key,
          connected: adapter.isConnected,
          channelId: adapter.channelId,
          chatChannelId: adapter.chatChannelId,
        });
      }
    }

    res.json({
      soop: {
        connected: connections.soop.some((c) => c.connected),
        channels: connections.soop,
      },
      chzzk: {
        connected: connections.chzzk.some((c) => c.connected),
        channels: connections.chzzk,
      },
    });
  });

  return router;
};

module.exports = { createStatsRouter };
