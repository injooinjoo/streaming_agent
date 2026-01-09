const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
require("dotenv").config();

// 오버레이 해시 생성 유틸
const generateOverlayHash = () => {
  return crypto.randomBytes(8).toString("hex"); // 16자 해시
};

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";
const JWT_EXPIRES_IN = "7d";

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

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const SERVER_URL = process.env.SERVER_URL || "http://localhost:3001";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

// 프로덕션 환경에서 정적 파일 서빙
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
}

// Initialize SQLite Database
const dbPath = path.resolve(__dirname, "weflab_clone.db");
const db = new sqlite3.Database(dbPath);

// Database initialization function
const initializeDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // 기존 테이블
      db.run(`CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT,
      sender TEXT,
      amount INTEGER,
      message TEXT,
      platform TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )`);

    // 사용자 테이블 (overlay_hash 컬럼 포함)
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      password_hash TEXT,
      display_name TEXT NOT NULL,
      avatar_url TEXT,
      role TEXT DEFAULT 'user' CHECK(role IN ('user', 'creator', 'advertiser', 'admin')),
      oauth_provider TEXT,
      oauth_id TEXT,
      overlay_hash TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 사용자별 설정 테이블
    db.run(`CREATE TABLE IF NOT EXISTS user_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      setting_key TEXT NOT NULL,
      setting_value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, setting_key)
    )`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_user_settings ON user_settings(user_id, setting_key)`);

    // 룰렛 후원 테이블
    db.run(`CREATE TABLE IF NOT EXISTS roulette_wheels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL DEFAULT '기본 룰렛',
      trigger_amount INTEGER NOT NULL DEFAULT 1000,
      trigger_type TEXT DEFAULT 'minimum' CHECK(trigger_type IN ('exact', 'minimum', 'range')),
      trigger_max INTEGER,
      segments TEXT NOT NULL,
      spin_duration INTEGER DEFAULT 5000,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 시그니처 사운드 테이블
    db.run(`CREATE TABLE IF NOT EXISTS signature_sounds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      trigger_type TEXT DEFAULT 'amount' CHECK(trigger_type IN ('amount', 'user', 'keyword')),
      trigger_value TEXT NOT NULL,
      sound_url TEXT NOT NULL,
      image_url TEXT,
      animation TEXT DEFAULT 'bounceIn',
      priority INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 이모지 설정 테이블
    db.run(`CREATE TABLE IF NOT EXISTS emoji_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      emoji_set TEXT NOT NULL DEFAULT '["❤️","🔥","👏","😂","🎉"]',
      display_duration INTEGER DEFAULT 3000,
      max_concurrent INTEGER DEFAULT 10,
      animation_style TEXT DEFAULT 'float' CHECK(animation_style IN ('float', 'explode', 'rain', 'bounce')),
      trigger_keywords TEXT,
      is_active INTEGER DEFAULT 1
    )`);

    // 투표 테이블
    db.run(`CREATE TABLE IF NOT EXISTS voting_polls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      options TEXT NOT NULL,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'active', 'closed')),
      duration INTEGER,
      started_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS poll_votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      poll_id INTEGER REFERENCES voting_polls(id) ON DELETE CASCADE,
      option_id INTEGER NOT NULL,
      voter_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 엔딩 크레딧 테이블
    db.run(`CREATE TABLE IF NOT EXISTS ending_credits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      template_name TEXT DEFAULT '기본 크레딧',
      title TEXT DEFAULT '오늘의 방송',
      sections TEXT NOT NULL DEFAULT '[]',
      background_url TEXT,
      music_url TEXT,
      scroll_speed INTEGER DEFAULT 3,
      auto_populate INTEGER DEFAULT 1,
      min_donation INTEGER DEFAULT 1000,
      is_active INTEGER DEFAULT 1
    )`);

    // 챗봇 테이블
    db.run(`CREATE TABLE IF NOT EXISTS chat_bots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      name TEXT DEFAULT 'StreamBot',
      is_active INTEGER DEFAULT 1
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS bot_commands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bot_id INTEGER REFERENCES chat_bots(id) ON DELETE CASCADE,
      command TEXT NOT NULL,
      response TEXT NOT NULL,
      cooldown INTEGER DEFAULT 5,
      is_active INTEGER DEFAULT 1
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS bot_auto_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bot_id INTEGER REFERENCES chat_bots(id) ON DELETE CASCADE,
      trigger_type TEXT NOT NULL CHECK(trigger_type IN ('interval', 'enter', 'follow', 'donation')),
      trigger_value TEXT,
      message TEXT NOT NULL,
      is_active INTEGER DEFAULT 1
    )`);

    // 광고 슬롯 테이블 (스트리머가 설정하는 광고 위치)
    db.run(`CREATE TABLE IF NOT EXISTS ad_slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      name TEXT NOT NULL,
      type TEXT CHECK(type IN ('banner', 'popup', 'corner')),
      position_x REAL NOT NULL DEFAULT 0,
      position_y REAL NOT NULL DEFAULT 0,
      width INTEGER NOT NULL DEFAULT 300,
      height INTEGER NOT NULL DEFAULT 100,
      enabled INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 광고 캠페인 테이블 (광고주가 등록하는 광고)
    db.run(`CREATE TABLE IF NOT EXISTS ad_campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      advertiser_id INTEGER REFERENCES users(id),
      name TEXT NOT NULL,
      content_type TEXT CHECK(content_type IN ('image', 'video', 'html')),
      content_url TEXT NOT NULL,
      click_url TEXT,
      budget_daily INTEGER DEFAULT 0,
      budget_total INTEGER DEFAULT 0,
      budget_spent INTEGER DEFAULT 0,
      cpm INTEGER DEFAULT 0,
      cpc INTEGER DEFAULT 0,
      start_date DATE,
      end_date DATE,
      target_streamers TEXT,
      target_categories TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'active', 'paused', 'completed', 'rejected')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 광고 노출/클릭 기록 테이블
    db.run(`CREATE TABLE IF NOT EXISTS ad_impressions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER REFERENCES ad_campaigns(id),
      slot_id INTEGER REFERENCES ad_slots(id),
      streamer_id INTEGER REFERENCES users(id),
      event_type TEXT CHECK(event_type IN ('impression', 'click')),
      revenue REAL DEFAULT 0,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 정산 내역 테이블
    db.run(`CREATE TABLE IF NOT EXISTS ad_settlements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      streamer_id INTEGER REFERENCES users(id),
      period TEXT NOT NULL,
      total_impressions INTEGER DEFAULT 0,
      total_clicks INTEGER DEFAULT 0,
      total_revenue REAL DEFAULT 0,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'paid')),
      payment_date DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 크리에이터 테이블
    db.run(`CREATE TABLE IF NOT EXISTS creators (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE REFERENCES users(id),
      display_name TEXT NOT NULL,
      avatar_url TEXT,
      bio TEXT,
      total_downloads INTEGER DEFAULT 0,
      average_rating REAL DEFAULT 0,
      verified INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 디자인 테이블
    db.run(`CREATE TABLE IF NOT EXISTS designs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      creator_id INTEGER REFERENCES creators(id),
      name TEXT NOT NULL,
      description TEXT,
      category TEXT CHECK(category IN ('chat', 'alert', 'goal', 'ticker', 'subtitle', 'package')),
      tags TEXT,
      thumbnail_url TEXT,
      design_data TEXT NOT NULL,
      download_count INTEGER DEFAULT 0,
      average_rating REAL DEFAULT 0,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'archived')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 디자인 리뷰 테이블
    db.run(`CREATE TABLE IF NOT EXISTS design_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      design_id INTEGER REFERENCES designs(id),
      user_id INTEGER REFERENCES users(id),
      rating INTEGER CHECK(rating BETWEEN 1 AND 5),
      review_text TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(design_id, user_id)
    )`);

      console.log("All database tables initialized.");
      resolve();
    });
  });
};

