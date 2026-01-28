import { useState, useEffect, useMemo } from 'react';
import {
  Layers, Eye, Users, TrendingUp,
  RefreshCw, Trophy, Search, AlertCircle, BarChart3
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { formatNumber } from '../../utils/formatters';
import { API_URL } from '../../config/api';
import LoadingSpinner from '../shared/LoadingSpinner';
import './GameCatalog.css';

// 차트 색상 팔레트 (상위 20개용)
const CHART_COLORS = [
  '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444',
  '#ec4899', '#6366f1', '#14b8a6', '#84cc16', '#f97316',
  '#a855f7', '#22d3d8', '#22c55e', '#eab308', '#dc2626',
  '#d946ef', '#818cf8', '#2dd4bf', '#a3e635', '#fb923c'
];

const GameCatalog = ({ onGameSelect }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [games, setGames] = useState([]);
  const [stats, setStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [trends, setTrends] = useState(null);
  const [trendsLoading, setTrendsLoading] = useState(true);

  // 게임 카탈로그, 통계, 트렌드를 모두 병렬 로드
  const fetchAll = async () => {
    setLoading(true);
    setTrendsLoading(true);
    setError(null);

    try {
      const [gamesRes, statsRes, trendsRes] = await Promise.all([
        fetch(`${API_URL}/api/categories?limit=100`),
        fetch(`${API_URL}/api/categories/stats`),
        fetch(`${API_URL}/api/categories/trends?limit=20&days=7`)
      ]);

      if (!gamesRes.ok || !statsRes.ok) {
        throw new Error('불러오기 실패');
      }

      const [gamesData, statsData] = await Promise.all([
        gamesRes.json(),
        statsRes.json()
      ]);

      if (gamesData.success && gamesData.data) {
        setGames(gamesData.data);
      }

      if (statsData.success && statsData.data) {
        setStats(statsData.data);
      }

      // 트렌드는 실패해도 무시
      if (trendsRes.ok) {
        const trendsData = await trendsRes.json();
        if (trendsData.success && trendsData.data) {
          setTrends(trendsData.data);
        }
      }
    } catch (err) {
      console.error('GameCatalog fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setTrendsLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // 검색 필터
  const filteredGames = useMemo(() => {
    if (!searchTerm) return games;
    const term = searchTerm.toLowerCase();
    return games.filter(game =>
      game.nameKr?.toLowerCase().includes(term) ||
      game.name?.toLowerCase().includes(term) ||
      game.genre?.toLowerCase().includes(term)
    );
  }, [games, searchTerm]);

  // 최상위 게임 찾기
  const topGame = useMemo(() => {
    if (!games.length) return null;
    return games.reduce((top, game) =>
      (game.totalViewers > (top?.totalViewers || 0)) ? game : top
    , games[0]);
  }, [games]);

  // 차트 커스텀 툴팁
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="trend-chart-tooltip">
          <p className="trend-chart-tooltip__date">{label}</p>
          <div className="trend-chart-tooltip__items">
            {payload
              .filter(p => p.value > 0)
              .sort((a, b) => b.value - a.value)
              .slice(0, 10)
              .map((item, idx) => (
                <div key={idx} className="trend-chart-tooltip__item">
                  <span
                    className="trend-chart-tooltip__color"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="trend-chart-tooltip__name">{item.name}</span>
                  <span className="trend-chart-tooltip__value">
                    {formatNumber(item.value)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      );
    }
    return null;
  };

  // 로딩 상태
  if (loading) {
    return (
      <div className="game-catalog">
        <LoadingSpinner />
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="game-catalog">
        <div className="game-catalog-error">
          <AlertCircle size={32} />
          <span>{error}</span>
          <button onClick={fetchAll} className="retry-button">
            <RefreshCw size={16} />
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="game-catalog">
      {/* 헤더 */}
      <div className="game-catalog-header">
        <div className="game-catalog-header__title">
          <Layers size={28} />
          <div>
            <h1>카테고리</h1>
            <p>인기 카테고리와 스트리머 정보를 확인하세요</p>
          </div>
        </div>
        <button onClick={fetchAll} className="refresh-button" title="새로고침">
          <RefreshCw size={18} />
        </button>
      </div>

      {/* 통계 요약 */}
      <div className="game-catalog-stats">
        <div className="game-catalog-stat glass-premium">
          <Eye size={20} />
          <div className="game-catalog-stat__content">
            <span className="game-catalog-stat__value">
              {formatNumber(stats?.total_viewers || 0)}
            </span>
            <span className="game-catalog-stat__label">총 시청자</span>
          </div>
        </div>
        <div className="game-catalog-stat glass-premium">
          <Users size={20} />
          <div className="game-catalog-stat__content">
            <span className="game-catalog-stat__value">
              {formatNumber(stats?.total_streamers || 0)}
            </span>
            <span className="game-catalog-stat__label">활성 스트리머</span>
          </div>
        </div>
        <div className="game-catalog-stat glass-premium">
          <Trophy size={20} />
          <div className="game-catalog-stat__content">
            <span className="game-catalog-stat__value">
              {topGame?.nameKr || topGame?.name || '-'}
            </span>
            <span className="game-catalog-stat__label">인기 1위</span>
          </div>
        </div>
        <div className="game-catalog-stat glass-premium">
          <Layers size={20} />
          <div className="game-catalog-stat__content">
            <span className="game-catalog-stat__value">
              {stats?.total_games || games.length}
            </span>
            <span className="game-catalog-stat__label">총 카테고리</span>
          </div>
        </div>
      </div>

      {/* 트렌드 차트 */}
      <div className="trend-chart-section glass-premium">
        <div className="trend-chart-header">
          <div className="trend-chart-title">
            <BarChart3 size={20} />
            <h2>상위 카테고리 일별 시청자 추이</h2>
          </div>
          <span className="trend-chart-period">최근 7일</span>
        </div>

        {trendsLoading ? (
          <div className="trend-chart-loading">
            <RefreshCw size={24} className="spin" />
            <span>트렌드 데이터 로딩 중...</span>
          </div>
        ) : trends && trends.dailyData && trends.dailyData.length > 0 ? (
          <>
            <div className="trend-chart-container">
              <ResponsiveContainer width="100%" height={320}>
                <LineChart
                  data={trends.dailyData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis
                    dataKey="date"
                    stroke="rgba(255,255,255,0.6)"
                    tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                  />
                  <YAxis
                    stroke="rgba(255,255,255,0.6)"
                    tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
                    tickFormatter={(value) => formatNumber(value)}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  {trends.categories.slice(0, 10).map((cat, idx) => (
                    <Line
                      key={cat.key}
                      type="monotone"
                      dataKey={cat.key}
                      name={cat.name}
                      stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* 범례 */}
            <div className="trend-chart-legend">
              {trends.categories.slice(0, 10).map((cat, idx) => (
                <div
                  key={cat.key}
                  className="trend-chart-legend__item"
                  onClick={() => onGameSelect(cat.id)}
                >
                  <span
                    className="trend-chart-legend__color"
                    style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                  />
                  <span className="trend-chart-legend__name">{cat.name}</span>
                  <span className="trend-chart-legend__viewers">
                    {formatNumber(cat.totalViewers)}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="trend-chart-empty">
            <TrendingUp size={32} />
            <span>트렌드 데이터가 아직 없습니다</span>
          </div>
        )}
      </div>

      {/* 플랫폼 현황 */}
      <div className="game-catalog-platforms">
        <div className="platform-badge soop">
          <img src="/assets/logos/soop.png" alt="SOOP" />
          <span>{stats?.soop_categories || 0} 카테고리</span>
        </div>
        {stats?.shared_categories > 0 && (
          <div className="platform-badge shared" title="양 플랫폼에 모두 있는 카테고리">
            <Layers size={16} />
            <span>{stats.shared_categories} 공유</span>
          </div>
        )}
        <div className="platform-badge chzzk">
          <img src="/assets/logos/chzzk.png" alt="Chzzk" />
          <span>{stats?.chzzk_categories || 0} 카테고리</span>
        </div>
      </div>

      {/* 검색 */}
      <div className="game-catalog-search glass-premium">
        <Search size={18} />
        <input
          type="text"
          placeholder="카테고리 이름, 장르로 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* 게임 그리드 */}
      <div className="game-catalog-grid">
        {filteredGames.map(game => (
          <div
            key={game.id}
            className="game-catalog-card glass-premium"
            onClick={() => {
              console.log('[GameCatalog] Card clicked - game.id:', game.id, 'name:', game.nameKr || game.name);
              onGameSelect(game.id);
            }}
          >
            <div className="game-catalog-card__image">
              {game.imageUrl ? (
                <img src={game.imageUrl} alt={game.nameKr || game.name} />
              ) : (
                <div className="game-catalog-card__placeholder">
                  <Layers size={32} />
                </div>
              )}
              {game.genre && (
                <div className="game-catalog-card__genre">{game.genre}</div>
              )}
            </div>
            <div className="game-catalog-card__info">
              <h3 className="game-catalog-card__title">{game.nameKr || game.name}</h3>
              {game.nameKr && game.name && game.nameKr !== game.name && (
                <p className="game-catalog-card__subtitle">{game.name}</p>
              )}
              <div className="game-catalog-card__stats">
                <div className="game-catalog-card__stat">
                  <Eye size={14} />
                  <span>{formatNumber(game.totalViewers || 0)}</span>
                </div>
                <div className="game-catalog-card__stat">
                  <Users size={14} />
                  <span>{formatNumber(game.totalStreamers || 0)}</span>
                </div>
                {game.platforms && game.platforms.length > 0 && (
                  <div className="game-catalog-card__platforms">
                    {game.platforms.includes('soop') && (
                      <img src="/assets/logos/soop.png" alt="SOOP" title="SOOP" />
                    )}
                    {game.platforms.includes('chzzk') && (
                      <img src="/assets/logos/chzzk.png" alt="Chzzk" title="Chzzk" />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 검색 결과 없음 */}
      {filteredGames.length === 0 && (
        <div className="game-catalog-empty">
          <Layers size={48} />
          <h3>검색 결과가 없습니다</h3>
          <p>다른 검색어를 시도해보세요</p>
        </div>
      )}
    </div>
  );
};

export default GameCatalog;
