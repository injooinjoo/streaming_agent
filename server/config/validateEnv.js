/**
 * Environment Variable Validation
 * Ensures all required secrets are properly configured
 */

/**
 * Required environment variables for production
 */
const REQUIRED_VARS = {
  // JWT Configuration
  JWT_SECRET: {
    description: "Secret key for signing JWT access tokens",
    minLength: 32,
  },
  JWT_REFRESH_SECRET: {
    description: "Secret key for signing JWT refresh tokens",
    minLength: 32,
  },
};

/**
 * Optional environment variables with descriptions
 */
const OPTIONAL_VARS = {
  // Server Configuration
  PORT: {
    description: "Server port (default: 3001)",
    default: "3001",
  },
  NODE_ENV: {
    description: "Environment (development/production)",
    default: "development",
  },
  CLIENT_URL: {
    description: "Frontend URL for CORS and redirects",
    default: "http://localhost:5173",
  },
  SERVER_URL: {
    description: "Backend URL for OAuth callbacks",
    default: "http://localhost:3001",
  },

  // OAuth Configuration (optional until OAuth is used)
  GOOGLE_CLIENT_ID: {
    description: "Google OAuth client ID",
  },
  GOOGLE_CLIENT_SECRET: {
    description: "Google OAuth client secret",
  },
  NAVER_CLIENT_ID: {
    description: "Naver OAuth client ID",
  },
  NAVER_CLIENT_SECRET: {
    description: "Naver OAuth client secret",
  },
  TWITCH_CLIENT_ID: {
    description: "Twitch OAuth client ID",
  },
  TWITCH_CLIENT_SECRET: {
    description: "Twitch OAuth client secret",
  },
  SOOP_CLIENT_ID: {
    description: "SOOP OAuth client ID",
  },
  SOOP_CLIENT_SECRET: {
    description: "SOOP OAuth client secret",
  },

  // External APIs
  RIOT_API_KEY: {
    description: "Riot Games API key for game stats",
  },

  // Admin Configuration
  ADMIN_ACCESS_CODE: {
    description: "Admin dashboard access code",
  },
};

/**
 * Insecure default values that should never be used in production
 */
const INSECURE_DEFAULTS = [
  "your-super-secret-jwt-key-change-in-production",
  "your-secret-key",
  "secret",
  "change-me",
  "admin123",
  "password",
];

/**
 * Validate all required environment variables
 * @param {boolean} exitOnError - Whether to exit process on validation failure
 * @returns {Object} Validation result
 */
const validateEnv = (exitOnError = true) => {
  const errors = [];
  const warnings = [];
  const isProduction = process.env.NODE_ENV === "production";

  // Check required variables
  for (const [key, config] of Object.entries(REQUIRED_VARS)) {
    const value = process.env[key];

    if (!value) {
      errors.push(`Missing required environment variable: ${key} - ${config.description}`);
      continue;
    }

    // Check minimum length if specified
    if (config.minLength && value.length < config.minLength) {
      if (isProduction) {
        errors.push(`${key} must be at least ${config.minLength} characters in production`);
      } else {
        warnings.push(`${key} should be at least ${config.minLength} characters (current: ${value.length})`);
      }
    }

    // Check for insecure defaults
    if (INSECURE_DEFAULTS.some((insecure) => value.toLowerCase().includes(insecure.toLowerCase()))) {
      if (isProduction) {
        errors.push(`${key} contains insecure default value - not allowed in production`);
      } else {
        warnings.push(`${key} contains insecure default value - change before production deployment`);
      }
    }
  }

  // Check OAuth configuration warnings
  const oauthProviders = ["GOOGLE", "NAVER", "TWITCH", "SOOP"];
  for (const provider of oauthProviders) {
    const clientId = process.env[`${provider}_CLIENT_ID`];
    const clientSecret = process.env[`${provider}_CLIENT_SECRET`];

    if ((clientId && !clientSecret) || (!clientId && clientSecret)) {
      warnings.push(`${provider} OAuth: Both CLIENT_ID and CLIENT_SECRET must be set together`);
    }
  }

  // Log results
  if (warnings.length > 0) {
    console.warn("⚠️  Environment variable warnings:");
    warnings.forEach((w) => console.warn(`   - ${w}`));
  }

  if (errors.length > 0) {
    console.error("❌ Environment variable errors:");
    errors.forEach((e) => console.error(`   - ${e}`));

    if (exitOnError) {
      console.error("\n💡 Create a .env file in the server directory with the required variables.");
      console.error("   See .env.example for a template.\n");
      process.exit(1);
    }
  } else if (warnings.length === 0) {
    console.log("✅ Environment variables validated successfully");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Generate .env.example content
 * @returns {string} Example .env file content
 */
const generateEnvExample = () => {
  let content = "# Streaming Agent Environment Variables\n";
  content += "# Copy this file to .env and fill in your values\n\n";

  content += "# === Required Variables ===\n";
  for (const [key, config] of Object.entries(REQUIRED_VARS)) {
    content += `# ${config.description}\n`;
    if (config.minLength) {
      content += `# Minimum length: ${config.minLength} characters\n`;
    }
    content += `${key}=\n\n`;
  }

  content += "# === Optional Variables ===\n";
  for (const [key, config] of Object.entries(OPTIONAL_VARS)) {
    content += `# ${config.description}\n`;
    if (config.default) {
      content += `# Default: ${config.default}\n`;
      content += `# ${key}=${config.default}\n\n`;
    } else {
      content += `# ${key}=\n\n`;
    }
  }

  return content;
};

module.exports = {
  validateEnv,
  generateEnvExample,
  REQUIRED_VARS,
  OPTIONAL_VARS,
};
