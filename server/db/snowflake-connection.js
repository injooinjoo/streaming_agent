/**
 * Snowflake Connection Manager
 * SQLite API와 유사한 인터페이스 제공 (get, all, run 메서드)
 */

const snowflake = require('snowflake-sdk');
const { logger } = require('../services/logger');

class SnowflakeConnection {
  constructor(config = {}) {
    this.config = {
      account: config.account || process.env.SNOWFLAKE_ACCOUNT,
      username: config.username || process.env.SNOWFLAKE_USERNAME,
      password: config.password || process.env.SNOWFLAKE_PASSWORD,
      warehouse: config.warehouse || process.env.SNOWFLAKE_WAREHOUSE || 'COMPUTE_WH',
      database: config.database || process.env.SNOWFLAKE_DATABASE || 'STREAMING_ANALYTICS',
      schema: config.schema || process.env.SNOWFLAKE_SCHEMA || 'ANALYTICS',
      role: config.role || process.env.SNOWFLAKE_ROLE,
    };

    this.connection = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000;
  }

  /**
   * Snowflake 연결 수립
   */
  async connect() {
    return new Promise((resolve, reject) => {
      if (this.isConnected && this.connection) {
        resolve(this.connection);
        return;
      }

      // 환경변수 검증
      if (!this.config.account || !this.config.username || !this.config.password) {
        const err = new Error('Snowflake credentials not configured. Set SNOWFLAKE_ACCOUNT, SNOWFLAKE_USERNAME, SNOWFLAKE_PASSWORD');
        logger.error('Snowflake connection error', { error: err.message });
        reject(err);
        return;
      }

      this.connection = snowflake.createConnection({
        account: this.config.account,
        username: this.config.username,
        password: this.config.password,
        warehouse: this.config.warehouse,
        database: this.config.database,
        schema: this.config.schema,
        role: this.config.role,
        clientSessionKeepAlive: true,
        clientSessionKeepAliveHeartbeatFrequency: 3600,
      });

      this.connection.connect((err, conn) => {
        if (err) {
          logger.error('Snowflake connection failed', {
            error: err.message,
            account: this.config.account,
            database: this.config.database
          });
          reject(err);
          return;
        }

        this.isConnected = true;
        this.reconnectAttempts = 0;
        logger.info('Snowflake connected', {
          account: this.config.account,
          database: this.config.database,
          schema: this.config.schema,
          warehouse: this.config.warehouse
        });
        resolve(conn);
      });
    });
  }

  /**
   * 연결 해제
   */
  async disconnect() {
    return new Promise((resolve) => {
      if (!this.connection || !this.isConnected) {
        resolve();
        return;
      }

      this.connection.destroy((err) => {
        if (err) {
          logger.error('Snowflake disconnect error', { error: err.message });
        } else {
          logger.info('Snowflake disconnected');
        }
        this.isConnected = false;
        this.connection = null;
        resolve();
      });
    });
  }

  /**
   * 자동 재연결
   */
  async ensureConnection() {
    if (this.isConnected && this.connection) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      throw new Error(`Snowflake reconnection failed after ${this.maxReconnectAttempts} attempts`);
    }

    this.reconnectAttempts++;
    logger.info('Snowflake reconnecting...', { attempt: this.reconnectAttempts });

