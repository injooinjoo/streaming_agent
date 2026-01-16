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

    // ===== Platform Statistics =====

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
  };
};

module.exports = { createStatsService };
