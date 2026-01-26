/**
 * Stats Service
 * Business logic for statistics and analytics
 *
 * Supports both SQLite (development) and PostgreSQL (production/Supabase)
 */

const { getOne, getAll } = require("../db/connections");
const { getSQLHelpers, isPostgres } = require("../config/database.config");

/**
 * Get placeholder for parameterized queries
 * SQLite uses ?, PostgreSQL uses $1, $2, etc.
 */
const p = (index) => isPostgres() ? `$${index}` : '?';

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
  const buildChannelFilter = (channelId, platform, startIndex = 1) => {
    const conditions = [];
    const params = [];
    let idx = startIndex;
    if (channelId) {
      conditions.push(`target_channel_id = ${p(idx++)}`);
      params.push(channelId);
    }
    if (platform) {
      conditions.push(`platform = ${p(idx++)}`);
      params.push(platform);
    }
    return { conditions, params, nextIndex: idx };
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

      const filter = buildChannelFilter(channelId, platform, 2);
      const whereConditions = ["event_type = 'donation'", `DATE(event_timestamp) >= ${p(1)}`, ...filter.conditions];
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
        LIMIT ${p(1)}`,
        [limit]
      );

      const totalSum = (rows || []).reduce((sum, r) => sum + (Number(r.totalRevenue) || 0), 0);
      return (rows || []).map((row, index) => ({
        id: index + 1,
        username: row.username || "익명",
        totalRevenue: Number(row.totalRevenue) || 0,
        share: totalSum > 0 ? ((Number(row.totalRevenue) / totalSum) * 100).toFixed(1) : 0,
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
      let paramIndex = 1;

      if (search) {
        whereClause = isPostgres() ? `WHERE actor_nickname ILIKE ${p(paramIndex++)}` : `WHERE actor_nickname LIKE ${p(paramIndex++)}`;
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
        LIMIT ${p(paramIndex++)} OFFSET ${p(paramIndex++)}`,
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

    /**
     * Get broadcasters list (based on target_channel_id - actual streamers who received events)
     * @param {Object} options - Query options
     * @returns {Promise<Object>}
     */
    async getBroadcasters({ search = "", sortBy = "total_donations", sortOrder = "desc", page = 1, limit = 20 }) {
      const offset = (page - 1) * limit;
      const validSortColumns = ["channel_id", "total_events", "total_donations", "chat_count", "donation_count", "first_seen"];
      const sortColumn = validSortColumns.includes(sortBy) ? sortBy : "total_donations";
      const order = sortOrder === "asc" ? "ASC" : "DESC";

      let whereClause = "";
      const params = [];
      let paramIndex = 1;

      if (search) {
        whereClause = isPostgres()
          ? `WHERE (target_channel_id ILIKE ${p(paramIndex)} OR p.nickname ILIKE ${p(paramIndex)})`
          : `WHERE (target_channel_id LIKE ${p(paramIndex)} OR p.nickname LIKE ${p(paramIndex)})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      // Count unique channels (broadcasters)
      const countRow = await streamingDbGet(
        `SELECT COUNT(DISTINCT target_channel_id) as total FROM events ${search ? (isPostgres() ? `WHERE target_channel_id ILIKE ${p(1)}` : `WHERE target_channel_id LIKE ${p(1)}`) : ''}`,
        search ? [`%${search}%`] : []
      );

      const totalCount = countRow?.total || 0;
      const totalPages = Math.ceil(totalCount / limit);

      // Get broadcasters with their stats from events table
      const rows = await streamingDbAll(
        `SELECT
          e.target_channel_id as channel_id,
          e.platform,
          p.nickname as broadcaster_name,
          p.profile_image_url,
          COUNT(*) as total_events,
          COUNT(CASE WHEN e.event_type = 'chat' THEN 1 END) as chat_count,
          COUNT(CASE WHEN e.event_type = 'donation' THEN 1 END) as donation_count,
          COALESCE(SUM(CASE WHEN e.event_type = 'donation' THEN e.amount ELSE 0 END), 0) as total_donations,
          MIN(e.event_timestamp) as first_seen,
          MAX(e.event_timestamp) as last_seen,
          COUNT(DISTINCT e.actor_nickname) as unique_viewers
        FROM events e
        LEFT JOIN persons p ON e.target_person_id = p.id
        ${whereClause}
        GROUP BY e.target_channel_id, e.platform, p.nickname, p.profile_image_url
        ORDER BY ${sortColumn} ${order}
        LIMIT ${p(paramIndex++)} OFFSET ${p(paramIndex++)}`,
        [...params, limit, offset]
      );

      const broadcasters = (rows || []).map((row, index) => ({
        id: offset + index + 1,
        channel_id: row.channel_id || "unknown",
        platform: row.platform || "chzzk",
        broadcaster_name: row.broadcaster_name || row.channel_id || "익명 스트리머",
        profile_image_url: row.profile_image_url,
        total_events: row.total_events || 0,
        chat_count: row.chat_count || 0,
        donation_count: row.donation_count || 0,
        total_donations: row.total_donations || 0,
        unique_viewers: row.unique_viewers || 0,
        first_seen: row.first_seen,
        last_seen: row.last_seen,
        // Calculated metrics for influencer discovery
        chat_velocity: row.chat_count > 0 ? Math.round(row.chat_count / Math.max(1, Math.ceil((new Date(row.last_seen) - new Date(row.first_seen)) / (1000 * 60)))) : 0,
        donation_conversion: row.unique_viewers > 0 ? Math.round((row.donation_count / row.unique_viewers) * 100) : 0,
      }));

      return { broadcasters, totalCount, totalPages, page, limit };
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

    // ===== Viewer/Traffic Statistics (from streamingDb) =====
    // Note: Traffic-based metrics using viewer_engagement and broadcast_segments tables

    /**
     * Get viewer traffic summary (traffic-based, not donation-based)
     * @param {number} days - Days to look back
     * @returns {Promise<Object>}
     */
    async getChatActivitySummary(days = 7) {
      // Use viewer_engagement for traffic metrics
      const summary = await streamingDbGet(
        `SELECT
          COUNT(DISTINCT person_id) as uniqueViewers,
          SUM(chat_count) as totalChats,
          COUNT(*) as engagementRecords,
          COUNT(DISTINCT channel_id) as activeChannels
        FROM viewer_engagement
        WHERE last_seen_at >= ${sql.dateSubtract(days, 'days')}`
      );

      // Get peak hour from viewer_engagement activity
      const peakActivity = await streamingDbGet(
        `SELECT
          ${sql.formatDate('last_seen_at', 'HH24:00')} as hour,
          COUNT(DISTINCT person_id) as viewerCount,
          SUM(chat_count) as chatCount
        FROM viewer_engagement
        WHERE last_seen_at >= ${sql.dateSubtract(days, 'days')}
        GROUP BY ${sql.extractHour('last_seen_at')}
        ORDER BY viewerCount DESC
        LIMIT 1`
      );

      // Get peak viewers from broadcast_segments
      const peakViewers = await streamingDbGet(
        `SELECT MAX(peak_viewer_count) as peakViewers
        FROM broadcast_segments
        WHERE segment_started_at >= ${sql.dateSubtract(days, 'days')}`
      );

      // Count active days from viewer_engagement
      const activeDaysResult = await streamingDbGet(
        `SELECT COUNT(DISTINCT ${sql.dateOnly('last_seen_at')}) as activeDays
        FROM viewer_engagement
        WHERE last_seen_at >= ${sql.dateSubtract(days, 'days')}`
      );

      return {
        // Traffic-based metrics
        uniqueViewers: summary?.uniqueViewers || 0,
        totalChats: summary?.totalChats || 0,
        engagementRecords: summary?.engagementRecords || 0,
        activeChannels: summary?.activeChannels || 0,
        activeDays: activeDaysResult?.activeDays || 0,
        peakHour: peakActivity?.hour || 'N/A',
        peakViewerCount: peakActivity?.viewerCount || 0,
        peakChatCount: peakActivity?.chatCount || 0,
        peakBroadcastViewers: peakViewers?.peakViewers || 0,
        // Legacy compatibility
        totalDonations: 0,
        totalAmount: 0,
        uniqueDonors: 0,
        uniqueUsers: summary?.uniqueViewers || 0,
      };
    },

    /**
     * Get viewer activity trend by hour (traffic-based)
     * @param {number} days - Days to look back
     * @returns {Promise<Array>}
     */
    async getChatTrendByHour(days = 7) {
      const rows = await streamingDbAll(
        `SELECT
          ${sql.formatDate('last_seen_at', 'HH24:00')} as hour,
          COUNT(DISTINCT person_id) as viewers,
          SUM(chat_count) as chats
        FROM viewer_engagement
        WHERE last_seen_at >= ${sql.dateSubtract(days, 'days')}
        GROUP BY ${sql.extractHour('last_seen_at')}
        ORDER BY hour`
      );

      // Fill all hours
      const hourlyData = [];
      for (let i = 0; i < 24; i++) {
        const hourStr = i.toString().padStart(2, '0') + ':00';
        const existing = rows?.find(r => r.hour === hourStr);
        hourlyData.push({
          hour: hourStr,
          viewers: existing?.viewers || 0,
          chats: existing?.chats || 0,
          users: existing?.viewers || 0
        });
      }
      return hourlyData;
    },

    /**
     * Get viewer activity trend by day of week (traffic-based)
     * @param {number} weeks - Weeks to look back
     * @returns {Promise<Array>}
     */
    async getChatTrendByDayOfWeek(weeks = 4) {
      const days = weeks * 7;
      // Note: PostgreSQL EXTRACT(DOW) returns 0=Sunday like SQLite strftime('%w')
      const dayCase = isPostgres()
        ? `CASE EXTRACT(DOW FROM last_seen_at)::INTEGER
            WHEN 0 THEN '일' WHEN 1 THEN '월' WHEN 2 THEN '화'
            WHEN 3 THEN '수' WHEN 4 THEN '목' WHEN 5 THEN '금' WHEN 6 THEN '토'
          END`
        : `CASE strftime('%w', last_seen_at)
            WHEN '0' THEN '일' WHEN '1' THEN '월' WHEN '2' THEN '화'
            WHEN '3' THEN '수' WHEN '4' THEN '목' WHEN '5' THEN '금' WHEN '6' THEN '토'
          END`;

      const dayOfWeekExtract = isPostgres()
        ? `EXTRACT(DOW FROM last_seen_at)::INTEGER`
        : `CAST(strftime('%w', last_seen_at) AS INTEGER)`;

      const rows = await streamingDbAll(
        `SELECT
          ${dayCase} as day,
          ${dayOfWeekExtract} as dayNum,
          COUNT(DISTINCT person_id) as viewers,
          SUM(chat_count) as chats
        FROM viewer_engagement
        WHERE last_seen_at >= ${sql.dateSubtract(days, 'days')}
        GROUP BY ${dayOfWeekExtract}
        ORDER BY dayNum`
      );

      const dayOrder = ['일', '월', '화', '수', '목', '금', '토'];
      return dayOrder.map(day => {
        const existing = rows?.find(r => r.day === day);
        return {
          day,
          viewers: existing?.viewers || 0,
          chats: existing?.chats || 0,
          users: existing?.viewers || 0
        };
      });
    },

    /**
     * Get viewer activity timeline (traffic-based)
     * @param {number} days - Days to look back
     * @returns {Promise<Array>}
     */
    async getActivityTimeline(days = 7) {
      // Get daily viewer engagement stats
      const rows = await streamingDbAll(
        `SELECT
          ${sql.dateOnly('last_seen_at')} as date,
          COUNT(DISTINCT person_id) as activeViewers,
          SUM(chat_count) as totalChats,
          COUNT(*) as engagementCount
        FROM viewer_engagement
        WHERE last_seen_at >= ${sql.dateSubtract(days, 'days')}
        GROUP BY ${sql.dateOnly('last_seen_at')}
        ORDER BY date DESC`
      );

      return (rows || []).map(row => ({
        date: row.date,
        activeViewers: row.activeViewers || 0,
        totalChats: row.totalChats || 0,
        engagementCount: row.engagementCount || 0,
        // Legacy compatibility
        chats: row.totalChats || 0,
        activeUsers: row.activeViewers || 0
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
        LIMIT ${p(1)}`,
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

      // Optimized: Only query non-chat events using IN clause (much faster with index)
      const summary = await streamingDbGet(
        `SELECT
          COUNT(CASE WHEN event_type = 'donation' THEN 1 END) as donationCount,
          COALESCE(SUM(CASE WHEN event_type = 'donation' THEN amount ELSE 0 END), 0) as donationAmount,
          COUNT(DISTINCT actor_nickname) as uniqueUsers,
          MIN(event_timestamp) as firstEvent,
          MAX(event_timestamp) as lastEvent
        FROM events
        WHERE event_type IN ('donation', 'subscribe', 'subscription', 'follow')
          AND DATE(event_timestamp) = ${p(1)}`,
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
        chatCount: 0, // Chat counts disabled for performance
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
      // Optimized: Use IN clause for much faster index utilization
      const rows = await streamingDbAll(
        `SELECT
          ${sql.formatDate('event_timestamp', 'HH24:00')} as time,
          platform,
          COUNT(*) as count
        FROM events
        WHERE event_type IN ('donation', 'subscribe', 'subscription', 'follow')
          AND event_timestamp >= ${sql.dateSubtract(hours, 'hours')}
        GROUP BY ${sql.extractHour('event_timestamp')}, platform
        ORDER BY time`
      );

      // Build hourly data with platform breakdown
      const hourlyMap = {};
      (rows || []).forEach(row => {
        if (!hourlyMap[row.time]) {
          hourlyMap[row.time] = { time: row.time, soop: 0, chzzk: 0, total: 0 };
        }
        const count = Number(row.count) || 0;
        if (row.platform === 'soop') {
          hourlyMap[row.time].soop = count;
        } else if (row.platform === 'chzzk') {
          hourlyMap[row.time].chzzk = count;
        }
        hourlyMap[row.time].total += count;
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
      // Optimized: Use IN clause for much faster index utilization (~3s vs ~30s)
      // Chat counts should use a separate summary table in the future
      const [donationStats, recentTrend] = await Promise.all([
        // Non-chat events only (donations, subscriptions, follows) - ~70K total
        streamingDbAll(`
          SELECT platform,
            COUNT(*) as total_events,
            SUM(CASE WHEN event_type = 'donation' THEN 1 ELSE 0 END) as donations,
            SUM(CASE WHEN event_type = 'subscription' THEN 1 ELSE 0 END) as subscriptions,
            SUM(CASE WHEN event_type = 'follow' THEN 1 ELSE 0 END) as follows,
            COALESCE(SUM(CASE WHEN event_type = 'donation' THEN amount ELSE 0 END), 0) as donation_amount
          FROM events
          WHERE event_type IN ('donation', 'subscribe', 'subscription', 'follow')
          GROUP BY platform
        `),
        // Trend data - non-chat events only
        streamingDbAll(`
          SELECT platform,
            ${sql.formatDate('event_timestamp', 'YYYY-MM-DD')} as date,
            COUNT(*) as events
          FROM events
          WHERE event_type IN ('donation', 'subscribe', 'subscription', 'follow')
            AND event_timestamp > ${sql.dateSubtract(7, 'days')}
          GROUP BY platform, ${sql.formatDate('event_timestamp', 'YYYY-MM-DD')}
          ORDER BY date
        `),
      ]);

      // Add placeholder for chats (to be implemented with summary table)
      const platforms = (donationStats || []).map(row => ({
        ...row,
        chats: 0 // TODO: Use summary table for chat counts
      }));

      return {
        platforms,
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
      // FIX: Use MAX per category per hour to deduplicate multiple crawler snapshots,
      // then SUM across categories for each hour, then get MAX of those hourly totals
      const peakData = await streamingDbAll(
        isPostgres()
          ? `
            SELECT platform, MAX(hourly_total) as peak_viewers
            FROM (
              SELECT platform, snapshot_hour, SUM(max_category_viewers) as hourly_total
              FROM (
                SELECT
                  platform,
                  TO_CHAR(recorded_at, 'YYYY-MM-DD HH24:00') as snapshot_hour,
                  platform_category_id,
                  MAX(viewer_count) as max_category_viewers
                FROM category_stats
                WHERE recorded_at >= NOW() - INTERVAL '24 hours'
                GROUP BY platform, TO_CHAR(recorded_at, 'YYYY-MM-DD HH24:00'), platform_category_id
              ) per_category
              GROUP BY platform, snapshot_hour
            ) hourly_sums
            GROUP BY platform
          `
          : `
            SELECT platform, MAX(hourly_total) as peak_viewers
            FROM (
              SELECT platform, snapshot_hour, SUM(max_category_viewers) as hourly_total
              FROM (
                SELECT
                  platform,
                  strftime('%Y-%m-%d %H:00', recorded_at) as snapshot_hour,
                  platform_category_id,
                  MAX(viewer_count) as max_category_viewers
                FROM category_stats
                WHERE recorded_at >= datetime('now', '-24 hours')
                GROUP BY platform, strftime('%Y-%m-%d %H:00', recorded_at), platform_category_id
              ) per_category
              GROUP BY platform, snapshot_hour
            ) hourly_sums
            GROUP BY platform
          `
      );

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
        viewers: Number(row.total_viewers) || 0,
        channels: Number(row.total_channels) || 0,
        peak: Number(peakMap[row.platform]) || Number(row.total_viewers) || 0
      }));

      const totalViewers = platforms.reduce((sum, p) => sum + Number(p.viewers), 0);

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
        // Chat data is too large to query in realtime (13M+ rows)
        // Return placeholder - use summary table in future
        const result = [];
        for (let i = 0; i < 24; i++) {
          const hourStr = String(i).padStart(2, '0') + ':00';
          result.push({ time: hourStr, chzzk: 0, soop: 0, twitch: 0 });
        }
        return result;
      }

      // For viewers and channels, use category_stats
      // FIX: Use MAX per category per hour to avoid duplicate snapshot summation
      // The crawler may run multiple times per hour, so we need to deduplicate
      const field = type === 'channels' ? 'streamer_count' : 'viewer_count';

      // Subquery: Get MAX value per category per hour to deduplicate multiple snapshots
      // Then sum across all categories for each hour
      const trendData = await streamingDbAll(
        isPostgres()
          ? `
            SELECT time, platform, SUM(max_value) as total
            FROM (
              SELECT
                TO_CHAR(recorded_at, 'HH24:00') as time,
                platform,
                platform_category_id,
                MAX(${field}) as max_value
              FROM category_stats
              WHERE recorded_at >= NOW() - INTERVAL '${hours} hours'
              GROUP BY TO_CHAR(recorded_at, 'HH24:00'), platform, platform_category_id
            ) sub
            GROUP BY time, platform
            ORDER BY time
          `
          : `
            SELECT time, platform, SUM(max_value) as total
            FROM (
              SELECT
                strftime('%H:00', recorded_at) as time,
                platform,
                platform_category_id,
                MAX(${field}) as max_value
              FROM category_stats
              WHERE recorded_at >= datetime('now', '-${hours} hours')
              GROUP BY strftime('%H', recorded_at), platform, platform_category_id
            ) sub
            GROUP BY time, platform
            ORDER BY time
          `
      );

      const hourlyMap = {};
      (trendData || []).forEach(row => {
        if (!hourlyMap[row.time]) {
          hourlyMap[row.time] = { time: row.time, chzzk: 0, soop: 0, twitch: 0 };
        }
        const total = Number(row.total) || 0;
        if (row.platform === 'chzzk') hourlyMap[row.time].chzzk = total;
        else if (row.platform === 'soop') hourlyMap[row.time].soop = total;
        else if (row.platform === 'twitch') hourlyMap[row.time].twitch = total;
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

      // Build dynamic WHERE conditions for events table (uses p() for cross-DB compatibility)
      const buildEventConditions = (baseCondition, params, startIndex = params.length + 1) => {
        let conditions = [baseCondition];
        let queryParams = [...params];
        let idx = startIndex;
        if (channelId) {
          conditions.push(`target_channel_id = ${p(idx++)}`);
          queryParams.push(channelId);
        }
        if (platform) {
          conditions.push(`platform = ${p(idx++)}`);
          queryParams.push(platform);
        }
        return { where: conditions.join(' AND '), params: queryParams };
      };

      // Build dynamic WHERE conditions for viewer_stats table
      const buildViewerConditions = (baseCondition, params, startIndex = params.length + 1) => {
        let conditions = [baseCondition];
        let queryParams = [...params];
        let idx = startIndex;
        if (channelId) {
          conditions.push(`channel_id = ${p(idx++)}`);
          queryParams.push(channelId);
        }
        if (platform) {
          conditions.push(`platform = ${p(idx++)}`);
          queryParams.push(platform);
        }
        return { where: conditions.join(' AND '), params: queryParams };
      };

      const donationCond = buildEventConditions(`event_type = 'donation' AND ${sql.formatDate('event_timestamp', 'YYYY-MM')} = ${p(1)}`, [currentMonth], 2);
      const subscribeCond = buildEventConditions(`event_type = 'subscribe' AND ${sql.formatDate('event_timestamp', 'YYYY-MM')} = ${p(1)}`, [currentMonth], 2);
      const activityCond = buildEventConditions(`event_timestamp >= ${sql.dateSubtract(7, 'days')}`, [], 1);

      // Build conditions for viewer_stats (peak viewers)
      const buildViewerStatsConditions = (baseCondition, params, startIndex = params.length + 1) => {
        let conditions = [baseCondition];
        let queryParams = [...params];
        let idx = startIndex;
        if (channelId) {
          conditions.push(`channel_id = ${p(idx++)}`);
          queryParams.push(channelId);
        }
        if (platform) {
          conditions.push(`platform = ${p(idx++)}`);
          queryParams.push(platform);
        }
        return { where: conditions.join(' AND '), params: queryParams };
      };
      const viewerStatsCond = buildViewerStatsConditions(`${sql.formatDate('timestamp', 'YYYY-MM')} = ${p(1)}`, [currentMonth], 2);

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
        // Peak viewers from viewer_stats (filtered by channelId if provided)
        streamingDbGet(
          `SELECT MAX(viewer_count) as peakViewers
           FROM viewer_stats
           WHERE ${viewerStatsCond.where}`,
          viewerStatsCond.params
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
            totalViewers: Number(row.total_viewers) || 0,
            totalStreamers: Number(row.total_streamers) || 0,
            platforms: row.platforms ? row.platforms.split(',') : [],
          }));
        }
      } catch (err) {
        console.error('Failed to fetch game categories:', err);
      }

      return {
        todayDonation: todayStats?.todayDonation || 0,
        donationCount: todayStats?.donationCount || 0,
        peakViewers: peakViewers?.peakViewers || 0,
        newSubs: subscribeCount?.newSubs || 0,
        insights,
        myCategories,
        topCategories,
      };
    },

    // ===== Viewer Journey Statistics =====

    /**
     * Get list of viewers with engagement stats
     * @param {Object} options - Query options
     * @returns {Promise<Object>}
     */
    async getViewersList({ search = "", sortBy = "total_chats", sortOrder = "desc", page = 1, limit = 50 }) {
      const offset = (page - 1) * limit;
      const validSortColumns = ["total_chats", "total_donations", "total_amount", "last_activity", "total_watch_time"];
      const sortColumn = validSortColumns.includes(sortBy) ? sortBy : "total_chats";
      const order = sortOrder === "asc" ? "ASC" : "DESC";

      // Build search condition
      let searchCondition = "";
      const params = [];
      if (search) {
        searchCondition = isPostgres()
          ? `AND p.nickname ILIKE $1`
          : `AND p.nickname LIKE ?`;
        params.push(`%${search}%`);
      }

      // Count total viewers (persons without channel_id = viewers, not streamers)
      const countQuery = `
        SELECT COUNT(DISTINCT p.id) as total
        FROM persons p
        LEFT JOIN viewer_engagement ve ON p.id = ve.person_id
        WHERE p.channel_id IS NULL
        ${searchCondition}
      `;
      const countRow = await streamingDbGet(countQuery, params);
      const totalCount = countRow?.total || 0;
      const totalPages = Math.ceil(totalCount / limit);

      // Get viewers with aggregated stats
      const viewersQuery = `
        SELECT
          p.id,
          p.nickname,
          p.profile_image_url,
          p.platform,
          p.first_seen_at,
          p.last_seen_at,
          COALESCE(SUM(ve.chat_count), 0) as total_chats,
          COALESCE(SUM(ve.donation_count), 0) as total_donations,
          COALESCE(SUM(ve.total_donation_amount), 0) as total_amount,
          MAX(ve.last_seen_at) as last_activity,
          COALESCE((
            SELECT SUM(us.session_duration_seconds)
            FROM user_sessions us
            WHERE us.person_id = p.id
          ), 0) as total_watch_time,
          COUNT(DISTINCT ve.channel_id) as channels_watched
        FROM persons p
        LEFT JOIN viewer_engagement ve ON p.id = ve.person_id
        WHERE p.channel_id IS NULL
        ${searchCondition}
        GROUP BY p.id, p.nickname, p.profile_image_url, p.platform, p.first_seen_at, p.last_seen_at
        HAVING COALESCE(SUM(ve.chat_count), 0) > 0 OR COALESCE(SUM(ve.donation_count), 0) > 0
        ORDER BY ${sortColumn} ${order}
        LIMIT ${isPostgres() ? `$${params.length + 1}` : '?'} OFFSET ${isPostgres() ? `$${params.length + 2}` : '?'}
      `;

      const viewers = await streamingDbAll(viewersQuery, [...params, limit, offset]);

      return {
        viewers: (viewers || []).map(v => ({
          id: v.id,
          nickname: v.nickname || '익명',
          profileImage: v.profile_image_url,
          platform: v.platform,
          firstSeen: v.first_seen_at,
          lastSeen: v.last_seen_at,
          totalChats: v.total_chats || 0,
          totalDonations: v.total_donations || 0,
          totalAmount: v.total_amount || 0,
          lastActivity: v.last_activity,
          totalWatchTime: v.total_watch_time || 0,
          channelsWatched: v.channels_watched || 0
        })),
        totalCount,
        totalPages,
        page,
        limit
      };
    },

    /**
     * Get detailed viewer journey data
     * @param {number} personId - Viewer's person ID
     * @returns {Promise<Object>}
     */
    async getViewerJourney(personId) {
      // Get viewer basic info
      const viewerInfo = await streamingDbGet(
        `SELECT id, nickname, profile_image_url, platform, first_seen_at, last_seen_at
         FROM persons WHERE id = ${p(1)}`,
        [personId]
      );

      if (!viewerInfo) {
        return null;
      }

      // Get channels watched with time
      const channelsQuery = `
        SELECT
          us.channel_id,
          us.platform,
          bp.nickname as streamer_name,
          bp.profile_image_url as streamer_image,
          SUM(us.session_duration_seconds) as watch_seconds,
          COUNT(*) as visit_count,
          MAX(us.session_started_at) as last_visit
        FROM user_sessions us
        LEFT JOIN persons bp ON bp.channel_id = us.channel_id AND bp.platform = us.platform
        WHERE us.person_id = ${p(1)}
        GROUP BY us.channel_id, us.platform, bp.nickname, bp.profile_image_url
        ORDER BY watch_seconds DESC
      `;
      const channels = await streamingDbAll(channelsQuery, [personId]);

      // Get categories watched with time
      const categoriesQuery = `
        SELECT
          us.category_id,
          COALESCE(pc.category_name, pc.platform_category_name, us.category_id) as category_name,
          pc.thumbnail_url as category_image,
          SUM(us.session_duration_seconds) as watch_seconds,
          COUNT(DISTINCT us.channel_id) as streamers_watched
        FROM user_sessions us
        LEFT JOIN platform_categories pc ON us.category_id = pc.platform_category_id AND us.platform = pc.platform
        WHERE us.person_id = ${p(1)} AND us.category_id IS NOT NULL
        GROUP BY us.category_id, pc.category_name, pc.platform_category_name, pc.thumbnail_url
        ORDER BY watch_seconds DESC
      `;
      const categories = await streamingDbAll(categoriesQuery, [personId]);

      // Get engagement stats per channel
      const engagementQuery = `
        SELECT
          ve.channel_id,
          ve.platform,
          bp.nickname as streamer_name,
          ve.chat_count,
          ve.donation_count,
          ve.total_donation_amount,
          ve.first_seen_at,
          ve.last_seen_at
        FROM viewer_engagement ve
        LEFT JOIN persons bp ON bp.channel_id = ve.channel_id AND bp.platform = ve.platform
        WHERE ve.person_id = ${p(1)}
        ORDER BY ve.total_donation_amount DESC, ve.chat_count DESC
      `;
      const engagement = await streamingDbAll(engagementQuery, [personId]);

      // Get total stats
      const totalsQuery = `
        SELECT
          COALESCE(SUM(chat_count), 0) as total_chats,
          COALESCE(SUM(donation_count), 0) as total_donations,
          COALESCE(SUM(total_donation_amount), 0) as total_amount
        FROM viewer_engagement
        WHERE person_id = ${p(1)}
      `;
      const totals = await streamingDbGet(totalsQuery, [personId]);

      // Get total watch time
      const watchTimeQuery = `
        SELECT COALESCE(SUM(session_duration_seconds), 0) as total_watch_time
        FROM user_sessions
        WHERE person_id = ${p(1)}
      `;
      const watchTime = await streamingDbGet(watchTimeQuery, [personId]);

      // Get recent sessions (last 20)
      const recentSessionsQuery = `
        SELECT
          us.id,
          us.channel_id,
          us.platform,
          bp.nickname as streamer_name,
          us.category_id,
          us.session_started_at,
          us.session_ended_at,
          us.session_duration_seconds
        FROM user_sessions us
        LEFT JOIN persons bp ON bp.channel_id = us.channel_id AND bp.platform = us.platform
        WHERE us.person_id = ${p(1)}
        ORDER BY us.session_started_at DESC
        LIMIT 20
      `;
      const recentSessions = await streamingDbAll(recentSessionsQuery, [personId]);

      return {
        viewer: {
          id: viewerInfo.id,
          nickname: viewerInfo.nickname || '익명',
          profileImage: viewerInfo.profile_image_url,
          platform: viewerInfo.platform,
          firstSeen: viewerInfo.first_seen_at,
          lastSeen: viewerInfo.last_seen_at
        },
        totals: {
          totalChats: totals?.total_chats || 0,
          totalDonations: totals?.total_donations || 0,
          totalAmount: totals?.total_amount || 0,
          totalWatchTime: watchTime?.total_watch_time || 0
        },
        channels: (channels || []).map(c => ({
          channelId: c.channel_id,
          platform: c.platform,
          streamerName: c.streamer_name || c.channel_id,
          streamerImage: c.streamer_image,
          watchSeconds: c.watch_seconds || 0,
          visitCount: c.visit_count || 0,
          lastVisit: c.last_visit
        })),
        categories: (categories || []).map(c => ({
          categoryId: c.category_id,
          categoryName: c.category_name || c.category_id,
          categoryImage: c.category_image,
          watchSeconds: c.watch_seconds || 0,
          streamersWatched: c.streamers_watched || 0
        })),
        engagement: (engagement || []).map(e => ({
          channelId: e.channel_id,
          platform: e.platform,
          streamerName: e.streamer_name || e.channel_id,
          chatCount: e.chat_count || 0,
          donationCount: e.donation_count || 0,
          donationAmount: e.total_donation_amount || 0,
          firstSeen: e.first_seen_at,
          lastSeen: e.last_seen_at
        })),
        recentSessions: (recentSessions || []).map(s => ({
          id: s.id,
          channelId: s.channel_id,
          platform: s.platform,
          streamerName: s.streamer_name || s.channel_id,
          categoryId: s.category_id,
          startedAt: s.session_started_at,
          endedAt: s.session_ended_at,
          durationSeconds: s.session_duration_seconds || 0
        }))
      };
    },

    // ===== Content Analytics - Category-based Statistics =====

    /**
     * Get donations by category (for user's channel)
     * @param {number} days - Days to look back
     * @param {string} channelId - Channel ID filter
     * @param {string} platform - Platform filter
     * @returns {Promise<Array>}
     */
    async getCategoryDonations(days = 30, channelId = null, platform = null) {
      const filter = buildChannelFilter(channelId, platform);
      const whereConditions = [
        "e.event_type = 'donation'",
        `e.event_timestamp >= ${sql.dateSubtract(days, 'days')}`,
        ...filter.conditions.map(c => c.replace('target_channel_id', 'e.target_channel_id').replace('platform', 'e.platform'))
      ];

      // Join with broadcast_segments to get category info
      const rows = await streamingDbAll(
        `SELECT
          COALESCE(bs.category_name, '기타') as category_name,
          COUNT(*) as donation_count,
          COALESCE(SUM(e.amount), 0) as total_amount
        FROM events e
        LEFT JOIN broadcast_segments bs ON (
          e.target_channel_id = bs.channel_id
          AND e.event_timestamp BETWEEN bs.segment_started_at AND COALESCE(bs.segment_ended_at, ${sql.now()})
        )
        WHERE ${whereConditions.join(' AND ')}
        GROUP BY bs.category_name
        ORDER BY total_amount DESC
        LIMIT 10`,
        filter.params
      );

      const total = (rows || []).reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0);
      return (rows || []).map(row => ({
        name: row.category_name || '기타',
        value: Number(row.total_amount) || 0,
        count: row.donation_count || 0,
        percent: total > 0 ? Math.round((Number(row.total_amount) / total) * 100) : 0
      }));
    },

    /**
     * Get chat activity by category (for user's channel)
     * @param {number} days - Days to look back
     * @param {string} channelId - Channel ID filter
     * @param {string} platform - Platform filter
     * @returns {Promise<Array>}
     */
    async getCategoryChats(days = 30, channelId = null, platform = null) {
      // Use viewer_engagement joined with broadcast_segments for category data
      const filter = buildChannelFilter(channelId, platform);
      const whereConditions = [
        `ve.last_seen_at >= ${sql.dateSubtract(days, 'days')}`,
        ...filter.conditions.map(c => c.replace('target_channel_id', 've.channel_id').replace('platform', 've.platform'))
      ];

      const rows = await streamingDbAll(
        `SELECT
          COALESCE(bs.category_name, '기타') as category_name,
          SUM(ve.chat_count) as total_chats
        FROM viewer_engagement ve
        LEFT JOIN broadcast_segments bs ON (
          ve.channel_id = bs.channel_id
          AND ve.last_seen_at BETWEEN bs.segment_started_at AND COALESCE(bs.segment_ended_at, ${sql.now()})
        )
        WHERE ${whereConditions.join(' AND ')}
        GROUP BY bs.category_name
        ORDER BY total_chats DESC
        LIMIT 10`,
        filter.params
      );

      const total = (rows || []).reduce((sum, r) => sum + (Number(r.total_chats) || 0), 0);
      return (rows || []).map(row => ({
        name: row.category_name || '기타',
        value: Number(row.total_chats) || 0,
        percent: total > 0 ? Math.round((Number(row.total_chats) / total) * 100) : 0
      }));
    },

    /**
     * Get viewer growth by category (comparing two periods)
     * @param {number} days - Days to look back for current period
     * @param {string} channelId - Channel ID filter
     * @param {string} platform - Platform filter
     * @returns {Promise<Array>}
     */
    async getCategoryGrowth(days = 30, channelId = null, platform = null) {
      const filter = buildChannelFilter(channelId, platform);
      const channelCondition = filter.conditions.map(c => c.replace('target_channel_id', 'bs.channel_id').replace('platform', 'bs.platform'));

      // Current period
      const currentRows = await streamingDbAll(
        `SELECT
          bs.category_name,
          AVG(bs.avg_viewer_count) as avg_viewers
        FROM broadcast_segments bs
        WHERE bs.segment_started_at >= ${sql.dateSubtract(days, 'days')}
          AND bs.category_name IS NOT NULL
          ${channelCondition.length > 0 ? 'AND ' + channelCondition.join(' AND ') : ''}
        GROUP BY bs.category_name`,
        filter.params
      );

      // Previous period (same length before current period)
      const prevRows = await streamingDbAll(
        `SELECT
          bs.category_name,
          AVG(bs.avg_viewer_count) as avg_viewers
        FROM broadcast_segments bs
        WHERE bs.segment_started_at >= ${sql.dateSubtract(days * 2, 'days')}
          AND bs.segment_started_at < ${sql.dateSubtract(days, 'days')}
          AND bs.category_name IS NOT NULL
          ${channelCondition.length > 0 ? 'AND ' + channelCondition.join(' AND ') : ''}
        GROUP BY bs.category_name`,
        filter.params
      );

      // Build growth comparison
      const prevMap = {};
      (prevRows || []).forEach(r => {
        prevMap[r.category_name] = Number(r.avg_viewers) || 0;
      });

      return (currentRows || []).map(row => {
        const current = Number(row.avg_viewers) || 0;
        const prev = prevMap[row.category_name] || 0;
        const growth = prev > 0 ? Math.round(((current - prev) / prev) * 100) : (current > 0 ? 100 : 0);
        return {
          name: row.category_name,
          current: Math.round(current),
          previous: Math.round(prev),
          growth
        };
      }).sort((a, b) => b.growth - a.growth).slice(0, 10);
    },

    /**
     * Get hourly activity breakdown (donations and chats)
     * @param {number} days - Days to look back
     * @param {string} channelId - Channel ID filter
     * @param {string} platform - Platform filter
     * @returns {Promise<Array>}
     */
    async getHourlyByCategory(days = 30, channelId = null, platform = null) {
      const filter = buildChannelFilter(channelId, platform);

      // Get hourly donation data
      const donationConditions = [
        "event_type = 'donation'",
        `event_timestamp >= ${sql.dateSubtract(days, 'days')}`,
        ...filter.conditions
      ];

      const donationRows = await streamingDbAll(
        `SELECT
          ${sql.formatDate('event_timestamp', 'HH24:00')} as hour,
          COALESCE(SUM(amount), 0) as donations
        FROM events
        WHERE ${donationConditions.join(' AND ')}
        GROUP BY ${sql.extractHour('event_timestamp')}
        ORDER BY hour`,
        filter.params
      );

      // Get hourly chat data from viewer_engagement
      const chatConditions = [
        `last_seen_at >= ${sql.dateSubtract(days, 'days')}`,
        ...filter.conditions.map(c => c.replace('target_channel_id', 'channel_id'))
      ];

      const chatRows = await streamingDbAll(
        `SELECT
          ${sql.formatDate('last_seen_at', 'HH24:00')} as hour,
          SUM(chat_count) as chats
        FROM viewer_engagement
        WHERE ${chatConditions.join(' AND ')}
        GROUP BY ${sql.extractHour('last_seen_at')}
        ORDER BY hour`,
        filter.params
      );

      // Merge donation and chat data
      const donationMap = {};
      (donationRows || []).forEach(r => {
        donationMap[r.hour] = Math.round((Number(r.donations) || 0) / 10000); // Convert to 만원
      });

      const chatMap = {};
      (chatRows || []).forEach(r => {
        chatMap[r.hour] = Number(r.chats) || 0;
      });

      // Build 24-hour data
      const result = [];
      for (let i = 0; i < 24; i++) {
        const hourStr = i.toString().padStart(2, '0') + ':00';
        result.push({
          hour: hourStr.replace(':00', '시'),
          donations: donationMap[hourStr] || 0,
          chats: chatMap[hourStr] || 0
        });
      }
      return result;
    },

    /**
     * Get chat activity summary with channel filtering
     * @param {number} days - Days to look back
     * @param {string} channelId - Channel ID filter
     * @param {string} platform - Platform filter
     * @returns {Promise<Object>}
     */
    async getChatActivitySummaryFiltered(days = 7, channelId = null, platform = null) {
      const filter = buildChannelFilter(channelId, platform);
      const conditions = [
        `last_seen_at >= ${sql.dateSubtract(days, 'days')}`,
        ...filter.conditions.map(c => c.replace('target_channel_id', 'channel_id'))
      ];

      const summary = await streamingDbGet(
        `SELECT
          COUNT(DISTINCT person_id) as uniqueViewers,
          SUM(chat_count) as totalChats,
          COUNT(*) as engagementRecords,
          COUNT(DISTINCT channel_id) as activeChannels
        FROM viewer_engagement
        WHERE ${conditions.join(' AND ')}`,
        filter.params
      );

      // Peak hour
      const peakActivity = await streamingDbGet(
        `SELECT
          ${sql.formatDate('last_seen_at', 'HH24:00')} as hour,
          COUNT(DISTINCT person_id) as viewerCount,
          SUM(chat_count) as chatCount
        FROM viewer_engagement
        WHERE ${conditions.join(' AND ')}
        GROUP BY ${sql.extractHour('last_seen_at')}
        ORDER BY viewerCount DESC
        LIMIT 1`,
        filter.params
      );

      // Peak broadcast viewers
      const broadcastFilter = buildChannelFilter(channelId, platform);
      const broadcastConditions = [
        `segment_started_at >= ${sql.dateSubtract(days, 'days')}`,
        ...broadcastFilter.conditions
      ];

      const peakViewers = await streamingDbGet(
        `SELECT MAX(peak_viewer_count) as peakViewers
        FROM broadcast_segments
        WHERE ${broadcastConditions.join(' AND ')}`,
        broadcastFilter.params
      );

      const activeDaysResult = await streamingDbGet(
        `SELECT COUNT(DISTINCT ${sql.dateOnly('last_seen_at')}) as activeDays
        FROM viewer_engagement
        WHERE ${conditions.join(' AND ')}`,
        filter.params
      );

      return {
        uniqueViewers: summary?.uniqueViewers || 0,
        totalChats: summary?.totalChats || 0,
        engagementRecords: summary?.engagementRecords || 0,
        activeChannels: summary?.activeChannels || 0,
        activeDays: activeDaysResult?.activeDays || 0,
        peakHour: peakActivity?.hour || 'N/A',
        peakViewerCount: peakActivity?.viewerCount || 0,
        peakChatCount: peakActivity?.chatCount || 0,
        peakBroadcastViewers: peakViewers?.peakViewers || 0,
      };
    },

    /**
     * Get viewer activity trend by hour with channel filtering
     * @param {number} days - Days to look back
     * @param {string} channelId - Channel ID filter
     * @param {string} platform - Platform filter
     * @returns {Promise<Array>}
     */
    async getChatTrendByHourFiltered(days = 7, channelId = null, platform = null) {
      const filter = buildChannelFilter(channelId, platform);
      const conditions = [
        `last_seen_at >= ${sql.dateSubtract(days, 'days')}`,
        ...filter.conditions.map(c => c.replace('target_channel_id', 'channel_id'))
      ];

      const rows = await streamingDbAll(
        `SELECT
          ${sql.formatDate('last_seen_at', 'HH24:00')} as hour,
          COUNT(DISTINCT person_id) as viewers,
          SUM(chat_count) as chats
        FROM viewer_engagement
        WHERE ${conditions.join(' AND ')}
        GROUP BY ${sql.extractHour('last_seen_at')}
        ORDER BY hour`,
        filter.params
      );

      // Fill all hours
      const hourlyData = [];
      for (let i = 0; i < 24; i++) {
        const hourStr = i.toString().padStart(2, '0') + ':00';
        const existing = rows?.find(r => r.hour === hourStr);
        hourlyData.push({
          hour: hourStr,
          viewers: existing?.viewers || 0,
          chats: existing?.chats || 0,
          users: existing?.viewers || 0
        });
      }
      return hourlyData;
    },

    /**
     * Get viewer activity trend by day of week with channel filtering
     * @param {number} weeks - Weeks to look back
     * @param {string} channelId - Channel ID filter
     * @param {string} platform - Platform filter
     * @returns {Promise<Array>}
     */
    async getChatTrendByDayOfWeekFiltered(weeks = 4, channelId = null, platform = null) {
      const days = weeks * 7;
      const filter = buildChannelFilter(channelId, platform);
      const conditions = [
        `last_seen_at >= ${sql.dateSubtract(days, 'days')}`,
        ...filter.conditions.map(c => c.replace('target_channel_id', 'channel_id'))
      ];

      const dayCase = isPostgres()
        ? `CASE EXTRACT(DOW FROM last_seen_at)::INTEGER
            WHEN 0 THEN '일' WHEN 1 THEN '월' WHEN 2 THEN '화'
            WHEN 3 THEN '수' WHEN 4 THEN '목' WHEN 5 THEN '금' WHEN 6 THEN '토'
          END`
        : `CASE strftime('%w', last_seen_at)
            WHEN '0' THEN '일' WHEN '1' THEN '월' WHEN '2' THEN '화'
            WHEN '3' THEN '수' WHEN '4' THEN '목' WHEN '5' THEN '금' WHEN '6' THEN '토'
          END`;

      const dayOfWeekExtract = isPostgres()
        ? `EXTRACT(DOW FROM last_seen_at)::INTEGER`
        : `CAST(strftime('%w', last_seen_at) AS INTEGER)`;

      const rows = await streamingDbAll(
        `SELECT
          ${dayCase} as day,
          ${dayOfWeekExtract} as dayNum,
          COUNT(DISTINCT person_id) as viewers,
          SUM(chat_count) as chats
        FROM viewer_engagement
        WHERE ${conditions.join(' AND ')}
        GROUP BY ${dayOfWeekExtract}
        ORDER BY dayNum`,
        filter.params
      );

      const dayOrder = ['일', '월', '화', '수', '목', '금', '토'];
      return dayOrder.map(day => {
        const existing = rows?.find(r => r.day === day);
        return {
          day,
          viewers: existing?.viewers || 0,
          chats: existing?.chats || 0,
          users: existing?.viewers || 0
        };
      });
    },

    /**
     * Get activity timeline with channel filtering
     * @param {number} days - Days to look back
     * @param {string} channelId - Channel ID filter
     * @param {string} platform - Platform filter
     * @returns {Promise<Array>}
     */
    async getActivityTimelineFiltered(days = 7, channelId = null, platform = null) {
      const filter = buildChannelFilter(channelId, platform);
      const conditions = [
        `last_seen_at >= ${sql.dateSubtract(days, 'days')}`,
        ...filter.conditions.map(c => c.replace('target_channel_id', 'channel_id'))
      ];

      const rows = await streamingDbAll(
        `SELECT
          ${sql.dateOnly('last_seen_at')} as date,
          COUNT(DISTINCT person_id) as activeViewers,
          SUM(chat_count) as totalChats,
          COUNT(*) as engagementCount
        FROM viewer_engagement
        WHERE ${conditions.join(' AND ')}
        GROUP BY ${sql.dateOnly('last_seen_at')}
        ORDER BY date DESC`,
        filter.params
      );

      return (rows || []).map(row => ({
        date: row.date,
        activeViewers: row.activeViewers || 0,
        totalChats: row.totalChats || 0,
        engagementCount: row.engagementCount || 0,
        chats: row.totalChats || 0,
        activeUsers: row.activeViewers || 0
      }));
    },
  };
};

module.exports = { createStatsService };
