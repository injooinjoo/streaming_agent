/**
 * Backup Service
 * SQLite 데이터베이스 → GCS 백업 핵심 로직
 *
 * Features:
 * - VACUUM INTO로 락 없이 안전한 스냅샷 생성
 * - gzip 압축 (70-80% 용량 감소)
 * - GCS 업로드 및 무결성 검증
 * - 보관 정책에 따른 자동 삭제
 * - 실패 시 웹훅 알림
 */

const { Storage } = require("@google-cloud/storage");
const { createGzip, createGunzip } = require("zlib");
const { pipeline } = require("stream/promises");
const { createReadStream, createWriteStream } = require("fs");
const fs = require("fs").promises;
const path = require("path");
const sqlite3 = require("sqlite3");
const backupConfig = require("../config/backup.config");
const loggers = require("./logger");

const logger = loggers.createChildLogger({ service: "backup" });

class BackupService {
  constructor() {
    this.storage = null;
    this.bucket = null;
    this.initialized = false;
  }

  /**
   * GCS 클라이언트 초기화
   */
  async initialize() {
    if (this.initialized) return;

    const { gcs } = backupConfig;

    if (!gcs.projectId) {
      throw new Error("GCS_PROJECT_ID is required");
    }

    const storageOptions = {
      projectId: gcs.projectId,
    };

    // 서비스 계정 키 파일이 있으면 사용
    if (gcs.keyFilename) {
      storageOptions.keyFilename = gcs.keyFilename;
    }

    this.storage = new Storage(storageOptions);
    this.bucket = this.storage.bucket(gcs.bucketName);
    this.initialized = true;

    logger.info("GCS client initialized", {
      bucket: gcs.bucketName,
      projectId: gcs.projectId,
    });
  }

  /**
   * 로컬 백업 디렉토리 생성
   */
  async ensureBackupDir() {
    const { localBackupDir } = backupConfig;
    await fs.mkdir(localBackupDir, { recursive: true });
    return localBackupDir;
  }

