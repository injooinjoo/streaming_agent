/**
 * Express Application Setup
 * Configures middleware and mounts all route modules
 */

const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

// Route factories
const {
  createAuthRouter,
  createSettingsRouter,
  createOverlayRouter,
  createAdsRouter,
  createAdminRouter,
  createStatsRouter,
  createPlatformsRouter,
  createGameStatsRouter,
  createCategoriesRouter,
  createAnalyticsRouter,
} = require("./routes");
const { createHealthRouter } = require("./routes/health");

// Service factories
const { createUserService } = require("./services/userService");
const { createSettingsService } = require("./services/settingsService");
const { createEventService } = require("./services/eventService");
const { createAdService } = require("./services/adService");
const { createStatsService } = require("./services/statsService");
const { createStateStoreService } = require("./services/stateStoreService");
const { createTokenService } = require("./services/tokenService");

// Middleware
const { authenticateToken, createAuthMiddleware } = require("./middleware/auth");
const { authenticateAdmin, developerLogin } = require("./middleware/adminAuth");
const {
  standardLimiter,
  authLimiter,
  oauthLimiter,
  publicLimiter,
} = require("./middleware/rateLimiter");
const { createRequestLogger } = require("./middleware/requestLogger");

// Logger
const { logger, api: apiLogger } = require("./services/logger");

/**
 * Create and configure Express application
 * @param {Object} dependencies - Application dependencies
 * @param {sqlite3.Database} dependencies.db - Database instance
 * @param {Server} dependencies.io - Socket.io server instance
 * @param {Map} dependencies.activeAdapters - Active platform adapters map
 * @param {Function} dependencies.ChzzkAdapter - Chzzk adapter class
 * @param {Function} dependencies.SoopAdapter - SOOP adapter class
 * @param {Object} dependencies.normalizer - Event normalizer
 * @param {Object} dependencies.riotApi - Riot API client
 * @param {Object} dependencies.categoryService - Category service instance
 * @param {Object} dependencies.snowflakeService - Snowflake sync service (optional)
 * @returns {express.Application}
 */
const createApp = ({
  db,
  io,
  activeAdapters,
  ChzzkAdapter,
  SoopAdapter,
  normalizer,
  riotApi,
  categoryService,
  snowflakeService = null,
}) => {
  const app = express();

  // ===== Instantiate Services =====
  const userService = createUserService(db);
  const settingsService = createSettingsService(db, io);
  const eventService = createEventService(db);
  const adService = createAdService(db, io);
  const statsService = createStatsService(db);
  const stateStore = createStateStoreService({ ttl: 5 * 60 * 1000 }); // 5 minute TTL for OAuth state
  const tokenService = createTokenService();

  // Create auth middleware with tokenService (supports blacklist checking)
  const authMiddleware = createAuthMiddleware(tokenService);

  // ===== Middleware =====
  app.use(cors());
  app.use(express.json());

  // Request logging
  app.use(createRequestLogger());

  // ===== Rate Limiting =====
  // Apply auth rate limiter to login/register endpoints
  app.use("/api/auth/login", authLimiter);
  app.use("/api/auth/register", authLimiter);
  app.use("/api/auth/refresh", authLimiter);

  // Apply OAuth rate limiter to OAuth endpoints
  app.use("/api/auth/google", oauthLimiter);
  app.use("/api/auth/naver", oauthLimiter);
  app.use("/api/auth/twitch", oauthLimiter);
  app.use("/api/auth/soop", oauthLimiter);

  // Apply public rate limiter to overlay endpoints (higher limit)
  app.use("/api/overlay", publicLimiter);
  app.use("/api/categories", publicLimiter);

  // Apply standard rate limiter to all other API endpoints
  app.use("/api", standardLimiter);

  // Production static file serving
  if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.join(__dirname, "../client/dist")));
  }

  // ===== Mount Routes =====

  // Auth routes (includes OAuth with CSRF-protected state and JWT refresh)
  // Uses authMiddleware with blacklist checking for logout protection
  const authRouter = createAuthRouter(userService, stateStore, tokenService, authMiddleware);
  app.use("/api", authRouter);

  // Settings routes (global and user-specific)
  const settingsRouter = createSettingsRouter(settingsService, authMiddleware);
  app.use("/api", settingsRouter);

  // Overlay routes (public overlay access via hash)
  const overlayRouter = createOverlayRouter(db, io, authMiddleware);
  app.use("/api", overlayRouter);

  // Ads routes (slots, campaigns, impressions)
  const adsRouter = createAdsRouter(adService, userService, authMiddleware);
  app.use("/api", adsRouter);

  // Admin routes (dashboard, analytics)
  const adminRouter = createAdminRouter(db, authenticateAdmin, developerLogin);
  app.use("/api", adminRouter);

  // Stats routes (events, donations, revenue)
  const statsRouter = createStatsRouter(eventService, statsService, activeAdapters, authenticateToken);
  app.use("/api", statsRouter);

  // Platform routes (Chzzk, SOOP, events)
  const platformsRouter = createPlatformsRouter(
    db,
    io,
    activeAdapters,
    ChzzkAdapter,
    SoopAdapter,
    normalizer,
    snowflakeService
  );
  app.use("/api", platformsRouter);

  // Game stats routes (Riot API)
  const gameStatsRouter = createGameStatsRouter(riotApi);
  app.use("/api", gameStatsRouter);

  // Categories routes (existing)
  const categoriesRouter = createCategoriesRouter(db, categoryService, authMiddleware);
  app.use("/api", categoriesRouter);

  // Analytics routes (Snowflake-powered)
  if (snowflakeService) {
    const analyticsRouter = createAnalyticsRouter(snowflakeService, authMiddleware);
    app.use("/api", analyticsRouter);
  }

  // ===== Health Check Routes =====
  const healthRouter = createHealthRouter({ db });
  app.use("/", healthRouter);

  // ===== SPA Fallback (Production) =====
  if (process.env.NODE_ENV === "production") {
    app.get("/{*path}", (req, res) => {
      res.sendFile(path.join(__dirname, "../client/dist/index.html"));
    });
  }

  // ===== Error Handler =====
  app.use((err, req, res, next) => {
    apiLogger.error("Unhandled error", {
      error: err.message,
      stack: process.env.NODE_ENV !== "production" ? err.stack : undefined,
      url: req.url,
      method: req.method,
      userId: req.user?.id,
    });
    res.status(err.status || 500).json({
      error: err.message || "Internal server error",
    });
  });

  return app;
};

module.exports = { createApp };