// Initialize database
initializeDatabase()
  .then(() => console.log("Database ready."))
  .catch((err) => console.error("Database initialization error:", err));

// JWT 인증 미들웨어
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

// Settings API
app.get("/api/settings/:key", (req, res) => {
  db.get("SELECT value FROM settings WHERE key = ?", [req.params.key], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.json({ value: "{}" });
    res.json({ value: row.value });
  });
});

app.post("/api/settings", (req, res) => {
  const { key, value } = req.body;
  db.run(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [key, JSON.stringify(value)],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      // Notify overlays to refresh via socket
      io.emit("settings-updated", { key });
      res.json({ success: true });
    }
  );
});

// ===== 사용자별 설정 API =====

// 사용자 설정 저장 (인증 필요)
app.post("/api/user-settings", authenticateToken, (req, res) => {
  const { key, value } = req.body;
  const userId = req.user.id;

  db.run(
    `INSERT INTO user_settings (user_id, setting_key, setting_value, updated_at)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id, setting_key) DO UPDATE SET setting_value = excluded.setting_value, updated_at = CURRENT_TIMESTAMP`,
    [userId, key, JSON.stringify(value)],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });

      // 사용자의 overlay_hash로 해당 오버레이에만 알림
      db.get("SELECT overlay_hash FROM users WHERE id = ?", [userId], (err, user) => {
        if (user && user.overlay_hash) {
          io.to(`overlay:${user.overlay_hash}`).emit("settings-updated", { key });
        }
      });

      res.json({ success: true });
    }
  );
});

// 사용자 설정 조회 (인증 필요)
app.get("/api/user-settings/:key", authenticateToken, (req, res) => {
  const userId = req.user.id;
  const key = req.params.key;

  db.get(
    "SELECT setting_value FROM user_settings WHERE user_id = ? AND setting_key = ?",
    [userId, key],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.json({ value: "{}" });
      res.json({ value: row.setting_value });
    }
  );
});

// ===== 오버레이 공개 API (해시 기반) =====

// 해시로 설정 조회 (공개 - OBS에서 사용)
app.get("/api/overlay/:hash/settings/:key", (req, res) => {
  const { hash, key } = req.params;

  // 먼저 해당 해시의 사용자 찾기
  db.get("SELECT id FROM users WHERE overlay_hash = ?", [hash], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: "오버레이를 찾을 수 없습니다." });

    // 사용자 설정 조회
    db.get(
      "SELECT setting_value FROM user_settings WHERE user_id = ? AND setting_key = ?",
      [user.id, key],
      (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) {
          // 사용자 설정이 없으면 전역 설정 조회 (레거시 지원)
          db.get("SELECT value FROM settings WHERE key = ?", [key], (err, globalRow) => {
            if (err) return res.status(500).json({ error: err.message });
            return res.json({ value: globalRow ? globalRow.value : "{}" });
          });
          return;
        }
        res.json({ value: row.setting_value });
      }
    );
  });
});

