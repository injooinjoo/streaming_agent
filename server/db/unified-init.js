/**
 * Unified Database Initialization
 * Creates all tables for the unified streaming system
 *
 * Schema changes from previous split DB:
 * - PERSONS: Removed total_chat_count, total_donation_count, total_donation_amount (calculated from EVENTS)
 * - BROADCASTS: Removed total_chat_count, total_donation_amount, category_id, category_name
 * - EVENTS: Redesigned as event hub with UUID, actor/target relations
 * - BROADCAST_SEGMENTS: NEW - tracks category changes within a broadcast
 * - CATEGORIES: NEW - unified category catalog
 * - VIEWER_ENGAGEMENT: Added category_id for per-category tracking
 * - VIEWER_SNAPSHOTS: Added segment_id reference
 */

const { db: dbLogger } = require("../services/logger");
const { v4: uuidv4 } = require("uuid");

/**
 * Initialize unified database tables
 * @param {sqlite3.Database} db - Database instance
 * @returns {Promise<void>}
 */
const initializeUnifiedDatabase = (db) => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Enable foreign keys
      db.run("PRAGMA foreign_keys = ON");

      // ===================================================================
      // CORE STREAMING TABLES
      // ===================================================================

      // ===== 1. PERSONS (15 columns) =====
      // Unified identity for streamers and viewers across platforms
      // NOTE: Stats (total_chat_count etc.) removed - calculated from EVENTS

      db.run(`CREATE TABLE IF NOT EXISTS persons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        platform TEXT NOT NULL CHECK(platform IN ('soop', 'chzzk', 'twitch', 'youtube')),
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

        first_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        UNIQUE(platform, platform_user_id)
      )`);

      // ===== 2. EVENTS (16 columns) =====
      // Unified event hub for chat, donation, subscribe, follow
      // Uses UUID for primary key to handle high-volume inserts

      db.run(`CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL CHECK(event_type IN ('chat', 'donation', 'subscribe', 'follow', 'view')),
        platform TEXT NOT NULL CHECK(platform IN ('soop', 'chzzk', 'twitch', 'youtube')),

        -- Actor (who performed the action)
        actor_person_id INTEGER REFERENCES persons(id),
        actor_nickname TEXT,
        actor_role TEXT CHECK(actor_role IN ('streamer', 'manager', 'vip', 'fan', 'regular', 'system')),

        -- Target (broadcaster receiving the event)
        target_person_id INTEGER REFERENCES persons(id),
        target_channel_id TEXT NOT NULL,

        -- Broadcast context
        broadcast_id INTEGER REFERENCES broadcasts(id),

        -- Event content
        message TEXT,
        amount INTEGER,
        original_amount INTEGER,
        currency TEXT,
        donation_type TEXT,

        event_timestamp DATETIME NOT NULL,
        ingested_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // ===== 3. BROADCASTS (18 columns) =====
      // Broadcast sessions - category info moved to BROADCAST_SEGMENTS

      db.run(`CREATE TABLE IF NOT EXISTS broadcasts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        platform TEXT NOT NULL CHECK(platform IN ('soop', 'chzzk', 'twitch', 'youtube')),
        channel_id TEXT NOT NULL,
        broadcast_id TEXT NOT NULL,
        broadcaster_person_id INTEGER REFERENCES persons(id),

        title TEXT,
        thumbnail_url TEXT,

        -- Viewer statistics
        current_viewer_count INTEGER DEFAULT 0,
        peak_viewer_count INTEGER DEFAULT 0,
        avg_viewer_count INTEGER DEFAULT 0,
        viewer_sum INTEGER DEFAULT 0,
        snapshot_count INTEGER DEFAULT 0,

        is_live INTEGER DEFAULT 1,
        started_at DATETIME,
        ended_at DATETIME,
        duration_minutes INTEGER,

        recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        UNIQUE(platform, channel_id, broadcast_id)
      )`);

      // ===== 4. BROADCAST_SEGMENTS (10 columns) - NEW =====
      // Tracks category changes within a broadcast session

      db.run(`CREATE TABLE IF NOT EXISTS broadcast_segments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        broadcast_id INTEGER NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
        platform TEXT NOT NULL,
        channel_id TEXT NOT NULL,

        category_id TEXT,
        category_name TEXT,

        segment_started_at DATETIME NOT NULL,
        segment_ended_at DATETIME,
        peak_viewer_count INTEGER DEFAULT 0,
        avg_viewer_count INTEGER DEFAULT 0
      )`);

      // ===== 5. CATEGORIES (8 columns) =====
      // Unified category catalog across platforms

      db.run(`CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        platform TEXT NOT NULL CHECK(platform IN ('soop', 'chzzk', 'twitch', 'youtube')),
        category_id TEXT NOT NULL,
        category_name TEXT NOT NULL,
        category_type TEXT,
        thumbnail_url TEXT,
        recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        UNIQUE(platform, category_id)
      )`);

      // ===== 6. VIEWER_ENGAGEMENT (12 columns) =====
      // Tracks viewer-broadcaster relationships with per-category stats

      db.run(`CREATE TABLE IF NOT EXISTS viewer_engagement (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        person_id INTEGER NOT NULL REFERENCES persons(id),
        platform TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        broadcaster_person_id INTEGER REFERENCES persons(id),

        category_id TEXT,

        chat_count INTEGER DEFAULT 0,
        donation_count INTEGER DEFAULT 0,
        total_donation_amount INTEGER DEFAULT 0,

        first_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        UNIQUE(person_id, channel_id, platform, category_id)
      )`);

      // ===== 7. VIEWER_SNAPSHOTS (9 columns) =====
      // Time-series viewer count data

      db.run(`CREATE TABLE IF NOT EXISTS viewer_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        platform TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        broadcast_id INTEGER REFERENCES broadcasts(id),
        segment_id INTEGER REFERENCES broadcast_segments(id),
        viewer_count INTEGER NOT NULL,
        chat_rate_per_minute INTEGER,
        snapshot_at DATETIME NOT NULL,
        ingested_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // ===== 8. USER_SESSIONS (11 columns) - NEW =====
      // 시청자 입장/퇴장 세션 추적 (SOOP 전용, Chzzk는 추정)

      db.run(`CREATE TABLE IF NOT EXISTS user_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        platform TEXT NOT NULL CHECK(platform IN ('soop', 'chzzk', 'twitch', 'youtube')),
        channel_id TEXT NOT NULL,
        broadcast_id INTEGER REFERENCES broadcasts(id),

        person_id INTEGER REFERENCES persons(id),
        user_nickname TEXT,

        session_started_at DATETIME NOT NULL,
        session_ended_at DATETIME,
        session_duration_seconds INTEGER,

        category_id TEXT,

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // ===================================================================
      // LEGACY STREAMING TABLES (for backward compatibility during migration)
      // ===================================================================

      // Platform categories (legacy - to be migrated to categories)
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

      // Unified games (cross-platform game catalog)
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

      // Category-game mappings
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

      // Category stats (time-series)
      db.run(`CREATE TABLE IF NOT EXISTS category_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        platform TEXT NOT NULL,
        platform_category_id TEXT NOT NULL,
        viewer_count INTEGER DEFAULT 0,
        streamer_count INTEGER DEFAULT 0,
        recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Legacy viewer stats
      db.run(`CREATE TABLE IF NOT EXISTS viewer_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        platform TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        viewer_count INTEGER DEFAULT 0,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // ===================================================================
      // OVERLAY SYSTEM TABLES
      // ===================================================================

      // Settings (key-value store)
      db.run(`CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      )`);

      // Users
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
        channel_id TEXT,
        platform TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // User settings
      db.run(`CREATE TABLE IF NOT EXISTS user_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        setting_key TEXT NOT NULL,
        setting_value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, setting_key)
      )`);

      // Roulette wheels
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

      // Signature sounds
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

      // Emoji settings
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

      // Voting polls
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

      // Poll votes
      db.run(`CREATE TABLE IF NOT EXISTS poll_votes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        poll_id INTEGER REFERENCES voting_polls(id) ON DELETE CASCADE,
        option_id INTEGER NOT NULL,
        voter_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Ending credits
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

      // Chat bots
      db.run(`CREATE TABLE IF NOT EXISTS chat_bots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        name TEXT DEFAULT 'StreamBot',
        is_active INTEGER DEFAULT 1
      )`);

      // Bot commands
      db.run(`CREATE TABLE IF NOT EXISTS bot_commands (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bot_id INTEGER REFERENCES chat_bots(id) ON DELETE CASCADE,
        command TEXT NOT NULL,
        response TEXT NOT NULL,
        cooldown INTEGER DEFAULT 5,
        is_active INTEGER DEFAULT 1
      )`);

      // Bot auto messages
      db.run(`CREATE TABLE IF NOT EXISTS bot_auto_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bot_id INTEGER REFERENCES chat_bots(id) ON DELETE CASCADE,
        trigger_type TEXT NOT NULL CHECK(trigger_type IN ('interval', 'enter', 'follow', 'donation')),
        trigger_value TEXT,
        message TEXT NOT NULL,
        is_active INTEGER DEFAULT 1
      )`);

      // Ad slots
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

      // Ad campaigns
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

      // Ad impressions
      db.run(`CREATE TABLE IF NOT EXISTS ad_impressions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        campaign_id INTEGER REFERENCES ad_campaigns(id),
        slot_id INTEGER REFERENCES ad_slots(id),
        streamer_id INTEGER REFERENCES users(id),
        event_type TEXT CHECK(event_type IN ('impression', 'click')),
        revenue REAL DEFAULT 0,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Ad settlements
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

      // Creators (marketplace)
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

      // Designs (marketplace + customizer)
      db.run(`CREATE TABLE IF NOT EXISTS designs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        creator_id INTEGER REFERENCES creators(id),
        name TEXT NOT NULL,
        description TEXT,
        category TEXT CHECK(category IN ('chat', 'alert', 'goal', 'ticker', 'subtitle', 'roulette', 'emoji', 'voting', 'credits', 'ad', 'package')),
        tags TEXT,
        thumbnail_url TEXT,
        design_data TEXT NOT NULL,
        custom_css TEXT,
        download_count INTEGER DEFAULT 0,
        average_rating REAL DEFAULT 0,
        status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'pending', 'approved', 'rejected', 'archived')),
        submitted_at DATETIME,
        reviewed_at DATETIME,
        reviewed_by INTEGER REFERENCES users(id),
        rejection_reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Designs indexes
      db.run(`CREATE INDEX IF NOT EXISTS idx_designs_user ON designs(user_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_designs_status ON designs(status)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_designs_category ON designs(category)`);

      // Design reviews
      db.run(`CREATE TABLE IF NOT EXISTS design_reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        design_id INTEGER REFERENCES designs(id),
        user_id INTEGER REFERENCES users(id),
        rating INTEGER CHECK(rating BETWEEN 1 AND 5),
        review_text TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(design_id, user_id)
      )`);

      // ===================================================================
      // INDEXES
      // ===================================================================

      // Persons indexes
      db.run(`CREATE INDEX IF NOT EXISTS idx_persons_platform_user ON persons(platform, platform_user_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_persons_channel ON persons(platform, channel_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_persons_last_seen ON persons(last_seen_at)`);

      // Events indexes (optimized for analytics queries)
      db.run(`CREATE INDEX IF NOT EXISTS idx_events_platform_date ON events(platform, DATE(event_timestamp))`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_events_target_type ON events(target_channel_id, event_type)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_events_actor ON events(actor_person_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_events_broadcast ON events(broadcast_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(event_timestamp)`);

      // Broadcasts indexes
      db.run(`CREATE INDEX IF NOT EXISTS idx_broadcasts_live ON broadcasts(is_live)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_broadcasts_channel ON broadcasts(platform, channel_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_broadcasts_broadcaster ON broadcasts(broadcaster_person_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_broadcasts_started ON broadcasts(started_at)`);

      // Broadcast segments indexes
      db.run(`CREATE INDEX IF NOT EXISTS idx_segments_broadcast ON broadcast_segments(broadcast_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_segments_category ON broadcast_segments(category_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_segments_time ON broadcast_segments(segment_started_at)`);

      // Categories indexes
      db.run(`CREATE INDEX IF NOT EXISTS idx_categories_platform ON categories(platform, category_id)`);

      // Viewer engagement indexes
      db.run(`CREATE INDEX IF NOT EXISTS idx_engagement_person ON viewer_engagement(person_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_engagement_broadcaster ON viewer_engagement(channel_id, platform)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_engagement_category ON viewer_engagement(category_id)`);

      // Viewer snapshots indexes
      db.run(`CREATE INDEX IF NOT EXISTS idx_snapshots_broadcast ON viewer_snapshots(broadcast_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_snapshots_segment ON viewer_snapshots(segment_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_snapshots_time ON viewer_snapshots(snapshot_at)`);

      // User sessions indexes
      db.run(`CREATE INDEX IF NOT EXISTS idx_user_sessions_person ON user_sessions(person_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_user_sessions_broadcast ON user_sessions(broadcast_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_user_sessions_channel ON user_sessions(platform, channel_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_user_sessions_time ON user_sessions(session_started_at)`);

      // Legacy table indexes
      db.run(`CREATE INDEX IF NOT EXISTS idx_platform_categories_platform ON platform_categories(platform)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_category_stats_platform ON category_stats(platform, platform_category_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_category_stats_recorded ON category_stats(recorded_at)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_mappings_game ON category_game_mappings(unified_game_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_viewer_stats_channel ON viewer_stats(platform, channel_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_viewer_stats_timestamp ON viewer_stats(timestamp)`);

      // User settings index
      db.run(`CREATE INDEX IF NOT EXISTS idx_user_settings ON user_settings(user_id, setting_key)`);

      dbLogger.info("Unified database tables initialized");
      resolve();
    });
  });
};

/**
 * Generate UUID for events
 * @returns {string}
 */
const generateEventId = () => {
  return uuidv4();
};

module.exports = {
  initializeUnifiedDatabase,
  generateEventId,
};
