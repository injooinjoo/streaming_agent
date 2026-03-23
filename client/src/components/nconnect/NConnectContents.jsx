import {
  Eye,
  Gamepad2,
  RefreshCw,
  Search,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { EmptyState, MetricCard, PageHero, SectionCard, StatusBadge } from '../shared/studio';
import { fetchNConnectContents } from './api';
import { formatCompactKo, formatFullNumber } from '../../utils/formatters';

const PLATFORM_OPTIONS = [
  { value: 'all', label: '전체 플랫폼' },
  { value: 'soop', label: 'SOOP' },
  { value: 'chzzk', label: '치지직' },
];

const SORT_OPTIONS = [
  { value: 'viewers', label: '시청자순' },
  { value: 'streamers', label: '방송 수순' },
  { value: 'name', label: '이름순' },
];

const formatUpdatedAt = (value) => {
  if (!value) return '갱신 대기 중';

  return new Intl.DateTimeFormat('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
};

const getPlatformLabel = (platform) => {
  if (platform === 'soop') return 'SOOP';
  if (platform === 'chzzk') return '치지직';
  return '전체';
};

const requestContents = (platform, sort) =>
  fetchNConnectContents({ platform, sort, limit: 24 });

const NConnectContents = ({ onNavigate }) => {
  const [platform, setPlatform] = useState('all');
  const [sort, setSort] = useState('viewers');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState({
    summary: {
      liveGames: 0,
      totalViewers: 0,
      totalStreamers: 0,
      topGameName: null,
    },
    items: [],
    meta: null,
  });

  const loadContents = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await requestContents(platform, sort);
      setData(result);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const syncContents = async () => {
      setLoading(true);
      setError('');

      try {
        const result = await requestContents(platform, sort);
        if (!cancelled) {
          setData(result);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    syncContents();
    return () => {
      cancelled = true;
    };
  }, [platform, sort]);

  const filteredItems = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    if (!keyword) {
      return data.items;
    }

    return data.items.filter((item) => {
      const name = `${item.nameKr || ''} ${item.name || ''}`.toLowerCase();
      const genre = String(item.genre || '').toLowerCase();
      const publisher = String(item.publisher || '').toLowerCase();

      return name.includes(keyword) || genre.includes(keyword) || publisher.includes(keyword);
    });
  }, [data.items, searchTerm]);

  const highlightedItems = useMemo(() => filteredItems.slice(0, 3), [filteredItems]);

  return (
    <div className="nconnect-page animate-fade">
      <PageHero
        accent="amber"
        eyebrow={
          <StatusBadge className="studio-accent--amber">
            진행 중 콘텐츠
          </StatusBadge>
        }
        title="지금 방송 중인 넥슨 게임 콘텐츠를 한 곳에서 모아봅니다."
        description="메이플스토리, FC 온라인, 던전앤파이터처럼 현재 살아 있는 넥슨 게임 카테고리를 게임별로 묶어 보여줍니다. 플랫폼 필터와 정렬 기준을 바꿔 지금 어디에 시청자와 방송이 몰리는지 빠르게 확인할 수 있습니다."
        actions={
          <>
            <button type="button" className="btn btn-primary" onClick={loadContents}>
              <RefreshCw size={16} />
              새로고침
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => onNavigate?.('nconnect-ranking')}
            >
              <Trophy size={16} />
              랭킹 보기
            </button>
          </>
        }
        aside={
          <div className="nconnect-hero-stats">
            <div className="nconnect-summary-card">
              <span className="nconnect-summary-card__label">현재 필터</span>
              <strong className="nconnect-summary-card__value">{getPlatformLabel(platform)}</strong>
              <p>{SORT_OPTIONS.find((option) => option.value === sort)?.label} 기준으로 콘텐츠를 정렬합니다.</p>
            </div>
            <div className="nconnect-summary-card">
              <span className="nconnect-summary-card__label">마지막 갱신</span>
              <strong className="nconnect-summary-card__value">
                {formatUpdatedAt(data.meta?.updatedAt)}
              </strong>
              <p>활성 카테고리 기준으로 현재 집계된 넥슨 게임 콘텐츠만 노출합니다.</p>
            </div>
          </div>
        }
      />

      <section className="studio-metric-grid" aria-label="진행 중 콘텐츠 요약">
        <MetricCard
          accent="amber"
          tone="activity"
          label="진행 중 게임"
          value={`${formatFullNumber(data.summary.liveGames)}개`}
          meta="현재 활성 넥슨 게임 카테고리 수"
          sensitiveValue
          icon={<Gamepad2 size={18} />}
        />
        <MetricCard
          accent="amber"
          tone="audience"
          label="실시간 시청자"
          value={`${formatCompactKo(data.summary.totalViewers)}명`}
          meta="선택한 필터 기준 전체 시청자"
          sensitiveValue
          icon={<Eye size={18} />}
        />
        <MetricCard
          accent="amber"
          tone="growth"
          label="실시간 방송 수"
          value={`${formatFullNumber(data.summary.totalStreamers)}개`}
          meta="활성 스트리머/방송 수 합계"
          sensitiveValue
          icon={<Users size={18} />}
        />
        <MetricCard
          accent="amber"
          tone="revenue"
          label="대표 콘텐츠"
          value={data.summary.topGameName || '-'}
          meta="현재 시청자 기준 최상위 콘텐츠"
          icon={<Sparkles size={18} />}
        />
      </section>

      <SectionCard
        accent="amber"
        title="콘텐츠 필터"
        description="플랫폼과 정렬 기준을 바꾸고, 검색으로 보고 싶은 넥슨 게임만 빠르게 좁혀볼 수 있습니다."
      >
        <div className="nconnect-filter-bar nconnect-contents-filter-bar">
          <div className="nconnect-filter-field">
            <label htmlFor="nconnect-contents-platform">플랫폼</label>
            <select
              id="nconnect-contents-platform"
              value={platform}
              onChange={(event) => setPlatform(event.target.value)}
            >
              {PLATFORM_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="nconnect-filter-field">
            <label htmlFor="nconnect-contents-sort">정렬</label>
            <select
              id="nconnect-contents-sort"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <label className="nconnect-contents-search" htmlFor="nconnect-contents-search">
            <span className="nconnect-contents-search__label">검색</span>
            <div className="nconnect-contents-search__field">
              <Search size={16} />
              <input
                id="nconnect-contents-search"
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="게임명, 장르, 퍼블리셔 검색"
              />
            </div>
          </label>
        </div>
      </SectionCard>

      {loading ? (
        <div className="nconnect-contents-loading">
          <RefreshCw size={22} className="spin" />
          <span>진행 중인 넥슨 콘텐츠를 불러오는 중입니다...</span>
        </div>
      ) : error ? (
        <EmptyState
          className="studio-accent--amber"
          icon={<RefreshCw size={24} />}
          title="진행 중 콘텐츠를 불러오지 못했습니다."
          description={error}
          action={
            <button type="button" className="btn btn-outline" onClick={loadContents}>
              다시 시도
            </button>
          }
        />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          className="studio-accent--amber"
          icon={<Search size={24} />}
          title="조건에 맞는 콘텐츠가 없습니다."
          description={
            searchTerm
              ? '검색어를 바꾸거나 플랫폼 필터를 전체로 넓혀 다시 확인해 보세요.'
              : '현재 조건에서 진행 중인 넥슨 콘텐츠가 아직 집계되지 않았습니다.'
          }
        />
      ) : (
        <>
          <SectionCard
            accent="amber"
            title="상위 콘텐츠 하이라이트"
            description="현재 필터 기준으로 가장 눈에 띄는 넥슨 게임 콘텐츠를 먼저 보여드립니다."
          >
            <div className="nconnect-contents-highlight-grid">
              {highlightedItems.map((item, index) => (
                <article key={item.gameId} className="nconnect-contents-highlight-card">
                  <div className="nconnect-contents-highlight-card__media">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.nameKr || item.name} />
                    ) : (
                      <div className="nconnect-contents-highlight-card__placeholder">
                        <Gamepad2 size={28} />
                      </div>
                    )}
                    <span className="nconnect-podium-card__rank">TOP {index + 1}</span>
                  </div>

                  <div className="nconnect-contents-highlight-card__body">
                    <div className="nconnect-inline-actions">
                      {item.platforms.map((platformItem) => (
                        <span
                          key={`${item.gameId}-${platformItem.platform}`}
                          className={`nconnect-platform-chip ${
                            platformItem.platform === 'chzzk' ? 'nconnect-platform-chip--chzzk' : ''
                          }`}
                        >
                          {getPlatformLabel(platformItem.platform)}
                        </span>
                      ))}
                    </div>
                    <h3>{item.nameKr || item.name}</h3>
                    {item.nameKr && item.name && item.nameKr !== item.name ? (
                      <p className="nconnect-contents-card__subtitle">{item.name}</p>
                    ) : null}
                    <p className="nconnect-contents-card__description">
                      {item.publisher || '퍼블리셔 정보 없음'} · {item.genre || '장르 정보 없음'}
                    </p>

                    <div className="nconnect-contents-stats">
                      <div className="nconnect-contents-stats__item">
                        <Eye size={16} />
                        <strong>{formatCompactKo(item.totalViewers)}명</strong>
                        <span>실시간 시청자</span>
                      </div>
                      <div className="nconnect-contents-stats__item">
                        <Users size={16} />
                        <strong>{formatFullNumber(item.totalStreamers)}개</strong>
                        <span>현재 방송 수</span>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            accent="amber"
            title={`전체 콘텐츠 ${formatFullNumber(filteredItems.length)}개`}
            description="게임별로 묶인 현재 집계값을 카드로 확인하고, 어느 플랫폼에서 힘이 붙는지 함께 볼 수 있습니다."
          >
            <div className="nconnect-contents-grid">
              {filteredItems.map((item) => (
                <article key={item.gameId} className="nconnect-contents-card">
                  <div className="nconnect-contents-card__image">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.nameKr || item.name} />
                    ) : (
                      <div className="nconnect-contents-card__placeholder">
                        <Gamepad2 size={24} />
                      </div>
                    )}
                  </div>

                  <div className="nconnect-contents-card__body">
                    <div className="nconnect-inline-actions">
                      {item.platforms.map((platformItem) => (
                        <span
                          key={`${item.gameId}-${platformItem.platform}`}
                          className={`nconnect-platform-chip ${
                            platformItem.platform === 'chzzk' ? 'nconnect-platform-chip--chzzk' : ''
                          }`}
                        >
                          {getPlatformLabel(platformItem.platform)}
                        </span>
                      ))}
                    </div>

                    <h3>{item.nameKr || item.name}</h3>
                    {item.nameKr && item.name && item.nameKr !== item.name ? (
                      <p className="nconnect-contents-card__subtitle">{item.name}</p>
                    ) : null}

                    <p className="nconnect-contents-card__description">
                      {item.publisher || '퍼블리셔 정보 없음'} · {item.genre || '장르 정보 없음'}
                    </p>

                    <div className="nconnect-contents-card__meta">
                      <span>
                        <Eye size={14} />
                        {formatCompactKo(item.totalViewers)}명
                      </span>
                      <span>
                        <Users size={14} />
                        {formatFullNumber(item.totalStreamers)}개
                      </span>
                    </div>

                    <div className="nconnect-contents-platform-list">
                      {item.platforms.map((platformItem) => (
                        <div
                          key={`${item.gameId}-${platformItem.platform}-detail`}
                          className="nconnect-contents-platform-list__row"
                        >
                          <strong>{getPlatformLabel(platformItem.platform)}</strong>
                          <span>{platformItem.categoryName}</span>
                          <span>{formatCompactKo(platformItem.viewerCount)}명</span>
                          <span>{formatFullNumber(platformItem.streamerCount)}개</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
};

export default NConnectContents;
