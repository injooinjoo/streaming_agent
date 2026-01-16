/**
 * Token Service
 * JWT token generation, validation, and refresh token management
 * Uses Redis when available, falls back to in-memory store
 */

const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const { getRedisService } = require("./redisService");
const { auth: authLogger } = require("./logger");

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

// Token expiration settings
const ACCESS_TOKEN_EXPIRES_IN = "15m"; // 15 minutes
const REFRESH_TOKEN_EXPIRES_IN = "7d"; // 7 days
const ACCESS_TOKEN_TTL_SEC = 15 * 60; // 15 minutes in seconds
const REFRESH_TOKEN_TTL_SEC = 7 * 24 * 60 * 60; // 7 days in seconds

// Redis key prefixes
const KEY_PREFIX = {
  BLACKLIST: "token:blacklist:",
  REFRESH: "token:refresh:",
  USER_TOKENS: "user:tokens:",
};

/**
 * Create Token Service
 * @param {Object} options - Configuration options
 * @returns {Object} Token service methods
 */
const createTokenService = (options = {}) => {
  const redis = getRedisService();

  // In-memory fallback stores
  const tokenBlacklist = new Map();
  const refreshTokenStore = new Map();

  // Cleanup expired entries periodically (for in-memory stores)
  const cleanupInterval = setInterval(() => {
    const now = Date.now();

    // Clean blacklist
    for (const [key, value] of tokenBlacklist.entries()) {
      if (value.expiresAt < now) {
        tokenBlacklist.delete(key);
      }
    }

    // Clean refresh token store
    for (const [key, value] of refreshTokenStore.entries()) {
      if (value.expiresAt < now) {
        refreshTokenStore.delete(key);
      }
    }
  }, 60 * 1000); // Every minute

  cleanupInterval.unref();

  /**
   * Check if Redis is available
   * @returns {boolean}
   */
  const isRedisAvailable = () => redis.getIsConnected();

  /**
   * Get hash of token for storage key (don't store full token)
   * @param {string} token - JWT token
   * @returns {string} Hash
   */
  const getTokenHash = (token) => {
    return crypto.createHash("sha256").update(token).digest("hex").slice(0, 32);
  };

  return {
    /**
     * Generate access token
     * @param {Object} user - User data
     * @returns {string} Access token
     */
    generateAccessToken(user) {
      return jwt.sign(
        {
          id: user.id,
          email: user.email,
          displayName: user.displayName || user.display_name,
          role: user.role,
          overlayHash: user.overlayHash || user.overlay_hash,
          type: "access",
        },
        JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
      );
    },

    /**
     * Generate refresh token
     * @param {Object} user - User data
     * @returns {Promise<string>} Refresh token
     */
    async generateRefreshToken(user) {
      const tokenId = crypto.randomBytes(16).toString("hex");

      const token = jwt.sign(
        {
          id: user.id,
          tokenId,
          type: "refresh",
        },
        JWT_REFRESH_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
      );

      // Store refresh token metadata
      const decoded = jwt.decode(token);
      const tokenData = {
        userId: user.id,
        createdAt: Date.now(),
        expiresAt: decoded.exp * 1000,
      };

      if (isRedisAvailable()) {
        const key = KEY_PREFIX.REFRESH + tokenId;
        const userKey = KEY_PREFIX.USER_TOKENS + user.id;

        try {
          await redis.set(key, tokenData, REFRESH_TOKEN_TTL_SEC);
          // Track token IDs by user for bulk revocation
          const client = redis.getClient();
          await client.sadd(userKey, tokenId);
          await client.expire(userKey, REFRESH_TOKEN_TTL_SEC);
          authLogger.debug("Refresh token stored in Redis", { userId: user.id });
        } catch (error) {
          authLogger.warn("Redis refresh token storage failed, using memory", { error: error.message });
          refreshTokenStore.set(tokenId, tokenData);
        }
      } else {
        refreshTokenStore.set(tokenId, tokenData);
      }

      return token;
    },

    /**
     * Generate both access and refresh tokens
     * @param {Object} user - User data
     * @returns {Promise<Object>} { accessToken, refreshToken }
     */
    async generateTokenPair(user) {
      return {
        accessToken: this.generateAccessToken(user),
        refreshToken: await this.generateRefreshToken(user),
      };
    },

    /**
     * Verify access token
     * @param {string} token - Access token
     * @returns {Promise<Object|null>} Decoded token or null if invalid
     */
    async verifyAccessToken(token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // Ensure it's an access token
        if (decoded.type !== "access") {
          return null;
        }

        // Check if token is blacklisted
        if (await this.isBlacklisted(token)) {
          return null;
        }

        return decoded;
      } catch (err) {
        return null;
      }
    },

    /**
     * Verify refresh token
     * @param {string} token - Refresh token
     * @returns {Promise<Object|null>} Decoded token or null if invalid
     */
    async verifyRefreshToken(token) {
      try {
        const decoded = jwt.verify(token, JWT_REFRESH_SECRET);

        // Ensure it's a refresh token
        if (decoded.type !== "refresh") {
          return null;
        }

        // Check if token exists in store (not revoked)
        if (isRedisAvailable()) {
          const key = KEY_PREFIX.REFRESH + decoded.tokenId;
          const exists = await redis.exists(key);
          if (!exists) {
            // Also check memory as fallback
            if (!refreshTokenStore.has(decoded.tokenId)) {
              return null;
            }
          }
        } else {
          if (!refreshTokenStore.has(decoded.tokenId)) {
            return null;
          }
        }

        return decoded;
      } catch (err) {
        return null;
      }
    },

    /**
     * Refresh tokens - invalidate old refresh token and generate new pair
     * @param {string} refreshToken - Current refresh token
     * @param {Object} user - User data for new tokens
     * @returns {Promise<Object|null>} New token pair or null if invalid
     */
    async refreshTokens(refreshToken, user) {
      const decoded = await this.verifyRefreshToken(refreshToken);

      if (!decoded) {
        return null;
      }

      // Verify user ID matches
      if (decoded.id !== user.id) {
        return null;
      }

      // Revoke old refresh token (rotation)
      if (isRedisAvailable()) {
        const key = KEY_PREFIX.REFRESH + decoded.tokenId;
        const userKey = KEY_PREFIX.USER_TOKENS + user.id;
        try {
          await redis.del(key);
          const client = redis.getClient();
          await client.srem(userKey, decoded.tokenId);
        } catch (error) {
          authLogger.warn("Redis token revocation failed", { error: error.message });
        }
      }
      refreshTokenStore.delete(decoded.tokenId);

      // Generate new token pair
      return this.generateTokenPair(user);
    },

    /**
     * Blacklist an access token (logout)
     * @param {string} token - Access token to blacklist
     */
    async blacklistToken(token) {
      try {
        const decoded = jwt.decode(token);
        if (decoded && decoded.exp) {
          const ttl = Math.max(0, decoded.exp - Math.floor(Date.now() / 1000));
          const tokenHash = getTokenHash(token);

          if (isRedisAvailable() && ttl > 0) {
            const success = await redis.blacklistToken(tokenHash, ttl);
            if (success) {
              authLogger.debug("Token blacklisted in Redis");
              return;
            }
          }

          // Memory fallback
          tokenBlacklist.set(tokenHash, {
            expiresAt: decoded.exp * 1000,
          });
          authLogger.debug("Token blacklisted in memory");
        }
      } catch (err) {
        authLogger.error("Error blacklisting token", { error: err.message });
      }
    },

    /**
     * Revoke all refresh tokens for a user
     * @param {number} userId - User ID
     */
    async revokeAllUserTokens(userId) {
      if (isRedisAvailable()) {
        const userKey = KEY_PREFIX.USER_TOKENS + userId;
        try {
          const client = redis.getClient();
          const tokenIds = await client.smembers(userKey);

          if (tokenIds.length > 0) {
            const deletePromises = tokenIds.map((tokenId) => redis.del(KEY_PREFIX.REFRESH + tokenId));
            await Promise.all(deletePromises);
            await client.del(userKey);
          }
          authLogger.info("User tokens revoked from Redis", { userId, count: tokenIds.length });
        } catch (error) {
          authLogger.warn("Redis token revocation failed", { error: error.message });
        }
      }

      // Also clear memory store
      for (const [tokenId, data] of refreshTokenStore.entries()) {
        if (data.userId === userId) {
          refreshTokenStore.delete(tokenId);
        }
      }
    },

    /**
     * Check if token is blacklisted
     * @param {string} token - Token to check
     * @returns {Promise<boolean>}
     */
    async isBlacklisted(token) {
      const tokenHash = getTokenHash(token);

      if (isRedisAvailable()) {
        const blacklisted = await redis.isTokenBlacklisted(tokenHash);
        if (blacklisted) {
          return true;
        }
        // Also check memory as fallback
      }

      return tokenBlacklist.has(tokenHash);
    },

    /**
     * Get service statistics
     * @returns {Promise<Object>}
     */
    async getStats() {
      let redisStats = null;

      if (isRedisAvailable()) {
        try {
          const client = redis.getClient();
          const blacklistKeys = await client.keys(KEY_PREFIX.BLACKLIST + "*");
          const refreshKeys = await client.keys(KEY_PREFIX.REFRESH + "*");
          redisStats = {
            blacklistedTokens: blacklistKeys.length,
            activeRefreshTokens: refreshKeys.length,
          };
        } catch (error) {
          authLogger.warn("Failed to get Redis stats", { error: error.message });
        }
      }

      return {
        backend: isRedisAvailable() ? "redis" : "memory",
        memory: {
          blacklistedTokens: tokenBlacklist.size,
          activeRefreshTokens: refreshTokenStore.size,
        },
        redis: redisStats,
      };
    },

    /**
     * Check if Redis is being used
     * @returns {boolean}
     */
    isUsingRedis: isRedisAvailable,
  };
};

module.exports = {
  createTokenService,
  ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN,
};
