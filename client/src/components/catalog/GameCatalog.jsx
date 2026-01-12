import { useState, useEffect, useMemo } from 'react';
import {
  Gamepad2, Eye, Users, TrendingUp, TrendingDown,
  RefreshCw, Trophy, Search
} from 'lucide-react';
import { GAME_CATALOG, getCatalogStats, formatNumber } from './mockGameData';
import './GameCatalog.css';

const GameCatalog = ({ onGameSelect }) => {
  const [loading, setLoading] = useState(true);
  const [games, setGames] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // 데이터 로드 (목업)
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setGames(GAME_CATALOG);
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // 통계 계산
  const stats = useMemo(() => getCatalogStats(), []);

  // 검색 필터
  const filteredGames = useMemo(() => {
    if (!searchTerm) return games;
    const term = searchTerm.toLowerCase();
    return games.filter(game =>
      game.nameKr.toLowerCase().includes(term) ||
      game.name.toLowerCase().includes(term) ||
      game.genre.toLowerCase().includes(term)
    );
  }, [games, searchTerm]);

  // 로딩 상태
  if (loading) {
    return (
      <div className="game-catalog">
        <div className="game-catalog-loading">
          <RefreshCw size={32} className="spinning" />
          <span>게임 정보를 불러오는 중...</span>
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
      </div>

      {/* 통계 요약 */}
      <div className="game-catalog-stats">
        <div className="game-catalog-stat glass-premium">
          <Eye size={20} />
          <div className="game-catalog-stat__content">
            <span className="game-catalog-stat__value">{formatNumber(stats.totalViewers)}</span>
            <span className="game-catalog-stat__label">총 시청자</span>
          </div>
        </div>
        <div className="game-catalog-stat glass-premium">
          <Users size={20} />
          <div className="game-catalog-stat__content">
            <span className="game-catalog-stat__value">{formatNumber(stats.totalStreamers)}</span>
            <span className="game-catalog-stat__label">활성 스트리머</span>
          </div>
        </div>
        <div className="game-catalog-stat glass-premium">
          <Trophy size={20} />
          <div className="game-catalog-stat__content">
            <span className="game-catalog-stat__value">{stats.topGame.nameKr}</span>
            <span className="game-catalog-stat__label">인기 1위</span>
          </div>
        </div>
        <div className="game-catalog-stat glass-premium">
          <TrendingUp size={20} />
          <div className="game-catalog-stat__content">
            <span className="game-catalog-stat__value">+{stats.avgGrowth.toFixed(1)}%</span>
            <span className="game-catalog-stat__label">평균 성장률</span>
          </div>
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
            onClick={() => onGameSelect(game.id)}
          >
            <div className="game-catalog-card__image">
              <img src={game.image} alt={game.nameKr} />
              <div className="game-catalog-card__genre">{game.genre}</div>
            </div>
            <div className="game-catalog-card__info">
              <h3 className="game-catalog-card__title">{game.nameKr}</h3>
              <p className="game-catalog-card__subtitle">{game.name}</p>
              <div className="game-catalog-card__stats">
                <div className="game-catalog-card__stat">
                  <Eye size={14} />
                  <span>{formatNumber(game.currentViewers)}</span>
                </div>
                <div className="game-catalog-card__stat">
                  <Users size={14} />
                  <span>{formatNumber(game.liveStreamers)}</span>
                </div>
                <div className={`game-catalog-card__growth ${game.growth >= 0 ? 'positive' : 'negative'}`}>
                  {game.growth >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  <span>{game.growth >= 0 ? '+' : ''}{game.growth.toFixed(1)}%</span>
                </div>
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
