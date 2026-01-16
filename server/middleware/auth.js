/**
 * Authentication Middleware
 * JWT token validation for protected routes
 */

const jwt = require("jsonwebtoken");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = "7d";

/**
 * Authenticate JWT token from Authorization header
 * Basic version without blacklist checking (backwards compatible)
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "인증이 필요합니다." });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "유효하지 않은 토큰입니다." });
    }
    req.user = user;
    next();
  });
};

/**
 * Create authentication middleware with tokenService support
 * Includes blacklist checking for logged out tokens
 * @param {Object} tokenService - Token service instance
 * @returns {Function} Express middleware
 */
const createAuthMiddleware = (tokenService) => {
  return (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "인증이 필요합니다." });
    }

    // Use tokenService to verify and check blacklist
    const decoded = tokenService.verifyAccessToken(token);

    if (!decoded) {
      return res.status(403).json({ error: "유효하지 않거나 만료된 토큰입니다." });
    }

    req.user = decoded;
    next();
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
  generateToken,
  verifyToken,
  JWT_SECRET,
  JWT_EXPIRES_IN,
};
