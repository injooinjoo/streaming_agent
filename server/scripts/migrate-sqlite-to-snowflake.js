#!/usr/bin/env node
/**
 * SQLite → Snowflake 데이터 마이그레이션 스크립트
 *
 * 사용법:
 *   node scripts/migrate-sqlite-to-snowflake.js [options]
 *
 * 옵션:
 *   --dry-run           실제 데이터 삽입 없이 카운트만 확인
 *   --table <name>      특정 테이블만 마이그레이션
 *   --batch-size <n>    배치 크기 (기본: 1000)
 *   --skip-schema       스키마 생성 스킵
 *   --resume            이전 마이그레이션 이어서 진행
 *
 * 환경변수 필요:
 *   SNOWFLAKE_ACCOUNT, SNOWFLAKE_USERNAME, SNOWFLAKE_PASSWORD
 *   SNOWFLAKE_DATABASE, SNOWFLAKE_SCHEMA, SNOWFLAKE_WAREHOUSE
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { getSnowflakeConnection } = require('../db/snowflake-connection');

// 설정
const BATCH_SIZE = parseInt(process.argv.find((_, i, arr) => arr[i - 1] === '--batch-size') || '1000', 10);
const DRY_RUN = process.argv.includes('--dry-run');
const SKIP_SCHEMA = process.argv.includes('--skip-schema');
const RESUME_MODE = process.argv.includes('--resume');
const TARGET_TABLE = process.argv.find((_, i, arr) => arr[i - 1] === '--table');

// SQLite DB 경로
const SQLITE_DB_PATH = process.env.SQLITE_DB_PATH || path.join(__dirname, '../weflab_clone.db');

// 마이그레이션 상태 파일
const STATE_FILE = path.join(__dirname, '../.migration-state.json');

// ID 매핑 (SQLite ID → Snowflake ID)
const idMapping = {
  platform_users: new Map(),
  broadcasts: new Map()
};

// 마이그레이션 순서 (의존성 고려)
const MIGRATION_ORDER = [
  'platform_users',
  'broadcasts',
  'broadcast_snapshots',
  'viewing_records',
  'donations',
  'viewing_sessions',
  'monitoring_config',
  'monitoring_targets',
  'daily_stats',
  'collection_logs',
  'broadcast_stats_5min',
  'broadcast_changes',
  'chat_messages'
];

// 테이블별 컬럼 매핑 (SQLite → Snowflake)
const TABLE_MAPPINGS = {
  platform_users: {
    columns: [
      'PLATFORM', 'PLATFORM_USER_ID', 'USERNAME', 'NICKNAME', 'PROFILE_IMAGE',
      'IS_STREAMER', 'IS_PARTNER', 'STREAMER_DATA', 'FOLLOWER_COUNT',
      'SUBSCRIBER_COUNT', 'FAN_COUNT', 'FIRST_SEEN_AT', 'LAST_SEEN_AT'
    ],
    sqlite_select: `
      SELECT platform, platform_user_id, username, nickname, profile_image,
             is_streamer, is_partner, streamer_data, follower_count,
             subscriber_count, fan_count, first_seen_at, last_seen_at, id
      FROM platform_users
    `,
    transform: (row) => [
      row.platform || 'soop',
      row.platform_user_id,
      row.username,
      row.nickname,
      row.profile_image,
      !!row.is_streamer,
      !!row.is_partner,
      row.streamer_data ? JSON.parse(row.streamer_data) : null,
      row.follower_count || 0,
      row.subscriber_count || 0,
      row.fan_count || 0,
      row.first_seen_at,
      row.last_seen_at
    ],
    hasIdMapping: true
  },

  broadcasts: {
    columns: [
      'PLATFORM', 'BROADCAST_ID', 'STREAMER_ID', 'STREAMER_USERNAME',
      'TITLE', 'CATEGORY', 'SUB_CATEGORY', 'TAGS', 'STARTED_AT', 'ENDED_AT',
      'DURATION_SECONDS', 'PEAK_VIEWERS', 'AVG_VIEWERS', 'TOTAL_UNIQUE_VIEWERS',
      'TOTAL_CHAT_COUNT', 'TOTAL_DONATION_AMOUNT', 'IS_LIVE'
    ],
    sqlite_select: `
      SELECT platform, broadcast_id, streamer_id, streamer_username,
             title, category, sub_category, tags, started_at, ended_at,
             duration_seconds, peak_viewers, avg_viewers, total_unique_viewers,
             total_chat_count, total_donation_amount, is_live, id
      FROM broadcasts
    `,
    transform: (row) => [
      row.platform || 'soop',
      row.broadcast_id,
      idMapping.platform_users.get(row.streamer_id) || null,
      row.streamer_username,
      row.title,
      row.category,
      row.sub_category,
      row.tags ? JSON.parse(row.tags) : null,
      row.started_at,
      row.ended_at,
      row.duration_seconds,
      row.peak_viewers || 0,
      row.avg_viewers || 0,
      row.total_unique_viewers || 0,
      row.total_chat_count || 0,
      row.total_donation_amount || 0,
      !!row.is_live
    ],
    hasIdMapping: true
  },

  viewing_records: {
    columns: [
      'VIEWER_ID', 'VIEWER_USERNAME', 'BROADCAST_ID', 'STREAMER_ID',
      'SNAPSHOT_AT', 'IS_SUBSCRIBER', 'IS_FAN'
    ],
    sqlite_select: `
      SELECT viewer_id, viewer_username, broadcast_id, streamer_id,
             snapshot_at, is_subscriber, is_fan
      FROM viewing_records
    `,
    transform: (row) => [
      idMapping.platform_users.get(row.viewer_id) || row.viewer_id,
      row.viewer_username,
      idMapping.broadcasts.get(row.broadcast_id) || row.broadcast_id,
      idMapping.platform_users.get(row.streamer_id) || row.streamer_id,
      row.snapshot_at,
      !!row.is_subscriber,
      !!row.is_fan
    ],
    hasIdMapping: false
  },

  donations: {
    columns: [
      'SENDER_ID', 'SENDER_USERNAME', 'SENDER_NICKNAME', 'RECEIVER_ID',
      'RECEIVER_USERNAME', 'BROADCAST_ID', 'DONATION_TYPE', 'ITEM_COUNT',
      'AMOUNT_KRW', 'MESSAGE', 'SUBSCRIPTION_MONTHS', 'DONATED_AT'
    ],
    sqlite_select: `
      SELECT sender_id, sender_username, sender_nickname, receiver_id,
             receiver_username, broadcast_id, donation_type, item_count,
             amount_krw, message, subscription_months, donated_at
      FROM donations
    `,
    transform: (row) => [
      idMapping.platform_users.get(row.sender_id) || row.sender_id,
      row.sender_username,
      row.sender_nickname,
      idMapping.platform_users.get(row.receiver_id) || row.receiver_id,
      row.receiver_username,
      idMapping.broadcasts.get(row.broadcast_id) || row.broadcast_id,
      row.donation_type,
      row.item_count || 0,
      row.amount_krw || 0,
      row.message,
      row.subscription_months,
      row.donated_at
    ],
    hasIdMapping: false
  },

  broadcast_snapshots: {
    columns: [
      'BROADCAST_ID', 'SNAPSHOT_AT', 'TOTAL_VIEWERS', 'PC_VIEWERS',
      'MOBILE_VIEWERS', 'TITLE', 'CATEGORY'
    ],
    sqlite_select: `
      SELECT broadcast_id, snapshot_at, total_viewers, pc_viewers,
             mobile_viewers, title, category
      FROM broadcast_snapshots
    `,
    transform: (row) => [
      idMapping.broadcasts.get(row.broadcast_id) || row.broadcast_id,
      row.snapshot_at,
      row.total_viewers || 0,
      row.pc_viewers || 0,
      row.mobile_viewers || 0,
      row.title,
      row.category
    ],
    hasIdMapping: false
  },

  broadcast_stats_5min: {
    columns: [
      'BROADCAST_ID', 'SNAPSHOT_AT', 'VIEWER_COUNT', 'SUBSCRIBER_COUNT',
      'FAN_COUNT', 'SUBSCRIBER_RATIO', 'FAN_RATIO', 'CHAT_COUNT',
      'UNIQUE_CHATTERS', 'DONATION_COUNT', 'DONATION_AMOUNT'
    ],
    sqlite_select: `
      SELECT broadcast_id, snapshot_at, viewer_count, subscriber_count,
             fan_count, subscriber_ratio, fan_ratio, chat_count,
             unique_chatters, donation_count, donation_amount
      FROM broadcast_stats_5min
    `,
    transform: (row) => [
      idMapping.broadcasts.get(row.broadcast_id) || row.broadcast_id,
      row.snapshot_at,
      row.viewer_count || 0,
      row.subscriber_count || 0,
      row.fan_count || 0,
      row.subscriber_ratio || 0,
      row.fan_ratio || 0,
      row.chat_count || 0,
      row.unique_chatters || 0,
      row.donation_count || 0,
      row.donation_amount || 0
    ],
    hasIdMapping: false
  },

  broadcast_changes: {
    columns: [
      'BROADCAST_ID', 'FIELD_NAME', 'OLD_VALUE', 'NEW_VALUE', 'CHANGED_AT'
    ],
    sqlite_select: `
      SELECT broadcast_id, field_name, old_value, new_value, changed_at
      FROM broadcast_changes
    `,
    transform: (row) => [
      idMapping.broadcasts.get(row.broadcast_id) || row.broadcast_id,
      row.field_name,
      row.old_value,
      row.new_value,
      row.changed_at
    ],
    hasIdMapping: false
  }
};

/**
 * SQLite 데이터베이스 연결
 */
