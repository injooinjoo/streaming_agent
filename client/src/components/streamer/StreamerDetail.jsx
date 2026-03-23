import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  Clock,
  Crown,
  Eye,
  Monitor,
  Play,
  RefreshCw,
  Tag,
  Trophy,
  User,
  Users,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { API_URL, mockFetch } from '../../config/api';
import { formatCompactKo, formatCurrency, formatFullNumber } from '../../utils/formatters';
import {
  EmptyState,
  EntityCard,
  FilterBar,
  LogoChip,
  MediaHero,
  MediaRail,
  MetricCard,
  PosterCard,
  SectionCard,
  StatusBadge,
  StickyActionDock,
} from '../shared/studio';
import { getPlatformLogo, normalizeMediaEntity } from '../../utils/mediaAssets';
import './StreamerDetail.css';

const PIE_COLORS = ['#355c7d', '#2a9d8f', '#d4a34b', '#d64933', '#5b6cfa', '#08bdbd'];
const CHART_TOOLTIP_STYLE = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border-light)',
  borderRadius: 16,
};

const FALLBACK_PROFILE = {
  person: {
    id: 'p1',
    nickname: '게임하는하루',
    platform: 'soop',
    profile_image_url:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=320&q=80',
    channel_id: 'sample_channel_123',
  },
  live: {
    title: '메이플 주간 성장 루트 정리 방송',
    started_at: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(),
    current_viewer_count: 6420,
    peak_viewer_count: 9140,
    thumbnail_url:
      'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
  },
  stats: {
    all_time_peak: 15800,
    overall_avg: 5200,
    total_minutes: 52560,
    total_broadcasts: 245,
    last_broadcast_at: '2026-03-15T20:30:00Z',
  },
  eventStats: {
    total_donation_amount: 12500000,
    total_donation_count: 458,
  },
  categories: [
    { category_name: '메이플스토리', broadcast_count: 120, total_minutes: 21600, peak_viewers: 15800, avg_viewers: 5500 },
    { category_name: 'FC 온라인', broadcast_count: 65, total_minutes: 11700, peak_viewers: 8200, avg_viewers: 4200 },
    { category_name: '저스트 채팅', broadcast_count: 40, total_minutes: 7200, peak_viewers: 12000, avg_viewers: 6500 },
    { category_name: '발로란트', broadcast_count: 20, total_minutes: 3600, peak_viewers: 6800, avg_viewers: 3800 },
  ],
  recentBroadcasts: [
    {
      id: 'b1',
      title: '메이플 신규 보스 준비 루트',
      started_at: '2026-03-15T18:00:00Z',
      duration_minutes: 300,
      peak_viewer_count: 8500,
      avg_viewer_count: 6200,
      category_name: '메이플스토리',
      thumbnail_url:
        'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=900&q=80',
    },
    {
      id: 'b2',
      title: 'FC 온라인 랭크 복귀전',
      started_at: '2026-03-14T19:00:00Z',
      duration_minutes: 240,
      peak_viewer_count: 5200,
      avg_viewer_count: 4100,
      category_name: 'FC 온라인',
      thumbnail_url:
        'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=900&q=80',
    },
    {
      id: 'b3',
      title: '시청자와 작업실 토크',
      started_at: '2026-03-13T20:00:00Z',
      duration_minutes: 180,
      peak_viewer_count: 9800,
      avg_viewer_count: 6900,
      category_name: '저스트 채팅',
      thumbnail_url:
        'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80',
    },
  ],
};

