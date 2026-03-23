import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  ChevronDown,
  Gamepad2,
  Menu,
  Search,
  UserRound,
  X,
} from 'lucide-react';
import GameDetail from '../catalog/GameDetail';
import StreamerDetail from '../streamer/StreamerDetail';
import ServiceBar, { SERVICE_BAR_RESELECT_EVENT } from '../shared/ServiceBar';
import { FilterBar } from '../shared/studio';
import '../Dashboard.css';
import '../DashboardStudio.css';
import './ViewershipShell.css';
import ViewershipPageRenderer from './ViewershipPageRenderer';
import {
  DEFAULT_VIEWERSHIP_PAGE,
  VIEWERSHIP_FLAT_MENU_ITEMS,
  VIEWERSHIP_MENU_GROUPS,
  getViewershipPageById,
  getViewershipSearchIndex,
} from './viewershipSections';
import {
  findViewershipCategoryById,
  findViewershipStreamerById,
  normalizeViewershipPlatforms,
  VIEWERSHIP_PLATFORM_OPTIONS,
} from './viewershipMockData';

const PLATFORM_FILTER_STORAGE_KEY = 'viewership-platform-filters';
const DEFAULT_PLATFORM_SELECTION = VIEWERSHIP_PLATFORM_OPTIONS.map((option) => option.key);

const loadPlatformSelection = () => {
  if (typeof window === 'undefined') return DEFAULT_PLATFORM_SELECTION;

  try {
    const stored = window.localStorage.getItem(PLATFORM_FILTER_STORAGE_KEY);
    if (!stored) return DEFAULT_PLATFORM_SELECTION;

    return normalizeViewershipPlatforms(JSON.parse(stored));
  } catch (error) {
    console.error('Failed to restore viewership platform selection:', error);
    return DEFAULT_PLATFORM_SELECTION;
  }
};

const matchSearch = (query, values) => {
  const tokens = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  if (!tokens.length) return true;

  const haystack = values
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return tokens.every((token) => haystack.includes(token));
};