// 오버레이 URL 목록 조회 (인증 필요)
app.get("/api/overlay/urls", authenticateToken, (req, res) => {
  db.get("SELECT overlay_hash FROM users WHERE id = ?", [req.user.id], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user || !user.overlay_hash) {
      return res.status(404).json({ error: "오버레이 해시가 없습니다." });
    }

    const baseUrl = CLIENT_URL;
    const hash = user.overlay_hash;

    res.json({
      hash,
      urls: {
        chat: `${baseUrl}/overlay/${hash}/chat`,
        alerts: `${baseUrl}/overlay/${hash}/alerts`,
        subtitles: `${baseUrl}/overlay/${hash}/subtitles`,
        goals: `${baseUrl}/overlay/${hash}/goals`,
        ticker: `${baseUrl}/overlay/${hash}/ticker`,
        roulette: `${baseUrl}/overlay/${hash}/roulette`,
        emoji: `${baseUrl}/overlay/${hash}/emoji`,
        voting: `${baseUrl}/overlay/${hash}/voting`,
        credits: `${baseUrl}/overlay/${hash}/credits`,
      },
    });
  });
});

// 오버레이 해시 재발급 (인증 필요)
app.post("/api/overlay/regenerate-hash", authenticateToken, (req, res) => {
  const newHash = generateOverlayHash();

  db.run(
    "UPDATE users SET overlay_hash = ? WHERE id = ?",
    [newHash, req.user.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });

      res.json({
        success: true,
        overlayHash: newHash,
        message: "새로운 오버레이 URL이 생성되었습니다. 기존 URL은 더 이상 작동하지 않습니다.",
      });
    }
  );
});

// ===== 인증 API =====

// 회원가입
app.post("/api/auth/register", async (req, res) => {
  const { email, password, displayName } = req.body;

  if (!email || !password || !displayName) {
    return res.status(400).json({ error: "이메일, 비밀번호, 닉네임을 모두 입력해주세요." });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "비밀번호는 6자 이상이어야 합니다." });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const overlayHash = generateOverlayHash();

    db.run(
      `INSERT INTO users (email, password_hash, display_name, overlay_hash) VALUES (?, ?, ?, ?)`,
      [email, passwordHash, displayName, overlayHash],
      function (err) {
        if (err) {
          if (err.message.includes("UNIQUE constraint failed")) {
            return res.status(400).json({ error: "이미 사용 중인 이메일입니다." });
          }
          return res.status(500).json({ error: err.message });
        }

        const token = jwt.sign(
          { id: this.lastID, email, displayName, role: "user", overlayHash },
          JWT_SECRET,
          { expiresIn: JWT_EXPIRES_IN }
        );

        res.json({
          success: true,
          user: { id: this.lastID, email, displayName, role: "user", overlayHash },
          token,
        });
      }
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 로그인
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "이메일과 비밀번호를 입력해주세요." });
  }

  db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!user) {
      return res.status(401).json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." });
    }

    // 기존 사용자에게 해시가 없으면 생성
    let overlayHash = user.overlay_hash;
    if (!overlayHash) {
      overlayHash = generateOverlayHash();
      db.run("UPDATE users SET overlay_hash = ? WHERE id = ?", [overlayHash, user.id]);
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, displayName: user.display_name, role: user.role, overlayHash },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

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
      token,
    });
  });
});

// 현재 사용자 정보
app.get("/api/auth/me", authenticateToken, (req, res) => {
  db.get("SELECT id, email, display_name, role, avatar_url, overlay_hash, created_at FROM users WHERE id = ?", [req.user.id], (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

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
  });
});

// 프로필 수정
app.put("/api/auth/profile", authenticateToken, (req, res) => {
  const { displayName, avatarUrl } = req.body;

  if (!displayName) {
    return res.status(400).json({ error: "닉네임을 입력해주세요." });
  }

  db.run(
    `UPDATE users SET display_name = ?, avatar_url = ? WHERE id = ?`,
    [displayName, avatarUrl || null, req.user.id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({
        success: true,
        user: { id: req.user.id, displayName, avatarUrl },
      });
    }
  );
});

// ===== OAuth API =====

