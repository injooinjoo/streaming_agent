/**
 * Designs Routes
 * Design customizer CRUD operations
 */

const express = require("express");

/**
 * Create designs router
 * @param {Object} designService - Design service instance
 * @param {Function} authenticateToken - Auth middleware
 * @returns {express.Router}
 */
const createDesignsRouter = (designService, authenticateToken) => {
  const router = express.Router();

  // ===== CRUD Operations =====

  /**
   * GET /api/designs
   * Get user's designs (requires auth)
   */
  router.get("/designs", authenticateToken, async (req, res) => {
    try {
      const { status, category, limit, offset } = req.query;
      const designs = await designService.getByUser(req.user.id, {
        status,
        category,
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0
      });
      res.json({ designs });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/designs/:id
   * Get design by ID
   */
  router.get("/designs/:id", authenticateToken, async (req, res) => {
    try {
      const design = await designService.getById(parseInt(req.params.id));
      if (!design) {
        return res.status(404).json({ error: "디자인을 찾을 수 없습니다." });
      }

      // Check ownership (owner or admin can view)
      if (design.user_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: "접근 권한이 없습니다." });
      }

      res.json({ design });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/designs
   * Create new design (requires auth)
   */
  router.post("/designs", authenticateToken, async (req, res) => {
    try {
      const { name, description, category, tags, design_data, custom_css } = req.body;

      if (!name || !category || !design_data) {
        return res.status(400).json({ error: "이름, 카테고리, 디자인 데이터는 필수입니다." });
      }

      const design = await designService.create(req.user.id, {
        name,
        description,
        category,
        tags,
        design_data,
        custom_css
      });

      res.status(201).json({ design });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * PUT /api/designs/:id
   * Update design (requires auth + ownership)
   */
  router.put("/designs/:id", authenticateToken, async (req, res) => {
    try {
      const design = await designService.update(
        parseInt(req.params.id),
        req.user.id,
        req.body
      );

      if (!design) {
        return res.status(404).json({ error: "디자인을 찾을 수 없습니다." });
      }

      res.json({ design });
    } catch (err) {
      if (err.message.includes('심사 중')) {
        return res.status(400).json({ error: err.message });
      }
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * DELETE /api/designs/:id
   * Delete design (requires auth + ownership)
   */
  router.delete("/designs/:id", authenticateToken, async (req, res) => {
    try {
      const deleted = await designService.delete(
        parseInt(req.params.id),
        req.user.id
      );

      if (!deleted) {
        return res.status(404).json({ error: "디자인을 찾을 수 없습니다." });
      }

      res.json({ success: true });
    } catch (err) {
      if (err.message.includes('심사 중')) {
        return res.status(400).json({ error: err.message });
      }
      res.status(500).json({ error: err.message });
    }
  });

  // ===== Review Workflow =====

  /**
   * POST /api/designs/:id/submit
   * Submit design for marketplace review
   */
  router.post("/designs/:id/submit", authenticateToken, async (req, res) => {
    try {
      const design = await designService.submit(
        parseInt(req.params.id),
        req.user.id
      );

      if (!design) {
        return res.status(404).json({ error: "디자인을 찾을 수 없습니다." });
      }

      res.json({ design, message: "디자인이 심사에 제출되었습니다." });
    } catch (err) {
      if (err.message.includes('제출할 수')) {
        return res.status(400).json({ error: err.message });
      }
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/designs/:id/thumbnail
   * Update design thumbnail
   */
  router.post("/designs/:id/thumbnail", authenticateToken, async (req, res) => {
    try {
      const { thumbnail_url } = req.body;

      if (!thumbnail_url) {
        return res.status(400).json({ error: "썸네일 URL이 필요합니다." });
      }

      const design = await designService.updateThumbnail(
        parseInt(req.params.id),
        req.user.id,
        thumbnail_url
      );

      if (!design) {
        return res.status(404).json({ error: "디자인을 찾을 수 없습니다." });
      }

      res.json({ design });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};

module.exports = { createDesignsRouter };
