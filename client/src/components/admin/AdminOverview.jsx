import React, { useState, useEffect } from 'react';
import { Users, DollarSign, Megaphone, Activity, TrendingUp, Calendar, RefreshCw, Wifi } from 'lucide-react';
import LoadingSpinner from '../shared/LoadingSpinner';

const AdminOverview = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    totalEvents: 0,
    totalDonations: 0,
    donationsByPlatform: [],
    platformConnections: { soop: { connected: false }, chzzk: { connected: false } },
    recentActivity: []
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [eventsRes, donationsRes, connectionsRes, trendRes] = await Promise.all([
        fetch('http://localhost:3001/api/stats/events/count'),
        fetch('http://localhost:3001/api/stats/donations'),
        fetch('http://localhost:3001/api/connections/status'),
        fetch('http://localhost:3001/api/stats/donations/trend')
      ]);

      const events = await eventsRes.json();
      const donations = await donationsRes.json();
      const connections = await connectionsRes.json();
      const trend = await trendRes.json();

      // 총 후원금 계산
      const totalDonations = donations.reduce((sum, d) => sum + (d.total || 0), 0);

      // 최근 활동 생성 (트렌드 데이터 기반)
      const recentActivity = trend.slice(-5).reverse().map(t => ({
        text: `${t.date}: ${t.count}건의 후원, 총 ${formatCurrency(t.total)}`,
        time: new Date(t.date).toLocaleDateString('ko-KR'),
        color: '#10b981'
      }));

      // 연결된 플랫폼 수
      const connectedPlatforms = (connections.soop?.connected ? 1 : 0) + (connections.chzzk?.connected ? 1 : 0);

      setData({
        totalEvents: events.total || 0,
        totalDonations,
        donationsByPlatform: donations,
        platformConnections: connections,
        connectedPlatforms,
        recentActivity: recentActivity.length > 0 ? recentActivity : [
          { text: '아직 활동 데이터가 없습니다', time: '지금', color: '#94a3b8' }
        ]
      });
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
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

  // 플랫폼별 후원금 계산
  const soopDonations = data.donationsByPlatform.find(d => d.platform === 'soop')?.total || 0;
  const chzzkDonations = data.donationsByPlatform.find(d => d.platform === 'chzzk')?.total || 0;

  const metrics = [
    {
      title: '연결된 플랫폼',
      value: data.connectedPlatforms || 0,
      icon: <Wifi size={24} />,
      color: '#6366f1',
      change: data.platformConnections?.soop?.connected || data.platformConnections?.chzzk?.connected ? '활성' : '비활성',
      changeType: data.connectedPlatforms > 0 ? 'positive' : 'neutral'
    },
    {
      title: '총 후원금',
      value: formatCurrency(data.totalDonations),
      icon: <DollarSign size={24} />,
      color: '#10b981',
      change: `${data.donationsByPlatform.length}개 플랫폼`,
      changeType: 'positive'
    },
    {
      title: '후원 건수',
      value: formatNumber(data.donationsByPlatform.reduce((sum, d) => sum + (d.count || 0), 0)),
      icon: <Megaphone size={24} />,
      color: '#f59e0b',
      change: '전체',
      changeType: 'positive'
    },
    {
      title: '총 이벤트',
      value: formatNumber(data.totalEvents),
      icon: <Activity size={24} />,
      color: '#ef4444',
      change: 'DB 기록',
      changeType: 'positive'
    }
  ];

  return (
    <div className="admin-overview">
      {/* Metric Cards */}
      <div className="admin-metrics-grid">
        {metrics.map((metric, index) => (
          <div key={index} className="admin-metric-card">
            <div className="metric-icon" style={{ backgroundColor: `${metric.color}20`, color: metric.color }}>
              {metric.icon}
            </div>
            <div className="metric-content">
              <span className="metric-title">{metric.title}</span>
              <span className="metric-value">{metric.value}</span>
              <span className={`metric-change ${metric.changeType}`}>
                <TrendingUp size={14} />
                {metric.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Section */}
      <div className="admin-summary-grid">
        <div className="admin-summary-card">
          <div className="summary-header">
            <Calendar size={20} />
            <h3>플랫폼별 후원</h3>
          </div>
          <div className="summary-content">
            <div className="summary-item">
              <span className="summary-label">SOOP 후원금</span>
              <span className="summary-value">{formatCurrency(soopDonations)}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Chzzk 후원금</span>
              <span className="summary-value">{formatCurrency(chzzkDonations)}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">SOOP 연결</span>
              <span className="summary-value" style={{ color: data.platformConnections?.soop?.connected ? '#10b981' : '#ef4444' }}>
                {data.platformConnections?.soop?.connected ? '연결됨' : '미연결'}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Chzzk 연결</span>
              <span className="summary-value" style={{ color: data.platformConnections?.chzzk?.connected ? '#10b981' : '#ef4444' }}>
                {data.platformConnections?.chzzk?.connected ? '연결됨' : '미연결'}
              </span>
            </div>
          </div>
        </div>

        <div className="admin-summary-card">
          <div className="summary-header">
            <TrendingUp size={20} />
            <h3>플랫폼별 통계</h3>
          </div>
          <div className="summary-content">
            {data.donationsByPlatform.length > 0 ? (
              data.donationsByPlatform.map((platform, index) => (
                <div key={index} className="summary-item">
                  <span className="summary-label">{platform.platform.toUpperCase()}</span>
                  <span className="summary-value">
                    {platform.count}건 / {formatCurrency(platform.total)}
                  </span>
                </div>
              ))
            ) : (
              <div className="summary-item">
                <span className="summary-label">데이터 없음</span>
                <span className="summary-value">플랫폼 연결 후 데이터가 수집됩니다</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="admin-activity-card">
        <div className="activity-header">
          <Activity size={20} />
          <h3>최근 후원 트렌드</h3>
        </div>
        <div className="activity-list">
          {data.recentActivity.map((activity, index) => (
            <div key={index} className="activity-item">
              <div className="activity-dot" style={{ backgroundColor: activity.color }} />
              <div className="activity-content">
                <span className="activity-text">{activity.text}</span>
                <span className="activity-time">{activity.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Refresh Button */}
      <button
        className="admin-refresh-btn"
        onClick={fetchAllData}
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

export default AdminOverview;
