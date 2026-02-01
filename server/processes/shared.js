#!/usr/bin/env node
/**
 * Shared Bootstrap Module
 *
 * 모든 독립 프로세스가 공유하는 초기화/종료 로직
 * - dotenv 로드
 * - 환경변수 검증
 * - PostgreSQL 연결
 * - Graceful shutdown 핸들러
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { validateEnv } = require("../config/validateEnv");
const { initializeDatabase, closeDatabase } = require("../db/connections");
const { createChildLogger, logger } = require("../services/logger");

/**
 * 프로세스 공통 부트스트랩
 * @param {string} processName - 프로세스 이름 (로그용)
 * @returns {Promise<{ db: pg.Pool, logger: Logger }>}
 */
async function bootstrap(processName) {
  const log = createChildLogger({ service: processName });

  log.info(`Starting ${processName}...`);

  // 환경변수 검증 (프로덕션에서만 실패 시 종료)
  validateEnv(process.env.NODE_ENV === "production");

  // PostgreSQL 연결
  const db = await initializeDatabase();
  log.info("Database connected");

  return { db, logger: log };
}

/**
 * Graceful shutdown 핸들러 등록
 * @param {string} processName - 프로세스 이름
 * @param {Function[]} cleanupFns - 정리 함수 배열 (각각 async)
 */
function setupGracefulShutdown(processName, cleanupFns = []) {
  const log = createChildLogger({ service: processName });

  const shutdown = async (signal) => {
    log.info(`Received ${signal}, shutting down ${processName}...`);

    for (const fn of cleanupFns) {
      try {
        await fn();
      } catch (err) {
        log.error(`Cleanup error: ${err.message}`);
      }
    }

    // DB 연결 종료
    try {
      await closeDatabase();
      log.info("Database connection closed");
    } catch (err) {
      log.error(`Database close error: ${err.message}`);
    }

    log.info(`${processName} shutdown complete`);
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  // 10초 타임아웃 강제 종료
  process.on("SIGTERM", () => {
    setTimeout(() => {
      log.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10000).unref();
  });
  process.on("SIGINT", () => {
    setTimeout(() => {
      log.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10000).unref();
  });
}

module.exports = { bootstrap, setupGracefulShutdown };
