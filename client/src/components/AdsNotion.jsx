import React from 'react';
import './DashboardNotion.css';

const CAMPAIGNS = [
  { name: 'Nexon 30th Anniversary 🎂', rev: '$1,240', status: 'Live', perf: 'High' },
  { name: 'Gaming Chair Promo 🪑', rev: '$450', status: 'Paused', perf: 'Medium' },
];

const AdsNotion = () => {
  return (
    <div className="notion-page-content animate-in">
      <div className="page-header-composition">
        <div className="brand-test-signal">Studio / Sponsorships</div>
        <h1 className="serif-display">Revenue Streams.</h1>
        <p className="subtitle">Monitor campaign performance and fiscal growth. Your influence, quantified.</p>
      </div>

      <div className="content-grid">
        <section className="data-section">
          <h3>Campaign KPIs</h3>
          <div className="notion-grid-2">
            <div className="stat-block">
              <div className="stat-label">Net Revenue</div>
              <div className="stat-value">$3,790 <span className="trend-up">+15%</span></div>
            </div>
            <div className="stat-block">
              <div className="stat-label">Active Slots</div>
              <div className="stat-value">02</div>
            </div>
          </div>
        </section>

        <section className="data-section">
          <h3>Active Inventory</h3>
          <div className="notion-database">
            {CAMPAIGNS.map((ad, i) => (
              <div className="database-row" key={i}>
                <div className="db-col title-col"><span className="page-icon-sm">📄</span> {ad.name}</div>
                <div className="db-col">{ad.rev}</div>
                <div className="db-col">
                  <span className={`status-tag ${ad.status === 'Live' ? 'highlight' : 'completed'}`}>
                    {ad.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdsNotion;
