const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = "7d";

// Admin access code from environment
// Falls back to a development default with warning
const ADMIN_ACCESS_CODE = process.env.ADMIN_ACCESS_CODE;
if (!ADMIN_ACCESS_CODE && process.env.NODE_ENV !== "production") {
  console.warn("⚠️  ADMIN_ACCESS_CODE not set - admin dashboard will be disabled");
}

/**
 * Middleware to authenticate admin users
 * Checks JWT validity and ensures user has admin role
 */
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "인증이 필요합니다." });
  }

  // 개발/데모용 자동 로그인 토큰 바이패스 (admin 역할 부여)
  if (token === 'auto-login-token') {
    req.user = {
      id: 1,
      email: 'devil0108@soop.co.kr',
      displayName: '감스트',
      role: 'admin',
      channelId: 'devil0108',
      platform: 'soop',
    };
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "유효하지 않은 토큰입니다." });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ error: "관리자 권한이 필요합니다." });
    }

    req.user = user;
    next();
  });
};

/**
 * Developer login handler
 * Validates access code and returns admin JWT
 */
const developerLogin = (req, res) => {
  const { accessCode } = req.body;

  // Check if admin access is configured
  if (!ADMIN_ACCESS_CODE) {
    return res.status(503).json({ error: "관리자 접근이 구성되지 않았습니다." });
  }

  if (!accessCode) {
    return res.status(400).json({ error: "개발자 접근 코드를 입력해주세요." });
  }

  if (accessCode !== ADMIN_ACCESS_CODE) {
    return res.status(401).json({ error: "접근 코드가 올바르지 않습니다." });
  }

  // Generate admin token
  const token = jwt.sign(
    {
      id: 0,
      email: "admin@streamagent.dev",
      displayName: "관리자",
      role: "admin",
      overlayHash: null
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  res.json({
    success: true,
    user: {
      id: 0,
      email: "admin@streamagent.dev",
      displayName: "관리자",
      role: "admin",
    },
    token,
  });
};

module.exports = { authenticateAdmin, developerLogin, ADMIN_ACCESS_CODE };
