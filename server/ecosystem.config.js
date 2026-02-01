/**
 * PM2 Ecosystem Configuration
 *
 * 4개 독립 프로세스 관리:
 * - sa-api: Express + Socket.io API 서버
 * - sa-broadcast-crawler: 방송 크롤링 + 자동 연결
 * - sa-category-crawler: 카테고리 크롤링 + 통계 기록
 * - sa-stats-worker: 통계 캐시 사전계산
 *
 * 사용법:
 *   pm2 start ecosystem.config.js
 *   pm2 stop ecosystem.config.js
 *   pm2 restart ecosystem.config.js
 *   pm2 status
 *   pm2 logs
 */

module.exports = {
  apps: [
    {
      name: "sa-api",
      script: "./processes/api.js",
      instances: 1,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "sa-broadcast-crawler",
      script: "./processes/broadcast-crawler.js",
      instances: 1,
      max_memory_restart: "384M",
      // 매일 새벽 4시 재시작 (메모리 정리)
      cron_restart: "0 4 * * *",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "sa-category-crawler",
      script: "./processes/category-crawler.js",
      instances: 1,
      max_memory_restart: "256M",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "sa-stats-worker",
      script: "./processes/stats-worker.js",
      instances: 1,
      max_memory_restart: "256M",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
