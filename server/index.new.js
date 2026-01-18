/**
 * Streaming Agent Server
 * Main entry point - initializes database, Socket.io, and Express app
 */

const http = require("http");
const { Server } = require("socket.io");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

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

// ===== Configuration =====
const PORT = process.env.PORT || 3001;

// ===== Database Setup =====
const dbPath = path.resolve(__dirname, "weflab_clone.db");
const db = new sqlite3.Database(dbPath);

// ===== Platform Adapters =====
const activeAdapters = new Map();

// Riot Games API instance
const riotApi = new RiotAdapter({
  apiKey: process.env.RIOT_API_KEY,
  region: "kr",
});

// ===== Server Setup =====
const express = require("express");
const tempApp = express();
const server = http.createServer(tempApp);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// ===== Main Initialization =====
const main = async () => {
  try {
    // Initialize database tables
    await initializeDatabase(db);
    console.log("Database ready.");

    // Initialize Category Service
    const categoryService = new CategoryService(db, io);
    await categoryService.initialize().catch((err) => {
      console.error("Category service initialization error:", err);
    });

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

    // Replace temp app with configured app
    server.removeAllListeners("request");
    server.on("request", app);

    // Setup Socket.io handlers
    setupSocketHandlers(io);

    // Start server
    server.listen(PORT, () => {
      console.log(`Server is listening on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    console.error("Failed to initialize server:", error);
    process.exit(1);
  }
};

// ===== Graceful Shutdown =====
const shutdown = () => {
  console.log("\nShutting down gracefully...");

  // Disconnect all platform adapters
  for (const [key, adapter] of activeAdapters.entries()) {
    try {
      adapter.disconnect();
      console.log(`Disconnected adapter: ${key}`);
    } catch (err) {
      console.error(`Error disconnecting adapter ${key}:`, err.message);
    }
  }

  // Close database connection
  db.close((err) => {
    if (err) {
      console.error("Error closing database:", err.message);
    } else {
      console.log("Database connection closed.");
    }
  });

  // Close server
  server.close(() => {
    console.log("Server closed.");
    process.exit(0);
  });

  // Force exit after timeout
  setTimeout(() => {
    console.error("Forced shutdown after timeout.");
    process.exit(1);
  }, 10000);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Start the application
main();