function connectSqlite() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(SQLITE_DB_PATH, sqlite3.OPEN_READONLY, (err) => {
      if (err) {
        reject(new Error(`SQLite connection failed: ${err.message}`));
      } else {
        console.log(`SQLite connected: ${SQLITE_DB_PATH}`);
        resolve(db);
      }
    });
  });
}

/**
 * SQLite 쿼리 실행 (Promise 래퍼)
 */
function sqliteAll(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

function sqliteGet(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

/**
 * 마이그레이션 상태 저장/로드
 */
function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  }
  return {
    completedTables: [],
    idMappings: {},
    lastOffset: {}
  };
}

/**
 * 테이블 행 수 조회
 */
async function getTableCount(sqliteDb, tableName) {
  const result = await sqliteGet(sqliteDb, `SELECT COUNT(*) as count FROM ${tableName}`);
  return result ? result.count : 0;
}

/**
 * 스키마 생성
 */
async function createSnowflakeSchema(snowflake) {
  console.log('\n[Schema] Creating Snowflake schema...');

  const schemaPath = path.join(__dirname, '../db/schema-snowflake.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  // SQL 문 분리 (세미콜론 기준, 주석 제외)
  const statements = schemaSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const stmt of statements) {
    try {
      await snowflake.run(stmt);
      console.log(`  [OK] ${stmt.substring(0, 50)}...`);
    } catch (err) {
      // 이미 존재하는 객체는 무시
      if (!err.message.includes('already exists')) {
        console.warn(`  [WARN] ${err.message.substring(0, 100)}`);
      }
    }
  }

  console.log('[Schema] Schema creation complete\n');
}

