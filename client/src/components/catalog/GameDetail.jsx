import { useState, useEffect } from 'react';
import {
  ArrowLeft, Eye, Users, TrendingUp, TrendingDown, Trophy, Calendar,
  Building2, RefreshCw, Tag, Crown, AlertCircle, BarChart3, Monitor
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
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

const PERIOD_LABELS = {
  '24h': '최근 24시간',
  '7d': '최근 7일',
  '30d': '최근 30일'
};

const ChangeIndicator = ({ diff, percent }) => {
  if (diff === 0 && percent === 0) return null;
  const isUp = diff > 0;
  return (
    <span className={`change-badge ${isUp ? 'up' : 'down'}`}>
      {isUp ? '↑' : '↓'} {Math.abs(diff).toLocaleString()} ({isUp ? '+' : ''}{percent.toFixed(1)}%)
    </span>
  );
};

const GameDetail = ({ gameId, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gameData, setGameData] = useState(null);
  const [summaryStats, setSummaryStats] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('24h');

  const fetchGameDetail = async () => {
    setLoading(true);
    setError(null);

    try {
      const [detailRes, summaryRes, trendRes] = await Promise.all([
        fetch(`${API_URL}/api/categories/${gameId}`),
        fetch(`${API_URL}/api/categories/${gameId}/summary?period=${selectedPeriod}`),
        fetch(`${API_URL}/api/categories/${gameId}/stats?period=7d`)
      ]);

      if (!detailRes.ok) throw new Error('불러오기 실패');

      const detailResult = await detailRes.json();
      if (detailResult.success && detailResult.data) {
        setGameData(detailResult.data);
      } else {
        throw new Error(detailResult.error || '게임을 찾을 수 없습니다.');
      }

      if (summaryRes.ok) {
        const summaryResult = await summaryRes.json();
        if (summaryResult.success) setSummaryStats(summaryResult.data);
      }

      if (trendRes.ok) {
        const trendResult = await trendRes.json();
        if (trendResult.success) {
          const formatted = (trendResult.data || []).map(row => ({
            time: new Date(row.recorded_at).toLocaleString('ko-KR', {
              month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
            }),
            viewers: Number(row.total_viewers || 0),
            streamers: Number(row.total_streamers || 0)
          }));
          setTrendData(formatted);
        }
      }
    } catch (err) {
      console.error('GameDetail fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async (period) => {
    try {
      const res = await fetch(`${API_URL}/api/categories/${gameId}/summary?period=${period}`);
      if (res.ok) {
        const result = await res.json();
        if (result.success) setSummaryStats(result.data);
      }
    } catch (err) {
      console.error('Summary fetch error:', err);
    }
  };

  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
    fetchSummary(period);
  };

  useEffect(() => {
    if (gameId) {
      fetchGameDetail();
    }
  }, [gameId]);

  if (loading) {
    return (
      <div className="game-detail">
        <LoadingSpinner />
      </div>
    );
  }

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

  const tags = [
    gameData.genre,
    gameData.developer,
    ...(gameData.isVerified ? ['검증됨'] : [])
  ].filter(Boolean);

  // Live comparison
  const liveViewers = gameData.totalViewers || 0;
  const liveStreamers = gameData.totalStreamers || 0;
  const yesterdayViewers = summaryStats?.liveComparison?.viewers?.yesterday || 0;
  const yesterdayStreamers = summaryStats?.liveComparison?.streamers?.yesterday || 0;
  const viewerDiff = liveViewers - yesterdayViewers;
  const viewerPercent = yesterdayViewers ? (viewerDiff / yesterdayViewers) * 100 : 0;
  const streamerDiff = liveStreamers - yesterdayStreamers;
  const streamerPercent = yesterdayStreamers ? (streamerDiff / yesterdayStreamers) * 100 : 0;

  const chartTooltipStyle = {
    backgroundColor: 'var(--bg-card, #1a1a2e)',
    border: '1px solid var(--border-subtle, #333)',
    borderRadius: '8px',
    fontSize: '12px'
  };

  const platformList = (gameData.platforms || []).map(p => p.platform.toUpperCase()).join(', ');

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

      {/* LIVE 통계 카드 */}
      <div className="game-detail-stats">
        <div className="game-detail-stat glass-premium">
          <div className="game-detail-stat__icon live-icon">
            <Eye size={24} />
          </div>
          <div className="game-detail-stat__content">
            <span className="game-detail-stat__label">LIVE 시청자 수</span>
            <span className="game-detail-stat__sublabel">어제 대비 | {platformList}</span>
            <span className="game-detail-stat__value sensitive-blur">
              {formatFullNumber(liveViewers)}<span className="game-detail-stat__unit">명</span>
            </span>
            <ChangeIndicator diff={Math.round(viewerDiff)} percent={Math.round(viewerPercent * 10) / 10} />
          </div>
        </div>
        <div className="game-detail-stat glass-premium">
          <div className="game-detail-stat__icon live-icon">
            <Users size={24} />
          </div>
          <div className="game-detail-stat__content">
            <span className="game-detail-stat__label">LIVE 채널 수</span>
            <span className="game-detail-stat__sublabel">어제 대비 | {platformList}</span>
            <span className="game-detail-stat__value sensitive-blur">
              {formatFullNumber(liveStreamers)}<span className="game-detail-stat__unit">명</span>
            </span>
            <ChangeIndicator diff={Math.round(streamerDiff)} percent={Math.round(streamerPercent * 10) / 10} />
          </div>
        </div>
      </div>

      {/* 카테고리 분석 섹션 */}
      <div className="game-detail-analytics">
        {/* 좌: 요약 데이터 */}
        <div className="game-summary-panel glass-premium">
          <div className="game-summary-header">
            <div className="game-summary-title">
              <BarChart3 size={18} />
              카테고리 요약 데이터
            </div>
            <p className="game-summary-desc">해당 기간의 카테고리 요약 데이터 ( 동시간 기준 )</p>
            <div className="period-tabs">
              {Object.entries(PERIOD_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  className={selectedPeriod === key ? 'active' : ''}
                  onClick={() => handlePeriodChange(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {summaryStats ? (
            <div className="game-summary-stats">
              <div className="summary-stat-card">
                <div className="summary-stat-label">동시 최고 시청자</div>
                <div className="summary-stat-value sensitive-blur">
                  {summaryStats.current.peakViewers.toLocaleString()}<span className="summary-stat-unit">명</span>
                </div>
                <ChangeIndicator {...summaryStats.changes.peakViewers} />
              </div>
              <div className="summary-stat-card">
                <div className="summary-stat-label">평균 시청자</div>
                <div className="summary-stat-value sensitive-blur">
                  {summaryStats.current.avgViewers.toLocaleString()}<span className="summary-stat-unit">명</span>
                </div>
                <ChangeIndicator {...summaryStats.changes.avgViewers} />
              </div>
              <div className="summary-stat-card">
                <div className="summary-stat-label">뷰어십 ( 평균 시청자 * 방송시간 )</div>
                <div className="summary-stat-value sensitive-blur">
                  {summaryStats.current.viewership.toLocaleString()}<span className="summary-stat-unit">명</span>
                </div>
                <ChangeIndicator {...summaryStats.changes.viewership} />
              </div>
              <div className="summary-stat-card">
                <div className="summary-stat-label">동시 최고채널</div>
                <div className="summary-stat-value sensitive-blur">
                  {summaryStats.current.peakStreamers.toLocaleString()}<span className="summary-stat-unit">채널</span>
                </div>
                <ChangeIndicator {...summaryStats.changes.peakStreamers} />
              </div>
              <div className="summary-stat-card">
                <div className="summary-stat-label">평균 채널</div>
                <div className="summary-stat-value sensitive-blur">
                  {summaryStats.current.avgStreamers.toLocaleString()}<span className="summary-stat-unit">채널</span>
                </div>
                <ChangeIndicator {...summaryStats.changes.avgStreamers} />
              </div>
            </div>
          ) : (
            <div className="game-summary-empty">요약 데이터를 불러오는 중...</div>
          )}
        </div>

        {/* 우: 트렌드 차트 */}
        <div className="game-trend-panel">
          <div className="game-trend-chart glass-premium">
            <div className="game-trend-title">
              <Monitor size={16} />
              실시간 시청자 데이터
            </div>
            <p className="game-trend-desc">스트리머의 전체 통계 데이터</p>
            {trendData.length > 0 ? (
              <div className="game-trend-chart-area">
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="gdViewerGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} width={50} />
                    <Tooltip contentStyle={chartTooltipStyle} formatter={(val) => [`${val.toLocaleString()}명`, '시청자']} />
                    <Area type="monotone" dataKey="viewers" stroke="#10b981" fill="url(#gdViewerGrad)" strokeWidth={1.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="game-trend-empty">차트 데이터가 없습니다</div>
            )}
          </div>
          <div className="game-trend-chart glass-premium">
            <div className="game-trend-title">
              <Users size={16} />
              실시간 채널 데이터
            </div>
            <p className="game-trend-desc">스트리머의 전체 통계 데이터</p>
            {trendData.length > 0 ? (
              <div className="game-trend-chart-area">
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="gdStreamerGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} width={50} />
                    <Tooltip contentStyle={chartTooltipStyle} formatter={(val) => [`${val.toLocaleString()}채널`, '채널']} />
                    <Area type="monotone" dataKey="streamers" stroke="#3b82f6" fill="url(#gdStreamerGrad)" strokeWidth={1.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="game-trend-empty">차트 데이터가 없습니다</div>
            )}
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
