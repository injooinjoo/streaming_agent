/**
 * Analytics Routes
 * Snowflake-powered analytics endpoints for dashboard
 */

const express = require("express");

/**
 * Create analytics router
 * @param {Object} snowflakeService - Snowflake sync service
 * @param {Function} authMiddleware - Authentication middleware
 * @returns {express.Router}
 */
const createAnalyticsRouter = (snowflakeService, authMiddleware) => {
  const router = express.Router();

  // Check Snowflake connection status
  const requireSnowflake = (req, res, next) => {
    if (!snowflakeService?.isConnected) {
      return res.status(503).json({
        error: "Snowflake not connected",
        message: "Analytics service is not available",
      });
    }
    next();
  };

  /**
   * GET /api/analytics/status
   * Check Snowflake connection status
   */
  router.get("/analytics/status", authMiddleware, (req, res) => {
    res.json({
      connected: snowflakeService?.isConnected || false,
      queueSize: snowflakeService?.eventQueue?.length || 0,
    });
  });

  /**
   * GET /api/analytics/donations
   * Get donation summary for date range
   */
  router.get(
    "/analytics/donations",
    authMiddleware,
    requireSnowflake,
    async (req, res) => {
      try {
        const { startDate, endDate } = req.query;
        const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const end = endDate || new Date().toISOString();

        const data = await snowflakeService.getDonationSummary(start, end);
        res.json({ success: true, data });
      } catch (error) {
        console.error("[analytics] Donation summary error:", error.message);
        res.status(500).json({ error: error.message });
      }
    }
  );

  /**
   * GET /api/analytics/top-donors
   * Get top donors for date range
   */
  router.get(
    "/analytics/top-donors",
    authMiddleware,
    requireSnowflake,
    async (req, res) => {
      try {
        const { startDate, endDate, limit } = req.query;
        const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const end = endDate || new Date().toISOString();

        const data = await snowflakeService.getTopDonors(start, end, parseInt(limit) || 20);
        res.json({ success: true, data });
      } catch (error) {
        console.error("[analytics] Top donors error:", error.message);
        res.status(500).json({ error: error.message });
      }
    }
  );

  /**
   * GET /api/analytics/viewers
   * Get viewer history for a channel
   */
  router.get(
    "/analytics/viewers",
    authMiddleware,
    requireSnowflake,
    async (req, res) => {
      try {
        const { platform, channelId, hours } = req.query;

        if (!platform || !channelId) {
          return res.status(400).json({ error: "platform and channelId are required" });
        }

        const data = await snowflakeService.getViewerHistory(
          platform,
          channelId,
          parseInt(hours) || 24
        );
        res.json({ success: true, data });
      } catch (error) {
        console.error("[analytics] Viewer history error:", error.message);
        res.status(500).json({ error: error.message });
      }
    }
  );

  /**
   * GET /api/analytics/chat-activity
   * Get chat activity (messages per minute)
   */
  router.get(
    "/analytics/chat-activity",
    authMiddleware,
    requireSnowflake,
    async (req, res) => {
      try {
        const { platform, channelId, minutes } = req.query;

        if (!platform || !channelId) {
          return res.status(400).json({ error: "platform and channelId are required" });
        }

        const data = await snowflakeService.getChatActivity(
          platform,
          channelId,
          parseInt(minutes) || 60
        );
        res.json({ success: true, data });
      } catch (error) {
        console.error("[analytics] Chat activity error:", error.message);
        res.status(500).json({ error: error.message });
      }
    }
  );

  /**
   * GET /api/analytics/engagement
   * Get engagement rate (chatters / viewers)
   */
  router.get(
    "/analytics/engagement",
    authMiddleware,
    requireSnowflake,
    async (req, res) => {
      try {
        const { platform, channelId, hours } = req.query;

        if (!platform || !channelId) {
          return res.status(400).json({ error: "platform and channelId are required" });
        }

        const data = await snowflakeService.getEngagementRate(
          platform,
          channelId,
          parseInt(hours) || 24
        );
        res.json({ success: true, data });
      } catch (error) {
        console.error("[analytics] Engagement error:", error.message);
        res.status(500).json({ error: error.message });
      }
    }
  );

  /**
   * GET /api/analytics/events
   * Query events with filters
   */
  router.get(
    "/analytics/events",
    authMiddleware,
    requireSnowflake,
    async (req, res) => {
      try {
        const { platform, eventType, startDate, endDate, limit } = req.query;

        const data = await snowflakeService.queryEvents({
          platform,
          eventType,
          startDate,
          endDate,
          limit: parseInt(limit) || 100,
        });
        res.json({ success: true, data });
      } catch (error) {
        console.error("[analytics] Events query error:", error.message);
        res.status(500).json({ error: error.message });
      }
    }
  );

  /**
   * POST /api/analytics/migrate
   * Migrate local events to Snowflake (admin only)
   */
  router.post(
    "/analytics/migrate",
    authMiddleware,
    requireSnowflake,
    async (req, res) => {
      try {
        // This should be admin-only
        if (req.user?.role !== "admin") {
          return res.status(403).json({ error: "Admin access required" });
        }

        const { events } = req.body;
        if (!events || !Array.isArray(events)) {
          return res.status(400).json({ error: "events array is required" });
        }

        const migrated = await snowflakeService.migrateLocalEvents(events);
        res.json({ success: true, migrated });
      } catch (error) {
        console.error("[analytics] Migration error:", error.message);
        res.status(500).json({ error: error.message });
      }
    }
  );

  /**
   * POST /api/analytics/flush
   * Force flush queued events to Snowflake
   */
  router.post(
    "/analytics/flush",
    authMiddleware,
    requireSnowflake,
    async (req, res) => {
      try {
        await snowflakeService.flushEvents();
        res.json({
          success: true,
          message: "Events flushed to Snowflake",
        });
      } catch (error) {
        console.error("[analytics] Flush error:", error.message);
        res.status(500).json({ error: error.message });
      }
    }
  );

  return router;
};

module.exports = createAnalyticsRouter;
