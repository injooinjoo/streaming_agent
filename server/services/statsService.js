/**
 * Stats Service
 * Business logic for statistics and analytics
 */

/**
 * Create Stats Service
 * @param {sqlite3.Database} db - Database instance
 * @returns {Object} Stats service methods
 */
const createStatsService = (db) => {
  /**
   * Promisified db.get
   */
  const dbGet = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  };

  /**
   * Promisified db.all
   */
  const dbAll = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  };

  return {
    // ===== Revenue Statistics =====

    /**
     * Get revenue summary
     * @param {number} days - Days to look back
     * @returns {Promise<Object>}
     */
    async getRevenueSummary(days = 30) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split("T")[0];

      const row = await dbGet(
        `SELECT
          COUNT(*) as donationCount,
          COALESCE(SUM(amount), 0) as totalDonations
        FROM events
        WHERE type = 'donation' AND DATE(timestamp) >= ?`,
        [startDateStr]
      );

      return {
        totalRevenue: row?.totalDonations || 0,
        donationRevenue: row?.totalDonations || 0,
        donationCount: row?.donationCount || 0,
        adRevenue: 0, // TODO: Add ad revenue calculation
        period: `${days}일`,
      };
    },

    /**
     * Get revenue trend (daily)
     * @param {number} days - Days to look back
     * @returns {Promise<Array>}
     */
    async getRevenueTrend(days = 30) {
      const rows = await dbAll(
        `SELECT
          DATE(timestamp) as date,
          COUNT(*) as count,
          COALESCE(SUM(amount), 0) as donations
        FROM events
        WHERE type = 'donation' AND timestamp >= datetime('now', '-${days} days')
        GROUP BY DATE(timestamp)
        ORDER BY date ASC`
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
     * @returns {Promise<Array>}
     */
    async getRevenueByPlatform() {
      const rows = await dbAll(
        `SELECT
          platform,
          COALESCE(SUM(amount), 0) as value
        FROM events
        WHERE type = 'donation'
        GROUP BY platform`
      );

      return (rows || []).map((row) => ({
        name: row.platform === "soop" ? "SOOP" : row.platform === "chzzk" ? "Chzzk" : row.platform,
        value: row.value || 0,
      }));
    },

    /**
     * Get monthly revenue comparison
     * @param {number} months - Months to look back
     * @returns {Promise<Array>}
     */
    async getMonthlyRevenue(months = 6) {
      const rows = await dbAll(
        `SELECT
          strftime('%Y-%m', timestamp) as month,
          COALESCE(SUM(amount), 0) as revenue
        FROM events
        WHERE type = 'donation' AND timestamp >= datetime('now', '-${months} months')
        GROUP BY strftime('%Y-%m', timestamp)
        ORDER BY month ASC`
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
      const rows = await dbAll(
        `SELECT
          sender as username,
          COUNT(*) as donationCount,
          COALESCE(SUM(amount), 0) as totalRevenue
        FROM events
        WHERE type = 'donation' AND sender IS NOT NULL AND sender != ''
        GROUP BY sender
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

    // ===== Streamer Statistics =====

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
        whereClause = "WHERE sender LIKE ?";
        params.push(`%${search}%`);
      }

      const countRow = await dbGet(
        `SELECT COUNT(DISTINCT sender) as total FROM events ${whereClause}`,
        params
      );

      const totalCount = countRow?.total || 0;
      const totalPages = Math.ceil(totalCount / limit);

      const rows = await dbAll(
        `SELECT
          sender as username,
          COUNT(*) as total_events,
          COALESCE(SUM(CASE WHEN type = 'donation' THEN amount ELSE 0 END), 0) as total_donations,
          MIN(timestamp) as first_seen,
          MAX(timestamp) as last_seen
        FROM events
        ${whereClause}
        GROUP BY sender
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

    // ===== Admin Overview =====

    /**
     * Get admin overview statistics
     * @returns {Promise<Object>}
     */
    async getAdminOverview() {
      const queries = {
        totalStreamers: "SELECT COUNT(*) as count FROM users WHERE role IN ('user', 'creator')",
        totalUsers: "SELECT COUNT(*) as count FROM users",
        activeUsers: "SELECT COUNT(*) as count FROM users WHERE created_at > datetime('now', '-30 days')",
        totalRevenue: "SELECT COALESCE(SUM(revenue), 0) as total FROM ad_impressions",
        monthlyRevenue: "SELECT COALESCE(SUM(revenue), 0) as total FROM ad_impressions WHERE strftime('%Y-%m', timestamp) = strftime('%Y-%m', 'now')",
        activeCampaigns: "SELECT COUNT(*) as count FROM ad_campaigns WHERE status = 'active'",
        totalEvents: "SELECT COUNT(*) as count FROM events",
        totalDonations: "SELECT COALESCE(SUM(amount), 0) as total FROM events WHERE type = 'donation'",
      };

      const results = await Promise.all(
        Object.entries(queries).map(async ([key, query]) => {
          try {
            const row = await dbGet(query);
            return [key, row?.count || row?.total || 0];
          } catch {
            return [key, 0];
          }
        })
      );

      const stats = Object.fromEntries(results);

      return {
        totalStreamers: stats.totalStreamers,
        totalUsers: stats.totalUsers,
        activeUsers: stats.activeUsers,
        totalRevenue: Math.round(stats.totalRevenue),
        monthlyRevenue: Math.round(stats.monthlyRevenue),
        activeCampaigns: stats.activeCampaigns,
        totalEvents: stats.totalEvents,
        totalDonations: stats.totalDonations,
      };
    },

    // ===== Viewer/Chat Statistics =====

    /**
     * Get chat activity summary
     * @param {number} days - Days to look back
     * @returns {Promise<Object>}
     */
    async getChatActivitySummary(days = 7) {
      const summary = await dbGet(
        `SELECT
          COUNT(*) as totalChats,
          COUNT(DISTINCT sender) as uniqueUsers,
          COUNT(DISTINCT DATE(timestamp)) as activeDays
        FROM events
        WHERE type = 'chat' AND timestamp >= datetime('now', '-${days} days')`
      );

      const peakChat = await dbGet(
        `SELECT
          strftime('%H:00', timestamp) as hour,
          COUNT(*) as count
        FROM events
        WHERE type = 'chat' AND timestamp >= datetime('now', '-${days} days')
        GROUP BY strftime('%H', timestamp)
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
      const rows = await dbAll(
        `SELECT
          strftime('%H:00', timestamp) as hour,
          COUNT(*) as chats,
          COUNT(DISTINCT sender) as users
        FROM events
        WHERE type = 'chat' AND timestamp >= datetime('now', '-${days} days')
        GROUP BY strftime('%H', timestamp)
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
      const rows = await dbAll(
        `SELECT
          CASE strftime('%w', timestamp)
            WHEN '0' THEN '일'
            WHEN '1' THEN '월'
            WHEN '2' THEN '화'
            WHEN '3' THEN '수'
            WHEN '4' THEN '목'
            WHEN '5' THEN '금'
            WHEN '6' THEN '토'
          END as day,
          strftime('%w', timestamp) as dayNum,
          COUNT(*) as chats,
          COUNT(DISTINCT sender) as users
        FROM events
        WHERE type = 'chat' AND timestamp >= datetime('now', '-${days} days')
        GROUP BY strftime('%w', timestamp)
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
      const rows = await dbAll(
        `SELECT
          DATE(timestamp) as date,
          COUNT(CASE WHEN type = 'chat' THEN 1 END) as chats,
          COUNT(CASE WHEN type = 'donation' THEN 1 END) as donations,
          COALESCE(SUM(CASE WHEN type = 'donation' THEN amount ELSE 0 END), 0) as donationAmount,
          COUNT(DISTINCT sender) as activeUsers
        FROM events
        WHERE timestamp >= datetime('now', '-${days} days')
        GROUP BY DATE(timestamp)
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

    // ===== Platform Statistics =====

    /**
     * Get recent activity feed (donations, subscriptions, follows)
     * @param {number} limit - Max results
     * @returns {Promise<Array>}
     */
    async getRecentActivity(limit = 20) {
      const rows = await dbAll(
        `SELECT
          id,
          type,
          sender as user,
          amount,
          message,
          platform,
          timestamp
        FROM events
        WHERE type IN ('donation', 'subscribe', 'follow', 'subscription')
        ORDER BY timestamp DESC
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

      const summary = await dbGet(
        `SELECT
          COUNT(CASE WHEN type = 'chat' THEN 1 END) as chatCount,
          COUNT(CASE WHEN type = 'donation' THEN 1 END) as donationCount,
          COALESCE(SUM(CASE WHEN type = 'donation' THEN amount ELSE 0 END), 0) as donationAmount,
          COUNT(DISTINCT sender) as uniqueUsers,
          MIN(timestamp) as firstEvent,
          MAX(timestamp) as lastEvent
        FROM events
        WHERE DATE(timestamp) = ?`,
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
      const rows = await dbAll(
        `SELECT
          strftime('%H:00', timestamp) as time,
          platform,
          COUNT(*) as count
        FROM events
        WHERE timestamp >= datetime('now', '-${hours} hours')
        GROUP BY strftime('%H', timestamp), platform
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
        dbAll(`
          SELECT platform,
            COUNT(*) as total_events,
            SUM(CASE WHEN type = 'donation' THEN 1 ELSE 0 END) as donations,
            SUM(CASE WHEN type = 'chat' THEN 1 ELSE 0 END) as chats,
            SUM(CASE WHEN type = 'subscription' THEN 1 ELSE 0 END) as subscriptions,
            SUM(CASE WHEN type = 'follow' THEN 1 ELSE 0 END) as follows,
            COALESCE(SUM(CASE WHEN type = 'donation' THEN amount ELSE 0 END), 0) as donation_amount
          FROM events
          GROUP BY platform
        `),
        dbAll(`
          SELECT platform,
            strftime('%Y-%m-%d', timestamp) as date,
            COUNT(*) as events
          FROM events
          WHERE timestamp > datetime('now', '-7 days')
          GROUP BY platform, date
          ORDER BY date
        `),
      ]);

      return {
        platforms: eventsByPlatform || [],
        trend: recentTrend || [],
      };
    },

    // ===== Viewer Statistics =====

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
          strftime('%H:%M', timestamp) as time,
          timestamp
        FROM viewer_stats
        WHERE timestamp >= datetime('now', '-${hours} hours')
      `;

      const params = [];
      if (platform) {
        query += ` AND platform = ?`;
        params.push(platform);
      }

      query += ` ORDER BY timestamp ASC`;

      const rows = await dbAll(query, params);
      return rows || [];
    },

    /**
     * Get peak viewer count for today
     * @returns {Promise<Object>}
     */
    async getPeakViewers() {
      const today = new Date().toISOString().split('T')[0];

      const peakRow = await dbGet(
        `SELECT
          MAX(viewer_count) as peakViewers,
          strftime('%H:%M', timestamp) as peakTime,
          platform
        FROM viewer_stats
        WHERE DATE(timestamp) = ?
        GROUP BY platform
        ORDER BY peakViewers DESC
        LIMIT 1`,
        [today]
      );

      const totalPeak = await dbGet(
        `SELECT MAX(viewer_count) as peakViewers
        FROM viewer_stats
        WHERE DATE(timestamp) = ?`,
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
     * @returns {Promise<Object>}
     */
    async getDashboardSummary() {
      const today = new Date().toISOString().split('T')[0];

      const [todayStats, peakViewers, subscribeCount, platformStats] = await Promise.all([
        // Today's donation stats
        dbGet(
          `SELECT
            COALESCE(SUM(amount), 0) as todayDonation,
            COUNT(*) as donationCount
          FROM events
          WHERE type = 'donation' AND DATE(timestamp) = ?`,
          [today]
        ),
        // Peak viewers from viewer_stats
        dbGet(
          `SELECT MAX(viewer_count) as peakViewers
          FROM viewer_stats
          WHERE DATE(timestamp) = ?`,
          [today]
        ),
        // Today's subscribe count
        dbGet(
          `SELECT COUNT(*) as newSubs
          FROM events
          WHERE type = 'subscribe' AND DATE(timestamp) = ?`,
          [today]
        ),
        // Platform activity for top categories
        dbAll(
          `SELECT
            platform,
            COUNT(*) as activity,
            COUNT(CASE WHEN type = 'chat' THEN 1 END) as chats,
            COUNT(CASE WHEN type = 'donation' THEN 1 END) as donations
          FROM events
          WHERE timestamp >= datetime('now', '-7 days')
          GROUP BY platform
          ORDER BY activity DESC`
        ),
      ]);

      // Generate insights based on actual data
      const insights = [];

      if (todayStats?.todayDonation > 0) {
        insights.push({
          type: 'donation',
          message: `오늘 ${todayStats.donationCount}건의 후원이 있었습니다`,
          value: `₩${todayStats.todayDonation.toLocaleString()}`
        });
      }

      if (peakViewers?.peakViewers > 0) {
        insights.push({
          type: 'viewers',
          message: `오늘 최고 시청자 수를 기록했습니다`,
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

      // Top categories from platform stats
      const topCategories = (platformStats || []).map((p, i) => ({
        rank: i + 1,
        name: p.platform === 'soop' ? 'SOOP' : p.platform === 'chzzk' ? '치지직' : p.platform,
        platform: p.platform,
        activity: p.activity || 0,
        chats: p.chats || 0,
        donations: p.donations || 0,
      }));

      return {
        todayDonation: todayStats?.todayDonation || 0,
        peakViewers: peakViewers?.peakViewers || 0,
        newSubs: subscribeCount?.newSubs || 0,
        insights,
        topCategories,
      };
    },
  };
};

module.exports = { createStatsService };
