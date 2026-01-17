#!/usr/bin/env node

/**
 * Analytics Query CLI
 *
 * 수집된 데이터 조회 CLI 도구
 *
 * Usage:
 *   node scripts/query-analytics.js --streamer <username>
 *   node scripts/query-analytics.js --viewer <username>
 *   node scripts/query-analytics.js --overlap <streamerA> <streamerB>
 *   node scripts/query-analytics.js --donations <streamer> [--limit 20]
 *   node scripts/query-analytics.js --broadcast <broadcastId>
 *   node scripts/query-analytics.js --daily <YYYY-MM-DD>
 *   node scripts/query-analytics.js --top-viewers [--limit 50]
 *   node scripts/query-analytics.js --summary
 */

const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const AnalyticsQuery = require("../services/analytics/AnalyticsQuery");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

// SQLite connection
const dbPath = path.resolve(__dirname, "../weflab_clone.db");
const db = new sqlite3.Database(dbPath);
const query = new AnalyticsQuery(db);

// Parse arguments
const args = process.argv.slice(2);

function parseArgs() {
  const result = {
    command: null,
    args: [],
    options: {},
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith("--")) {
      const key = arg.slice(2);

      // Commands
      if (
        [
          "streamer",
          "viewer",
          "overlap",
          "donations",
          "broadcast",
          "daily",
          "top-viewers",
          "summary",
        ].includes(key)
      ) {
        result.command = key;

        // Collect non-option arguments
        while (i + 1 < args.length && !args[i + 1].startsWith("--")) {
          result.args.push(args[++i]);
        }
      } else {
        // Options
        if (i + 1 < args.length && !args[i + 1].startsWith("--")) {
          result.options[key] = args[++i];
        } else {
          result.options[key] = true;
        }
      }
    }
  }

  return result;
}

function formatNumber(num) {
  if (num == null) return "N/A";
  return num.toLocaleString();
}

