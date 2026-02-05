import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Gamepad2, Clock, TrendingUp, Gift, MessageSquare, Users, Download, RefreshCw, LogIn } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, formatFullNumber, formatGrowth } from '../../utils/formatters';
import AnalyticsCard from './shared/AnalyticsCard';
import TimeRangeSelector from './shared/TimeRangeSelector';
import ChartContainer from './shared/ChartContainer';
import LoadingSpinner from '../shared/LoadingSpinner';
import './AnalyticsPage.css';

import { API_URL, mockFetch } from '../../config/api';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

// 카테고리별 후원 목업 데이터
const MOCK_CATEGORY_DONATIONS = [
  { name: '리그 오브 레전드', value: 2850000, percent: 32 },
  { name: 'Just Chatting', value: 1950000, percent: 22 },
  { name: '발로란트', value: 1450000, percent: 16 },
  { name: '메이플스토리', value: 1200000, percent: 14 },
  { name: 'FC 온라인', value: 850000, percent: 10 },
  { name: '기타', value: 500000, percent: 6 }
];

// 카테고리별 채팅 목업 데이터
const MOCK_CATEGORY_CHATS = [
  { name: 'Just Chatting', value: 125000, percent: 28 },
  { name: '리그 오브 레전드', value: 98000, percent: 22 },
  { name: '발로란트', value: 78000, percent: 18 },
  { name: '메이플스토리', value: 65000, percent: 15 },
  { name: 'FC 온라인', value: 45000, percent: 10 },
  { name: '기타', value: 32000, percent: 7 }
];

// 카테고리별 성장 목업 데이터
const MOCK_CATEGORY_GROWTH = [
  { name: '발로란트', growth: 25 },
  { name: '메이플스토리', growth: 18 },
  { name: 'Just Chatting', growth: 12 },
  { name: '리그 오브 레전드', growth: 5 },
  { name: 'FC 온라인', growth: -3 },
  { name: '배틀그라운드', growth: -8 }
];

// 시간대별 활동 목업 데이터
const MOCK_HOURLY_BY_CATEGORY = [
  { hour: '0시', donations: 45, chats: 2500 },
  { hour: '2시', donations: 25, chats: 1200 },
  { hour: '4시', donations: 10, chats: 450 },
  { hour: '6시', donations: 8, chats: 320 },
  { hour: '8시', donations: 22, chats: 1100 },
  { hour: '10시', donations: 55, chats: 3200 },
  { hour: '12시', donations: 85, chats: 5500 },
  { hour: '14시', donations: 120, chats: 7800 },
  { hour: '16시', donations: 165, chats: 9500 },
  { hour: '18시', donations: 210, chats: 12500 },
  { hour: '20시', donations: 285, chats: 18000 },
  { hour: '22시', donations: 195, chats: 14500 }
];

