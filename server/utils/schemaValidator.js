/**
 * Schema Validator
 * 코드에서 사용하는 컬럼명이 정규 스키마와 일치하는지 검증
 *
 * events 테이블 정규 스키마 (unified-init.js 기준):
 * - id, event_type, platform
 * - actor_person_id, actor_nickname, actor_role
 * - target_person_id, target_channel_id, broadcast_id
 * - message, amount, original_amount, currency, donation_type
 * - event_timestamp, ingested_at
 */

/**
 * Canonical columns for events table
 */
const CANONICAL_EVENTS_COLUMNS = [
  'id',
  'event_type',
  'platform',
  'actor_person_id',
  'actor_nickname',
  'actor_role',
  'target_person_id',
  'target_channel_id',
  'broadcast_id',
  'message',
  'amount',
  'original_amount',
  'currency',
  'donation_type',
  'event_timestamp',
  'ingested_at'
];

/**
 * Legacy columns that should NOT be used
 */
const LEGACY_COLUMNS = [
  'type',        // → event_type
  'timestamp',   // → event_timestamp (for events table only)
  'sender',      // → actor_nickname
  'sender_id'    // → actor_person_id
];

/**
 * Column mapping: legacy → canonical
 */
const COLUMN_MAPPING = {
  'type': 'event_type',
  'timestamp': 'event_timestamp',
  'sender': 'actor_nickname',
  'sender_id': 'actor_person_id'
};

/**
 * Validate SQL query for legacy column usage
 * @param {string} sql - SQL query to validate
 * @param {Object} options - Validation options
 * @param {boolean} options.throwOnError - Throw error instead of warning
 * @param {string} options.context - Context for error message (e.g., function name)
 * @returns {boolean} true if valid (no legacy columns), false otherwise
 */
function validateQuery(sql, options = {}) {
  const { throwOnError = false, context = '' } = options;
  const issues = [];

  for (const legacy of LEGACY_COLUMNS) {
    // Check for column usage patterns (word boundaries)
    const patterns = [
      new RegExp(`\\b${legacy}\\s*=`, 'gi'),           // type =
      new RegExp(`\\b${legacy}\\s*,`, 'gi'),           // type,
      new RegExp(`,\\s*${legacy}\\b`, 'gi'),           // , type
      new RegExp(`\\(${legacy}\\)`, 'gi'),             // (type)
      new RegExp(`DATE\\(${legacy}\\)`, 'gi'),         // DATE(timestamp)
      new RegExp(`strftime\\([^,]+,\\s*${legacy}\\)`, 'gi'), // strftime(..., timestamp)
      new RegExp(`MIN\\(${legacy}\\)`, 'gi'),          // MIN(timestamp)
      new RegExp(`MAX\\(${legacy}\\)`, 'gi'),          // MAX(timestamp)
      new RegExp(`GROUP BY.*\\b${legacy}\\b`, 'gi'),   // GROUP BY sender
      new RegExp(`ORDER BY.*\\b${legacy}\\b`, 'gi'),   // ORDER BY timestamp
    ];

    for (const pattern of patterns) {
      if (pattern.test(sql)) {
        const suggestion = COLUMN_MAPPING[legacy];
        issues.push({
          legacy,
          suggestion,
          message: `Legacy column "${legacy}" detected. Use "${suggestion}" instead.`
        });
        break; // Only report once per legacy column
      }
    }
  }

  if (issues.length > 0) {
    const contextStr = context ? ` in ${context}` : '';
    const message = `⚠️ Schema validation failed${contextStr}:\n` +
      issues.map(i => `  - ${i.message}`).join('\n');

    if (throwOnError) {
      throw new Error(message);
    } else {
      console.warn(message);
    }
    return false;
  }

  return true;
}

/**
 * Get canonical column name for a legacy column
 * @param {string} legacyColumn - Legacy column name
 * @returns {string|null} Canonical column name or null if not a legacy column
 */
function getCanonicalColumn(legacyColumn) {
  return COLUMN_MAPPING[legacyColumn.toLowerCase()] || null;
}

/**
 * Check if a column name is legacy
 * @param {string} column - Column name to check
 * @returns {boolean}
 */
function isLegacyColumn(column) {
  return LEGACY_COLUMNS.includes(column.toLowerCase());
}

/**
 * Create a validated query wrapper (for debugging)
 * @param {Function} queryFn - Original query function
 * @param {string} context - Context name for error messages
 * @returns {Function} Wrapped query function with validation
 */
function createValidatedQuery(queryFn, context) {
  return (sql, params = []) => {
    validateQuery(sql, { context, throwOnError: false });
    return queryFn(sql, params);
  };
}

module.exports = {
  CANONICAL_EVENTS_COLUMNS,
  LEGACY_COLUMNS,
  COLUMN_MAPPING,
  validateQuery,
  getCanonicalColumn,
  isLegacyColumn,
  createValidatedQuery
};
