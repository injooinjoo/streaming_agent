#!/usr/bin/env node
/**
 * Broadcast Crawler Process (sa-broadcast-crawler)
 *
 * 4개 플랫폼(SOOP, Chzzk, Twitch, YouTube) 라이브 방송 크롤링
 * - 5분 간격 스케줄 크롤
 * - 플랫폼별 top 50 자동 연결
 * - Socket.io 없음 (io=null → emit skip)
 *
 * 사용법:
 *   node processes/broadcast-crawler.js
 *   npm run process:broadcast
 */

const { bootstrap, setupGracefulShutdown } = require("./shared");

const BroadcastCrawler = require("../services/broadcastCrawler");
const ChzzkAdapter = require("../adapters/chzzk");
const SoopAdapter = require("../adapters/soop");
const TwitchAdapter = require("../adapters/twitch");
const YouTubeAdapter = require("../adapters/youtube");
const normalizer = require("../services/normalizer");
const ViewerEngagementService = require("../services/viewerEngagementService");
const { createEventService } = require("../services/eventService");

const activeAdapters = new Map();
let crawler = null;

const main = async () => {
  const { db, logger: log } = await bootstrap("sa-broadcast-crawler");

  // EventService (io=null → 소켓 emit 없음)
  const eventService = createEventService(db, null);

  // 크롤러 초기화
  crawler = new BroadcastCrawler(db, null, {
    ChzzkAdapter,
    SoopAdapter,
    TwitchAdapter,
    YouTubeAdapter,
    activeAdapters,
    normalizer,
    ViewerEngagementService,
    eventService,
  });

  crawler.startScheduledCrawl();
  log.info("Broadcast crawler started (5 min interval, auto-connect top 50)");

  // 상태 출력 (10분마다)
  setInterval(() => {
    const stats = crawler.getStats();
    log.info("Crawler stats", {
      soop: stats.soop?.connections || 0,
      chzzk: stats.chzzk?.connections || 0,
      twitch: stats.twitch?.connections || 0,
      youtube: stats.youtube?.connections || 0,
      total: stats.totalAutoConnected || 0,
    });
  }, 10 * 60 * 1000);

  // Graceful shutdown
  setupGracefulShutdown("sa-broadcast-crawler", [
    () => {
      if (crawler) crawler.stopScheduledCrawl();
      log.info("Crawler stopped");
    },
    () => {
      for (const [, adapter] of activeAdapters) {
        try { adapter.disconnect(); } catch (_) {}
      }
    },
  ]);
};

main().catch((err) => {
  console.error("Fatal: Failed to start sa-broadcast-crawler", err);
  process.exit(1);
});
