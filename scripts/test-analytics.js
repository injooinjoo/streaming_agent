#!/usr/bin/env node
/**
 * Analytics Collector 테스트 스크립트
 *
 * 사용법:
 *   node scripts/test-analytics.js [옵션]
 *
 * 옵션:
 *   --dry-run       실제 DB 저장 없이 API/WS 테스트만
 *   --duration <분>  실행 시간 (기본: 5분)
 *   --max-ws <수>    최대 WebSocket 연결 수 (기본: 10)
 *   --min-viewers <수> 최소 시청자 수 (기본: 500)
 */

const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const { initializeAnalyticsDatabase } = require("../server/db/init-analytics");
const { AnalyticsCollector } = require("../server/services/analytics");

// 색상
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  gray: "\x1b[90m",
};

// 인자 파싱
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const durationIdx = args.indexOf("--duration");
const duration = durationIdx !== -1 ? parseInt(args[durationIdx + 1], 10) : 5;
const maxWsIdx = args.indexOf("--max-ws");
const maxWs = maxWsIdx !== -1 ? parseInt(args[maxWsIdx + 1], 10) : 10;
const minViewersIdx = args.indexOf("--min-viewers");
const minViewers = minViewersIdx !== -1 ? parseInt(args[minViewersIdx + 1], 10) : 500;

console.log(`
${colors.bright}${colors.cyan}📊 Analytics Collector 테스트${colors.reset}
${colors.gray}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}
${colors.yellow}모드:${colors.reset} ${dryRun ? "Dry Run (DB 저장 안함)" : "실제 수집"}
${colors.yellow}실행 시간:${colors.reset} ${duration}분
${colors.yellow}최대 WebSocket:${colors.reset} ${maxWs}개
${colors.yellow}최소 시청자:${colors.reset} ${minViewers}명
${colors.gray}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}
`);

