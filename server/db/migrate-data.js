/**
 * Data Migration Script
 * Migrates data from split databases (weflab_clone.db + streaming_data.db) to unified.db
 *
 * Usage: node server/db/migrate-data.js [--dry-run] [--skip-viewing-records]
 *
 * Features:
 * - PERSONS data merge
 * - BROADCASTS migration with segment separation
 * - EVENTS integration (including viewing_records conversion)
 * - VIEWER_ENGAGEMENT reconstruction with category_id
 * - Overlay settings copy
 */

const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const { v4: uuidv4 } = require("uuid");

// Database paths
const OVERLAY_DB_PATH = path.resolve(__dirname, "../weflab_clone.db");
const STREAMING_DB_PATH = path.resolve(__dirname, "../streaming_data.db");
const UNIFIED_DB_PATH = path.resolve(__dirname, "../unified.db");

// Migration statistics
const stats = {
  persons: { migrated: 0, skipped: 0, errors: 0 },
  broadcasts: { migrated: 0, skipped: 0, errors: 0 },
  segments: { created: 0, errors: 0 },
  events: { migrated: 0, skipped: 0, errors: 0 },
  viewingRecords: { converted: 0, skipped: 0, errors: 0 },
  viewerEngagement: { migrated: 0, skipped: 0, errors: 0 },
  viewerSnapshots: { migrated: 0, errors: 0 },
  categories: { migrated: 0, errors: 0 },
  settings: { migrated: 0, errors: 0 },
  overlayTables: { migrated: 0, errors: 0 },
};

// Options
const options = {
  dryRun: process.argv.includes("--dry-run"),
  skipViewingRecords: process.argv.includes("--skip-viewing-records"),
  batchSize: 1000,
  verbose: process.argv.includes("--verbose"),
};

/**
 * Open database connection with promise
 */
const openDb = (dbPath) => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
      if (err) reject(err);
      else resolve(db);
    });
  });
};

/**
 * Open database for writing
 */
const openDbWrite = (dbPath) => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) reject(err);
      else resolve(db);
    });
  });
};

/**
 * Close database connection
 */
const closeDb = (db) => {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

/**
 * Run query with promise
 */
const dbRun = (db, sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

/**
 * Get single row
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
 * Get all rows
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
 * Check if table exists
 */
const tableExists = async (db, tableName) => {
  const result = await dbGet(
    db,
    `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
    [tableName]
  );
  return !!result;
};

/**
 * Log with optional verbose mode
 */
const log = (message, isVerbose = false) => {
  if (!isVerbose || options.verbose) {
    console.log(`[MIGRATE] ${message}`);
  }
};

/**
 * Migrate PERSONS table
 */
const migratePersons = async (sourceDb, targetDb) => {
  log("Migrating PERSONS...");

  const persons = await dbAll(sourceDb, `SELECT * FROM persons`);
  log(`Found ${persons.length} persons to migrate`, true);

  for (const person of persons) {
    try {
      // Check if already exists in target
      const existing = await dbGet(
        targetDb,
        `SELECT id FROM persons WHERE platform = ? AND platform_user_id = ?`,
        [person.platform, person.platform_user_id]
      );

      if (existing) {
        stats.persons.skipped++;
        continue;
      }

      if (!options.dryRun) {
        await dbRun(
          targetDb,
          `INSERT INTO persons (
            platform, platform_user_id, nickname, profile_image_url,
            channel_id, channel_description, follower_count, subscriber_count,
            total_broadcast_minutes, last_broadcast_at,
            first_seen_at, last_seen_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            person.platform,
            person.platform_user_id,
            person.nickname,
            person.profile_image_url,
            person.channel_id,
            person.channel_description,
            person.follower_count || 0,
            person.subscriber_count || 0,
            person.total_broadcast_minutes || 0,
            person.last_broadcast_at,
            person.first_seen_at,
            person.last_seen_at,
            person.created_at,
            person.updated_at,
          ]
        );
      }

      stats.persons.migrated++;
    } catch (error) {
      log(`Error migrating person ${person.id}: ${error.message}`, true);
      stats.persons.errors++;
    }
  }

  log(`PERSONS: ${stats.persons.migrated} migrated, ${stats.persons.skipped} skipped, ${stats.persons.errors} errors`);
};

