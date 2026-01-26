import React, { useState, useEffect, useMemo } from 'react';
import {
  RefreshCw, Calendar, MessageSquare, Heart, MousePointer, Zap,
  Award, TrendingUp, TrendingDown
} from 'lucide-react';
import {
  AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ComposedChart, Bar
} from 'recharts';
import LoadingSpinner from '../shared/LoadingSpinner';

// Campaign Metrics
const CAMPAIGN_METRICS = {
  brandKeywordMentions: 18420,
  mentionsChange: 24.5,
  sentimentIndex: 78.5,
  sentimentChange: 3.2,
  estimatedConversions: 2840,
  conversionChange: 18.7,
  campaignROI: 342,
  roiChange: 15.2
};

// Brand Mention Time Series (7 days)
const BRAND_MENTION_SERIES = [
  { date: '01/03', mentions: 2100, sentiment: 75 },
  { date: '01/04', mentions: 2450, sentiment: 78 },
  { date: '01/05', mentions: 3200, sentiment: 82 },
  { date: '01/06', mentions: 2890, sentiment: 80 },
  { date: '01/07', mentions: 3500, sentiment: 85 },
  { date: '01/08', mentions: 2780, sentiment: 77 },
  { date: '01/09', mentions: 3100, sentiment: 79 }
];

// Campaign List
const CAMPAIGN_LIST = [
  {
    id: 1,
    name: '더퍼디 런칭 캠페인',
    startDate: '2026-01-01',
    endDate: '2026-01-15',
    budget: 50000000,
    impressions: 12500000,
    engagements: 850000,
    conversions: 1200,
    roi: 385,
    status: 'active'
  },
  {
    id: 2,
    name: '블루아카 3주년 기념',
    startDate: '2025-12-15',
    endDate: '2025-12-31',
    budget: 35000000,
    impressions: 8200000,
    engagements: 620000,
    conversions: 890,
    roi: 312,
    status: 'completed'
  },
  {
    id: 3,
    name: 'FC온라인 윈터 시즌',
    startDate: '2026-01-10',
    endDate: '2026-01-25',
    budget: 42000000,
    impressions: 0,
    engagements: 0,
    conversions: 0,
    roi: 0,
    status: 'scheduled'
  },
  {
    id: 4,
    name: '메이플 드리머 업데이트',
    startDate: '2025-11-20',
    endDate: '2025-12-10',
    budget: 28000000,
    impressions: 6800000,
    engagements: 480000,
    conversions: 720,
    roi: 278,
    status: 'completed'
  }
];

