/**
 * Initial Schema Migration
 * Creates all tables for the Streaming Agent application
 */

exports.up = async function (knex) {
  // ===== Core Tables =====

  await knex.schema.createTable("events", (table) => {
    table.increments("id").primary();
    table.string("type");
    table.string("sender");
    table.integer("amount");
    table.text("message");
    table.string("platform");
    table.timestamp("timestamp").defaultTo(knex.fn.now());

    table.index("timestamp");
    table.index("platform");
  });

  await knex.schema.createTable("settings", (table) => {
    table.string("key").primary();
    table.text("value");
  });

  // ===== User Tables =====

  await knex.schema.createTable("users", (table) => {
    table.increments("id").primary();
    table.string("email").unique();
    table.string("password_hash");
    table.string("display_name").notNullable();
    table.text("avatar_url");
    table.enum("role", ["user", "creator", "advertiser", "admin"]).defaultTo("user");
    table.string("oauth_provider");
    table.string("oauth_id");
    table.string("overlay_hash").unique();
    table.timestamp("created_at").defaultTo(knex.fn.now());

    table.index("email");
    table.index("oauth_provider");
  });

  await knex.schema.createTable("user_settings", (table) => {
    table.increments("id").primary();
    table.integer("user_id").references("id").inTable("users").onDelete("CASCADE");
    table.string("setting_key").notNullable();
    table.text("setting_value").notNullable();
    table.timestamp("updated_at").defaultTo(knex.fn.now());

    table.unique(["user_id", "setting_key"]);
    table.index(["user_id", "setting_key"]);
  });

  // ===== Overlay Feature Tables =====

  await knex.schema.createTable("roulette_wheels", (table) => {
    table.increments("id").primary();
    table.integer("user_id").references("id").inTable("users").onDelete("CASCADE");
    table.string("name").notNullable().defaultTo("기본 룰렛");
    table.integer("trigger_amount").notNullable().defaultTo(1000);
    table.enum("trigger_type", ["exact", "minimum", "range"]).defaultTo("minimum");
    table.integer("trigger_max");
    table.text("segments").notNullable();
    table.integer("spin_duration").defaultTo(5000);
    table.boolean("is_active").defaultTo(true);
    table.timestamp("created_at").defaultTo(knex.fn.now());

    table.index("user_id");
  });

  await knex.schema.createTable("signature_sounds", (table) => {
    table.increments("id").primary();
    table.integer("user_id").references("id").inTable("users").onDelete("CASCADE");
    table.string("name").notNullable();
    table.enum("trigger_type", ["amount", "user", "keyword"]).defaultTo("amount");
    table.string("trigger_value").notNullable();
    table.text("sound_url").notNullable();
    table.text("image_url");
    table.string("animation").defaultTo("bounceIn");
    table.integer("priority").defaultTo(0);
    table.boolean("is_active").defaultTo(true);
    table.timestamp("created_at").defaultTo(knex.fn.now());

    table.index("user_id");
  });

  await knex.schema.createTable("emoji_settings", (table) => {
    table.increments("id").primary();
    table.integer("user_id").unique().references("id").inTable("users").onDelete("CASCADE");
    table.text("emoji_set").notNullable().defaultTo('["❤️","🔥","👏","😂","🎉"]');
    table.integer("display_duration").defaultTo(3000);
    table.integer("max_concurrent").defaultTo(10);
    table.enum("animation_style", ["float", "explode", "rain", "bounce"]).defaultTo("float");
    table.text("trigger_keywords");
    table.boolean("is_active").defaultTo(true);
  });

  await knex.schema.createTable("voting_polls", (table) => {
    table.increments("id").primary();
    table.integer("user_id").references("id").inTable("users").onDelete("CASCADE");
    table.string("title").notNullable();
    table.text("options").notNullable();
    table.enum("status", ["draft", "active", "closed"]).defaultTo("draft");
    table.integer("duration");
    table.timestamp("started_at");
    table.timestamp("created_at").defaultTo(knex.fn.now());

    table.index("user_id");
    table.index("status");
  });

  await knex.schema.createTable("poll_votes", (table) => {
    table.increments("id").primary();
    table.integer("poll_id").references("id").inTable("voting_polls").onDelete("CASCADE");
    table.integer("option_id").notNullable();
    table.string("voter_id").notNullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());

    table.index("poll_id");
  });

  await knex.schema.createTable("ending_credits", (table) => {
    table.increments("id").primary();
    table.integer("user_id").references("id").inTable("users").onDelete("CASCADE");
    table.string("template_name").defaultTo("기본 크레딧");
    table.string("title").defaultTo("오늘의 방송");
    table.text("sections").notNullable().defaultTo("[]");
    table.text("background_url");
    table.text("music_url");
    table.integer("scroll_speed").defaultTo(3);
    table.boolean("auto_populate").defaultTo(true);
    table.integer("min_donation").defaultTo(1000);
    table.boolean("is_active").defaultTo(true);

    table.index("user_id");
  });

  // ===== Chat Bot Tables =====

  await knex.schema.createTable("chat_bots", (table) => {
    table.increments("id").primary();
    table.integer("user_id").unique().references("id").inTable("users").onDelete("CASCADE");
    table.string("name").defaultTo("StreamBot");
    table.boolean("is_active").defaultTo(true);
  });

  await knex.schema.createTable("bot_commands", (table) => {
    table.increments("id").primary();
    table.integer("bot_id").references("id").inTable("chat_bots").onDelete("CASCADE");
    table.string("command").notNullable();
    table.text("response").notNullable();
    table.integer("cooldown").defaultTo(5);
    table.boolean("is_active").defaultTo(true);

    table.index("bot_id");
  });

  await knex.schema.createTable("bot_auto_messages", (table) => {
    table.increments("id").primary();
    table.integer("bot_id").references("id").inTable("chat_bots").onDelete("CASCADE");
    table.enum("trigger_type", ["interval", "enter", "follow", "donation"]).notNullable();
    table.string("trigger_value");
    table.text("message").notNullable();
    table.boolean("is_active").defaultTo(true);

    table.index("bot_id");
  });

  // ===== Ad System Tables =====

  await knex.schema.createTable("ad_slots", (table) => {
    table.increments("id").primary();
    table.integer("user_id").references("id").inTable("users");
    table.string("name").notNullable();
    table.enum("type", ["banner", "popup", "corner"]);
    table.float("position_x").notNullable().defaultTo(0);
    table.float("position_y").notNullable().defaultTo(0);
    table.integer("width").notNullable().defaultTo(300);
    table.integer("height").notNullable().defaultTo(100);
    table.boolean("enabled").defaultTo(true);
    table.timestamp("created_at").defaultTo(knex.fn.now());

    table.index("user_id");
  });

  await knex.schema.createTable("ad_campaigns", (table) => {
    table.increments("id").primary();
    table.integer("advertiser_id").references("id").inTable("users");
    table.string("name").notNullable();
    table.enum("content_type", ["image", "video", "html"]);
    table.text("content_url").notNullable();
    table.text("click_url");
    table.integer("budget_daily").defaultTo(0);
    table.integer("budget_total").defaultTo(0);
    table.integer("budget_spent").defaultTo(0);
    table.integer("cpm").defaultTo(0);
    table.integer("cpc").defaultTo(0);
    table.date("start_date");
    table.date("end_date");
    table.text("target_streamers");
    table.text("target_categories");
    table.enum("status", ["pending", "active", "paused", "completed", "rejected"]).defaultTo("pending");
    table.timestamp("created_at").defaultTo(knex.fn.now());

    table.index("advertiser_id");
    table.index("status");
  });

  await knex.schema.createTable("ad_impressions", (table) => {
    table.increments("id").primary();
    table.integer("campaign_id").references("id").inTable("ad_campaigns");
    table.integer("slot_id").references("id").inTable("ad_slots");
    table.integer("streamer_id").references("id").inTable("users");
    table.enum("event_type", ["impression", "click"]);
    table.float("revenue").defaultTo(0);
    table.timestamp("timestamp").defaultTo(knex.fn.now());

    table.index("campaign_id");
    table.index("slot_id");
    table.index("timestamp");
  });

  await knex.schema.createTable("ad_settlements", (table) => {
    table.increments("id").primary();
    table.integer("streamer_id").references("id").inTable("users");
    table.string("period").notNullable();
    table.integer("total_impressions").defaultTo(0);
    table.integer("total_clicks").defaultTo(0);
    table.float("total_revenue").defaultTo(0);
    table.enum("status", ["pending", "confirmed", "paid"]).defaultTo("pending");
    table.date("payment_date");
    table.timestamp("created_at").defaultTo(knex.fn.now());

    table.index("streamer_id");
    table.index("period");
  });

  // ===== Marketplace Tables =====

  await knex.schema.createTable("creators", (table) => {
    table.increments("id").primary();
    table.integer("user_id").unique().references("id").inTable("users");
    table.string("display_name").notNullable();
    table.text("avatar_url");
    table.text("bio");
    table.integer("total_downloads").defaultTo(0);
    table.float("average_rating").defaultTo(0);
    table.boolean("verified").defaultTo(false);
    table.timestamp("created_at").defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("designs", (table) => {
    table.increments("id").primary();
    table.integer("creator_id").references("id").inTable("creators");
    table.string("name").notNullable();
    table.text("description");
    table.enum("category", ["chat", "alert", "goal", "ticker", "subtitle", "package"]);
    table.text("tags");
    table.text("thumbnail_url");
    table.text("design_data").notNullable();
    table.integer("download_count").defaultTo(0);
    table.float("average_rating").defaultTo(0);
    table.enum("status", ["pending", "approved", "rejected", "archived"]).defaultTo("pending");
    table.timestamp("created_at").defaultTo(knex.fn.now());

    table.index("creator_id");
    table.index("category");
    table.index("status");
  });

  await knex.schema.createTable("design_reviews", (table) => {
    table.increments("id").primary();
    table.integer("design_id").references("id").inTable("designs");
    table.integer("user_id").references("id").inTable("users");
    table.integer("rating").checkBetween([1, 5]);
    table.text("review_text");
    table.timestamp("created_at").defaultTo(knex.fn.now());

    table.unique(["design_id", "user_id"]);
    table.index("design_id");
  });

  // ===== Category/Game Catalog Tables =====

  await knex.schema.createTable("platform_categories", (table) => {
    table.increments("id").primary();
    table.enum("platform", ["soop", "chzzk", "twitch", "youtube"]).notNullable();
    table.string("platform_category_id").notNullable();
    table.string("platform_category_name").notNullable();
    table.string("category_type");
    table.text("thumbnail_url");
    table.integer("viewer_count").defaultTo(0);
    table.integer("streamer_count").defaultTo(0);
    table.boolean("is_active").defaultTo(true);
    table.timestamp("first_seen_at").defaultTo(knex.fn.now());
    table.timestamp("last_seen_at").defaultTo(knex.fn.now());

    table.unique(["platform", "platform_category_id"]);
    table.index("platform");
    table.index("is_active");
  });

  await knex.schema.createTable("unified_games", (table) => {
    table.increments("id").primary();
    table.string("name").notNullable();
    table.string("name_kr");
    table.string("genre");
    table.string("genre_kr");
    table.string("developer");
    table.string("release_date");
    table.text("description");
    table.text("image_url");
    table.boolean("is_verified").defaultTo(false);
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());

    table.index("name");
  });

  await knex.schema.createTable("category_game_mappings", (table) => {
    table.increments("id").primary();
    table.integer("unified_game_id").references("id").inTable("unified_games").onDelete("CASCADE");
    table.string("platform").notNullable();
    table.string("platform_category_id").notNullable();
    table.float("confidence").defaultTo(1.0);
    table.boolean("is_manual").defaultTo(false);
    table.timestamp("created_at").defaultTo(knex.fn.now());

    table.unique(["platform", "platform_category_id"]);
    table.index("unified_game_id");
  });

  await knex.schema.createTable("category_stats", (table) => {
    table.increments("id").primary();
    table.string("platform").notNullable();
    table.string("platform_category_id").notNullable();
    table.timestamp("recorded_at").defaultTo(knex.fn.now());
    table.integer("viewer_count").defaultTo(0);
    table.integer("streamer_count").defaultTo(0);

    table.index("recorded_at");
    table.index(["platform", "platform_category_id"]);
  });

  // ===== Token Management Tables (for JWT refresh tokens) =====

  await knex.schema.createTable("refresh_tokens", (table) => {
    table.increments("id").primary();
    table.integer("user_id").references("id").inTable("users").onDelete("CASCADE");
    table.string("token_hash").notNullable().unique();
    table.timestamp("expires_at").notNullable();
    table.boolean("revoked").defaultTo(false);
    table.timestamp("created_at").defaultTo(knex.fn.now());

    table.index("user_id");
    table.index("token_hash");
    table.index("expires_at");
  });

  await knex.schema.createTable("token_blacklist", (table) => {
    table.increments("id").primary();
    table.string("token_hash").notNullable().unique();
    table.timestamp("expires_at").notNullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());

    table.index("token_hash");
    table.index("expires_at");
  });
};

