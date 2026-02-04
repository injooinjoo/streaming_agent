// VOD 에이전트 목업 데이터 - 넥슨 게임 쇼츠

// 플랫폼 정보
export const platforms = {
  shorts: {
    id: 'shorts',
    name: 'YouTube Shorts',
    icon: 'Youtube',
    color: '#FF0000',
    bgColor: 'rgba(255, 0, 0, 0.1)',
  },
  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    icon: 'Music2',
    color: '#00F2EA',
    bgColor: 'rgba(0, 242, 234, 0.1)',
  },
  reels: {
    id: 'reels',
    name: 'Instagram Reels',
    icon: 'Instagram',
    color: '#E4405F',
    bgColor: 'rgba(228, 64, 95, 0.1)',
  },
};

// 영상 데이터 - 넥슨 게임 쇼츠
export const videos = [
  {
    id: 'v1',
    title: '메이플 검은마법사 원킬 각성기 미쳤다',
    thumbnail: 'https://picsum.photos/seed/maple1/270/480',
    platforms: ['shorts', 'tiktok', 'reels'],
    uploadedAt: '2026-02-01T14:30:00Z',
    status: 'published',
    game: '메이플스토리',
    stats: {
      shorts: { views: 1250000, likes: 85000, comments: 3420, shares: 12500 },
      tiktok: { views: 890000, likes: 120000, comments: 5670, shares: 23400 },
      reels: { views: 450000, likes: 32000, comments: 1280, shares: 4500 },
    },
    trackingLink: 'https://vod.link/maple01',
    clicks: 24500,
    conversions: 1280,
    revenue: 450000,
  },
  {
    id: 'v2',
    title: '던파 눈먼 자의 탑 솔플 클리어 꿀팁',
    thumbnail: 'https://picsum.photos/seed/dnf1/270/480',
    platforms: ['shorts', 'tiktok'],
    uploadedAt: '2026-01-28T10:15:00Z',
    status: 'published',
    game: '던전앤파이터',
    stats: {
      shorts: { views: 2340000, likes: 156000, comments: 8920, shares: 34000 },
      tiktok: { views: 1560000, likes: 234000, comments: 12300, shares: 45600 },
    },
    trackingLink: 'https://vod.link/dnf01',
    clicks: 48200,
    conversions: 2560,
    revenue: 890000,
  },
  {
    id: 'v3',
    title: 'FC온라인 손흥민 40m 중거리 슛 ㄷㄷ',
    thumbnail: 'https://picsum.photos/seed/fc1/270/480',
    platforms: ['shorts', 'tiktok', 'reels'],
    uploadedAt: '2026-01-25T18:45:00Z',
    status: 'published',
    game: 'FC 온라인',
    stats: {
      shorts: { views: 5670000, likes: 450000, comments: 23400, shares: 89000 },
      tiktok: { views: 4230000, likes: 560000, comments: 34500, shares: 123000 },
      reels: { views: 2340000, likes: 189000, comments: 15600, shares: 45000 },
    },
    trackingLink: 'https://vod.link/fc01',
    clicks: 89400,
    conversions: 5120,
    revenue: 1780000,
  },
  {
    id: 'v4',
    title: '카트라이더 드리프트 황금 부스터 타이밍',
    thumbnail: 'https://picsum.photos/seed/kart1/270/480',
    platforms: ['shorts', 'reels'],
    uploadedAt: '2026-01-22T09:00:00Z',
    status: 'published',
    game: '카트라이더: 드리프트',
    stats: {
      shorts: { views: 892000, likes: 67000, comments: 4560, shares: 15600 },
      reels: { views: 345000, likes: 28000, comments: 1890, shares: 6700 },
    },
    trackingLink: 'https://vod.link/kart01',
    clicks: 12300,
    conversions: 734,
    revenue: 256000,
  },
  {
    id: 'v5',
    title: '마비노기 신규 던전 보스 패턴 분석',
    thumbnail: 'https://picsum.photos/seed/mabi1/270/480',
    platforms: ['tiktok', 'reels'],
    uploadedAt: '2026-01-20T15:20:00Z',
    status: 'published',
    game: '마비노기',
    stats: {
      tiktok: { views: 178000, likes: 14500, comments: 890, shares: 2340 },
      reels: { views: 98000, likes: 7800, comments: 456, shares: 1230 },
    },
    trackingLink: 'https://vod.link/mabi01',
    clicks: 3560,
    conversions: 198,
    revenue: 67000,
  },
  {
    id: 'v6',
    title: '바람의나라 전직 퀘스트 최단루트 공략',
    thumbnail: 'https://picsum.photos/seed/baram1/270/480',
    platforms: ['shorts', 'tiktok', 'reels'],
    uploadedAt: '2026-01-18T12:00:00Z',
    status: 'published',
    game: '바람의나라',
    stats: {
      shorts: { views: 456000, likes: 34000, comments: 1890, shares: 5670 },
      tiktok: { views: 389000, likes: 45000, comments: 2340, shares: 7890 },
      reels: { views: 167000, likes: 12300, comments: 890, shares: 2340 },
    },
    trackingLink: 'https://vod.link/baram01',
    clicks: 6780,
    conversions: 389,
    revenue: 134000,
  },
  {
    id: 'v7',
    title: '메이플 신캐 데몬어벤져 스킬트리 추천',
    thumbnail: 'https://picsum.photos/seed/maple2/270/480',
    platforms: ['shorts', 'tiktok'],
    uploadedAt: '2026-02-02T11:00:00Z',
    status: 'published',
    game: '메이플스토리',
    stats: {
      shorts: { views: 723000, likes: 52000, comments: 3100, shares: 8900 },
      tiktok: { views: 534000, likes: 67000, comments: 4200, shares: 11200 },
    },
    trackingLink: 'https://vod.link/maple02',
    clicks: 9800,
    conversions: 567,
    revenue: 198000,
  },
  {
    id: 'v8',
    title: '던파 시즌 신규 레이드 첫 클리어',
    thumbnail: 'https://picsum.photos/seed/dnf2/270/480',
    platforms: ['shorts', 'tiktok', 'reels'],
    uploadedAt: '2026-02-03T16:30:00Z',
    status: 'published',
    game: '던전앤파이터',
    stats: {
      shorts: { views: 1890000, likes: 134000, comments: 7800, shares: 28000 },
      tiktok: { views: 1450000, likes: 198000, comments: 9500, shares: 38000 },
      reels: { views: 780000, likes: 56000, comments: 3200, shares: 12000 },
    },
    trackingLink: 'https://vod.link/dnf02',
    clicks: 34500,
    conversions: 1890,
    revenue: 678000,
  },
  {
    id: 'v9',
    title: 'FC온라인 새 시즌 메타 스쿼드 추천',
    thumbnail: 'https://picsum.photos/seed/fc2/270/480',
    platforms: ['shorts'],
    uploadedAt: '2026-02-03T08:00:00Z',
    status: 'processing',
    game: 'FC 온라인',
    stats: {
      shorts: { views: 0, likes: 0, comments: 0, shares: 0 },
    },
    trackingLink: 'https://vod.link/fc02',
    clicks: 0,
    conversions: 0,
    revenue: 0,
  },
  {
    id: 'v10',
    title: '카트라이더 신규 맵 숨겨진 지름길',
    thumbnail: 'https://picsum.photos/seed/kart2/270/480',
    platforms: ['tiktok'],
    uploadedAt: '2026-02-02T16:30:00Z',
    status: 'error',
    game: '카트라이더: 드리프트',
    stats: {
      tiktok: { views: 0, likes: 0, comments: 0, shares: 0 },
    },
    trackingLink: 'https://vod.link/kart02',
    clicks: 0,
    conversions: 0,
    revenue: 0,
    errorMessage: '영상 인코딩 실패. 다시 업로드해주세요.',
  },
];

