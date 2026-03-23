// ============================================
// 통합 목업 데이터 - 스트리밍 에이전트
// ============================================

const getNConnectTier = (rank) => {
  if (rank <= 5) return '핵심 파트너';
  if (rank <= 15) return '핵심 성장 파트너';
  if (rank <= 35) return '안정적 기여 파트너';
  if (rank <= 65) return '참여 유지';
  return '동기부여';
};

const getSalaryBand = (rank) => {
  if (rank <= 5) return '월 3,250만원';
  if (rank <= 15) return '월 1,550만원';
  if (rank <= 35) return '월 650만원';
  if (rank <= 65) return '월 140만원';
  return '월 30만원';
};

const getIncentiveBand = (rank) => {
  if (rank <= 5) return '월 1,400만원';
  if (rank <= 15) return '월 600만원';
  if (rank <= 35) return '월 150만원';
  if (rank <= 65) return '월 55만원';
  return '월 10만원';
};

const nconnectCreatorSeed = [
  { displayName: '감스트', platform: 'soop' },
  { displayName: '이상호', platform: 'soop' },
  { displayName: '괴물쥐', platform: 'chzzk' },
  { displayName: '팡이요', platform: 'soop' },
  { displayName: '풍월량', platform: 'chzzk' },
  { displayName: '한동숙', platform: 'chzzk' },
  { displayName: '두치와뿌꾸', platform: 'soop' },
  { displayName: '탬탬버린', platform: 'chzzk' },
  { displayName: '김민교', platform: 'soop' },
  { displayName: '러너', platform: 'chzzk' },
  { displayName: '안녕수야', platform: 'soop' },
  { displayName: '따효니', platform: 'chzzk' },
  { displayName: '울프', platform: 'chzzk' },
  { displayName: '킴성태', platform: 'soop' },
  { displayName: '텐코 시부키', platform: 'chzzk' },
  { displayName: '제갈금자', platform: 'soop' },
  { displayName: '서새봄', platform: 'chzzk' },
  { displayName: '타요', platform: 'soop' },
  { displayName: '빅헤드', platform: 'chzzk' },
  { displayName: '깨박이', platform: 'soop' },
];

const buildNConnectRanking = () =>
  Array.from({ length: 100 }, (_, index) => {
    const rank = index + 1;
    const creator = nconnectCreatorSeed[index] || {
      displayName: `N커넥터 ${String(rank).padStart(2, '0')}`,
      platform: rank % 2 === 0 ? 'chzzk' : 'soop',
    };
    const activityPoints = Math.max(340, 1880 - index * 14);
    const viewershipPoints = Math.max(260, 1420 - index * 10);
    const ingamePoints = Math.max(180, 980 - index * 7);

    return {
      rank,
      personId: 1000 + rank,
      displayName: creator.displayName,
      platform: creator.platform,
      tier: getNConnectTier(rank),
      totalPoints: activityPoints + viewershipPoints + ingamePoints,
      activityPoints,
      viewershipPoints,
      ingamePoints,
      monthlySalaryBand: getSalaryBand(rank),
      monthlyIncentiveBand: getIncentiveBand(rank),
    };
  });

// =====================
// Dashboard 관련 데이터
// =====================
export const dashboardMock = {
  todayDonation: 1250000,
  donationCount: 45,
  peakViewers: 1823,
  newSubs: 127,
  insights: [
    { type: 'donation', message: '이번 주 후원금이 지난 주 대비 23% 증가했습니다', value: '+23%' },
    { type: 'viewers', message: '오늘 최고 시청자 수가 평균 대비 높습니다', value: '1,823명' },
    { type: 'platform', message: 'SOOP에서의 활동이 가장 활발합니다', value: 'SOOP 78%' }
  ],
  myCategories: [
    { categoryId: 1, name: '메이플스토리', imageUrl: null, genre: 'MMORPG', broadcastCount: 12, totalMinutes: 4320, peakViewers: 1823, lastBroadcastAt: '2026-02-03T18:00:00Z' },
    { categoryId: 2, name: 'FC 온라인', imageUrl: null, genre: '스포츠', broadcastCount: 8, totalMinutes: 2880, peakViewers: 1456, lastBroadcastAt: '2026-02-02T20:00:00Z' },
    { categoryId: 3, name: '발로란트', imageUrl: null, genre: 'FPS', broadcastCount: 5, totalMinutes: 1500, peakViewers: 987, lastBroadcastAt: '2026-01-30T22:00:00Z' }
  ],
  topCategories: [
    { categoryId: 1, name: '리그 오브 레전드', totalViewers: 125000, totalStreamers: 450 },
    { categoryId: 2, name: '메이플스토리', totalViewers: 89000, totalStreamers: 320 },
    { categoryId: 3, name: 'FC 온라인', totalViewers: 67000, totalStreamers: 280 }
  ],
  hourlyActivity: [
    { hour: '00:00', viewers: 450, chats: 1200 },
    { hour: '02:00', viewers: 230, chats: 560 },
    { hour: '04:00', viewers: 120, chats: 280 },
    { hour: '06:00', viewers: 180, chats: 420 },
    { hour: '08:00', viewers: 340, chats: 890 },
    { hour: '10:00', viewers: 560, chats: 1450 },
    { hour: '12:00', viewers: 780, chats: 2100 },
    { hour: '14:00', viewers: 890, chats: 2400 },
    { hour: '16:00', viewers: 1120, chats: 3200 },
    { hour: '18:00', viewers: 1450, chats: 4100 },
    { hour: '20:00', viewers: 1823, chats: 5200 },
    { hour: '22:00', viewers: 1340, chats: 3800 }
  ],
  weeklyTrend: [
    { date: '2026-02-04', activeViewers: 1823, totalChats: 5200 },
    { date: '2026-02-03', activeViewers: 1650, totalChats: 4800 },
    { date: '2026-02-02', activeViewers: 1420, totalChats: 4200 },
    { date: '2026-02-01', activeViewers: 1580, totalChats: 4500 },
    { date: '2026-01-31', activeViewers: 1320, totalChats: 3900 },
    { date: '2026-01-30', activeViewers: 1180, totalChats: 3400 },
    { date: '2026-01-29', activeViewers: 1250, totalChats: 3600 }
  ],
  peakHourSummary: {
    peakHour: '20시',
    uniqueViewers: 8450,
    totalChats: 28900,
    activeDays: 6
  }
};

