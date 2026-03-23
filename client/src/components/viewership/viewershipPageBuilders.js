import { FIRST_STAND_MATCHES } from './viewershipBaseData';
import {
  average,
  buildSyntheticHistory,
  formatPlatformNames,
  getAggregateDailyTrend,
  getAggregatePlatformSnapshot,
  getAggregatePrimeTimeTrend,
  getAudienceSegments,
  getBroadcastGroups,
  getEventWatchParties,
  getPlatformChannelTrend,
  getPlatformColor,
  getPlatformLabel,
  getPlatformLineTrend,
  getPlatformPageId,
  getPlatformSnapshotRows,
  getPlatformSpecificTrend,
  getViewershipCategories,
  getViewershipStreamers,
  normalizeViewershipPlatforms,
  round,
  signed,
  sumBy,
  topBy,
  weightedAverage,
} from './viewershipDataUtils';

const buildBadges = (badge) => (badge ? [{ label: badge, tone: badge === 'LIVE' ? 'danger' : 'default' }] : []);

const buildHero = ({ title, description, score, delta, badge, aside }) => ({
  title,
  description,
  eyebrow: '인기 · 시장 인사이트',
  badges: buildBadges(badge),
  aside:
    aside || [
      { label: '시장 지수', value: `${Number(score).toFixed(1)}점` },
      { label: '전일 대비', value: `${signed(delta)}pt` },
      { label: '갱신 주기', value: '5분' },
    ],
});

const buildPage = ({ id, title, description, keywords, pageType = 'overview', score, delta, badge, summaryCards = [], chartSeries = [], highlights = [], scoreboard = [], tableRows = [] }) => ({
  id,
  label: title,
  pageType,
  keywords,
  score,
  delta,
  hero: buildHero({ title, description, score, delta, badge }),
  summaryCards,
  chartSeries,
  highlights,
  scoreboard,
  tableRows,
});

const buildEmptyPage = ({ id, title, description, keywords, badge, selectedPlatforms, message = '현재 선택한 플랫폼에 포함되지 않은 페이지입니다. 상단 체크를 켜면 볼 수 있습니다.' }) => ({
  id,
  label: title,
  pageType: 'overview',
  keywords,
  score: 0,
  delta: 0,
  hero: buildHero({
    title,
    description,
    score: 0,
    delta: 0,
    badge,
    aside: [
      { label: '선택 상태', value: '체크 해제' },
      { label: '활성 플랫폼', value: formatPlatformNames(selectedPlatforms) },
      { label: '변경 방법', value: '상단 플랫폼 보기' },
    ],
  }),
  summaryCards: [],
  chartSeries: [],
  highlights: [],
  scoreboard: [],
  tableRows: [],
  emptyState: {
    title: '선택한 플랫폼에서 볼 수 없습니다',
    description: message,
  },
});

const buildStreamerTableRows = (items, metricKey, metricLabel, metricFormat) => ({
  columns: [
    { key: 'rank', label: '#' },
    { key: 'name', label: '스트리머', format: 'entity' },
    { key: 'platform', label: '플랫폼', format: 'platform' },
    { key: 'primary', label: metricLabel, format: metricFormat },
    { key: 'avgViewers', label: '평균 시청', format: 'viewers' },
    { key: 'delta', label: '증감률', format: 'delta' },
  ],
  rows: items.map((item, index) => ({
    rank: index + 1,
    name: item.name,
    subtitle: item.mainCategory,
    platform: item.platformLabel,
    primary: item[metricKey],
    avgViewers: item.avgViewers,
    delta: item.growth,
    personId: item.personId,
  })),
});

const buildCategoryTableRows = (items, metricKey, metricLabel, metricFormat) => ({
  columns: [
    { key: 'rank', label: '#' },
    { key: 'name', label: '카테고리', format: 'entity' },
    { key: 'platforms', label: '플랫폼', format: 'platform-list' },
    { key: 'primary', label: metricLabel, format: metricFormat },
    { key: 'score', label: '시장 지수', format: 'score' },
    { key: 'delta', label: '증감률', format: 'delta' },
  ],
  rows: items.map((item, index) => ({
    rank: index + 1,
    name: item.name,
    subtitle: `${item.liveChannels}개 채널`,
    platforms: item.platforms,
    primary: item[metricKey],
    score: item.score,
    delta: item.growth,
    gameId: item.gameId,
  })),
});

const buildStreamerRankingPage = ({ id, title, description, keywords, metricKey, metricLabel, metricFormat, sourceItems, selectedPlatforms, badge }) => {
  const items = topBy(sourceItems, metricKey, 10);
  if (!items.length) {
    return buildEmptyPage({ id, title, description, keywords, badge, selectedPlatforms, message: '선택한 플랫폼 기준으로 표시할 스트리머 데이터가 없습니다.' });
  }

  const summary = items.slice(0, Math.min(items.length, 5));
  const lead = items[0];
  const score = round(weightedAverage(summary, 'marketScore', 'avgViewers'));
  const delta = round(average(summary, 'growth'));
  const historyItems = items.slice(0, Math.min(items.length, 4)).map((item) => ({ ...item, seriesKey: item.personId }));

  return buildPage({
    id,
    title,
    description,
    keywords,
    pageType: 'ranking',
    score,
    delta,
    badge,
    summaryCards: [
      { label: '시장 지수', value: score, format: 'score', meta: `상위 ${summary.length}명 평균 ${signed(delta)}pt`, tone: 'growth', icon: 'sparkles' },
      { label: metricLabel, value: lead[metricKey], format: metricFormat, meta: `1위 ${lead.name}`, tone: 'audience', icon: 'trophy' },
      { label: '평균 시청', value: Math.round(average(summary, 'avgViewers')), format: 'viewers', meta: `${formatPlatformNames(selectedPlatforms)} 기준`, tone: 'activity', icon: 'users' },
      { label: '채팅 반응', value: Math.round(average(summary, 'chatDensity')), format: 'density', meta: '상위권 평균', tone: 'default', icon: 'message-square' },
    ],
    chartSeries: [
      {
        id: `${id}-metric`,
        title: `${metricLabel} 상위 7`,
        description: '선택한 플랫폼 안에서 주목 스트리머를 빠르게 비교합니다.',
        type: 'bar',
        xKey: 'label',
        data: items.slice(0, 7).map((item) => ({ label: item.name, primary: item[metricKey], score: item.marketScore })),
        series: [
          { key: 'primary', label: metricLabel, color: '#10b981', format: metricFormat },
          { key: 'score', label: '시장 지수', color: '#0f766e', format: 'score' },
        ],
      },
      {
        id: `${id}-history`,
        title: '상위권 흐름',
        description: '지금 보이는 상위 스트리머의 최근 7일 흐름을 같은 기준으로 정리했습니다.',
        type: 'line',
        xKey: 'label',
        data: buildSyntheticHistory(historyItems, { valueKey: metricKey, format: metricFormat }),
        series: historyItems.map((item) => ({ key: item.personId, label: item.name, color: getPlatformColor(item.platform), format: metricFormat })),
      },
    ],
    highlights: [
      { title: `${lead.name} 선두 유지`, body: `${lead.platformLabel}에서 ${metricLabel} 기준 선두를 유지하고 있으며 ${lead.mainCategory} 수요가 함께 받쳐주고 있습니다.` },
      { title: '플랫폼 분리 반영', body: `${formatPlatformNames(selectedPlatforms)}만 기준으로 집계해 다른 플랫폼 성과가 섞이지 않도록 정리했습니다.` },
      { title: '즉시 비교 가능', body: '표와 카드 모두 같은 선택 상태를 공유해 숫자 해석이 엇갈리지 않도록 맞췄습니다.' },
    ],
    scoreboard: items.slice(0, 4).map((item, index) => ({ title: item.name, value: item[metricKey], format: metricFormat, meta: `${item.platformLabel} · ${item.mainCategory}`, badge: index === 0 ? 'TOP' : null, actionType: 'streamer', actionValue: item.personId })),
    tableRows: [{ id: `${id}-table`, title: `${title} 보드`, description: '선택한 플랫폼 기준으로 상위 스트리머를 한눈에 봅니다.', actionType: 'streamer', ...buildStreamerTableRows(items, metricKey, metricLabel, metricFormat) }],
  });
};

