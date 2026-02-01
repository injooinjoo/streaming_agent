/**
 * Streamer Detail API 라우트
 *
 * 스트리머 상세 페이지용 공개 API 엔드포인트
 */

const express = require("express");

/**
 * @param {Object} streamerDetailService
 * @returns {express.Router}
 */
function createStreamerRouter(streamerDetailService) {
  const router = express.Router();

  /**
   * GET /api/streamer/:personId
   * 스트리머 프로필 + 요약 통계
   */
  router.get("/streamer/:personId", async (req, res) => {
    try {
      const personId = parseInt(req.params.personId, 10);
      if (isNaN(personId)) {
        return res.status(400).json({ success: false, error: "Invalid person ID" });
      }

      const data = await streamerDetailService.getStreamerProfile(personId);
      if (!data) {
        return res.status(404).json({ success: false, error: "Streamer not found" });
      }

      res.json({ success: true, data });
    } catch (error) {
      console.error("[streamer] GET /streamer/:personId error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/streamer/:personId/broadcasts
   * 방송 기록 (페이지네이션)
   */
  router.get("/streamer/:personId/broadcasts", async (req, res) => {
    try {
      const personId = parseInt(req.params.personId, 10);
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);

      if (isNaN(personId)) {
        return res.status(400).json({ success: false, error: "Invalid person ID" });
      }

      const data = await streamerDetailService.getStreamerBroadcasts(personId, page, limit);
      res.json({ success: true, data });
    } catch (error) {
      console.error("[streamer] GET /streamer/:personId/broadcasts error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/streamer/:personId/stats
   * 일별 통계 (통계 탭)
   */
  router.get("/streamer/:personId/stats", async (req, res) => {
    try {
      const personId = parseInt(req.params.personId, 10);
      const period = ['7d', '30d'].includes(req.query.period) ? req.query.period : '7d';

      if (isNaN(personId)) {
        return res.status(400).json({ success: false, error: "Invalid person ID" });
      }

      const data = await streamerDetailService.getStreamerDailyStats(personId, period);
      res.json({ success: true, data, period });
    } catch (error) {
      console.error("[streamer] GET /streamer/:personId/stats error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/streamer/:personId/categories
   * 카테고리별 통계
   */
  router.get("/streamer/:personId/categories", async (req, res) => {
    try {
      const personId = parseInt(req.params.personId, 10);
      const period = ['7d', '30d'].includes(req.query.period) ? req.query.period : '7d';

      if (isNaN(personId)) {
        return res.status(400).json({ success: false, error: "Invalid person ID" });
      }

      const data = await streamerDetailService.getStreamerCategories(personId, period);
      res.json({ success: true, data, period });
    } catch (error) {
      console.error("[streamer] GET /streamer/:personId/categories error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/streamer/:personId/ranking
   * 상대 랭킹
   */
  router.get("/streamer/:personId/ranking", async (req, res) => {
    try {
      const personId = parseInt(req.params.personId, 10);
      const period = ['7d', '30d'].includes(req.query.period) ? req.query.period : '7d';

      if (isNaN(personId)) {
        return res.status(400).json({ success: false, error: "Invalid person ID" });
      }

      const data = await streamerDetailService.getStreamerRanking(personId, period);
      res.json({ success: true, data, period });
    } catch (error) {
      console.error("[streamer] GET /streamer/:personId/ranking error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/streamer/:personId/broadcasts/:broadcastId/segments
   * 방송 구간 분석
   */
  router.get("/streamer/:personId/broadcasts/:broadcastId/segments", async (req, res) => {
    try {
      const broadcastId = parseInt(req.params.broadcastId, 10);

      if (isNaN(broadcastId)) {
        return res.status(400).json({ success: false, error: "Invalid broadcast ID" });
      }

      const data = await streamerDetailService.getStreamerSegments(broadcastId);
      res.json({ success: true, data });
    } catch (error) {
      console.error("[streamer] GET segments error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
}

module.exports = createStreamerRouter;
