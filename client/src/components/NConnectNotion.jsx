import React from 'react';
import './DashboardNotion.css'; // Reusing styles

const NCONNECT_PAGES = [
  { icon: '📢', title: 'Notices', desc: 'Official updates & patch notes' },
  { icon: '🎨', title: 'Fan Art', desc: 'Community creations' },
  { icon: '💬', title: 'General Chat', desc: 'Hangout with viewers' },
  { icon: '🏆', title: 'Rankings', desc: 'Top contributors this month' },
];

const RECENT_DISCUSSIONS = [
  { title: 'New Overlay Feedback', author: 'Mod_Dave', replies: 12, tag: 'Feedback' },
  { title: 'Stream Schedule Update', author: 'Streamer', replies: 45, tag: 'Announcement' },
  { title: 'Game Suggestion: Baldur\'s Gate 3', author: 'Fan123', replies: 8, tag: 'Gaming' },
];

const NConnectNotion = () => {
  return (
    <div className="notion-page-container">
      <div className="page-icon">🤝</div>
      <h1 className="page-title serif-display">N-Connect Community</h1>
      
      <div className="notion-callout">
        <div className="callout-icon">ℹ️</div>
        <div className="callout-content">
           <div className="callout-text">Welcome to the community hub. Be respectful and have fun!</div>
        </div>
      </div>

      <div className="spacer-lg"></div>

      <h3 className="section-header">Community Board</h3>
      <div className="notion-grid-2">
        {NCONNECT_PAGES.map((page, i) => (
          <div className="notion-card hover-effect" key={i}>
             <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                <span style={{fontSize: '24px'}}>{page.icon}</span>
                <div>
                   <div style={{fontWeight: 600}}>{page.title}</div>
                   <div className="text-muted" style={{fontSize: '13px'}}>{page.desc}</div>
                </div>
             </div>
          </div>
        ))}
      </div>

      <div className="spacer-lg"></div>

      <h3 className="section-header">Recent Discussions</h3>
      <div className="notion-database">
         <div className="database-header">
            <div className="db-col title-col">Topic</div>
            <div className="db-col">Author</div>
            <div className="db-col">Replies</div>
            <div className="db-col">Tag</div>
         </div>
         {RECENT_DISCUSSIONS.map((disc, i) => (
            <div className="database-row" key={i}>
               <div className="db-col title-col"><span className="page-icon-sm">📄</span> {disc.title}</div>
               <div className="db-col">{disc.author}</div>
               <div className="db-col">{disc.replies}</div>
               <div className="db-col"><span className="multi-select-tag">{disc.tag}</span></div>
            </div>
         ))}
         <div className="database-new-row">+ New Topic</div>
      </div>
    </div>
  );
};

export default NConnectNotion;
