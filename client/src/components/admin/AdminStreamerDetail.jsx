import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft, RefreshCw, Users, DollarSign, Eye, Target, Zap, Award,
  Gamepad2, Crown, Flame, TrendingUp, TrendingDown, Clock, Calendar, MousePointer
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const GAME_ICONS = {
  league: Crown,
  valorant: Target,
  minecraft: Gamepad2,
  gta: Flame,
  talk: Users,
  default: Gamepad2
};

// Mock 스트리머 데이터
const MOCK_STREAMERS = {
  1: { id: 1, name: '감스트', platform: 'soop', followers: 1250000, totalStreams: 2847, joinDate: '2019-03-15', influenceScore: 95, adEfficiency: 4.8, donationRate: 3.2, totalRevenue: 485000000 },
  2: { id: 2, name: '풍월량', platform: 'chzzk', followers: 980000, totalStreams: 3124, joinDate: '2018-06-20', influenceScore: 92, adEfficiency: 4.5, donationRate: 2.8, totalRevenue: 420000000 },
  3: { id: 3, name: '우왁굳', platform: 'soop', followers: 850000, totalStreams: 2456, joinDate: '2017-09-10', influenceScore: 88, adEfficiency: 4.2, donationRate: 4.1, totalRevenue: 380000000 },
  4: { id: 4, name: '침착맨', platform: 'chzzk', followers: 720000, totalStreams: 1892, joinDate: '2020-01-15', influenceScore: 85, adEfficiency: 3.9, donationRate: 2.5, totalRevenue: 320000000 },
  5: { id: 5, name: '주르르', platform: 'chzzk', followers: 650000, totalStreams: 1567, joinDate: '2021-04-22', influenceScore: 82, adEfficiency: 4.1, donationRate: 3.8, totalRevenue: 280000000 },
  6: { id: 6, name: '아이리칸나', platform: 'soop', followers: 580000, totalStreams: 1245, joinDate: '2020-08-12', influenceScore: 78, adEfficiency: 3.7, donationRate: 3.5, totalRevenue: 220000000 },
  7: { id: 7, name: '섭이', platform: 'chzzk', followers: 520000, totalStreams: 1089, joinDate: '2019-11-05', influenceScore: 75, adEfficiency: 3.5, donationRate: 2.9, totalRevenue: 195000000 },
  8: { id: 8, name: '따효니', platform: 'soop', followers: 480000, totalStreams: 978, joinDate: '2020-03-20', influenceScore: 72, adEfficiency: 3.3, donationRate: 3.1, totalRevenue: 175000000 },
  9: { id: 9, name: '금마', platform: 'chzzk', followers: 420000, totalStreams: 856, joinDate: '2021-01-10', influenceScore: 68, adEfficiency: 3.1, donationRate: 2.7, totalRevenue: 150000000 },
  10: { id: 10, name: '쫀득이', platform: 'soop', followers: 380000, totalStreams: 745, joinDate: '2021-06-15', influenceScore: 65, adEfficiency: 2.9, donationRate: 3.3, totalRevenue: 125000000 }
};

// 넥슨 캠페인 기여도 Mock 데이터
const STREAMER_CAMPAIGN_ATTRIBUTION = {
  1: {
    totalEstimatedConversions: 245,
    conversionsChange: 18.7,
    contributionValue: 12500000,
    valueChange: 23.5,
    roiContribution: 28.5,
    roiPercentile: 15,
    campaigns: [
      { campaignId: 1, campaignName: '더퍼디 런칭 캠페인', conversions: 142, contributionPercent: 11.8, conversionRate: 6.76, estimatedValue: 7100000, period: '2026-01-01 ~ 2026-01-15', status: 'active' },
      { campaignId: 2, campaignName: '블루아카 3주년 기념', conversions: 78, contributionPercent: 8.8, conversionRate: 7.07, estimatedValue: 3900000, period: '2025-12-15 ~ 2025-12-31', status: 'completed' },
      { campaignId: 4, campaignName: '메이플 드리머 업데이트', conversions: 25, contributionPercent: 3.5, conversionRate: 6.58, estimatedValue: 1500000, period: '2025-11-20 ~ 2025-12-10', status: 'completed' }
    ],
    monthlyTrend: [
      { month: '9월', conversions: 45, value: 2250000 },
      { month: '10월', conversions: 62, value: 3100000 },
      { month: '11월', conversions: 58, value: 2900000 },
      { month: '12월', conversions: 89, value: 4450000 },
      { month: '1월', conversions: 112, value: 5600000 }
    ],
    nexonIPBreakdown: [
      { ip: 'FC온라인', percent: 45 },
      { ip: '메이플스토리', percent: 25 },
      { ip: '블루아카이브', percent: 18 },
      { ip: '더퍼디', percent: 12 }
    ]
  },
  2: {
    totalEstimatedConversions: 198,
    conversionsChange: 12.3,
    contributionValue: 9900000,
    valueChange: 15.8,
    roiContribution: 22.1,
    roiPercentile: 22,
    campaigns: [
      { campaignId: 2, campaignName: '블루아카 3주년 기념', conversions: 112, contributionPercent: 12.6, conversionRate: 7.85, estimatedValue: 5600000, period: '2025-12-15 ~ 2025-12-31', status: 'completed' },
      { campaignId: 4, campaignName: '메이플 드리머 업데이트', conversions: 86, contributionPercent: 11.9, conversionRate: 6.92, estimatedValue: 4300000, period: '2025-11-20 ~ 2025-12-10', status: 'completed' }
    ],
    monthlyTrend: [
      { month: '9월', conversions: 38, value: 1900000 },
      { month: '10월', conversions: 45, value: 2250000 },
      { month: '11월', conversions: 52, value: 2600000 },
      { month: '12월', conversions: 78, value: 3900000 },
      { month: '1월', conversions: 85, value: 4250000 }
    ],
    nexonIPBreakdown: [
      { ip: '메이플스토리', percent: 48 },
      { ip: '블루아카이브', percent: 32 },
      { ip: 'FC온라인', percent: 12 },
      { ip: '더퍼디', percent: 8 }
    ]
  }
};

