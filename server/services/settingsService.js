/**
 * Settings Service
 * Business logic for user and global settings management
 * Uses cross-database compatible helpers from connections.js
 */

const { getOne, getAll, runQuery, isPostgres } = require('../db/connections');

/**
 * Get placeholder for parameterized queries
 * SQLite uses ?, PostgreSQL uses $1, $2, etc.
 */
const getPlaceholder = (index) => isPostgres() ? `$${index}` : '?';

/**
 * Create Settings Service
 * @param {Object} db - Database instance (not used directly, for backward compatibility)
 * @param {Server} io - Socket.io server instance
 * @returns {Object} Settings service methods
 */
const createSettingsService = (db, io) => {
  return {
    // ===== Global Settings (Legacy) =====

    /**
     * Get global setting by key
     * @param {string} key - Setting key
     * @returns {Promise<string|null>}
     */
    async getGlobal(key) {
      const p1 = getPlaceholder(1);
      const row = await getOne(`SELECT value FROM settings WHERE key = ${p1}`, [key]);
      return row?.value || null;
    },

    /**
     * Set global setting
     * @param {string} key - Setting key
     * @param {any} value - Setting value (will be JSON stringified)
     * @returns {Promise<void>}
     */
    async setGlobal(key, value) {
      const p1 = getPlaceholder(1);
      const p2 = getPlaceholder(2);

      if (isPostgres()) {
        await runQuery(
          `INSERT INTO settings (key, value) VALUES (${p1}, ${p2})
           ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value`,
          [key, JSON.stringify(value)]
        );
      } else {
        await runQuery(
          `INSERT INTO settings (key, value) VALUES (${p1}, ${p2})
           ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
          [key, JSON.stringify(value)]
        );
      }

      // Notify overlays to refresh
      if (io) {
        io.emit("settings-updated", { key });
      }
    },

    // ===== User-Specific Settings =====

    /**
     * Get user setting by key
     * @param {number} userId - User ID
     * @param {string} key - Setting key
     * @returns {Promise<string|null>}
     */
    async getUserSetting(userId, key) {
      const p1 = getPlaceholder(1);
      const p2 = getPlaceholder(2);
      const row = await getOne(
        `SELECT setting_value FROM user_settings WHERE user_id = ${p1} AND setting_key = ${p2}`,
        [userId, key]
      );
      return row?.setting_value || null;
    },

    /**
     * Get all user settings
     * @param {number} userId - User ID
     * @returns {Promise<Object>}
     */
    async getAllUserSettings(userId) {
      const p1 = getPlaceholder(1);
      const rows = await getAll(
        `SELECT setting_key, setting_value FROM user_settings WHERE user_id = ${p1}`,
        [userId]
      );

      const settings = {};
      for (const row of rows) {
        try {
          settings[row.setting_key] = JSON.parse(row.setting_value);
        } catch {
          settings[row.setting_key] = row.setting_value;
        }
      }
      return settings;
    },

    /**
     * Set user setting
     * @param {number} userId - User ID
     * @param {string} key - Setting key
     * @param {any} value - Setting value (will be JSON stringified)
     * @param {string} overlayHash - User's overlay hash for notification
     * @returns {Promise<void>}
     */
    async setUserSetting(userId, key, value, overlayHash = null) {
      const p1 = getPlaceholder(1);
      const p2 = getPlaceholder(2);
      const p3 = getPlaceholder(3);

      if (isPostgres()) {
        await runQuery(
          `INSERT INTO user_settings (user_id, setting_key, setting_value, updated_at)
           VALUES (${p1}, ${p2}, ${p3}, CURRENT_TIMESTAMP)
           ON CONFLICT(user_id, setting_key) DO UPDATE SET
             setting_value = EXCLUDED.setting_value,
             updated_at = CURRENT_TIMESTAMP`,
          [userId, key, JSON.stringify(value)]
        );
      } else {
        await runQuery(
          `INSERT INTO user_settings (user_id, setting_key, setting_value, updated_at)
           VALUES (${p1}, ${p2}, ${p3}, CURRENT_TIMESTAMP)
           ON CONFLICT(user_id, setting_key) DO UPDATE SET
             setting_value = excluded.setting_value,
             updated_at = CURRENT_TIMESTAMP`,
          [userId, key, JSON.stringify(value)]
        );
      }

      // Notify user's overlay via their hash
      if (overlayHash && io) {
        io.to(`overlay:${overlayHash}`).emit("settings-updated", { key });
      }
    },

    /**
     * Delete user setting
     * @param {number} userId - User ID
     * @param {string} key - Setting key
     * @returns {Promise<boolean>}
     */
    async deleteUserSetting(userId, key) {
      const p1 = getPlaceholder(1);
      const p2 = getPlaceholder(2);
      const result = await runQuery(
        `DELETE FROM user_settings WHERE user_id = ${p1} AND setting_key = ${p2}`,
        [userId, key]
      );
      return (result.changes || result.rowCount || 0) > 0;
    },

    // ===== Overlay Settings (Public, Hash-based) =====

    /**
     * Get setting by overlay hash (for OBS browser source)
     * @param {string} hash - Overlay hash
     * @param {string} key - Setting key
     * @returns {Promise<string|null>}
     */
    async getByOverlayHash(hash, key) {
      const p1 = getPlaceholder(1);
      // Find user by hash
      const user = await getOne(`SELECT id FROM users WHERE overlay_hash = ${p1}`, [hash]);
      if (!user) return null;

      // Get user-specific setting
      const userSetting = await this.getUserSetting(user.id, key);
      if (userSetting) return userSetting;

      // Fallback to global setting (legacy support)
      return this.getGlobal(key);
    },

    // ===== Batch Operations =====

    /**
     * Set multiple user settings at once
     * @param {number} userId - User ID
     * @param {Object} settings - Key-value pairs
     * @param {string} overlayHash - User's overlay hash
     * @returns {Promise<void>}
     */
    async setUserSettingsBatch(userId, settings, overlayHash = null) {
      const keys = Object.keys(settings);
      const p1 = getPlaceholder(1);
      const p2 = getPlaceholder(2);
      const p3 = getPlaceholder(3);

      for (const key of keys) {
        if (isPostgres()) {
          await runQuery(
            `INSERT INTO user_settings (user_id, setting_key, setting_value, updated_at)
             VALUES (${p1}, ${p2}, ${p3}, CURRENT_TIMESTAMP)
             ON CONFLICT(user_id, setting_key) DO UPDATE SET
               setting_value = EXCLUDED.setting_value,
               updated_at = CURRENT_TIMESTAMP`,
            [userId, key, JSON.stringify(settings[key])]
          );
        } else {
          await runQuery(
            `INSERT INTO user_settings (user_id, setting_key, setting_value, updated_at)
             VALUES (${p1}, ${p2}, ${p3}, CURRENT_TIMESTAMP)
             ON CONFLICT(user_id, setting_key) DO UPDATE SET
               setting_value = excluded.setting_value,
               updated_at = CURRENT_TIMESTAMP`,
            [userId, key, JSON.stringify(settings[key])]
          );
        }
      }

      // Notify overlay of all changed keys
      if (overlayHash && io) {
        for (const key of keys) {
          io.to(`overlay:${overlayHash}`).emit("settings-updated", { key });
        }
      }
    },
  };
};

module.exports = { createSettingsService };