// Helper function to generate random state
const generateState = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// OAuth 시작 - 각 Provider로 리다이렉트
app.get("/api/auth/:provider", (req, res) => {
  const { provider } = req.params;
  const config = OAUTH_CONFIG[provider];

  if (!config || !config.clientId) {
    return res.redirect(`${CLIENT_URL}/login?error=OAuth ${provider} is not configured`);
  }

  const state = generateState();
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

// OAuth 콜백 처리
app.get("/api/auth/:provider/callback", async (req, res) => {
  const { provider } = req.params;
  const { code, error } = req.query;
  const config = OAUTH_CONFIG[provider];

  if (error) {
    return res.redirect(`${CLIENT_URL}/login?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return res.redirect(`${CLIENT_URL}/login?error=No authorization code provided`);
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
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return res.redirect(`${CLIENT_URL}/login?error=Failed to get access token`);
    }

    // Get user info
    let userInfo;
    if (provider === "twitch") {
      const userResponse = await fetch(config.userInfoUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Client-Id": config.clientId,
        },
      });
      const userData = await userResponse.json();
      userInfo = userData.data?.[0];
    } else if (provider === "naver") {
      const userResponse = await fetch(config.userInfoUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const userData = await userResponse.json();
      userInfo = userData.response;
    } else {
      const userResponse = await fetch(config.userInfoUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
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
    db.get(
      "SELECT * FROM users WHERE oauth_provider = ? AND oauth_id = ?",
      [provider, oauthId],
      (err, existingUser) => {
        if (err) {
          return res.redirect(`${CLIENT_URL}/login?error=Database error`);
        }

        if (existingUser) {
          // 기존 사용자에게 해시가 없으면 생성
          let overlayHash = existingUser.overlay_hash;
          if (!overlayHash) {
            overlayHash = generateOverlayHash();
            db.run("UPDATE users SET overlay_hash = ? WHERE id = ?", [overlayHash, existingUser.id]);
          }

          // User exists, generate token
          const token = jwt.sign(
            {
              id: existingUser.id,
              email: existingUser.email,
              displayName: existingUser.display_name,
              role: existingUser.role,
              overlayHash,
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
          );
          return res.redirect(`${CLIENT_URL}/?token=${token}`);
        }

        // Create new user with overlay hash
        const newOverlayHash = generateOverlayHash();
        db.run(
          `INSERT INTO users (email, display_name, avatar_url, oauth_provider, oauth_id, overlay_hash) VALUES (?, ?, ?, ?, ?, ?)`,
          [email, displayName, avatarUrl, provider, oauthId, newOverlayHash],
          function (insertErr) {
            if (insertErr) {
              console.error("OAuth user creation error:", insertErr);
              return res.redirect(`${CLIENT_URL}/login?error=Failed to create user`);
            }

            const token = jwt.sign(
              {
                id: this.lastID,
                email,
                displayName,
                role: "user",
                overlayHash: newOverlayHash,
              },
              JWT_SECRET,
              { expiresIn: JWT_EXPIRES_IN }
            );
            return res.redirect(`${CLIENT_URL}/?token=${token}`);
          }
        );
      }
    );
  } catch (err) {
    console.error("OAuth error:", err);
    return res.redirect(`${CLIENT_URL}/login?error=OAuth authentication failed`);
  }
});

// ===== 광고 슬롯 API (스트리머용) =====

// 내 광고 슬롯 목록 조회
app.get("/api/ads/slots", authenticateToken, (req, res) => {
  db.all(
    `SELECT s.*,
      COALESCE(SUM(CASE WHEN i.event_type = 'impression' THEN 1 ELSE 0 END), 0) as impressions,
      COALESCE(SUM(CASE WHEN i.event_type = 'click' THEN 1 ELSE 0 END), 0) as clicks,
      COALESCE(SUM(i.revenue), 0) as revenue
     FROM ad_slots s
     LEFT JOIN ad_impressions i ON s.id = i.slot_id
     WHERE s.user_id = ?
     GROUP BY s.id
     ORDER BY s.created_at DESC`,
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });

      // Transform to frontend format
      const slots = rows.map(row => ({
        id: row.id,
        name: row.name,
        type: row.type,
        position: { x: row.position_x, y: row.position_y },
        size: { width: row.width, height: row.height },
        enabled: !!row.enabled,
        impressions: row.impressions,
        clicks: row.clicks,
        revenue: row.revenue,
        createdAt: row.created_at,
      }));

      res.json({ slots });
    }
  );
});

// 광고 슬롯 생성
app.post("/api/ads/slots", authenticateToken, (req, res) => {
  const { name, type, position, size, enabled } = req.body;

  if (!name) {
    return res.status(400).json({ error: "슬롯 이름을 입력해주세요." });
  }

  db.run(
    `INSERT INTO ad_slots (user_id, name, type, position_x, position_y, width, height, enabled)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      req.user.id,
      name,
      type || 'banner',
      position?.x || 0,
      position?.y || 0,
      size?.width || 300,
      size?.height || 100,
      enabled !== false ? 1 : 0,
    ],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });

      const newSlot = {
        id: this.lastID,
        name,
        type: type || 'banner',
        position: { x: position?.x || 0, y: position?.y || 0 },
        size: { width: size?.width || 300, height: size?.height || 100 },
        enabled: enabled !== false,
        impressions: 0,
        clicks: 0,
        revenue: 0,
      };

      // Notify overlay about new slot
      db.get("SELECT overlay_hash FROM users WHERE id = ?", [req.user.id], (err, user) => {
        if (user?.overlay_hash) {
          io.to(`overlay:${user.overlay_hash}`).emit("ad-slots-updated", { slots: [newSlot] });
        }
      });

      res.json({ success: true, slot: newSlot });
    }
  );
});