const buildStatsFallback = (period) =>
  period === '30d'
    ? [
        { date: '2026-02-25', peak_viewers: 10200, avg_viewers: 6800, broadcast_count: 4, total_minutes: 640 },
        { date: '2026-03-01', peak_viewers: 7600, avg_viewers: 4900, broadcast_count: 2, total_minutes: 290 },
        { date: '2026-03-05', peak_viewers: 11200, avg_viewers: 7200, broadcast_count: 3, total_minutes: 470 },
        { date: '2026-03-09', peak_viewers: 12400, avg_viewers: 7800, broadcast_count: 3, total_minutes: 510 },
        { date: '2026-03-12', peak_viewers: 8900, avg_viewers: 5600, broadcast_count: 2, total_minutes: 300 },
        { date: '2026-03-14', peak_viewers: 5200, avg_viewers: 4100, broadcast_count: 1, total_minutes: 240 },
        { date: '2026-03-15', peak_viewers: 8500, avg_viewers: 6200, broadcast_count: 1, total_minutes: 300 },
      ]
    : [
        { date: '2026-03-09', peak_viewers: 5200, avg_viewers: 3900, broadcast_count: 1, total_minutes: 180 },
        { date: '2026-03-11', peak_viewers: 6900, avg_viewers: 4700, broadcast_count: 1, total_minutes: 240 },
        { date: '2026-03-12', peak_viewers: 9100, avg_viewers: 6200, broadcast_count: 1, total_minutes: 300 },
        { date: '2026-03-13', peak_viewers: 9800, avg_viewers: 6900, broadcast_count: 1, total_minutes: 180 },
        { date: '2026-03-14', peak_viewers: 5200, avg_viewers: 4100, broadcast_count: 1, total_minutes: 240 },
        { date: '2026-03-15', peak_viewers: 8500, avg_viewers: 6200, broadcast_count: 1, total_minutes: 300 },
      ];

const buildRankingFallback = (period) => ({
  peakRank: period === '30d' ? 41 : 28,
  avgRank: period === '30d' ? 58 : 36,
  viewershipRank: period === '30d' ? 47 : 31,
  totalStreamers: 1820,
  myStats: {
    peakViewers: period === '30d' ? 12400 : 9800,
    avgViewers: period === '30d' ? 6300 : 5400,
    viewership: period === '30d' ? 4700000 : 1440000,
  },
});

