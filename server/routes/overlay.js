/**
 * Overlay Routes
 * Public overlay access via hash and overlay URL management
 * Uses cross-database compatible helpers from connections.js
 */

const express = require("express");
const crypto = require("crypto");
const { getOne, runQuery, isPostgres } = require("../db/connections");

/**
 * Get placeholder for parameterized queries
 */
const p = (index) => isPostgres() ? `$${index}` : '?';

/**
 * Generate 16-character overlay hash
 * @returns {string}
 */
const generateOverlayHash = () => {
  return crypto.randomBytes(8).toString("hex");
};

/**
 * Create overlay router
 * @param {Object} db - Database instance (not used directly, for backward compatibility)
 * @param {Server} io - Socket.io server instance
 * @param {Function} authenticateToken - Auth middleware
 * @returns {express.Router}
 */
const createOverlayRouter = (db, io, authenticateToken) => {
  const router = express.Router();

  const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

  // ===== Public Overlay API (Hash-based) =====

  /**
   * GET /api/overlay/:hash/settings/:key
   * Get settings by overlay hash (public - for OBS browser source)
   */
  router.get("/overlay/:hash/settings/:key", async (req, res) => {
    try {
      const { hash, key } = req.params;

      // Find user by overlay hash
      const user = await getOne(`SELECT id FROM users WHERE overlay_hash = ${p(1)}`, [hash]);
      if (!user) {
        return res.status(404).json({ error: "오버레이를 찾을 수 없습니다." });
      }

      // Get user-specific setting
      const row = await getOne(
        `SELECT setting_value FROM user_settings WHERE user_id = ${p(1)} AND setting_key = ${p(2)}`,
        [user.id, key]
      );

      if (!row) {
        // Fallback to global setting (legacy support)
        const globalRow = await getOne(`SELECT value FROM settings WHERE key = ${p(1)}`, [key]);
        return res.json({ value: globalRow ? globalRow.value : "{}" });
      }

      res.json({ value: row.setting_value });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ===== Authenticated Overlay Management =====

  /**
   * GET /api/overlay/urls
   * Get user's overlay URLs (requires auth)
   */
  router.get("/overlay/urls", authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;

      const user = await getOne(`SELECT overlay_hash FROM users WHERE id = ${p(1)}`, [userId]);
      if (!user || !user.overlay_hash) {
        return res.status(404).json({ error: "오버레이 해시가 없습니다." });
      }

      const hash = user.overlay_hash;
      const baseUrl = `${CLIENT_URL}/overlay/${hash}`;

      res.json({
        hash,
        urls: {
          chat: `${baseUrl}/chat`,
          alerts: `${baseUrl}/alerts`,
          subtitles: `${baseUrl}/subtitles`,
          goals: `${baseUrl}/goals`,
          ticker: `${baseUrl}/ticker`,
          roulette: `${baseUrl}/roulette`,
          emoji: `${baseUrl}/emoji`,
          voting: `${baseUrl}/voting`,
          credits: `${baseUrl}/credits`,
        },
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/overlay/regenerate-hash
   * Regenerate overlay hash (requires auth)
   */
  router.post("/overlay/regenerate-hash", authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const newHash = generateOverlayHash();

      await runQuery(`UPDATE users SET overlay_hash = ${p(1)} WHERE id = ${p(2)}`, [newHash, userId]);

      res.json({
        success: true,
        hash: newHash,
        message: "오버레이 해시가 재생성되었습니다. 기존 OBS 브라우저 소스 URL을 업데이트해주세요.",
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  return router;
};

module.exports = { createOverlayRouter, generateOverlayHash };
