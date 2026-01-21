/**
 * Stats Service
 * Business logic for statistics and analytics
 *
 * Uses two databases:
 * - overlayDb: User data for admin stats
 * - streamingDb: Events data for viewer/donation stats
 */

/**
 * Create Stats Service
 * @param {sqlite3.Database} overlayDb - Overlay database instance (users, ads)
 * @param {sqlite3.Database} streamingDb - Streaming database instance (events, viewer_stats)
 * @returns {Object} Stats service methods
 */
const createStatsService = (overlayDb, streamingDb) => {
  /**
   * Promisified db.get for overlay database
   */
  const overlayDbGet = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      overlayDb.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  };

  /**
   * Promisified db.all for overlay database
   */
  const overlayDbAll = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      overlayDb.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  };

  /**
   * Promisified db.get for streaming database
   */
  const streamingDbGet = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      streamingDb.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  };

  /**
   * Promisified db.all for streaming database
   */
  const streamingDbAll = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      streamingDb.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  };

  return {
    // ===== Revenue Statistics (from streamingDb) =====

    /**
     * Get revenue summary
     * @param {number} days - Days to look back
     * @returns {Promise<Object>}
     */
    async getRevenueSummary(days = 30) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split("T")[0];

      const row = await streamingDbGet(
        `SELECT
          COUNT(*) as donationCount,
          COALESCE(SUM(amount), 0) as totalDonations
        FROM events
        WHERE event_type = 'donation' AND DATE(event_timestamp) >= ?`,
        [startDateStr]
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
     * @returns {Promise<Array>}
     */
    async getRevenueTrend(days = 30) {
      const rows = await streamingDbAll(
        `SELECT
          DATE(event_timestamp) as date,
          COUNT(*) as count,
          COALESCE(SUM(amount), 0) as donations
        FROM events
        WHERE event_type = 'donation' AND event_timestamp >= datetime('now', '-${days} days')
        GROUP BY DATE(event_timestamp)
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
      const rows = await streamingDbAll(
        `SELECT
          platform,
          COALESCE(SUM(amount), 0) as value
        FROM events
        WHERE event_type = 'donation'
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
      const rows = await streamingDbAll(
        `SELECT
          strftime('%Y-%m', event_timestamp) as month,
          COALESCE(SUM(amount), 0) as revenue
        FROM events
        WHERE event_type = 'donation' AND event_timestamp >= datetime('now', '-${months} months')
        GROUP BY strftime('%Y-%m', event_timestamp)
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
        activeUsers: "SELECT COUNT(*) as count FROM users WHERE created_at > datetime('now', '-30 days')",
        totalAdRevenue: "SELECT COALESCE(SUM(revenue), 0) as total FROM ad_impressions",
        monthlyAdRevenue: "SELECT COALESCE(SUM(revenue), 0) as total FROM ad_impressions WHERE strftime('%Y-%m', event_timestamp) = strftime('%Y-%m', 'now')",
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
          COUNT(DISTINCT DATE(event_timestamp)) as activeDays
        FROM events
        WHERE event_type = 'chat' AND event_timestamp >= datetime('now', '-${days} days')`
      );

      const peakChat = await streamingDbGet(
        `SELECT
          strftime('%H:00', event_timestamp) as hour,
          COUNT(*) as count
        FROM events
        WHERE event_type = 'chat' AND event_timestamp >= datetime('now', '-${days} days')
        GROUP BY strftime('%H', event_timestamp)
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
          strftime('%H:00', event_timestamp) as hour,
          COUNT(*) as chats,
          COUNT(DISTINCT actor_nickname) as users
        FROM events
        WHERE event_type = 'chat' AND event_timestamp >= datetime('now', '-${days} days')
        GROUP BY strftime('%H', event_timestamp)
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
      const rows = await streamingDbAll(
        `SELECT
          CASE strftime('%w', event_timestamp)
            WHEN '0' THEN '일'
            WHEN '1' THEN '월'
            WHEN '2' THEN '화'
            WHEN '3' THEN '수'
            WHEN '4' THEN '목'
            WHEN '5' THEN '금'
            WHEN '6' THEN '토'
          END as day,
          strftime('%w', event_timestamp) as dayNum,
          COUNT(*) as chats,
          COUNT(DISTINCT actor_nickname) as users
        FROM events
        WHERE event_type = 'chat' AND event_timestamp >= datetime('now', '-${days} days')
        GROUP BY strftime('%w', event_timestamp)
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
          DATE(event_timestamp) as date,
          COUNT(CASE WHEN event_type = 'chat' THEN 1 END) as chats,
          COUNT(CASE WHEN event_type = 'donation' THEN 1 END) as donations,
          COALESCE(SUM(CASE WHEN event_type = 'donation' THEN amount ELSE 0 END), 0) as donationAmount,
          COUNT(DISTINCT actor_nickname) as activeUsers
        FROM events
        WHERE event_timestamp >= datetime('now', '-${days} days')
        GROUP BY DATE(event_timestamp)
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
          strftime('%H:00', event_timestamp) as time,
          platform,
          COUNT(*) as count
        FROM events
        WHERE event_timestamp >= datetime('now', '-${hours} hours')
        GROUP BY strftime('%H', event_timestamp), platform
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
            strftime('%Y-%m-%d', event_timestamp) as date,
            COUNT(*) as events
          FROM events
          WHERE event_timestamp > datetime('now', '-7 days')
          GROUP BY platform, date
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

      const rows = await streamingDbAll(query, params);
      return rows || [];
    },

    /**
     * Get peak viewer count for today
     * @returns {Promise<Object>}
     */
    async getPeakViewers() {
      const today = new Date().toISOString().split('T')[0];

      const peakRow = await streamingDbGet(
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

      const totalPeak = await streamingDbGet(
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
     * @param {string|null} channelId - Optional channel ID to filter by
     * @param {string|null} platform - Optional platform filter
     * @returns {Promise<Object>}
     */
    async getDashboardSummary(channelId = null, platform = null) {
      const today = new Date().toISOString().split('T')[0];

      const [todayStats, peakViewers, subscribeCount, platformStats] = await Promise.all([
        // Today's donation stats
        streamingDbGet(
          `SELECT
            COALESCE(SUM(amount), 0) as todayDonation,
            COUNT(*) as donationCount
          FROM events
          WHERE event_type = 'donation' AND DATE(event_timestamp) = ?`,
          [today]
        ),
        // Peak viewers from viewer_stats
        streamingDbGet(
          `SELECT MAX(viewer_count) as peakViewers
           FROM viewer_stats
           WHERE DATE(timestamp) = ?`,
          [today]
        ),
        // Today's subscribe count
        streamingDbGet(
          `SELECT COUNT(*) as newSubs
          FROM events
          WHERE event_type = 'subscribe' AND DATE(event_timestamp) = ?`,
          [today]
        ),
        // Platform activity (최근 7일)
        streamingDbAll(
          `SELECT
            platform,
            COUNT(*) as activity,
            COUNT(CASE WHEN event_type = 'chat' THEN 1 END) as chats,
            COUNT(CASE WHEN event_type = 'donation' THEN 1 END) as donations
          FROM events
          WHERE event_timestamp >= datetime('now', '-7 days')
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

      // Top game categories from unified_games (실제 게임 카테고리)
      // 이미지 우선순위: SOOP 카테고리 이미지 > Chzzk 포스터 이미지 > unified_games 이미지
      let topCategories = [];
      try {
        const categoryRows = await streamingDbAll(`
          SELECT
            ug.id,
            ug.name,
            ug.name_kr,
            ug.image_url,
            ug.genre_kr,
            COALESCE(SUM(pc.viewer_count), 0) as total_viewers,
            COALESCE(SUM(pc.streamer_count), 0) as total_streamers,
            GROUP_CONCAT(DISTINCT pc.platform) as platforms,
            MAX(CASE WHEN pc.platform = 'soop' THEN pc.thumbnail_url END) as soop_thumbnail,
            MAX(CASE WHEN pc.platform = 'chzzk' THEN pc.thumbnail_url END) as chzzk_thumbnail
          FROM unified_games ug
          LEFT JOIN category_game_mappings cgm ON ug.id = cgm.unified_game_id
          LEFT JOIN platform_categories pc ON cgm.platform = pc.platform
            AND cgm.platform_category_id = pc.platform_category_id
            AND pc.is_active = 1
          GROUP BY ug.id
          HAVING total_viewers > 0
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
        topCategories,
      };
    },
  };
};

module.exports = { createStatsService };
