import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  Gamepad2,
  History,
  MessageSquare,
  Monitor,
  Sparkles,
  Trophy,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  EmptyState,
  EntityCard,
  InsightStrip,
  LogoChip,
  MediaHero,
  MediaRail,
  MetricCard,
  SectionCard,
  StatusBadge,
} from '../shared/studio';
import SensitiveChartTooltip from '../shared/SensitiveChartTooltip';
import SensitiveValue from '../shared/SensitiveValue';
import { formatCompactKo } from '../../utils/formatters';
import {
  findViewershipCategoryById,
  findViewershipStreamerById,
} from './viewershipMockData';
import { getPlatformLogo, normalizeMediaEntity } from '../../utils/mediaAssets';
import './ViewershipPageRenderer.css';

const iconMap = {
  sparkles: Sparkles,
  monitor: Monitor,
  users: Users,
  'message-square': MessageSquare,
  trophy: Trophy,
  gamepad: Gamepad2,
  history: History,
  'trending-up': TrendingUp,
};

const badgeToneMap = {
  LIVE: 'danger',
  NEW: 'default',
  HOT: 'danger',
  TOP: 'default',
  LEAD: 'default',
  UP: 'success',
  V: 'default',
};

const SENSITIVE_FORMATS = new Set([
  'score',
  'viewers',
  'followers',
  'channels',
  'density',
  'percent',
  'delta',
  'delta-rank',
]);

const formatValue = (value, format) => {
  if (value === null || value === undefined) return '-';

  switch (format) {
    case 'score':
      return `${Number(value).toFixed(1)}점`;
    case 'viewers':
      return `${formatCompactKo(value)}명`;
    case 'followers':
      return formatCompactKo(value);
    case 'channels':
      return `${formatCompactKo(value)}개`;
    case 'density':
      return `${Math.round(Number(value))}/100`;
    case 'percent':
      return `${Number(value).toFixed(1)}%`;
    case 'delta':
      return `${Number(value) > 0 ? '+' : ''}${Number(value).toFixed(1)}%`;
    case 'delta-rank':
      return `${Number(value) > 0 ? '▲' : '▼'} ${Math.abs(Number(value))}`;
    default:
      return String(value);
  }
};

const handleAction = (actionType, actionValue, handlers) => {
  if (!actionType || actionValue === undefined || actionValue === null) return;

  if (actionType === 'streamer') handlers.onStreamerSelect?.(actionValue);
  if (actionType === 'category') handlers.onGameSelect?.(actionValue);
  if (actionType === 'page') handlers.onOpenPage?.(actionValue);
};

const getMediaRecord = (item = {}, actionType, actionValue) => {
  if (actionType === 'streamer') {
    return findViewershipStreamerById(actionValue) || item;
  }

  if (actionType === 'category') {
    return findViewershipCategoryById(actionValue) || item;
  }

  return item;
};

const buildMediaPayload = (item = {}, actionType, actionValue) => {
  const record = getMediaRecord(item, actionType, actionValue);
  return normalizeMediaEntity(
    {
      ...record,
      ...item,
      name: item.title || item.name || record?.name,
    },
    {
      gameId: record?.gameId || item.gameId,
      platform: record?.platform || item.platform,
      label: item.title || item.name || record?.name,
    }
  );
};

const renderCell = (column, row) => {
  const value = row[column.key];

  if (column.format === 'entity') {
    return (
      <div className="viewership-renderer__entity">
        <strong>{value}</strong>
        {row.subtitle ? <span>{row.subtitle}</span> : null}
      </div>
    );
  }

  if (column.format === 'platform') {
    return <span className="viewership-renderer__platform-pill">{String(value).toUpperCase()}</span>;
  }

  if (column.format === 'platform-list') {
    return (
      <div className="viewership-renderer__platform-list">
        {(value || []).map((platform) => (
          <LogoChip key={platform} logoUrl={getPlatformLogo(platform)} label={platform.toUpperCase()} subtle />
        ))}
      </div>
    );
  }

  if (column.format === 'badge') {
    return <StatusBadge tone={badgeToneMap[value] || 'default'}>{value}</StatusBadge>;
  }

  if (column.format === 'delta' || column.format === 'delta-rank') {
    const numericValue = Number(value || 0);
    return (
      <span className={`viewership-renderer__delta ${numericValue >= 0 ? 'is-positive' : 'is-negative'}`}>
        <SensitiveValue>{formatValue(numericValue, column.format)}</SensitiveValue>
      </span>
    );
  }

  if (column.format === 'plain') return value;

  if (SENSITIVE_FORMATS.has(column.format)) {
    return <SensitiveValue>{formatValue(value, column.format)}</SensitiveValue>;
  }

  return formatValue(value, column.format);
};

