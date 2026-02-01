import { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, Eye, Users, TrendingUp, TrendingDown, Trophy, Calendar,
  Building2, RefreshCw, Tag, Crown, AlertCircle, BarChart3, Monitor,
  ChevronDown, Clock, User, Award
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { formatCompactKo, formatFullNumber, formatGrowth } from '../../utils/formatters';
import { API_URL } from '../../config/api';
import LoadingSpinner from '../shared/LoadingSpinner';
import './GameCatalog.css';

const PLATFORM_COLORS = {
  soop: '#1e3a5f',
  chzzk: '#00ffa3',
  twitch: '#9146ff',
  youtube: '#ff0000'
};

const PLATFORM_CHART_COLORS = {
  soop: '#3b82f6',
  chzzk: '#10b981',
  twitch: '#a855f7',
  youtube: '#ef4444'
};

const PERIOD_LABELS = {
  '24h': '최근 24시간',
  '7d': '최근 7일',
  '30d': '최근 30일'
};

const TAB_LIST = [
  { key: 'summary', label: '요약', icon: BarChart3 },
  { key: 'stats', label: '통계', icon: Monitor },
  { key: 'platform', label: '플랫폼별', icon: Building2 },
  { key: 'streamer', label: '스트리머 랭킹', icon: Crown },
  { key: 'growth', label: '성장 랭킹', icon: TrendingUp },
  { key: 'history', label: '랭킹 히스토리', icon: Clock },
];

const chartTooltipStyle = {
  backgroundColor: 'var(--bg-card, #1a1a2e)',
  border: '1px solid var(--border-subtle, #333)',
  borderRadius: '8px',
  fontSize: '12px'
};

const ChangeIndicator = ({ diff, percent }) => {
  if (diff === 0 && percent === 0) return null;
  const isUp = diff > 0;
  return (
    <span className={`change-badge ${isUp ? 'up' : 'down'}`}>
      {isUp ? '↑' : '↓'} {Math.abs(diff).toLocaleString()} ({isUp ? '+' : ''}{percent.toFixed(1)}%)
    </span>
  );
};

/* ====== Tab: 요약 ====== */
const SummaryTab = ({ gameData, summaryStats, trendData, selectedPeriod, onPeriodChange }) => {
  const liveViewers = gameData.totalViewers || 0;
  const liveStreamers = gameData.totalStreamers || 0;
  const yesterdayViewers = summaryStats?.liveComparison?.viewers?.yesterday || 0;
  const yesterdayStreamers = summaryStats?.liveComparison?.streamers?.yesterday || 0;
  const viewerDiff = liveViewers - yesterdayViewers;
  const viewerPercent = yesterdayViewers ? (viewerDiff / yesterdayViewers) * 100 : 0;
  const streamerDiff = liveStreamers - yesterdayStreamers;
  const streamerPercent = yesterdayStreamers ? (streamerDiff / yesterdayStreamers) * 100 : 0;
  const platformList = (gameData.platforms || []).map(p => p.platform.toUpperCase()).join(', ');

  return (
    <>
      {/* LIVE 통계 카드 */}
      <div className="game-detail-stats">
        <div className="game-detail-stat glass-premium">
          <div className="game-detail-stat__icon live-icon"><Eye size={24} /></div>
          <div className="game-detail-stat__content">
            <span className="game-detail-stat__label">LIVE 시청자 수</span>
            <span className="game-detail-stat__sublabel">어제 대비 | {platformList}</span>
            <span className="game-detail-stat__value sensitive-blur">
              {formatFullNumber(liveViewers)}<span className="game-detail-stat__unit">명</span>
            </span>
            <ChangeIndicator diff={Math.round(viewerDiff)} percent={Math.round(viewerPercent * 10) / 10} />
          </div>
        </div>
        <div className="game-detail-stat glass-premium">
          <div className="game-detail-stat__icon live-icon"><Users size={24} /></div>
          <div className="game-detail-stat__content">
            <span className="game-detail-stat__label">LIVE 채널 수</span>
            <span className="game-detail-stat__sublabel">어제 대비 | {platformList}</span>
            <span className="game-detail-stat__value sensitive-blur">
              {formatFullNumber(liveStreamers)}<span className="game-detail-stat__unit">명</span>
            </span>
            <ChangeIndicator diff={Math.round(streamerDiff)} percent={Math.round(streamerPercent * 10) / 10} />
          </div>
        </div>
      </div>

      {/* 카테고리 분석 섹션 */}
      <div className="game-detail-analytics">
        <div className="game-summary-panel glass-premium">
          <div className="game-summary-header">
            <div className="game-summary-title"><BarChart3 size={18} />카테고리 요약 데이터</div>
            <p className="game-summary-desc">해당 기간의 카테고리 요약 데이터 ( 동시간 기준 )</p>
            <div className="period-tabs">
              {Object.entries(PERIOD_LABELS).map(([key, label]) => (
                <button key={key} className={selectedPeriod === key ? 'active' : ''} onClick={() => onPeriodChange(key)}>{label}</button>
              ))}
            </div>
          </div>
          {summaryStats ? (
            <div className="game-summary-stats">
              {[
                { label: '동시 최고 시청자', key: 'peakViewers', unit: '명' },
                { label: '평균 시청자', key: 'avgViewers', unit: '명' },
                { label: '뷰어십 (평균 시청자 × 방송시간)', key: 'viewership', unit: '' },
                { label: '동시 최고채널', key: 'peakStreamers', unit: '채널' },
                { label: '평균 채널', key: 'avgStreamers', unit: '채널' },
              ].map(item => (
                <div key={item.key} className="summary-stat-card">
                  <div className="summary-stat-label">{item.label}</div>
                  <div className="summary-stat-row">
                    <div className="summary-stat-value sensitive-blur">
                      {formatFullNumber(summaryStats.current[item.key])}
                      {item.unit && <span className="summary-stat-unit">{item.unit}</span>}
                    </div>
                    <ChangeIndicator {...summaryStats.changes[item.key]} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="game-summary-empty">요약 데이터를 불러오는 중...</div>
          )}
        </div>

        <div className="game-trend-panel">
          <div className="game-trend-chart glass-premium">
            <div className="game-trend-title"><Monitor size={16} />실시간 시청자 데이터</div>
            <p className="game-trend-desc">스트리머의 전체 통계 데이터</p>
            {trendData.length > 0 ? (
              <div className="game-trend-chart-area">
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="gdViewerGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} interval={Math.max(1, Math.floor(trendData.length / 6))} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} width={55} tickFormatter={(v) => formatCompactKo(v)} />
                    <Tooltip contentStyle={chartTooltipStyle} formatter={(val) => [`${formatFullNumber(val)}명`, '시청자']} />
                    <Area type="monotone" dataKey="viewers" stroke="#10b981" fill="url(#gdViewerGrad)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="game-trend-empty">차트 데이터가 없습니다</div>
            )}
          </div>
          <div className="game-trend-chart glass-premium">
            <div className="game-trend-title"><Users size={16} />실시간 채널 데이터</div>
            <p className="game-trend-desc">스트리머의 전체 통계 데이터</p>
            {trendData.length > 0 ? (
              <div className="game-trend-chart-area">
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="gdStreamerGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} interval={Math.max(1, Math.floor(trendData.length / 6))} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} width={55} tickFormatter={(v) => formatCompactKo(v)} />
                    <Tooltip contentStyle={chartTooltipStyle} formatter={(val) => [`${formatFullNumber(val)}채널`, '채널']} />
                    <Area type="monotone" dataKey="streamers" stroke="#3b82f6" fill="url(#gdStreamerGrad)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="game-trend-empty">차트 데이터가 없습니다</div>
            )}
          </div>
        </div>
      </div>

      {/* 플랫폼별 현황 테이블 */}
      {gameData.platforms && gameData.platforms.length > 0 && (
        <div className="game-detail-streamers glass-premium">
          <h2><Crown size={18} />플랫폼별 현황</h2>
          <div className="game-streamers-table">
            <div className="game-streamers-table__header">
              <div className="game-streamers-table__col name">플랫폼</div>
              <div className="game-streamers-table__col">카테고리명</div>
              <div className="game-streamers-table__col viewers">시청자</div>
              <div className="game-streamers-table__col avg">스트리머</div>
            </div>
            <div className="game-streamers-table__body">
              {gameData.platforms.map((platform, index) => (
                <div key={index} className="game-streamers-table__row">
                  <div className="game-streamers-table__col name">
                    <span className="platform-dot" style={{ background: PLATFORM_COLORS[platform.platform] || '#666' }} />
                    {platform.platform.toUpperCase()}
                  </div>
                  <div className="game-streamers-table__col">{platform.categoryName}</div>
                  <div className="game-streamers-table__col viewers">{formatCompactKo(platform.viewerCount || 0)}</div>
                  <div className="game-streamers-table__col avg">{formatCompactKo(platform.streamerCount || 0)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/* ====== Tab: 통계 ====== */
const StatsTab = ({ gameId }) => {
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState('7d');
  const [loading, setLoading] = useState(true);

  const fetchData = async (p) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/categories/${gameId}/daily-stats?period=${p}`);
      const result = await res.json();
      if (result.success) setData(result.data || []);
    } catch (err) { console.error('DailyStats error:', err); }
    setLoading(false);
  };

  useEffect(() => { fetchData(period); }, [gameId, period]);

  if (loading) return <div className="game-tab-loading"><RefreshCw size={20} className="spinning" /> 데이터 로딩 중...</div>;
  if (!data || data.length === 0) return <div className="game-tab-empty">통계 데이터가 없습니다</div>;

  const chartData = data.map(d => ({
    date: d.date?.substring(5) || d.date,
    최고시청자: Number(d.peak_viewers || 0),
    평균시청자: Number(d.avg_viewers || 0),
  }));

  return (
    <div className="game-tab-content">
      <div className="game-tab-controls">
        <div className="period-tabs">
          {['7d', '30d'].map(p => (
            <button key={p} className={period === p ? 'active' : ''} onClick={() => setPeriod(p)}>
              {p === '7d' ? '최근 7일' : '최근 30일'}
            </button>
          ))}
        </div>
      </div>

      <div className="game-tab-chart glass-premium">
        <h3><BarChart3 size={16} /> 일별 시청자 통계</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} width={55} tickFormatter={v => formatCompactKo(v)} />
            <Tooltip contentStyle={chartTooltipStyle} formatter={(val, name) => [`${formatFullNumber(val)}명`, name]} />
            <Legend />
            <Bar dataKey="최고시청자" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="평균시청자" fill="#6366f1" radius={[4, 4, 0, 0]} opacity={0.6} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="game-tab-table glass-premium">
        <h3><Monitor size={16} /> 일별 상세 데이터</h3>
        <div className="game-data-table">
          <div className="game-data-table__header">
            <div className="game-data-table__col">날짜</div>
            <div className="game-data-table__col">최고 시청자</div>
            <div className="game-data-table__col">평균 시청자</div>
            <div className="game-data-table__col">최고 채널</div>
            <div className="game-data-table__col">평균 채널</div>
          </div>
          <div className="game-data-table__body">
            {data.map((row, i) => (
              <div key={i} className="game-data-table__row">
                <div className="game-data-table__col">{row.date}</div>
                <div className="game-data-table__col">{formatFullNumber(row.peak_viewers)}</div>
                <div className="game-data-table__col">{formatFullNumber(row.avg_viewers)}</div>
                <div className="game-data-table__col">{formatFullNumber(row.peak_streamers)}</div>
                <div className="game-data-table__col">{formatFullNumber(row.avg_streamers)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ====== Tab: 플랫폼별 통계 ====== */
const PlatformTab = ({ gameId }) => {
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState('7d');
  const [loading, setLoading] = useState(true);

  const fetchData = async (p) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/categories/${gameId}/platform-stats?period=${p}`);
      const result = await res.json();
      if (result.success) setData(result.data);
    } catch (err) { console.error('PlatformStats error:', err); }
    setLoading(false);
  };

  useEffect(() => { fetchData(period); }, [gameId, period]);

  if (loading) return <div className="game-tab-loading"><RefreshCw size={20} className="spinning" /> 데이터 로딩 중...</div>;
  if (!data) return <div className="game-tab-empty">플랫폼 데이터가 없습니다</div>;

  // 시계열 데이터를 날짜별로 pivot
  const platforms = [...new Set((data.timeSeries || []).map(r => r.platform))];
  const dateMap = new Map();
  for (const row of (data.timeSeries || [])) {
    const dateKey = row.date?.substring(5) || row.date;
    if (!dateMap.has(dateKey)) dateMap.set(dateKey, { date: dateKey });
    dateMap.get(dateKey)[`${row.platform}_viewers`] = Number(row.peak_viewers || 0);
    dateMap.get(dateKey)[`${row.platform}_streamers`] = Number(row.peak_streamers || 0);
  }
  const chartData = Array.from(dateMap.values());

  return (
    <div className="game-tab-content">
      <div className="game-tab-controls">
        <div className="period-tabs">
          {['7d', '30d'].map(p => (
            <button key={p} className={period === p ? 'active' : ''} onClick={() => setPeriod(p)}>
              {p === '7d' ? '최근 7일' : '최근 30일'}
            </button>
          ))}
        </div>
      </div>

      <div className="game-tab-chart glass-premium">
        <h3><Eye size={16} /> 플랫폼별 시청자 추이</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} width={55} tickFormatter={v => formatCompactKo(v)} />
            <Tooltip contentStyle={chartTooltipStyle} formatter={(val, name) => [`${formatFullNumber(val)}명`, name.split('_')[0].toUpperCase()]} />
            <Legend formatter={(v) => v.split('_')[0].toUpperCase()} />
            {platforms.map(pl => (
              <Line key={pl} type="monotone" dataKey={`${pl}_viewers`} stroke={PLATFORM_CHART_COLORS[pl] || '#999'} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="game-tab-chart glass-premium">
        <h3><Users size={16} /> 플랫폼별 채널 추이</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} width={55} tickFormatter={v => formatCompactKo(v)} />
            <Tooltip contentStyle={chartTooltipStyle} formatter={(val, name) => [`${formatFullNumber(val)}채널`, name.split('_')[0].toUpperCase()]} />
            <Legend formatter={(v) => v.split('_')[0].toUpperCase()} />
            {platforms.map(pl => (
              <Line key={pl} type="monotone" dataKey={`${pl}_streamers`} stroke={PLATFORM_CHART_COLORS[pl] || '#999'} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 플랫폼별 요약 테이블 */}
      {data.summary && data.summary.length > 0 && (
        <div className="game-tab-table glass-premium">
          <h3><Building2 size={16} /> 플랫폼별 요약</h3>
          <div className="game-data-table">
            <div className="game-data-table__header">
              <div className="game-data-table__col">플랫폼</div>
              <div className="game-data-table__col">최고 시청자</div>
              <div className="game-data-table__col">평균 시청자</div>
              <div className="game-data-table__col">최고 채널</div>
              <div className="game-data-table__col">평균 채널</div>
            </div>
            <div className="game-data-table__body">
              {data.summary.map((row, i) => (
                <div key={i} className="game-data-table__row">
                  <div className="game-data-table__col">
                    <span className="platform-dot" style={{ background: PLATFORM_COLORS[row.platform] || '#666' }} />
                    {row.platform?.toUpperCase()}
                  </div>
                  <div className="game-data-table__col">{formatFullNumber(row.peak_viewers)}</div>
                  <div className="game-data-table__col">{formatFullNumber(row.avg_viewers)}</div>
                  <div className="game-data-table__col">{formatFullNumber(row.peak_streamers)}</div>
                  <div className="game-data-table__col">{formatFullNumber(row.avg_streamers)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ====== Tab: 스트리머 랭킹 ====== */
const StreamerRankingTab = ({ gameId, onStreamerSelect }) => {
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState('7d');
  const [sortBy, setSortBy] = useState('peak');
  const [loading, setLoading] = useState(true);

  const fetchData = async (p, s) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/categories/${gameId}/streamer-ranking?period=${p}&sortBy=${s}`);
      const result = await res.json();
      if (result.success) setData(result.data || []);
    } catch (err) { console.error('StreamerRanking error:', err); }
    setLoading(false);
  };

  useEffect(() => { fetchData(period, sortBy); }, [gameId, period, sortBy]);

  if (loading) return <div className="game-tab-loading"><RefreshCw size={20} className="spinning" /> 데이터 로딩 중...</div>;
  if (!data || data.length === 0) return <div className="game-tab-empty">스트리머 랭킹 데이터가 없습니다</div>;

  const formatMinutes = (min) => {
    const m = Number(min || 0);
    if (m >= 60) return `${Math.floor(m / 60)}시간 ${Math.round(m % 60)}분`;
    return `${Math.round(m)}분`;
  };

  return (
    <div className="game-tab-content">
      <div className="game-tab-controls">
        <div className="period-tabs">
          {['7d', '30d'].map(p => (
            <button key={p} className={period === p ? 'active' : ''} onClick={() => setPeriod(p)}>
              {p === '7d' ? '최근 7일' : '최근 30일'}
            </button>
          ))}
        </div>
        <div className="period-tabs">
          {[{ k: 'peak', l: '최고시청자' }, { k: 'avg', l: '평균시청자' }, { k: 'count', l: '방송횟수' }].map(s => (
            <button key={s.k} className={sortBy === s.k ? 'active' : ''} onClick={() => setSortBy(s.k)}>{s.l}</button>
          ))}
        </div>
      </div>

      <div className="game-tab-table glass-premium">
        <div className="game-data-table">
          <div className="game-data-table__header">
            <div className="game-data-table__col rank-col">#</div>
            <div className="game-data-table__col name-col">스트리머</div>
            <div className="game-data-table__col">플랫폼</div>
            <div className="game-data-table__col">최고 시청자</div>
            <div className="game-data-table__col">평균 시청자</div>
            <div className="game-data-table__col">방송 횟수</div>
            <div className="game-data-table__col">총 방송시간</div>
          </div>
          <div className="game-data-table__body">
            {data.map((row, i) => (
              <div
                key={i}
                className={`game-data-table__row ${row.person_id ? 'clickable' : ''}`}
                onClick={() => row.person_id && onStreamerSelect?.(row.person_id)}
              >
                <div className="game-data-table__col rank-col">
                  <span className={`rank-badge ${i < 3 ? `rank-${i + 1}` : ''}`}>{i + 1}</span>
                </div>
                <div className="game-data-table__col name-col">
                  <div className="streamer-info">
                    {row.profile_image_url ? (
                      <img src={row.profile_image_url} alt="" className="streamer-avatar" />
                    ) : (
                      <div className="streamer-avatar-placeholder"><User size={14} /></div>
                    )}
                    <span className="streamer-name">{row.nickname || '알 수 없음'}</span>
                  </div>
                </div>
                <div className="game-data-table__col">
                  <span className="platform-dot" style={{ background: PLATFORM_COLORS[row.platform] || '#666' }} />
                  {row.platform?.toUpperCase()}
                </div>
                <div className="game-data-table__col">{formatFullNumber(row.peak_viewers)}</div>
                <div className="game-data-table__col">{formatFullNumber(row.avg_viewers)}</div>
                <div className="game-data-table__col">{formatFullNumber(row.broadcast_count)}</div>
                <div className="game-data-table__col">{formatMinutes(row.total_minutes)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ====== Tab: 성장 랭킹 ====== */
const GrowthRankingTab = ({ gameId, onStreamerSelect }) => {
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState('7d');
  const [loading, setLoading] = useState(true);

  const fetchData = async (p) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/categories/${gameId}/growth-ranking?period=${p}`);
      const result = await res.json();
      if (result.success) setData(result.data || []);
    } catch (err) { console.error('GrowthRanking error:', err); }
    setLoading(false);
  };

  useEffect(() => { fetchData(period); }, [gameId, period]);

  if (loading) return <div className="game-tab-loading"><RefreshCw size={20} className="spinning" /> 데이터 로딩 중...</div>;
  if (!data || data.length === 0) return <div className="game-tab-empty">성장 랭킹 데이터가 없습니다</div>;

  return (
    <div className="game-tab-content">
      <div className="game-tab-controls">
        <div className="period-tabs">
          {['7d', '30d'].map(p => (
            <button key={p} className={period === p ? 'active' : ''} onClick={() => setPeriod(p)}>
              {p === '7d' ? '최근 7일 vs 이전 7일' : '최근 30일 vs 이전 30일'}
            </button>
          ))}
        </div>
      </div>

      <div className="game-tab-table glass-premium">
        <div className="game-data-table">
          <div className="game-data-table__header">
            <div className="game-data-table__col rank-col">#</div>
            <div className="game-data-table__col name-col">스트리머</div>
            <div className="game-data-table__col">플랫폼</div>
            <div className="game-data-table__col">현재 평균</div>
            <div className="game-data-table__col">이전 평균</div>
            <div className="game-data-table__col">성장률</div>
          </div>
          <div className="game-data-table__body">
            {data.map((row, i) => (
              <div
                key={i}
                className={`game-data-table__row ${row.person_id ? 'clickable' : ''}`}
                onClick={() => row.person_id && onStreamerSelect?.(row.person_id)}
              >
                <div className="game-data-table__col rank-col">
                  <span className={`rank-badge ${i < 3 ? `rank-${i + 1}` : ''}`}>{i + 1}</span>
                </div>
                <div className="game-data-table__col name-col">
                  <div className="streamer-info">
                    {row.profile_image_url ? (
                      <img src={row.profile_image_url} alt="" className="streamer-avatar" />
                    ) : (
                      <div className="streamer-avatar-placeholder"><User size={14} /></div>
                    )}
                    <span className="streamer-name">{row.nickname || '알 수 없음'}</span>
                  </div>
                </div>
                <div className="game-data-table__col">
                  <span className="platform-dot" style={{ background: PLATFORM_COLORS[row.platform] || '#666' }} />
                  {row.platform?.toUpperCase()}
                </div>
                <div className="game-data-table__col">{formatFullNumber(row.avg_viewers)}명</div>
                <div className="game-data-table__col">{formatFullNumber(row.prev_avg_viewers)}명</div>
                <div className="game-data-table__col">
                  <span className={`change-badge ${row.growth > 0 ? 'up' : row.growth < 0 ? 'down' : 'neutral'}`}>
                    {row.growth > 0 ? '↑' : row.growth < 0 ? '↓' : '-'} {formatGrowth(row.growth)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ====== Tab: 랭킹 히스토리 ====== */
const RankingHistoryTab = ({ gameId, onStreamerSelect }) => {
  const [data, setData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  });
  const [loading, setLoading] = useState(true);

  // 최근 7일 날짜 목록 생성
  const dateOptions = [];
  for (let i = 1; i <= 7; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    dateOptions.push(d.toISOString().split('T')[0]);
  }

  const fetchData = async (date) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/categories/${gameId}/ranking-history?date=${date}`);
      const result = await res.json();
      if (result.success) setData(result.data || []);
    } catch (err) { console.error('RankingHistory error:', err); }
    setLoading(false);
  };

  useEffect(() => { fetchData(selectedDate); }, [gameId, selectedDate]);

  if (loading) return <div className="game-tab-loading"><RefreshCw size={20} className="spinning" /> 데이터 로딩 중...</div>;

  const formatTime = (ts) => {
    if (!ts) return '-';
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="game-tab-content">
      <div className="game-tab-controls">
        <div className="period-tabs">
          {dateOptions.map(d => (
            <button key={d} className={selectedDate === d ? 'active' : ''} onClick={() => setSelectedDate(d)}>
              {d.substring(5)}
            </button>
          ))}
        </div>
      </div>

      {!data || data.length === 0 ? (
        <div className="game-tab-empty">해당 날짜의 방송 데이터가 없습니다</div>
      ) : (
        <div className="game-tab-table glass-premium">
          <div className="game-data-table">
            <div className="game-data-table__header">
              <div className="game-data-table__col rank-col">#</div>
              <div className="game-data-table__col name-col">스트리머</div>
              <div className="game-data-table__col">플랫폼</div>
              <div className="game-data-table__col">최고 시청자</div>
              <div className="game-data-table__col">평균 시청자</div>
              <div className="game-data-table__col">방송 시작</div>
              <div className="game-data-table__col title-col">방송 제목</div>
            </div>
            <div className="game-data-table__body">
              {data.map((row, i) => (
                <div
                  key={i}
                  className={`game-data-table__row ${row.person_id ? 'clickable' : ''}`}
                  onClick={() => row.person_id && onStreamerSelect?.(row.person_id)}
                  >
                  <div className="game-data-table__col rank-col">
                    <span className={`rank-badge ${i < 3 ? `rank-${i + 1}` : ''}`}>{i + 1}</span>
                  </div>
                  <div className="game-data-table__col name-col">
                    <div className="streamer-info">
                      {row.profile_image_url ? (
                        <img src={row.profile_image_url} alt="" className="streamer-avatar" />
                      ) : (
                        <div className="streamer-avatar-placeholder"><User size={14} /></div>
                      )}
                      <span className="streamer-name">{row.nickname || '알 수 없음'}</span>
                    </div>
                  </div>
                  <div className="game-data-table__col">
                    <span className="platform-dot" style={{ background: PLATFORM_COLORS[row.platform] || '#666' }} />
                    {row.platform?.toUpperCase()}
                  </div>
                  <div className="game-data-table__col">{formatFullNumber(row.peak_viewers)}</div>
                  <div className="game-data-table__col">{formatFullNumber(row.avg_viewers)}</div>
                  <div className="game-data-table__col">{formatTime(row.started_at)}</div>
                  <div className="game-data-table__col title-col" title={row.title}>
                    {row.title || '-'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ====== Main Component ====== */
const GameDetail = ({ gameId, onBack, onStreamerSelect }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gameData, setGameData] = useState(null);
  const [summaryStats, setSummaryStats] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('24h');
  const [activeTab, setActiveTab] = useState('summary');

  const fetchGameDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const [detailRes, summaryRes, trendRes] = await Promise.all([
        fetch(`${API_URL}/api/categories/${gameId}`),
        fetch(`${API_URL}/api/categories/${gameId}/summary?period=${selectedPeriod}`),
        fetch(`${API_URL}/api/categories/${gameId}/stats?period=7d`)
      ]);

      if (!detailRes.ok) throw new Error('불러오기 실패');

      const detailResult = await detailRes.json();
      if (detailResult.success && detailResult.data) {
        setGameData(detailResult.data);
      } else {
        throw new Error(detailResult.error || '게임을 찾을 수 없습니다.');
      }

      if (summaryRes.ok) {
        const summaryResult = await summaryRes.json();
        if (summaryResult.success) setSummaryStats(summaryResult.data);
      }

      if (trendRes.ok) {
        const trendResult = await trendRes.json();
        if (trendResult.success) {
          const formatted = (trendResult.data || []).map(row => {
            const d = new Date(row.recorded_at);
            return {
              time: `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}시`,
              viewers: Number(row.total_viewers || 0),
              streamers: Number(row.total_streamers || 0)
            };
          });
          setTrendData(formatted);
        }
      }
    } catch (err) {
      console.error('GameDetail fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async (period) => {
    try {
      const res = await fetch(`${API_URL}/api/categories/${gameId}/summary?period=${period}`);
      if (res.ok) {
        const result = await res.json();
        if (result.success) setSummaryStats(result.data);
      }
    } catch (err) { console.error('Summary fetch error:', err); }
  };

  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
    fetchSummary(period);
  };

  useEffect(() => { if (gameId) fetchGameDetail(); }, [gameId]);

  if (loading) return <div className="game-detail"><LoadingSpinner /></div>;

  if (error) {
    return (
      <div className="game-detail">
        <button className="game-detail-back" onClick={onBack}><ArrowLeft size={18} />목록으로 돌아가기</button>
        <div className="game-catalog-error">
          <AlertCircle size={32} /><span>{error}</span>
          <button onClick={fetchGameDetail} className="retry-button"><RefreshCw size={16} />다시 시도</button>
        </div>
      </div>
    );
  }

  if (!gameData) {
    return (
      <div className="game-detail">
        <button className="game-detail-back" onClick={onBack}><ArrowLeft size={18} />목록으로 돌아가기</button>
        <div className="game-catalog-empty"><Trophy size={48} /><h3>게임을 찾을 수 없습니다</h3><p>잘못된 접근입니다</p></div>
      </div>
    );
  }

  const tags = [gameData.genre, gameData.developer, ...(gameData.isVerified ? ['검증됨'] : [])].filter(Boolean);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'summary':
        return <SummaryTab gameData={gameData} summaryStats={summaryStats} trendData={trendData} selectedPeriod={selectedPeriod} onPeriodChange={handlePeriodChange} />;
      case 'stats':
        return <StatsTab gameId={gameId} />;
      case 'platform':
        return <PlatformTab gameId={gameId} />;
      case 'streamer':
        return <StreamerRankingTab gameId={gameId} onStreamerSelect={onStreamerSelect} />;
      case 'growth':
        return <GrowthRankingTab gameId={gameId} onStreamerSelect={onStreamerSelect} />;
      case 'history':
        return <RankingHistoryTab gameId={gameId} onStreamerSelect={onStreamerSelect} />;
      default:
        return null;
    }
  };

  return (
    <div className="game-detail">
      <button className="game-detail-back" onClick={onBack}><ArrowLeft size={18} />목록으로 돌아가기</button>

      {/* 게임 헤더 */}
      <div className="game-detail-header glass-premium">
        <div className="game-detail-header__image">
          {gameData.imageUrl ? (
            <img src={gameData.imageUrl} alt={gameData.nameKr || gameData.name} />
          ) : (
            <div className="game-detail-header__placeholder"><Trophy size={48} /></div>
          )}
        </div>
        <div className="game-detail-header__info">
          <h1>{gameData.nameKr || gameData.name}</h1>
          {gameData.nameKr && gameData.name && gameData.nameKr !== gameData.name && (
            <p className="game-detail-header__name">{gameData.name}</p>
          )}
          <div className="game-detail-header__tags">
            {tags.map((tag, index) => (
              <span key={index} className="game-detail-tag"><Tag size={12} />{tag}</span>
            ))}
          </div>
          <div className="game-detail-header__meta">
            {gameData.developer && (<span className="game-detail-meta"><Building2 size={14} />{gameData.developer}</span>)}
            {gameData.releaseDate && (<span className="game-detail-meta"><Calendar size={14} />{gameData.releaseDate} 출시</span>)}
            {gameData.genre && (<span className="game-detail-meta game-detail-genre">{gameData.genre}</span>)}
          </div>
        </div>
      </div>

      {/* 게임 소개 */}
      {gameData.description && (
        <div className="game-detail-description glass-premium">
          <h2><Tag size={18} />게임 소개</h2>
          <p>{gameData.description}</p>
        </div>
      )}

      {/* 탭 네비게이션 */}
      <div className="game-detail-tabs">
        {TAB_LIST.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              className={`game-detail-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 탭 컨텐츠 */}
      <div className="game-detail-tab-content">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default GameDetail;
