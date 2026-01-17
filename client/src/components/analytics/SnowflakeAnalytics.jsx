import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts';
import {
  Activity, TrendingUp, DollarSign, Users, MessageCircle,
  RefreshCw, Database, Server, Clock, Gift, Heart, UserPlus,
  ChevronDown, Calendar, Zap
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import './SnowflakeAnalytics.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// 플랫폼 색상
const PLATFORM_COLORS = {
  soop: '#3b82f6',
  chzzk: '#00ffa3',
  youtube: '#ff0000',
  twitch: '#9146ff'
};

const CHART_COLORS = ['#3b82f6', '#00ffa3', '#ff0000', '#9146ff', '#f59e0b', '#ec4899'];

const SnowflakeAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [snowflakeStatus, setSnowflakeStatus] = useState({ connected: false });
  const [donationStats, setDonationStats] = useState([]);
  const [topDonors, setTopDonors] = useState([]);
  const [viewerHistory, setViewerHistory] = useState([]);
  const [chatActivity, setChatActivity] = useState([]);
  const [engagementData, setEngagementData] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);
  const [dateRange, setDateRange] = useState('7d');
  const [selectedPlatform, setSelectedPlatform] = useState('all');

  const { accessToken } = useAuth();

  useEffect(() => {
    fetchAllData();
  }, [dateRange, selectedPlatform]);

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
  });

  const getDateRange = () => {
    const end = new Date().toISOString();
    const start = new Date();

    switch (dateRange) {
      case '1d':
        start.setDate(start.getDate() - 1);
        break;
      case '7d':
        start.setDate(start.getDate() - 7);
        break;
      case '30d':
        start.setDate(start.getDate() - 30);
        break;
      case '90d':
        start.setDate(start.getDate() - 90);
        break;
      default:
        start.setDate(start.getDate() - 7);
    }

    return { start: start.toISOString(), end };
  };

  const fetchAllData = async () => {
    setLoading(true);
    const headers = getAuthHeaders();
    const { start, end } = getDateRange();

    try {
      // Fetch Snowflake status
      const statusRes = await fetch(`${API_BASE}/api/analytics/status`, { headers });
      if (statusRes.ok) {
        const status = await statusRes.json();
        setSnowflakeStatus(status);
      }

      // Fetch donation stats
      const donationsRes = await fetch(
        `${API_BASE}/api/analytics/donations?start=${start}&end=${end}`,
        { headers }
      );
      if (donationsRes.ok) {
        const donations = await donationsRes.json();
        setDonationStats(donations.map(d => ({
          ...d,
          date: new Date(d.DATE).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
        })));
      }

      // Fetch top donors
      const topDonorsRes = await fetch(
        `${API_BASE}/api/analytics/top-donors?start=${start}&end=${end}&limit=10`,
        { headers }
      );
      if (topDonorsRes.ok) {
        const donors = await topDonorsRes.json();
        setTopDonors(donors);
      }

      // Fetch chat activity
      const chatRes = await fetch(
        `${API_BASE}/api/analytics/chat-activity?platform=${selectedPlatform === 'all' ? '' : selectedPlatform}&minutes=60`,
        { headers }
      );
      if (chatRes.ok) {
        const chat = await chatRes.json();
        setChatActivity(chat.map(c => ({
          ...c,
          time: new Date(c.MINUTE).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
        })));
      }

      // Fetch engagement data
      const engagementRes = await fetch(
        `${API_BASE}/api/analytics/engagement?platform=${selectedPlatform === 'all' ? '' : selectedPlatform}&hours=24`,
        { headers }
      );
      if (engagementRes.ok) {
        const engagement = await engagementRes.json();
        setEngagementData(engagement.map(e => ({
          ...e,
          hour: new Date(e.HOUR).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
        })));
      }

      // Fetch recent events
      const eventsRes = await fetch(
        `${API_BASE}/api/analytics/events?limit=20`,
        { headers }
      );
      if (eventsRes.ok) {
        const events = await eventsRes.json();
        setRecentEvents(events);
      }

    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate summary stats
  const totalDonations = donationStats.reduce((sum, d) => sum + (d.TOTAL_AMOUNT || 0), 0);
  const totalDonationCount = donationStats.reduce((sum, d) => sum + (d.DONATION_COUNT || 0), 0);
  const uniqueDonors = new Set(topDonors.map(d => d.USER_NICKNAME)).size;

  const getPlatformLogo = (platform) => {
    const logos = {
      soop: '/assets/logos/soop.png',
      chzzk: '/assets/logos/chzzk.png',
      youtube: '/assets/logos/youtube.png',
      twitch: '/assets/logos/twitch.png'
    };
    return logos[platform?.toLowerCase()] || null;
  };

  const getEventIcon = (type) => {
    switch (type) {
      case 'donation': return <Gift size={14} />;
      case 'subscribe': return <Heart size={14} />;
      case 'follow': return <UserPlus size={14} />;
      case 'chat': return <MessageCircle size={14} />;
      default: return <Activity size={14} />;
    }
  };

  if (loading) {
    return (
      <div className="snowflake-analytics">
        <div className="loading-container">
          <RefreshCw className="animate-spin" size={32} />
          <span>Snowflake 데이터를 불러오는 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="snowflake-analytics">
      {/* Header */}
      <header className="analytics-header">
        <div className="header-left">
          <h1>
            <Database size={28} />
            Snowflake Analytics
          </h1>
          <div className={`connection-status ${snowflakeStatus.connected ? 'connected' : 'disconnected'}`}>
            <Server size={14} />
            {snowflakeStatus.connected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
        <div className="header-controls">
          <select
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            className="platform-select"
          >
            <option value="all">전체 플랫폼</option>
            <option value="soop">SOOP</option>
            <option value="chzzk">치지직</option>
            <option value="youtube">YouTube</option>
            <option value="twitch">Twitch</option>
          </select>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="date-select"
          >
            <option value="1d">오늘</option>
            <option value="7d">최근 7일</option>
            <option value="30d">최근 30일</option>
            <option value="90d">최근 90일</option>
          </select>
          <button className="refresh-btn" onClick={fetchAllData}>
            <RefreshCw size={16} />
            새로고침
          </button>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card donations">
          <div className="card-icon">
            <DollarSign size={24} />
          </div>
          <div className="card-content">
            <div className="card-label">총 후원 금액</div>
            <div className="card-value">₩{totalDonations.toLocaleString()}</div>
            <div className="card-sub">{totalDonationCount}건의 후원</div>
          </div>
        </div>
        <div className="summary-card donors">
          <div className="card-icon">
            <Users size={24} />
          </div>
          <div className="card-content">
            <div className="card-label">후원자 수</div>
            <div className="card-value">{uniqueDonors.toLocaleString()}</div>
            <div className="card-sub">순 후원자</div>
          </div>
        </div>
        <div className="summary-card messages">
          <div className="card-icon">
            <MessageCircle size={24} />
          </div>
          <div className="card-content">
            <div className="card-label">채팅 활동</div>
            <div className="card-value">
              {chatActivity.reduce((sum, c) => sum + (c.MESSAGE_COUNT || 0), 0).toLocaleString()}
            </div>
            <div className="card-sub">최근 1시간</div>
          </div>
        </div>
        <div className="summary-card engagement">
          <div className="card-icon">
            <Zap size={24} />
          </div>
          <div className="card-content">
            <div className="card-label">평균 참여율</div>
            <div className="card-value">
              {engagementData.length > 0
                ? (engagementData.reduce((sum, e) => sum + (e.ENGAGEMENT_RATE || 0), 0) / engagementData.length).toFixed(1)
                : 0}%
            </div>
            <div className="card-sub">채팅 참여자 / 시청자</div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-grid">
        {/* Donation Trend Chart */}
        <div className="chart-card wide">
          <div className="chart-header">
            <h3>
              <TrendingUp size={18} />
              후원 추이
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={donationStats}>
              <defs>
                <linearGradient id="donationGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} />
              <YAxis stroke="var(--text-muted)" fontSize={12} tickFormatter={(v) => `₩${(v / 1000).toFixed(0)}K`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px'
                }}
                formatter={(value) => [`₩${value.toLocaleString()}`, '후원 금액']}
              />
              <Area
                type="monotone"
                dataKey="TOTAL_AMOUNT"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#donationGradient)"
                name="후원 금액"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top Donors */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>
              <Gift size={18} />
              상위 후원자
            </h3>
          </div>
          <div className="top-donors-list">
            {topDonors.slice(0, 5).map((donor, index) => (
              <div key={`${donor.USER_NICKNAME}-${index}`} className="donor-item">
                <div className="donor-rank">{index + 1}</div>
                <img
                  src={getPlatformLogo(donor.PLATFORM)}
                  alt={donor.PLATFORM}
                  className="donor-platform"
                />
                <div className="donor-info">
                  <div className="donor-name">{donor.USER_NICKNAME}</div>
                  <div className="donor-count">{donor.DONATION_COUNT}회 후원</div>
                </div>
                <div className="donor-amount">₩{(donor.TOTAL_AMOUNT || 0).toLocaleString()}</div>
              </div>
            ))}
            {topDonors.length === 0 && (
              <div className="no-data">후원 데이터가 없습니다</div>
            )}
          </div>
        </div>

        {/* Chat Activity Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>
              <MessageCircle size={18} />
              채팅 활동 (최근 1시간)
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chatActivity.slice(-20)}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={10} />
              <YAxis stroke="var(--text-muted)" fontSize={10} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="MESSAGE_COUNT" fill="#00ffa3" name="메시지 수" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Engagement Chart */}
        <div className="chart-card wide">
          <div className="chart-header">
            <h3>
              <Zap size={18} />
              참여율 추이 (24시간)
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={engagementData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="hour" stroke="var(--text-muted)" fontSize={10} />
              <YAxis
                stroke="var(--text-muted)"
                fontSize={10}
                tickFormatter={(v) => `${v}%`}
                domain={[0, 'auto']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px'
                }}
                formatter={(value) => [`${Number(value).toFixed(1)}%`, '참여율']}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="ENGAGEMENT_RATE"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                name="참여율"
              />
              <Line
                type="monotone"
                dataKey="AVG_VIEWERS"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                name="평균 시청자"
                yAxisId={0}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Events */}
      <div className="recent-events-section">
        <div className="section-header">
          <h3>
            <Clock size={18} />
            최근 이벤트
          </h3>
        </div>
        <div className="events-list">
          {recentEvents.map((event, index) => (
            <div key={`${event.EVENT_ID}-${index}`} className={`event-item ${event.EVENT_TYPE}`}>
              <div className="event-icon">
                {getEventIcon(event.EVENT_TYPE)}
              </div>
              <img
                src={getPlatformLogo(event.PLATFORM)}
                alt={event.PLATFORM}
                className="event-platform"
              />
              <div className="event-content">
                <div className="event-user">{event.USER_NICKNAME || '익명'}</div>
                <div className="event-type">{event.EVENT_TYPE}</div>
              </div>
              {event.MESSAGE && (
                <div className="event-message">{event.MESSAGE.substring(0, 50)}{event.MESSAGE.length > 50 ? '...' : ''}</div>
              )}
              {event.AMOUNT_KRW > 0 && (
                <div className="event-amount">₩{event.AMOUNT_KRW.toLocaleString()}</div>
              )}
              <div className="event-time">
                {new Date(event.EVENT_TIMESTAMP).toLocaleTimeString('ko-KR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          ))}
          {recentEvents.length === 0 && (
            <div className="no-data">이벤트 데이터가 없습니다</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SnowflakeAnalytics;
