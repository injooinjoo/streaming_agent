import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Users, Eye, Clock, MessageSquare, Download, RefreshCw } from 'lucide-react';
import AnalyticsCard from './shared/AnalyticsCard';
import TimeRangeSelector from './shared/TimeRangeSelector';
import ChartContainer from './shared/ChartContainer';
import './AnalyticsPage.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const ViewerAnalytics = () => {
  const [period, setPeriod] = useState('week');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalChats: 0,
    uniqueUsers: 0,
    activeDays: 0,
    peakHour: 'N/A',
    peakChatCount: 0
  });
  const [hourlyData, setHourlyData] = useState([]);
  const [dayOfWeekData, setDayOfWeekData] = useState([]);
  const [activityTimeline, setActivityTimeline] = useState([]);

  const periodDays = { day: 1, week: 7, month: 30, year: 365 };

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    setLoading(true);
    const days = periodDays[period] || 7;

    try {
      const [summaryRes, hourlyRes, dailyRes, timelineRes] = await Promise.all([
        fetch(`${API_BASE}/api/stats/chat/summary?days=${days}`),
        fetch(`${API_BASE}/api/stats/chat/hourly?days=${days}`),
        fetch(`${API_BASE}/api/stats/chat/daily?weeks=${Math.ceil(days / 7)}`),
        fetch(`${API_BASE}/api/stats/activity/timeline?days=${days}`)
      ]);

      const [summaryData, hourly, daily, timeline] = await Promise.all([
        summaryRes.ok ? summaryRes.json() : {},
        hourlyRes.ok ? hourlyRes.json() : [],
        dailyRes.ok ? dailyRes.json() : [],
        timelineRes.ok ? timelineRes.json() : []
      ]);

      setSummary(summaryData);

      // Transform hourly data for display
      setHourlyData(Array.isArray(hourly) ? hourly.filter((h, i) => i >= 12 && i < 24).map(h => ({
        hour: h.hour?.replace(':00', '시') || h.hour,
        chats: h.chats || 0,
        users: h.users || 0
      })) : []);

      setDayOfWeekData(Array.isArray(daily) ? daily : []);

      // Timeline is already in correct format
      setActivityTimeline(Array.isArray(timeline) ? timeline : []);

    } catch (err) {
      console.error('Failed to fetch viewer data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate chat participation rate
  const chatParticipationRate = summary.uniqueUsers > 0 && summary.totalChats > 0
    ? ((summary.uniqueUsers / summary.totalChats) * 100).toFixed(1)
    : 0;

  if (loading) {
    return (
      <div className="analytics-page">
        <div className="loading-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <RefreshCw className="animate-spin" size={32} />
          <span style={{ marginLeft: '12px' }}>데이터를 불러오는 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      <header className="page-header">
        <div className="page-title">
          <h1>시청자 분석</h1>
          <p>채팅 활동과 참여도를 분석합니다.</p>
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
          title="총 채팅 수"
          value={summary.totalChats?.toLocaleString() || '0'}
          change=""
          trend="neutral"
          icon={<MessageSquare size={18} />}
          subtitle={`${periodDays[period]}일 기준`}
        />
        <AnalyticsCard
          title="참여 유저 수"
          value={summary.uniqueUsers?.toLocaleString() || '0'}
          change=""
          trend="neutral"
          icon={<Users size={18} />}
          subtitle="고유 사용자"
        />
        <AnalyticsCard
          title="피크 시간대"
          value={summary.peakHour || 'N/A'}
          change=""
          trend="neutral"
          icon={<Clock size={18} />}
          subtitle={`${summary.peakChatCount?.toLocaleString() || 0}개 채팅`}
        />
        <AnalyticsCard
          title="활동일 수"
          value={`${summary.activeDays || 0}일`}
          change=""
          trend="neutral"
          icon={<Eye size={18} />}
          subtitle="채팅 활동이 있는 날"
        />
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <ChartContainer
          title="활동 타임라인"
          subtitle="일별 채팅 및 후원 활동"
          className="chart-full-width"
        >
          {activityTimeline.length > 0 ? (
            <AreaChart data={[...activityTimeline].reverse()}>
              <defs>
                <linearGradient id="chatGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
              <Legend />
              <Area
                type="monotone"
                dataKey="chats"
                name="채팅 수"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#chatGradient)"
              />
              <Line type="monotone" dataKey="activeUsers" name="활성 유저" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
            </AreaChart>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: '#94a3b8' }}>
              활동 데이터가 없습니다
            </div>
          )}
        </ChartContainer>

        <ChartContainer
          title="시간대별 채팅 활동"
          subtitle="오후 시간대 채팅 분포"
        >
          {hourlyData.length > 0 ? (
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="hour" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
              <Bar dataKey="chats" name="채팅 수" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: '#94a3b8' }}>
              시간대별 데이터가 없습니다
            </div>
          )}
        </ChartContainer>

        <ChartContainer
          title="요일별 채팅 현황"
          subtitle="요일별 채팅 활동 비교"
        >
          {dayOfWeekData.length > 0 ? (
            <BarChart data={dayOfWeekData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
              <Legend />
              <Bar dataKey="chats" name="채팅 수" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="users" name="참여 유저" fill="#10b981" radius={[4, 4, 0, 0]} />
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
          <h3>일별 활동 기록</h3>
        </div>
        <table className="analytics-table">
          <thead>
            <tr>
              <th>날짜</th>
              <th>채팅 수</th>
              <th>후원 수</th>
              <th>후원 금액</th>
              <th>활성 유저</th>
            </tr>
          </thead>
          <tbody>
            {activityTimeline.length > 0 ? activityTimeline.map((row) => (
              <tr key={row.date}>
                <td>{row.date}</td>
                <td>{row.chats?.toLocaleString() || 0}</td>
                <td>{row.donations?.toLocaleString() || 0}</td>
                <td style={{ fontWeight: 600, color: 'var(--primary)' }}>
                  ₩{row.donationAmount?.toLocaleString() || 0}
                </td>
                <td>{row.activeUsers?.toLocaleString() || 0}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8' }}>
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