export const eventsMock = [
  { id: 1, type: 'donation', platform: 'soop', sender: '팬123', amount: 50000, message: '화이팅!', timestamp: '2026-02-04T20:30:00Z' },
  { id: 2, type: 'donation', platform: 'chzzk', sender: '시청자A', amount: 10000, message: '재밌어요', timestamp: '2026-02-04T20:28:00Z' },
  { id: 3, type: 'donation', platform: 'soop', sender: '단골팬', amount: 30000, message: '오늘도 방송 감사합니다', timestamp: '2026-02-04T20:25:00Z' },
  { id: 4, type: 'chat', platform: 'soop', sender: '유저1', message: 'ㅋㅋㅋㅋ', timestamp: '2026-02-04T20:24:00Z' },
  { id: 5, type: 'donation', platform: 'chzzk', sender: '익명', amount: 5000, message: '', timestamp: '2026-02-04T20:20:00Z' }
];

// =====================
// Revenue Analytics 데이터
// =====================
export const revenueMock = {
  summary: {
    totalRevenue: 1250000,
    donationRevenue: 1250000,
    donationCount: 45,
    adRevenue: 0
  },
  trend: [
    { date: '01/29', donations: 180000, adRevenue: 0 },
    { date: '01/30', donations: 220000, adRevenue: 0 },
    { date: '01/31', donations: 150000, adRevenue: 0 },
    { date: '02/01', donations: 280000, adRevenue: 0 },
    { date: '02/02', donations: 190000, adRevenue: 0 },
    { date: '02/03', donations: 230000, adRevenue: 0 },
    { date: '02/04', donations: 0, adRevenue: 0 }
  ],
  platformData: [
    { name: 'SOOP', value: 850000, color: '#5c3cff' },
    { name: 'Chzzk', value: 400000, color: '#00c896' }
  ],
  topDonors: [
    { sender: '팬123', total: 350000, count: 12, platform: 'soop' },
    { sender: '단골팬', total: 280000, count: 8, platform: 'soop' },
    { sender: '시청자A', total: 150000, count: 15, platform: 'chzzk' },
    { sender: '후원러', total: 120000, count: 6, platform: 'chzzk' },
    { sender: '익명후원자', total: 100000, count: 20, platform: 'soop' }
  ]
};

// =====================
// Viewer Analytics 데이터
// =====================
export const viewerMock = {
  summary: {
    uniqueViewers: 8450,
    totalChats: 28900,
    activeChannels: 3,
    activeDays: 6,
    peakHour: '20시',
    peakViewerCount: 1823,
    peakChatCount: 5200,
    peakBroadcastViewers: 1823
  },
  hourlyData: [
    { hour: '00시', viewers: 450, chats: 1200 },
    { hour: '02시', viewers: 230, chats: 560 },
    { hour: '04시', viewers: 120, chats: 280 },
    { hour: '06시', viewers: 180, chats: 420 },
    { hour: '08시', viewers: 340, chats: 890 },
    { hour: '10시', viewers: 560, chats: 1450 },
    { hour: '12시', viewers: 780, chats: 2100 },
    { hour: '14시', viewers: 890, chats: 2400 },
    { hour: '16시', viewers: 1120, chats: 3200 },
    { hour: '18시', viewers: 1450, chats: 4100 },
    { hour: '20시', viewers: 1823, chats: 5200 },
    { hour: '22시', viewers: 1340, chats: 3800 }
  ],
  dayOfWeekData: [
    { day: '월', viewers: 1250, chats: 3600 },
    { day: '화', viewers: 1180, chats: 3400 },
    { day: '수', viewers: 1320, chats: 3900 },
    { day: '목', viewers: 1580, chats: 4500 },
    { day: '금', viewers: 1420, chats: 4200 },
    { day: '토', viewers: 1650, chats: 4800 },
    { day: '일', viewers: 1823, chats: 5200 }
  ],
  activityTimeline: [
    { date: '2026-02-04', activeViewers: 1823, totalChats: 5200, engagementCount: 45 },
    { date: '2026-02-03', activeViewers: 1650, totalChats: 4800, engagementCount: 38 },
    { date: '2026-02-02', activeViewers: 1420, totalChats: 4200, engagementCount: 32 },
    { date: '2026-02-01', activeViewers: 1580, totalChats: 4500, engagementCount: 41 },
    { date: '2026-01-31', activeViewers: 1320, totalChats: 3900, engagementCount: 28 },
    { date: '2026-01-30', activeViewers: 1180, totalChats: 3400, engagementCount: 25 },
    { date: '2026-01-29', activeViewers: 1250, totalChats: 3600, engagementCount: 30 }
  ]
};

// =====================
// Content Analytics 데이터
// =====================
export const contentMock = {
  categoryDonations: [
    { name: '메이플스토리', value: 520000, percent: 42 },
    { name: 'FC 온라인', value: 380000, percent: 30 },
    { name: '발로란트', value: 210000, percent: 17 },
    { name: '저스트 채팅', value: 140000, percent: 11 }
  ],
  categoryChats: [
    { name: '메이플스토리', value: 12500, percent: 43 },
    { name: 'FC 온라인', value: 8900, percent: 31 },
    { name: '발로란트', value: 4500, percent: 16 },
    { name: '저스트 채팅', value: 3000, percent: 10 }
  ],
  categoryGrowth: [
    { name: '메이플스토리', growth: 15 },
    { name: 'FC 온라인', growth: 8 },
    { name: '발로란트', growth: -3 },
    { name: '저스트 채팅', growth: 22 }
  ],
  hourlyByCategory: [
    { hour: '18시', donations: 45, chats: 1200 },
    { hour: '19시', donations: 62, chats: 1580 },
    { hour: '20시', donations: 85, chats: 2100 },
    { hour: '21시', donations: 78, chats: 1950 },
    { hour: '22시', donations: 56, chats: 1420 },
    { hour: '23시', donations: 38, chats: 980 }
  ]
};

