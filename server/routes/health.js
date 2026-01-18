/**
 * Health Check Routes
 * Provides liveness and readiness endpoints for container orchestration
 *
 * /health - Liveness probe (server is running)
 * /ready  - Readiness probe (all dependencies are ready)
 */

const express = require("express");
const { logger } = require("../services/logger");
const { getRedisService } = require("../services/redisService");
const { getSnowflakeService } = require("../services/snowflakeService");

/**
 * Create health check router
 * @param {Object} dependencies
 * @param {sqlite3.Database} dependencies.db - Database instance
 * @returns {express.Router}
 */
const createHealthRouter = ({ db }) => {
  const router = express.Router();
  const redisService = getRedisService();

  // Track server start time
  const startTime = Date.now();

  /**
   * Check database connectivity
   * @returns {Promise<{status: string, latency: number}>}
   */
  const checkDatabase = () => {
    return new Promise((resolve) => {
      const start = Date.now();

      db.get("SELECT 1 as test", [], (err) => {
        const latency = Date.now() - start;

        if (err) {
          logger.error("Database health check failed", { error: err.message });
          resolve({
            status: "unhealthy",
            latency,
            error: err.message,
          });
        } else {
          resolve({
            status: "healthy",
            latency,
          });
        }
      });
    });
  };

  /**
   * Check Redis connectivity
   * @returns {Promise<{status: string, latency: number}>}
   */
  const checkRedis = async () => {
    return redisService.healthCheck();
  };

  /**
   * Get memory usage
   * @returns {Object}
   */
  const getMemoryUsage = () => {
    const usage = process.memoryUsage();
    return {
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024),  // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
      rss: Math.round(usage.rss / 1024 / 1024),             // MB
      external: Math.round(usage.external / 1024 / 1024),   // MB
    };
  };

  /**
   * GET /health
   * Liveness probe - checks if the server is running
   * Returns 200 if server is alive
   */
  router.get("/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      version: process.env.npm_package_version || "1.0.0",
    });
  });

  /**
   * GET /ready
   * Readiness probe - checks if all dependencies are ready
   * Returns 200 if ready, 503 if not ready
   */
  router.get("/ready", async (req, res) => {
    const checks = {};
    let isReady = true;

    // Check database
    checks.database = await checkDatabase();
    if (checks.database.status !== "healthy") {
      isReady = false;
    }

    // Check Redis (future)
    checks.redis = await checkRedis();
    if (checks.redis.status === "unhealthy") {
      isReady = false;
    }

    const status = isReady ? "ready" : "not_ready";
    const httpStatus = isReady ? 200 : 503;

    res.status(httpStatus).json({
      status,
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      checks,
    });
  });

  /**
   * GET /health/detailed
   * Detailed health information (for internal use / admin)
   * Includes memory, version info, etc.
   */
  router.get("/health/detailed", async (req, res) => {
    const checks = {};

    // Database check
    checks.database = await checkDatabase();

    // Redis check (future)
    checks.redis = await checkRedis();

    // Snowflake check
    const snowflake = getSnowflakeService();
    checks.snowflake = snowflake.getStats();

    // Memory usage
    const memory = getMemoryUsage();

    // Overall status
    const isHealthy = checks.database.status === "healthy" &&
      (checks.redis.status === "healthy" || checks.redis.status === "not_configured");

    res.json({
      status: isHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      server: {
        uptime: Math.round(process.uptime()),
        startTime: new Date(startTime).toISOString(),
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || "development",
        version: process.env.npm_package_version || "1.0.0",
      },
      memory,
      checks,
    });
  });

  return router;
};

module.exports = { createHealthRouter };