/**
 * Migrate BROADCASTS and create BROADCAST_SEGMENTS
 */
const migrateBroadcasts = async (sourceDb, targetDb) => {
  log("Migrating BROADCASTS and creating SEGMENTS...");

  const broadcasts = await dbAll(sourceDb, `SELECT * FROM broadcasts ORDER BY started_at`);
  log(`Found ${broadcasts.length} broadcasts to migrate`, true);

  // Map old broadcast IDs to new IDs for segment reference
  const broadcastIdMap = new Map();
  // Track seen broadcast sessions for segment creation
  const seenBroadcastSessions = new Map();

  for (const broadcast of broadcasts) {
    try {
      const sessionKey = `${broadcast.platform}:${broadcast.channel_id}:${broadcast.broadcast_id}`;
      const existingSession = seenBroadcastSessions.get(sessionKey);

      if (existingSession) {
        // This is a category change - create a segment instead
        if (!options.dryRun) {
          await dbRun(
            targetDb,
            `INSERT INTO broadcast_segments (
              broadcast_id, platform, channel_id,
              category_id, category_name,
              segment_started_at, segment_ended_at,
              peak_viewer_count, avg_viewer_count
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              existingSession.newId,
              broadcast.platform,
              broadcast.channel_id,
              broadcast.category_id,
              broadcast.category_name,
              broadcast.started_at || broadcast.recorded_at,
              broadcast.ended_at,
              broadcast.peak_viewer_count || 0,
              broadcast.avg_viewer_count || 0,
            ]
          );
        }
        stats.segments.created++;
        broadcastIdMap.set(broadcast.id, existingSession.newId);
        continue;
      }

      // Check if already exists
      const existing = await dbGet(
        targetDb,
        `SELECT id FROM broadcasts WHERE platform = ? AND channel_id = ? AND broadcast_id = ?`,
        [broadcast.platform, broadcast.channel_id, broadcast.broadcast_id]
      );

      if (existing) {
        stats.broadcasts.skipped++;
        seenBroadcastSessions.set(sessionKey, { newId: existing.id });
        broadcastIdMap.set(broadcast.id, existing.id);
        continue;
      }

      if (!options.dryRun) {
        const result = await dbRun(
          targetDb,
          `INSERT INTO broadcasts (
            platform, channel_id, broadcast_id, broadcaster_person_id,
            title, thumbnail_url,
            current_viewer_count, peak_viewer_count, avg_viewer_count,
            viewer_sum, snapshot_count,
            is_live, started_at, ended_at, duration_minutes,
            recorded_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            broadcast.platform,
            broadcast.channel_id,
            broadcast.broadcast_id,
            broadcast.broadcaster_person_id,
            broadcast.title,
            broadcast.thumbnail_url,
            broadcast.current_viewer_count || 0,
            broadcast.peak_viewer_count || 0,
            broadcast.avg_viewer_count || 0,
            broadcast.viewer_sum || 0,
            broadcast.viewer_snapshot_count || 0,
            broadcast.is_live || 0,
            broadcast.started_at,
            broadcast.ended_at,
            broadcast.duration_minutes,
            broadcast.recorded_at,
            broadcast.updated_at,
          ]
        );

        const newId = result.lastID;
        seenBroadcastSessions.set(sessionKey, { newId });
        broadcastIdMap.set(broadcast.id, newId);

        // Create initial segment for this broadcast
        if (broadcast.category_id || broadcast.category_name) {
          await dbRun(
            targetDb,
            `INSERT INTO broadcast_segments (
              broadcast_id, platform, channel_id,
              category_id, category_name,
              segment_started_at, segment_ended_at,
              peak_viewer_count, avg_viewer_count
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              newId,
              broadcast.platform,
              broadcast.channel_id,
              broadcast.category_id,
              broadcast.category_name,
              broadcast.started_at || broadcast.recorded_at,
              broadcast.ended_at,
              broadcast.peak_viewer_count || 0,
              broadcast.avg_viewer_count || 0,
            ]
          );
          stats.segments.created++;
        }
      }

      stats.broadcasts.migrated++;
    } catch (error) {
      log(`Error migrating broadcast ${broadcast.id}: ${error.message}`, true);
      stats.broadcasts.errors++;
    }
  }

  log(`BROADCASTS: ${stats.broadcasts.migrated} migrated, ${stats.broadcasts.skipped} skipped`);
  log(`SEGMENTS: ${stats.segments.created} created`);

  return broadcastIdMap;
};

/**
 * Migrate legacy EVENTS
 */
const migrateEvents = async (sourceDb, targetDb) => {
  log("Migrating EVENTS...");

  const hasEventsTable = await tableExists(sourceDb, "events");
  if (!hasEventsTable) {
    log("No events table found in source", true);
    return;
  }

  // Count total
  const countResult = await dbGet(sourceDb, `SELECT COUNT(*) as count FROM events`);
  const total = countResult.count;
  log(`Found ${total} events to migrate`, true);

  let offset = 0;
  while (offset < total) {
    const events = await dbAll(
      sourceDb,
      `SELECT * FROM events ORDER BY timestamp LIMIT ? OFFSET ?`,
      [options.batchSize, offset]
    );

    for (const event of events) {
      try {
        // Map legacy event type
        let eventType = event.type;
        if (eventType === "message") eventType = "chat";

        if (!options.dryRun) {
          await dbRun(
            targetDb,
            `INSERT OR IGNORE INTO events (
              id, event_type, platform,
              actor_person_id, actor_nickname, actor_role,
              target_person_id, target_channel_id,
              broadcast_id,
              message, amount, original_amount, currency, donation_type,
              event_timestamp, ingested_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              uuidv4(),
              eventType || "chat",
              event.platform || "unknown",
              null, // actor_person_id - to be resolved
              event.sender,
              "fan",
              null, // target_person_id
              event.sender_id || "unknown",
              null, // broadcast_id
              event.message,
              event.amount,
              event.amount,
              event.amount ? "KRW" : null,
              null,
              event.timestamp,
              event.timestamp,
            ]
          );
        }

        stats.events.migrated++;
      } catch (error) {
        stats.events.errors++;
      }
    }

    offset += options.batchSize;
    log(`Events progress: ${Math.min(offset, total)}/${total}`, true);
  }

  log(`EVENTS: ${stats.events.migrated} migrated, ${stats.events.errors} errors`);
};

/**
 * Migrate VIEWER_ENGAGEMENT
 */
const migrateViewerEngagement = async (sourceDb, targetDb) => {
  log("Migrating VIEWER_ENGAGEMENT...");

  const hasTable = await tableExists(sourceDb, "viewer_engagement");
  if (!hasTable) {
    log("No viewer_engagement table found", true);
    return;
  }

  const engagements = await dbAll(sourceDb, `SELECT * FROM viewer_engagement`);
  log(`Found ${engagements.length} engagement records`, true);

  for (const eng of engagements) {
    try {
      const existing = await dbGet(
        targetDb,
        `SELECT id FROM viewer_engagement WHERE person_id = ? AND channel_id = ? AND platform = ? AND category_id IS ?`,
        [eng.viewer_person_id, eng.broadcaster_channel_id, eng.platform, eng.category_id]
      );

      if (existing) {
        stats.viewerEngagement.skipped++;
        continue;
      }

      if (!options.dryRun) {
        await dbRun(
          targetDb,
          `INSERT INTO viewer_engagement (
            person_id, platform, channel_id, broadcaster_person_id,
            category_id,
            chat_count, donation_count, total_donation_amount,
            first_seen_at, last_seen_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            eng.viewer_person_id,
            eng.platform,
            eng.broadcaster_channel_id,
            eng.broadcaster_person_id,
            eng.category_id,
            eng.chat_count || 0,
            eng.donation_count || 0,
            eng.donation_amount || 0,
            eng.first_seen_at,
            eng.last_seen_at,
            eng.updated_at,
          ]
        );
      }

      stats.viewerEngagement.migrated++;
    } catch (error) {
      log(`Error migrating engagement: ${error.message}`, true);
      stats.viewerEngagement.errors++;
    }
  }

  log(`VIEWER_ENGAGEMENT: ${stats.viewerEngagement.migrated} migrated, ${stats.viewerEngagement.skipped} skipped`);
};

/**
 * Migrate VIEWER_SNAPSHOTS
 */
const migrateViewerSnapshots = async (sourceDb, targetDb) => {
  log("Migrating VIEWER_SNAPSHOTS...");

  const hasTable = await tableExists(sourceDb, "viewer_snapshots");
  if (!hasTable) {
    log("No viewer_snapshots table found", true);
    return;
  }

  const countResult = await dbGet(sourceDb, `SELECT COUNT(*) as count FROM viewer_snapshots`);
  const total = countResult.count;
  log(`Found ${total} snapshots to migrate`, true);

  let offset = 0;
  while (offset < total) {
    const snapshots = await dbAll(
      sourceDb,
      `SELECT * FROM viewer_snapshots ORDER BY snapshot_at LIMIT ? OFFSET ?`,
      [options.batchSize, offset]
    );

    for (const snap of snapshots) {
      try {
        if (!options.dryRun) {
          await dbRun(
            targetDb,
            `INSERT INTO viewer_snapshots (
              platform, channel_id, broadcast_id, segment_id,
              viewer_count, chat_rate_per_minute,
              snapshot_at, ingested_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              snap.platform,
              snap.channel_id,
              snap.broadcast_id,
              null, // segment_id - to be resolved later
              snap.viewer_count,
              snap.chat_rate_per_minute,
              snap.snapshot_at,
              snap.ingested_at,
            ]
          );
        }
        stats.viewerSnapshots.migrated++;
      } catch (error) {
        stats.viewerSnapshots.errors++;
      }
    }

    offset += options.batchSize;
    log(`Snapshots progress: ${Math.min(offset, total)}/${total}`, true);
  }

  log(`VIEWER_SNAPSHOTS: ${stats.viewerSnapshots.migrated} migrated`);
};