// =====================
// Ad Analytics 데이터
// =====================
export const adMock = {
  summary: {
    totalImpressions: 125000,
    totalClicks: 3750,
    totalRevenue: 187500,
    ctr: 3.0,
    avgRevenuePerClick: 50,
    pendingSettlement: 45000
  },
  trend: [
    { date: '01/29', impressions: 18000, clicks: 540, revenue: 27000 },
    { date: '01/30', impressions: 19500, clicks: 585, revenue: 29250 },
    { date: '01/31', impressions: 17000, clicks: 510, revenue: 25500 },
    { date: '02/01', impressions: 21000, clicks: 630, revenue: 31500 },
    { date: '02/02', impressions: 18500, clicks: 555, revenue: 27750 },
    { date: '02/03', impressions: 20000, clicks: 600, revenue: 30000 },
    { date: '02/04', impressions: 11000, clicks: 330, revenue: 16500 }
  ],
  slots: [
    { name: '상단 배너', impressions: 45000, clicks: 1350, revenue: 67500, enabled: true },
    { name: '사이드 배너', impressions: 38000, clicks: 1140, revenue: 57000, enabled: true },
    { name: '하단 배너', impressions: 28000, clicks: 840, revenue: 42000, enabled: true },
    { name: '오버레이 광고', impressions: 14000, clicks: 420, revenue: 21000, enabled: false }
  ]
};

// =====================
// Game Catalog 데이터
// =====================
export const adSettingsMock = {
  slots: [
    {
      id: 1,
      name: '하단 메인 배너',
      type: 'banner',
      position: { x: 2, y: 84 },
      size: { width: 320, height: 100 },
      enabled: true,
      impressions: 12540,
      clicks: 342,
      revenue: 45000,
    },
    {
      id: 2,
      name: '우측 상단 코너',
      type: 'corner',
      position: { x: 82, y: 2 },
      size: { width: 200, height: 200 },
      enabled: true,
      impressions: 8320,
      clicks: 156,
      revenue: 28000,
    },
    {
      id: 3,
      name: '이벤트 팝업',
      type: 'popup',
      position: { x: 34, y: 18 },
      size: { width: 480, height: 270 },
      enabled: false,
      impressions: 2950,
      clicks: 41,
      revenue: 4000,
    },
  ],
  summary: {
    totalImpressions: 23810,
    totalClicks: 539,
    totalRevenue: 77000,
    ctr: 2.26,
    avgRevenuePerClick: 143,
    pendingSettlement: 42000,
  },
  settlements: [
    {
      period: '2026-03',
      revenue: 42000,
      impressions: 23810,
      clicks: 539,
      status: 'pending',
      paidDate: null,
    },
    {
      period: '2026-02',
      revenue: 118000,
      impressions: 62400,
      clicks: 1412,
      status: 'paid',
      paidDate: '2026-03-05',
    },
    {
      period: '2026-01',
      revenue: 96000,
      impressions: 51120,
      clicks: 1188,
      status: 'paid',
      paidDate: '2026-02-05',
    },
  ],
};

export const advertiserCampaignsMock = [
  {
    id: 101,
    name: '봄 시즌 신작 런칭',
    content_type: 'image',
    content_url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80',
    click_url: 'https://brand.example.com/spring-launch',
    budget_daily: 150000,
    budget_total: 1800000,
    budget_spent: 620000,
    spent: 620000,
    cpm: 3200,
    cpc: 180,
    start_date: '2026-03-01',
    end_date: '2026-03-31',
    target_streamers: 'all',
    target_categories: ['game', 'talk'],
    status: 'active',
    impressions: 184000,
    clicks: 5120,
    created_at: '2026-02-25T09:00:00Z',
  },
  {
    id: 102,
    name: '브랜드 인지도 영상 캠페인',
    content_type: 'video',
    content_url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    click_url: 'https://brand.example.com/awareness',
    budget_daily: 120000,
    budget_total: 1400000,
    budget_spent: 410000,
    spent: 410000,
    cpm: 2800,
    cpc: 150,
    start_date: '2026-03-04',
    end_date: '2026-03-28',
    target_streamers: JSON.stringify(['1', '2', '3']),
    target_categories: ['music', 'talk'],
    status: 'active',
    impressions: 126000,
    clicks: 2680,
    created_at: '2026-02-27T13:30:00Z',
  },
  {
    id: 103,
    name: '사전예약 리타겟팅',
    content_type: 'image',
    content_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80',
    click_url: 'https://brand.example.com/preregister',
    budget_daily: 90000,
    budget_total: 900000,
    budget_spent: 180000,
    spent: 180000,
    cpm: 2100,
    cpc: 120,
    start_date: '2026-03-10',
    end_date: '2026-03-26',
    target_streamers: 'all',
    target_categories: ['game'],
    status: 'paused',
    impressions: 54000,
    clicks: 1320,
    created_at: '2026-03-02T11:00:00Z',
  },
  {
    id: 104,
    name: '라이브 커머스 사전 홍보',
    content_type: 'image',
    content_url: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=800&q=80',
    click_url: 'https://brand.example.com/live-commerce',
    budget_daily: 70000,
    budget_total: 650000,
    budget_spent: 0,
    spent: 0,
    cpm: 1800,
    cpc: 90,
    start_date: '2026-03-20',
    end_date: '2026-04-05',
    target_streamers: JSON.stringify(['2', '4']),
    target_categories: ['talk', 'education'],
    status: 'pending',
    impressions: 0,
    clicks: 0,
    created_at: '2026-03-15T08:20:00Z',
  },
];

