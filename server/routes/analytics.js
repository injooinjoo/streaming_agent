/**
 * Analytics API Routes
 *
 * SOOP 시청자/후원 데이터 조회 API
 */

const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const { AnalyticsQuery } = require("../services/analytics");

/**
 * Create Analytics Router
 * @param {Function} authenticateAdmin - Admin authentication middleware
 * @returns {express.Router}
 */
const createAnalyticsRouter = (authenticateAdmin) => {
  const router = express.Router();

  // Analytics DB 연결 (별도 파일)
  const analyticsDbPath = path.join(__dirname, "../../data/analytics.db");
  let analyticsDb = null;
  let queryService = null;

  // Lazy initialization of DB connection
  const getQueryService = () => {
    if (!queryService) {
      analyticsDb = new sqlite3.Database(analyticsDbPath);
      queryService = new AnalyticsQuery(analyticsDb);
    }
    return queryService;
  };

  // Helper: promisify db.get and db.all
  const dbGet = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      const db = getQueryService().db;
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  };

  const dbAll = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      const db = getQueryService().db;
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  };

  /**
   * GET /api/analytics/summary
   * 전체 데이터 요약
   */
  router.get("/analytics/summary", authenticateAdmin, async (req, res) => {
    try {
      const [
        broadcasts,
        liveBroadcasts,
        streamers,
        viewers,
        viewingRecords,
        donations,
        stats5min,
        changes,
      ] = await Promise.all([
        dbGet("SELECT COUNT(*) as count FROM broadcasts"),
        dbGet("SELECT COUNT(*) as count FROM broadcasts WHERE is_live = 1"),
        dbGet("SELECT COUNT(*) as count FROM platform_users WHERE is_streamer = 1"),
        dbGet("SELECT COUNT(DISTINCT viewer_id) as count FROM viewing_records"),
        dbGet("SELECT COUNT(*) as count FROM viewing_records"),
        dbGet("SELECT COUNT(*) as count, SUM(amount_krw) as totalAmount FROM donations"),
        dbGet("SELECT COUNT(*) as count FROM broadcast_stats_5min"),
        dbGet("SELECT COUNT(*) as count FROM broadcast_changes"),
      ]);

      res.json({
        broadcasts: broadcasts?.count || 0,
        liveBroadcasts: liveBroadcasts?.count || 0,
        streamers: streamers?.count || 0,
        uniqueViewers: viewers?.count || 0,
        viewingRecords: viewingRecords?.count || 0,
        donations: {
          count: donations?.count || 0,
          totalAmount: donations?.totalAmount || 0,
        },
        stats5min: stats5min?.count || 0,
        broadcastChanges: changes?.count || 0,
      });
    } catch (err) {
      console.error("[Analytics API] Summary error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/analytics/top-viewers
   * 다시청 유저 TOP
   */
  router.get("/analytics/top-viewers", authenticateAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit, 10) || 50;
      const minBroadcasts = parseInt(req.query.minBroadcasts, 10) || 1;

      const query = getQueryService();
      const topViewers = await query.getTopViewers({ limit, minBroadcasts });

      res.json(topViewers);
    } catch (err) {
      console.error("[Analytics API] Top viewers error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/analytics/streamers
   * 스트리머 목록
   */
  router.get("/analytics/streamers", authenticateAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit, 10) || 100;
      const offset = parseInt(req.query.offset, 10) || 0;

      const streamers = await dbAll(
        `SELECT
          pu.id,
          pu.platform_user_id as userId,
          pu.nickname,
          pu.first_seen_at as firstSeen,
          pu.last_seen_at as lastSeen,
          COUNT(DISTINCT b.id) as broadcastCount,
          MAX(b.peak_viewers) as peakViewers
         FROM platform_users pu
         LEFT JOIN broadcasts b ON b.streamer_username = pu.platform_user_id
         WHERE pu.is_streamer = 1
         GROUP BY pu.id
         ORDER BY broadcastCount DESC
         LIMIT ? OFFSET ?`,
        [limit, offset]
      );

      res.json(streamers);
    } catch (err) {
      console.error("[Analytics API] Streamers error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/analytics/streamer/:username
   * 스트리머 상세 통계
   */
  router.get("/analytics/streamer/:username", authenticateAdmin, async (req, res) => {
    try {
      const { username } = req.params;
      const query = getQueryService();
      const stats = await query.getStreamerStats(username);

      if (!stats) {
        return res.status(404).json({ error: "Streamer not found" });
      }

      res.json(stats);
    } catch (err) {
      console.error("[Analytics API] Streamer stats error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/analytics/viewer/:username
   * 시청자 시청 기록
   */
  router.get("/analytics/viewer/:username", authenticateAdmin, async (req, res) => {
    try {
      const { username } = req.params;
      const limit = parseInt(req.query.limit, 10) || 100;

      const query = getQueryService();
      const history = await query.getViewerHistory(username, { limit });

      res.json(history);
    } catch (err) {
      console.error("[Analytics API] Viewer history error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/analytics/overlap
   * 겹시청자 분석
   */
  router.get("/analytics/overlap", authenticateAdmin, async (req, res) => {
    try {
      const { streamerA, streamerB } = req.query;

      if (!streamerA || !streamerB) {
        return res.status(400).json({ error: "streamerA and streamerB are required" });
      }

      const query = getQueryService();
      const overlap = await query.getOverlapViewers(streamerA, streamerB);

      res.json(overlap);
    } catch (err) {
      console.error("[Analytics API] Overlap error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/analytics/donations/:username
   * 스트리머별 후원 랭킹
   */
  router.get("/analytics/donations/:username", authenticateAdmin, async (req, res) => {
    try {
      const { username } = req.params;
      const limit = parseInt(req.query.limit, 10) || 50;

      const query = getQueryService();
      const ranking = await query.getDonationRanking(username, { limit });

      res.json(ranking);
    } catch (err) {
      console.error("[Analytics API] Donation ranking error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/analytics/broadcast/:broadcastId
   * 방송 상세 (추이, 변경이력, 후원)
   */
  router.get("/analytics/broadcast/:broadcastId", authenticateAdmin, async (req, res) => {
    try {
      const { broadcastId } = req.params;
      const query = getQueryService();
      const trend = await query.getBroadcastTrend(broadcastId);

      if (!trend) {
        return res.status(404).json({ error: "Broadcast not found" });
      }

      res.json(trend);
    } catch (err) {
      console.error("[Analytics API] Broadcast trend error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/analytics/broadcasts/live
   * 현재 라이브 방송 목록
   */
  router.get("/analytics/broadcasts/live", authenticateAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit, 10) || 100;

      const broadcasts = await dbAll(
        `SELECT
          b.id,
          b.broadcast_id as broadcastId,
          b.streamer_username as streamerUsername,
          pu.nickname as streamerNickname,
          b.title,
          b.category,
          b.started_at as startedAt,
          b.peak_viewers as peakViewers,
          (SELECT viewer_count FROM broadcast_stats_5min
           WHERE broadcast_id = b.id ORDER BY snapshot_at DESC LIMIT 1) as currentViewers
         FROM broadcasts b
         LEFT JOIN platform_users pu ON b.streamer_id = pu.id
         WHERE b.is_live = 1
         ORDER BY b.peak_viewers DESC
         LIMIT ?`,
        [limit]
      );

      res.json(broadcasts);
    } catch (err) {
      console.error("[Analytics API] Live broadcasts error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/analytics/broadcasts/recent
   * 최근 방송 목록
   */
  router.get("/analytics/broadcasts/recent", authenticateAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit, 10) || 50;

      const broadcasts = await dbAll(
        `SELECT
          b.id,
          b.broadcast_id as broadcastId,
          b.streamer_username as streamerUsername,
          pu.nickname as streamerNickname,
          b.title,
          b.category,
          b.started_at as startedAt,
          b.ended_at as endedAt,
          b.duration_seconds as durationSeconds,
          b.peak_viewers as peakViewers,
          b.is_live as isLive
         FROM broadcasts b
         LEFT JOIN platform_users pu ON b.streamer_id = pu.id
         ORDER BY b.started_at DESC
         LIMIT ?`,
        [limit]
      );

      res.json(broadcasts);
    } catch (err) {
      console.error("[Analytics API] Recent broadcasts error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/analytics/stats5min/:broadcastId
   * 5분 단위 통계 시계열
   */
  router.get("/analytics/stats5min/:broadcastId", authenticateAdmin, async (req, res) => {
    try {
      const { broadcastId } = req.params;
      const query = getQueryService();
      const timeline = await query.getStats5minTimeline(broadcastId);

      res.json(timeline);
    } catch (err) {
      console.error("[Analytics API] Stats5min error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/analytics/daily/:date
   * 일별 요약
   */
  router.get("/analytics/daily/:date", authenticateAdmin, async (req, res) => {
    try {
      const { date } = req.params;
      const query = getQueryService();
      const summary = await query.getDailySummary(date);

      res.json(summary);
    } catch (err) {
      console.error("[Analytics API] Daily summary error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};

module.exports = createAnalyticsRouter;
