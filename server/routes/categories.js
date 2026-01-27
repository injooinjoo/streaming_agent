/**
 * Categories API 라우트
 *
 * 게임 카탈로그 및 카테고리 관련 API 엔드포인트
 */

const express = require("express");
const { STATS_KEYS, TTL } = require("../services/statsCacheService");

/**
 * 라우터 생성 팩토리
 * @param {Object} db - SQLite3 데이터베이스 인스턴스
 * @param {Object} categoryService - CategoryService 인스턴스
 * @param {Function} authenticateToken - JWT 인증 미들웨어
 * @param {Object} statsCacheService - Stats cache service instance (optional)
 * @returns {express.Router}
 */
function createCategoriesRouter(db, categoryService, authenticateToken, statsCacheService = null) {
  const router = express.Router();

  /**
   * GET /api/categories
   * 통합 게임 카탈로그 목록 조회
   *
   * Query Parameters:
   * - sort: 정렬 기준 (viewers, streamers, name) - 기본: viewers
   * - order: 정렬 순서 (asc, desc) - 기본: desc
   * - limit: 결과 수 제한 - 기본: 100
   * - genre: 장르 필터
   * - search: 검색어
   */
  router.get("/categories", async (req, res) => {
    try {
      const { sort, order, limit, genre, search } = req.query;

      const games = await categoryService.getGameCatalog({
        sort: sort || "viewers",
        order: order || "desc",
        limit: limit ? parseInt(limit, 10) : 100,
        genre: genre || null,
        search: search || null,
      });

      res.json({
        success: true,
        data: games,
        count: games.length,
      });
    } catch (error) {
      console.error("[categories] GET /categories error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/categories/stats
   * 카탈로그 통계 조회
   */
  router.get("/categories/stats", async (req, res) => {
    try {
      if (statsCacheService) {
        const stats = await statsCacheService.getOrCompute(STATS_KEYS.CATALOG_STATS, () => categoryService.getCatalogStats(), TTL.SLOW);
        return res.json({ success: true, data: stats });
      }
      const stats = await categoryService.getCatalogStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("[categories] GET /categories/stats error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/categories/trends
   * 상위 카테고리 일별 시청자 추이 조회
   *
   * Query Parameters:
   * - limit: 상위 몇 개 카테고리 (기본: 20)
   * - days: 며칠간의 데이터 (기본: 7)
   */
  router.get("/categories/trends", async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit, 10) || 20, 30);
      const days = Math.min(parseInt(req.query.days, 10) || 7, 30);

      if (statsCacheService) {
        const key = statsCacheService.buildKey(STATS_KEYS.CATALOG_TRENDS, { limit, days });
        const trends = await statsCacheService.getOrCompute(key, () => categoryService.getTopCategoriesDailyTrend(limit, days), TTL.SLOW);
        return res.json({ success: true, data: trends });
      }
      const trends = await categoryService.getTopCategoriesDailyTrend(limit, days);

      res.json({
        success: true,
        data: trends,
      });
    } catch (error) {
      console.error("[categories] GET /categories/trends error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/categories/platform/:platform
   * 플랫폼별 카테고리 목록 조회
   */
  router.get("/categories/platform/:platform", async (req, res) => {
    try {
      const { platform } = req.params;

      if (!["soop", "chzzk", "twitch", "youtube"].includes(platform)) {
        return res.status(400).json({
          success: false,
          error: "Invalid platform. Supported: soop, chzzk, twitch, youtube",
        });
      }

      const categories = await categoryService.getPlatformCategories(platform);

      res.json({
        success: true,
        data: categories,
        count: categories.length,
      });
    } catch (error) {
      console.error(`[categories] GET /categories/platform error:`, error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/categories/:id
   * 단일 게임 상세 조회
   */
  router.get("/categories/:id", async (req, res) => {
    try {
      const gameId = parseInt(req.params.id, 10);

      if (isNaN(gameId)) {
        return res.status(400).json({ success: false, error: "Invalid game ID" });
      }

      const game = await categoryService.getGameDetail(gameId);

      if (!game) {
        return res.status(404).json({ success: false, error: "Game not found" });
      }

      res.json({
        success: true,
        data: game,
      });
    } catch (error) {
      console.error("[categories] GET /categories/:id error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/categories/:id/stats
   * 게임 통계 조회 (시계열)
   *
   * Query Parameters:
   * - period: 기간 (1h, 24h, 7d, 30d) - 기본: 24h
   */
  router.get("/categories/:id/stats", async (req, res) => {
    try {
      const gameId = parseInt(req.params.id, 10);
      const { period } = req.query;

      if (isNaN(gameId)) {
        return res.status(400).json({ success: false, error: "Invalid game ID" });
      }

      const validPeriods = ["1h", "24h", "7d", "30d"];
      const selectedPeriod = validPeriods.includes(period) ? period : "24h";

      const stats = await categoryService.getGameStats(gameId, selectedPeriod);

      res.json({
        success: true,
        data: stats,
        period: selectedPeriod,
      });
    } catch (error) {
      console.error("[categories] GET /categories/:id/stats error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * POST /api/categories/refresh
   * 강제 새로고침 (관리자 전용)
   */
  router.post("/categories/refresh", authenticateToken, async (req, res) => {
    try {
      // TODO: 관리자 권한 확인 로직 추가

      console.log("[categories] Force refresh requested");
      const result = await categoryService.forceRefresh();

      res.json({
        success: true,
        message: "Categories refreshed successfully",
        data: result,
      });
    } catch (error) {
      console.error("[categories] POST /categories/refresh error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * POST /api/categories/map
   * 수동 매핑 설정 (관리자 전용)
   *
   * Body:
   * - platform: 플랫폼 (soop, chzzk)
   * - platformCategoryId: 플랫폼 카테고리 ID
   * - unifiedGameId: 통합 게임 ID
   */
  router.post("/categories/map", authenticateToken, async (req, res) => {
    try {
      const { platform, platformCategoryId, unifiedGameId } = req.body;

      if (!platform || !platformCategoryId || !unifiedGameId) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: platform, platformCategoryId, unifiedGameId",
        });
      }

      await categoryService.setManualMapping(platform, platformCategoryId, unifiedGameId);

      res.json({
        success: true,
        message: "Mapping updated successfully",
      });
    } catch (error) {
      console.error("[categories] POST /categories/map error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/categories/issues
   * 매핑 문제 목록 조회 (관리자 전용)
   */
  router.get("/categories/issues", authenticateToken, async (req, res) => {
    try {
      const issues = await categoryService.getMappingIssues();

      res.json({
        success: true,
        data: issues,
      });
    } catch (error) {
      console.error("[categories] GET /categories/issues error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
}

module.exports = createCategoriesRouter;
