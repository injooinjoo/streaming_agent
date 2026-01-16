/**
 * Ad Service
 * Business logic for advertising system (slots, campaigns, impressions)
 */

/**
 * Create Ad Service
 * @param {sqlite3.Database} db - Database instance
 * @param {Server} io - Socket.io server instance
 * @returns {Object} Ad service methods
 */
const createAdService = (db, io) => {
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
   * Promisified db.run
   */
  const dbRun = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
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
    // ===== Ad Slots =====

    /**
     * Get user's ad slots with stats
     * @param {number} userId - User ID
     * @returns {Promise<Array>}
     */
    async getSlotsWithStats(userId) {
      const rows = await dbAll(
        `SELECT s.*,
          COALESCE(SUM(CASE WHEN i.event_type = 'impression' THEN 1 ELSE 0 END), 0) as impressions,
          COALESCE(SUM(CASE WHEN i.event_type = 'click' THEN 1 ELSE 0 END), 0) as clicks,
          COALESCE(SUM(i.revenue), 0) as revenue
         FROM ad_slots s
         LEFT JOIN ad_impressions i ON s.id = i.slot_id
         WHERE s.user_id = ?
         GROUP BY s.id
         ORDER BY s.created_at DESC`,
        [userId]
      );

      return rows.map((row) => ({
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
    },

    /**
     * Get user's ad slots (basic)
     * @param {number} userId - User ID
     * @returns {Promise<Array>}
     */
    async getSlotsByUser(userId) {
      return dbAll(
        "SELECT * FROM ad_slots WHERE user_id = ? ORDER BY created_at DESC",
        [userId]
      );
    },

    /**
     * Get enabled slots by user ID
     * @param {number} userId - User ID
     * @returns {Promise<Array>}
     */
    async getEnabledSlotsByUserId(userId) {
      return dbAll(
        `SELECT * FROM ad_slots WHERE user_id = ? AND enabled = 1`,
        [userId]
      );
    },

    /**
     * Get enabled slots for overlay (by hash)
     * @param {string} overlayHash - Overlay hash
     * @returns {Promise<Array>}
     */
    async getEnabledSlotsByHash(overlayHash) {
      return dbAll(
        `SELECT s.* FROM ad_slots s
         JOIN users u ON s.user_id = u.id
         WHERE u.overlay_hash = ? AND s.enabled = 1`,
        [overlayHash]
      );
    },

    /**
     * Create ad slot
     * @param {number} userId - User ID
     * @param {Object} slotData - Slot data
     * @returns {Promise<Object>}
     */
    async createSlot(userId, { name, type, positionX, positionY, width, height, enabled }) {
      const result = await dbRun(
        `INSERT INTO ad_slots (user_id, name, type, position_x, position_y, width, height, enabled)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, name, type || "banner", positionX || 0, positionY || 0, width || 300, height || 100, enabled !== false ? 1 : 0]
      );
      return { id: result.lastID, userId, name, type, positionX, positionY, width, height };
    },

    /**
     * Update ad slot
     * @param {number} slotId - Slot ID
     * @param {number} userId - User ID (for ownership verification)
     * @param {Object} updates - Fields to update
     * @returns {Promise<boolean>}
     */
    async updateSlot(slotId, userId, updates) {
      const fields = [];
      const values = [];

      if (updates.name !== undefined) { fields.push("name = ?"); values.push(updates.name); }
      if (updates.type !== undefined) { fields.push("type = ?"); values.push(updates.type); }
      if (updates.positionX !== undefined) { fields.push("position_x = ?"); values.push(updates.positionX); }
      if (updates.positionY !== undefined) { fields.push("position_y = ?"); values.push(updates.positionY); }
      if (updates.width !== undefined) { fields.push("width = ?"); values.push(updates.width); }
      if (updates.height !== undefined) { fields.push("height = ?"); values.push(updates.height); }
      if (updates.enabled !== undefined) { fields.push("enabled = ?"); values.push(updates.enabled ? 1 : 0); }

      if (fields.length === 0) return false;

      values.push(slotId, userId);
      const result = await dbRun(
        `UPDATE ad_slots SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`,
        values
      );
      return result.changes > 0;
    },

    /**
     * Delete ad slot
     * @param {number} slotId - Slot ID
     * @param {number} userId - User ID
     * @returns {Promise<boolean>}
     */
    async deleteSlot(slotId, userId) {
      const result = await dbRun(
        "DELETE FROM ad_slots WHERE id = ? AND user_id = ?",
        [slotId, userId]
      );
      return result.changes > 0;
    },

    /**
     * Batch save ad slots
     * @param {number} userId - User ID
     * @param {Array} slots - Slots array
     * @returns {Promise<void>}
     */
    async batchSaveSlots(userId, slots) {
      for (const slot of slots) {
        await dbRun(
          `INSERT OR REPLACE INTO ad_slots (id, user_id, name, type, position_x, position_y, width, height, enabled)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            slot.id > 0 ? slot.id : null,
            userId,
            slot.name,
            slot.type || "banner",
            slot.position?.x || 0,
            slot.position?.y || 0,
            slot.size?.width || 300,
            slot.size?.height || 100,
            slot.enabled !== false ? 1 : 0,
          ]
        );
      }
    },

    // ===== Socket Notifications =====

    /**
     * Notify overlay about slot update
     * @param {string} overlayHash - Overlay hash
     * @param {Object} data - Notification data
     */
    notifySlotUpdate(overlayHash, data) {
      if (io && overlayHash) {
        io.to(`overlay:${overlayHash}`).emit("ad-slots-updated", data);
      }
    },

    /**
     * Notify overlay to refresh ads
     * @param {string} overlayHash - Overlay hash
     */
    notifyAdsRefresh(overlayHash) {
      if (io && overlayHash) {
        io.to(`overlay:${overlayHash}`).emit("ads-refresh");
      }
    },

    /**
     * Notify all overlays to refresh ads
     */
    notifyAdsRefreshGlobal() {
      if (io) {
        io.emit("ads-refresh");
      }
    },

    // ===== Ad Campaigns =====

    /**
     * Get campaign by ID
     * @param {number} campaignId - Campaign ID
     * @returns {Promise<Object|null>}
     */
    async getCampaignById(campaignId) {
      return dbGet("SELECT * FROM ad_campaigns WHERE id = ?", [campaignId]);
    },

    /**
     * Get advertiser's campaigns with stats
     * @param {number} advertiserId - Advertiser user ID
     * @returns {Promise<Array>}
     */
    async getCampaignsWithStats(advertiserId) {
      return dbAll(
        `SELECT c.*,
          COALESCE(SUM(CASE WHEN i.event_type = 'impression' THEN 1 ELSE 0 END), 0) as impressions,
          COALESCE(SUM(CASE WHEN i.event_type = 'click' THEN 1 ELSE 0 END), 0) as clicks
         FROM ad_campaigns c
         LEFT JOIN ad_impressions i ON c.id = i.campaign_id
         WHERE c.advertiser_id = ?
         GROUP BY c.id
         ORDER BY c.created_at DESC`,
        [advertiserId]
      );
    },

    /**
     * Get active campaigns for a user (for overlay)
     * @param {number} userId - User ID
     * @returns {Promise<Array>}
     */
    async getActiveCampaignsForUser(userId) {
      const today = new Date().toISOString().split("T")[0];

      const rows = await dbAll(
        `SELECT c.*, s.id as slot_id
         FROM ad_campaigns c
         INNER JOIN ad_slots s ON s.user_id = ?
         WHERE c.status = 'active'
           AND (c.start_date IS NULL OR c.start_date <= ?)
           AND (c.end_date IS NULL OR c.end_date >= ?)
           AND (c.target_streamers IS NULL OR c.target_streamers = 'all' OR c.target_streamers LIKE '%' || ? || '%')
           AND s.enabled = 1
         ORDER BY c.cpm DESC, c.created_at ASC`,
        [userId, today, today, userId.toString()]
      );

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

      return Object.values(slotCampaignMap);
    },

    /**
     * Create ad campaign
     * @param {number} advertiserId - Advertiser user ID
     * @param {Object} campaignData - Campaign data
     * @returns {Promise<Object>}
     */
    async createCampaign(advertiserId, {
      name, contentType, contentUrl, clickUrl,
      budgetDaily, budgetTotal, cpm, cpc,
      startDate, endDate, targetStreamers, targetCategories
    }) {
      const result = await dbRun(
        `INSERT INTO ad_campaigns (
          advertiser_id, name, content_type, content_url, click_url,
          budget_daily, budget_total, cpm, cpc,
          start_date, end_date, target_streamers, target_categories, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [
          advertiserId, name, contentType, contentUrl, clickUrl,
          budgetDaily || 0, budgetTotal || 0, cpm || 0, cpc || 0,
          startDate, endDate,
          typeof targetStreamers === "string" ? targetStreamers : JSON.stringify(targetStreamers),
          targetCategories ? JSON.stringify(targetCategories) : null
        ]
      );
      return { id: result.lastID };
    },

    /**
     * Update campaign
     * @param {number} campaignId - Campaign ID
     * @param {number} advertiserId - Advertiser user ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<boolean>}
     */
    async updateCampaign(campaignId, advertiserId, updates) {
      const result = await dbRun(
        `UPDATE ad_campaigns
         SET name = ?, content_type = ?, content_url = ?, click_url = ?,
             budget_daily = ?, budget_total = ?, cpm = ?, cpc = ?,
             start_date = ?, end_date = ?, target_streamers = ?, target_categories = ?
         WHERE id = ? AND advertiser_id = ?`,
        [
          updates.name,
          updates.content_type,
          updates.content_url,
          updates.click_url,
          updates.budget_daily || 0,
          updates.budget_total || 0,
          updates.cpm || 1000,
          updates.cpc || 100,
          updates.start_date,
          updates.end_date,
          updates.target_streamers,
          updates.target_categories,
          campaignId,
          advertiserId,
        ]
      );
      return result.changes > 0;
    },

    /**
     * Update campaign status
     * @param {number} campaignId - Campaign ID
     * @param {string} status - New status
     * @param {number} advertiserId - Advertiser user ID (optional, for ownership check)
     * @returns {Promise<boolean>}
     */
    async updateCampaignStatus(campaignId, status, advertiserId = null) {
      const sql = advertiserId
        ? "UPDATE ad_campaigns SET status = ? WHERE id = ? AND advertiser_id = ?"
        : "UPDATE ad_campaigns SET status = ? WHERE id = ?";
      const params = advertiserId
        ? [status, campaignId, advertiserId]
        : [status, campaignId];

      const result = await dbRun(sql, params);
      return result.changes > 0;
    },

    /**
     * Delete campaign
     * @param {number} campaignId - Campaign ID
     * @param {number} advertiserId - Advertiser user ID
     * @returns {Promise<boolean>}
     */
    async deleteCampaign(campaignId, advertiserId) {
      // Delete impressions first
      await dbRun("DELETE FROM ad_impressions WHERE campaign_id = ?", [campaignId]);

      const result = await dbRun(
        "DELETE FROM ad_campaigns WHERE id = ? AND advertiser_id = ?",
        [campaignId, advertiserId]
      );
      return result.changes > 0;
    },

    /**
     * Get campaign stats
     * @param {number} campaignId - Campaign ID
     * @param {number} advertiserId - Advertiser user ID
     * @returns {Promise<Object|null>}
     */
    async getCampaignStats(campaignId, advertiserId) {
      const campaign = await dbGet(
        `SELECT c.*,
          COALESCE(SUM(CASE WHEN i.event_type = 'impression' THEN 1 ELSE 0 END), 0) as impressions,
          COALESCE(SUM(CASE WHEN i.event_type = 'click' THEN 1 ELSE 0 END), 0) as clicks,
          COALESCE(SUM(i.revenue), 0) as total_spent
         FROM ad_campaigns c
         LEFT JOIN ad_impressions i ON c.id = i.campaign_id
         WHERE c.id = ? AND c.advertiser_id = ?
         GROUP BY c.id`,
        [campaignId, advertiserId]
      );

      if (!campaign) return null;

      const ctr = campaign.impressions > 0
        ? ((campaign.clicks / campaign.impressions) * 100).toFixed(2)
        : 0;

      return {
        ...campaign,
        ctr: parseFloat(ctr),
        remainingBudget: campaign.budget_total - campaign.total_spent,
      };
    },

    // ===== Impressions & Clicks =====

    /**
     * Record impression
     * @param {number} campaignId - Campaign ID
     * @param {number} slotId - Slot ID
     * @param {number} streamerId - Streamer user ID
     * @param {number} revenue - Revenue amount
     * @returns {Promise<Object>}
     */
    async recordImpression(campaignId, slotId, streamerId, revenue = 0) {
      const result = await dbRun(
        `INSERT INTO ad_impressions (campaign_id, slot_id, streamer_id, event_type, revenue)
         VALUES (?, ?, ?, 'impression', ?)`,
        [campaignId, slotId, streamerId, revenue]
      );

      // Update campaign budget spent
      if (revenue > 0) {
        await dbRun(
          "UPDATE ad_campaigns SET budget_spent = budget_spent + ? WHERE id = ?",
          [revenue, campaignId]
        );
      }

      return { id: result.lastID };
    },

    /**
     * Record click
     * @param {number} campaignId - Campaign ID
     * @param {number} slotId - Slot ID
     * @param {number} streamerId - Streamer user ID
     * @param {number} revenue - Revenue amount
     * @returns {Promise<Object>}
     */
    async recordClick(campaignId, slotId, streamerId, revenue = 0) {
      const result = await dbRun(
        `INSERT INTO ad_impressions (campaign_id, slot_id, streamer_id, event_type, revenue)
         VALUES (?, ?, ?, 'click', ?)`,
        [campaignId, slotId, streamerId, revenue]
      );

      if (revenue > 0) {
        await dbRun(
          "UPDATE ad_campaigns SET budget_spent = budget_spent + ? WHERE id = ?",
          [revenue, campaignId]
        );
      }

      return { id: result.lastID };
    },

    // ===== Revenue & Statistics =====

    /**
     * Get detailed streamer revenue stats
     * @param {number} streamerId - Streamer user ID
     * @returns {Promise<Object>}
     */
    async getStreamerRevenueDetails(streamerId) {
      const currentMonth = new Date().toISOString().slice(0, 7);

      const stats = await dbGet(
        `SELECT
           COALESCE(SUM(CASE WHEN event_type = 'impression' THEN 1 ELSE 0 END), 0) as total_impressions,
           COALESCE(SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END), 0) as total_clicks,
           COALESCE(SUM(revenue), 0) as total_revenue
         FROM ad_impressions
         WHERE streamer_id = ?
           AND strftime('%Y-%m', timestamp) = ?`,
        [streamerId, currentMonth]
      );

      const pending = await dbGet(
        `SELECT COALESCE(SUM(revenue), 0) as pending
         FROM ad_impressions
         WHERE streamer_id = ?`,
        [streamerId]
      );

      const ctr = stats.total_impressions > 0
        ? ((stats.total_clicks / stats.total_impressions) * 100).toFixed(2)
        : 0;

      return {
        totalImpressions: stats.total_impressions,
        totalClicks: stats.total_clicks,
        totalRevenue: Math.round(stats.total_revenue),
        ctr: parseFloat(ctr),
        avgRevenuePerClick: stats.total_clicks > 0 ? Math.round(stats.total_revenue / stats.total_clicks) : 0,
        pendingSettlement: Math.round(pending?.pending || 0),
      };
    },

    /**
     * Get streamer revenue summary
     * @param {number} streamerId - Streamer user ID
     * @param {number} days - Days to look back
     * @returns {Promise<Object>}
     */
    async getStreamerRevenue(streamerId, days = 30) {
      const summary = await dbGet(
        `SELECT
          COALESCE(SUM(revenue), 0) as total_revenue,
          COALESCE(SUM(CASE WHEN event_type = 'impression' THEN 1 ELSE 0 END), 0) as impressions,
          COALESCE(SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END), 0) as clicks
        FROM ad_impressions
        WHERE streamer_id = ? AND timestamp >= datetime('now', '-${days} days')`,
        [streamerId]
      );

      return {
        totalRevenue: Math.round(summary?.total_revenue || 0),
        impressions: summary?.impressions || 0,
        clicks: summary?.clicks || 0,
        ctr: summary?.impressions > 0
          ? ((summary.clicks / summary.impressions) * 100).toFixed(2)
          : 0,
      };
    },

    /**
     * Get streamer settlements
     * @param {number} streamerId - Streamer user ID
     * @returns {Promise<Array>}
     */
    async getSettlements(streamerId) {
      const rows = await dbAll(
        `SELECT * FROM ad_settlements
         WHERE streamer_id = ?
         ORDER BY period DESC
         LIMIT 12`,
        [streamerId]
      );

      return rows.map((row) => ({
        period: row.period,
        revenue: row.total_revenue,
        impressions: row.total_impressions,
        clicks: row.total_clicks,
        status: row.status,
        paidDate: row.payment_date,
      }));
    },

    /**
     * Get revenue trend for streamer
     * @param {number} streamerId - Streamer user ID
     * @param {number} days - Days to look back
     * @returns {Promise<Array>}
     */
    async getStreamerRevenueTrend(streamerId, days = 30) {
      return dbAll(
        `SELECT
          DATE(timestamp) as date,
          SUM(revenue) as revenue,
          SUM(CASE WHEN event_type = 'impression' THEN 1 ELSE 0 END) as impressions,
          SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END) as clicks
        FROM ad_impressions
        WHERE streamer_id = ? AND timestamp >= datetime('now', '-${days} days')
        GROUP BY DATE(timestamp)
        ORDER BY date`,
        [streamerId]
      );
    },

    /**
     * Get total ad revenue (admin)
     * @returns {Promise<Object>}
     */
    async getTotalRevenue() {
      const [total, monthly] = await Promise.all([
        dbGet("SELECT COALESCE(SUM(revenue), 0) as total FROM ad_impressions"),
        dbGet(
          `SELECT COALESCE(SUM(revenue), 0) as total FROM ad_impressions
           WHERE strftime('%Y-%m', timestamp) = strftime('%Y-%m', 'now')`
        ),
      ]);

      return {
        totalRevenue: Math.round(total?.total || 0),
        monthlyRevenue: Math.round(monthly?.total || 0),
      };
    },

    /**
     * Get active campaigns count (admin)
     * @returns {Promise<number>}
     */
    async getActiveCampaignsCount() {
      const row = await dbGet(
        "SELECT COUNT(*) as count FROM ad_campaigns WHERE status = 'active'"
      );
      return row?.count || 0;
    },
  };
};

module.exports = { createAdService };