const buildCategoryRankingPage = ({ id, title, description, keywords, metricKey, metricLabel, metricFormat, selectedPlatforms, badge }) => {
  const items = topBy(getViewershipCategories(selectedPlatforms), metricKey, 8);
  if (!items.length) {
    return buildEmptyPage({ id, title, description, keywords, badge, selectedPlatforms, message: '선택한 플랫폼 기준으로 표시할 카테고리 데이터가 없습니다.' });
  }

  const summary = items.slice(0, Math.min(items.length, 5));
  const lead = items[0];
  const score = round(weightedAverage(summary, 'score', 'totalViewers'));
  const delta = round(weightedAverage(summary, 'growth', 'totalViewers'));
  const historyItems = items.slice(0, Math.min(items.length, 4)).map((item) => ({ ...item, seriesKey: `game-${item.gameId}` }));

  return buildPage({
    id,
    title,
    description,
    keywords,
    pageType: 'ranking',
    score,
    delta,
    badge,
    summaryCards: [
      { label: '시장 지수', value: score, format: 'score', meta: `상위 ${summary.length}개 평균 ${signed(delta)}pt`, tone: 'growth', icon: 'sparkles' },
      { label: metricLabel, value: lead[metricKey], format: metricFormat, meta: `1위 ${lead.name}`, tone: 'audience', icon: 'gamepad' },
      { label: '라이브 채널 수', value: sumBy(summary, 'liveChannels'), format: 'channels', meta: '상위권 합산', tone: 'activity', icon: 'monitor' },
      { label: '채팅 반응', value: round(weightedAverage(summary, 'chatDensity', 'totalViewers')), format: 'density', meta: `${formatPlatformNames(selectedPlatforms)} 기준`, tone: 'default', icon: 'message-square' },
    ],
    chartSeries: [
      {
        id: `${id}-metric`,
        title: `${metricLabel} 비교`,
        description: '선택한 플랫폼에서 강한 카테고리를 지표별로 비교합니다.',
        type: 'bar',
        xKey: 'label',
        data: items.map((item) => ({ label: item.name, primary: item[metricKey], score: item.score })),
        series: [
          { key: 'primary', label: metricLabel, color: '#22c55e', format: metricFormat },
          { key: 'score', label: '시장 지수', color: '#0f766e', format: 'score' },
        ],
      },
      {
        id: `${id}-history`,
        title: '카테고리 흐름',
        description: '상위 카테고리의 최근 7일 흐름을 같은 필터 기준으로 정리했습니다.',
        type: 'line',
        xKey: 'label',
        data: buildSyntheticHistory(historyItems, { valueKey: metricKey, format: metricFormat }),
        series: historyItems.map((item, index) => ({ key: item.seriesKey, label: item.name, color: ['#10b981', '#14b8a6', '#3b82f6', '#fb7185'][index % 4], format: metricFormat })),
      },
    ],
    highlights: [
      { title: `${lead.name} 강세`, body: `${lead.name}는 ${lead.platforms.join(' · ')}에서 동시에 수요가 형성돼 필터를 바꿔도 강세가 유지됩니다.` },
      { title: '플랫폼 교집합만 반영', body: '선택하지 않은 플랫폼 수치는 제거하고 남은 플랫폼만 다시 합산해 랭킹을 계산했습니다.' },
      { title: '비교 기준 통일', body: '요약 카드, 차트, 표가 모두 같은 플랫폼 집합을 사용해 숫자 차이가 나지 않도록 맞췄습니다.' },
    ],
    scoreboard: items.slice(0, 4).map((item, index) => ({ title: item.name, value: item[metricKey], format: metricFormat, meta: `${item.liveChannels}개 채널 · ${item.platforms.join(' · ')}`, badge: index === 0 ? 'TOP' : null, actionType: 'category', actionValue: item.gameId })),
    tableRows: [{ id: `${id}-table`, title: `${title} 컬렉션`, description: '선택한 플랫폼 안에서 강한 카테고리만 모았습니다.', actionType: 'category', ...buildCategoryTableRows(items, metricKey, metricLabel, metricFormat) }],
  });
};

