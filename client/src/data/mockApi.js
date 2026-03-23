// ============================================
// Mock API - fetch helper
// ============================================

import {
  adminBroadcastersMock,
  adminMonitorBroadcastsMock,
  adminMonitorStatsMock,
  adMock,
  adSettingsMock,
  advertiserBillingMock,
  advertiserCampaignsMock,
  advertiserStreamersMock,
  authUserMock,
  catalogMock,
  contentMock,
  dashboardMock,
  eventsMock,
  gameDetailMock,
  nconnectContentsMock,
  nconnectNoticesMock,
  nconnectRankingMock,
  revenueMock,
  settingsMock,
  streamerBroadcastsMock,
  streamerDetailMock,
  streamerRankingMock,
  streamerSegmentsMock,
  streamerStatsMock,
  userSettingValuesMock,
  viewerMock,
} from './mockData';
import { SHOULD_USE_MOCK_DATA } from '../config/appMode';

const nativeFetch = globalThis.fetch ? globalThis.fetch.bind(globalThis) : null;

export const USE_MOCK = SHOULD_USE_MOCK_DATA;

const cloneData = (data) => JSON.parse(JSON.stringify(data));

const mockResponse = (data, delay = 100) =>
  new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        ok: true,
        status: 200,
        json: async () => data,
        text: async () => JSON.stringify(data),
      });
    }, delay);
  });

const mockErrorResponse = (status, message) =>
  Promise.resolve({
    ok: false,
    status,
    json: async () => ({ error: message }),
    text: async () => message,
  });

const parseRequestBody = (body) => {
  if (!body) return {};
  if (typeof body !== 'string') return body;

  try {
    return JSON.parse(body);
  } catch {
    return {};
  }
};

const normalizeArrayField = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value) {
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  }
  return [];
};

const normalizeCampaignRecord = (campaign) => ({
  ...campaign,
  spent: Number(campaign?.spent ?? campaign?.budget_spent ?? 0),
  budget_spent: Number(campaign?.budget_spent ?? campaign?.spent ?? 0),
  impressions: Number(campaign?.impressions ?? 0),
  clicks: Number(campaign?.clicks ?? 0),
});

const createSettingsMockState = () => ({
  globalSettings: cloneData(settingsMock),
  userSettings: cloneData(userSettingValuesMock),
});

let settingsState = createSettingsMockState();

const createAdMockState = () => ({
  slots: cloneData(adSettingsMock.slots),
  settlements: cloneData(adSettingsMock.settlements),
  campaigns: cloneData(advertiserCampaignsMock).map(normalizeCampaignRecord),
  advertiserStreamers: cloneData(advertiserStreamersMock),
  billingTemplate: cloneData(advertiserBillingMock),
  trend: cloneData(adMock.trend),
  nextCampaignId: Math.max(...advertiserCampaignsMock.map((campaign) => Number(campaign.id)), 100) + 1,
});

let adState = createAdMockState();

const buildOverlayPollMock = () => ({
  id: 'demo-poll-001',
  title: '다음에 먼저 보여줄 오버레이를 골라주세요',
  status: 'active',
  totalVotes: 152,
  options: [
    { id: 'chat', text: '채팅 오버레이', votes: 58 },
    { id: 'alert', text: '후원 알림', votes: 41 },
    { id: 'goal', text: '목표 그래프', votes: 27 },
    { id: 'roulette', text: '룰렛 이벤트', votes: 26 },
  ],
});

const buildOverlayActiveAds = () => {
  const firstActiveCampaign =
    adState.campaigns.find((campaign) => campaign.status === 'active') ||
    adState.campaigns[0] ||
    null;

  if (!firstActiveCampaign) {
    return [];
  }

  return adState.slots
    .filter((slot) => slot.enabled)
    .slice(0, 2)
    .map((slot) => ({
      id: `demo-ad-${slot.id}`,
      slotId: slot.id,
      name: firstActiveCampaign.name,
      contentType: firstActiveCampaign.content_type || 'image',
      contentUrl:
        firstActiveCampaign.content_url ||
        'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
      clickUrl: firstActiveCampaign.click_url || 'https://example.com',
    }));
};

