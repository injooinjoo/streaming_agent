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
      label: 'Main Menu',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: <Layout size={18} /> },
        { id: 'chat', label: 'Chat Overlay', icon: <MessageSquare size={18} /> },
        { id: 'alerts', label: 'Donation Alerts', icon: <Bell size={18} /> }
      ]
    },
    {
      label: 'Custom Widgets',
      items: [
        { id: 'subtitles', label: 'Subtitles', icon: <FileText size={18} /> },
        { id: 'goals', label: 'Goal Tracker', icon: <BarChart3 size={18} /> },
        { id: 'ticker', label: 'News Ticker', icon: <Megaphone size={18} /> },
        { id: 'text', label: 'Custom Text', icon: <Type size={18} /> },
        { id: 'banners', label: 'Banners', icon: <ImageIcon size={18} /> },
        { id: 'design', label: 'Design Customizer', icon: <Palette size={18} /> }
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
      alert("Please enter a sender name.");
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
              <h1>Welcome back, Streamer! 👋</h1>
              <p>Here's what's happening with your stream today.</p>
            </div>
            <div className="header-buttons">
              <button className="btn-outline">
                <HelpCircle size={16} /> Feedback
              </button>
              <button className="btn-primary" onClick={() => window.open('/overlay/chat', '_blank')}>
                <ExternalLink size={16} /> Open Overlay
              </button>
            </div>
          </header>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-header">
                <span>Total Donations</span>
                <HelpCircle size={14} />
              </div>
              <div className="stat-content">
                <span className="value">₩{stats.todayDonation.toLocaleString()}</span>
                <span className="subtext">From today's streaming</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-header">
                <span>Peak Viewers</span>
                <HelpCircle size={14} />
              </div>
              <div className="stat-content">
                <span className="value">{stats.peakViewers.toLocaleString()}</span>
                <span className="subtext">24% increase from yesterday</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-header">
                <span>New Subscriptions</span>
                <HelpCircle size={14} />
              </div>
              <div className="stat-content">
                <span className="value">{stats.newSubs}</span>
                <span className="subtext">Across all platforms</span>
              </div>
            </div>
          </div>

          <div className="tabs-container">
            <button className="tab-btn active">Activity Feed</button>
            <button className="tab-btn">Pending Events</button>
            <button className="tab-btn">Analytics</button>
          </div>

          <div className="table-container">
            <div className="table-header">
              <span>EVENT TYPE</span>
              <span>STATUS</span>
              <span>SENDER</span>
              <span>AMOUNT / MESSAGE</span>
              <span style={{ textAlign: 'right' }}>TIME</span>
            </div>
            <div className="table-list">
              {events.length === 0 ? (
                <div className="empty-state">No recent activity found.</div>
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
                        {ev.type === 'donation' ? 'Donation' : 'Chat'}
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
            <div className="card-title">Event Simulator</div>
            <p className="card-subtitle">Test your overlays by simulating live events.</p>
            <div className="simulator-form">
              <div className="input-group">
                <label>Event Type</label>
                <select value={simulation.type} onChange={(e) => setSimulation({ ...simulation, type: e.target.value })}>
                  <option value="chat">Chat Message</option>
                  <option value="donation">Donation Event</option>
                </select>
              </div>
              <div className="input-group">
                <label>Platform</label>
                <select value={simulation.platform} onChange={(e) => setSimulation({ ...simulation, platform: e.target.value })}>
                  <option value="twitch">Twitch</option>
                  <option value="youtube">YouTube</option>
                  <option value="chzzk">CHZZK</option>
                  <option value="soop">SOOP</option>
                </select>
              </div>
              <div className="input-group">
                <label>Username / ID</label>
                <input
                  type="text"
                  placeholder="e.g. GuestUser"
                  value={simulation.sender}
                  onChange={(e) => setSimulation({ ...simulation, sender: e.target.value })}
                />
              </div>
              {simulation.type === 'donation' ? (
                <div className="input-group">
                  <label>Amount (KRW)</label>
                  <input
                    type="number"
                    value={simulation.amount}
                    onChange={(e) => setSimulation({ ...simulation, amount: parseInt(e.target.value, 10) })}
                  />
                </div>
              ) : (
                <div className="input-group">
                  <label>Message Content</label>
                  <input
                    type="text"
                    placeholder="Hello stream!"
                    value={simulation.message}
                    onChange={(e) => setSimulation({ ...simulation, message: e.target.value })}
                  />
                </div>
              )}
              <div className="full-width">
                <button 
                  className="btn-primary" 
                  style={{ width: '100%', justifyContent: 'center', height: '44px' }}
                  onClick={triggerSimulate}
                  disabled={isSimulating}
                >
                  {isSimulating ? <RefreshCw size={18} className="spin" /> : <Send size={18} />}
                  {isSimulating ? 'Sending...' : 'Simulate Event'}
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
    }[activeTab];

    if (ActiveComponent) return <ActiveComponent />;

    return (
      <div className="animate-fade">
        <header className="page-header">
          <div className="page-title">
            <h1>{menuItems.find(m => m.id === activeTab)?.label} Settings</h1>
            <p>Customize this widget to match your stream's aesthetic.</p>
          </div>
        </header>
        <div className="placeholder-view">
          <Settings size={64} style={{ color: 'var(--border-medium)' }} strokeWidth={1} />
          <h3 style={{ color: 'var(--text-main)', marginTop: '20px' }}>Feature coming soon</h3>
          <p>We are working hard to bring you more customization options.</p>
          <button className="btn-outline" style={{ marginTop: '24px' }} onClick={() => setActiveTab('dashboard')}>
            Back to Dashboard
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
            <span>StreamAgent</span>
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
            <div className="avatar">JD</div>
            <div className="user-info">
              <span className="username" style={{ color: 'var(--text-main)' }}>Jacob Mac</span>
              <span className="user-plan">Pro Streamer</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="chatgpt-main">
        <header className="top-nav">
          <div className="search-container">
            <BarChart3 className="search-icon" size={16} />
            <input type="text" placeholder="Search for anything..." />
          </div>
          <div className="top-actions">
            <button className="action-icon-btn"><Bell size={18} /></button>
            <button className="action-icon-btn"><Settings size={18} /></button>
            <button className="btn-primary" style={{ padding: '8px 16px', borderRadius: '50px' }}>
              Go Live
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