export const advertiserBillingMock = {
  summary: {
    monthlySpent: 1030000,
    remainingBudget: 3720000,
    activeCampaigns: 2,
    pendingInvoice: 480000,
  },
  monthlyStatements: [
    {
      month: '2026-03',
      amount: 480000,
      status: 'scheduled',
      dueDate: '2026-04-05',
      paidDate: null,
    },
    {
      month: '2026-02',
      amount: 760000,
      status: 'paid',
      dueDate: '2026-03-05',
      paidDate: '2026-03-04',
    },
    {
      month: '2026-01',
      amount: 920000,
      status: 'paid',
      dueDate: '2026-02-05',
      paidDate: '2026-02-05',
    },
  ],
};

export const advertiserStreamersMock = [
  { id: '1', displayName: '감스트', viewersAvg: 5200 },
  { id: '2', displayName: '수피', viewersAvg: 3100 },
  { id: '3', displayName: '뮤직온', viewersAvg: 2100 },
  { id: '4', displayName: '토크웨이브', viewersAvg: 1700 },
  { id: '5', displayName: '게임연구소', viewersAvg: 980 },
];

export const catalogMock = {
  games: [
    { id: 1, name: 'League of Legends', nameKr: '리그 오브 레전드', genre: 'MOBA', genres: ['MOBA', 'Strategy'], imageUrl: null, totalViewers: 125000, totalStreamers: 450, platforms: ['soop', 'chzzk'] },
    { id: 2, name: 'MapleStory', nameKr: '메이플스토리', genre: 'MMORPG', genres: ['MMORPG', 'Adventure'], imageUrl: null, totalViewers: 89000, totalStreamers: 320, platforms: ['soop', 'chzzk'] },
    { id: 3, name: 'FC Online', nameKr: 'FC 온라인', genre: 'Sports', genres: ['Sports', 'Simulation'], imageUrl: null, totalViewers: 67000, totalStreamers: 280, platforms: ['soop', 'chzzk'] },
    { id: 4, name: 'VALORANT', nameKr: '발로란트', genre: 'FPS', genres: ['FPS', 'Tactical'], imageUrl: null, totalViewers: 58000, totalStreamers: 210, platforms: ['soop', 'chzzk'] },
    { id: 5, name: 'Dungeon & Fighter', nameKr: '던전앤파이터', genre: 'Action RPG', genres: ['Action', 'RPG'], imageUrl: null, totalViewers: 45000, totalStreamers: 180, platforms: ['soop', 'chzzk'] },
    { id: 6, name: 'Lost Ark', nameKr: '로스트아크', genre: 'MMORPG', genres: ['MMORPG', 'Action'], imageUrl: null, totalViewers: 42000, totalStreamers: 165, platforms: ['soop', 'chzzk'] },
    { id: 7, name: 'Overwatch 2', nameKr: '오버워치 2', genre: 'FPS', genres: ['FPS', 'Team-based'], imageUrl: null, totalViewers: 38000, totalStreamers: 145, platforms: ['soop', 'chzzk'] },
    { id: 8, name: 'KartRider: Drift', nameKr: '카트라이더: 드리프트', genre: 'Racing', genres: ['Racing', 'Casual'], imageUrl: null, totalViewers: 28000, totalStreamers: 120, platforms: ['soop', 'chzzk'] }
  ],
  stats: {
    total_viewers: 492000,
    total_streamers: 1870,
    total_games: 45,
    soop_categories: 42,
    chzzk_categories: 38,
    shared_categories: 35
  },
  trends: {
    categories: [
      { id: 1, key: 'lol', name: '리그 오브 레전드', totalViewers: 125000 },
      { id: 2, key: 'maple', name: '메이플스토리', totalViewers: 89000 },
      { id: 3, key: 'fc', name: 'FC 온라인', totalViewers: 67000 },
      { id: 4, key: 'val', name: '발로란트', totalViewers: 58000 },
      { id: 5, key: 'dnf', name: '던전앤파이터', totalViewers: 45000 }
    ],
    dailyData: [
      { date: '2026-01-29', lol: 120000, maple: 85000, fc: 65000, val: 55000, dnf: 42000 },
      { date: '2026-01-30', lol: 122000, maple: 87000, fc: 66000, val: 56000, dnf: 43000 },
      { date: '2026-01-31', lol: 118000, maple: 84000, fc: 64000, val: 54000, dnf: 41000 },
      { date: '2026-02-01', lol: 125000, maple: 89000, fc: 67000, val: 58000, dnf: 45000 },
      { date: '2026-02-02', lol: 123000, maple: 88000, fc: 66000, val: 57000, dnf: 44000 },
      { date: '2026-02-03', lol: 124000, maple: 88500, fc: 66500, val: 57500, dnf: 44500 },
      { date: '2026-02-04', lol: 125000, maple: 89000, fc: 67000, val: 58000, dnf: 45000 }
    ]
  }
};

