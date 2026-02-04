// ============================================
// Mock API - fetch 래퍼 함수
// ============================================

import {
  dashboardMock,
  eventsMock,
  revenueMock,
  viewerMock,
  contentMock,
  adMock,
  catalogMock,
  gameDetailMock,
  streamerDetailMock,
  streamerStatsMock,
  streamerRankingMock,
  streamerBroadcastsMock,
  streamerSegmentsMock,
  adminBroadcastersMock,
  adminMonitorStatsMock,
  adminMonitorBroadcastsMock,
  settingsMock,
  userSettingsMock,
  authUserMock
} from './mockData';

// 환경 변수로 목업 모드 제어
export const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === 'true';

// 목업 응답 생성 헬퍼
const mockResponse = (data, delay = 100) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        ok: true,
        status: 200,
        json: async () => data,
        text: async () => JSON.stringify(data)
      });
    }, delay);
  });
};

// 목업 에러 응답
const mockErrorResponse = (status, message) => {
  return Promise.resolve({
    ok: false,
    status,
    json: async () => ({ error: message }),
    text: async () => message
  });
};

// URL 패턴 매칭 및 목업 데이터 반환
const getMockData = (url) => {
  // Dashboard
  if (url.includes('/api/stats/dashboard')) {
    return dashboardMock;
  }
  
  // Events
  if (url.includes('/api/events')) {
    return eventsMock;
  }

  // =====================
  // Revenue Analytics
  // =====================
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

  // =====================
  // Viewer Analytics
  // =====================
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

  // =====================
  // Content Analytics
  // =====================
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

  // =====================
  // Ad Analytics
  // =====================
  if (url.includes('/api/ads/trend')) {
    return adMock.trend;
  }
  if (url.includes('/api/ads/slots')) {
    return { slots: adMock.slots };
  }
  if (url.includes('/api/ads/revenue')) {
    return adMock.summary;
  }

  // =====================
  // Game Catalog
  // =====================
  if (url.includes('/api/categories/trends')) {
    return { success: true, data: catalogMock.trends };
  }
  if (url.includes('/api/categories/stats')) {
    return { success: true, data: catalogMock.stats };
  }
  // Game Detail - 특정 gameId 패턴
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

  // =====================
  // Streamer Detail
  // =====================
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

  // =====================
  // Admin - Broadcasters
  // =====================
  if (url.includes('/api/broadcasters')) {
    return adminBroadcastersMock;
  }

  // =====================
  // Admin - Monitor
  // =====================
  if (url.includes('/api/monitor/stats/timeseries')) {
    return {
      viewers: [
        { hour: '2026-02-04T10:00:00Z', platform: 'soop', total_viewers: 180000 },
        { hour: '2026-02-04T10:00:00Z', platform: 'chzzk', total_viewers: 120000 },
        { hour: '2026-02-04T12:00:00Z', platform: 'soop', total_viewers: 220000 },
        { hour: '2026-02-04T12:00:00Z', platform: 'chzzk', total_viewers: 150000 },
        { hour: '2026-02-04T14:00:00Z', platform: 'soop', total_viewers: 250000 },
        { hour: '2026-02-04T14:00:00Z', platform: 'chzzk', total_viewers: 180000 }
      ],
      events: [
        { hour: '2026-02-04T10:00:00Z', event_type: 'chat', count: 45000 },
        { hour: '2026-02-04T10:00:00Z', event_type: 'donation', count: 120 },
        { hour: '2026-02-04T12:00:00Z', event_type: 'chat', count: 62000 },
        { hour: '2026-02-04T12:00:00Z', event_type: 'donation', count: 185 },
        { hour: '2026-02-04T14:00:00Z', event_type: 'chat', count: 78000 },
        { hour: '2026-02-04T14:00:00Z', event_type: 'donation', count: 220 }
      ]
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
        { id: 'p1', platform: 'soop', nickname: '게임왕', person_type: 'broadcaster', follower_count: 125000, total_chat_count: 0, total_donation_count: 0, total_donation_amount: 0, last_seen_at: '2026-02-04T14:00:00Z' },
        { id: 'p2', platform: 'chzzk', nickname: '팬123', person_type: 'viewer', follower_count: 0, total_chat_count: 8500, total_donation_count: 45, total_donation_amount: 350000, last_seen_at: '2026-02-04T13:45:00Z' }
      ],
      pagination: { page: 1, limit: 30, total: 125000, totalPages: 4167 }
    };
  }
  if (url.includes('/api/monitor/events')) {
    return {
      data: [
        { platform: 'soop', event_type: 'donation', actor_nickname: '팬123', message: '화이팅!', amount: 50000, target_channel_id: 'ch_001', event_timestamp: '2026-02-04T14:00:00Z' },
        { platform: 'chzzk', event_type: 'donation', actor_nickname: '시청자A', message: '응원합니다', amount: 10000, target_channel_id: 'ch_002', event_timestamp: '2026-02-04T13:55:00Z' }
      ],
      pagination: { page: 1, limit: 30, total: 2850000, totalPages: 95000 }
    };
  }
  if (url.includes('/api/monitor/segments')) {
    return {
      data: [
        { platform: 'soop', broadcaster_nickname: '게임왕', category_name: '메이플스토리', peak_viewer_count: 8500, avg_viewer_count: 5200, segment_started_at: '2026-02-04T10:00:00Z', segment_ended_at: '2026-02-04T12:30:00Z' }
      ],
      pagination: { page: 1, limit: 30, total: 45000, totalPages: 1500 }
    };
  }
  if (url.includes('/api/monitor/categories')) {
    return {
      data: [
        { platform: 'soop', category_name: '메이플스토리', thumbnail_url: null, viewer_count: 52000, streamer_count: 185, updated_at: '2026-02-04T14:00:00Z' },
        { platform: 'chzzk', category_name: '메이플스토리', thumbnail_url: null, viewer_count: 37000, streamer_count: 135, updated_at: '2026-02-04T14:00:00Z' }
      ],
      pagination: { page: 1, limit: 30, total: 80, totalPages: 3 }
    };
  }
  if (url.includes('/api/monitor/engagement')) {
    return {
      data: [
        { platform: 'soop', viewer_nickname: '팬123', viewer_person_id: 'v1', broadcaster_nickname: '게임왕', broadcaster_person_id: 'p1', chat_count: 450, donation_count: 12, donation_amount: 350000, category_count: 3, last_seen_at: '2026-02-04T14:00:00Z' }
      ],
      pagination: { page: 1, limit: 30, total: 380000, totalPages: 12667 }
    };
  }

  // =====================
  // Settings
  // =====================
  if (url.includes('/api/user-settings')) {
    return userSettingsMock;
  }
  if (url.includes('/api/settings')) {
    return settingsMock;
  }

  // =====================
  // Auth
  // =====================
  if (url.includes('/api/auth/me')) {
    return authUserMock;
  }

  // =====================
  // Designs / Marketplace
  // =====================
  if (url.includes('/api/designs')) {
    return [];
  }
  if (url.includes('/api/marketplace')) {
    return { designs: [] };
  }

  // 기본 빈 응답
  console.warn(`[MockAPI] No mock data for: ${url}`);
  return {};
};

/**
 * Mock fetch 함수 - 원본 fetch를 래핑하여 목업 모드일 때 목업 데이터 반환
 * @param {string} url - 요청 URL
 * @param {object} options - fetch 옵션
 * @returns {Promise} - Response 객체
 */
export const mockFetch = async (url, options = {}) => {
  // 목업 모드가 아니면 원본 fetch 사용
  if (!USE_MOCK) {
    return fetch(url, options);
  }

  // POST/PUT/DELETE 요청은 성공 응답만 반환
  const method = options.method?.toUpperCase() || 'GET';
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    console.log(`[MockAPI] ${method} ${url} - returning success`);
    return mockResponse({ success: true, message: 'Mock operation successful' });
  }

  // GET 요청에 대해 목업 데이터 반환
  console.log(`[MockAPI] GET ${url}`);
  const data = getMockData(url);
  return mockResponse(data);
};

/**
 * API URL에 대해 목업 데이터를 직접 가져오는 헬퍼 함수
 * @param {string} url - API URL
 * @returns {any} - 목업 데이터
 */
export const getMockDataForUrl = (url) => {
  if (!USE_MOCK) return null;
  return getMockData(url);
};

export default mockFetch;