// 스트리머 기여도 데이터 생성기
const generateStreamerAttribution = (streamerId) => {
  const baseConversions = 30 + Math.floor(Math.random() * 150);
  const valuePerConversion = 50000;

  return {
    totalEstimatedConversions: baseConversions,
    conversionsChange: parseFloat((Math.random() * 30 - 5).toFixed(1)),
    contributionValue: baseConversions * valuePerConversion,
    valueChange: parseFloat((Math.random() * 35 - 5).toFixed(1)),
    roiContribution: parseFloat((3 + Math.random() * 20).toFixed(1)),
    roiPercentile: Math.floor(10 + Math.random() * 70),
    campaigns: [
      {
        campaignId: 1,
        campaignName: '더퍼디 런칭 캠페인',
        conversions: Math.floor(baseConversions * 0.6),
        contributionPercent: parseFloat((3 + Math.random() * 8).toFixed(1)),
        conversionRate: parseFloat((4 + Math.random() * 4).toFixed(2)),
        estimatedValue: Math.floor(baseConversions * 0.6 * valuePerConversion),
        period: '2026-01-01 ~ 2026-01-15',
        status: 'active'
      },
      {
        campaignId: 2,
        campaignName: '블루아카 3주년 기념',
        conversions: Math.floor(baseConversions * 0.4),
        contributionPercent: parseFloat((2 + Math.random() * 6).toFixed(1)),
        conversionRate: parseFloat((4 + Math.random() * 4).toFixed(2)),
        estimatedValue: Math.floor(baseConversions * 0.4 * valuePerConversion),
        period: '2025-12-15 ~ 2025-12-31',
        status: 'completed'
      }
    ],
    monthlyTrend: ['9월', '10월', '11월', '12월', '1월'].map(month => ({
      month,
      conversions: 15 + Math.floor(Math.random() * 60),
      value: 750000 + Math.floor(Math.random() * 3000000)
    })),
    nexonIPBreakdown: [
      { ip: 'FC온라인', percent: 20 + Math.floor(Math.random() * 30) },
      { ip: '메이플스토리', percent: 15 + Math.floor(Math.random() * 20) },
      { ip: '블루아카이브', percent: 10 + Math.floor(Math.random() * 15) },
      { ip: '더퍼디', percent: 5 + Math.floor(Math.random() * 15) }
    ]
  };
};

