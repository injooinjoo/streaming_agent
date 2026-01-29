/**
 * Migration: Add chat_stats table for per-user per-minute chat counts
 *
 * Instead of storing individual chat messages, we aggregate:
 * - chat count per user per minute
 * - This reduces storage significantly while keeping useful analytics
 *
 * Also adds user_id column to user_sessions for direct user tracking
 */

exports.up = function(knex) {
  return knex.schema
    // 1. Create chat_stats table
    .createTable('chat_stats', (table) => {
      table.bigIncrements('id').primary();
      table.string('platform', 20).notNullable(); // 'soop', 'chzzk'
      table.string('channel_id', 255).notNullable(); // 스트리머 채널 ID
      table.string('user_id', 255).notNullable(); // 채팅 유저 ID
      table.string('user_nickname', 255); // 채팅 유저 닉네임
      table.timestamp('minute_timestamp').notNullable(); // 분 단위 타임스탬프 (YYYY-MM-DD HH:MM:00)
      table.integer('chat_count').defaultTo(1); // 해당 분에 보낸 채팅 수
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      // Unique constraint: 동일 유저, 동일 채널, 동일 분에 하나의 레코드만
      table.unique(['platform', 'channel_id', 'user_id', 'minute_timestamp']);
    })
    .then(() => {
      // 2. Add user_id column to user_sessions if not exists
      return knex.schema.hasColumn('user_sessions', 'user_id').then((exists) => {
        if (!exists) {
          return knex.schema.alterTable('user_sessions', (table) => {
            table.string('user_id', 255).after('person_id');
          });
        }
      });
    })
    .then(() => {
      // 3. Create indexes
      return knex.schema.raw(`
        CREATE INDEX IF NOT EXISTS idx_chat_stats_channel ON chat_stats(platform, channel_id);
        CREATE INDEX IF NOT EXISTS idx_chat_stats_user ON chat_stats(user_id);
        CREATE INDEX IF NOT EXISTS idx_chat_stats_time ON chat_stats(minute_timestamp);
        CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
      `);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('chat_stats')
    .then(() => {
      return knex.schema.hasColumn('user_sessions', 'user_id').then((exists) => {
        if (exists) {
          return knex.schema.alterTable('user_sessions', (table) => {
            table.dropColumn('user_id');
          });
        }
      });
    });
};
