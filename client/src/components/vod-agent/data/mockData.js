// VOD 에이전트 목업 데이터

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

// 영상 데이터
export const videos = [
  {
    id: 'v1',
    title: '10초만에 배우는 요리 꿀팁',
    thumbnail: 'https://picsum.photos/seed/v1/320/180',
    platforms: ['shorts', 'tiktok', 'reels'],
    uploadedAt: '2026-02-01T14:30:00Z',
    status: 'published',
    stats: {
      shorts: { views: 125000, likes: 8500, comments: 342, shares: 1250 },
      tiktok: { views: 89000, likes: 12000, comments: 567, shares: 2340 },
      reels: { views: 45000, likes: 3200, comments: 128, shares: 450 },
    },
    trackingLink: 'https://vod.link/abc123',
    clicks: 2450,
    conversions: 128,
    revenue: 45000,
  },
  {
    id: 'v2',
    title: '이 운동 하루 5분이면 충분해요',
    thumbnail: 'https://picsum.photos/seed/v2/320/180',
    platforms: ['shorts', 'tiktok'],
    uploadedAt: '2026-01-28T10:15:00Z',
    status: 'published',
    stats: {
      shorts: { views: 234000, likes: 15600, comments: 892, shares: 3400 },
      tiktok: { views: 156000, likes: 23400, comments: 1230, shares: 4560 },
    },
    trackingLink: 'https://vod.link/def456',
    clicks: 4820,
    conversions: 256,
    revenue: 89000,
  },
  {
    id: 'v3',
    title: '강아지가 이렇게 하면 기분 좋은 거예요',
    thumbnail: 'https://picsum.photos/seed/v3/320/180',
    platforms: ['shorts', 'tiktok', 'reels'],
    uploadedAt: '2026-01-25T18:45:00Z',
    status: 'published',
    stats: {
      shorts: { views: 567000, likes: 45000, comments: 2340, shares: 8900 },
      tiktok: { views: 423000, likes: 56000, comments: 3450, shares: 12300 },
      reels: { views: 234000, likes: 18900, comments: 1560, shares: 4500 },
    },
    trackingLink: 'https://vod.link/ghi789',
    clicks: 8940,
    conversions: 512,
    revenue: 178000,
  },
  {
    id: 'v4',
    title: '아이폰 숨겨진 기능 TOP 5',
    thumbnail: 'https://picsum.photos/seed/v4/320/180',
    platforms: ['shorts', 'reels'],
    uploadedAt: '2026-01-22T09:00:00Z',
    status: 'published',
    stats: {
      shorts: { views: 892000, likes: 67000, comments: 4560, shares: 15600 },
      reels: { views: 345000, likes: 28000, comments: 1890, shares: 6700 },
    },
    trackingLink: 'https://vod.link/jkl012',
    clicks: 12300,
    conversions: 734,
    revenue: 256000,
  },
  {
    id: 'v5',
    title: '1분 만에 완성하는 간단 디저트',
    thumbnail: 'https://picsum.photos/seed/v5/320/180',
    platforms: ['tiktok', 'reels'],
    uploadedAt: '2026-01-20T15:20:00Z',
    status: 'published',
    stats: {
      tiktok: { views: 178000, likes: 14500, comments: 890, shares: 2340 },
      reels: { views: 98000, likes: 7800, comments: 456, shares: 1230 },
    },
    trackingLink: 'https://vod.link/mno345',
    clicks: 3560,
    conversions: 198,
    revenue: 67000,
  },
  {
    id: 'v6',
    title: '이 노래 들으면 기분 좋아져요',
    thumbnail: 'https://picsum.photos/seed/v6/320/180',
    platforms: ['shorts', 'tiktok', 'reels'],
    uploadedAt: '2026-01-18T12:00:00Z',
    status: 'published',
    stats: {
      shorts: { views: 456000, likes: 34000, comments: 1890, shares: 5670 },
      tiktok: { views: 389000, likes: 45000, comments: 2340, shares: 7890 },
      reels: { views: 167000, likes: 12300, comments: 890, shares: 2340 },
    },
    trackingLink: 'https://vod.link/pqr678',
    clicks: 6780,
    conversions: 389,
    revenue: 134000,
  },
  {
    id: 'v7',
    title: '새로운 프로젝트 시작!',
    thumbnail: 'https://picsum.photos/seed/v7/320/180',
    platforms: ['shorts'],
    uploadedAt: '2026-02-03T08:00:00Z',
    status: 'processing',
    stats: {
      shorts: { views: 0, likes: 0, comments: 0, shares: 0 },
    },
    trackingLink: 'https://vod.link/stu901',
    clicks: 0,
    conversions: 0,
    revenue: 0,
  },
  {
    id: 'v8',
    title: '업로드 실패 테스트 영상',
    thumbnail: 'https://picsum.photos/seed/v8/320/180',
    platforms: ['tiktok'],
    uploadedAt: '2026-02-02T16:30:00Z',
    status: 'error',
    stats: {
      tiktok: { views: 0, likes: 0, comments: 0, shares: 0 },
    },
    trackingLink: 'https://vod.link/vwx234',
    clicks: 0,
    conversions: 0,
    revenue: 0,
    errorMessage: '파일 형식이 지원되지 않습니다.',
  },
];

