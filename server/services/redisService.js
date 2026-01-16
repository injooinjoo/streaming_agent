/**
 * Redis Service Module
 * Provides centralized Redis operations for caching, session management, and pub/sub
 *
 * Features:
 * - Connection management with automatic reconnection
 * - JWT token blacklist
 * - Rate limiting counters
 * - OAuth state storage
 * - Category data cache
 * - Generic cache operations
 */

const Redis = require("ioredis");
const { logger, db: dbLogger } = require("./logger");

// Redis key prefixes for organization
const KEY_PREFIXES = {
  TOKEN_BLACKLIST: "token:blacklist:",
  RATE_LIMIT: "ratelimit:",
  OAUTH_STATE: "oauth:state:",
  CATEGORY_CACHE: "cache:category:",
  SETTINGS_CACHE: "cache:settings:",
  USER_CACHE: "cache:user:",
  SESSION: "session:",
};

// Default TTLs (in seconds)
const DEFAULT_TTL = {
  TOKEN_BLACKLIST: 7 * 24 * 60 * 60, // 7 days (match JWT refresh token expiry)
  OAUTH_STATE: 5 * 60, // 5 minutes
  CATEGORY_CACHE: 60 * 60, // 1 hour
  SETTINGS_CACHE: 5 * 60, // 5 minutes
  USER_CACHE: 15 * 60, // 15 minutes
  RATE_LIMIT: 60, // 1 minute
};

/**
 * Create Redis service instance
 * @param {Object} options - Redis configuration options
 * @returns {Object} Redis service instance
 */
