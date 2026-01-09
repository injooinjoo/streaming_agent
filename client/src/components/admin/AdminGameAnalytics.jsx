import React, { useState, useEffect, useMemo } from 'react';
import { Clock, Users, Radio, TrendingUp, RefreshCw, Trophy, Calendar, Gamepad2 } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const GAMES = [
  { id: 1, name: '메이플스토리', viewers: 150000, streamers: 520, watchTime: 420000, revenue: 850000000, growth: 12.5, color: '#6366f1' },
  { id: 2, name: '던전앤파이터', viewers: 85000, streamers: 380, watchTime: 280000, revenue: 620000000, growth: 8.3, color: '#10b981' },
  { id: 3, name: 'FIFA 온라인 4', viewers: 62000, streamers: 290, watchTime: 195000, revenue: 480000000, growth: 15.2, color: '#f59e0b' },
  { id: 4, name: '마비노기', viewers: 48000, streamers: 210, watchTime: 165000, revenue: 320000000, growth: 5.8, color: '#ef4444' },
  { id: 5, name: '카트라이더: 드리프트', viewers: 35000, streamers: 180, watchTime: 120000, revenue: 280000000, growth: 22.1, color: '#8b5cf6' },
  { id: 6, name: '서든어택', viewers: 28000, streamers: 150, watchTime: 95000, revenue: 180000000, growth: -3.2, color: '#ec4899' },
  { id: 7, name: '바람의나라', viewers: 22000, streamers: 120, watchTime: 85000, revenue: 120000000, growth: 2.1, color: '#14b8a6' },
  { id: 8, name: '크레이지아케이드', viewers: 15000, streamers: 90, watchTime: 45000, revenue: 65000000, growth: 18.7, color: '#f97316' },
];

const TOP_STREAMERS_BY_GAME = {
  '메이플스토리': [
    { rank: 1, name: '떡호떡', viewers: 25000, influence: 98 },
    { rank: 2, name: '케인', viewers: 18500, influence: 92 },
    { rank: 3, name: '풍월량', viewers: 15200, influence: 88 },
    { rank: 4, name: '우왁굳', viewers: 12800, influence: 85 },
    { rank: 5, name: '감스트', viewers: 9500, influence: 78 },
  ],
  '던전앤파이터': [
    { rank: 1, name: '던파BJ', viewers: 15000, influence: 95 },
    { rank: 2, name: '아라드', viewers: 12000, influence: 88 },
    { rank: 3, name: '세리아', viewers: 9800, influence: 82 },
    { rank: 4, name: '카인서버', viewers: 7500, influence: 75 },
    { rank: 5, name: '시로코', viewers: 5200, influence: 68 },
  ],
  'FIFA 온라인 4': [
    { rank: 1, name: '감스트', viewers: 22000, influence: 97 },
    { rank: 2, name: '침착맨', viewers: 18000, influence: 94 },
    { rank: 3, name: '피파온라인', viewers: 8500, influence: 78 },
    { rank: 4, name: '축구왕', viewers: 6200, influence: 72 },
    { rank: 5, name: '골키퍼', viewers: 4800, influence: 65 },
  ],
  '마비노기': [
    { rank: 1, name: '마비노기킹', viewers: 12000, influence: 92 },
    { rank: 2, name: '에린', viewers: 8500, influence: 85 },
    { rank: 3, name: '밀레시안', viewers: 6200, influence: 78 },
    { rank: 4, name: '던바튼', viewers: 4800, influence: 70 },
    { rank: 5, name: '티르나노이', viewers: 3500, influence: 62 },
  ],
  '카트라이더: 드리프트': [
    { rank: 1, name: '문호준', viewers: 9500, influence: 95 },
    { rank: 2, name: '카트왕', viewers: 7200, influence: 88 },
    { rank: 3, name: '드리프트', viewers: 5800, influence: 82 },
    { rank: 4, name: '배찌', viewers: 4200, influence: 75 },
    { rank: 5, name: '다오', viewers: 3100, influence: 68 },
  ],
  '서든어택': [
    { rank: 1, name: '서든킹', viewers: 8000, influence: 90 },
    { rank: 2, name: 'FPS마스터', viewers: 5500, influence: 82 },
    { rank: 3, name: '헤드샷', viewers: 4200, influence: 75 },
    { rank: 4, name: '스나이퍼', viewers: 3100, influence: 68 },
    { rank: 5, name: '돌격대', viewers: 2400, influence: 60 },
  ],
  '바람의나라': [
    { rank: 1, name: '바람왕', viewers: 6500, influence: 88 },
    { rank: 2, name: '부여성', viewers: 4800, influence: 80 },
    { rank: 3, name: '도사', viewers: 3500, influence: 72 },
    { rank: 4, name: '검사', viewers: 2800, influence: 65 },
    { rank: 5, name: '궁수', viewers: 2100, influence: 58 },
  ],
  '크레이지아케이드': [
    { rank: 1, name: '물풍선왕', viewers: 4500, influence: 85 },
    { rank: 2, name: '배찌마스터', viewers: 3200, influence: 78 },
    { rank: 3, name: '아케이드', viewers: 2400, influence: 70 },
    { rank: 4, name: '크아킹', viewers: 1800, influence: 62 },
    { rank: 5, name: '폭탄마', viewers: 1200, influence: 55 },
  ],
};

const AdminGameAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('week');
  const [selectedGame, setSelectedGame] = useState('메이플스토리');

  // 트렌드 데이터 생성 (7일)
  const trendData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return {
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        메이플스토리: 140000 + Math.floor(Math.random() * 20000),
        던전앤파이터: 80000 + Math.floor(Math.random() * 15000),
        'FIFA 온라인 4': 55000 + Math.floor(Math.random() * 15000),
        마비노기: 42000 + Math.floor(Math.random() * 12000),
      };
    });
  }, [timeRange]);

  // 시간대별 피크 데이터
  const peakHoursData = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}시`,
      viewers: i >= 20 || i <= 2
        ? 80000 + Math.floor(Math.random() * 40000)
        : i >= 12 && i <= 14
          ? 50000 + Math.floor(Math.random() * 20000)
          : 20000 + Math.floor(Math.random() * 30000)
    }));
  }, []);

  // 파이 차트용 데이터
  const pieData = useMemo(() => {
    return GAMES.map(game => ({
      name: game.name,
      value: game.viewers,
      color: game.color
    }));
  }, []);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, [timeRange]);

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
    return (
      <div className="admin-loading-section">
        <RefreshCw size={24} className="spin" />
        <p>데이터 로딩 중...</p>
      </div>
    );
  }

  const totalViewers = GAMES.reduce((sum, g) => sum + g.viewers, 0);
  const totalStreamers = GAMES.reduce((sum, g) => sum + g.streamers, 0);
  const totalWatchTime = GAMES.reduce((sum, g) => sum + g.watchTime, 0);
  const totalRevenue = GAMES.reduce((sum, g) => sum + g.revenue, 0);

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
            <span className="revenue-card-value">{formatNumber(Math.floor(totalViewers / GAMES.length))}명</span>
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
              {GAMES.map((game, index) => (
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
            {GAMES.map(game => (
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
              {TOP_STREAMERS_BY_GAME[selectedGame]?.map((streamer) => (
                <tr key={streamer.rank}>
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
                        style={{ width: `${streamer.influence}%`, backgroundColor: GAMES.find(g => g.name === selectedGame)?.color || '#6366f1' }}
                      />
                      <span>{streamer.influence}</span>
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

export default AdminGameAnalytics;
