import React, { useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { DollarSign, Gift, Users, Megaphone, Download } from 'lucide-react';
import AnalyticsCard from './shared/AnalyticsCard';
import TimeRangeSelector from './shared/TimeRangeSelector';
import ChartContainer from './shared/ChartContainer';
import TrendIndicator from './shared/TrendIndicator';
import './AnalyticsPage.css';

const RevenueAnalytics = () => {
  const [period, setPeriod] = useState('week');

  // Mock data
  const revenueData = [
    { date: '1/1', donation: 180000, subscription: 45000, ads: 12000 },
    { date: '1/2', donation: 220000, subscription: 48000, ads: 15000 },
    { date: '1/3', donation: 150000, subscription: 42000, ads: 11000 },
    { date: '1/4', donation: 280000, subscription: 52000, ads: 18000 },
    { date: '1/5', donation: 195000, subscription: 47000, ads: 14000 },
    { date: '1/6', donation: 310000, subscription: 55000, ads: 22000 },
    { date: '1/7', donation: 245000, subscription: 50000, ads: 17000 },
  ];

  const platformData = [
    { name: 'SOOP', value: 450000, color: '#5c3cff' },
    { name: '치지직', value: 380000, color: '#00c896' },
    { name: 'YouTube', value: 270000, color: '#ff0000' },
    { name: 'Twitch', value: 150000, color: '#9146ff' },
  ];

  const topDonors = [
    { rank: 1, name: 'RichGuy', amount: 500000, count: 10, platforms: ['twitch', 'soop'] },
    { rank: 2, name: 'BigFan', amount: 350000, count: 7, platforms: ['chzzk'] },
    { rank: 3, name: 'LoyalViewer', amount: 280000, count: 15, platforms: ['youtube'] },
    { rank: 4, name: 'GenerousDonor', amount: 220000, count: 5, platforms: ['soop'] },
    { rank: 5, name: 'TopSupporter', amount: 180000, count: 8, platforms: ['twitch', 'chzzk'] },
  ];

  const dailyBreakdown = [
    { date: '2026-01-01', donation: 180000, subscription: 45000, ads: 12000, total: 237000, change: '+15%' },
    { date: '2026-01-02', donation: 220000, subscription: 48000, ads: 15000, total: 283000, change: '+19%' },
    { date: '2026-01-03', donation: 150000, subscription: 42000, ads: 11000, total: 203000, change: '-28%' },
    { date: '2026-01-04', donation: 280000, subscription: 52000, ads: 18000, total: 350000, change: '+72%' },
    { date: '2026-01-05', donation: 195000, subscription: 47000, ads: 14000, total: 256000, change: '-27%' },
  ];

  const totalRevenue = 1580000 + 339000 + 109000;
  const COLORS = ['#5c3cff', '#00c896', '#ff0000', '#9146ff'];

  const getRankClass = (rank) => {
    if (rank === 1) return 'gold';
    if (rank === 2) return 'silver';
    if (rank === 3) return 'bronze';
    return 'default';
  };

  const formatCurrency = (value) => `₩${value.toLocaleString()}`;

  return (
    <div className="analytics-page">
      <header className="page-header">
        <div className="page-title">
          <h1>수익 분석</h1>
          <p>후원금, 구독, 광고 수익을 한눈에 확인하세요.</p>
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
          title="총 수익"
          value={formatCurrency(totalRevenue)}
          change="+15%"
          trend="up"
          icon={<DollarSign size={18} />}
          subtitle="이번 주"
        />
        <AnalyticsCard
          title="후원금"
          value={formatCurrency(1580000)}
          change="+8%"
          trend="up"
          icon={<Gift size={18} />}
          subtitle="156건의 후원"
        />
        <AnalyticsCard
          title="구독 수익"
          value={formatCurrency(339000)}
          change="+23%"
          trend="up"
          icon={<Users size={18} />}
          subtitle="신규 구독 12명"
        />
        <AnalyticsCard
          title="광고 수익"
          value={formatCurrency(109000)}
          change="-5%"
          trend="down"
          icon={<Megaphone size={18} />}
          subtitle="노출 4,520회"
        />
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <ChartContainer
          title="수익 트렌드"
          subtitle="일별 수익 변화 추이"
          className="chart-full-width"
        >
          <LineChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `₩${(v/1000)}K`} />
            <Tooltip
              formatter={(value) => formatCurrency(value)}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
            />
            <Legend />
            <Line type="monotone" dataKey="donation" name="후원금" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="subscription" name="구독" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="ads" name="광고" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ChartContainer>

        <ChartContainer
          title="수익원별 비교"
          subtitle="스택 바 차트"
        >
          <BarChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `₩${(v/1000)}K`} />
            <Tooltip
              formatter={(value) => formatCurrency(value)}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
            />
            <Legend />
            <Bar dataKey="donation" name="후원금" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
            <Bar dataKey="subscription" name="구독" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
            <Bar dataKey="ads" name="광고" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>

        <ChartContainer
          title="플랫폼별 수익"
          subtitle="비율 분포"
        >
          <PieChart>
            <Pie
              data={platformData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              {platformData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatCurrency(value)} />
          </PieChart>
        </ChartContainer>
      </div>

      {/* Top Donors */}
      <div className="chart-container">
        <div className="chart-header">
          <div className="chart-title-section">
            <h3 className="chart-title">탑 도네이터</h3>
            <p className="chart-subtitle">이번 주 후원 순위</p>
          </div>
        </div>
        <div className="top-donors-list">
          {topDonors.map((donor) => (
            <div key={donor.rank} className="top-donor-item">
              <div className={`top-donor-rank ${getRankClass(donor.rank)}`}>
                {donor.rank}
              </div>
              <div className="top-donor-info">
                <div className="top-donor-name">{donor.name}</div>
                <div className="top-donor-count">{donor.count}회 후원</div>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {donor.platforms.map((p) => (
                  <span key={p} className={`platform-badge ${p}`}>{p}</span>
                ))}
              </div>
              <div className="top-donor-amount">{formatCurrency(donor.amount)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Daily Breakdown Table */}
      <div className="analytics-table-container">
        <div className="analytics-table-header">
          <h3>일별 수익 상세</h3>
        </div>
        <table className="analytics-table">
          <thead>
            <tr>
              <th>날짜</th>
              <th>후원금</th>
              <th>구독</th>
              <th>광고</th>
              <th>합계</th>
              <th>전일대비</th>
            </tr>
          </thead>
          <tbody>
            {dailyBreakdown.map((row) => (
              <tr key={row.date}>
                <td>{row.date}</td>
                <td>{formatCurrency(row.donation)}</td>
                <td>{formatCurrency(row.subscription)}</td>
                <td>{formatCurrency(row.ads)}</td>
                <td style={{ fontWeight: 600 }}>{formatCurrency(row.total)}</td>
                <td>
                  <TrendIndicator value={row.change} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RevenueAnalytics;
