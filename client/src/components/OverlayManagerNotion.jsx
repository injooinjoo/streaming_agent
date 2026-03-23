import React from 'react';
import './DashboardNotion.css';

const OVERLAYS = [
  { icon: '💬', name: 'Chat Box', status: 'Active', type: 'Chat', hash: 'c123' },
  { icon: '📢', name: 'Support Alert', status: 'Active', type: 'Alert', hash: 'a456' },
  { icon: '📊', name: 'Sub Goal', status: 'Inactive', type: 'Goal', hash: 'g789' },
  { icon: '🎭', name: 'Emoji Rain', status: 'Active', type: 'Emoji', hash: 'e012' },
];

const OverlayManagerNotion = () => {
  return (
    <div className="notion-page-container">
      <div className="page-icon">🎨</div>
      <h1 className="page-title serif-display">Overlay Manager</h1>
      
      <div className="notion-callout">
        <div className="callout-icon">✨</div>
        <div className="callout-content">
           <div className="callout-text">Manage your visual modules. Active overlays are synced in real-time.</div>
        </div>
      </div>

      <div className="spacer-lg"></div>

      <h3 className="section-header">My Overlays</h3>
      <div className="notion-database">
         <div className="database-header">
            <div className="db-col title-col">Name</div>
            <div className="db-col">Status</div>
            <div className="db-col">Type</div>
            <div className="db-col">Actions</div>
         </div>
         {OVERLAYS.map((overlay, i) => (
            <div className="database-row" key={i}>
               <div className="db-col title-col">
                 <span className="page-icon-sm">{overlay.icon}</span> 
                 {overlay.name}
               </div>
               <div className="db-col">
                 <span className={`status-tag ${overlay.status.toLowerCase() === 'active' ? 'highlight' : 'completed'}`}>
                   {overlay.status}
                 </span>
               </div>
               <div className="db-col"><span className="multi-select-tag">{overlay.type}</span></div>
               <div className="db-col">
                  <button className="btn-ghost" style={{padding: '2px 8px', fontSize: '12px'}}>Edit</button>
                  <button className="btn-ghost" style={{padding: '2px 8px', fontSize: '12px'}}>Copy Link</button>
               </div>
            </div>
         ))}
         <div className="database-new-row">+ Create New Overlay</div>
      </div>
    </div>
  );
};

export default OverlayManagerNotion;