// 광고 슬롯 수정
app.put("/api/ads/slots/:id", authenticateToken, (req, res) => {
  const { id } = req.params;
  const { name, type, position, size, enabled } = req.body;

  db.run(
    `UPDATE ad_slots
     SET name = COALESCE(?, name),
         type = COALESCE(?, type),
         position_x = COALESCE(?, position_x),
         position_y = COALESCE(?, position_y),
         width = COALESCE(?, width),
         height = COALESCE(?, height),
         enabled = COALESCE(?, enabled)
     WHERE id = ? AND user_id = ?`,
    [
      name,
      type,
      position?.x,
      position?.y,
      size?.width,
      size?.height,
      enabled !== undefined ? (enabled ? 1 : 0) : null,
      id,
      req.user.id,
    ],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) {
        return res.status(404).json({ error: "슬롯을 찾을 수 없습니다." });
      }

      // Notify overlay about slot update
      db.get("SELECT overlay_hash FROM users WHERE id = ?", [req.user.id], (err, user) => {
        if (user?.overlay_hash) {
          io.to(`overlay:${user.overlay_hash}`).emit("ad-slots-updated", { slotId: id });
        }
      });

      res.json({ success: true });
    }
  );
});

// 광고 슬롯 삭제
app.delete("/api/ads/slots/:id", authenticateToken, (req, res) => {
  const { id } = req.params;

  db.run(
    "DELETE FROM ad_slots WHERE id = ? AND user_id = ?",
    [id, req.user.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) {
        return res.status(404).json({ error: "슬롯을 찾을 수 없습니다." });
      }

      // Notify overlay about slot deletion
      db.get("SELECT overlay_hash FROM users WHERE id = ?", [req.user.id], (err, user) => {
        if (user?.overlay_hash) {
          io.to(`overlay:${user.overlay_hash}`).emit("ad-slots-updated", { deletedSlotId: id });
        }
      });

      res.json({ success: true });
    }
  );
});

