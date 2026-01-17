/**
 * Snowflake Service
 * Synchronizes streaming events to Snowflake data warehouse
 */

const snowflake = require('snowflake-sdk');
const { v4: uuidv4 } = require('uuid');

class SnowflakeService {
  constructor(config) {
    this.config = {
      account: config.account || process.env.SNOWFLAKE_ACCOUNT,
      username: config.username || process.env.SNOWFLAKE_USER,
      password: config.password || process.env.SNOWFLAKE_PASSWORD,
      warehouse: config.warehouse || process.env.SNOWFLAKE_WAREHOUSE || 'COMPUTE_WH',
      database: config.database || process.env.SNOWFLAKE_DATABASE || 'STREAMING_ANALYTICS',
      schema: config.schema || process.env.SNOWFLAKE_SCHEMA || 'STREAMING',
      role: config.role || process.env.SNOWFLAKE_ROLE || 'ACCOUNTADMIN',
    };

    this.connection = null;
    this.isConnected = false;
    this.eventQueue = [];
    this.flushInterval = null;
    this.BATCH_SIZE = 100;
    this.FLUSH_INTERVAL_MS = 5000; // 5 seconds
  }

  /**
   * Connect to Snowflake
   */
  async connect() {
    return new Promise((resolve, reject) => {
      this.connection = snowflake.createConnection({
        account: this.config.account,
        username: this.config.username,
        password: this.config.password,
        warehouse: this.config.warehouse,
        database: this.config.database,
        schema: this.config.schema,
        role: this.config.role,
      });

      this.connection.connect((err, conn) => {
        if (err) {
          console.error('[Snowflake] Connection failed:', err.message);
          reject(err);
        } else {
          console.log('[Snowflake] Connected successfully');
          this.isConnected = true;
          this.startFlushInterval();
          resolve(conn);
        }
      });
    });
  }

  /**
   * Disconnect from Snowflake
   */
  async disconnect() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    // Flush remaining events
    await this.flushEvents();

