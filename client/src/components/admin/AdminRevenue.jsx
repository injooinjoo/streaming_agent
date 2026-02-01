import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Calendar, RefreshCw, Trophy, Activity, Hash, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import LoadingSpinner from '../shared/LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL } from '../../config/api';
import { formatCurrency, formatCurrencyCompact, formatFullNumber, formatGrowth } from '../../utils/formatters';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const AdminRevenue = () => {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('month');
  const [data, setData] = useState({
    totalRevenue: 0,
    donationCount: 0,
    averageDonation: 0,
    growthRate: 0,
    revenueTrend: [],
    platformRevenue: [],
    monthlyComparison: [],
    topStreamers: []
  });

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const getDaysFromTimeRange = () => {
    switch (timeRange) {
      case 'week': return 7;
      case 'month': return 30;
      case 'quarter': return 90;
      case 'year': return 365;
      default: return 30;
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const days = getDaysFromTimeRange();
      const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      };

      const [revenueRes, trendRes, platformRes, monthlyRes, topRes] = await Promise.all([
        fetch(`${API_URL}/api/stats/revenue?days=${days}`, { headers }),
        fetch(`${API_URL}/api/stats/revenue/trend?days=${days}`, { headers }),
        fetch(`${API_URL}/api/stats/revenue/by-platform`, { headers }),
        fetch(`${API_URL}/api/stats/revenue/monthly?months=6`, { headers }),
        fetch(`${API_URL}/api/stats/revenue/top-streamers?limit=10`, { headers })
      ]);

      const revenue = await revenueRes.json();
      const trend = await trendRes.json();
      const platform = await platformRes.json();
      const monthly = await monthlyRes.json();
      const top = await topRes.json();

      // Add previous month data for comparison bars
      const monthlyArr = Array.isArray(monthly) ? monthly : [];
      const monthlyWithPrev = monthlyArr.map((item, i) => ({
        ...item,
        prevRevenue: i > 0 ? monthlyArr[i - 1].revenue : 0
      }));

      setData({
        totalRevenue: revenue.totalRevenue || 0,
        donationCount: revenue.donationCount || 0,
        averageDonation: revenue.averageDonation || 0,
        growthRate: revenue.growthRate || 0,
        revenueTrend: Array.isArray(trend) ? trend : [],
        platformRevenue: Array.isArray(platform) ? platform : [],
        monthlyComparison: monthlyWithPrev,
        topStreamers: Array.isArray(top) ? top : []
      });
    } catch (error) {
      console.error('Failed to fetch revenue data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderPieLabel = ({ name, percent }) => {
    if (percent < 0.05) return null;
    return `${name} ${(percent * 100).toFixed(0)}%`;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip">
          <p className="tooltip-label">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="admin-revenue">
      {/* Time Range Selector */}
      <div className="admin-toolbar">
        <div className="time-range-selector">
          <Calendar size={18} />
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="time-select"
          >
            <option value="week">지난 7일</option>
            <option value="month">지난 30일</option>
            <option value="quarter">지난 3개월</option>
            <option value="year">지난 1년</option>
          </select>
        </div>
        <button onClick={fetchData} className="admin-refresh-btn">
          <RefreshCw size={14} />
          새로고침
        </button>
      </div>

      {/* Summary Cards */}
      <div className="revenue-summary-grid">
        <div className="revenue-card">
          <div className="revenue-card-icon revenue-card-icon--primary">
            <TrendingUp size={24} />
          </div>
          <div className="revenue-card-content">
            <span className="revenue-card-label">총 후원금</span>
            <span className="revenue-card-value">{formatCurrency(data.totalRevenue)}</span>
          </div>
        </div>
        <div className="revenue-card">
          <div className="revenue-card-icon revenue-card-icon--count">
            <Hash size={24} />
          </div>
          <div className="revenue-card-content">
            <span className="revenue-card-label">후원 건수</span>
            <span className="revenue-card-value">{formatFullNumber(data.donationCount)}건</span>
          </div>
        </div>
        <div className="revenue-card">
          <div className="revenue-card-icon revenue-card-icon--average">
            <Activity size={24} />
          </div>
          <div className="revenue-card-content">
            <span className="revenue-card-label">평균 후원금</span>
            <span className="revenue-card-value">{formatCurrency(data.averageDonation)}</span>
          </div>
        </div>
        <div className="revenue-card">
          <div className={`revenue-card-icon revenue-card-icon--growth ${data.growthRate < 0 ? 'negative' : ''}`}>
            {data.growthRate >= 0 ? <ArrowUpRight size={24} /> : <ArrowDownRight size={24} />}
          </div>
          <div className="revenue-card-content">
            <span className="revenue-card-label">전기 대비</span>
            <span className={`revenue-card-value ${data.growthRate >= 0 ? 'text-positive' : 'text-negative'}`}>
              {formatGrowth(data.growthRate)}
            </span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="admin-charts-grid">
        {/* Revenue Trend Chart */}
        <div className="admin-chart-card large">
          <div className="chart-header">
            <h3>후원 트렌드</h3>
          </div>
          <div className="chart-body">
            {Array.isArray(data.revenueTrend) && data.revenueTrend.some(t => t.donations > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data.revenueTrend}>
                  <defs>
                    <linearGradient id="donationGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => formatCurrencyCompact(v, { showSymbol: false })} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="donations"
                    name="후원금"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#donationGradient)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data-message">
                <Activity size={48} />
                <p>후원 데이터가 없습니다</p>
                <p>플랫폼 연결 후 후원 데이터가 수집됩니다</p>
              </div>
            )}
          </div>
        </div>

        {/* Platform Revenue Chart */}
        <div className="admin-chart-card">
          <div className="chart-header">
            <h3>플랫폼별 수익</h3>
          </div>
          <div className="chart-body">
            {data.platformRevenue.length > 0 && data.platformRevenue.some(p => p.value > 0) ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={data.platformRevenue}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    nameKey="name"
                    label={renderPieLabel}
                    labelLine={true}
                  >
                    {data.platformRevenue.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data-message">
                <TrendingUp size={48} />
                <p>플랫폼별 데이터가 없습니다</p>
              </div>
            )}
          </div>
        </div>

        {/* Monthly Comparison Chart */}
        <div className="admin-chart-card">
          <div className="chart-header">
            <h3>월별 비교</h3>
          </div>
          <div className="chart-body">
            {data.monthlyComparison.length > 0 && data.monthlyComparison.some(m => m.revenue > 0) ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.monthlyComparison}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => formatCurrencyCompact(v, { showSymbol: false })} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="prevRevenue" name="전월" fill="#334155" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="revenue" name="당월" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data-message">
                <Calendar size={48} />
                <p>월별 데이터가 없습니다</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Streamers by Revenue */}
      <div className="admin-top-list-card">
        <div className="top-list-header">
          <Trophy size={20} />
          <h3>후원 TOP 10</h3>
        </div>
        <div className="top-list-body">
          {data.topStreamers.length > 0 ? (
            <table className="top-list-table">
              <thead>
                <tr>
                  <th>순위</th>
                  <th>닉네임</th>
                  <th>총 후원금</th>
                  <th>후원 건수</th>
                  <th>점유율</th>
                </tr>
              </thead>
              <tbody>
                {data.topStreamers.map((streamer, index) => (
                  <tr key={streamer.id}>
                    <td>
                      <span className={`rank-badge rank-${index + 1}`}>
                        {index + 1}
                      </span>
                    </td>
                    <td>
                      <div className="streamer-cell">
                        <div className="streamer-avatar">
                          {streamer.username?.charAt(0).toUpperCase()}
                        </div>
                        <span>{streamer.username}</span>
                      </div>
                    </td>
                    <td>{formatCurrency(streamer.totalRevenue)}</td>
                    <td>{formatFullNumber(streamer.donationCount)}건</td>
                    <td>
                      <div className="share-bar">
                        <div
                          className="share-fill"
                          style={{ width: `${parseFloat(streamer.share)}%`, backgroundColor: '#6366f1' }}
                        />
                        <span>{streamer.share}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="no-data-message">
              <Trophy size={48} />
              <p>후원 데이터가 없습니다</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminRevenue;