const buildStreamerRevenueSummary = () => {
  const totalImpressions = adState.slots.reduce((sum, slot) => sum + Number(slot.impressions || 0), 0);
  const totalClicks = adState.slots.reduce((sum, slot) => sum + Number(slot.clicks || 0), 0);
  const totalRevenue = adState.slots.reduce((sum, slot) => sum + Number(slot.revenue || 0), 0);
  const pendingSettlement = adState.settlements
    .filter((settlement) => settlement.status === 'pending')
    .reduce((sum, settlement) => sum + Number(settlement.revenue || 0), 0);

  return {
    totalImpressions,
    totalClicks,
    totalRevenue,
    ctr: totalImpressions > 0 ? Number(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0,
    avgRevenuePerClick: totalClicks > 0 ? Math.round(totalRevenue / totalClicks) : 0,
    pendingSettlement,
  };
};

const buildAdvertiserBillingPayload = () => {
  const campaigns = adState.campaigns.map(normalizeCampaignRecord);
  const monthlySpent = campaigns.reduce((sum, campaign) => sum + Number(campaign.spent || 0), 0);
  const totalBudget = campaigns.reduce((sum, campaign) => sum + Number(campaign.budget_total || 0), 0);
  const activeCampaigns = campaigns.filter((campaign) => campaign.status === 'active').length;
  const monthlyStatements = cloneData(adState.billingTemplate.monthlyStatements || []);
  const pendingInvoice = Number(
    monthlyStatements.find((statement) => statement.status !== 'paid')?.amount || 0
  );

  return {
    summary: {
      monthlySpent,
      remainingBudget: Math.max(0, totalBudget - monthlySpent),
      activeCampaigns,
      pendingInvoice,
    },
    monthlyStatements,
    campaignSpend: campaigns.map((campaign) => ({
      campaignId: campaign.id,
      name: campaign.name,
      status: campaign.status,
      spent: Number(campaign.spent || 0),
      budgetTotal: Number(campaign.budget_total || 0),
      startDate: campaign.start_date || null,
      endDate: campaign.end_date || null,
    })),
  };
};

const createMockCampaign = (payload) => {
  const targetStreamers = payload.targetStreamers ?? payload.target_streamers ?? 'all';
  const targetCategories = normalizeArrayField(payload.targetCategories ?? payload.target_categories);

  return normalizeCampaignRecord({
    id: payload.id ?? adState.nextCampaignId++,
    name: payload.name || '새 광고 캠페인',
    content_type: payload.contentType || payload.content_type || 'image',
    content_url: payload.contentUrl || payload.content_url || '',
    click_url: payload.clickUrl || payload.click_url || '',
    budget_daily: Number(payload.budgetDaily ?? payload.budget_daily ?? 0),
    budget_total: Number(payload.budgetTotal ?? payload.budget_total ?? 0),
    budget_spent: Number(payload.budget_spent ?? payload.spent ?? 0),
    spent: Number(payload.spent ?? payload.budget_spent ?? 0),
    cpm: Number(payload.cpm ?? 1000),
    cpc: Number(payload.cpc ?? 100),
    start_date: payload.startDate || payload.start_date || null,
    end_date: payload.endDate || payload.end_date || null,
    target_streamers: typeof targetStreamers === 'string' ? targetStreamers : JSON.stringify(targetStreamers),
    target_categories: targetCategories,
    status: payload.status || 'pending',
    impressions: Number(payload.impressions ?? 0),
    clicks: Number(payload.clicks ?? 0),
    created_at: payload.created_at || new Date().toISOString(),
  });
};

const handleAdsMockRequest = (url, options = {}) => {
  const parsedUrl = new URL(url, 'http://localhost');
  const { pathname } = parsedUrl;
  const method = options.method?.toUpperCase() || 'GET';
  const body = parseRequestBody(options.body);

  if (/^\/api\/overlay\/[^/]+\/ads\/slots$/.test(pathname) && method === 'GET') {
    return mockResponse({ slots: cloneData(adState.slots.filter((slot) => slot.enabled)) });
  }

  if (/^\/api\/overlay\/[^/]+\/ads\/active$/.test(pathname) && method === 'GET') {
    return mockResponse({ ads: buildOverlayActiveAds() });
  }

  if (pathname === '/api/ads/active' && method === 'GET') {
    return mockResponse({ ads: buildOverlayActiveAds() });
  }

  if (pathname === '/api/ads/slots' && method === 'GET') {
    return mockResponse({ slots: cloneData(adState.slots) });
  }

  if (pathname === '/api/ads/slots' && method === 'PUT') {
    const nextSlots = Array.isArray(body.slots)
      ? body.slots.map((slot, index) => {
          const existing = adState.slots.find((currentSlot) => String(currentSlot.id) === String(slot.id));

          return {
            id: slot.id || Date.now() + index,
            name: slot.name || `광고 슬롯 ${index + 1}`,
            type: slot.type || 'banner',
            position: slot.position || { x: 0, y: 0 },
            size: slot.size || { width: 300, height: 100 },
            enabled: slot.enabled !== false,
            impressions: Number(existing?.impressions ?? slot.impressions ?? 0),
            clicks: Number(existing?.clicks ?? slot.clicks ?? 0),
            revenue: Number(existing?.revenue ?? slot.revenue ?? 0),
          };
        })
      : [];

    adState.slots = nextSlots;
    return mockResponse({ success: true, slots: cloneData(adState.slots) });
  }

  if (pathname === '/api/ads/revenue' && method === 'GET') {
    return mockResponse(buildStreamerRevenueSummary());
  }

  if (pathname === '/api/ads/settlements' && method === 'GET') {
    return mockResponse({ settlements: cloneData(adState.settlements) });
  }

  if (pathname === '/api/ads/trend' && method === 'GET') {
    return mockResponse(cloneData(adState.trend));
  }

  if (pathname === '/api/users/streamers' && method === 'GET') {
    return mockResponse(cloneData(adState.advertiserStreamers));
  }

  if (pathname === '/api/ads/campaigns' && method === 'GET') {
    return mockResponse({ campaigns: cloneData(adState.campaigns) });
  }

  if (pathname === '/api/ads/campaigns' && method === 'POST') {
    if (!body.name || !(body.content_url || body.contentUrl)) {
      return mockErrorResponse(400, '캠페인 이름과 광고 소재 URL을 입력해 주세요.');
    }

    const campaign = createMockCampaign(body);
    adState.campaigns = [campaign, ...adState.campaigns];
    return mockResponse({ success: true, campaignId: campaign.id });
  }

  const campaignStatsMatch = pathname.match(/^\/api\/ads\/campaigns\/(\d+)\/stats$/);
  if (campaignStatsMatch && method === 'GET') {
    const campaignId = Number(campaignStatsMatch[1]);
    const campaign = adState.campaigns.find((item) => Number(item.id) === campaignId);

    if (!campaign) {
      return mockErrorResponse(404, '캠페인을 찾을 수 없습니다.');
    }

    return mockResponse({
      ...campaign,
      total_spent: Number(campaign.spent || 0),
      ctr: campaign.impressions > 0 ? Number(((campaign.clicks / campaign.impressions) * 100).toFixed(2)) : 0,
      remainingBudget: Math.max(0, Number(campaign.budget_total || 0) - Number(campaign.spent || 0)),
    });
  }

  const campaignStatusMatch = pathname.match(/^\/api\/ads\/campaigns\/(\d+)\/status$/);
  if (campaignStatusMatch && method === 'PUT') {
    const campaignId = Number(campaignStatusMatch[1]);
    const nextStatus = body.status;
    let updated = false;

    adState.campaigns = adState.campaigns.map((campaign) => {
      if (Number(campaign.id) !== campaignId) {
        return campaign;
      }

      updated = true;
      return normalizeCampaignRecord({ ...campaign, status: nextStatus });
    });

    return updated
      ? mockResponse({ success: true })
      : mockErrorResponse(404, '캠페인을 찾을 수 없습니다.');
  }

  const campaignMatch = pathname.match(/^\/api\/ads\/campaigns\/(\d+)$/);
  if (campaignMatch && method === 'PUT') {
    const campaignId = Number(campaignMatch[1]);
    let updated = false;

    adState.campaigns = adState.campaigns.map((campaign) => {
      if (Number(campaign.id) !== campaignId) {
        return campaign;
      }

      updated = true;
      return createMockCampaign({
        ...campaign,
        ...body,
        id: campaign.id,
        impressions: campaign.impressions,
        clicks: campaign.clicks,
        budget_spent: campaign.budget_spent,
        spent: campaign.spent,
        status: campaign.status,
        created_at: campaign.created_at,
      });
    });

    return updated
      ? mockResponse({ success: true })
      : mockErrorResponse(404, '캠페인을 찾을 수 없습니다.');
  }

  if (campaignMatch && method === 'DELETE') {
    const campaignId = Number(campaignMatch[1]);
    const beforeCount = adState.campaigns.length;
    adState.campaigns = adState.campaigns.filter((campaign) => Number(campaign.id) !== campaignId);
    return beforeCount === adState.campaigns.length
      ? mockErrorResponse(404, '캠페인을 찾을 수 없습니다.')
      : mockResponse({ success: true });
  }

  if (pathname === '/api/ads/advertiser/billing' && method === 'GET') {
    return mockResponse(buildAdvertiserBillingPayload());
  }

  return null;
};

const buildMembershipStatus = () => {
  const gameSetting = settingsState.userSettings.game || settingsState.globalSettings.game || {};
  const nexonSettings = gameSetting.nexon || {};
  const nexonAccountId =
    typeof nexonSettings.accountId === 'string' ? nexonSettings.accountId.trim() : '';
  const platformConnected = Boolean(authUserMock.platform && authUserMock.channelId);
  const nexonConnected = Boolean(nexonSettings.enabled && nexonAccountId);

  return {
    platformConnected,
    nexonConnected,
    membershipJoined: platformConnected && nexonConnected,
    platform: authUserMock.platform || null,
    channelId: authUserMock.channelId || null,
    nexonAccountId: nexonConnected ? nexonAccountId : null,
    userDisplayName: authUserMock.displayName,
    settingsSource: settingsState.userSettings.game ? 'user' : settingsState.globalSettings.game ? 'global' : 'none',
  };
};

const RANKING_PLATFORM_OPTIONS = new Set(['soop', 'chzzk']);

const getRankingTier = (rank) => {
  if (rank <= 5) return '탑티어';
  if (rank <= 15) return '성장 탑티어';
  if (rank <= 35) return '안정권 기여 티어';
  if (rank <= 65) return '참여 우수';
  return '루키 그룹';
};

const getRankingSalaryBand = (rank) => {
  if (rank <= 5) return '월 3,250만원';
  if (rank <= 15) return '월 1,550만원';
  if (rank <= 35) return '월 650만원';
  if (rank <= 65) return '월 140만원';
  return '월 30만원';
};

const getRankingIncentiveBand = (rank) => {
  if (rank <= 5) return '월 1,400만원';
  if (rank <= 15) return '월 600만원';
  if (rank <= 35) return '월 150만원';
  if (rank <= 65) return '월 55만원';
  return '월 10만원';
};

const buildRankingResponse = (searchParams) => {
  const season = searchParams.get('season') || 'preseason-2026';
  const period = searchParams.get('period') || 'current';
  const platform = searchParams.get('platform');
  const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 100, 1), 100);
  const seasonOffset = season === 'season1-2026' ? 220 : 0;
  const periodOffset = period === 'monthly' ? 90 : 0;

  const items = nconnectRankingMock
    .filter((item) => item.platform === platform)
    .map((item, index) => {
      const rank = index + 1;
      const activityPoints = item.activityPoints + Math.floor(seasonOffset * 0.45) + Math.floor(periodOffset * 0.5);
      const viewershipPoints = item.viewershipPoints + Math.floor(seasonOffset * 0.35) + Math.floor(periodOffset * 0.25);
      const ingamePoints = item.ingamePoints + Math.floor(seasonOffset * 0.2) + Math.floor(periodOffset * 0.25);

      return {
        ...item,
        rank,
        tier: getRankingTier(rank),
        totalPoints: activityPoints + viewershipPoints + ingamePoints,
        activityPoints,
        viewershipPoints,
        ingamePoints,
        monthlySalaryBand: getRankingSalaryBand(rank),
        monthlyIncentiveBand: getRankingIncentiveBand(rank),
      };
    })
    .slice(0, limit);

  return {
    items,
    meta: {
      season,
      period,
      platform,
      total: items.length,
      updatedAt: '2026-03-06T10:00:00+09:00',
    },
  };
};