const ContentAnalytics = () => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const { user, isAuthenticated, token } = useAuth();

  const chartColors = {
    grid: isDark ? '#475569' : '#f0f0f0',
    border: isDark ? '#475569' : '#e2e8f0',
    tooltipBg: isDark ? '#1e293b' : '#ffffff',
    textMuted: isDark ? '#94a3b8' : '#94a3b8',
    progressBg: isDark ? '#475569' : '#e2e8f0',
  };

  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);

  // Category-based data
  const [categoryDonations, setCategoryDonations] = useState([]);
  const [categoryChats, setCategoryChats] = useState([]);
  const [categoryGrowth, setCategoryGrowth] = useState([]);
  const [hourlyByCategory, setHourlyByCategory] = useState([]);

  const [summary, setSummary] = useState({
    totalCategories: 0,
    topCategory: 'N/A',
    totalDonations: 0,
    totalChats: 0,
    peakHour: 'N/A',
    avgViewerGrowth: 0
  });

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
    const days = periodDays[period] || 30;

    // Build query params with user filter
    const params = new URLSearchParams();
    params.set('days', days.toString());
    if (user?.channelId) params.set('channelId', user.channelId);
    if (user?.platform) params.set('platform', user.platform);

    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const [donationsRes, chatsRes, growthRes, hourlyRes] = await Promise.all([
        mockFetch(`${API_URL}/api/stats/content/category-donations?${params}`, { headers }),
        mockFetch(`${API_URL}/api/stats/content/category-chats?${params}`, { headers }),
        mockFetch(`${API_URL}/api/stats/content/category-growth?${params}`, { headers }),
        mockFetch(`${API_URL}/api/stats/content/hourly-by-category?${params}`, { headers })
      ]);

      const [donations, chats, growth, hourly] = await Promise.all([
        donationsRes.ok ? donationsRes.json() : [],
        chatsRes.ok ? chatsRes.json() : [],
        growthRes.ok ? growthRes.json() : [],
        hourlyRes.ok ? hourlyRes.json() : []
      ]);

      setCategoryDonations(Array.isArray(donations) && donations.length > 0 ? donations : MOCK_CATEGORY_DONATIONS);
      setCategoryChats(Array.isArray(chats) && chats.length > 0 ? chats : MOCK_CATEGORY_CHATS);
      setCategoryGrowth(Array.isArray(growth) && growth.length > 0 ? growth : MOCK_CATEGORY_GROWTH);
      setHourlyByCategory(Array.isArray(hourly) && hourly.length > 0 ? hourly : MOCK_HOURLY_BY_CATEGORY);

      // Calculate summary
      const totalDonations = (donations || []).reduce((sum, c) => sum + (c.value || 0), 0);
      const totalChats = (chats || []).reduce((sum, c) => sum + (c.value || 0), 0);
      const topCat = donations?.length > 0 ? donations[0] : (chats?.length > 0 ? chats[0] : null);
      const avgGrowth = growth?.length > 0
        ? Math.round(growth.reduce((sum, g) => sum + (g.growth || 0), 0) / growth.length)
        : 0;

      // Find peak hour from hourly data
      let peakHour = 'N/A';
      let peakValue = 0;
      (hourly || []).forEach(h => {
        const total = (h.donations || 0) + (h.chats || 0);
        if (total > peakValue) {
          peakValue = total;
          peakHour = h.hour?.replace(':00', '시') || h.hour;
        }
      });

      setSummary({
        totalCategories: new Set([
          ...(donations || []).map(d => d.name),
          ...(chats || []).map(c => c.name)
        ]).size,
        topCategory: topCat?.name || 'N/A',
        totalDonations,
        totalChats,
        peakHour,
        avgViewerGrowth: avgGrowth
      });

    } catch (err) {
      console.error('Failed to fetch content data:', err);
      // API 실패 시 목업 데이터 사용
      setCategoryDonations(MOCK_CATEGORY_DONATIONS);
      setCategoryChats(MOCK_CATEGORY_CHATS);
      setCategoryGrowth(MOCK_CATEGORY_GROWTH);
      setHourlyByCategory(MOCK_HOURLY_BY_CATEGORY);
      setSummary({
        totalCategories: 6,
        topCategory: '리그 오브 레전드',
        totalDonations: 8800000,
        totalChats: 443000,
        peakHour: '20시',
        avgViewerGrowth: 8
      });
    } finally {
      setLoading(false);
    }
  };

  // Custom tooltip for pie charts
  const renderCustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          background: chartColors.tooltipBg,
          border: `1px solid ${chartColors.border}`,
          borderRadius: '8px',
          padding: '12px'
        }}>
          <p style={{ margin: 0, fontWeight: 600 }}>{data.name}</p>
          <p style={{ margin: '4px 0 0', color: chartColors.textMuted }}>
            {formatFullNumber(data.value)} ({data.percent}%)
          </p>
        </div>
      );
    }
    return null;
  };

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
            콘텐츠 분석을 확인하려면 먼저 로그인하세요.
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
          <h1>콘텐츠 분석</h1>
          <p>카테고리별 후원, 채팅, 시청자 성장을 분석합니다.</p>
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
          title="활성 카테고리"
          value={summary.totalCategories.toString()}
          change=""
          trend="neutral"
          icon={<Gamepad2 size={18} />}
          subtitle={`${periodDays[period]}일 기준`}
        />
        <AnalyticsCard
          title="인기 카테고리"
          value={summary.topCategory}
          change=""
          trend="neutral"
          icon={<TrendingUp size={18} />}
          subtitle="후원 기준"
        />
        <AnalyticsCard
          title="피크 시간대"
          value={summary.peakHour}
          change=""
          trend="neutral"
          icon={<Clock size={18} />}
          subtitle="최다 활동 시간"
        />
        <AnalyticsCard
          title="평균 시청자 성장"
          value={`${summary.avgViewerGrowth > 0 ? '+' : ''}${summary.avgViewerGrowth}%`}
          change=""
          trend={summary.avgViewerGrowth > 0 ? 'up' : summary.avgViewerGrowth < 0 ? 'down' : 'neutral'}
          icon={<Users size={18} />}
          subtitle="카테고리 평균"
        />
      </div>

      {/* Charts */}
      <div className="charts-grid">
        {/* Category Donations Pie Chart */}
        <ChartContainer
          title="카테고리별 후원 비중"
          subtitle="카테고리별 후원금 분포"
        >
          {categoryDonations.length > 0 ? (
            <PieChart>
              <Pie
                data={categoryDonations}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name} ${percent}%`}
                labelLine={false}
              >
                {categoryDonations.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={renderCustomTooltip} />
            </PieChart>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: '#94a3b8' }}>
              후원 데이터가 없습니다
            </div>
          )}
        </ChartContainer>

        {/* Category Chats Pie Chart */}
        <ChartContainer
          title="카테고리별 채팅 비중"
          subtitle="카테고리별 채팅 활동 분포"
        >
          {categoryChats.length > 0 ? (
            <PieChart>
              <Pie
                data={categoryChats}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name} ${percent}%`}
                labelLine={false}
              >
                {categoryChats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={renderCustomTooltip} />
            </PieChart>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: '#94a3b8' }}>
              채팅 데이터가 없습니다
            </div>
          )}
        </ChartContainer>

        {/* Category Growth Bar Chart */}
        <ChartContainer
          title="카테고리별 시청자 성장"
          subtitle="기간 대비 시청자 증감률"
          className="chart-full-width"
        >
          {categoryGrowth.length > 0 ? (
            <BarChart data={categoryGrowth} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis type="number" stroke={chartColors.textMuted} fontSize={12} tickFormatter={(v) => `${v}%`} />
              <YAxis dataKey="name" type="category" stroke={chartColors.textMuted} fontSize={12} width={100} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: `1px solid ${chartColors.border}`, background: chartColors.tooltipBg }}
                formatter={(value) => [`${value > 0 ? '+' : ''}${value}%`, '성장률']}
              />
              <Bar dataKey="growth" name="성장률" radius={[0, 4, 4, 0]}>
                {categoryGrowth.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.growth >= 0 ? '#10b981' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: '#94a3b8' }}>
              시청자 성장 데이터가 없습니다
            </div>
          )}
        </ChartContainer>

        {/* Hourly Activity by Category */}
        <ChartContainer
          title="시간대별 카테고리 활동"
          subtitle="시간대별 후원 및 채팅 활동"
          className="chart-full-width"
        >
          {hourlyByCategory.length > 0 ? (
            <BarChart data={hourlyByCategory}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis dataKey="hour" stroke={chartColors.textMuted} fontSize={11} />
              <YAxis yAxisId="left" stroke={chartColors.textMuted} fontSize={12} />
              <YAxis yAxisId="right" orientation="right" stroke={chartColors.textMuted} fontSize={12} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: `1px solid ${chartColors.border}`, background: chartColors.tooltipBg }}
                formatter={(value, name) => [formatFullNumber(value), name]}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="donations" name="후원금 (만원)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="chats" name="채팅 수" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: '#94a3b8' }}>
              시간대별 데이터가 없습니다
            </div>
          )}
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
              <th>후원금</th>
              <th>후원 비중</th>
              <th>채팅 수</th>
              <th>채팅 비중</th>
              <th>시청자 성장</th>
            </tr>
          </thead>
          <tbody>
            {categoryDonations.length > 0 || categoryChats.length > 0 ? (
              // Merge donation and chat data by category
              [...new Set([
                ...categoryDonations.map(d => d.name),
                ...categoryChats.map(c => c.name)
              ])].map((catName, index) => {
                const donation = categoryDonations.find(d => d.name === catName) || { value: 0, percent: 0 };
                const chat = categoryChats.find(c => c.name === catName) || { value: 0, percent: 0 };
                const growth = categoryGrowth.find(g => g.name === catName) || { growth: 0 };

                return (
                  <tr key={catName}>
                    <td style={{ fontWeight: 600 }}>{catName}</td>
                    <td><span className="sensitive-blur">{formatCurrency(donation.value)}</span></td>
                    <td>{donation.percent || 0}%</td>
                    <td><span className="sensitive-blur">{formatFullNumber(chat.value)}</span></td>
                    <td>{chat.percent || 0}%</td>
                    <td style={{
                      color: growth.growth > 0 ? '#10b981' : growth.growth < 0 ? '#ef4444' : chartColors.textMuted,
                      fontWeight: 600
                    }}>
                      {formatGrowth(growth.growth || 0)}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8' }}>
                  카테고리 데이터가 없습니다
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ContentAnalytics;
