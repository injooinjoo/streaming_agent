/**
 * Ads Routes
 * Ad slots, campaigns, impressions, and revenue management
 */

const express = require("express");
const { authorizeRoles } = require("../middleware/auth");

const STREAMER_ROLES = ["user", "creator", "streamer", "admin", "superadmin"];
const ADVERTISER_ROLES = ["advertiser", "admin", "superadmin"];
const ROLE_ERROR_MESSAGE = "이 기능에 접근할 권한이 없습니다.";

const parseJsonIfNeeded = (value) => {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const normalizeCampaignPayload = (body = {}) => ({
  name: body.name,
  contentType: body.contentType || body.content_type || "image",
  contentUrl: body.contentUrl || body.content_url,
  clickUrl: body.clickUrl || body.click_url || null,
  budgetDaily: Number(body.budgetDaily ?? body.budget_daily ?? 0),
  budgetTotal: Number(body.budgetTotal ?? body.budget_total ?? 0),
  cpm: Number(body.cpm ?? 0),
  cpc: Number(body.cpc ?? 0),
  startDate: body.startDate || body.start_date || null,
  endDate: body.endDate || body.end_date || null,
  targetStreamers: parseJsonIfNeeded(body.targetStreamers ?? body.target_streamers ?? "all"),
  targetCategories: parseJsonIfNeeded(body.targetCategories ?? body.target_categories ?? []),
});

const normalizeCampaignUpdatePayload = (payload) => ({
  name: payload.name,
  content_type: payload.contentType || "image",
  content_url: payload.contentUrl,
  click_url: payload.clickUrl,
  budget_daily: payload.budgetDaily || 0,
  budget_total: payload.budgetTotal || 0,
  cpm: payload.cpm || 0,
  cpc: payload.cpc || 0,
  start_date: payload.startDate,
  end_date: payload.endDate,
  target_streamers:
    typeof payload.targetStreamers === "string" ? payload.targetStreamers : JSON.stringify(payload.targetStreamers || []),
  target_categories: payload.targetCategories ? JSON.stringify(payload.targetCategories) : null,
});

/**
 * Create ads router
 * @param {Object} adService - Ad service instance
 * @param {Object} userService - User service instance
 * @param {Function} authenticateToken - Auth middleware
 * @returns {express.Router}
 */
const createAdsRouter = (adService, userService, authenticateToken) => {
  const router = express.Router();
  const requireStreamer = [authenticateToken, authorizeRoles(STREAMER_ROLES, ROLE_ERROR_MESSAGE)];
  const requireAdvertiser = [authenticateToken, authorizeRoles(ADVERTISER_ROLES, ROLE_ERROR_MESSAGE)];

  // ===== Ad Slots API (Streamer) =====

  router.get("/ads/slots", ...requireStreamer, async (req, res) => {
    try {
      const slots = await adService.getSlotsWithStats(req.user.id);
      res.json({ slots });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post("/ads/slots", ...requireStreamer, async (req, res) => {
    const { name, type, position, size, enabled } = req.body;

    if (!name) {
      return res.status(400).json({ error: "광고 슬롯 이름을 입력해주세요." });
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

      if (req.user.overlayHash) {
        adService.notifySlotUpdate(req.user.overlayHash, { slots: [newSlot] });
      }

      res.json({ success: true, slot: newSlot });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.put("/ads/slots/:id", ...requireStreamer, async (req, res) => {
    const slotId = Number.parseInt(req.params.id, 10);
    const { name, type, position, size, enabled } = req.body;

    try {
      const updated = await adService.updateSlot(slotId, req.user.id, {
        name,
        type,
        positionX: position?.x,
        positionY: position?.y,
        width: size?.width,
        height: size?.height,
        enabled,
      });

      if (!updated) {
        return res.status(404).json({ error: "광고 슬롯을 찾을 수 없습니다." });
      }

      if (req.user.overlayHash) {
        adService.notifySlotUpdate(req.user.overlayHash, { slotId: req.params.id });
      }

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.delete("/ads/slots/:id", ...requireStreamer, async (req, res) => {
    const slotId = Number.parseInt(req.params.id, 10);

    try {
      const deleted = await adService.deleteSlot(slotId, req.user.id);

      if (!deleted) {
        return res.status(404).json({ error: "광고 슬롯을 찾을 수 없습니다." });
      }

      if (req.user.overlayHash) {
        adService.notifySlotUpdate(req.user.overlayHash, { deletedSlotId: req.params.id });
      }

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.put("/ads/slots", ...requireStreamer, async (req, res) => {
    const { slots } = req.body;

    if (!Array.isArray(slots)) {
      return res.status(400).json({ error: "광고 슬롯 배열을 전달해주세요." });
    }

    try {
      await adService.batchSaveSlots(req.user.id, slots);

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

  // ===== Revenue & Settlement (Streamer) =====

  router.get("/ads/revenue", ...requireStreamer, async (req, res) => {
    try {
      const revenue = await adService.getStreamerRevenueDetails(req.user.id);
      res.json(revenue);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/ads/trend", ...requireStreamer, async (req, res) => {
    try {
      const days = Number.parseInt(req.query.days, 10) || 7;
      const trend = await adService.getStreamerRevenueTrend(req.user.id, days);
      res.json(trend);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/ads/settlements", ...requireStreamer, async (req, res) => {
    try {
      const settlements = await adService.getSettlements(req.user.id);
      res.json({ settlements });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===== Campaigns API (Advertiser) =====

  router.get("/ads/campaigns", ...requireAdvertiser, async (req, res) => {
    try {
      const campaigns = await adService.getCampaignsWithStats(req.user.id);
      res.json({ campaigns });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post("/ads/campaigns", ...requireAdvertiser, async (req, res) => {
    const payload = normalizeCampaignPayload(req.body);

    if (!payload.name || !payload.contentUrl) {
      return res.status(400).json({ error: "캠페인 이름과 광고 소재 URL을 입력해주세요." });
    }

    try {
      const result = await adService.createCampaign(req.user.id, payload);
      res.json({ success: true, campaignId: result.id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.put("/ads/campaigns/:id", ...requireAdvertiser, async (req, res) => {
    const campaignId = Number.parseInt(req.params.id, 10);
    const payload = normalizeCampaignPayload(req.body);

    try {
      const updated = await adService.updateCampaign(
        campaignId,
        req.user.id,
        normalizeCampaignUpdatePayload(payload)
      );

      if (!updated) {
        return res.status(404).json({ error: "캠페인을 찾을 수 없거나 수정 권한이 없습니다." });
      }

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.put("/ads/campaigns/:id/status", ...requireAdvertiser, async (req, res) => {
    const campaignId = Number.parseInt(req.params.id, 10);
    const { status } = req.body;
    const validStatuses = ["active", "paused"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "유효하지 않은 상태값입니다." });
    }

    try {
      const updated = await adService.updateCampaignStatus(campaignId, status, req.user.id);

      if (!updated) {
        return res.status(404).json({ error: "캠페인을 찾을 수 없습니다." });
      }

      adService.notifyAdsRefreshGlobal();
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.delete("/ads/campaigns/:id", ...requireAdvertiser, async (req, res) => {
    const campaignId = Number.parseInt(req.params.id, 10);

    try {
      const deleted = await adService.deleteCampaign(campaignId, req.user.id);

      if (!deleted) {
        return res.status(404).json({ error: "캠페인을 찾을 수 없거나 삭제 권한이 없습니다." });
      }

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/ads/campaigns/:id/stats", ...requireAdvertiser, async (req, res) => {
    const campaignId = Number.parseInt(req.params.id, 10);

    try {
      const stats = await adService.getCampaignStats(campaignId, req.user.id);

      if (!stats) {
        return res.status(404).json({ error: "캠페인을 찾을 수 없습니다." });
      }

      res.json(stats);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===== Utility API =====

  router.get("/users/streamers", ...requireAdvertiser, async (req, res) => {
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
