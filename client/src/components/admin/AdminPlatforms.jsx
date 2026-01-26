import React, { useState, useEffect } from 'react';
import { RefreshCw, MessageSquare, DollarSign, Users, Activity, Wifi, WifiOff } from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import LoadingSpinner from '../shared/LoadingSpinner';

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
  const [platforms, setPlatforms] = useState([]);
  const [connections, setConnections] = useState({ soop: {}, chzzk: {} });
  const [eventsByPlatform, setEventsByPlatform] = useState([]);
  const [donations, setDonations] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [eventsRes, donationsRes, connectionsRes] = await Promise.all([
        fetch('http://localhost:3001/api/stats/events/by-platform'),
        fetch('http://localhost:3001/api/stats/donations'),
        fetch('http://localhost:3001/api/connections/status')
      ]);

      const events = await eventsRes.json();
      const donationsData = await donationsRes.json();
      const connectionsData = await connectionsRes.json();

      setEventsByPlatform(events);
      setDonations(donationsData);
      setConnections(connectionsData);

      // 플랫폼 데이터 생성
      const platformData = ['soop', 'chzzk'].map(id => {
        const eventData = events.find(e => e.platform === id);
        const donationData = donationsData.find(d => d.platform === id);
        const connected = connectionsData[id]?.connected || false;

        return {
          id,
          name: PLATFORM_NAMES[id],
          connected,
          totalEvents: eventData?.count || 0,
          donations: donationData?.total || 0,
          donationCount: donationData?.count || 0,
          avgDonation: donationData?.average || 0
        };
      });

      setPlatforms(platformData);
    } catch (error) {
      console.error('Failed to fetch platform data:', error);
    } finally {
      setLoading(false);
    }
  };

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
    return <LoadingSpinner />;
  }

  // 차트 데이터 생성
  const radarData = [
    {
      metric: '이벤트',
      soop: platforms.find(p => p.id === 'soop')?.totalEvents || 0,
      chzzk: platforms.find(p => p.id === 'chzzk')?.totalEvents || 0
    },
    {
      metric: '후원금',
      soop: platforms.find(p => p.id === 'soop')?.donations || 0,
      chzzk: platforms.find(p => p.id === 'chzzk')?.donations || 0
    },
    {
      metric: '후원건수',
      soop: platforms.find(p => p.id === 'soop')?.donationCount || 0,
      chzzk: platforms.find(p => p.id === 'chzzk')?.donationCount || 0
    }
  ];

  // 바 차트용 데이터
  const barChartData = [
    {
      type: '후원',
      soop: platforms.find(p => p.id === 'soop')?.donationCount || 0,
      chzzk: platforms.find(p => p.id === 'chzzk')?.donationCount || 0
    },
    {
      type: '이벤트',
      soop: platforms.find(p => p.id === 'soop')?.totalEvents || 0,
      chzzk: platforms.find(p => p.id === 'chzzk')?.totalEvents || 0
    }
  ];

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
              {platform.connected ? (
                <Wifi size={16} style={{ color: '#10b981' }} />
              ) : (
                <WifiOff size={16} style={{ color: '#ef4444' }} />
              )}
            </div>
            <div className="platform-card-stats">
              <div className="platform-stat">
                <Activity size={16} />
                <span className="stat-label">이벤트</span>
                <span className="stat-value">{formatNumber(platform.totalEvents)}</span>
              </div>
              <div className="platform-stat">
                <MessageSquare size={16} />
                <span className="stat-label">후원 건수</span>
                <span className="stat-value">{formatNumber(platform.donationCount)}</span>
              </div>
              <div className="platform-stat">
                <DollarSign size={16} />
                <span className="stat-label">총 후원금</span>
                <span className="stat-value">{formatCurrency(platform.donations)}</span>
              </div>
              <div className="platform-stat">
                <Users size={16} />
                <span className="stat-label">평균 후원</span>
                <span className="stat-value">{formatCurrency(Math.round(platform.avgDonation))}</span>
              </div>
            </div>
            <div className="platform-card-growth">
              <span className={`growth-badge ${platform.connected ? 'positive' : 'negative'}`}>
                {platform.connected ? '연결됨' : '미연결'}
              </span>
              <span className="growth-label">현재 상태</span>
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
            {platforms.some(p => p.totalEvents > 0 || p.donations > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="metric" stroke="#94a3b8" fontSize={12} />
                  <PolarRadiusAxis stroke="#334155" />
                  <Radar
                    name="SOOP"
                    dataKey="soop"
                    stroke={PLATFORM_COLORS.soop}
                    fill={PLATFORM_COLORS.soop}
                    fillOpacity={0.2}
                  />
                  <Radar
                    name="Chzzk"
                    dataKey="chzzk"
                    stroke={PLATFORM_COLORS.chzzk}
                    fill={PLATFORM_COLORS.chzzk}
                    fillOpacity={0.2}
                  />
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data-message" style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                <Activity size={48} style={{ opacity: 0.5, marginBottom: '16px' }} />
                <p>플랫폼 연결 후 데이터가 표시됩니다</p>
              </div>
            )}
          </div>
        </div>

        {/* Bar Chart - Event Distribution */}
        <div className="admin-chart-card">
          <div className="chart-header">
            <h3>플랫폼별 데이터 분포</h3>
          </div>
          <div className="chart-body">
            {platforms.some(p => p.totalEvents > 0 || p.donationCount > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barChartData}>
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
                  <Bar dataKey="soop" name="SOOP" fill={PLATFORM_COLORS.soop} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="chzzk" name="Chzzk" fill={PLATFORM_COLORS.chzzk} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data-message" style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                <DollarSign size={48} style={{ opacity: 0.5, marginBottom: '16px' }} />
                <p>후원 데이터가 없습니다</p>
              </div>
            )}
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
                <td>연결 상태</td>
                {platforms.map((platform) => (
                  <td key={platform.id} className={platform.connected ? 'positive' : 'negative'}>
                    {platform.connected ? '연결됨' : '미연결'}
                  </td>
                ))}
              </tr>
              <tr>
                <td>총 이벤트</td>
                {platforms.map((platform) => (
                  <td key={platform.id}>{formatNumber(platform.totalEvents)}</td>
                ))}
              </tr>
              <tr>
                <td>후원 건수</td>
                {platforms.map((platform) => (
                  <td key={platform.id}>{formatNumber(platform.donationCount)}</td>
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
                  <td key={platform.id}>{formatCurrency(Math.round(platform.avgDonation))}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Refresh Button */}
      <button
        onClick={fetchData}
        style={{
          marginTop: '16px',
          padding: '12px 24px',
          background: 'var(--color-primary)',
          border: 'none',
          borderRadius: '8px',
          color: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <RefreshCw size={16} />
        데이터 새로고침
      </button>
    </div>
  );
};

export default AdminPlatforms;
