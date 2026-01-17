/**
 * Analytics Database Initialization
 * 스트리머/시청자 데이터 수집용 테이블 초기화
 */

const fs = require("fs");
const path = require("path");

/**
 * Analytics 테이블 초기화
 * @param {sqlite3.Database} db - Database instance
 * @returns {Promise<void>}
 */
const initializeAnalyticsDatabase = (db) => {
  return new Promise((resolve, reject) => {
    const schemaPath = path.join(__dirname, "schema-analytics.sql");

    // SQL 파일 읽기
    let schemaSql;
    try {
      schemaSql = fs.readFileSync(schemaPath, "utf8");
    } catch (err) {
      console.error("Failed to read analytics schema file:", err.message);
      reject(err);
      return;
    }

    // 주석 제거 및 문장 분리 (여러 줄 주석 블록 처리)
    const cleanedSql = schemaSql
      .split("\n")
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n");

    const statements = cleanedSql
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0);

    db.serialize(() => {
      let completed = 0;
      const total = statements.length;

      for (const statement of statements) {
        db.run(statement + ";", (err) => {
          if (err) {
            // UNIQUE constraint 등 무시할 수 있는 에러 처리
            if (!err.message.includes("UNIQUE constraint")) {
              console.warn("Analytics DB warning:", err.message);
            }
          }
          completed++;

          if (completed === total) {
            console.log(
              `Analytics database initialized: ${total} statements executed`
            );
            resolve();
          }
        });
      }

      if (statements.length === 0) {
        resolve();
      }
    });
  });
};

/**
 * 설정 값 조회
 * @param {sqlite3.Database} db
 * @param {string} key
 * @returns {Promise<string|null>}
 */
const getConfig = (db, key) => {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT config_value FROM monitoring_config WHERE config_key = ?",
      [key],
      (err, row) => {
        if (err) reject(err);
        else resolve(row ? row.config_value : null);
      }
    );
  });
};

/**
 * 설정 값 업데이트
 * @param {sqlite3.Database} db
 * @param {string} key
 * @param {string} value
 * @returns {Promise<void>}
 */
const setConfig = (db, key, value) => {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE monitoring_config
       SET config_value = ?, updated_at = CURRENT_TIMESTAMP
       WHERE config_key = ?`,
      [value, key],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
};

/**
 * 모든 설정 조회
 * @param {sqlite3.Database} db
 * @returns {Promise<Object>}
 */
const getAllConfig = (db) => {
  return new Promise((resolve, reject) => {
    db.all("SELECT config_key, config_value FROM monitoring_config", (err, rows) => {
      if (err) reject(err);
      else {
        const config = {};
        for (const row of rows) {
          config[row.config_key] = row.config_value;
        }
        resolve(config);
      }
    });
  });
};

module.exports = {
  initializeAnalyticsDatabase,
  getConfig,
  setConfig,
  getAllConfig,
};
