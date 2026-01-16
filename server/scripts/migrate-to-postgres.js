#!/usr/bin/env node

/**
 * SQLite to PostgreSQL Migration Script
 *
 * Migrates existing data from SQLite to PostgreSQL
 * Run this script when deploying to production for the first time
 *
 * Usage:
 *   node scripts/migrate-to-postgres.js
 *
 * Environment variables:
 *   DATABASE_URL - PostgreSQL connection string (required)
 */

const sqlite3 = require("sqlite3").verbose();
const knex = require("knex");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

// Check for DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.error("Error: DATABASE_URL environment variable is required");
  process.exit(1);
}

// SQLite connection
const sqlitePath = path.resolve(__dirname, "../weflab_clone.db");
const sqliteDb = new sqlite3.Database(sqlitePath);

// PostgreSQL connection
const pgDb = knex({
  client: "pg",
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  },
});

// Tables to migrate in order (respecting foreign key constraints)
const TABLES = [
  "events",
  "settings",
  "users",
  "user_settings",
  "roulette_wheels",
  "signature_sounds",
  "emoji_settings",
  "voting_polls",
  "poll_votes",
  "ending_credits",
  "chat_bots",
  "bot_commands",
  "bot_auto_messages",
  "ad_slots",
  "ad_campaigns",
  "ad_impressions",
  "ad_settlements",
  "creators",
  "designs",
  "design_reviews",
  "platform_categories",
  "unified_games",
  "category_game_mappings",
  "category_stats",
];

/**
 * Get all rows from SQLite table
 */
const getTableData = (tableName) => {
  return new Promise((resolve, reject) => {
    sqliteDb.all(`SELECT * FROM ${tableName}`, [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
};

/**
 * Check if table exists in SQLite
 */
const tableExists = (tableName) => {
  return new Promise((resolve, reject) => {
    sqliteDb.get(
      `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
      [tableName],
      (err, row) => {
        if (err) reject(err);
        else resolve(!!row);
      }
    );
  });
};

/**
 * Transform SQLite data for PostgreSQL
 * Handle type conversions and special cases
 */
const transformRow = (tableName, row) => {
  // Convert SQLite boolean (0/1) to PostgreSQL boolean
  const booleanFields = [
    "is_active",
    "is_verified",
    "is_manual",
    "enabled",
    "verified",
    "auto_populate",
    "revoked",
  ];

  const transformed = { ...row };

  for (const field of booleanFields) {
    if (field in transformed) {
      transformed[field] = transformed[field] === 1;
    }
  }

  // Convert DATETIME strings to proper timestamps
  // SQLite stores as text, PostgreSQL expects proper timestamp format
  const dateFields = [
    "timestamp",
    "created_at",
    "updated_at",
    "started_at",
    "expires_at",
    "first_seen_at",
    "last_seen_at",
    "recorded_at",
  ];

  for (const field of dateFields) {
    if (field in transformed && transformed[field]) {
      // Convert to ISO format if needed
      transformed[field] = new Date(transformed[field]).toISOString();
    }
  }

  return transformed;
};

/**
 * Migrate a single table
 */
const migrateTable = async (tableName) => {
  console.log(`Migrating table: ${tableName}`);

  // Check if table exists in SQLite
  const exists = await tableExists(tableName);
  if (!exists) {
    console.log(`  Skipping ${tableName} - table does not exist in SQLite`);
    return { table: tableName, migrated: 0, skipped: true };
  }

  // Get data from SQLite
  const rows = await getTableData(tableName);

  if (rows.length === 0) {
    console.log(`  Skipping ${tableName} - no data to migrate`);
    return { table: tableName, migrated: 0 };
  }

  // Transform and insert data
  let migrated = 0;
  let errors = 0;

  for (const row of rows) {
    try {
      const transformedRow = transformRow(tableName, row);

      // Delete existing row with same ID if exists (for idempotent migration)
      if (transformedRow.id) {
        await pgDb(tableName).where("id", transformedRow.id).del();
      } else if (tableName === "settings" && transformedRow.key) {
        await pgDb(tableName).where("key", transformedRow.key).del();
      }

      await pgDb(tableName).insert(transformedRow);
      migrated++;
    } catch (error) {
      console.error(`  Error migrating row in ${tableName}:`, error.message);
      errors++;
    }
  }

  console.log(`  Migrated ${migrated}/${rows.length} rows (${errors} errors)`);
  return { table: tableName, migrated, total: rows.length, errors };
};

/**
 * Reset PostgreSQL sequences after data import
 */
const resetSequences = async () => {
  console.log("\nResetting PostgreSQL sequences...");

  const tablesWithSequences = TABLES.filter(
    (t) => t !== "settings" // settings uses 'key' as primary key, not auto-increment
  );

  for (const tableName of tablesWithSequences) {
    try {
      // Get max ID from table
      const result = await pgDb(tableName).max("id as maxId").first();
      const maxId = result?.maxId || 0;

      if (maxId > 0) {
        // Reset sequence to max ID + 1
        await pgDb.raw(`SELECT setval('${tableName}_id_seq', ?, true)`, [maxId]);
        console.log(`  Reset ${tableName}_id_seq to ${maxId}`);
      }
    } catch (error) {
      // Table might not exist or have no id column
      console.log(`  Skipping sequence reset for ${tableName}`);
    }
  }
};

/**
 * Main migration function
 */
const main = async () => {
  console.log("=".repeat(60));
  console.log("SQLite to PostgreSQL Migration");
  console.log("=".repeat(60));
  console.log(`SQLite: ${sqlitePath}`);
  console.log(`PostgreSQL: ${process.env.DATABASE_URL.replace(/:[^@]+@/, ":***@")}`);
  console.log("");

  try {
    // Test PostgreSQL connection
    console.log("Testing PostgreSQL connection...");
    await pgDb.raw("SELECT 1");
    console.log("PostgreSQL connection successful\n");

    // Run migrations first to create tables
    console.log("Running PostgreSQL migrations...");
    await pgDb.migrate.latest();
    console.log("Migrations complete\n");

    // Migrate each table
    console.log("Starting data migration...\n");
    const results = [];

    for (const tableName of TABLES) {
      const result = await migrateTable(tableName);
      results.push(result);
    }

    // Reset sequences
    await resetSequences();

    // Print summary
    console.log("\n" + "=".repeat(60));
    console.log("Migration Summary");
    console.log("=".repeat(60));

    let totalMigrated = 0;
    let totalErrors = 0;

    for (const result of results) {
      if (!result.skipped) {
        console.log(`${result.table}: ${result.migrated}/${result.total || result.migrated} rows`);
        totalMigrated += result.migrated;
        totalErrors += result.errors || 0;
      }
    }

    console.log("-".repeat(60));
    console.log(`Total: ${totalMigrated} rows migrated, ${totalErrors} errors`);
    console.log("=".repeat(60));

    if (totalErrors > 0) {
      console.log("\n⚠️  Migration completed with errors. Please review the output above.");
    } else {
      console.log("\n✅ Migration completed successfully!");
    }
  } catch (error) {
    console.error("\n❌ Migration failed:", error.message);
    process.exit(1);
  } finally {
    // Close connections
    sqliteDb.close();
    await pgDb.destroy();
  }
};

// Run migration
main();
