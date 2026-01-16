/**
 * Request Logger Middleware
 * HTTP request/response logging with pino-http
 */

const pinoHttp = require("pino-http");
const { logger } = require("../services/logger");
const crypto = require("crypto");

// Generate unique request ID
const generateRequestId = () => {
  return crypto.randomUUID();
};

// Determine if request should be logged
const shouldLog = (req) => {
  // Skip health check endpoints to reduce noise
  const skipPaths = ["/health", "/ready", "/api/health"];
  return !skipPaths.includes(req.url);
};

// Create pino-http middleware
const createRequestLogger = () => {
  const isDevelopment = process.env.NODE_ENV !== "production";

  return pinoHttp({
    logger,

    // Generate request ID
    genReqId: (req) => {
      return req.headers["x-request-id"] || generateRequestId();
    },

    // Custom log level based on response status
    customLogLevel: (req, res, err) => {
      if (res.statusCode >= 500 || err) {
        return "error";
      }
      if (res.statusCode >= 400) {
        return "warn";
      }
      if (res.statusCode >= 300) {
        return "silent"; // Redirects - don't log
      }
      return "info";
    },

    // Custom success message
    customSuccessMessage: (req, res) => {
      return `${req.method} ${req.url} completed`;
    },

    // Custom error message
    customErrorMessage: (req, res, err) => {
      return `${req.method} ${req.url} failed: ${err.message}`;
    },

    // Custom attribute keys
    customAttributeKeys: {
      req: "request",
      res: "response",
      err: "error",
      responseTime: "duration",
    },

    // Additional request properties to log
    customProps: (req, res) => {
      const props = {
        userAgent: req.headers["user-agent"],
        contentLength: req.headers["content-length"],
      };

      // Add user ID if authenticated
      if (req.user) {
        props.userId = req.user.id;
        props.userEmail = req.user.email;
      }

      return props;
    },

    // Serializers
    serializers: {
      req: (req) => ({
        id: req.id,
        method: req.method,
        url: req.url,
        query: req.query,
        remoteAddress:
          req.headers["x-forwarded-for"]?.split(",")[0] ||
          req.socket?.remoteAddress,
      }),
      res: (res) => ({
        statusCode: res.statusCode,
      }),
      err: (err) => ({
        type: err.constructor.name,
        message: err.message,
        stack: isDevelopment ? err.stack : undefined,
      }),
    },

    // Auto-logging
    autoLogging: {
      ignore: (req) => !shouldLog(req),
    },

    // Quiet request start in production
    quietReqLogger: !isDevelopment,

    // Redact sensitive data
    redact: {
      paths: [
        "request.headers.authorization",
        "request.headers.cookie",
        "response.headers['set-cookie']",
      ],
      censor: "[REDACTED]",
    },
  });
};

// Export configured middleware
module.exports = { createRequestLogger };