exports.down = async function (knex) {
  // Drop tables in reverse order of dependencies
  await knex.schema.dropTableIfExists("token_blacklist");
  await knex.schema.dropTableIfExists("refresh_tokens");
  await knex.schema.dropTableIfExists("category_stats");
  await knex.schema.dropTableIfExists("category_game_mappings");
  await knex.schema.dropTableIfExists("unified_games");
  await knex.schema.dropTableIfExists("platform_categories");
  await knex.schema.dropTableIfExists("design_reviews");
  await knex.schema.dropTableIfExists("designs");
  await knex.schema.dropTableIfExists("creators");
  await knex.schema.dropTableIfExists("ad_settlements");
  await knex.schema.dropTableIfExists("ad_impressions");
  await knex.schema.dropTableIfExists("ad_campaigns");
  await knex.schema.dropTableIfExists("ad_slots");
  await knex.schema.dropTableIfExists("bot_auto_messages");
  await knex.schema.dropTableIfExists("bot_commands");
  await knex.schema.dropTableIfExists("chat_bots");
  await knex.schema.dropTableIfExists("ending_credits");
  await knex.schema.dropTableIfExists("poll_votes");
  await knex.schema.dropTableIfExists("voting_polls");
  await knex.schema.dropTableIfExists("emoji_settings");
  await knex.schema.dropTableIfExists("signature_sounds");
  await knex.schema.dropTableIfExists("roulette_wheels");
  await knex.schema.dropTableIfExists("user_settings");
  await knex.schema.dropTableIfExists("users");
  await knex.schema.dropTableIfExists("settings");
  await knex.schema.dropTableIfExists("events");
};
