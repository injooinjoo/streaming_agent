#!/usr/bin/env node

/**
 * Migration Script: Streaming Data DB Separation
 *
 * Copies streaming data from weflab_clone.db to streaming_data.db
 *
 * Tables to migrate:
 * - events
 * - viewer_stats
 * - platform_categories
 * - category_stats
 * - unified_games
 * - category_game_mappings
 *
 * Usage:
 *   node server/scripts/migrate-streaming-data.js
 *
 * Options:
 *   --dry-run    Show what would be migrated without actually doing it
 *   --force      Overwrite existing data in streaming_data.db
 */

const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");

// Database paths
const SOURCE_DB_PATH = path.resolve(__dirname, "../weflab_clone.db");
const TARGET_DB_PATH = path.resolve(__dirname, "../streaming_data.db");

// Tables to migrate
const TABLES_TO_MIGRATE = [
  "events",
  "viewer_stats",
  "platform_categories",
  "category_stats",
  "unified_games",
  "category_game_mappings",
];

/**
 * Promisified db.all
 */
const dbAll = (db, sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
};

/**
 * Promisified db.run
 */
const dbRun = (db, sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

/**
 * Promisified db.get
 */
const dbGet = (db, sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

/**
 * Check if a table exists in the database
 */
const tableExists = async (db, tableName) => {
  const row = await dbGet(
    db,
    `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
    [tableName]
  );
  return !!row;
};

/**
 * Get row count for a table
 */
const getRowCount = async (db, tableName) => {
  const exists = await tableExists(db, tableName);
  if (!exists) return 0;

  const row = await dbGet(db, `SELECT COUNT(*) as count FROM ${tableName}`);
  return row?.count || 0;
};

/**
 * Get table columns
 */
const getTableColumns = async (db, tableName) => {
  const rows = await dbAll(db, `PRAGMA table_info(${tableName})`);
  return rows.map((row) => row.name);
};

/**
 * Migrate a single table
 */
const migrateTable = async (sourceDb, targetDb, tableName) => {
  console.log(`\n  Migrating table: ${tableName}`);

  // Check if source table exists
  const sourceExists = await tableExists(sourceDb, tableName);
  if (!sourceExists) {
    console.log(`    [SKIP] Source table does not exist`);
    return { migrated: 0, skipped: true };
  }

  // Get source row count
  const sourceCount = await getRowCount(sourceDb, tableName);
  console.log(`    Source rows: ${sourceCount}`);

  if (sourceCount === 0) {
    console.log(`    [SKIP] No data to migrate`);
    return { migrated: 0, skipped: true };
  }

  // Check if target table exists
  const targetExists = await tableExists(targetDb, tableName);
  if (!targetExists) {
    console.log(`    [ERROR] Target table does not exist. Run server first to create tables.`);
    return { migrated: 0, error: "Target table missing" };
  }

  // Check target row count
  const targetCount = await getRowCount(targetDb, tableName);
  console.log(`    Target rows: ${targetCount}`);

  if (targetCount > 0 && !force) {
    console.log(`    [SKIP] Target table has data. Use --force to overwrite.`);
    return { migrated: 0, skipped: true };
  }

  if (dryRun) {
    console.log(`    [DRY-RUN] Would migrate ${sourceCount} rows`);
    return { migrated: 0, dryRun: true };
  }

  // Clear target table if force is set
  if (targetCount > 0 && force) {
    console.log(`    Clearing target table...`);
    await dbRun(targetDb, `DELETE FROM ${tableName}`);
  }

  // Get column names
  const columns = await getTableColumns(sourceDb, tableName);
  console.log(`    Columns: ${columns.join(", ")}`);

  // Fetch all data from source
  const rows = await dbAll(sourceDb, `SELECT * FROM ${tableName}`);

  // Insert into target in batches
  const batchSize = 1000;
  let migrated = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);

    await new Promise((resolve, reject) => {
      targetDb.serialize(() => {
        targetDb.run("BEGIN TRANSACTION");

        const placeholders = columns.map(() => "?").join(", ");
        const insertSql = `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders})`;

        for (const row of batch) {
          const values = columns.map((col) => row[col]);
          targetDb.run(insertSql, values);
        }

        targetDb.run("COMMIT", (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });

    migrated += batch.length;
    process.stdout.write(`\r    Migrated: ${migrated}/${rows.length} rows`);
  }

  console.log(`\n    [DONE] Migrated ${migrated} rows`);
  return { migrated };
};

/**
 * Main migration function
 */
const main = async () => {
  console.log("=".repeat(60));
  console.log("  Streaming Data Migration Script");
  console.log("=".repeat(60));
  console.log(`\nSource: ${SOURCE_DB_PATH}`);
  console.log(`Target: ${TARGET_DB_PATH}`);
  console.log(`Dry Run: ${dryRun}`);
  console.log(`Force: ${force}`);
  console.log("");

  // Check if source database exists
  const fs = require("fs");
  if (!fs.existsSync(SOURCE_DB_PATH)) {
    console.error(`[ERROR] Source database not found: ${SOURCE_DB_PATH}`);
    process.exit(1);
  }

  // Open source database
  const sourceDb = new sqlite3.Database(SOURCE_DB_PATH, sqlite3.OPEN_READONLY);
  console.log("Opened source database (read-only)");

  // Open/create target database
  const targetDb = new sqlite3.Database(TARGET_DB_PATH);
  console.log("Opened target database");

  // Initialize target database tables if they don't exist
  const { initializeStreamingDatabase } = require("../db/streaming-init");
  console.log("\nInitializing target database tables...");
  await initializeStreamingDatabase(targetDb);

  // Migrate each table
  console.log("\n" + "-".repeat(60));
  console.log("Starting migration...");
  console.log("-".repeat(60));

  const results = {};
  for (const table of TABLES_TO_MIGRATE) {
    try {
      results[table] = await migrateTable(sourceDb, targetDb, table);
    } catch (error) {
      console.error(`    [ERROR] ${error.message}`);
      results[table] = { error: error.message };
    }
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("  Migration Summary");
  console.log("=".repeat(60));

  let totalMigrated = 0;
  for (const [table, result] of Object.entries(results)) {
    const status = result.error
      ? `ERROR: ${result.error}`
      : result.skipped
      ? "SKIPPED"
      : result.dryRun
      ? "DRY-RUN"
      : `${result.migrated} rows`;
    console.log(`  ${table.padEnd(25)} ${status}`);
    totalMigrated += result.migrated || 0;
  }

  console.log("-".repeat(60));
  console.log(`  Total migrated: ${totalMigrated} rows`);
  console.log("");

  // Close databases
  sourceDb.close();
  targetDb.close();

  console.log("Migration complete!");

  if (!dryRun && totalMigrated > 0) {
    console.log("\n[NOTE] You can now optionally remove the migrated tables from weflab_clone.db");
    console.log("       to save space. Use the following SQL commands:");
    console.log("");
    for (const table of TABLES_TO_MIGRATE) {
      console.log(`       DROP TABLE IF EXISTS ${table};`);
    }
  }
};

// Run migration
main().catch((error) => {
  console.error(`\n[FATAL] ${error.message}`);
  process.exit(1);
});
