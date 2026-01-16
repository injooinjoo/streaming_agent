import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { DollarSign, Gift, Users, Megaphone, Download, RefreshCw } from 'lucide-react';
import AnalyticsCard from './shared/AnalyticsCard';
import TimeRangeSelector from './shared/TimeRangeSelector';
import ChartContainer from './shared/ChartContainer';
import TrendIndicator from './shared/TrendIndicator';
import './AnalyticsPage.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const RevenueAnalytics = () => {
  const [period, setPeriod] = useState('week');
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState([]);
  const [platformData, setPlatformData] = useState([]);
  const [topDonors, setTopDonors] = useState([]);
  const [summary, setSummary] = useState({ totalRevenue: 0, donationRevenue: 0, donationCount: 0 });

  const periodDays = { day: 1, week: 7, month: 30, year: 365 };

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    setLoading(true);
    const days = periodDays[period] || 7;

    try {
      const [trendRes, platformRes, donorsRes, summaryRes] = await Promise.all([
        fetch(`${API_BASE}/api/stats/revenue/trend?days=${days}`),
        fetch(`${API_BASE}/api/stats/revenue/by-platform`),
        fetch(`${API_BASE}/api/stats/donations/top-donors?limit=5`),
        fetch(`${API_BASE}/api/stats/revenue?days=${days}`)
      ]);

      const [trend, platforms, donors, sum] = await Promise.all([
        trendRes.json(),
        platformRes.json(),
        donorsRes.json(),
        summaryRes.json()
      ]);

      // Transform trend data for charts
      setRevenueData(trend.map(d => ({
        date: d.date,
        donation: d.donations || 0,
        subscription: 0,
        ads: d.adRevenue || 0
      })));

      // Platform colors
      const platformColors = {
        SOOP: '#5c3cff',
        soop: '#5c3cff',
        Chzzk: '#00c896',
        chzzk: '#00c896',
        YouTube: '#ff0000',
        youtube: '#ff0000',
        Twitch: '#9146ff',
        twitch: '#9146ff'
      };

      setPlatformData(platforms.map(p => ({
        name: p.name,
        value: p.value || 0,
        color: platformColors[p.name] || '#666'
      })));

      // Transform donors
      setTopDonors(donors.map((d, i) => ({
        rank: i + 1,
        name: d.sender || d.username || '익명',
        amount: d.total || d.totalRevenue || 0,
        count: d.count || d.donationCount || 0,
        platforms: [d.platform || 'unknown']
      })));

      setSummary(sum);
    } catch (err) {
      console.error('Failed to fetch revenue data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate daily breakdown from revenueData
  const dailyBreakdown = revenueData.slice(-5).map((d, i, arr) => {
    const prev = i > 0 ? arr[i-1] : null;
    const total = d.donation + d.subscription + d.ads;
    const prevTotal = prev ? (prev.donation + prev.subscription + prev.ads) : total;
    const change = prevTotal > 0 ? (((total - prevTotal) / prevTotal) * 100).toFixed(0) : 0;
    return {
      date: d.date,
      donation: d.donation,
      subscription: d.subscription,
      ads: d.ads,
      total,
      change: change >= 0 ? `+${change}%` : `${change}%`
    };
  });

  const totalRevenue = summary.donationRevenue || 0;
  const COLORS = ['#5c3cff', '#00c896', '#ff0000', '#9146ff'];

  const getRankClass = (rank) => {
    if (rank === 1) return 'gold';
    if (rank === 2) return 'silver';
    if (rank === 3) return 'bronze';
    return 'default';
  };

  const formatCurrency = (value) => `₩${(value || 0).toLocaleString()}`;

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
          <h1>수익 분석</h1>
          <p>후원금, 구독, 광고 수익을 한눈에 확인하세요.</p>
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
          title="총 수익"
          value={formatCurrency(totalRevenue)}
          change={summary.donationCount > 0 ? '+' : ''}
          trend={summary.donationCount > 0 ? 'up' : 'neutral'}
          icon={<DollarSign size={18} />}
          subtitle={`${periodDays[period]}일 기준`}
        />
        <AnalyticsCard
          title="후원금"
          value={formatCurrency(summary.donationRevenue)}
          change=""
          trend="neutral"
          icon={<Gift size={18} />}
          subtitle={`${summary.donationCount}건의 후원`}
        />
        <AnalyticsCard
          title="구독 수익"
          value={formatCurrency(0)}
          change=""
          trend="neutral"
          icon={<Users size={18} />}
          subtitle="구독 데이터 미연동"
        />
        <AnalyticsCard
          title="광고 수익"
          value={formatCurrency(summary.adRevenue || 0)}
          change=""
          trend="neutral"
          icon={<Megaphone size={18} />}
          subtitle="광고 데이터 미연동"
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
          {platformData.length > 0 ? (
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
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: '#94a3b8' }}>
              플랫폼 수익 데이터가 없습니다
            </div>
          )}
        </ChartContainer>
      </div>

      {/* Top Donors */}
      <div className="chart-container">
        <div className="chart-header">
          <div className="chart-title-section">
            <h3 className="chart-title">탑 도네이터</h3>
            <p className="chart-subtitle">후원 순위</p>
          </div>
        </div>
        <div className="top-donors-list">
          {topDonors.length > 0 ? topDonors.map((donor) => (
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
          )) : (
            <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
              후원자 데이터가 없습니다
            </div>
          )}
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
            {dailyBreakdown.length > 0 ? dailyBreakdown.map((row) => (
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
            )) : (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8' }}>데이터가 없습니다</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RevenueAnalytics;
