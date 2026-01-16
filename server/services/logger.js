/**
 * Logger Service
 * Structured logging with Pino
 *
 * Features:
 * - JSON structured logging
 * - Request ID tracking
 * - Sensitive data masking
 * - Log levels (debug/info/warn/error)
 * - Pretty printing in development
 */

const pino = require("pino");

// Determine environment
const isDevelopment = process.env.NODE_ENV !== "production";

// Fields to redact from logs (sensitive data)
const redactFields = [
  "password",
  "accessToken",
  "refreshToken",
  "token",
  "authorization",
  "cookie",
  "req.headers.authorization",
  "req.headers.cookie",
  "res.headers['set-cookie']",
  "body.password",
  "body.accessCode",
  "body.token",
  "body.refreshToken",
];

// Base logger configuration
const loggerConfig = {
  level: process.env.LOG_LEVEL || (isDevelopment ? "debug" : "info"),

  // Redact sensitive fields
  redact: {
    paths: redactFields,
    censor: "[REDACTED]",
  },

  // Base fields included in every log
  base: {
    pid: process.pid,
    env: process.env.NODE_ENV || "development",
  },

  // Timestamp format
  timestamp: pino.stdTimeFunctions.isoTime,

  // Custom serializers
  serializers: {
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: req.url,
      query: req.query,
      params: req.params,
      remoteAddress: req.ip || req.remoteAddress,
      userAgent: req.headers?.["user-agent"],
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
    err: pino.stdSerializers.err,
  },
};

// Create transport based on environment
const transport = isDevelopment
  ? {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname",
        singleLine: false,
      },
    }
  : undefined;

// Create the base logger
const logger = pino(loggerConfig, transport ? pino.transport(transport) : undefined);

/**
 * Create a child logger with additional context
 * @param {Object} bindings - Additional context fields
 * @returns {Logger} Child logger instance
 */
const createChildLogger = (bindings) => {
  return logger.child(bindings);
};

/**
 * Create a request-scoped logger
 * @param {string} requestId - Request ID
 * @param {Object} additionalContext - Additional context
 * @returns {Logger} Request-scoped logger
 */
const createRequestLogger = (requestId, additionalContext = {}) => {
  return logger.child({
    requestId,
    ...additionalContext,
  });
};

/**
 * Log with context helper
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} context - Additional context
 */
const logWithContext = (level, message, context = {}) => {
  logger[level](context, message);
};

// Convenience methods with context
const loggers = {
  // Base logger
  logger,

  // Create child loggers
  createChildLogger,
  createRequestLogger,

  // Service-specific loggers
  auth: createChildLogger({ service: "auth" }),
  db: createChildLogger({ service: "database" }),
  socket: createChildLogger({ service: "socket" }),
  api: createChildLogger({ service: "api" }),
  category: createChildLogger({ service: "category" }),
  platform: createChildLogger({ service: "platform" }),

  // Direct logging methods
  debug: (msg, ctx) => logger.debug(ctx, msg),
  info: (msg, ctx) => logger.info(ctx, msg),
  warn: (msg, ctx) => logger.warn(ctx, msg),
  error: (msg, ctx) => logger.error(ctx, msg),
  fatal: (msg, ctx) => logger.fatal(ctx, msg),

  // Utility
  logWithContext,
};

module.exports = loggers;