/**
 * Migrate CATEGORIES from platform_categories
 */
const migrateCategories = async (sourceDb, targetDb) => {
  log("Migrating CATEGORIES...");

  const hasTable = await tableExists(sourceDb, "platform_categories");
  if (!hasTable) {
    log("No platform_categories table found", true);
    return;
  }

  const categories = await dbAll(sourceDb, `SELECT * FROM platform_categories`);
  log(`Found ${categories.length} categories`, true);

  for (const cat of categories) {
    try {
      if (!options.dryRun) {
        await dbRun(
          targetDb,
          `INSERT OR IGNORE INTO categories (
            platform, category_id, category_name, category_type,
            thumbnail_url, recorded_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            cat.platform,
            cat.platform_category_id,
            cat.platform_category_name,
            cat.category_type,
            cat.thumbnail_url,
            cat.first_seen_at,
            cat.last_seen_at,
          ]
        );

        // Also copy to platform_categories for backward compatibility
        await dbRun(
          targetDb,
          `INSERT OR IGNORE INTO platform_categories (
            platform, platform_category_id, platform_category_name, category_type,
            thumbnail_url, viewer_count, streamer_count, is_active,
            first_seen_at, last_seen_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            cat.platform,
            cat.platform_category_id,
            cat.platform_category_name,
            cat.category_type,
            cat.thumbnail_url,
            cat.viewer_count || 0,
            cat.streamer_count || 0,
            cat.is_active || 1,
            cat.first_seen_at,
            cat.last_seen_at,
          ]
        );
      }
      stats.categories.migrated++;
    } catch (error) {
      stats.categories.errors++;
    }
  }

  log(`CATEGORIES: ${stats.categories.migrated} migrated`);
};

