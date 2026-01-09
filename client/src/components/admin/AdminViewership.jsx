import React, { useState, useEffect, useMemo } from 'react';
import {
  RefreshCw, Users, Clock, TrendingUp, Eye, Monitor, Smartphone, Globe,
  Gamepad2, Crown, Flame, Target, ChevronRight, Star, Zap, Award
} from 'lucide-react';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

// Game categories for filtering
const GAME_CATEGORIES = [
  { id: 'all', name: '전체', icon: Gamepad2 },
  { id: 'league', name: '리그오브레전드', icon: Crown },
  { id: 'valorant', name: '발로란트', icon: Target },
  { id: 'minecraft', name: '마인크래프트', icon: Gamepad2 },
  { id: 'gta', name: 'GTA', icon: Flame },
  { id: 'talk', name: '토크/저스트채팅', icon: Users },
];

// Mock 데이터
const MOCK_STREAMER_INFLUENCE = [
  { id: 1, name: '감스트', platform: 'soop', influenceScore: 95, avgViewers: 45000, adEfficiency: 4.8, donationRate: 3.2, trend: 'up', mainGame: 'league', games: ['league', 'valorant', 'talk'] },
  { id: 2, name: '풍월량', platform: 'chzzk', influenceScore: 92, avgViewers: 38000, adEfficiency: 4.5, donationRate: 2.8, trend: 'up', mainGame: 'league', games: ['league', 'minecraft'] },
  { id: 3, name: '우왁굳', platform: 'soop', influenceScore: 88, avgViewers: 32000, adEfficiency: 4.2, donationRate: 4.1, trend: 'stable', mainGame: 'minecraft', games: ['minecraft', 'gta', 'talk'] },
  { id: 4, name: '침착맨', platform: 'chzzk', influenceScore: 85, avgViewers: 28000, adEfficiency: 3.9, donationRate: 2.5, trend: 'up', mainGame: 'talk', games: ['talk', 'minecraft'] },
  { id: 5, name: '주르르', platform: 'chzzk', influenceScore: 82, avgViewers: 25000, adEfficiency: 4.1, donationRate: 3.8, trend: 'up', mainGame: 'league', games: ['league', 'valorant'] },
  { id: 6, name: '아이리칸나', platform: 'soop', influenceScore: 78, avgViewers: 22000, adEfficiency: 3.7, donationRate: 3.5, trend: 'stable', mainGame: 'valorant', games: ['valorant', 'league'] },
  { id: 7, name: '섭이', platform: 'chzzk', influenceScore: 75, avgViewers: 19000, adEfficiency: 3.5, donationRate: 2.9, trend: 'down', mainGame: 'gta', games: ['gta', 'talk'] },
  { id: 8, name: '따효니', platform: 'soop', influenceScore: 72, avgViewers: 16000, adEfficiency: 3.3, donationRate: 3.1, trend: 'stable', mainGame: 'talk', games: ['talk', 'minecraft'] },
  { id: 9, name: '금마', platform: 'chzzk', influenceScore: 68, avgViewers: 14000, adEfficiency: 3.1, donationRate: 2.7, trend: 'up', mainGame: 'league', games: ['league'] },
  { id: 10, name: '쫀득이', platform: 'soop', influenceScore: 65, avgViewers: 12000, adEfficiency: 2.9, donationRate: 3.3, trend: 'down', mainGame: 'valorant', games: ['valorant', 'minecraft'] }
];

