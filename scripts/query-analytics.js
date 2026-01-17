#!/usr/bin/env node
/**
 * Analytics Query CLI
 *
 * 수집된 데이터 조회 스크립트
 *
 * 사용법:
 *   node scripts/query-analytics.js [명령] [옵션]
 *
 * 명령:
 *   --streamer <username>           스트리머 통계
 *   --viewer-history <username>     시청자 시청 기록
 *   --overlap <streamerA> <B>       겹시청자 분석
 *   --donation-rank <username>      후원 랭킹
 *   --broadcast <broadcastId>       방송 추이
 *   --top-viewers                   다시청 유저
 *   --daily <YYYY-MM-DD>            일별 요약
 *   --summary                       전체 요약
 */

const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const { AnalyticsQuery } = require("../server/services/analytics");

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
  magenta: "\x1b[35m",
};

// 인자 파싱
const args = process.argv.slice(2);

function getArg(flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : null;
}

function hasFlag(flag) {
  return args.includes(flag);
}

async function main() {
  const dbPath = path.join(__dirname, "../data/analytics.db");
  const db = new sqlite3.Database(dbPath);
  const query = new AnalyticsQuery(db);

  console.log(`\n${colors.bright}${colors.cyan}📊 Analytics Query${colors.reset}`);
  console.log(`${colors.gray}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  try {
    // --summary: 전체 요약
    if (hasFlag("--summary")) {
      await showSummary(db);
    }
    // --streamer: 스트리머 통계
    else if (getArg("--streamer")) {
      const streamerId = getArg("--streamer");
      await showStreamerStats(query, streamerId);
    }
    // --viewer-history: 시청자 기록
    else if (getArg("--viewer-history")) {
      const userId = getArg("--viewer-history");
      await showViewerHistory(query, userId);
    }
    // --overlap: 겹시청자
    else if (hasFlag("--overlap")) {
      const idx = args.indexOf("--overlap");
      const streamerA = args[idx + 1];
      const streamerB = args[idx + 2];
      if (!streamerA || !streamerB) {
        console.error(`${colors.red}Error: --overlap requires two streamer usernames${colors.reset}`);
        process.exit(1);
      }
      await showOverlap(query, streamerA, streamerB);
    }
    // --donation-rank: 후원 랭킹
    else if (getArg("--donation-rank")) {
      const streamerId = getArg("--donation-rank");
      await showDonationRanking(query, streamerId);
    }
    // --broadcast: 방송 추이
    else if (getArg("--broadcast")) {
      const broadcastId = getArg("--broadcast");
      await showBroadcastTrend(query, broadcastId);
    }
    // --top-viewers: 다시청 유저
    else if (hasFlag("--top-viewers")) {
      await showTopViewers(query);
    }
    // --daily: 일별 요약
    else if (getArg("--daily")) {
      const date = getArg("--daily");
      await showDailySummary(query, date);
    }
    // 도움말
    else {
      showHelp();
    }
  } catch (err) {
    console.error(`${colors.red}Error: ${err.message}${colors.reset}`);
  } finally {
    db.close();
  }
}

function showHelp() {
  console.log(`${colors.yellow}사용법:${colors.reset}`);
  console.log(`  node scripts/query-analytics.js [명령] [옵션]\n`);
  console.log(`${colors.yellow}명령:${colors.reset}`);
  console.log(`  --summary                       전체 요약`);
  console.log(`  --streamer <username>           스트리머 통계`);
  console.log(`  --viewer-history <username>     시청자 시청 기록`);
  console.log(`  --overlap <streamerA> <B>       겹시청자 분석`);
  console.log(`  --donation-rank <username>      후원 랭킹`);
  console.log(`  --broadcast <broadcastId>       방송 추이`);
  console.log(`  --top-viewers                   다시청 유저`);
  console.log(`  --daily <YYYY-MM-DD>            일별 요약\n`);
  console.log(`${colors.yellow}예시:${colors.reset}`);
  console.log(`  node scripts/query-analytics.js --summary`);
  console.log(`  node scripts/query-analytics.js --streamer bj_username`);
  console.log(`  node scripts/query-analytics.js --overlap streamerA streamerB`);
}

async function showSummary(db) {
  console.log(`${colors.cyan}📈 전체 데이터 요약${colors.reset}\n`);

  const queries = {
    broadcasts: `SELECT COUNT(*) as cnt FROM broadcasts`,
    liveBroadcasts: `SELECT COUNT(*) as cnt FROM broadcasts WHERE is_live = 1`,
    streamers: `SELECT COUNT(*) as cnt FROM platform_users WHERE is_streamer = 1`,
    viewers: `SELECT COUNT(DISTINCT viewer_id) as cnt FROM viewing_records`,
    viewingRecords: `SELECT COUNT(*) as cnt FROM viewing_records`,
    donations: `SELECT COUNT(*) as cnt, SUM(amount_krw) as total FROM donations`,
    stats5min: `SELECT COUNT(*) as cnt FROM broadcast_stats_5min`,
    changes: `SELECT COUNT(*) as cnt FROM broadcast_changes`,
  };

  for (const [key, sql] of Object.entries(queries)) {
    const row = await queryOne(db, sql);
    switch (key) {
      case "broadcasts":
        console.log(`${colors.yellow}총 방송:${colors.reset} ${row?.cnt || 0}개`);
        break;
      case "liveBroadcasts":
        console.log(`${colors.yellow}현재 라이브:${colors.reset} ${row?.cnt || 0}개`);
        break;
      case "streamers":
        console.log(`${colors.yellow}스트리머:${colors.reset} ${row?.cnt || 0}명`);
        break;
      case "viewers":
        console.log(`${colors.yellow}유니크 시청자:${colors.reset} ${(row?.cnt || 0).toLocaleString()}명`);
        break;
      case "viewingRecords":
        console.log(`${colors.yellow}시청 기록:${colors.reset} ${(row?.cnt || 0).toLocaleString()}개`);
        break;
      case "donations":
        console.log(`${colors.yellow}후원:${colors.reset} ${row?.cnt || 0}건 (${(row?.total || 0).toLocaleString()}원)`);
        break;
      case "stats5min":
        console.log(`${colors.yellow}5분 통계:${colors.reset} ${(row?.cnt || 0).toLocaleString()}개`);
        break;
      case "changes":
        console.log(`${colors.yellow}변경 이력:${colors.reset} ${row?.cnt || 0}건`);
        break;
    }
  }
}

async function showStreamerStats(query, streamerId) {
  console.log(`${colors.cyan}📊 스트리머 통계: ${streamerId}${colors.reset}\n`);

  const stats = await query.getStreamerStats(streamerId);

  if (!stats) {
    console.log(`${colors.red}스트리머를 찾을 수 없습니다: ${streamerId}${colors.reset}`);
    return;
  }

  console.log(`${colors.yellow}닉네임:${colors.reset} ${stats.streamer.nickname || "N/A"}`);
  console.log(`${colors.yellow}총 방송:${colors.reset} ${stats.broadcasts?.total_broadcasts || 0}회`);
  console.log(`${colors.yellow}총 방송 시간:${colors.reset} ${formatDuration(stats.broadcasts?.total_duration || 0)}`);
  console.log(`${colors.yellow}평균 시청자:${colors.reset} ${Math.round(stats.broadcasts?.avg_viewers || 0)}명`);
  console.log(`${colors.yellow}최고 시청자:${colors.reset} ${stats.broadcasts?.peak_viewers || 0}명`);
  console.log(`${colors.yellow}유니크 시청자:${colors.reset} ${stats.uniqueViewers.toLocaleString()}명`);
  console.log(`${colors.yellow}총 후원:${colors.reset} ${stats.donations?.total_donations || 0}건`);
  console.log(`${colors.yellow}후원 금액:${colors.reset} ${(stats.donations?.total_amount || 0).toLocaleString()}원`);
  console.log(`${colors.yellow}유니크 후원자:${colors.reset} ${stats.donations?.unique_donors || 0}명`);
}

async function showViewerHistory(query, userId) {
  console.log(`${colors.cyan}👤 시청자 기록: ${userId}${colors.reset}\n`);

  const history = await query.getViewerHistory(userId);

  if (!history.user) {
    console.log(`${colors.red}시청자를 찾을 수 없습니다: ${userId}${colors.reset}`);
    return;
  }

  console.log(`${colors.yellow}닉네임:${colors.reset} ${history.user.nickname || "N/A"}`);
  console.log(`${colors.yellow}총 시청 방송:${colors.reset} ${history.totalBroadcasts}개`);
  console.log(`${colors.yellow}시청한 스트리머:${colors.reset} ${history.totalStreamers}명`);
  console.log(`${colors.yellow}추정 시청 시간:${colors.reset} ${history.estimatedWatchMinutes}분\n`);

  if (history.sessions.length > 0) {
    console.log(`${colors.cyan}스트리머별 시청 기록:${colors.reset}`);
    for (const session of history.sessions.slice(0, 10)) {
      console.log(
        `  ${session.streamer_nickname || session.streamer_username}: ` +
          `${session.broadcasts_watched}개 방송, ${session.snapshot_count * 5}분`
      );
    }
  }
}

async function showOverlap(query, streamerA, streamerB) {
  console.log(`${colors.cyan}🔀 겹시청자 분석: ${streamerA} vs ${streamerB}${colors.reset}\n`);

  const overlap = await query.getOverlapViewers(streamerA, streamerB);

  console.log(`${colors.yellow}${streamerA} 시청자:${colors.reset} ${overlap.streamerA.uniqueViewers}명`);
  console.log(`${colors.yellow}${streamerB} 시청자:${colors.reset} ${overlap.streamerB.uniqueViewers}명`);
  console.log(`${colors.yellow}겹시청자:${colors.reset} ${overlap.overlapCount}명`);
  console.log(
    `${colors.yellow}겹시청 비율:${colors.reset} ` +
      `${streamerA}의 ${(overlap.overlapRatioA * 100).toFixed(1)}%, ` +
      `${streamerB}의 ${(overlap.overlapRatioB * 100).toFixed(1)}%`
  );

  if (overlap.topOverlapViewers.length > 0) {
    console.log(`\n${colors.cyan}TOP 겹시청자:${colors.reset}`);
    for (const viewer of overlap.topOverlapViewers.slice(0, 10)) {
      console.log(
        `  ${viewer.nickname || viewer.viewer_username}: ` +
          `${streamerA} ${viewer.broadcasts_a}회, ${streamerB} ${viewer.broadcasts_b}회`
      );
    }
  }
}

async function showDonationRanking(query, streamerId) {
  console.log(`${colors.cyan}💰 후원 랭킹: ${streamerId}${colors.reset}\n`);

  const ranking = await query.getDonationRanking(streamerId);

  if (ranking.length === 0) {
    console.log(`${colors.gray}후원 기록이 없습니다.${colors.reset}`);
    return;
  }

  for (let i = 0; i < Math.min(20, ranking.length); i++) {
    const donor = ranking[i];
    console.log(
      `${colors.yellow}${i + 1}.${colors.reset} ${donor.sender_nickname || donor.sender_username}: ` +
        `${donor.total_amount.toLocaleString()}원 (${donor.donation_count}회)`
    );
  }
}

async function showBroadcastTrend(query, broadcastId) {
  console.log(`${colors.cyan}📺 방송 추이: ${broadcastId}${colors.reset}\n`);

  const trend = await query.getBroadcastTrend(broadcastId);

  if (!trend) {
    console.log(`${colors.red}방송을 찾을 수 없습니다: ${broadcastId}${colors.reset}`);
    return;
  }

  console.log(`${colors.yellow}제목:${colors.reset} ${trend.broadcast.title}`);
  console.log(`${colors.yellow}스트리머:${colors.reset} ${trend.broadcast.streamer_username}`);
  console.log(`${colors.yellow}시작:${colors.reset} ${trend.broadcast.started_at}`);
  console.log(`${colors.yellow}라이브:${colors.reset} ${trend.broadcast.is_live ? "Yes" : "No"}`);

  if (trend.stats5min.length > 0) {
    console.log(`\n${colors.cyan}5분 통계 (최근 5개):${colors.reset}`);
    for (const stat of trend.stats5min.slice(-5)) {
      console.log(
        `  ${stat.snapshot_at}: ` +
          `시청자 ${stat.viewer_count}, ` +
          `구독 ${(stat.subscriber_ratio * 100).toFixed(1)}%, ` +
          `팬 ${(stat.fan_ratio * 100).toFixed(1)}%, ` +
          `채팅 ${stat.chat_count}`
      );
    }
  }

  if (trend.changes.length > 0) {
    console.log(`\n${colors.cyan}변경 이력:${colors.reset}`);
    for (const change of trend.changes) {
      console.log(`  [${change.changed_at}] ${change.field_name}: "${change.old_value}" → "${change.new_value}"`);
    }
  }

  if (trend.donations.length > 0) {
    console.log(`\n${colors.cyan}후원 통계:${colors.reset}`);
    for (const donation of trend.donations) {
      console.log(`  ${donation.donation_type}: ${donation.count}건, ${donation.total_amount.toLocaleString()}원`);
    }
  }
}

async function showTopViewers(query) {
  console.log(`${colors.cyan}🏆 다시청 유저 TOP 20${colors.reset}\n`);

  const topViewers = await query.getTopViewers({ limit: 20, minBroadcasts: 1 });

  if (topViewers.length === 0) {
    console.log(`${colors.gray}시청 기록이 없습니다.${colors.reset}`);
    return;
  }

  for (let i = 0; i < topViewers.length; i++) {
    const viewer = topViewers[i];
    console.log(
      `${colors.yellow}${i + 1}.${colors.reset} ${viewer.nickname || viewer.viewer_username}: ` +
        `${viewer.broadcasts_watched}개 방송, ${viewer.streamers_watched}명 스트리머, ` +
        `${viewer.estimated_watch_minutes}분`
    );
  }
}

async function showDailySummary(query, date) {
  console.log(`${colors.cyan}📅 일별 요약: ${date}${colors.reset}\n`);

  const summary = await query.getDailySummary(date);

  console.log(`${colors.yellow}방송:${colors.reset} ${summary.broadcasts?.total_broadcasts || 0}개`);
  console.log(`${colors.yellow}스트리머:${colors.reset} ${summary.broadcasts?.unique_streamers || 0}명`);
  console.log(`${colors.yellow}유니크 시청자:${colors.reset} ${summary.uniqueViewers}명`);
  console.log(`${colors.yellow}후원:${colors.reset} ${summary.donations?.total_donations || 0}건`);
  console.log(`${colors.yellow}후원 금액:${colors.reset} ${(summary.donations?.total_amount || 0).toLocaleString()}원`);
}

// 유틸리티
function queryOne(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function formatDuration(seconds) {
  if (!seconds) return "0분";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}시간 ${minutes}분`;
  }
  return `${minutes}분`;
}

main().catch((err) => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, err);
  process.exit(1);
});
