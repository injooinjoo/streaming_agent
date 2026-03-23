import React from 'react';
import './DashboardNotion.css';

const OVERLAYS = [
  { icon: '💬', name: 'Chat Box', status: 'Active', type: 'Chat' },
  { icon: '📢', name: 'Support Alert', status: 'Active', type: 'Alert' },
  { icon: '📊', name: 'Sub Goal', status: 'Standby', type: 'Goal' },
];

const OverlayManagerNotion = () => {
  return (
    <div className="notion-page-content animate-in">
      <div className="page-header-composition">
        <div className="brand-test-signal">Studio / Modules</div>
        <h1 className="serif-display">Visual Protocols.</h1>
        <p className="subtitle">Manage the visual interface of your broadcast. Every pixel serves a purpose.</p>
        <div className="action-row">
          <button className="btn-primary">New Module</button>
        </div>
      </div>

      <div className="data-section">
        <h3>Active Configuration</h3>
        <div className="notion-database">
          <div className="database-header">
            <div className="db-col title-col">Module Name</div>
            <div className="db-col">Status</div>
            <div className="db-col">Protocol</div>
            <div className="db-col">Control</div>
          </div>
          {OVERLAYS.map((overlay, i) => (
            <div className="database-row" key={i}>
              <div className="db-col title-col">
                <span className="page-icon-sm" style={{marginRight: '12px'}}>{overlay.icon}</span> 
                {overlay.name}
              </div>
              <div className="db-col">
                <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  {overlay.status === 'Active' && <span className="pulse-indicator"></span>}
                  <span className={`status-tag ${overlay.status === 'Active' ? 'highlight' : 'completed'}`}>
                    {overlay.status}
                  </span>
                </div>
              </div>
              <div className="db-col"><span className="multi-select-tag">{overlay.type}</span></div>
              <div className="db-col">
                <button className="btn-ghost">Edit</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OverlayManagerNotion;