/**
 * Migrate overlay settings and related tables
 */
const migrateOverlayTables = async (overlayDb, targetDb) => {
  log("Migrating OVERLAY tables...");

  const tables = [
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
  ];

  for (const tableName of tables) {
    const exists = await tableExists(overlayDb, tableName);
    if (!exists) {
      log(`Table ${tableName} not found, skipping`, true);
      continue;
    }

    try {
      const rows = await dbAll(overlayDb, `SELECT * FROM ${tableName}`);

      if (rows.length === 0) {
        log(`Table ${tableName}: 0 rows`, true);
        continue;
      }

      // Get column names
      const columns = Object.keys(rows[0]);
      const placeholders = columns.map(() => "?").join(", ");

      for (const row of rows) {
        try {
          if (!options.dryRun) {
            const values = columns.map((col) => row[col]);
            await dbRun(
              targetDb,
              `INSERT OR IGNORE INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders})`,
              values
            );
          }
          stats.overlayTables.migrated++;
        } catch (error) {
          stats.overlayTables.errors++;
        }
      }

      log(`Table ${tableName}: ${rows.length} rows`, true);
    } catch (error) {
      log(`Error migrating table ${tableName}: ${error.message}`, true);
      stats.overlayTables.errors++;
    }
  }

  log(`OVERLAY tables: ${stats.overlayTables.migrated} records migrated`);
};

