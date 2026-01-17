/**
 * Streaming Agent Server
 * Main entry point - initializes database, Socket.io, and Express app
 */

const http = require("http");
const { Server } = require("socket.io");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

// Validate environment variables before starting
const { validateEnv } = require("./config/validateEnv");
validateEnv(process.env.NODE_ENV === "production"); // Only exit in production

// Application modules
const { createApp } = require("./app");
const { initializeDatabase } = require("./db/init");
const { setupSocketHandlers } = require("./socket/handlers");

// Platform Adapters
const ChzzkAdapter = require("./adapters/chzzk");
const SoopAdapter = require("./adapters/soop");
const RiotAdapter = require("./adapters/riot");
const normalizer = require("./services/normalizer");

// Category Service
const CategoryService = require("./services/categoryService");

// Redis Service
const { getRedisService } = require("./services/redisService");

// Analytics Collector
const { initializeAnalyticsDatabase } = require("./db/init-analytics");
const AnalyticsCollector = require("./services/analytics/AnalyticsCollector");

// Logger
const { logger, db: dbLogger, socket: socketLogger } = require("./services/logger");

// ===== Configuration =====
const PORT = process.env.PORT || 3001;

// ===== Database Setup =====
const dbPath = path.resolve(__dirname, "weflab_clone.db");
const db = new sqlite3.Database(dbPath);

// ===== Platform Adapters =====
const activeAdapters = new Map();

// ===== Analytics Collector =====
let analyticsCollector = null;

// Riot Games API instance
const riotApi = new RiotAdapter({
  apiKey: process.env.RIOT_API_KEY,
  region: "kr",
});

// ===== Main Initialization =====
const main = async () => {
  try {
    // Initialize Redis connection (optional - will fallback to memory if not configured)
    const redisService = getRedisService();
    const redisConnected = await redisService.connect();
    if (redisConnected) {
      logger.info("Redis connected");
    } else {
      logger.info("Redis not configured, using in-memory fallback");
    }

    // Initialize database tables
    await initializeDatabase(db);
    dbLogger.info("Database ready");

    // Create HTTP server (app will be attached after initialization)
    const express = require("express");
    const placeholderApp = express();
    const server = http.createServer(placeholderApp);

    const io = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    // Initialize Category Service
    const categoryService = new CategoryService(db, io);
    await categoryService.initialize().catch((err) => {
      logger.error("Category service initialization error", { error: err.message, stack: err.stack });
    });

    // Initialize Analytics Database
    await initializeAnalyticsDatabase(db).catch((err) => {
      logger.error("Analytics database initialization error", { error: err.message, stack: err.stack });
    });
    logger.info("Analytics database initialized");

    // Auto-start Analytics Collector if enabled
    // Analytics collector will be started after server listen
    const shouldStartAnalytics = process.env.ANALYTICS_AUTO_START === 'true';
    if (shouldStartAnalytics) {
      analyticsCollector = new AnalyticsCollector(db, {
        maxWebSocketConnections: parseInt(process.env.ANALYTICS_MAX_WS || '100', 10),
        minViewersThreshold: parseInt(process.env.ANALYTICS_MIN_VIEWERS || '100', 10),
        snapshotIntervalSeconds: parseInt(process.env.ANALYTICS_SNAPSHOT_INTERVAL || '300', 10),
        apiPollingIntervalSeconds: parseInt(process.env.ANALYTICS_POLL_INTERVAL || '300', 10),
      });

      analyticsCollector.on('error', (err) => {
        logger.error('Analytics Collector error', { error: err.message, stack: err.stack });
      });

      analyticsCollector.on('api-poll-complete', (data) => {
        logger.info('Analytics API poll complete', data);
      });

      analyticsCollector.on('snapshot-complete', (data) => {
        logger.info('Analytics snapshot complete', data);
      });
    } else {
      logger.info('Analytics Collector not auto-started (set ANALYTICS_AUTO_START=true to enable)');
    }

    // Create Express app with all dependencies
    const app = createApp({
      db,
      io,
      activeAdapters,
      ChzzkAdapter,
      SoopAdapter,
      normalizer,
      riotApi,
      categoryService,
    });

    // Replace placeholder app with configured app
    server.removeAllListeners("request");
    server.on("request", app);

    // Setup Socket.io handlers
    setupSocketHandlers(io);

    // Store server reference for graceful shutdown
    module.exports.server = server;
    module.exports.db = db;
    module.exports.activeAdapters = activeAdapters;
    module.exports.analyticsCollector = analyticsCollector;

    // Start server
    server.listen(PORT, () => {
      logger.info("Server started", {
        port: PORT,
        environment: process.env.NODE_ENV || "development",
      });

      // Start analytics collector after server is listening (non-blocking for health checks)
      if (shouldStartAnalytics && analyticsCollector) {
        // Use setImmediate to ensure server is fully ready
        setImmediate(async () => {
          try {
            logger.info('Starting Analytics Collector...');
            await analyticsCollector.start();
            logger.info('Analytics Collector started automatically');
          } catch (err) {
            logger.error('Failed to start Analytics Collector', { error: err.message, stack: err.stack });
          }
        });
      }
    });
  } catch (error) {
    logger.fatal("Failed to initialize server", { error: error.message, stack: error.stack });
    process.exit(1);
  }
};

// ===== Graceful Shutdown =====
const shutdown = async () => {
  logger.info("Shutting down gracefully...");

  // Stop Analytics Collector
  if (analyticsCollector && analyticsCollector.isRunning) {
    try {
      await analyticsCollector.stop();
      logger.info("Analytics Collector stopped");
    } catch (err) {
      logger.error("Error stopping Analytics Collector", { error: err.message });
    }
  }

  // Disconnect all platform adapters
  for (const [key, adapter] of activeAdapters.entries()) {
    try {
      adapter.disconnect();
      logger.info("Disconnected adapter", { adapter: key });
    } catch (err) {
      logger.error("Error disconnecting adapter", { adapter: key, error: err.message });
    }
  }

  // Close Redis connection
  try {
    const redisService = getRedisService();
    await redisService.disconnect();
  } catch (err) {
    logger.error("Error closing Redis", { error: err.message });
  }

  // Close database connection
  db.close((err) => {
    if (err) {
      dbLogger.error("Error closing database", { error: err.message });
    } else {
      dbLogger.info("Database connection closed");
    }
  });

  // Close server if available
  if (module.exports.server) {
    module.exports.server.close(() => {
      logger.info("Server closed");
      process.exit(0);
    });
  } else {
    process.exit(0);
  }

  // Force exit after timeout
  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Start the application
main();
