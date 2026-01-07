import React, { useState, useEffect } from 'react';
import {
  Layout, MessageSquare, Bell, FileText, BarChart3,
  Type, Image as ImageIcon, HelpCircle,
  Send, Plus, ExternalLink, Settings, History,
  User, RefreshCw, Megaphone, Palette, Menu
} from 'lucide-react';
import ChatSettings from './settings/ChatSettings';
import AlertSettings from './settings/AlertSettings';
import SubtitleSettings from './settings/SubtitleSettings';
import GoalSettings from './settings/GoalSettings';
import TickerSettings from './settings/TickerSettings';
import TextSettings from './settings/TextSettings';
import BannerSettings from './settings/BannerSettings';
import DesignSettings from './settings/DesignSettings';
import AccountSettings from './settings/AccountSettings';
import './Dashboard.css';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [events, setEvents] = useState([]);
  const [simulation, setSimulation] = useState({
    type: 'chat',
    sender: '',
    message: '',
    amount: 1000,
    platform: 'twitch'
  });

  const menuGroups = [
    {
      label: '메인 메뉴',
      items: [
        { id: 'dashboard', label: '대시보드', icon: <Layout size={18} /> },
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

  const fetchEvents = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/events');
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
      await fetch('http://localhost:3001/api/simulate-event', {
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
            <div className="stat-card">
              <div className="stat-header">
                <span>총 후원 금액</span>
                <HelpCircle size={14} />
              </div>
              <div className="stat-content">
                <span className="value">₩{stats.todayDonation.toLocaleString()}</span>
                <span className="subtext">오늘 방송 누적</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-header">
                <span>최고 시청자 수</span>
                <HelpCircle size={14} />
              </div>
              <div className="stat-content">
                <span className="value">{stats.peakViewers.toLocaleString()}</span>
                <span className="subtext">어제 대비 24% 증가</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-header">
                <span>신규 구독</span>
                <HelpCircle size={14} />
              </div>
              <div className="stat-content">
                <span className="value">{stats.newSubs}</span>
                <span className="subtext">모든 플랫폼 통합</span>
              </div>
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
                events.map((ev) => (
                  <div key={ev.id} className="table-row">
                    <div className="recipient-cell">
                      <div className="recipient-icon">
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
                ))
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
                <select value={simulation.platform} onChange={(e) => setSimulation({ ...simulation, platform: e.target.value })}>
                  <option value="twitch">트위치</option>
                  <option value="youtube">유튜브</option>
                  <option value="chzzk">치지직</option>
                  <option value="soop">숲(SOOP)</option>
                </select>
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
    <div className={`dashboard-layout ${isCollapsed ? 'collapsed' : ''}`}>
      <aside className="chatgpt-sidebar">
        <div className="sidebar-top">
          <div className="app-logo">
            <button className="menu-toggle" onClick={() => setIsCollapsed(!isCollapsed)}>
              <Menu size={20} />
            </button>
            {!isCollapsed && (
              <>
                <div className="logo-icon">S</div>
                <span>StreamAgent</span>
              </>
            )}
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
                  title={isCollapsed ? item.label : ''}
                >
                  {item.icon}
                  {!isCollapsed && <span>{item.label}</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="user-profile" onClick={() => setActiveTab('account')} title="계정 설정">
            <div className="avatar">JD</div>
            {!isCollapsed && (
              <div className="user-info">
                <span className="username" style={{ color: 'var(--text-main)' }}>Jacob Mac</span>
                <span className="user-plan">프로 스트리머</span>
              </div>
            )}
          </div>
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