const buildContentsResponse = (searchParams) => {
  const platform = searchParams.get('platform') || 'all';
  const sort = searchParams.get('sort') || 'viewers';
  const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 24, 1), 100);

  const filteredItems = nconnectContentsMock.items.filter((item) =>
    platform === 'all' ? true : item.platforms.some((platformItem) => platformItem.platform === platform)
  );

  const normalizedItems = filteredItems.map((item) => {
    const scopedPlatforms =
      platform === 'all'
        ? item.platforms
        : item.platforms.filter((platformItem) => platformItem.platform === platform);

    return {
      ...cloneData(item),
      totalViewers: scopedPlatforms.reduce((sum, platformItem) => sum + Number(platformItem.viewerCount || 0), 0),
      totalStreamers: scopedPlatforms.reduce((sum, platformItem) => sum + Number(platformItem.streamerCount || 0), 0),
      platforms: cloneData(scopedPlatforms),
    };
  });

  normalizedItems.sort((left, right) => {
    if (sort === 'name') {
      return String(left.nameKr || left.name || '').localeCompare(String(right.nameKr || right.name || ''), 'ko');
    }

    if (sort === 'streamers') {
      if (right.totalStreamers !== left.totalStreamers) {
        return right.totalStreamers - left.totalStreamers;
      }
      return right.totalViewers - left.totalViewers;
    }

    if (right.totalViewers !== left.totalViewers) {
      return right.totalViewers - left.totalViewers;
    }
    return right.totalStreamers - left.totalStreamers;
  });

  const topByViewers = [...normalizedItems].sort((left, right) => right.totalViewers - left.totalViewers)[0] || null;
  const selectedItems = normalizedItems.slice(0, limit);
  const latestUpdatedAt = normalizedItems
    .map((item) => item.updatedAt)
    .filter(Boolean)
    .sort((left, right) => new Date(right) - new Date(left))[0] || null;

  return {
    summary: {
      liveGames: normalizedItems.length,
      totalViewers: normalizedItems.reduce((sum, item) => sum + item.totalViewers, 0),
      totalStreamers: normalizedItems.reduce((sum, item) => sum + item.totalStreamers, 0),
      topGameName: topByViewers?.nameKr || topByViewers?.name || null,
    },
    items: selectedItems,
    meta: {
      platform,
      sort,
      limit,
      total: normalizedItems.length,
      updatedAt: latestUpdatedAt,
    },
  };
};