// 대시보드 요약 통계
export const dashboardStats = {
  totalVideos: 10,
  totalViews: 25890000,
  totalRevenue: 4453000,
  activeLinks: 8,
  thisMonthViews: 8500000,
  thisMonthRevenue: 1876000,
  viewsGrowth: 34.5,
  revenueGrowth: 28.2,
};

// 플랫폼별 통계
export const platformStats = {
  shorts: {
    totalViews: 13271000,
    totalLikes: 978000,
    totalComments: 53070,
    avgEngagement: 7.8,
    videoCount: 9,
  },
  tiktok: {
    totalViews: 9231000,
    totalLikes: 1238500,
    totalComments: 69400,
    avgEngagement: 14.2,
    videoCount: 8,
  },
  reels: {
    totalViews: 4180000,
    totalLikes: 325100,
    totalComments: 23316,
    avgEngagement: 8.3,
    videoCount: 6,
  },
};

// 주간 조회수 추이
export const weeklyViewsData = [
  { date: '01/29', shorts: 1250000, tiktok: 890000, reels: 450000, total: 2590000 },
  { date: '01/30', shorts: 1560000, tiktok: 1120000, reels: 670000, total: 3350000 },
  { date: '01/31', shorts: 1890000, tiktok: 1340000, reels: 780000, total: 4010000 },
  { date: '02/01', shorts: 2340000, tiktok: 1670000, reels: 890000, total: 4900000 },
  { date: '02/02', shorts: 2780000, tiktok: 1980000, reels: 1120000, total: 5880000 },
  { date: '02/03', shorts: 3120000, tiktok: 2230000, reels: 1340000, total: 6690000 },
  { date: '02/04', shorts: 3450000, tiktok: 2560000, reels: 1560000, total: 7570000 },
];