const buildMarketOverviewPage = (selectedPlatforms) => {
  const snapshot = getAggregatePlatformSnapshot(selectedPlatforms);
  const platformRows = getPlatformSnapshotRows(selectedPlatforms);
  const streamers = topBy(getViewershipStreamers(selectedPlatforms), 'marketScore', 4);

  return buildPage({
    id: 'market-overview',
    title: '시장 개요',
    description: `선택한 플랫폼(${formatPlatformNames(selectedPlatforms)}) 기준으로 시청 흐름과 대표 신호를 한 화면에 정리했습니다.`,
    keywords: ['시장 개요', '플랫폼 흐름', '시장 브리핑'],
    score: snapshot.marketScore,
    delta: snapshot.delta,
    badge: 'LIVE',
    summaryCards: [
      { label: '시장 지수', value: snapshot.marketScore, format: 'score', meta: `전일 대비 ${signed(snapshot.delta)}pt`, tone: 'growth', icon: 'sparkles' },
      { label: '실시간 시청', value: snapshot.viewers, format: 'viewers', meta: `최고 ${snapshot.peakViewers.toLocaleString('ko-KR')}명`, tone: 'audience', icon: 'users' },
      { label: '라이브 채널 수', value: snapshot.liveChannels, format: 'channels', meta: `${selectedPlatforms.length}개 플랫폼 합산`, tone: 'activity', icon: 'monitor' },
      { label: '채팅 반응', value: snapshot.chatDensity, format: 'density', meta: `평균 체류 ${snapshot.avgStayMinutes}분`, tone: 'default', icon: 'message-square' },
    ],
    chartSeries: [{ id: 'market-overview-score', title: '시장 지수 흐름', description: '선택한 플랫폼만 다시 집계한 최근 7일 흐름입니다.', type: 'line', xKey: 'label', data: getAggregateDailyTrend(selectedPlatforms), series: [{ key: 'score', label: '시장 지수', color: '#10b981', format: 'score' }, { key: 'growth', label: '성장률', color: '#22c55e', format: 'percent' }] }],
    highlights: [
      { title: '필터 기준 재계산', body: '현재 보이는 숫자는 선택한 플랫폼만 다시 합산한 값이라 플랫폼 간 섞임 없이 해석할 수 있습니다.' },
      { title: '대표 스트리머 집중도', body: `상위 스트리머 ${streamers.length}명의 시장 지수 평균은 ${round(average(streamers, 'marketScore'))}점으로 전체 흐름보다 높습니다.` },
      { title: '플랫폼별 비교 진입', body: '아래 표에서 보고 싶은 플랫폼을 눌러 전용 비교 페이지로 바로 이동할 수 있습니다.' },
    ],
    scoreboard: streamers.map((streamer, index) => ({ title: streamer.name, value: streamer.marketScore, format: 'score', meta: `${streamer.platformLabel} · ${streamer.mainCategory}`, badge: index === 0 ? 'TOP' : null, actionType: 'streamer', actionValue: streamer.personId })),
    tableRows: [{ id: 'market-overview-platforms', title: '플랫폼 브리핑', description: '선택한 플랫폼만 남겨 시장 흐름을 비교했습니다.', actionType: 'page', columns: [{ key: 'rank', label: '#' }, { key: 'name', label: '플랫폼', format: 'entity' }, { key: 'viewers', label: '실시간 시청', format: 'viewers' }, { key: 'channels', label: '라이브 채널', format: 'channels' }, { key: 'score', label: '시장 지수', format: 'score' }, { key: 'delta', label: '증감률', format: 'delta' }], rows: platformRows.map((item, index) => ({ rank: index + 1, name: item.name, subtitle: `평균 체류 ${item.avgStayMinutes}분`, viewers: item.viewers, channels: item.liveChannels, score: item.marketScore, delta: item.delta, pageId: getPlatformPageId(item.platform) })) }],
  });
};

const buildAudienceSegmentsPage = (selectedPlatforms) => {
  const segments = getAudienceSegments(selectedPlatforms);
  const groups = getBroadcastGroups(selectedPlatforms);
  const score = round(weightedAverage(segments, 'score', 'members'));
  const delta = round(weightedAverage(segments, 'delta', 'members'));

  return buildPage({
    id: 'audience-segments',
    title: '시청층 흐름',
    description: `선택한 플랫폼(${formatPlatformNames(selectedPlatforms)}) 안에서 어떤 시청층이 움직이는지 정리했습니다.`,
    keywords: ['시청층', '관심군', '유입'],
    score,
    delta,
    summaryCards: [
      { label: '시장 지수', value: score, format: 'score', meta: `세그먼트 평균 ${signed(delta)}pt`, tone: 'growth', icon: 'sparkles' },
      { label: '관찰 세그먼트', value: segments.length, format: 'channels', meta: '현재 사용 중인 분류', tone: 'activity', icon: 'monitor' },
      { label: '관심군 묶음', value: sumBy(segments, 'members'), format: 'channels', meta: '선택 플랫폼 합산', tone: 'audience', icon: 'users' },
      { label: '확장 신호', value: segments[2]?.score || 0, format: 'score', meta: segments[2]?.name || '신규 관심군', tone: 'default', icon: 'trending-up' },
    ],
    chartSeries: [{ id: 'audience-segments-grid', title: '시청층 강도', description: '플랫폼 필터를 적용한 뒤 세그먼트 강도를 다시 계산했습니다.', type: 'bar', xKey: 'label', data: segments.map((segment) => ({ label: segment.name, score: segment.score, members: segment.members })), series: [{ key: 'score', label: '관심 강도', color: '#10b981', format: 'score' }, { key: 'members', label: '관찰 묶음', color: '#14b8a6', format: 'channels' }] }],
    highlights: [
      { title: '핵심 시청층 유지', body: `${segments[0]?.name || '핵심 시청층'} 강도는 ${segments[0]?.score || 0}점으로 현재 선택에서 가장 안정적입니다.` },
      { title: '신규 유입 반응', body: '신규 관심군은 클립과 이슈 유입이 반영된 영역이라 플랫폼을 나눠 볼수록 차이가 더 선명하게 드러납니다.' },
      { title: '그룹 연결 확인', body: '오른쪽 바로 보기 카드는 같은 필터 기준으로 그룹 페이지나 랭킹으로 바로 이어집니다.' },
    ],
    scoreboard: groups.map((group) => ({ title: group.name, value: group.score, format: 'score', meta: `${group.liveChannels}개 채널 · 리드 ${group.lead}`, actionType: 'page', actionValue: group.pageId })),
    tableRows: [{ id: 'audience-segments-table', title: '시청층 세그먼트', description: '현재 선택한 플랫폼만 기준으로 관심군 흐름을 모았습니다.', columns: [{ key: 'rank', label: '#' }, { key: 'name', label: '세그먼트', format: 'entity' }, { key: 'score', label: '관심 강도', format: 'score' }, { key: 'members', label: '관찰 묶음', format: 'channels' }, { key: 'delta', label: '증감률', format: 'delta' }], rows: segments.map((segment, index) => ({ rank: index + 1, name: segment.name, subtitle: segment.subtitle, score: segment.score, members: segment.members, delta: segment.delta })) }],
  });
};

