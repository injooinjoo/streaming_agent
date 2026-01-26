/**
 * Express Application Setup
 * Configures middleware and mounts all route modules
 *
 * Uses unified database (unified.db):
 * - Settings, users, ads, marketplace (formerly weflab_clone.db)
 * - Events, viewer stats, categories (formerly streaming_data.db)
 *
 * Note: overlayDb and streamingDb parameters are kept for backward compatibility
 * but now point to the same unified database instance.
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
  createMonitorRouter,
  createDesignsRouter,
  createMarketplaceRouter,
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
const { createDesignService } = require("./services/designService");
const UserSessionService = require("./services/userSessionService");
const ViewerEstimationService = require("./services/viewerEstimationService");

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
 * @param {sqlite3.Database} dependencies.overlayDb - Overlay database instance
 * @param {sqlite3.Database} dependencies.streamingDb - Streaming database instance
 * @param {Server} dependencies.io - Socket.io server instance
 * @param {Map} dependencies.activeAdapters - Active platform adapters map
 * @param {Function} dependencies.ChzzkAdapter - Chzzk adapter class
 * @param {Function} dependencies.SoopAdapter - SOOP adapter class
 * @param {Object} dependencies.normalizer - Event normalizer
 * @param {Object} dependencies.riotApi - Riot API client
 * @param {Object} dependencies.categoryService - Category service instance
 * @returns {express.Application}
 */
const createApp = ({
  overlayDb,
  streamingDb,
  io,
  activeAdapters,
  ChzzkAdapter,
  SoopAdapter,
  normalizer,
  riotApi,
  categoryService,
}) => {
  const app = express();

  // ===== Instantiate Services =====
  // Services using overlayDb (users, settings, ads, designs)
  const userService = createUserService(overlayDb);
  const settingsService = createSettingsService(overlayDb, io);
  const adService = createAdService(overlayDb, io);
  const designService = createDesignService(overlayDb, io);
  const stateStore = createStateStoreService({ ttl: 5 * 60 * 1000 }); // 5 minute TTL for OAuth state
  const tokenService = createTokenService();

  // Services using streamingDb (events)
  const eventService = createEventService(streamingDb);

  // Stats service (uses unified database connection internally)
  const statsService = createStatsService();

  // Viewer session tracking services (using streamingDb)
  const userSessionService = new UserSessionService(streamingDb);
  const viewerEstimationService = new ViewerEstimationService(streamingDb);

  // Create auth middleware with tokenService (supports blacklist checking)
  const authMiddleware = createAuthMiddleware(tokenService);

  // ===== Middleware =====
  app.use(cors());
  app.use(express.json());

  // Static files (monitor dashboard)
  app.use(express.static(path.join(__dirname, "public")));

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

  // ===== Frontend Static Files =====
  // Serve React client build
  const clientDistPath = path.join(__dirname, "../client/dist");
  app.use(express.static(clientDistPath));

  // ===== Mount Routes =====

  // Auth routes (includes OAuth with CSRF-protected state and JWT refresh)
  // Uses authMiddleware with blacklist checking for logout protection
  const authRouter = createAuthRouter(userService, stateStore, tokenService, authMiddleware);
  app.use("/api", authRouter);

  // Settings routes (global and user-specific) - uses overlayDb
  const settingsRouter = createSettingsRouter(settingsService, authMiddleware);
  app.use("/api", settingsRouter);

  // Overlay routes (public overlay access via hash) - uses overlayDb
  const overlayRouter = createOverlayRouter(overlayDb, io, authMiddleware);
  app.use("/api", overlayRouter);

  // Ads routes (slots, campaigns, impressions) - uses overlayDb
  const adsRouter = createAdsRouter(adService, userService, authMiddleware);
  app.use("/api", adsRouter);

  // Admin routes (dashboard, analytics, design review) - uses overlayDb
  const adminRouter = createAdminRouter(overlayDb, authenticateAdmin, developerLogin, designService);
  app.use("/api", adminRouter);

  // Designs routes (user design CRUD) - uses overlayDb
  const designsRouter = createDesignsRouter(designService, authMiddleware);
  app.use("/api", designsRouter);

  // Marketplace routes (public design browsing, install) - uses designService
  const marketplaceRouter = createMarketplaceRouter(designService, authMiddleware);
  app.use("/api", marketplaceRouter);

  // Stats routes (events, donations, revenue, viewer sessions) - uses both databases
  const statsRouter = createStatsRouter(
    eventService,
    statsService,
    activeAdapters,
    authMiddleware,
    userSessionService,
    viewerEstimationService
  );
  app.use("/api", statsRouter);

  // Platform routes (Chzzk, SOOP, events) - uses streamingDb for events
  const platformsRouter = createPlatformsRouter(
    io,
    activeAdapters,
    ChzzkAdapter,
    SoopAdapter,
    normalizer,
    streamingDb
  );
  app.use("/api", platformsRouter);

  // Game stats routes (Riot API)
  const gameStatsRouter = createGameStatsRouter(riotApi);
  app.use("/api", gameStatsRouter);

  // Categories routes - uses streamingDb
  const categoriesRouter = createCategoriesRouter(streamingDb, categoryService, authMiddleware);
  app.use("/api", categoriesRouter);

  // ===== Health Check Routes =====
  const healthRouter = createHealthRouter({ overlayDb, streamingDb });
  app.use("/", healthRouter);

  // ===== Monitor Routes (public, no auth) =====
  // Pass unified db (overlayDb and streamingDb are now the same)
  const monitorRouter = createMonitorRouter(overlayDb);
  app.use("/api", monitorRouter);

  // ===== SPA Fallback =====
  // Serve index.html for all non-API routes (React Router support)
  // Express 5 requires named wildcard: {*path} instead of just *
  app.get("/{*path}", (req, res, next) => {
    // Skip API routes and static files
    if (req.path.startsWith("/api") || req.path.startsWith("/socket.io")) {
      return next();
    }
    res.sendFile(path.join(__dirname, "../client/dist/index.html"));
  });

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
