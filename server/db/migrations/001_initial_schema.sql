-- ===================================================================
-- Streaming Agent - PostgreSQL Initial Schema Migration
-- Converted from SQLite unified-init.js
--
-- Usage:
--   Run this SQL in Supabase SQL Editor or via psql:
--   psql $DATABASE_URL -f 001_initial_schema.sql
-- ===================================================================

-- Enable UUID extension (for event IDs)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===================================================================
-- CORE STREAMING TABLES
-- ===================================================================

-- ===== 1. PERSONS (15 columns) =====
-- Unified identity for streamers and viewers across platforms
CREATE TABLE IF NOT EXISTS persons (
    id BIGSERIAL PRIMARY KEY,
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
    last_broadcast_at TIMESTAMP,

    first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(platform, platform_user_id)
);

-- ===== 2. BROADCASTS (18 columns) =====
-- Broadcast sessions - created before events to allow foreign key reference
CREATE TABLE IF NOT EXISTS broadcasts (
    id BIGSERIAL PRIMARY KEY,
    platform TEXT NOT NULL CHECK(platform IN ('soop', 'chzzk', 'twitch', 'youtube')),
    channel_id TEXT NOT NULL,
    broadcast_id TEXT NOT NULL,
    broadcaster_person_id BIGINT REFERENCES persons(id),

    title TEXT,
    thumbnail_url TEXT,

    -- Viewer statistics
    current_viewer_count INTEGER DEFAULT 0,
    peak_viewer_count INTEGER DEFAULT 0,
    avg_viewer_count INTEGER DEFAULT 0,
    viewer_sum INTEGER DEFAULT 0,
    snapshot_count INTEGER DEFAULT 0,

    is_live BOOLEAN DEFAULT TRUE,
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    duration_minutes INTEGER,

    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(platform, channel_id, broadcast_id)
);

-- ===== 3. EVENTS (16 columns) =====
-- Unified event hub for chat, donation, subscribe, follow
-- Uses UUID for primary key to handle high-volume inserts
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    event_type TEXT NOT NULL CHECK(event_type IN ('chat', 'donation', 'subscribe', 'follow', 'view')),
    platform TEXT NOT NULL CHECK(platform IN ('soop', 'chzzk', 'twitch', 'youtube')),

    -- Actor (who performed the action)
    actor_person_id BIGINT REFERENCES persons(id),
    actor_nickname TEXT,
    actor_role TEXT CHECK(actor_role IN ('streamer', 'manager', 'vip', 'fan', 'regular', 'system')),

    -- Target (broadcaster receiving the event)
    target_person_id BIGINT REFERENCES persons(id),
    target_channel_id TEXT NOT NULL,

    -- Broadcast context
    broadcast_id BIGINT REFERENCES broadcasts(id),

    -- Event content
    message TEXT,
    amount INTEGER,
    original_amount INTEGER,
    currency TEXT,
    donation_type TEXT,

    event_timestamp TIMESTAMP NOT NULL,
    ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===== 4. BROADCAST_SEGMENTS (10 columns) =====
-- Tracks category changes within a broadcast session
CREATE TABLE IF NOT EXISTS broadcast_segments (
    id BIGSERIAL PRIMARY KEY,
    broadcast_id BIGINT NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    channel_id TEXT NOT NULL,

    category_id TEXT,
    category_name TEXT,

    segment_started_at TIMESTAMP NOT NULL,
    segment_ended_at TIMESTAMP,
    peak_viewer_count INTEGER DEFAULT 0,
    avg_viewer_count INTEGER DEFAULT 0
);

-- ===== 5. CATEGORIES (8 columns) =====
-- Unified category catalog across platforms
CREATE TABLE IF NOT EXISTS categories (
    id BIGSERIAL PRIMARY KEY,
    platform TEXT NOT NULL CHECK(platform IN ('soop', 'chzzk', 'twitch', 'youtube')),
    category_id TEXT NOT NULL,
    category_name TEXT NOT NULL,
    category_type TEXT,
    thumbnail_url TEXT,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(platform, category_id)
);