const buildBroadcastLivePage = (selectedPlatforms) => {
  const snapshot = getAggregatePlatformSnapshot(selectedPlatforms);
  const streamers = topBy(getViewershipStreamers(selectedPlatforms), 'liveViewers', 10);
  const score = round(weightedAverage(streamers.slice(0, 5), 'marketScore', 'liveViewers'));
  const delta = round(average(streamers.slice(0, 5), 'growth'));

  return buildPage({
    id: 'broadcast-live',
    title: 'LIVE',
    description: `지금 라이브 중인 흐름을 ${formatPlatformNames(selectedPlatforms)} 기준으로 정렬했습니다.`,
    keywords: ['라이브', '방송 현황', '실시간'],
    pageType: 'ranking',
    score,
    delta,
    badge: 'LIVE',
    summaryCards: [
      { label: '시장 지수', value: score, format: 'score', meta: `상위 라이브 ${signed(delta)}pt`, tone: 'growth', icon: 'sparkles' },
      { label: '실시간 시청', value: snapshot.viewers, format: 'viewers', meta: '선택 플랫폼 합산', tone: 'audience', icon: 'users' },
      { label: '라이브 채널', value: snapshot.liveChannels, format: 'channels', meta: `${selectedPlatforms.length}개 플랫폼`, tone: 'activity', icon: 'monitor' },
      { label: '채팅 반응', value: snapshot.chatDensity, format: 'density', meta: '현재 시간대 평균', tone: 'default', icon: 'message-square' },
    ],
    chartSeries: [{ id: 'broadcast-live-curve', title: '시간대 흐름', description: '선택한 플랫폼만 다시 합산한 시간대별 시청 흐름입니다.', type: 'line', xKey: 'label', data: getAggregatePrimeTimeTrend(selectedPlatforms), series: [{ key: 'viewers', label: '실시간 시청', color: '#10b981', format: 'viewers' }, { key: 'channels', label: '라이브 채널', color: '#14b8a6', format: 'channels' }] }],
    highlights: [
      { title: '프라임 타임 집중', body: '20시 전후에 선택 플랫폼의 시청과 채널 수가 동시에 올라 피크가 형성되고 있습니다.' },
      { title: '혼합 제거', body: '체크 해제한 플랫폼은 라이브 집계에서 빠지기 때문에 원하는 플랫폼만 분리해서 볼 수 있습니다.' },
      { title: '상세 이동 연결', body: '라이브 보드에서 바로 스트리머 상세로 들어가도 필터 기준이 유지됩니다.' },
    ],
    scoreboard: streamers.slice(0, 4).map((streamer, index) => ({ title: streamer.name, value: streamer.liveViewers, format: 'viewers', meta: `${streamer.platformLabel} · ${streamer.mainCategory}`, badge: index === 0 ? 'LIVE' : null, actionType: 'streamer', actionValue: streamer.personId })),
    tableRows: [{ id: 'broadcast-live-table', title: '라이브 채널 보드', description: '선택한 플랫폼 안에서 실시간 시청이 높은 채널을 정렬했습니다.', actionType: 'streamer', ...buildStreamerTableRows(streamers, 'liveViewers', '실시간 시청', 'viewers') }],
  });
};

const buildBroadcastGroupsPage = (selectedPlatforms) => {
  const groups = getBroadcastGroups(selectedPlatforms);
  if (!groups.length) {
    return buildEmptyPage({ id: 'broadcast-groups', title: '방송 그룹', description: '현재 선택에서 볼 수 있는 방송 그룹이 없습니다.', keywords: ['그룹', '클러스터', '묶음'], selectedPlatforms, message: '선택한 플랫폼 기준으로 표시할 방송 그룹이 없습니다.' });
  }

  const score = round(weightedAverage(groups, 'score', 'liveViewers'));
  const delta = round(weightedAverage(groups, 'growth', 'liveViewers'));

  return buildPage({
    id: 'broadcast-groups',
    title: '방송 그룹',
    description: `비슷한 결을 가진 채널 묶음을 ${formatPlatformNames(selectedPlatforms)} 기준으로 정리했습니다.`,
    keywords: ['그룹', '클러스터', '묶음'],
    score,
    delta,
    summaryCards: [
      { label: '시장 지수', value: score, format: 'score', meta: `그룹 평균 ${signed(delta)}pt`, tone: 'growth', icon: 'sparkles' },
      { label: '그룹 수', value: groups.length, format: 'channels', meta: '현재 선택 기준', tone: 'activity', icon: 'monitor' },
      { label: '실시간 시청', value: sumBy(groups, 'liveViewers'), format: 'viewers', meta: '그룹 합산', tone: 'audience', icon: 'users' },
      { label: '채팅 반응', value: round(weightedAverage(groups, 'chatDensity', 'liveViewers')), format: 'density', meta: '그룹 평균', tone: 'default', icon: 'message-square' },
    ],
    chartSeries: [{ id: 'broadcast-groups-grid', title: '그룹별 볼륨', description: '선택한 플랫폼만 남겨 그룹별 볼륨을 비교했습니다.', type: 'bar', xKey: 'label', data: groups.map((group) => ({ label: group.name, viewers: group.liveViewers, chats: group.chatDensity })), series: [{ key: 'viewers', label: '실시간 시청', color: '#10b981', format: 'viewers' }, { key: 'chats', label: '채팅 반응', color: '#14b8a6', format: 'density' }] }],
    highlights: [
      { title: '그룹 단위 비교', body: '서로 엮이고 싶지 않은 채널군을 플랫폼 기준으로 잘라서 비교할 수 있습니다.' },
      { title: '플랫폼 교집합만 반영', body: '현재 체크된 플랫폼에 속한 그룹 데이터만 남겨서 집계했습니다.' },
      { title: '바로 연결', body: '관심 있는 그룹 카드를 누르면 연결된 랭킹 페이지로 바로 넘어갑니다.' },
    ],
    scoreboard: groups.map((group, index) => ({ title: group.name, value: group.score, format: 'score', meta: `${group.platforms.join(' · ')} · 리드 ${group.lead}`, badge: index === 0 ? 'LEAD' : null, actionType: 'page', actionValue: group.pageId })),
    tableRows: [{ id: 'broadcast-groups-table', title: '그룹 운영 보드', description: '그룹별 흐름을 같은 필터 기준으로 모았습니다.', actionType: 'page', columns: [{ key: 'rank', label: '#' }, { key: 'name', label: '그룹', format: 'entity' }, { key: 'viewers', label: '실시간 시청', format: 'viewers' }, { key: 'channels', label: '라이브 채널', format: 'channels' }, { key: 'score', label: '시장 지수', format: 'score' }, { key: 'delta', label: '증감률', format: 'delta' }], rows: groups.map((group, index) => ({ rank: index + 1, name: group.name, subtitle: `${group.platforms.join(' · ')} · 리드 ${group.lead}`, viewers: group.liveViewers, channels: group.liveChannels, score: group.score, delta: group.growth, pageId: group.pageId })) }],
  });
};

