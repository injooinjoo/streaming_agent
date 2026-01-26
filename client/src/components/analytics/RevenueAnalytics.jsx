import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { DollarSign, Gift, Users, Megaphone, Download, RefreshCw, LogIn } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import AnalyticsCard from './shared/AnalyticsCard';
import TimeRangeSelector from './shared/TimeRangeSelector';
import ChartContainer from './shared/ChartContainer';
import TrendIndicator from './shared/TrendIndicator';
import LoadingSpinner from '../shared/LoadingSpinner';
import './AnalyticsPage.css';

import { API_URL } from '../../config/api';

const RevenueAnalytics = () => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // 차트 다크모드 색상
  const chartColors = {
    grid: isDark ? '#475569' : '#f0f0f0',
    border: isDark ? '#475569' : '#e2e8f0',
    tooltipBg: isDark ? '#1e293b' : '#ffffff',
    textMuted: isDark ? '#94a3b8' : '#94a3b8',
  };

  const [period, setPeriod] = useState('week');
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState([]);
  const [platformData, setPlatformData] = useState([]);
  const [topDonors, setTopDonors] = useState([]);
  const [summary, setSummary] = useState({ totalRevenue: 0, donationRevenue: 0, donationCount: 0 });
  const [authError, setAuthError] = useState(false);

  const { isAuthenticated, accessToken, user } = useAuth();
  const navigate = useNavigate();

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

    // Build query params with user's channelId and platform
    const params = new URLSearchParams();
    params.set('days', days.toString());
    if (user?.channelId) params.set('channelId', user.channelId);
    if (user?.platform) params.set('platform', user.platform);
    const queryString = params.toString();

    const headers = {
      'Content-Type': 'application/json',
      ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
    };

    try {
      const [trendRes, platformRes, donorsRes, summaryRes] = await Promise.all([
        fetch(`${API_URL}/api/stats/revenue/trend?${queryString}`, { headers }),
        fetch(`${API_URL}/api/stats/revenue/by-platform?${queryString}`, { headers }),
        fetch(`${API_URL}/api/stats/donations/top-donors?limit=5&${queryString.replace(/days=\d+&?/, '')}`, { headers }),
        fetch(`${API_URL}/api/stats/revenue?${queryString}`, { headers })
      ]);

      // Check if any request requires auth
      if ([trendRes, platformRes, donorsRes, summaryRes].some(res => res.status === 401)) {
        setAuthError(true);
        setLoading(false);
        return;
      }

      const [trend, platforms, donors, sum] = await Promise.all([
        trendRes.json(),
        platformRes.json(),
        donorsRes.json(),
        summaryRes.json()
      ]);

      // Transform trend data for charts (safely handle non-array responses)
      setRevenueData(Array.isArray(trend) ? trend.map(d => ({
        date: d.date,
        donation: d.donations || 0,
        subscription: 0,
        ads: d.adRevenue || 0
      })) : []);

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

      setPlatformData(Array.isArray(platforms) ? platforms.map(p => ({
        name: p.name,
        value: p.value || 0,
        color: platformColors[p.name] || '#666'
      })) : []);

      // Transform donors (safely handle non-array responses)
      setTopDonors(Array.isArray(donors) ? donors.map((d, i) => ({
        rank: i + 1,
        name: d.sender || d.username || '익명',
        amount: d.total || d.totalRevenue || 0,
        count: d.count || d.donationCount || 0,
        platforms: [d.platform || 'unknown']
      })) : []);

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
    const prevTotal = prev ? (prev.donation + prev.subscription + prev.ads) : 0;

    // Calculate percentage change with proper edge case handling
    let change;
    if (prevTotal === 0 && total === 0) {
      change = '0%';
    } else if (prevTotal === 0) {
      change = total > 0 ? '+100%' : '0%';
    } else {
      const percentChange = (((total - prevTotal) / prevTotal) * 100).toFixed(1);
      change = percentChange >= 0 ? `+${percentChange}%` : `${percentChange}%`;
    }

    return {
      date: d.date,
      donation: d.donation,
      subscription: d.subscription,
      ads: d.ads,
      total,
      change
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
        <LoadingSpinner fullHeight />
      </div>
    );
  }

  if (authError || !isAuthenticated) {
    return (
      <div className="analytics-page">
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
          <p style={{ margin: 0 }}>수익 분석을 확인하려면 로그인하세요.</p>
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
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
            <XAxis dataKey="date" stroke={chartColors.textMuted} fontSize={12} />
            <YAxis stroke={chartColors.textMuted} fontSize={12} tickFormatter={(v) => `₩${(v/1000)}K`} />
            <Tooltip
              formatter={(value) => formatCurrency(value)}
              contentStyle={{ borderRadius: '8px', border: `1px solid ${chartColors.border}`, background: chartColors.tooltipBg }}
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
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
            <XAxis dataKey="date" stroke={chartColors.textMuted} fontSize={12} />
            <YAxis stroke={chartColors.textMuted} fontSize={12} tickFormatter={(v) => `₩${(v/1000)}K`} />
            <Tooltip
              formatter={(value) => formatCurrency(value)}
              contentStyle={{ borderRadius: '8px', border: `1px solid ${chartColors.border}`, background: chartColors.tooltipBg }}
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
              <div className="top-donor-amount sensitive-blur">{formatCurrency(donor.amount)}</div>
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
                <td><span className="sensitive-blur">{formatCurrency(row.donation)}</span></td>
                <td><span className="sensitive-blur">{formatCurrency(row.subscription)}</span></td>
                <td><span className="sensitive-blur">{formatCurrency(row.ads)}</span></td>
                <td style={{ fontWeight: 600 }}><span className="sensitive-blur">{formatCurrency(row.total)}</span></td>
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
