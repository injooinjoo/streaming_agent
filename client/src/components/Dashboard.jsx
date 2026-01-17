import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layout, MessageSquare, Bell, FileText, BarChart3,
  HelpCircle, Send, Plus, ExternalLink, Settings,
  RefreshCw, Megaphone, Palette, Sparkles, Activity, TrendingUp, MousePointerClick,
  DollarSign, Store, LogOut, LogIn, Users, PieChart, ChevronRight, ChevronDown, Disc,
  Smile, Vote, Film, Bot, Menu, X, Sun, Moon, Gamepad2, Shield, Eye, EyeOff, Rocket, Trophy
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
import SnowflakeAnalytics from './analytics/SnowflakeAnalytics';
import './Dashboard.css';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSimulating, setIsSimulating] = useState(false);
  const [events, setEvents] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [feedTab, setFeedTab] = useState('recent');
  const [selectedGameId, setSelectedGameId] = useState(null);
  const [simulation, setSimulation] = useState({
    type: 'chat',
    sender: '',
    message: '',
    amount: 1000,
    platform: 'twitch'
  });
  const [dashboardData, setDashboardData] = useState({
    todayDonation: 0,
    peakViewers: 0,
    newSubs: 0,
    insights: [],
    topCategories: []
  });
  const [dashboardLoading, setDashboardLoading] = useState(true);

  const { user, isAuthenticated, logout } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const { isStreamingMode, toggleStreamingMode } = useStreamingMode();
  const navigate = useNavigate();

  // Developer mode - 바로 어드민 대시보드로 이동
  const handleDeveloperMode = () => {
    navigate('/admin-dashboard');
  };

  // 게임 카탈로그 핸들러
  const handleGameSelect = (gameId) => {
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
        { id: 'analytics-content', label: '콘텐츠 분석', icon: <PieChart size={18} /> },
        { id: 'analytics-snowflake', label: 'Snowflake 분석', icon: <Activity size={18} /> }
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
      const res = await fetch(`${API_URL}/api/events`);
      const data = await res.json();
      setEvents(data);
    } catch (e) {
      console.error('Failed to fetch events', e);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setDashboardLoading(true);
      const res = await fetch(`${API_URL}/api/stats/dashboard`);
      if (res.ok) {
        const data = await res.json();
        setDashboardData(data);
      }
    } catch (e) {
      console.error('Failed to fetch dashboard data', e);
    } finally {
      setDashboardLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchDashboardData();
    const eventsInterval = setInterval(fetchEvents, 3000);
    const dashboardInterval = setInterval(fetchDashboardData, 30000); // 30초마다 갱신
    return () => {
      clearInterval(eventsInterval);
      clearInterval(dashboardInterval);
    };
  }, []);

  const triggerSimulate = async () => {
    if (!simulation.sender) {
      alert("송신자 이름을 입력해주세요.");
      return;
    }
    setIsSimulating(true);
    try {
      await fetch(`${API_URL}/api/simulate-event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(simulation)
      });
      fetchEvents();
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setIsSimulating(false), 500);
    }
  };

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
                <span className="subtext">오늘 방송 누적</span>
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
                <span className="subtext">오늘 기준</span>
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
                <span className="subtext">모든 플랫폼 통합</span>
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

          <div className="categories-wrapper">
            <div className="categories-section">
              <div className="section-header">
                <div className="section-title">
                  <BarChart3 size={18} className="text-primary" />
                  <h2>플랫폼별 활동 현황</h2>
                </div>
                <button className="section-link" onClick={() => setActiveTab('analytics-content')}>
                  콘텐츠 분석 보기 <ChevronRight size={14} />
                </button>
              </div>
              <div className="categories-grid">
                {dashboardData.topCategories && dashboardData.topCategories.length > 0 ?
                  dashboardData.topCategories.map((platform, index) => {
                    const getPlatformLogo = (p) => {
                      if (p === 'soop') return '/assets/logos/soop.png';
                      if (p === 'chzzk') return '/assets/logos/chzzk.png';
                      if (p === 'youtube') return '/assets/logos/youtube.png';
                      return null;
                    };
                    return (
                      <div key={platform.platform || index} className="category-card">
                        <div className="category-rank">#{index + 1}</div>
                        <div className="category-image" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card-hover)' }}>
                          {getPlatformLogo(platform.platform) ? (
                            <img src={getPlatformLogo(platform.platform)} alt={platform.name} style={{ height: '40px', objectFit: 'contain' }} />
                          ) : (
                            <Activity size={32} style={{ color: 'var(--text-muted)' }} />
                          )}
                        </div>
                        <div className="category-info">
                          <span className="category-name">{platform.name}</span>
                          <div className="category-stats">
                            <div className="category-stat">
                              <span className="stat-label">총 활동</span>
                              <span className="stat-value sensitive-blur">{platform.activity?.toLocaleString() || 0}</span>
                            </div>
                            <div className="category-stat">
                              <span className="stat-label">채팅</span>
                              <span className="stat-value sensitive-blur">{platform.chats?.toLocaleString() || 0}</span>
                            </div>
                            <div className="category-stat">
                              <span className="stat-label">후원</span>
                              <span className="stat-value sensitive-blur">{platform.donations?.toLocaleString() || 0}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="empty-state" style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center' }}>
                      <Activity size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
                      <p>아직 플랫폼 활동 데이터가 없습니다.</p>
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>SOOP이나 치지직에 연결하여 데이터 수집을 시작하세요.</p>
                    </div>
                  )
                }
              </div>
            </div>
          </div>

          <div className="tabs-container">
            <button
              className={`tab-btn ${feedTab === 'recent' ? 'active' : ''}`}
              onClick={() => setFeedTab('recent')}
            >최근 활동 피드</button>
            <button
              className={`tab-btn ${feedTab === 'pending' ? 'active' : ''}`}
              onClick={() => setFeedTab('pending')}
            >대기중인 이벤트</button>
            <button
              className={`tab-btn ${feedTab === 'stats' ? 'active' : ''}`}
              onClick={() => setFeedTab('stats')}
            >방송 통계</button>
          </div>

          {feedTab === 'recent' && (
            <div className="table-container">
              <div className="table-header">
                <span>이벤트 타입</span>
                <span>상태</span>
                <span>송신자</span>
                <span>금액 / 메시지</span>
                <span style={{ textAlign: 'right' }}>시간</span>
              </div>
              <div className="table-list">
                {events.length === 0 ? (
                  <div className="empty-state">최근 활동 내역이 없습니다.</div>
                ) : (
                  events.map((ev) => {
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
                               <MessageSquare size={12} className="text-muted" />
                            )}
                          </div>
                          <div className="recipient-icon" style={{ marginLeft: '4px' }}>
                            {ev.type === 'donation' ? <Plus size={14} /> : <MessageSquare size={14} />}
                          </div>
                          <span>{ev.type.charAt(0).toUpperCase() + ev.type.slice(1)}</span>
                        </div>
                      <div>
                        <span className={`status-badge ${ev.type}`}>
                          {ev.type === 'donation' ? '후원' : '채팅'}
                        </span>
                      </div>
                      <div style={{ fontWeight: 500 }}>{ev.sender}</div>
                      <div className="amount-cell">
                        {ev.type === 'donation' ? `₩${ev.amount.toLocaleString()}` : ev.message}
                      </div>
                      <div className="time-cell">
                        {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

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

          {feedTab === 'stats' && (
            <div className="table-container">
              <div className="stats-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', padding: '24px' }}>
                <div className="stat-summary-card" style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border-light)' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>총 채팅 수</div>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text-main)' }}>
                    {events.filter(ev => ev.type === 'chat').length}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>오늘 누적</div>
                </div>
                <div className="stat-summary-card" style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border-light)' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>총 후원 수</div>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text-main)' }}>
                    {events.filter(ev => ev.type === 'donation').length}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>오늘 누적</div>
                </div>
                <div className="stat-summary-card" style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border-light)' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>총 후원 금액</div>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--primary-color)' }}>
                    ₩{events.filter(ev => ev.type === 'donation').reduce((acc, curr) => acc + (curr.amount || 0), 0).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>오늘 누적</div>
                </div>
                <div className="stat-summary-card" style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border-light)' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>평균 후원 금액</div>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text-main)' }}>
                    ₩{events.filter(ev => ev.type === 'donation').length > 0
                      ? Math.round(events.filter(ev => ev.type === 'donation').reduce((acc, curr) => acc + (curr.amount || 0), 0) / events.filter(ev => ev.type === 'donation').length).toLocaleString()
                      : 0}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>후원당 평균</div>
                </div>
                <div className="stat-summary-card" style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border-light)' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>최고 시청자</div>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text-main)' }}>
                    {dashboardData.peakViewers.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>오늘 기준</div>
                </div>
                <div className="stat-summary-card" style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border-light)' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>신규 구독</div>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text-main)' }}>
                    {dashboardData.newSubs}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>오늘 기준</div>
                </div>
              </div>
            </div>
          )}

          <div className="simulator-card">
            <div className="card-title">이벤트 시뮬레이터</div>
            <p className="card-subtitle">라이브 이벤트를 가상으로 발생시켜 오버레이를 테스트해보세요.</p>
            <div className="simulator-form">
              <div className="input-group">
                <label>이벤트 종류</label>
                <select value={simulation.type} onChange={(e) => setSimulation({ ...simulation, type: e.target.value })}>
                  <option value="chat">채팅 메시지</option>
                  <option value="donation">후원 이벤트</option>
                </select>
              </div>
              <div className="input-group">
                <label>플랫폼</label>
                <div className="platform-grid-mini" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginTop: '8px' }}>
                  {[
                    { id: 'soop', label: '숲(SOOP)', logo: '/assets/logos/soop.png' },
                    { id: 'chzzk', label: '치지직', logo: '/assets/logos/chzzk.png' },
                    { id: 'youtube', label: '유튜브', logo: '/assets/logos/youtube.png' },
                    { id: 'twitch', label: '트위치', icon: <MessageSquare size={14} /> }
                  ].map(p => (
                    <button 
                      key={p.id}
                      className={`platform-btn-mini ${simulation.platform === p.id ? 'active' : ''}`}
                      onClick={() => setSimulation({ ...simulation, platform: p.id })}
                      style={{ 
                        padding: '10px', 
                        borderRadius: '12px', 
                        border: '1px solid var(--border-light)',
                        background: simulation.platform === p.id ? 'var(--primary-light)' : 'var(--bg-card)',
                        color: simulation.platform === p.id ? 'var(--primary-color)' : 'var(--text-main)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        fontSize: '13px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {p.logo ? (
                        <img src={p.logo} alt={p.label} style={{ height: '16px', borderRadius: '3px' }} />
                      ) : p.icon}
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="input-group">
                <label>송신자 이름 / ID</label>
                <input
                  type="text"
                  placeholder="예: 홍길동"
                  value={simulation.sender}
                  onChange={(e) => setSimulation({ ...simulation, sender: e.target.value })}
                />
              </div>
              {simulation.type === 'donation' ? (
                <div className="input-group">
                  <label>금액 (KRW)</label>
                  <input
                    type="number"
                    value={simulation.amount}
                    onChange={(e) => setSimulation({ ...simulation, amount: parseInt(e.target.value, 10) })}
                  />
                </div>
              ) : (
                <div className="input-group">
                  <label>메시지 내용</label>
                  <input
                    type="text"
                    placeholder="채팅 내용을 입력하세요!"
                    value={simulation.message}
                    onChange={(e) => setSimulation({ ...simulation, message: e.target.value })}
                  />
                </div>
              )}
              <div className="full-width">
                <button
                  className="btn btn-primary btn-full"
                  style={{ height: '44px' }}
                  onClick={triggerSimulate}
                  disabled={isSimulating}
                >
                  {isSimulating ? <RefreshCw size={18} className="spin" /> : <Send size={18} />}
                  {isSimulating ? '발생 중...' : '시뮬레이션 시작'}
                </button>
              </div>
            </div>
          </div>
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
      'analytics-snowflake': SnowflakeAnalytics,
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
        {/* 모바일 닫기 버튼 */}
        <button className="mobile-close-btn" onClick={() => setMobileMenuOpen(false)}>
          <X size={24} />
        </button>
        <div className="sidebar-top">
          <div className="app-logo">
            <div className="logo-icon">S</div>
            <span className="logo-text">StreamAgent</span>
          </div>
        </div>

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
          {/* 모바일 햄버거 메뉴 버튼 */}
          <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(true)}>
            <Menu size={24} />
          </button>
          <div className="search-container hide-mobile">
            <BarChart3 className="search-icon" size={16} />
            <input type="text" placeholder="메뉴 검색..." />
          </div>
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
            {isAuthenticated ? (
              <button className="btn btn-primary" style={{ borderRadius: 'var(--radius-full)' }}>
                방송 시작
              </button>
            ) : (
              <button className="btn btn-primary" style={{ borderRadius: 'var(--radius-full)' }} onClick={() => navigate('/login')}>
                <LogIn size={16} />
                로그인
              </button>
            )}
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