const AdminNexonCampaign = () => {
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState('all');

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const formatNumber = (num) => {
    if (num >= 100000000) return `${(num / 100000000).toFixed(1)}억`;
    if (num >= 10000) return `${(num / 10000).toFixed(1)}만`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}천`;
    return num.toLocaleString();
  };

  const formatCurrency = (amount) => {
    if (amount >= 100000000) return `₩${(amount / 100000000).toFixed(1)}억`;
    if (amount >= 10000000) return `₩${(amount / 10000000).toFixed(1)}천만`;
    return `₩${amount.toLocaleString()}`;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip">
          <p className="tooltip-label">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.name === '감성지수' ? `${entry.value}%` : formatNumber(entry.value)}
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
    <div className="admin-nexon-campaign">
      {/* Header */}
      <div className="admin-toolbar">
        <div className="time-range-selector">
          <Calendar size={18} />
          <select
            value={selectedCampaign}
            onChange={(e) => setSelectedCampaign(e.target.value)}
            className="time-select"
          >
            <option value="all">전체 캠페인</option>
            {CAMPAIGN_LIST.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <button className="admin-refresh-btn" disabled={loading}>
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
        </button>
      </div>

      {/* Campaign Metrics Cards */}
      <div className="campaign-metrics-grid">
        <div className="campaign-metric-card">
          <div className="campaign-metric-header">
            <div className="campaign-metric-icon" style={{ backgroundColor: '#6366f120', color: '#6366f1' }}>
              <MessageSquare size={22} />
            </div>
            <span className={`campaign-metric-change ${CAMPAIGN_METRICS.mentionsChange >= 0 ? 'positive' : 'negative'}`}>
              {CAMPAIGN_METRICS.mentionsChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {Math.abs(CAMPAIGN_METRICS.mentionsChange)}%
            </span>
          </div>
          <p className="campaign-metric-label">브랜드 키워드 언급</p>
          <p className="campaign-metric-value">{formatNumber(CAMPAIGN_METRICS.brandKeywordMentions)}</p>
        </div>

        <div className="campaign-metric-card">
          <div className="campaign-metric-header">
            <div className="campaign-metric-icon" style={{ backgroundColor: '#ef444420', color: '#ef4444' }}>
              <Heart size={22} />
            </div>
            <span className={`campaign-metric-change ${CAMPAIGN_METRICS.sentimentChange >= 0 ? 'positive' : 'negative'}`}>
              {CAMPAIGN_METRICS.sentimentChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {Math.abs(CAMPAIGN_METRICS.sentimentChange)}%
            </span>
          </div>
          <p className="campaign-metric-label">채팅 긍정 지수</p>
          <p className="campaign-metric-value">{CAMPAIGN_METRICS.sentimentIndex}%</p>
        </div>

        <div className="campaign-metric-card">
          <div className="campaign-metric-header">
            <div className="campaign-metric-icon" style={{ backgroundColor: '#10b98120', color: '#10b981' }}>
              <MousePointer size={22} />
            </div>
            <span className={`campaign-metric-change ${CAMPAIGN_METRICS.conversionChange >= 0 ? 'positive' : 'negative'}`}>
              {CAMPAIGN_METRICS.conversionChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {Math.abs(CAMPAIGN_METRICS.conversionChange)}%
            </span>
          </div>
          <p className="campaign-metric-label">추정 유입 전환</p>
          <p className="campaign-metric-value">{formatNumber(CAMPAIGN_METRICS.estimatedConversions)}</p>
        </div>

        <div className="campaign-metric-card">
          <div className="campaign-metric-header">
            <div className="campaign-metric-icon" style={{ backgroundColor: '#f59e0b20', color: '#f59e0b' }}>
              <Zap size={22} />
            </div>
            <span className={`campaign-metric-change ${CAMPAIGN_METRICS.roiChange >= 0 ? 'positive' : 'negative'}`}>
              {CAMPAIGN_METRICS.roiChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {Math.abs(CAMPAIGN_METRICS.roiChange)}%
            </span>
          </div>
          <p className="campaign-metric-label">캠페인 ROI</p>
          <p className="campaign-metric-value">{CAMPAIGN_METRICS.campaignROI}%</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="admin-charts-grid">
        {/* Brand Mention Time Series */}
        <div className="admin-chart-card large">
          <div className="chart-header">
            <h3>집행 시점별 브랜드 언급량 변화</h3>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
              실시간 채팅 로그 매칭 결과
            </p>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={BRAND_MENTION_SERIES}>
                <defs>
                  <linearGradient id="colorMentions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                <YAxis yAxisId="left" stroke="#94a3b8" fontSize={12} />
                <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={12} domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="mentions"
                  name="언급량"
                  stroke="#6366f1"
                  strokeWidth={3}
                  fill="url(#colorMentions)"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="sentiment"
                  name="감성지수"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Campaign ROI Summary */}
        <div className="campaign-roi-summary">
          <div className="campaign-roi-header">
            <Award size={24} style={{ color: '#f59e0b' }} />
            <h3>캠페인 성과 요약 (ROI)</h3>
          </div>
          <div className="campaign-roi-stats">
            <div className="campaign-roi-stat">
              <span className="label">KPI 달성률</span>
              <span className="value highlight">142.5%</span>
            </div>
            <div className="campaign-roi-stat">
              <span className="label">예상 도달 가치</span>
              <span className="value">₩1.8B</span>
            </div>
            <div className="campaign-roi-stat">
              <span className="label">유입 가중치</span>
              <span className="value" style={{ color: '#818cf8' }}>Excellent</span>
            </div>
          </div>
        </div>
      </div>

      {/* Campaign List Table */}
      <div className="admin-top-list-card" style={{ marginTop: 28 }}>
        <div className="top-list-header">
          <Award size={20} />
          <h3>캠페인 현황</h3>
        </div>
        <div className="top-list-body">
          <table className="top-list-table">
            <thead>
              <tr>
                <th>캠페인명</th>
                <th>기간</th>
                <th>예산</th>
                <th>노출</th>
                <th>참여</th>
                <th>전환</th>
                <th>ROI</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {CAMPAIGN_LIST.map((campaign) => (
                <tr key={campaign.id}>
                  <td>
                    <span style={{ fontWeight: 600 }}>{campaign.name}</span>
                  </td>
                  <td style={{ fontSize: 12, color: '#64748b' }}>
                    {campaign.startDate} ~ {campaign.endDate}
                  </td>
                  <td>{formatCurrency(campaign.budget)}</td>
                  <td>{campaign.impressions > 0 ? formatNumber(campaign.impressions) : '-'}</td>
                  <td>{campaign.engagements > 0 ? formatNumber(campaign.engagements) : '-'}</td>
                  <td>{campaign.conversions > 0 ? formatNumber(campaign.conversions) : '-'}</td>
                  <td>
                    {campaign.roi > 0 ? (
                      <span style={{ fontWeight: 700, color: campaign.roi >= 300 ? '#10b981' : '#6366f1' }}>
                        {campaign.roi}%
                      </span>
                    ) : '-'}
                  </td>
                  <td>
                    <span className={`campaign-status ${campaign.status}`}>
                      {campaign.status === 'active' ? '진행중' :
                       campaign.status === 'completed' ? '완료' : '예정'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Button */}
      <div style={{ marginTop: 24, textAlign: 'right' }}>
        <button
          className="admin-streamer-mode-btn"
          style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: 12,
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          사업부 보고서 익스포트 (.PDF)
        </button>
      </div>
    </div>
  );
};

export default AdminNexonCampaign;
