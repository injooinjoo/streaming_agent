/**
 * Monitor Routes
 * API endpoints for streaming data monitoring dashboard
 */

const express = require("express");
const { api: apiLogger } = require("../services/logger");

/**
 * Create monitor router
 * @param {sqlite3.Database} streamingDb - Streaming database instance
 * @returns {express.Router}
 */
const createMonitorRouter = (streamingDb) => {
  const router = express.Router();

  /**
   * Helper: Promisify db.get
   */
  const dbGet = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      streamingDb.get(sql, params, (err, row) => {
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
      streamingDb.all(sql, params, (err, rows) => {
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
      ] = await Promise.all([
        // Live broadcasts count
        dbGet(`SELECT COUNT(*) as count FROM broadcasts WHERE is_live = 1`),
        // Total viewers from live broadcasts
        dbGet(`SELECT COALESCE(SUM(current_viewer_count), 0) as total FROM broadcasts WHERE is_live = 1`),
        // Total persons
        dbGet(`SELECT COUNT(*) as count FROM persons`),
        // Total donation amount
        dbGet(`SELECT COALESCE(SUM(total_donation_amount), 0) as total FROM broadcasts`),
        // Total viewer snapshots
        dbGet(`SELECT COUNT(*) as count FROM viewer_snapshots`),
        // Total engagement records
        dbGet(`SELECT COUNT(*) as count FROM viewer_engagement`),
      ]);

      res.json({
        liveBroadcasts: liveBroadcasts?.count || 0,
        totalViewers: totalViewers?.total || 0,
        totalPersons: totalPersons?.count || 0,
        totalDonations: totalDonations?.total || 0,
        snapshotCount: snapshotCount?.count || 0,
        engagementCount: engagementCount?.count || 0,
      });
    } catch (error) {
      apiLogger.error("Monitor stats error", { error: error.message });
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  /**
   * GET /api/monitor/broadcasts
   * Returns paginated broadcast list
   * Query params: page (default 1), limit (default 50), live_only (default false)
   */
  router.get("/monitor/broadcasts", async (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
      const offset = (page - 1) * limit;
      const liveOnly = req.query.live_only === "true";

      const whereClause = liveOnly ? "WHERE is_live = 1" : "";

      // Get total count
      const countResult = await dbGet(
        `SELECT COUNT(*) as total FROM broadcasts ${whereClause}`
      );
      const total = countResult?.total || 0;

      // Get broadcasts
      const broadcasts = await dbAll(
        `SELECT
          id,
          platform,
          channel_id,
          broadcast_id,
          broadcaster_nickname,
          title,
          category_name,
          current_viewer_count,
          peak_viewer_count,
          total_chat_count,
          total_donation_amount,
          is_live,
          started_at,
          ended_at,
          duration_minutes,
          updated_at
        FROM broadcasts
        ${whereClause}
        ORDER BY is_live DESC, current_viewer_count DESC, updated_at DESC
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
   * Returns paginated persons list
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
        whereClause = "WHERE channel_id IS NOT NULL";
      } else if (type === "viewer") {
        whereClause = "WHERE channel_id IS NULL";
      }

      // Get total count
      const countResult = await dbGet(
        `SELECT COUNT(*) as total FROM persons ${whereClause}`
      );
      const total = countResult?.total || 0;

      // Get persons
      const persons = await dbAll(
        `SELECT
          id,
          platform,
          platform_user_id,
          nickname,
          channel_id,
          follower_count,
          subscriber_count,
          total_broadcast_minutes,
          total_chat_count,
          total_donation_count,
          total_donation_amount,
          first_seen_at,
          last_seen_at,
          CASE WHEN channel_id IS NOT NULL THEN 'broadcaster' ELSE 'viewer' END as person_type
        FROM persons
        ${whereClause}
        ORDER BY last_seen_at DESC, total_donation_amount DESC
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

      // Get engagement records with joined person data
      const engagement = await dbAll(
        `SELECT
          ve.id,
          ve.platform,
          ve.category_name,
          ve.watch_minutes,
          ve.chat_count,
          ve.donation_count,
          ve.donation_amount,
          ve.first_seen_at,
          ve.last_seen_at,
          vp.nickname as viewer_nickname,
          vp.platform_user_id as viewer_user_id,
          bp.nickname as broadcaster_nickname,
          bp.channel_id as broadcaster_channel_id
        FROM viewer_engagement ve
        LEFT JOIN persons vp ON ve.viewer_person_id = vp.id
        LEFT JOIN persons bp ON ve.broadcaster_person_id = bp.id
        ORDER BY ve.last_seen_at DESC, ve.donation_amount DESC
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

  return router;
};

module.exports = { createMonitorRouter };
