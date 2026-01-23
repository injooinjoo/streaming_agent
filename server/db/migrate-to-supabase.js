/**
 * SQLite → Supabase (PostgreSQL) Data Migration Script
 *
 * Usage:
 *   node server/db/migrate-to-supabase.js [options]
 *
 * Options:
 *   --dry-run        Preview migration without changes
 *   --table <name>   Migrate specific table only
 *   --batch <size>   Batch size (default: 500)
 *   --verbose        Show detailed progress
 *   --skip-indexes   Skip index verification
 *
 * Environment:
 *   DATABASE_URL     PostgreSQL connection string (required)
 *   SQLITE_PATH      SQLite database path (default: server/unified.db)
 *
 * Example:
 *   DATABASE_URL=postgresql://... node server/db/migrate-to-supabase.js --dry-run
 */

const sqlite3 = require("sqlite3").verbose();
const { Pool } = require("pg");
const path = require("path");

// Configuration
const config = {
  sqlitePath: process.env.SQLITE_PATH || path.resolve(__dirname, "../unified.db"),
  postgresUrl: process.env.DATABASE_URL,
  batchSize: parseInt(process.argv.find((a, i) => process.argv[i - 1] === "--batch") || "500", 10),
  dryRun: process.argv.includes("--dry-run"),
  verbose: process.argv.includes("--verbose"),
  specificTable: process.argv.find((a, i) => process.argv[i - 1] === "--table"),
  skipIndexes: process.argv.includes("--skip-indexes"),
};

// Migration statistics
const stats = {
  tables: {},
  totalMigrated: 0,
  totalSkipped: 0,
  totalErrors: 0,
  startTime: Date.now(),
};

// Tables in migration order (respecting foreign key dependencies)
const MIGRATION_ORDER = [
  // Core tables (no dependencies)
  "settings",
  "users",
  "persons",
  "unified_games",
  "platform_categories",
  "categories",

  // Tables with user dependencies
  "user_settings",
  "roulette_wheels",
  "signature_sounds",
  "emoji_settings",
  "voting_polls",
  "ending_credits",
  "chat_bots",
  "ad_slots",
  "ad_campaigns",
  "creators",

  // Tables with person dependencies
  "broadcasts",

  // Tables with broadcast dependencies
  "broadcast_segments",
  "events",
  "viewer_snapshots",
  "viewer_engagement",
  "user_sessions",
  "viewer_stats",

  // Remaining tables
  "poll_votes",
  "bot_commands",
  "bot_auto_messages",
  "ad_impressions",
  "ad_settlements",
  "designs",
  "design_reviews",
  "category_game_mappings",
  "category_stats",
];

// Column transformations for SQLite → PostgreSQL
const COLUMN_TRANSFORMS = {
  // Boolean columns (SQLite INTEGER 0/1 → PostgreSQL BOOLEAN)
  booleanColumns: {
    persons: [],
    broadcasts: ["is_live"],
    platform_categories: ["is_active"],
    unified_games: ["is_verified"],
    users: [],
    roulette_wheels: ["is_active"],
    signature_sounds: ["is_active"],
    emoji_settings: ["is_active"],
    chat_bots: ["is_active"],
    bot_commands: ["is_active"],
    bot_auto_messages: ["is_active"],
    ad_slots: ["enabled"],
    ending_credits: ["auto_populate", "is_active"],
    creators: ["verified"],
    category_game_mappings: ["is_manual"],
  },

  // Columns that need special handling
  jsonColumns: {
    roulette_wheels: ["segments"],
    emoji_settings: ["emoji_set", "trigger_keywords"],
    voting_polls: ["options"],
    ending_credits: ["sections"],
    ad_campaigns: ["target_streamers", "target_categories"],
    designs: ["design_data", "tags"],
  },
};

/**
 * Log helper
 */
const log = (message, level = "info") => {
  const prefix = {
    info: "ℹ️ ",
    success: "✅",
    warning: "⚠️ ",
    error: "❌",
    verbose: "  ",
  };
  if (level === "verbose" && !config.verbose) return;
  console.log(`${prefix[level] || ""} ${message}`);
};

/**
 * Open SQLite database
 */
