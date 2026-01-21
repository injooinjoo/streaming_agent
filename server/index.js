/**
 * Streaming Agent Server
 * Main entry point - initializes database, Socket.io, and Express app
 *
 * Uses unified database (unified.db):
 * - Settings, users, ads, marketplace (formerly weflab_clone.db)
 * - Events, viewer stats, categories (formerly streaming_data.db)
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
const { initializeDatabase, closeDatabase, getDb } = require("./db/connections");
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
const crypto = require("crypto");

// ===== Demo User Initialization =====
const DEMO_USER = {
  email: 'devil0108@soop.co.kr',
  displayName: '감스트',
  role: 'admin',
  channelId: 'devil0108',
  platform: 'soop',
};

/**
 * Initialize demo user for development mode
 * Creates the user in DB if not exists, or returns existing user
 */
const initializeDemoUser = async (db) => {
  return new Promise((resolve) => {
    db.get("SELECT * FROM users WHERE email = ?", [DEMO_USER.email], (err, user) => {
      if (err) {
        logger.error("Failed to check demo user", { error: err.message });
        return resolve(null);
      }

      if (user) {
        // User exists, export the hash for auth middleware
        module.exports.demoUserOverlayHash = user.overlay_hash;
        logger.info("Demo user loaded", { email: DEMO_USER.email, overlayHash: user.overlay_hash });
        return resolve(user);
      }

      // Create new demo user with generated hash
      const overlayHash = crypto.randomBytes(8).toString("hex");
      db.run(
        `INSERT INTO users (email, display_name, role, overlay_hash) VALUES (?, ?, ?, ?)`,
        [DEMO_USER.email, DEMO_USER.displayName, DEMO_USER.role, overlayHash],
        function (err) {
          if (err) {
            logger.error("Failed to create demo user", { error: err.message });
            return resolve(null);
          }
          module.exports.demoUserOverlayHash = overlayHash;
          logger.info("Demo user created", { id: this.lastID, email: DEMO_USER.email, overlayHash });
          resolve({ id: this.lastID, ...DEMO_USER, overlay_hash: overlayHash });
        }
      );
    });
  });
};

// ===== Platform Adapters =====
const activeAdapters = new Map();

// Riot Games API instance
const riotApi = new RiotAdapter({
  apiKey: process.env.RIOT_API_KEY,
  region: "kr",
});

// Database reference (set during initialization)
let db = null;

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

    // Initialize unified database
    db = await initializeDatabase();
    dbLogger.info("Unified database ready");

    // Initialize demo user for development mode
    await initializeDemoUser(db);

    // Initialize Category Service with unified db (io will be set later)
    const categoryService = new CategoryService(db, null);

    // Initialize Event Service for storing chat/donation events (io will be set later)
    const { createEventService } = require("./services/eventService");

    // Create Express app with unified db (passed as both overlayDb and streamingDb for backward compatibility)
    // Note: io is not available yet, but app.js will receive it via req.app.get('io')
    const app = createApp({
      overlayDb: db,
      streamingDb: db,
      io: null, // Will be set after server creation
      activeAdapters,
      ChzzkAdapter,
      SoopAdapter,
      normalizer,
      riotApi,
      categoryService,
    });

    // Create HTTP server with Express app
    const server = http.createServer(app);

    // Initialize Socket.io on the server
    const io = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
      // WebSocket first to avoid sticky session issues on Fly.io
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
      upgradeTimeout: 30000,
    });

    // Store io on app for route access
    app.set("io", io);

    // Update services with io reference
    categoryService.io = io;
    const eventService = createEventService(db, io);

    // Setup Socket.io handlers
    setupSocketHandlers(io);
    socketLogger.info("Socket.io handlers initialized");

    // Store server reference for graceful shutdown
    module.exports.server = server;
    module.exports.db = db;
    module.exports.activeAdapters = activeAdapters;

    // Start server FIRST (before slow initialization tasks)
    server.listen(PORT, '0.0.0.0', () => {
      logger.info("Server started", {
        port: PORT,
        host: '0.0.0.0',
        environment: process.env.NODE_ENV || "development",
      });

      // Initialize Category Service in background (after server is listening)
      categoryService.initialize().then(() => {
        // Initialize Broadcast Crawler Service after category service is ready
        const broadcastCrawler = new BroadcastCrawler(db, io, {
          ChzzkAdapter,
          SoopAdapter,
          activeAdapters,
          normalizer,
          ViewerEngagementService,
          eventService,
        });
        broadcastCrawler.startScheduledCrawl();
        logger.info("Broadcast crawler started (5 min interval, auto-connect top 50)");
        module.exports.broadcastCrawler = broadcastCrawler;
      }).catch((err) => {
        logger.error("Category service initialization error", { error: err.message, stack: err.stack });
      });
    });
  } catch (error) {
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

  // Close unified database connection
  try {
    await closeDatabase();
  } catch (err) {
    dbLogger.error("Error closing database", { error: err.message });
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