const ViewershipShell = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activePageId, setActivePageId] = useState(DEFAULT_VIEWERSHIP_PAGE);
  const [currentView, setCurrentView] = useState('page');
  const [selectedGameId, setSelectedGameId] = useState(null);
  const [selectedPersonId, setSelectedPersonId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [selectedPlatforms, setSelectedPlatforms] = useState(loadPlatformSelection);

  const activePage = useMemo(
    () => getViewershipPageById(activePageId, selectedPlatforms),
    [activePageId, selectedPlatforms]
  );
  const activeMenuItem = VIEWERSHIP_FLAT_MENU_ITEMS.find((item) => item.id === activePageId);

  const resetToHome = () => {
    setActivePageId(DEFAULT_VIEWERSHIP_PAGE);
    setCurrentView('page');
    setSelectedGameId(null);
    setSelectedPersonId(null);
    setSearchQuery('');
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    const handleServiceReselect = (event) => {
      if (event.detail?.serviceId !== 'viewership') return;
      resetToHome();
    };

    window.addEventListener(SERVICE_BAR_RESELECT_EVENT, handleServiceReselect);

    return () => {
      window.removeEventListener(SERVICE_BAR_RESELECT_EVENT, handleServiceReselect);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      PLATFORM_FILTER_STORAGE_KEY,
      JSON.stringify(selectedPlatforms)
    );
  }, [selectedPlatforms]);

  useEffect(() => {
    if (currentView === 'streamer' && selectedPersonId) {
      const streamer = findViewershipStreamerById(selectedPersonId);
      if (streamer && !selectedPlatforms.includes(streamer.platform)) {
        handleBackFromDetail();
      }
    }

    if (currentView === 'game' && selectedGameId) {
      const category = findViewershipCategoryById(selectedGameId, selectedPlatforms);
      if (!category) {
        handleBackFromDetail();
      }
    }
  }, [currentView, selectedGameId, selectedPersonId, selectedPlatforms]);

  const openPage = (pageId) => {
    setActivePageId(pageId);
    setCurrentView('page');
    setSelectedGameId(null);
    setSelectedPersonId(null);
    setMobileMenuOpen(false);
  };

  const handleStreamerSelect = (personId) => {
    setSelectedPersonId(personId);
    setSelectedGameId(null);
    setCurrentView('streamer');
    setMobileMenuOpen(false);
  };

  const handleGameSelect = (gameId) => {
    setSelectedGameId(gameId);
    setSelectedPersonId(null);
    setCurrentView('game');
    setMobileMenuOpen(false);
  };

  const handleBackFromDetail = () => {
    setCurrentView('page');
    setSelectedGameId(null);
    setSelectedPersonId(null);
  };

  const toggleGroup = (groupLabel) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupLabel]: !prev[groupLabel],
    }));
  };

  const togglePlatform = (platformKey) => {
    setSelectedPlatforms((prev) => {
      if (prev.includes(platformKey)) {
        if (prev.length === 1) return prev;
        return prev.filter((item) => item !== platformKey);
      }

      return [...prev, platformKey];
    });
  };

  const filteredMenuGroups = useMemo(() => {
    if (!searchQuery.trim()) return VIEWERSHIP_MENU_GROUPS;

    return VIEWERSHIP_MENU_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        matchSearch(searchQuery, [item.label, group.label, ...(item.keywords || [])])
      ),
    })).filter((group) => group.items.length > 0);
  }, [searchQuery]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];

    return getViewershipSearchIndex(selectedPlatforms).filter((item) =>
      matchSearch(searchQuery, [item.label, item.subtitle, ...(item.keywords || [])])
    ).slice(0, 7);
  }, [searchQuery, selectedPlatforms]);

  const handleSearchResultSelect = (result) => {
    setSearchQuery('');

    if (result.type === 'page') openPage(result.targetId);
    if (result.type === 'streamer') handleStreamerSelect(result.targetId);
    if (result.type === 'category') handleGameSelect(result.targetId);
  };

  const currentMeta = useMemo(() => {
    if (currentView === 'streamer') {
      return {
        title: '스트리머 상세',
        subtitle: `인기 · 시장 인사이트 · ${activeMenuItem?.label || '상세 보기'}`,
      };
    }

    if (currentView === 'game') {
      return {
        title: '카테고리 상세',
        subtitle: `인기 · 시장 인사이트 · ${activeMenuItem?.label || '상세 보기'}`,
      };
    }

    return {
      title: activeMenuItem?.label || '시장 개요',
      subtitle: `인기 · ${activeMenuItem?.groupLabel || '시장 인사이트'} · ${activePage?.hero?.title || '플랫폼 흐름 브리핑'}`,
    };
  }, [activeMenuItem, activePage, currentView]);

  const renderContent = () => {
    if (currentView === 'streamer' && selectedPersonId) {
      return <StreamerDetail personId={selectedPersonId} onBack={handleBackFromDetail} />;
    }

    if (currentView === 'game' && selectedGameId) {
      return <GameDetail gameId={selectedGameId} onBack={handleBackFromDetail} onStreamerSelect={handleStreamerSelect} />;
    }

    return (
      <ViewershipPageRenderer
        page={activePage}
        onGameSelect={handleGameSelect}
        onOpenPage={openPage}
        onStreamerSelect={handleStreamerSelect}
      />
    );
  };

  return (
    <div className="dashboard-page viewership-page">
      <ServiceBar />
      <div className="dashboard-layout viewership-layout">
        {mobileMenuOpen && <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} />}

        <aside className={`chatgpt-sidebar viewership-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          {mobileMenuOpen && (
            <button className="sidebar-close-btn" onClick={() => setMobileMenuOpen(false)}>
              <X size={24} />
            </button>
          )}

          <div className="sidebar-top viewership-sidebar-top">
            <div className="app-logo viewership-brand">
              <div className="logo-icon">MI</div>
              <div>
                <div className="logo-text">시장 인사이트</div>
                <div className="sidebar-note">플랫폼 전체 흐름과 시청 시장 구조를 한눈에 읽는 공개 페이지</div>
              </div>
            </div>
            <div className="viewership-brand-badges">
              <span className="viewership-brand-badge">인기</span>
              <span className="viewership-brand-badge is-live">공개</span>
            </div>
          </div>

          <div className="viewership-search-shell">
            <Search size={16} />
            <input
              type="search"
              placeholder="스트리머, 카테고리, 플랫폼 검색"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>

          {searchQuery.trim() && (
            <div className="viewership-search-results">
              {searchResults.length ? (
                searchResults.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    className="viewership-search-result"
                    onClick={() => handleSearchResultSelect(result)}
                  >
                    <div>
                      <strong>{result.label}</strong>
                      <span>{result.subtitle}</span>
                    </div>
                    {result.badge ? <span className="viewership-nav-badge">{result.badge}</span> : null}
                  </button>
                ))
              ) : (
                <div className="viewership-search-empty">검색 결과가 없습니다.</div>
              )}
            </div>
          )}

          <div className="viewership-membership-card">
            <div className="viewership-membership-card__label">페이지 안내</div>
            <strong>플랫폼 · 스트리머 · 카테고리 흐름 탐색</strong>
            <p>왼쪽 메뉴에서 보고 싶은 축을 고르면 시장 흐름을 비교해서 바로 확인할 수 있습니다.</p>
          </div>

          <nav className="sidebar-nav" aria-label="시장 인사이트 탐색">
            {filteredMenuGroups.map((group) => {
              const isCollapsed = collapsedGroups[group.label];
              const hasActiveItem = group.items.some((item) => item.id === activePageId);

              return (
                <div key={group.label} className="nav-group">
                  <button
                    type="button"
                    className={`group-label-btn ${hasActiveItem ? 'has-active' : ''}`}
                    onClick={() => toggleGroup(group.label)}
                  >
                    <span className="group-label">{group.label}</span>
                    <ChevronDown size={14} className={`group-chevron ${isCollapsed ? 'collapsed' : ''}`} />
                  </button>
                  <div className={`nav-group-items ${isCollapsed ? 'collapsed' : ''}`}>
                    {group.items.map((item) => {
                      const Icon = item.icon;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          className={`nav-item viewership-nav-item ${activePageId === item.id && currentView === 'page' ? 'active' : ''}`}
                          onClick={() => openPage(item.id)}
                          title={item.label}
                        >
                          <Icon size={18} />
                          <div className="viewership-nav-copy">
                            <div className="viewership-nav-title-row">
                              <span className="nav-label">{item.label}</span>
                              {item.badge ? <span className={`viewership-nav-badge ${item.badge === 'LIVE' ? 'is-live' : ''}`}>{item.badge}</span> : null}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
        </aside>

        <main className="chatgpt-main viewership-main">
          <header className="top-nav viewership-top-nav">
            <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(true)}>
              <Menu size={24} />
            </button>

            <div className="viewership-top-nav-title">
              {currentView !== 'page' && (
                <button
                  type="button"
                  className="viewership-inline-back-btn"
                  onClick={handleBackFromDetail}
                  aria-label="이전 화면으로 돌아가기"
                  title="이전 화면으로 돌아가기"
                >
                  <ArrowLeft size={16} />
                </button>
              )}
              {currentView === 'page' ? <Activity size={20} /> : currentView === 'streamer' ? <UserRound size={20} /> : <Gamepad2 size={20} />}
              <div className="top-nav__service">
                <div className="top-nav__title">{currentMeta.title}</div>
                <div className="top-nav__subtitle">{currentMeta.subtitle}</div>
              </div>
            </div>
          </header>

          <FilterBar
            className="viewership-platform-filter"
            leading={(
              <div className="viewership-platform-filter__heading">
                <span className="viewership-platform-filter__eyebrow">플랫폼 보기</span>
                <strong>보고 싶은 플랫폼만 켜두기</strong>
                <p>체크한 플랫폼만 카드, 검색, 랭킹에 반영됩니다.</p>
              </div>
            )}
            trailing={(
              <div className="viewership-platform-filter__trailing">
                <span className="viewership-platform-filter__count">
                  {selectedPlatforms.length} / {VIEWERSHIP_PLATFORM_OPTIONS.length} 선택
                </span>
                {selectedPlatforms.length < VIEWERSHIP_PLATFORM_OPTIONS.length ? (
                  <button
                    type="button"
                    className="viewership-platform-filter__reset"
                    onClick={() => setSelectedPlatforms(DEFAULT_PLATFORM_SELECTION)}
                  >
                    전체 선택
                  </button>
                ) : null}
              </div>
            )}
          >
            {VIEWERSHIP_PLATFORM_OPTIONS.map((option) => {
              const selected = selectedPlatforms.includes(option.key);
              const lastSelected = selected && selectedPlatforms.length === 1;

              return (
                <button
                  key={option.key}
                  type="button"
                  className={`viewership-platform-chip ${selected ? 'is-active' : ''}`}
                  onClick={() => togglePlatform(option.key)}
                  aria-pressed={selected}
                  disabled={lastSelected}
                >
                  <span
                    className="viewership-platform-chip__dot"
                    style={{ '--platform-color': option.color }}
                  />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </FilterBar>

          <div className="content-body viewership-content-body">{renderContent()}</div>
        </main>
      </div>
    </div>
  );
};

export default ViewershipShell;