// 대시보드 요약 통계
export const dashboardStats = {
  totalVideos: 8,
  totalViews: 4398000,
  totalRevenue: 769000,
  activeLinks: 6,
  thisMonthViews: 1250000,
  thisMonthRevenue: 312000,
  viewsGrowth: 23.5,
  revenueGrowth: 18.2,
};

// 플랫폼별 통계
export const platformStats = {
  shorts: {
    totalViews: 2274000,
    totalLikes: 170100,
    totalComments: 10024,
    avgEngagement: 7.9,
    videoCount: 7,
  },
  tiktok: {
    totalViews: 1235000,
    totalLikes: 150900,
    totalComments: 8477,
    avgEngagement: 12.9,
    videoCount: 6,
  },
  reels: {
    totalViews: 889000,
    totalLikes: 70200,
    totalComments: 4924,
    avgEngagement: 8.4,
    videoCount: 5,
  },
};

// 주간 조회수 추이
export const weeklyViewsData = [
  { date: '01/29', shorts: 125000, tiktok: 89000, reels: 45000, total: 259000 },
  { date: '01/30', shorts: 156000, tiktok: 112000, reels: 67000, total: 335000 },
  { date: '01/31', shorts: 189000, tiktok: 134000, reels: 78000, total: 401000 },
  { date: '02/01', shorts: 234000, tiktok: 167000, reels: 89000, total: 490000 },
  { date: '02/02', shorts: 278000, tiktok: 198000, reels: 112000, total: 588000 },
  { date: '02/03', shorts: 312000, tiktok: 223000, reels: 134000, total: 669000 },
  { date: '02/04', shorts: 345000, tiktok: 256000, reels: 156000, total: 757000 },
];

// 시간대별 조회수 (히트맵용)
export const hourlyViewsData = [
  { hour: '00:00', views: 12000 },
  { hour: '02:00', views: 8000 },
  { hour: '04:00', views: 5000 },
  { hour: '06:00', views: 15000 },
  { hour: '08:00', views: 45000 },
  { hour: '10:00', views: 67000 },
  { hour: '12:00', views: 89000 },
  { hour: '14:00', views: 78000 },
  { hour: '16:00', views: 92000 },
  { hour: '18:00', views: 134000 },
  { hour: '20:00', views: 156000 },
  { hour: '22:00', views: 98000 },
];

// 인구통계 데이터
export const demographicsData = {
  age: [
    { range: '13-17', percentage: 8 },
    { range: '18-24', percentage: 35 },
    { range: '25-34', percentage: 32 },
    { range: '35-44', percentage: 15 },
    { range: '45+', percentage: 10 },
  ],
  gender: [
    { type: '남성', percentage: 45 },
    { type: '여성', percentage: 52 },
    { type: '기타', percentage: 3 },
  ],
  region: [
    { name: '서울', percentage: 28 },
    { name: '경기', percentage: 22 },
    { name: '부산', percentage: 12 },
    { name: '인천', percentage: 8 },
    { name: '대구', percentage: 7 },
    { name: '기타', percentage: 23 },
  ],
};