const createRedisService = (options = {}) => {
  const redisUrl = options.url || process.env.REDIS_URL;
  let client = null;
  let subscriber = null;
  let isConnected = false;

  // Configuration
  const config = {
    maxRetriesPerRequest: options.maxRetries || 3,
    retryStrategy: (times) => {
      if (times > 10) {
        logger.error("Redis max retries exceeded, stopping reconnection");
        return null;
      }
      const delay = Math.min(times * 100, 3000);
      logger.warn(`Redis reconnecting in ${delay}ms (attempt ${times})`);
      return delay;
    },
    lazyConnect: true,
    enableReadyCheck: true,
    ...options,
  };

  /**
   * Initialize Redis connection
   * @returns {Promise<boolean>}
   */
  const connect = async () => {
    if (!redisUrl) {
      logger.info("Redis URL not configured, using in-memory fallback");
      return false;
    }

    try {
      client = new Redis(redisUrl, config);
      subscriber = new Redis(redisUrl, config);

      // Connection event handlers
      client.on("connect", () => {
        logger.info("Redis client connecting...");
      });

      client.on("ready", () => {
        isConnected = true;
        logger.info("Redis client ready");
      });

      client.on("error", (err) => {
        logger.error("Redis client error", { error: err.message });
      });

      client.on("close", () => {
        isConnected = false;
        logger.warn("Redis connection closed");
      });

      client.on("reconnecting", (delay) => {
        logger.info("Redis reconnecting", { delay });
      });

      // Connect both clients
      await Promise.all([client.connect(), subscriber.connect()]);
      isConnected = true;
      logger.info("Redis connected successfully");
      return true;
    } catch (error) {
      logger.error("Failed to connect to Redis", { error: error.message });
      isConnected = false;
      return false;
    }
  };

  /**
   * Get connection status
   * @returns {boolean}
   */
  const getIsConnected = () => isConnected;

  /**
   * Get Redis client for direct operations
   * @returns {Redis|null}
   */
  const getClient = () => client;

  /**
   * Get subscriber client for pub/sub
   * @returns {Redis|null}
   */
  const getSubscriber = () => subscriber;

  // ===== Generic Cache Operations =====

  /**
   * Set a value with optional TTL
   * @param {string} key - Cache key
   * @param {*} value - Value to cache (will be JSON stringified if object)
   * @param {number} [ttl] - Time to live in seconds
   * @returns {Promise<boolean>}
   */
  const set = async (key, value, ttl = null) => {
    if (!isConnected) return false;
    try {
      const stringValue = typeof value === "object" ? JSON.stringify(value) : String(value);
      if (ttl) {
        await client.setex(key, ttl, stringValue);
      } else {
        await client.set(key, stringValue);
      }
      return true;
    } catch (error) {
      logger.error("Redis set error", { key, error: error.message });
      return false;
    }
  };

  /**
   * Get a value
   * @param {string} key - Cache key
   * @param {boolean} [parseJson=true] - Whether to parse as JSON
   * @returns {Promise<*>}
   */
  const get = async (key, parseJson = true) => {
    if (!isConnected) return null;
    try {
      const value = await client.get(key);
      if (value === null) return null;
      if (parseJson) {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
      return value;
    } catch (error) {
      logger.error("Redis get error", { key, error: error.message });
      return null;
    }
  };

  /**
   * Delete a key
   * @param {string} key - Cache key
   * @returns {Promise<boolean>}
   */
  const del = async (key) => {
    if (!isConnected) return false;
    try {
      await client.del(key);
      return true;
    } catch (error) {
      logger.error("Redis del error", { key, error: error.message });
      return false;
    }
  };

  /**
   * Delete keys by pattern
   * @param {string} pattern - Key pattern (e.g., "cache:*")
   * @returns {Promise<number>} Number of deleted keys
   */
  const delByPattern = async (pattern) => {
    if (!isConnected) return 0;
    try {
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(...keys);
      }
      return keys.length;
    } catch (error) {
      logger.error("Redis delByPattern error", { pattern, error: error.message });
      return 0;
    }
  };

  /**
   * Check if key exists
   * @param {string} key - Cache key
   * @returns {Promise<boolean>}
   */
  const exists = async (key) => {
    if (!isConnected) return false;
    try {
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error("Redis exists error", { key, error: error.message });
      return false;
    }
  };

  /**
   * Set key expiration
   * @param {string} key - Cache key
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>}
   */
  const expire = async (key, ttl) => {
    if (!isConnected) return false;
    try {
      await client.expire(key, ttl);
      return true;
    } catch (error) {
      logger.error("Redis expire error", { key, error: error.message });
      return false;
    }
  };

  // ===== JWT Token Blacklist =====

  /**
   * Add token to blacklist (for logout/revocation)
   * @param {string} token - JWT token or token ID
   * @param {number} [ttl] - Time to live in seconds (should match token expiry)
   * @returns {Promise<boolean>}
   */
  const blacklistToken = async (token, ttl = DEFAULT_TTL.TOKEN_BLACKLIST) => {
    const key = KEY_PREFIXES.TOKEN_BLACKLIST + token;
    return set(key, "1", ttl);
  };

  /**
   * Check if token is blacklisted
   * @param {string} token - JWT token or token ID
   * @returns {Promise<boolean>}
   */
  const isTokenBlacklisted = async (token) => {
    const key = KEY_PREFIXES.TOKEN_BLACKLIST + token;
    return exists(key);
  };

  // ===== Rate Limiting =====

  /**
   * Increment rate limit counter
   * @param {string} identifier - Unique identifier (IP, user ID, etc.)
   * @param {string} action - Action being rate limited
   * @param {number} windowSeconds - Time window in seconds
   * @returns {Promise<{count: number, remaining: number, reset: number}>}
   */
  const incrementRateLimit = async (identifier, action, windowSeconds = DEFAULT_TTL.RATE_LIMIT) => {
    if (!isConnected) {
      return { count: 0, remaining: Infinity, reset: 0 };
    }

    const key = `${KEY_PREFIXES.RATE_LIMIT}${action}:${identifier}`;

    try {
      const multi = client.multi();
      multi.incr(key);
      multi.ttl(key);

      const results = await multi.exec();
      const count = results[0][1];
      let ttl = results[1][1];

      // Set expiry if this is a new key
      if (ttl === -1) {
        await client.expire(key, windowSeconds);
        ttl = windowSeconds;
      }

      return {
        count,
        remaining: Math.max(0, 100 - count), // Assuming 100 requests/window
        reset: ttl,
      };
    } catch (error) {
      logger.error("Redis rate limit error", { identifier, action, error: error.message });
      return { count: 0, remaining: Infinity, reset: 0 };
    }
  };

  /**
   * Get current rate limit count
   * @param {string} identifier - Unique identifier
   * @param {string} action - Action being rate limited
   * @returns {Promise<number>}
   */
  const getRateLimitCount = async (identifier, action) => {
    if (!isConnected) return 0;
    const key = `${KEY_PREFIXES.RATE_LIMIT}${action}:${identifier}`;
    const count = await get(key, false);
    return count ? parseInt(count, 10) : 0;
  };

  // ===== OAuth State Management =====

  /**
   * Store OAuth state for CSRF protection
   * @param {string} state - OAuth state parameter
   * @param {Object} data - State data (provider, redirect, etc.)
   * @returns {Promise<boolean>}
   */
  const setOAuthState = async (state, data) => {
    const key = KEY_PREFIXES.OAUTH_STATE + state;
    return set(key, data, DEFAULT_TTL.OAUTH_STATE);
  };

  /**
   * Get and consume OAuth state (one-time use)
   * @param {string} state - OAuth state parameter
   * @returns {Promise<Object|null>}
   */
  const getOAuthState = async (state) => {
    const key = KEY_PREFIXES.OAUTH_STATE + state;
    const data = await get(key);
    if (data) {
      await del(key); // Consume the state
    }
    return data;
  };

  /**
   * Validate OAuth state exists (without consuming)
   * @param {string} state - OAuth state parameter
   * @returns {Promise<boolean>}
   */
  const validateOAuthState = async (state) => {
    const key = KEY_PREFIXES.OAUTH_STATE + state;
    return exists(key);
  };

  // ===== Category Cache =====

  /**
   * Cache category data
   * @param {string} cacheKey - Category cache key
   * @param {*} data - Category data
   * @param {number} [ttl] - TTL in seconds
   * @returns {Promise<boolean>}
   */
  const setCategoryCache = async (cacheKey, data, ttl = DEFAULT_TTL.CATEGORY_CACHE) => {
    const key = KEY_PREFIXES.CATEGORY_CACHE + cacheKey;
    return set(key, data, ttl);
  };

  /**
   * Get cached category data
   * @param {string} cacheKey - Category cache key
   * @returns {Promise<*>}
   */
  const getCategoryCache = async (cacheKey) => {
    const key = KEY_PREFIXES.CATEGORY_CACHE + cacheKey;
    return get(key);
  };

  /**
   * Invalidate category cache
   * @param {string} [cacheKey] - Specific cache key or null for all
   * @returns {Promise<number>}
   */
  const invalidateCategoryCache = async (cacheKey = null) => {
    if (cacheKey) {
      const key = KEY_PREFIXES.CATEGORY_CACHE + cacheKey;
      return (await del(key)) ? 1 : 0;
    }
    return delByPattern(KEY_PREFIXES.CATEGORY_CACHE + "*");
  };

  // ===== Settings Cache =====

  /**
   * Cache settings data
   * @param {string} settingsKey - Settings key
   * @param {*} data - Settings data
   * @param {number} [ttl] - TTL in seconds
   * @returns {Promise<boolean>}
   */
  const setSettingsCache = async (settingsKey, data, ttl = DEFAULT_TTL.SETTINGS_CACHE) => {
    const key = KEY_PREFIXES.SETTINGS_CACHE + settingsKey;
    return set(key, data, ttl);
  };

  /**
   * Get cached settings
   * @param {string} settingsKey - Settings key
   * @returns {Promise<*>}
   */
  const getSettingsCache = async (settingsKey) => {
    const key = KEY_PREFIXES.SETTINGS_CACHE + settingsKey;
    return get(key);
  };

  /**
   * Invalidate settings cache
   * @param {string} [settingsKey] - Specific key or null for all
   * @returns {Promise<number>}
   */
  const invalidateSettingsCache = async (settingsKey = null) => {
    if (settingsKey) {
      const key = KEY_PREFIXES.SETTINGS_CACHE + settingsKey;
      return (await del(key)) ? 1 : 0;
    }
    return delByPattern(KEY_PREFIXES.SETTINGS_CACHE + "*");
  };

  // ===== User Cache =====

  /**
   * Cache user data
   * @param {number} userId - User ID
   * @param {Object} data - User data
   * @param {number} [ttl] - TTL in seconds
   * @returns {Promise<boolean>}
   */
  const setUserCache = async (userId, data, ttl = DEFAULT_TTL.USER_CACHE) => {
    const key = KEY_PREFIXES.USER_CACHE + userId;
    return set(key, data, ttl);
  };

  /**
   * Get cached user data
   * @param {number} userId - User ID
   * @returns {Promise<Object|null>}
   */
  const getUserCache = async (userId) => {
    const key = KEY_PREFIXES.USER_CACHE + userId;
    return get(key);
  };

  /**
   * Invalidate user cache
   * @param {number} userId - User ID
   * @returns {Promise<boolean>}
   */
  const invalidateUserCache = async (userId) => {
    const key = KEY_PREFIXES.USER_CACHE + userId;
    return del(key);
  };

  // ===== Health Check =====

  /**
   * Check Redis health
   * @returns {Promise<{status: string, latency: number}>}
   */
  const healthCheck = async () => {
    if (!isConnected || !client) {
      return {
        status: "not_configured",
        latency: 0,
      };
    }

    const start = Date.now();
    try {
      await client.ping();
      return {
        status: "healthy",
        latency: Date.now() - start,
      };
    } catch (error) {
      logger.error("Redis health check failed", { error: error.message });
      return {
        status: "unhealthy",
        latency: Date.now() - start,
        error: error.message,
      };
    }
  };

  // ===== Cleanup =====

  /**
   * Close Redis connections
   * @returns {Promise<void>}
   */
  const disconnect = async () => {
    try {
      if (client) {
        await client.quit();
        client = null;
      }
      if (subscriber) {
        await subscriber.quit();
        subscriber = null;
      }
      isConnected = false;
      logger.info("Redis connections closed");
    } catch (error) {
      logger.error("Error closing Redis connections", { error: error.message });
    }
  };

  return {
    // Connection
    connect,
    disconnect,
    getIsConnected,
    getClient,
    getSubscriber,

    // Generic operations
    set,
    get,
    del,
    delByPattern,
    exists,
    expire,

    // Token blacklist
    blacklistToken,
    isTokenBlacklisted,

    // Rate limiting
    incrementRateLimit,
    getRateLimitCount,

    // OAuth state
    setOAuthState,
    getOAuthState,
    validateOAuthState,

    // Category cache
    setCategoryCache,
    getCategoryCache,
    invalidateCategoryCache,

    // Settings cache
    setSettingsCache,
    getSettingsCache,
    invalidateSettingsCache,

    // User cache
    setUserCache,
    getUserCache,
    invalidateUserCache,

    // Health
    healthCheck,

    // Constants
    KEY_PREFIXES,
    DEFAULT_TTL,
  };
};

// Singleton instance for application-wide use
let redisServiceInstance = null;

/**
 * Get or create Redis service singleton
 * @param {Object} [options] - Redis configuration options
 * @returns {Object}
 */
const getRedisService = (options = {}) => {
  if (!redisServiceInstance) {
    redisServiceInstance = createRedisService(options);
  }
  return redisServiceInstance;
};

module.exports = {
  createRedisService,
  getRedisService,
  KEY_PREFIXES,
  DEFAULT_TTL,
};
