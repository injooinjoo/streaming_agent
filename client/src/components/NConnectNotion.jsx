import React from 'react';
import './DashboardNotion.css';

const NCONNECT_PAGES = [
  { icon: '📢', title: 'Notices', desc: 'Protocol updates and agent synchronization logs.' },
  { icon: '🎨', title: 'Asset Hub', desc: 'Community-contributed visual modules and presets.' },
  { icon: '💬', title: 'Relay Chat', desc: 'Direct communication channel between active agents.' },
];

const RECENT_DISCUSSIONS = [
  { title: 'Optimization: Llama-3 module response latency', author: 'Agent_01', replies: 12, tag: 'Performance' },
  { title: 'New Layout: Ink-on-Vellum workspace feedback', author: 'Design_Lead', replies: 45, tag: 'UI/UX' },
];

const NConnectNotion = () => {
  return (
    <div className="notion-page-content animate-in">
      <div className="page-header-composition">
        <div className="brand-test-signal">N-Connect</div>
        <h1 className="serif-display">Collaborative Intelligence.</h1>
        <p className="subtitle">Sync with the network. Share assets, discuss protocols, and expand your capabilities.</p>
      </div>
      
      <div className="content-grid">
        <section className="data-section">
          <h3>Directory</h3>
          <div className="notion-grid-2">
            {NCONNECT_PAGES.map((page, i) => (
              <div className="nav-item" key={i} style={{padding: '16px 0', borderBottom: '1px solid var(--border-subtle)'}}>
                <span style={{fontSize: '24px', marginRight: '16px'}}>{page.icon}</span>
                <div>
                  <div style={{fontWeight: 600}}>{page.title}</div>
                  <div className="text-muted" style={{fontSize: '0.85rem'}}>{page.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="data-section">
          <h3>Recent Commits</h3>
          <div className="notion-database">
            {RECENT_DISCUSSIONS.map((disc, i) => (
              <div className="database-row" key={i}>
                <div className="db-col title-col">
                  <span className="page-icon-sm">📄</span> {disc.title}
                </div>
                <div className="db-col text-muted" style={{fontSize: '0.8rem'}}>{disc.author}</div>
                <div className="db-col"><span className="status-tag highlight">{disc.tag}</span></div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default NConnectNotion;