const handleSettingsMockRequest = (url, options = {}) => {
  const parsedUrl = new URL(url, 'http://localhost');
  const { pathname } = parsedUrl;
  const method = options.method?.toUpperCase() || 'GET';
  const body = parseRequestBody(options.body);

  const overlaySettingMatch = pathname.match(/^\/api\/overlay\/[^/]+\/settings\/([^/]+)$/);
  if (overlaySettingMatch && method === 'GET') {
    const key = decodeURIComponent(overlaySettingMatch[1]);
    const value = settingsState.globalSettings[key];
    return mockResponse({ value: value ? JSON.stringify(value) : '{}' });
  }

  if (/^\/api\/overlay\/[^/]+\/poll\/active$/.test(pathname) && method === 'GET') {
    return mockResponse({ poll: buildOverlayPollMock() });
  }

  const globalSettingMatch = pathname.match(/^\/api\/settings\/([^/]+)$/);
  if (globalSettingMatch && method === 'GET') {
    const key = decodeURIComponent(globalSettingMatch[1]);
    const value = settingsState.globalSettings[key];
    return mockResponse({ value: value ? JSON.stringify(value) : '{}' });
  }

  if (pathname === '/api/settings' && method === 'POST') {
    if (!body.key) {
      return mockErrorResponse(400, '설정 키가 필요합니다.');
    }

    settingsState.globalSettings[body.key] = body.value;
    return mockResponse({ success: true });
  }

  const userSettingMatch = pathname.match(/^\/api\/user-settings\/([^/]+)$/);
  if (userSettingMatch && method === 'GET') {
    const key = decodeURIComponent(userSettingMatch[1]);
    const value = settingsState.userSettings[key];
    return mockResponse({ value: value ? JSON.stringify(value) : '{}' });
  }

  if (pathname === '/api/user-settings' && method === 'GET') {
    return mockResponse({ settings: cloneData(settingsState.userSettings) });
  }

  if (pathname === '/api/user-settings' && method === 'POST') {
    if (!body.key) {
      return mockErrorResponse(400, '설정 키가 필요합니다.');
    }

    settingsState.userSettings[body.key] = body.value;
    return mockResponse({ success: true });
  }

  if (userSettingMatch && method === 'DELETE') {
    const key = decodeURIComponent(userSettingMatch[1]);
    delete settingsState.userSettings[key];
    return mockResponse({ success: true });
  }

  return null;
};