// 시간대별 조회수 (히트맵용)
export const hourlyViewsData = [
  { hour: '00:00', views: 120000 },
  { hour: '02:00', views: 80000 },
  { hour: '04:00', views: 50000 },
  { hour: '06:00', views: 150000 },
  { hour: '08:00', views: 450000 },
  { hour: '10:00', views: 670000 },
  { hour: '12:00', views: 890000 },
  { hour: '14:00', views: 780000 },
  { hour: '16:00', views: 920000 },
  { hour: '18:00', views: 1340000 },
  { hour: '20:00', views: 1560000 },
  { hour: '22:00', views: 980000 },
];

// 인구통계 데이터
export const demographicsData = {
  age: [
    { range: '13-17', percentage: 15 },
    { range: '18-24', percentage: 38 },
    { range: '25-34', percentage: 28 },
    { range: '35-44', percentage: 12 },
    { range: '45+', percentage: 7 },
  ],
  gender: [
    { type: '남성', percentage: 68 },
    { type: '여성', percentage: 30 },
    { type: '기타', percentage: 2 },
  ],
  region: [
    { name: '서울', percentage: 32 },
    { name: '경기', percentage: 25 },
    { name: '부산', percentage: 10 },
    { name: '인천', percentage: 8 },
    { name: '대구', percentage: 6 },
    { name: '기타', percentage: 19 },
  ],
};

// 수익 데이터
export const revenueData = {
  total: 4453000,
  thisMonth: 1876000,
  pending: 456000,
  available: 1420000,
  growthRate: 28.5,
};

// 수익 추이
export const revenueHistory = [
  { date: '2025-09', revenue: 345000 },
  { date: '2025-10', revenue: 489000 },
  { date: '2025-11', revenue: 634000 },
  { date: '2025-12', revenue: 878000 },
  { date: '2026-01', revenue: 1231000 },
  { date: '2026-02', revenue: 876000 }, // 진행중
];

