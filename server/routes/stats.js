/**
 * Statistics Routes
 * Event counts, donations, revenue analytics, and streamers data
 */

const express = require("express");
const { runQuery, getOne, getAll, isPostgres } = require("../db/connections");
const { STATS_KEYS, TTL } = require("../services/statsCacheService");

/**
 * Get placeholder for parameterized queries
 */
const p = (index) => isPostgres() ? `$${index}` : '?';

/**
 * Create stats router
 * @param {Object} eventService - Event service instance
 * @param {Object} statsService - Stats service instance
 * @param {Map} activeAdapters - Active platform adapters map
 * @param {Function} authenticateToken - Auth middleware for protected routes
 * @param {Object} userSessionService - User session service instance
 * @param {Object} viewerEstimationService - Viewer estimation service instance
 * @param {Object} statsCacheService - Stats cache service instance (optional)
 * @returns {express.Router}
 */
const createStatsRouter = (
  eventService,
  statsService,
  activeAdapters,
  authenticateToken,
  userSessionService,
  viewerEstimationService,
  statsCacheService = null
) => {
  const router = express.Router();

  // ===== Optional Auth Middleware =====
  // Returns user if authenticated, null otherwise (for public dashboard with limited data)
  const optionalAuth = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      req.user = null;
      return next();
    }

    // If token provided, validate it
    authenticateToken(req, res, next);
  };

  // ===== Event Statistics (Protected) =====

  /**
   * GET /api/stats/events/count
   * Get total event count (requires authentication)
   */
  router.get("/stats/events/count", authenticateToken, async (req, res) => {
    try {
      const total = await eventService.getCount();
      res.json({ total });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/stats/events/by-platform
   * Get event counts grouped by platform (requires authentication)
   */
  router.get("/stats/events/by-platform", authenticateToken, async (req, res) => {
    try {
      const rows = await eventService.getCountByPlatform();
      res.json(rows || []);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===== Donation Statistics (Protected) =====

  /**
   * GET /api/stats/donations
   * Get donation statistics grouped by platform (requires authentication)
   */
  router.get("/stats/donations", authenticateToken, async (req, res) => {
    try {
      const rows = await eventService.getDonationStats();
      res.json(rows || []);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/stats/donations/trend
   * Get donation trend for last 7 days (requires authentication)
   */
  router.get("/stats/donations/trend", authenticateToken, async (req, res) => {
    try {
      const rows = await eventService.getDonationTrend();
      res.json(rows || []);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/stats/donations/top-donors
   * Get top donors ranking (requires authentication)
   */
  router.get("/stats/donations/top-donors", authenticateToken, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit, 10) || 10;
      const { channelId, platform } = req.query;
      const rows = await eventService.getTopDonors(limit, channelId, platform);
      res.json(rows || []);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===== Revenue Statistics (Protected) =====

  /**
   * GET /api/stats/revenue
   * Get revenue summary (requires authentication)
   */
  router.get("/stats/revenue", authenticateToken, async (req, res) => {
    try {
      const days = parseInt(req.query.days, 10) || 30;
      const { channelId, platform } = req.query;
      // 글로벌 요청(채널 필터 없음)이고 기본 days일 때 캐시 사용
      if (statsCacheService && !channelId && !platform) {
        const key = statsCacheService.buildKey(STATS_KEYS.REVENUE_SUMMARY, { days });
        const result = await statsCacheService.getOrCompute(key, () => statsService.getRevenueSummary(days), TTL.MEDIUM);
        return res.json(result);
      }
      const summary = await statsService.getRevenueSummary(days, channelId, platform);
      res.json(summary);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/stats/revenue/trend
   * Get daily revenue trend (requires authentication)
   */
  router.get("/stats/revenue/trend", authenticateToken, async (req, res) => {
    try {
      const days = parseInt(req.query.days, 10) || 30;
      const { channelId, platform } = req.query;
      if (statsCacheService && !channelId && !platform) {
        const key = statsCacheService.buildKey(STATS_KEYS.REVENUE_TREND, { days });
        const result = await statsCacheService.getOrCompute(key, () => statsService.getRevenueTrend(days), TTL.MEDIUM);
        return res.json(result);
      }
      const trend = await statsService.getRevenueTrend(days, channelId, platform);
      res.json(trend);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/stats/revenue/by-platform
   * Get revenue by platform (requires authentication)
   */
  router.get("/stats/revenue/by-platform", authenticateToken, async (req, res) => {
    try {
      const { channelId, platform } = req.query;
      const result = await statsService.getRevenueByPlatform(channelId, platform);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/stats/revenue/monthly
   * Get monthly revenue comparison (requires authentication)
   */
  router.get("/stats/revenue/monthly", authenticateToken, async (req, res) => {
    try {
      const months = parseInt(req.query.months, 10) || 6;
      const { channelId, platform } = req.query;
      const result = await statsService.getMonthlyRevenue(months, channelId, platform);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/stats/revenue/top-streamers
   * Get top streamers by revenue (requires authentication)
   */
  router.get("/stats/revenue/top-streamers", authenticateToken, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit, 10) || 10;
      if (statsCacheService) {
        const key = statsCacheService.buildKey(STATS_KEYS.TOP_STREAMERS_REVENUE, { limit });
        const result = await statsCacheService.getOrCompute(key, () => statsService.getTopStreamersByRevenue(limit), TTL.MEDIUM);
        return res.json(result);
      }
      const result = await statsService.getTopStreamersByRevenue(limit);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===== Streamers (Protected) =====

  /**
   * GET /api/streamers
   * Get streamers list (based on donation data) (requires authentication)
   */
  router.get("/streamers", authenticateToken, async (req, res) => {
    try {
      const result = await statsService.getStreamers({
        search: req.query.search || "",
        sortBy: req.query.sortBy || "total_donations",
        sortOrder: req.query.sortOrder || "desc",
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 10,
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/broadcasters
   * Get broadcasters list (actual streamers who received events) (requires authentication)
   * This returns channels that have received chat/donation events (i.e., have broadcast)
   */
  router.get("/broadcasters", authenticateToken, async (req, res) => {
    try {
      const nexonOnly = req.query.nexonOnly === 'true';

      // Get logged-in user's channel_id to exclude from results
      let excludeChannelId = req.user?.channelId || '';
      if (!excludeChannelId && req.user?.id) {
        const userRow = await getOne(
          `SELECT channel_id FROM users WHERE id = ${p(1)}`,
          [req.user.id]
        );
        excludeChannelId = userRow?.channel_id || '';
      }

      const params = {
        search: req.query.search || "",
        sortBy: req.query.sortBy || (nexonOnly ? "nexon_affinity" : "total_donations"),
        sortOrder: req.query.sortOrder || "desc",
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 20,
        nexonOnly,
        excludeChannelId,
      };
      // nexonOnly 모드에서는 캐시 키에 nexonOnly 포함
      const cacheKeyExtra = nexonOnly ? { nexonOnly: true, sortBy: params.sortBy, page: params.page } : { sortBy: params.sortBy, page: 1 };
      if (statsCacheService && !params.search && params.page === 1) {
        const key = statsCacheService.buildKey(STATS_KEYS.BROADCASTERS, cacheKeyExtra);
        const result = await statsCacheService.getOrCompute(key, () => statsService.getBroadcasters(params), TTL.MEDIUM);
        return res.json(result);
      }
      const result = await statsService.getBroadcasters(params);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/stats/top-streamers-by-viewers
   * Get top streamers ranked by peak or cumulative viewer count
   */
  router.get("/stats/top-streamers-by-viewers", async (req, res) => {
    try {
      const sortBy = req.query.sortBy || "peak";
      const platform = req.query.platform || null;
      const limit = parseInt(req.query.limit, 10) || 10;
      if (statsCacheService && !platform) {
        const key = statsCacheService.buildKey(STATS_KEYS.TOP_STREAMERS_VIEWERS, { sortBy, limit });
        const result = await statsCacheService.getOrCompute(key, () => statsService.getTopStreamersByViewers({ sortBy, limit }), TTL.MEDIUM);
        return res.json(result);
      }
      const result = await statsService.getTopStreamersByViewers({ sortBy, platform, limit });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===== Platform Statistics (Protected) =====

  /**
   * GET /api/stats/platforms
   * Get platform comparison stats (requires authentication)
   */
  router.get("/stats/platforms", authenticateToken, async (req, res) => {
    try {
      if (statsCacheService) {
        const result = await statsCacheService.getOrCompute(STATS_KEYS.PLATFORM_STATS, () => statsService.getPlatformStats(), TTL.MEDIUM);
        return res.json(result);
      }
      const result = await statsService.getPlatformStats();
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===== Chat/Activity Statistics (Protected) =====

  /**
   * GET /api/stats/chat/summary
   * Get chat activity summary (requires authentication)
   * Supports channel filtering via channelId and platform query params
   */
  router.get("/stats/chat/summary", authenticateToken, async (req, res) => {
    try {
      const days = parseInt(req.query.days, 10) || 7;
      const { channelId, platform } = req.query;
      // 글로벌 요청일 때 캐시 사용
      if (statsCacheService && !channelId && !platform) {
        const key = statsCacheService.buildKey(STATS_KEYS.CHAT_SUMMARY, { days });
        const result = await statsCacheService.getOrCompute(key, () => statsService.getChatActivitySummary(days), TTL.FAST);
        return res.json(result);
      }
      // Use filtered version if channel params provided
      const result = channelId || platform
        ? await statsService.getChatActivitySummaryFiltered(days, channelId, platform)
        : await statsService.getChatActivitySummary(days);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/stats/chat/hourly
   * Get chat trend by hour (requires authentication)
   * Supports channel filtering via channelId and platform query params
   */
  router.get("/stats/chat/hourly", authenticateToken, async (req, res) => {
    try {
      const days = parseInt(req.query.days, 10) || 7;
      const { channelId, platform } = req.query;
      const result = channelId || platform
        ? await statsService.getChatTrendByHourFiltered(days, channelId, platform)
        : await statsService.getChatTrendByHour(days);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/stats/chat/daily
   * Get chat trend by day of week (requires authentication)
   * Supports channel filtering via channelId and platform query params
   */
  router.get("/stats/chat/daily", authenticateToken, async (req, res) => {
    try {
      const weeks = parseInt(req.query.weeks, 10) || 4;
      const { channelId, platform } = req.query;
      const result = channelId || platform
        ? await statsService.getChatTrendByDayOfWeekFiltered(weeks, channelId, platform)
        : await statsService.getChatTrendByDayOfWeek(weeks);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/stats/activity/timeline
   * Get activity timeline (requires authentication)
   * Supports channel filtering via channelId and platform query params
   */
  router.get("/stats/activity/timeline", authenticateToken, async (req, res) => {
    try {
      const days = parseInt(req.query.days, 10) || 7;
      const { channelId, platform } = req.query;
      const result = channelId || platform
        ? await statsService.getActivityTimelineFiltered(days, channelId, platform)
        : await statsService.getActivityTimeline(days);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===== Content Analytics - Category-based Statistics (Protected) =====

  /**
   * GET /api/stats/content/category-donations
   * Get donations by category for user's channel (requires authentication)
   */
  router.get("/stats/content/category-donations", authenticateToken, async (req, res) => {
    try {
      const days = parseInt(req.query.days, 10) || 30;
      const { channelId, platform } = req.query;
      // 글로벌 요청일 때 캐시 사용
      if (statsCacheService && !channelId && !platform) {
        const key = statsCacheService.buildKey(STATS_KEYS.CATEGORY_DONATIONS, { days });
        const result = await statsCacheService.getOrCompute(key, () => statsService.getCategoryDonations(days), TTL.MEDIUM);
        return res.json(result);
      }
      const result = await statsService.getCategoryDonations(days, channelId, platform);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/stats/content/category-chats
   * Get chat activity by category for user's channel (requires authentication)
   */
  router.get("/stats/content/category-chats", authenticateToken, async (req, res) => {
    try {
      const days = parseInt(req.query.days, 10) || 30;
      const { channelId, platform } = req.query;
      const result = await statsService.getCategoryChats(days, channelId, platform);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/stats/content/category-growth
   * Get viewer growth by category (requires authentication)
   */
  router.get("/stats/content/category-growth", authenticateToken, async (req, res) => {
    try {
      const days = parseInt(req.query.days, 10) || 30;
      const { channelId, platform } = req.query;
      const result = await statsService.getCategoryGrowth(days, channelId, platform);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/stats/content/hourly-by-category
   * Get hourly activity breakdown (donations and chats) (requires authentication)
   */
  router.get("/stats/content/hourly-by-category", authenticateToken, async (req, res) => {
    try {
      const days = parseInt(req.query.days, 10) || 30;
      const { channelId, platform } = req.query;
      const result = await statsService.getHourlyByCategory(days, channelId, platform);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/stats/activity/recent
   * Get recent activity feed (requires authentication)
   */
  router.get("/stats/activity/recent", authenticateToken, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit, 10) || 20;
      const result = await statsService.getRecentActivity(limit);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/stats/yesterday
   * Get yesterday broadcast summary (requires authentication)
   */
  router.get("/stats/yesterday", authenticateToken, async (req, res) => {
    try {
      const result = await statsService.getYesterdaySummary();
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/stats/hourly-by-platform
   * Get hourly activity by platform (requires authentication)
   */
  router.get("/stats/hourly-by-platform", authenticateToken, async (req, res) => {
    try {
      const hours = parseInt(req.query.hours, 10) || 24;
      const result = await statsService.getHourlyActivityByPlatform(hours);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===== Realtime Statistics (Protected) =====

  /**
   * GET /api/stats/realtime/summary
   * Get realtime platform summary (total viewers, channels by platform)
   */
  router.get("/stats/realtime/summary", authenticateToken, async (req, res) => {
    try {
      if (statsCacheService) {
        const result = await statsCacheService.getOrCompute(STATS_KEYS.REALTIME_PLATFORM, () => statsService.getRealtimePlatformSummary(), TTL.FAST);
        return res.json(result);
      }
      const result = await statsService.getRealtimePlatformSummary();
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/stats/realtime/trend
   * Get realtime trend data by type (viewers, channels, chats)
   * Query params: type = viewers | channels | chats
   */
  router.get("/stats/realtime/trend", authenticateToken, async (req, res) => {
    try {
      const type = req.query.type || 'viewers';
      if (!['viewers', 'channels', 'chats'].includes(type)) {
        return res.status(400).json({ error: 'Invalid type. Must be viewers, channels, or chats' });
      }
      if (statsCacheService) {
        const key = statsCacheService.buildKey(STATS_KEYS.REALTIME_TREND, { type });
        const result = await statsCacheService.getOrCompute(key, () => statsService.getRealtimeTrend(type), TTL.FAST);
        return res.json(result);
      }
      const result = await statsService.getRealtimeTrend(type);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===== Viewer Statistics (Protected) =====

  /**
   * GET /api/stats/viewers/history
   * Get viewer count history (requires authentication)
   */
  router.get("/stats/viewers/history", authenticateToken, async (req, res) => {
    try {
      const hours = parseInt(req.query.hours, 10) || 24;
      const platform = req.query.platform || null;
      const result = await statsService.getViewerHistory(hours, platform);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/stats/viewers/peak
   * Get peak viewer count for today (requires authentication)
   */
  router.get("/stats/viewers/peak", authenticateToken, async (req, res) => {
    try {
      const result = await statsService.getPeakViewers();
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===== Viewer Session Statistics (Protected) =====

  /**
   * GET /api/stats/viewers/unique/:broadcastId
   * Get unique viewer count for a broadcast (requires authentication)
   */
  router.get("/stats/viewers/unique/:broadcastId", authenticateToken, async (req, res) => {
    try {
      const broadcastId = parseInt(req.params.broadcastId, 10);
      const uniqueViewers = await userSessionService.getUniqueViewers(broadcastId);
      res.json({ broadcastId, uniqueViewers });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/stats/viewers/estimated/:broadcastId
   * Get estimated total viewers for a broadcast (Chzzk hybrid approach) (requires authentication)
   * Query params:
   *  - channelId: Channel ID
   *  - platform: Platform (chzzk)
   *  - startTime: Broadcast start time (ISO format)
   */
  router.get("/stats/viewers/estimated/:broadcastId", authenticateToken, async (req, res) => {
    try {
      const broadcastId = parseInt(req.params.broadcastId, 10);
      const { channelId, platform, startTime } = req.query;

      if (!channelId || !platform || !startTime) {
        return res.status(400).json({
          error: "Missing required query parameters: channelId, platform, startTime"
        });
      }

      const estimate = await viewerEstimationService.estimateTotalViewers({
        channelId,
        platform,
        broadcastId,
        startTime,
      });

      res.json({ broadcastId, ...estimate });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/stats/viewers/watch-time/:broadcastId
   * Get average watch time for a broadcast (requires authentication)
   */
  router.get("/stats/viewers/watch-time/:broadcastId", authenticateToken, async (req, res) => {
    try {
      const broadcastId = parseInt(req.params.broadcastId, 10);
      const avgSeconds = await userSessionService.getAverageWatchTime(broadcastId);
      res.json({
        broadcastId,
        averageWatchTimeSeconds: avgSeconds,
        averageWatchTimeMinutes: Math.round(avgSeconds / 60)
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/stats/viewers/sessions/:broadcastId
   * Get active viewer sessions for a broadcast (requires authentication)
   */
  router.get("/stats/viewers/sessions/:broadcastId", authenticateToken, async (req, res) => {
    try {
      const broadcastId = parseInt(req.params.broadcastId, 10);
      const sessions = userSessionService.getActiveSessions(broadcastId);
      res.json({
        broadcastId,
        activeSessionCount: sessions.length,
        sessions
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/stats/viewers/daily-estimate
   * Get daily viewer estimate for a specific channel and date (requires authentication)
   * Query params:
   *  - channelId: Channel ID
   *  - platform: Platform (chzzk)
   *  - date: Date (YYYY-MM-DD)
   */
  router.get("/stats/viewers/daily-estimate", authenticateToken, async (req, res) => {
    try {
      const { channelId, platform, date } = req.query;

      if (!channelId || !platform || !date) {
        return res.status(400).json({
          error: "Missing required query parameters: channelId, platform, date"
        });
      }

      const estimate = await viewerEstimationService.estimateDailyViewers(
        channelId,
        platform,
        date
      );

      res.json({ channelId, platform, date, ...estimate });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/stats/viewers/pattern
   * Get viewer activity pattern analysis (requires authentication)
   * Query params:
   *  - channelId: Channel ID
   *  - platform: Platform
   *  - days: Number of days to analyze (default: 7)
   */
  router.get("/stats/viewers/pattern", authenticateToken, async (req, res) => {
    try {
      const { channelId, platform } = req.query;
      const days = parseInt(req.query.days, 10) || 7;

      if (!channelId || !platform) {
        return res.status(400).json({
          error: "Missing required query parameters: channelId, platform"
        });
      }

      const pattern = await viewerEstimationService.analyzeViewerPattern(
        channelId,
        platform,
        days
      );

      res.json({ channelId, platform, ...pattern });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/stats/dashboard
   * Get dashboard summary (for Dashboard.jsx)
   * Uses optional auth - returns full data for authenticated users,
   * or empty/demo data for unauthenticated users
   */
  router.get("/stats/dashboard", optionalAuth, async (req, res) => {
    try {
      // channelId를 쿼리 파라미터에서 가져옴 (로그인 사용자의 채널)
      const channelId = req.query.channelId || null;
      const platform = req.query.platform || null;

      // If not authenticated and no channelId, return empty dashboard prompting login
      if (!req.user && !channelId) {
        return res.json({
          todayDonation: 0,
          peakViewers: 0,
          newSubs: 0,
          insights: [
            {
              type: "info",
              message: "로그인하여 실시간 데이터를 확인하세요",
              value: null
            }
          ],
          topCategories: [],
          requiresAuth: true
        });
      }

      // 글로벌 대시보드(채널 필터 없음)일 때 캐시 사용
      if (statsCacheService && !channelId && !platform) {
        const result = await statsCacheService.getOrCompute(STATS_KEYS.DASHBOARD_SUMMARY, () => statsService.getDashboardSummary(), TTL.FAST);
        return res.json(result);
      }
      // channelId가 있으면 해당 채널의 데이터만 조회
      const result = await statsService.getDashboardSummary(channelId, platform);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===== Viewer Journey Statistics (Admin) =====

  /**
   * GET /api/stats/viewers/list
   * Get list of viewers with engagement stats (requires authentication)
   * Query params: search, sortBy, sortOrder, page, limit
   */
  router.get("/stats/viewers/list", authenticateToken, async (req, res) => {
    try {
      const result = await statsService.getViewersList({
        search: req.query.search || "",
        sortBy: req.query.sortBy || "total_chats",
        sortOrder: req.query.sortOrder || "desc",
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 50,
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/stats/viewers/:personId/journey
   * Get detailed viewer journey data (requires authentication)
   */
  router.get("/stats/viewers/:personId/journey", authenticateToken, async (req, res) => {
    try {
      const personId = parseInt(req.params.personId, 10);
      if (isNaN(personId)) {
        return res.status(400).json({ error: "Invalid personId" });
      }
      const result = await statsService.getViewerJourney(personId);
      if (!result) {
        return res.status(404).json({ error: "Viewer not found" });
      }
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===== Connection Status =====

  /**
   * GET /api/connections/status
   * Get platform connection status
   */
  router.get("/connections/status", (req, res) => {
    const connections = {
      soop: [],
      chzzk: [],
    };

    for (const [key, adapter] of activeAdapters.entries()) {
      if (adapter.platform === "soop") {
        connections.soop.push({
          key,
          connected: adapter.isConnected,
          channelId: adapter.bjId,
          broadNo: adapter.broadNo,
        });
      } else if (adapter.platform === "chzzk") {
        connections.chzzk.push({
          key,
          connected: adapter.isConnected,
          channelId: adapter.channelId,
          chatChannelId: adapter.chatChannelId,
        });
      }
    }

    res.json({
      soop: {
        connected: connections.soop.some((c) => c.connected),
        channels: connections.soop,
      },
      chzzk: {
        connected: connections.chzzk.some((c) => c.connected),
        channels: connections.chzzk,
      },
    });
  });

  // ===== Admin/Debug Endpoints =====

  /**
   * GET /api/stats/debug/event-types
   * Get event type distribution (for debugging)
   */
  router.get("/stats/debug/event-types", async (req, res) => {
    try {
      const rows = await getAll(`
        SELECT event_type, COUNT(*) as count
        FROM events
        GROUP BY event_type
        ORDER BY count DESC
      `);
      res.json(rows || []);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * DELETE /api/stats/admin/cleanup/viewer-update
   * Delete viewer-update events from events table (they should be in viewer_stats)
   */
  router.delete("/stats/admin/cleanup/viewer-update", authenticateToken, async (req, res) => {
    try {
      // Only allow admin users
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }

      const countBefore = await getOne(`SELECT COUNT(*) as count FROM events WHERE event_type = 'viewer-update'`);

      await runQuery(`DELETE FROM events WHERE event_type = 'viewer-update'`);

      const countAfter = await getOne(`SELECT COUNT(*) as count FROM events WHERE event_type = 'viewer-update'`);

      res.json({
        success: true,
        deletedCount: (countBefore?.count || 0) - (countAfter?.count || 0),
        message: `Deleted ${(countBefore?.count || 0) - (countAfter?.count || 0)} viewer-update events`
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/stats/admin/cleanup/viewer-update
   * Same as DELETE but using POST for easier calling
   */
  router.post("/stats/admin/cleanup/viewer-update", async (req, res) => {
    try {
      const countBefore = await getOne(`SELECT COUNT(*) as count FROM events WHERE event_type = 'viewer-update'`);

      await runQuery(`DELETE FROM events WHERE event_type = 'viewer-update'`);

      const countAfter = await getOne(`SELECT COUNT(*) as count FROM events WHERE event_type = 'viewer-update'`);

      res.json({
        success: true,
        deletedCount: (countBefore?.count || 0) - (countAfter?.count || 0),
        message: `Deleted ${(countBefore?.count || 0) - (countAfter?.count || 0)} viewer-update events`
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/stats/debug/db-status
   * Get comprehensive database status for debugging production issues
   */
  router.get("/stats/debug/db-status", async (req, res) => {
    try {
      const { getSQLHelpers } = require("../config/database.config");
      const sql = getSQLHelpers();
      const currentMonth = new Date().toISOString().slice(0, 7);

      const [
        eventTypes,
        viewerStatsCount,
        recentDonations,
        recentSubscribes,
        tableInfo
      ] = await Promise.all([
        // Event types distribution
        getAll(`
          SELECT event_type, COUNT(*) as count,
                 COALESCE(SUM(amount), 0) as total_amount
          FROM events
          GROUP BY event_type
          ORDER BY count DESC
        `),
        // viewer_stats count
        getOne(`SELECT COUNT(*) as count FROM viewer_stats`),
        // Recent donations (last 10) - include target_channel_id for debugging
        getAll(`
          SELECT id, event_type, actor_nickname, amount, platform, event_timestamp, target_channel_id
          FROM events
          WHERE event_type = 'donation'
          ORDER BY event_timestamp DESC
          LIMIT 10
        `),
        // Recent subscribes (last 10)
        getAll(`
          SELECT id, event_type, actor_nickname, platform, event_timestamp
          FROM events
          WHERE event_type = 'subscribe'
          ORDER BY event_timestamp DESC
          LIMIT 10
        `),
        // Table row counts
        Promise.all([
          getOne(`SELECT COUNT(*) as count FROM events`),
          getOne(`SELECT COUNT(*) as count FROM viewer_stats`),
          getOne(`SELECT COUNT(*) as count FROM persons`),
          getOne(`SELECT COUNT(*) as count FROM broadcasts`),
          getOne(`SELECT COUNT(*) as count FROM viewer_engagement`),
          getOne(`SELECT COUNT(*) as count FROM user_sessions`),
        ])
      ]);

      // Current month stats check
      const monthlyDonations = await getOne(`
        SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
        FROM events
        WHERE event_type = 'donation' AND ${sql.formatDate('event_timestamp', 'YYYY-MM')} = ${p(1)}
      `, [currentMonth]);

      const monthlyViewerStats = await getOne(`
        SELECT COUNT(*) as count, MAX(viewer_count) as max_viewers
        FROM viewer_stats
        WHERE ${sql.formatDate('timestamp', 'YYYY-MM')} = ${p(1)}
      `, [currentMonth]);

      res.json({
        environment: {
          nodeEnv: process.env.NODE_ENV,
          isPostgres: isPostgres(),
          currentMonth
        },
        eventTypes: eventTypes || [],
        tableCounts: {
          events: tableInfo[0]?.count || 0,
          viewer_stats: tableInfo[1]?.count || 0,
          persons: tableInfo[2]?.count || 0,
          broadcasts: tableInfo[3]?.count || 0,
          viewer_engagement: tableInfo[4]?.count || 0,
          user_sessions: tableInfo[5]?.count || 0
        },
        currentMonthStats: {
          donations: {
            count: monthlyDonations?.count || 0,
            totalAmount: monthlyDonations?.total || 0
          },
          viewerStats: {
            count: monthlyViewerStats?.count || 0,
            maxViewers: monthlyViewerStats?.max_viewers || 0
          }
        },
        recentDonations: recentDonations || [],
        recentSubscribes: recentSubscribes || []
      });
    } catch (err) {
      res.status(500).json({ error: err.message, stack: err.stack });
    }
  });

  return router;
};

module.exports = { createStatsRouter };
