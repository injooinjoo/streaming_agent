#!/usr/bin/env node

/**
 * Schema Fix Migration Script
 *
 * Runs the events table schema fix migration on PostgreSQL
 *
 * Usage:
 *   DATABASE_URL=postgresql://... node server/scripts/run-schema-fix.js
 */

const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

async function runMigration() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("Error: DATABASE_URL environment variable is required");
    console.error("Usage: DATABASE_URL=postgresql://... node server/scripts/run-schema-fix.js");
    process.exit(1);
  }

  console.log("Connecting to PostgreSQL...");
  console.log(`URL: ${connectionString.replace(/:[^@]+@/, ":***@")}`);

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Test connection
    const client = await pool.connect();
    console.log("Connected successfully!");

    // Check current schema
    console.log("\n=== Checking current events table schema ===");
    const schemaResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'events'
      ORDER BY ordinal_position
    `);

    console.log("Current columns:");
    schemaResult.rows.forEach((row) => {
      console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === "YES" ? "nullable" : "not null"})`);
    });

    // Check if migration is needed
    const hasEventType = schemaResult.rows.some((r) => r.column_name === "event_type");
    const hasType = schemaResult.rows.some((r) => r.column_name === "type");

    if (hasEventType) {
      console.log("\n✅ Schema is already up to date (event_type column exists)");
    } else if (hasType) {
      console.log("\n⚠️  Migration needed: 'type' column found, needs to be renamed to 'event_type'");

      // Run migration
      console.log("\n=== Running migration ===");

      // Step 1: Rename columns
      console.log("Step 1: Renaming columns...");

      const columnsToRename = [
        { old: "type", new: "event_type" },
        { old: "sender", new: "actor_nickname" },
        { old: "timestamp", new: "event_timestamp" },
      ];

      for (const col of columnsToRename) {
        const exists = schemaResult.rows.some((r) => r.column_name === col.old);
        if (exists) {
          await client.query(`ALTER TABLE events RENAME COLUMN ${col.old} TO ${col.new}`);
          console.log(`  ✓ Renamed '${col.old}' to '${col.new}'`);
        }
      }

      // Step 2: Add missing columns
      console.log("Step 2: Adding missing columns...");

      const columnsToAdd = [
        { name: "actor_person_id", type: "INTEGER" },
        { name: "actor_role", type: "VARCHAR(50)" },
        { name: "target_person_id", type: "INTEGER" },
        { name: "target_channel_id", type: "VARCHAR(255)" },
        { name: "broadcast_id", type: "INTEGER" },
        { name: "original_amount", type: "INTEGER" },
        { name: "currency", type: "VARCHAR(10)" },
        { name: "donation_type", type: "VARCHAR(50)" },
        { name: "ingested_at", type: "TIMESTAMPTZ DEFAULT NOW()" },
      ];

      // Re-fetch schema after renames
      const updatedSchema = await client.query(`
        SELECT column_name FROM information_schema.columns WHERE table_name = 'events'
      `);
      const existingCols = updatedSchema.rows.map((r) => r.column_name);

      for (const col of columnsToAdd) {
        if (!existingCols.includes(col.name)) {
          await client.query(`ALTER TABLE events ADD COLUMN ${col.name} ${col.type}`);
          console.log(`  ✓ Added column '${col.name}'`);
        }
      }

      // Step 3: Update indexes
      console.log("Step 3: Updating indexes...");
      await client.query("DROP INDEX IF EXISTS idx_events_timestamp");
      await client.query("CREATE INDEX IF NOT EXISTS idx_events_event_timestamp ON events(event_timestamp)");
      await client.query("CREATE INDEX IF NOT EXISTS idx_events_target_channel ON events(target_channel_id)");
      await client.query("CREATE INDEX IF NOT EXISTS idx_events_target_type ON events(target_channel_id, event_type)");
      console.log("  ✓ Indexes updated");

      console.log("\n✅ Migration completed successfully!");
    } else {
      console.log("\n⚠️  Events table exists but neither 'type' nor 'event_type' column found.");
      console.log("    The table may need to be recreated.");
    }

    // Verify final schema
    console.log("\n=== Final schema ===");
    const finalSchema = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'events'
      ORDER BY ordinal_position
    `);

    finalSchema.rows.forEach((row) => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

    client.release();
  } catch (error) {
    console.error("\n❌ Migration failed:", error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
