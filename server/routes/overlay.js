/**
 * Overlay Routes
 * Public overlay access via hash and overlay URL management
 */

const express = require("express");
const crypto = require("crypto");

/**
 * Generate 16-character overlay hash
 * @returns {string}
 */
const generateOverlayHash = () => {
  return crypto.randomBytes(8).toString("hex");
};

/**
 * Create overlay router
 * @param {sqlite3.Database} db - Database instance
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
  router.get("/overlay/:hash/settings/:key", (req, res) => {
    const { hash, key } = req.params;

    // Find user by overlay hash
    db.get("SELECT id FROM users WHERE overlay_hash = ?", [hash], (err, user) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!user) return res.status(404).json({ error: "오버레이를 찾을 수 없습니다." });

      // Get user-specific setting
      db.get(
        "SELECT setting_value FROM user_settings WHERE user_id = ? AND setting_key = ?",
        [user.id, key],
        (err, row) => {
          if (err) return res.status(500).json({ error: err.message });
          if (!row) {
            // Fallback to global setting (legacy support)
            db.get("SELECT value FROM settings WHERE key = ?", [key], (err, globalRow) => {
              if (err) return res.status(500).json({ error: err.message });
              return res.json({ value: globalRow ? globalRow.value : "{}" });
            });
            return;
          }
          res.json({ value: row.setting_value });
        }
      );
    });
  });

  // ===== Authenticated Overlay Management =====

  /**
   * GET /api/overlay/urls
   * Get user's overlay URLs (requires auth)
   */
  router.get("/overlay/urls", authenticateToken, (req, res) => {
    const userId = req.user.id;

    db.get("SELECT overlay_hash FROM users WHERE id = ?", [userId], (err, user) => {
      if (err) return res.status(500).json({ error: err.message });
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
    });
  });

  /**
   * POST /api/overlay/regenerate-hash
   * Regenerate overlay hash (requires auth)
   */
  router.post("/overlay/regenerate-hash", authenticateToken, (req, res) => {
    const userId = req.user.id;
    const newHash = generateOverlayHash();

    db.run("UPDATE users SET overlay_hash = ? WHERE id = ?", [newHash, userId], function (err) {
      if (err) return res.status(500).json({ error: err.message });

      res.json({
        success: true,
        hash: newHash,
        message: "오버레이 해시가 재생성되었습니다. 기존 OBS 브라우저 소스 URL을 업데이트해주세요.",
      });
    });
  });

  return router;
};

module.exports = { createOverlayRouter, generateOverlayHash };