-- ===== 6. VIEWER_ENGAGEMENT (12 columns) =====
-- Tracks viewer-broadcaster relationships with per-category stats
CREATE TABLE IF NOT EXISTS viewer_engagement (
    id BIGSERIAL PRIMARY KEY,
    person_id BIGINT NOT NULL REFERENCES persons(id),
    platform TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    broadcaster_person_id BIGINT REFERENCES persons(id),

    category_id TEXT,

    chat_count INTEGER DEFAULT 0,
    donation_count INTEGER DEFAULT 0,
    total_donation_amount INTEGER DEFAULT 0,

    first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(person_id, channel_id, platform, category_id)
);

-- ===== 7. VIEWER_SNAPSHOTS (9 columns) =====
-- Time-series viewer count data
CREATE TABLE IF NOT EXISTS viewer_snapshots (
    id BIGSERIAL PRIMARY KEY,
    platform TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    broadcast_id BIGINT REFERENCES broadcasts(id),
    segment_id BIGINT REFERENCES broadcast_segments(id),
    viewer_count INTEGER NOT NULL,
    chat_rate_per_minute INTEGER,
    snapshot_at TIMESTAMP NOT NULL,
    ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===== 8. USER_SESSIONS (11 columns) =====
-- 시청자 입장/퇴장 세션 추적 (SOOP 전용, Chzzk는 추정)
CREATE TABLE IF NOT EXISTS user_sessions (
    id BIGSERIAL PRIMARY KEY,
    platform TEXT NOT NULL CHECK(platform IN ('soop', 'chzzk', 'twitch', 'youtube')),
    channel_id TEXT NOT NULL,
    broadcast_id BIGINT REFERENCES broadcasts(id),

    person_id BIGINT REFERENCES persons(id),
    user_nickname TEXT,

    session_started_at TIMESTAMP NOT NULL,
    session_ended_at TIMESTAMP,
    session_duration_seconds INTEGER,

    category_id TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===================================================================
-- LEGACY STREAMING TABLES (for backward compatibility during migration)
-- ===================================================================

-- Platform categories (legacy - to be migrated to categories)
CREATE TABLE IF NOT EXISTS platform_categories (
    id BIGSERIAL PRIMARY KEY,
    platform TEXT NOT NULL CHECK(platform IN ('soop', 'chzzk', 'twitch', 'youtube')),
    platform_category_id TEXT NOT NULL,
    platform_category_name TEXT NOT NULL,
    category_type TEXT,
    thumbnail_url TEXT,
    viewer_count INTEGER DEFAULT 0,
    streamer_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(platform, platform_category_id)
);

-- Unified games (cross-platform game catalog)
CREATE TABLE IF NOT EXISTS unified_games (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    name_kr TEXT,
    genre TEXT,
    genre_kr TEXT,
    developer TEXT,
    release_date TEXT,
    description TEXT,
    image_url TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Category-game mappings
CREATE TABLE IF NOT EXISTS category_game_mappings (
    id BIGSERIAL PRIMARY KEY,
    unified_game_id BIGINT REFERENCES unified_games(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    platform_category_id TEXT NOT NULL,
    platform_category_name TEXT,
    confidence REAL DEFAULT 1.0,
    is_manual BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(platform, platform_category_id)
);

-- Category stats (time-series)
CREATE TABLE IF NOT EXISTS category_stats (
    id BIGSERIAL PRIMARY KEY,
    platform TEXT NOT NULL,
    platform_category_id TEXT NOT NULL,
    viewer_count INTEGER DEFAULT 0,
    streamer_count INTEGER DEFAULT 0,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Legacy viewer stats
CREATE TABLE IF NOT EXISTS viewer_stats (
    id BIGSERIAL PRIMARY KEY,
    platform TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    viewer_count INTEGER DEFAULT 0,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===================================================================
-- OVERLAY SYSTEM TABLES
-- ===================================================================

-- Settings (key-value store)
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- Users
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User settings
CREATE TABLE IF NOT EXISTS user_settings (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    setting_key TEXT NOT NULL,
    setting_value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, setting_key)
);

-- Roulette wheels
CREATE TABLE IF NOT EXISTS roulette_wheels (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT '기본 룰렛',
    trigger_amount INTEGER NOT NULL DEFAULT 1000,
    trigger_type TEXT DEFAULT 'minimum' CHECK(trigger_type IN ('exact', 'minimum', 'range')),
    trigger_max INTEGER,
    segments TEXT NOT NULL,
    spin_duration INTEGER DEFAULT 5000,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Signature sounds
CREATE TABLE IF NOT EXISTS signature_sounds (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    trigger_type TEXT DEFAULT 'amount' CHECK(trigger_type IN ('amount', 'user', 'keyword')),
    trigger_value TEXT NOT NULL,
    sound_url TEXT NOT NULL,
    image_url TEXT,
    animation TEXT DEFAULT 'bounceIn',
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Emoji settings
CREATE TABLE IF NOT EXISTS emoji_settings (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    emoji_set TEXT NOT NULL DEFAULT '["❤️","🔥","👏","😂","🎉"]',
    display_duration INTEGER DEFAULT 3000,
    max_concurrent INTEGER DEFAULT 10,
    animation_style TEXT DEFAULT 'float' CHECK(animation_style IN ('float', 'explode', 'rain', 'bounce')),
    trigger_keywords TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

-- Voting polls
CREATE TABLE IF NOT EXISTS voting_polls (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    options TEXT NOT NULL,
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'active', 'closed')),
    duration INTEGER,
    started_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Poll votes
CREATE TABLE IF NOT EXISTS poll_votes (
    id BIGSERIAL PRIMARY KEY,
    poll_id BIGINT REFERENCES voting_polls(id) ON DELETE CASCADE,
    option_id INTEGER NOT NULL,
    voter_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ending credits
CREATE TABLE IF NOT EXISTS ending_credits (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    template_name TEXT DEFAULT '기본 크레딧',
    title TEXT DEFAULT '오늘의 방송',
    sections TEXT NOT NULL DEFAULT '[]',
    background_url TEXT,
    music_url TEXT,
    scroll_speed INTEGER DEFAULT 3,
    auto_populate BOOLEAN DEFAULT TRUE,
    min_donation INTEGER DEFAULT 1000,
    is_active BOOLEAN DEFAULT TRUE
);

-- Chat bots
CREATE TABLE IF NOT EXISTS chat_bots (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    name TEXT DEFAULT 'StreamBot',
    is_active BOOLEAN DEFAULT TRUE
);

-- Bot commands
CREATE TABLE IF NOT EXISTS bot_commands (
    id BIGSERIAL PRIMARY KEY,
    bot_id BIGINT REFERENCES chat_bots(id) ON DELETE CASCADE,
    command TEXT NOT NULL,
    response TEXT NOT NULL,
    cooldown INTEGER DEFAULT 5,
    is_active BOOLEAN DEFAULT TRUE
);

-- Bot auto messages
CREATE TABLE IF NOT EXISTS bot_auto_messages (
    id BIGSERIAL PRIMARY KEY,
    bot_id BIGINT REFERENCES chat_bots(id) ON DELETE CASCADE,
    trigger_type TEXT NOT NULL CHECK(trigger_type IN ('interval', 'enter', 'follow', 'donation')),
    trigger_value TEXT,
    message TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- Ad slots
CREATE TABLE IF NOT EXISTS ad_slots (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    name TEXT NOT NULL,
    type TEXT CHECK(type IN ('banner', 'popup', 'corner')),
    position_x REAL NOT NULL DEFAULT 0,
    position_y REAL NOT NULL DEFAULT 0,
    width INTEGER NOT NULL DEFAULT 300,
    height INTEGER NOT NULL DEFAULT 100,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ad campaigns
CREATE TABLE IF NOT EXISTS ad_campaigns (
    id BIGSERIAL PRIMARY KEY,
    advertiser_id BIGINT REFERENCES users(id),
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ad impressions
CREATE TABLE IF NOT EXISTS ad_impressions (
    id BIGSERIAL PRIMARY KEY,
    campaign_id BIGINT REFERENCES ad_campaigns(id),
    slot_id BIGINT REFERENCES ad_slots(id),
    streamer_id BIGINT REFERENCES users(id),
    event_type TEXT CHECK(event_type IN ('impression', 'click')),
    revenue REAL DEFAULT 0,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ad settlements
CREATE TABLE IF NOT EXISTS ad_settlements (
    id BIGSERIAL PRIMARY KEY,
    streamer_id BIGINT REFERENCES users(id),
    period TEXT NOT NULL,
    total_impressions INTEGER DEFAULT 0,
    total_clicks INTEGER DEFAULT 0,
    total_revenue REAL DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'paid')),
    payment_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Creators (marketplace)
CREATE TABLE IF NOT EXISTS creators (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE REFERENCES users(id),
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    total_downloads INTEGER DEFAULT 0,
    average_rating REAL DEFAULT 0,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Designs (marketplace)
CREATE TABLE IF NOT EXISTS designs (
    id BIGSERIAL PRIMARY KEY,
    creator_id BIGINT REFERENCES creators(id),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT CHECK(category IN ('chat', 'alert', 'goal', 'ticker', 'subtitle', 'package')),
    tags TEXT,
    thumbnail_url TEXT,
    design_data TEXT NOT NULL,
    download_count INTEGER DEFAULT 0,
    average_rating REAL DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'archived')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Design reviews
CREATE TABLE IF NOT EXISTS design_reviews (
    id BIGSERIAL PRIMARY KEY,
    design_id BIGINT REFERENCES designs(id),
    user_id BIGINT REFERENCES users(id),
    rating INTEGER CHECK(rating BETWEEN 1 AND 5),
    review_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(design_id, user_id)
);

-- ===================================================================
-- INDEXES
-- ===================================================================

-- Persons indexes
CREATE INDEX IF NOT EXISTS idx_persons_platform_user ON persons(platform, platform_user_id);
CREATE INDEX IF NOT EXISTS idx_persons_channel ON persons(platform, channel_id);
CREATE INDEX IF NOT EXISTS idx_persons_last_seen ON persons(last_seen_at);

-- Events indexes (optimized for analytics queries)
CREATE INDEX IF NOT EXISTS idx_events_platform_date ON events(platform, (event_timestamp::DATE));
CREATE INDEX IF NOT EXISTS idx_events_target_type ON events(target_channel_id, event_type);
CREATE INDEX IF NOT EXISTS idx_events_actor ON events(actor_person_id);
CREATE INDEX IF NOT EXISTS idx_events_broadcast ON events(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(event_timestamp);

-- Broadcasts indexes
CREATE INDEX IF NOT EXISTS idx_broadcasts_live ON broadcasts(is_live);
CREATE INDEX IF NOT EXISTS idx_broadcasts_channel ON broadcasts(platform, channel_id);
CREATE INDEX IF NOT EXISTS idx_broadcasts_broadcaster ON broadcasts(broadcaster_person_id);
CREATE INDEX IF NOT EXISTS idx_broadcasts_started ON broadcasts(started_at);

-- Broadcast segments indexes
CREATE INDEX IF NOT EXISTS idx_segments_broadcast ON broadcast_segments(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_segments_category ON broadcast_segments(category_id);
CREATE INDEX IF NOT EXISTS idx_segments_time ON broadcast_segments(segment_started_at);

-- Categories indexes
CREATE INDEX IF NOT EXISTS idx_categories_platform ON categories(platform, category_id);

-- Viewer engagement indexes
CREATE INDEX IF NOT EXISTS idx_engagement_person ON viewer_engagement(person_id);
CREATE INDEX IF NOT EXISTS idx_engagement_broadcaster ON viewer_engagement(channel_id, platform);
CREATE INDEX IF NOT EXISTS idx_engagement_category ON viewer_engagement(category_id);

-- Viewer snapshots indexes
CREATE INDEX IF NOT EXISTS idx_snapshots_broadcast ON viewer_snapshots(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_segment ON viewer_snapshots(segment_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_time ON viewer_snapshots(snapshot_at);

-- User sessions indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_person ON user_sessions(person_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_broadcast ON user_sessions(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_channel ON user_sessions(platform, channel_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_time ON user_sessions(session_started_at);

-- Legacy table indexes
CREATE INDEX IF NOT EXISTS idx_platform_categories_platform ON platform_categories(platform);
CREATE INDEX IF NOT EXISTS idx_category_stats_platform ON category_stats(platform, platform_category_id);
CREATE INDEX IF NOT EXISTS idx_category_stats_recorded ON category_stats(recorded_at);
CREATE INDEX IF NOT EXISTS idx_mappings_game ON category_game_mappings(unified_game_id);
CREATE INDEX IF NOT EXISTS idx_viewer_stats_channel ON viewer_stats(platform, channel_id);
CREATE INDEX IF NOT EXISTS idx_viewer_stats_timestamp ON viewer_stats(timestamp);

-- User settings index
CREATE INDEX IF NOT EXISTS idx_user_settings ON user_settings(user_id, setting_key);

-- ===================================================================
-- ENABLE ROW LEVEL SECURITY (Supabase)
-- ===================================================================

-- Enable RLS on all tables (policies to be added based on requirements)
ALTER TABLE persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE viewer_engagement ENABLE ROW LEVEL SECURITY;
ALTER TABLE viewer_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_game_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE viewer_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE roulette_wheels ENABLE ROW LEVEL SECURITY;
ALTER TABLE signature_sounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE emoji_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE voting_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ending_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_auto_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_reviews ENABLE ROW LEVEL SECURITY;

-- ===================================================================
-- RLS POLICIES (Service Role bypass - for server-side access)
-- ===================================================================

-- Allow service role full access to all tables
-- This is necessary for backend server to operate without restrictions

CREATE POLICY "Service role has full access to persons" ON persons
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to events" ON events
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to broadcasts" ON broadcasts
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to broadcast_segments" ON broadcast_segments
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to categories" ON categories
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to viewer_engagement" ON viewer_engagement
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to viewer_snapshots" ON viewer_snapshots
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to user_sessions" ON user_sessions
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to platform_categories" ON platform_categories
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to unified_games" ON unified_games
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to category_game_mappings" ON category_game_mappings
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to category_stats" ON category_stats
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to viewer_stats" ON viewer_stats
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to settings" ON settings
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to users" ON users
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to user_settings" ON user_settings
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to roulette_wheels" ON roulette_wheels
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to signature_sounds" ON signature_sounds
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to emoji_settings" ON emoji_settings
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to voting_polls" ON voting_polls
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to poll_votes" ON poll_votes
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to ending_credits" ON ending_credits
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to chat_bots" ON chat_bots
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to bot_commands" ON bot_commands
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to bot_auto_messages" ON bot_auto_messages
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to ad_slots" ON ad_slots
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to ad_campaigns" ON ad_campaigns
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to ad_impressions" ON ad_impressions
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to ad_settlements" ON ad_settlements
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to creators" ON creators
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to designs" ON designs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to design_reviews" ON design_reviews
    FOR ALL USING (auth.role() = 'service_role');

-- ===================================================================
-- MIGRATION TRACKING TABLE
-- ===================================================================

CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO schema_migrations (version) VALUES ('001_initial_schema')
ON CONFLICT (version) DO NOTHING;
