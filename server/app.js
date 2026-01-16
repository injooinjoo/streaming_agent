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
} = require("./routes");

// Service factories
const { createUserService } = require("./services/userService");
const { createSettingsService } = require("./services/settingsService");
const { createEventService } = require("./services/eventService");
const { createAdService } = require("./services/adService");
const { createStatsService } = require("./services/statsService");

// Middleware
const { authenticateToken } = require("./middleware/auth");
const { authenticateAdmin, developerLogin } = require("./middleware/adminAuth");

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
}) => {
  const app = express();

  // ===== Instantiate Services =====
  const userService = createUserService(db);
  const settingsService = createSettingsService(db, io);
  const eventService = createEventService(db);
  const adService = createAdService(db, io);
  const statsService = createStatsService(db);

  // ===== Middleware =====
  app.use(cors());
  app.use(express.json());

  // Production static file serving
  if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.join(__dirname, "../client/dist")));
  }

  // ===== Mount Routes =====

  // Auth routes (includes OAuth)
  const authRouter = createAuthRouter(userService, authenticateToken);
  app.use("/api", authRouter);

  // Settings routes (global and user-specific)
  const settingsRouter = createSettingsRouter(settingsService, authenticateToken);
  app.use("/api", settingsRouter);

  // Overlay routes (public overlay access via hash)
  const overlayRouter = createOverlayRouter(db, io, authenticateToken);
  app.use("/api", overlayRouter);

  // Ads routes (slots, campaigns, impressions)
  const adsRouter = createAdsRouter(adService, userService, authenticateToken);
  app.use("/api", adsRouter);

  // Admin routes (dashboard, analytics)
  const adminRouter = createAdminRouter(db, authenticateAdmin, developerLogin);
  app.use("/api", adminRouter);

  // Stats routes (events, donations, revenue)
  const statsRouter = createStatsRouter(eventService, statsService, activeAdapters);
  app.use("/api", statsRouter);

  // Platform routes (Chzzk, SOOP, events)
  const platformsRouter = createPlatformsRouter(
    db,
    io,
    activeAdapters,
    ChzzkAdapter,
    SoopAdapter,
    normalizer
  );
  app.use("/api", platformsRouter);

  // Game stats routes (Riot API)
  const gameStatsRouter = createGameStatsRouter(riotApi);
  app.use("/api", gameStatsRouter);

  // Categories routes (existing)
  const categoriesRouter = createCategoriesRouter(db, categoryService, authenticateToken);
  app.use("/api", categoriesRouter);

  // ===== Health Check =====
  app.get("/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // ===== SPA Fallback (Production) =====
  if (process.env.NODE_ENV === "production") {
    app.get("/{*path}", (req, res) => {
      res.sendFile(path.join(__dirname, "../client/dist/index.html"));
    });
  }

  // ===== Error Handler =====
  app.use((err, req, res, next) => {
    console.error("Error:", err.message);
    res.status(err.status || 500).json({
      error: err.message || "Internal server error",
    });
  });

  return app;
};

module.exports = { createApp };
