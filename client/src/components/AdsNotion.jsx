import React from 'react';
import './DashboardNotion.css';

const CAMPAIGNS = [
  { name: 'Nexon 30th Anniversary 🎂', rev: '$1,240', status: 'Live', perf: 'High' },
  { name: 'Gaming Chair Promo 🪑', rev: '$450', status: 'Paused', perf: 'Medium' },
  { name: 'Energy Drink Sponsor ⚡', rev: '$2,100', status: 'Live', perf: 'Outstanding' },
];

const AdsNotion = () => {
  return (
    <div className="notion-page-container">
      <div className="page-icon">📢</div>
      <h1 className="page-title serif-display">Ad Campaigns</h1>
      
      <div className="notion-callout">
        <div className="callout-icon">📈</div>
        <div className="callout-content">
           <div className="callout-text">Manage your sponsorships and track revenue performance.</div>
        </div>
      </div>

      <div className="spacer-lg"></div>

      <div className="notion-grid-2">
         <div className="notion-card">
            <div className="card-title">Monthly Revenue</div>
            <div className="card-metric">$3,790 <span className="trend-up">+15%</span></div>
         </div>
         <div className="notion-card">
            <div className="card-title">Active Campaigns</div>
            <div className="card-metric">2</div>
         </div>
      </div>

      <div className="spacer-lg"></div>

      <h3 className="section-header">Campaign List</h3>
      <div className="notion-database">
         <div className="database-header">
            <div className="db-col title-col">Campaign</div>
            <div className="db-col">Revenue</div>
            <div className="db-col">Status</div>
            <div className="db-col">Performance</div>
         </div>
         {CAMPAIGNS.map((ad, i) => (
            <div className="database-row" key={i}>
               <div className="db-col title-col"><span className="page-icon-sm">📄</span> {ad.name}</div>
               <div className="db-col">{ad.rev}</div>
               <div className="db-col">
                 <span className={`status-tag ${ad.status === 'Live' ? 'highlight' : 'completed'}`}>
                   {ad.status}
                 </span>
               </div>
               <div className="db-col"><span className="multi-select-tag">{ad.perf}</span></div>
            </div>
         ))}
      </div>
    </div>
  );
};

export default AdsNotion;