const ChartCard = ({ chart }) => {
  const ChartComponent =
    chart.type === 'bar' ? BarChart : chart.type === 'area' ? AreaChart : LineChart;

  const renderSeries = () => {
    if (chart.type === 'bar') {
      return chart.series.map((series) => (
        <Bar key={series.key} dataKey={series.key} fill={series.color} radius={[8, 8, 0, 0]} />
      ));
    }

    if (chart.type === 'area') {
      return chart.series.map((series) => (
        <Area
          key={series.key}
          type="monotone"
          dataKey={series.key}
          stroke={series.color}
          fill={series.color}
          fillOpacity={0.16}
          strokeWidth={2}
        />
      ));
    }

    return chart.series.map((series) => (
      <Line
        key={series.key}
        type="monotone"
        dataKey={series.key}
        stroke={series.color}
        strokeWidth={2.4}
        dot={false}
      />
    ));
  };

  return (
    <SectionCard
      accent="emerald"
      title={chart.title}
      description={chart.description}
      className="viewership-renderer__chart-card"
    >
      <ResponsiveContainer width="100%" height={280}>
        <ChartComponent data={chart.data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
          <XAxis dataKey={chart.xKey || 'label'} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
          <YAxis
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            tickFormatter={(value) => formatCompactKo(value)}
          />
          <Tooltip
            content={(tooltipProps) => (
              <SensitiveChartTooltip
                {...tooltipProps}
                valueFormatter={(value, _name, entry) => {
                  const current = chart.series.find((series) => series.key === entry.dataKey);
                  return formatValue(value, current?.format);
                }}
              />
            )}
          />
          <Legend formatter={(value) => chart.series.find((series) => series.key === value)?.label || value} />
          {renderSeries()}
        </ChartComponent>
      </ResponsiveContainer>
    </SectionCard>
  );
};

const TableSection = ({ table, handlers }) => (
  <SectionCard accent="emerald" title={table.title} description={table.description}>
    <div className="viewership-renderer__table">
      <div
        className="viewership-renderer__table-header"
        style={{ gridTemplateColumns: `repeat(${table.columns.length}, minmax(0, 1fr))` }}
      >
        {table.columns.map((column) => (
          <span key={column.key}>{column.label}</span>
        ))}
      </div>
      <div className="viewership-renderer__table-body">
        {table.rows.map((row, index) => {
          const actionValue = row.personId || row.gameId || row.pageId;
          const clickable = Boolean(table.actionType && actionValue);

          return (
            <button
              key={`${table.id}-${index}`}
              type="button"
              className={`viewership-renderer__table-row ${clickable ? 'is-clickable' : ''}`}
              style={{ gridTemplateColumns: `repeat(${table.columns.length}, minmax(0, 1fr))` }}
              onClick={() => clickable && handleAction(table.actionType, actionValue, handlers)}
            >
              {table.columns.map((column) => (
                <span key={`${table.id}-${index}-${column.key}`}>{renderCell(column, row)}</span>
              ))}
            </button>
          );
        })}
      </div>
    </div>
  </SectionCard>
);

const SpotlightRail = ({ page, handlers }) => {
  const items =
    page.scoreboard?.map((item) => ({
      ...item,
      actionValue: item.actionValue,
      actionType: item.actionType,
    })) ||
    [];

  if (!items.length) return null;

  return (
    <MediaRail
      title="바로 보기"
      description="상위 스트리머와 카테고리를 카드 중심으로 먼저 확인하고 아래 표에서 세부 정보를 이어서 볼 수 있습니다."
    >
      {items.map((item) => {
        const media = buildMediaPayload(item, item.actionType, item.actionValue);

        return (
          <EntityCard
            key={`${page.id}-${item.title}`}
            accent="emerald"
            eyebrow={media.kicker || 'Spotlight'}
            title={item.title}
            description={item.meta}
            avatarUrl={media.avatarUrl}
            coverUrl={media.imageUrl || media.thumbnailUrl}
            logoUrl={media.logoUrl}
            badge={item.badge}
            stats={[
              { label: '지표', value: formatValue(item.value, item.format), sensitive: true },
            ]}
            onClick={() => handleAction(item.actionType, item.actionValue, handlers)}
          />
        );
      })}
    </MediaRail>
  );
};

const ContentSections = ({ page, handlers }) => (
  <>
    <SpotlightRail page={page} handlers={handlers} />
    <div className="viewership-renderer__content-grid">
      <div className="viewership-renderer__chart-grid">
        {page.chartSeries?.map((chart) => (
          <ChartCard key={chart.id} chart={chart} />
        ))}
      </div>
      <div className="viewership-renderer__side-grid">
        <SectionCard
          accent="emerald"
          title="핵심 인사이트"
          description="지금 페이지에서 먼저 읽어야 할 흐름만 짧은 스트립으로 정리했습니다."
        >
          <InsightStrip items={page.highlights || []} />
        </SectionCard>
      </div>
    </div>
    {page.tableRows?.map((table) => (
      <TableSection key={table.id} table={table} handlers={handlers} />
    ))}
  </>
);

const SummaryGrid = ({ summaryCards }) => (
  <section className="viewership-renderer__metric-grid">
    {summaryCards?.map((card) => {
      const Icon = iconMap[card.icon] || Activity;

      return (
        <MetricCard
          key={card.label}
          accent="emerald"
          tone={card.tone || 'default'}
          label={card.label}
          value={formatValue(card.value, card.format)}
          meta={card.meta}
          sensitiveValue
          sensitiveMeta={/\d/.test(String(card.meta || ''))}
          icon={<Icon size={18} />}
        />
      );
    })}
  </section>
);

const buildHeroMedia = (page) => {
  const firstSpotlight = page.scoreboard?.[0];
  if (firstSpotlight) {
    return {
      ...buildMediaPayload(firstSpotlight, firstSpotlight.actionType, firstSpotlight.actionValue),
      badge: firstSpotlight.badge || 'Live',
      aspect: 'portrait',
    };
  }

  const firstRow = page.tableRows?.[0]?.rows?.[0];
  if (firstRow) {
    const actionValue = firstRow.personId || firstRow.gameId || firstRow.pageId;
    const actionType = firstRow.personId ? 'streamer' : firstRow.gameId ? 'category' : 'page';
    return {
      ...buildMediaPayload(firstRow, actionType, actionValue),
      badge: page.hero?.badges?.[0]?.label || 'Insight',
      aspect: 'portrait',
    };
  }

  return {
    imageUrl:
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
    badge: 'Insight',
    aspect: 'portrait',
  };
};

const ViewershipPageRenderer = ({ page, onGameSelect, onOpenPage, onStreamerSelect }) => {
  const handlers = { onGameSelect, onOpenPage, onStreamerSelect };

  if (!page) {
    return (
      <EmptyState
        icon={<Monitor size={24} />}
        title="페이지 구성을 찾지 못했습니다"
        description="왼쪽 메뉴에서 다른 항목을 선택하면 준비된 인사이트 화면으로 이동합니다."
      />
    );
  }

  const heroMedia = buildHeroMedia(page);

  if (page.emptyState) {
    return (
      <div className={`viewership-renderer viewership-renderer--${page.pageType}`}>
        <MediaHero
          accent="emerald"
          eyebrow={
            <>
              <StatusBadge className="studio-accent--emerald">{page.hero.eyebrow}</StatusBadge>
              {(page.hero.badges || []).map((badge) => (
                <StatusBadge key={badge.label} tone={badge.tone || badgeToneMap[badge.label] || 'default'}>
                  {badge.label}
                </StatusBadge>
              ))}
            </>
          }
          title={page.hero.title}
          description={page.hero.description}
          media={heroMedia}
          stats={(page.hero.aside || []).map((item) => ({
            label: item.label,
            value: item.value,
            sensitive: true,
          }))}
        />
        <EmptyState icon={<Monitor size={24} />} title={page.emptyState.title} description={page.emptyState.description} />
      </div>
    );
  }

  return (
    <div className={`viewership-renderer viewership-renderer--${page.pageType}`}>
      <MediaHero
        accent="emerald"
        eyebrow={
          <>
            <StatusBadge className="studio-accent--emerald">{page.hero.eyebrow}</StatusBadge>
            {(page.hero.badges || []).map((badge) => (
              <StatusBadge key={badge.label} tone={badge.tone || badgeToneMap[badge.label] || 'default'}>
                {badge.label}
              </StatusBadge>
            ))}
          </>
        }
        title={page.hero.title}
        description={page.hero.description}
        media={heroMedia}
        stats={(page.hero.aside || []).map((item) => ({
          label: item.label,
          value: item.value,
          sensitive: true,
        }))}
        overlay={
          <div className="viewership-renderer__hero-overlay">
            <strong>탐색 포인트</strong>
            <div className="viewership-renderer__hero-logos">
              {(page.tableRows?.[0]?.rows?.[0]?.platforms || []).slice(0, 4).map((platform) => (
                <LogoChip key={platform} logoUrl={getPlatformLogo(platform)} label={platform.toUpperCase()} />
              ))}
            </div>
          </div>
        }
      />

      <SummaryGrid summaryCards={page.summaryCards} />
      <ContentSections page={page} handlers={handlers} />
    </div>
  );
};

export default ViewershipPageRenderer;
