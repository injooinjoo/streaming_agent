import {
  AUDIENCE_SEGMENT_DEFS,
  BROADCAST_GROUP_DEFS,
  CATEGORY_DEFS,
  DAILY_PLATFORM_METRICS,
  FIRST_STAND_MATCHES,
  FIRST_STAND_WATCH_PARTIES,
  NEW_STREAMERS,
  PLATFORM_META,
  PLATFORM_SNAPSHOT,
  PRIME_TIME_TREND,
  STREAMERS,
  VIEWERSHIP_PLATFORM_KEYS,
  VIEWERSHIP_PLATFORM_OPTIONS,
} from './viewershipBaseData';
import {
  enrichViewershipCategory,
  enrichViewershipStreamer,
  getPlatformLogo,
} from '../../utils/mediaAssets';

export const signed = (value, digits = 1) => `${value > 0 ? '+' : ''}${Number(value).toFixed(digits)}`;

export const round = (value, digits = 1) => Number(Number(value || 0).toFixed(digits));

export const average = (items, key) => {
  if (!items.length) return 0;
  return items.reduce((sum, item) => sum + Number(item[key] || 0), 0) / items.length;
};

export const sumBy = (items, key) =>
  items.reduce((sum, item) => sum + Number(item[key] || 0), 0);

export const topBy = (items, key, count = 10) =>
  [...items]
    .sort((left, right) => Number(right[key] || 0) - Number(left[key] || 0))
    .slice(0, count);

export const weightedAverage = (items, valueKey, weightKey = 'viewers') => {
  if (!items.length) return 0;

  const totalWeight = sumBy(items, weightKey);
  if (!totalWeight) return average(items, valueKey);

  return (
    items.reduce(
      (sum, item) => sum + Number(item[valueKey] || 0) * Number(item[weightKey] || 0),
      0
    ) / totalWeight
  );
};

export const normalizeViewershipPlatforms = (platforms) => {
  if (!Array.isArray(platforms) || !platforms.length) return VIEWERSHIP_PLATFORM_KEYS;

  const normalized = [...new Set(platforms)].filter((platform) => PLATFORM_META[platform]);
  return normalized.length ? normalized : VIEWERSHIP_PLATFORM_KEYS;
};

export const getPlatformLabel = (platform) =>
  PLATFORM_META[platform]?.label || String(platform || '').toUpperCase();

export const getPlatformColor = (platform) => PLATFORM_META[platform]?.color || '#10b981';

export const getPlatformPageId = (platform) => PLATFORM_META[platform]?.pageId || null;

export const formatPlatformNames = (platforms) =>
  normalizeViewershipPlatforms(platforms)
    .map((platform) => getPlatformLabel(platform))
    .join(' · ');

const collectPlatformStats = (statsByPlatform, selectedPlatforms) =>
  Object.entries(statsByPlatform)
    .filter(([platform]) => selectedPlatforms.includes(platform))
    .map(([platform, values]) => ({ platform, ...values }));

const decorateStreamer = (streamer) => ({
  ...streamer,
  platformLabel: getPlatformLabel(streamer.platform),
  pageId: getPlatformPageId(streamer.platform),
  logoUrl: getPlatformLogo(streamer.platform),
});

export const VIEWERSHIP_DUMMY_STREAMERS = [...STREAMERS, ...NEW_STREAMERS]
  .map(decorateStreamer)
  .map(enrichViewershipStreamer);

export const getViewershipStreamers = (selectedPlatforms = VIEWERSHIP_PLATFORM_KEYS) => {
  const platforms = normalizeViewershipPlatforms(selectedPlatforms);
  return VIEWERSHIP_DUMMY_STREAMERS.filter((streamer) => platforms.includes(streamer.platform));
};

export const findViewershipStreamerById = (personId) =>
  VIEWERSHIP_DUMMY_STREAMERS.find((streamer) => streamer.personId === personId) || null;

