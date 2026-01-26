import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layout, MessageSquare, Bell, FileText, BarChart3,
  HelpCircle, ExternalLink, Settings,
  RefreshCw, Megaphone, Palette, Sparkles, Activity, TrendingUp, MousePointerClick,
  DollarSign, Store, LogOut, LogIn, Users, PieChart, ChevronRight, ChevronDown, Disc,
  Smile, Vote, Film, Bot, Menu, X, Sun, Moon, Gamepad2, Shield, Eye, EyeOff, Rocket, Trophy, Heart
} from 'lucide-react';
import { API_URL } from '../config/api';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useStreamingMode } from '../contexts/StreamingModeContext';
import ChatSettings from './settings/ChatSettings';
import AlertSettings from './settings/AlertSettings';
import SubtitleSettings from './settings/SubtitleSettings';
import GoalSettings from './settings/GoalSettings';
import TickerSettings from './settings/TickerSettings';
import DesignSettings from './settings/DesignSettings';
import AccountSettings from './settings/AccountSettings';
import AdSettings from './settings/AdSettings';
import RouletteSettings from './settings/RouletteSettings';
import EmojiSettings from './settings/EmojiSettings';
import VotingSettings from './settings/VotingSettings';
import CreditsSettings from './settings/CreditsSettings';
import BotSettings from './settings/BotSettings';
import GameSettings from './settings/GameSettings';
import GameCatalog from './catalog/GameCatalog';
import GameDetail from './catalog/GameDetail';
import MarketplaceTab from './marketplace/MarketplaceTab';
import RevenueAnalytics from './analytics/RevenueAnalytics';
import ViewerAnalytics from './analytics/ViewerAnalytics';
import ContentAnalytics from './analytics/ContentAnalytics';
import AdAnalytics from './analytics/AdAnalytics';
import ViewershipDashboard from './analytics/ViewershipDashboard';
import './Dashboard.css';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [events, setEvents] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [feedTab, setFeedTab] = useState('pending');
  const [selectedGameId, setSelectedGameId] = useState(null);

  // 캐시에서 초기값 로드
  const getCachedDashboardData = () => {
    try {
      const cached = localStorage.getItem('dashboardData');
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        // 5분 이내의 캐시만 사용
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          return data;
        }
      }
    } catch (e) {
      console.error('Failed to load cached dashboard data', e);
    }
    return null;
  };

  const defaultDashboardData = {
    todayDonation: 0,
    donationCount: 0,
    peakViewers: 0,
    newSubs: 0,
    insights: [],
    myCategories: [],
    topCategories: []
  };

  const [dashboardData, setDashboardData] = useState(() => getCachedDashboardData() || defaultDashboardData);
  const [dashboardLoading, setDashboardLoading] = useState(!getCachedDashboardData());

  const { user, isAuthenticated, logout, loading: authLoading } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const { isStreamingMode, toggleStreamingMode } = useStreamingMode();
  const navigate = useNavigate();

  // Developer mode - 바로 어드민 대시보드로 이동
  const handleDeveloperMode = () => {
    navigate('/admin-dashboard');
  };

  // 게임 카탈로그 핸들러
  const handleGameSelect = (gameId) => {
    console.log('[Dashboard] handleGameSelect - clicked gameId:', gameId);
    setSelectedGameId(gameId);
    setActiveTab('game-detail');
  };

  const handleBackFromGame = () => {
    setSelectedGameId(null);
    setActiveTab('game-catalog');
  };

  const menuGroups = [
    {
      label: '메인 메뉴',
      items: [
        { id: 'dashboard', label: '대시보드', icon: <Layout size={18} /> },
        { id: 'chat', label: '채팅 오버레이', icon: <MessageSquare size={18} /> },
        { id: 'alerts', label: '후원 알림', icon: <Bell size={18} /> },
        { id: 'viewership', label: '시장 현황', icon: <Activity size={18} /> },
        { id: 'game-catalog', label: '게임 카탈로그', icon: <Trophy size={18} /> }
      ]
    },
    {
      label: '커스텀 위젯',
      items: [
        { id: 'game', label: '게임 오버레이', icon: <Gamepad2 size={18} /> },
        { id: 'subtitles', label: '자막 설정', icon: <FileText size={18} /> },
        { id: 'goals', label: '목표치 위젯', icon: <BarChart3 size={18} /> },
        { id: 'ticker', label: '뉴스 티커', icon: <Megaphone size={18} /> },
        { id: 'roulette', label: '룰렛', icon: <Disc size={18} /> },
        { id: 'emoji', label: '이모지 리액션', icon: <Smile size={18} /> },
        { id: 'voting', label: '투표 시스템', icon: <Vote size={18} /> },
        { id: 'credits', label: '엔딩 크레딧', icon: <Film size={18} /> },
        { id: 'bot', label: '챗봇', icon: <Bot size={18} /> },
        { id: 'design', label: '디자인 커스터마이저', icon: <Palette size={18} /> },
        { id: 'marketplace', label: '디자인 마켓', icon: <Store size={18} /> }
      ]
    },
    {
      label: '분석',
      items: [
        { id: 'analytics-revenue', label: '수익 분석', icon: <DollarSign size={18} /> },
        { id: 'analytics-viewers', label: '시청자 분석', icon: <Users size={18} /> },
        { id: 'analytics-content', label: '콘텐츠 분석', icon: <PieChart size={18} /> }
      ]
    },
    {
      label: '광고 관리',
      items: [
        { id: 'ads', label: '광고 위젯', icon: <Megaphone size={18} /> },
        { id: 'analytics-ads', label: '광고 분석', icon: <TrendingUp size={18} /> }
      ]
    }
  ];

  const menuItems = menuGroups.flatMap((group) => group.items);

  // 인사이트 아이콘 및 스타일 매핑
  const getInsightStyle = (type) => {
    const styles = {
      donation: { icon: <DollarSign size={18} />, color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', title: '후원 현황' },
      viewers: { icon: <TrendingUp size={18} />, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', title: '시청자 현황' },
      platform: { icon: <Activity size={18} />, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)', title: '플랫폼 활동' },
      info: { icon: <Sparkles size={18} />, color: '#6b7280', bg: 'rgba(107, 114, 128, 0.1)', title: '안내' }
    };
    return styles[type] || styles.info;
  };

  const fetchEvents = async () => {
    try {
      // 로그인된 사용자의 channelId로 필터링
      const params = new URLSearchParams();
      if (user?.channelId) params.set('channelId', user.channelId);
      const queryString = params.toString();
      const url = `${API_URL}/api/events${queryString ? `?${queryString}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      setEvents(data);
    } catch (e) {
      console.error('Failed to fetch events', e);
    }
  };

  const fetchDashboardData = async () => {
    console.log('[Dashboard] fetchDashboardData called, user:', { channelId: user?.channelId, platform: user?.platform });
    try {
      // 캐시가 없을 때만 로딩 표시
      if (!getCachedDashboardData()) {
        setDashboardLoading(true);
      }
      // 로그인된 사용자의 channelId와 platform을 쿼리 파라미터로 전달
      const params = new URLSearchParams();
      if (user?.channelId) params.set('channelId', user.channelId);
      if (user?.platform) params.set('platform', user.platform);
      const queryString = params.toString();
      const url = `${API_URL}/api/stats/dashboard${queryString ? `?${queryString}` : ''}`;
      console.log('[Dashboard] Fetching URL:', url);
      const res = await fetch(url);
      console.log('[Dashboard] Response status:', res.status, res.ok);
      if (res.ok) {
        const data = await res.json();
        console.log('[Dashboard] API Response:', { myCategories: data.myCategories, topCategories: data.topCategories?.length });
        setDashboardData(data);
        // 캐시에 저장
        try {
          localStorage.setItem('dashboardData', JSON.stringify({
            data,
            timestamp: Date.now()
          }));
        } catch (e) {
          console.error('Failed to cache dashboard data', e);
        }
      }
    } catch (e) {
      console.error('[Dashboard] Failed to fetch dashboard data', e);
    } finally {
      setDashboardLoading(false);
    }
  };

  // 이벤트는 대시보드 탭에서만 fetch (대기중인 이벤트 표시용)
  useEffect(() => {
    if (authLoading || activeTab !== 'dashboard') return;

    fetchEvents();
    const eventsInterval = setInterval(fetchEvents, 3000);

    return () => {
      clearInterval(eventsInterval);
    };
  }, [authLoading, user?.channelId, activeTab]);

  // 대시보드 데이터도 대시보드 탭일 때만 fetch
  useEffect(() => {
    if (authLoading || activeTab !== 'dashboard') return;

    fetchDashboardData();
    const dashboardInterval = setInterval(fetchDashboardData, 30000); // 30초마다 갱신

    return () => {
      clearInterval(dashboardInterval);
    };
  }, [authLoading, user?.channelId, user?.platform, activeTab]);

  const renderContent = () => {
    if (activeTab === 'dashboard') {
      return (
        <div className="animate-fade">
          <header className="page-header">
            <div className="page-title">
              <h1>환영합니다!</h1>
              <p>오늘의 스트림 현황을 확인해보세요.</p>
            </div>
            <div className="header-buttons">
              <button className="btn btn-outline">
                <HelpCircle size={16} /> 피드백 보내기
              </button>
              <button className="btn btn-primary" onClick={() => window.open('/overlay/chat', '_blank')}>
                <ExternalLink size={16} /> 오버레이 열기
              </button>
            </div>
          </header>

          <div className="stats-grid">
            <div className="stat-card clickable" onClick={() => setActiveTab('analytics-revenue')}>
              <div className="stat-header">
                <span>총 후원 금액</span>
                <ChevronRight size={14} />
              </div>
              <div className="stat-content">
                <span className="value sensitive-blur">₩{dashboardData.todayDonation.toLocaleString()}</span>
                <span className="subtext">이번 달 누적</span>
              </div>
              <div className="stat-link">
                <span>수익 분석 보기</span>
                <ChevronRight size={14} />
              </div>
            </div>
            <div className="stat-card clickable" onClick={() => setActiveTab('analytics-viewers')}>
              <div className="stat-header">
                <span>최고 시청자 수</span>
                <ChevronRight size={14} />
              </div>
              <div className="stat-content">
                <span className="value sensitive-blur">{dashboardData.peakViewers.toLocaleString()}</span>
                <span className="subtext">이번 달 기준</span>
              </div>
              <div className="stat-link">
                <span>시청자 분석 보기</span>
                <ChevronRight size={14} />
              </div>
            </div>
            <div className="stat-card clickable" onClick={() => setActiveTab('analytics-revenue')}>
              <div className="stat-header">
                <span>신규 구독</span>
                <ChevronRight size={14} />
              </div>
              <div className="stat-content">
                <span className="value sensitive-blur">{dashboardData.newSubs}</span>
                <span className="subtext">이번 달 기준</span>
              </div>
              <div className="stat-link">
                <span>수익 분석 보기</span>
                <ChevronRight size={14} />
              </div>
            </div>
          </div>

          <div className="insights-section">
            <div className="section-header">
              <div className="section-title">
                <Sparkles size={18} className="text-primary" />
                <h2>실시간 인사이트</h2>
              </div>
              <span className="timestamp">{dashboardLoading ? '로딩 중...' : '방금 업데이트됨'}</span>
            </div>
            <div className="insights-grid">
              {dashboardData.insights.length > 0 ? dashboardData.insights.map((insight, index) => {
                const style = getInsightStyle(insight.type);
                return (
                  <div key={index} className="insight-card" style={{ borderColor: style.color }}>
                     <div className="insight-icon" style={{ backgroundColor: style.bg, color: style.color }}>
                       {style.icon}
                     </div>
                     <div className="insight-content">
                       <span className="insight-label" style={{ color: style.color }}>{style.title}</span>
                       <p className="insight-message">{insight.message}</p>
                       {insight.value && <span className="insight-value" style={{ color: style.color, fontWeight: 600 }}>{insight.value}</span>}
                     </div>
                  </div>
                );
              }) : (
                <div className="insight-card" style={{ borderColor: '#6b7280' }}>
                  <div className="insight-icon" style={{ backgroundColor: 'rgba(107, 114, 128, 0.1)', color: '#6b7280' }}>
                    <Sparkles size={18} />
                  </div>
                  <div className="insight-content">
                    <span className="insight-label" style={{ color: '#6b7280' }}>시작하기</span>
                    <p className="insight-message">플랫폼을 연결하여 데이터 수집을 시작하세요</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 내 방송 카테고리 섹션 */}
          {dashboardData.myCategories && dashboardData.myCategories.length > 0 && (
            <div className="categories-wrapper my-categories-wrapper">
              <div className="categories-section">
                <div className="section-header">
                  <div className="section-title">
                    <Activity size={18} className="text-primary" />
                    <h2>내 방송 카테고리</h2>
                  </div>
                  <button className="section-link" onClick={() => setActiveTab('analytics-content')}>
                    콘텐츠 분석 보기 <ChevronRight size={14} />
                  </button>
                </div>
                <div className="categories-grid my-categories-grid">
                  {dashboardData.myCategories.map((category, index) => {
                    // 방송 시간 포맷팅
                    const formatBroadcastTime = (minutes) => {
                      if (!minutes || minutes === 0) return '0분';
                      const hours = Math.floor(minutes / 60);
                      const mins = minutes % 60;
                      if (hours === 0) return `${mins}분`;
                      if (mins === 0) return `${hours}시간`;
                      return `${hours}시간 ${mins}분`;
                    };

                    // 마지막 방송 시간 포맷팅
                    const formatLastBroadcast = (dateStr) => {
                      if (!dateStr) return '-';
                      const date = new Date(dateStr);
                      const now = new Date();
                      const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
                      if (diffDays === 0) return '오늘';
                      if (diffDays === 1) return '어제';
                      if (diffDays < 7) return `${diffDays}일 전`;
                      if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
                      return `${Math.floor(diffDays / 30)}개월 전`;
                    };

                    return (
                      <div key={category.categoryId || index} className="category-card my-category-card">
                        <div className="category-rank my-rank">#{index + 1}</div>
                        <div className="category-image">
                          {category.imageUrl ? (
                            <img src={category.imageUrl} alt={category.name} />
                          ) : (
                            <Gamepad2 size={40} className="category-placeholder-icon" />
                          )}
                        </div>
                        <div className="category-info">
                          <span className="category-name">{category.name}</span>
                          {category.genre && (
                            <span className="category-genre">{category.genre}</span>
                          )}
                          <div className="category-stats my-category-stats">
                            <div className="category-stat">
                              <span className="stat-label">방송 횟수</span>
                              <span className="stat-value">{category.broadcastCount}회</span>
                            </div>
                            <div className="category-stat">
                              <span className="stat-label">총 방송시간</span>
                              <span className="stat-value">{formatBroadcastTime(category.totalMinutes)}</span>
                            </div>
                            <div className="category-stat">
                              <span className="stat-label">최고 시청자</span>
                              <span className="stat-value sensitive-blur">{category.peakViewers?.toLocaleString() || 0}</span>
                            </div>
                            <div className="category-stat">
                              <span className="stat-label">마지막 방송</span>
                              <span className="stat-value">{formatLastBroadcast(category.lastBroadcastAt)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="categories-wrapper">
            <div className="categories-section">
              <div className="section-header">
                <div className="section-title">
                  <Gamepad2 size={18} className="text-primary" />
                  <h2>인기 게임 카테고리</h2>
                </div>
                <button className="section-link" onClick={() => setActiveTab('analytics-content')}>
                  콘텐츠 분석 보기 <ChevronRight size={14} />
                </button>
              </div>
              <div className="categories-grid">
                {dashboardData.topCategories && dashboardData.topCategories.length > 0 ?
                  dashboardData.topCategories.map((category, index) => {
                    // 플랫폼 로고 가져오기
                    const getPlatformLogos = (platforms) => {
                      if (!platforms || platforms.length === 0) return null;
                      return platforms.map(p => {
                        if (p === 'soop') return { src: '/assets/logos/soop.png', name: 'SOOP' };
                        if (p === 'chzzk') return { src: '/assets/logos/chzzk.png', name: '치지직' };
                        return null;
                      }).filter(Boolean);
                    };
                    const platformLogos = getPlatformLogos(category.platforms);

                    return (
                      <div
                        key={category.id || index}
                        className="category-card glass-premium"
                        onClick={() => setSelectedGameId(category.id)}
                      >
                        <div className="category-rank">#{index + 1}</div>
                        <div className="category-image">
                          {category.imageUrl ? (
                            <img src={category.imageUrl} alt={category.name} />
                          ) : (
                            <Gamepad2 size={40} className="category-placeholder-icon" />
                          )}
                        </div>
                        <div className="category-info">
                          <span className="category-name">{category.name}</span>
                          {category.genre && (
                            <span className="category-genre">{category.genre}</span>
                          )}
                          <div className="category-stats">
                            <div className="category-stat">
                              <span className="stat-label">시청자</span>
                              <span className="stat-value sensitive-blur">{category.totalViewers?.toLocaleString() || 0}</span>
                            </div>
                            <div className="category-stat">
                              <span className="stat-label">방송</span>
                              <span className="stat-value sensitive-blur">{category.totalStreamers?.toLocaleString() || 0}</span>
                            </div>
                            <div className="category-stat">
                              <span className="stat-label">플랫폼</span>
                              <span className="stat-value platform-logos">
                                {platformLogos && platformLogos.length > 0 ? (
                                  platformLogos.map((logo, i) => (
                                    <img key={i} src={logo.src} alt={logo.name} className="platform-logo" />
                                  ))
                                ) : '-'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="empty-state" style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center' }}>
                      <Gamepad2 size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
                      <p>아직 카테고리 데이터가 없습니다.</p>
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>SOOP이나 치지직에서 방송 중인 게임 정보를 수집합니다.</p>
                    </div>
                  )
                }
              </div>
            </div>
          </div>

          <div className="tabs-container">
            <button
              className={`tab-btn ${feedTab === 'pending' ? 'active' : ''}`}
              onClick={() => setFeedTab('pending')}
            >대기중인 이벤트</button>
            <button
              className={`tab-btn ${feedTab === 'stats' ? 'active' : ''}`}
              onClick={() => setFeedTab('stats')}
            >방송 통계</button>
          </div>

          {feedTab === 'pending' && (
            <div className="table-container">
              <div className="table-header">
                <span>이벤트 타입</span>
                <span>상태</span>
                <span>송신자</span>
                <span>금액 / 메시지</span>
                <span style={{ textAlign: 'right' }}>액션</span>
              </div>
              <div className="table-list">
                {events.filter(ev => ev.type === 'donation').length === 0 ? (
                  <div className="empty-state">대기중인 알림이 없습니다.</div>
                ) : (
                  events.filter(ev => ev.type === 'donation').slice(0, 5).map((ev) => {
                    const getPlatformLogo = (p) => {
                      const lowP = p?.toLowerCase();
                      if (lowP === 'soop') return '/assets/logos/soop.png';
                      if (lowP === 'chzzk') return '/assets/logos/chzzk.png';
                      if (lowP === 'youtube') return '/assets/logos/youtube.png';
                      return null;
                    };
                    const platformLogo = getPlatformLogo(ev.platform);

                    return (
                      <div key={ev.id} className="table-row">
                        <div className="recipient-cell">
                          <div className="platform-tag" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {platformLogo ? (
                               <img src={platformLogo} alt={ev.platform} style={{ height: '14px', borderRadius: '2px' }} />
                            ) : (
                               <Bell size={12} className="text-muted" />
                            )}
                          </div>
                          <div className="recipient-icon" style={{ marginLeft: '4px' }}>
                            <Bell size={14} />
                          </div>
                          <span>후원 알림</span>
                        </div>
                        <div>
                          <span className="status-badge pending" style={{ background: '#fef3c7', color: '#d97706' }}>
                            대기중
                          </span>
                        </div>
                        <div style={{ fontWeight: 500 }}>{ev.sender}</div>
                        <div className="amount-cell">₩{ev.amount.toLocaleString()}</div>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button className="btn btn-sm btn-primary" style={{ padding: '4px 12px', fontSize: '12px' }}>
                            재생
                          </button>
                          <button className="btn btn-sm btn-outline" style={{ padding: '4px 12px', fontSize: '12px' }}>
                            스킵
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {feedTab === 'stats' && (() => {
            // 채팅 이벤트 필터 (분당 채팅 수 계산용)
            const chatEvents = events.filter(ev => ev.type === 'chat');

            // 분당 채팅 수 계산 (최근 이벤트 기준)
            const calcChatPerMinute = () => {
              if (chatEvents.length < 2) return chatEvents.length;
              const timestamps = chatEvents.map(ev => new Date(ev.timestamp).getTime()).sort((a, b) => a - b);
              const timeDiffMinutes = (timestamps[timestamps.length - 1] - timestamps[0]) / (1000 * 60);
              if (timeDiffMinutes < 1) return chatEvents.length;
              return Math.round(chatEvents.length / timeDiffMinutes);
            };

            // 평균 후원 금액 (서버에서 받은 데이터 기반)
            const avgDonation = dashboardData.donationCount > 0
              ? Math.round(dashboardData.todayDonation / dashboardData.donationCount)
              : 0;

            return (
              <div className="table-container">
                <div className="stats-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', padding: '24px' }}>
                  <div className="stat-summary-card" style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border-light)' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>분당 채팅 수</div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text-main)' }}>
                      {calcChatPerMinute()}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>최근 기준</div>
                  </div>
                  <div className="stat-summary-card" style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border-light)' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>총 후원 수</div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text-main)' }}>
                      {dashboardData.donationCount}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>이번 달</div>
                  </div>
                  <div className="stat-summary-card" style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border-light)' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>총 후원 금액</div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--primary-color)' }}>
                      ₩{dashboardData.todayDonation.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>이번 달</div>
                  </div>
                  <div className="stat-summary-card" style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border-light)' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>평균 후원 금액</div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text-main)' }}>
                      ₩{avgDonation.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>후원당 평균</div>
                  </div>
                  <div className="stat-summary-card" style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border-light)' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>최고 시청자</div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text-main)' }}>
                      {dashboardData.peakViewers.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>이번 달</div>
                  </div>
                  <div className="stat-summary-card" style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border-light)' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>신규 구독</div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text-main)' }}>
                      {dashboardData.newSubs}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>이번 달</div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      );
    }

    // 게임 카탈로그 특별 처리 (props 필요)
    if (activeTab === 'game-catalog') {
      return <GameCatalog onGameSelect={handleGameSelect} />;
    }
    if (activeTab === 'game-detail') {
      return <GameDetail gameId={selectedGameId} onBack={handleBackFromGame} />;
    }

    const ActiveComponent = {
      chat: ChatSettings,
      alerts: AlertSettings,
      subtitles: SubtitleSettings,
      goals: GoalSettings,
      ticker: TickerSettings,
      roulette: RouletteSettings,
      emoji: EmojiSettings,
      voting: VotingSettings,
      credits: CreditsSettings,
      bot: BotSettings,
      game: GameSettings,
      design: DesignSettings,
      account: AccountSettings,
      ads: AdSettings,
      marketplace: MarketplaceTab,
      'analytics-revenue': RevenueAnalytics,
      'analytics-viewers': ViewerAnalytics,
      'analytics-content': ContentAnalytics,
      'analytics-ads': AdAnalytics,
      'viewership': ViewershipDashboard,
    }[activeTab];

    if (ActiveComponent) return <ActiveComponent />;

    return (
      <div className="animate-fade">
        <header className="page-header">
          <div className="page-title">
            <h1>{menuItems.find(m => m.id === activeTab)?.label} 설정</h1>
            <p>스트림 분위기에 맞춰 위젯을 커스터마이징 해보세요.</p>
          </div>
        </header>
        <div className="placeholder-view">
          <Settings size={64} style={{ color: 'var(--border-medium)' }} strokeWidth={1} />
          <h3 style={{ color: 'var(--text-main)', marginTop: '20px' }}>기능 준비 중</h3>
          <p>더 많은 커스터마이징 옵션을 준비하고 있습니다. 조금만 기다려주세요!</p>
          <button className="btn btn-outline" style={{ marginTop: 'var(--spacing-lg)' }} onClick={() => setActiveTab('dashboard')}>
            대시보드로 돌아가기
          </button>
        </div>
      </div>
    );
  };

  const handleNavItemClick = (itemId) => {
    setActiveTab(itemId);
    setMobileMenuOpen(false); // 모바일에서 메뉴 선택 시 드로어 닫기
  };

  const toggleGroup = (groupLabel) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupLabel]: !prev[groupLabel]
    }));
  };

  return (
    <div className="dashboard-layout">
      {/* 모바일 오버레이 배경 */}
      {mobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} />
      )}

      <aside className={`chatgpt-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        {/* 닫기 버튼 - 모바일에서만 표시 */}
        {mobileMenuOpen && (
          <button
            className="sidebar-close-btn"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X size={24} />
          </button>
        )}
        <nav className="sidebar-nav">
          {menuGroups.map((group) => {
            const isCollapsed = collapsedGroups[group.label];
            const hasActiveItem = group.items.some(item => item.id === activeTab);

            return (
              <div key={group.label} className="nav-group">
                <button
                  className={`group-label-btn ${hasActiveItem ? 'has-active' : ''}`}
                  onClick={() => toggleGroup(group.label)}
                >
                  <span className="group-label">{group.label}</span>
                  <ChevronDown
                    size={14}
                    className={`group-chevron ${isCollapsed ? 'collapsed' : ''}`}
                  />
                </button>
                <div className={`nav-group-items ${isCollapsed ? 'collapsed' : ''}`}>
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                      onClick={() => handleNavItemClick(item.id)}
                      title={item.label}
                    >
                      {item.icon}
                      <span className="nav-label">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {isAuthenticated && (
          <div className="sidebar-user">
            <div className="user-profile" onClick={() => setActiveTab('account')} title="계정 설정">
              <div className="avatar">{user?.displayName?.charAt(0)?.toUpperCase() || 'U'}</div>
              <div className="user-info">
                <span className="username" style={{ color: 'var(--text-main)' }}>{user?.displayName || '사용자'}</span>
                <span className="user-plan">스트리머</span>
              </div>
              <button
                className="logout-btn"
                onClick={(e) => { e.stopPropagation(); logout(); }}
                title="로그아웃"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        )}
      </aside>

      <main className="chatgpt-main">
        <header className="top-nav">
          {/* 모바일 햄버거 버튼 */}
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu size={24} />
          </button>
          <button
            className="btn btn-onboarding"
            onClick={() => setActiveTab('account')}
            title="시작 가이드"
          >
            <Rocket size={16} />
            <span>처음이신가요?</span>
          </button>
          <div className="top-actions">
            <div className={`streaming-mode-toggle ${isStreamingMode ? 'active' : ''}`}>
              {isStreamingMode ? <EyeOff size={16} /> : <Eye size={16} />}
              <span>스트리밍 모드</span>
              <div className="toggle-switch">
                <input
                  type="checkbox"
                  id="streaming-mode"
                  checked={isStreamingMode}
                  onChange={toggleStreamingMode}
                />
                <label htmlFor="streaming-mode"></label>
              </div>
            </div>
            <button
              className="btn btn-icon btn-ghost"
              onClick={toggleTheme}
              title={resolvedTheme === 'dark' ? '라이트 모드' : '다크 모드'}
            >
              {resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="btn btn-icon btn-ghost"><Bell size={18} /></button>
            <button
              className="btn btn-icon btn-ghost"
              onClick={() => setActiveTab('account')}
              title="계정 설정"
            >
              <Settings size={18} />
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleDeveloperMode}
              title="관리자 대시보드"
              style={{ borderRadius: 'var(--radius-full)' }}
            >
              <Shield size={16} />
              관리자
            </button>
          </div>
        </header>
        <div className="content-body">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
