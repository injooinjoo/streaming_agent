/**
 * Settings Service
 * Business logic for user and global settings management
 */

/**
 * Create Settings Service
 * @param {sqlite3.Database} db - Database instance
 * @param {Server} io - Socket.io server instance
 * @returns {Object} Settings service methods
 */
const createSettingsService = (db, io) => {
  /**
   * Promisified db.get
   */
  const dbGet = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  };

  /**
   * Promisified db.run
   */
  const dbRun = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  };

  /**
   * Promisified db.all
   */
  const dbAll = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  };

  return {
    // ===== Global Settings (Legacy) =====

    /**
     * Get global setting by key
     * @param {string} key - Setting key
     * @returns {Promise<string|null>}
     */
    async getGlobal(key) {
      const row = await dbGet("SELECT value FROM settings WHERE key = ?", [key]);
      return row?.value || null;
    },

    /**
     * Set global setting
     * @param {string} key - Setting key
     * @param {any} value - Setting value (will be JSON stringified)
     * @returns {Promise<void>}
     */
    async setGlobal(key, value) {
      await dbRun(
        `INSERT INTO settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [key, JSON.stringify(value)]
      );

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
      const row = await dbGet(
        "SELECT setting_value FROM user_settings WHERE user_id = ? AND setting_key = ?",
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
      const rows = await dbAll(
        "SELECT setting_key, setting_value FROM user_settings WHERE user_id = ?",
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
      await dbRun(
        `INSERT INTO user_settings (user_id, setting_key, setting_value, updated_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(user_id, setting_key) DO UPDATE SET
           setting_value = excluded.setting_value,
           updated_at = CURRENT_TIMESTAMP`,
        [userId, key, JSON.stringify(value)]
      );

      // Notify user's overlay via their hash
      if (overlayHash) {
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
      const result = await dbRun(
        "DELETE FROM user_settings WHERE user_id = ? AND setting_key = ?",
        [userId, key]
      );
      return result.changes > 0;
    },

    // ===== Overlay Settings (Public, Hash-based) =====

    /**
     * Get setting by overlay hash (for OBS browser source)
     * @param {string} hash - Overlay hash
     * @param {string} key - Setting key
     * @returns {Promise<string|null>}
     */
    async getByOverlayHash(hash, key) {
      // Find user by hash
      const user = await dbGet("SELECT id FROM users WHERE overlay_hash = ?", [hash]);
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

      for (const key of keys) {
        await dbRun(
          `INSERT INTO user_settings (user_id, setting_key, setting_value, updated_at)
           VALUES (?, ?, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(user_id, setting_key) DO UPDATE SET
             setting_value = excluded.setting_value,
             updated_at = CURRENT_TIMESTAMP`,
          [userId, key, JSON.stringify(settings[key])]
        );
      }

      // Notify overlay of all changed keys
      if (overlayHash) {
        for (const key of keys) {
          io.to(`overlay:${overlayHash}`).emit("settings-updated", { key });
        }
      }
    },
  };
};

module.exports = { createSettingsService };
