import React from 'react';
import './DashboardNotion.css';

const SCHEDULE = [
  { day: 'Oct 23', title: 'Ranked Sequence 04 🎮', time: '20:00', status: 'Confirmed' },
  { day: 'Oct 25', title: 'Intel Sync: Q&A 💬', time: '21:00', status: 'Scheduled' },
];

const EventsNotion = () => {
  return (
    <div className="notion-page-content animate-in">
      <div className="page-header-composition">
        <div className="brand-test-signal">Studio / Schedule</div>
        <h1 className="serif-display">Broadcast Timeline.</h1>
        <p className="subtitle">Coordinate your sequences. Precision timing for maximum engagement.</p>
        <div className="action-row">
          <button className="btn-primary">Add Event</button>
        </div>
      </div>

      <div className="data-section">
        <h3>October Sequence</h3>
        <div className="notion-database">
          {SCHEDULE.map((event, i) => (
            <div className="database-row" key={i}>
              <div className="db-col title-col"><span className="page-icon-sm">📅</span> {event.title}</div>
              <div className="db-col text-muted">{event.day}</div>
              <div className="db-col">{event.time}</div>
              <div className="db-col"><span className="status-tag highlight">{event.status}</span></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EventsNotion;