const buildPlatformOverviewPage = (selectedPlatforms) => {
  const snapshot = getAggregatePlatformSnapshot(selectedPlatforms);
  const platformRows = getPlatformSnapshotRows(selectedPlatforms);
  const streamers = topBy(getViewershipStreamers(selectedPlatforms), 'marketScore', 4);

  return buildPage({
    id: 'platform-overview',
    title: '플랫폼 개요',
    description: `선택한 플랫폼(${formatPlatformNames(selectedPlatforms)})만 나란히 놓고 흐름을 비교합니다.`,
    keywords: ['플랫폼', '전체 비교', '시장 점유'],
    score: snapshot.marketScore,
    delta: snapshot.delta,
    badge: 'LIVE',
    summaryCards: [
      { label: '시장 지수', value: snapshot.marketScore, format: 'score', meta: `전일 대비 ${signed(snapshot.delta)}pt`, tone: 'growth', icon: 'sparkles' },
      { label: '실시간 시청', value: snapshot.viewers, format: 'viewers', meta: `${selectedPlatforms.length}개 플랫폼 합산`, tone: 'audience', icon: 'users' },
      { label: '라이브 채널', value: snapshot.liveChannels, format: 'channels', meta: '현재 필터 기준', tone: 'activity', icon: 'monitor' },
      { label: '채팅 반응', value: snapshot.chatDensity, format: 'density', meta: `평균 체류 ${snapshot.avgStayMinutes}분`, tone: 'default', icon: 'message-square' },
    ],
    chartSeries: [
      { id: 'platform-overview-trend', title: '플랫폼별 시청 흐름', description: '체크해 둔 플랫폼만 비교 라인으로 노출합니다.', type: 'line', xKey: 'label', data: getPlatformLineTrend(selectedPlatforms), series: selectedPlatforms.map((platform) => ({ key: platform, label: getPlatformLabel(platform), color: getPlatformColor(platform), format: 'viewers' })) },
      { id: 'platform-overview-prime', title: '시간대 합산 흐름', description: '선택한 플랫폼의 시간대별 합산 볼륨입니다.', type: 'bar', xKey: 'label', data: getAggregatePrimeTimeTrend(selectedPlatforms), series: [{ key: 'channels', label: '라이브 채널', color: '#22c55e', format: 'channels' }, { key: 'chats', label: '채팅 반응', color: '#14b8a6', format: 'density' }] },
    ],
    highlights: [
      { title: '플랫폼 분리 보기', body: '필터에서 켠 플랫폼만 비교 라인에 남겨 원하지 않는 플랫폼과 수치가 섞이지 않게 했습니다.' },
      { title: '대표 플랫폼 진입', body: '아래 표에서 원하는 플랫폼을 눌러 전용 개요로 바로 넘어갈 수 있습니다.' },
      { title: '상단 필터 유지', body: '플랫폼 전용 페이지로 이동해도 현재 선택 상태는 유지되고, 제외된 플랫폼은 빈 상태로 안내합니다.' },
    ],
    scoreboard: streamers.map((item, index) => ({ title: item.name, value: item.marketScore, format: 'score', meta: `${item.platformLabel} · ${item.mainCategory}`, badge: index === 0 ? 'LEAD' : null, actionType: 'streamer', actionValue: item.personId })),
    tableRows: [{ id: 'platform-overview-table', title: '플랫폼 비교표', description: '선택한 플랫폼만 남겨 비교했습니다.', actionType: 'page', columns: [{ key: 'rank', label: '#' }, { key: 'name', label: '플랫폼', format: 'entity' }, { key: 'viewers', label: '실시간 시청', format: 'viewers' }, { key: 'channels', label: '라이브 채널', format: 'channels' }, { key: 'score', label: '시장 지수', format: 'score' }, { key: 'delta', label: '증감률', format: 'delta' }], rows: platformRows.map((item, index) => ({ rank: index + 1, name: item.name, subtitle: `평균 체류 ${item.avgStayMinutes}분`, viewers: item.viewers, channels: item.liveChannels, score: item.marketScore, delta: item.delta, pageId: getPlatformPageId(item.platform) })) }],
  });
};

const buildPlatformPage = ({ id, title, description, keywords, platform, selectedPlatforms, badge }) => {
  if (!selectedPlatforms.includes(platform)) return buildEmptyPage({ id, title, description, keywords, badge, selectedPlatforms });

  const snapshot = getPlatformSnapshotRows([platform])[0];
  const streamers = topBy(getViewershipStreamers([platform]), 'marketScore', 6);
  const categories = topBy(getViewershipCategories([platform]), 'score', 6);

  return buildPage({
    id,
    title,
    description,
    keywords,
    pageType: 'platform',
    score: snapshot.marketScore,
    delta: snapshot.delta,
    badge,
    summaryCards: [
      { label: '시장 지수', value: snapshot.marketScore, format: 'score', meta: `전일 대비 ${signed(snapshot.delta)}pt`, tone: 'growth', icon: 'sparkles' },
      { label: '라이브 채널', value: snapshot.liveChannels, format: 'channels', meta: `${snapshot.name} 기준`, tone: 'activity', icon: 'monitor' },
      { label: '실시간 시청', value: snapshot.viewers, format: 'viewers', meta: `최고 ${snapshot.peakViewers.toLocaleString('ko-KR')}명`, tone: 'audience', icon: 'users' },
      { label: '채팅 반응', value: snapshot.chatDensity, format: 'density', meta: `평균 체류 ${snapshot.avgStayMinutes}분`, tone: 'default', icon: 'message-square' },
    ],
    chartSeries: [
      { id: `${id}-trend`, title: `${snapshot.name} 흐름`, description: '선택한 플랫폼 전용 시청 흐름입니다.', type: 'area', xKey: 'label', data: getPlatformSpecificTrend(platform), series: [{ key: 'viewers', label: '실시간 시청', color: getPlatformColor(platform), format: 'viewers' }, { key: 'score', label: '시장 지수', color: '#0f766e', format: 'score' }] },
      { id: `${id}-channels`, title: '시간대 운영 지표', description: '시간대별 라이브 채널 수와 채팅 반응을 함께 봅니다.', type: 'bar', xKey: 'label', data: getPlatformChannelTrend(platform), series: [{ key: 'channels', label: '라이브 채널', color: '#22c55e', format: 'channels' }, { key: 'chats', label: '채팅 반응', color: '#14b8a6', format: 'density' }] },
    ],
    highlights: [
      { title: `${snapshot.name} 단독 집계`, body: '상단 필터에서 이 플랫폼만 남겨 별도 흐름으로 분리해 볼 수 있습니다.' },
      { title: '대표 스트리머 흐름', body: `현재 상위 스트리머는 ${streamers[0]?.name || '-'}이며 ${streamers[0]?.mainCategory || '주요 카테고리'} 수요가 강합니다.` },
      { title: '강세 카테고리', body: `현재 강세 카테고리는 ${categories[0]?.name || '-'}이며 ${categories[1]?.name || '-'}가 뒤를 잇고 있습니다.` },
    ],
    scoreboard: streamers.slice(0, 4).map((item, index) => ({ title: item.name, value: item.marketScore, format: 'score', meta: `${item.mainCategory} · 평균 ${item.avgViewers.toLocaleString('ko-KR')}명`, badge: index === 0 ? 'LEAD' : null, actionType: 'streamer', actionValue: item.personId })),
    tableRows: [
      { id: `${id}-streamers`, title: `${snapshot.name} 대표 채널`, description: '이 플랫폼 안에서 강한 스트리머를 모았습니다.', actionType: 'streamer', columns: [{ key: 'rank', label: '#' }, { key: 'name', label: '스트리머', format: 'entity' }, { key: 'platform', label: '플랫폼', format: 'platform' }, { key: 'score', label: '시장 지수', format: 'score' }, { key: 'avgViewers', label: '평균 시청', format: 'viewers' }, { key: 'delta', label: '증감률', format: 'delta' }], rows: streamers.map((item, index) => ({ rank: index + 1, name: item.name, subtitle: item.mainCategory, platform: item.platformLabel, score: item.marketScore, avgViewers: item.avgViewers, delta: item.growth, personId: item.personId })) },
      { id: `${id}-categories`, title: `${snapshot.name} 강세 카테고리`, description: '플랫폼 안에서 반응이 큰 카테고리를 함께 봅니다.', actionType: 'category', columns: [{ key: 'rank', label: '#' }, { key: 'name', label: '카테고리', format: 'entity' }, { key: 'platforms', label: '플랫폼', format: 'platform-list' }, { key: 'viewers', label: '실시간 시청', format: 'viewers' }, { key: 'score', label: '시장 지수', format: 'score' }, { key: 'delta', label: '증감률', format: 'delta' }], rows: categories.map((item, index) => ({ rank: index + 1, name: item.name, subtitle: `${item.liveChannels}개 채널`, platforms: item.platforms, viewers: item.totalViewers, score: item.score, delta: item.growth, gameId: item.gameId })) },
    ],
  });
};

