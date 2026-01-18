import { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft, Eye, Users, TrendingUp, TrendingDown, Trophy, Calendar,
  Building2, RefreshCw, Tag, Crown
} from 'lucide-react';
import { GAME_CATALOG, TOP_STREAMERS_BY_GAME, formatNumber, formatFullNumber } from './mockGameData';
import './GameCatalog.css';

const PLATFORM_COLORS = {
  soop: '#1e3a5f',
  chzzk: '#00ffa3',
  twitch: '#9146ff',
  youtube: '#ff0000'
};

const GameDetail = ({ gameId, onBack }) => {
  const [loading, setLoading] = useState(true);

  // 게임 데이터 조회
  const gameData = useMemo(() => {
    return GAME_CATALOG.find(g => g.id === gameId);
  }, [gameId]);

  // 탑 스트리머 조회
  const topStreamers = useMemo(() => {
    return TOP_STREAMERS_BY_GAME[gameId] || [];
  }, [gameId]);

  // 로딩 시뮬레이션
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [gameId]);

  // 로딩 상태
  if (loading) {
    return (
      <div className="game-detail">
        <div className="game-catalog-loading">
          <RefreshCw size={32} className="spinning" />
          <span>게임 정보를 불러오는 중...</span>
        </div>
      </div>
    );
  }

  // 게임 없음
  if (!gameData) {
    return (
      <div className="game-detail">
        <button className="game-detail-back" onClick={onBack}>
          <ArrowLeft size={18} />
          목록으로 돌아가기
        </button>
        <div className="game-catalog-empty">
          <Trophy size={48} />
          <h3>게임을 찾을 수 없습니다</h3>
          <p>잘못된 접근입니다</p>
        </div>
      </div>
    );
  }

  return (
    <div className="game-detail">
      {/* 뒤로가기 */}
      <button className="game-detail-back" onClick={onBack}>
        <ArrowLeft size={18} />
        목록으로 돌아가기
      </button>

      {/* 게임 헤더 */}
      <div className="game-detail-header glass-premium">
        <div className="game-detail-header__image">
          <img src={gameData.image} alt={gameData.nameKr} />
        </div>
        <div className="game-detail-header__info">
          <h1>{gameData.nameKr}</h1>
          <p className="game-detail-header__name">{gameData.name}</p>
          <div className="game-detail-header__tags">
            {gameData.tags.map((tag, index) => (
              <span key={index} className="game-detail-tag">
                <Tag size={12} />
                {tag}
              </span>
            ))}
          </div>
          <div className="game-detail-header__meta">
            <span className="game-detail-meta">
              <Building2 size={14} />
              {gameData.developer}
            </span>
            <span className="game-detail-meta">
              <Calendar size={14} />
              {gameData.releaseDate} 출시
            </span>
            <span className="game-detail-meta game-detail-genre">
              {gameData.genre}
            </span>
          </div>
        </div>
      </div>

      {/* 실시간 통계 */}
      <div className="game-detail-stats">
        <div className="game-detail-stat glass-premium">
          <div className="game-detail-stat__icon">
            <Eye size={24} />
          </div>
          <div className="game-detail-stat__content">
            <span className="game-detail-stat__value">{formatFullNumber(gameData.currentViewers)}</span>
            <span className="game-detail-stat__label">현재 시청자</span>
          </div>
          <div className={`game-detail-stat__change ${gameData.growth >= 0 ? 'positive' : 'negative'}`}>
            {gameData.growth >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {gameData.growth >= 0 ? '+' : ''}{gameData.growth.toFixed(1)}%
          </div>
        </div>
        <div className="game-detail-stat glass-premium">
          <div className="game-detail-stat__icon">
            <Users size={24} />
          </div>
          <div className="game-detail-stat__content">
            <span className="game-detail-stat__value">{formatFullNumber(gameData.liveStreamers)}</span>
            <span className="game-detail-stat__label">라이브 스트리머</span>
          </div>
        </div>
        <div className="game-detail-stat glass-premium">
          <div className="game-detail-stat__icon">
            <TrendingUp size={24} />
          </div>
          <div className="game-detail-stat__content">
            <span className="game-detail-stat__value">{formatFullNumber(gameData.avgViewers)}</span>
            <span className="game-detail-stat__label">평균 시청자</span>
          </div>
        </div>
        <div className="game-detail-stat glass-premium">
          <div className="game-detail-stat__icon">
            <Trophy size={24} />
          </div>
          <div className="game-detail-stat__content">
            <span className="game-detail-stat__value">{formatFullNumber(gameData.peakViewers)}</span>
            <span className="game-detail-stat__label">최고 시청자</span>
          </div>
        </div>
      </div>

      {/* 게임 소개 */}
      <div className="game-detail-description glass-premium">
        <h2>
          <Tag size={18} />
          게임 소개
        </h2>
        <p>{gameData.description}</p>
        <div className="game-detail-platforms">
          <span className="game-detail-platforms__label">방송 플랫폼:</span>
          <div className="game-detail-platforms__list">
            {gameData.platforms.map(platform => (
              <span
                key={platform}
                className="game-detail-platform"
                style={{ '--platform-color': PLATFORM_COLORS[platform] || '#666' }}
              >
                {platform.toUpperCase()}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 탑 스트리머 */}
      <div className="game-detail-streamers glass-premium">
        <h2>
          <Crown size={18} />
          이 게임 TOP 스트리머
        </h2>
        <div className="game-streamers-table">
          <div className="game-streamers-table__header">
            <div className="game-streamers-table__col rank">순위</div>
            <div className="game-streamers-table__col name">스트리머</div>
            <div className="game-streamers-table__col viewers">현재 시청자</div>
            <div className="game-streamers-table__col avg">평균 시청자</div>
            <div className="game-streamers-table__col followers">팔로워</div>
            <div className="game-streamers-table__col influence">영향력</div>
          </div>
          <div className="game-streamers-table__body">
            {topStreamers.map(streamer => (
              <div key={streamer.id} className="game-streamers-table__row">
                <div className="game-streamers-table__col rank">
                  <span className={`rank-badge rank-${streamer.rank}`}>
                    {streamer.rank}
                  </span>
                </div>
                <div className="game-streamers-table__col name">
                  <span
                    className="platform-dot"
                    style={{ background: PLATFORM_COLORS[streamer.platform] || '#666' }}
                  />
                  {streamer.name}
                </div>
                <div className="game-streamers-table__col viewers">
                  {formatNumber(streamer.viewers)}
                </div>
                <div className="game-streamers-table__col avg">
                  {formatNumber(streamer.avgViewers)}
                </div>
                <div className="game-streamers-table__col followers">
                  {formatNumber(streamer.followers)}
                </div>
                <div className="game-streamers-table__col influence">
                  <div className="influence-bar">
                    <div
                      className="influence-bar__fill"
                      style={{ width: `${streamer.influence}%` }}
                    />
                    <span className="influence-bar__value">{streamer.influence}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameDetail;
