#!/usr/bin/env node
/**
 * Crawler-Only Server
 *
 * 크롤링만 실행하는 독립 스크립트
 * - BroadcastCrawler로 SOOP/Chzzk 방송 수집
 * - Supabase에 데이터 저장
 * - API 서버 없이 크롤링만 수행
 *
 * 사용법:
 *   node crawler-only.js
 *   npm run crawler
 */

require("dotenv").config();
const { initializeDatabase, db } = require("./db/connections");
const BroadcastCrawler = require("./services/broadcastCrawler");
const ChzzkAdapter = require("./adapters/chzzk");
const SoopAdapter = require("./adapters/soop");
const EventNormalizer = require("./services/eventNormalizer");
const ViewerEngagementService = require("./services/viewerEngagementService");
const EventService = require("./services/eventService");
const CategoryService = require("./services/categoryService");
const { createLogger } = require("./services/logger");

const logger = createLogger("crawler-only");

// 활성 어댑터 관리
const activeAdapters = new Map();

let crawler = null;

const start = async () => {
  logger.info("🕷️ Starting Crawler-Only Server...");

  try {
    // 1. 데이터베이스 초기화
    await initializeDatabase();
    logger.info("Database connected");

    // 2. 서비스 초기화
    const normalizer = new EventNormalizer();
    const eventService = new EventService();
    const categoryService = new CategoryService();

    // 3. 카테고리 서비스 초기화
    await categoryService.initialize();
    logger.info("Category service initialized");

    // 4. 크롤러 시작
    crawler = new BroadcastCrawler(db, null, {
      ChzzkAdapter,
      SoopAdapter,
      activeAdapters,
      normalizer,
      ViewerEngagementService,
      eventService,
    });

    crawler.startScheduledCrawl();
    logger.info("Broadcast crawler started (5 min interval, auto-connect top 50)");

    // 상태 출력 (10분마다)
    setInterval(() => {
      const stats = crawler.getStats();
      logger.info("Crawler stats", {
        soop: stats.soop.connections,
        chzzk: stats.chzzk.connections,
        total: stats.totalAutoConnected,
      });
    }, 10 * 60 * 1000);

  } catch (error) {
    logger.fatal("Failed to start crawler", { error: error.message, stack: error.stack });
    process.exit(1);
  }
};

// Graceful Shutdown
const shutdown = async () => {
  logger.info("Shutting down crawler...");

  if (crawler) {
    try {
      crawler.stopScheduledCrawl();
      logger.info("Crawler stopped");
    } catch (err) {
      logger.error("Error stopping crawler", { error: err.message });
    }
  }

  // 활성 어댑터 정리
  for (const [key, adapter] of activeAdapters) {
    try {
      adapter.disconnect();
    } catch (err) {
      // ignore
    }
  }

  logger.info("Shutdown complete");
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// 시작
start();
