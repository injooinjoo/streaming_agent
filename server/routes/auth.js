/**
 * Authentication Routes
 * User registration, login, OAuth, and profile management
 */

const express = require("express");
const crypto = require("crypto");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const SERVER_URL = process.env.SERVER_URL || "http://localhost:3001";

// OAuth Configuration
const OAUTH_CONFIG = {
  soop: {
    clientId: process.env.SOOP_CLIENT_ID || "",
    clientSecret: process.env.SOOP_CLIENT_SECRET || "",
    authUrl: "https://www.sooplive.co.kr/oauth/authorize",
    tokenUrl: "https://www.sooplive.co.kr/oauth/token",
    userInfoUrl: "https://api.sooplive.co.kr/user/me",
    scope: "user:read",
  },
  naver: {
    clientId: process.env.NAVER_CLIENT_ID || "",
    clientSecret: process.env.NAVER_CLIENT_SECRET || "",
    authUrl: "https://nid.naver.com/oauth2.0/authorize",
    tokenUrl: "https://nid.naver.com/oauth2.0/token",
    userInfoUrl: "https://openapi.naver.com/v1/nid/me",
    scope: "profile email",
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    userInfoUrl: "https://www.googleapis.com/oauth2/v2/userinfo",
    scope: "profile email",
  },
  twitch: {
    clientId: process.env.TWITCH_CLIENT_ID || "",
    clientSecret: process.env.TWITCH_CLIENT_SECRET || "",
    authUrl: "https://id.twitch.tv/oauth2/authorize",
    tokenUrl: "https://id.twitch.tv/oauth2/token",
    userInfoUrl: "https://api.twitch.tv/helix/users",
    scope: "user:read:email",
  },
};

/**
 * Generate cryptographically secure random state for OAuth (CSRF protection)
 */
const generateState = () => {
  return crypto.randomBytes(32).toString("hex");
};

/**
 * Create auth router
 * @param {Object} userService - User service instance
 * @param {Object} stateStore - State store service for OAuth CSRF protection
 * @param {Object} tokenService - Token service for JWT management
 * @param {Function} authenticateToken - Auth middleware
 * @returns {express.Router}
 */
