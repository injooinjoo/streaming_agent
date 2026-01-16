/**
 * Event Service
 * Business logic for event management (chat, donations, etc.)
 */

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
     * Create new event
     * @param {Object} eventData - Event data
     * @param {string} overlayHash - Optional overlay hash for targeted broadcast
     * @returns {Promise<Object>}
     */
    async create({ type, sender, amount, message, platform }, overlayHash = null) {
      const event = {
        type: type || "chat",
        sender: sender || "Anonymous",
        amount: amount || 0,
        message: message || "",
        platform: platform || "manual",
        timestamp: new Date().toISOString(),
      };

      const result = await dbRun(
        `INSERT INTO events (type, sender, amount, message, platform) VALUES (?, ?, ?, ?, ?)`,
        [event.type, event.sender, event.amount, event.message, event.platform]
      );

      const savedEvent = { ...event, id: result.lastID };

      // Broadcast to overlays
      if (overlayHash) {
        io.to(`overlay:${overlayHash}`).emit("new-event", savedEvent);
      } else {
        io.emit("new-event", savedEvent);
      }

      return savedEvent;
    },

    /**
     * Get recent events
     * @param {number} limit - Max events to return
     * @returns {Promise<Array>}
     */
    async getRecent(limit = 50) {
      return dbAll(
        `SELECT * FROM events ORDER BY timestamp DESC LIMIT ?`,
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
        `SELECT * FROM events WHERE platform = ? ORDER BY timestamp DESC LIMIT ?`,
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
        `SELECT * FROM events WHERE type = ? ORDER BY timestamp DESC LIMIT ?`,
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
        WHERE type = 'donation'
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
          DATE(timestamp) as date,
          COUNT(*) as count,
          SUM(amount) as total
        FROM events
        WHERE type = 'donation'
          AND timestamp >= datetime('now', '-7 days')
        GROUP BY DATE(timestamp)
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
          sender,
          COUNT(*) as count,
          SUM(amount) as total,
          (
            SELECT platform FROM events e2
            WHERE e2.sender = events.sender AND e2.type = 'donation'
            GROUP BY platform
            ORDER BY COUNT(*) DESC
            LIMIT 1
          ) as platform
        FROM events
        WHERE type = 'donation'
        GROUP BY sender
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
           WHERE timestamp >= ? AND timestamp <= ? AND type = ?
           ORDER BY timestamp DESC`,
          [startDate, endDate, type]
        );
      }
      return dbAll(
        `SELECT * FROM events
         WHERE timestamp >= ? AND timestamp <= ?
         ORDER BY timestamp DESC`,
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
        `DELETE FROM events WHERE timestamp < datetime('now', '-${daysOld} days')`
      );
      return result.changes;
    },
  };
};

module.exports = { createEventService };