// 모든 슬롯 일괄 저장
app.put("/api/ads/slots", authenticateToken, (req, res) => {
  const { slots } = req.body;

  if (!Array.isArray(slots)) {
    return res.status(400).json({ error: "슬롯 배열을 제공해주세요." });
  }

  // Use transaction for batch update
  db.serialize(() => {
    const stmt = db.prepare(
      `INSERT OR REPLACE INTO ad_slots (id, user_id, name, type, position_x, position_y, width, height, enabled)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    for (const slot of slots) {
      stmt.run(
        slot.id > 0 ? slot.id : null,
        req.user.id,
        slot.name,
        slot.type || 'banner',
        slot.position?.x || 0,
        slot.position?.y || 0,
        slot.size?.width || 300,
        slot.size?.height || 100,
        slot.enabled !== false ? 1 : 0
      );
    }

    stmt.finalize((err) => {
      if (err) return res.status(500).json({ error: err.message });

      // Notify overlay about slots update
      db.get("SELECT overlay_hash FROM users WHERE id = ?", [req.user.id], (err, user) => {
        if (user?.overlay_hash) {
          io.to(`overlay:${user.overlay_hash}`).emit("ad-slots-updated", { userHash: user.overlay_hash });
          io.to(`overlay:${user.overlay_hash}`).emit("ads-refresh");
        }
      });

      res.json({ success: true });
    });
  });
});

// ===== 오버레이용 광고 API (공개) =====

// 해시로 광고 슬롯 조회 (OBS 오버레이용)
app.get("/api/overlay/:hash/ads/slots", (req, res) => {
  const { hash } = req.params;

  db.get("SELECT id FROM users WHERE overlay_hash = ?", [hash], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });

    db.all(
      `SELECT * FROM ad_slots WHERE user_id = ? AND enabled = 1`,
      [user.id],
      (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const slots = rows.map(row => ({
          id: row.id,
          name: row.name,
          type: row.type,
          position: { x: row.position_x, y: row.position_y },
          size: { width: row.width, height: row.height },
          enabled: true,
        }));

        res.json({ slots });
      }
    );
  });
});

// 해시로 현재 집행 중인 광고 조회
app.get("/api/overlay/:hash/ads/active", (req, res) => {
  const { hash } = req.params;

  db.get("SELECT id FROM users WHERE overlay_hash = ?", [hash], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });

    // Get active campaigns targeting this streamer
    const today = new Date().toISOString().split('T')[0];

    db.all(
      `SELECT c.*, s.id as slot_id
       FROM ad_campaigns c
       INNER JOIN ad_slots s ON s.user_id = ?
       WHERE c.status = 'active'
         AND (c.start_date IS NULL OR c.start_date <= ?)
         AND (c.end_date IS NULL OR c.end_date >= ?)
         AND (c.target_streamers IS NULL OR c.target_streamers = 'all' OR c.target_streamers LIKE '%' || ? || '%')
         AND s.enabled = 1
       ORDER BY c.cpm DESC, c.created_at ASC`,
      [user.id, today, today, user.id.toString()],
      (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        // Map campaigns to slots (one campaign per slot for now)
        const slotCampaignMap = {};
        for (const row of rows) {
          if (!slotCampaignMap[row.slot_id]) {
            slotCampaignMap[row.slot_id] = {
              id: row.id,
              slotId: row.slot_id,
              name: row.name,
              contentType: row.content_type,
              contentUrl: row.content_url,
              clickUrl: row.click_url,
            };
          }
        }

        const ads = Object.values(slotCampaignMap);
        res.json({ ads });
      }
    );
  });
});

// 광고 노출 기록
app.post("/api/ads/impression", (req, res) => {
  const { slotId, campaignId, userHash } = req.body;

  // Get streamer ID from hash
  db.get("SELECT id FROM users WHERE overlay_hash = ?", [userHash], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });

    const streamerId = user?.id || null;

    // Get CPM for revenue calculation
    db.get("SELECT cpm FROM ad_campaigns WHERE id = ?", [campaignId], (err, campaign) => {
      const revenue = campaign ? campaign.cpm / 1000 : 0; // CPM = cost per 1000 impressions

      db.run(
        `INSERT INTO ad_impressions (campaign_id, slot_id, streamer_id, event_type, revenue)
         VALUES (?, ?, ?, 'impression', ?)`,
        [campaignId, slotId, streamerId, revenue],
        function(err) {
          if (err) return res.status(500).json({ error: err.message });

          // Update campaign spent budget
          if (campaign) {
            db.run(
              "UPDATE ad_campaigns SET budget_spent = budget_spent + ? WHERE id = ?",
              [revenue, campaignId]
            );
          }

          res.json({ success: true });
        }
      );
    });
  });
});

// 광고 클릭 기록
app.post("/api/ads/click", (req, res) => {
  const { slotId, campaignId, userHash } = req.body;

  // Get streamer ID from hash
  db.get("SELECT id FROM users WHERE overlay_hash = ?", [userHash], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });

    const streamerId = user?.id || null;

    // Get CPC for revenue calculation
    db.get("SELECT cpc FROM ad_campaigns WHERE id = ?", [campaignId], (err, campaign) => {
      const revenue = campaign ? campaign.cpc : 0;

      db.run(
        `INSERT INTO ad_impressions (campaign_id, slot_id, streamer_id, event_type, revenue)
         VALUES (?, ?, ?, 'click', ?)`,
        [campaignId, slotId, streamerId, revenue],
        function(err) {
          if (err) return res.status(500).json({ error: err.message });

          // Update campaign spent budget
          if (campaign) {
            db.run(
              "UPDATE ad_campaigns SET budget_spent = budget_spent + ? WHERE id = ?",
              [revenue, campaignId]
            );
          }

          res.json({ success: true });
        }
      );
    });
  });
});

// ===== 수익 및 정산 API =====

// 내 광고 수익 현황
app.get("/api/ads/revenue", authenticateToken, (req, res) => {
  const userId = req.user.id;
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  // Get current month stats
  db.get(
    `SELECT
       COALESCE(SUM(CASE WHEN event_type = 'impression' THEN 1 ELSE 0 END), 0) as total_impressions,
       COALESCE(SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END), 0) as total_clicks,
       COALESCE(SUM(revenue), 0) as total_revenue
     FROM ad_impressions
     WHERE streamer_id = ?
       AND strftime('%Y-%m', timestamp) = ?`,
    [userId, currentMonth],
    (err, stats) => {
      if (err) return res.status(500).json({ error: err.message });

      // Get pending settlement amount
      db.get(
        `SELECT COALESCE(SUM(revenue), 0) as pending
         FROM ad_impressions
         WHERE streamer_id = ?
           AND id NOT IN (SELECT impression_id FROM ad_settlement_items WHERE settlement_id IN (SELECT id FROM ad_settlements WHERE status = 'paid'))`,
        [userId],
        (err, pending) => {
          if (err) return res.status(500).json({ error: err.message });

          const ctr = stats.total_impressions > 0
            ? ((stats.total_clicks / stats.total_impressions) * 100).toFixed(2)
            : 0;

          res.json({
            totalImpressions: stats.total_impressions,
            totalClicks: stats.total_clicks,
            totalRevenue: Math.round(stats.total_revenue),
            ctr: parseFloat(ctr),
            avgRevenuePerClick: stats.total_clicks > 0
              ? Math.round(stats.total_revenue / stats.total_clicks)
              : 0,
            pendingSettlement: Math.round(pending?.pending || 0),
          });
        }
      );
    }
  );
});

// 정산 내역 조회
app.get("/api/ads/settlements", authenticateToken, (req, res) => {
  db.all(
    `SELECT * FROM ad_settlements
     WHERE streamer_id = ?
     ORDER BY period DESC
     LIMIT 12`,
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });

      const settlements = rows.map(row => ({
        period: row.period,
        revenue: row.total_revenue,
        impressions: row.total_impressions,
        clicks: row.total_clicks,
        status: row.status,
        paidDate: row.payment_date,
      }));

      res.json({ settlements });
    }
  );
});

// ===== 광고 캠페인 API (광고주용) =====

// 내 캠페인 목록 조회
app.get("/api/ads/campaigns", authenticateToken, (req, res) => {
  db.all(
    `SELECT c.*,
       COALESCE(SUM(CASE WHEN i.event_type = 'impression' THEN 1 ELSE 0 END), 0) as impressions,
       COALESCE(SUM(CASE WHEN i.event_type = 'click' THEN 1 ELSE 0 END), 0) as clicks
     FROM ad_campaigns c
     LEFT JOIN ad_impressions i ON c.id = i.campaign_id
     WHERE c.advertiser_id = ?
     GROUP BY c.id
     ORDER BY c.created_at DESC`,
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ campaigns: rows });
    }
  );
});

// 캠페인 생성
app.post("/api/ads/campaigns", authenticateToken, (req, res) => {
  const {
    name, contentType, contentUrl, clickUrl,
    budgetDaily, budgetTotal, cpm, cpc,
    startDate, endDate, targetStreamers, targetCategories
  } = req.body;

  if (!name || !contentUrl) {
    return res.status(400).json({ error: "캠페인 이름과 콘텐츠 URL을 입력해주세요." });
  }

  db.run(
    `INSERT INTO ad_campaigns (
      advertiser_id, name, content_type, content_url, click_url,
      budget_daily, budget_total, cpm, cpc,
      start_date, end_date, target_streamers, target_categories, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [
      req.user.id, name, contentType || 'image', contentUrl, clickUrl,
      budgetDaily || 0, budgetTotal || 0, cpm || 0, cpc || 0,
      startDate, endDate,
      targetStreamers ? JSON.stringify(targetStreamers) : 'all',
      targetCategories ? JSON.stringify(targetCategories) : null
    ],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, campaignId: this.lastID });
    }
  );
});

