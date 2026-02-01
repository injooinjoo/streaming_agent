#!/usr/bin/env node
/**
 * API Server Process (sa-api)
 *
 * Express + Socket.io + 모든 라우트
 * 크롤러/스케줄러 없이 API만 서빙
 *
 * 사용법:
 *   node processes/api.js
 *   npm run process:api
 */

const { bootstrap, setupGracefulShutdown } = require("./shared");

const http = require("http");
const { Server } = require("socket.io");
const crypto = require("crypto");

const { createApp } = require("../app");
const { getOne, runQuery } = require("../db/connections");
const { setupSocketHandlers } = require("../socket/handlers");

// Platform Adapters
const ChzzkAdapter = require("../adapters/chzzk");
const SoopAdapter = require("../adapters/soop");
const TwitchAdapter = require("../adapters/twitch");
const YouTubeAdapter = require("../adapters/youtube");
const RiotAdapter = require("../adapters/riot");
const normalizer = require("../services/normalizer");

// Category Service (읽기 전용 — 스케줄러 시작 안 함)
const CategoryService = require("../services/categoryService");

// Redis Service
const { getRedisService } = require("../services/redisService");

const PORT = process.env.PORT || 3001;

// Demo User
const DEMO_USER = {
  email: "devil0108@soop.co.kr",
  displayName: "감스트",
  role: "admin",
  channelId: "devil0108",
  platform: "soop",
};

const initializeDemoUser = async (log) => {
  try {
    const user = await getOne(`SELECT * FROM users WHERE email = $1`, [DEMO_USER.email]);
    if (user) {
      log.info("Demo user loaded", { email: DEMO_USER.email });
      return user;
    }

    const overlayHash = crypto.randomBytes(8).toString("hex");
    await runQuery(
      `INSERT INTO users (email, display_name, role, overlay_hash, channel_id, platform) VALUES ($1, $2, $3, $4, $5, $6)`,
      [DEMO_USER.email, DEMO_USER.displayName, DEMO_USER.role, overlayHash, DEMO_USER.channelId, DEMO_USER.platform]
    );
    log.info("Demo user created", { email: DEMO_USER.email });
    return { ...DEMO_USER, overlay_hash: overlayHash };
  } catch (err) {
    log.error("Failed to initialize demo user", { error: err.message });
    return null;
  }
};

const main = async () => {
  const { db, logger: log } = await bootstrap("sa-api");

  // Redis (optional)
  const redisService = getRedisService();
  const redisConnected = await redisService.connect();
  log.info(redisConnected ? "Redis connected" : "Redis not configured, using in-memory fallback");

  // Demo user
  await initializeDemoUser(log);

  // Active adapters (수동 연결용)
  const activeAdapters = new Map();

  // Riot API
  const riotApi = new RiotAdapter({
    apiKey: process.env.RIOT_API_KEY,
    region: "kr",
  });

  // Category Service (DB에서 캐시만 로드, 스케줄러 없음)
  const categoryService = new CategoryService(db, null);

  // Express app
  const app = createApp({
    overlayDb: db,
    streamingDb: db,
    io: null,
    activeAdapters,
    ChzzkAdapter,
    SoopAdapter,
    TwitchAdapter,
    YouTubeAdapter,
    normalizer,
    riotApi,
    categoryService,
  });

  // HTTP + Socket.io
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    transports: ["websocket", "polling"],
    pingTimeout: 60000,
    pingInterval: 25000,
    upgradeTimeout: 30000,
  });

  app.set("io", io);
  categoryService.io = io;

  // Event service with io
  const { createEventService } = require("../services/eventService");
  const eventService = createEventService(db, io);

  // Socket handlers
  setupSocketHandlers(io, {
    db,
    ChzzkAdapter,
    SoopAdapter,
    eventService,
  });

  // Category: 크롤/스케줄러 없이 DB 캐시만 로드
  // initialize()는 크롤+스케줄러까지 시작하므로 API에서는 호출하지 않음
  // category-crawler 프로세스가 별도로 담당

  // Stats cache: warm up만, 스케줄러는 stats-worker에서 담당
  const statsCacheService = app.get("statsCacheService");
  if (statsCacheService) {
    statsCacheService.warmUp().catch((err) => {
      log.error("StatsCacheService warm-up error", { error: err.message });
    });
  }

  // Graceful shutdown
  setupGracefulShutdown("sa-api", [
    () => {
      for (const [, adapter] of activeAdapters) {
        try { adapter.disconnect(); } catch (_) {}
      }
    },
    () => redisService.disconnect(),
    () => new Promise((resolve) => server.close(resolve)),
  ]);

  // Start listening
  server.listen(PORT, "0.0.0.0", () => {
    log.info("API server started", { port: PORT, host: "0.0.0.0" });
  });
};

main().catch((err) => {
  console.error("Fatal: Failed to start sa-api", err);
  process.exit(1);
});
