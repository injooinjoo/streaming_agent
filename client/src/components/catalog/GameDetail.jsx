import { useState, useEffect } from 'react';
import {
  ArrowLeft, Eye, Users, TrendingUp, TrendingDown, Trophy, Calendar,
  Building2, RefreshCw, Tag, Crown, AlertCircle
} from 'lucide-react';
import { formatNumber, formatFullNumber } from '../../utils/formatters';
import { API_URL } from '../../config/api';
import LoadingSpinner from '../shared/LoadingSpinner';
import './GameCatalog.css';

const PLATFORM_COLORS = {
  soop: '#1e3a5f',
  chzzk: '#00ffa3',
  twitch: '#9146ff',
  youtube: '#ff0000'
};

const GameDetail = ({ gameId, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gameData, setGameData] = useState(null);

  // API에서 게임 데이터 가져오기
  const fetchGameDetail = async () => {
    console.log('[GameDetail] fetchGameDetail - gameId prop:', gameId);
    setLoading(true);
    setError(null);

    try {
      console.log('[GameDetail] Fetching:', `${API_URL}/api/categories/${gameId}`);
      const response = await fetch(`${API_URL}/api/categories/${gameId}`);

      if (!response.ok) {
        throw new Error('불러오기 실패');
      }

      const result = await response.json();

      if (result.success && result.data) {
        console.log('[GameDetail] API response - game id:', result.data.id, 'name:', result.data.nameKr || result.data.name);
        setGameData(result.data);
      } else {
        throw new Error(result.error || '게임을 찾을 수 없습니다.');
      }
    } catch (err) {
      console.error('GameDetail fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (gameId) {
      fetchGameDetail();
    }
  }, [gameId]);

  // 로딩 상태
  if (loading) {
    return (
      <div className="game-detail">
        <LoadingSpinner />
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="game-detail">
        <button className="game-detail-back" onClick={onBack}>
          <ArrowLeft size={18} />
          목록으로 돌아가기
        </button>
        <div className="game-catalog-error">
          <AlertCircle size={32} />
          <span>{error}</span>
          <button onClick={fetchGameDetail} className="retry-button">
            <RefreshCw size={16} />
            다시 시도
          </button>
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

  // 플랫폼 이름 배열 추출
  const platformNames = gameData.platforms?.map(p => p.platform) || [];

  // 태그 생성 (장르 + 플랫폼)
  const tags = [
    gameData.genre,
    gameData.developer,
    ...(gameData.isVerified ? ['검증됨'] : [])
  ].filter(Boolean);

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
          {gameData.imageUrl ? (
            <img src={gameData.imageUrl} alt={gameData.nameKr || gameData.name} />
          ) : (
            <div className="game-detail-header__placeholder">
              <Trophy size={48} />
            </div>
          )}
        </div>
        <div className="game-detail-header__info">
          <h1>{gameData.nameKr || gameData.name}</h1>
          {gameData.nameKr && gameData.name && gameData.nameKr !== gameData.name && (
            <p className="game-detail-header__name">{gameData.name}</p>
          )}
          <div className="game-detail-header__tags">
            {tags.map((tag, index) => (
              <span key={index} className="game-detail-tag">
                <Tag size={12} />
                {tag}
              </span>
            ))}
          </div>
          <div className="game-detail-header__meta">
            {gameData.developer && (
              <span className="game-detail-meta">
                <Building2 size={14} />
                {gameData.developer}
              </span>
            )}
            {gameData.releaseDate && (
              <span className="game-detail-meta">
                <Calendar size={14} />
                {gameData.releaseDate} 출시
              </span>
            )}
            {gameData.genre && (
              <span className="game-detail-meta game-detail-genre">
                {gameData.genre}
              </span>
            )}
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
            <span className="game-detail-stat__value">{formatFullNumber(gameData.totalViewers || 0)}</span>
            <span className="game-detail-stat__label">현재 시청자</span>
          </div>
        </div>
        <div className="game-detail-stat glass-premium">
          <div className="game-detail-stat__icon">
            <Users size={24} />
          </div>
          <div className="game-detail-stat__content">
            <span className="game-detail-stat__value">{formatFullNumber(gameData.totalStreamers || 0)}</span>
            <span className="game-detail-stat__label">라이브 스트리머</span>
          </div>
        </div>
      </div>

      {/* 게임 소개 */}
      {gameData.description && (
        <div className="game-detail-description glass-premium">
          <h2>
            <Tag size={18} />
            게임 소개
          </h2>
          <p>{gameData.description}</p>
        </div>
      )}

      {/* 플랫폼별 정보 */}
      {gameData.platforms && gameData.platforms.length > 0 && (
        <div className="game-detail-streamers glass-premium">
          <h2>
            <Crown size={18} />
            플랫폼별 현황
          </h2>
          <div className="game-streamers-table">
            <div className="game-streamers-table__header">
              <div className="game-streamers-table__col name">플랫폼</div>
              <div className="game-streamers-table__col">카테고리명</div>
              <div className="game-streamers-table__col viewers">시청자</div>
              <div className="game-streamers-table__col avg">스트리머</div>
            </div>
            <div className="game-streamers-table__body">
              {gameData.platforms.map((platform, index) => (
                <div key={index} className="game-streamers-table__row">
                  <div className="game-streamers-table__col name">
                    <span
                      className="platform-dot"
                      style={{ background: PLATFORM_COLORS[platform.platform] || '#666' }}
                    />
                    {platform.platform.toUpperCase()}
                  </div>
                  <div className="game-streamers-table__col">
                    {platform.categoryName}
                  </div>
                  <div className="game-streamers-table__col viewers">
                    {formatNumber(platform.viewerCount || 0)}
                  </div>
                  <div className="game-streamers-table__col avg">
                    {formatNumber(platform.streamerCount || 0)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameDetail;
