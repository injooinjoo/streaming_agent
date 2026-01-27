/**
 * Marketplace Routes
 * Public marketplace for approved designs
 */

const express = require("express");
const { STATS_KEYS, TTL } = require("../services/statsCacheService");

/**
 * Create marketplace router
 * @param {Object} designService - Design service instance
 * @param {Function} authenticateToken - Auth middleware (optional for some routes)
 * @param {Object} statsCacheService - Stats cache service instance (optional)
 * @returns {express.Router}
 */
const createMarketplaceRouter = (designService, authenticateToken, statsCacheService = null) => {
  const router = express.Router();

  // ===== Public Marketplace =====

  /**
   * GET /api/marketplace/designs
   * Browse approved designs (public)
   */
  router.get("/marketplace/designs", async (req, res) => {
    try {
      const { category, search, sortBy, limit, offset } = req.query;

      const result = await designService.getApproved({
        category,
        search,
        sortBy: sortBy || 'newest',
        limit: parseInt(limit) || 20,
        offset: parseInt(offset) || 0
      });

      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/marketplace/designs/:id
   * Get public design details
   */
  router.get("/marketplace/designs/:id", async (req, res) => {
    try {
      const design = await designService.getById(parseInt(req.params.id));

      if (!design) {
        return res.status(404).json({ error: "디자인을 찾을 수 없습니다." });
      }

      // Only show approved designs publicly
      if (design.status !== 'approved') {
        return res.status(404).json({ error: "디자인을 찾을 수 없습니다." });
      }

      res.json({ design });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/marketplace/designs/:id/install
   * Install design to user's settings (requires auth)
   */
  router.post("/marketplace/designs/:id/install", authenticateToken, async (req, res) => {
    try {
      const success = await designService.install(
        parseInt(req.params.id),
        req.user.id,
        req.user.overlayHash
      );

      if (success) {
        res.json({ success: true, message: "디자인이 설치되었습니다." });
      } else {
        res.status(400).json({ error: "설치에 실패했습니다." });
      }
    } catch (err) {
      if (err.message.includes('승인된')) {
        return res.status(400).json({ error: err.message });
      }
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/marketplace/categories
   * Get available overlay categories
   */
  router.get("/marketplace/categories", async (req, res) => {
    try {
      const categories = [
        { id: 'chat', name: '채팅', icon: 'message-square' },
        { id: 'alert', name: '알림', icon: 'bell' },
        { id: 'goal', name: '목표', icon: 'target' },
        { id: 'ticker', name: '전광판', icon: 'radio' },
        { id: 'subtitle', name: '자막', icon: 'subtitles' },
        { id: 'roulette', name: '룰렛', icon: 'disc' },
        { id: 'emoji', name: '이모지', icon: 'smile' },
        { id: 'voting', name: '투표', icon: 'bar-chart' },
        { id: 'credits', name: '크레딧', icon: 'film' },
        { id: 'ad', name: '광고', icon: 'monitor' },
        { id: 'package', name: '패키지', icon: 'package' }
      ];

      res.json({ categories });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/marketplace/stats
   * Get marketplace statistics (public)
   */
  router.get("/marketplace/stats", async (req, res) => {
    try {
      const computeStats = async () => {
        const stats = await designService.getStats();
        return {
          totalDesigns: stats.approved,
          totalDownloads: 0 // TODO: sum from all designs
        };
      };

      if (statsCacheService) {
        const result = await statsCacheService.getOrCompute(STATS_KEYS.MARKETPLACE_STATS, computeStats, TTL.SLOW);
        return res.json(result);
      }
      res.json(await computeStats());
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};

module.exports = { createMarketplaceRouter };
