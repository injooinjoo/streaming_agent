const express = require("express");
const { getAll, isPostgres } = require("../db/connections");
const {
  NEXON_SOOP_CATEGORY_IDS,
  NEXON_CHZZK_CATEGORY_IDS,
} = require("../constants/nexonGames");

const RANKING_PLATFORM_FILTERS = new Set(["soop", "chzzk"]);
const CONTENT_PLATFORM_FILTERS = new Set(["all", "soop", "chzzk"]);
const PERIOD_FILTERS = new Set(["current", "monthly"]);
const SEASON_FILTERS = new Set(["preseason-2026", "season1-2026"]);
const CONTENT_SORTS = new Set(["viewers", "streamers", "name"]);

const CREATOR_SEED = [
  { displayName: "겜수다", platform: "soop" },
  { displayName: "이상호", platform: "soop" },
  { displayName: "관백준", platform: "chzzk" },
  { displayName: "쏘대장", platform: "soop" },
  { displayName: "택월드", platform: "chzzk" },
  { displayName: "서든왕", platform: "chzzk" },
  { displayName: "메이플이좋아", platform: "soop" },
  { displayName: "카트장인", platform: "chzzk" },
  { displayName: "김민교", platform: "soop" },
  { displayName: "버니", platform: "chzzk" },
  { displayName: "마비노기", platform: "soop" },
  { displayName: "하효니", platform: "chzzk" },
  { displayName: "탑프", platform: "chzzk" },
  { displayName: "이선생", platform: "soop" },
  { displayName: "테라의모험", platform: "chzzk" },
  { displayName: "세계게임자", platform: "soop" },
  { displayName: "신작겜러", platform: "chzzk" },
  { displayName: "대포", platform: "soop" },
  { displayName: "빙하톤", platform: "chzzk" },
  { displayName: "김백호", platform: "soop" },
];

const NOTICE_SEED = [
  {
    id: "notice-preseason-launch",
    title: "N-CONNECT 프리시즌 운영 일정 안내",
    category: "운영",
    isPinned: true,
    publishedAt: "2026-04-09T09:00:00+09:00",
    summary: "SOOP은 2026년 4월 9일, 치지직은 2026년 4월 23일부터 프리시즌이 시작됩니다.",
    body:
      "N-CONNECT 프리시즌은 2026년 4월 9일 SOOP에서 먼저 시작하고, 치지직은 2026년 4월 23일부터 합류합니다.\n\n프리시즌 데이터 기간은 2026년 4월부터 9월까지이며, 기여도 체계 검증 단계인 만큼 순위 가중치 보정과 보상 차등을 최소화해 운영합니다.\n\n정식 시즌 1은 2026년 10월부터 12월까지 운영되며, 시즌별 누적 기여도와 월간 성장 지표를 바탕으로 급여와 인센티브가 지급됩니다.",
  },
  {
    id: "notice-account-promo",
    title: "계정 연동 프로모션 보상 기준 공지",
    category: "보상",
    isPinned: true,
    publishedAt: "2026-04-09T09:30:00+09:00",
    summary: "기본 보상 5,000원과 추천 코드 1건당 1,000원 지급 기준을 안내합니다.",
    body:
      "계정 연동 프로모션은 기본 보상과 추천 코드 보상으로 구성됩니다.\n\n기본 보상은 SOOP과 넥슨에서만 사용할 수 있는 전용 문화상품권 5,000원이며 1차 10만 명 한정으로 운영됩니다.\n\n추천 코드 보상은 추천 1건당 넥슨캐시 1,000원이며 1인당 최대 100만 원까지 적립됩니다.\n\n모든 보상은 월 1회 기준 시점의 연동 여부를 확인한 뒤 지급되며, 보상 수령 직후 연동 해제에 따른 리스크를 막기 위해 즉시 지급은 적용하지 않습니다.",
  },
  {
    id: "notice-chzzk-prereg",
    title: "치지직 사전예약 운영 안내",
    category: "일정",
    isPinned: false,
    publishedAt: "2026-04-10T11:00:00+09:00",
    summary: "치지직 스트리머는 2026년 4월 9일부터 4월 23일까지 사전예약 혜택을 받을 수 있습니다.",
    body:
      "치지직은 프리시즌 본 오픈 전까지 2주간 사전예약을 운영합니다.\n\n사전예약은 계정 연동 사전예약과 N-CONNECT 참여 사전예약으로 나뉘며, 계정 연동 사전예약은 넥슨캐시 혜택, 멤버십 사전예약은 굿즈 우선권 혜택으로 설계됩니다.\n\n정식 운영 전 멤버십 참여 의사를 확보하고 게임별 채널 활성화 우선순위를 정교하게 세우는 것이 목적입니다.",
  },
  {
    id: "notice-goods-policy",
    title: "웰컴 굿즈 지급 조건 안내",
    category: "굿즈",
    isPinned: false,
    publishedAt: "2026-05-01T10:00:00+09:00",
    summary: "N-CONNECT 웰컴 굿즈는 가입 후 넥슨 게임 카테고리 방송 10시간을 달성한 베스트 크리에이터에게 지급됩니다.",
    body:
      "웰컴 굿즈는 N-CONNECT에 가입한 스트리머의 소속감을 높이고 방송에서 노출 가능한 아이템으로 구성됩니다.\n\n구성품은 사원증, NFC 명함, 데스크 굿즈, 특별 패키지 키트이며 총액은 5만 원 미만으로 유지됩니다.\n\n매월 말일 기준으로 지급 대상자를 선정하고, 익월 18일 발송을 목표로 운영합니다.",
  },
];

