/**
 * Streaming Agent Server
 * Main entry point - initializes databases, Socket.io, and Express app
 *
 * Uses two separate databases:
 * - overlayDb (weflab_clone.db): Settings, users, ads, marketplace
 * - streamingDb (streaming_data.db): Events, viewer stats, categories
 */

const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

// Validate environment variables before starting
const { validateEnv } = require("./config/validateEnv");
validateEnv(process.env.NODE_ENV === "production"); // Only exit in production

// Application modules
const { createApp } = require("./app");
const { initializeDatabases, closeDatabases } = require("./db/connections");
const { setupSocketHandlers } = require("./socket/handlers");

// Platform Adapters
const ChzzkAdapter = require("./adapters/chzzk");
const SoopAdapter = require("./adapters/soop");
const RiotAdapter = require("./adapters/riot");
const normalizer = require("./services/normalizer");

// Category Service
const CategoryService = require("./services/categoryService");

// Broadcast Crawler Service
const BroadcastCrawler = require("./services/broadcastCrawler");
const ViewerEngagementService = require("./services/viewerEngagementService");

// Redis Service
const { getRedisService } = require("./services/redisService");

// Logger
const { logger, db: dbLogger, socket: socketLogger } = require("./services/logger");

// ===== Configuration =====
const PORT = process.env.PORT || 3001;

// ===== Platform Adapters =====
const activeAdapters = new Map();

// Riot Games API instance
const riotApi = new RiotAdapter({
  apiKey: process.env.RIOT_API_KEY,
  region: "kr",
});

// Database references (set during initialization)
let overlayDb = null;
let streamingDb = null;

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

    // Initialize both databases
    const databases = await initializeDatabases();
    overlayDb = databases.overlayDb;
    streamingDb = databases.streamingDb;
    dbLogger.info("Both databases ready");

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

    // Initialize Category Service with streamingDb
    const categoryService = new CategoryService(streamingDb, io);
    await categoryService.initialize().catch((err) => {
      logger.error("Category service initialization error", { error: err.message, stack: err.stack });
    });

    // Initialize Broadcast Crawler Service with streamingDb and auto-connection options
    const broadcastCrawler = new BroadcastCrawler(streamingDb, io, {
      ChzzkAdapter,
      SoopAdapter,
      activeAdapters,
      normalizer,
      ViewerEngagementService,
    });
    broadcastCrawler.startScheduledCrawl();
    logger.info("Broadcast crawler started (5 min interval, auto-connect top 50)");

    // Create Express app with all dependencies
    const app = createApp({
      overlayDb,
      streamingDb,
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
    module.exports.overlayDb = overlayDb;
    module.exports.streamingDb = streamingDb;
    module.exports.activeAdapters = activeAdapters;
    module.exports.broadcastCrawler = broadcastCrawler;

    // Start server
    server.listen(PORT, () => {
      logger.info("Server started", {
        port: PORT,
        environment: process.env.NODE_ENV || "development",
      });
    });
  } catch (error) {
    console.error("=== SERVER INITIALIZATION ERROR ===");
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);
    console.error("Full error:", error);
    logger.fatal("Failed to initialize server", { error: error.message, stack: error.stack });
    process.exit(1);
  }
};

// ===== Graceful Shutdown =====
const shutdown = async () => {
  logger.info("Shutting down gracefully...");

  // Stop broadcast crawler
  if (module.exports.broadcastCrawler) {
    try {
      module.exports.broadcastCrawler.stopScheduledCrawl();
      logger.info("Broadcast crawler stopped");
    } catch (err) {
      logger.error("Error stopping broadcast crawler", { error: err.message });
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

  // Close both database connections
  try {
    await closeDatabases();
  } catch (err) {
    dbLogger.error("Error closing databases", { error: err.message });
  }

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