    await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));
    await this.connect();
  }

  /**
   * SQL 쿼리 실행 - 단일 행 반환 (SQLite db.get() 호환)
   * @param {string} sql - SQL 쿼리
   * @param {Array} binds - 바인딩 파라미터
   * @returns {Promise<Object|null>} - 단일 행 또는 null
   */
  async get(sql, binds = []) {
    await this.ensureConnection();

    return new Promise((resolve, reject) => {
      this.connection.execute({
        sqlText: sql,
        binds: binds,
        complete: (err, stmt, rows) => {
          if (err) {
            logger.error('Snowflake query error (get)', { error: err.message, sql: sql.substring(0, 100) });
            reject(err);
            return;
          }
          resolve(rows && rows.length > 0 ? this.normalizeRow(rows[0]) : null);
        }
      });
    });
  }

  /**
   * SQL 쿼리 실행 - 전체 행 반환 (SQLite db.all() 호환)
   * @param {string} sql - SQL 쿼리
   * @param {Array} binds - 바인딩 파라미터
   * @returns {Promise<Array>} - 행 배열
   */
  async all(sql, binds = []) {
    await this.ensureConnection();

    return new Promise((resolve, reject) => {
      this.connection.execute({
        sqlText: sql,
        binds: binds,
        complete: (err, stmt, rows) => {
          if (err) {
            logger.error('Snowflake query error (all)', { error: err.message, sql: sql.substring(0, 100) });
            reject(err);
            return;
          }
          resolve((rows || []).map(row => this.normalizeRow(row)));
        }
      });
    });
  }

  /**
   * SQL 쿼리 실행 - INSERT/UPDATE/DELETE (SQLite db.run() 호환)
   * @param {string} sql - SQL 쿼리
   * @param {Array} binds - 바인딩 파라미터
   * @returns {Promise<Object>} - 실행 결과 { changes, lastID }
   */
  async run(sql, binds = []) {
    await this.ensureConnection();

    return new Promise((resolve, reject) => {
      this.connection.execute({
        sqlText: sql,
        binds: binds,
        complete: (err, stmt, rows) => {
          if (err) {
            logger.error('Snowflake query error (run)', { error: err.message, sql: sql.substring(0, 100) });
            reject(err);
            return;
          }

          // Snowflake는 직접적인 lastID를 제공하지 않음
          // INSERT 후 LAST_QUERY_ID() 또는 별도 쿼리로 확인 필요
          const result = {
            changes: stmt.getNumUpdatedRows() || (rows ? rows.length : 0),
            lastID: null
          };

          resolve(result);
        }
      });
    });
  }

  /**
   * 배치 INSERT 실행 (대량 데이터 삽입용)
   * @param {string} tableName - 테이블 이름
   * @param {Array} columns - 컬럼 배열
   * @param {Array<Array>} values - 값 배열의 배열
   * @returns {Promise<Object>} - 실행 결과
   */
  async batchInsert(tableName, columns, values) {
    if (!values || values.length === 0) {
      return { changes: 0 };
    }

    await this.ensureConnection();

    const placeholders = columns.map(() => '?').join(', ');
    const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;

    let totalChanges = 0;
    const batchSize = 100; // Snowflake 권장 배치 크기

    for (let i = 0; i < values.length; i += batchSize) {
      const batch = values.slice(i, i + batchSize);

      for (const row of batch) {
        try {
          const result = await this.run(sql, row);
          totalChanges += result.changes || 1;
        } catch (err) {
          logger.error('Batch insert error', { error: err.message, row: i });
          // 개별 행 실패 시 계속 진행
        }
      }
    }

    return { changes: totalChanges };
  }

  /**
   * MERGE 문 실행 (UPSERT)
   * @param {string} targetTable - 대상 테이블
   * @param {string} sourceValues - VALUES 절
   * @param {string} matchCondition - ON 절 조건
   * @param {string} updateSet - UPDATE SET 절
   * @param {string} insertColumns - INSERT 컬럼
   * @param {string} insertValues - INSERT 값
   * @param {Array} binds - 바인딩 파라미터
   */
  async merge(targetTable, sourceValues, matchCondition, updateSet, insertColumns, insertValues, binds = []) {
    const sql = `
      MERGE INTO ${targetTable} AS target
      USING (${sourceValues}) AS source
      ON ${matchCondition}
      WHEN MATCHED THEN UPDATE SET ${updateSet}
      WHEN NOT MATCHED THEN INSERT (${insertColumns}) VALUES (${insertValues})
    `;

    return this.run(sql, binds);
  }

  /**
   * 트랜잭션 시작
   */
  async beginTransaction() {
    return this.run('BEGIN TRANSACTION');
  }

  /**
   * 트랜잭션 커밋
   */
  async commit() {
    return this.run('COMMIT');
  }

  /**
   * 트랜잭션 롤백
   */
  async rollback() {
    return this.run('ROLLBACK');
  }

  /**
   * Snowflake 컬럼명 정규화 (대문자 → 소문자)
   * Snowflake는 기본적으로 컬럼명을 대문자로 반환
   */
  normalizeRow(row) {
    if (!row) return null;

    const normalized = {};
    for (const [key, value] of Object.entries(row)) {
      // 컬럼명을 소문자로 변환 (SQLite 호환성)
      normalized[key.toLowerCase()] = value;
    }
    return normalized;
  }

  /**
   * 연결 상태 확인
   */
  async isHealthy() {
    try {
      await this.get('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 현재 연결 정보
   */
  getConnectionInfo() {
    return {
      account: this.config.account,
      database: this.config.database,
      schema: this.config.schema,
      warehouse: this.config.warehouse,
      isConnected: this.isConnected
    };
  }
}

// 싱글톤 인스턴스
let snowflakeInstance = null;

/**
 * Snowflake 연결 인스턴스 가져오기 (싱글톤)
 */
function getSnowflakeConnection(config = {}) {
  if (!snowflakeInstance) {
    snowflakeInstance = new SnowflakeConnection(config);
  }
  return snowflakeInstance;
}

/**
 * 새 Snowflake 연결 인스턴스 생성
 */
function createSnowflakeConnection(config = {}) {
  return new SnowflakeConnection(config);
}

module.exports = {
  SnowflakeConnection,
  getSnowflakeConnection,
  createSnowflakeConnection
};
