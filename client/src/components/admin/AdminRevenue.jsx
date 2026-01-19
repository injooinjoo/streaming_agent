import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Calendar, RefreshCw, Trophy, Activity } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const AdminRevenue = () => {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('month');
  const [data, setData] = useState({
    totalRevenue: 0,
    adRevenue: 0,
    donationRevenue: 0,
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

      const [revenueRes, trendRes, platformRes, monthlyRes, topRes] = await Promise.all([
        fetch(`http://localhost:3001/api/stats/revenue?days=${days}`),
        fetch(`http://localhost:3001/api/stats/revenue/trend?days=${days}`),
        fetch('http://localhost:3001/api/stats/revenue/by-platform'),
        fetch('http://localhost:3001/api/stats/revenue/monthly?months=6'),
        fetch('http://localhost:3001/api/stats/revenue/top-streamers?limit=10')
      ]);

      const revenue = await revenueRes.json();
      const trend = await trendRes.json();
      const platform = await platformRes.json();
      const monthly = await monthlyRes.json();
      const top = await topRes.json();

      setData({
        totalRevenue: revenue.totalRevenue || 0,
        adRevenue: revenue.adRevenue || 0,
        donationRevenue: revenue.donationRevenue || 0,
        revenueTrend: trend || [],
        platformRevenue: platform || [],
        monthlyComparison: monthly || [],
        topStreamers: top || []
      });
    } catch (error) {
      console.error('Failed to fetch revenue data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatCompactCurrency = (amount) => {
    if (amount >= 1000000) return `₩${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `₩${(amount / 1000).toFixed(0)}K`;
    return `₩${amount}`;
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
    return (
      <div className="admin-loading-section">
        <RefreshCw size={24} className="spin" />
        <p>데이터 로딩 중...</p>
      </div>
    );
  }

  const hasData = data.totalRevenue > 0 || data.revenueTrend.some(t => t.donations > 0);

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
        <button
          onClick={fetchData}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: 'var(--color-primary)',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={14} />
          새로고침
        </button>
      </div>

      {/* Summary Cards */}
      <div className="revenue-summary-grid">
        <div className="revenue-card">
          <div className="revenue-card-icon" style={{ backgroundColor: '#6366f120', color: '#6366f1' }}>
            <DollarSign size={24} />
          </div>
          <div className="revenue-card-content">
            <span className="revenue-card-label">총 수익</span>
            <span className="revenue-card-value">{formatCurrency(data.totalRevenue)}</span>
          </div>
        </div>
        <div className="revenue-card">
          <div className="revenue-card-icon" style={{ backgroundColor: '#10b98120', color: '#10b981' }}>
            <TrendingUp size={24} />
          </div>
          <div className="revenue-card-content">
            <span className="revenue-card-label">광고 수익</span>
            <span className="revenue-card-value">{formatCurrency(data.adRevenue)}</span>
          </div>
        </div>
        <div className="revenue-card">
          <div className="revenue-card-icon" style={{ backgroundColor: '#f59e0b20', color: '#f59e0b' }}>
            <DollarSign size={24} />
          </div>
          <div className="revenue-card-content">
            <span className="revenue-card-label">후원 수익</span>
            <span className="revenue-card-value">{formatCurrency(data.donationRevenue)}</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="admin-charts-grid">
        {/* Revenue Trend Chart */}
        <div className="admin-chart-card large">
          <div className="chart-header">
            <h3>수익 트렌드</h3>
          </div>
          <div className="chart-body">
            {data.revenueTrend.some(t => t.donations > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={formatCompactCurrency} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="donations"
                    name="후원금"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data-message" style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                <Activity size={48} style={{ opacity: 0.5, marginBottom: '16px' }} />
                <p>수익 데이터가 없습니다</p>
                <p style={{ fontSize: '12px' }}>플랫폼 연결 후 후원 데이터가 수집됩니다</p>
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
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    nameKey="name"
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
              <div className="no-data-message" style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                <DollarSign size={48} style={{ opacity: 0.5, marginBottom: '16px' }} />
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
                  <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={formatCompactCurrency} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="revenue" name="수익" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data-message" style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                <Calendar size={48} style={{ opacity: 0.5, marginBottom: '16px' }} />
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
                    <td>
                      <div className="share-bar">
                        <div
                          className="share-fill"
                          style={{ width: `${parseFloat(streamer.share) * 10}%`, backgroundColor: '#6366f1' }}
                        />
                        <span>{streamer.share}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="no-data-message" style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
              <Trophy size={48} style={{ opacity: 0.5, marginBottom: '16px' }} />
              <p>후원 데이터가 없습니다</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminRevenue;