const AdminViewership = ({ onStreamerSelect }) => {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('week');
  const [selectedGame, setSelectedGame] = useState('all');

  // Mock 데이터 생성
  const data = useMemo(() => {
    // 시간대별 데이터
    const hourlyTrend = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i.toString().padStart(2, '0')}:00`,
      soop: Math.floor(Math.random() * 50000) + 20000,
      chzzk: Math.floor(Math.random() * 60000) + 30000,
      youtube: Math.floor(Math.random() * 30000) + 10000,
      twitch: Math.floor(Math.random() * 10000) + 2000
    }));

    const platformStats = {
      soop: { current: 87107, peak: 361049, channels: 2144 },
      chzzk: { current: 92289, peak: 264871, channels: 2438 },
      youtube: { current: 45000, peak: 120000, channels: 850 },
      twitch: { current: 2916, peak: 4633, channels: 108 }
    };

    // 게임 필터링
    const filteredStreamers = selectedGame === 'all'
      ? MOCK_STREAMER_INFLUENCE
      : MOCK_STREAMER_INFLUENCE.filter(s => s.games.includes(selectedGame));

    // 광고 효율 TOP 3
    const topAdEfficiency = [...filteredStreamers]
      .sort((a, b) => b.adEfficiency - a.adEfficiency)
      .slice(0, 3);

    // 요즘 대세
    const trendingStreamers = filteredStreamers
      .filter(s => s.trend === 'up')
      .sort((a, b) => b.influenceScore - a.influenceScore)
      .slice(0, 3);

    // 후원 전환 TOP 3
    const topDonationRate = [...filteredStreamers]
      .sort((a, b) => b.donationRate - a.donationRate)
      .slice(0, 3);

    // 시청자 추이 데이터 (7일)
    const viewershipTrend = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const dayName = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
      return {
        date: `${date.getMonth() + 1}/${date.getDate()} (${dayName})`,
        viewers: 150000 + Math.floor(Math.random() * 100000),
        unique: 80000 + Math.floor(Math.random() * 50000)
      };
    });

    // 디바이스 분포
    const deviceDistribution = [
      { name: '데스크톱', value: 58 },
      { name: '모바일', value: 35 },
      { name: '태블릿', value: 5 },
      { name: '기타', value: 2 }
    ];

    // 시간대별 시청자 (피크 시간대)
    const peakHours = Array.from({ length: 24 }, (_, i) => {
      // 저녁~밤 시간대에 시청자 증가 패턴
      let baseViewers = 50000;
      if (i >= 19 && i <= 23) baseViewers = 180000; // 피크타임
      else if (i >= 14 && i < 19) baseViewers = 120000; // 오후
      else if (i >= 10 && i < 14) baseViewers = 80000; // 낮
      else if (i >= 0 && i < 6) baseViewers = 30000; // 새벽

      return {
        hour: `${i.toString().padStart(2, '0')}시`,
        viewers: baseViewers + Math.floor(Math.random() * 30000)
      };
    });

    // 지역별 시청자 분포
    const geoDistribution = [
      { name: '대한민국', flag: '🇰🇷', viewers: 185000, percentage: 81, avgWatchTime: 48 },
      { name: '미국', flag: '🇺🇸', viewers: 18500, percentage: 8, avgWatchTime: 32 },
      { name: '일본', flag: '🇯🇵', viewers: 11400, percentage: 5, avgWatchTime: 28 },
      { name: '중국', flag: '🇨🇳', viewers: 6850, percentage: 3, avgWatchTime: 25 },
      { name: '기타', flag: '🌍', viewers: 5562, percentage: 3, avgWatchTime: 20 }
    ];

    // 시청자 이탈률 데이터
    const retentionData = [
      { minute: '0분', retention: 100 },
      { minute: '5분', retention: 85 },
      { minute: '10분', retention: 72 },
      { minute: '15분', retention: 65 },
      { minute: '20분', retention: 58 },
      { minute: '30분', retention: 48 },
      { minute: '45분', retention: 38 },
      { minute: '60분', retention: 32 },
      { minute: '90분', retention: 25 },
      { minute: '120분', retention: 18 }
    ];

    return {
      hourlyTrend,
      platformStats,
      totalViewers: 227312,
      peakToday: 450000,
      avgConcurrent: 180000,
      streamerInfluence: filteredStreamers,
      topAdEfficiency,
      trendingStreamers,
      topDonationRate,
      // 새로 추가된 데이터
      totalViews: 2847500,
      viewsGrowth: 12.5,
      uniqueViewers: 185420,
      uniqueGrowth: 8.3,
      avgWatchTime: 42,
      watchTimeGrowth: 5.2,
      peakConcurrent: 227312,
      viewershipTrend,
      deviceDistribution,
      peakHours,
      geoDistribution,
      retentionData
    };
  }, [selectedGame]);

  useEffect(() => {
    // 로딩 시뮬레이션
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, [selectedGame, timeRange]);

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num?.toLocaleString() || '0';
  };

  const formatDuration = (minutes) => {
    if (!minutes) return '0분';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}시간 ${mins}분`;
    }
    return `${mins}분`;
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

  const getTrendBadge = (trend) => {
    if (trend === 'hot') return { label: '🔥 급상승', color: '#ef4444' };
    if (trend === 'rising') return { label: '📈 상승세', color: '#10b981' };
    if (trend === 'stable') return { label: '➡️ 유지', color: '#6366f1' };
    return { label: '📉 하락', color: '#94a3b8' };
  };

  const handleStreamerClick = (streamerId) => {
    if (onStreamerSelect) {
      onStreamerSelect(streamerId);
    }
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
    <div className="admin-viewership">
      {/* Mock Data Notice */}
      <div className="mock-data-notice">
        <span className="notice-icon">ℹ️</span>
        <span>시청자 데이터는 샘플 데이터입니다. 실제 API 연동 시 갱신됩니다.</span>
      </div>

      {/* Time Range Selector */}
      <div className="admin-toolbar">
        <div className="time-range-selector">
          <Clock size={18} />
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="time-select"
          >
            <option value="day">오늘</option>
            <option value="week">지난 7일</option>
            <option value="month">지난 30일</option>
          </select>
        </div>
        <button className="admin-refresh-btn" disabled={loading}>
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="viewership-summary-grid">
        <div className="viewership-card">
          <div className="viewership-card-icon" style={{ backgroundColor: '#6366f120', color: '#6366f1' }}>
            <Eye size={24} />
          </div>
          <div className="viewership-card-content">
            <span className="viewership-card-label">총 시청 수</span>
            <span className="viewership-card-value">{formatNumber(data?.totalViews)}</span>
            <span className="viewership-card-change positive">+{data?.viewsGrowth || 0}%</span>
          </div>
        </div>
        <div className="viewership-card">
          <div className="viewership-card-icon" style={{ backgroundColor: '#10b98120', color: '#10b981' }}>
            <Users size={24} />
          </div>
          <div className="viewership-card-content">
            <span className="viewership-card-label">순 시청자</span>
            <span className="viewership-card-value">{formatNumber(data?.uniqueViewers)}</span>
            <span className="viewership-card-change positive">+{data?.uniqueGrowth || 0}%</span>
          </div>
        </div>
        <div className="viewership-card">
          <div className="viewership-card-icon" style={{ backgroundColor: '#f59e0b20', color: '#f59e0b' }}>
            <Clock size={24} />
          </div>
          <div className="viewership-card-content">
            <span className="viewership-card-label">평균 시청 시간</span>
            <span className="viewership-card-value">{formatDuration(data?.avgWatchTime)}</span>
            <span className="viewership-card-change positive">+{data?.watchTimeGrowth || 0}%</span>
          </div>
        </div>
        <div className="viewership-card">
          <div className="viewership-card-icon" style={{ backgroundColor: '#ef444420', color: '#ef4444' }}>
            <TrendingUp size={24} />
          </div>
          <div className="viewership-card-content">
            <span className="viewership-card-label">동시 접속 최고</span>
            <span className="viewership-card-value">{formatNumber(data?.peakConcurrent)}</span>
            <span className="viewership-card-change">최근 기록</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="admin-charts-grid">
        {/* Viewership Trend */}
        <div className="admin-chart-card large">
          <div className="chart-header">
            <h3>시청자 추이</h3>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data?.viewershipTrend || []}>
                <defs>
                  <linearGradient id="colorViewers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorUnique" x1="0" y1="0" x2="0" y2="1">
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
                  name="총 시청"
                  stroke="#6366f1"
                  fillOpacity={1}
                  fill="url(#colorViewers)"
                />
                <Area
                  type="monotone"
                  dataKey="unique"
                  name="순 시청자"
                  stroke="#10b981"
                  fillOpacity={1}
                  fill="url(#colorUnique)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Device Distribution */}
        <div className="admin-chart-card">
          <div className="chart-header">
            <h3>디바이스 분포</h3>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data?.deviceDistribution || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                  nameKey="name"
                >
                  {(data?.deviceDistribution || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <div className="device-icons">
              <div className="device-item">
                <Monitor size={18} />
                <span>데스크톱</span>
              </div>
              <div className="device-item">
                <Smartphone size={18} />
                <span>모바일</span>
              </div>
              <div className="device-item">
                <Globe size={18} />
                <span>기타</span>
              </div>
            </div>
          </div>
        </div>

        {/* Peak Hours */}
        <div className="admin-chart-card">
          <div className="chart-header">
            <h3>시간대별 시청자</h3>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data?.peakHours || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="hour" stroke="#94a3b8" fontSize={10} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="viewers" name="시청자" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Geographic Distribution */}
      <div className="admin-table-card">
        <div className="table-header">
          <h3>지역별 시청자 분포</h3>
        </div>
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>지역</th>
                <th>시청자 수</th>
                <th>비율</th>
                <th>평균 시청 시간</th>
              </tr>
            </thead>
            <tbody>
              {(data?.geoDistribution || []).map((region, index) => (
                <tr key={index}>
                  <td>
                    <span className="region-flag">{region.flag}</span>
                    {region.name}
                  </td>
                  <td>{formatNumber(region.viewers)}</td>
                  <td>
                    <div className="share-bar">
                      <div
                        className="share-fill"
                        style={{ width: `${region.percentage}%`, backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span>{region.percentage}%</span>
                    </div>
                  </td>
                  <td>{formatDuration(region.avgWatchTime)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Retention Chart */}
      <div className="admin-chart-card full-width">
        <div className="chart-header">
          <h3>시청자 이탈률</h3>
        </div>
        <div className="chart-body">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data?.retentionData || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="minute" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px'
                }}
                formatter={(value) => [`${value}%`, '유지율']}
              />
              <Line
                type="monotone"
                dataKey="retention"
                name="유지율"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ===== Game-based Streamer Influence Score Section ===== */}
      <div className="influence-section">
        <div className="influence-header">
          <div className="influence-title">
            <Award size={24} />
            <h2>게임별 스트리머 영향력 스코어</h2>
          </div>
          <p className="influence-description">
            광고 효율, 시청자 반응, 후원 전환율을 종합한 영향력 지수
          </p>
        </div>

        {/* Game Category Tabs */}
        <div className="game-category-tabs">
          {GAME_CATEGORIES.map((game) => {
            const GameIcon = game.icon;
            return (
              <button
                key={game.id}
                className={`game-tab ${selectedGame === game.id ? 'active' : ''}`}
                onClick={() => setSelectedGame(game.id)}
              >
                <GameIcon size={16} />
                <span>{game.name}</span>
              </button>
            );
          })}
        </div>

        {/* Influence Score Table */}
        <div className="influence-table-card">
          <div className="admin-table-container">
            <table className="admin-table influence-table">
              <thead>
                <tr>
                  <th className="rank-col">순위</th>
                  <th>스트리머</th>
                  <th>영향력</th>
                  <th>평균 시청자</th>
                  <th>광고 효율</th>
                  <th>후원 전환율</th>
                  <th>트렌드</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(data?.streamerInfluence || []).map((streamer, index) => {
                  const rank = getInfluenceRank(streamer.influenceScore);
                  const trend = getTrendBadge(streamer.trend);
                  return (
                    <tr
                      key={streamer.id}
                      className="streamer-row clickable"
                      onClick={() => handleStreamerClick(streamer.id)}
                    >
                      <td className="rank-col">
                        <span className={`rank-number rank-${index + 1}`}>
                          {index + 1 <= 3 ? (
                            <Crown size={16} style={{ color: index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : '#cd7f32' }} />
                          ) : (
                            index + 1
                          )}
                        </span>
                      </td>
                      <td>
                        <div className="streamer-info">
                          <div className="streamer-avatar-lg">
                            {streamer.avatar ? (
                              <img src={streamer.avatar} alt={streamer.name} />
                            ) : (
                              streamer.name?.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="streamer-details">
                            <span className="streamer-name">{streamer.name}</span>
                            <span className="streamer-platform">{streamer.platform}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="influence-score">
                          <span
                            className="influence-badge"
                            style={{ backgroundColor: rank.bg, color: rank.color }}
                          >
                            {rank.label}
                          </span>
                          <span className="influence-value">{streamer.influenceScore}</span>
                        </div>
                      </td>
                      <td>
                        <div className="stat-cell">
                          <Users size={14} />
                          <span>{formatNumber(streamer.avgViewers)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="efficiency-cell">
                          <div className="efficiency-bar">
                            <div
                              className="efficiency-fill"
                              style={{
                                width: `${streamer.adEfficiency}%`,
                                backgroundColor: streamer.adEfficiency >= 70 ? '#10b981' :
                                  streamer.adEfficiency >= 50 ? '#f59e0b' : '#ef4444'
                              }}
                            />
                          </div>
                          <span>{streamer.adEfficiency}%</span>
                        </div>
                      </td>
                      <td>
                        <div className="stat-cell">
                          <Zap size={14} style={{ color: '#f59e0b' }} />
                          <span>{streamer.donationRate}%</span>
                        </div>
                      </td>
                      <td>
                        <span className="trend-badge" style={{ color: trend.color }}>
                          {trend.label}
                        </span>
                      </td>
                      <td>
                        <button className="view-detail-btn">
                          <ChevronRight size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Ad Effectiveness Summary */}
        <div className="ad-effectiveness-grid">
          <div className="ad-card">
            <div className="ad-card-header">
              <Target size={20} />
              <h4>광고 효율 TOP 3</h4>
            </div>
            <div className="ad-card-list">
              {(data?.topAdEfficiency || []).map((s, i) => (
                <div key={i} className="ad-list-item">
                  <span className="ad-rank">{i + 1}</span>
                  <span className="ad-name">{s.name}</span>
                  <span className="ad-value">{s.adEfficiency}% CTR</span>
                </div>
              ))}
            </div>
          </div>
          <div className="ad-card">
            <div className="ad-card-header">
              <Flame size={20} />
              <h4>요즘 대세</h4>
            </div>
            <div className="ad-card-list">
              {(data?.trendingStreamers || []).map((s, i) => (
                <div key={i} className="ad-list-item">
                  <span className="ad-rank hot">🔥</span>
                  <span className="ad-name">{s.name}</span>
                  <span className="ad-growth">{s.influenceScore}점</span>
                </div>
              ))}
            </div>
          </div>
          <div className="ad-card">
            <div className="ad-card-header">
              <Star size={20} />
              <h4>후원 전환 TOP 3</h4>
            </div>
            <div className="ad-card-list">
              {(data?.topDonationRate || []).map((s, i) => (
                <div key={i} className="ad-list-item">
                  <span className="ad-rank">{i + 1}</span>
                  <span className="ad-name">{s.name}</span>
                  <span className="ad-value">{s.donationRate}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminViewership;