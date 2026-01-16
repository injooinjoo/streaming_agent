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
 * @returns {express.Router}
 */
const createStatsRouter = (eventService, statsService, activeAdapters) => {
  const router = express.Router();

  // ===== Event Statistics =====

  /**
   * GET /api/stats/events/count
   * Get total event count
   */
  router.get("/stats/events/count", async (req, res) => {
    try {
      const total = await eventService.getCount();
      res.json({ total });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/stats/events/by-platform
   * Get event counts grouped by platform
   */
  router.get("/stats/events/by-platform", async (req, res) => {
    try {
      const rows = await eventService.getCountByPlatform();
      res.json(rows || []);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===== Donation Statistics =====

  /**
   * GET /api/stats/donations
   * Get donation statistics grouped by platform
   */
  router.get("/stats/donations", async (req, res) => {
    try {
      const rows = await eventService.getDonationStats();
      res.json(rows || []);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/stats/donations/trend
   * Get donation trend for last 7 days
   */
  router.get("/stats/donations/trend", async (req, res) => {
    try {
      const rows = await eventService.getDonationTrend();
      res.json(rows || []);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/stats/donations/top-donors
   * Get top donors ranking
   */
  router.get("/stats/donations/top-donors", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit, 10) || 10;
      const rows = await eventService.getTopDonors(limit);
      res.json(rows || []);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===== Revenue Statistics =====

  /**
   * GET /api/stats/revenue
   * Get revenue summary
   */
  router.get("/stats/revenue", async (req, res) => {
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
   * Get daily revenue trend
   */
  router.get("/stats/revenue/trend", async (req, res) => {
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
   * Get revenue by platform
   */
  router.get("/stats/revenue/by-platform", async (req, res) => {
    try {
      const result = await statsService.getRevenueByPlatform();
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/stats/revenue/monthly
   * Get monthly revenue comparison
   */
  router.get("/stats/revenue/monthly", async (req, res) => {
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
   * Get top streamers by revenue
   */
  router.get("/stats/revenue/top-streamers", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit, 10) || 10;
      const result = await statsService.getTopStreamersByRevenue(limit);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===== Streamers =====

  /**
   * GET /api/streamers
   * Get streamers list (based on donation data)
   */
  router.get("/streamers", async (req, res) => {
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

  // ===== Platform Statistics =====

  /**
   * GET /api/stats/platforms
   * Get platform comparison stats
   */
  router.get("/stats/platforms", async (req, res) => {
    try {
      const result = await statsService.getPlatformStats();
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
