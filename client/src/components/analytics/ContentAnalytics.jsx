import React, { useState } from 'react';
import {
  BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Play, Clock, Trophy, Zap, Download } from 'lucide-react';
import AnalyticsCard from './shared/AnalyticsCard';
import TimeRangeSelector from './shared/TimeRangeSelector';
import ChartContainer from './shared/ChartContainer';
import TrendIndicator from './shared/TrendIndicator';
import './AnalyticsPage.css';

const ContentAnalytics = () => {
  const [period, setPeriod] = useState('month');

  // Mock data
  const categoryPerformance = [
    { category: '리그 오브 레전드', streams: 12, hours: 48, avgViewers: 1240, revenue: 450000, efficiency: 94 },
    { category: '배틀그라운드', streams: 8, hours: 32, avgViewers: 890, revenue: 280000, efficiency: 87 },
    { category: '메이플스토리', streams: 10, hours: 40, avgViewers: 720, revenue: 320000, efficiency: 82 },
    { category: '오버워치 2', streams: 6, hours: 24, avgViewers: 580, revenue: 180000, efficiency: 76 },
    { category: '발로란트', streams: 5, hours: 20, avgViewers: 450, revenue: 140000, efficiency: 71 },
  ];

  const radarData = [
    { category: 'LoL', viewers: 94, revenue: 90, engagement: 88, retention: 85, growth: 78 },
    { category: 'PUBG', viewers: 75, revenue: 72, engagement: 80, retention: 78, growth: 65 },
    { category: '메이플', viewers: 68, revenue: 78, engagement: 72, retention: 82, growth: 88 },
    { category: 'OW2', viewers: 58, revenue: 55, engagement: 65, retention: 60, growth: 45 },
    { category: '발로란트', viewers: 52, revenue: 48, engagement: 58, retention: 55, growth: 62 },
  ];

  const timeSlotData = [
    { slot: '14-16시', efficiency: 45, avgViewers: 180, revenue: 35000 },
    { slot: '16-18시', efficiency: 58, avgViewers: 320, revenue: 65000 },
    { slot: '18-20시', efficiency: 78, avgViewers: 580, revenue: 125000 },
    { slot: '20-22시', efficiency: 95, avgViewers: 780, revenue: 185000 },
    { slot: '22-24시', efficiency: 82, avgViewers: 620, revenue: 145000 },
    { slot: '24-02시', efficiency: 55, avgViewers: 280, revenue: 55000 },
  ];

  const formatCurrency = (value) => `₩${value.toLocaleString()}`;

  return (
    <div className="analytics-page">
      <header className="page-header">
        <div className="page-title">
          <h1>콘텐츠 분석</h1>
          <p>카테고리별 성과와 최적 방송 시간대를 확인하세요.</p>
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
          title="총 방송 시간"
          value="164시간"
          change="+15%"
          trend="up"
          icon={<Clock size={18} />}
          subtitle="이번 달"
        />
        <AnalyticsCard
          title="평균 방송 시간"
          value="4.1시간"
          change="+8%"
          trend="up"
          icon={<Play size={18} />}
          subtitle="방송당"
        />
        <AnalyticsCard
          title="인기 카테고리"
          value="LoL"
          change="+12%"
          trend="up"
          icon={<Trophy size={18} />}
          subtitle="평균 시청자 기준"
        />
        <AnalyticsCard
          title="골든타임"
          value="20-22시"
          change=""
          trend="neutral"
          icon={<Zap size={18} />}
          subtitle="최적 방송 시간"
        />
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <ChartContainer
          title="카테고리별 성과"
          subtitle="평균 시청자 수 기준"
          className="chart-full-width"
        >
          <BarChart data={categoryPerformance} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis type="number" stroke="#94a3b8" fontSize={12} />
            <YAxis dataKey="category" type="category" stroke="#94a3b8" fontSize={12} width={120} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
            <Legend />
            <Bar dataKey="avgViewers" name="평균 시청자" fill="#3b82f6" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartContainer>

        <ChartContainer
          title="카테고리 종합 비교"
          subtitle="레이더 차트"
        >
          <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis dataKey="category" fontSize={11} />
            <PolarRadiusAxis fontSize={10} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
            <Radar name="시청자" dataKey="viewers" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
            <Radar name="수익" dataKey="revenue" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
            <Legend />
          </RadarChart>
        </ChartContainer>

        <ChartContainer
          title="시간대별 효율"
          subtitle="효율 점수 기준"
        >
          <BarChart data={timeSlotData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="slot" stroke="#94a3b8" fontSize={11} />
            <YAxis stroke="#94a3b8" fontSize={12} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
            <Bar dataKey="efficiency" name="효율 점수" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </div>

      {/* Category Performance Table */}
      <div className="analytics-table-container">
        <div className="analytics-table-header">
          <h3>카테고리별 상세 분석</h3>
        </div>
        <table className="analytics-table">
          <thead>
            <tr>
              <th>카테고리</th>
              <th>방송 횟수</th>
              <th>총 시간</th>
              <th>평균 시청</th>
              <th>수익</th>
              <th>효율 점수</th>
            </tr>
          </thead>
          <tbody>
            {categoryPerformance.map((row) => (
              <tr key={row.category}>
                <td style={{ fontWeight: 600 }}>{row.category}</td>
                <td>{row.streams}회</td>
                <td>{row.hours}시간</td>
                <td>{row.avgViewers.toLocaleString()}</td>
                <td style={{ color: 'var(--primary)' }}>{formatCurrency(row.revenue)}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '60px',
                      height: '6px',
                      background: '#e2e8f0',
                      borderRadius: '3px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${row.efficiency}%`,
                        height: '100%',
                        background: row.efficiency >= 80 ? '#10b981' : row.efficiency >= 60 ? '#f59e0b' : '#ef4444',
                        borderRadius: '3px'
                      }} />
                    </div>
                    <span style={{ fontWeight: 600 }}>{row.efficiency}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ContentAnalytics;