const openSqlite = () => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(config.sqlitePath, sqlite3.OPEN_READONLY, (err) => {
      if (err) reject(new Error(`SQLite open failed: ${err.message}`));
      else resolve(db);
    });
  });
};

/**
 * Close SQLite database
 */
const closeSqlite = (db) => {
  return new Promise((resolve) => {
    db.close(() => resolve());
  });
};

/**
 * Get all rows from SQLite
 */
const sqliteAll = (db, sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
};

/**
 * Get single row from SQLite
 */
const sqliteGet = (db, sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

/**
 * Check if table exists in SQLite
 */
const tableExistsInSqlite = async (db, tableName) => {
  const result = await sqliteGet(
    db,
    `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
    [tableName]
  );
  return !!result;
};

/**
 * Get column info for a table
 */
const getTableColumns = async (db, tableName) => {
  const columns = await sqliteAll(db, `PRAGMA table_info(${tableName})`);
  return columns.map((c) => c.name);
};

/**
 * Transform row for PostgreSQL compatibility
 */
const transformRow = (tableName, row, columns) => {
  const transformed = { ...row };

  // Boolean transformations
  const boolCols = COLUMN_TRANSFORMS.booleanColumns[tableName] || [];
  for (const col of boolCols) {
    if (col in transformed) {
      transformed[col] = transformed[col] === 1 || transformed[col] === true;
    }
  }

  // JSON validation (ensure valid JSON strings)
  const jsonCols = COLUMN_TRANSFORMS.jsonColumns[tableName] || [];
  for (const col of jsonCols) {
    if (col in transformed && transformed[col]) {
      try {
        // Validate it's valid JSON
        JSON.parse(transformed[col]);
      } catch {
        // If not valid JSON, wrap as string
        transformed[col] = JSON.stringify(transformed[col]);
      }
    }
  }

  return transformed;
};

/**
 * Build PostgreSQL INSERT statement
 */
const buildInsertStatement = (tableName, columns) => {
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
  const quotedColumns = columns.map((c) => `"${c}"`).join(", ");

  // Use ON CONFLICT for tables with unique constraints
  const conflictAction = getConflictAction(tableName);

  return `INSERT INTO "${tableName}" (${quotedColumns}) VALUES (${placeholders})${conflictAction}`;
};

/**
 * Get ON CONFLICT clause for table
 */
const getConflictAction = (tableName) => {
  const uniqueKeyMap = {
    settings: ' ON CONFLICT ("key") DO NOTHING',
    persons: ' ON CONFLICT ("platform", "platform_user_id") DO NOTHING',
    users: ' ON CONFLICT ("email") DO NOTHING',
    broadcasts: ' ON CONFLICT ("platform", "channel_id", "broadcast_id") DO NOTHING',
    categories: ' ON CONFLICT ("platform", "category_id") DO NOTHING',
    platform_categories: ' ON CONFLICT ("platform", "platform_category_id") DO NOTHING',
    user_settings: ' ON CONFLICT ("user_id", "setting_key") DO NOTHING',
    viewer_engagement: ' ON CONFLICT ("person_id", "channel_id", "platform", "category_id") DO NOTHING',
    category_game_mappings: ' ON CONFLICT ("platform", "platform_category_id") DO NOTHING',
    design_reviews: ' ON CONFLICT ("design_id", "user_id") DO NOTHING',
    emoji_settings: ' ON CONFLICT ("user_id") DO NOTHING',
    chat_bots: ' ON CONFLICT ("user_id") DO NOTHING',
    creators: ' ON CONFLICT ("user_id") DO NOTHING',
  };

  return uniqueKeyMap[tableName] || "";
};

/**
 * Migrate a single table
 */
const migrateTable = async (sqliteDb, pgPool, tableName) => {
  stats.tables[tableName] = { migrated: 0, skipped: 0, errors: 0 };

  // Check if table exists in SQLite
  const exists = await tableExistsInSqlite(sqliteDb, tableName);
  if (!exists) {
    log(`Table ${tableName} not found in SQLite, skipping`, "warning");
    return;
  }

  // Get row count
  const countResult = await sqliteGet(sqliteDb, `SELECT COUNT(*) as count FROM "${tableName}"`);
  const totalRows = countResult.count;

  if (totalRows === 0) {
    log(`Table ${tableName}: 0 rows`, "verbose");
    return;
  }

  log(`Migrating ${tableName}: ${totalRows} rows...`);

  // Get columns
  const columns = await getTableColumns(sqliteDb, tableName);
  const insertSql = buildInsertStatement(tableName, columns);

  // Process in batches
  let offset = 0;
  const client = await pgPool.connect();

  try {
    while (offset < totalRows) {
      const rows = await sqliteAll(
        sqliteDb,
        `SELECT * FROM "${tableName}" LIMIT ? OFFSET ?`,
        [config.batchSize, offset]
      );

      if (config.dryRun) {
        stats.tables[tableName].migrated += rows.length;
        offset += config.batchSize;
        continue;
      }

      // Begin transaction for batch
      await client.query("BEGIN");

      for (const row of rows) {
        try {
          const transformed = transformRow(tableName, row, columns);
          const values = columns.map((col) => transformed[col]);

          await client.query(insertSql, values);
          stats.tables[tableName].migrated++;
        } catch (err) {
          if (err.code === "23505") {
            // Unique violation - skip
            stats.tables[tableName].skipped++;
          } else {
            stats.tables[tableName].errors++;
            log(`Error in ${tableName} row: ${err.message}`, "verbose");
          }
        }
      }

      await client.query("COMMIT");
      offset += config.batchSize;

      // Progress indicator
      const progress = Math.min(offset, totalRows);
      if (config.verbose) {
        log(`  ${tableName}: ${progress}/${totalRows}`, "verbose");
      }
    }
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  const tableStats = stats.tables[tableName];
  log(
    `  ${tableName}: ${tableStats.migrated} migrated, ${tableStats.skipped} skipped, ${tableStats.errors} errors`,
    tableStats.errors > 0 ? "warning" : "success"
  );

  stats.totalMigrated += tableStats.migrated;
  stats.totalSkipped += tableStats.skipped;
  stats.totalErrors += tableStats.errors;
};

/**
 * Reset sequences for auto-increment columns
 */
const resetSequences = async (pgPool) => {
  log("Resetting PostgreSQL sequences...");

  const sequences = [
    { table: "persons", column: "id" },
    { table: "broadcasts", column: "id" },
    { table: "broadcast_segments", column: "id" },
    { table: "categories", column: "id" },
    { table: "viewer_engagement", column: "id" },
    { table: "viewer_snapshots", column: "id" },
    { table: "user_sessions", column: "id" },
    { table: "platform_categories", column: "id" },
    { table: "unified_games", column: "id" },
    { table: "category_game_mappings", column: "id" },
    { table: "category_stats", column: "id" },
    { table: "viewer_stats", column: "id" },
    { table: "users", column: "id" },
    { table: "user_settings", column: "id" },
    { table: "roulette_wheels", column: "id" },
    { table: "signature_sounds", column: "id" },
    { table: "emoji_settings", column: "id" },
    { table: "voting_polls", column: "id" },
    { table: "poll_votes", column: "id" },
    { table: "ending_credits", column: "id" },
    { table: "chat_bots", column: "id" },
    { table: "bot_commands", column: "id" },
    { table: "bot_auto_messages", column: "id" },
    { table: "ad_slots", column: "id" },
    { table: "ad_campaigns", column: "id" },
    { table: "ad_impressions", column: "id" },
    { table: "ad_settlements", column: "id" },
    { table: "creators", column: "id" },
    { table: "designs", column: "id" },
    { table: "design_reviews", column: "id" },
  ];

  const client = await pgPool.connect();
  try {
    for (const { table, column } of sequences) {
      try {
        // Check if table exists and has data
        const result = await client.query(
          `SELECT MAX("${column}") as max_id FROM "${table}"`
        );
        const maxId = result.rows[0]?.max_id;

        if (maxId) {
          await client.query(
            `SELECT setval(pg_get_serial_sequence('${table}', '${column}'), $1)`,
            [maxId]
          );
          log(`  ${table}: sequence set to ${maxId}`, "verbose");
        }
      } catch (err) {
        // Table might not exist or have a sequence
        log(`  ${table}: skipped (${err.message})`, "verbose");
      }
    }
  } finally {
    client.release();
  }

  log("Sequences reset complete", "success");
};

/**
 * Verify migration results
 */
const verifyMigration = async (sqliteDb, pgPool) => {
  log("Verifying migration...");

  const tablesToVerify = config.specificTable
    ? [config.specificTable]
    : MIGRATION_ORDER;

  const verificationResults = [];

  for (const table of tablesToVerify) {
    const exists = await tableExistsInSqlite(sqliteDb, table);
    if (!exists) continue;

    const sqliteCount = await sqliteGet(sqliteDb, `SELECT COUNT(*) as count FROM "${table}"`);

    const client = await pgPool.connect();
    try {
      const pgResult = await client.query(`SELECT COUNT(*) as count FROM "${table}"`);
      const pgCount = parseInt(pgResult.rows[0].count, 10);

      const match = sqliteCount.count === pgCount;
      verificationResults.push({
        table,
        sqlite: sqliteCount.count,
        postgres: pgCount,
        match,
      });

      if (!match) {
        log(`  ${table}: SQLite=${sqliteCount.count}, PostgreSQL=${pgCount} ❌`, "warning");
      } else {
        log(`  ${table}: ${pgCount} rows ✓`, "verbose");
      }
    } catch (err) {
      verificationResults.push({
        table,
        sqlite: sqliteCount.count,
        postgres: "ERROR",
        match: false,
        error: err.message,
      });
    } finally {
      client.release();
    }
  }

  const allMatch = verificationResults.every((r) => r.match);
  log(
    allMatch ? "Verification passed!" : "Verification found differences",
    allMatch ? "success" : "warning"
  );

  return verificationResults;
};

/**
 * Main migration function
 */
const migrate = async () => {
  console.log("═".repeat(60));
  console.log("SQLite → Supabase (PostgreSQL) Migration");
  console.log("═".repeat(60));

  if (config.dryRun) {
    log("DRY RUN MODE - No changes will be made to PostgreSQL", "warning");
  }

  if (!config.postgresUrl) {
    log("DATABASE_URL environment variable is required", "error");
    log("Example: DATABASE_URL=postgresql://user:pass@host:5432/db node migrate-to-supabase.js");
    process.exit(1);
  }

  log(`SQLite source: ${config.sqlitePath}`);
  log(`Batch size: ${config.batchSize}`);

  let sqliteDb, pgPool;

  try {
    // Connect to SQLite
    log("Connecting to SQLite...");
    sqliteDb = await openSqlite();
    log("SQLite connected", "success");

    // Connect to PostgreSQL
    log("Connecting to PostgreSQL...");
    pgPool = new Pool({ connectionString: config.postgresUrl });
    await pgPool.query("SELECT 1"); // Test connection
    log("PostgreSQL connected", "success");

    // Determine tables to migrate
    const tablesToMigrate = config.specificTable
      ? [config.specificTable]
      : MIGRATION_ORDER;

    console.log("\n--- Starting Migration ---\n");

    // Migrate each table
    for (const table of tablesToMigrate) {
      await migrateTable(sqliteDb, pgPool, table);
    }

    // Reset sequences (only if not dry run)
    if (!config.dryRun && !config.specificTable) {
      console.log("");
      await resetSequences(pgPool);
    }

    // Verify migration
    console.log("");
    const verification = await verifyMigration(sqliteDb, pgPool);

    // Print summary
    const elapsed = ((Date.now() - stats.startTime) / 1000).toFixed(1);

    console.log("\n" + "═".repeat(60));
    console.log("MIGRATION SUMMARY");
    console.log("═".repeat(60));
    console.log(`Total migrated: ${stats.totalMigrated}`);
    console.log(`Total skipped:  ${stats.totalSkipped}`);
    console.log(`Total errors:   ${stats.totalErrors}`);
    console.log(`Time elapsed:   ${elapsed}s`);
    console.log("═".repeat(60));

    if (config.dryRun) {
      log("\nDRY RUN - No changes were made", "warning");
      log("Run without --dry-run to apply changes");
    } else {
      log("\nMigration completed!", "success");
    }
  } catch (err) {
    log(`Migration failed: ${err.message}`, "error");
    console.error(err.stack);
    process.exit(1);
  } finally {
    if (sqliteDb) await closeSqlite(sqliteDb);
    if (pgPool) await pgPool.end();
  }
};

// Run migration
migrate();
