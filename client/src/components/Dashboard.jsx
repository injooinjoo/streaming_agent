import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layout, MessageSquare, Bell, FileText, BarChart3,
  Type, Image as ImageIcon, HelpCircle,
  Send, Plus, ExternalLink, Settings,
  RefreshCw, Megaphone, Palette, Sparkles, Activity, TrendingUp, MousePointerClick,
  DollarSign, Store, LogOut, LogIn, Users, PieChart, ChevronRight, Link2
} from 'lucide-react';
import { API_URL } from '../config/api';
import { useAuth } from '../contexts/AuthContext';
import ChatSettings from './settings/ChatSettings';
import AlertSettings from './settings/AlertSettings';
import SubtitleSettings from './settings/SubtitleSettings';
import GoalSettings from './settings/GoalSettings';
import TickerSettings from './settings/TickerSettings';
import TextSettings from './settings/TextSettings';
import BannerSettings from './settings/BannerSettings';
import DesignSettings from './settings/DesignSettings';
import AccountSettings from './settings/AccountSettings';
import AdSettings from './settings/AdSettings';
import OverlayUrlsPanel from './settings/OverlayUrlsPanel';
import MarketplaceTab from './marketplace/MarketplaceTab';
import RevenueAnalytics from './analytics/RevenueAnalytics';
import ViewerAnalytics from './analytics/ViewerAnalytics';
import ContentAnalytics from './analytics/ContentAnalytics';
import AdAnalytics from './analytics/AdAnalytics';
import './Dashboard.css';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSimulating, setIsSimulating] = useState(false);
  const [events, setEvents] = useState([]);
  const [simulation, setSimulation] = useState({
    type: 'chat',
    sender: '',
    message: '',
    amount: 1000,
    platform: 'twitch'
  });

  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const menuGroups = [
    {
      label: '메인 메뉴',
      items: [
        { id: 'dashboard', label: '대시보드', icon: <Layout size={18} /> },
        { id: 'overlay-urls', label: '오버레이 URL', icon: <Link2 size={18} /> },
        { id: 'chat', label: '채팅 오버레이', icon: <MessageSquare size={18} /> },
        { id: 'alerts', label: '후원 알림', icon: <Bell size={18} /> }
      ]
    },
    {
      label: '커스텀 위젯',
      items: [
        { id: 'subtitles', label: '자막 설정', icon: <FileText size={18} /> },
        { id: 'goals', label: '목표치 위젯', icon: <BarChart3 size={18} /> },
        { id: 'ticker', label: '뉴스 티커', icon: <Megaphone size={18} /> },
        { id: 'text', label: '커스텀 텍스트', icon: <Type size={18} /> },
        { id: 'banners', label: '배너 위젯', icon: <ImageIcon size={18} /> },
        { id: 'design', label: '디자인 커스터마이저', icon: <Palette size={18} /> }
      ]
    },
    {
      label: '분석',
      items: [
        { id: 'analytics-revenue', label: '수익 분석', icon: <DollarSign size={18} /> },
        { id: 'analytics-viewers', label: '시청자 분석', icon: <Users size={18} /> },
        { id: 'analytics-content', label: '콘텐츠 분석', icon: <PieChart size={18} /> },
        { id: 'analytics-ads', label: '광고 분석', icon: <TrendingUp size={18} /> }
      ]
    },
    {
      label: '수익 관리',
      items: [
        { id: 'ads', label: '광고 관리', icon: <Megaphone size={18} /> },
        { id: 'marketplace', label: '디자인 마켓', icon: <Store size={18} /> }
      ]
    }
  ];

  const menuItems = menuGroups.flatMap((group) => group.items);

  const stats = {
    todayDonation: events
      .filter(e => e.type === 'donation')
      .reduce((acc, curr) => acc + (curr.amount || 0), 0),
    peakViewers: 842,
    newSubs: 12
  };

  const insights = [
    {
      id: 1,
      type: 'performance',
      icon: <TrendingUp size={18} />,
      title: '성과 분석',
      message: '어제한 메이플스토리 방송시간에 최고 평균 수익이 나왔어요!',
      color: '#3b82f6',
      bg: 'rgba(59, 130, 246, 0.1)'
    },
    {
      id: 2,
      type: 'trend',
      icon: <Activity size={18} />,
      title: '플랫폼 트렌드',
      message: '롤 방송이 요즘 플랫폼 전체적으로 하향세 입니다. 새로운 게임을 시도해보는건 어떨까요?',
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.1)'
    },
    {
      id: 3,
      type: 'ads',
      icon: <MousePointerClick size={18} />,
      title: '광고 수익 최적화',
      message: '요즘 던전앤파이터 방송광고가 클릭전환율이 높아서 수익률 반응이 좋습니다.',
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.1)'
    }
  ];

  const topCategories = [
    {
      id: 1,
      name: 'League of Legends',
      nameKr: '리그 오브 레전드',
      image: 'https://static-cdn.jtvnw.net/ttv-boxart/21779-285x380.jpg',
      engagement: 94,
      avgViewers: 1240,
      growth: '+12%'
    },
    {
      id: 2,
      name: 'PUBG: BATTLEGROUNDS',
      nameKr: '배틀그라운드',
      image: 'https://static-cdn.jtvnw.net/ttv-boxart/493057-285x380.jpg',
      engagement: 87,
      avgViewers: 890,
      growth: '+8%'
    },
    {
      id: 3,
      name: 'MapleStory',
      nameKr: '메이플스토리',
      image: 'https://static-cdn.jtvnw.net/ttv-boxart/19976-285x380.jpg',
      engagement: 82,
      avgViewers: 720,
      growth: '+24%'
    },
    {
      id: 4,
      name: 'Overwatch 2',
      nameKr: '오버워치 2',
      image: 'https://static-cdn.jtvnw.net/ttv-boxart/515025-285x380.jpg',
      engagement: 76,
      avgViewers: 580,
      growth: '-3%'
    },
    {
      id: 5,
      name: 'Valorant',
      nameKr: '발로란트',
      image: 'https://static-cdn.jtvnw.net/ttv-boxart/516575-285x380.jpg',
      engagement: 71,
      avgViewers: 450,
      growth: '+5%'
    }
  ];

  const fetchEvents = async () => {
    try {
      const res = await fetch(`${API_URL}/api/events`);
      const data = await res.json();
      setEvents(data);
    } catch (e) {
      console.error('Failed to fetch events', e);
    }
  };

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 3000);
    return () => clearInterval(interval);
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
                <span className="value">₩{stats.todayDonation.toLocaleString()}</span>
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
                <span className="value">{stats.peakViewers.toLocaleString()}</span>
                <span className="subtext">어제 대비 24% 증가</span>
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
                <span className="value">{stats.newSubs}</span>
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
                <h2>실시간 AI 인사이트</h2>
              </div>
              <span className="timestamp">방금 업데이트됨</span>
            </div>
            <div className="insights-grid">
              {insights.map((insight) => (
                <div key={insight.id} className="insight-card" style={{ borderColor: insight.color }}>
                   <div className="insight-icon" style={{ backgroundColor: insight.bg, color: insight.color }}>
                     {insight.icon}
                   </div>
                   <div className="insight-content">
                     <span className="insight-label" style={{ color: insight.color }}>{insight.title}</span>
                     <p className="insight-message">{insight.message}</p>
                   </div>
                </div>
              ))}
            </div>
          </div>

          <div className="categories-section">
            <div className="section-header">
              <div className="section-title">
                <BarChart3 size={18} className="text-primary" />
                <h2>내 방송 인기 카테고리</h2>
              </div>
              <button className="section-link" onClick={() => setActiveTab('analytics-content')}>
                콘텐츠 분석 보기 <ChevronRight size={14} />
              </button>
            </div>
            <div className="categories-grid">
              {topCategories.map((category, index) => (
                <div key={category.id} className="category-card">
                  <div className="category-rank">#{index + 1}</div>
                  <div className="category-image">
                    <img src={category.image} alt={category.name} />
                  </div>
                  <div className="category-info">
                    <span className="category-name">{category.nameKr}</span>
                    <div className="category-stats">
                      <div className="category-stat">
                        <span className="stat-label">반응도</span>
                        <span className="stat-value">{category.engagement}%</span>
                      </div>
                      <div className="category-stat">
                        <span className="stat-label">평균 시청자</span>
                        <span className="stat-value">{category.avgViewers.toLocaleString()}</span>
                      </div>
                      <span className={`category-growth ${category.growth.startsWith('+') ? 'positive' : 'negative'}`}>
                        {category.growth}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="tabs-container">
            <button className="tab-btn active">최근 활동 피드</button>
            <button className="tab-btn">대기중인 이벤트</button>
            <button className="tab-btn">방송 통계</button>
          </div>

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

    const ActiveComponent = {
      chat: ChatSettings,
      alerts: AlertSettings,
      subtitles: SubtitleSettings,
      goals: GoalSettings,
      ticker: TickerSettings,
      text: TextSettings,
      banners: BannerSettings,
      design: DesignSettings,
      account: AccountSettings,
      ads: AdSettings,
      'overlay-urls': OverlayUrlsPanel,
      marketplace: MarketplaceTab,
      'analytics-revenue': RevenueAnalytics,
      'analytics-viewers': ViewerAnalytics,
      'analytics-content': ContentAnalytics,
      'analytics-ads': AdAnalytics,
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

  return (
    <div className="dashboard-layout">
      <aside className="chatgpt-sidebar">
        <div className="sidebar-top">
          <div className="app-logo">
            <div className="logo-icon">S</div>
            <span className="logo-text">StreamAgent</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {menuGroups.map((group) => (
            <div key={group.label} className="nav-group">
              <span className="group-label">{group.label}</span>
              {group.items.map((item) => (
                <button
                  key={item.id}
                  className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(item.id)}
                  title={item.label}
                >
                  {item.icon}
                  <span className="nav-label">{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-user">
          {isAuthenticated ? (
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
          ) : (
            <button
              className="login-btn"
              onClick={() => navigate('/login')}
              style={{ width: '100%' }}
            >
              <LogIn size={18} />
              <span className="login-text">로그인</span>
            </button>
          )}
        </div>
      </aside>

      <main className="chatgpt-main">
        <header className="top-nav">
          <div className="search-container">
            <BarChart3 className="search-icon" size={16} />
            <input type="text" placeholder="메뉴 검색..." />
          </div>
          <div className="top-actions">
            <button className="btn btn-icon btn-ghost"><Bell size={18} /></button>
            <button className="btn btn-icon btn-ghost"><Settings size={18} /></button>
            <button className="btn btn-primary" style={{ borderRadius: 'var(--radius-full)' }}>
              방송 시작
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
