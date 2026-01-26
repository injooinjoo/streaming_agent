-- Supabase PostgreSQL Schema
-- Generated for Streaming Agent
-- Run this in Supabase SQL Editor

-- ===== Core Tables =====

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  platform VARCHAR(50) NOT NULL CHECK (platform IN ('soop', 'chzzk', 'twitch', 'youtube')),

  -- Actor (who performed the action)
  actor_person_id INTEGER REFERENCES persons(id),
  actor_nickname VARCHAR(255),
  actor_role VARCHAR(50) CHECK (actor_role IN ('streamer', 'manager', 'vip', 'fan', 'regular', 'system')),

  -- Target (broadcaster receiving the event)
  target_person_id INTEGER REFERENCES persons(id),
  target_channel_id VARCHAR(255) NOT NULL,

  -- Broadcast context
  broadcast_id INTEGER REFERENCES broadcasts(id),

  -- Event content
  message TEXT,
  amount INTEGER,
  original_amount INTEGER,
  currency VARCHAR(10),
  donation_type VARCHAR(50),

  event_timestamp TIMESTAMPTZ NOT NULL,
  ingested_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_event_timestamp ON events(event_timestamp);
CREATE INDEX IF NOT EXISTS idx_events_platform ON events(platform);
CREATE INDEX IF NOT EXISTS idx_events_target_channel ON events(target_channel_id);
CREATE INDEX IF NOT EXISTS idx_events_target_type ON events(target_channel_id, event_type);

CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(255) PRIMARY KEY,
  value TEXT
);

-- ===== User Tables =====

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  display_name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'creator', 'advertiser', 'admin')),
  oauth_provider VARCHAR(255),
  oauth_id VARCHAR(255),
  overlay_hash VARCHAR(255) UNIQUE,
  channel_id VARCHAR(255),
  platform VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_oauth ON users(oauth_provider);

CREATE TABLE IF NOT EXISTS user_settings (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  setting_key VARCHAR(255) NOT NULL,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, setting_key)
);

CREATE INDEX IF NOT EXISTS idx_user_settings ON user_settings(user_id, setting_key);

-- ===== Overlay Feature Tables =====

