/**
 * Event Service
 * Business logic for event management (chat, donations, etc.)
 *
 * Uses new unified events schema:
 * - UUID primary key for high-volume handling
 * - Actor/target person relationships
 * - Broadcast context linking
 */

const { v4: uuidv4 } = require("uuid");

/**
 * Create Event Service
 * @param {sqlite3.Database} db - Database instance
 * @param {Server} io - Socket.io server instance
 * @returns {Object} Event service methods
 */
const createEventService = (db, io) => {
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
    /**
     * Create new event (new unified schema)
     * @param {Object} eventData - Event data
     * @param {string} overlayHash - Optional overlay hash for targeted broadcast
     * @returns {Promise<Object>}
     */
    async create(eventData, overlayHash = null) {
      const {
        eventType = "chat",
        platform = "manual",
        actorPersonId = null,
        actorNickname = "Anonymous",
        actorRole = null,
        targetPersonId = null,
        targetChannelId,
        broadcastId = null,
        message = "",
        amount = null,
        originalAmount = null,
        currency = null,
        donationType = null,
        eventTimestamp = new Date().toISOString(),
      } = eventData;

      const id = uuidv4();

      await dbRun(
        `INSERT INTO events (
          id, event_type, platform,
          actor_person_id, actor_nickname, actor_role,
          target_person_id, target_channel_id, broadcast_id,
          message, amount, original_amount, currency, donation_type,
          event_timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, eventType, platform,
          actorPersonId, actorNickname, actorRole,
          targetPersonId, targetChannelId, broadcastId,
          message, amount, originalAmount, currency, donationType,
          eventTimestamp,
        ]
      );

      const savedEvent = {
        id,
        eventType,
        platform,
        actorPersonId,
        actorNickname,
        actorRole,
        targetChannelId,
        broadcastId,
        message,
        amount,
        currency,
        donationType,
        eventTimestamp,
      };

      // Broadcast to overlays (legacy format for compatibility)
      const legacyEvent = {
        id,
        type: eventType,
        sender: actorNickname,
        sender_id: actorPersonId,
        amount: amount || 0,
        message,
        platform,
        timestamp: eventTimestamp,
      };

      if (overlayHash) {
        io.to(`overlay:${overlayHash}`).emit("new-event", legacyEvent);
      } else {
        io.emit("new-event", legacyEvent);
      }

      return savedEvent;
    },

    /**
     * Create event from normalized event (from adapters)
     * @param {Object} normalizedEvent - Normalized event from normalizer
     * @param {Object} context - Additional context (broadcastId, targetChannelId, etc.)
     * @returns {Promise<Object>}
     */
    async createFromNormalized(normalizedEvent, context = {}) {
      return this.create({
        eventType: normalizedEvent.type,
        platform: normalizedEvent.platform,
        actorPersonId: context.actorPersonId || null,
        actorNickname: normalizedEvent.sender?.nickname || "Anonymous",
        actorRole: normalizedEvent.sender?.role || null,
        targetPersonId: context.targetPersonId || null,
        targetChannelId: context.targetChannelId || normalizedEvent.metadata?.channelId,
        broadcastId: context.broadcastId || null,
        message: normalizedEvent.content?.message || "",
        amount: normalizedEvent.content?.amount || null,
        originalAmount: normalizedEvent.content?.originalAmount || null,
        currency: normalizedEvent.content?.currency || null,
        donationType: normalizedEvent.content?.donationType || null,
        eventTimestamp: normalizedEvent.metadata?.timestamp || new Date().toISOString(),
      });
    },

    /**
     * Get recent events
     * @param {number} limit - Max events to return
     * @returns {Promise<Array>}
     */
    async getRecent(limit = 50) {
      return dbAll(
        `SELECT * FROM events ORDER BY event_timestamp DESC LIMIT ?`,
        [limit]
      );
    },

    /**
     * Get events by platform
     * @param {string} platform - Platform name
     * @param {number} limit - Max events
     * @returns {Promise<Array>}
     */
    async getByPlatform(platform, limit = 50) {
      return dbAll(
        `SELECT * FROM events WHERE platform = ? ORDER BY event_timestamp DESC LIMIT ?`,
        [platform, limit]
      );
    },

    /**
     * Get events by type
     * @param {string} type - Event type
     * @param {number} limit - Max events
     * @returns {Promise<Array>}
     */
    async getByType(type, limit = 50) {
      return dbAll(
        `SELECT * FROM events WHERE event_type = ? ORDER BY event_timestamp DESC LIMIT ?`,
        [type, limit]
      );
    },

    /**
     * Get total event count
     * @returns {Promise<number>}
     */
    async getCount() {
      const row = await dbGet("SELECT COUNT(*) as total FROM events");
      return row?.total || 0;
    },

    /**
     * Get event counts by platform
     * @returns {Promise<Array>}
     */
    async getCountByPlatform() {
      return dbAll(
        "SELECT platform, COUNT(*) as count FROM events GROUP BY platform"
      );
    },

    /**
     * Get donation statistics
     * @returns {Promise<Array>}
     */
    async getDonationStats() {
      return dbAll(
        `SELECT
          platform,
          COUNT(*) as count,
          SUM(amount) as total,
          AVG(amount) as average
        FROM events
        WHERE event_type = 'donation'
        GROUP BY platform`
      );
    },

    /**
     * Get donation trend (last 7 days)
     * @returns {Promise<Array>}
     */
    async getDonationTrend() {
      return dbAll(
        `SELECT
          DATE(event_timestamp) as date,
          COUNT(*) as count,
          SUM(amount) as total
        FROM events
        WHERE event_type = 'donation'
          AND event_timestamp >= datetime('now', '-7 days')
        GROUP BY DATE(event_timestamp)
        ORDER BY date`
      );
    },

    /**
     * Get top donors
     * @param {number} limit - Max donors to return
     * @returns {Promise<Array>}
     */
    async getTopDonors(limit = 10) {
      // Get top donors with their most frequent platform
      return dbAll(
        `SELECT
          actor_nickname as sender,
          actor_person_id,
          COUNT(*) as count,
          SUM(amount) as total,
          (
            SELECT platform FROM events e2
            WHERE e2.actor_person_id = events.actor_person_id AND e2.event_type = 'donation'
            GROUP BY platform
            ORDER BY COUNT(*) DESC
            LIMIT 1
          ) as platform
        FROM events
        WHERE event_type = 'donation' AND actor_person_id IS NOT NULL
        GROUP BY actor_person_id
        ORDER BY total DESC
        LIMIT ?`,
        [limit]
      );
    },

    /**
     * Get events in date range
     * @param {string} startDate - Start date (ISO format)
     * @param {string} endDate - End date (ISO format)
     * @param {string} type - Optional event type filter
     * @returns {Promise<Array>}
     */
    async getInDateRange(startDate, endDate, type = null) {
      if (type) {
        return dbAll(
          `SELECT * FROM events
           WHERE event_timestamp >= ? AND event_timestamp <= ? AND event_type = ?
           ORDER BY event_timestamp DESC`,
          [startDate, endDate, type]
        );
      }
      return dbAll(
        `SELECT * FROM events
         WHERE event_timestamp >= ? AND event_timestamp <= ?
         ORDER BY event_timestamp DESC`,
        [startDate, endDate]
      );
    },

    /**
     * Delete old events (cleanup)
     * @param {number} daysOld - Delete events older than this many days
     * @returns {Promise<number>} Number of deleted events
     */
    async deleteOldEvents(daysOld = 90) {
      const result = await dbRun(
        `DELETE FROM events WHERE event_timestamp < datetime('now', '-${daysOld} days')`
      );
      return result.changes;
    },

    /**
     * Get events by channel
     * @param {string} channelId - Target channel ID
     * @param {number} limit - Max events
     * @returns {Promise<Array>}
     */
    async getByChannel(channelId, limit = 50) {
      return dbAll(
        `SELECT * FROM events WHERE target_channel_id = ? ORDER BY event_timestamp DESC LIMIT ?`,
        [channelId, limit]
      );
    },

    /**
     * Get events by broadcast
     * @param {number} broadcastId - Broadcast ID
     * @param {number} limit - Max events
     * @returns {Promise<Array>}
     */
    async getByBroadcast(broadcastId, limit = 100) {
      return dbAll(
        `SELECT * FROM events WHERE broadcast_id = ? ORDER BY event_timestamp DESC LIMIT ?`,
        [broadcastId, limit]
      );
    },
  };
};

module.exports = { createEventService };
