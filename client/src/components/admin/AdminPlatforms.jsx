import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, MessageSquare, DollarSign, Users, Activity } from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const PLATFORM_COLORS = {
  soop: '#0066ff',
  chzzk: '#00dc64',
  youtube: '#ff0000',
  twitch: '#9146ff'
};

const PLATFORM_NAMES = {
  soop: 'SOOP',
  chzzk: 'Chzzk',
  youtube: 'YouTube',
  twitch: 'Twitch'
};

const AdminPlatforms = () => {
  const [loading, setLoading] = useState(true);

  // Mock 데이터 생성
  const data = useMemo(() => {
    const platforms = [
      { id: 'soop', name: 'SOOP', totalEvents: 325000, chatCount: 2850000, donations: 180000000, avgDonation: 8500, streamerCount: 856, growth: 12.5 },
      { id: 'chzzk', name: 'Chzzk', totalEvents: 412000, chatCount: 3450000, donations: 165000000, avgDonation: 7200, streamerCount: 1024, growth: 28.3 },
      { id: 'youtube', name: 'YouTube', totalEvents: 156000, chatCount: 1280000, donations: 85000000, avgDonation: 12000, streamerCount: 425, growth: 5.2 },
      { id: 'twitch', name: 'Twitch', totalEvents: 89000, chatCount: 720000, donations: 55000000, avgDonation: 9500, streamerCount: 215, growth: -3.8 }
    ];

    const radarData = [
      { metric: '이벤트', soop: 80, chzzk: 100, youtube: 45, twitch: 30 },
      { metric: '채팅', soop: 75, chzzk: 90, youtube: 40, twitch: 25 },
      { metric: '후원', soop: 100, chzzk: 85, youtube: 50, twitch: 35 },
      { metric: '스트리머', soop: 70, chzzk: 85, youtube: 40, twitch: 20 },
      { metric: '성장률', soop: 60, chzzk: 100, youtube: 40, twitch: 15 }
    ];

    const eventDistribution = [
      { type: '채팅', soop: 285000, chzzk: 345000, youtube: 128000, twitch: 72000 },
      { type: '후원', soop: 25000, chzzk: 42000, youtube: 18000, twitch: 12000 },
      { type: '구독', soop: 12000, chzzk: 18000, youtube: 8000, twitch: 4000 },
      { type: '호스팅', soop: 3000, chzzk: 7000, youtube: 2000, twitch: 1000 }
    ];

    return { platforms, radarData, eventDistribution };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num?.toLocaleString() || '0';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="admin-loading-section">
        <RefreshCw size={24} className="spin" />
        <p>데이터 로딩 중...</p>
      </div>
    );
  }

  const { platforms, radarData, eventDistribution } = data;

  return (
    <div className="admin-platforms">
      {/* Platform Cards */}
      <div className="platform-cards-grid">
        {platforms.map((platform) => (
          <div
            key={platform.id}
            className="platform-card"
            style={{ borderColor: PLATFORM_COLORS[platform.id] }}
          >
            <div className="platform-card-header">
              <img
                src={`/assets/logos/${platform.id}.png`}
                alt={PLATFORM_NAMES[platform.id]}
                className="platform-logo"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <h3>{PLATFORM_NAMES[platform.id]}</h3>
            </div>
            <div className="platform-card-stats">
              <div className="platform-stat">
                <Activity size={16} />
                <span className="stat-label">이벤트</span>
                <span className="stat-value">{formatNumber(platform.totalEvents)}</span>
              </div>
              <div className="platform-stat">
                <MessageSquare size={16} />
                <span className="stat-label">채팅</span>
                <span className="stat-value">{formatNumber(platform.chatCount)}</span>
              </div>
              <div className="platform-stat">
                <DollarSign size={16} />
                <span className="stat-label">후원</span>
                <span className="stat-value">{formatCurrency(platform.donations)}</span>
              </div>
              <div className="platform-stat">
                <Users size={16} />
                <span className="stat-label">스트리머</span>
                <span className="stat-value">{formatNumber(platform.streamerCount)}</span>
              </div>
            </div>
            <div className="platform-card-growth">
              <span
                className={`growth-badge ${platform.growth >= 0 ? 'positive' : 'negative'}`}
              >
                {platform.growth >= 0 ? '+' : ''}{platform.growth}%
              </span>
              <span className="growth-label">전월 대비</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="admin-charts-grid">
        {/* Radar Chart - Platform Comparison */}
        <div className="admin-chart-card">
          <div className="chart-header">
            <h3>플랫폼 종합 비교</h3>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="metric" stroke="#94a3b8" fontSize={12} />
                <PolarRadiusAxis stroke="#334155" />
                {platforms.map((platform) => (
                  <Radar
                    key={platform.id}
                    name={PLATFORM_NAMES[platform.id]}
                    dataKey={platform.id}
                    stroke={PLATFORM_COLORS[platform.id]}
                    fill={PLATFORM_COLORS[platform.id]}
                    fillOpacity={0.2}
                  />
                ))}
                <Legend />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart - Event Distribution */}
        <div className="admin-chart-card">
          <div className="chart-header">
            <h3>이벤트 유형별 분포</h3>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={eventDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="type" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                {platforms.map((platform) => (
                  <Bar
                    key={platform.id}
                    dataKey={platform.id}
                    name={PLATFORM_NAMES[platform.id]}
                    fill={PLATFORM_COLORS[platform.id]}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Platform Comparison Table */}
      <div className="admin-table-card">
        <div className="table-header">
          <h3>상세 비교표</h3>
        </div>
        <div className="admin-table-container">
          <table className="admin-table comparison-table">
            <thead>
              <tr>
                <th>지표</th>
                {platforms.map((platform) => (
                  <th key={platform.id} style={{ color: PLATFORM_COLORS[platform.id] }}>
                    {PLATFORM_NAMES[platform.id]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>총 이벤트</td>
                {platforms.map((platform) => (
                  <td key={platform.id}>{formatNumber(platform.totalEvents)}</td>
                ))}
              </tr>
              <tr>
                <td>채팅 수</td>
                {platforms.map((platform) => (
                  <td key={platform.id}>{formatNumber(platform.chatCount)}</td>
                ))}
              </tr>
              <tr>
                <td>총 후원금</td>
                {platforms.map((platform) => (
                  <td key={platform.id}>{formatCurrency(platform.donations)}</td>
                ))}
              </tr>
              <tr>
                <td>평균 후원금</td>
                {platforms.map((platform) => (
                  <td key={platform.id}>{formatCurrency(platform.avgDonation)}</td>
                ))}
              </tr>
              <tr>
                <td>스트리머 수</td>
                {platforms.map((platform) => (
                  <td key={platform.id}>{formatNumber(platform.streamerCount)}</td>
                ))}
              </tr>
              <tr>
                <td>월간 성장률</td>
                {platforms.map((platform) => (
                  <td
                    key={platform.id}
                    className={platform.growth >= 0 ? 'positive' : 'negative'}
                  >
                    {platform.growth >= 0 ? '+' : ''}{platform.growth}%
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminPlatforms;