const getTierByRank = (rank) => {
  if (rank <= 5) return "압도적 탑티어";
  if (rank <= 15) return "급상승 탑티어";
  if (rank <= 35) return "안정적 기여 탑티어";
  if (rank <= 65) return "참여 우수";
  return "롱테일 그룹";
};

const getSalaryBand = (rank) => {
  if (rank <= 5) return "월 3,250만원";
  if (rank <= 15) return "월 1,550만원";
  if (rank <= 35) return "월 650만원";
  if (rank <= 65) return "월 140만원";
  return "월 30만원";
};

const getIncentiveBand = (rank) => {
  if (rank <= 5) return "월 1,400만원";
  if (rank <= 15) return "월 600만원";
  if (rank <= 35) return "월 150만원";
  if (rank <= 65) return "월 55만원";
  return "월 10만원";
};

const buildRankingSeed = () =>
  Array.from({ length: 100 }, (_, index) => {
    const rank = index + 1;
    const creator = CREATOR_SEED[index] || {
      displayName: `N커넥트 ${String(rank).padStart(2, "0")}`,
      platform: rank % 2 === 0 ? "chzzk" : "soop",
    };
    const activityPoints = Math.max(340, 1880 - index * 14);
    const viewershipPoints = Math.max(260, 1420 - index * 10);
    const ingamePoints = Math.max(180, 980 - index * 7);

    return {
      rank,
      personId: 1000 + rank,
      displayName: creator.displayName,
      platform: creator.platform,
      tier: getTierByRank(rank),
      totalPoints: activityPoints + viewershipPoints + ingamePoints,
      activityPoints,
      viewershipPoints,
      ingamePoints,
      monthlySalaryBand: getSalaryBand(rank),
      monthlyIncentiveBand: getIncentiveBand(rank),
    };
  });

const RANKING_SEED = buildRankingSeed();

const p = (index) => (isPostgres() ? `$${index}` : "?");
const activeValue = () => (isPostgres() ? "TRUE" : "1");

const buildRankingSnapshot = ({ season, period, platform, limit }) => {
  const seasonOffset = season === "season1-2026" ? 220 : 0;
  const periodOffset = period === "monthly" ? 90 : 0;

  return RANKING_SEED.filter((item) => item.platform === platform)
    .map((item, index) => {
      const activityPoints =
        item.activityPoints + Math.floor(seasonOffset * 0.45) + Math.floor(periodOffset * 0.5);
      const viewershipPoints =
        item.viewershipPoints + Math.floor(seasonOffset * 0.35) + Math.floor(periodOffset * 0.25);
      const ingamePoints =
        item.ingamePoints + Math.floor(seasonOffset * 0.2) + Math.floor(periodOffset * 0.25);

      return {
        ...item,
        rank: index + 1,
        tier: getTierByRank(index + 1),
        totalPoints: activityPoints + viewershipPoints + ingamePoints,
        activityPoints,
        viewershipPoints,
        ingamePoints,
        monthlySalaryBand: getSalaryBand(index + 1),
        monthlyIncentiveBand: getIncentiveBand(index + 1),
      };
    })
    .slice(0, limit);
};