const createAuthRouter = (userService, stateStore, tokenService, authenticateToken) => {
  const router = express.Router();

  // ===== Local Auth =====

  /**
   * POST /api/auth/register
   * Register new user with email/password
   */
  router.post("/auth/register", async (req, res) => {
    const { email, password, displayName } = req.body;

    if (!email || !password || !displayName) {
      return res.status(400).json({ error: "이메일, 비밀번호, 닉네임을 모두 입력해주세요." });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "비밀번호는 6자 이상이어야 합니다." });
    }

    try {
      const user = await userService.create({ email, password, displayName });
      const { accessToken, refreshToken } = tokenService.generateTokenPair(user);

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          overlayHash: user.overlayHash,
        },
        accessToken,
        refreshToken,
        // Backwards compatibility
        token: accessToken,
      });
    } catch (err) {
      if (err.message.includes("UNIQUE constraint failed")) {
        return res.status(400).json({ error: "이미 사용 중인 이메일입니다." });
      }
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/auth/login
   * Login with email/password
   */
  router.post("/auth/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "이메일과 비밀번호를 입력해주세요." });
    }

    try {
      const user = await userService.findByEmail(email);

      if (!user) {
        return res.status(401).json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." });
      }

      const validPassword = await userService.verifyPassword(password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." });
      }

      // Generate hash if not exists
      let overlayHash = user.overlay_hash;
      if (!overlayHash) {
        overlayHash = await userService.updateOverlayHash(user.id);
      }

      const userData = {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
        overlayHash,
      };

      const { accessToken, refreshToken } = tokenService.generateTokenPair(userData);

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.display_name,
          role: user.role,
          avatarUrl: user.avatar_url,
          overlayHash,
        },
        accessToken,
        refreshToken,
        // Backwards compatibility
        token: accessToken,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/auth/refresh
   * Refresh access token using refresh token
   */
  router.post("/auth/refresh", async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token이 필요합니다." });
    }

    try {
      // Verify refresh token
      const decoded = tokenService.verifyRefreshToken(refreshToken);
      if (!decoded) {
        return res.status(401).json({ error: "유효하지 않은 refresh token입니다." });
      }

      // Get user data
      const user = await userService.findById(decoded.id);
      if (!user) {
        return res.status(401).json({ error: "사용자를 찾을 수 없습니다." });
      }

      const userData = {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
        overlayHash: user.overlay_hash,
      };

      // Generate new token pair (refresh token rotation)
      const tokens = await tokenService.refreshTokens(refreshToken, userData);
      if (!tokens) {
        return res.status(401).json({ error: "토큰 갱신에 실패했습니다." });
      }

      res.json({
        success: true,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        // Backwards compatibility
        token: tokens.accessToken,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/auth/logout
   * Invalidate tokens
   */
  router.post("/auth/logout", authenticateToken, async (req, res) => {
    try {
      // Get token from header
      const authHeader = req.headers["authorization"];
      const token = authHeader && authHeader.split(" ")[1];

      if (token) {
        // Blacklist the access token
        await tokenService.blacklistToken(token);
      }

      // Optionally revoke all refresh tokens for user
      if (req.body && req.body.revokeAll) {
        await tokenService.revokeAllUserTokens(req.user.id);
      }

      res.json({ success: true, message: "로그아웃되었습니다." });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/auth/me
   * Get current user info (requires auth)
   */
  router.get("/auth/me", authenticateToken, async (req, res) => {
    try {
      const user = await userService.findById(req.user.id);

      if (!user) {
        return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });
      }

      res.json({
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
        avatarUrl: user.avatar_url,
        overlayHash: user.overlay_hash,
        createdAt: user.created_at,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * PUT /api/auth/profile
   * Update user profile (requires auth)
   */
  router.put("/auth/profile", authenticateToken, async (req, res) => {
    const { displayName, avatarUrl } = req.body;

    if (!displayName) {
      return res.status(400).json({ error: "닉네임을 입력해주세요." });
    }

    try {
      const result = await userService.updateProfile(req.user.id, { displayName, avatarUrl });
      res.json({ success: true, user: result });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===== OAuth =====

  /**
   * GET /api/auth/:provider
   * Start OAuth flow - redirect to provider
   */
  router.get("/auth/:provider", async (req, res) => {
    const { provider } = req.params;
    const config = OAUTH_CONFIG[provider];

    if (!config || !config.clientId) {
      return res.redirect(`${CLIENT_URL}/login?error=OAuth ${provider} is not configured`);
    }

    const state = generateState();

    // Store state for CSRF validation (5 minute TTL)
    await stateStore.set(state, { provider });

    const redirectUri = `${SERVER_URL}/api/auth/${provider}/callback`;

    let authUrl;
    if (provider === "naver") {
      authUrl = `${config.authUrl}?response_type=code&client_id=${config.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
    } else if (provider === "google") {
      authUrl = `${config.authUrl}?response_type=code&client_id=${config.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(config.scope)}&state=${state}&access_type=offline`;
    } else if (provider === "twitch") {
      authUrl = `${config.authUrl}?response_type=code&client_id=${config.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(config.scope)}&state=${state}`;
    } else if (provider === "soop") {
      authUrl = `${config.authUrl}?response_type=code&client_id=${config.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(config.scope)}&state=${state}`;
    } else {
      return res.redirect(`${CLIENT_URL}/login?error=Unknown provider`);
    }

    res.redirect(authUrl);
  });

  /**
   * GET /api/auth/:provider/callback
   * OAuth callback handler
   */
  router.get("/auth/:provider/callback", async (req, res) => {
    const { provider } = req.params;
    const { code, error, state } = req.query;
    const config = OAUTH_CONFIG[provider];

    if (error) {
      return res.redirect(`${CLIENT_URL}/login?error=${encodeURIComponent(error)}`);
    }

    if (!code) {
      return res.redirect(`${CLIENT_URL}/login?error=No authorization code provided`);
    }

    // Validate state for CSRF protection
    const stateData = await stateStore.validate(state);
    if (!stateData) {
      console.warn(`OAuth state validation failed for provider: ${provider}`);
      return res.redirect(`${CLIENT_URL}/login?error=Invalid or expired state. Please try again.`);
    }

    // Verify the state was created for this provider
    if (stateData.provider !== provider) {
      console.warn(`OAuth provider mismatch: expected ${stateData.provider}, got ${provider}`);
      return res.redirect(`${CLIENT_URL}/login?error=Provider mismatch. Please try again.`);
    }

    try {
      const redirectUri = `${SERVER_URL}/api/auth/${provider}/callback`;

      // Exchange code for access token
      let tokenResponse;
      if (provider === "naver") {
        const tokenUrl = `${config.tokenUrl}?grant_type=authorization_code&client_id=${config.clientId}&client_secret=${config.clientSecret}&code=${code}&state=${req.query.state}`;
        tokenResponse = await fetch(tokenUrl);
      } else {
        const tokenParams = new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          client_id: config.clientId,
          client_secret: config.clientSecret,
        });
        tokenResponse = await fetch(config.tokenUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: tokenParams,
        });
      }

      const tokenData = await tokenResponse.json();
      const oauthAccessToken = tokenData.access_token;

      if (!oauthAccessToken) {
        return res.redirect(`${CLIENT_URL}/login?error=Failed to get access token`);
      }

      // Get user info from provider
      let userInfo;
      if (provider === "twitch") {
        const userResponse = await fetch(config.userInfoUrl, {
          headers: {
            Authorization: `Bearer ${oauthAccessToken}`,
            "Client-Id": config.clientId,
          },
        });
        const userData = await userResponse.json();
        userInfo = userData.data?.[0];
      } else if (provider === "naver") {
        const userResponse = await fetch(config.userInfoUrl, {
          headers: { Authorization: `Bearer ${oauthAccessToken}` },
        });
        const userData = await userResponse.json();
        userInfo = userData.response;
      } else {
        const userResponse = await fetch(config.userInfoUrl, {
          headers: { Authorization: `Bearer ${oauthAccessToken}` },
        });
        userInfo = await userResponse.json();
      }

      if (!userInfo) {
        return res.redirect(`${CLIENT_URL}/login?error=Failed to get user info`);
      }

      // Extract user data based on provider
      let oauthId, displayName, email, avatarUrl;
      if (provider === "google") {
        oauthId = userInfo.id;
        displayName = userInfo.name;
        email = userInfo.email;
        avatarUrl = userInfo.picture;
      } else if (provider === "naver") {
        oauthId = userInfo.id;
        displayName = userInfo.nickname || userInfo.name;
        email = userInfo.email;
        avatarUrl = userInfo.profile_image;
      } else if (provider === "twitch") {
        oauthId = userInfo.id;
        displayName = userInfo.display_name;
        email = userInfo.email;
        avatarUrl = userInfo.profile_image_url;
      } else if (provider === "soop") {
        oauthId = userInfo.user_id || userInfo.id;
        displayName = userInfo.nickname || userInfo.user_nick;
        email = userInfo.email || null;
        avatarUrl = userInfo.profile_image || null;
      }

      // Find or create user
      const existingUser = await userService.findByOAuth(provider, oauthId);

      if (existingUser) {
        // Generate hash if not exists
        let overlayHash = existingUser.overlay_hash;
        if (!overlayHash) {
          overlayHash = await userService.updateOverlayHash(existingUser.id);
        }

        // User exists, generate token pair
        const userData = {
          id: existingUser.id,
          email: existingUser.email,
          displayName: existingUser.display_name,
          role: existingUser.role,
          overlayHash,
        };
        const { accessToken, refreshToken } = tokenService.generateTokenPair(userData);

        // Redirect with tokens (backwards compatible - token param still works)
        return res.redirect(
          `${CLIENT_URL}/?token=${accessToken}&accessToken=${accessToken}&refreshToken=${encodeURIComponent(refreshToken)}`
        );
      }

      // Create new user
      const newUser = await userService.createFromOAuth({
        email,
        displayName,
        avatarUrl,
        provider,
        oauthId,
      });

      const { accessToken, refreshToken } = tokenService.generateTokenPair(newUser);
      return res.redirect(
        `${CLIENT_URL}/?token=${accessToken}&accessToken=${accessToken}&refreshToken=${encodeURIComponent(refreshToken)}`
      );
    } catch (err) {
      console.error("OAuth error:", err);
      return res.redirect(`${CLIENT_URL}/login?error=OAuth authentication failed`);
    }
  });

  return router;
};

module.exports = { createAuthRouter, OAUTH_CONFIG };
