/**
 * Settings Routes
 * Global and user-specific settings management
 */

const express = require("express");

/**
 * Create settings router
 * @param {Object} settingsService - Settings service instance
 * @param {Function} authenticateToken - Auth middleware
 * @returns {express.Router}
 */
const createSettingsRouter = (settingsService, authenticateToken) => {
  const router = express.Router();

  // ===== Global Settings API (Legacy) =====

  /**
   * GET /api/settings/:key
   * Get global setting by key (public)
   */
  router.get("/settings/:key", async (req, res) => {
    try {
      const value = await settingsService.getGlobal(req.params.key);
      res.json({ value: value || "{}" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/settings
   * Save global setting (public - for legacy compatibility)
   */
  router.post("/settings", async (req, res) => {
    const { key, value } = req.body;

    try {
      await settingsService.setGlobal(key, value);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===== User-Specific Settings API =====

  /**
   * POST /api/user-settings
   * Save user-specific setting (requires auth)
   */
  router.post("/user-settings", authenticateToken, async (req, res) => {
    const { key, value } = req.body;
    const userId = req.user.id;
    const overlayHash = req.user.overlayHash;

    try {
      await settingsService.setUserSetting(userId, key, value, overlayHash);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/user-settings/:key
   * Get user-specific setting (requires auth)
   */
  router.get("/user-settings/:key", authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const key = req.params.key;

    try {
      const value = await settingsService.getUserSetting(userId, key);
      res.json({ value: value || "{}" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/user-settings
   * Get all user settings (requires auth)
   */
  router.get("/user-settings", authenticateToken, async (req, res) => {
    try {
      const settings = await settingsService.getAllUserSettings(req.user.id);
      res.json({ settings });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * DELETE /api/user-settings/:key
   * Delete user setting (requires auth)
   */
  router.delete("/user-settings/:key", authenticateToken, async (req, res) => {
    try {
      const deleted = await settingsService.deleteUserSetting(req.user.id, req.params.key);
      res.json({ success: deleted });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};

module.exports = { createSettingsRouter };