/**
 * 단일 테이블 마이그레이션
 */
async function migrateTable(sqliteDb, snowflake, tableName) {
  const mapping = TABLE_MAPPINGS[tableName];
  if (!mapping) {
    console.log(`[${tableName}] No mapping defined, skipping`);
    return { migrated: 0, skipped: true };
  }

  const totalCount = await getTableCount(sqliteDb, tableName);
  console.log(`\n[${tableName}] Starting migration (${totalCount.toLocaleString()} rows)`);

  if (totalCount === 0) {
    console.log(`[${tableName}] No data to migrate`);
    return { migrated: 0, skipped: false };
  }

  if (DRY_RUN) {
    console.log(`[${tableName}] DRY RUN - would migrate ${totalCount.toLocaleString()} rows`);
    return { migrated: 0, dryRun: true };
  }

  let migrated = 0;
  let errors = 0;
  let offset = 0;

  const insertSql = `
    INSERT INTO ${tableName.toUpperCase()} (${mapping.columns.join(', ')})
    VALUES (${mapping.columns.map(() => '?').join(', ')})
  `;

  while (offset < totalCount) {
    const sql = `${mapping.sqlite_select} LIMIT ${BATCH_SIZE} OFFSET ${offset}`;
    const rows = await sqliteAll(sqliteDb, sql);

    if (rows.length === 0) break;

    for (const row of rows) {
      try {
        const values = mapping.transform(row);
        const result = await snowflake.run(insertSql, values);

        // ID 매핑 저장 (platform_users, broadcasts)
        if (mapping.hasIdMapping && row.id) {
          // Snowflake에서 새 ID 조회 (마지막 삽입된 행)
          const newId = await snowflake.get(`
            SELECT MAX(ID) as id FROM ${tableName.toUpperCase()}
          `);
          if (newId && newId.id) {
            idMapping[tableName].set(row.id, newId.id);
          }
        }

        migrated++;
      } catch (err) {
        // UNIQUE constraint 위반은 무시 (이미 존재하는 데이터)
        if (!err.message.includes('UNIQUE_KEY') && !err.message.includes('duplicate')) {
          errors++;
          if (errors <= 5) {
            console.error(`  [ERROR] Row ${migrated + errors}: ${err.message.substring(0, 100)}`);
          }
        }
      }
    }

    offset += rows.length;
    process.stdout.write(`\r[${tableName}] Progress: ${migrated.toLocaleString()}/${totalCount.toLocaleString()} (${Math.round(migrated/totalCount*100)}%)`);
  }

  console.log(`\n[${tableName}] Complete: ${migrated.toLocaleString()} migrated, ${errors} errors`);
  return { migrated, errors };
}

