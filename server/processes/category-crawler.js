#!/usr/bin/env node
/**
 * Category Crawler Process (sa-category-crawler)
 *
 * 카테고리 크롤링 + 통계 기록
 * - CategoryService.initialize() → 전체 크롤 + 4개 스케줄러 시작
 * - 전체크롤(24h), 시청자업데이트(5m), 통계기록(15m), 매핑리프레시(24h)
 * - Socket.io 없음 (io=null → emit skip)
 *
 * 사용법:
 *   node processes/category-crawler.js
 *   npm run process:category
 */

const { bootstrap, setupGracefulShutdown } = require("./shared");
const CategoryService = require("../services/categoryService");

let categoryService = null;

const main = async () => {
  const { db, logger: log } = await bootstrap("sa-category-crawler");

  // CategoryService 초기화 (io=null → emit skip)
  categoryService = new CategoryService(db, null);

  await categoryService.initialize();
  log.info("Category service initialized (crawlers + schedulers started)");

  // Graceful shutdown
  setupGracefulShutdown("sa-category-crawler", [
    () => {
      if (categoryService) {
        categoryService.shutdown();
        log.info("Category service stopped");
      }
    },
  ]);
};

main().catch((err) => {
  console.error("Fatal: Failed to start sa-category-crawler", err);
  process.exit(1);
});
