import React from 'react';
import './DashboardNotion.css';

const TOP_CREATORS = [
  { rank: 1, name: 'Agent_Zero', points: '12,450', status: 'Rising' },
  { rank: 2, name: 'InJooKim', points: '11,200', status: 'Stable' },
  { rank: 3, name: 'Protocol_X', points: '9,800', status: 'Rising' },
];

const PopularRankingNotion = () => {
  return (
    <div className="notion-page-content animate-in">
      <div className="page-header-composition">
        <div className="brand-test-signal">N-Connect / Ranking</div>
        <h1 className="serif-display">Network Authority.</h1>
        <p className="subtitle">The highest performing nodes in the intelligence network. Points quantify contribution and influence.</p>
      </div>

      <div className="data-section">
        <h3>Top Contributors</h3>
        <div className="notion-database">
          <div className="database-header">
            <div className="db-col" style={{flex: '0 0 60px'}}>Rank</div>
            <div className="db-col title-col">Identity</div>
            <div className="db-col">Impact Points</div>
            <div className="db-col">Trend</div>
          </div>
          {TOP_CREATORS.map((user, i) => (
            <div className="database-row" key={i}>
              <div className="db-col" style={{flex: '0 0 60px', fontWeight: 700}}>#{user.rank}</div>
              <div className="db-col title-col"><span className="page-icon-sm">👤</span> {user.name}</div>
              <div className="db-col">{user.points}</div>
              <div className="db-col">
                <span className={`status-tag ${user.status === 'Rising' ? 'highlight' : 'completed'}`}>
                  {user.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PopularRankingNotion;
