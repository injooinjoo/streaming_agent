/**
 * Authentication Middleware
 * JWT token validation for protected routes
 */

const jwt = require("jsonwebtoken");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = "7d";

const AUTH_REQUIRED_MESSAGE = "인증이 필요합니다.";
const INVALID_TOKEN_MESSAGE = "유효하지 않거나 만료된 토큰입니다.";
const DEFAULT_FORBIDDEN_MESSAGE = "이 기능에 접근할 권한이 없습니다.";
const DEV_AUTO_LOGIN_TOKEN = "auto-login-token";

const DEV_AUTO_LOGIN_USER = {
  id: 1,
  email: "devil0108@soop.co.kr",
  displayName: "감스트",
  role: "admin",
  channelId: "devil0108",
  platform: "soop",
};

const extractBearerToken = (req) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  return authHeader ? authHeader.split(" ")[1] : null;
};

/**
 * Get demo user overlay hash from server exports (loaded from DB on startup)
 */
const getDemoUserWithHash = () => {
  try {
    const serverModule = require("../index");
    return {
      ...DEV_AUTO_LOGIN_USER,
      overlayHash: serverModule.demoUserOverlayHash || null,
    };
  } catch {
    return DEV_AUTO_LOGIN_USER;
  }
};

const applyDevAutoLogin = (token, req, res) => {
  if (token !== DEV_AUTO_LOGIN_TOKEN) {
    return false;
  }

  if (process.env.NODE_ENV === "production") {
    res.status(403).json({ error: INVALID_TOKEN_MESSAGE });
    return true;
  }

  req.user = getDemoUserWithHash();
  return true;
};

/**
 * Authenticate JWT token from Authorization header
 * Basic version without blacklist checking (backwards compatible)
 * Supports development auto-login token bypass
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 */
const authenticateToken = (req, res, next) => {
  const token = extractBearerToken(req);

  if (!token) {
    return res.status(401).json({ error: AUTH_REQUIRED_MESSAGE });
  }

  if (applyDevAutoLogin(token, req, res)) {
    if (req.user) {
      return next();
    }
    return;
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    return res.status(403).json({ error: INVALID_TOKEN_MESSAGE });
  }
};

/**
 * Create authentication middleware with tokenService support
 * Includes blacklist checking for logged out tokens
 * Supports development auto-login token bypass
 * @param {Object} tokenService - Token service instance
 * @returns {Function} Express middleware
 */
const createAuthMiddleware = (tokenService) => {
  return async (req, res, next) => {
    const token = extractBearerToken(req);

    if (!token) {
      return res.status(401).json({ error: AUTH_REQUIRED_MESSAGE });
    }

    if (applyDevAutoLogin(token, req, res)) {
      if (req.user) {
        return next();
      }
      return;
    }

    const decoded = await tokenService.verifyAccessToken(token);

    if (!decoded) {
      return res.status(403).json({ error: INVALID_TOKEN_MESSAGE });
    }

    req.user = decoded;
    return next();
  };
};

/**
 * Require one of the provided roles after authentication.
 * @param {string[]} allowedRoles
 * @param {string} [errorMessage]
 * @returns {Function}
 */
const authorizeRoles = (allowedRoles, errorMessage = DEFAULT_FORBIDDEN_MESSAGE) => {
  return async (req, res, next) => {
    const resolvedUser = await Promise.resolve(req.user);

    if (!resolvedUser) {
      return res.status(401).json({ error: AUTH_REQUIRED_MESSAGE });
    }

    req.user = resolvedUser;

    if (!allowedRoles.includes(resolvedUser.role)) {
      return res.status(403).json({ error: errorMessage });
    }

    return next();
  };
};

/**
 * Generate JWT token for user
 * @param {Object} user - User object
 * @returns {string} JWT token
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      role: user.role,
      overlayHash: user.overlay_hash,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {Promise<Object>} Decoded token payload
 */
const verifyToken = (token) => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        reject(err);
      } else {
        resolve(decoded);
      }
    });
  });
};

module.exports = {
  authenticateToken,
  createAuthMiddleware,
  authorizeRoles,
  generateToken,
  verifyToken,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  AUTH_REQUIRED_MESSAGE,
  INVALID_TOKEN_MESSAGE,
  DEFAULT_FORBIDDEN_MESSAGE,
};
