import React, { useState, useEffect } from 'react';
import {
  Layout, MessageSquare, Bell, FileText, BarChart3,
  Type, Image as ImageIcon, HelpCircle,
  Send, Plus, ExternalLink, Settings, History,
  User, RefreshCw, Megaphone, Palette
} from 'lucide-react';
import ChatSettings from './settings/ChatSettings';
import AlertSettings from './settings/AlertSettings';
import SubtitleSettings from './settings/SubtitleSettings';
import GoalSettings from './settings/GoalSettings';
import TickerSettings from './settings/TickerSettings';
import TextSettings from './settings/TextSettings';
import BannerSettings from './settings/BannerSettings';
import DesignSettings from './settings/DesignSettings';
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

  const menuGroups = [
    {
      label: '메인 메뉴',
      items: [
        { id: 'dashboard', label: '대시보드', icon: <Layout size={20} /> },
        { id: 'chat', label: '채팅창', icon: <MessageSquare size={20} /> },
        { id: 'alerts', label: '후원 알림', icon: <Bell size={20} /> }
      ]
    },
    {
      label: '커스텀 위젯',
      items: [
        { id: 'subtitles', label: '후원 자막', icon: <FileText size={20} /> },
        { id: 'goals', label: '목표치 그래프', icon: <BarChart3 size={20} /> },
        { id: 'ticker', label: '전광판', icon: <Megaphone size={20} /> },
        { id: 'text', label: '자막', icon: <Type size={20} /> },
        { id: 'banners', label: '배너', icon: <ImageIcon size={20} /> },
        { id: 'design', label: '디자인 커스텀', icon: <Palette size={20} /> }
      ]
    },
    {
      label: '지원',
      items: [
        { id: 'inquiry', label: '문의하기', icon: <HelpCircle size={20} /> }
      ]
    }
  ];

  const menuItems = menuGroups.flatMap((group) => group.items);

  const stats = {
    todayDonation: events
      .filter(e => e.type === 'donation')
      .reduce((acc, curr) => acc + (curr.amount || 0), 0),
    peakViewers: Math.floor(Math.random() * 500) + 842,
    newSubs: events.filter(e => e.type === 'subscription').length || 12
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
      alert("보내는 사람 이름을 입력해주세요.");
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
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="tab-content animate-fade">
            <header className="dashboard-header">
              <h1>반갑습니다, 스트리머님! 👋</h1>
              <p>오늘의 방송 설정을 한눈에 관리하세요.</p>
            </header>

            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-label">오늘의 후원</span>
                <span className="stat-value">{stats.todayDonation.toLocaleString()} KRW</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">최고 시청자</span>
                <span className="stat-value">{stats.peakViewers.toLocaleString()}명</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">새로운 구독</span>
                <span className="stat-value">{stats.newSubs}건</span>
              </div>
            </div>

            <div className="dashboard-main-grid">
              <section className="dashboard-section simulator-section">
                <div className="section-header">
                  <h3><Plus size={18} /> 실시간 테스트</h3>
                  <div className="overlay-links">
                    <a href="/overlay/chat" target="_blank" className="overlay-link"><ExternalLink size={14} /> 채팅창 오버레이</a>
                    <a href="/overlay/alerts" target="_blank" className="overlay-link"><ExternalLink size={14} /> 알림창 오버레이</a>
                  </div>
                </div>

                <div className="simulator-form">
                  <div className="input-row">
                    <div className="input-group">
                      <label>이벤트 타입</label>
                      <select value={simulation.type} onChange={(e) => setSimulation({ ...simulation, type: e.target.value })}>
                        <option value="chat">일반 채팅</option>
                        <option value="donation">후원 (전자녀)</option>
                      </select>
                    </div>
                    <div className="input-group">
                      <label>플랫폼</label>
                      <select value={simulation.platform} onChange={(e) => setSimulation({ ...simulation, platform: e.target.value })}>
                        <option value="twitch">Twitch</option>
                        <option value="youtube">YouTube</option>
                        <option value="chzzk">치지직 (CHZZK)</option>
                        <option value="soop">SOOP (아프리카TV)</option>
                      </select>
                    </div>
                  </div>

                  <div className="input-group">
                    <label>닉네임 / ID</label>
                    <input
                      type="text"
                      placeholder="예: 홍길동"
                      value={simulation.sender}
                      onChange={(e) => setSimulation({ ...simulation, sender: e.target.value })}
                    />
                  </div>

                  {simulation.type === 'donation' ? (
                    <div className="input-group">
                      <label>후원 금액 (KRW)</label>
                      <input
                        type="number"
                        value={simulation.amount}
                        onChange={(e) => setSimulation({ ...simulation, amount: parseInt(e.target.value, 10) })}
                      />
                    </div>
                  ) : (
                    <div className="input-group">
                      <label>메시지</label>
                      <textarea
                        placeholder="전달할 메시지를 입력하세요"
                        value={simulation.message}
                        onChange={(e) => setSimulation({ ...simulation, message: e.target.value })}
                      />
                    </div>
                  )}

                  <button className={`simulate-btn ${isSimulating ? 'loading' : ''}`} onClick={triggerSimulate} disabled={isSimulating}>
                    {isSimulating ? <RefreshCw size={18} className="spin" /> : <Send size={18} />}
                    {isSimulating ? '전송 중...' : '테스트 전송하기'}
                  </button>
                </div>
              </section>

              <section className="dashboard-section history-section">
                <div className="section-header">
                  <h3><History size={18} /> 최근 활동 내역</h3>
                  <button className="icon-btn" onClick={fetchEvents}><RefreshCw size={14} /></button>
                </div>
                <div className="history-list">
                  {events.length === 0 ? (
                    <div className="empty-state">최근 활동이 없습니다.</div>
                  ) : (
                    events.map((ev) => (
                      <div key={ev.id} className="history-item">
                        <div className="ev-badge" data-type={ev.type}>
                          {ev.type === 'donation' ? '후원' : '채팅'}
                        </div>
                        <div className="ev-info">
                          <span className="ev-sender">{ev.sender}</span>
                          <span className="ev-content">
                            {ev.type === 'donation'
                              ? `${ev.amount.toLocaleString()} KRW`
                              : ev.message}
                          </span>
                        </div>
                        <span className="ev-time">
                          {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>
        );
      case 'chat':
        return <ChatSettings />;
      case 'alerts':
        return <AlertSettings />;
      case 'subtitles':
        return <SubtitleSettings />;
      case 'goals':
        return <GoalSettings />;
      case 'ticker':
        return <TickerSettings />;
      case 'text':
        return <TextSettings />;
      case 'banners':
        return <BannerSettings />;
      case 'design':
        return <DesignSettings />;
      default:
        return (
          <div className="tab-content animate-fade">
            <header className="dashboard-header">
              <h1>{menuItems.find(m => m.id === activeTab)?.label} 설정</h1>
              <p>세부 기능을 설정하여 방송의 퀄리티를 높여보세요.</p>
            </header>
            <div className="placeholder-view">
              <Settings size={64} className="spin-slow" strokeWidth={1} />
              <h3>준비 중인 기능입니다</h3>
              <p>곧 더 강력한 기능을 제공해 드릴 예정입니다.</p>
              <button className="btn-secondary" onClick={() => setActiveTab('dashboard')}>대시보드로 돌아가기</button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="dashboard-layout">
      <aside className="chatgpt-sidebar">
        <div className="sidebar-top">
          <div className="app-logo">
            <div className="logo-icon">W</div>
            <span>Weflab Clone</span>
          </div>
          <button className="new-chat-btn">
            <Plus size={16} /> New Setting
          </button>
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
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="user-profile">
            <div className="avatar">
              <User size={18} />
            </div>
            <div className="user-info">
              <span className="username">Streaming Agent</span>
              <span className="user-plan">Pro Plan</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="chatgpt-main">
        {renderContent()}
      </main>
    </div>
  );
};

export default Dashboard;
