#!/usr/bin/env node
/**
 * Snowflake Setup Script
 * Creates database, schema, and tables for Streaming Agent
 */

const snowflake = require("snowflake-sdk");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const config = {
  account: process.env.SNOWFLAKE_ACCOUNT,
  username: process.env.SNOWFLAKE_USERNAME,
  password: process.env.SNOWFLAKE_PASSWORD,
  database: process.env.SNOWFLAKE_DATABASE || "STREAMING_AGENT",
  schema: process.env.SNOWFLAKE_SCHEMA || "RAW",
  warehouse: process.env.SNOWFLAKE_WAREHOUSE || "COMPUTE_WH",
  role: process.env.SNOWFLAKE_ROLE || "ACCOUNTADMIN",
};

const queries = [
  // 1. Create Database
  `CREATE DATABASE IF NOT EXISTS ${config.database}`,

  // 2. Create Schema
  `CREATE SCHEMA IF NOT EXISTS ${config.database}.${config.schema}`,

  // 3. Use Database/Schema
  `USE DATABASE ${config.database}`,
  `USE SCHEMA ${config.schema}`,

  // 4. Create Events Table
  `CREATE TABLE IF NOT EXISTS EVENTS (
    id VARCHAR(36) PRIMARY KEY,
    event_type VARCHAR(20) NOT NULL,
    platform VARCHAR(20) NOT NULL,
    sender_id VARCHAR(255),
    sender_nickname VARCHAR(255),
    sender_profile_image VARCHAR(1000),
    sender_role VARCHAR(20),
    message TEXT,
    amount INTEGER,
    original_amount INTEGER,
    currency VARCHAR(20),
    donation_type VARCHAR(30),
    viewer_count INTEGER,
    channel_id VARCHAR(255) NOT NULL,
    event_timestamp TIMESTAMP_NTZ NOT NULL,
    ingested_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    raw_data VARIANT
  )`,

  // 5. Create Broadcasts Table (방송 정보)
  `CREATE TABLE IF NOT EXISTS BROADCASTS (
    id INTEGER AUTOINCREMENT PRIMARY KEY,
    platform VARCHAR(20) NOT NULL,
    channel_id VARCHAR(255) NOT NULL,
    broadcast_id VARCHAR(255),
    title VARCHAR(1000),
    category_id VARCHAR(100),
    category_name VARCHAR(255),
    thumbnail_url VARCHAR(1000),
    viewer_count INTEGER,
    is_live BOOLEAN DEFAULT TRUE,
    started_at TIMESTAMP_NTZ,
    recorded_at TIMESTAMP_NTZ NOT NULL,
    ingested_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    raw_data VARIANT
  )`,

  // 6. Create Streamers Table (스트리머 정보)
  `CREATE TABLE IF NOT EXISTS STREAMERS (
    id INTEGER AUTOINCREMENT PRIMARY KEY,
    platform VARCHAR(20) NOT NULL,
    channel_id VARCHAR(255) NOT NULL,
    streamer_id VARCHAR(255),
    nickname VARCHAR(255),
    profile_image_url VARCHAR(1000),
    follower_count INTEGER,
    subscriber_count INTEGER,
    description TEXT,
    recorded_at TIMESTAMP_NTZ NOT NULL,
    ingested_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    raw_data VARIANT,
    UNIQUE (platform, channel_id)
  )`,

  // 7. Create Categories Table (카테고리 메타데이터 - MERGE 업데이트)
  `CREATE TABLE IF NOT EXISTS CATEGORIES (
    id INTEGER AUTOINCREMENT PRIMARY KEY,
    platform VARCHAR(20) NOT NULL,
    category_id VARCHAR(100) NOT NULL,
    category_name VARCHAR(255),
    category_type VARCHAR(50),
    thumbnail_url VARCHAR(1000),
    recorded_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    updated_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    UNIQUE (platform, category_id)
  )`,

  // 8. Create Chat Users Table (채팅 유저 정보)
  `CREATE TABLE IF NOT EXISTS CHAT_USERS (
    id INTEGER AUTOINCREMENT PRIMARY KEY,
    platform VARCHAR(20) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    nickname VARCHAR(255),
    profile_image_url VARCHAR(1000),
    user_role VARCHAR(20),
    chat_count INTEGER DEFAULT 0,
    donation_count INTEGER DEFAULT 0,
    total_donation_amount INTEGER DEFAULT 0,
    first_seen_at TIMESTAMP_NTZ,
    last_seen_at TIMESTAMP_NTZ,
    last_chat_channel_id VARCHAR(255),
    updated_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    UNIQUE (platform, user_id)
  )`,

  // 9. Verify tables
  `SHOW TABLES IN SCHEMA ${config.database}.${config.schema}`,
];

async function executeQuery(connection, sql) {
  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText: sql,
      complete: (err, stmt, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      },
    });
  });
}

async function main() {
  console.log("🔗 Connecting to Snowflake...");
  console.log(`   Account: ${config.account}`);
  console.log(`   Database: ${config.database}`);
  console.log(`   Schema: ${config.schema}`);

  const connection = snowflake.createConnection(config);

  try {
    await new Promise((resolve, reject) => {
      connection.connect((err, conn) => {
        if (err) reject(err);
        else resolve(conn);
      });
    });

    console.log("✅ Connected to Snowflake\n");

    for (let i = 0; i < queries.length; i++) {
      const sql = queries[i];
      const shortSql = sql.split("\n")[0].substring(0, 60) + "...";

      try {
        console.log(`[${i + 1}/${queries.length}] ${shortSql}`);
        const result = await executeQuery(connection, sql);

        // Show tables result
        if (sql.includes("SHOW TABLES")) {
          console.log("\n📋 Tables created:");
          result.forEach((row) => {
            console.log(`   - ${row.name}`);
          });
        } else {
          console.log(`   ✅ Success`);
        }
      } catch (err) {
        console.log(`   ❌ Error: ${err.message}`);
      }
    }

    console.log("\n🎉 Snowflake setup complete!");

  } catch (err) {
    console.error("❌ Connection failed:", err.message);
    process.exit(1);
  } finally {
    connection.destroy((err) => {
      if (err) console.error("Error closing connection:", err.message);
    });
  }
}

main();