const buildNConnectContentsMock = () => {
  const nexonPublishers = {
    2: 'NEXON',
    3: 'NEXON',
    5: 'NEXON',
    8: 'NEXON',
  };

  const weightsByGame = {
    2: { soop: 0.58, chzzk: 0.42 },
    3: { soop: 0.53, chzzk: 0.47 },
    5: { soop: 0.49, chzzk: 0.51 },
    8: { soop: 0.61, chzzk: 0.39 },
  };

  const items = catalogMock.games
    .filter((game) => [2, 3, 5, 8].includes(game.id))
    .map((game) => {
      const weights = weightsByGame[game.id] || { soop: 0.5, chzzk: 0.5 };
      const soopViewers = Math.round(game.totalViewers * weights.soop);
      const chzzkViewers = game.totalViewers - soopViewers;
      const soopStreamers = Math.round(game.totalStreamers * weights.soop);
      const chzzkStreamers = game.totalStreamers - soopStreamers;

      return {
        gameId: game.id,
        name: game.name,
        nameKr: game.nameKr,
        genre: game.genre,
        publisher: nexonPublishers[game.id],
        imageUrl: game.imageUrl,
        totalViewers: game.totalViewers,
        totalStreamers: game.totalStreamers,
        updatedAt: '2026-03-18T14:20:00+09:00',
        platforms: [
          {
            platform: 'soop',
            categoryId: `soop-${game.id}`,
            categoryName: game.nameKr,
            viewerCount: soopViewers,
            streamerCount: soopStreamers,
            thumbnailUrl: game.imageUrl,
          },
          {
            platform: 'chzzk',
            categoryId: `chzzk-${game.id}`,
            categoryName: game.nameKr,
            viewerCount: chzzkViewers,
            streamerCount: chzzkStreamers,
            thumbnailUrl: game.imageUrl,
          },
        ],
      };
    })
    .sort((left, right) => right.totalViewers - left.totalViewers);

  return {
    summary: {
      liveGames: items.length,
      totalViewers: items.reduce((sum, item) => sum + item.totalViewers, 0),
      totalStreamers: items.reduce((sum, item) => sum + item.totalStreamers, 0),
      topGameName: items[0]?.nameKr || null,
    },
    items,
    meta: {
      platform: 'all',
      sort: 'viewers',
      limit: 24,
      total: items.length,
      updatedAt: '2026-03-18T14:20:00+09:00',
    },
  };
};

// =====================
// Game Detail 데이터
// =====================
export const gameDetailMock = {
  data: {
    id: 2,
    name: 'MapleStory',
    nameKr: '메이플스토리',
    genre: 'MMORPG',
    genres: ['MMORPG', 'Adventure', 'Fantasy'],
    themes: ['Fantasy', 'Anime'],
    imageUrl: null,
    publisher: 'NEXON',
    developer: 'NEXON Korea',
    releaseDate: '2003-04-29',
    description: '메이플스토리는 2D 횡스크롤 MMORPG로, 다양한 직업과 캐릭터 커스터마이징을 제공합니다.',
    summary: '귀여운 그래픽과 다양한 콘텐츠로 사랑받는 장수 온라인 게임입니다.',
    igdbRating: 78,
    igdbFollowers: 125000,
    totalViewers: 89000,
    totalStreamers: 320,
    platforms: [
      { platform: 'soop', categoryName: '메이플스토리', viewerCount: 52000, streamerCount: 185 },
      { platform: 'chzzk', categoryName: '메이플스토리', viewerCount: 37000, streamerCount: 135 }
    ]
  },
  summary: {
    current: {
      peakViewers: 89000,
      avgViewers: 45000,
      viewership: 2700000,
      peakStreamers: 320,
      avgStreamers: 180
    },
    changes: {
      peakViewers: { diff: 5000, percent: 5.9 },
      avgViewers: { diff: 3000, percent: 7.1 },
      viewership: { diff: 200000, percent: 8.0 },
      peakStreamers: { diff: 20, percent: 6.7 },
      avgStreamers: { diff: 15, percent: 9.1 }
    },
    liveComparison: {
      viewers: { yesterday: 84000 },
      streamers: { yesterday: 300 }
    }
  },
  stats: [
    { recorded_at: '2026-02-04T12:00:00Z', total_viewers: 89000, total_streamers: 320 },
    { recorded_at: '2026-02-04T08:00:00Z', total_viewers: 45000, total_streamers: 180 },
    { recorded_at: '2026-02-04T04:00:00Z', total_viewers: 28000, total_streamers: 120 },
    { recorded_at: '2026-02-03T20:00:00Z', total_viewers: 85000, total_streamers: 310 },
    { recorded_at: '2026-02-03T16:00:00Z', total_viewers: 72000, total_streamers: 280 }
  ],
  dailyStats: [
    { date: '2026-02-04', peak_viewers: 89000, avg_viewers: 45000, peak_streamers: 320, avg_streamers: 180 },
    { date: '2026-02-03', peak_viewers: 85000, avg_viewers: 43000, peak_streamers: 310, avg_streamers: 175 },
    { date: '2026-02-02', peak_viewers: 82000, avg_viewers: 41000, peak_streamers: 300, avg_streamers: 170 },
    { date: '2026-02-01', peak_viewers: 88000, avg_viewers: 44000, peak_streamers: 318, avg_streamers: 178 },
    { date: '2026-01-31', peak_viewers: 80000, avg_viewers: 40000, peak_streamers: 295, avg_streamers: 165 },
    { date: '2026-01-30', peak_viewers: 78000, avg_viewers: 39000, peak_streamers: 290, avg_streamers: 162 },
    { date: '2026-01-29', peak_viewers: 76000, avg_viewers: 38000, peak_streamers: 285, avg_streamers: 160 }
  ],
  platformStats: {
    summary: [
      { platform: 'soop', peak_viewers: 52000, avg_viewers: 26000, peak_streamers: 185, avg_streamers: 105 },
      { platform: 'chzzk', peak_viewers: 37000, avg_viewers: 19000, peak_streamers: 135, avg_streamers: 75 }
    ],
    timeSeries: [
      { date: '2026-02-04', platform: 'soop', peak_viewers: 52000, peak_streamers: 185 },
      { date: '2026-02-04', platform: 'chzzk', peak_viewers: 37000, peak_streamers: 135 },
      { date: '2026-02-03', platform: 'soop', peak_viewers: 50000, peak_streamers: 180 },
      { date: '2026-02-03', platform: 'chzzk', peak_viewers: 35000, peak_streamers: 130 }
    ]
  },
  streamerRanking: [
    { nickname: '메이플왕', platform: 'soop', person_id: 'p1', peak_viewers: 12500, avg_viewers: 8500, broadcast_count: 28, total_minutes: 5040, profile_image_url: null },
    { nickname: '단풍스트리머', platform: 'chzzk', person_id: 'p2', peak_viewers: 9800, avg_viewers: 6200, broadcast_count: 24, total_minutes: 4320, profile_image_url: null },
    { nickname: '보스사냥꾼', platform: 'soop', person_id: 'p3', peak_viewers: 8500, avg_viewers: 5400, broadcast_count: 22, total_minutes: 3960, profile_image_url: null },
    { nickname: '메이플마스터', platform: 'chzzk', person_id: 'p4', peak_viewers: 7200, avg_viewers: 4800, broadcast_count: 20, total_minutes: 3600, profile_image_url: null },
    { nickname: '레벨업전문가', platform: 'soop', person_id: 'p5', peak_viewers: 6500, avg_viewers: 4200, broadcast_count: 18, total_minutes: 3240, profile_image_url: null }
  ],
  growthRanking: [
    { nickname: '신예스트리머', platform: 'soop', person_id: 'p6', avg_viewers: 3500, prev_avg_viewers: 1800, growth: 94.4, profile_image_url: null },
    { nickname: '떠오르는별', platform: 'chzzk', person_id: 'p7', avg_viewers: 2800, prev_avg_viewers: 1600, growth: 75.0, profile_image_url: null },
    { nickname: '성장중인BJ', platform: 'soop', person_id: 'p8', avg_viewers: 4200, prev_avg_viewers: 2800, growth: 50.0, profile_image_url: null }
  ],
  rankingHistory: [
    { nickname: '메이플왕', platform: 'soop', person_id: 'p1', peak_viewers: 11800, avg_viewers: 8200, started_at: '2026-02-03T18:00:00Z', title: '검은마법사 레이드 도전!', profile_image_url: null },
    { nickname: '단풍스트리머', platform: 'chzzk', person_id: 'p2', peak_viewers: 9200, avg_viewers: 5800, started_at: '2026-02-03T19:00:00Z', title: '신규 시청자 환영 방송', profile_image_url: null }
  ]
};