const AdminStreamerDetail = ({ streamerId, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  // Mock 데이터 생성
  const data = useMemo(() => {
    const baseStreamer = MOCK_STREAMERS[streamerId] || {
      id: streamerId,
      name: `스트리머 ${streamerId}`,
      platform: 'soop',
      followers: 100000 + Math.floor(Math.random() * 500000),
      totalStreams: 500 + Math.floor(Math.random() * 2000),
      joinDate: '2020-01-01',
      influenceScore: 50 + Math.floor(Math.random() * 40),
      adEfficiency: 2 + Math.random() * 3,
      donationRate: 1 + Math.random() * 4,
      totalRevenue: 50000000 + Math.floor(Math.random() * 300000000)
    };

    // 전체 스트리머 정보 (변경 값 포함)
    const streamer = {
      ...baseStreamer,
      totalFollowers: baseStreamer.followers,
      avgViewers: Math.floor(baseStreamer.followers * 0.03),
      influenceChange: Math.floor(Math.random() * 10) - 3,
      adEfficiencyChange: (Math.random() * 2 - 0.5).toFixed(1),
      donationRateChange: (Math.random() * 1.5 - 0.5).toFixed(1),
      revenueChange: Math.floor(Math.random() * 30) - 5
    };

    const gamePerformance = [
      { id: 'league', name: '리그오브레전드', avgViewers: 28000 + Math.floor(Math.random() * 20000), donations: 12500000 + Math.floor(Math.random() * 10000000), adEfficiency: (55 + Math.random() * 30).toFixed(1), streamHours: 120 + Math.floor(Math.random() * 80), viewersChange: Math.floor(Math.random() * 20) - 5, donationsChange: Math.floor(Math.random() * 25) - 8, adEfficiencyChange: Math.floor(Math.random() * 15) - 5, hoursChange: Math.floor(Math.random() * 20) - 5 },
      { id: 'valorant', name: '발로란트', avgViewers: 22000 + Math.floor(Math.random() * 15000), donations: 8500000 + Math.floor(Math.random() * 8000000), adEfficiency: (50 + Math.random() * 28).toFixed(1), streamHours: 80 + Math.floor(Math.random() * 60), viewersChange: Math.floor(Math.random() * 18) - 6, donationsChange: Math.floor(Math.random() * 20) - 5, adEfficiencyChange: Math.floor(Math.random() * 12) - 4, hoursChange: Math.floor(Math.random() * 15) - 3 },
      { id: 'minecraft', name: '마인크래프트', avgViewers: 18000 + Math.floor(Math.random() * 12000), donations: 6500000 + Math.floor(Math.random() * 6000000), adEfficiency: (45 + Math.random() * 25).toFixed(1), streamHours: 60 + Math.floor(Math.random() * 50), viewersChange: Math.floor(Math.random() * 15) - 4, donationsChange: Math.floor(Math.random() * 18) - 6, adEfficiencyChange: Math.floor(Math.random() * 10) - 3, hoursChange: Math.floor(Math.random() * 12) - 2 },
      { id: 'gta', name: 'GTA', avgViewers: 15000 + Math.floor(Math.random() * 10000), donations: 4500000 + Math.floor(Math.random() * 5000000), adEfficiency: (40 + Math.random() * 22).toFixed(1), streamHours: 40 + Math.floor(Math.random() * 40), viewersChange: Math.floor(Math.random() * 12) - 3, donationsChange: Math.floor(Math.random() * 15) - 4, adEfficiencyChange: Math.floor(Math.random() * 8) - 2, hoursChange: Math.floor(Math.random() * 10) - 2 },
      { id: 'talk', name: '토크/저스트채팅', avgViewers: 25000 + Math.floor(Math.random() * 18000), donations: 15500000 + Math.floor(Math.random() * 12000000), adEfficiency: (60 + Math.random() * 30).toFixed(1), streamHours: 100 + Math.floor(Math.random() * 70), viewersChange: Math.floor(Math.random() * 22) - 6, donationsChange: Math.floor(Math.random() * 28) - 8, adEfficiencyChange: Math.floor(Math.random() * 18) - 5, hoursChange: Math.floor(Math.random() * 18) - 4 }
    ];

    const performanceTrend = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return {
        date: date.toISOString().split('T')[0],
        viewers: 15000 + Math.floor(Math.random() * 25000),
        donations: Math.floor((2000000 + Math.floor(Math.random() * 8000000)) / 10000), // 만원 단위
        adRevenue: 500000 + Math.floor(Math.random() * 2000000)
      };
    });

    // 레이더 차트용 데이터
    const gameRadarData = gamePerformance.map(g => ({
      game: g.name.substring(0, 4),
      viewers: Math.floor(g.avgViewers / 500),
      donations: Math.floor(g.donations / 500000),
      adEfficiency: parseFloat(g.adEfficiency)
    }));

    // 광고 효율 바 차트용 데이터
    const gameAdEfficiency = gamePerformance.map(g => ({
      name: g.name,
      efficiency: parseFloat(g.adEfficiency)
    }));

    const recentBroadcasts = [
      { id: 1, title: '랭크 올리기 도전!', game: '리그오브레전드', date: '2026-01-08', duration: '4시간 32분', peakViewers: 45000, avgViewers: 32000, donations: 3500000, adEfficiency: 72 },
      { id: 2, title: '시청자 게임 같이해요', game: '발로란트', date: '2026-01-07', duration: '3시간 15분', peakViewers: 38000, avgViewers: 28000, donations: 2800000, adEfficiency: 65 },
      { id: 3, title: '자유 토크', game: '토크/저스트채팅', date: '2026-01-06', duration: '2시간 45분', peakViewers: 42000, avgViewers: 35000, donations: 4200000, adEfficiency: 78 },
      { id: 4, title: '건축 컨텐츠', game: '마인크래프트', date: '2026-01-05', duration: '5시간 10분', peakViewers: 35000, avgViewers: 25000, donations: 2100000, adEfficiency: 58 },
      { id: 5, title: 'GTA RP 서버', game: 'GTA', date: '2026-01-04', duration: '4시간 00분', peakViewers: 30000, avgViewers: 22000, donations: 1800000, adEfficiency: 52 }
    ];

    // 넥슨 캠페인 기여도 데이터
    const attribution = STREAMER_CAMPAIGN_ATTRIBUTION[streamerId] || generateStreamerAttribution(streamerId);

    return { streamer, gamePerformance, performanceTrend, recentBroadcasts, gameRadarData, gameAdEfficiency, attribution };
  }, [streamerId]);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, [streamerId, selectedPeriod]);

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
    return (
      <div className="admin-loading-section">
        <RefreshCw size={24} className="spin" />
        <p>스트리머 정보 로딩 중...</p>
      </div>
    );
  }

  if (!data?.streamer) return null;

  const { streamer, gamePerformance, performanceTrend, recentBroadcasts, gameRadarData, gameAdEfficiency, attribution } = data;
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
        {gamePerformance.map((game, index) => {
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
        })}
      </div>

      {/* Charts Section */}
      <div className="admin-charts-grid">
        {/* Performance Trend */}
        <div className="admin-chart-card large">
          <div className="chart-header">
            <h3>성과 추이</h3>
          </div>
          <div className="chart-body">
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
          </div>
        </div>

        {/* Game Distribution Radar */}
        <div className="admin-chart-card">
          <div className="chart-header">
            <h3>게임별 영향력</h3>
          </div>
          <div className="chart-body">
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
          </div>
        </div>

        {/* Ad Efficiency by Game */}
        <div className="admin-chart-card">
          <div className="chart-header">
            <h3>게임별 광고 효율</h3>
          </div>
          <div className="chart-body">
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
              <span className="nexon-contribution-value">{attribution.totalEstimatedConversions.toLocaleString()}</span>
              <span className={`nexon-contribution-change ${attribution.conversionsChange >= 0 ? 'positive' : 'negative'}`}>
                {attribution.conversionsChange >= 0 ? '+' : ''}{attribution.conversionsChange}% vs 전월
              </span>
            </div>
          </div>

          <div className="nexon-contribution-card">
            <div className="nexon-contribution-icon" style={{ backgroundColor: '#6366f120', color: '#6366f1' }}>
              <DollarSign size={24} />
            </div>
            <div className="nexon-contribution-content">
              <span className="nexon-contribution-label">기여 가치</span>
              <span className="nexon-contribution-value">{formatCurrency(attribution.contributionValue)}</span>
              <span className={`nexon-contribution-change ${attribution.valueChange >= 0 ? 'positive' : 'negative'}`}>
                {attribution.valueChange >= 0 ? '+' : ''}{attribution.valueChange}% vs 전월
              </span>
            </div>
          </div>

          <div className="nexon-contribution-card">
            <div className="nexon-contribution-icon" style={{ backgroundColor: '#f59e0b20', color: '#f59e0b' }}>
              <Award size={24} />
            </div>
            <div className="nexon-contribution-content">
              <span className="nexon-contribution-label">ROI 기여도</span>
              <span className="nexon-contribution-value">{attribution.roiContribution}%</span>
              <span className="nexon-contribution-change">상위 {attribution.roiPercentile}%</span>
            </div>
          </div>

          <div className="nexon-contribution-card">
            <div className="nexon-contribution-icon" style={{ backgroundColor: '#8b5cf620', color: '#8b5cf6' }}>
              <Target size={24} />
            </div>
            <div className="nexon-contribution-content">
              <span className="nexon-contribution-label">참여 캠페인</span>
              <span className="nexon-contribution-value">{attribution.campaigns.length}개</span>
              <span className="nexon-contribution-change">
                진행중 {attribution.campaigns.filter(c => c.status === 'active').length} / 완료 {attribution.campaigns.filter(c => c.status === 'completed').length}
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
            </div>
          </div>

          {/* IP Breakdown */}
          <div className="admin-chart-card">
            <div className="chart-header">
              <h3>넥슨 IP별 전환 비중</h3>
            </div>
            <div className="chart-body">
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
                {attribution.campaigns.map((campaign) => (
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
                ))}
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
              {recentBroadcasts.map((broadcast, index) => (
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminStreamerDetail;
