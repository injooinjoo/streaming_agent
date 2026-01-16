/**
 * State Store Service
 * Hybrid store for OAuth state validation (CSRF protection)
 * Uses Redis when available, falls back to in-memory store
 */

const { getRedisService } = require("./redisService");
const { auth: authLogger } = require("./logger");

/**
 * Create State Store Service
 * @param {Object} options - Configuration options
 * @param {number} options.ttl - Time to live in milliseconds (default: 5 minutes)
 * @returns {Object} State store service methods
 */
const createStateStoreService = (options = {}) => {
  const ttlMs = options.ttl || 5 * 60 * 1000; // 5 minutes default
  const ttlSec = Math.floor(ttlMs / 1000); // Redis uses seconds
  const redis = getRedisService();

  // In-memory fallback store
  const memoryStore = new Map();

  // Cleanup expired states periodically (for memory fallback)
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, value] of memoryStore.entries()) {
      if (value.expiresAt < now) {
        memoryStore.delete(key);
      }
    }
  }, 60 * 1000); // Run cleanup every minute

  // Allow graceful shutdown
  cleanupInterval.unref();

  /**
   * Check if Redis is available
   * @returns {boolean}
   */
  const isRedisAvailable = () => redis.getIsConnected();

  return {
    /**
     * Store a state value
     * @param {string} state - The state value to store
     * @param {Object} metadata - Additional metadata (provider, etc)
     * @returns {Promise<void>}
     */
    async set(state, metadata = {}) {
      const data = {
        ...metadata,
        createdAt: Date.now(),
      };

      if (isRedisAvailable()) {
        const success = await redis.setOAuthState(state, data);
        if (success) {
          authLogger.debug("OAuth state stored in Redis", { state: state.slice(0, 8) + "..." });
          return;
        }
        // Fall through to memory store if Redis fails
        authLogger.warn("Redis OAuth state storage failed, using memory fallback");
      }

      // Memory fallback
      memoryStore.set(state, {
        ...data,
        expiresAt: Date.now() + ttlMs,
      });
      authLogger.debug("OAuth state stored in memory", { state: state.slice(0, 8) + "..." });
    },

    /**
     * Validate and consume a state value
     * @param {string} state - The state value to validate
     * @returns {Promise<Object|null>} The metadata if valid, null if invalid/expired
     */
    async validate(state) {
      if (!state) {
        return null;
      }

      if (isRedisAvailable()) {
        const data = await redis.getOAuthState(state);
        if (data) {
          authLogger.debug("OAuth state validated from Redis", { state: state.slice(0, 8) + "..." });
          return {
            provider: data.provider,
            createdAt: data.createdAt,
          };
        }
        // If Redis is connected but no data found, also check memory
        // (state might have been set before Redis was connected)
      }

      // Memory fallback
      const data = memoryStore.get(state);

      if (!data) {
        return null;
      }

      // Check if expired
      if (data.expiresAt < Date.now()) {
        memoryStore.delete(state);
        return null;
      }

      // Consume the state (one-time use)
      memoryStore.delete(state);
      authLogger.debug("OAuth state validated from memory", { state: state.slice(0, 8) + "..." });

      return {
        provider: data.provider,
        createdAt: data.createdAt,
      };
    },

    /**
     * Check if a state exists (without consuming)
     * @param {string} state - The state value to check
     * @returns {Promise<boolean>}
     */
    async exists(state) {
      if (!state) {
        return false;
      }

      if (isRedisAvailable()) {
        const exists = await redis.validateOAuthState(state);
        if (exists) {
          return true;
        }
        // Also check memory store as fallback
      }

      // Memory fallback
      const data = memoryStore.get(state);

      if (!data) {
        return false;
      }

      // Check if expired
      if (data.expiresAt < Date.now()) {
        memoryStore.delete(state);
        return false;
      }

      return true;
    },

    /**
     * Get store statistics (for monitoring)
     * @returns {Promise<Object>}
     */
    async getStats() {
      const now = Date.now();
      let memoryActive = 0;
      let memoryExpired = 0;

      for (const [, value] of memoryStore.entries()) {
        if (value.expiresAt >= now) {
          memoryActive++;
        } else {
          memoryExpired++;
        }
      }

      return {
        backend: isRedisAvailable() ? "redis" : "memory",
        memory: {
          total: memoryStore.size,
          active: memoryActive,
          expired: memoryExpired,
        },
        ttlMs,
        ttlSec,
      };
    },

    /**
     * Clear all states (for testing)
     * @returns {Promise<void>}
     */
    async clear() {
      memoryStore.clear();
      if (isRedisAvailable()) {
        await redis.delByPattern("oauth:state:*");
      }
    },

    /**
     * Check if Redis is being used
     * @returns {boolean}
     */
    isUsingRedis: isRedisAvailable,
  };
};

module.exports = { createStateStoreService };
