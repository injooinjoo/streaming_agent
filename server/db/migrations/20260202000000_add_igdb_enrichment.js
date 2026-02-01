/**
 * Migration: Add IGDB enrichment columns and related tables
 *
 * Adds IGDB metadata fields to unified_games and creates
 * game_genres and game_companies tables for multi-value relationships.
 */

exports.up = async function (knex) {
  // 1. Add IGDB columns to unified_games
  await knex.schema.alterTable("unified_games", (table) => {
    table.integer("igdb_id");
    table.string("igdb_slug");
    table.text("igdb_url");
    table.text("summary");
    table.text("cover_url");
    table.string("publisher");
    table.float("igdb_rating");
    table.integer("igdb_rating_count");
    table.integer("igdb_followers");
    table.timestamp("igdb_enriched_at");
    table.float("igdb_match_confidence");
  });

  // 2. Create game_genres table (many-to-many: genres, themes, keywords)
  await knex.schema.createTable("game_genres", (table) => {
    table.increments("id").primary();
    table.integer("unified_game_id").notNullable()
      .references("id").inTable("unified_games").onDelete("CASCADE");
    table.string("genre_type").notNullable(); // 'genre', 'theme', 'keyword'
    table.integer("igdb_id");
    table.string("name").notNullable();
    table.string("name_kr");

    table.unique(["unified_game_id", "genre_type", "name"]);
    table.index("unified_game_id");
    table.index("name");
  });

  // 3. Create game_companies table
  await knex.schema.createTable("game_companies", (table) => {
    table.increments("id").primary();
    table.integer("unified_game_id").notNullable()
      .references("id").inTable("unified_games").onDelete("CASCADE");
    table.integer("igdb_company_id");
    table.string("name").notNullable();
    table.string("role").notNullable(); // 'developer', 'publisher', 'porting', 'supporting'

    table.unique(["unified_game_id", "igdb_company_id", "role"]);
    table.index("unified_game_id");
  });

  // 4. Add indexes for IGDB fields
  await knex.schema.raw(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_unified_games_igdb_id ON unified_games(igdb_id)"
  );
  await knex.schema.raw(
    "CREATE INDEX IF NOT EXISTS idx_unified_games_igdb_enriched ON unified_games(igdb_enriched_at)"
  );
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("game_companies");
  await knex.schema.dropTableIfExists("game_genres");

  await knex.schema.alterTable("unified_games", (table) => {
    table.dropColumn("igdb_match_confidence");
    table.dropColumn("igdb_enriched_at");
    table.dropColumn("igdb_followers");
    table.dropColumn("igdb_rating_count");
    table.dropColumn("igdb_rating");
    table.dropColumn("publisher");
    table.dropColumn("cover_url");
    table.dropColumn("summary");
    table.dropColumn("igdb_url");
    table.dropColumn("igdb_slug");
    table.dropColumn("igdb_id");
  });
};