/**
 * 전체 마이그레이션 실행
 */
async function runMigration() {
  console.log('='.repeat(60));
  console.log('SQLite → Snowflake Migration');
  console.log('='.repeat(60));
  console.log(`Batch size: ${BATCH_SIZE}`);
  console.log(`Dry run: ${DRY_RUN}`);
  console.log(`Skip schema: ${SKIP_SCHEMA}`);
  console.log(`Resume mode: ${RESUME_MODE}`);
  console.log(`Target table: ${TARGET_TABLE || 'all'}`);
  console.log('='.repeat(60));

  // 연결
  const sqliteDb = await connectSqlite();
  const snowflake = getSnowflakeConnection();
  await snowflake.connect();

  // 상태 로드 (resume 모드)
  const state = RESUME_MODE ? loadState() : {
    completedTables: [],
    idMappings: {},
    lastOffset: {}
  };

  // ID 매핑 복원
  if (state.idMappings.platform_users) {
    for (const [k, v] of Object.entries(state.idMappings.platform_users)) {
      idMapping.platform_users.set(parseInt(k), v);
    }
  }
  if (state.idMappings.broadcasts) {
    for (const [k, v] of Object.entries(state.idMappings.broadcasts)) {
      idMapping.broadcasts.set(parseInt(k), v);
    }
  }

  try {
    // 스키마 생성
    if (!SKIP_SCHEMA) {
      await createSnowflakeSchema(snowflake);
    }

    // 테이블별 마이그레이션
    const results = {};
    const tablesToMigrate = TARGET_TABLE ? [TARGET_TABLE] : MIGRATION_ORDER;

    for (const table of tablesToMigrate) {
      if (state.completedTables.includes(table)) {
        console.log(`\n[${table}] Skipping (already completed)`);
        continue;
      }

      results[table] = await migrateTable(sqliteDb, snowflake, table);

      // 상태 저장
      if (!DRY_RUN) {
        state.completedTables.push(table);
        state.idMappings.platform_users = Object.fromEntries(idMapping.platform_users);
        state.idMappings.broadcasts = Object.fromEntries(idMapping.broadcasts);
        saveState(state);
      }
    }

    // 결과 요약
    console.log('\n' + '='.repeat(60));
    console.log('Migration Summary');
    console.log('='.repeat(60));

    let totalMigrated = 0;
    for (const [table, result] of Object.entries(results)) {
      if (result.dryRun) {
        console.log(`${table}: DRY RUN`);
      } else if (result.skipped) {
        console.log(`${table}: SKIPPED (no mapping)`);
      } else {
        console.log(`${table}: ${result.migrated.toLocaleString()} rows${result.errors ? `, ${result.errors} errors` : ''}`);
        totalMigrated += result.migrated;
      }
    }

    console.log('-'.repeat(60));
    console.log(`Total migrated: ${totalMigrated.toLocaleString()} rows`);

    // 마이그레이션 완료 시 상태 파일 삭제
    if (!DRY_RUN && fs.existsSync(STATE_FILE)) {
      fs.unlinkSync(STATE_FILE);
      console.log('\nMigration state file cleaned up.');
    }

  } finally {
    // 연결 종료
    sqliteDb.close();
    await snowflake.disconnect();
  }

  console.log('\nMigration complete!');
}

// 실행
runMigration().catch(err => {
  console.error('\nMigration failed:', err.message);
  process.exit(1);
});
