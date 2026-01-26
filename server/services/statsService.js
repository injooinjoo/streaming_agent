/**
 * Stats Service
 * Business logic for statistics and analytics
 *
 * Supports both SQLite (development) and PostgreSQL (production/Supabase)
 */

const { getOne, getAll } = require("../db/connections");
const { getSQLHelpers, isPostgres } = require("../config/database.config");

/**
 * Create Stats Service
 * @returns {Object} Stats service methods
 */
const createStatsService = () => {
  // Get cross-database SQL helpers
  const sql = getSQLHelpers();

  // Unified query helpers (work with both SQLite and PostgreSQL)
  const dbGet = getOne;
  const dbAll = getAll;

  // Alias for backward compatibility (both DBs are now unified)
  const overlayDbGet = dbGet;
  const overlayDbAll = dbAll;
  const streamingDbGet = dbGet;
  const streamingDbAll = dbAll;

  // Helper to build channel/platform filter conditions
  const buildChannelFilter = (channelId, platform) => {
    const conditions = [];
    const params = [];
    if (channelId) {
      conditions.push('target_channel_id = ?');
      params.push(channelId);
    }
    if (platform) {
      conditions.push('platform = ?');
      params.push(platform);
    }
    return { conditions, params };
  };

  return {
    // ===== Revenue Statistics (from streamingDb) =====

    /**
     * Get revenue summary
     * @param {number} days - Days to look back
     * @param {string} channelId - Optional channel ID filter
     * @param {string} platform - Optional platform filter
     * @returns {Promise<Object>}
     */
    async getRevenueSummary(days = 30, channelId = null, platform = null) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split("T")[0];

      const filter = buildChannelFilter(channelId, platform);
      const whereConditions = ["event_type = 'donation'", "DATE(event_timestamp) >= ?", ...filter.conditions];
      const params = [startDateStr, ...filter.params];

      const row = await streamingDbGet(
        `SELECT
          COUNT(*) as donationCount,
          COALESCE(SUM(amount), 0) as totalDonations
        FROM events
        WHERE ${whereConditions.join(' AND ')}`,
        params
      );

      return {
        totalRevenue: row?.totalDonations || 0,
        donationRevenue: row?.totalDonations || 0,
        donationCount: row?.donationCount || 0,
        adRevenue: 0, // TODO: Add ad revenue calculation from overlayDb
        period: `${days}일`,
      };
    },

    /**
     * Get revenue trend (daily)
     * @param {number} days - Days to look back
     * @param {string} channelId - Optional channel ID filter
     * @param {string} platform - Optional platform filter
     * @returns {Promise<Array>}
     */
    async getRevenueTrend(days = 30, channelId = null, platform = null) {
      const filter = buildChannelFilter(channelId, platform);
      const whereConditions = ["event_type = 'donation'", `event_timestamp >= ${sql.dateSubtract(days, 'days')}`, ...filter.conditions];

      const rows = await streamingDbAll(
        `SELECT
          ${sql.dateOnly('event_timestamp')} as date,
          COUNT(*) as count,
          COALESCE(SUM(amount), 0) as donations
        FROM events
        WHERE ${whereConditions.join(' AND ')}
        GROUP BY ${sql.dateOnly('event_timestamp')}
        ORDER BY date ASC`,
        filter.params
      );

      // Fill in empty dates
      const result = [];
      const today = new Date();
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const existing = rows?.find((r) => r.date === dateStr);
        result.push({
          date: `${d.getMonth() + 1}/${d.getDate()}`,
          donations: existing?.donations || 0,
          adRevenue: 0,
        });
      }
      return result;
    },

    /**
     * Get revenue by platform
     * @param {string} channelId - Optional channel ID filter
     * @param {string} platform - Optional platform filter
     * @returns {Promise<Array>}
     */
    async getRevenueByPlatform(channelId = null, platform = null) {
      const filter = buildChannelFilter(channelId, platform);
      const whereConditions = ["event_type = 'donation'", ...filter.conditions];

      const rows = await streamingDbAll(
        `SELECT
          platform,
          COALESCE(SUM(amount), 0) as value
        FROM events
        WHERE ${whereConditions.join(' AND ')}
        GROUP BY platform`,
        filter.params
      );

      return (rows || []).map((row) => ({
        name: row.platform === "soop" ? "SOOP" : row.platform === "chzzk" ? "Chzzk" : row.platform,
        value: row.value || 0,
      }));
    },

    /**
     * Get monthly revenue comparison
     * @param {number} months - Months to look back
     * @param {string} channelId - Optional channel ID filter
     * @param {string} platform - Optional platform filter
     * @returns {Promise<Array>}
     */
    async getMonthlyRevenue(months = 6, channelId = null, platform = null) {
      const filter = buildChannelFilter(channelId, platform);
      const whereConditions = ["event_type = 'donation'", `event_timestamp >= ${sql.dateSubtract(months, 'months')}`, ...filter.conditions];

      const rows = await streamingDbAll(
        `SELECT
          ${sql.formatDate('event_timestamp', 'YYYY-MM')} as month,
          COALESCE(SUM(amount), 0) as revenue
        FROM events
        WHERE ${whereConditions.join(' AND ')}
        GROUP BY ${sql.formatDate('event_timestamp', 'YYYY-MM')}
        ORDER BY month ASC`,
        filter.params
      );

      return (rows || []).map((row) => {
        const [year, month] = row.month.split("-");
        return {
          month: `${parseInt(month, 10)}월`,
          revenue: row.revenue || 0,
        };
      });
    },

    /**
     * Get top streamers by revenue
     * @param {number} limit - Max results
     * @returns {Promise<Array>}
     */
    async getTopStreamersByRevenue(limit = 10) {
      const rows = await streamingDbAll(
        `SELECT
          actor_nickname as username,
          COUNT(*) as donationCount,
          COALESCE(SUM(amount), 0) as totalRevenue
        FROM events
        WHERE event_type = 'donation' AND actor_nickname IS NOT NULL AND actor_nickname != ''
        GROUP BY actor_nickname
        ORDER BY totalRevenue DESC
        LIMIT ?`,
        [limit]
      );

      const totalSum = (rows || []).reduce((sum, r) => sum + (r.totalRevenue || 0), 0);
      return (rows || []).map((row, index) => ({
        id: index + 1,
        username: row.username || "익명",
        totalRevenue: row.totalRevenue || 0,
        share: totalSum > 0 ? ((row.totalRevenue / totalSum) * 100).toFixed(1) : 0,
      }));
    },

    // ===== Streamer Statistics (from streamingDb) =====

    /**
     * Get streamers list (based on donation data)
     * @param {Object} options - Query options
     * @returns {Promise<Object>}
     */
    async getStreamers({ search = "", sortBy = "total_donations", sortOrder = "desc", page = 1, limit = 10 }) {
      const offset = (page - 1) * limit;
      const validSortColumns = ["username", "total_events", "total_donations", "first_seen"];
      const sortColumn = validSortColumns.includes(sortBy) ? sortBy : "total_donations";
      const order = sortOrder === "asc" ? "ASC" : "DESC";

      let whereClause = "";
      const params = [];

      if (search) {
        whereClause = "WHERE actor_nickname LIKE ?";
        params.push(`%${search}%`);
      }

      const countRow = await streamingDbGet(
        `SELECT COUNT(DISTINCT actor_nickname) as total FROM events ${whereClause}`,
        params
      );

      const totalCount = countRow?.total || 0;
      const totalPages = Math.ceil(totalCount / limit);

      const rows = await streamingDbAll(
        `SELECT
          actor_nickname as username,
          COUNT(*) as total_events,
          COALESCE(SUM(CASE WHEN event_type = 'donation' THEN amount ELSE 0 END), 0) as total_donations,
          MIN(event_timestamp) as first_seen,
          MAX(event_timestamp) as last_seen
        FROM events
        ${whereClause}
        GROUP BY actor_nickname
        ORDER BY ${sortColumn} ${order}
        LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      const streamers = (rows || []).map((row, index) => ({
        id: offset + index + 1,
        username: row.username || "익명",
        email: "-",
        role: "user",
        total_events: row.total_events || 0,
        total_donations: row.total_donations || 0,
        created_at: row.first_seen,
        last_seen: row.last_seen,
      }));

      return { streamers, totalCount, totalPages, page, limit };
    },

    // ===== Admin Overview (from both databases) =====

    /**
     * Get admin overview statistics
     * @returns {Promise<Object>}
     */
    async getAdminOverview() {
      // Queries for overlayDb (users, ads)
      const overlayQueries = {
        totalStreamers: "SELECT COUNT(*) as count FROM users WHERE role IN ('user', 'creator')",
        totalUsers: "SELECT COUNT(*) as count FROM users",
        activeUsers: `SELECT COUNT(*) as count FROM users WHERE created_at > ${sql.dateSubtract(30, 'days')}`,
        totalAdRevenue: "SELECT COALESCE(SUM(revenue), 0) as total FROM ad_impressions",
        monthlyAdRevenue: `SELECT COALESCE(SUM(revenue), 0) as total FROM ad_impressions WHERE ${sql.formatDate('timestamp', 'YYYY-MM')} = ${sql.formatDate(sql.now(), 'YYYY-MM')}`,
        activeCampaigns: "SELECT COUNT(*) as count FROM ad_campaigns WHERE status = 'active'",
      };

      // Queries for streamingDb (events)
      const streamingQueries = {
        totalEvents: "SELECT COUNT(*) as count FROM events",
        totalDonations: "SELECT COALESCE(SUM(amount), 0) as total FROM events WHERE event_type = 'donation'",
      };

      // Execute overlay queries
      const overlayResults = await Promise.all(
        Object.entries(overlayQueries).map(async ([key, query]) => {
          try {
            const row = await overlayDbGet(query);
            return [key, row?.count || row?.total || 0];
          } catch {
            return [key, 0];
          }
        })
      );

      // Execute streaming queries
      const streamingResults = await Promise.all(
        Object.entries(streamingQueries).map(async ([key, query]) => {
          try {
            const row = await streamingDbGet(query);
            return [key, row?.count || row?.total || 0];
          } catch {
            return [key, 0];
          }
        })
      );

      const stats = Object.fromEntries([...overlayResults, ...streamingResults]);

      return {
        totalStreamers: stats.totalStreamers,
        totalUsers: stats.totalUsers,
        activeUsers: stats.activeUsers,
        totalRevenue: Math.round(stats.totalAdRevenue),
        monthlyRevenue: Math.round(stats.monthlyAdRevenue),
        activeCampaigns: stats.activeCampaigns,
        totalEvents: stats.totalEvents,
        totalDonations: stats.totalDonations,
      };
    },

    // ===== Viewer/Chat Statistics (from streamingDb) =====

    /**
     * Get chat activity summary
     * @param {number} days - Days to look back
     * @returns {Promise<Object>}
     */
    async getChatActivitySummary(days = 7) {
      const summary = await streamingDbGet(
        `SELECT
          COUNT(*) as totalChats,
          COUNT(DISTINCT actor_nickname) as uniqueUsers,
          COUNT(DISTINCT ${sql.dateOnly('event_timestamp')}) as activeDays
        FROM events
        WHERE event_type = 'chat' AND event_timestamp >= ${sql.dateSubtract(days, 'days')}`
      );

      const peakChat = await streamingDbGet(
        `SELECT
          ${sql.formatDate('event_timestamp', 'HH24:00')} as hour,
          COUNT(*) as count
        FROM events
        WHERE event_type = 'chat' AND event_timestamp >= ${sql.dateSubtract(days, 'days')}
        GROUP BY ${sql.extractHour('event_timestamp')}
        ORDER BY count DESC
        LIMIT 1`
      );

      return {
        totalChats: summary?.totalChats || 0,
        uniqueUsers: summary?.uniqueUsers || 0,
        activeDays: summary?.activeDays || 0,
        peakHour: peakChat?.hour || 'N/A',
        peakChatCount: peakChat?.count || 0,
      };
    },

    /**
     * Get chat trend by hour
     * @param {number} days - Days to look back
     * @returns {Promise<Array>}
     */
    async getChatTrendByHour(days = 7) {
      const rows = await streamingDbAll(
        `SELECT
          ${sql.formatDate('event_timestamp', 'HH24:00')} as hour,
          COUNT(*) as chats,
          COUNT(DISTINCT actor_nickname) as users
        FROM events
        WHERE event_type = 'chat' AND event_timestamp >= ${sql.dateSubtract(days, 'days')}
        GROUP BY ${sql.extractHour('event_timestamp')}
        ORDER BY hour`
      );

      // Fill all hours
      const hourlyData = [];
      for (let i = 0; i < 24; i++) {
        const hourStr = i.toString().padStart(2, '0') + ':00';
        const existing = rows?.find(r => r.hour === hourStr);
        hourlyData.push({
          hour: hourStr,
          chats: existing?.chats || 0,
          users: existing?.users || 0
        });
      }
      return hourlyData;
    },

    /**
     * Get chat trend by day of week
     * @param {number} weeks - Weeks to look back
     * @returns {Promise<Array>}
     */
    async getChatTrendByDayOfWeek(weeks = 4) {
      const days = weeks * 7;
      // Note: PostgreSQL EXTRACT(DOW) returns 0=Sunday like SQLite strftime('%w')
      const dayCase = isPostgres()
        ? `CASE EXTRACT(DOW FROM event_timestamp)::INTEGER
            WHEN 0 THEN '일' WHEN 1 THEN '월' WHEN 2 THEN '화'
            WHEN 3 THEN '수' WHEN 4 THEN '목' WHEN 5 THEN '금' WHEN 6 THEN '토'
          END`
        : `CASE strftime('%w', event_timestamp)
            WHEN '0' THEN '일' WHEN '1' THEN '월' WHEN '2' THEN '화'
            WHEN '3' THEN '수' WHEN '4' THEN '목' WHEN '5' THEN '금' WHEN '6' THEN '토'
          END`;

      const rows = await streamingDbAll(
        `SELECT
          ${dayCase} as day,
          ${sql.extractDayOfWeek('event_timestamp')} as dayNum,
          COUNT(*) as chats,
          COUNT(DISTINCT actor_nickname) as users
        FROM events
        WHERE event_type = 'chat' AND event_timestamp >= ${sql.dateSubtract(days, 'days')}
        GROUP BY ${sql.extractDayOfWeek('event_timestamp')}
        ORDER BY dayNum`
      );

      const dayOrder = ['일', '월', '화', '수', '목', '금', '토'];
      return dayOrder.map(day => {
        const existing = rows?.find(r => r.day === day);
        return {
          day,
          chats: existing?.chats || 0,
          users: existing?.users || 0
        };
      });
    },

    /**
     * Get recent activity timeline
     * @param {number} days - Days to look back
     * @returns {Promise<Array>}
     */
    async getActivityTimeline(days = 7) {
      const rows = await streamingDbAll(
        `SELECT
          ${sql.dateOnly('event_timestamp')} as date,
          COUNT(CASE WHEN event_type = 'chat' THEN 1 END) as chats,
          COUNT(CASE WHEN event_type = 'donation' THEN 1 END) as donations,
          COALESCE(SUM(CASE WHEN event_type = 'donation' THEN amount ELSE 0 END), 0) as donationAmount,
          COUNT(DISTINCT actor_nickname) as activeUsers
        FROM events
        WHERE event_timestamp >= ${sql.dateSubtract(days, 'days')}
        GROUP BY ${sql.dateOnly('event_timestamp')}
        ORDER BY date DESC`
      );

      return (rows || []).map(row => ({
        date: row.date,
        chats: row.chats || 0,
        donations: row.donations || 0,
        donationAmount: row.donationAmount || 0,
        activeUsers: row.activeUsers || 0
      }));
    },

    // ===== Platform Statistics (from streamingDb) =====

    /**
     * Get recent activity feed (donations, subscriptions, follows)
     * @param {number} limit - Max results
     * @returns {Promise<Array>}
     */
    async getRecentActivity(limit = 20) {
      const rows = await streamingDbAll(
        `SELECT
          id,
          event_type as type,
          actor_nickname as user,
          amount,
          message,
          platform,
          event_timestamp as timestamp
        FROM events
        WHERE event_type IN ('donation', 'subscribe', 'follow', 'subscription')
        ORDER BY event_timestamp DESC
        LIMIT ?`,
        [limit]
      );

      return (rows || []).map(row => {
        const time = new Date(row.timestamp);
        return {
          id: row.id,
          time: `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`,
          platform: row.platform || 'unknown',
          user: row.user || '익명',
          type: row.type === 'subscription' ? 'subscribe' : row.type,
          amount: row.amount || 0,
          message: row.message || ''
        };
      });
    },

    /**
     * Get yesterday's broadcast summary
     * @returns {Promise<Object>}
     */
    async getYesterdaySummary() {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().split('T')[0];

      const summary = await streamingDbGet(
        `SELECT
          COUNT(CASE WHEN event_type = 'chat' THEN 1 END) as chatCount,
          COUNT(CASE WHEN event_type = 'donation' THEN 1 END) as donationCount,
          COALESCE(SUM(CASE WHEN event_type = 'donation' THEN amount ELSE 0 END), 0) as donationAmount,
          COUNT(DISTINCT actor_nickname) as uniqueUsers,
          MIN(event_timestamp) as firstEvent,
          MAX(event_timestamp) as lastEvent
        FROM events
        WHERE DATE(event_timestamp) = ?`,
        [dateStr]
      );

      if (!summary || !summary.firstEvent) {
        return {
          date: dateStr,
          startTime: '-',
          endTime: '-',
          duration: '데이터 없음',
          avgViewers: 0,
          peakViewers: 0,
          chatCount: 0,
          donationAmount: 0,
          donationCount: 0
        };
      }

      const firstTime = new Date(summary.firstEvent);
      const lastTime = new Date(summary.lastEvent);
      const durationMs = lastTime - firstTime;
      const hours = Math.floor(durationMs / (1000 * 60 * 60));
      const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

      return {
        date: dateStr,
        startTime: `${String(firstTime.getHours()).padStart(2, '0')}:${String(firstTime.getMinutes()).padStart(2, '0')}`,
        endTime: `${String(lastTime.getHours()).padStart(2, '0')}:${String(lastTime.getMinutes()).padStart(2, '0')}`,
        duration: hours > 0 ? `${hours}시간 ${minutes}분` : `${minutes}분`,
        avgViewers: summary.uniqueUsers || 0,
        peakViewers: summary.uniqueUsers || 0,
        chatCount: summary.chatCount || 0,
        donationAmount: summary.donationAmount || 0,
        donationCount: summary.donationCount || 0
      };
    },

    /**
     * Get hourly activity trend by platform
     * @param {number} hours - Hours to look back
     * @returns {Promise<Array>}
     */
    async getHourlyActivityByPlatform(hours = 24) {
      const rows = await streamingDbAll(
        `SELECT
          ${sql.formatDate('event_timestamp', 'HH24:00')} as time,
          platform,
          COUNT(*) as count
        FROM events
        WHERE event_timestamp >= ${sql.dateSubtract(hours, 'hours')}
        GROUP BY ${sql.extractHour('event_timestamp')}, platform
        ORDER BY time`
      );

      // Build hourly data with platform breakdown
      const hourlyMap = {};
      (rows || []).forEach(row => {
        if (!hourlyMap[row.time]) {
          hourlyMap[row.time] = { time: row.time, soop: 0, chzzk: 0, total: 0 };
        }
        if (row.platform === 'soop') {
          hourlyMap[row.time].soop = row.count;
        } else if (row.platform === 'chzzk') {
          hourlyMap[row.time].chzzk = row.count;
        }
        hourlyMap[row.time].total += row.count;
      });

      // Fill all hours
      const result = [];
      for (let i = 0; i < 24; i++) {
        const hourStr = String(i).padStart(2, '0') + ':00';
        if (hourlyMap[hourStr]) {
          result.push(hourlyMap[hourStr]);
        } else {
          result.push({ time: hourStr, soop: 0, chzzk: 0, total: 0 });
        }
      }
      return result;
    },

    /**
     * Get platform comparison stats
     * @returns {Promise<Object>}
     */
    async getPlatformStats() {
      const [eventsByPlatform, recentTrend] = await Promise.all([
        streamingDbAll(`
          SELECT platform,
            COUNT(*) as total_events,
            SUM(CASE WHEN event_type = 'donation' THEN 1 ELSE 0 END) as donations,
            SUM(CASE WHEN event_type = 'chat' THEN 1 ELSE 0 END) as chats,
            SUM(CASE WHEN event_type = 'subscription' THEN 1 ELSE 0 END) as subscriptions,
            SUM(CASE WHEN event_type = 'follow' THEN 1 ELSE 0 END) as follows,
            COALESCE(SUM(CASE WHEN event_type = 'donation' THEN amount ELSE 0 END), 0) as donation_amount
          FROM events
          GROUP BY platform
        `),
        streamingDbAll(`
          SELECT platform,
            ${sql.formatDate('event_timestamp', 'YYYY-MM-DD')} as date,
            COUNT(*) as events
          FROM events
          WHERE event_timestamp > ${sql.dateSubtract(7, 'days')}
          GROUP BY platform, ${sql.formatDate('event_timestamp', 'YYYY-MM-DD')}
          ORDER BY date
        `),
      ]);

      return {
        platforms: eventsByPlatform || [],
        trend: recentTrend || [],
      };
    },

    // ===== Viewer Statistics (from streamingDb) =====

    /**
     * Get viewer count history
     * @param {number} hours - Hours to look back
     * @param {string|null} platform - Optional platform filter
     * @returns {Promise<Array>}
     */
    async getViewerHistory(hours = 24, platform = null) {
      let query = `
        SELECT
          platform,
          channel_id,
          viewer_count,
          ${sql.formatDate('timestamp', 'HH24:MI')} as time,
          timestamp
        FROM viewer_stats
        WHERE timestamp >= ${sql.dateSubtract(hours, 'hours')}
      `;

      const params = [];
      if (platform) {
        query += ` AND platform = ${isPostgres() ? '$1' : '?'}`;
        params.push(platform);
      }

      query += ` ORDER BY timestamp ASC`;

      const rows = await streamingDbAll(query, params);
      return rows || [];
    },

    /**
     * Get realtime platform summary (total viewers, channels by platform)
     * @returns {Promise<Object>}
     */
    async getRealtimePlatformSummary() {
      // Get current viewers and channels from platform_categories
      const platformData = await streamingDbAll(`
        SELECT
          platform,
          SUM(viewer_count) as total_viewers,
          SUM(streamer_count) as total_channels,
          MAX(last_seen_at) as last_updated
        FROM platform_categories
        WHERE is_active = ${isPostgres() ? 'TRUE' : '1'}
        GROUP BY platform
        ORDER BY total_viewers DESC
      `);

      // Get peak viewers for each platform in last 24h
      const peakData = await streamingDbAll(`
        SELECT
          platform,
          MAX(viewer_count) as peak_viewers
        FROM category_stats
        WHERE recorded_at >= ${sql.dateSubtract(24, 'hours')}
        GROUP BY platform
      `);

      const peakMap = {};
      (peakData || []).forEach(row => {
        peakMap[row.platform] = row.peak_viewers || 0;
      });

      const platformNames = {
        chzzk: '치지직',
        soop: 'SOOP',
        twitch: '트위치',
        youtube: 'YouTube'
      };

      const platforms = (platformData || []).map(row => ({
        platform: row.platform,
        name: platformNames[row.platform] || row.platform,
        viewers: row.total_viewers || 0,
        channels: row.total_channels || 0,
        peak: peakMap[row.platform] || row.total_viewers || 0
      }));

      const totalViewers = platforms.reduce((sum, p) => sum + p.viewers, 0);

      return {
        totalViewers,
        platforms,
        updatedAt: new Date().toISOString()
      };
    },

    /**
     * Get realtime trend data by type (viewers, channels, chats)
     * @param {string} type - Type of trend: 'viewers' | 'channels' | 'chats'
     * @returns {Promise<Array>}
     */
    async getRealtimeTrend(type = 'viewers') {
      const hours = 24;

      if (type === 'chats') {
        // Get chat count by hour from events table
        const chatData = await streamingDbAll(`
          SELECT
            ${sql.formatDate('event_timestamp', 'HH24:00')} as time,
            platform,
            COUNT(*) as count
          FROM events
          WHERE event_type = 'chat'
            AND event_timestamp >= ${sql.dateSubtract(hours, 'hours')}
          GROUP BY ${sql.extractHour('event_timestamp')}, platform
          ORDER BY time
        `);

        const hourlyMap = {};
        (chatData || []).forEach(row => {
          if (!hourlyMap[row.time]) {
            hourlyMap[row.time] = { time: row.time, chzzk: 0, soop: 0, twitch: 0 };
          }
          if (row.platform === 'chzzk') hourlyMap[row.time].chzzk = row.count;
          else if (row.platform === 'soop') hourlyMap[row.time].soop = row.count;
          else if (row.platform === 'twitch') hourlyMap[row.time].twitch = row.count;
        });

        // Fill all hours
        const result = [];
        for (let i = 0; i < 24; i++) {
          const hourStr = String(i).padStart(2, '0') + ':00';
          result.push(hourlyMap[hourStr] || { time: hourStr, chzzk: 0, soop: 0, twitch: 0 });
        }
        return result;
      }

      // For viewers and channels, use category_stats
      const field = type === 'channels' ? 'streamer_count' : 'viewer_count';
      const trendData = await streamingDbAll(`
        SELECT
          ${sql.formatDate('recorded_at', 'HH24:00')} as time,
          platform,
          SUM(${field}) as total
        FROM category_stats
        WHERE recorded_at >= ${sql.dateSubtract(hours, 'hours')}
        GROUP BY ${sql.extractHour('recorded_at')}, platform
        ORDER BY time
      `);

      const hourlyMap = {};
      (trendData || []).forEach(row => {
        if (!hourlyMap[row.time]) {
          hourlyMap[row.time] = { time: row.time, chzzk: 0, soop: 0, twitch: 0 };
        }
        if (row.platform === 'chzzk') hourlyMap[row.time].chzzk = row.total;
        else if (row.platform === 'soop') hourlyMap[row.time].soop = row.total;
        else if (row.platform === 'twitch') hourlyMap[row.time].twitch = row.total;
      });

      // Fill all hours
      const result = [];
      for (let i = 0; i < 24; i++) {
        const hourStr = String(i).padStart(2, '0') + ':00';
        result.push(hourlyMap[hourStr] || { time: hourStr, chzzk: 0, soop: 0, twitch: 0 });
      }
      return result;
    },

    /**
     * Get peak viewer count for today
     * @returns {Promise<Object>}
     */
    async getPeakViewers() {
      const today = new Date().toISOString().split('T')[0];
      const param = isPostgres() ? '$1' : '?';

      const peakRow = await streamingDbGet(
        `SELECT
          MAX(viewer_count) as peakViewers,
          ${sql.formatDate('timestamp', 'HH24:MI')} as peakTime,
          platform
        FROM viewer_stats
        WHERE ${sql.dateOnly('timestamp')} = ${param}
        GROUP BY platform
        ORDER BY peakViewers DESC
        LIMIT 1`,
        [today]
      );

      const totalPeak = await streamingDbGet(
        `SELECT MAX(viewer_count) as peakViewers
        FROM viewer_stats
        WHERE ${sql.dateOnly('timestamp')} = ${param}`,
        [today]
      );

      return {
        peakViewers: totalPeak?.peakViewers || 0,
        peakTime: peakRow?.peakTime || null,
        platform: peakRow?.platform || null,
      };
    },

    /**
     * Get dashboard summary (combined stats for Dashboard.jsx)
     * @param {string|null} channelId - Optional channel ID to filter by
     * @param {string|null} platform - Optional platform filter
     * @returns {Promise<Object>}
     */
    async getDashboardSummary(channelId = null, platform = null) {
      const currentMonth = new Date().toISOString().slice(0, 7); // '2025-01' 형식

      // Build dynamic WHERE conditions for events table
      const buildEventConditions = (baseCondition, params) => {
        let conditions = [baseCondition];
        let queryParams = [...params];
        if (channelId) {
          conditions.push('target_channel_id = ?');
          queryParams.push(channelId);
        }
        if (platform) {
          conditions.push('platform = ?');
          queryParams.push(platform);
        }
        return { where: conditions.join(' AND '), params: queryParams };
      };

      // Build dynamic WHERE conditions for viewer_stats table
      const buildViewerConditions = (baseCondition, params) => {
        let conditions = [baseCondition];
        let queryParams = [...params];
        if (channelId) {
          conditions.push('channel_id = ?');
          queryParams.push(channelId);
        }
        if (platform) {
          conditions.push('platform = ?');
          queryParams.push(platform);
        }
        return { where: conditions.join(' AND '), params: queryParams };
      };

      const donationCond = buildEventConditions(`event_type = 'donation' AND ${sql.formatDate('event_timestamp', 'YYYY-MM')} = ${isPostgres() ? '$1' : '?'}`, [currentMonth]);
      const subscribeCond = buildEventConditions(`event_type = 'subscribe' AND ${sql.formatDate('event_timestamp', 'YYYY-MM')} = ${isPostgres() ? '$1' : '?'}`, [currentMonth]);
      const activityCond = buildEventConditions(`event_timestamp >= ${sql.dateSubtract(7, 'days')}`, []);

      // Build conditions for broadcast_segments (peak viewers)
      const buildSegmentConditions = (baseCondition, params) => {
        let conditions = [baseCondition];
        let queryParams = [...params];
        if (channelId) {
          conditions.push('channel_id = ?');
          queryParams.push(channelId);
        }
        if (platform) {
          conditions.push('platform = ?');
          queryParams.push(platform);
        }
        return { where: conditions.join(' AND '), params: queryParams };
      };
      const segmentCond = buildSegmentConditions(`${sql.formatDate('segment_started_at', 'YYYY-MM')} = ${isPostgres() ? '$1' : '?'}`, [currentMonth]);

      const [todayStats, peakViewers, subscribeCount, platformStats] = await Promise.all([
        // Today's donation stats (filtered by channelId if provided)
        streamingDbGet(
          `SELECT
            COALESCE(SUM(amount), 0) as todayDonation,
            COUNT(*) as donationCount
          FROM events
          WHERE ${donationCond.where}`,
          donationCond.params
        ),
        // Peak viewers from broadcast_segments (filtered by channelId if provided)
        streamingDbGet(
          `SELECT MAX(peak_viewer_count) as peakViewers
           FROM broadcast_segments
           WHERE ${segmentCond.where}`,
          segmentCond.params
        ),
        // Today's subscribe count (filtered by channelId if provided)
        streamingDbGet(
          `SELECT COUNT(*) as newSubs
          FROM events
          WHERE ${subscribeCond.where}`,
          subscribeCond.params
        ),
        // Platform activity (최근 7일, filtered by channelId if provided)
        streamingDbAll(
          `SELECT
            platform,
            COUNT(*) as activity,
            COUNT(CASE WHEN event_type = 'chat' THEN 1 END) as chats,
            COUNT(CASE WHEN event_type = 'donation' THEN 1 END) as donations
          FROM events
          WHERE ${activityCond.where}
          GROUP BY platform
          ORDER BY activity DESC`,
          activityCond.params
        ),
      ]);

      // Generate insights based on actual data
      const insights = [];

      if (todayStats?.todayDonation > 0) {
        insights.push({
          type: 'donation',
          message: `이번 달 ${todayStats.donationCount}건의 후원이 있었습니다`,
          value: `₩${todayStats.todayDonation.toLocaleString()}`
        });
      }

      if (peakViewers?.peakViewers > 0) {
        insights.push({
          type: 'viewers',
          message: `이번 달 최고 시청자 수를 기록했습니다`,
          value: `${peakViewers.peakViewers}명`
        });
      }

      if (platformStats && platformStats.length > 0) {
        const topPlatform = platformStats[0];
        const platformName = topPlatform.platform === 'soop' ? 'SOOP' :
                            topPlatform.platform === 'chzzk' ? '치지직' : topPlatform.platform;
        insights.push({
          type: 'platform',
          message: `${platformName}에서 가장 활발한 활동이 있습니다`,
          value: `${topPlatform.activity}개 이벤트`
        });
      }

      // Default insight if no data
      if (insights.length === 0) {
        insights.push({
          type: 'info',
          message: '플랫폼을 연결하여 데이터 수집을 시작하세요',
          value: ''
        });
      }

      // 내 방송 카테고리 (사용자가 주로 방송하는 카테고리)
      let myCategories = [];
      if (channelId) {
        try {
          // Cross-database duration calculation
          const durationCalc = isPostgres()
            ? `EXTRACT(EPOCH FROM (COALESCE(bs.segment_ended_at, NOW()) - bs.segment_started_at)) / 60`
            : `(julianday(COALESCE(bs.segment_ended_at, datetime('now'))) - julianday(bs.segment_started_at)) * 24 * 60`;
          const boolTrue = isPostgres() ? 'TRUE' : '1';
          const param = isPostgres() ? '$1' : '?';

          const myCategoryRows = await streamingDbAll(`
            SELECT
              bs.category_id,
              bs.category_name,
              COUNT(*) as broadcast_count,
              SUM(COALESCE(CAST(${durationCalc} AS INTEGER), 0)) as total_minutes,
              MAX(bs.peak_viewer_count) as peak_viewers,
              AVG(bs.avg_viewer_count) as avg_viewers,
              MAX(bs.segment_started_at) as last_broadcast_at,
              ug.image_url,
              ug.genre_kr,
              pc_soop.thumbnail_url as soop_thumbnail,
              pc_chzzk.thumbnail_url as chzzk_thumbnail
            FROM broadcast_segments bs
            INNER JOIN broadcasts b ON bs.broadcast_id = b.id
            LEFT JOIN unified_games ug ON (
              LOWER(bs.category_name) = LOWER(ug.name)
              OR LOWER(bs.category_name) = LOWER(ug.name_kr)
            )
            LEFT JOIN platform_categories pc_soop ON (
              pc_soop.platform = 'soop'
              AND LOWER(pc_soop.platform_category_name) = LOWER(bs.category_name)
              AND pc_soop.is_active = ${boolTrue}
            )
            LEFT JOIN platform_categories pc_chzzk ON (
              pc_chzzk.platform = 'chzzk'
              AND LOWER(pc_chzzk.platform_category_name) = LOWER(bs.category_name)
              AND pc_chzzk.is_active = ${boolTrue}
            )
            WHERE bs.channel_id = ${param}
              AND bs.category_name IS NOT NULL
              AND bs.category_name <> ''
            GROUP BY bs.category_id, bs.category_name
            ORDER BY broadcast_count DESC, total_minutes DESC
            LIMIT 5
          `, [channelId]);

          if (myCategoryRows && myCategoryRows.length > 0) {
            myCategories = myCategoryRows.map((row, i) => ({
              rank: i + 1,
              categoryId: row.category_id,
              name: row.category_name,
              imageUrl: row.soop_thumbnail || row.chzzk_thumbnail || row.image_url || null,
              genre: row.genre_kr || null,
              broadcastCount: row.broadcast_count,
              totalMinutes: row.total_minutes || 0,
              peakViewers: row.peak_viewers || 0,
              avgViewers: Math.round(row.avg_viewers || 0),
              lastBroadcastAt: row.last_broadcast_at,
            }));
          }
        } catch (err) {
          console.error('Failed to fetch my categories:', err);
        }
      }

      // Top game categories from unified_games (실제 게임 카테고리)
      // 이미지 우선순위: SOOP 카테고리 이미지 > Chzzk 포스터 이미지 > unified_games 이미지
      let topCategories = [];
      try {
        const boolTrue = isPostgres() ? 'TRUE' : '1';
        // PostgreSQL uses STRING_AGG, SQLite uses GROUP_CONCAT
        const concatDistinct = isPostgres()
          ? `STRING_AGG(DISTINCT pc.platform, ',')`
          : `GROUP_CONCAT(DISTINCT pc.platform)`;

        const categoryRows = await streamingDbAll(`
          SELECT
            ug.id,
            ug.name,
            ug.name_kr,
            ug.image_url,
            ug.genre_kr,
            COALESCE(SUM(pc.viewer_count), 0) as total_viewers,
            COALESCE(SUM(pc.streamer_count), 0) as total_streamers,
            ${concatDistinct} as platforms,
            MAX(CASE WHEN pc.platform = 'soop' THEN pc.thumbnail_url END) as soop_thumbnail,
            MAX(CASE WHEN pc.platform = 'chzzk' THEN pc.thumbnail_url END) as chzzk_thumbnail
          FROM unified_games ug
          LEFT JOIN category_game_mappings cgm ON ug.id = cgm.unified_game_id
          LEFT JOIN platform_categories pc ON cgm.platform = pc.platform
            AND cgm.platform_category_id = pc.platform_category_id
            AND pc.is_active = ${boolTrue}
          GROUP BY ug.id, ug.name, ug.name_kr, ug.image_url, ug.genre_kr
          HAVING COALESCE(SUM(pc.viewer_count), 0) > 0
          ORDER BY total_viewers DESC
          LIMIT 5
        `);
        if (categoryRows && categoryRows.length > 0) {
          topCategories = categoryRows.map((row, i) => ({
            rank: i + 1,
            id: row.id,
            name: row.name_kr || row.name,
            imageUrl: row.soop_thumbnail || row.chzzk_thumbnail || row.image_url || null,
            genre: row.genre_kr,
            totalViewers: row.total_viewers,
            totalStreamers: row.total_streamers,
            platforms: row.platforms ? row.platforms.split(',') : [],
          }));
        }
      } catch (err) {
        console.error('Failed to fetch game categories:', err);
      }

      return {
        todayDonation: todayStats?.todayDonation || 0,
        peakViewers: peakViewers?.peakViewers || 0,
        newSubs: subscribeCount?.newSubs || 0,
        insights,
        myCategories,
        topCategories,
      };
    },
  };
};

module.exports = { createStatsService };
