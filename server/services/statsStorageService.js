/**
 * Stats Storage Service
 *
 * Handles storage of:
 * - Chat stats (per-user, per-minute aggregation)
 * - Viewer stats (broadcast viewer count)
 * - User sessions (enter/exit tracking)
 *
 * Design decisions:
 * - Individual chat messages are NOT stored (too much data)
 * - Instead, we track chat_count per user per minute
 * - Viewer counts are stored at regular intervals
 * - User enter/exit creates session records
 */

const { getDb, runQuery, getOne, runReturning } = require("../db/connections");
const { v4: uuidv4 } = require("uuid");

/**
 * Store or increment chat count for a user in a specific minute
 * Uses UPSERT to handle concurrent updates
 *
 * @param {Object} event - Chat event from adapter
 * @param {string} event.platform - Platform (soop, chzzk)
 * @param {Object} event.sender - Sender info { id, nickname }
 * @param {Object} event.metadata - Metadata { channelId, timestamp }
 */
const incrementChatCount = async (event) => {
  try {
    const { platform, sender, metadata } = event;
    const channelId = metadata.channelId || metadata.chatChannelId;

    if (!sender?.id || !channelId) {
      return null;
    }

    // Get minute timestamp (truncate seconds)
    const now = new Date(metadata.timestamp || Date.now());
    now.setSeconds(0, 0);
    const minuteTimestamp = now.toISOString();

    const pool = getDb();

    // PostgreSQL UPSERT: INSERT or UPDATE chat_count
    const result = await pool.query(
      `INSERT INTO chat_stats (platform, channel_id, user_id, user_nickname, minute_timestamp, chat_count, updated_at)
       VALUES ($1, $2, $3, $4, $5, 1, NOW())
       ON CONFLICT (platform, channel_id, user_id, minute_timestamp)
       DO UPDATE SET
         chat_count = chat_stats.chat_count + 1,
         user_nickname = EXCLUDED.user_nickname,
         updated_at = NOW()
       RETURNING id, chat_count`,
      [platform, channelId, sender.id, sender.nickname || sender.id, minuteTimestamp]
    );

    return result.rows[0];
  } catch (error) {
    console.error("[statsStorage] Failed to increment chat count:", error.message);
    return null;
  }
};

/**
 * Store viewer count snapshot
 *
 * @param {Object} event - Viewer update event from adapter
 * @param {string} event.platform - Platform (soop, chzzk)
 * @param {Object} event.content - Content { viewerCount }
 * @param {Object} event.metadata - Metadata { channelId, timestamp }
 */
const storeViewerCount = async (event) => {
  try {
    const { platform, content, metadata } = event;
    const channelId = metadata.channelId || metadata.chatChannelId;
    const viewerCount = content?.viewerCount;

    if (viewerCount === undefined || !channelId) {
      return null;
    }

    const pool = getDb();

    const result = await pool.query(
      `INSERT INTO viewer_stats (platform, channel_id, viewer_count, timestamp)
       VALUES ($1, $2, $3, NOW())
       RETURNING id`,
      [platform, channelId, viewerCount]
    );

    return result.rows[0];
  } catch (error) {
    console.error("[statsStorage] Failed to store viewer count:", error.message);
    return null;
  }
};

/**
 * Record user entering the chat
 * Creates a new session record
 *
 * @param {Object} event - User enter event from adapter
 * @param {string} event.platform - Platform (soop, chzzk)
 * @param {Object} event.sender - Sender info { id, nickname }
 * @param {Object} event.metadata - Metadata { channelId, broadNo, timestamp }
 */
const recordUserEnter = async (event) => {
  try {
    const { platform, sender, metadata } = event;
    const channelId = metadata.channelId || metadata.chatChannelId;

    if (!sender?.id || !channelId) {
      return null;
    }

    const pool = getDb();

    // Check for existing open session
    const existingSession = await pool.query(
      `SELECT id FROM user_sessions
       WHERE platform = $1 AND channel_id = $2 AND user_id = $3
       AND session_ended_at IS NULL
       ORDER BY session_started_at DESC
       LIMIT 1`,
      [platform, channelId, sender.id]
    );

    // If already has open session, skip
    if (existingSession.rows.length > 0) {
      return existingSession.rows[0];
    }

    // Create new session
    const result = await pool.query(
      `INSERT INTO user_sessions (platform, channel_id, user_id, user_nickname, session_started_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id`,
      [platform, channelId, sender.id, sender.nickname || sender.id]
    );

    return result.rows[0];
  } catch (error) {
    console.error("[statsStorage] Failed to record user enter:", error.message);
    return null;
  }
};