CREATE TABLE IF NOT EXISTS roulette_wheels (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL DEFAULT '기본 룰렛',
  trigger_amount INTEGER NOT NULL DEFAULT 1000,
  trigger_type VARCHAR(50) DEFAULT 'minimum' CHECK (trigger_type IN ('exact', 'minimum', 'range')),
  trigger_max INTEGER,
  segments TEXT NOT NULL,
  spin_duration INTEGER DEFAULT 5000,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roulette_user ON roulette_wheels(user_id);

CREATE TABLE IF NOT EXISTS signature_sounds (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  trigger_type VARCHAR(50) DEFAULT 'amount' CHECK (trigger_type IN ('amount', 'user', 'keyword')),
  trigger_value VARCHAR(255) NOT NULL,
  sound_url TEXT NOT NULL,
  image_url TEXT,
  animation VARCHAR(255) DEFAULT 'bounceIn',
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_signature_user ON signature_sounds(user_id);

CREATE TABLE IF NOT EXISTS emoji_settings (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  emoji_set TEXT NOT NULL DEFAULT '["❤️","🔥","👏","😂","🎉"]',
  display_duration INTEGER DEFAULT 3000,
  max_concurrent INTEGER DEFAULT 10,
  animation_style VARCHAR(50) DEFAULT 'float' CHECK (animation_style IN ('float', 'explode', 'rain', 'bounce')),
  trigger_keywords TEXT,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS voting_polls (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  options TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),
  duration INTEGER,
  started_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_polls_user ON voting_polls(user_id);
CREATE INDEX IF NOT EXISTS idx_polls_status ON voting_polls(status);

CREATE TABLE IF NOT EXISTS poll_votes (
  id BIGSERIAL PRIMARY KEY,
  poll_id INTEGER REFERENCES voting_polls(id) ON DELETE CASCADE,
  option_id INTEGER NOT NULL,
  voter_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_poll_votes ON poll_votes(poll_id);

CREATE TABLE IF NOT EXISTS ending_credits (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  template_name VARCHAR(255) DEFAULT '기본 크레딧',
  title VARCHAR(255) DEFAULT '오늘의 방송',
  sections TEXT NOT NULL DEFAULT '[]',
  background_url TEXT,
  music_url TEXT,
  scroll_speed INTEGER DEFAULT 3,
  auto_populate BOOLEAN DEFAULT TRUE,
  min_donation INTEGER DEFAULT 1000,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_credits_user ON ending_credits(user_id);

-- ===== Chat Bot Tables =====

CREATE TABLE IF NOT EXISTS chat_bots (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) DEFAULT 'StreamBot',
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS bot_commands (
  id BIGSERIAL PRIMARY KEY,
  bot_id INTEGER REFERENCES chat_bots(id) ON DELETE CASCADE,
  command VARCHAR(255) NOT NULL,
  response TEXT NOT NULL,
  cooldown INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_bot_commands ON bot_commands(bot_id);

CREATE TABLE IF NOT EXISTS bot_auto_messages (
  id BIGSERIAL PRIMARY KEY,
  bot_id INTEGER REFERENCES chat_bots(id) ON DELETE CASCADE,
  trigger_type VARCHAR(50) NOT NULL CHECK (trigger_type IN ('interval', 'enter', 'follow', 'donation')),
  trigger_value VARCHAR(255),
  message TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_bot_auto ON bot_auto_messages(bot_id);

-- ===== Ad System Tables =====

CREATE TABLE IF NOT EXISTS ad_slots (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) CHECK (type IN ('banner', 'popup', 'corner')),
  position_x REAL NOT NULL DEFAULT 0,
  position_y REAL NOT NULL DEFAULT 0,
  width INTEGER NOT NULL DEFAULT 300,
  height INTEGER NOT NULL DEFAULT 100,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_slots_user ON ad_slots(user_id);

CREATE TABLE IF NOT EXISTS ad_campaigns (
  id BIGSERIAL PRIMARY KEY,
  advertiser_id INTEGER REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  content_type VARCHAR(50) CHECK (content_type IN ('image', 'video', 'html')),
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
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paused', 'completed', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_advertiser ON ad_campaigns(advertiser_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON ad_campaigns(status);

CREATE TABLE IF NOT EXISTS ad_impressions (
  id BIGSERIAL PRIMARY KEY,
  campaign_id INTEGER REFERENCES ad_campaigns(id),
  slot_id INTEGER REFERENCES ad_slots(id),
  streamer_id INTEGER REFERENCES users(id),
  event_type VARCHAR(50) CHECK (event_type IN ('impression', 'click')),
  revenue REAL DEFAULT 0,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_impressions_campaign ON ad_impressions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_impressions_slot ON ad_impressions(slot_id);
CREATE INDEX IF NOT EXISTS idx_impressions_timestamp ON ad_impressions(timestamp);

CREATE TABLE IF NOT EXISTS ad_settlements (
  id BIGSERIAL PRIMARY KEY,
  streamer_id INTEGER REFERENCES users(id),
  period VARCHAR(255) NOT NULL,
  total_impressions INTEGER DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  total_revenue REAL DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'paid')),
  payment_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_settlements_streamer ON ad_settlements(streamer_id);
CREATE INDEX IF NOT EXISTS idx_settlements_period ON ad_settlements(period);

-- ===== Marketplace Tables =====

CREATE TABLE IF NOT EXISTS creators (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id),
  display_name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  total_downloads INTEGER DEFAULT 0,
  average_rating REAL DEFAULT 0,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS designs (
  id BIGSERIAL PRIMARY KEY,
  creator_id INTEGER REFERENCES creators(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) CHECK (category IN ('chat', 'alert', 'goal', 'ticker', 'subtitle', 'package')),
  tags TEXT,
  thumbnail_url TEXT,
  design_data TEXT NOT NULL,
  download_count INTEGER DEFAULT 0,
  average_rating REAL DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_designs_creator ON designs(creator_id);
CREATE INDEX IF NOT EXISTS idx_designs_category ON designs(category);
CREATE INDEX IF NOT EXISTS idx_designs_status ON designs(status);

CREATE TABLE IF NOT EXISTS design_reviews (
  id BIGSERIAL PRIMARY KEY,
  design_id INTEGER REFERENCES designs(id),
  user_id INTEGER REFERENCES users(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(design_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_design ON design_reviews(design_id);

-- ===== Category/Game Catalog Tables =====

CREATE TABLE IF NOT EXISTS platform_categories (
  id BIGSERIAL PRIMARY KEY,
  platform VARCHAR(50) NOT NULL CHECK (platform IN ('soop', 'chzzk', 'twitch', 'youtube')),
  platform_category_id VARCHAR(255) NOT NULL,
  platform_category_name VARCHAR(255) NOT NULL,
  category_type VARCHAR(255),
  thumbnail_url TEXT,
  viewer_count INTEGER DEFAULT 0,
  streamer_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(platform, platform_category_id)
);

CREATE INDEX IF NOT EXISTS idx_platform_categories ON platform_categories(platform);
CREATE INDEX IF NOT EXISTS idx_platform_categories_active ON platform_categories(is_active);

CREATE TABLE IF NOT EXISTS unified_games (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  name_kr VARCHAR(255),
  genre VARCHAR(255),
  genre_kr VARCHAR(255),
  developer VARCHAR(255),
  release_date VARCHAR(255),
  description TEXT,
  image_url TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_unified_games_name ON unified_games(name);

CREATE TABLE IF NOT EXISTS category_game_mappings (
  id BIGSERIAL PRIMARY KEY,
  unified_game_id INTEGER REFERENCES unified_games(id) ON DELETE CASCADE,
  platform VARCHAR(255) NOT NULL,
  platform_category_id VARCHAR(255) NOT NULL,
  platform_category_name VARCHAR(255),
  confidence REAL DEFAULT 1.0,
  is_manual BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(platform, platform_category_id)
);

CREATE INDEX IF NOT EXISTS idx_mappings_game ON category_game_mappings(unified_game_id);

CREATE TABLE IF NOT EXISTS category_stats (
  id BIGSERIAL PRIMARY KEY,
  platform VARCHAR(255) NOT NULL,
  platform_category_id VARCHAR(255) NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  viewer_count INTEGER DEFAULT 0,
  streamer_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_category_stats_time ON category_stats(recorded_at);
CREATE INDEX IF NOT EXISTS idx_category_stats_platform ON category_stats(platform, platform_category_id);

-- ===== Streaming Data Tables =====

CREATE TABLE IF NOT EXISTS persons (
  id BIGSERIAL PRIMARY KEY,
  platform VARCHAR(50) NOT NULL CHECK (platform IN ('soop', 'chzzk', 'twitch', 'youtube')),
  platform_user_id VARCHAR(255) NOT NULL,
  nickname VARCHAR(255),
  profile_image_url TEXT,
  channel_id VARCHAR(255),
  channel_description TEXT,
  follower_count INTEGER DEFAULT 0,
  subscriber_count INTEGER DEFAULT 0,
  total_broadcast_minutes INTEGER DEFAULT 0,
  last_broadcast_at TIMESTAMPTZ,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(platform, platform_user_id)
);

CREATE INDEX IF NOT EXISTS idx_persons_platform ON persons(platform, platform_user_id);
CREATE INDEX IF NOT EXISTS idx_persons_channel ON persons(platform, channel_id);

CREATE TABLE IF NOT EXISTS broadcasts (
  id BIGSERIAL PRIMARY KEY,
  platform VARCHAR(50) NOT NULL CHECK (platform IN ('soop', 'chzzk', 'twitch', 'youtube')),
  channel_id VARCHAR(255) NOT NULL,
  broadcast_id VARCHAR(255) NOT NULL,
  broadcaster_person_id INTEGER REFERENCES persons(id),
  title TEXT,
  thumbnail_url TEXT,
  current_viewer_count INTEGER DEFAULT 0,
  peak_viewer_count INTEGER DEFAULT 0,
  avg_viewer_count INTEGER DEFAULT 0,
  viewer_sum INTEGER DEFAULT 0,
  snapshot_count INTEGER DEFAULT 0,
  is_live BOOLEAN DEFAULT TRUE,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(platform, channel_id, broadcast_id)
);

CREATE INDEX IF NOT EXISTS idx_broadcasts_live ON broadcasts(is_live);
CREATE INDEX IF NOT EXISTS idx_broadcasts_channel ON broadcasts(platform, channel_id);
CREATE INDEX IF NOT EXISTS idx_broadcasts_started ON broadcasts(started_at);

CREATE TABLE IF NOT EXISTS broadcast_segments (
  id BIGSERIAL PRIMARY KEY,
  broadcast_id INTEGER NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  platform VARCHAR(255) NOT NULL,
  channel_id VARCHAR(255) NOT NULL,
  category_id VARCHAR(255),
  category_name VARCHAR(255),
  segment_started_at TIMESTAMPTZ NOT NULL,
  segment_ended_at TIMESTAMPTZ,
  peak_viewer_count INTEGER DEFAULT 0,
  avg_viewer_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_segments_broadcast ON broadcast_segments(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_segments_category ON broadcast_segments(category_id);

CREATE TABLE IF NOT EXISTS categories (
  id BIGSERIAL PRIMARY KEY,
  platform VARCHAR(50) NOT NULL CHECK (platform IN ('soop', 'chzzk', 'twitch', 'youtube')),
  category_id VARCHAR(255) NOT NULL,
  category_name VARCHAR(255) NOT NULL,
  category_type VARCHAR(255),
  thumbnail_url TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(platform, category_id)
);

CREATE INDEX IF NOT EXISTS idx_categories_platform ON categories(platform, category_id);

CREATE TABLE IF NOT EXISTS viewer_engagement (
  id BIGSERIAL PRIMARY KEY,
  person_id INTEGER NOT NULL REFERENCES persons(id),
  platform VARCHAR(255) NOT NULL,
  channel_id VARCHAR(255) NOT NULL,
  broadcaster_person_id INTEGER REFERENCES persons(id),
  category_id VARCHAR(255),
  chat_count INTEGER DEFAULT 0,
  donation_count INTEGER DEFAULT 0,
  total_donation_amount INTEGER DEFAULT 0,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(person_id, channel_id, platform, category_id)
);

CREATE INDEX IF NOT EXISTS idx_engagement_person ON viewer_engagement(person_id);
CREATE INDEX IF NOT EXISTS idx_engagement_channel ON viewer_engagement(channel_id, platform);

CREATE TABLE IF NOT EXISTS viewer_snapshots (
  id BIGSERIAL PRIMARY KEY,
  platform VARCHAR(255) NOT NULL,
  channel_id VARCHAR(255) NOT NULL,
  broadcast_id INTEGER REFERENCES broadcasts(id),
  segment_id INTEGER REFERENCES broadcast_segments(id),
  viewer_count INTEGER NOT NULL,
  chat_rate_per_minute INTEGER,
  snapshot_at TIMESTAMPTZ NOT NULL,
  ingested_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_snapshots_broadcast ON viewer_snapshots(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_time ON viewer_snapshots(snapshot_at);

CREATE TABLE IF NOT EXISTS user_sessions (
  id BIGSERIAL PRIMARY KEY,
  platform VARCHAR(50) NOT NULL CHECK (platform IN ('soop', 'chzzk', 'twitch', 'youtube')),
  channel_id VARCHAR(255) NOT NULL,
  broadcast_id INTEGER REFERENCES broadcasts(id),
  person_id INTEGER REFERENCES persons(id),
  user_nickname VARCHAR(255),
  session_started_at TIMESTAMPTZ NOT NULL,
  session_ended_at TIMESTAMPTZ,
  session_duration_seconds INTEGER,
  category_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_person ON user_sessions(person_id);
CREATE INDEX IF NOT EXISTS idx_sessions_broadcast ON user_sessions(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_sessions_channel ON user_sessions(platform, channel_id);

CREATE TABLE IF NOT EXISTS viewer_stats (
  id BIGSERIAL PRIMARY KEY,
  platform VARCHAR(255) NOT NULL,
  channel_id VARCHAR(255) NOT NULL,
  viewer_count INTEGER DEFAULT 0,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_viewer_stats_channel ON viewer_stats(platform, channel_id);
CREATE INDEX IF NOT EXISTS idx_viewer_stats_time ON viewer_stats(timestamp);

-- ===== Token Management Tables =====

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);

CREATE TABLE IF NOT EXISTS token_blacklist (
  id BIGSERIAL PRIMARY KEY,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_token_blacklist_hash ON token_blacklist(token_hash);
