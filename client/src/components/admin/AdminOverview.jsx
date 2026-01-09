import React, { useState, useEffect, useMemo } from 'react';
import { Users, DollarSign, Megaphone, Activity, TrendingUp, Calendar, RefreshCw } from 'lucide-react';

const AdminOverview = () => {
  const [loading, setLoading] = useState(true);

  // Mock 데이터 생성
  const data = useMemo(() => ({
    totalStreamers: 1247,
    totalAdRevenue: 485000000,
    activeCampaigns: 38,
    totalEvents: 892450,
    monthlyNewStreamers: 86,
    monthlyBroadcastHours: 45280,
    avgViewers: 24500,
    monthlyDonations: 125000000,
    platformConnections: 4,
    activeOverlays: 3847,
    adImpressions: 12500000,
    adCTR: 3.85,
    recentActivity: [
      { text: '감스트님이 새 캠페인에 참여했습니다', time: '5분 전', color: '#6366f1' },
      { text: '풍월량님의 오버레이가 업데이트되었습니다', time: '12분 전', color: '#10b981' },
      { text: '새로운 광고주 등록: GameStation', time: '28분 전', color: '#f59e0b' },
      { text: '주르르님이 목표 달성 100% 완료', time: '45분 전', color: '#8b5cf6' },
      { text: '시스템 점검 완료', time: '1시간 전', color: '#94a3b8' }
    ]
  }), []);

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

  const metrics = [
    {
      title: '총 스트리머',
      value: formatNumber(data.totalStreamers),
      icon: <Users size={24} />,
      color: '#6366f1',
      change: '+12%',
      changeType: 'positive'
    },
    {
      title: '광고 수익',
      value: formatCurrency(data.totalAdRevenue),
      icon: <DollarSign size={24} />,
      color: '#10b981',
      change: '+8.5%',
      changeType: 'positive'
    },
    {
      title: '활성 캠페인',
      value: formatNumber(data.activeCampaigns),
      icon: <Megaphone size={24} />,
      color: '#f59e0b',
      change: '+3',
      changeType: 'positive'
    },
    {
      title: '총 이벤트',
      value: formatNumber(data.totalEvents),
      icon: <Activity size={24} />,
      color: '#ef4444',
      change: '+24%',
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
                {metric.change} 이번 달
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
            <h3>이번 달 요약</h3>
          </div>
          <div className="summary-content">
            <div className="summary-item">
              <span className="summary-label">신규 스트리머</span>
              <span className="summary-value">{data.monthlyNewStreamers}명</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">총 방송 시간</span>
              <span className="summary-value">{formatNumber(data.monthlyBroadcastHours)}시간</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">평균 시청자</span>
              <span className="summary-value">{formatNumber(data.avgViewers)}명</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">총 후원금</span>
              <span className="summary-value">{formatCurrency(data.monthlyDonations)}</span>
            </div>
          </div>
        </div>

        <div className="admin-summary-card">
          <div className="summary-header">
            <TrendingUp size={20} />
            <h3>빠른 통계</h3>
          </div>
          <div className="summary-content">
            <div className="summary-item">
              <span className="summary-label">플랫폼 연동</span>
              <span className="summary-value">{data.platformConnections}개</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">활성 오버레이</span>
              <span className="summary-value">{data.activeOverlays}개</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">광고 노출</span>
              <span className="summary-value">{formatNumber(data.adImpressions)}회</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">광고 클릭률</span>
              <span className="summary-value">{data.adCTR.toFixed(2)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="admin-activity-card">
        <div className="activity-header">
          <Activity size={20} />
          <h3>최근 활동</h3>
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
    </div>
  );
};

export default AdminOverview;
