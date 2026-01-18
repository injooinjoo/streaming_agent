#!/usr/bin/env node

/**
 * SQLite → GCS 백업 CLI 스크립트
 *
 * Usage:
 *   node backup-to-gcs.js              # 일일 백업 실행
 *   node backup-to-gcs.js --weekly     # 주간 백업 실행
 *   node backup-to-gcs.js --monthly    # 월간 백업 실행
 *   node backup-to-gcs.js --list       # 백업 목록 조회
 *   node backup-to-gcs.js --restore <gcs-path> <local-path>  # 복원
 *   node backup-to-gcs.js --cleanup    # 오래된 백업 정리
 *   node backup-to-gcs.js --scheduler  # 스케줄러 모드 (node-cron)
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const cron = require("node-cron");
const backupService = require("../services/backupService");
const backupConfig = require("../config/backup.config");
const loggers = require("../services/logger");

const logger = loggers.createChildLogger({ service: "backup-cli" });

// CLI 인자 파싱
const args = process.argv.slice(2);
const command = args[0];

/**
 * 백업 실행
 */
async function runBackup(type = "daily") {
  console.log(`\n🔄 Starting ${type} backup...\n`);

  try {
    const results = await backupService.backupAllDatabases(type);

    console.log("\n📊 Backup Results:");
    console.log("─".repeat(50));

    for (const result of results) {
      if (result.success) {
        console.log(`  ✅ ${result.database}`);
        console.log(`     GCS: ${result.gcsPath}`);
        console.log(`     Size: ${formatBytes(result.size)}`);
      } else {
        console.log(`  ❌ ${result.database}`);
        console.log(`     Error: ${result.error}`);
      }
      console.log("");
    }

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log("─".repeat(50));
    console.log(`Total: ${results.length} | Success: ${successful} | Failed: ${failed}`);
    console.log("");

    // 로컬 정리
    await backupService.cleanupLocalBackups();

    return results;
  } catch (error) {
    console.error(`\n❌ Backup failed: ${error.message}\n`);
    process.exit(1);
  }
}

/**
 * 백업 목록 조회
 */
async function listBackups(prefix = "backups/") {
  console.log("\n📋 Backup List\n");

  try {
    const backups = await backupService.listBackups(prefix);

    if (backups.length === 0) {
      console.log("  No backups found.\n");
      return;
    }

    // 유형별 그룹화
    const grouped = {
      daily: [],
      weekly: [],
      monthly: [],
    };

    for (const backup of backups) {
      if (backup.name.includes("/daily/")) {
        grouped.daily.push(backup);
      } else if (backup.name.includes("/weekly/")) {
        grouped.weekly.push(backup);
      } else if (backup.name.includes("/monthly/")) {
        grouped.monthly.push(backup);
      }
    }

    for (const [type, items] of Object.entries(grouped)) {
      if (items.length > 0) {
        console.log(`\n📁 ${type.toUpperCase()} (${items.length})`);
        console.log("─".repeat(60));

        // 최근 5개만 표시
        const recent = items.slice(-5);
        for (const item of recent) {
          const date = new Date(item.created).toLocaleString("ko-KR");
          console.log(`  ${item.name.split("/").pop()}`);
          console.log(`    Size: ${formatBytes(item.size)} | Created: ${date}`);
        }

        if (items.length > 5) {
          console.log(`  ... and ${items.length - 5} more`);
        }
      }
    }

    console.log("\n");
  } catch (error) {
    console.error(`\n❌ Failed to list backups: ${error.message}\n`);
    process.exit(1);
  }
}

/**
 * 백업 복원
 */
async function restoreBackup(gcsPath, localPath) {
  console.log(`\n🔄 Restoring backup...\n`);
  console.log(`  From: ${gcsPath}`);
  console.log(`  To:   ${localPath}\n`);

  try {
    const result = await backupService.restoreBackup(gcsPath, localPath);
    console.log(`✅ Backup restored successfully!\n`);
    console.log(`  Path: ${result.localPath}\n`);
  } catch (error) {
    console.error(`\n❌ Restore failed: ${error.message}\n`);
    process.exit(1);
  }
}

/**
 * 오래된 백업 정리
 */
