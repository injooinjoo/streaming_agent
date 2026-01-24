import { useState, useEffect, useMemo } from 'react';
import {
  Gamepad2, Eye, Users, TrendingUp, TrendingDown,
  RefreshCw, Trophy, Search, AlertCircle
} from 'lucide-react';
import { formatNumber } from '../../utils/formatters';
import './GameCatalog.css';

const API_BASE = 'http://localhost:3001';

const GameCatalog = ({ onGameSelect }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [games, setGames] = useState([]);
  const [stats, setStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // 게임 카탈로그 및 통계 로드
  const fetchCatalog = async () => {
    setLoading(true);
    setError(null);

    try {
      // 병렬로 게임 목록과 통계 조회
      const [gamesRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/categories?limit=100`),
        fetch(`${API_BASE}/api/categories/stats`)
      ]);

      if (!gamesRes.ok || !statsRes.ok) {
        throw new Error('불러오기 실패');
      }

      const gamesData = await gamesRes.json();
      const statsData = await statsRes.json();

      if (gamesData.success && gamesData.data) {
        setGames(gamesData.data);
      }

      if (statsData.success && statsData.data) {
        setStats(statsData.data);
      }
    } catch (err) {
      console.error('GameCatalog fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
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

  // 로딩 상태
  if (loading) {
    return (
      <div className="game-catalog">
        <div className="game-catalog-loading">
          <RefreshCw size={32} className="spinning" />
          <span>불러오는 중...</span>
        </div>
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
          <button onClick={fetchCatalog} className="retry-button">
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
          <Gamepad2 size={28} />
          <div>
            <h1>게임 카탈로그</h1>
            <p>인기 게임과 스트리머 정보를 확인하세요</p>
          </div>
        </div>
        <button onClick={fetchCatalog} className="refresh-button" title="새로고침">
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
          <Gamepad2 size={20} />
          <div className="game-catalog-stat__content">
            <span className="game-catalog-stat__value">
              {stats?.total_games || games.length}
            </span>
            <span className="game-catalog-stat__label">총 게임 수</span>
          </div>
        </div>
      </div>

      {/* 플랫폼 현황 */}
      <div className="game-catalog-platforms">
        <div className="platform-badge soop">
          <img src="/assets/logos/soop.png" alt="SOOP" />
          <span>{stats?.soop_categories || 0} 카테고리</span>
        </div>
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
          placeholder="게임 이름, 장르로 검색..."
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
                  <Gamepad2 size={32} />
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
          <Gamepad2 size={48} />
          <h3>검색 결과가 없습니다</h3>
          <p>다른 검색어를 시도해보세요</p>
        </div>
      )}
    </div>
  );
};

export default GameCatalog;