// 수익 데이터
export const revenueData = {
  total: 1250000,
  thisMonth: 320000,
  pending: 85000,
  available: 235000,
  growthRate: 18.5,
};

// 수익 추이
export const revenueHistory = [
  { date: '2025-09', revenue: 145000 },
  { date: '2025-10', revenue: 189000 },
  { date: '2025-11', revenue: 234000 },
  { date: '2025-12', revenue: 278000 },
  { date: '2026-01', revenue: 312000 },
  { date: '2026-02', revenue: 92000 }, // 진행중
];

// 링크별 수익 통계
export const linkRevenueData = [
  {
    id: 'l1',
    videoTitle: '아이폰 숨겨진 기능 TOP 5',
    link: 'https://vod.link/jkl012',
    clicks: 12300,
    conversions: 734,
    revenue: 256000,
    ctr: 5.97,
  },
  {
    id: 'l2',
    videoTitle: '강아지가 이렇게 하면 기분 좋은 거예요',
    link: 'https://vod.link/ghi789',
    clicks: 8940,
    conversions: 512,
    revenue: 178000,
    ctr: 5.73,
  },
  {
    id: 'l3',
    videoTitle: '이 노래 들으면 기분 좋아져요',
    link: 'https://vod.link/pqr678',
    clicks: 6780,
    conversions: 389,
    revenue: 134000,
    ctr: 5.74,
  },
  {
    id: 'l4',
    videoTitle: '이 운동 하루 5분이면 충분해요',
    link: 'https://vod.link/def456',
    clicks: 4820,
    conversions: 256,
    revenue: 89000,
    ctr: 5.31,
  },
  {
    id: 'l5',
    videoTitle: '1분 만에 완성하는 간단 디저트',
    link: 'https://vod.link/mno345',
    clicks: 3560,
    conversions: 198,
    revenue: 67000,
    ctr: 5.56,
  },
  {
    id: 'l6',
    videoTitle: '10초만에 배우는 요리 꿀팁',
    link: 'https://vod.link/abc123',
    clicks: 2450,
    conversions: 128,
    revenue: 45000,
    ctr: 5.22,
  },
];

// 정산 내역
export const settlementHistory = [
  {
    id: 's1',
    date: '2026-02-01',
    amount: 235000,
    status: 'completed',
    method: '계좌이체',
  },
  {
    id: 's2',
    date: '2026-01-01',
    amount: 312000,
    status: 'completed',
    method: '계좌이체',
  },
  {
    id: 's3',
    date: '2025-12-01',
    amount: 278000,
    status: 'completed',
    method: '계좌이체',
  },
  {
    id: 's4',
    date: '2025-11-01',
    amount: 234000,
    status: 'completed',
    method: '계좌이체',
  },
  {
    id: 's5',
    date: '2025-10-01',
    amount: 189000,
    status: 'completed',
    method: '계좌이체',
  },
];

// 플랫폼 연결 상태
export const platformConnections = {
  shorts: {
    connected: true,
    accountName: 'CreatorChannel',
    connectedAt: '2025-08-15T10:00:00Z',
    subscribers: 125000,
  },
  tiktok: {
    connected: true,
    accountName: '@creator_official',
    connectedAt: '2025-09-01T14:30:00Z',
    followers: 89000,
  },
  reels: {
    connected: false,
    accountName: null,
    connectedAt: null,
    followers: null,
  },
};

// 설정 데이터
export const settingsData = {
  autoPublish: true,
  defaultTags: ['쇼츠', '틱톡', '릴스', '숏폼'],
  defaultHashtags: '#shorts #tiktok #reels #viral',
  linkDomain: 'vod.link',
  linkExpiry: 'never', // 'never', '30days', '90days', '1year'
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
  { metric: '좋아요율', shorts: 7.5, tiktok: 12.2, reels: 7.9 },
  { metric: '댓글율', shorts: 0.44, tiktok: 0.69, reels: 0.55 },
  { metric: '공유율', shorts: 0.69, tiktok: 1.0, reels: 0.51 },
];