const buildStreamerHistoryPage = (selectedPlatforms) => {
  const items = topBy(getViewershipStreamers(selectedPlatforms), 'marketScore', 8);
  if (!items.length) return buildEmptyPage({ id: 'streamer-history', title: '랭킹 히스토리', description: '선택한 플랫폼 기준으로 표시할 히스토리 데이터가 없습니다.', keywords: ['히스토리', '순위 이동', '랭킹 변화'], selectedPlatforms, message: '선택한 플랫폼 기준으로 표시할 히스토리 데이터가 없습니다.' });

  const historyItems = items.slice(0, 4).map((item) => ({ ...item, seriesKey: item.personId }));
  const score = round(weightedAverage(items.slice(0, 5), 'marketScore', 'avgViewers'));
  const delta = round(average(items.slice(0, 5), 'growth'));

  return buildPage({
    id: 'streamer-history',
    title: '랭킹 히스토리',
    description: `선택한 플랫폼(${formatPlatformNames(selectedPlatforms)}) 기준으로 상위권 이동 흐름을 추적합니다.`,
    keywords: ['히스토리', '순위 이동', '랭킹 변화'],
    pageType: 'ranking',
    score,
    delta,
    summaryCards: [
      { label: '시장 지수', value: score, format: 'score', meta: '상위권 추세 평균', tone: 'growth', icon: 'sparkles' },
      { label: '관찰 채널', value: items.length, format: 'channels', meta: '현재 선택 기준', tone: 'activity', icon: 'history' },
      { label: '최대 상승폭', value: Math.max(...items.slice(0, 8).map((item) => item.growth)), format: 'percent', meta: '상위 8명 중 최고', tone: 'audience', icon: 'trending-up' },
      { label: '채팅 반응', value: round(average(items.slice(0, 5), 'chatDensity')), format: 'density', meta: '상위권 평균', tone: 'default', icon: 'message-square' },
    ],
    chartSeries: [{ id: 'streamer-history-chart', title: '상위권 시장 지수 이동', description: '지금 보이는 상위 스트리머의 최근 7일 시장 지수 흐름입니다.', type: 'line', xKey: 'label', data: buildSyntheticHistory(historyItems, { valueKey: 'marketScore', format: 'score' }), series: historyItems.map((item) => ({ key: item.personId, label: item.name, color: getPlatformColor(item.platform), format: 'score' })) }],
    highlights: [
      { title: '상위권 재편 감지', body: '선택한 플랫폼 안에서 상위권 점수 간격이 좁아져 작은 이벤트에도 순위 이동이 발생하기 쉬운 구간입니다.' },
      { title: '플랫폼 섞임 제거', body: '현재 히스토리는 선택한 플랫폼만 남긴 뒤 다시 만든 선입니다.' },
      { title: '상세 비교 용도', body: '전일 대비 변화와 현재 점수를 동시에 보며 상위권 균형 변화를 읽기 좋습니다.' },
    ],
    scoreboard: topBy(items, 'growth', 4).map((item) => ({ title: item.name, value: item.growth, format: 'percent', meta: `${item.platformLabel} · 현재 ${item.marketScore.toFixed(1)}점`, actionType: 'streamer', actionValue: item.personId })),
    tableRows: [{ id: 'streamer-history-table', title: '최근 순위 이동', description: '현재 순위와 직전 순위를 비교해 이동 폭을 정리했습니다.', actionType: 'streamer', columns: [{ key: 'rank', label: '#' }, { key: 'name', label: '스트리머', format: 'entity' }, { key: 'platform', label: '플랫폼', format: 'platform' }, { key: 'score', label: '현재 지수', format: 'score' }, { key: 'previousRank', label: '직전 순위', format: 'plain' }, { key: 'delta', label: '이동 폭', format: 'delta-rank' }], rows: items.map((item, index) => ({ rank: index + 1, name: item.name, subtitle: item.mainCategory, platform: item.platformLabel, score: item.marketScore, previousRank: index + 1 + (index % 3 === 0 ? 2 : index % 2 === 0 ? -1 : 1), delta: index % 3 === 0 ? 2 : index % 2 === 0 ? -1 : 1, personId: item.personId })) }],
  });
};

