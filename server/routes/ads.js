/**
 * Ads Routes
 * Ad slots, campaigns, impressions, and revenue management
 */

const express = require("express");

/**
 * Create ads router
 * @param {Object} adService - Ad service instance
 * @param {Object} userService - User service instance
 * @param {Function} authenticateToken - Auth middleware
 * @returns {express.Router}
 */
const createAdsRouter = (adService, userService, authenticateToken) => {
  const router = express.Router();

  // ===== Ad Slots API (Streamer) =====

  /**
   * GET /api/ads/slots
   * Get user's ad slots with stats
   */
  router.get("/ads/slots", authenticateToken, async (req, res) => {
    try {
      const slots = await adService.getSlotsWithStats(req.user.id);
      res.json({ slots });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/ads/slots
   * Create new ad slot
   */
  router.post("/ads/slots", authenticateToken, async (req, res) => {
    const { name, type, position, size, enabled } = req.body;

    if (!name) {
      return res.status(400).json({ error: "슬롯 이름을 입력해주세요." });
    }

    try {
      const slot = await adService.createSlot(req.user.id, {
        name,
        type: type || "banner",
        positionX: position?.x || 0,
        positionY: position?.y || 0,
        width: size?.width || 300,
        height: size?.height || 100,
        enabled: enabled !== false,
      });

      const newSlot = {
        id: slot.id,
        name,
        type: type || "banner",
        position: { x: position?.x || 0, y: position?.y || 0 },
        size: { width: size?.width || 300, height: size?.height || 100 },
        enabled: enabled !== false,
        impressions: 0,
        clicks: 0,
        revenue: 0,
      };

      // Notify overlay about new slot
      if (req.user.overlayHash) {
        adService.notifySlotUpdate(req.user.overlayHash, { slots: [newSlot] });
      }

      res.json({ success: true, slot: newSlot });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * PUT /api/ads/slots/:id
   * Update ad slot
   */
  router.put("/ads/slots/:id", authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { name, type, position, size, enabled } = req.body;

    try {
      const updated = await adService.updateSlot(parseInt(id), req.user.id, {
        name,
        type,
        positionX: position?.x,
        positionY: position?.y,
        width: size?.width,
        height: size?.height,
        enabled,
      });

      if (!updated) {
        return res.status(404).json({ error: "슬롯을 찾을 수 없습니다." });
      }

      // Notify overlay about slot update
      if (req.user.overlayHash) {
        adService.notifySlotUpdate(req.user.overlayHash, { slotId: id });
      }

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * DELETE /api/ads/slots/:id
   * Delete ad slot
   */
  router.delete("/ads/slots/:id", authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
      const deleted = await adService.deleteSlot(parseInt(id), req.user.id);

      if (!deleted) {
        return res.status(404).json({ error: "슬롯을 찾을 수 없습니다." });
      }

      // Notify overlay about slot deletion
      if (req.user.overlayHash) {
        adService.notifySlotUpdate(req.user.overlayHash, { deletedSlotId: id });
      }

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * PUT /api/ads/slots (batch)
   * Batch save all slots
   */
  router.put("/ads/slots", authenticateToken, async (req, res) => {
    const { slots } = req.body;

    if (!Array.isArray(slots)) {
      return res.status(400).json({ error: "슬롯 배열을 제공해주세요." });
    }

    try {
      await adService.batchSaveSlots(req.user.id, slots);

      // Notify overlay about slots update
      if (req.user.overlayHash) {
        adService.notifySlotUpdate(req.user.overlayHash, { userHash: req.user.overlayHash });
        adService.notifyAdsRefresh(req.user.overlayHash);
      }

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===== Overlay Ads API (Public) =====

  /**
   * GET /api/overlay/:hash/ads/slots
   * Get ad slots for OBS overlay
   */
  router.get("/overlay/:hash/ads/slots", async (req, res) => {
    const { hash } = req.params;

    try {
      const user = await userService.findByOverlayHash(hash);
      if (!user) {
        return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });
      }

      const rows = await adService.getEnabledSlotsByUserId(user.id);
      const slots = rows.map((row) => ({
        id: row.id,
        name: row.name,
        type: row.type,
        position: { x: row.position_x, y: row.position_y },
        size: { width: row.width, height: row.height },
        enabled: true,
      }));

      res.json({ slots });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/overlay/:hash/ads/active
   * Get active campaigns for overlay
   */
  router.get("/overlay/:hash/ads/active", async (req, res) => {
    const { hash } = req.params;

    try {
      const user = await userService.findByOverlayHash(hash);
      if (!user) {
        return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });
      }

      const ads = await adService.getActiveCampaignsForUser(user.id);
      res.json({ ads });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===== Impression/Click Tracking =====

  /**
   * POST /api/ads/impression
   * Record ad impression
   */
  router.post("/ads/impression", async (req, res) => {
    const { slotId, campaignId, userHash } = req.body;

    try {
      const user = await userService.findByOverlayHash(userHash);
      const streamerId = user?.id || null;

      const campaign = await adService.getCampaignById(campaignId);
      const revenue = campaign ? campaign.cpm / 1000 : 0;

      await adService.recordImpression(campaignId, slotId, streamerId, revenue);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/ads/click
   * Record ad click
   */
  router.post("/ads/click", async (req, res) => {
    const { slotId, campaignId, userHash } = req.body;

    try {
      const user = await userService.findByOverlayHash(userHash);
      const streamerId = user?.id || null;

      const campaign = await adService.getCampaignById(campaignId);
      const revenue = campaign ? campaign.cpc : 0;

      await adService.recordClick(campaignId, slotId, streamerId, revenue);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===== Revenue & Settlement =====

  /**
   * GET /api/ads/revenue
   * Get user's ad revenue stats
   */
  router.get("/ads/revenue", authenticateToken, async (req, res) => {
    try {
      const revenue = await adService.getStreamerRevenueDetails(req.user.id);
      res.json(revenue);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/ads/trend
   * Get user's ad revenue trend
   */
  router.get("/ads/trend", authenticateToken, async (req, res) => {
    try {
      const days = parseInt(req.query.days, 10) || 7;
      const trend = await adService.getStreamerRevenueTrend(req.user.id, days);
      res.json(trend);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/ads/settlements
   * Get user's settlement history
   */
  router.get("/ads/settlements", authenticateToken, async (req, res) => {
    try {
      const settlements = await adService.getSettlements(req.user.id);
      res.json({ settlements });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===== Campaigns API (Advertiser) =====

  /**
   * GET /api/ads/campaigns
   * Get advertiser's campaigns
   */
  router.get("/ads/campaigns", authenticateToken, async (req, res) => {
    try {
      const campaigns = await adService.getCampaignsWithStats(req.user.id);
      res.json({ campaigns });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/ads/campaigns
   * Create new campaign
   */
  router.post("/ads/campaigns", authenticateToken, async (req, res) => {
    const {
      name,
      contentType,
      contentUrl,
      clickUrl,
      budgetDaily,
      budgetTotal,
      cpm,
      cpc,
      startDate,
      endDate,
      targetStreamers,
      targetCategories,
    } = req.body;

    if (!name || !contentUrl) {
      return res.status(400).json({ error: "캠페인 이름과 콘텐츠 URL을 입력해주세요." });
    }

    try {
      const result = await adService.createCampaign(req.user.id, {
        name,
        contentType: contentType || "image",
        contentUrl,
        clickUrl,
        budgetDaily: budgetDaily || 0,
        budgetTotal: budgetTotal || 0,
        cpm: cpm || 0,
        cpc: cpc || 0,
        startDate,
        endDate,
        targetStreamers: targetStreamers || "all",
        targetCategories,
      });

      res.json({ success: true, campaignId: result.id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * PUT /api/ads/campaigns/:id
   * Update campaign
   */
  router.put("/ads/campaigns/:id", authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
      const updated = await adService.updateCampaign(parseInt(id), req.user.id, req.body);

      if (!updated) {
        return res.status(404).json({ error: "캠페인을 찾을 수 없거나 권한이 없습니다." });
      }

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * PUT /api/ads/campaigns/:id/status
   * Update campaign status
   */
  router.put("/ads/campaigns/:id/status", authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["active", "paused"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "유효하지 않은 상태입니다." });
    }

    try {
      const updated = await adService.updateCampaignStatus(parseInt(id), status, req.user.id);

      if (!updated) {
        return res.status(404).json({ error: "캠페인을 찾을 수 없습니다." });
      }

      adService.notifyAdsRefreshGlobal();
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * DELETE /api/ads/campaigns/:id
   * Delete campaign
   */
  router.delete("/ads/campaigns/:id", authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
      const deleted = await adService.deleteCampaign(parseInt(id), req.user.id);

      if (!deleted) {
        return res.status(404).json({ error: "캠페인을 찾을 수 없거나 권한이 없습니다." });
      }

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/ads/campaigns/:id/stats
   * Get campaign stats
   */
  router.get("/ads/campaigns/:id/stats", authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
      const stats = await adService.getCampaignStats(parseInt(id), req.user.id);

      if (!stats) {
        return res.status(404).json({ error: "캠페인을 찾을 수 없습니다." });
      }

      res.json(stats);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===== Utility API =====

  /**
   * GET /api/users/streamers
   * Get list of streamers for targeting
   */
  router.get("/users/streamers", authenticateToken, async (req, res) => {
    try {
      const streamers = await userService.getStreamersForTargeting();
      res.json(streamers);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};

module.exports = { createAdsRouter };
