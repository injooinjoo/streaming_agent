import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronRight, ChevronDown, Plus, MoreHorizontal, Search, Settings, Menu } from 'lucide-react';
import './DashboardNotion.css';
import LoadingSpinner from './shared/LoadingSpinner';

const NConnectNotion = lazy(() => import('./NConnectNotion'));
const OverlayManagerNotion = lazy(() => import('./OverlayManagerNotion'));
const EventsNotion = lazy(() => import('./EventsNotion'));
const AdsNotion = lazy(() => import('./AdsNotion'));
const PopularRankingNotion = lazy(() => import('./PopularRankingNotion'));

const ICONS = {
  home: '🏠',
  analytics: '📊',
  overlays: '🎨',
  ads: '📢',
  events: '📅',
  settings: '⚙️',
  nconnect: '🤝',
  ranking: '🏆',
  doc: '📄'
};

const RECENT_STREAMS = [
  { id: 1, title: 'Late Night Gaming 🎮', date: 'Oct 24, 2023', viewers: 1240, status: 'Completed', tags: ['Gaming'] },
  { id: 2, title: 'Just Chatting with Subs 💬', date: 'Oct 22, 2023', viewers: 856, status: 'Completed', tags: ['Chatting'] },
];

const DashboardNotion = ({ user, mode = 'nconnect', initialTab }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(initialTab || (mode === 'streaming' ? 'home' : 'nconnect'));
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleNavigate = (tab) => setActiveTab(tab);

  const renderContent = () => {
    switch (activeTab) {
      case 'nconnect': return <NConnectNotion />;
      case 'overlays': return <OverlayManagerNotion />;
      case 'events': return <EventsNotion />;
      case 'ads': return <AdsNotion />;
      case 'ranking': return <PopularRankingNotion />;
      case 'home':
        return (
          <div className="notion-page-content animate-in">
            <div className="page-header-composition">
              <div className="brand-test-signal">Streaming Agent</div>
              <h1 className="serif-display">Your broadcast, refined.</h1>
              <p className="subtitle">High-precision tools for modern streamers.</p>
              <div className="action-row">
                <button className="btn-primary">Start Sequence</button>
                <button className="btn-ghost" onClick={() => handleNavigate('overlays')}>Configure Modules</button>
              </div>
            </div>

            <div className="content-grid">
              <section className="data-section">
                <h3>Recent Activity</h3>
                <div className="notion-database">
                  {RECENT_STREAMS.map(stream => (
                    <div className="database-row" key={stream.id}>
                      <div className="db-col title-col">
                        <span className="page-icon-sm">📄</span> {stream.title}
                      </div>
                      <div className="db-col text-muted">{stream.date}</div>
                      <div className="db-col">{stream.viewers.toLocaleString()}</div>
                      <div className="db-col"><span className="status-tag completed">{stream.status}</span></div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="data-section">
                <h3>Live Metrics</h3>
                <div className="notion-grid-2">
                  <div className="stat-block">
                    <div className="stat-label">Avg. Audience</div>
                    <div className="stat-value">1,240 <span className="pulse-indicator"></span></div>
                  </div>
                  <div className="stat-block">
                    <div className="stat-label">Stream Revenue</div>
                    <div className="stat-value">$3,450</div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        );
      default:
        return (
          <div className="notion-page-content animate-in">
            <h1 className="serif-display">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h1>
            <p className="text-muted">Module synchronization in progress.</p>
          </div>
        );
    }
  };

  return (
    <div className="workspace-container">
      <aside className={`notion-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="brand-signal">Agent.</div>
          <button className="icon-btn" onClick={() => setSidebarOpen(false)}>{'<<'}</button>
        </div>

        <div className="sidebar-scroll">
          <div className="sidebar-section">
            <div className="section-content">
              <div className={`nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => handleNavigate('home')}>
                <span className="nav-icon">{ICONS.home}</span>
                <span className="nav-text">Workspace</span>
              </div>
              <div className={`nav-item ${activeTab === 'nconnect' ? 'active' : ''}`} onClick={() => handleNavigate('nconnect')}>
                <span className="nav-icon">{ICONS.nconnect}</span>
                <span className="nav-text">Community</span>
              </div>
              <div className={`nav-item ${activeTab === 'ranking' ? 'active' : ''}`} onClick={() => handleNavigate('ranking')}>
                <span className="nav-icon">{ICONS.ranking}</span>
                <span className="nav-text">Ranking</span>
              </div>
            </div>
          </div>

          <div className="sidebar-section">
            <div className="section-title"><span>Studio</span></div>
            <div className="section-content">
              {['overlays', 'events', 'ads'].map(tab => (
                <div key={tab} className={`nav-item ${activeTab === tab ? 'active' : ''}`} onClick={() => handleNavigate(tab)}>
                  <span className="nav-icon">{ICONS[tab]}</span>
                  <span className="nav-text">{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="sidebar-footer">
           <div className="nav-item user-nav">
              <span className="nav-icon">👤</span>
              <span className="nav-text">{user?.displayName || 'InJooKim'}</span>
           </div>
        </div>
      </aside>

      <main className="main-surface">
        <header className="notion-topbar">
          {!sidebarOpen && <button className="icon-btn" onClick={() => setSidebarOpen(true)}><Menu size={18} /></button>}
          <div className="breadcrumbs">
            <span>Agent</span><span className="separator">/</span><span>{activeTab}</span>
          </div>
          <div className="topbar-actions">
            <button className="icon-btn"><Search size={18} /></button>
            <button className="icon-btn"><Settings size={18} /></button>
          </div>
        </header>

        <Suspense fallback={<LoadingSpinner />}>
           {renderContent()}
        </Suspense>
      </main>
    </div>
  );
};

export default DashboardNotion;
