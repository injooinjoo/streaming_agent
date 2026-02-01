#!/usr/bin/env node
/**
 * Stats Worker Process (sa-stats-worker)
 *
 * 통계 캐시 사전계산 워커
 * - StatsService, CategoryService(읽기전용), DesignService로 StatsCacheService 구성
 * - warmUp() → startSchedulers()
 * - Socket.io 의존성 없음
 *
 * 사용법:
 *   node processes/stats-worker.js
 *   npm run process:stats
 */

const { bootstrap, setupGracefulShutdown } = require("./shared");

const { createStatsService } = require("../services/statsService");
const { createDesignService } = require("../services/designService");
const CategoryService = require("../services/categoryService");
const { StatsCacheService } = require("../services/statsCacheService");

let statsCacheService = null;

const main = async () => {
  const { db, logger: log } = await bootstrap("sa-stats-worker");

  // 서비스 초기화
  const statsService = createStatsService();
  const categoryService = new CategoryService(db, null);
  const designService = createDesignService(db, null);

  // 카테고리 캐시 로드 (스케줄러 없이)
  await categoryService.initialize().catch((err) => {
    log.warn("Category cache load failed, continuing anyway", { error: err.message });
  });

  // StatsCacheService
  statsCacheService = new StatsCacheService({
    statsService,
    categoryService,
    designService,
  });

  // Warm up + 스케줄러 시작
  try {
    await statsCacheService.warmUp();
    log.info("Stats cache warmed up");
  } catch (err) {
    log.error("Stats cache warm-up error", { error: err.message });
  }

  statsCacheService.startSchedulers();
  log.info("Stats cache schedulers started");

  // Graceful shutdown
  setupGracefulShutdown("sa-stats-worker", [
    () => {
      if (statsCacheService) {
        statsCacheService.shutdown();
        log.info("Stats cache service stopped");
      }
    },
    () => {
      if (categoryService) {
        categoryService.shutdown();
      }
    },
  ]);
};

main().catch((err) => {
  console.error("Fatal: Failed to start sa-stats-worker", err);
  process.exit(1);
});
