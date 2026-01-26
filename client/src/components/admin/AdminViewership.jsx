import React, { useState, useEffect, useMemo } from 'react';
import {
  RefreshCw, Users, Clock, Gamepad2, Crown, Flame, Target, ChevronRight, Star, Zap, Award, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../shared/LoadingSpinner';

import { API_URL } from '../../config/api';

// Game categories for filtering
const GAME_CATEGORIES = [
  { id: 'all', name: '전체', icon: Gamepad2 },
  { id: 'league', name: '리그오브레전드', icon: Crown },
  { id: 'valorant', name: '발로란트', icon: Target },
  { id: 'minecraft', name: '마인크래프트', icon: Gamepad2 },
  { id: 'gta', name: 'GTA', icon: Flame },
  { id: 'talk', name: '토크/저스트채팅', icon: Users },
];

const AdminViewership = ({ onStreamerSelect }) => {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('week');
  const [selectedGame, setSelectedGame] = useState('all');
  const [streamerData, setStreamerData] = useState([]);
  const [error, setError] = useState(null);

  const { accessToken } = useAuth();

  useEffect(() => {
    fetchData();
  }, [selectedGame, timeRange]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    const headers = {
      'Content-Type': 'application/json',
      ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
    };

    try {
      const response = await fetch(`${API_URL}/api/streamers?limit=20&sortBy=total_donations&sortOrder=desc`, { headers });

      if (response.ok) {
        const result = await response.json();
        // Transform real data to expected format
        const transformed = (result.streamers || []).map((s, i) => ({
          id: s.id || i + 1,
          name: s.username || '익명',
          platform: 'chzzk', // Would come from actual data
          influenceScore: Math.min(100, Math.round((s.total_donations || 0) / 10000) + 50), // Rough estimate
          avgViewers: 0,
          adEfficiency: 0,
          donationRate: s.total_events > 0 ? ((s.total_donations || 0) / s.total_events * 0.01).toFixed(1) : 0,
          trend: 'stable',
          mainGame: '-',
          games: [],
          totalDonations: s.total_donations || 0,
          totalEvents: s.total_events || 0
        }));
        setStreamerData(transformed);
      } else {
        setStreamerData([]);
      }
    } catch (err) {
      console.error('Failed to fetch viewership data:', err);
      setError('불러오기 실패');
      setStreamerData([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculate derived data
  const data = useMemo(() => {
    const filteredStreamers = streamerData;

    // 광고 효율 TOP 3
    const topAdEfficiency = [...filteredStreamers]
      .sort((a, b) => b.adEfficiency - a.adEfficiency)
      .slice(0, 3);

    // 요즘 대세 (highest influence)
    const trendingStreamers = [...filteredStreamers]
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
  }, [streamerData]);

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
    return <LoadingSpinner />;
  }

  return (
    <div className="admin-viewership">
      {/* Data Status Notice */}
      {streamerData.length === 0 && !loading && (
        <div className="mock-data-notice" style={{ backgroundColor: '#fef3c7', borderColor: '#f59e0b' }}>
          <span className="notice-icon">⚠️</span>
          <span>활동 데이터가 없습니다. 플랫폼 연결 후 데이터가 수집됩니다.</span>
        </div>
      )}

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