const aggregateCategory = (category, selectedPlatforms) => {
  const stats = collectPlatformStats(category.platformStats, selectedPlatforms);
  if (!stats.length) return null;

  return {
    gameId: category.gameId,
    name: category.name,
    platformCodes: stats.map((item) => item.platform),
    platforms: stats.map((item) => getPlatformLabel(item.platform)),
    totalViewers: sumBy(stats, 'viewers'),
    liveChannels: sumBy(stats, 'liveChannels'),
    score: round(weightedAverage(stats, 'score', 'viewers')),
    growth: round(weightedAverage(stats, 'growth', 'viewers')),
    chatDensity: round(weightedAverage(stats, 'chatDensity', 'viewers')),
    logoUrl: getPlatformLogo(stats[0]?.platform),
  };
};

export const getViewershipCategories = (selectedPlatforms = VIEWERSHIP_PLATFORM_KEYS) => {
  const platforms = normalizeViewershipPlatforms(selectedPlatforms);
  return CATEGORY_DEFS.map((category) => aggregateCategory(category, platforms))
    .filter(Boolean)
    .map(enrichViewershipCategory);
};

export const VIEWERSHIP_DUMMY_CATEGORIES = getViewershipCategories();

export const findViewershipCategoryById = (
  gameId,
  selectedPlatforms = VIEWERSHIP_PLATFORM_KEYS
) =>
  getViewershipCategories(selectedPlatforms).find((category) => category.gameId === gameId) || null;

export const getBroadcastGroups = (selectedPlatforms = VIEWERSHIP_PLATFORM_KEYS) =>
  BROADCAST_GROUP_DEFS.map((group) => {
    const stats = collectPlatformStats(group.platformStats, normalizeViewershipPlatforms(selectedPlatforms));
    if (!stats.length) return null;

    return {
      id: group.id,
      name: group.name,
      lead: group.lead,
      pageId: group.pageId,
      platforms: stats.map((item) => getPlatformLabel(item.platform)),
      liveViewers: sumBy(stats, 'viewers'),
      liveChannels: sumBy(stats, 'liveChannels'),
      score: round(weightedAverage(stats, 'score', 'viewers')),
      growth: round(weightedAverage(stats, 'growth', 'viewers')),
      chatDensity: round(weightedAverage(stats, 'chatDensity', 'viewers')),
    };
  }).filter(Boolean);

export const getAudienceSegments = (selectedPlatforms = VIEWERSHIP_PLATFORM_KEYS) =>
  AUDIENCE_SEGMENT_DEFS.map((segment) => {
    const stats = collectPlatformStats(segment.platformStats, normalizeViewershipPlatforms(selectedPlatforms));
    if (!stats.length) return null;

    return {
      id: segment.id,
      name: segment.name,
      subtitle: segment.subtitle,
      score: round(weightedAverage(stats, 'score', 'members')),
      members: sumBy(stats, 'members'),
      delta: round(weightedAverage(stats, 'delta', 'members')),
    };
  }).filter(Boolean);

export const getPlatformSnapshotRows = (selectedPlatforms = VIEWERSHIP_PLATFORM_KEYS) =>
  normalizeViewershipPlatforms(selectedPlatforms)
    .map((platform) => ({
      platform,
      name: getPlatformLabel(platform),
      ...PLATFORM_SNAPSHOT[platform],
    }))
    .filter((item) => item.viewers);

export const getAggregatePlatformSnapshot = (selectedPlatforms = VIEWERSHIP_PLATFORM_KEYS) => {
  const rows = getPlatformSnapshotRows(selectedPlatforms);

  return {
    viewers: sumBy(rows, 'viewers'),
    peakViewers: sumBy(rows, 'peakViewers'),
    liveChannels: sumBy(rows, 'liveChannels'),
    marketScore: round(weightedAverage(rows, 'marketScore', 'viewers')),
    delta: round(weightedAverage(rows, 'delta', 'viewers')),
    chatDensity: round(weightedAverage(rows, 'chatDensity', 'viewers')),
    avgStayMinutes: Math.round(weightedAverage(rows, 'avgStayMinutes', 'viewers')),
  };
};