async function main() {
  // DB 초기화
  const dbPath = dryRun
    ? ":memory:"
    : path.join(__dirname, "../data/analytics.db");

  if (!dryRun) {
    const fs = require("fs");
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  console.log(`${colors.yellow}DB:${colors.reset} ${dbPath}`);

  const db = new sqlite3.Database(dbPath);

  // Analytics 스키마 초기화
  console.log(`\n${colors.cyan}스키마 초기화 중...${colors.reset}`);
  await initializeAnalyticsDatabase(db);
  console.log(`${colors.green}✅ 스키마 초기화 완료${colors.reset}`);

  // 설정 업데이트 (테스트용)
  await new Promise((resolve, reject) => {
    db.run(
      `UPDATE monitoring_config SET config_value = ? WHERE config_key = 'max_websocket_connections'`,
      [maxWs.toString()],
      (err) => (err ? reject(err) : resolve())
    );
  });

  await new Promise((resolve, reject) => {
    db.run(
      `UPDATE monitoring_config SET config_value = ? WHERE config_key = 'min_viewers_threshold'`,
      [minViewers.toString()],
      (err) => (err ? reject(err) : resolve())
    );
  });

  // Collector 생성
  const collector = new AnalyticsCollector(db, {
    maxWebSocketConnections: maxWs,
    minViewersThreshold: minViewers,
    snapshotIntervalSeconds: 60, // 테스트용 1분
    apiPollingIntervalSeconds: 60, // 테스트용 1분
  });

  // 이벤트 리스너
  collector.on("api-poll-complete", (data) => {
    console.log(
      `\n${colors.green}📡 API Poll:${colors.reset} ${data.broadcastCount}개 방송, ${data.wsTargetCount}개 WS 대상`
    );
  });

  collector.on("snapshot-complete", (data) => {
    console.log(
      `${colors.green}📸 Snapshot:${colors.reset} ${data.broadcastCount}개 방송에서 ${data.viewerCount}명 시청자 기록`
    );
  });

  collector.on("donation", (data) => {
    const emoji =
      data.donationType === "balloon"
        ? "🎈"
        : data.donationType === "subscribe"
          ? "⭐"
          : "🎁";
    console.log(
      `${colors.yellow}${emoji} 후원:${colors.reset} ${data.senderNickname} → ${data.receiverUserId} (${data.donationType}: ${data.count}개)`
    );
  });

  collector.on("error", (err) => {
    console.error(`${colors.red}❌ Error:${colors.reset}`, err.message);
  });

  // 시작
  console.log(`\n${colors.cyan}수집기 시작...${colors.reset}`);
  await collector.start();

  // 상태 출력 타이머 (10초마다, 간결하게)
  let lastViewerTotal = 0;
  const statusInterval = setInterval(() => {
    const status = collector.getStatus();
    const wsStatus = collector.wsManager?.getConnectionStatus() || [];
    const totalViewers = wsStatus.reduce((sum, s) => sum + s.viewerCount, 0);

    // 시청자 수 변화 있을 때만 출력
    if (totalViewers !== lastViewerTotal) {
      console.log(
        `${colors.gray}[${new Date().toLocaleTimeString('ko-KR')}]${colors.reset} WS ${status.wsConnections}개 | 시청자 ${totalViewers.toLocaleString()}명 수집 중`
      );
      lastViewerTotal = totalViewers;
    }
  }, 10000);

  // 종료 타이머
  setTimeout(async () => {
    console.log(`\n${colors.yellow}⏰ ${duration}분 경과, 종료합니다...${colors.reset}`);

    clearInterval(statusInterval);
    await collector.stop();

    // 결과 출력
    await printResults(db);

    db.close();
    process.exit(0);
  }, duration * 60 * 1000);

  // Ctrl+C 처리
  process.on("SIGINT", async () => {
    console.log(`\n${colors.yellow}종료 중...${colors.reset}`);
    clearInterval(statusInterval);
    await collector.stop();
    await printResults(db);
    db.close();
    process.exit(0);
  });
}

async function printResults(db) {
  console.log(`\n${colors.bright}${colors.cyan}📊 수집 결과${colors.reset}`);
  console.log(`${colors.gray}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);

  // 방송 수
  const broadcasts = await query(db, `SELECT COUNT(*) as cnt FROM broadcasts`);
  console.log(`${colors.yellow}방송:${colors.reset} ${broadcasts[0]?.cnt || 0}개`);

  // 스트리머 수
  const streamers = await query(
    db,
    `SELECT COUNT(*) as cnt FROM platform_users WHERE is_streamer = 1`
  );
  console.log(`${colors.yellow}스트리머:${colors.reset} ${streamers[0]?.cnt || 0}명`);

  // 시청자 수
  const viewers = await query(
    db,
    `SELECT COUNT(DISTINCT viewer_id) as cnt FROM viewing_records`
  );
  console.log(`${colors.yellow}유니크 시청자:${colors.reset} ${viewers[0]?.cnt || 0}명`);

  // 시청 기록 수
  const records = await query(db, `SELECT COUNT(*) as cnt FROM viewing_records`);
  console.log(`${colors.yellow}시청 기록:${colors.reset} ${records[0]?.cnt || 0}개`);

  // 후원 수
  const donations = await query(db, `SELECT COUNT(*) as cnt FROM donations`);
  console.log(`${colors.yellow}후원:${colors.reset} ${donations[0]?.cnt || 0}건`);

  // 스냅샷 수
  const snapshots = await query(db, `SELECT COUNT(*) as cnt FROM broadcast_snapshots`);
  console.log(`${colors.yellow}스냅샷:${colors.reset} ${snapshots[0]?.cnt || 0}개`);

  console.log(`${colors.gray}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);

  // 상위 시청자 (가장 많은 방송 본 사람)
  const topViewers = await query(
    db,
    `SELECT viewer_username, COUNT(DISTINCT broadcast_id) as streams
     FROM viewing_records
     GROUP BY viewer_id
     ORDER BY streams DESC
     LIMIT 5`
  );

  if (topViewers.length > 0) {
    console.log(`\n${colors.cyan}🏆 다시청 유저 TOP 5:${colors.reset}`);
    for (const v of topViewers) {
      console.log(`  ${v.viewer_username}: ${v.streams}개 방송`);
    }
  }
}

function query(db, sql) {
  return new Promise((resolve, reject) => {
    db.all(sql, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

main().catch((err) => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, err);
  process.exit(1);
});
