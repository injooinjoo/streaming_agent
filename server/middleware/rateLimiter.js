/**
 * Rate Limiting Middleware
 * Protects API endpoints from abuse and brute force attacks
 */

const rateLimit = require("express-rate-limit");

/**
 * Standard API rate limiter
 * 100 requests per minute per IP
 */
const standardLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
    retryAfter: "1분 후 다시 시도해주세요.",
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  validate: { xForwardedForHeader: false }, // Cloud Run proxy compatibility
});

/**
 * Strict rate limiter for authentication endpoints
 * 5 requests per minute per IP (prevents brute force)
 */
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute
  message: {
    error: "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.",
    retryAfter: "1분 후 다시 시도해주세요.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count all requests including successful ones
  validate: { xForwardedForHeader: false },
});

/**
 * OAuth rate limiter
 * 10 requests per minute per IP
 */
const oauthLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: {
    error: "OAuth 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
    retryAfter: "1분 후 다시 시도해주세요.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

/**
 * Very strict limiter for sensitive operations
 * 3 requests per 5 minutes per IP
 */
const sensitiveOpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // 3 requests per 5 minutes
  message: {
    error: "민감한 작업 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
    retryAfter: "5분 후 다시 시도해주세요.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

/**
 * Relaxed limiter for public read-only endpoints
 * 200 requests per minute per IP
 */
const publicLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200, // 200 requests per minute
  message: {
    error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
    retryAfter: "1분 후 다시 시도해주세요.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

/**
 * Create a custom rate limiter with specific options
 * @param {Object} options - Rate limit options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Maximum requests per window
 * @param {string} options.message - Error message
 * @returns {Function} Express middleware
 */
const createCustomLimiter = (options) => {
  return rateLimit({
    windowMs: options.windowMs || 60 * 1000,
    max: options.max || 100,
    message: {
      error: options.message || "요청이 너무 많습니다.",
      retryAfter: options.retryAfter || "잠시 후 다시 시도해주세요.",
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: options.skip || (() => false),
  });
};

module.exports = {
  standardLimiter,
  authLimiter,
  oauthLimiter,
  sensitiveOpLimiter,
  publicLimiter,
  createCustomLimiter,
};