// 링크별 수익 통계
export const linkRevenueData = [
  {
    id: 'l1',
    videoTitle: 'FC온라인 손흥민 40m 중거리 슛 ㄷㄷ',
    link: 'https://vod.link/fc01',
    clicks: 89400,
    conversions: 5120,
    revenue: 1780000,
    ctr: 5.73,
  },
  {
    id: 'l2',
    videoTitle: '던파 눈먼 자의 탑 솔플 클리어 꿀팁',
    link: 'https://vod.link/dnf01',
    clicks: 48200,
    conversions: 2560,
    revenue: 890000,
    ctr: 5.31,
  },
  {
    id: 'l3',
    videoTitle: '던파 시즌 신규 레이드 첫 클리어',
    link: 'https://vod.link/dnf02',
    clicks: 34500,
    conversions: 1890,
    revenue: 678000,
    ctr: 5.48,
  },
  {
    id: 'l4',
    videoTitle: '메이플 검은마법사 원킬 각성기 미쳤다',
    link: 'https://vod.link/maple01',
    clicks: 24500,
    conversions: 1280,
    revenue: 450000,
    ctr: 5.22,
  },
  {
    id: 'l5',
    videoTitle: '카트라이더 드리프트 황금 부스터 타이밍',
    link: 'https://vod.link/kart01',
    clicks: 12300,
    conversions: 734,
    revenue: 256000,
    ctr: 5.97,
  },
  {
    id: 'l6',
    videoTitle: '메이플 신캐 데몬어벤져 스킬트리 추천',
    link: 'https://vod.link/maple02',
    clicks: 9800,
    conversions: 567,
    revenue: 198000,
    ctr: 5.79,
  },
];

// 정산 내역
export const settlementHistory = [
  {
    id: 's1',
    date: '2026-02-01',
    amount: 1420000,
    status: 'completed',
    method: '계좌이체',
  },
  {
    id: 's2',
    date: '2026-01-01',
    amount: 1231000,
    status: 'completed',
    method: '계좌이체',
  },
  {
    id: 's3',
    date: '2025-12-01',
    amount: 878000,
    status: 'completed',
    method: '계좌이체',
  },
  {
    id: 's4',
    date: '2025-11-01',
    amount: 634000,
    status: 'completed',
    method: '계좌이체',
  },
  {
    id: 's5',
    date: '2025-10-01',
    amount: 489000,
    status: 'completed',
    method: '계좌이체',
  },
];

// 플랫폼 연결 상태
export const platformConnections = {
  shorts: {
    connected: true,
    accountName: 'NexonGameTV',
    connectedAt: '2025-08-15T10:00:00Z',
    subscribers: 458000,
  },
  tiktok: {
    connected: true,
    accountName: '@nexon_gaming',
    connectedAt: '2025-09-01T14:30:00Z',
    followers: 325000,
  },
  reels: {
    connected: true,
    accountName: 'nexon_official',
    connectedAt: '2025-10-15T09:00:00Z',
    followers: 189000,
  },
};

// 설정 데이터
export const settingsData = {
  autoPublish: true,
  defaultTags: ['넥슨', '게임', '쇼츠', '공략', '꿀팁'],
  defaultHashtags: '#넥슨 #메이플스토리 #던파 #FC온라인 #카트라이더 #게임 #shorts',
  linkDomain: 'vod.link',
  linkExpiry: 'never',
  notifications: {
    uploadComplete: true,
    revenueGenerated: true,
    weeklyReport: true,
    milestoneReached: true,
  },
};

// 인기 영상 TOP 10
export const topVideos = videos
  .filter((v) => v.status === 'published')
  .map((v) => ({
    ...v,
    totalViews: Object.values(v.stats).reduce((sum, s) => sum + s.views, 0),
    totalLikes: Object.values(v.stats).reduce((sum, s) => sum + s.likes, 0),
  }))
  .sort((a, b) => b.totalViews - a.totalViews)
  .slice(0, 10);

// 플랫폼별 참여율 비교
export const engagementComparison = [
  { metric: '좋아요율', shorts: 7.4, tiktok: 13.4, reels: 7.8 },
  { metric: '댓글율', shorts: 0.40, tiktok: 0.75, reels: 0.56 },
  { metric: '공유율', shorts: 0.74, tiktok: 1.12, reels: 0.55 },
];

// 게임별 통계 (추가)
export const gameStats = [
  { game: '메이플스토리', videos: 2, views: 3507000, revenue: 648000 },
  { game: '던전앤파이터', videos: 2, views: 7020000, revenue: 1568000 },
  { game: 'FC 온라인', videos: 2, views: 12240000, revenue: 1780000 },
  { game: '카트라이더: 드리프트', videos: 2, views: 1237000, revenue: 256000 },
  { game: '마비노기', videos: 1, views: 276000, revenue: 67000 },
  { game: '바람의나라', videos: 1, views: 1012000, revenue: 134000 },
];
