import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Users, Heart, Clock, TrendingUp, Download, RefreshCw, LogIn } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import AnalyticsCard from './shared/AnalyticsCard';
import TimeRangeSelector from './shared/TimeRangeSelector';
import ChartContainer from './shared/ChartContainer';
import LoadingSpinner from '../shared/LoadingSpinner';
import { API_URL } from '../../config/api';
import './AnalyticsPage.css';

const ViewerAnalytics = () => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const { user, isAuthenticated, token } = useAuth();

  // 차트 다크모드 색상
  const chartColors = {
    grid: isDark ? '#475569' : '#f0f0f0',
    border: isDark ? '#475569' : '#e2e8f0',
    tooltipBg: isDark ? '#1e293b' : '#ffffff',
    textMuted: isDark ? '#94a3b8' : '#94a3b8',
  };

  const [period, setPeriod] = useState('week');
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [summary, setSummary] = useState({
    uniqueViewers: 0,
    totalChats: 0,
    activeChannels: 0,
    activeDays: 0,
    peakHour: 'N/A',
    peakViewerCount: 0,
    peakChatCount: 0,
    peakBroadcastViewers: 0
  });
  const [hourlyData, setHourlyData] = useState([]);
  const [dayOfWeekData, setDayOfWeekData] = useState([]);
  const [activityTimeline, setActivityTimeline] = useState([]);

  const periodDays = { day: 1, week: 7, month: 30, year: 365 };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    } else {
      setLoading(false);
      setAuthError(true);
    }
  }, [period, isAuthenticated]);

  const fetchData = async () => {
    setLoading(true);
    setAuthError(false);
    const days = periodDays[period] || 7;

    // Build query params with user filter
    const params = new URLSearchParams();
    params.set('days', days.toString());
    if (user?.channelId) params.set('channelId', user.channelId);
    if (user?.platform) params.set('platform', user.platform);

    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const [summaryRes, hourlyRes, dailyRes, timelineRes] = await Promise.all([
        fetch(`${API_URL}/api/stats/chat/summary?${params}`, { headers }),
        fetch(`${API_URL}/api/stats/chat/hourly?${params}`, { headers }),
        fetch(`${API_URL}/api/stats/chat/daily?weeks=${Math.ceil(days / 7)}&${params}`, { headers }),
        fetch(`${API_URL}/api/stats/activity/timeline?${params}`, { headers })
      ]);

      const [summaryData, hourly, daily, timeline] = await Promise.all([
        summaryRes.ok ? summaryRes.json() : {},
        hourlyRes.ok ? hourlyRes.json() : [],
        dailyRes.ok ? dailyRes.json() : [],
        timelineRes.ok ? timelineRes.json() : []
      ]);

      setSummary(summaryData);

      // Transform hourly data for display - viewer activity by hour
      setHourlyData(Array.isArray(hourly) ? hourly.map(h => ({
        hour: h.hour?.replace(':00', '시') || h.hour,
        viewers: h.viewers || 0,
        chats: h.chats || 0
      })) : []);

      // Transform daily data - viewer activity by day of week
      setDayOfWeekData(Array.isArray(daily) ? daily.map(d => ({
        day: d.day,
        viewers: d.viewers || 0,
        chats: d.chats || 0
      })) : []);

      // Timeline is already in correct format
      setActivityTimeline(Array.isArray(timeline) ? timeline : []);

    } catch (err) {
      console.error('Failed to fetch viewer data:', err);
    } finally {
      setLoading(false);
    }
  };

  // 평균 채팅 수 계산
  const avgChatsPerViewer = summary.uniqueViewers > 0
    ? Math.round(summary.totalChats / summary.uniqueViewers)
    : 0;

  if (loading) {
    return (
      <div className="analytics-page">
        <LoadingSpinner fullHeight />
      </div>
    );
  }

  if (authError) {
    return (
      <div className="analytics-page">
        <div className="auth-required-message" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          gap: '16px',
          textAlign: 'center'
        }}>
          <LogIn size={48} style={{ color: 'var(--primary)', opacity: 0.7 }} />
          <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>로그인이 필요합니다</h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            시청자 분석을 확인하려면 먼저 로그인하세요.
          </p>
          <a href="/login" className="btn-primary" style={{ marginTop: '8px' }}>
            로그인하기
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      <header className="page-header">
        <div className="page-title">
          <h1>시청자 분석</h1>
          <p>내 채널의 시청자 트래픽과 참여 활동을 분석합니다.</p>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: '12px' }}>
          <TimeRangeSelector value={period} onChange={setPeriod} />
          <button className="btn-outline" onClick={fetchData}>
            <RefreshCw size={16} /> 새로고침
          </button>
          <button className="btn-outline">
            <Download size={16} /> 내보내기
          </button>
        </div>
      </header>

      {/* Key Metrics */}
      <div className="analytics-metrics-grid">
        <AnalyticsCard
          title="고유 시청자"
          value={summary.uniqueViewers?.toLocaleString() || '0'}
          change=""
          trend="neutral"
          icon={<Users size={18} />}
          subtitle={`${periodDays[period]}일 기준`}
        />
        <AnalyticsCard
          title="총 채팅 수"
          value={summary.totalChats?.toLocaleString() || '0'}
          change=""
          trend="neutral"
          icon={<TrendingUp size={18} />}
          subtitle={`인당 평균 ${(avgChatsPerViewer || 0).toLocaleString()}개`}
        />
        <AnalyticsCard
          title="피크 시간대"
          value={summary.peakHour || 'N/A'}
          change=""
          trend="neutral"
          icon={<Clock size={18} />}
          subtitle={`${summary.peakViewerCount?.toLocaleString() || 0}명 활동`}
        />
        <AnalyticsCard
          title="최고 동시 시청자"
          value={`${summary.peakBroadcastViewers?.toLocaleString() || 0}명`}
          change=""
          trend="neutral"
          icon={<Heart size={18} />}
          subtitle={`${summary.activeChannels || 0}개 채널`}
        />
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <ChartContainer
          title="시청자 활동 타임라인"
          subtitle="일별 시청자 및 채팅 활동"
          className="chart-full-width"
        >
          {activityTimeline.length > 0 ? (
            <AreaChart data={[...activityTimeline].reverse()}>
              <defs>
                <linearGradient id="viewerGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="chatGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis dataKey="date" stroke={chartColors.textMuted} fontSize={12} />
              <YAxis yAxisId="left" stroke={chartColors.textMuted} fontSize={12} />
              <YAxis yAxisId="right" orientation="right" stroke={chartColors.textMuted} fontSize={12} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: `1px solid ${chartColors.border}`, background: chartColors.tooltipBg }}
                formatter={(value, name) => [(value || 0).toLocaleString(), name]}
              />
              <Legend />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="activeViewers"
                name="시청자 수"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#viewerGradient)"
              />
              <Line yAxisId="right" type="monotone" dataKey="totalChats" name="채팅 수" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
            </AreaChart>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: '#94a3b8' }}>
              활동 데이터가 없습니다
            </div>
          )}
        </ChartContainer>

        <ChartContainer
          title="시간대별 시청자 활동"
          subtitle="시간대별 시청자 분포"
        >
          {hourlyData.some(h => h.viewers > 0) ? (
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis dataKey="hour" stroke={chartColors.textMuted} fontSize={11} interval={2} />
              <YAxis stroke={chartColors.textMuted} fontSize={12} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: `1px solid ${chartColors.border}`, background: chartColors.tooltipBg }}
                formatter={(value, name) => [(value || 0).toLocaleString(), name]}
              />
              <Bar dataKey="viewers" name="시청자 수" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: '#94a3b8' }}>
              시간대별 데이터가 없습니다
            </div>
          )}
        </ChartContainer>

        <ChartContainer
          title="요일별 시청자 활동"
          subtitle="요일별 시청자 및 채팅 비교"
        >
          {dayOfWeekData.some(d => d.viewers > 0) ? (
            <BarChart data={dayOfWeekData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis dataKey="day" stroke={chartColors.textMuted} fontSize={12} />
              <YAxis yAxisId="left" stroke={chartColors.textMuted} fontSize={12} />
              <YAxis yAxisId="right" orientation="right" stroke={chartColors.textMuted} fontSize={12} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: `1px solid ${chartColors.border}`, background: chartColors.tooltipBg }}
                formatter={(value, name) => [(value || 0).toLocaleString(), name]}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="viewers" name="시청자 수" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="chats" name="채팅 수" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: '#94a3b8' }}>
              요일별 데이터가 없습니다
            </div>
          )}
        </ChartContainer>
      </div>

      {/* Activity History Table */}
      <div className="analytics-table-container">
        <div className="analytics-table-header">
          <h3>일별 시청자 활동 기록</h3>
        </div>
        <table className="analytics-table">
          <thead>
            <tr>
              <th>날짜</th>
              <th>시청자 수</th>
              <th>채팅 수</th>
              <th>참여 기록</th>
            </tr>
          </thead>
          <tbody>
            {activityTimeline.length > 0 ? activityTimeline.map((row) => (
              <tr key={row.date}>
                <td>{row.date}</td>
                <td><span className="sensitive-blur">{row.activeViewers?.toLocaleString() || 0}</span></td>
                <td style={{ fontWeight: 600, color: 'var(--primary)' }}>
                  <span className="sensitive-blur">{row.totalChats?.toLocaleString() || 0}</span>
                </td>
                <td><span className="sensitive-blur">{row.engagementCount?.toLocaleString() || 0}</span></td>
              </tr>
            )) : (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: '#94a3b8' }}>
                  활동 기록이 없습니다
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ViewerAnalytics;