// 캠페인 상태 변경
app.put("/api/ads/campaigns/:id/status", authenticateToken, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['active', 'paused'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: "유효하지 않은 상태입니다." });
  }

  db.run(
    "UPDATE ad_campaigns SET status = ? WHERE id = ? AND advertiser_id = ?",
    [status, id, req.user.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) {
        return res.status(404).json({ error: "캠페인을 찾을 수 없습니다." });
      }

      // Notify all affected overlays
      io.emit("ads-refresh");

      res.json({ success: true });
    }
  );
});

// 캠페인 통계 조회
app.get("/api/ads/campaigns/:id/stats", authenticateToken, (req, res) => {
  const { id } = req.params;

  db.get(
    `SELECT c.*,
       COALESCE(SUM(CASE WHEN i.event_type = 'impression' THEN 1 ELSE 0 END), 0) as impressions,
       COALESCE(SUM(CASE WHEN i.event_type = 'click' THEN 1 ELSE 0 END), 0) as clicks,
       COALESCE(SUM(i.revenue), 0) as total_spent
     FROM ad_campaigns c
     LEFT JOIN ad_impressions i ON c.id = i.campaign_id
     WHERE c.id = ? AND c.advertiser_id = ?
     GROUP BY c.id`,
    [id, req.user.id],
    (err, campaign) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!campaign) return res.status(404).json({ error: "캠페인을 찾을 수 없습니다." });

      const ctr = campaign.impressions > 0
        ? ((campaign.clicks / campaign.impressions) * 100).toFixed(2)
        : 0;

      res.json({
        ...campaign,
        ctr: parseFloat(ctr),
        remainingBudget: campaign.budget_total - campaign.total_spent,
      });
    }
  );
});

// 캠페인 수정 (전체 업데이트)
app.put("/api/ads/campaigns/:id", authenticateToken, (req, res) => {
  const { id } = req.params;
  const {
    name, content_type, content_url, click_url,
    budget_daily, budget_total, cpm, cpc,
    start_date, end_date, target_streamers, target_categories
  } = req.body;

  db.run(
    `UPDATE ad_campaigns
     SET name = ?, content_type = ?, content_url = ?, click_url = ?,
         budget_daily = ?, budget_total = ?, cpm = ?, cpc = ?,
         start_date = ?, end_date = ?, target_streamers = ?, target_categories = ?
     WHERE id = ? AND advertiser_id = ?`,
    [name, content_type, content_url, click_url,
     budget_daily || 0, budget_total || 0, cpm || 1000, cpc || 100,
     start_date, end_date, target_streamers, target_categories,
     id, req.user.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) {
        return res.status(404).json({ error: "캠페인을 찾을 수 없거나 권한이 없습니다." });
      }
      res.json({ success: true });
    }
  );
});

// 캠페인 삭제
app.delete("/api/ads/campaigns/:id", authenticateToken, (req, res) => {
  const { id } = req.params;

  // 먼저 관련 노출 기록 삭제
  db.run(
    `DELETE FROM ad_impressions WHERE campaign_id = ?`,
    [id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });

      // 캠페인 삭제
      db.run(
        `DELETE FROM ad_campaigns WHERE id = ? AND advertiser_id = ?`,
        [id, req.user.id],
        function(err) {
          if (err) return res.status(500).json({ error: err.message });
          if (this.changes === 0) {
            return res.status(404).json({ error: "캠페인을 찾을 수 없거나 권한이 없습니다." });
          }
          res.json({ success: true });
        }
      );
    }
  );
});

// 스트리머 목록 조회 (타겟팅용)
app.get("/api/users/streamers", authenticateToken, (req, res) => {
  db.all(
    `SELECT id, display_name, email, created_at FROM users WHERE role = 'user' OR role = 'creator'`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      // 실제로는 각 스트리머의 평균 시청자 수 등을 포함할 수 있음
      const streamers = rows.map(r => ({
        id: r.id,
        display_name: r.display_name || r.email?.split('@')[0] || `User${r.id}`,
        viewers_avg: Math.floor(Math.random() * 2000) + 100 // 임시 데이터
      }));
      res.json(streamers);
    }
  );
});

// Basic Routes
app.get("/", (req, res) => {
  res.send("Weflab Clone Backend is running.");
});