const handleNConnectMockRequest = (url, options = {}) => {
  const parsedUrl = new URL(url, 'http://localhost');
  const { pathname, searchParams } = parsedUrl;
  const method = options.method?.toUpperCase() || 'GET';

  if (pathname === '/api/nconnect/ranking' && method === 'GET') {
    const platform = searchParams.get('platform');

    if (!RANKING_PLATFORM_OPTIONS.has(platform)) {
      return mockErrorResponse(400, '랭킹 플랫폼은 SOOP 또는 치지직만 선택할 수 있습니다.');
    }

    return mockResponse(buildRankingResponse(searchParams));
  }

  if (pathname === '/api/nconnect/contents' && method === 'GET') {
    return mockResponse(buildContentsResponse(searchParams));
  }

  if (pathname === '/api/nconnect/notices' && method === 'GET') {
    const items = cloneData(nconnectNoticesMock).sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.publishedAt) - new Date(a.publishedAt);
    });
    return mockResponse({ items });
  }

  const noticeMatch = pathname.match(/^\/api\/nconnect\/notices\/([^/]+)$/);
  if (noticeMatch && method === 'GET') {
    const item = nconnectNoticesMock.find((notice) => notice.id === noticeMatch[1]);
    return item
      ? mockResponse({ item: cloneData(item) })
      : mockErrorResponse(404, '공지사항을 찾을 수 없습니다.');
  }

  if (pathname === '/api/nconnect/membership-status' && method === 'GET') {
    return mockResponse(buildMembershipStatus());
  }

  return null;
};

