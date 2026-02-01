import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Eye, Users, TrendingUp, Clock, Trophy, Crown,
  BarChart3, RefreshCw, Tag, Monitor, Award, Calendar,
  PieChart as PieChartIcon, Play, ChevronLeft, ChevronRight, User
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { formatCompactKo, formatFullNumber, formatCurrency } from '../../utils/formatters';
import { API_URL } from '../../config/api';
import './StreamerDetail.css';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4', '#ec4899', '#8b5cf6'];

const PLATFORM_LOGOS = {
  soop: '/assets/logos/soop.png',
  chzzk: '/assets/logos/chzzk.png',
  youtube: '/assets/logos/youtube.png',
  twitch: '/assets/logos/twitch.png',
};

const formatMinutes = (m) => {
  if (!m) return '0시간';
  const h = Math.floor(m / 60);
  const min = Math.round(m % 60);
  return h > 0 ? `${h}시간 ${min}분` : `${min}분`;
};

const formatDate = (d) => {
  if (!d) return '-';
  const date = new Date(d);
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const formatDateShort = (d) => {
  if (!d) return '-';
  const date = new Date(d);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

const getElapsedTime = (startedAt) => {
  if (!startedAt) return '';
  const diff = Date.now() - new Date(startedAt).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}시간 ${m}분`;
};

// ===================== MAIN COMPONENT =====================
const StreamerDetail = ({ personId: propPersonId, onBack }) => {
  const params = useParams();
  const navigate = useNavigate();
  const personId = propPersonId || params.personId;
  const isEmbedded = !!propPersonId;
  const [activeTab, setActiveTab] = useState('summary');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Tab data cache
  const [tabData, setTabData] = useState({});

  useEffect(() => {
    fetchProfile();
  }, [personId]);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/streamer/${personId}`);
      const json = await res.json();
      if (json.success) {
        setProfile(json.data);
      } else {
        setError(json.error || '스트리머를 찾을 수 없습니다');
      }
    } catch (err) {
      setError('데이터를 불러오는 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="streamer-detail">
        <div className="streamer-tab-loading">
          <RefreshCw size={24} className="spinning" />
          <span>스트리머 정보를 불러오는 중...</span>
        </div>
      </div>
    );
  }

  const handleBack = () => {
    if (isEmbedded && onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  if (error || !profile) {
    return (
      <div className="streamer-detail">
        <button className="streamer-detail-back" onClick={handleBack}>
          <ArrowLeft size={16} /> 뒤로가기
        </button>
        <div className="streamer-tab-empty">
          <Users size={32} />
          <span>{error || '스트리머를 찾을 수 없습니다'}</span>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: 'summary', label: '요약', icon: <User size={15} /> },
    { key: 'stats', label: '통계', icon: <BarChart3 size={15} /> },
    { key: 'categories', label: '카테고리', icon: <Tag size={15} /> },
    { key: 'ranking', label: '랭킹', icon: <Trophy size={15} /> },
    { key: 'broadcasts', label: '방송기록', icon: <Monitor size={15} /> },
    { key: 'segments', label: '구간분석', icon: <Play size={15} /> },
  ];

  return (
    <div className="streamer-detail">
      <button className="streamer-detail-back" onClick={handleBack}>
        <ArrowLeft size={16} /> 뒤로가기
      </button>

      {/* Profile Header */}
      <div className="streamer-profile-header">
        <div className="streamer-profile-avatar">
          {profile.person?.profile_image_url ? (
            <img src={profile.person.profile_image_url} alt={profile.person.nickname} />
          ) : (
            <div className="streamer-profile-avatar-placeholder"><Users size={36} /></div>
          )}
          {profile.person?.platform && PLATFORM_LOGOS[profile.person.platform] && (
            <img src={PLATFORM_LOGOS[profile.person.platform]} alt={profile.person.platform} className="streamer-platform-badge" />
          )}
        </div>
        <div className="streamer-profile-info">
          <h1 className="streamer-profile-name">
            {profile.person?.nickname || '알 수 없음'}
            {profile.live && (
              <span className="streamer-live-indicator">
                <span className="streamer-live-dot" /> LIVE
              </span>
            )}
          </h1>
          <div className="streamer-profile-meta">
            {profile.person?.platform && (
              <span className="streamer-meta-item">
                <Monitor size={14} />
                {profile.person.platform.toUpperCase()}
              </span>
            )}
            <span className="streamer-meta-item">
              <Calendar size={14} />
              마지막 방송: {profile.stats?.last_broadcast_at ? formatDate(profile.stats.last_broadcast_at) : '없음'}
            </span>
            <span className="streamer-meta-item">
              <BarChart3 size={14} />
              총 {profile.stats?.total_broadcasts || 0}회 방송
            </span>
          </div>
        </div>
      </div>

      {/* Live Card */}
      {profile.live && (
        <div className="streamer-live-card">
          {profile.live.thumbnail_url && (
            <div className="streamer-live-card__thumbnail">
              <img src={profile.live.thumbnail_url} alt="Live" />
            </div>
          )}
          <div className="streamer-live-card__info">
            <div className="streamer-live-card__title">{profile.live.title}</div>
            <div className="streamer-live-card__stats">
              <span><Eye size={14} /> {formatCompactKo(profile.live.current_viewer_count)}명 시청중</span>
              <span><TrendingUp size={14} /> 최고 {formatCompactKo(profile.live.peak_viewer_count)}명</span>
              <span><Clock size={14} /> {getElapsedTime(profile.live.started_at)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Stats Summary Cards */}
      <div className="streamer-stats-grid">
        <div className="streamer-stat-card">
          <div className="streamer-stat-card__icon peak"><Crown size={22} /></div>
          <div className="streamer-stat-card__content">
            <div className="streamer-stat-card__value">{formatCompactKo(profile.stats?.all_time_peak || 0)}</div>
            <div className="streamer-stat-card__label">역대 최고 시청자</div>
          </div>
        </div>
        <div className="streamer-stat-card">
          <div className="streamer-stat-card__icon viewers"><Users size={22} /></div>
          <div className="streamer-stat-card__content">
            <div className="streamer-stat-card__value">{formatCompactKo(profile.stats?.overall_avg || 0)}</div>
            <div className="streamer-stat-card__label">평균 시청자</div>
          </div>
        </div>
        <div className="streamer-stat-card">
          <div className="streamer-stat-card__icon time"><Clock size={22} /></div>
          <div className="streamer-stat-card__content">
            <div className="streamer-stat-card__value">{formatMinutes(profile.stats?.total_minutes || 0)}</div>
            <div className="streamer-stat-card__label">총 방송시간</div>
          </div>
        </div>
        <div className="streamer-stat-card">
          <div className="streamer-stat-card__icon donation"><Award size={22} /></div>
          <div className="streamer-stat-card__content">
            <div className="streamer-stat-card__value">{formatCompactKo(profile.eventStats?.total_donation_amount || 0)}</div>
            <div className="streamer-stat-card__label">총 후원금액</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="streamer-detail-tabs">
        {tabs.map(t => (
          <button
            key={t.key}
            className={`streamer-detail-tab ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'summary' && (
        <SummaryTab profile={profile} />
      )}
      {activeTab === 'stats' && (
        <StatsTab personId={personId} tabData={tabData} setTabData={setTabData} />
      )}
      {activeTab === 'categories' && (
        <CategoriesTab personId={personId} tabData={tabData} setTabData={setTabData} />
      )}
      {activeTab === 'ranking' && (
        <RankingTab personId={personId} tabData={tabData} setTabData={setTabData} />
      )}
      {activeTab === 'broadcasts' && (
        <BroadcastsTab personId={personId} tabData={tabData} setTabData={setTabData} onSelectBroadcast={(id) => {
          setTabData(prev => ({ ...prev, selectedBroadcastId: id }));
          setActiveTab('segments');
        }} />
      )}
      {activeTab === 'segments' && (
        <SegmentsTab personId={personId} tabData={tabData} setTabData={setTabData} />
      )}
    </div>
  );
};

// ===================== SUMMARY TAB =====================
const SummaryTab = ({ profile }) => {
  const categories = profile.categories || [];
  const recentBroadcasts = profile.recentBroadcasts || [];

  return (
    <div className="streamer-summary-layout">
      {/* Category Breakdown Pie */}
      <div className="streamer-summary-section">
        <h3><PieChartIcon size={18} /> 카테고리별 방송시간</h3>
        {categories.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={categories}
                dataKey="total_minutes"
                nameKey="category_name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                innerRadius={50}
                paddingAngle={2}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {categories.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => formatMinutes(v)} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="streamer-tab-empty" style={{ padding: '40px 20px' }}>카테고리 데이터가 없습니다</div>
        )}
      </div>

      {/* Recent Broadcasts */}
      <div className="streamer-summary-section">
        <h3><Monitor size={18} /> 최근 방송</h3>
        {recentBroadcasts.length > 0 ? recentBroadcasts.map((b, i) => (
          <div key={b.id || i} className="streamer-recent-broadcast">
            <div className="streamer-recent-broadcast__info">
              <div className="streamer-recent-broadcast__title">{b.title || '(제목 없음)'}</div>
              <div className="streamer-recent-broadcast__meta">
                <span>{formatDate(b.started_at)}</span>
                {b.duration_minutes && <span>{formatMinutes(b.duration_minutes)}</span>}
              </div>
            </div>
            <div className="streamer-recent-broadcast__viewers">
              <Eye size={13} style={{ marginRight: 4 }} />
              {formatCompactKo(b.peak_viewer_count || 0)}
            </div>
          </div>
        )) : (
          <div className="streamer-tab-empty" style={{ padding: '40px 20px' }}>방송 기록이 없습니다</div>
        )}
      </div>
    </div>
  );
};

// ===================== STATS TAB =====================
const StatsTab = ({ personId, tabData, setTabData }) => {
  const [period, setPeriod] = useState('7d');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStats();
  }, [personId, period]);

  const fetchStats = async () => {
    const key = `stats_${period}`;
    if (tabData[key]) { setData(tabData[key]); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/streamer/${personId}/stats?period=${period}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setTabData(prev => ({ ...prev, [key]: json.data }));
      }
    } catch (e) { /* ignore */ }
    setLoading(false);
  };

  if (loading) return <div className="streamer-tab-loading"><RefreshCw size={20} className="spinning" /> 통계 로딩중...</div>;
  if (!data || data.length === 0) return <div className="streamer-tab-empty"><BarChart3 size={28} /> 통계 데이터가 없습니다</div>;

  const totalBroadcasts = data.reduce((s, d) => s + Number(d.broadcast_count || 0), 0);
  const totalMinutes = data.reduce((s, d) => s + Number(d.total_minutes || 0), 0);
  const maxPeak = Math.max(...data.map(d => Number(d.peak_viewers || 0)));
  const avgViewers = Math.round(data.reduce((s, d) => s + Number(d.avg_viewers || 0), 0) / data.length);

  return (
    <>
      <div className="streamer-period-tabs">
        <button className={period === '7d' ? 'active' : ''} onClick={() => setPeriod('7d')}>7일</button>
        <button className={period === '30d' ? 'active' : ''} onClick={() => setPeriod('30d')}>30일</button>
      </div>

      {/* Summary Stats */}
      <div className="streamer-stats-grid" style={{ marginBottom: 20 }}>
        <div className="streamer-stat-card">
          <div className="streamer-stat-card__icon viewers"><Monitor size={20} /></div>
          <div className="streamer-stat-card__content">
            <div className="streamer-stat-card__value">{totalBroadcasts}회</div>
            <div className="streamer-stat-card__label">방송 횟수</div>
          </div>
        </div>
        <div className="streamer-stat-card">
          <div className="streamer-stat-card__icon time"><Clock size={20} /></div>
          <div className="streamer-stat-card__content">
            <div className="streamer-stat-card__value">{formatMinutes(totalMinutes)}</div>
            <div className="streamer-stat-card__label">총 방송시간</div>
          </div>
        </div>
        <div className="streamer-stat-card">
          <div className="streamer-stat-card__icon peak"><Crown size={20} /></div>
          <div className="streamer-stat-card__content">
            <div className="streamer-stat-card__value">{formatCompactKo(maxPeak)}</div>
            <div className="streamer-stat-card__label">최고 시청자</div>
          </div>
        </div>
        <div className="streamer-stat-card">
          <div className="streamer-stat-card__icon viewers"><Users size={20} /></div>
          <div className="streamer-stat-card__content">
            <div className="streamer-stat-card__value">{formatCompactKo(avgViewers)}</div>
            <div className="streamer-stat-card__label">평균 시청자</div>
          </div>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="streamer-chart-container">
        <h3><BarChart3 size={18} /> 일별 시청자 추이</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={formatDateShort} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={v => formatCompactKo(v)} />
            <Tooltip
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 8, fontSize: 12 }}
              formatter={(v, name) => [formatFullNumber(v), name === 'peak_viewers' ? '최고' : '평균']}
              labelFormatter={v => v}
            />
            <Legend formatter={v => v === 'peak_viewers' ? '최고 시청자' : '평균 시청자'} />
            <Bar dataKey="peak_viewers" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            <Bar dataKey="avg_viewers" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Daily Table */}
      <div className="streamer-data-table">
        <div className="streamer-data-table__header stats-table-grid">
          <span>날짜</span><span>방송수</span><span>시간</span><span>최고시청자</span><span>평균시청자</span>
        </div>
        <div className="streamer-data-table__body">
          {data.map((row, i) => (
            <div key={i} className="streamer-data-table__row stats-table-grid">
              <span>{row.date}</span>
              <span>{row.broadcast_count}회</span>
              <span>{formatMinutes(row.total_minutes)}</span>
              <span>{formatCompactKo(row.peak_viewers)}</span>
              <span>{formatCompactKo(row.avg_viewers)}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

// ===================== CATEGORIES TAB =====================
const CategoriesTab = ({ personId, tabData, setTabData }) => {
  const [period, setPeriod] = useState('7d');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, [personId, period]);

  const fetchCategories = async () => {
    const key = `categories_${period}`;
    if (tabData[key]) { setData(tabData[key]); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/streamer/${personId}/categories?period=${period}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setTabData(prev => ({ ...prev, [key]: json.data }));
      }
    } catch (e) { /* ignore */ }
    setLoading(false);
  };

  if (loading) return <div className="streamer-tab-loading"><RefreshCw size={20} className="spinning" /> 카테고리 로딩중...</div>;
  if (!data || data.length === 0) return <div className="streamer-tab-empty"><Tag size={28} /> 카테고리 데이터가 없습니다</div>;

  return (
    <>
      <div className="streamer-period-tabs">
        <button className={period === '7d' ? 'active' : ''} onClick={() => setPeriod('7d')}>7일</button>
        <button className={period === '30d' ? 'active' : ''} onClick={() => setPeriod('30d')}>30일</button>
      </div>

      <div className="streamer-summary-layout">
        {/* Pie Chart */}
        <div className="streamer-summary-section">
          <h3><PieChartIcon size={18} /> 방송시간 비율</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={data.slice(0, 8)}
                dataKey="total_minutes"
                nameKey="category_name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                innerRadius={55}
                paddingAngle={2}
                label={({ name, percent }) => `${(name || '').substring(0, 8)} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {data.slice(0, 8).map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={v => formatMinutes(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Table */}
        <div className="streamer-summary-section" style={{ overflow: 'auto' }}>
          <h3><Tag size={18} /> 카테고리별 랭킹</h3>
          <div className="streamer-data-table" style={{ border: 'none' }}>
            <div className="streamer-data-table__header categories-table-grid">
              <span>#</span><span>카테고리</span><span>방송수</span><span>시간</span><span>최고</span><span>평균</span>
            </div>
            <div className="streamer-data-table__body">
              {data.map((row, i) => (
                <div key={i} className="streamer-data-table__row categories-table-grid">
                  <span style={{ fontWeight: 700, color: i < 3 ? '#f59e0b' : 'var(--text-muted)' }}>{i + 1}</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.category_name || '기타'}</span>
                  <span>{row.broadcast_count}회</span>
                  <span>{formatMinutes(row.total_minutes)}</span>
                  <span>{formatCompactKo(row.peak_viewers)}</span>
                  <span>{formatCompactKo(row.avg_viewers)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// ===================== RANKING TAB =====================
const RankingTab = ({ personId, tabData, setTabData }) => {
  const [period, setPeriod] = useState('7d');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRanking();
  }, [personId, period]);

  const fetchRanking = async () => {
    const key = `ranking_${period}`;
    if (tabData[key]) { setData(tabData[key]); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/streamer/${personId}/ranking?period=${period}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setTabData(prev => ({ ...prev, [key]: json.data }));
      }
    } catch (e) { /* ignore */ }
    setLoading(false);
  };

  if (loading) return <div className="streamer-tab-loading"><RefreshCw size={20} className="spinning" /> 랭킹 로딩중...</div>;
  if (!data) return <div className="streamer-tab-empty"><Trophy size={28} /> 랭킹 데이터가 없습니다</div>;

  const getPercentileClass = (pct) => {
    if (pct <= 10) return 'top10';
    if (pct <= 30) return 'top30';
    return 'normal';
  };

  const rankings = [
    { label: '최고 시청자 순위', rank: data.peakRank, total: data.totalStreamers, icon: 'gold' },
    { label: '평균 시청자 순위', rank: data.avgRank, total: data.totalStreamers, icon: 'silver' },
    { label: '방송시간 순위', rank: data.durationRank, total: data.totalStreamers, icon: 'bronze' },
  ];

  return (
    <>
      <div className="streamer-period-tabs">
        <button className={period === '7d' ? 'active' : ''} onClick={() => setPeriod('7d')}>7일</button>
        <button className={period === '30d' ? 'active' : ''} onClick={() => setPeriod('30d')}>30일</button>
      </div>

      <div className="streamer-ranking-grid">
        {rankings.map((r, i) => {
          const pct = r.total > 0 ? Math.round((r.rank / r.total) * 100) : 100;
          return (
            <div key={i} className="streamer-ranking-card">
              <div className={`streamer-ranking-card__icon ${r.icon}`}>
                {i === 0 ? <Crown size={24} /> : i === 1 ? <Users size={24} /> : <Clock size={24} />}
              </div>
              <div className="streamer-ranking-card__rank">{r.rank || '-'}위</div>
              <div className="streamer-ranking-card__label">{r.label}</div>
              <div className="streamer-ranking-card__detail">전체 {r.total}명 중</div>
              <span className={`streamer-ranking-card__percentile ${getPercentileClass(pct)}`}>
                상위 {pct}%
              </span>
            </div>
          );
        })}
      </div>

      {/* Stats detail */}
      {data.stats && (
        <div className="streamer-chart-container">
          <h3><BarChart3 size={18} /> 기간 내 상세 수치</h3>
          <div className="streamer-stats-grid">
            <div className="streamer-stat-card">
              <div className="streamer-stat-card__content">
                <div className="streamer-stat-card__value">{formatCompactKo(data.stats.peak_viewers)}</div>
                <div className="streamer-stat-card__label">최고 시청자</div>
              </div>
            </div>
            <div className="streamer-stat-card">
              <div className="streamer-stat-card__content">
                <div className="streamer-stat-card__value">{formatCompactKo(data.stats.avg_viewers)}</div>
                <div className="streamer-stat-card__label">평균 시청자</div>
              </div>
            </div>
            <div className="streamer-stat-card">
              <div className="streamer-stat-card__content">
                <div className="streamer-stat-card__value">{formatMinutes(data.stats.total_minutes)}</div>
                <div className="streamer-stat-card__label">방송시간</div>
              </div>
            </div>
            <div className="streamer-stat-card">
              <div className="streamer-stat-card__content">
                <div className="streamer-stat-card__value">{data.stats.broadcast_count}회</div>
                <div className="streamer-stat-card__label">방송수</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ===================== BROADCASTS TAB =====================
const BroadcastsTab = ({ personId, tabData, setTabData, onSelectBroadcast }) => {
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const limit = 20;

  useEffect(() => {
    fetchBroadcasts();
  }, [personId, page]);

  const fetchBroadcasts = async () => {
    const key = `broadcasts_${page}`;
    if (tabData[key]) { setData(tabData[key]); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/streamer/${personId}/broadcasts?page=${page}&limit=${limit}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setTabData(prev => ({ ...prev, [key]: json.data }));
      }
    } catch (e) { /* ignore */ }
    setLoading(false);
  };

  if (loading) return <div className="streamer-tab-loading"><RefreshCw size={20} className="spinning" /> 방송기록 로딩중...</div>;
  if (!data || !data.broadcasts || data.broadcasts.length === 0) {
    return <div className="streamer-tab-empty"><Monitor size={28} /> 방송 기록이 없습니다</div>;
  }

  return (
    <>
      <div className="streamer-data-table">
        <div className="streamer-data-table__header broadcasts-table-grid">
          <span>날짜</span><span>제목</span><span>카테고리</span><span>시간</span><span>최고</span><span>평균</span>
        </div>
        <div className="streamer-data-table__body">
          {data.broadcasts.map((row) => (
            <div
              key={row.id}
              className="streamer-data-table__row broadcasts-table-grid clickable"
              onClick={() => onSelectBroadcast(row.id)}
              title="클릭하여 구간분석 보기"
            >
              <span>{formatDate(row.started_at)}</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {row.title || '(제목 없음)'}
                {row.is_live ? <span style={{ color: '#ef4444', marginLeft: 6, fontSize: 11 }}>LIVE</span> : null}
              </span>
              <span>{row.category_name || '-'}</span>
              <span>{formatMinutes(row.duration_minutes)}</span>
              <span>{formatCompactKo(row.peak_viewer_count)}</span>
              <span>{formatCompactKo(row.avg_viewer_count)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination */}
      <div className="streamer-pagination">
        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
          <ChevronLeft size={14} /> 이전
        </button>
        <span>{page} / {Math.ceil((data.total || 1) / limit)}</span>
        <button disabled={!data.broadcasts || data.broadcasts.length < limit} onClick={() => setPage(p => p + 1)}>
          다음 <ChevronRight size={14} />
        </button>
      </div>
    </>
  );
};

// ===================== SEGMENTS TAB =====================
const SegmentsTab = ({ personId, tabData, setTabData }) => {
  const [broadcastId, setBroadcastId] = useState(tabData.selectedBroadcastId || null);
  const [broadcasts, setBroadcasts] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch recent broadcasts for dropdown
  useEffect(() => {
    const fetchList = async () => {
      const key = 'broadcasts_1';
      if (tabData[key]) {
        setBroadcasts(tabData[key].broadcasts || []);
        if (!broadcastId && tabData[key].broadcasts?.length > 0) {
          setBroadcastId(tabData[key].broadcasts[0].id);
        }
        return;
      }
      try {
        const res = await fetch(`${API_URL}/api/streamer/${personId}/broadcasts?page=1&limit=20`);
        const json = await res.json();
        if (json.success) {
          setBroadcasts(json.data.broadcasts || []);
          setTabData(prev => ({ ...prev, [key]: json.data }));
          if (!broadcastId && json.data.broadcasts?.length > 0) {
            setBroadcastId(json.data.broadcasts[0].id);
          }
        }
      } catch (e) { /* ignore */ }
    };
    fetchList();
  }, [personId]);

  // Fetch segments for selected broadcast
  useEffect(() => {
    if (!broadcastId) return;
    const fetchSegments = async () => {
      const key = `segments_${broadcastId}`;
      if (tabData[key]) { setData(tabData[key]); return; }
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/streamer/${personId}/broadcasts/${broadcastId}/segments`);
        const json = await res.json();
        if (json.success) {
          setData(json.data);
          setTabData(prev => ({ ...prev, [key]: json.data }));
        }
      } catch (e) { /* ignore */ }
      setLoading(false);
    };
    fetchSegments();
  }, [broadcastId]);

  return (
    <>
      {/* Broadcast Selector */}
      <div className="streamer-segment-select">
        <label>방송 선택:</label>
        <select
          value={broadcastId || ''}
          onChange={(e) => { setBroadcastId(Number(e.target.value)); setData(null); }}
        >
          {!broadcasts ? (
            <option>로딩중...</option>
          ) : broadcasts.length === 0 ? (
            <option>방송 기록 없음</option>
          ) : broadcasts.map(b => (
            <option key={b.id} value={b.id}>
              {formatDate(b.started_at)} - {b.title || '(제목 없음)'} ({formatCompactKo(b.peak_viewer_count)}명)
            </option>
          ))}
        </select>
      </div>

      {loading && <div className="streamer-tab-loading"><RefreshCw size={20} className="spinning" /> 구간 분석 로딩중...</div>}

      {!loading && data && (
        <>
          {/* Timeline Chart */}
          {data.snapshots && data.snapshots.length > 0 && (
            <div className="streamer-chart-container">
              <h3><BarChart3 size={18} /> 시청자 타임라인</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data.snapshots}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                  <XAxis
                    dataKey="snapshot_at"
                    tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                    tickFormatter={(v) => {
                      const d = new Date(v);
                      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                    }}
                  />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={v => formatCompactKo(v)} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 8, fontSize: 12 }}
                    formatter={(v, name) => [
                      name === 'viewer_count' ? formatFullNumber(v) : v,
                      name === 'viewer_count' ? '시청자' : '채팅/분'
                    ]}
                    labelFormatter={v => {
                      const d = new Date(v);
                      return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
                    }}
                  />
                  <Legend formatter={v => v === 'viewer_count' ? '시청자수' : '채팅속도'} />
                  <Area yAxisId="left" type="monotone" dataKey="viewer_count" fill="rgba(59, 130, 246, 0.15)" stroke="#3b82f6" strokeWidth={2} />
                  <Line yAxisId="right" type="monotone" dataKey="chat_rate_per_minute" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Segments Table */}
          {data.segments && data.segments.length > 0 && (
            <div className="streamer-data-table">
              <div className="streamer-data-table__header segments-table-grid">
                <span>카테고리</span><span>구간</span><span>최고</span><span>평균</span>
              </div>
              <div className="streamer-data-table__body">
                {data.segments.map((seg, i) => (
                  <div key={i} className="streamer-data-table__row segments-table-grid">
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{seg.display_category || seg.category_name || '기타'}</span>
                    <span>{formatDate(seg.segment_started_at)} ~ {seg.segment_ended_at ? formatDate(seg.segment_ended_at) : '진행중'}</span>
                    <span>{formatCompactKo(seg.peak_viewer_count)}</span>
                    <span>{formatCompactKo(seg.avg_viewer_count)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(!data.segments || data.segments.length === 0) && (!data.snapshots || data.snapshots.length === 0) && (
            <div className="streamer-tab-empty"><Play size={28} /> 구간 데이터가 없습니다</div>
          )}
        </>
      )}

      {!loading && !data && broadcastId && (
        <div className="streamer-tab-empty"><Play size={28} /> 방송을 선택해주세요</div>
      )}
    </>
  );
};

export default StreamerDetail;
