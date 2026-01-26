import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, RefreshCw, Users, DollarSign, Eye, Target, Zap, Award,
  Gamepad2, Crown, Flame, TrendingUp, TrendingDown, Clock, Calendar, MousePointer, AlertTriangle
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../shared/LoadingSpinner';

import { API_URL } from '../../config/api';

const GAME_ICONS = {
  league: Crown,
  valorant: Target,
  minecraft: Gamepad2,
  gta: Flame,
  talk: Users,
  default: Gamepad2
};

const AdminStreamerDetail = ({ streamerId, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [error, setError] = useState(null);
  const [streamer, setStreamer] = useState(null);
  const [gamePerformance, setGamePerformance] = useState([]);
  const [performanceTrend, setPerformanceTrend] = useState([]);
  const [recentBroadcasts, setRecentBroadcasts] = useState([]);
  const [attribution, setAttribution] = useState(null);

  const { accessToken } = useAuth();

  useEffect(() => {
    fetchStreamerData();
  }, [streamerId, selectedPeriod]);

  const fetchStreamerData = async () => {
    setLoading(true);
    setError(null);

    const headers = {
      'Content-Type': 'application/json',
      ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
    };

    try {
      // Fetch streamer details
      const streamerRes = await fetch(`${API_URL}/api/streamers/${streamerId}`, { headers });

      if (streamerRes.ok) {
        const streamerData = await streamerRes.json();
        // Transform to expected format
        const transformedStreamer = {
          id: streamerData.id,
          name: streamerData.username || '익명',
          platform: 'chzzk',
          totalFollowers: 0,
          avgViewers: 0,
          influenceScore: Math.min(100, Math.round((streamerData.total_donations || 0) / 10000) + 50),
          adEfficiency: 0,
          donationRate: streamerData.total_events > 0
            ? ((streamerData.total_donations || 0) / streamerData.total_events * 0.01).toFixed(1)
            : 0,
          totalRevenue: streamerData.total_donations || 0,
          influenceChange: 0,
          adEfficiencyChange: 0,
          donationRateChange: 0,
          revenueChange: 0,
          totalDonations: streamerData.total_donations || 0,
          totalEvents: streamerData.total_events || 0
        };
        setStreamer(transformedStreamer);
      } else {
        // If no specific streamer found, create minimal data
        setStreamer({
          id: streamerId,
          name: `스트리머 ${streamerId}`,
          platform: 'chzzk',
          totalFollowers: 0,
          avgViewers: 0,
          influenceScore: 50,
          adEfficiency: 0,
          donationRate: 0,
          totalRevenue: 0,
          influenceChange: 0,
          adEfficiencyChange: 0,
          donationRateChange: 0,
          revenueChange: 0
        });
      }

      // Set empty data for sections that need real API endpoints
      setGamePerformance([]);
      setPerformanceTrend([]);
      setRecentBroadcasts([]);
      setAttribution({
        totalEstimatedConversions: 0,
        conversionsChange: 0,
        contributionValue: 0,
        valueChange: 0,
        roiContribution: 0,
        roiPercentile: 0,
        campaigns: [],
        monthlyTrend: [],
        nexonIPBreakdown: []
      });

    } catch (err) {
      console.error('Failed to fetch streamer data:', err);
      setError('불러오기 실패');
    } finally {
      setLoading(false);
    }
  };

  // Derived data for charts
  const gameRadarData = gamePerformance.map(g => ({
    game: g.name?.substring(0, 4) || '',
    viewers: Math.floor((g.avgViewers || 0) / 500),
    donations: Math.floor((g.donations || 0) / 500000),
    adEfficiency: parseFloat(g.adEfficiency || 0)
  }));

  const gameAdEfficiency = gamePerformance.map(g => ({
    name: g.name,
    efficiency: parseFloat(g.adEfficiency || 0)
  }));

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

  const getInfluenceRank = (score) => {
    if (score >= 90) return { label: 'S+', color: '#fbbf24', bg: '#fbbf2420' };
    if (score >= 80) return { label: 'S', color: '#f59e0b', bg: '#f59e0b20' };
    if (score >= 70) return { label: 'A', color: '#10b981', bg: '#10b98120' };
    if (score >= 60) return { label: 'B', color: '#6366f1', bg: '#6366f120' };
    if (score >= 50) return { label: 'C', color: '#8b5cf6', bg: '#8b5cf620' };
    return { label: 'D', color: '#94a3b8', bg: '#94a3b820' };
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!streamer) return null;

  const rank = getInfluenceRank(streamer.influenceScore);

  return (
    <div className="admin-streamer-detail">
      {/* Back Button */}
      <button className="streamer-detail-back" onClick={onBack}>
        <ArrowLeft size={18} />
        목록으로 돌아가기
      </button>

      {/* Profile Header */}
      <div className="streamer-profile-header">
        <div className="streamer-profile-avatar">
          {streamer.avatar ? (
            <img src={streamer.avatar} alt={streamer.name} />
          ) : (
            streamer.name?.charAt(0).toUpperCase()
          )}
        </div>
        <div className="streamer-profile-info">
          <h2>{streamer.name}</h2>
          <span className="platform-badge">{streamer.platform}</span>
        </div>
        <div className="streamer-profile-stats">
          <div className="profile-stat">
            <span className="stat-value">{formatNumber(streamer.totalFollowers)}</span>
            <span className="stat-label">팔로워</span>
          </div>
          <div className="profile-stat">
            <span className="stat-value">{formatNumber(streamer.avgViewers)}</span>
            <span className="stat-label">평균 시청자</span>
          </div>
          <div className="profile-stat">
            <span
              className="stat-value"
              style={{ color: rank.color }}
            >
              {rank.label}
            </span>
            <span className="stat-label">영향력 등급</span>
          </div>
        </div>
      </div>

      {/* Period Selector */}
      <div className="admin-toolbar">
        <div className="time-range-selector">
          <Calendar size={18} />
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="time-select"
          >
            <option value="week">지난 7일</option>
            <option value="month">지난 30일</option>
            <option value="quarter">지난 3개월</option>
          </select>
        </div>
      </div>

      {/* Overall Stats Cards */}
      <div className="viewership-summary-grid">
        <div className="viewership-card">
          <div className="viewership-card-icon" style={{ backgroundColor: '#6366f120', color: '#6366f1' }}>
            <Award size={24} />
          </div>
          <div className="viewership-card-content">
            <span className="viewership-card-label">영향력 점수</span>
            <span className="viewership-card-value">{streamer.influenceScore}</span>
            <span className={`viewership-card-change ${streamer.influenceChange >= 0 ? 'positive' : 'negative'}`}>
              {streamer.influenceChange >= 0 ? '+' : ''}{streamer.influenceChange}점
            </span>
          </div>
        </div>
        <div className="viewership-card">
          <div className="viewership-card-icon" style={{ backgroundColor: '#10b98120', color: '#10b981' }}>
            <Target size={24} />
          </div>
          <div className="viewership-card-content">
            <span className="viewership-card-label">광고 효율</span>
            <span className="viewership-card-value">{streamer.adEfficiency}%</span>
            <span className={`viewership-card-change ${streamer.adEfficiencyChange >= 0 ? 'positive' : 'negative'}`}>
              {streamer.adEfficiencyChange >= 0 ? '+' : ''}{streamer.adEfficiencyChange}%
            </span>
          </div>
        </div>
        <div className="viewership-card">
          <div className="viewership-card-icon" style={{ backgroundColor: '#f59e0b20', color: '#f59e0b' }}>
            <Zap size={24} />
          </div>
          <div className="viewership-card-content">
            <span className="viewership-card-label">후원 전환율</span>
            <span className="viewership-card-value">{streamer.donationRate}%</span>
            <span className={`viewership-card-change ${streamer.donationRateChange >= 0 ? 'positive' : 'negative'}`}>
              {streamer.donationRateChange >= 0 ? '+' : ''}{streamer.donationRateChange}%
            </span>
          </div>
        </div>
        <div className="viewership-card">
          <div className="viewership-card-icon" style={{ backgroundColor: '#ef444420', color: '#ef4444' }}>
            <DollarSign size={24} />
          </div>
          <div className="viewership-card-content">
            <span className="viewership-card-label">총 수익</span>
            <span className="viewership-card-value">{formatCurrency(streamer.totalRevenue)}</span>
            <span className={`viewership-card-change ${streamer.revenueChange >= 0 ? 'positive' : 'negative'}`}>
              {streamer.revenueChange >= 0 ? '+' : ''}{streamer.revenueChange}%
            </span>
          </div>
        </div>
      </div>

      {/* Game Performance Cards */}
      <div className="influence-header" style={{ marginTop: '32px' }}>
        <div className="influence-title">
          <Gamepad2 size={24} />
          <h2>게임별 성과</h2>
        </div>
        <p className="influence-description">
          각 게임/카테고리에서의 시청자, 후원, 광고 효율 데이터
        </p>
      </div>

      <div className="game-performance-grid">
        {gamePerformance.length > 0 ? gamePerformance.map((game, index) => {
          const GameIcon = GAME_ICONS[game.id] || GAME_ICONS.default;
          return (
            <div key={game.id || index} className="game-performance-card">
              <div className="game-header">
                <div className="game-icon">
                  <GameIcon size={20} />
                </div>
                <span className="game-name">{game.name}</span>
              </div>
              <div className="game-stats">
                <div className="game-stat">
                  <span className="label">평균 시청자</span>
                  <span className="value">{formatNumber(game.avgViewers)}</span>
                  <span className={`change ${game.viewersChange >= 0 ? 'positive' : 'negative'}`}>
                    {game.viewersChange >= 0 ? '↑' : '↓'} {Math.abs(game.viewersChange)}%
                  </span>
                </div>
                <div className="game-stat">
                  <span className="label">총 후원</span>
                  <span className="value">{formatCurrency(game.donations)}</span>
                  <span className={`change ${game.donationsChange >= 0 ? 'positive' : 'negative'}`}>
                    {game.donationsChange >= 0 ? '↑' : '↓'} {Math.abs(game.donationsChange)}%
                  </span>
                </div>
                <div className="game-stat">
                  <span className="label">광고 효율</span>
                  <span className="value">{game.adEfficiency}%</span>
                  <span className={`change ${game.adEfficiencyChange >= 0 ? 'positive' : 'negative'}`}>
                    {game.adEfficiencyChange >= 0 ? '↑' : '↓'} {Math.abs(game.adEfficiencyChange)}%
                  </span>
                </div>
                <div className="game-stat">
                  <span className="label">방송 시간</span>
                  <span className="value">{game.streamHours}h</span>
                  <span className={`change ${game.hoursChange >= 0 ? 'positive' : 'negative'}`}>
                    {game.hoursChange >= 0 ? '↑' : '↓'} {Math.abs(game.hoursChange)}%
                  </span>
                </div>
              </div>
            </div>
          );
        }) : (
          <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: '#94a3b8', background: 'var(--bg-card)', borderRadius: '12px' }}>
            <AlertTriangle size={32} style={{ opacity: 0.5, marginBottom: '12px' }} />
            <p style={{ margin: 0 }}>게임별 성과 데이터가 없습니다</p>
          </div>
        )}
      </div>

      {/* Charts Section */}
      <div className="admin-charts-grid">
        {/* Performance Trend */}
        <div className="admin-chart-card large">
          <div className="chart-header">
            <h3>성과 추이</h3>
          </div>
          <div className="chart-body">
            {performanceTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={performanceTrend}>
                  <defs>
                    <linearGradient id="colorViewer" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorDonation" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="viewers"
                    name="평균 시청자"
                    stroke="#6366f1"
                    fillOpacity={1}
                    fill="url(#colorViewer)"
                  />
                  <Area
                    type="monotone"
                    dataKey="donations"
                    name="후원 (만원)"
                    stroke="#10b981"
                    fillOpacity={1}
                    fill="url(#colorDonation)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: '#94a3b8' }}>
                성과 데이터가 없습니다
              </div>
            )}
          </div>
        </div>

        {/* Game Distribution Radar */}
        <div className="admin-chart-card">
          <div className="chart-header">
            <h3>게임별 영향력</h3>
          </div>
          <div className="chart-body">
            {gameRadarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={gameRadarData}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="game" stroke="#94a3b8" fontSize={11} />
                  <PolarRadiusAxis stroke="#334155" />
                  <Radar
                    name="시청자"
                    dataKey="viewers"
                    stroke="#6366f1"
                    fill="#6366f1"
                    fillOpacity={0.3}
                  />
                  <Radar
                    name="후원"
                    dataKey="donations"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.3}
                  />
                  <Radar
                    name="광고효율"
                    dataKey="adEfficiency"
                    stroke="#f59e0b"
                    fill="#f59e0b"
                    fillOpacity={0.3}
                  />
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '280px', color: '#94a3b8' }}>
                게임별 데이터가 없습니다
              </div>
            )}
          </div>
        </div>

        {/* Ad Efficiency by Game */}
        <div className="admin-chart-card">
          <div className="chart-header">
            <h3>게임별 광고 효율</h3>
          </div>
          <div className="chart-body">
            {gameAdEfficiency.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={gameAdEfficiency} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis type="number" stroke="#94a3b8" fontSize={12} domain={[0, 100]} />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={80} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px'
                    }}
                    formatter={(value) => [`${value}%`, '광고 효율']}
                  />
                  <Bar dataKey="efficiency" name="광고 효율" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '280px', color: '#94a3b8' }}>
                광고 효율 데이터가 없습니다
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Nexon Business Insight Banner */}
      <div className="business-insight-banner" style={{ marginTop: '24px' }}>
        <div className="business-insight-content">
          <div className="business-insight-label">
            <Zap size={14} />
            Nexon Business Insight
          </div>
          <p className="business-insight-text">
            채팅 로그 분석 결과, 넥슨의 <strong>서브컬처/성장형</strong> 타이틀에 대한 긍정 반응이
            타 장르 대비 <strong>32%</strong> 높습니다. 블루아카이브 및 메이플스토리 관련 스트리머와의
            우선적 협업을 추천합니다.
          </p>
        </div>
      </div>

      {/* ===== Nexon User Acquisition Contribution Section ===== */}
      <div className="nexon-contribution-section">
        <div className="influence-header">
          <div className="influence-title">
            <TrendingUp size={24} />
            <h2>넥슨 유입 기여도</h2>
          </div>
          <p className="influence-description">
            이 스트리머의 넥슨 캠페인 기여 분석 및 추정 전환 데이터
          </p>
        </div>

        {/* Summary Cards */}
        <div className="nexon-contribution-grid">
          <div className="nexon-contribution-card">
            <div className="nexon-contribution-icon" style={{ backgroundColor: '#10b98120', color: '#10b981' }}>
              <MousePointer size={24} />
            </div>
            <div className="nexon-contribution-content">
              <span className="nexon-contribution-label">추정 전환수</span>
              <span className="nexon-contribution-value">{(attribution?.totalEstimatedConversions || 0).toLocaleString()}</span>
              <span className={`nexon-contribution-change ${(attribution?.conversionsChange || 0) >= 0 ? 'positive' : 'negative'}`}>
                {(attribution?.conversionsChange || 0) >= 0 ? '+' : ''}{attribution?.conversionsChange || 0}% vs 전월
              </span>
            </div>
          </div>

          <div className="nexon-contribution-card">
            <div className="nexon-contribution-icon" style={{ backgroundColor: '#6366f120', color: '#6366f1' }}>
              <DollarSign size={24} />
            </div>
            <div className="nexon-contribution-content">
              <span className="nexon-contribution-label">기여 가치</span>
              <span className="nexon-contribution-value">{formatCurrency(attribution?.contributionValue || 0)}</span>
              <span className={`nexon-contribution-change ${(attribution?.valueChange || 0) >= 0 ? 'positive' : 'negative'}`}>
                {(attribution?.valueChange || 0) >= 0 ? '+' : ''}{attribution?.valueChange || 0}% vs 전월
              </span>
            </div>
          </div>

          <div className="nexon-contribution-card">
            <div className="nexon-contribution-icon" style={{ backgroundColor: '#f59e0b20', color: '#f59e0b' }}>
              <Award size={24} />
            </div>
            <div className="nexon-contribution-content">
              <span className="nexon-contribution-label">ROI 기여도</span>
              <span className="nexon-contribution-value">{attribution?.roiContribution || 0}%</span>
              <span className="nexon-contribution-change">상위 {attribution?.roiPercentile || 0}%</span>
            </div>
          </div>

          <div className="nexon-contribution-card">
            <div className="nexon-contribution-icon" style={{ backgroundColor: '#8b5cf620', color: '#8b5cf6' }}>
              <Target size={24} />
            </div>
            <div className="nexon-contribution-content">
              <span className="nexon-contribution-label">참여 캠페인</span>
              <span className="nexon-contribution-value">{attribution?.campaigns?.length || 0}개</span>
              <span className="nexon-contribution-change">
                진행중 {(attribution?.campaigns || []).filter(c => c.status === 'active').length} / 완료 {(attribution?.campaigns || []).filter(c => c.status === 'completed').length}
              </span>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="admin-charts-grid">
          {/* Monthly Trend */}
          <div className="admin-chart-card">
            <div className="chart-header">
              <h3>월별 기여도 추이</h3>
            </div>
            <div className="chart-body">
              {(attribution?.monthlyTrend || []).length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={attribution.monthlyTrend}>
                    <defs>
                      <linearGradient id="colorContribConversions" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="conversions"
                      name="전환수"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorContribConversions)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '280px', color: '#94a3b8' }}>
                  월별 기여도 데이터가 없습니다
                </div>
              )}
            </div>
          </div>

          {/* IP Breakdown */}
          <div className="admin-chart-card">
            <div className="chart-header">
              <h3>넥슨 IP별 전환 비중</h3>
            </div>
            <div className="chart-body">
              {(attribution?.nexonIPBreakdown || []).length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={attribution.nexonIPBreakdown} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" stroke="#94a3b8" fontSize={12} domain={[0, 50]} />
                    <YAxis dataKey="ip" type="category" stroke="#94a3b8" fontSize={11} width={90} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px'
                      }}
                      formatter={(value) => [`${value}%`, '기여 비중']}
                    />
                    <Bar dataKey="percent" name="기여 비중" fill="#6366f1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '280px', color: '#94a3b8' }}>
                  IP별 전환 데이터가 없습니다
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Campaign Breakdown Table */}
        <div className="admin-table-card" style={{ marginTop: '24px' }}>
          <div className="table-header">
            <h3>캠페인별 기여도 분석</h3>
          </div>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>캠페인명</th>
                  <th>기간</th>
                  <th>추정 전환</th>
                  <th>기여율</th>
                  <th>전환율</th>
                  <th>추정 가치</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {(attribution?.campaigns || []).length > 0 ? (attribution.campaigns.map((campaign) => (
                  <tr key={campaign.campaignId}>
                    <td style={{ fontWeight: 600 }}>{campaign.campaignName}</td>
                    <td style={{ fontSize: 12, color: '#64748b' }}>{campaign.period}</td>
                    <td style={{ fontWeight: 600 }}>{campaign.conversions.toLocaleString()}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '60px',
                          height: '6px',
                          background: '#e2e8f0',
                          borderRadius: '3px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${Math.min(campaign.contributionPercent * 5, 100)}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                            borderRadius: '3px'
                          }} />
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>{campaign.contributionPercent}%</span>
                      </div>
                    </td>
                    <td>{campaign.conversionRate}%</td>
                    <td style={{ fontWeight: 600, color: '#10b981' }}>{formatCurrency(campaign.estimatedValue)}</td>
                    <td>
                      <span className={`campaign-status ${campaign.status}`}>
                        {campaign.status === 'active' ? '진행중' :
                         campaign.status === 'completed' ? '완료' : '예정'}
                      </span>
                    </td>
                  </tr>
                ))) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                      캠페인 데이터가 없습니다
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Broadcasts Table */}
      <div className="admin-table-card" style={{ marginTop: '24px' }}>
        <div className="table-header">
          <h3>최근 방송 기록</h3>
        </div>
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>날짜</th>
                <th>게임/카테고리</th>
                <th>방송 시간</th>
                <th>최고 시청자</th>
                <th>평균 시청자</th>
                <th>후원</th>
                <th>광고 효율</th>
              </tr>
            </thead>
            <tbody>
              {recentBroadcasts.length > 0 ? recentBroadcasts.map((broadcast, index) => (
                <tr key={index}>
                  <td>{broadcast.date}</td>
                  <td>
                    <div className="stat-cell">
                      <Gamepad2 size={14} />
                      <span>{broadcast.game}</span>
                    </div>
                  </td>
                  <td>
                    <div className="stat-cell">
                      <Clock size={14} />
                      <span>{broadcast.duration}</span>
                    </div>
                  </td>
                  <td>{formatNumber(broadcast.peakViewers)}</td>
                  <td>{formatNumber(broadcast.avgViewers)}</td>
                  <td>{formatCurrency(broadcast.donations)}</td>
                  <td>
                    <div className="efficiency-cell">
                      <div className="efficiency-bar">
                        <div
                          className="efficiency-fill"
                          style={{
                            width: `${broadcast.adEfficiency}%`,
                            backgroundColor: broadcast.adEfficiency >= 70 ? '#10b981' :
                              broadcast.adEfficiency >= 50 ? '#f59e0b' : '#ef4444'
                          }}
                        />
                      </div>
                      <span>{broadcast.adEfficiency}%</span>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                    방송 기록이 없습니다
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminStreamerDetail;