// Simulated Event Trigger (for testing)
app.post("/api/simulate-event", (req, res) => {
  const { type, sender, amount, message, platform, overlayHash } = req.body;

  const event = {
    type: type || "chat",
    sender: sender || "User123",
    amount: amount || 0,
    message: message || "Hello Weflab!",
    platform: platform || "twitch",
    timestamp: new Date().toISOString(),
  };

  // Save to DB
  db.run(
    `INSERT INTO events (type, sender, amount, message, platform) VALUES (?, ?, ?, ?, ?)`,
    [event.type, event.sender, event.amount, event.message, event.platform],
    function (err) {
      if (err) {
        console.error("Error saving event:", err.message);
        return res.status(500).json({ error: "Failed to save event" });
      }

      // 해시가 제공된 경우 해당 룸에만, 아니면 전체에 브로드캐스트
      if (overlayHash) {
        io.to(`overlay:${overlayHash}`).emit("new-event", { ...event, id: this.lastID });
      } else {
        io.emit("new-event", { ...event, id: this.lastID });
      }
      res.json({ success: true, event: { ...event, id: this.lastID } });
    }
  );
});

// Get Historical Events
app.get("/api/events", (req, res) => {
  db.all(
    `SELECT * FROM events ORDER BY timestamp DESC LIMIT 50`,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
});

// Socket.io Connection
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // 오버레이가 해시 기반 룸에 조인
  socket.on("join-overlay", (hash) => {
    if (hash) {
      socket.join(`overlay:${hash}`);
      console.log(`Socket ${socket.id} joined room overlay:${hash}`);
    }
  });

  // 오버레이 룸 나가기
  socket.on("leave-overlay", (hash) => {
    if (hash) {
      socket.leave(`overlay:${hash}`);
      console.log(`Socket ${socket.id} left room overlay:${hash}`);
    }
  });

  // 광고 오버레이 조인/나가기
  socket.on("join-ad-overlay", (hash) => {
    if (hash) {
      socket.join(`overlay:${hash}`);
      console.log(`Socket ${socket.id} joined ad overlay room overlay:${hash}`);
    }
  });

  socket.on("leave-ad-overlay", (hash) => {
    if (hash) {
      socket.leave(`overlay:${hash}`);
      console.log(`Socket ${socket.id} left ad overlay room overlay:${hash}`);
    }
  });

  // 설정 업데이트 이벤트 (대시보드 → 오버레이)
  socket.on("settings-update", (data) => {
    if (data.userHash) {
      io.to(`overlay:${data.userHash}`).emit("settings-updated", { key: data.key });
      console.log(`Settings updated for ${data.key} in room overlay:${data.userHash}`);
    }
  });

  // 룰렛 스핀 이벤트
  socket.on("roulette-spin", (data) => {
    if (data.userHash) {
      io.to(`overlay:${data.userHash}`).emit("roulette-spin", {
        resultIndex: data.resultIndex,
        segments: data.segments
      });
      console.log(`Roulette spin triggered for overlay:${data.userHash}, result: ${data.resultIndex}`);
    }
  });

  // 이모지 리액션 이벤트
  socket.on("emoji-reaction", (data) => {
    if (data.userHash) {
      io.to(`overlay:${data.userHash}`).emit("emoji-reaction", {
        emoji: data.emoji,
        position: data.position
      });
    }
  });

  // 이모지 버스트 이벤트
  socket.on("emoji-burst", (data) => {
    if (data.userHash) {
      io.to(`overlay:${data.userHash}`).emit("emoji-burst", {
        emojis: data.emojis
      });
    }
  });

  // 투표 시작 이벤트
  socket.on("poll-start", (data) => {
    if (data.userHash) {
      io.to(`overlay:${data.userHash}`).emit("poll-started", data.poll);
    }
  });

  // 투표 업데이트 이벤트
  socket.on("poll-vote", (data) => {
    if (data.userHash) {
      io.to(`overlay:${data.userHash}`).emit("poll-update", {
        pollId: data.pollId,
        optionId: data.optionId,
        newCount: data.newCount
      });
    }
  });

  // 투표 종료 이벤트
  socket.on("poll-end", (data) => {
    if (data.userHash) {
      io.to(`overlay:${data.userHash}`).emit("poll-ended", {
        pollId: data.pollId,
        results: data.results
      });
    }
  });

  // 크레딧 시작/정지 이벤트
  socket.on("credits-start", (data) => {
    if (data.userHash) {
      io.to(`overlay:${data.userHash}`).emit("credits-start", data.credits);
    }
  });

  socket.on("credits-stop", (data) => {
    if (data.userHash) {
      io.to(`overlay:${data.userHash}`).emit("credits-stop");
    }
  });

  // Bot events
  socket.on("bot-toggle", (data) => {
    if (data.userHash) {
      io.to(`overlay:${data.userHash}`).emit("bot-toggle", {
        isActive: data.isActive
      });
    }
  });

  socket.on("bot-message", (data) => {
    if (data.userHash) {
      io.to(`overlay:${data.userHash}`).emit("bot-message", {
        botName: data.botName,
        message: data.message
      });
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// 프로덕션 환경에서 SPA 라우팅 지원 (모든 API 라우트 뒤에 위치)
if (process.env.NODE_ENV === 'production') {
  app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
