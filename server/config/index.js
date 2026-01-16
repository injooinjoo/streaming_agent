/**
 * Configuration Loader
 * Loads environment-specific configuration with defaults
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const environment = process.env.NODE_ENV || "development";

// Base configuration (shared across all environments)
const baseConfig = {
  // Server
  port: parseInt(process.env.PORT, 10) || 3001,
  environment,

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    accessTokenExpiry: "15m",
    refreshTokenExpiry: "7d",
  },

  // OAuth Providers
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackUrl: process.env.GOOGLE_CALLBACK_URL,
    },
    naver: {
      clientId: process.env.NAVER_CLIENT_ID,
      clientSecret: process.env.NAVER_CLIENT_SECRET,
      callbackUrl: process.env.NAVER_CALLBACK_URL,
    },
    twitch: {
      clientId: process.env.TWITCH_CLIENT_ID,
      clientSecret: process.env.TWITCH_CLIENT_SECRET,
      callbackUrl: process.env.TWITCH_CALLBACK_URL,
    },
    soop: {
      clientId: process.env.SOOP_CLIENT_ID,
      clientSecret: process.env.SOOP_CLIENT_SECRET,
      callbackUrl: process.env.SOOP_CALLBACK_URL,
    },
  },

  // External APIs
  apis: {
    riot: {
      apiKey: process.env.RIOT_API_KEY,
      region: process.env.RIOT_REGION || "kr",
    },
  },

  // Admin
  admin: {
    accessCode: process.env.ADMIN_ACCESS_CODE,
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  },
};

// Environment-specific configurations
const configs = {
  development: {
    ...baseConfig,
    database: {
      client: "sqlite3",
      filename: path.resolve(__dirname, "../weflab_clone.db"),
      useNullAsDefault: true,
    },
    redis: {
      url: process.env.REDIS_URL || null,
      enabled: !!process.env.REDIS_URL,
    },
    logging: {
      level: process.env.LOG_LEVEL || "debug",
      prettyPrint: true,
    },
    rateLimit: {
      windowMs: 60 * 1000, // 1 minute
      max: 1000, // Higher limit for development
    },
  },

  staging: {
    ...baseConfig,
    database: {
      client: "pg",
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      pool: { min: 2, max: 10 },
    },
    redis: {
      url: process.env.REDIS_URL,
      enabled: !!process.env.REDIS_URL,
    },
    logging: {
      level: process.env.LOG_LEVEL || "info",
      prettyPrint: false,
    },
    rateLimit: {
      windowMs: 60 * 1000,
      max: 200,
    },
  },

  production: {
    ...baseConfig,
    database: {
      client: "pg",
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      pool: { min: 2, max: 20 },
    },
    redis: {
      url: process.env.REDIS_URL,
      enabled: !!process.env.REDIS_URL,
    },
    logging: {
      level: process.env.LOG_LEVEL || "info",
      prettyPrint: false,
    },
    rateLimit: {
      windowMs: 60 * 1000,
      max: 100,
    },
  },
};

// Get configuration for current environment
const config = configs[environment] || configs.development;

// Validate required configuration
const validateConfig = () => {
  const errors = [];

  if (!config.jwt.secret) {
    if (environment === "production") {
      errors.push("JWT_SECRET is required in production");
    }
  }

  if (environment === "production" || environment === "staging") {
    if (!config.database.connectionString) {
      errors.push("DATABASE_URL is required in production/staging");
    }
  }

  return errors;
};

// Export configuration
module.exports = {
  ...config,
  validate: validateConfig,
  isProduction: environment === "production",
  isStaging: environment === "staging",
  isDevelopment: environment === "development",
};