/**
 * Migrate unified_games and category_game_mappings
 */
const migrateGameMappings = async (sourceDb, targetDb) => {
  log("Migrating GAME MAPPINGS...");

  // Unified games
  const hasGames = await tableExists(sourceDb, "unified_games");
  if (hasGames) {
    const games = await dbAll(sourceDb, `SELECT * FROM unified_games`);
    for (const game of games) {
      try {
        if (!options.dryRun) {
          const cols = Object.keys(game);
          const vals = cols.map((c) => game[c]);
          await dbRun(
            targetDb,
            `INSERT OR IGNORE INTO unified_games (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`,
            vals
          );
        }
      } catch (error) {
        // Skip duplicates
      }
    }
    log(`Unified games: ${games.length} records`, true);
  }

  // Category mappings
  const hasMappings = await tableExists(sourceDb, "category_game_mappings");
  if (hasMappings) {
    const mappings = await dbAll(sourceDb, `SELECT * FROM category_game_mappings`);
    for (const mapping of mappings) {
      try {
        if (!options.dryRun) {
          const cols = Object.keys(mapping);
          const vals = cols.map((c) => mapping[c]);
          await dbRun(
            targetDb,
            `INSERT OR IGNORE INTO category_game_mappings (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`,
            vals
          );
        }
      } catch (error) {
        // Skip duplicates
      }
    }
    log(`Category mappings: ${mappings.length} records`, true);
  }
};

/**
 * Migrate category_stats
 */