async function cleanupBackups() {
  console.log("\n🧹 Cleaning up old backups...\n");

  try {
    for (const type of ["daily", "weekly", "monthly"]) {
      const result = await backupService.cleanupOldBackups(type);
      console.log(`  ${type}: ${result.deletedCount} files deleted`);
    }

    // 로컬 정리
    await backupService.cleanupLocalBackups();
    console.log(`  local: cleanup completed`);

    console.log("\n✅ Cleanup completed!\n");
  } catch (error) {
    console.error(`\n❌ Cleanup failed: ${error.message}\n`);
    process.exit(1);
  }
}

/**
 * 스케줄러 모드 실행
 */
function startScheduler() {
  console.log("\n⏰ Backup Scheduler Started\n");
  console.log("Schedule:");
  console.log(`  Daily:   ${backupConfig.schedule.daily} (04:00 KST)`);
  console.log(`  Weekly:  ${backupConfig.schedule.weekly} (Sunday 04:00 KST)`);
  console.log(`  Monthly: ${backupConfig.schedule.monthly} (1st 04:00 KST)`);
  console.log("\nPress Ctrl+C to stop.\n");

  // 일일 백업
  cron.schedule(backupConfig.schedule.daily, async () => {
    logger.info("Starting scheduled daily backup");
    await runBackup("daily");
    await backupService.cleanupOldBackups("daily");
  });

  // 주간 백업 (일요일)
  cron.schedule(backupConfig.schedule.weekly, async () => {
    const now = new Date();
    if (now.getDay() === 0) {
      // 일요일
      logger.info("Starting scheduled weekly backup");
      await runBackup("weekly");
      await backupService.cleanupOldBackups("weekly");
    }
  });

  // 월간 백업 (1일)
  cron.schedule(backupConfig.schedule.monthly, async () => {
    const now = new Date();
    if (now.getDate() === 1) {
      // 1일
      logger.info("Starting scheduled monthly backup");
      await runBackup("monthly");
      await backupService.cleanupOldBackups("monthly");
    }
  });

  // 프로세스 유지
  process.on("SIGINT", () => {
    console.log("\n\n👋 Scheduler stopped.\n");
    process.exit(0);
  });
}

/**
 * 바이트 포맷팅
 */
function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * 도움말 출력
 */
function showHelp() {
  console.log(`
SQLite → GCS 백업 도구

Usage:
  node backup-to-gcs.js [command] [options]

Commands:
  (none)              일일 백업 실행
  --daily             일일 백업 실행 (기본값)
  --weekly            주간 백업 실행
  --monthly           월간 백업 실행
  --list              GCS 백업 목록 조회
  --restore <gcs> <local>  백업 복원
  --cleanup           오래된 백업 정리
  --scheduler         스케줄러 모드 (cron)
  --help              도움말 표시

Examples:
  node backup-to-gcs.js
  node backup-to-gcs.js --list
  node backup-to-gcs.js --restore backups/daily/weflab/2024-01-15.db.gz ./restored.db
  node backup-to-gcs.js --scheduler

Environment Variables:
  GCS_BACKUP_BUCKET   GCS 버킷명 (기본: streaming-agent-backups)
  GCS_PROJECT_ID      GCP 프로젝트 ID (필수)
  GCS_KEY_FILE        서비스 계정 키 파일 경로
  BACKUP_WEBHOOK_URL  알림 웹훅 URL (Discord/Slack)
`);
}

/**
 * 메인 실행
 */
async function main() {
  switch (command) {
    case "--help":
    case "-h":
      showHelp();
      break;

    case "--list":
    case "-l":
      await listBackups(args[1]);
      break;

    case "--restore":
    case "-r":
      if (!args[1] || !args[2]) {
        console.error("\n❌ Error: Missing arguments for restore\n");
        console.log("Usage: node backup-to-gcs.js --restore <gcs-path> <local-path>\n");
        process.exit(1);
      }
      await restoreBackup(args[1], args[2]);
      break;

    case "--cleanup":
    case "-c":
      await cleanupBackups();
      break;

    case "--scheduler":
    case "-s":
      startScheduler();
      break;

    case "--daily":
    case "-d":
    case undefined:
      await runBackup("daily");
      break;

    case "--weekly":
    case "-w":
      await runBackup("weekly");
      break;

    case "--monthly":
    case "-m":
      await runBackup("monthly");
      break;

    default:
      console.error(`\n❌ Unknown command: ${command}\n`);
      showHelp();
      process.exit(1);
  }

  // 스케줄러 모드가 아니면 종료
  if (command !== "--scheduler" && command !== "-s") {
    process.exit(0);
  }
}

main().catch((error) => {
  console.error(`\n❌ Fatal error: ${error.message}\n`);
  process.exit(1);
});
