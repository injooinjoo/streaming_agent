/**
 * Nexon YouTube Data Extractor
 *
 * YouTube Data API v3 (API key only) 를 사용하여
 * 넥슨 게임 관련 영상·채널의 공개 데이터를 CSV로 추출합니다.
 *
 * 사용법: node server/scripts/nexon-youtube-extract.js
 * 필요: YOUTUBE_API_KEY in server/.env
 */

const fs = require("fs");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const API_KEY = process.env.YOUTUBE_API_KEY;
const YT_API_BASE = "https://www.googleapis.com/youtube/v3";

const PUBLISHED_AFTER = "2026-01-01T00:00:00Z";
const PUBLISHED_BEFORE = "2026-03-01T00:00:00Z";
const MAX_PAGES_PER_GAME = 5;
const RESULTS_PER_PAGE = 50;

const NEXON_GAMES = [
  { name: "메이플스토리", query: "메이플스토리" },
  { name: "던전앤파이터", query: "던전앤파이터" },
  { name: "FC 온라인", query: "FC온라인" },
  { name: "서든어택", query: "서든어택" },
  { name: "카트라이더", query: "카트라이더" },
  { name: "바람의나라", query: "바람의나라" },
  { name: "마비노기", query: "마비노기" },
  { name: "퍼스트 디센던트", query: "퍼스트디센던트" },
  { name: "V4", query: "V4 넥슨" },
];

// ─── Quota tracking ───

let quotaUsed = 0;
const QUOTA_LIMIT = 10000;

function trackQuota(cost) {
  quotaUsed += cost;
  if (quotaUsed > QUOTA_LIMIT * 0.9) {
    console.warn(`[quota] WARNING: ${quotaUsed}/${QUOTA_LIMIT} used (${((quotaUsed / QUOTA_LIMIT) * 100).toFixed(1)}%)`);
  }
}

// ─── API helpers ───

async function ytFetch(endpoint, params, quotaCost) {
  if (quotaUsed + quotaCost > QUOTA_LIMIT) {
    throw new Error(`Quota limit would be exceeded: ${quotaUsed + quotaCost}/${QUOTA_LIMIT}`);
  }

  const url = new URL(`${YT_API_BASE}${endpoint}`);
  url.searchParams.set("key", API_KEY);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`YouTube API ${res.status}: ${err.error?.message || "Unknown"} [${endpoint}]`);
  }

  trackQuota(quotaCost);
  return res.json();
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── ISO 8601 duration → seconds ───

function parseDuration(iso) {
  if (!iso) return 0;
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (parseInt(m[1] || 0) * 3600) + (parseInt(m[2] || 0) * 60) + parseInt(m[3] || 0);
}

// ─── Step 1: Search videos per game ───

async function searchVideos(game) {
  const videoIds = [];
  let pageToken = null;

  for (let page = 0; page < MAX_PAGES_PER_GAME; page++) {
    console.log(`  [search] ${game.name} page ${page + 1}/${MAX_PAGES_PER_GAME}...`);

    const params = {
      part: "id",
      q: game.query,
      type: "video",
      videoCategoryId: "20",
      regionCode: "KR",
      relevanceLanguage: "ko",
      publishedAfter: PUBLISHED_AFTER,
      publishedBefore: PUBLISHED_BEFORE,
      maxResults: String(RESULTS_PER_PAGE),
      order: "viewCount",
      pageToken,
    };

    const data = await ytFetch("/search", params, 100);
    const ids = (data.items || []).map((item) => item.id?.videoId).filter(Boolean);
    videoIds.push(...ids);

    console.log(`    -> ${ids.length} videos found (total: ${videoIds.length})`);

    if (!data.nextPageToken || ids.length === 0) break;
    pageToken = data.nextPageToken;

    await sleep(300);
  }

  return [...new Set(videoIds)];
}

// ─── Step 2: Get video details in batches ───

