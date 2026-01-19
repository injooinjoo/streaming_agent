/**
 * Streaming Database Initialization
 * Creates tables for streaming data (events, viewer stats, categories)
 * Separated from overlay system database for better data management
 */

const { db: dbLogger } = require("../services/logger");

/**
 * Initialize streaming database tables
 * @param {sqlite3.Database} db - Streaming database instance
 * @returns {Promise<void>}
 */
const initializeStreamingDatabase = (db) => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // ===== Events Table =====
      // Stores chat, donation, subscription, follow events from all platforms

      db.run(`CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT,
        sender TEXT,
        sender_id TEXT,
        amount INTEGER,
        message TEXT,
        platform TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Add sender_id column for existing databases (SQLite safe migration)
      db.run(`ALTER TABLE events ADD COLUMN sender_id TEXT`, (err) => {
        // Ignore error if column already exists
        if (err && !err.message.includes("duplicate column")) {
          dbLogger.warn("Could not add sender_id column:", err.message);
        }
      });

      // ===== Viewer Stats Table =====
      // Stores periodic viewer count snapshots for channels

      db.run(`CREATE TABLE IF NOT EXISTS viewer_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        platform TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        viewer_count INTEGER DEFAULT 0,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // ===== Platform Categories Table =====
      // Simple category catalog - just stores category info from each platform
      // Analysis is done by joining with broadcasts, not by storing counts here

      db.run(`CREATE TABLE IF NOT EXISTS platform_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        platform TEXT NOT NULL CHECK(platform IN ('soop', 'chzzk', 'twitch', 'youtube')),
        platform_category_id TEXT NOT NULL,
        platform_category_name TEXT NOT NULL,
        category_type TEXT,
        thumbnail_url TEXT,
        is_active INTEGER DEFAULT 1,
        first_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(platform, platform_category_id)
      )`);

      // ===== Unified Games Table =====
      // Cross-platform game catalog

      db.run(`CREATE TABLE IF NOT EXISTS unified_games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        name_kr TEXT,
        genre TEXT,
        genre_kr TEXT,
        developer TEXT,
        release_date TEXT,
        description TEXT,
        image_url TEXT,
        is_verified INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // ===== Category Game Mappings Table =====
      // Maps platform categories to unified games

      db.run(`CREATE TABLE IF NOT EXISTS category_game_mappings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        unified_game_id INTEGER REFERENCES unified_games(id) ON DELETE CASCADE,
        platform TEXT NOT NULL,
        platform_category_id TEXT NOT NULL,
        platform_category_name TEXT,
        confidence REAL DEFAULT 1.0,
        is_manual INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(platform, platform_category_id)
      )`);

      // Migration: Add platform_category_name column if missing
      db.run(`ALTER TABLE category_game_mappings ADD COLUMN platform_category_name TEXT`, (err) => {
        if (err && !err.message.includes("duplicate column")) {
          dbLogger.warn("Could not add platform_category_name column:", err.message);
        }
      });

      // ===== Persons Table =====
      // Unified identity for streamers and viewers across platforms
      // NOTE: Donation/chat stats are what this person SPENT as a viewer
      //       Received amounts are tracked in broadcasts table

      db.run(`CREATE TABLE IF NOT EXISTS persons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        platform TEXT NOT NULL,
        platform_user_id TEXT NOT NULL,
        nickname TEXT,
        profile_image_url TEXT,

        -- Broadcaster fields (channel_id NOT NULL = broadcaster)
        channel_id TEXT,
        channel_description TEXT,
        follower_count INTEGER DEFAULT 0,
        subscriber_count INTEGER DEFAULT 0,
        total_broadcast_minutes INTEGER DEFAULT 0,
        last_broadcast_at DATETIME,

        -- Viewer statistics: what this person SPENT as a viewer (across all channels)
        total_chat_count INTEGER DEFAULT 0,
        total_donation_count INTEGER DEFAULT 0,
        total_donation_amount INTEGER DEFAULT 0,

        first_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        UNIQUE(platform, platform_user_id)
      )`);

      // ===== Viewer Engagement Table =====
      // Tracks viewer-broadcaster relationships with accumulated stats
      // Grouped by category - same viewer+broadcaster+category accumulates

      db.run(`CREATE TABLE IF NOT EXISTS viewer_engagement (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        viewer_person_id INTEGER NOT NULL REFERENCES persons(id),
        broadcaster_person_id INTEGER REFERENCES persons(id),
        broadcaster_channel_id TEXT NOT NULL,
        platform TEXT NOT NULL,

        -- Category grouping (same category = accumulate)
        category_id TEXT,
        category_name TEXT,

        -- Accumulated stats for this viewer-broadcaster-category combo
        watch_minutes INTEGER DEFAULT 0,
        chat_count INTEGER DEFAULT 0,
        donation_count INTEGER DEFAULT 0,
        donation_amount INTEGER DEFAULT 0,

        first_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        UNIQUE(viewer_person_id, broadcaster_channel_id, platform, category_id)
      )`);

      // ===== Broadcasts Table =====
      // Broadcast sessions with lifecycle tracking
      // NOTE: UNIQUE includes category_id - category change creates new record (same broadcast_id)

      db.run(`CREATE TABLE IF NOT EXISTS broadcasts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        platform TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        broadcast_id TEXT NOT NULL,
        broadcaster_person_id INTEGER REFERENCES persons(id),
        broadcaster_nickname TEXT,

        title TEXT,
        category_id TEXT,
        category_name TEXT,
        thumbnail_url TEXT,

        -- Real-time statistics
        current_viewer_count INTEGER DEFAULT 0,
        peak_viewer_count INTEGER DEFAULT 0,
        avg_viewer_count INTEGER DEFAULT 0,
        total_chat_count INTEGER DEFAULT 0,
        total_donation_amount INTEGER DEFAULT 0,
        viewer_snapshot_count INTEGER DEFAULT 0,
        viewer_sum INTEGER DEFAULT 0,

        is_live INTEGER DEFAULT 1,
        started_at DATETIME,
        ended_at DATETIME,
        duration_minutes INTEGER,

        recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        UNIQUE(platform, channel_id, broadcast_id, category_id)
      )`)

      // Migration: Add broadcaster_nickname column if missing
      db.run(`ALTER TABLE broadcasts ADD COLUMN broadcaster_nickname TEXT`, (err) => {
        if (err && !err.message.includes("duplicate column")) {
          dbLogger.warn("Could not add broadcaster_nickname column:", err.message);
        }
      });

      // ===== Viewer Snapshots Table =====
      // Time-series viewer count data linked to broadcasts
      // Stores periodic snapshots (e.g., every 5 minutes during crawl)

      db.run(`CREATE TABLE IF NOT EXISTS viewer_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        platform TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        broadcast_id INTEGER REFERENCES broadcasts(id),
        viewer_count INTEGER NOT NULL,
        chat_rate_per_minute INTEGER,
        snapshot_at DATETIME NOT NULL,
        ingested_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // ===== Indexes =====

      // Persons indexes
      db.run(`CREATE INDEX IF NOT EXISTS idx_persons_platform_user ON persons(platform, platform_user_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_persons_channel ON persons(platform, channel_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_persons_last_seen ON persons(last_seen_at)`);

      // Broadcasts indexes
      db.run(`CREATE INDEX IF NOT EXISTS idx_broadcasts_live ON broadcasts(is_live)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_broadcasts_channel ON broadcasts(platform, channel_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_broadcasts_broadcaster ON broadcasts(broadcaster_person_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_broadcasts_started ON broadcasts(started_at)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_broadcasts_category ON broadcasts(category_id)`);

      // Viewer snapshots indexes
      db.run(`CREATE INDEX IF NOT EXISTS idx_viewer_snapshots_broadcast ON viewer_snapshots(broadcast_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_viewer_snapshots_channel ON viewer_snapshots(platform, channel_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_viewer_snapshots_time ON viewer_snapshots(snapshot_at)`);

      // Events indexes
      db.run(`CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_events_platform ON events(platform)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_events_type ON events(type)`);

      // Viewer stats indexes
      db.run(`CREATE INDEX IF NOT EXISTS idx_viewer_stats_channel ON viewer_stats(platform, channel_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_viewer_stats_timestamp ON viewer_stats(timestamp)`);

      // Category indexes
      db.run(`CREATE INDEX IF NOT EXISTS idx_platform_categories_platform ON platform_categories(platform)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_platform_categories_active ON platform_categories(is_active)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_mappings_game ON category_game_mappings(unified_game_id)`);

      // Viewer engagement indexes
      db.run(`CREATE INDEX IF NOT EXISTS idx_viewer_engagement_viewer ON viewer_engagement(viewer_person_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_viewer_engagement_broadcaster ON viewer_engagement(broadcaster_channel_id, platform)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_viewer_engagement_category ON viewer_engagement(category_id)`);

      dbLogger.info("Streaming database tables initialized");
      resolve();
    });
  });
};

module.exports = { initializeStreamingDatabase };
