import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronRight, ChevronDown, Plus, MoreHorizontal, Search, Settings, Menu } from 'lucide-react';
import './DashboardNotion.css';
import LoadingSpinner from './shared/LoadingSpinner';

const NConnectNotion = lazy(() => import('./NConnectNotion'));
const OverlayManagerNotion = lazy(() => import('./OverlayManagerNotion'));
const EventsNotion = lazy(() => import('./EventsNotion'));
const AdsNotion = lazy(() => import('./AdsNotion'));

// Platform icons as emojis for Notion style
const ICONS = {
  home: '🏠',
  analytics: '📊',
  overlays: '🎨',
  ads: '📢',
  events: '📅',
  settings: '⚙️',
  nconnect: '🤝',
  doc: '📄',
  video: '🎬'
};

const RECENT_STREAMS = [
  { id: 1, title: 'Late Night Gaming 🎮', date: 'Oct 24, 2023', viewers: 1240, status: 'Completed', tags: ['Gaming', 'Chill'] },
  { id: 2, title: 'Just Chatting with Subs 💬', date: 'Oct 22, 2023', viewers: 856, status: 'Completed', tags: ['Chatting'] },
  { id: 3, title: 'Ranked Grind 🏆', date: 'Oct 20, 2023', viewers: 2100, status: 'Highlight', tags: ['Gaming', 'Competitive'] },
];

const DashboardNotion = ({ user, mode = 'nconnect', initialTab }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(initialTab || (mode === 'streaming' ? 'home' : 'nconnect'));
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    workspace: true,
    overlays: true,
    studio: true
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleNavigate = (tab) => {
    setActiveTab(tab);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'nconnect': return <NConnectNotion />;
      case 'overlays': return <OverlayManagerNotion />;
      case 'events': return <EventsNotion />;
      case 'ads': return <AdsNotion />;
      case 'home':
        return (
          <div className="notion-page-content">
            <div className="page-cover"></div>
            <div className="page-icon">👋</div>
            <h1 className="page-title serif-display">Welcome back, {user?.displayName || 'Streamer'}</h1>
            
            <div className="notion-callout">
              <div className="callout-icon">💡</div>
              <div className="callout-content">
                <div className="callout-title">Quick Actions</div>
                <div className="callout-text">Start your stream or manage your current setup.</div>
                <div className="action-buttons">
                  <button className="btn-primary">Start Stream</button>
                  <button className="btn-ghost" onClick={() => handleNavigate('overlays')}>Edit Overlay</button>
                </div>
              </div>
            </div>

            <div className="spacer-lg"></div>

            <h3 className="section-header">Recent Streams</h3>
            <div className="notion-database">
              <div className="database-header">
                <div className="db-col title-col">Name</div>
                <div className="db-col">Date</div>
                <div className="db-col">Viewers</div>
                <div className="db-col">Status</div>
                <div className="db-col">Tags</div>
              </div>
              {RECENT_STREAMS.map(stream => (
                <div className="database-row" key={stream.id}>
                  <div className="db-col title-col">
                    <span className="page-icon-sm">📄</span>
                    {stream.title}
                  </div>
                  <div className="db-col text-muted">{stream.date}</div>
                  <div className="db-col">{stream.viewers.toLocaleString()}</div>
                  <div className="db-col">
                    <span className={`status-tag ${stream.status.toLowerCase()}`}>{stream.status}</span>
                  </div>
                  <div className="db-col">
                    {stream.tags.map(tag => (
                      <span className="multi-select-tag" key={tag}>{tag}</span>
                    ))}
                  </div>
                </div>
              ))}
              <div className="database-new-row">
                <Plus size={14} /> New
              </div>
            </div>

            <div className="spacer-lg"></div>

            <h3 className="section-header">Overview</h3>
            <div className="notion-grid-2">
                <div className="notion-card">
                  <div className="card-icon">📈</div>
                  <div className="card-title">Average Viewers</div>
                  <div className="card-metric">1,240 <span className="trend-up">+12%</span></div>
                </div>
                <div className="notion-card">
                  <div className="card-icon">💰</div>
                  <div className="card-title">Revenue</div>
                  <div className="card-metric">$3,450 <span className="trend-up">+5%</span></div>
                </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="notion-page-content">
            <div className="page-icon">🚧</div>
            <h1 className="page-title serif-display">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h1>
            <div className="notion-callout">
               <div className="callout-icon">ℹ️</div>
               <div className="callout-content">This page is under construction in the new design system.</div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="notion-app">
      {/* Sidebar */}
      <aside className={`notion-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="user-profile">
            <span className="user-avatar">👤</span>
            <span className="user-name">{user?.displayName || 'Streamer'}</span>
            <ChevronDown size={14} className="text-muted" />
          </div>
          <button className="icon-btn" onClick={() => setSidebarOpen(false)}>{'<<'}</button>
        </div>

        <div className="sidebar-scroll">
          <div className="sidebar-section">
            <div className="section-title" onClick={() => toggleSection('workspace')}>
              {expandedSections.workspace ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <span>Workspace</span>
            </div>
            {expandedSections.workspace && (
              <div className="section-content">
                <div className={`nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => handleNavigate('home')}>
                  <span className="nav-icon">{ICONS.home}</span>
                  <span className="nav-text">Dashboard</span>
                </div>
                <div className={`nav-item ${activeTab === 'nconnect' ? 'active' : ''}`} onClick={() => handleNavigate('nconnect')}>
                  <span className="nav-icon">{ICONS.nconnect}</span>
                  <span className="nav-text">N-Connect</span>
                </div>
                <div className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => handleNavigate('analytics')}>
                  <span className="nav-icon">{ICONS.analytics}</span>
                  <span className="nav-text">Analytics</span>
                </div>
              </div>
            )}
          </div>

          <div className="sidebar-section">
            <div className="section-title" onClick={() => toggleSection('studio')}>
              {expandedSections.studio ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <span>Studio</span>
            </div>
            {expandedSections.studio && (
              <div className="section-content">
                <div className={`nav-item ${activeTab === 'overlays' ? 'active' : ''}`} onClick={() => handleNavigate('overlays')}>
                  <span className="nav-icon">{ICONS.overlays}</span>
                  <span className="nav-text">Overlays</span>
                </div>
                <div className={`nav-item ${activeTab === 'events' ? 'active' : ''}`} onClick={() => handleNavigate('events')}>
                  <span className="nav-icon">{ICONS.events}</span>
                  <span className="nav-text">Events</span>
                </div>
                <div className={`nav-item ${activeTab === 'ads' ? 'active' : ''}`} onClick={() => handleNavigate('ads')}>
                  <span className="nav-icon">{ICONS.ads}</span>
                  <span className="nav-text">Ads</span>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="sidebar-footer">
           <div className="nav-item" onClick={() => handleNavigate('settings')}>
              <span className="nav-icon">{ICONS.settings}</span>
              <span className="nav-text">Settings</span>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="notion-main">
        <header className="notion-topbar">
          {!sidebarOpen && (
            <button className="icon-btn" onClick={() => setSidebarOpen(true)}>
              <Menu size={18} />
            </button>
          )}
          <div className="breadcrumbs">
            <span>Workspace</span>
            <span className="separator">/</span>
            <span>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</span>
          </div>
          <div className="topbar-actions">
            <button className="text-btn">Share</button>
            <button className="icon-btn"><Search size={18} /></button>
            <button className="icon-btn"><MoreHorizontal size={18} /></button>
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