async function getVideoDetails(videoIds) {
  const results = [];
  const batchSize = 50;

  for (let i = 0; i < videoIds.length; i += batchSize) {
    const batch = videoIds.slice(i, i + batchSize);
    console.log(`  [videos] batch ${Math.floor(i / batchSize) + 1} (${batch.length} videos)...`);

    const data = await ytFetch("/videos", {
      part: "snippet,statistics,contentDetails",
      id: batch.join(","),
    }, 1);

    results.push(...(data.items || []));
    await sleep(200);
  }

  return results;
}

// ─── Step 3: Get channel details in batches ───

async function getChannelDetails(channelIds) {
  const results = [];
  const batchSize = 50;
  const uniqueIds = [...new Set(channelIds)];

  for (let i = 0; i < uniqueIds.length; i += batchSize) {
    const batch = uniqueIds.slice(i, i + batchSize);
    console.log(`  [channels] batch ${Math.floor(i / batchSize) + 1} (${batch.length} channels)...`);

    const data = await ytFetch("/channels", {
      part: "snippet,statistics,contentDetails",
      id: batch.join(","),
    }, 1);

    results.push(...(data.items || []));
    await sleep(200);
  }

  return results;
}

// ─── CSV helpers ───

function escapeCsv(val) {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function writeCsv(filePath, headers, rows) {
  const bom = "\uFEFF";
  const headerLine = headers.map(escapeCsv).join(",");
  const dataLines = rows.map((row) => headers.map((h) => escapeCsv(row[h])).join(","));
  fs.writeFileSync(filePath, bom + [headerLine, ...dataLines].join("\n"), "utf-8");
  console.log(`[csv] ${filePath} saved (${rows.length} rows)`);
}

// ─── Main ───

async function main() {
  if (!API_KEY) {
    console.error("ERROR: YOUTUBE_API_KEY not set in server/.env");
    process.exit(1);
  }

  console.log("=== Nexon YouTube Data Extractor ===");
  console.log(`Period: ${PUBLISHED_AFTER} ~ ${PUBLISHED_BEFORE}`);
  console.log(`Games: ${NEXON_GAMES.map((g) => g.name).join(", ")}`);
  console.log("");

  const allVideoRows = [];
  const channelGameMap = {};

  // Step 1 & 2: Search + get details per game
  for (const game of NEXON_GAMES) {
    console.log(`\n[${game.name}] Searching...`);

    try {
      const videoIds = await searchVideos(game);
      if (videoIds.length === 0) {
        console.log(`  -> No videos found, skipping`);
        continue;
      }

      const videos = await getVideoDetails(videoIds);

      for (const v of videos) {
        const durationSec = parseDuration(v.contentDetails?.duration);
        const row = {
          game: game.name,
          videoId: v.id,
          title: v.snippet?.title || "",
          channelId: v.snippet?.channelId || "",
          channelTitle: v.snippet?.channelTitle || "",
          publishedAt: v.snippet?.publishedAt || "",
          categoryId: v.snippet?.categoryId || "",
          tags: (v.snippet?.tags || []).join("|"),
          defaultLanguage: v.snippet?.defaultLanguage || "",
          duration: v.contentDetails?.duration || "",
          durationSec,
          isShorts: durationSec > 0 && durationSec <= 60 ? "Y" : "N",
          definition: v.contentDetails?.definition || "",
          viewCount: v.statistics?.viewCount || "0",
          likeCount: v.statistics?.likeCount || "0",
          commentCount: v.statistics?.commentCount || "0",
          liveBroadcastContent: v.snippet?.liveBroadcastContent || "",
          thumbnailUrl: v.snippet?.thumbnails?.medium?.url || "",
          videoUrl: `https://www.youtube.com/watch?v=${v.id}`,
        };

        allVideoRows.push(row);

        const chId = row.channelId;
        if (chId) {
          if (!channelGameMap[chId]) channelGameMap[chId] = { videos: 0, views: 0, games: {} };
          channelGameMap[chId].videos++;
          channelGameMap[chId].views += parseInt(row.viewCount) || 0;
          channelGameMap[chId].games[game.name] = (channelGameMap[chId].games[game.name] || 0) + 1;
        }
      }

      console.log(`  -> ${videos.length} videos processed`);
    } catch (err) {
      console.error(`  [ERROR] ${game.name}: ${err.message}`);
    }

    await sleep(500);
  }

  // Step 3: Get channel details
  const channelIds = Object.keys(channelGameMap);
  console.log(`\n[Channels] Fetching details for ${channelIds.length} unique channels...`);

  const channels = await getChannelDetails(channelIds);

  const channelRows = channels.map((ch) => {
    const stats = channelGameMap[ch.id] || { videos: 0, views: 0, games: {} };
    const gameEntries = Object.entries(stats.games);
    const primaryGame = gameEntries.length > 0
      ? gameEntries.sort((a, b) => b[1] - a[1])[0][0]
      : "";

    return {
      channelId: ch.id,
      channelTitle: ch.snippet?.title || "",
      customUrl: ch.snippet?.customUrl || "",
      description: (ch.snippet?.description || "").substring(0, 200),
      publishedAt: ch.snippet?.publishedAt || "",
      country: ch.snippet?.country || "",
      subscriberCount: ch.statistics?.subscriberCount || "0",
      totalViewCount: ch.statistics?.viewCount || "0",
      videoCount: ch.statistics?.videoCount || "0",
      uploadsPlaylistId: ch.contentDetails?.relatedPlaylists?.uploads || "",
      nexonVideoCount: stats.videos,
      nexonTotalViews: stats.views,
      primaryGame,
      channelUrl: ch.snippet?.customUrl
        ? `https://www.youtube.com/${ch.snippet.customUrl}`
        : `https://www.youtube.com/channel/${ch.id}`,
    };
  });

  // Sort channels by nexon video views desc
  channelRows.sort((a, b) => b.nexonTotalViews - a.nexonTotalViews);

  // Write CSVs
  const outDir = path.join(__dirname, "..", "..", "output");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const videoHeaders = [
    "game", "videoId", "title", "channelId", "channelTitle",
    "publishedAt", "categoryId", "tags", "defaultLanguage",
    "duration", "durationSec", "isShorts", "definition",
    "viewCount", "likeCount", "commentCount",
    "liveBroadcastContent", "thumbnailUrl", "videoUrl",
  ];

  const channelHeaders = [
    "channelId", "channelTitle", "customUrl", "description",
    "publishedAt", "country", "subscriberCount", "totalViewCount",
    "videoCount", "uploadsPlaylistId", "nexonVideoCount",
    "nexonTotalViews", "primaryGame", "channelUrl",
  ];

  const videoFile = path.join(outDir, "nexon_youtube_videos_202601-02.csv");
  const channelFile = path.join(outDir, "nexon_youtube_channels_202601-02.csv");

  writeCsv(videoFile, videoHeaders, allVideoRows);
  writeCsv(channelFile, channelHeaders, channelRows);

  // Summary
  console.log("\n=== Summary ===");
  console.log(`Total videos: ${allVideoRows.length}`);
  console.log(`Total channels: ${channelRows.length}`);
  console.log(`Quota used: ${quotaUsed}/${QUOTA_LIMIT} (${((quotaUsed / QUOTA_LIMIT) * 100).toFixed(1)}%)`);

  const gameStats = {};
  for (const row of allVideoRows) {
    if (!gameStats[row.game]) gameStats[row.game] = { count: 0, views: 0, shorts: 0 };
    gameStats[row.game].count++;
    gameStats[row.game].views += parseInt(row.viewCount) || 0;
    if (row.isShorts === "Y") gameStats[row.game].shorts++;
  }

  console.log("\nPer-game breakdown:");
  for (const [game, s] of Object.entries(gameStats).sort((a, b) => b[1].views - a[1].views)) {
    console.log(`  ${game}: ${s.count} videos (${s.shorts} shorts), ${s.views.toLocaleString()} views`);
  }

  console.log(`\nOutput files:`);
  console.log(`  ${videoFile}`);
  console.log(`  ${channelFile}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