export const getAggregateDailyTrend = (selectedPlatforms = VIEWERSHIP_PLATFORM_KEYS) =>
  DAILY_PLATFORM_METRICS.map((entry) => {
    const rows = normalizeViewershipPlatforms(selectedPlatforms)
      .map((platform) => ({ platform, ...entry[platform] }))
      .filter((item) => item.viewers);

    return {
      label: entry.label,
      viewers: sumBy(rows, 'viewers'),
      channels: sumBy(rows, 'channels'),
      chats: round(weightedAverage(rows, 'chats', 'viewers')),
      score: round(weightedAverage(rows, 'score', 'viewers')),
      growth: round(weightedAverage(rows, 'growth', 'viewers')),
    };
  });

export const getAggregatePrimeTimeTrend = (selectedPlatforms = VIEWERSHIP_PLATFORM_KEYS) =>
  PRIME_TIME_TREND.map((entry) => {
    const rows = normalizeViewershipPlatforms(selectedPlatforms)
      .map((platform) => ({ platform, ...entry[platform] }))
      .filter((item) => item.viewers);

    return {
      label: entry.label,
      viewers: sumBy(rows, 'viewers'),
      channels: sumBy(rows, 'channels'),
      chats: round(weightedAverage(rows, 'chats', 'viewers')),
    };
  });

export const getPlatformLineTrend = (selectedPlatforms = VIEWERSHIP_PLATFORM_KEYS) =>
  DAILY_PLATFORM_METRICS.map((entry) => {
    const row = { label: entry.label };

    normalizeViewershipPlatforms(selectedPlatforms).forEach((platform) => {
      row[platform] = entry[platform]?.viewers || 0;
    });

    return row;
  });

export const getPlatformSpecificTrend = (platform) =>
  DAILY_PLATFORM_METRICS.map((entry) => ({
    label: entry.label,
    viewers: entry[platform]?.viewers || 0,
    score: entry[platform]?.score || 0,
  }));

export const getPlatformChannelTrend = (platform) =>
  PRIME_TIME_TREND.map((entry) => ({
    label: entry.label,
    channels: entry[platform]?.channels || 0,
    chats: entry[platform]?.chats || 0,
  }));

export const getEventWatchParties = (selectedPlatforms = VIEWERSHIP_PLATFORM_KEYS) =>
  FIRST_STAND_WATCH_PARTIES.filter((party) =>
    normalizeViewershipPlatforms(selectedPlatforms).includes(party.platform)
  ).map((party) => ({ ...party, platformLabel: getPlatformLabel(party.platform) }));

export const buildSyntheticHistory = (items, { valueKey, format = 'score', valueFn }) => {
  const labels = DAILY_PLATFORM_METRICS.map((entry) => entry.label);

  return labels.map((label, dayIndex) => {
    const distance = labels.length - dayIndex - 1;
    const row = { label };

    items.forEach((item, index) => {
      const seed = (index + 1) * 0.35 + ((item.gameId || 0) % 3) * 0.12;
      const currentValue = valueFn ? valueFn(item) : Number(item[valueKey] || 0);

      let historyValue = currentValue;
      if (format === 'viewers') historyValue = currentValue * (1 - distance * 0.026 + index * 0.003);
      else if (format === 'percent') historyValue = currentValue - distance * (0.5 + seed);
      else historyValue = currentValue - distance * (0.55 + seed);

      row[item.seriesKey] = round(Math.max(historyValue, 0), format === 'viewers' ? 0 : 1);
    });

    return row;
  });
};

export {
  FIRST_STAND_MATCHES,
  PLATFORM_META,
  VIEWERSHIP_PLATFORM_KEYS,
  VIEWERSHIP_PLATFORM_OPTIONS,
};