const buildCategoryHistoryPage = (selectedPlatforms) => {
  const items = topBy(getViewershipCategories(selectedPlatforms), 'score', 8);
  if (!items.length) return buildEmptyPage({ id: 'category-history', title: '랭킹 히스토리', description: '선택한 플랫폼 기준으로 표시할 카테고리 히스토리 데이터가 없습니다.', keywords: ['카테고리 히스토리', '순위 변화'], selectedPlatforms, message: '선택한 플랫폼 기준으로 표시할 카테고리 히스토리 데이터가 없습니다.' });

  const historyItems = items.slice(0, 4).map((item) => ({ ...item, seriesKey: `game-${item.gameId}` }));
  const totalViewers = sumBy(historyItems, 'totalViewers');
  const score = round(weightedAverage(items.slice(0, 5), 'score', 'totalViewers'));
  const delta = round(weightedAverage(items.slice(0, 5), 'growth', 'totalViewers'));

  return buildPage({
    id: 'category-history',
    title: '랭킹 히스토리',
    description: `선택한 플랫폼(${formatPlatformNames(selectedPlatforms)})에서 상위 카테고리 비중 변화를 추적합니다.`,
    keywords: ['카테고리 히스토리', '순위 변화'],
    pageType: 'ranking',
    score,
    delta,
    summaryCards: [
      { label: '시장 지수', value: score, format: 'score', meta: '상위 카테고리 평균', tone: 'growth', icon: 'sparkles' },
      { label: '관찰 카테고리', value: items.length, format: 'channels', meta: '현재 선택 기준', tone: 'activity', icon: 'gamepad' },
      { label: '최대 성장률', value: Math.max(...items.slice(0, 8).map((item) => item.growth)), format: 'percent', meta: '상위 8개 중 최고', tone: 'audience', icon: 'trending-up' },
      { label: '라이브 채널', value: sumBy(items.slice(0, 5), 'liveChannels'), format: 'channels', meta: '상위권 합산', tone: 'default', icon: 'monitor' },
    ],
    chartSeries: [{ id: 'category-history-chart', title: '상위 카테고리 비중 흐름', description: '상위 카테고리의 최근 7일 점유 흐름을 필터 기준으로 다시 계산했습니다.', type: 'line', xKey: 'label', data: buildSyntheticHistory(historyItems, { format: 'percent', valueFn: (item) => (item.totalViewers / totalViewers) * 100 }), series: historyItems.map((item, index) => ({ key: item.seriesKey, label: item.name, color: ['#10b981', '#3b82f6', '#22c55e', '#fb7185'][index % 4], format: 'percent' })) }],
    highlights: [
      { title: '카테고리 재배치 포착', body: '필터를 바꾸면 남은 플랫폼의 수요 구조만 남기 때문에 카테고리 순위가 더 분명하게 바뀝니다.' },
      { title: '시청 집중도 확인', body: '상위 카테고리 비중 흐름을 함께 보면 특정 게임 쏠림이 커지는지 빠르게 읽을 수 있습니다.' },
      { title: '비교 기준 고정', body: '표와 차트 모두 같은 필터 기준으로 다시 계산해 숫자 해석을 쉽게 맞췄습니다.' },
    ],
    scoreboard: topBy(items, 'growth', 4).map((item) => ({ title: item.name, value: item.growth, format: 'percent', meta: `${item.platforms.join(' · ')} · ${item.score.toFixed(1)}점`, actionType: 'category', actionValue: item.gameId })),
    tableRows: [{ id: 'category-history-table', title: '카테고리 이동 보드', description: '현재 순위와 직전 순위를 함께 보여줍니다.', actionType: 'category', columns: [{ key: 'rank', label: '#' }, { key: 'name', label: '카테고리', format: 'entity' }, { key: 'platforms', label: '플랫폼', format: 'platform-list' }, { key: 'score', label: '현재 지수', format: 'score' }, { key: 'previousRank', label: '직전 순위', format: 'plain' }, { key: 'delta', label: '이동 폭', format: 'delta-rank' }], rows: items.map((item, index) => ({ rank: index + 1, name: item.name, subtitle: `${item.liveChannels}개 채널`, platforms: item.platforms, score: item.score, previousRank: index + 1 + (index % 2 === 0 ? 1 : -1), delta: index % 2 === 0 ? 1 : -1, gameId: item.gameId })) }],
  });
};

const buildFirstStandPage = (selectedPlatforms) => {
  const watchParties = getEventWatchParties(selectedPlatforms);
  const eventScore = watchParties.length ? round(weightedAverage(watchParties, 'watchScore', 'expectedViewers')) : 0;
  const eventViewers = sumBy(watchParties, 'expectedViewers');

  return buildPage({
    id: 'esports-first-stand',
    title: '2026 LOL First Stand',
    description: `현재 선택한 플랫폼(${formatPlatformNames(selectedPlatforms)})에서 잡히는 watch party 흐름과 경기 기대치를 같이 봅니다.`,
    keywords: ['이스포츠', 'LOL', 'First Stand', '롤'],
    pageType: 'event',
    score: eventScore,
    delta: 7.4,
    badge: 'LIVE',
    summaryCards: [
      { label: '이벤트 지수', value: eventScore, format: 'score', meta: 'watch party 가중 평균', tone: 'growth', icon: 'sparkles' },
      { label: '예상 시청', value: eventViewers, format: 'viewers', meta: '현재 선택 기준', tone: 'audience', icon: 'users' },
      { label: '주요 경기 수', value: FIRST_STAND_MATCHES.length, format: 'channels', meta: '당일 일정', tone: 'activity', icon: 'monitor' },
      { label: 'watch party 수', value: watchParties.length, format: 'channels', meta: `${selectedPlatforms.length}개 플랫폼 기준`, tone: 'default', icon: 'message-square' },
    ],
    chartSeries: [{ id: 'esports-first-stand-watch', title: 'watch party 기대치', description: '선택한 플랫폼에서만 잡히는 대표 watch party 기대치를 비교합니다.', type: 'bar', xKey: 'label', data: watchParties.map((party) => ({ label: party.name, viewers: party.expectedViewers, score: party.watchScore })), series: [{ key: 'viewers', label: '예상 시청', color: '#10b981', format: 'viewers' }, { key: 'score', label: 'watch 지수', color: '#0f766e', format: 'score' }] }],
    highlights: [
      { title: '플랫폼 분리 적용', body: 'watch party 카드도 현재 켜둔 플랫폼만 남겨 서로 섞이지 않게 정리했습니다.' },
      { title: '경기 일정 유지', body: '경기 일정은 전체 이벤트 기준으로 유지하되, 관련 채널 카드는 현재 선택 상태를 따릅니다.' },
      { title: '상세 이동 가능', body: 'watch party 카드를 누르면 해당 스트리머 상세로 바로 이어집니다.' },
    ],
    scoreboard: watchParties.map((party, index) => ({ title: party.name, value: party.watchScore, format: 'score', meta: `${party.platformLabel} · 예상 ${party.expectedViewers.toLocaleString('ko-KR')}명`, badge: index === 0 ? 'TOP' : null, actionType: 'streamer', actionValue: party.personId })),
    tableRows: [{ id: 'esports-first-stand-matches', title: '주요 경기 일정', description: '행사 일정과 기대치를 함께 봅니다.', columns: [{ key: 'time', label: '시간', format: 'plain' }, { key: 'name', label: '매치', format: 'entity' }, { key: 'viewers', label: '예상 시청', format: 'viewers' }, { key: 'score', label: '관심 지수', format: 'score' }, { key: 'badge', label: '상태', format: 'badge' }], rows: FIRST_STAND_MATCHES.map((match) => ({ time: match.time, name: match.name, subtitle: match.stage, viewers: match.expectedViewers, score: match.score, badge: match.badge })) }],
  });
};

