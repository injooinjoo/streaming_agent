/**
 * User Service
 * Business logic for user management
 */

const bcrypt = require("bcrypt");
const crypto = require("crypto");

/**
 * Generate 16-character overlay hash
 * @returns {string}
 */
const generateOverlayHash = () => {
  return crypto.randomBytes(8).toString("hex");
};

/**
 * Create User Service
 * @param {sqlite3.Database} db - Database instance
 * @returns {Object} User service methods
 */
const createUserService = (db) => {
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
    /**
     * Find user by ID
     * @param {number} id - User ID
     * @returns {Promise<Object|null>}
     */
    async findById(id) {
      return dbGet(
        `SELECT id, email, display_name, role, avatar_url, overlay_hash, created_at
         FROM users WHERE id = ?`,
        [id]
      );
    },

    /**
     * Find user by email
     * @param {string} email - User email
     * @returns {Promise<Object|null>}
     */
    async findByEmail(email) {
      return dbGet("SELECT * FROM users WHERE email = ?", [email]);
    },

    /**
     * Find user by overlay hash
     * @param {string} hash - Overlay hash
     * @returns {Promise<Object|null>}
     */
    async findByOverlayHash(hash) {
      return dbGet("SELECT * FROM users WHERE overlay_hash = ?", [hash]);
    },

    /**
     * Find user by OAuth provider and ID
     * @param {string} provider - OAuth provider name
     * @param {string} oauthId - OAuth ID
     * @returns {Promise<Object|null>}
     */
    async findByOAuth(provider, oauthId) {
      return dbGet(
        "SELECT * FROM users WHERE oauth_provider = ? AND oauth_id = ?",
        [provider, oauthId]
      );
    },

    /**
     * Create new user with email/password
     * @param {Object} userData - User data
     * @returns {Promise<Object>}
     */
    async create({ email, password, displayName }) {
      const passwordHash = await bcrypt.hash(password, 10);
      const overlayHash = generateOverlayHash();

      const result = await dbRun(
        `INSERT INTO users (email, password_hash, display_name, overlay_hash)
         VALUES (?, ?, ?, ?)`,
        [email, passwordHash, displayName, overlayHash]
      );

      return {
        id: result.lastID,
        email,
        displayName,
        role: "user",
        overlayHash,
      };
    },

    /**
     * Create user from OAuth
     * @param {Object} userData - OAuth user data
     * @returns {Promise<Object>}
     */
    async createFromOAuth({ email, displayName, avatarUrl, provider, oauthId }) {
      const overlayHash = generateOverlayHash();

      const result = await dbRun(
        `INSERT INTO users (email, display_name, avatar_url, oauth_provider, oauth_id, overlay_hash)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [email, displayName, avatarUrl, provider, oauthId, overlayHash]
      );

      return {
        id: result.lastID,
        email,
        displayName,
        avatarUrl,
        role: "user",
        overlayHash,
      };
    },

    /**
     * Update user profile
     * @param {number} id - User ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>}
     */
    async updateProfile(id, { displayName, avatarUrl }) {
      await dbRun(
        `UPDATE users SET display_name = ?, avatar_url = ? WHERE id = ?`,
        [displayName, avatarUrl || null, id]
      );

      return { id, displayName, avatarUrl };
    },

    /**
     * Update overlay hash
     * @param {number} id - User ID
     * @param {string} hash - New overlay hash (optional, generates if not provided)
     * @returns {Promise<string>} New hash
     */
    async updateOverlayHash(id, hash = null) {
      const newHash = hash || generateOverlayHash();
      await dbRun("UPDATE users SET overlay_hash = ? WHERE id = ?", [newHash, id]);
      return newHash;
    },

    /**
     * Verify password
     * @param {string} password - Plain password
     * @param {string} hash - Password hash
     * @returns {Promise<boolean>}
     */
    async verifyPassword(password, hash) {
      return bcrypt.compare(password, hash);
    },

    /**
     * Get users list with pagination (for admin)
     * @param {Object} options - Query options
     * @returns {Promise<Object>}
     */
    async getUsers({ page = 1, limit = 20, search = "", sort = "created_at", order = "DESC" }) {
      const offset = (page - 1) * limit;
      const allowedSortColumns = ["id", "display_name", "email", "created_at", "role"];
      const safeSort = allowedSortColumns.includes(sort) ? sort : "created_at";
      const safeOrder = order === "ASC" ? "ASC" : "DESC";
      const searchParam = `%${search}%`;

      const countResult = await dbGet(
        `SELECT COUNT(*) as total FROM users
         WHERE role IN ('user', 'creator') AND (display_name LIKE ? OR email LIKE ?)`,
        [searchParam, searchParam]
      );

      const users = await dbAll(
        `SELECT id, email, display_name, role, created_at, overlay_hash, avatar_url
         FROM users
         WHERE role IN ('user', 'creator') AND (display_name LIKE ? OR email LIKE ?)
         ORDER BY ${safeSort} ${safeOrder}
         LIMIT ? OFFSET ?`,
        [searchParam, searchParam, parseInt(limit), offset]
      );

      return {
        users,
        pagination: {
          total: countResult.total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(countResult.total / limit),
        },
      };
    },

    /**
     * Get user counts for admin overview
     * @returns {Promise<Object>}
     */
    async getCounts() {
      const [totalUsers, totalStreamers, activeUsers] = await Promise.all([
        dbGet("SELECT COUNT(*) as count FROM users"),
        dbGet("SELECT COUNT(*) as count FROM users WHERE role IN ('user', 'creator')"),
        dbGet("SELECT COUNT(*) as count FROM users WHERE created_at > datetime('now', '-30 days')"),
      ]);

      return {
        totalUsers: totalUsers?.count || 0,
        totalStreamers: totalStreamers?.count || 0,
        activeUsers: activeUsers?.count || 0,
      };
    },

    /**
     * Get streamers list for ad targeting
     * @returns {Promise<Array>}
     */
    async getStreamersForTargeting() {
      const rows = await dbAll(
        `SELECT id, display_name, avatar_url, overlay_hash
         FROM users
         WHERE role IN ('user', 'creator') AND overlay_hash IS NOT NULL
         ORDER BY display_name ASC`
      );

      return (rows || []).map((row) => ({
        id: row.id,
        displayName: row.display_name,
        avatarUrl: row.avatar_url,
        overlayHash: row.overlay_hash,
      }));
    },
  };
};

module.exports = { createUserService, generateOverlayHash };