const parseJsonSetting = (value) => {
  if (!value) return null;
  if (typeof value === "object") return value;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const createContentQuery = ({ includeOptionalColumns = true, platform = "all" }) => {
  const params = [...NEXON_SOOP_CATEGORY_IDS, ...NEXON_CHZZK_CATEGORY_IDS];
  let paramIndex = params.length + 1;
  const soopPlaceholders = NEXON_SOOP_CATEGORY_IDS.map((_, index) => p(index + 1)).join(",");
  const chzzkPlaceholders = NEXON_CHZZK_CATEGORY_IDS.map(
    (_, index) => p(NEXON_SOOP_CATEGORY_IDS.length + index + 1)
  ).join(",");
  const platformClause =
    platform === "all"
      ? ""
      : ` AND pc.platform = ${p(paramIndex++)}`;

  if (platform !== "all") {
    params.push(platform);
  }

  const optionalColumns = includeOptionalColumns
    ? `
        COALESCE(ug.publisher, ug.developer) AS publisher,
        ug.cover_url,
      `
    : `
        ug.developer AS publisher,
        NULL AS cover_url,
      `;

  const sql = `
    SELECT
      ug.id AS game_id,
      ug.name,
      ug.name_kr,
      ug.genre,
      ${optionalColumns}
      ug.image_url,
      pc.platform,
      pc.platform_category_id,
      COALESCE(cgm.platform_category_name, pc.platform_category_name) AS platform_category_name,
      pc.thumbnail_url,
      COALESCE(pc.viewer_count, 0) AS viewer_count,
      COALESCE(pc.streamer_count, 0) AS streamer_count,
      pc.last_seen_at
    FROM platform_categories pc
    INNER JOIN category_game_mappings cgm
      ON pc.platform = cgm.platform
      AND pc.platform_category_id = cgm.platform_category_id
    INNER JOIN unified_games ug ON cgm.unified_game_id = ug.id
    WHERE pc.is_active = ${activeValue()}
      AND (pc.viewer_count > 0 OR pc.streamer_count > 0)
      AND (
        (pc.platform = 'soop' AND pc.platform_category_id IN (${soopPlaceholders}))
        OR
        (pc.platform = 'chzzk' AND pc.platform_category_id IN (${chzzkPlaceholders}))
      )
      ${platformClause}
    ORDER BY COALESCE(pc.viewer_count, 0) DESC, COALESCE(pc.streamer_count, 0) DESC
  `;

  return { sql, params };
};

const loadNConnectContentRows = async ({ platform = "all" }) => {
  const primaryQuery = createContentQuery({ includeOptionalColumns: true, platform });

  try {
    return await getAll(primaryQuery.sql, primaryQuery.params);
  } catch (error) {
    if (!/publisher|cover_url/i.test(String(error.message || ""))) {
      throw error;
    }

    const fallbackQuery = createContentQuery({ includeOptionalColumns: false, platform });
    return getAll(fallbackQuery.sql, fallbackQuery.params);
  }
};

const aggregateNConnectContents = (rows) => {
  const itemsByGame = new Map();

  for (const row of rows || []) {
    const gameId = Number(row.game_id);
    const viewerCount = Number(row.viewer_count || 0);
    const streamerCount = Number(row.streamer_count || 0);
    const lastSeenAt = row.last_seen_at || null;

    if (!itemsByGame.has(gameId)) {
      itemsByGame.set(gameId, {
        gameId,
        name: row.name || "",
        nameKr: row.name_kr || null,
        genre: row.genre || null,
        publisher: row.publisher || null,
        imageUrl: row.cover_url || row.image_url || row.thumbnail_url || null,
        totalViewers: 0,
        totalStreamers: 0,
        platforms: [],
        updatedAt: lastSeenAt,
      });
    }

    const item = itemsByGame.get(gameId);
    item.totalViewers += viewerCount;
    item.totalStreamers += streamerCount;

    if (!item.imageUrl) {
      item.imageUrl = row.cover_url || row.image_url || row.thumbnail_url || null;
    }

    if (!item.publisher && row.publisher) {
      item.publisher = row.publisher;
    }

    if (!item.updatedAt || (lastSeenAt && new Date(lastSeenAt) > new Date(item.updatedAt))) {
      item.updatedAt = lastSeenAt;
    }

    const existingPlatform = item.platforms.find((platformItem) => platformItem.platform === row.platform);

    if (existingPlatform) {
      existingPlatform.viewerCount += viewerCount;
      existingPlatform.streamerCount += streamerCount;
      if (!existingPlatform.thumbnailUrl && row.thumbnail_url) {
        existingPlatform.thumbnailUrl = row.thumbnail_url;
      }
      if (
        row.platform_category_name &&
        existingPlatform.categoryName !== row.platform_category_name &&
        !existingPlatform.categoryName.includes("외")
      ) {
        existingPlatform.categoryName = `${existingPlatform.categoryName} 외`;
      }
    } else {
      item.platforms.push({
        platform: row.platform,
        categoryId: row.platform_category_id,
        categoryName: row.platform_category_name || row.name_kr || row.name,
        viewerCount,
        streamerCount,
        thumbnailUrl: row.thumbnail_url || null,
      });
    }
  }

  return Array.from(itemsByGame.values());
};

const sortContents = (items, sort) => {
  const sorted = [...items];

  if (sort === "name") {
    sorted.sort((left, right) =>
      String(left.nameKr || left.name || "").localeCompare(String(right.nameKr || right.name || ""), "ko")
    );
    return sorted;
  }

  if (sort === "streamers") {
    sorted.sort((left, right) => {
      if (right.totalStreamers !== left.totalStreamers) {
        return right.totalStreamers - left.totalStreamers;
      }
      return right.totalViewers - left.totalViewers;
    });
    return sorted;
  }

  sorted.sort((left, right) => {
    if (right.totalViewers !== left.totalViewers) {
      return right.totalViewers - left.totalViewers;
    }
    return right.totalStreamers - left.totalStreamers;
  });
  return sorted;
};

const buildContentsResponse = ({ items, platform, sort, limit }) => {
  const sortedByViewers = sortContents(items, "viewers");
  const topGame = sortedByViewers[0] || null;
  const selectedItems = sortContents(items, sort).slice(0, limit);
  const latestUpdatedAt = items
    .map((item) => item.updatedAt)
    .filter(Boolean)
    .sort((left, right) => new Date(right) - new Date(left))[0] || null;

  return {
    summary: {
      liveGames: items.length,
      totalViewers: items.reduce((sum, item) => sum + Number(item.totalViewers || 0), 0),
      totalStreamers: items.reduce((sum, item) => sum + Number(item.totalStreamers || 0), 0),
      topGameName: topGame ? topGame.nameKr || topGame.name : null,
    },
    items: selectedItems,
    meta: {
      platform,
      sort,
      limit,
      total: items.length,
      updatedAt: latestUpdatedAt,
    },
  };
};

function createNConnectRouter(userService, settingsService, authenticateToken) {
  const router = express.Router();

  router.get("/nconnect/ranking", (req, res) => {
    const season = SEASON_FILTERS.has(req.query.season) ? req.query.season : "preseason-2026";
    const period = PERIOD_FILTERS.has(req.query.period) ? req.query.period : "current";
    const platform =
      typeof req.query.platform === "string" ? req.query.platform.trim().toLowerCase() : "";

    if (!RANKING_PLATFORM_FILTERS.has(platform)) {
      return res.status(400).json({
        error: "랭킹 플랫폼은 SOOP 또는 치지직만 선택할 수 있습니다.",
      });
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 100);

    const items = buildRankingSnapshot({ season, period, platform, limit });

    res.json({
      items,
      meta: {
        season,
        period,
        platform,
        total: items.length,
        updatedAt: "2026-03-06T10:00:00+09:00",
      },
    });
  });

  router.get("/nconnect/contents", async (req, res) => {
    try {
      const platform = CONTENT_PLATFORM_FILTERS.has(req.query.platform) ? req.query.platform : "all";
      const sort = CONTENT_SORTS.has(req.query.sort) ? req.query.sort : "viewers";
      const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 24, 1), 100);

      const rows = await loadNConnectContentRows({ platform });
      const items = aggregateNConnectContents(rows);

      res.json(buildContentsResponse({ items, platform, sort, limit }));
    } catch (error) {
      res.status(500).json({ error: error.message || "진행 중 콘텐츠를 불러오지 못했습니다." });
    }
  });

  router.get("/nconnect/notices", (req, res) => {
    const items = [...NOTICE_SEED].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.publishedAt) - new Date(a.publishedAt);
    });

    res.json({ items });
  });

  router.get("/nconnect/notices/:id", (req, res) => {
    const item = NOTICE_SEED.find((notice) => notice.id === req.params.id);

    if (!item) {
      return res.status(404).json({ error: "공지사항을 찾을 수 없습니다." });
    }

    return res.json({ item });
  });

  router.get("/nconnect/membership-status", authenticateToken, async (req, res) => {
    try {
      const user = await userService.findById(req.user.id);

      if (!user) {
        return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });
      }

      const userGameSetting = await settingsService.getUserSetting(user.id, "game");
      const globalGameSetting = userGameSetting ? null : await settingsService.getGlobal("game");
      const resolvedGameSetting = parseJsonSetting(userGameSetting || globalGameSetting) || {};
      const nexonSettings = resolvedGameSetting.nexon || {};
      const nexonAccountId =
        typeof nexonSettings.accountId === "string" ? nexonSettings.accountId.trim() : "";

      const platformConnected = Boolean(user.platform && user.channel_id);
      const nexonConnected = Boolean(nexonSettings.enabled && nexonAccountId);

      return res.json({
        platformConnected,
        nexonConnected,
        membershipJoined: platformConnected && nexonConnected,
        platform: user.platform || null,
        channelId: user.channel_id || null,
        nexonAccountId: nexonConnected ? nexonAccountId : null,
        userDisplayName: user.display_name || null,
        settingsSource: userGameSetting ? "user" : globalGameSetting ? "global" : "none",
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });

  return router;
}

module.exports = { createNConnectRouter };