// =====================
// Streamer Detail 데이터
// =====================
export const streamerDetailMock = {
  person: {
    id: 'p1',
    nickname: '게임하는소희',
    platform: 'soop',
    profile_image_url: null
  },
  live: null,
  stats: {
    all_time_peak: 15800,
    overall_avg: 5200,
    total_minutes: 52560,
    total_broadcasts: 245,
    last_broadcast_at: '2026-02-03T23:30:00Z'
  },
  eventStats: {
    total_donation_amount: 12500000,
    total_donation_count: 458
  },
  categories: [
    { category_name: '메이플스토리', broadcast_count: 120, total_minutes: 21600, peak_viewers: 15800, avg_viewers: 5500 },
    { category_name: 'FC 온라인', broadcast_count: 65, total_minutes: 11700, peak_viewers: 8200, avg_viewers: 4200 },
    { category_name: '저스트 채팅', broadcast_count: 40, total_minutes: 7200, peak_viewers: 12000, avg_viewers: 6500 },
    { category_name: '발로란트', broadcast_count: 20, total_minutes: 3600, peak_viewers: 6800, avg_viewers: 3800 }
  ],
  recentBroadcasts: [
    { id: 'b1', title: '오늘도 메이플! 검은마법사 도전', started_at: '2026-02-03T18:00:00Z', duration_minutes: 300, peak_viewer_count: 8500 },
    { id: 'b2', title: 'FC온라인 랭크 도전기', started_at: '2026-02-02T19:00:00Z', duration_minutes: 240, peak_viewer_count: 5200 },
    { id: 'b3', title: '시청자와 소통하는 시간', started_at: '2026-02-01T20:00:00Z', duration_minutes: 180, peak_viewer_count: 9800 }
  ]
};

export const streamerStatsMock = [
  { date: '2026-02-04', broadcast_count: 1, total_minutes: 300, peak_viewers: 8500, avg_viewers: 5200 },
  { date: '2026-02-03', broadcast_count: 1, total_minutes: 240, peak_viewers: 7800, avg_viewers: 4800 },
  { date: '2026-02-02', broadcast_count: 1, total_minutes: 280, peak_viewers: 8200, avg_viewers: 5000 },
  { date: '2026-02-01', broadcast_count: 2, total_minutes: 420, peak_viewers: 9200, avg_viewers: 5500 },
  { date: '2026-01-31', broadcast_count: 1, total_minutes: 200, peak_viewers: 6500, avg_viewers: 4200 },
  { date: '2026-01-30', broadcast_count: 1, total_minutes: 260, peak_viewers: 7200, avg_viewers: 4600 },
  { date: '2026-01-29', broadcast_count: 1, total_minutes: 220, peak_viewers: 6800, avg_viewers: 4400 }
];

export const streamerRankingMock = {
  peakRank: 45,
  avgRank: 52,
  durationRank: 38,
  totalStreamers: 1850,
  stats: {
    peak_viewers: 15800,
    avg_viewers: 5200,
    total_minutes: 52560,
    broadcast_count: 245
  }
};

