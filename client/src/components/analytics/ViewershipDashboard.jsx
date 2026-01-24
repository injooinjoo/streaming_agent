import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Activity, Clock, Users, TrendingUp, DollarSign, Heart, UserPlus, Gift, RefreshCw, LogIn, Monitor } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './ViewershipDashboard.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const ViewershipDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [platformStats, setPlatformStats] = useState({ platforms: [] });
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
  const [recentActivity, setRecentActivity] = useState([]);
  const [authError, setAuthError] = useState(false);

  const { isAuthenticated, accessToken } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    } else {
      setLoading(false);
      setAuthError(true);
    }
  }, [isAuthenticated]);

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
      const res = await fetch(`${API_BASE}/api/stats/realtime/trend?type=${type}`, { headers });
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
      const [platformRes, yesterdayRes, trendRes, activityRes, realtimeSummaryRes, realtimeTrendRes] = await Promise.all([
        fetch(`${API_BASE}/api/stats/platforms`, { headers }),
        fetch(`${API_BASE}/api/stats/yesterday`, { headers }),
        fetch(`${API_BASE}/api/stats/hourly-by-platform`, { headers }),
        fetch(`${API_BASE}/api/stats/activity/recent?limit=10`, { headers }),
        fetch(`${API_BASE}/api/stats/realtime/summary`, { headers }),
        fetch(`${API_BASE}/api/stats/realtime/trend?type=${activeTab}`, { headers })
      ]);

      // Check if any request requires auth
      if ([platformRes, yesterdayRes, trendRes, activityRes].some(res => res.status === 401)) {
        setAuthError(true);
        setLoading(false);
        return;
      }

      const [platforms, yesterday, trend, activity, realtimeSummaryData, realtimeTrendData] = await Promise.all([
        platformRes.ok ? platformRes.json() : { platforms: [] },
        yesterdayRes.ok ? yesterdayRes.json() : {},
        trendRes.ok ? trendRes.json() : [],
        activityRes.ok ? activityRes.json() : [],
        realtimeSummaryRes.ok ? realtimeSummaryRes.json() : null,
        realtimeTrendRes.ok ? realtimeTrendRes.json() : []
      ]);

      // Transform platform data for ranking display
      const platformRanking = (platforms.platforms || []).map(p => ({
        platform: p.platform,
        name: p.platform === 'soop' ? 'SOOP' : p.platform === 'chzzk' ? '치지직' : p.platform,
        viewers: p.total_events || 0,
        channels: 1,
        peak: p.donation_amount || 0,
        donations: p.donations || 0,
        chats: p.chats || 0
      })).sort((a, b) => b.viewers - a.viewers);

      setPlatformStats({ platforms: platformRanking });
      setYesterdaySummary(yesterday);
      setViewerTrend(trend);
      setRecentActivity(activity);
      setRealtimeSummary(realtimeSummaryData);
      setRealtimeTrend(realtimeTrendData);
    } catch (err) {
      console.error('Failed to fetch viewership data:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalEvents = platformStats.platforms.reduce((sum, p) => sum + p.viewers, 0);

  const getPlatformLogo = (platform) => {
    const logos = {
      soop: '/assets/logos/soop.png',
      chzzk: '/assets/logos/chzzk.png',
      twitch: '/assets/logos/twitch.png',
      youtube: '/assets/logos/youtube.png'
    };
    return logos[platform] || null;
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'donation': return <Gift size={16} />;
      case 'subscribe': return <Heart size={16} />;
      case 'follow': return <UserPlus size={16} />;
      default: return <Activity size={16} />;
    }
  };

  const getActivityText = (activity) => {
    switch (activity.type) {
      case 'donation':
        return `${activity.user}님이 ₩${(activity.amount || 0).toLocaleString()} 후원`;
      case 'subscribe':
        return `${activity.user}님이 구독`;
      case 'follow':
        return `${activity.user}님이 팔로우`;
      default:
        return `${activity.user}님`;
    }
  };

  const now = new Date();
  const updateTime = `수집 | ${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} (${['일', '월', '화', '수', '목', '금', '토'][now.getDay()]}) ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  if (loading) {
    return (
      <div className="viewership-dashboard analytics-page">
        <div className="loading-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <RefreshCw className="animate-spin" size={32} />
          <span style={{ marginLeft: '12px' }}>불러오는 중...</span>
        </div>
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
                  formatter={(value, name) => [value.toLocaleString(), name === 'chzzk' ? '치지직' : name === 'soop' ? 'SOOP' : '트위치']}
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
                  <div className="realtime-platform-channels">{platform.channels.toLocaleString()} 채널</div>
                </div>
                <div className="realtime-platform-viewers">
                  <div>
                    <span className="realtime-viewers-value sensitive-blur">{platform.viewers.toLocaleString()}</span>
                    <span className="realtime-viewers-unit">명</span>
                  </div>
                  <div className="realtime-platform-peak">최고 <span className="sensitive-blur">{platform.peak.toLocaleString()}</span>명</div>
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

      {/* 플랫폼 랭킹 섹션 */}
      <div className="viewership-header-section">
        <div className="viewership-total-card">
          <div className="viewership-total-label">
            <Activity size={16} />
            플랫폼 활동 현황
          </div>
          <div className="viewership-total-value sensitive-blur">
            {totalEvents.toLocaleString()}
          </div>
          <div className="viewership-total-unit">
            전체 플랫폼 총 이벤트 수
          </div>
          <div className="viewership-update-time">
            {updateTime}
          </div>
        </div>

        <div className="platform-ranking-card">
          <div className="platform-ranking-title">
            <TrendingUp size={18} />
            플랫폼별 활동
          </div>
          <div className="platform-ranking-list">
            {platformStats.platforms.length > 0 ? platformStats.platforms.map((platform, index) => (
              <div key={platform.platform} className="platform-ranking-item">
                <div className={`platform-rank rank-${index + 1}`}>
                  {index + 1}
                </div>
                <img
                  src={getPlatformLogo(platform.platform)}
                  alt={platform.name}
                  className="platform-logo"
                />
                <div className="platform-info">
                  <div className="platform-name">{platform.name}</div>
                  <div className="platform-channels">채팅 <span className="sensitive-blur">{platform.chats.toLocaleString()}</span>개</div>
                </div>
                <div className="platform-viewers">
                  <div>
                    <span className="platform-viewers-value sensitive-blur">{platform.viewers.toLocaleString()}</span>
                    <span className="platform-viewers-unit">이벤트</span>
                  </div>
                  <div className="platform-peak">후원 <span className="sensitive-blur">{platform.donations}</span>건</div>
                </div>
              </div>
            )) : (
              <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                플랫폼 데이터가 없습니다
              </div>
            )}
          </div>
        </div>
      </div>

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
            <div className="summary-card-value sensitive-blur">{yesterdaySummary.avgViewers.toLocaleString()}명</div>
            <div className="summary-card-sub">채팅 <span className="sensitive-blur">{yesterdaySummary.chatCount.toLocaleString()}</span>개</div>
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
            <div className="summary-card-value sensitive-blur">₩{yesterdaySummary.donationAmount.toLocaleString()}</div>
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
                  formatter={(value) => [`${value.toLocaleString()}`, '']}
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

      {/* 최근 활동 피드 */}
      <div className="activity-feed-section">
        <div className="section-title">
          <Activity size={18} />
          최근 활동
        </div>
        <div className="activity-feed-card">
          <div className="activity-feed-list">
            {recentActivity.length > 0 ? recentActivity.map((activity) => (
              <div key={activity.id} className={`activity-feed-item ${activity.type}`}>
                <img
                  src={getPlatformLogo(activity.platform)}
                  alt={activity.platform}
                  className="activity-platform-logo"
                />
                <div className="activity-content">
                  <div className="activity-user">
                    {getActivityIcon(activity.type)}
                    {' '}
                    {getActivityText(activity)}
                  </div>
                  {activity.message && (
                    <div className="activity-message">{activity.message}</div>
                  )}
                </div>
                <div className="activity-time">{activity.time}</div>
                {activity.amount > 0 && (
                  <div className="activity-amount sensitive-blur">₩{activity.amount.toLocaleString()}</div>
                )}
              </div>
            )) : (
              <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                최근 활동 데이터가 없습니다
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewershipDashboard;
