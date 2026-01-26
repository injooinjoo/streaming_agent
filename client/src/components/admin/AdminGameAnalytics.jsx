import React, { useState, useEffect, useMemo } from 'react';
import { Clock, Users, Radio, TrendingUp, RefreshCw, Trophy, Calendar, Gamepad2, ChevronRight, AlertTriangle } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../shared/LoadingSpinner';
import { API_URL } from '../../config/api';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const AdminGameAnalytics = ({ onStreamerSelect }) => {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('week');
  const [selectedGame, setSelectedGame] = useState(null);
  const [gamesData, setGamesData] = useState([]);
  const [topStreamersByGame, setTopStreamersByGame] = useState({});
  const [error, setError] = useState(null);

  const { accessToken } = useAuth();

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    const headers = {
      'Content-Type': 'application/json',
      ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
    };

    try {
      // Fetch unified games data
      const gamesRes = await fetch(`${API_URL}/api/categories/unified-games?limit=10`, { headers });

      if (gamesRes.ok) {
        const result = await gamesRes.json();
        const transformed = (result.games || []).map((g, i) => ({
          id: g.id,
          name: g.name || g.name_kr || 'Unknown',
          viewers: 0, // Would come from viewer stats
          streamers: 0,
          watchTime: 0,
          revenue: 0,
          growth: 0,
          color: COLORS[i % COLORS.length]
        }));
        setGamesData(transformed);
        if (transformed.length > 0 && !selectedGame) {
          setSelectedGame(transformed[0].name);
        }
      } else {
        setGamesData([]);
      }

      setTopStreamersByGame({});

    } catch (err) {
      console.error('Failed to fetch game analytics:', err);
      setError('불러오기 실패');
      setGamesData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStreamerClick = (streamerId) => {
    if (onStreamerSelect) {
      onStreamerSelect(streamerId);
    }
  };

  // 트렌드 데이터 생성 - 실제 데이터 없으면 빈 배열
  const trendData = useMemo(() => {
    if (gamesData.length === 0) return [];
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const dataPoint = { date: `${date.getMonth() + 1}/${date.getDate()}` };
      gamesData.slice(0, 4).forEach(game => {
        dataPoint[game.name] = 0; // Would be real viewer data
      });
      return dataPoint;
    });
  }, [gamesData]);

  // 시간대별 피크 데이터 - 실제 데이터 없으면 빈 배열
  const peakHoursData = useMemo(() => {
    if (gamesData.length === 0) return [];
    return Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}시`,
      viewers: 0 // Would be real viewer data
    }));
  }, [gamesData]);

  // 파이 차트용 데이터
  const pieData = useMemo(() => {
    return gamesData.map(game => ({
      name: game.name,
      value: game.viewers,
      color: game.color
    }));
  }, [gamesData]);

  const formatNumber = (num) => {
    return new Intl.NumberFormat('ko-KR').format(num);
  };

  const formatCurrency = (amount) => {
    if (amount >= 100000000) return `${(amount / 100000000).toFixed(1)}억`;
    if (amount >= 10000) return `${(amount / 10000).toFixed(0)}만`;
    return formatNumber(amount);
  };

  const formatCompact = (num) => {
    if (num >= 10000) return `${(num / 10000).toFixed(1)}만`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}천`;
    return num;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip">
          <p className="tooltip-label">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {formatNumber(entry.value)}명
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

  const totalViewers = gamesData.reduce((sum, g) => sum + g.viewers, 0);
  const totalStreamers = gamesData.reduce((sum, g) => sum + g.streamers, 0);
  const totalWatchTime = gamesData.reduce((sum, g) => sum + g.watchTime, 0);
  const totalRevenue = gamesData.reduce((sum, g) => sum + g.revenue, 0);

  return (
    <div className="admin-game-analytics">
      {/* Toolbar */}
      <div className="admin-toolbar">
        <div className="time-range-selector">
          <Calendar size={18} />
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="time-select"
          >
            <option value="week">지난 7일</option>
            <option value="month">지난 30일</option>
            <option value="quarter">지난 3개월</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="revenue-summary-grid">
        <div className="revenue-card">
          <div className="revenue-card-icon" style={{ backgroundColor: '#6366f120', color: '#6366f1' }}>
            <Clock size={24} />
          </div>
          <div className="revenue-card-content">
            <span className="revenue-card-label">총 시청시간</span>
            <span className="revenue-card-value">{formatNumber(totalWatchTime)}시간</span>
          </div>
        </div>
        <div className="revenue-card">
          <div className="revenue-card-icon" style={{ backgroundColor: '#10b98120', color: '#10b981' }}>
            <Users size={24} />
          </div>
          <div className="revenue-card-content">
            <span className="revenue-card-label">평균 동시접속</span>
            <span className="revenue-card-value">{gamesData.length > 0 ? formatNumber(Math.floor(totalViewers / gamesData.length)) : 0}명</span>
          </div>
        </div>
        <div className="revenue-card">
          <div className="revenue-card-icon" style={{ backgroundColor: '#f59e0b20', color: '#f59e0b' }}>
            <Radio size={24} />
          </div>
          <div className="revenue-card-content">
            <span className="revenue-card-label">활성 스트리머</span>
            <span className="revenue-card-value">{formatNumber(totalStreamers)}명</span>
          </div>
        </div>
        <div className="revenue-card">
          <div className="revenue-card-icon" style={{ backgroundColor: '#ef444420', color: '#ef4444' }}>
            <TrendingUp size={24} />
          </div>
          <div className="revenue-card-content">
            <span className="revenue-card-label">게임 수익</span>
            <span className="revenue-card-value">₩{formatCurrency(totalRevenue)}</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="admin-charts-grid">
        {/* Viewer Trend Chart */}
        <div className="admin-chart-card large">
          <div className="chart-header">
            <h3>게임별 시청자 트렌드</h3>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={formatCompact} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area type="monotone" dataKey="메이플스토리" stackId="1" stroke="#6366f1" fill="#6366f1" fillOpacity={0.6} />
                <Area type="monotone" dataKey="던전앤파이터" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                <Area type="monotone" dataKey="FIFA 온라인 4" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
                <Area type="monotone" dataKey="마비노기" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart - Game Distribution */}
        <div className="admin-chart-card">
          <div className="chart-header">
            <h3>게임별 점유율</h3>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${formatNumber(value)}명`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Peak Hours Chart */}
        <div className="admin-chart-card">
          <div className="chart-header">
            <h3>시간대별 시청자</h3>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={peakHoursData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="hour" stroke="#94a3b8" fontSize={10} interval={2} />
                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={formatCompact} />
                <Tooltip formatter={(value) => `${formatNumber(value)}명`} />
                <Bar dataKey="viewers" name="시청자" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Game Ranking Table */}
      <div className="admin-top-list-card">
        <div className="top-list-header">
          <Gamepad2 size={20} />
          <h3>게임 순위</h3>
        </div>
        <div className="top-list-body">
          <table className="top-list-table">
            <thead>
              <tr>
                <th>순위</th>
                <th>게임</th>
                <th>시청자</th>
                <th>스트리머</th>
                <th>시청시간</th>
                <th>수익</th>
                <th>성장률</th>
              </tr>
            </thead>
            <tbody>
              {gamesData.map((game, index) => (
                <tr key={game.id}>
                  <td>
                    <span className={`rank-badge rank-${index + 1}`}>
                      {index + 1}
                    </span>
                  </td>
                  <td>
                    <div className="game-cell">
                      <div className="game-color" style={{ backgroundColor: game.color }} />
                      <span>{game.name}</span>
                    </div>
                  </td>
                  <td>{formatCompact(game.viewers)}명</td>
                  <td>{formatNumber(game.streamers)}명</td>
                  <td>{formatCompact(game.watchTime)}시간</td>
                  <td>₩{formatCurrency(game.revenue)}</td>
                  <td>
                    <span className={`growth-badge ${game.growth >= 0 ? 'positive' : 'negative'}`}>
                      {game.growth >= 0 ? '+' : ''}{game.growth.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Streamers by Game */}
      <div className="admin-top-list-card">
        <div className="top-list-header">
          <Trophy size={20} />
          <h3>게임별 TOP 스트리머</h3>
          <select
            value={selectedGame}
            onChange={(e) => setSelectedGame(e.target.value)}
            className="game-select"
          >
            {gamesData.map(game => (
              <option key={game.id} value={game.name}>{game.name}</option>
            ))}
          </select>
        </div>
        <div className="top-list-body">
          <table className="top-list-table">
            <thead>
              <tr>
                <th>순위</th>
                <th>스트리머</th>
                <th>시청자</th>
                <th>영향력</th>
              </tr>
            </thead>
            <tbody>
              {(topStreamersByGame[selectedGame] || []).map((streamer) => (
                <tr
                  key={streamer.rank}
                  className="clickable"
                  onClick={() => handleStreamerClick(streamer.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <span className={`rank-badge rank-${streamer.rank}`}>
                      {streamer.rank}
                    </span>
                  </td>
                  <td>
                    <div className="streamer-cell">
                      <div className="streamer-avatar">
                        {streamer.name.charAt(0)}
                      </div>
                      <span>{streamer.name}</span>
                    </div>
                  </td>
                  <td>{formatNumber(streamer.viewers)}명</td>
                  <td>
                    <div className="influence-bar">
                      <div
                        className="influence-fill"
                        style={{ width: `${streamer.influence}%`, backgroundColor: gamesData.find(g => g.name === selectedGame)?.color || '#6366f1' }}
                      />
                      <span>{streamer.influence}</span>
                    </div>
                  </td>
                  <td>
                    <button className="view-detail-btn">
                      <ChevronRight size={18} />
                    </button>
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

export default AdminGameAnalytics;
