import React, { useState, useEffect, useMemo } from 'react';
import {
  RefreshCw, Users, Clock, Gamepad2, Crown, Flame, Target, ChevronRight, Star, Zap, Award
} from 'lucide-react';

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

    return {
      streamerInfluence: filteredStreamers,
      topAdEfficiency,
      trendingStreamers,
      topDonationRate
    };
  }, [selectedGame]);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, [selectedGame, timeRange]);

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num?.toLocaleString() || '0';
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
    if (trend === 'up') return { label: '📈 상승세', color: '#10b981' };
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
        <span>스트리머 데이터는 샘플 데이터입니다. 실제 API 연동 시 갱신됩니다.</span>
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

      {/* ===== Game-based Streamer Influence Score Section ===== */}
      <div className="influence-section" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
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
                                width: `${streamer.adEfficiency * 20}%`,
                                backgroundColor: streamer.adEfficiency >= 4 ? '#10b981' :
                                  streamer.adEfficiency >= 3 ? '#f59e0b' : '#ef4444'
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