export const streamerBroadcastsMock = {
  broadcasts: [
    { id: 'b1', title: '오늘도 메이플! 검은마법사 도전', started_at: '2026-02-03T18:00:00Z', duration_minutes: 300, peak_viewer_count: 8500, avg_viewer_count: 5200, category_name: '메이플스토리', is_live: false },
    { id: 'b2', title: 'FC온라인 랭크 도전기', started_at: '2026-02-02T19:00:00Z', duration_minutes: 240, peak_viewer_count: 5200, avg_viewer_count: 3400, category_name: 'FC 온라인', is_live: false },
    { id: 'b3', title: '시청자와 소통하는 시간', started_at: '2026-02-01T20:00:00Z', duration_minutes: 180, peak_viewer_count: 9800, avg_viewer_count: 6200, category_name: '저스트 채팅', is_live: false },
    { id: 'b4', title: '발로란트 랭크 가보자', started_at: '2026-01-31T21:00:00Z', duration_minutes: 200, peak_viewer_count: 6500, avg_viewer_count: 4100, category_name: '발로란트', is_live: false },
    { id: 'b5', title: '메이플 신규 컨텐츠 체험', started_at: '2026-01-30T18:30:00Z', duration_minutes: 260, peak_viewer_count: 7800, avg_viewer_count: 4800, category_name: '메이플스토리', is_live: false }
  ],
  total: 245
};

export const streamerSegmentsMock = {
  segments: [
    { display_category: '메이플스토리', segment_started_at: '2026-02-03T18:00:00Z', segment_ended_at: '2026-02-03T20:30:00Z', peak_viewer_count: 8500, avg_viewer_count: 5800 },
    { display_category: '저스트 채팅', segment_started_at: '2026-02-03T20:30:00Z', segment_ended_at: '2026-02-03T23:00:00Z', peak_viewer_count: 6200, avg_viewer_count: 4500 }
  ],
  snapshots: [
    { snapshot_at: '2026-02-03T18:00:00Z', viewer_count: 3200, chat_rate_per_minute: 45 },
    { snapshot_at: '2026-02-03T18:30:00Z', viewer_count: 5800, chat_rate_per_minute: 78 },
    { snapshot_at: '2026-02-03T19:00:00Z', viewer_count: 7200, chat_rate_per_minute: 92 },
    { snapshot_at: '2026-02-03T19:30:00Z', viewer_count: 8500, chat_rate_per_minute: 105 },
    { snapshot_at: '2026-02-03T20:00:00Z', viewer_count: 7800, chat_rate_per_minute: 88 },
    { snapshot_at: '2026-02-03T20:30:00Z', viewer_count: 6500, chat_rate_per_minute: 72 },
    { snapshot_at: '2026-02-03T21:00:00Z', viewer_count: 5800, chat_rate_per_minute: 65 },
    { snapshot_at: '2026-02-03T21:30:00Z', viewer_count: 5200, chat_rate_per_minute: 58 },
    { snapshot_at: '2026-02-03T22:00:00Z', viewer_count: 4800, chat_rate_per_minute: 52 },
    { snapshot_at: '2026-02-03T22:30:00Z', viewer_count: 4200, chat_rate_per_minute: 45 }
  ]
};

// =====================
// Admin 관련 데이터
// =====================
export const adminBroadcastersMock = {
  broadcasters: [
    { id: 1, broadcaster_name: '게임왕', channel_id: 'ch_001', platform: 'soop', unique_viewers: 8500, chat_velocity: 125, donation_conversion: 3.2, nexon_affinity: 85, total_donations: 2500000, total_events: 15800, chat_count: 45000, donation_count: 158 },
    { id: 2, broadcaster_name: '메이플마스터', channel_id: 'ch_002', platform: 'chzzk', unique_viewers: 6200, chat_velocity: 98, donation_conversion: 2.8, nexon_affinity: 92, total_donations: 1800000, total_events: 12500, chat_count: 38000, donation_count: 125 },
    { id: 3, broadcaster_name: '던파고수', channel_id: 'ch_003', platform: 'soop', unique_viewers: 5800, chat_velocity: 85, donation_conversion: 2.5, nexon_affinity: 88, total_donations: 1500000, total_events: 9800, chat_count: 32000, donation_count: 98 },
    { id: 4, broadcaster_name: 'FC온라인러', channel_id: 'ch_004', platform: 'chzzk', unique_viewers: 4500, chat_velocity: 72, donation_conversion: 3.5, nexon_affinity: 78, total_donations: 1200000, total_events: 8500, chat_count: 28000, donation_count: 112 },
    { id: 5, broadcaster_name: '카트왕', channel_id: 'ch_005', platform: 'soop', unique_viewers: 3800, chat_velocity: 65, donation_conversion: 2.2, nexon_affinity: 95, total_donations: 950000, total_events: 6200, chat_count: 22000, donation_count: 78 }
  ]
};

export const adminMonitorStatsMock = {
  liveBroadcasts: 145,
  totalViewers: 485000,
  totalPersons: 125000,
  totalDonations: 58500000,
  eventCount: 2850000,
  segmentCount: 45000,
  snapshotCount: 1250000,
  engagementCount: 380000,
  platforms: {
    soop: { broadcasts: 85, viewers: 285000 },
    chzzk: { broadcasts: 60, viewers: 200000 }
  },
  nexon: {
    soop: { broadcasts: 32, viewers: 125000 },
    chzzk: { broadcasts: 28, viewers: 95000 }
  }
};

export const adminMonitorBroadcastsMock = {
  data: [
    { platform: 'soop', broadcaster_nickname: '게임왕', title: '오늘도 달린다!', category_name: '메이플스토리', current_viewer_count: 8500, peak_viewer_count: 12000, total_donation_amount: 250000, is_live: true, broadcaster_person_id: 'p1' },
    { platform: 'chzzk', broadcaster_nickname: '메이플마스터', title: '보스레이드 가즈아', category_name: '메이플스토리', current_viewer_count: 6200, peak_viewer_count: 8500, total_donation_amount: 180000, is_live: true, broadcaster_person_id: 'p2' },
    { platform: 'soop', broadcaster_nickname: '던파고수', title: '레이드 클리어 도전', category_name: '던전앤파이터', current_viewer_count: 5800, peak_viewer_count: 7200, total_donation_amount: 150000, is_live: true, broadcaster_person_id: 'p3' }
  ],
  pagination: { page: 1, limit: 30, total: 145, totalPages: 5 }
};

// =====================
// Settings 데이터
// =====================
export const settingsMock = {
  chat: {
    enabled: true,
    fontSize: 16,
    fontFamily: 'Pretendard',
    textColor: '#ffffff',
    backgroundColor: 'rgba(0,0,0,0.7)',
    showBadges: true,
    animation: 'slide'
  },
  alerts: {
    enabled: true,
    sound: true,
    volume: 80,
    duration: 5,
    minAmount: 1000,
    ttsEnabled: false
  },
  goals: {
    enabled: false,
    type: 'donation',
    target: 100000,
    current: 45000
  },
  overlay: {
    theme: 'dark',
    position: 'bottom-right',
    opacity: 0.9
  },
  game: {
    nexon: {
      enabled: true,
      accountId: 'nexon_creator_01',
      selectedGames: ['maplestory', 'fconline', 'suddenattack']
    },
    riot: {
      enabled: false,
      region: 'kr',
      gameName: '',
      tagLine: '',
      selectedGames: ['lol', 'valorant', 'tft']
    },
    pubg: {
      enabled: false,
      platform: 'steam',
      playerName: ''
    },
    steam: {
      enabled: false,
      steamId: ''
    }
  }
};

export const userSettingsMock = {
  displayName: '게임하는소희',
  email: 'sohee@example.com',
  platform: 'soop',
  channelId: 'ch_sohee_001',
  notifications: {
    email: true,
    push: true,
    weekly_report: true
  },
  privacy: {
    show_stats: true,
    show_revenue: false
  }
};

export const userSettingValuesMock = {
  bot: {},
  credits: {},
  emoji: {},
  roulette: {},
  voting: {},
};

// =====================
// Auth 데이터
// =====================
export const authUserMock = {
  id: 'user_001',
  email: 'sohee@example.com',
  displayName: '게임하는소희',
  platform: 'soop',
  channelId: 'ch_sohee_001',
  role: 'admin',
  overlayHash: 'demo-overlay-hash',
  createdAt: '2025-06-15T10:00:00Z'
};

export const nconnectRankingMock = buildNConnectRanking();
export const nconnectContentsMock = buildNConnectContentsMock();

export const nconnectNoticesMock = [
  {
    id: 'notice-preseason-launch',
    title: 'N-CONNECT 프리시즌 운영 일정 안내',
    category: '운영',
    isPinned: true,
    publishedAt: '2026-04-09T09:00:00+09:00',
    summary: 'SOOP은 2026년 4월 9일, 치지직은 2026년 4월 23일부터 프리시즌이 순차적으로 시작됩니다.',
    body: 'N-CONNECT 프리시즌은 2026년 4월 9일 SOOP에서 먼저 시작되며, 치지직은 2026년 4월 23일부터 합류합니다.\n\n프리시즌 데이터 기간은 2026년 4월부터 9월까지이며, 기여도 체계 검증 단계인 만큼 순위 간 보상 차등폭을 최소화하여 운영합니다.\n\n정규 시즌 1은 2026년 10월부터 12월까지 운영되며, 시즌별 누적 기여도 순위와 월별 성장 지표를 바탕으로 월급 및 인센티브가 지급됩니다.'
  },
  {
    id: 'notice-account-promo',
    title: '계정 연동 프로모션 보상 기준 공지',
    category: '보상',
    isPinned: true,
    publishedAt: '2026-04-09T09:30:00+09:00',
    summary: '기본 보상 5,000원과 추천 코드 1건당 1,000원 지급 기준을 안내합니다.',
    body: '계정 연동 프로모션은 기본 보상과 추천 코드 보상으로 구성됩니다.\n\n기본 보상은 SOOP과 넥슨에서만 사용할 수 있는 전용 문화상품권 5,000원이며, 1차 10만 명 한정으로 운영합니다.\n\n추천 코드 보상은 추천 1건당 넥슨캐시 1,000원이며, 1인당 최대 100만 원까지 적립할 수 있습니다.\n\n두 보상 모두 월 1회 기준 시점에 연동 유지 여부를 확인한 뒤 지급됩니다.'
  },
  {
    id: 'notice-chzzk-prereg',
    title: '치지직 사전예약 운영 안내',
    category: '일정',
    isPinned: false,
    publishedAt: '2026-04-10T11:00:00+09:00',
    summary: '치지직 스트리머는 2026년 4월 9일부터 4월 23일까지 사전예약 혜택을 받을 수 있습니다.',
    body: '치지직은 프리시즌 본 오픈 전까지 2주간 사전예약을 운영합니다.\n\n사전예약은 계정 연동 사전예약과 N-CONNECT 참여 사전예약으로 나뉘며, 계정 연동 사전예약은 넥슨캐시 혜택, 멤버십 사전예약은 굿즈 선배송 혜택을 중심으로 설계됩니다.'
  },
  {
    id: 'notice-goods-policy',
    title: '웰컴 굿즈 지급 조건 안내',
    category: '굿즈',
    isPinned: false,
    publishedAt: '2026-05-01T10:00:00+09:00',
    summary: 'N-CONNECT 웰컴 굿즈는 가입 후 넥슨 게임 카테고리 방송 10시간을 달성한 베스트/프로 이상 스트리머에게 지급됩니다.',
    body: '웰컴 굿즈는 N-CONNECT에 가입한 스트리머의 소속감을 높이고 방송에서 노출 가능한 아이템으로 구성됩니다.\n\n구성품은 사원증, NFC 명함, 앞접시 그릇, 한글 수저 세트이며 단가는 5만 원 미만으로 유지합니다.\n\n매월 말일 기준으로 지급 대상자를 선정하고, 익월 18일 발송을 목표로 운영합니다.'
  }
];