const formatMinutes = (minutes) => {
  if (!minutes) return '0시간';
  const hours = Math.floor(minutes / 60);
  const remain = Math.round(minutes % 60);
  return hours > 0 ? `${hours}시간 ${remain}분` : `${remain}분`;
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes()
  ).padStart(2, '0')}`;
};

const formatDateShort = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

const getElapsedTime = (startedAt) => {
  if (!startedAt) return '-';
  const elapsed = Date.now() - new Date(startedAt).getTime();
  const hours = Math.floor(elapsed / 3600000);
  const minutes = Math.floor((elapsed % 3600000) / 60000);
  return `${hours}시간 ${minutes}분`;
};

const fetchWithFallback = async (url, fallbackValue) => {
  try {
    const response = await mockFetch(url);
    const json = await response.json();
    if (json?.success && json.data) return json.data;
  } catch (error) {
    console.error('Failed to fetch streamer detail data:', error);
  }
  return fallbackValue;
};

const PeriodTabs = ({ period, onChange }) => (
  <div className="streamer-period-tabs">
    {['7d', '30d'].map((item) => (
      <button key={item} type="button" className={period === item ? 'active' : ''} onClick={() => onChange(item)}>
        {item === '7d' ? '최근 7일' : '최근 30일'}
      </button>
    ))}
  </div>
);

const SummaryTab = ({ profile, platform, onSelectBroadcast }) => (
  <div className="streamer-detail__summary-grid">
    <SectionCard accent="emerald" title="카테고리 분포" description="대표 카테고리를 비중 중심으로 요약했습니다.">
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie data={profile.categories || []} dataKey="total_minutes" nameKey="category_name" outerRadius={104} innerRadius={56} labelLine={false}>
            {(profile.categories || []).map((_, index) => <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value) => formatMinutes(value)} />
        </PieChart>
      </ResponsiveContainer>
    </SectionCard>
    <SectionCard accent="emerald" title="상위 카테고리 카드" description="대표 카테고리를 이미지 카드로 다시 구성했습니다.">
      <div className="streamer-detail__category-grid">
        {(profile.categories || []).slice(0, 3).map((category) => {
          const media = normalizeMediaEntity(category, { label: category.category_name });
          return (
            <EntityCard
              key={category.category_name}
              accent="emerald"
              eyebrow={media.kicker || 'Category'}
              title={category.category_name}
              description={`${category.broadcast_count}회 · ${formatMinutes(category.total_minutes)}`}
              coverUrl={media.imageUrl}
              avatarUrl={media.imageUrl}
              logoUrl={media.logoUrl}
              badge="Top Pick"
              stats={[
                { label: '피크', value: `${formatCompactKo(category.peak_viewers || 0)}명`, sensitive: true },
                { label: '평균', value: `${formatCompactKo(category.avg_viewers || 0)}명`, sensitive: true },
              ]}
            />
          );
        })}
      </div>
    </SectionCard>
    <MediaRail title="최근 방송 아트" description="최근 방송을 썸네일 카드로 바로 탐색할 수 있게 정리했습니다.">
      {(profile.recentBroadcasts || []).map((broadcast) => {
        const media = normalizeMediaEntity(
          {
            ...broadcast,
            category_name:
              broadcast.category_name ||
              broadcast.categories ||
              profile.categories?.[0]?.category_name,
          },
          {
            imageUrl: broadcast.thumbnail_url,
            platform,
            label: broadcast.title,
            gameId: broadcast.category_name || broadcast.categories || profile.categories?.[0]?.category_name,
          }
        );
        return (
          <PosterCard
            key={broadcast.id}
            accent="emerald"
            eyebrow={broadcast.category_name || 'Broadcast'}
            title={broadcast.title || '제목 없음'}
            description={`${formatDate(broadcast.started_at)} · ${formatMinutes(broadcast.duration_minutes)}`}
            imageUrl={media.imageUrl}
            logoUrl={media.logoUrl}
            badge={`${formatCompactKo(broadcast.peak_viewer_count || 0)}명 피크`}
            stats={[
              { label: '평균', value: `${formatCompactKo(broadcast.avg_viewer_count || 0)}명`, sensitive: true },
              { label: '카테고리', value: broadcast.category_name || '-' },
            ]}
            action={<button type="button" className="btn btn-outline" onClick={() => onSelectBroadcast(broadcast.id)}>세그먼트 보기</button>}
          />
        );
      })}
    </MediaRail>
  </div>
);

const StatsTab = ({ personId }) => {
  const [period, setPeriod] = useState('7d');
  const [data, setData] = useState([]);
  useEffect(() => {
    fetchWithFallback(`${API_URL}/api/streamer/${personId}/stats?period=${period}`, buildStatsFallback(period)).then(setData);
  }, [period, personId]);
  if (!data.length) return <EmptyState icon={<BarChart3 size={20} />} title="성과 데이터가 없습니다" />;
  const totalMinutes = data.reduce((sum, item) => sum + Number(item.total_minutes || 0), 0);
  const peak = Math.max(...data.map((item) => Number(item.peak_viewers || 0)));
  const avg = Math.round(data.reduce((sum, item) => sum + Number(item.avg_viewers || 0), 0) / data.length);
  return (
    <>
      <PeriodTabs period={period} onChange={setPeriod} />
      <div className="streamer-detail__metric-grid streamer-detail__metric-grid--compact">
        <MetricCard accent="emerald" label="방송 수" value={`${data.reduce((sum, item) => sum + Number(item.broadcast_count || 0), 0)}회`} icon={<Monitor size={18} />} />
        <MetricCard accent="emerald" label="누적 시간" value={formatMinutes(totalMinutes)} icon={<Clock size={18} />} />
        <MetricCard accent="emerald" label="최고 시청" value={`${formatCompactKo(peak)}명`} icon={<Crown size={18} />} sensitiveValue />
        <MetricCard accent="emerald" label="평균 시청" value={`${formatCompactKo(avg)}명`} icon={<Users size={18} />} sensitiveValue />
      </div>
      <SectionCard accent="emerald" title="일자별 성과 추이" description="최고 시청과 평균 시청 흐름을 같은 차트에서 비교합니다.">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
            <XAxis dataKey="date" tickFormatter={formatDateShort} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
            <YAxis tickFormatter={(value) => formatCompactKo(value)} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value, name) => [formatFullNumber(value), name === 'peak_viewers' ? '최고 시청' : '평균 시청']} />
            <Legend formatter={(value) => (value === 'peak_viewers' ? '최고 시청' : '평균 시청')} />
            <Bar dataKey="peak_viewers" fill="#d4a34b" radius={[6, 6, 0, 0]} />
            <Bar dataKey="avg_viewers" fill="#355c7d" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </SectionCard>
    </>
  );
};

const CategoriesTab = ({ personId }) => {
  const [period, setPeriod] = useState('7d');
  const [data, setData] = useState([]);
  useEffect(() => {
    fetchWithFallback(`${API_URL}/api/streamer/${personId}/categories?period=${period}`, FALLBACK_PROFILE.categories).then(setData);
  }, [period, personId]);
  if (!data.length) return <EmptyState icon={<Tag size={20} />} title="카테고리 데이터가 없습니다" />;
  return (
    <>
      <PeriodTabs period={period} onChange={setPeriod} />
      <div className="streamer-detail__category-grid streamer-detail__category-grid--wide">
        {data.slice(0, 4).map((category) => {
          const media = normalizeMediaEntity(category, { label: category.category_name });
          return (
            <EntityCard
              key={category.category_name}
              accent="emerald"
              eyebrow={media.kicker || 'Category'}
              title={category.category_name}
              description={`${category.broadcast_count}회 · ${formatMinutes(category.total_minutes)}`}
              coverUrl={media.imageUrl}
              avatarUrl={media.imageUrl}
              badge="Focus"
              stats={[
                { label: '피크', value: `${formatCompactKo(category.peak_viewers || 0)}명`, sensitive: true },
                { label: '평균', value: `${formatCompactKo(category.avg_viewers || 0)}명`, sensitive: true },
              ]}
            />
          );
        })}
      </div>
    </>
  );
};

const RankingTab = ({ personId }) => {
  const [period, setPeriod] = useState('7d');
  const [data, setData] = useState(null);
  useEffect(() => {
    fetchWithFallback(`${API_URL}/api/streamer/${personId}/ranking?period=${period}`, buildRankingFallback(period)).then(setData);
  }, [period, personId]);
  if (!data) return <EmptyState icon={<Trophy size={20} />} title="랭킹 데이터가 없습니다" />;
  return (
    <>
      <PeriodTabs period={period} onChange={setPeriod} />
      <section className="streamer-detail__ranking-grid">
        {[
          { label: '최고 시청 순위', value: data.peakRank, icon: <Crown size={20} /> },
          { label: '평균 시청 순위', value: data.avgRank, icon: <Users size={20} /> },
          { label: '뷰어십 순위', value: data.viewershipRank, icon: <BarChart3 size={20} /> },
        ].map((item) => (
          <article key={item.label} className="streamer-detail__ranking-card">
            <div className="streamer-detail__ranking-icon">{item.icon}</div>
            <strong>#{item.value || '-'}</strong>
            <span>{item.label}</span>
            <p>전체 {formatFullNumber(data.totalStreamers || 0)}명 기준</p>
          </article>
        ))}
      </section>
    </>
  );
};

const SegmentsTab = ({ profile, selectedBroadcastId, platform }) => {
  const broadcast = (profile.recentBroadcasts || []).find((item) => String(item.id) === String(selectedBroadcastId)) || profile.recentBroadcasts?.[0];
  const chartData = [
    { time: '18:00', viewers: 4100 },
    { time: '18:30', viewers: 5200 },
    { time: '19:00', viewers: 6800 },
    { time: '19:30', viewers: 8500 },
    { time: '20:00', viewers: 7400 },
    { time: '20:30', viewers: 6200 },
  ];
  const segments = [
    { title: broadcast?.category_name || '오프닝 토크', peak: 6200, avg: 5100 },
    { title: broadcast?.category_name || '대표 카테고리', peak: 8500, avg: 7200 },
    { title: '마무리 Q&A', peak: 7400, avg: 6400 },
  ];
  if (!broadcast) return <EmptyState icon={<Play size={20} />} title="세그먼트 데이터가 없습니다" />;
  return (
    <>
      <SectionCard accent="emerald" title={broadcast.title} description={`${formatDate(broadcast.started_at)} · ${formatMinutes(broadcast.duration_minutes)}`}>
        <div className="streamer-detail__segment-hero-meta">
          <span>피크 {formatCompactKo(broadcast.peak_viewer_count || 0)}명</span>
          <span>평균 {formatCompactKo(broadcast.avg_viewer_count || 0)}명</span>
        </div>
      </SectionCard>
      <SectionCard accent="emerald" title="시청 흐름" description="선택한 방송의 시청자 흐름을 구간별로 보여줍니다.">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="streamerViewers" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2a9d8f" stopOpacity={0.32} />
                <stop offset="95%" stopColor="#2a9d8f" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
            <XAxis dataKey="time" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
            <YAxis tickFormatter={(value) => formatCompactKo(value)} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value) => `${formatFullNumber(value)}명`} />
            <Area type="monotone" dataKey="viewers" stroke="#2a9d8f" fill="url(#streamerViewers)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </SectionCard>
      <div className="streamer-detail__segment-grid">
        {segments.map((segment, index) => {
          const media = normalizeMediaEntity({ category_name: segment.title }, { label: segment.title, platform });
          return (
            <EntityCard
              key={`${segment.title}-${index}`}
              accent="emerald"
              eyebrow={`Segment ${index + 1}`}
              title={segment.title}
              description="구간별 반응 요약"
              coverUrl={media.imageUrl}
              avatarUrl={media.imageUrl}
              badge="Viewer Flow"
              stats={[
                { label: '피크', value: `${formatCompactKo(segment.peak)}명`, sensitive: true },
                { label: '평균', value: `${formatCompactKo(segment.avg)}명`, sensitive: true },
              ]}
            />
          );
        })}
      </div>
    </>
  );
};

const StreamerDetail = ({ personId: propPersonId, onBack }) => {
  const params = useParams();
  const navigate = useNavigate();
  const personId = propPersonId || params.personId;
  const isEmbedded = Boolean(propPersonId);
  const [activeTab, setActiveTab] = useState('summary');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedBroadcastId, setSelectedBroadcastId] = useState(null);

  useEffect(() => {
    fetchWithFallback(`${API_URL}/api/streamer/${personId}`, FALLBACK_PROFILE).then((data) => {
      setProfile(data || FALLBACK_PROFILE);
      setSelectedBroadcastId((data?.recentBroadcasts || FALLBACK_PROFILE.recentBroadcasts)[0]?.id);
      setLoading(false);
    });
  }, [personId]);

  const handleBack = () => {
    if (isEmbedded && onBack) return onBack();
    return navigate(-1);
  };

  const profileMedia = useMemo(
    () =>
      profile
        ? normalizeMediaEntity(
            {
              ...profile.person,
              ...profile.live,
              imageUrl: profile.live?.thumbnail_url || profile.recentBroadcasts?.[0]?.thumbnail_url,
            },
            {
              platform: profile.person?.platform,
              avatarUrl: profile.person?.profile_image_url,
              label: profile.person?.nickname,
              gameId: profile.categories?.[0]?.category_name,
            }
          )
        : null,
    [profile]
  );

  if (loading) {
    return <div className="streamer-detail streamer-detail--studio"><EmptyState icon={<RefreshCw size={24} className="spinning" />} title="스트리머 정보를 불러오는 중입니다" description="프로필과 최근 방송 데이터를 준비하고 있습니다." /></div>;
  }

  if (!profile) {
    return <div className="streamer-detail streamer-detail--studio"><EmptyState icon={<Users size={28} />} title="스트리머 정보를 찾을 수 없습니다" description="요청한 대상이 삭제되었거나 아직 수집된 데이터가 없습니다." action={<button className="btn btn-outline" onClick={handleBack}>돌아가기</button>} /></div>;
  }

  const platformLogo = getPlatformLogo(profile.person?.platform);
  const tabs = [
    { key: 'summary', label: '요약', icon: <User size={15} /> },
    { key: 'stats', label: '성과', icon: <BarChart3 size={15} /> },
    { key: 'categories', label: '카테고리', icon: <Tag size={15} /> },
    { key: 'ranking', label: '랭킹', icon: <Trophy size={15} /> },
    { key: 'segments', label: '세그먼트', icon: <Play size={15} /> },
  ];

  return (
    <div className="streamer-detail streamer-detail--studio">
      {!isEmbedded ? <button className="streamer-detail-back" onClick={handleBack}><ArrowLeft size={16} />돌아가기</button> : null}

      <MediaHero
        accent="emerald"
        eyebrow={<><StatusBadge className="studio-accent--emerald" icon={<Monitor size={14} />}>Streamer Profile</StatusBadge>{platformLogo ? <LogoChip logoUrl={platformLogo} label={(profile.person?.platform || 'unknown').toUpperCase()} /> : null}{profile.live ? <StatusBadge tone="danger">LIVE</StatusBadge> : null}</>}
        title={profile.person?.nickname || '이름 없는 스트리머'}
        description={`${profile.person?.nickname || '스트리머'}의 최근 방송, 카테고리, 누적 성과를 미디어 우선 구조로 다시 정리했습니다.`}
        media={{ imageUrl: profileMedia?.imageUrl, logoUrl: profileMedia?.logoUrl, label: profile.person?.nickname || 'Streamer', badge: profile.live ? 'LIVE NOW' : 'Archive', aspect: 'portrait' }}
        stats={[
          { label: '플랫폼', value: (profile.person?.platform || 'unknown').toUpperCase() },
          { label: '마지막 방송', value: formatDate(profile.stats?.last_broadcast_at) },
          { label: '누적 방송', value: `${profile.stats?.total_broadcasts || 0}회` },
        ]}
        actions={<>{profile.person?.channel_id ? <button className="btn btn-primary" onClick={() => navigate(`/channel/${profile.person.channel_id}`)}>채널 보기</button> : null}<button className="btn btn-outline" onClick={handleBack}>이전 화면</button></>}
        insights={[
          { kicker: 'Current', title: profile.live ? '라이브가 유지되는 대표 채널' : '최근 방송 기준 프로필', body: profile.live ? `${getElapsedTime(profile.live.started_at)} 동안 라이브가 이어지고 있습니다.` : '최근 방송과 카테고리 흐름을 중심으로 정리했습니다.' },
          { kicker: 'Focus', title: `${profile.categories?.[0]?.category_name || '대표 카테고리'} 비중이 가장 큽니다`, body: '반복되는 카테고리와 최근 편성을 카드 구조로 묶었습니다.' },
        ]}
        overlay={<div className="streamer-detail__hero-overlay"><div className="streamer-detail__identity"><div className="streamer-detail__avatar">{profile.person?.profile_image_url ? <img src={profile.person.profile_image_url} alt={profile.person.nickname} /> : <span>{(profile.person?.nickname || 'S').charAt(0)}</span>}{platformLogo ? <img src={platformLogo} alt={profile.person?.platform} className="streamer-detail__platform-badge" /> : null}</div><div className="streamer-detail__identity-copy"><div className="streamer-detail__identity-heading"><h2>{profile.person?.nickname || '이름 없는 스트리머'}</h2>{profile.live ? <StatusBadge tone="danger">LIVE</StatusBadge> : null}</div><div className="streamer-detail__identity-meta"><span><Calendar size={14} />최근 방송 {formatDate(profile.stats?.last_broadcast_at)}</span><span><Monitor size={14} />{(profile.person?.platform || 'unknown').toUpperCase()}</span></div></div></div>{profile.live ? <div className="streamer-detail__live-card"><div><strong>{profile.live.title}</strong><p>{getElapsedTime(profile.live.started_at)} 동안 진행 중</p></div><div className="streamer-detail__live-stats"><span><Eye size={14} />현재 {formatCompactKo(profile.live.current_viewer_count)}명</span><span><Crown size={14} />최고 {formatCompactKo(profile.live.peak_viewer_count)}명</span></div></div> : null}</div>}
      />

      <section className="streamer-detail__metric-grid">
        <MetricCard accent="emerald" tone="audience" label="역대 최고 시청" value={`${formatCompactKo(profile.stats?.all_time_peak || 0)}명`} meta="전체 방송 기준" sensitiveValue icon={<Crown size={18} />} />
        <MetricCard accent="emerald" tone="growth" label="평균 시청" value={`${formatCompactKo(profile.stats?.overall_avg || 0)}명`} meta="누적 평균" sensitiveValue icon={<Users size={18} />} />
        <MetricCard accent="emerald" tone="activity" label="누적 방송 시간" value={formatMinutes(profile.stats?.total_minutes || 0)} meta={`${profile.stats?.total_broadcasts || 0}회 방송`} sensitiveValue sensitiveMeta icon={<Clock size={18} />} />
        <MetricCard accent="emerald" tone="revenue" label="누적 후원 금액" value={formatCurrency(profile.eventStats?.total_donation_amount || 0)} meta={`${formatFullNumber(profile.eventStats?.total_donation_count || 0)}회 후원`} sensitiveValue sensitiveMeta icon={<Trophy size={18} />} />
      </section>

      <MediaRail title="대표 방송 카드" description="최근 방송을 카드로 먼저 보여주고, 세그먼트 분석은 탭에서 이어서 확인할 수 있게 만들었습니다.">
        {(profile.recentBroadcasts || []).slice(0, 3).map((broadcast) => {
          const media = normalizeMediaEntity(
            {
              ...broadcast,
              category_name:
                broadcast.category_name ||
                broadcast.categories ||
                profile.categories?.[0]?.category_name,
            },
            {
              imageUrl: broadcast.thumbnail_url,
              platform: profile.person?.platform,
              label: broadcast.title,
              gameId: broadcast.category_name || broadcast.categories || profile.categories?.[0]?.category_name,
            }
          );
          return <PosterCard key={broadcast.id} accent="emerald" eyebrow={broadcast.category_name || 'Broadcast'} title={broadcast.title || '제목 없음'} description={`${formatDate(broadcast.started_at)} · ${formatMinutes(broadcast.duration_minutes)}`} imageUrl={media.imageUrl} logoUrl={media.logoUrl} badge={broadcast.id === selectedBroadcastId ? 'Selected' : 'Recent'} stats={[{ label: '피크', value: `${formatCompactKo(broadcast.peak_viewer_count || 0)}명`, sensitive: true }, { label: '평균', value: `${formatCompactKo(broadcast.avg_viewer_count || 0)}명`, sensitive: true }]} action={<button type="button" className="btn btn-outline" onClick={() => { setSelectedBroadcastId(broadcast.id); setActiveTab('segments'); }}>세그먼트 보기</button>} />;
        })}
      </MediaRail>

      <FilterBar className="streamer-detail__tab-filter" leading={<StatusBadge className="studio-accent--emerald">분석 탭</StatusBadge>} trailing={profile.live ? <StatusBadge tone="danger">실시간 데이터 연결</StatusBadge> : null}>
        <div className="streamer-detail-tabs">
          {tabs.map((tab) => <button key={tab.key} type="button" className={activeTab === tab.key ? 'streamer-detail-tab active' : 'streamer-detail-tab'} onClick={() => setActiveTab(tab.key)}>{tab.icon}{tab.label}</button>)}
        </div>
      </FilterBar>

      <div className="streamer-detail__content">
        {activeTab === 'summary' ? <SummaryTab profile={profile} platform={profile.person?.platform} onSelectBroadcast={(id) => { setSelectedBroadcastId(id); setActiveTab('segments'); }} /> : null}
        {activeTab === 'stats' ? <StatsTab personId={personId} /> : null}
        {activeTab === 'categories' ? <CategoriesTab personId={personId} /> : null}
        {activeTab === 'ranking' ? <RankingTab personId={personId} /> : null}
        {activeTab === 'segments' ? <SegmentsTab profile={profile} selectedBroadcastId={selectedBroadcastId} platform={profile.person?.platform} /> : null}
      </div>

      {!isEmbedded ? <StickyActionDock secondaryAction={<button className="btn btn-outline" onClick={handleBack}>이전 화면</button>} primaryAction={profile.person?.channel_id ? <button className="btn btn-primary" onClick={() => navigate(`/channel/${profile.person.channel_id}`)}>채널 페이지 이동</button> : null} /> : null}
    </div>
  );
};

export default StreamerDetail;