const getMockData = (url) => {
  if (url.includes('/api/stats/dashboard')) {
    return dashboardMock;
  }

  if (url.includes('/api/events')) {
    return eventsMock;
  }

  if (url.includes('/api/stats/revenue/trend')) {
    return revenueMock.trend;
  }
  if (url.includes('/api/stats/revenue/by-platform')) {
    return revenueMock.platformData;
  }
  if (url.includes('/api/stats/donations/top-donors')) {
    return revenueMock.topDonors;
  }
  if (url.includes('/api/stats/revenue')) {
    return revenueMock.summary;
  }

  if (url.includes('/api/stats/chat/summary')) {
    return viewerMock.summary;
  }
  if (url.includes('/api/stats/chat/hourly')) {
    return viewerMock.hourlyData;
  }
  if (url.includes('/api/stats/chat/daily')) {
    return viewerMock.dayOfWeekData;
  }
  if (url.includes('/api/stats/activity/timeline')) {
    return viewerMock.activityTimeline;
  }

  if (url.includes('/api/stats/content/category-donations')) {
    return contentMock.categoryDonations;
  }
  if (url.includes('/api/stats/content/category-chats')) {
    return contentMock.categoryChats;
  }
  if (url.includes('/api/stats/content/category-growth')) {
    return contentMock.categoryGrowth;
  }
  if (url.includes('/api/stats/content/hourly-by-category')) {
    return contentMock.hourlyByCategory;
  }

  if (url.includes('/api/categories/trends')) {
    return { success: true, data: catalogMock.trends };
  }
  if (url.includes('/api/categories/stats')) {
    return { success: true, data: catalogMock.stats };
  }
  if (url.match(/\/api\/categories\/[^/]+\/summary/)) {
    return { success: true, data: gameDetailMock.summary };
  }
  if (url.match(/\/api\/categories\/[^/]+\/daily-stats/)) {
    return { success: true, data: gameDetailMock.dailyStats };
  }
  if (url.match(/\/api\/categories\/[^/]+\/platform-stats/)) {
    return { success: true, data: gameDetailMock.platformStats };
  }
  if (url.match(/\/api\/categories\/[^/]+\/streamer-ranking/)) {
    return { success: true, data: gameDetailMock.streamerRanking };
  }
  if (url.match(/\/api\/categories\/[^/]+\/growth-ranking/)) {
    return { success: true, data: gameDetailMock.growthRanking };
  }
  if (url.match(/\/api\/categories\/[^/]+\/ranking-history/)) {
    return { success: true, data: gameDetailMock.rankingHistory };
  }
  if (url.match(/\/api\/categories\/[^/]+\/stats/)) {
    return { success: true, data: gameDetailMock.stats };
  }
  if (url.match(/\/api\/categories\/[^/]+$/)) {
    return { success: true, data: gameDetailMock.data };
  }
  if (url.includes('/api/categories')) {
    return { success: true, data: catalogMock.games };
  }

  if (url.match(/\/api\/streamer\/[^/]+\/stats/)) {
    return { success: true, data: streamerStatsMock };
  }
  if (url.match(/\/api\/streamer\/[^/]+\/categories/)) {
    return { success: true, data: streamerDetailMock.categories };
  }
  if (url.match(/\/api\/streamer\/[^/]+\/ranking/)) {
    return { success: true, data: streamerRankingMock };
  }
  if (url.match(/\/api\/streamer\/[^/]+\/broadcasts\/[^/]+\/segments/)) {
    return { success: true, data: streamerSegmentsMock };
  }
  if (url.match(/\/api\/streamer\/[^/]+\/broadcasts/)) {
    return { success: true, data: streamerBroadcastsMock };
  }
  if (url.match(/\/api\/streamer\/[^/]+$/)) {
    return { success: true, data: streamerDetailMock };
  }

  if (url.includes('/api/broadcasters')) {
    return adminBroadcastersMock;
  }

  if (url.includes('/api/monitor/stats/timeseries')) {
    return {
      viewers: [
        { hour: '2026-02-04T10:00:00Z', platform: 'soop', total_viewers: 180000 },
        { hour: '2026-02-04T10:00:00Z', platform: 'chzzk', total_viewers: 120000 },
        { hour: '2026-02-04T12:00:00Z', platform: 'soop', total_viewers: 220000 },
        { hour: '2026-02-04T12:00:00Z', platform: 'chzzk', total_viewers: 150000 },
        { hour: '2026-02-04T14:00:00Z', platform: 'soop', total_viewers: 250000 },
        { hour: '2026-02-04T14:00:00Z', platform: 'chzzk', total_viewers: 180000 },
      ],
      events: [
        { hour: '2026-02-04T10:00:00Z', event_type: 'chat', count: 45000 },
        { hour: '2026-02-04T10:00:00Z', event_type: 'donation', count: 120 },
        { hour: '2026-02-04T12:00:00Z', event_type: 'chat', count: 62000 },
        { hour: '2026-02-04T12:00:00Z', event_type: 'donation', count: 185 },
        { hour: '2026-02-04T14:00:00Z', event_type: 'chat', count: 78000 },
        { hour: '2026-02-04T14:00:00Z', event_type: 'donation', count: 220 },
      ],
    };
  }
  if (url.includes('/api/monitor/stats/nexon')) {
    return adminMonitorStatsMock.nexon;
  }
  if (url.includes('/api/monitor/stats')) {
    return adminMonitorStatsMock;
  }
  if (url.includes('/api/monitor/broadcasts')) {
    return adminMonitorBroadcastsMock;
  }
  if (url.includes('/api/monitor/persons')) {
    return {
      data: [
        {
          id: 'p1',
          platform: 'soop',
          nickname: '게임스트리머',
          person_type: 'broadcaster',
          follower_count: 125000,
          total_chat_count: 0,
          total_donation_count: 0,
          total_donation_amount: 0,
          last_seen_at: '2026-02-04T14:00:00Z',
        },
        {
          id: 'p2',
          platform: 'chzzk',
          nickname: '시청자23',
          person_type: 'viewer',
          follower_count: 0,
          total_chat_count: 8500,
          total_donation_count: 45,
          total_donation_amount: 350000,
          last_seen_at: '2026-02-04T13:45:00Z',
        },
      ],
      pagination: { page: 1, limit: 30, total: 125000, totalPages: 4167 },
    };
  }
  if (url.includes('/api/monitor/events')) {
    return {
      data: [
        {
          platform: 'soop',
          event_type: 'donation',
          actor_nickname: '시청자23',
          message: '응원합니다',
          amount: 50000,
          target_channel_id: 'ch_001',
          event_timestamp: '2026-02-04T14:00:00Z',
        },
        {
          platform: 'chzzk',
          event_type: 'donation',
          actor_nickname: '시청자A',
          message: '화이팅입니다',
          amount: 10000,
          target_channel_id: 'ch_002',
          event_timestamp: '2026-02-04T13:55:00Z',
        },
      ],
      pagination: { page: 1, limit: 30, total: 2850000, totalPages: 95000 },
    };
  }
  if (url.includes('/api/monitor/segments')) {
    return {
      data: [
        {
          platform: 'soop',
          broadcaster_nickname: '게임장인',
          category_name: '메이플스토리',
          peak_viewer_count: 8500,
          avg_viewer_count: 5200,
          segment_started_at: '2026-02-04T10:00:00Z',
          segment_ended_at: '2026-02-04T12:30:00Z',
        },
      ],
      pagination: { page: 1, limit: 30, total: 45000, totalPages: 1500 },
    };
  }
  if (url.includes('/api/monitor/categories')) {
    return {
      data: [
        {
          platform: 'soop',
          category_name: '메이플스토리',
          thumbnail_url: null,
          viewer_count: 52000,
          streamer_count: 185,
          updated_at: '2026-02-04T14:00:00Z',
        },
        {
          platform: 'chzzk',
          category_name: '메이플스토리',
          thumbnail_url: null,
          viewer_count: 37000,
          streamer_count: 135,
          updated_at: '2026-02-04T14:00:00Z',
        },
      ],
      pagination: { page: 1, limit: 30, total: 80, totalPages: 3 },
    };
  }
  if (url.includes('/api/monitor/engagement')) {
    return {
      data: [
        {
          platform: 'soop',
          viewer_nickname: '시청자23',
          viewer_person_id: 'v1',
          broadcaster_nickname: '게임장인',
          broadcaster_person_id: 'p1',
          chat_count: 450,
          donation_count: 12,
          donation_amount: 350000,
          category_count: 3,
          last_seen_at: '2026-02-04T14:00:00Z',
        },
      ],
      pagination: { page: 1, limit: 30, total: 380000, totalPages: 12667 },
    };
  }

  if (url.includes('/api/auth/me')) {
    return authUserMock;
  }

  if (url.includes('/api/designs')) {
    return [];
  }
  if (url.includes('/api/marketplace')) {
    return { designs: [] };
  }

  console.warn(`[MockAPI] No mock data for: ${url}`);
  return {};
};

export const mockFetch = async (url, options = {}) => {
  if (!USE_MOCK) {
    if (!nativeFetch) {
      throw new Error('Native fetch is not available in this environment.');
    }

    return nativeFetch(url, options);
  }

  const settingsMockResponse = handleSettingsMockRequest(url, options);
  if (settingsMockResponse) {
    return settingsMockResponse;
  }

  const nConnectMockResponse = handleNConnectMockRequest(url, options);
  if (nConnectMockResponse) {
    return nConnectMockResponse;
  }

  const adsMockResponse = handleAdsMockRequest(url, options);
  if (adsMockResponse) {
    return adsMockResponse;
  }

  const method = options.method?.toUpperCase() || 'GET';
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    console.log(`[MockAPI] ${method} ${url} - returning success`);
    return mockResponse({ success: true, message: 'Mock operation successful' });
  }

  console.log(`[MockAPI] GET ${url}`);
  return mockResponse(getMockData(url));
};

export const getMockDataForUrl = (url) => {
  if (!USE_MOCK) return null;
  return getMockData(url);
};

export const resetMockApiState = () => {
  adState = createAdMockState();
  settingsState = createSettingsMockState();
};

export default mockFetch;