    return new Promise((resolve) => {
      if (this.connection) {
        this.connection.destroy((err) => {
          if (err) {
            console.error('[Snowflake] Disconnect error:', err.message);
          }
          this.isConnected = false;
          console.log('[Snowflake] Disconnected');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Execute SQL query
   */
  async execute(sqlText, binds = []) {
    if (!this.isConnected) {
      throw new Error('Snowflake not connected');
    }

    return new Promise((resolve, reject) => {
      this.connection.execute({
        sqlText,
        binds,
        complete: (err, stmt, rows) => {
          if (err) {
            console.error('[Snowflake] Query error:', err.message);
            reject(err);
          } else {
            resolve(rows);
          }
        },
      });
    });
  }

  /**
   * Start periodic flush interval
   */
  startFlushInterval() {
    this.flushInterval = setInterval(() => {
      if (this.eventQueue.length > 0) {
        this.flushEvents().catch(err => {
          console.error('[Snowflake] Flush error:', err.message);
        });
      }
    }, this.FLUSH_INTERVAL_MS);
  }

  /**
   * Queue event for batch insert
   */
  queueEvent(normalizedEvent) {
    const event = this.transformEvent(normalizedEvent);
    this.eventQueue.push(event);

    // Flush if batch size reached
    if (this.eventQueue.length >= this.BATCH_SIZE) {
      this.flushEvents().catch(err => {
        console.error('[Snowflake] Batch flush error:', err.message);
      });
    }
  }

  /**
   * Transform normalized event to Snowflake format
   */
  transformEvent(event) {
    // 사용자 티어 결정 (sender에서 가져오거나 뱃지 기반으로 추론)
    let userTier = event.sender?.tier || event.sender?.role || 'regular';

    // 구독 정보가 있으면 티어 업데이트
    if (event.sender?.subscription?.tier) {
      userTier = `subscriber_tier${event.sender.subscription.tier}`;
    }

    return {
      event_id: event.id || uuidv4(),
      event_type: event.type || 'chat',
      platform: event.platform || 'unknown',
      channel_id: event.metadata?.channelId || event.channelId || 'unknown',
      user_id: event.sender?.id || event.sender_id || null,
      user_nickname: event.sender?.nickname || event.sender || null,
      user_profile_image: event.sender?.profileImage || null,
      user_role: event.sender?.role || 'regular',
      user_tier: userTier,
      amount_krw: event.content?.amount || event.amount || null,
      original_amount: event.content?.originalAmount || null,
      currency: event.content?.currency || null,
      donation_type: event.content?.donationType || null,
      message: event.content?.message || event.message || null,
      badges: event.sender?.badges ? JSON.stringify(event.sender.badges) : null,
      subscription_info: event.sender?.subscription ? JSON.stringify(event.sender.subscription) : null,
      event_timestamp: event.metadata?.timestamp || event.timestamp || new Date().toISOString(),
    };
  }

  /**
   * Flush queued events to Snowflake
   */
  async flushEvents() {
    if (this.eventQueue.length === 0 || !this.isConnected) {
      return;
    }

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // Build batch insert
      const values = events.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
      const binds = events.flatMap(e => [
        e.event_id,
        e.event_type,
        e.platform,
        e.channel_id,
        e.user_id,
        e.user_nickname,
        e.user_profile_image,
        e.user_role,
        e.amount_krw,
        e.original_amount,
        e.currency,
        e.donation_type,
        e.message,
        e.badges,
        e.event_timestamp,
      ]);

      const sql = `
        INSERT INTO FACT_EVENTS (
          event_id, event_type, platform, channel_id, user_id, user_nickname,
          user_profile_image, user_role, amount_krw, original_amount, currency,
          donation_type, message, badges, event_timestamp
        ) VALUES ${values}
      `;

      await this.execute(sql, binds);
      console.log(`[Snowflake] Flushed ${events.length} events`);
    } catch (error) {
      // Re-queue failed events
      this.eventQueue = [...events, ...this.eventQueue];
      throw error;
    }
  }

  /**
   * Sync a single event immediately
   */
  async syncEvent(event) {
    const transformed = this.transformEvent(event);

    const sql = `
      INSERT INTO FACT_EVENTS (
        event_id, event_type, platform, channel_id, user_id, user_nickname,
        user_profile_image, user_role, amount_krw, original_amount, currency,
        donation_type, message, badges, event_timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.execute(sql, [
      transformed.event_id,
      transformed.event_type,
      transformed.platform,
      transformed.channel_id,
      transformed.user_id,
      transformed.user_nickname,
      transformed.user_profile_image,
      transformed.user_role,
      transformed.amount_krw,
      transformed.original_amount,
      transformed.currency,
      transformed.donation_type,
      transformed.message,
      transformed.badges,
      transformed.event_timestamp,
    ]);

    return transformed;
  }

  /**
   * Sync viewer stats
   */
  async syncViewerStats(stats) {
    const sql = `
      INSERT INTO FACT_VIEWER_STATS (id, platform, channel_id, viewer_count, concurrent_chatters, recorded_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    await this.execute(sql, [
      stats.id || uuidv4(),
      stats.platform,
      stats.channel_id || stats.channelId,
      stats.viewer_count || stats.viewerCount,
      stats.concurrent_chatters || 0,
      stats.recorded_at || new Date().toISOString(),
    ]);
  }

  /**
   * Update or create user dimension
   */
  async upsertUser(user) {
    const userKey = `${user.platform}:${user.user_id}`;

    const sql = `
      MERGE INTO DIM_USERS target
      USING (SELECT ? as user_key) source
      ON target.user_key = source.user_key
      WHEN MATCHED THEN UPDATE SET
        nickname = ?,
        profile_image = ?,
        last_seen_at = CURRENT_TIMESTAMP(),
        total_messages = total_messages + ?,
        total_donations = total_donations + ?,
        total_donation_amount = total_donation_amount + ?,
        is_subscriber = ? OR is_subscriber,
        user_tier = COALESCE(?, user_tier),
        updated_at = CURRENT_TIMESTAMP()
      WHEN NOT MATCHED THEN INSERT (
        user_key, platform, user_id, nickname, profile_image,
        first_seen_at, last_seen_at, total_messages, total_donations,
        total_donation_amount, is_subscriber, user_tier
      ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP(), ?, ?, ?, ?, ?)
    `;

    await this.execute(sql, [
      userKey,
      // UPDATE values
      user.nickname,
      user.profile_image,
      user.messages_increment || 0,
      user.donations_increment || 0,
      user.donation_amount_increment || 0,
      user.is_subscriber || false,
      user.user_tier,
      // INSERT values
      userKey,
      user.platform,
      user.user_id,
      user.nickname,
      user.profile_image,
      user.messages_increment || 0,
      user.donations_increment || 0,
      user.donation_amount_increment || 0,
      user.is_subscriber || false,
      user.user_tier || 'regular',
    ]);
  }

  /**
   * Update daily aggregates
   */
  async updateDailyStats(date, platform, channelId, stats) {
    const sql = `
      MERGE INTO AGG_DAILY_STATS target
      USING (SELECT ? as date_key, ? as platform, ? as channel_id) source
      ON target.date_key = source.date_key
         AND target.platform = source.platform
         AND target.channel_id = source.channel_id
      WHEN MATCHED THEN UPDATE SET
        total_events = total_events + ?,
        total_chats = total_chats + ?,
        total_donations = total_donations + ?,
        total_donation_amount = total_donation_amount + ?,
        total_subscriptions = total_subscriptions + ?,
        total_follows = total_follows + ?,
        unique_chatters = GREATEST(unique_chatters, ?),
        peak_viewers = GREATEST(peak_viewers, ?),
        updated_at = CURRENT_TIMESTAMP()
      WHEN NOT MATCHED THEN INSERT (
        date_key, platform, channel_id, total_events, total_chats,
        total_donations, total_donation_amount, total_subscriptions,
        total_follows, unique_chatters, peak_viewers
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.execute(sql, [
      date,
      platform,
      channelId,
      // UPDATE values
      stats.events || 0,
      stats.chats || 0,
      stats.donations || 0,
      stats.donation_amount || 0,
      stats.subscriptions || 0,
      stats.follows || 0,
      stats.unique_chatters || 0,
      stats.peak_viewers || 0,
      // INSERT values
      date,
      platform,
      channelId,
      stats.events || 0,
      stats.chats || 0,
      stats.donations || 0,
      stats.donation_amount || 0,
      stats.subscriptions || 0,
      stats.follows || 0,
      stats.unique_chatters || 0,
      stats.peak_viewers || 0,
    ]);
  }

  /**
   * Query events for analytics
   */
  async queryEvents(options = {}) {
    const { platform, eventType, startDate, endDate, limit = 100 } = options;

    let sql = 'SELECT * FROM FACT_EVENTS WHERE 1=1';
    const binds = [];

    if (platform) {
      sql += ' AND platform = ?';
      binds.push(platform);
    }
    if (eventType) {
      sql += ' AND event_type = ?';
      binds.push(eventType);
    }
    if (startDate) {
      sql += ' AND event_timestamp >= ?';
      binds.push(startDate);
    }
    if (endDate) {
      sql += ' AND event_timestamp <= ?';
      binds.push(endDate);
    }

    sql += ' ORDER BY event_timestamp DESC LIMIT ?';
    binds.push(limit);

    return this.execute(sql, binds);
  }

  /**
   * Get donation summary
   */
  async getDonationSummary(startDate, endDate) {
    const sql = `
      SELECT
        platform,
        DATE_TRUNC('day', event_timestamp) as date,
        COUNT(*) as donation_count,
        SUM(amount_krw) as total_amount,
        AVG(amount_krw) as avg_amount,
        COUNT(DISTINCT user_id) as unique_donors
      FROM FACT_EVENTS
      WHERE event_type = 'donation'
        AND event_timestamp >= ?
        AND event_timestamp <= ?
      GROUP BY platform, DATE_TRUNC('day', event_timestamp)
      ORDER BY date DESC
    `;

    return this.execute(sql, [startDate, endDate]);
  }

  /**
   * Get top donors
   */
  async getTopDonors(startDate, endDate, limit = 20) {
    const sql = `
      SELECT
        user_nickname,
        platform,
        COUNT(*) as donation_count,
        SUM(amount_krw) as total_amount
      FROM FACT_EVENTS
      WHERE event_type = 'donation'
        AND event_timestamp >= ?
        AND event_timestamp <= ?
      GROUP BY user_nickname, platform
      ORDER BY total_amount DESC
      LIMIT ?
    `;

    return this.execute(sql, [startDate, endDate, limit]);
  }

  /**
   * Get viewer stats history
   */
  async getViewerHistory(platform, channelId, hours = 24) {
    const sql = `
      SELECT
        DATE_TRUNC('hour', recorded_at) as hour,
        AVG(viewer_count) as avg_viewers,
        MAX(viewer_count) as peak_viewers
      FROM FACT_VIEWER_STATS
      WHERE platform = ?
        AND channel_id = ?
        AND recorded_at >= DATEADD('hour', -?, CURRENT_TIMESTAMP())
      GROUP BY DATE_TRUNC('hour', recorded_at)
      ORDER BY hour
    `;

    return this.execute(sql, [platform, channelId, hours]);
  }

  /**
   * Get chat activity (messages per minute)
   */
  async getChatActivity(platform, channelId, minutes = 60) {
    const sql = `
      SELECT
        DATE_TRUNC('minute', event_timestamp) as minute,
        COUNT(*) as message_count,
        COUNT(DISTINCT user_id) as unique_chatters
      FROM FACT_EVENTS
      WHERE event_type = 'chat'
        AND platform = ?
        AND channel_id = ?
        AND event_timestamp >= DATEADD('minute', -?, CURRENT_TIMESTAMP())
      GROUP BY DATE_TRUNC('minute', event_timestamp)
      ORDER BY minute
    `;

    return this.execute(sql, [platform, channelId, minutes]);
  }

  /**
   * Update user chat stats (count only, no content)
   */
  async updateChatStats(platform, userId, username, nickname) {
    if (!this.isConnected || !userId) {
      return;
    }

    const now = new Date().toISOString();

    // Use INSERT with ON CONFLICT behavior via MERGE
    const sql = `
      MERGE INTO USER_CHAT_STATS AS target
      USING (SELECT ? AS PLATFORM, ? AS USER_ID) AS source
      ON target.PLATFORM = source.PLATFORM AND target.USER_ID = source.USER_ID
      WHEN MATCHED THEN UPDATE SET
        USERNAME = COALESCE(?, target.USERNAME),
        NICKNAME = COALESCE(?, target.NICKNAME),
        CHAT_COUNT = target.CHAT_COUNT + 1,
        LAST_CHAT_AT = ?,
        UPDATED_AT = ?
      WHEN NOT MATCHED THEN INSERT (PLATFORM, USER_ID, USERNAME, NICKNAME, CHAT_COUNT, FIRST_CHAT_AT, LAST_CHAT_AT)
        VALUES (?, ?, ?, ?, 1, ?, ?)
    `;

    try {
      await this.execute(sql, [
        platform, userId,                    // source
        username, nickname, now, now,        // WHEN MATCHED
        platform, userId, username, nickname, now, now  // WHEN NOT MATCHED
      ]);
    } catch (error) {
      console.error('[Snowflake] updateChatStats error:', error.message);
    }
  }

  /**
   * Get engagement rate (chatters / viewers)
   */
  async getEngagementRate(platform, channelId, hours = 24) {
    const sql = `
      WITH viewer_data AS (
        SELECT
          DATE_TRUNC('hour', recorded_at) as hour,
          AVG(viewer_count) as avg_viewers
        FROM FACT_VIEWER_STATS
        WHERE platform = ?
          AND channel_id = ?
          AND recorded_at >= DATEADD('hour', -?, CURRENT_TIMESTAMP())
        GROUP BY DATE_TRUNC('hour', recorded_at)
      ),
      chat_data AS (
        SELECT
          DATE_TRUNC('hour', event_timestamp) as hour,
          COUNT(DISTINCT user_id) as unique_chatters
        FROM FACT_EVENTS
        WHERE event_type = 'chat'
          AND platform = ?
          AND channel_id = ?
          AND event_timestamp >= DATEADD('hour', -?, CURRENT_TIMESTAMP())
        GROUP BY DATE_TRUNC('hour', event_timestamp)
      )
      SELECT
        v.hour,
        v.avg_viewers,
        COALESCE(c.unique_chatters, 0) as unique_chatters,
        CASE
          WHEN v.avg_viewers > 0
          THEN ROUND(COALESCE(c.unique_chatters, 0) / v.avg_viewers * 100, 2)
          ELSE 0
        END as engagement_rate
      FROM viewer_data v
      LEFT JOIN chat_data c ON v.hour = c.hour
      ORDER BY v.hour
    `;

    return this.execute(sql, [platform, channelId, hours, platform, channelId, hours]);
  }

  /**
   * Migrate existing local events to Snowflake
   */
  async migrateLocalEvents(events) {
    console.log(`[Snowflake] Starting migration of ${events.length} events`);

    let migrated = 0;
    const batchSize = 100;

    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);

      for (const event of batch) {
        try {
          await this.syncEvent({
            id: `local-${event.id}`,
            type: event.type,
            platform: event.platform,
            sender: event.sender,
            sender_id: event.sender_id,
            amount: event.amount,
            message: event.message,
            timestamp: event.timestamp,
            channelId: 'migrated',
          });
          migrated++;
        } catch (error) {
          console.error(`[Snowflake] Migration error for event ${event.id}:`, error.message);
        }
      }

      console.log(`[Snowflake] Migrated ${migrated}/${events.length} events`);
    }

    console.log(`[Snowflake] Migration complete: ${migrated} events`);
    return migrated;
  }
}

// Singleton instance
let instance = null;

/**
 * Get or create Snowflake service instance
 */
const getSnowflakeService = (config = {}) => {
  if (!instance) {
    instance = new SnowflakeService(config);
  }
  return instance;
};

/**
 * Create new Snowflake service instance
 */
const createSnowflakeService = (config = {}) => {
  return new SnowflakeService(config);
};

module.exports = {
  SnowflakeService,
  getSnowflakeService,
  createSnowflakeService,
};
