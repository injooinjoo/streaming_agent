import React, { useState, useEffect, useMemo } from 'react';
import { DollarSign, TrendingUp, Calendar, RefreshCw, Trophy } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const AdminRevenue = () => {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('month');

  // Mock 데이터 생성
  const data = useMemo(() => {
    // 수익 트렌드 데이터 (30일)
    const revenueTrend = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return {
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        adRevenue: 10000000 + Math.floor(Math.random() * 8000000),
        donations: 5000000 + Math.floor(Math.random() * 6000000)
      };
    });

    // 플랫폼별 수익
    const platformRevenue = [
      { name: 'SOOP', value: 180000000 },
      { name: 'Chzzk', value: 165000000 },
      { name: 'YouTube', value: 85000000 },
      { name: 'Twitch', value: 55000000 }
    ];

    // 월별 비교
    const monthlyComparison = [
      { month: '8월', revenue: 380000000 },
      { month: '9월', revenue: 420000000 },
      { month: '10월', revenue: 455000000 },
      { month: '11월', revenue: 440000000 },
      { month: '12월', revenue: 510000000 },
      { month: '1월', revenue: 485000000 }
    ];

    // TOP 10 스트리머
    const topStreamers = [
      { id: 1, username: '감스트', totalRevenue: 48500000, share: 10.0 },
      { id: 2, username: '풍월량', totalRevenue: 42000000, share: 8.7 },
      { id: 3, username: '우왁굳', totalRevenue: 38000000, share: 7.8 },
      { id: 4, username: '침착맨', totalRevenue: 32000000, share: 6.6 },
      { id: 5, username: '주르르', totalRevenue: 28000000, share: 5.8 },
      { id: 6, username: '릴파', totalRevenue: 34000000, share: 7.0 },
      { id: 7, username: '고세구', totalRevenue: 29000000, share: 6.0 },
      { id: 8, username: '비챤', totalRevenue: 26000000, share: 5.4 },
      { id: 9, username: '아이리칸나', totalRevenue: 22000000, share: 4.5 },
      { id: 10, username: '징버거', totalRevenue: 21000000, share: 4.3 }
    ];

    return {
      totalRevenue: 485000000,
      adRevenue: 320000000,
      donationRevenue: 165000000,
      revenueTrend,
      platformRevenue,
      monthlyComparison,
      topStreamers
    };
  }, [timeRange]);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, [timeRange]);

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
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={formatCompactCurrency} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="adRevenue"
                  name="광고 수익"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={false}
                />
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
          </div>
        </div>

        {/* Platform Revenue Chart */}
        <div className="admin-chart-card">
          <div className="chart-header">
            <h3>플랫폼별 수익</h3>
          </div>
          <div className="chart-body">
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
          </div>
        </div>

        {/* Monthly Comparison Chart */}
        <div className="admin-chart-card">
          <div className="chart-header">
            <h3>월별 비교</h3>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.monthlyComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={formatCompactCurrency} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" name="수익" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Streamers by Revenue */}
      <div className="admin-top-list-card">
        <div className="top-list-header">
          <Trophy size={20} />
          <h3>수익 TOP 10 스트리머</h3>
        </div>
        <div className="top-list-body">
          <table className="top-list-table">
            <thead>
              <tr>
                <th>순위</th>
                <th>스트리머</th>
                <th>총 수익</th>
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
                        style={{ width: `${streamer.share * 10}%`, backgroundColor: '#6366f1' }}
                      />
                      <span>{streamer.share.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminRevenue;