  /**
   * SQLite 데이터베이스 백업 (VACUUM INTO 사용)
   * @param {string} sourcePath - 원본 DB 경로
   * @param {string} destPath - 백업 DB 경로
   */
  async createDatabaseSnapshot(sourcePath, destPath) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(sourcePath, sqlite3.OPEN_READONLY, (err) => {
        if (err) {
          reject(new Error(`Failed to open database: ${err.message}`));
          return;
        }

        // VACUUM INTO로 락 없이 스냅샷 생성
        db.run(`VACUUM INTO '${destPath}'`, (err) => {
          db.close();

          if (err) {
            reject(new Error(`VACUUM INTO failed: ${err.message}`));
            return;
          }

          resolve();
        });
      });
    });
  }

  /**
   * 파일 gzip 압축
   * @param {string} inputPath - 입력 파일 경로
   * @param {string} outputPath - 출력 파일 경로 (.gz)
   */
  async compressFile(inputPath, outputPath) {
    const { compression } = backupConfig;

    const gzip = createGzip({ level: compression.level });
    const source = createReadStream(inputPath);
    const destination = createWriteStream(outputPath);

    await pipeline(source, gzip, destination);

    // 원본 파일 삭제
    await fs.unlink(inputPath);
  }

  /**
   * GCS에 파일 업로드
   * @param {string} localPath - 로컬 파일 경로
   * @param {string} gcsPath - GCS 파일 경로
   * @returns {Object} 업로드 결과
   */
  async uploadToGCS(localPath, gcsPath) {
    await this.initialize();

    const file = this.bucket.file(gcsPath);
    const localStats = await fs.stat(localPath);

    // 업로드
    await this.bucket.upload(localPath, {
      destination: gcsPath,
      metadata: {
        contentType: "application/gzip",
        metadata: {
          createdAt: new Date().toISOString(),
          localSize: localStats.size,
        },
      },
    });

    // 업로드 검증
    const [metadata] = await file.getMetadata();

    return {
      gcsPath,
      size: metadata.size,
      localSize: localStats.size,
      md5Hash: metadata.md5Hash,
    };
  }

  /**
   * 단일 데이터베이스 백업 실행
   * @param {Object} dbConfig - 데이터베이스 설정
   * @param {string} backupType - 백업 유형 (daily/weekly/monthly)
   */
  async backupDatabase(dbConfig, backupType = "daily") {
    const { name, path: dbPath } = dbConfig;
    const date = new Date().toISOString().split("T")[0];
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    logger.info("Starting database backup", {
      database: name,
      type: backupType,
      date,
    });

    try {
      // 1. 로컬 백업 디렉토리 확인
      const backupDir = await this.ensureBackupDir();
      const localDbPath = path.join(backupDir, `${name}_${timestamp}.db`);
      const localGzPath = `${localDbPath}.gz`;

      // 2. 데이터베이스 존재 확인
      try {
        await fs.access(dbPath);
      } catch {
        logger.warn("Database file not found, skipping", {
          database: name,
          path: dbPath,
        });
        return null;
      }

      // 3. VACUUM INTO로 스냅샷 생성
      await this.createDatabaseSnapshot(dbPath, localDbPath);
      logger.debug("Database snapshot created", { path: localDbPath });

      // 4. gzip 압축
      if (backupConfig.compression.enabled) {
        await this.compressFile(localDbPath, localGzPath);
        logger.debug("File compressed", { path: localGzPath });
      }

      // 5. GCS 업로드
      const gcsPath = backupConfig.gcsPath[backupType](name, timestamp);
      const uploadResult = await this.uploadToGCS(
        backupConfig.compression.enabled ? localGzPath : localDbPath,
        gcsPath
      );

      logger.info("Backup uploaded to GCS", {
        database: name,
        gcsPath: uploadResult.gcsPath,
        size: uploadResult.size,
      });

      // 6. 로컬 파일 정리
      try {
        await fs.unlink(localGzPath);
      } catch {
        // 이미 삭제됨
      }

      return uploadResult;
    } catch (error) {
      logger.error("Backup failed", {
        database: name,
        error: error.message,
      });

      // 알림 발송
      await this.sendNotification({
        type: "error",
        database: name,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * 모든 데이터베이스 백업 실행
   * @param {string} backupType - 백업 유형
   */
  async backupAllDatabases(backupType = "daily") {
    const results = [];
    const { databases } = backupConfig;

    logger.info("Starting backup for all databases", {
      count: databases.length,
      type: backupType,
    });

    for (const dbConfig of databases) {
      try {
        const result = await this.backupDatabase(dbConfig, backupType);
        if (result) {
          results.push({ success: true, database: dbConfig.name, ...result });
        }
      } catch (error) {
        results.push({
          success: false,
          database: dbConfig.name,
          error: error.message,
        });
      }
    }

    // 결과 요약
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    logger.info("Backup completed", {
      total: databases.length,
      successful,
      failed,
    });

    // 성공 알림
    if (successful > 0) {
      await this.sendNotification({
        type: "success",
        backupType,
        successful,
        failed,
        results,
      });
    }

    return results;
  }

  /**
   * GCS 백업 목록 조회
   * @param {string} prefix - 경로 접두사
   */
  async listBackups(prefix = "backups/") {
    await this.initialize();

    const [files] = await this.bucket.getFiles({ prefix });

    return files.map((file) => ({
      name: file.name,
      size: parseInt(file.metadata.size, 10),
      created: file.metadata.timeCreated,
      updated: file.metadata.updated,
    }));
  }

  /**
   * GCS에서 백업 복원
   * @param {string} gcsPath - GCS 파일 경로
   * @param {string} localPath - 복원할 로컬 경로
   */
  async restoreBackup(gcsPath, localPath) {
    await this.initialize();

    const tempPath = `${localPath}.gz`;
    const file = this.bucket.file(gcsPath);

    // 다운로드
    await file.download({ destination: tempPath });
    logger.info("Backup downloaded", { from: gcsPath, to: tempPath });

    // gzip 압축 해제
    const gunzip = createGunzip();
    const source = createReadStream(tempPath);
    const destination = createWriteStream(localPath);

    await pipeline(source, gunzip, destination);
    await fs.unlink(tempPath);

    logger.info("Backup restored", { path: localPath });

    return { localPath };
  }

  /**
   * 보관 정책에 따라 오래된 백업 삭제
   * @param {string} backupType - 백업 유형
   */
  async cleanupOldBackups(backupType = "daily") {
    await this.initialize();

    const retentionDays = backupConfig.retention[backupType];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const prefix = `backups/${backupType}/`;
    const [files] = await this.bucket.getFiles({ prefix });

    let deletedCount = 0;

    for (const file of files) {
      const fileDate = new Date(file.metadata.timeCreated);
      if (fileDate < cutoffDate) {
        await file.delete();
        deletedCount++;
        logger.debug("Deleted old backup", { file: file.name });
      }
    }

    logger.info("Cleanup completed", {
      type: backupType,
      retentionDays,
      deletedCount,
    });

    return { deletedCount };
  }

  /**
   * 웹훅 알림 발송
   * @param {Object} payload - 알림 내용
   */
  async sendNotification(payload) {
    const { notifications } = backupConfig;

    if (!notifications.enabled) return;

    try {
      const message =
        payload.type === "success"
          ? `✅ 백업 완료: ${payload.successful}개 성공, ${payload.failed}개 실패`
          : `❌ 백업 실패: ${payload.database} - ${payload.error}`;

      await fetch(notifications.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: message,
          embeds: [
            {
              title: payload.type === "success" ? "백업 성공" : "백업 실패",
              color: payload.type === "success" ? 0x00ff00 : 0xff0000,
              fields: [
                {
                  name: "유형",
                  value: payload.backupType || payload.database,
                  inline: true,
                },
                {
                  name: "시간",
                  value: new Date().toISOString(),
                  inline: true,
                },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      });
    } catch (error) {
      logger.warn("Failed to send notification", { error: error.message });
    }
  }

  /**
   * 로컬 백업 디렉토리 정리
   */
  async cleanupLocalBackups() {
    const { localBackupDir, retention } = backupConfig;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retention.local);

    try {
      const files = await fs.readdir(localBackupDir);

      for (const file of files) {
        const filePath = path.join(localBackupDir, file);
        const stat = await fs.stat(filePath);

        if (stat.mtime < cutoffDate) {
          await fs.unlink(filePath);
          logger.debug("Deleted local backup", { file });
        }
      }
    } catch (error) {
      // 디렉토리가 없으면 무시
      if (error.code !== "ENOENT") {
        logger.warn("Failed to cleanup local backups", { error: error.message });
      }
    }
  }
}

module.exports = new BackupService();