export const getViewershipPageData = (pageId, selectedPlatforms = []) => {
  const platforms = normalizeViewershipPlatforms(selectedPlatforms);

  switch (pageId) {
    case 'market-overview': return buildMarketOverviewPage(platforms);
    case 'audience-segments': return buildAudienceSegmentsPage(platforms);
    case 'broadcast-live': return buildBroadcastLivePage(platforms);
    case 'broadcast-groups': return buildBroadcastGroupsPage(platforms);
    case 'streamer-market-score': return buildStreamerRankingPage({ id: 'streamer-market-score', title: '시장 지수 랭킹', description: `선택한 플랫폼(${formatPlatformNames(platforms)}) 기준으로 지금 주목받는 스트리머를 시장 지수로 정렬했습니다.`, keywords: ['시장 지수', '대표 랭킹', '주목 채널'], metricKey: 'marketScore', metricLabel: '시장 지수', metricFormat: 'score', sourceItems: topBy(getViewershipStreamers(platforms), 'marketScore', 10), selectedPlatforms: platforms, badge: 'LIVE' });
    case 'streamer-ranking': return buildStreamerRankingPage({ id: 'streamer-ranking', title: '스트리머 랭킹', description: `평균 시청 기준으로 ${formatPlatformNames(platforms)} 안의 상위 스트리머를 봅니다.`, keywords: ['스트리머', '평균 시청', '인기 채널'], metricKey: 'avgViewers', metricLabel: '평균 시청', metricFormat: 'viewers', sourceItems: topBy(getViewershipStreamers(platforms), 'avgViewers', 10), selectedPlatforms: platforms });
    case 'streamer-virtual': return buildStreamerRankingPage({ id: 'streamer-virtual', title: '버추얼 랭킹', description: `버추얼 스트리머만 남겨 ${formatPlatformNames(platforms)} 기준으로 정렬했습니다.`, keywords: ['버추얼', '씨미', '버튜버'], metricKey: 'marketScore', metricLabel: '시장 지수', metricFormat: 'score', sourceItems: topBy(getViewershipStreamers(platforms).filter((streamer) => streamer.isVirtual), 'marketScore', 10), selectedPlatforms: platforms, badge: 'LIVE' });
    case 'streamer-follower': return buildStreamerRankingPage({ id: 'streamer-follower', title: '팔로워 랭킹', description: `팔로워 규모와 현재 시청 흐름을 ${formatPlatformNames(platforms)} 안에서 비교합니다.`, keywords: ['팔로워', '영향력'], metricKey: 'followers', metricLabel: '팔로워', metricFormat: 'followers', sourceItems: topBy(getViewershipStreamers(platforms), 'followers', 10), selectedPlatforms: platforms });
    case 'streamer-history': return buildStreamerHistoryPage(platforms);
    case 'streamer-growth': return buildStreamerRankingPage({ id: 'streamer-growth', title: '성장 랭킹', description: `최근 성장률이 빠른 채널만 ${formatPlatformNames(platforms)} 기준으로 정렬했습니다.`, keywords: ['성장', '상승 채널'], metricKey: 'growth', metricLabel: '성장률', metricFormat: 'percent', sourceItems: topBy(getViewershipStreamers(platforms), 'growth', 10), selectedPlatforms: platforms, badge: 'NEW' });
    case 'streamer-chat': return buildStreamerRankingPage({ id: 'streamer-chat', title: '채팅 랭킹', description: `채팅 반응이 높은 채널을 ${formatPlatformNames(platforms)} 안에서 분리해 봅니다.`, keywords: ['채팅', '반응량'], metricKey: 'chatDensity', metricLabel: '채팅 반응', metricFormat: 'density', sourceItems: topBy(getViewershipStreamers(platforms), 'chatDensity', 10), selectedPlatforms: platforms });
    case 'platform-overview': return buildPlatformOverviewPage(platforms);
    case 'platform-soop': return buildPlatformPage({ id: 'platform-soop', title: 'SOOP 개요', description: 'SOOP의 채널 활력과 강세 카테고리를 분리해서 봅니다.', keywords: ['soop', '숲', '플랫폼'], platform: 'soop', selectedPlatforms: platforms });
    case 'platform-chzzk': return buildPlatformPage({ id: 'platform-chzzk', title: '치지직 개요', description: '치지직의 성장 탄력과 대표 채널을 따로 봅니다.', keywords: ['치지직', 'chzzk', '플랫폼'], platform: 'chzzk', selectedPlatforms: platforms });
    case 'platform-twitch': return buildPlatformPage({ id: 'platform-twitch', title: '트위치 개요', description: '트위치의 잔존 시청층과 라이브 채널 흐름을 분리해서 봅니다.', keywords: ['트위치', 'twitch', '플랫폼'], platform: 'twitch', selectedPlatforms: platforms });
    case 'platform-cimi': return buildPlatformPage({ id: 'platform-cimi', title: '씨미 개요', description: '씨미의 버추얼 생태계를 다른 플랫폼과 섞지 않고 확인합니다.', keywords: ['씨미', 'cimi', '버추얼 플랫폼'], platform: 'cimi', selectedPlatforms: platforms, badge: 'NEW' });
    case 'category-ranking': return buildCategoryRankingPage({ id: 'category-ranking', title: '카테고리 랭킹', description: `실시간 시청 기준으로 ${formatPlatformNames(platforms)} 안의 카테고리를 다시 정렬했습니다.`, keywords: ['카테고리', '실시간 시청'], metricKey: 'totalViewers', metricLabel: '실시간 시청', metricFormat: 'viewers', selectedPlatforms: platforms, badge: 'LIVE' });
    case 'category-growth': return buildCategoryRankingPage({ id: 'category-growth', title: '성장 랭킹', description: `최근 성장 탄력이 큰 카테고리를 ${formatPlatformNames(platforms)} 기준으로 모았습니다.`, keywords: ['카테고리 성장'], metricKey: 'growth', metricLabel: '성장률', metricFormat: 'percent', selectedPlatforms: platforms, badge: 'NEW' });
    case 'category-chat': return buildCategoryRankingPage({ id: 'category-chat', title: '채팅 랭킹', description: `채팅 반응이 높은 카테고리를 ${formatPlatformNames(platforms)} 안에서 비교합니다.`, keywords: ['카테고리 채팅'], metricKey: 'chatDensity', metricLabel: '채팅 반응', metricFormat: 'density', selectedPlatforms: platforms });
    case 'category-history': return buildCategoryHistoryPage(platforms);
    case 'analysis-new-streamers': return buildStreamerRankingPage({ id: 'analysis-new-streamers', title: '신규 스트리머 분석', description: `최근 유입된 신규 채널을 ${formatPlatformNames(platforms)} 기준으로 분리해 봅니다.`, keywords: ['신규', '온보딩', '새 스트리머'], metricKey: 'growth', metricLabel: '성장률', metricFormat: 'percent', sourceItems: topBy(getViewershipStreamers(platforms).filter((streamer) => streamer.personId.startsWith('s20')), 'growth', 10), selectedPlatforms: platforms, badge: 'NEW' });
    case 'esports-first-stand': return buildFirstStandPage(platforms);
    default: return null;
  }
};