/**
 * Record user exiting the chat
 * Closes the open session
 *
 * @param {Object} event - User exit event from adapter
 * @param {string} event.platform - Platform (soop, chzzk)
 * @param {Object} event.sender - Sender info { id, nickname }
 * @param {Object} event.metadata - Metadata { channelId, timestamp }
 */
const recordUserExit = async (event) => {
  try {
    const { platform, sender, metadata } = event;
    const channelId = metadata.channelId || metadata.chatChannelId;

    if (!sender?.id || !channelId) {
      return null;
    }

    const pool = getDb();

    // Close the most recent open session
    const result = await pool.query(
      `UPDATE user_sessions
       SET session_ended_at = NOW(),
           session_duration_seconds = EXTRACT(EPOCH FROM (NOW() - session_started_at))::INTEGER
       WHERE platform = $1 AND channel_id = $2 AND user_id = $3
       AND session_ended_at IS NULL
       RETURNING id, session_duration_seconds`,
      [platform, channelId, sender.id]
    );

    return result.rows[0] || null;
  } catch (error) {
    console.error("[statsStorage] Failed to record user exit:", error.message);
    return null;
  }
};

/**
 * Process and store event based on type
 * Called from socket handlers
 *
 * @param {Object} event - Event from adapter
 */
const processEvent = async (event) => {
  if (!event?.type) return null;

  switch (event.type) {
    case "chat":
      return incrementChatCount(event);

    case "viewer-update":
      return storeViewerCount(event);

    case "user-enter":
      return recordUserEnter(event);

    case "user-exit":
      return recordUserExit(event);

    // donation, subscribe 등은 기존 eventService에서 처리
    default:
      return null;
  }
};

/**
 * Get chat stats for a channel in a time range
 *
 * @param {string} platform - Platform
 * @param {string} channelId - Channel ID
 * @param {Date} startTime - Start time
 * @param {Date} endTime - End time
 */
const getChatStats = async (platform, channelId, startTime, endTime) => {
  try {
    const pool = getDb();

    const result = await pool.query(
      `SELECT
         user_id,
         user_nickname,
         SUM(chat_count) as total_chats,
         COUNT(DISTINCT minute_timestamp) as active_minutes
       FROM chat_stats
       WHERE platform = $1
         AND channel_id = $2
         AND minute_timestamp >= $3
         AND minute_timestamp <= $4
       GROUP BY user_id, user_nickname
       ORDER BY total_chats DESC
       LIMIT 100`,
      [platform, channelId, startTime, endTime]
    );

    return result.rows;
  } catch (error) {
    console.error("[statsStorage] Failed to get chat stats:", error.message);
    return [];
  }
};

/**
 * Get viewer stats for a channel in a time range
 *
 * @param {string} platform - Platform
 * @param {string} channelId - Channel ID
 * @param {Date} startTime - Start time
 * @param {Date} endTime - End time
 */
const getViewerStats = async (platform, channelId, startTime, endTime) => {
  try {
    const pool = getDb();

    const result = await pool.query(
      `SELECT
         viewer_count,
         timestamp
       FROM viewer_stats
       WHERE platform = $1
         AND channel_id = $2
         AND timestamp >= $3
         AND timestamp <= $4
       ORDER BY timestamp ASC`,
      [platform, channelId, startTime, endTime]
    );

    return result.rows;
  } catch (error) {
    console.error("[statsStorage] Failed to get viewer stats:", error.message);
    return [];
  }
};

module.exports = {
  incrementChatCount,
  storeViewerCount,
  recordUserEnter,
  recordUserExit,
  processEvent,
  getChatStats,
  getViewerStats,
};