const migrateCategoryStats = async (sourceDb, targetDb) => {
  log("Migrating CATEGORY_STATS...");

  const hasTable = await tableExists(sourceDb, "category_stats");
  if (!hasTable) {
    log("No category_stats table found", true);
    return;
  }

  const countResult = await dbGet(sourceDb, `SELECT COUNT(*) as count FROM category_stats`);
  const total = countResult.count;
  log(`Found ${total} category stats to migrate`, true);

  let offset = 0;
  while (offset < total) {
    const records = await dbAll(
      sourceDb,
      `SELECT * FROM category_stats ORDER BY recorded_at LIMIT ? OFFSET ?`,
      [options.batchSize, offset]
    );

    for (const rec of records) {
      try {
        if (!options.dryRun) {
          await dbRun(
            targetDb,
            `INSERT INTO category_stats (platform, platform_category_id, viewer_count, streamer_count, recorded_at)
             VALUES (?, ?, ?, ?, ?)`,
            [rec.platform, rec.platform_category_id, rec.viewer_count, rec.streamer_count, rec.recorded_at]
          );
        }
      } catch (error) {
        // Skip errors
      }
    }

    offset += options.batchSize;
  }

  log(`CATEGORY_STATS: ${total} records processed`);
};

/**
 * Main migration function
 */
const migrate = async () => {
  console.log("=".repeat(60));
  console.log("DATABASE MIGRATION: Split DB → Unified DB");
  console.log("=".repeat(60));

  if (options.dryRun) {
    console.log("⚠️  DRY RUN MODE - No changes will be made");
  }

  let overlayDb, streamingDb, targetDb;

  try {
    // Open source databases (read-only)
    log("Opening source databases...");
    overlayDb = await openDb(OVERLAY_DB_PATH).catch(() => null);
    streamingDb = await openDb(STREAMING_DB_PATH).catch(() => null);

    if (!overlayDb && !streamingDb) {
      throw new Error("No source databases found!");
    }

    // Open/create target database
    log("Opening target database...");
    targetDb = await openDbWrite(UNIFIED_DB_PATH);

    // Initialize schema
    log("Initializing unified schema...");
    const { initializeUnifiedDatabase } = require("./unified-init");
    await initializeUnifiedDatabase(targetDb);

    // Migration order matters for foreign key relationships
    log("\n--- Starting Migration ---\n");

    // 1. Persons (from streaming_data.db)
    if (streamingDb) {
      await migratePersons(streamingDb, targetDb);
    }

    // 2. Broadcasts (from streaming_data.db) - creates segments
    if (streamingDb) {
      await migrateBroadcasts(streamingDb, targetDb);
    }

    // 3. Events (from streaming_data.db)
    if (streamingDb) {
      await migrateEvents(streamingDb, targetDb);
    }

    // 4. Viewer Engagement (from streaming_data.db)
    if (streamingDb) {
      await migrateViewerEngagement(streamingDb, targetDb);
    }

    // 5. Viewer Snapshots (from streaming_data.db)
    if (streamingDb) {
      await migrateViewerSnapshots(streamingDb, targetDb);
    }

    // 6. Categories (from streaming_data.db)
    if (streamingDb) {
      await migrateCategories(streamingDb, targetDb);
      await migrateGameMappings(streamingDb, targetDb);
      await migrateCategoryStats(streamingDb, targetDb);
    }

    // 7. Overlay tables (from weflab_clone.db)
    if (overlayDb) {
      await migrateOverlayTables(overlayDb, targetDb);
    }

    // Print summary
    console.log("\n" + "=".repeat(60));
    console.log("MIGRATION SUMMARY");
    console.log("=".repeat(60));
    console.log(JSON.stringify(stats, null, 2));
    console.log("=".repeat(60));

    if (options.dryRun) {
      console.log("\n⚠️  DRY RUN - No changes were made");
      console.log("Run without --dry-run to apply changes");
    } else {
      console.log("\n✅ Migration completed successfully!");
      console.log(`Unified database: ${UNIFIED_DB_PATH}`);
    }
  } catch (error) {
    console.error("\n❌ Migration failed:", error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Close all connections
    if (overlayDb) await closeDb(overlayDb).catch(() => {});
    if (streamingDb) await closeDb(streamingDb).catch(() => {});
    if (targetDb) await closeDb(targetDb).catch(() => {});
  }
};

// Run migration
migrate();
