/**
 * Database Initialization
 * Creates all required tables for the application
 */

const { db: dbLogger } = require("../services/logger");

/**
 * Initialize database tables
 * @param {sqlite3.Database} db - Database instance
 * @returns {Promise<void>}
 */
const initializeDatabase = (db) => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // ===== Core Tables =====

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

      db.run(`CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      )`);

      // ===== User Tables =====

      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE,
        password_hash TEXT,
        display_name TEXT NOT NULL,
        avatar_url TEXT,
        role TEXT DEFAULT 'user' CHECK(role IN ('user', 'creator', 'advertiser', 'admin')),
        oauth_provider TEXT,
        oauth_id TEXT,
        overlay_hash TEXT UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS user_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        setting_key TEXT NOT NULL,
        setting_value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, setting_key)
      )`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_user_settings ON user_settings(user_id, setting_key)`);

      // ===== Overlay Feature Tables =====

      db.run(`CREATE TABLE IF NOT EXISTS roulette_wheels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL DEFAULT '기본 룰렛',
        trigger_amount INTEGER NOT NULL DEFAULT 1000,
        trigger_type TEXT DEFAULT 'minimum' CHECK(trigger_type IN ('exact', 'minimum', 'range')),
        trigger_max INTEGER,
        segments TEXT NOT NULL,
        spin_duration INTEGER DEFAULT 5000,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS signature_sounds (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        trigger_type TEXT DEFAULT 'amount' CHECK(trigger_type IN ('amount', 'user', 'keyword')),
        trigger_value TEXT NOT NULL,
        sound_url TEXT NOT NULL,
        image_url TEXT,
        animation TEXT DEFAULT 'bounceIn',
        priority INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS emoji_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        emoji_set TEXT NOT NULL DEFAULT '["❤️","🔥","👏","😂","🎉"]',
        display_duration INTEGER DEFAULT 3000,
        max_concurrent INTEGER DEFAULT 10,
        animation_style TEXT DEFAULT 'float' CHECK(animation_style IN ('float', 'explode', 'rain', 'bounce')),
        trigger_keywords TEXT,
        is_active INTEGER DEFAULT 1
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS voting_polls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        options TEXT NOT NULL,
        status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'active', 'closed')),
        duration INTEGER,
        started_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS poll_votes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        poll_id INTEGER REFERENCES voting_polls(id) ON DELETE CASCADE,
        option_id INTEGER NOT NULL,
        voter_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS ending_credits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        template_name TEXT DEFAULT '기본 크레딧',
        title TEXT DEFAULT '오늘의 방송',
        sections TEXT NOT NULL DEFAULT '[]',
        background_url TEXT,
        music_url TEXT,
        scroll_speed INTEGER DEFAULT 3,
        auto_populate INTEGER DEFAULT 1,
        min_donation INTEGER DEFAULT 1000,
        is_active INTEGER DEFAULT 1
      )`);

      // ===== Chat Bot Tables =====

      db.run(`CREATE TABLE IF NOT EXISTS chat_bots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        name TEXT DEFAULT 'StreamBot',
        is_active INTEGER DEFAULT 1
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS bot_commands (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bot_id INTEGER REFERENCES chat_bots(id) ON DELETE CASCADE,
        command TEXT NOT NULL,
        response TEXT NOT NULL,
        cooldown INTEGER DEFAULT 5,
        is_active INTEGER DEFAULT 1
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS bot_auto_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bot_id INTEGER REFERENCES chat_bots(id) ON DELETE CASCADE,
        trigger_type TEXT NOT NULL CHECK(trigger_type IN ('interval', 'enter', 'follow', 'donation')),
        trigger_value TEXT,
        message TEXT NOT NULL,
        is_active INTEGER DEFAULT 1
      )`);

      // ===== Ad System Tables =====

      db.run(`CREATE TABLE IF NOT EXISTS ad_slots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id),
        name TEXT NOT NULL,
        type TEXT CHECK(type IN ('banner', 'popup', 'corner')),
        position_x REAL NOT NULL DEFAULT 0,
        position_y REAL NOT NULL DEFAULT 0,
        width INTEGER NOT NULL DEFAULT 300,
        height INTEGER NOT NULL DEFAULT 100,
        enabled INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS ad_campaigns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        advertiser_id INTEGER REFERENCES users(id),
        name TEXT NOT NULL,
        content_type TEXT CHECK(content_type IN ('image', 'video', 'html')),
        content_url TEXT NOT NULL,
        click_url TEXT,
        budget_daily INTEGER DEFAULT 0,
        budget_total INTEGER DEFAULT 0,
        budget_spent INTEGER DEFAULT 0,
        cpm INTEGER DEFAULT 0,
        cpc INTEGER DEFAULT 0,
        start_date DATE,
        end_date DATE,
        target_streamers TEXT,
        target_categories TEXT,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'active', 'paused', 'completed', 'rejected')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS ad_impressions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        campaign_id INTEGER REFERENCES ad_campaigns(id),
        slot_id INTEGER REFERENCES ad_slots(id),
        streamer_id INTEGER REFERENCES users(id),
        event_type TEXT CHECK(event_type IN ('impression', 'click')),
        revenue REAL DEFAULT 0,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS ad_settlements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        streamer_id INTEGER REFERENCES users(id),
        period TEXT NOT NULL,
        total_impressions INTEGER DEFAULT 0,
        total_clicks INTEGER DEFAULT 0,
        total_revenue REAL DEFAULT 0,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'paid')),
        payment_date DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // ===== Marketplace Tables =====

      db.run(`CREATE TABLE IF NOT EXISTS creators (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE REFERENCES users(id),
        display_name TEXT NOT NULL,
        avatar_url TEXT,
        bio TEXT,
        total_downloads INTEGER DEFAULT 0,
        average_rating REAL DEFAULT 0,
        verified INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS designs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        creator_id INTEGER REFERENCES creators(id),
        name TEXT NOT NULL,
        description TEXT,
        category TEXT CHECK(category IN ('chat', 'alert', 'goal', 'ticker', 'subtitle', 'package')),
        tags TEXT,
        thumbnail_url TEXT,
        design_data TEXT NOT NULL,
        download_count INTEGER DEFAULT 0,
        average_rating REAL DEFAULT 0,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'archived')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS design_reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        design_id INTEGER REFERENCES designs(id),
        user_id INTEGER REFERENCES users(id),
        rating INTEGER CHECK(rating BETWEEN 1 AND 5),
        review_text TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(design_id, user_id)
      )`);

      // ===== Category/Game Catalog Tables =====

      db.run(`CREATE TABLE IF NOT EXISTS platform_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        platform TEXT NOT NULL CHECK(platform IN ('soop', 'chzzk', 'twitch', 'youtube')),
        platform_category_id TEXT NOT NULL,
        platform_category_name TEXT NOT NULL,
        category_type TEXT,
        thumbnail_url TEXT,
        viewer_count INTEGER DEFAULT 0,
        streamer_count INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        first_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(platform, platform_category_id)
      )`);

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

      db.run(`CREATE TABLE IF NOT EXISTS category_game_mappings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        unified_game_id INTEGER REFERENCES unified_games(id) ON DELETE CASCADE,
        platform TEXT NOT NULL,
        platform_category_id TEXT NOT NULL,
        confidence REAL DEFAULT 1.0,
        is_manual INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(platform, platform_category_id)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS category_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        platform TEXT NOT NULL,
        platform_category_id TEXT NOT NULL,
        recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        viewer_count INTEGER DEFAULT 0,
        streamer_count INTEGER DEFAULT 0
      )`);

      // ===== Indexes =====

      db.run(`CREATE INDEX IF NOT EXISTS idx_platform_categories_platform ON platform_categories(platform)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_platform_categories_active ON platform_categories(is_active)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_category_stats_recorded ON category_stats(recorded_at)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_category_stats_platform ON category_stats(platform, platform_category_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_mappings_game ON category_game_mappings(unified_game_id)`);

      dbLogger.info("All database tables initialized");
      resolve();
    });
  });
};

module.exports = { initializeDatabase };