function formatDuration(seconds) {
  if (!seconds) return "N/A";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function formatPercent(ratio) {
  if (ratio == null) return "N/A";
  return (ratio * 100).toFixed(2) + "%";
}

async function main() {
  const parsed = parseArgs();

  if (!parsed.command) {
    printHelp();
    process.exit(0);
  }

  try {
    switch (parsed.command) {
      case "streamer":
        await handleStreamer(parsed.args[0], parsed.options);
        break;
      case "viewer":
        await handleViewer(parsed.args[0], parsed.options);
        break;
      case "overlap":
        await handleOverlap(parsed.args[0], parsed.args[1]);
        break;
      case "donations":
        await handleDonations(parsed.args[0], parsed.options);
        break;
      case "broadcast":
        await handleBroadcast(parsed.args[0]);
        break;
      case "daily":
        await handleDaily(parsed.args[0]);
        break;
      case "top-viewers":
        await handleTopViewers(parsed.options);
        break;
      case "summary":
        await handleSummary();
        break;
      default:
        console.error(`Unknown command: ${parsed.command}`);
        printHelp();
    }
  } catch (err) {
    console.error("Error:", err.message);
  }

  db.close();
}

function printHelp() {
  console.log(`
Analytics Query CLI

Usage:
  node scripts/query-analytics.js <command> [args] [options]

Commands:
  --streamer <username>              스트리머 통계 조회
  --viewer <username>                시청자 시청 기록 조회
  --overlap <streamerA> <streamerB>  겹시청자 분석
  --donations <streamer>             후원 랭킹 조회
    --limit <n>                      결과 수 제한 (기본: 20)
  --broadcast <broadcastId>          방송 상세 조회
  --daily <YYYY-MM-DD>               일별 요약
  --top-viewers                      다시청 유저 조회
    --limit <n>                      결과 수 제한 (기본: 50)
  --summary                          전체 데이터 요약

Examples:
  node scripts/query-analytics.js --streamer khm11903
  node scripts/query-analytics.js --viewer myviewerid
  node scripts/query-analytics.js --overlap khm11903 ohmytwice
  node scripts/query-analytics.js --donations khm11903 --limit 10
  node scripts/query-analytics.js --broadcast 123456789
  node scripts/query-analytics.js --daily 2025-01-17
`);
}

async function handleStreamer(streamerId, options) {
  if (!streamerId) {
    console.error("Error: streamer username required");
    return;
  }

  console.log(`\n📊 Streamer Stats: ${streamerId}\n`);
  console.log("─".repeat(50));

  const stats = await query.getStreamerStats(streamerId, options);

  if (!stats) {
    console.log("Streamer not found");
    return;
  }

  console.log(`\n👤 Profile`);
  console.log(`  Username:  ${stats.streamer.username}`);
  console.log(`  Nickname:  ${stats.streamer.nickname || "N/A"}`);
  console.log(`  First Seen: ${stats.streamer.first_seen_at}`);
  console.log(`  Last Seen:  ${stats.streamer.last_seen_at}`);

  console.log(`\n📺 Broadcasts`);
  console.log(`  Total:        ${formatNumber(stats.broadcasts?.total_broadcasts)}`);
  console.log(`  Duration:     ${formatDuration(stats.broadcasts?.total_duration)}`);
  console.log(`  Peak Viewers: ${formatNumber(stats.broadcasts?.peak_viewers)}`);
  console.log(`  Avg Viewers:  ${stats.broadcasts?.avg_viewers?.toFixed(1) || "N/A"}`);
  console.log(`  Broadcast Days: ${formatNumber(stats.broadcasts?.broadcast_days)}`);

  console.log(`\n👥 Viewers`);
  console.log(`  Unique Viewers: ${formatNumber(stats.uniqueViewers)}`);

  console.log(`\n💰 Donations`);
  console.log(`  Total:       ${formatNumber(stats.donations?.total_donations)}`);
  console.log(`  Amount:      ₩${formatNumber(stats.donations?.total_amount)}`);
  console.log(`  Unique Donors: ${formatNumber(stats.donations?.unique_donors)}`);
}

async function handleViewer(viewerId, options) {
  if (!viewerId) {
    console.error("Error: viewer username required");
    return;
  }

  console.log(`\n👀 Viewer History: ${viewerId}\n`);
  console.log("─".repeat(50));

  const history = await query.getViewerHistory(viewerId, options);

  if (!history || !history.user) {
    console.log("Viewer not found");
    return;
  }

  console.log(`\n👤 Profile`);
  console.log(`  Username:  ${history.user.username}`);
  console.log(`  Nickname:  ${history.user.nickname || "N/A"}`);
  console.log(`  First Seen: ${history.user.first_seen_at}`);
  console.log(`  Last Seen:  ${history.user.last_seen_at}`);

  console.log(`\n📊 Statistics`);
  console.log(`  Broadcasts Watched: ${formatNumber(history.totalBroadcasts)}`);
  console.log(`  Streamers Watched:  ${formatNumber(history.totalStreamers)}`);
  console.log(`  Est. Watch Time:    ${formatDuration(history.estimatedWatchMinutes * 60)}`);

  console.log(`\n📺 Top Streamers Watched`);
  if (history.sessions.length === 0) {
    console.log("  No viewing records found");
  } else {
    for (const session of history.sessions.slice(0, 10)) {
      console.log(
        `  ${session.streamer_nickname || session.streamer_username}: ` +
          `${session.broadcasts_watched} broadcasts, ` +
          `~${session.snapshot_count * 5} mins`
      );
    }
  }
}

async function handleOverlap(streamerA, streamerB) {
  if (!streamerA || !streamerB) {
    console.error("Error: two streamer usernames required");
    return;
  }

  console.log(`\n🔄 Overlap Analysis: ${streamerA} vs ${streamerB}\n`);
  console.log("─".repeat(50));

  const result = await query.getOverlapViewers(streamerA, streamerB);

  console.log(`\n📊 Summary`);
  console.log(`  ${streamerA}: ${formatNumber(result.streamerA.uniqueViewers)} unique viewers`);
  console.log(`  ${streamerB}: ${formatNumber(result.streamerB.uniqueViewers)} unique viewers`);
  console.log(`  Overlap: ${formatNumber(result.overlapCount)} viewers`);
  console.log(`  Overlap Ratio (A): ${formatPercent(result.overlapRatioA)}`);
  console.log(`  Overlap Ratio (B): ${formatPercent(result.overlapRatioB)}`);

  console.log(`\n👥 Top Overlap Viewers`);
  if (result.topOverlapViewers.length === 0) {
    console.log("  No overlap viewers found");
  } else {
    for (const viewer of result.topOverlapViewers) {
      console.log(
        `  ${viewer.nickname || viewer.viewer_username}: ` +
          `${viewer.broadcasts_a} broadcasts (A), ` +
          `${viewer.broadcasts_b} broadcasts (B)`
      );
    }
  }
}

async function handleDonations(streamerId, options) {
  if (!streamerId) {
    console.error("Error: streamer username required");
    return;
  }

  const limit = parseInt(options.limit) || 20;

  console.log(`\n💰 Donation Ranking: ${streamerId}\n`);
  console.log("─".repeat(50));

  const ranking = await query.getDonationRanking(streamerId, { limit });

  if (ranking.length === 0) {
    console.log("No donations found");
    return;
  }

  console.log(`\n  Rank | Donor              | Count | Items    | Amount`);
  console.log("  " + "-".repeat(60));

  ranking.forEach((donor, index) => {
    const rank = String(index + 1).padStart(4);
    const name = (donor.sender_nickname || donor.sender_username).slice(0, 15).padEnd(18);
    const count = String(donor.donation_count).padStart(5);
    const items = formatNumber(donor.total_items).padStart(8);
    const amount = ("₩" + formatNumber(donor.total_amount)).padStart(12);
    console.log(`  ${rank} | ${name} | ${count} | ${items} | ${amount}`);
  });
}

async function handleBroadcast(broadcastId) {
  if (!broadcastId) {
    console.error("Error: broadcast ID required");
    return;
  }

  console.log(`\n📺 Broadcast Details: ${broadcastId}\n`);
  console.log("─".repeat(50));

  const result = await query.getBroadcastTrend(broadcastId);

  if (!result) {
    console.log("Broadcast not found");
    return;
  }

  const b = result.broadcast;
  console.log(`\n📋 Info`);
  console.log(`  Title:     ${b.title}`);
  console.log(`  Category:  ${b.category}`);
  console.log(`  Streamer:  ${b.streamer_username}`);
  console.log(`  Started:   ${b.started_at}`);
  console.log(`  Ended:     ${b.ended_at || "Live"}`);
  console.log(`  Duration:  ${formatDuration(b.duration_seconds)}`);
  console.log(`  Peak:      ${formatNumber(b.peak_viewers)}`);

  console.log(`\n📊 5-min Stats (${result.stats5min.length} snapshots)`);
  if (result.stats5min.length > 0) {
    const first = result.stats5min[0];
    const last = result.stats5min[result.stats5min.length - 1];
    console.log(`  First: ${first.snapshot_at} - ${first.viewer_count} viewers, ${first.chat_count} chats`);
    console.log(`  Last:  ${last.snapshot_at} - ${last.viewer_count} viewers, ${last.chat_count} chats`);

    const avgViewers =
      result.stats5min.reduce((sum, s) => sum + s.viewer_count, 0) / result.stats5min.length;
    const totalChats = result.stats5min.reduce((sum, s) => sum + s.chat_count, 0);
    console.log(`  Avg Viewers: ${avgViewers.toFixed(1)}`);
    console.log(`  Total Chats: ${formatNumber(totalChats)}`);
  }

  console.log(`\n🔄 Changes (${result.changes.length})`);
  if (result.changes.length === 0) {
    console.log("  No changes recorded");
  } else {
    for (const change of result.changes.slice(0, 5)) {
      console.log(`  ${change.changed_at}: ${change.field_name}`);
      console.log(`    "${change.old_value}" → "${change.new_value}"`);
    }
  }

  console.log(`\n💰 Donations`);
  if (result.donations.length === 0) {
    console.log("  No donations");
  } else {
    for (const d of result.donations) {
      console.log(`  ${d.donation_type}: ${d.count} times, ${d.total_items} items, ₩${formatNumber(d.total_amount)}`);
    }
  }
}

async function handleDaily(date) {
  if (!date) {
    date = new Date().toISOString().split("T")[0];
  }

  console.log(`\n📅 Daily Summary: ${date}\n`);
  console.log("─".repeat(50));

  const summary = await query.getDailySummary(date);

  console.log(`\n📺 Broadcasts`);
  console.log(`  Total:          ${formatNumber(summary.broadcasts?.total_broadcasts)}`);
  console.log(`  Unique Streamers: ${formatNumber(summary.broadcasts?.unique_streamers)}`);
  console.log(`  Avg Viewers:    ${summary.broadcasts?.avg_viewers?.toFixed(1) || "N/A"}`);

  console.log(`\n👥 Viewers`);
  console.log(`  Unique:         ${formatNumber(summary.uniqueViewers)}`);

  console.log(`\n💰 Donations`);
  console.log(`  Total:          ${formatNumber(summary.donations?.total_donations)}`);
  console.log(`  Amount:         ₩${formatNumber(summary.donations?.total_amount)}`);
  console.log(`  Unique Donors:  ${formatNumber(summary.donations?.unique_donors)}`);
}

async function handleTopViewers(options) {
  const limit = parseInt(options.limit) || 50;

  console.log(`\n👑 Top Viewers (by broadcasts watched)\n`);
  console.log("─".repeat(50));

  const viewers = await query.getTopViewers({ limit });

  if (viewers.length === 0) {
    console.log("No viewers found");
    return;
  }

  console.log(`\n  Rank | Viewer            | Broadcasts | Streamers | Watch Time`);
  console.log("  " + "-".repeat(65));

  viewers.forEach((viewer, index) => {
    const rank = String(index + 1).padStart(4);
    const name = (viewer.nickname || viewer.viewer_username).slice(0, 15).padEnd(17);
    const broadcasts = String(viewer.broadcasts_watched).padStart(10);
    const streamers = String(viewer.streamers_watched).padStart(9);
    const time = formatDuration(viewer.estimated_watch_minutes * 60).padStart(10);
    console.log(`  ${rank} | ${name} | ${broadcasts} | ${streamers} | ${time}`);
  });
}

async function handleSummary() {
  console.log(`\n📊 Analytics Summary\n`);
  console.log("─".repeat(50));

  // Get total counts
  const counts = await new Promise((resolve, reject) => {
    db.get(
      `SELECT
        (SELECT COUNT(*) FROM platform_users) as total_users,
        (SELECT COUNT(*) FROM platform_users WHERE is_streamer = 1) as total_streamers,
        (SELECT COUNT(*) FROM broadcasts) as total_broadcasts,
        (SELECT COUNT(*) FROM broadcasts WHERE is_live = 1) as live_broadcasts,
        (SELECT COUNT(*) FROM viewing_records) as total_viewing_records,
        (SELECT COUNT(*) FROM donations) as total_donations,
        (SELECT SUM(amount_krw) FROM donations) as total_donation_amount,
        (SELECT COUNT(*) FROM broadcast_stats_5min) as total_stats_5min,
        (SELECT COUNT(*) FROM broadcast_changes) as total_changes`,
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });

  console.log(`\n👥 Users`);
  console.log(`  Total Users:     ${formatNumber(counts.total_users)}`);
  console.log(`  Streamers:       ${formatNumber(counts.total_streamers)}`);

  console.log(`\n📺 Broadcasts`);
  console.log(`  Total:           ${formatNumber(counts.total_broadcasts)}`);
  console.log(`  Currently Live:  ${formatNumber(counts.live_broadcasts)}`);

  console.log(`\n📊 Data Collection`);
  console.log(`  Viewing Records: ${formatNumber(counts.total_viewing_records)}`);
  console.log(`  5-min Stats:     ${formatNumber(counts.total_stats_5min)}`);
  console.log(`  Change Records:  ${formatNumber(counts.total_changes)}`);

  console.log(`\n💰 Donations`);
  console.log(`  Total:           ${formatNumber(counts.total_donations)}`);
  console.log(`  Total Amount:    ₩${formatNumber(counts.total_donation_amount)}`);

  // DB file size
  const fs = require("fs");
  const stats = fs.statSync(dbPath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`\n💾 Database`);
  console.log(`  File Size:       ${sizeMB} MB`);
  console.log(`  Path:            ${dbPath}`);
}

main();
