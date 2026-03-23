import {
  Blocks,
  Crown,
  Flame,
  Gamepad2,
  History,
  LayoutDashboard,
  LineChart,
  MessageSquare,
  Monitor,
  Radio,
  Search,
  Sparkles,
  Trophy,
  Tv,
  Users,
} from 'lucide-react';
import {
  getViewershipCategories,
  getViewershipPageData,
  getViewershipStreamers,
  normalizeViewershipPlatforms,
  VIEWERSHIP_PLATFORM_OPTIONS,
} from './viewershipMockData';

const MENU_BLUEPRINT = [
  {
    label: '시장 인사이트',
    items: [
      { id: 'market-overview', label: '시장 개요', icon: LayoutDashboard, badge: 'LIVE', keywords: ['시장', '개요', '플랫폼 흐름'] },
      { id: 'audience-segments', label: '시청층 흐름', icon: Sparkles, badge: null, keywords: ['시청층', '관심군', '유입'] },
    ],
  },
  {
    label: '방송 현황',
    items: [
      { id: 'broadcast-live', label: 'LIVE', icon: Radio, badge: 'LIVE', keywords: ['라이브', '방송 현황', '실시간'] },
      { id: 'broadcast-groups', label: '방송 그룹', icon: Blocks, badge: null, keywords: ['그룹', '클러스터', '묶음'] },
    ],
  },
  {
    label: '스트리머 분석',
    items: [
      { id: 'streamer-market-score', label: '시장 지수 랭킹', icon: Trophy, badge: 'LIVE', keywords: ['시장 지수', '대표 랭킹', '주목 채널'] },
      { id: 'streamer-ranking', label: '스트리머 랭킹', icon: Users, badge: null, keywords: ['스트리머', '평균 시청'] },
      { id: 'streamer-virtual', label: '버추얼 랭킹', icon: Sparkles, badge: 'LIVE', keywords: ['버추얼', '씨미', '버튜버'] },
      { id: 'streamer-follower', label: '팔로워 랭킹', icon: Crown, badge: null, keywords: ['팔로워', '영향력'] },
      { id: 'streamer-history', label: '랭킹 히스토리', icon: History, badge: null, keywords: ['히스토리', '순위 이동'] },
      { id: 'streamer-growth', label: '성장 랭킹', icon: LineChart, badge: 'NEW', keywords: ['성장', '상승 채널'] },
      { id: 'streamer-chat', label: '채팅 랭킹', icon: MessageSquare, badge: null, keywords: ['채팅', '반응량'] },
    ],
  },
  {
    label: '플랫폼 비교',
    items: [
      { id: 'platform-overview', label: '플랫폼 개요', icon: LayoutDashboard, badge: 'LIVE', keywords: ['플랫폼', '전체 비교', '시장 점유'] },
      { id: 'platform-soop', label: 'SOOP 개요', icon: Monitor, badge: null, keywords: ['soop', '숲'] },
      { id: 'platform-chzzk', label: '치지직 개요', icon: Tv, badge: null, keywords: ['치지직', 'chzzk'] },
      { id: 'platform-twitch', label: '트위치 개요', icon: Monitor, badge: null, keywords: ['트위치', 'twitch'] },
      { id: 'platform-cimi', label: '씨미 개요', icon: Sparkles, badge: 'NEW', keywords: ['씨미', 'cimi', '버추얼 플랫폼'] },
    ],
  },
  {
    label: '카테고리 분석',
    items: [
      { id: 'category-ranking', label: '카테고리 랭킹', icon: Gamepad2, badge: 'LIVE', keywords: ['카테고리', '실시간 시청'] },
      { id: 'category-growth', label: '성장 랭킹', icon: LineChart, badge: 'NEW', keywords: ['카테고리 성장'] },
      { id: 'category-chat', label: '채팅 랭킹', icon: MessageSquare, badge: null, keywords: ['카테고리 채팅'] },
      { id: 'category-history', label: '랭킹 히스토리', icon: History, badge: null, keywords: ['카테고리 히스토리'] },
    ],
  },
  {
    label: '이슈 추적',
    items: [
      { id: 'analysis-new-streamers', label: '신규 스트리머 분석', icon: Search, badge: 'NEW', keywords: ['신규', '온보딩', '새 스트리머'] },
      { id: 'esports-first-stand', label: '2026 LOL First Stand', icon: Flame, badge: 'NEW', keywords: ['이스포츠', 'lol', 'first stand', '롤'] },
    ],
  },
];

const enrichMenuItem = (item, groupLabel) => ({
  ...item,
  groupLabel,
  pageType: item.id.startsWith('platform-') ? 'platform' : 'overview',
});

export const VIEWERSHIP_MENU_GROUPS = MENU_BLUEPRINT.map((group) => ({
  ...group,
  items: group.items.map((item) => enrichMenuItem(item, group.label)),
}));

export const VIEWERSHIP_FLAT_MENU_ITEMS = VIEWERSHIP_MENU_GROUPS.flatMap((group) => group.items);

export const DEFAULT_VIEWERSHIP_PAGE = 'market-overview';

export const getViewershipPageById = (pageId, selectedPlatforms) =>
  getViewershipPageData(pageId, selectedPlatforms);

export const getViewershipSearchIndex = (selectedPlatforms) => {
  const activePlatforms = normalizeViewershipPlatforms(selectedPlatforms);

  const pageResults = VIEWERSHIP_FLAT_MENU_ITEMS.filter((item) => {
    const platformPage = VIEWERSHIP_PLATFORM_OPTIONS.find((option) => option.pageId === item.id);
    return !platformPage || activePlatforms.includes(platformPage.key);
  }).map((item) => ({
    id: `page-${item.id}`,
    type: 'page',
    label: item.label,
    subtitle: item.groupLabel,
    targetId: item.id,
    keywords: item.keywords,
    badge: item.badge,
  }));

  const streamerResults = getViewershipStreamers(activePlatforms).map((streamer) => ({
    id: `streamer-${streamer.personId}`,
    type: 'streamer',
    label: streamer.name,
    subtitle: `${streamer.platformLabel} · ${streamer.mainCategory}`,
    targetId: streamer.personId,
    keywords: [
      streamer.name,
      streamer.mainCategory,
      streamer.platform,
      streamer.platformLabel,
      streamer.group,
      '시장 지수',
      '스트리머 분석',
    ],
    badge: streamer.isVirtual ? 'V' : null,
  }));

  const categoryResults = getViewershipCategories(activePlatforms).map((category) => ({
    id: `category-${category.gameId}`,
    type: 'category',
    label: category.name,
    subtitle: `${category.platforms.join(', ')} · ${category.liveChannels}개 채널`,
    targetId: category.gameId,
    keywords: [category.name, ...category.platforms, '카테고리 분석', '시장 흐름'],
    badge: null,
  }));

  return [...pageResults, ...streamerResults, ...categoryResults];
};
