import { RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { formatFullNumber } from '../../utils/formatters';
import LoadingSpinner from '../shared/LoadingSpinner';
import { EmptyState, PageHero, SectionCard, StatusBadge } from '../shared/studio';
import { fetchNConnectRanking } from './api';

const SUPPORTED_PLATFORMS = new Set(['soop', 'chzzk']);

const PLATFORM_LABELS = {
  soop: 'SOOP',
  chzzk: '치지직',
};

const SEASON_OPTIONS = [
  { value: 'preseason-2026', label: '프리시즌 2026' },
  { value: 'season1-2026', label: '시즌 1 2026' },
];

const PERIOD_OPTIONS = [
  { value: 'current', label: '시즌 누적' },
  { value: 'monthly', label: '월간 성장' },
];

const PLATFORM_OPTIONS = [
  { value: 'soop', label: 'SOOP' },
  { value: 'chzzk', label: '치지직' },
];

const resolveDefaultPlatform = (platform) => {
  const normalizedPlatform = typeof platform === 'string' ? platform.toLowerCase() : '';
  return SUPPORTED_PLATFORMS.has(normalizedPlatform) ? normalizedPlatform : 'soop';
};

const NConnectRanking = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userChangedPlatformRef = useRef(false);

  const [season, setSeason] = useState('preseason-2026');
  const [period, setPeriod] = useState('current');
  const [platform, setPlatform] = useState(() => resolveDefaultPlatform(user?.platform));
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ items: [], meta: null });
  const [error, setError] = useState('');

  useEffect(() => {
    if (userChangedPlatformRef.current) {
      return;
    }

    const nextPlatform = resolveDefaultPlatform(user?.platform);
    setPlatform((currentPlatform) =>
      currentPlatform === nextPlatform ? currentPlatform : nextPlatform
    );
  }, [user?.platform]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const result = await fetchNConnectRanking({ season, period, platform, limit: 100 });
        if (!cancelled) {
          setData(result);
        }
      } catch (loadError) {
        if (!cancelled) {
          setData({ items: [], meta: null });
          setError(loadError.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [season, period, platform]);

  const topThree = useMemo(() => data.items.slice(0, 3), [data.items]);
  const tableItems = useMemo(() => data.items.slice(3), [data.items]);
  const selectedPlatformLabel =
    PLATFORM_LABELS[resolveDefaultPlatform(data.meta?.platform || platform)] || 'SOOP';

  const handlePlatformChange = (event) => {
    userChangedPlatformRef.current = true;
    setPlatform(event.target.value);
  };

  return (
    <div className="nconnect-page animate-fade">
      <PageHero
        accent="amber"
        eyebrow={<StatusBadge className="studio-accent--amber">랭킹 TOP100</StatusBadge>}
        title="N-CONNECT 랭킹은 플랫폼별로 따로 집계됩니다."
        description="SOOP과 치지직은 각각 독립된 랭킹으로 운영됩니다. 시즌과 집계 기준을 바꿔도 현재 선택한 플랫폼 안에서만 순위가 다시 계산됩니다."
        actions={
          <button type="button" className="btn btn-outline" onClick={() => navigate('/login')}>
            <RefreshCw size={16} />
            로그인 상태 보기
          </button>
        }
        aside={
          <div className="nconnect-hero-stats">
            <div className="nconnect-summary-card">
              <span className="nconnect-summary-card__label">집계 기준</span>
              <strong className="nconnect-summary-card__value">
                {period === 'current' ? '시즌 누적' : '월간 성장'}
              </strong>
              <p>월급과 인센티브 예상 구간을 같은 화면에서 함께 확인할 수 있습니다.</p>
            </div>
            <div className="nconnect-summary-card">
              <span className="nconnect-summary-card__label">현재 플랫폼</span>
              <strong className="nconnect-summary-card__value">{selectedPlatformLabel}</strong>
              <p>
                {data.meta?.updatedAt
                  ? `${data.meta.updatedAt.slice(0, 10)} 기준 집계`
                  : '랭킹 데이터를 불러오는 중입니다.'}
              </p>
            </div>
          </div>
        }
      />

      <SectionCard
        accent="amber"
        title="랭킹 필터"
        description="플랫폼, 시즌, 집계 기준을 바꿔도 항상 선택한 플랫폼의 랭킹만 보여줍니다."
      >
        <div className="nconnect-filter-bar">
          <div className="nconnect-filter-field">
            <label htmlFor="ranking-season">시즌</label>
            <select id="ranking-season" value={season} onChange={(event) => setSeason(event.target.value)}>
              {SEASON_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="nconnect-filter-field">
            <label htmlFor="ranking-period">집계 기준</label>
            <select id="ranking-period" value={period} onChange={(event) => setPeriod(event.target.value)}>
              {PERIOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="nconnect-filter-field">
            <label htmlFor="ranking-platform">플랫폼</label>
            <select id="ranking-platform" value={platform} onChange={handlePlatformChange}>
              {PLATFORM_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </SectionCard>

      {loading ? (
        <div className="nconnect-loading">
          <LoadingSpinner text="랭킹을 불러오는 중입니다..." />
        </div>
      ) : error ? (
        <EmptyState
          className="studio-accent--amber"
          icon={<RefreshCw size={24} />}
          title="랭킹을 불러오지 못했습니다."
          description={error}
        />
      ) : (
        <div className="nconnect-ranking-layout">
          <SectionCard
            accent="amber"
            title="TOP 3"
            description={`${selectedPlatformLabel}에서 가장 높은 기여도를 기록한 스트리머입니다.`}
          >
            <div className="nconnect-podium-grid">
              {topThree.map((item) => (
                <article
                  key={item.personId}
                  className={`nconnect-podium-card nconnect-podium-card--${item.rank}`}
                >
                  <span className="nconnect-podium-card__rank">{item.rank}위</span>
                  <h3 className="nconnect-podium-card__name">{item.displayName}</h3>
                  <div
                    className={`nconnect-platform-chip ${
                      item.platform === 'chzzk' ? 'nconnect-platform-chip--chzzk' : ''
                    }`}
                  >
                    {PLATFORM_LABELS[item.platform]}
                  </div>
                  <div className="nconnect-podium-card__score">
                    {formatFullNumber(item.totalPoints)}점
                  </div>
                  <p className="nconnect-podium-card__meta">
                    활동 {formatFullNumber(item.activityPoints)}점 · 시청 {formatFullNumber(item.viewershipPoints)}점 ·
                    게임 {formatFullNumber(item.ingamePoints)}점
                  </p>
                  <div className="nconnect-inline-actions">
                    <span className="nconnect-tier-chip">{item.tier}</span>
                    <span className="nconnect-table-note">{item.monthlySalaryBand}</span>
                  </div>
                </article>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            accent="amber"
            title="4위 ~ 100위"
            description={`${selectedPlatformLabel} 랭킹 전체 순위입니다. 스트리머 이름을 누르면 상세 페이지로 이동합니다.`}
          >
            <div className="nconnect-table-wrapper">
              <table className="nconnect-table">
                <thead>
                  <tr>
                    <th>순위</th>
                    <th>스트리머</th>
                    <th>티어</th>
                    <th>총점</th>
                    <th>기여도 분해</th>
                    <th>월급</th>
                    <th>인센티브</th>
                  </tr>
                </thead>
                <tbody>
                  {tableItems.map((item) => (
                    <tr key={item.personId}>
                      <td>
                        <strong>{item.rank}위</strong>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="nconnect-name-button"
                          onClick={() => navigate(`/streamer/${item.personId}`)}
                        >
                          {item.displayName}
                        </button>
                        <div
                          className={`nconnect-platform-chip ${
                            item.platform === 'chzzk' ? 'nconnect-platform-chip--chzzk' : ''
                          }`}
                        >
                          {PLATFORM_LABELS[item.platform]}
                        </div>
                      </td>
                      <td>
                        <span className="nconnect-tier-chip">{item.tier}</span>
                      </td>
                      <td>{formatFullNumber(item.totalPoints)}점</td>
                      <td>
                        활동 {formatFullNumber(item.activityPoints)}
                        <br />
                        시청 {formatFullNumber(item.viewershipPoints)}
                        <br />
                        게임 {formatFullNumber(item.ingamePoints)}
                      </td>
                      <td>{item.monthlySalaryBand}</td>
                      <td>{item.monthlyIncentiveBand}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
};

export default NConnectRanking;
