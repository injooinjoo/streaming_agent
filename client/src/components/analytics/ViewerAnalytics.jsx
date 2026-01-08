import React, { useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Users, Eye, Clock, MessageSquare, Download } from 'lucide-react';
import AnalyticsCard from './shared/AnalyticsCard';
import TimeRangeSelector from './shared/TimeRangeSelector';
import ChartContainer from './shared/ChartContainer';
import TrendIndicator from './shared/TrendIndicator';
import './AnalyticsPage.css';

const ViewerAnalytics = () => {
  const [period, setPeriod] = useState('week');

  // Mock data
  const viewerTimeline = [
    { time: '19:00', viewers: 234, chat: 45 },
    { time: '19:30', viewers: 456, chat: 89 },
    { time: '20:00', viewers: 678, chat: 134 },
    { time: '20:30', viewers: 842, chat: 178 },
    { time: '21:00', viewers: 756, chat: 156 },
    { time: '21:30', viewers: 623, chat: 123 },
    { time: '22:00', viewers: 534, chat: 98 },
    { time: '22:30', viewers: 412, chat: 76 },
  ];

  const hourlyData = [
    { hour: '오후 2시', viewers: 120, label: '14:00' },
    { hour: '오후 3시', viewers: 180, label: '15:00' },
    { hour: '오후 4시', viewers: 250, label: '16:00' },
    { hour: '오후 5시', viewers: 320, label: '17:00' },
    { hour: '오후 6시', viewers: 480, label: '18:00' },
    { hour: '오후 7시', viewers: 650, label: '19:00' },
    { hour: '오후 8시', viewers: 780, label: '20:00' },
    { hour: '오후 9시', viewers: 720, label: '21:00' },
    { hour: '오후 10시', viewers: 550, label: '22:00' },
    { hour: '오후 11시', viewers: 380, label: '23:00' },
  ];

  const dayOfWeekData = [
    { day: '월', viewers: 420, chat: 1240 },
    { day: '화', viewers: 380, chat: 1120 },
    { day: '수', viewers: 450, chat: 1380 },
    { day: '목', viewers: 520, chat: 1560 },
    { day: '금', viewers: 680, chat: 2100 },
    { day: '토', viewers: 820, chat: 2580 },
    { day: '일', viewers: 750, chat: 2340 },
  ];

  const streamHistory = [
    { date: '2026-01-08', start: '19:00', end: '23:00', avgViewers: 542, peakViewers: 842, chatCount: 3240 },
    { date: '2026-01-07', start: '20:00', end: '24:00', avgViewers: 486, peakViewers: 756, chatCount: 2890 },
    { date: '2026-01-06', start: '19:30', end: '22:30', avgViewers: 412, peakViewers: 623, chatCount: 2150 },
    { date: '2026-01-05', start: '20:00', end: '23:00', avgViewers: 378, peakViewers: 534, chatCount: 1980 },
    { date: '2026-01-04', start: '19:00', end: '22:00', avgViewers: 356, peakViewers: 498, chatCount: 1720 },
  ];

  return (
    <div className="analytics-page">
      <header className="page-header">
        <div className="page-title">
          <h1>시청자 분석</h1>
          <p>시청자 추이와 채팅 활동을 분석합니다.</p>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: '12px' }}>
          <TimeRangeSelector value={period} onChange={setPeriod} />
          <button className="btn-outline">
            <Download size={16} /> 내보내기
          </button>
        </div>
      </header>

      {/* Key Metrics */}
      <div className="analytics-metrics-grid">
        <AnalyticsCard
          title="평균 시청자"
          value="456"
          change="+12%"
          trend="up"
          icon={<Users size={18} />}
          subtitle="이번 주 평균"
        />
        <AnalyticsCard
          title="최고 동시 시청자"
          value="842"
          change="+24%"
          trend="up"
          icon={<Eye size={18} />}
          subtitle="1/8 오후 8:30"
        />
        <AnalyticsCard
          title="총 시청 시간"
          value="2,340시간"
          change="+8%"
          trend="up"
          icon={<Clock size={18} />}
          subtitle="이번 주 누적"
        />
        <AnalyticsCard
          title="채팅 참여율"
          value="18.5%"
          change="+3%"
          trend="up"
          icon={<MessageSquare size={18} />}
          subtitle="시청자 대비"
        />
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <ChartContainer
          title="실시간 시청자 추이"
          subtitle="오늘 방송 시청자 수 변화"
          className="chart-full-width"
        >
          <AreaChart data={viewerTimeline}>
            <defs>
              <linearGradient id="viewerGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
            <Legend />
            <Area
              type="monotone"
              dataKey="viewers"
              name="시청자 수"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#viewerGradient)"
            />
            <Line type="monotone" dataKey="chat" name="채팅 수" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
          </AreaChart>
        </ChartContainer>

        <ChartContainer
          title="시간대별 평균 시청자"
          subtitle="방송 시간대별 성과"
        >
          <BarChart data={hourlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="hour" stroke="#94a3b8" fontSize={11} />
            <YAxis stroke="#94a3b8" fontSize={12} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
            <Bar dataKey="viewers" name="평균 시청자" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>

        <ChartContainer
          title="요일별 시청자 현황"
          subtitle="요일별 평균 시청자 및 채팅"
        >
          <BarChart data={dayOfWeekData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
            <Legend />
            <Bar dataKey="viewers" name="평균 시청자" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </div>

      {/* Stream History Table */}
      <div className="analytics-table-container">
        <div className="analytics-table-header">
          <h3>방송 기록</h3>
        </div>
        <table className="analytics-table">
          <thead>
            <tr>
              <th>방송일</th>
              <th>시작</th>
              <th>종료</th>
              <th>평균 시청</th>
              <th>최고 시청</th>
              <th>채팅 수</th>
            </tr>
          </thead>
          <tbody>
            {streamHistory.map((row) => (
              <tr key={row.date}>
                <td>{row.date}</td>
                <td>{row.start}</td>
                <td>{row.end}</td>
                <td>{row.avgViewers.toLocaleString()}</td>
                <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{row.peakViewers.toLocaleString()}</td>
                <td>{row.chatCount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ViewerAnalytics;
