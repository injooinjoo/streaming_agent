import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Clock, Users, TrendingUp, DollarSign, RefreshCw, LogIn, Monitor, Gamepad2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../shared/LoadingSpinner';
import { API_URL } from '../../config/api';
import './ViewershipDashboard.css';

const ViewershipDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('viewers'); // viewers | channels | chats
  const [realtimeSummary, setRealtimeSummary] = useState(null);
  const [realtimeTrend, setRealtimeTrend] = useState([]);
  const [yesterdaySummary, setYesterdaySummary] = useState({
    date: '-',
    startTime: '-',
    endTime: '-',
    duration: '데이터 없음',
    avgViewers: 0,
    peakViewers: 0,
    chatCount: 0,
    donationAmount: 0,
    donationCount: 0
  });
  const [viewerTrend, setViewerTrend] = useState([]);
  const [categories, setCategories] = useState([]);
  const [authError, setAuthError] = useState(false);

  const { isAuthenticated, accessToken, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return; // Wait for auth to finish loading
    if (isAuthenticated) {
      fetchData();
    } else {
      setLoading(false);
      setAuthError(true);
    }
  }, [isAuthenticated, authLoading]);

  // Fetch trend data when tab changes
  useEffect(() => {
    if (isAuthenticated && !loading) {
      fetchRealtimeTrend(activeTab);
    }
  }, [activeTab]);

  const fetchRealtimeTrend = async (type = 'viewers') => {
    const headers = {
      'Content-Type': 'application/json',
      ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
    };
    try {
      const res = await fetch(`${API_URL}/api/stats/realtime/trend?type=${type}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setRealtimeTrend(data);
      }
    } catch (err) {
      console.error('Failed to fetch realtime trend:', err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setAuthError(false);

    const headers = {
      'Content-Type': 'application/json',
      ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
    };

    try {
      const [yesterdayRes, trendRes, categoriesRes, realtimeSummaryRes, realtimeTrendRes] = await Promise.all([
        fetch(`${API_URL}/api/stats/yesterday`, { headers }),
        fetch(`${API_URL}/api/stats/hourly-by-platform`, { headers }),
        fetch(`${API_URL}/api/categories?limit=10`, { headers }),
        fetch(`${API_URL}/api/stats/realtime/summary`, { headers }),
        fetch(`${API_URL}/api/stats/realtime/trend?type=${activeTab}`, { headers })
      ]);

      // Check if any request requires auth
      if ([yesterdayRes, trendRes].some(res => res.status === 401)) {
        setAuthError(true);
        setLoading(false);
        return;
      }

      const [yesterday, trend, categoriesData, realtimeSummaryData, realtimeTrendData] = await Promise.all([
        yesterdayRes.ok ? yesterdayRes.json() : {},
        trendRes.ok ? trendRes.json() : [],
        categoriesRes.ok ? categoriesRes.json() : { data: [] },
        realtimeSummaryRes.ok ? realtimeSummaryRes.json() : null,
        realtimeTrendRes.ok ? realtimeTrendRes.json() : []
      ]);

      if (yesterday && yesterday.date) {
        setYesterdaySummary(prev => ({ ...prev, ...yesterday }));
      }
      setViewerTrend(trend);
      setCategories(categoriesData.data || []);
      setRealtimeSummary(realtimeSummaryData);
      setRealtimeTrend(realtimeTrendData);
    } catch (err) {
      console.error('Failed to fetch viewership data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPlatformLogo = (platform) => {
    const logos = {
      soop: '/assets/logos/soop.png',
      chzzk: '/assets/logos/chzzk.png',
      twitch: '/assets/logos/twitch.png',
      youtube: '/assets/logos/youtube.png'
    };
    return logos[platform] || null;
  };

  const formatNumber = (num) => {
    if (num >= 10000) {
      return `${(num / 10000).toFixed(1)}만`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}천`;
    }
    return num.toLocaleString();
  };

  const now = new Date();
  const updateTime = `수집 | ${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} (${['일', '월', '화', '수', '목', '금', '토'][now.getDay()]}) ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  if (loading) {
    return (
      <div className="viewership-dashboard analytics-page">
        <LoadingSpinner fullHeight />
      </div>
    );
  }

  if (authError || !isAuthenticated) {
    return (
      <div className="viewership-dashboard analytics-page">
        <div className="auth-required-container" style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '400px',
          gap: '16px',
          color: 'var(--text-muted)'
        }}>
          <LogIn size={48} />
          <h2 style={{ margin: 0, color: 'var(--text-main)' }}>로그인이 필요합니다</h2>
          <p style={{ margin: 0 }}>시장 현황을 확인하려면 로그인하세요.</p>
          <button
            onClick={() => navigate('/login')}
            style={{
              marginTop: '8px',
              padding: '12px 24px',
              background: 'var(--primary)',
              color: 'var(--text-on-primary)',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <LogIn size={16} /> 로그인
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="viewership-dashboard analytics-page">
      <header className="page-header">
        <div className="page-title">
          <h1>시장 현황</h1>
          <p>SOOP, 치지직, 트위치 한국어 전체 시청자 수를 실시간으로 확인하세요.</p>
        </div>
        <button className="btn-outline" onClick={fetchData} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <RefreshCw size={16} /> 새로고침
        </button>
      </header>

      {/* 실시간 대시보드 섹션 */}
      <section className="realtime-dashboard-section">
        {/* 왼쪽: 차트 */}
        <div className="realtime-chart-card">
          <div className="realtime-chart-header">
            <div className="realtime-chart-title">
              <Monitor size={18} />
              실시간 시청자 데이터
            </div>
            <div className="realtime-chart-subtitle">
              SOOP, 치지직, 트위치 한국어 전체 시청자 수
            </div>
            <div className="realtime-tabs">
              <button
                className={activeTab === 'viewers' ? 'active' : ''}
                onClick={() => setActiveTab('viewers')}
              >
                시청자
              </button>
              <button
                className={activeTab === 'channels' ? 'active' : ''}
                onClick={() => setActiveTab('channels')}
              >
                채널
              </button>
              <button
                className={activeTab === 'chats' ? 'active' : ''}
                onClick={() => setActiveTab('chats')}
              >
                채팅
              </button>
            </div>
          </div>
          {realtimeTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={realtimeTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={12} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px'
                  }}
                  formatter={(value, name) => [(value || 0).toLocaleString(), name === 'chzzk' ? '치지직' : name === 'soop' ? 'SOOP' : '트위치']}
                />
                <Line type="monotone" dataKey="chzzk" stroke="#00ffa3" strokeWidth={2} dot={false} name="chzzk" />
                <Line type="monotone" dataKey="soop" stroke="#3b82f6" strokeWidth={2} dot={false} name="soop" />
                <Line type="monotone" dataKey="twitch" stroke="#9146ff" strokeWidth={2} dot={false} name="twitch" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '280px', color: '#94a3b8' }}>
              실시간 데이터가 없습니다
            </div>
          )}
        </div>

        {/* 오른쪽: 랭킹 */}
        <div className="realtime-ranking-card">
          <div className="realtime-ranking-header">
            <Monitor size={18} />
            실시간 플랫폼 랭킹
          </div>
          <div className="realtime-ranking-subtitle">
            SOOP, 치지직, 트위치 한국어 전체 시청자 수
          </div>
          <div className="realtime-total-viewers sensitive-blur">
            {(realtimeSummary?.totalViewers || 0).toLocaleString()}
          </div>
          <div className="realtime-platform-list">
            {realtimeSummary?.platforms?.length > 0 ? realtimeSummary.platforms.map((platform, index) => (
              <div key={platform.platform} className="realtime-platform-item">
                <div className={`realtime-platform-rank rank-${index + 1}`}>
                  {index + 1}
                </div>
                <img
                  src={getPlatformLogo(platform.platform)}
                  alt={platform.name}
                  className="realtime-platform-logo"
                />
                <div className="realtime-platform-info">
                  <div className="realtime-platform-name">{platform.name}</div>
                  <div className="realtime-platform-channels">{(platform.channels || 0).toLocaleString()} 채널</div>
                </div>
                <div className="realtime-platform-viewers">
                  <div>
                    <span className="realtime-viewers-value sensitive-blur">{(platform.viewers || 0).toLocaleString()}</span>
                    <span className="realtime-viewers-unit">명</span>
                  </div>
                  <div className="realtime-platform-peak">최고 <span className="sensitive-blur">{(platform.peak || 0).toLocaleString()}</span>명</div>
                </div>
              </div>
            )) : (
              <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                플랫폼 데이터가 없습니다
              </div>
            )}
          </div>
          <div className="realtime-update-time">
            {updateTime}
          </div>
        </div>
      </section>

      {/* 어제 방송 요약 */}
      <div className="yesterday-summary-section">
        <div className="section-title">
          <Clock size={18} />
          어제 방송 요약 ({yesterdaySummary.date})
        </div>
        <div className="yesterday-summary-grid">
          <div className="summary-card">
            <div className="summary-card-icon time">
              <Clock size={20} />
            </div>
            <div className="summary-card-label">활동 시간</div>
            <div className="summary-card-value">{yesterdaySummary.duration}</div>
            <div className="summary-card-sub">{yesterdaySummary.startTime} ~ {yesterdaySummary.endTime}</div>
          </div>
          <div className="summary-card">
            <div className="summary-card-icon viewers">
              <Users size={20} />
            </div>
            <div className="summary-card-label">참여자</div>
            <div className="summary-card-value sensitive-blur">{(yesterdaySummary.avgViewers || 0).toLocaleString()}명</div>
            <div className="summary-card-sub">채팅 <span className="sensitive-blur">{(yesterdaySummary.chatCount || 0).toLocaleString()}</span>개</div>
          </div>
          <div className="summary-card">
            <div className="summary-card-icon peak">
              <TrendingUp size={20} />
            </div>
            <div className="summary-card-label">후원 건수</div>
            <div className="summary-card-value sensitive-blur">{(yesterdaySummary.donationCount || 0).toLocaleString()}건</div>
            <div className="summary-card-sub">어제 기준</div>
          </div>
          <div className="summary-card">
            <div className="summary-card-icon donation">
              <DollarSign size={20} />
            </div>
            <div className="summary-card-label">후원 금액</div>
            <div className="summary-card-value sensitive-blur">₩{(yesterdaySummary.donationAmount || 0).toLocaleString()}</div>
            <div className="summary-card-sub"><span className="sensitive-blur">{(yesterdaySummary.donationCount || 0)}</span>건의 후원</div>
          </div>
        </div>
      </div>

      {/* 24시간 활동 트렌드 */}
      <div className="trend-chart-section">
        <div className="trend-chart-card">
          <div className="trend-chart-header">
            <div className="trend-chart-title">24시간 활동 데이터</div>
            <div className="trend-chart-legend">
              <div className="legend-item">
                <span className="legend-dot chzzk"></span>
                치지직
              </div>
              <div className="legend-item">
                <span className="legend-dot soop"></span>
                SOOP
              </div>
            </div>
          </div>
          {viewerTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={viewerTrend}>
                <defs>
                  <linearGradient id="colorChzzk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00ffa3" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00ffa3" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSoop" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={12} />
                <YAxis stroke="var(--text-muted)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px'
                  }}
                  formatter={(value) => [`${(value || 0).toLocaleString()}`, '']}
                />
                <Area
                  type="monotone"
                  dataKey="chzzk"
                  stroke="#00ffa3"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorChzzk)"
                  name="치지직"
                />
                <Area
                  type="monotone"
                  dataKey="soop"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorSoop)"
                  name="SOOP"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: '#94a3b8' }}>
              활동 데이터가 없습니다
            </div>
          )}
        </div>
      </div>

      {/* 인기 카테고리 */}
      <div className="categories-section">
        <div className="section-title">
          <Gamepad2 size={18} />
          인기 카테고리
        </div>
        <div className="categories-grid">
          {categories.length > 0 ? categories.slice(0, 10).map((category, index) => (
            <div key={category.id} className="category-card" onClick={() => navigate(`/game-catalog/${category.id}`)}>
              <div className="category-rank">{index + 1}</div>
              <div className="category-image">
                {category.imageUrl ? (
                  <img src={category.imageUrl} alt={category.nameKr || category.name} />
                ) : (
                  <div className="category-placeholder">
                    <Gamepad2 size={24} />
                  </div>
                )}
              </div>
              <div className="category-info">
                <div className="category-name">{category.nameKr || category.name}</div>
                <div className="category-stats">
                  <span className="category-viewers">
                    <Users size={14} />
                    {formatNumber(category.totalViewers || 0)}
                  </span>
                  <div className="category-platforms">
                    {category.platforms?.includes('soop') && (
                      <img src="/assets/logos/soop.png" alt="SOOP" />
                    )}
                    {category.platforms?.includes('chzzk') && (
                      <img src="/assets/logos/chzzk.png" alt="Chzzk" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )) : (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', gridColumn: '1 / -1' }}>
              카테고리 데이터가 없습니다
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewershipDashboard;
