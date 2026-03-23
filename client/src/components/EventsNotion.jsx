import React from 'react';
import './DashboardNotion.css';

const SCHEDULE = [
  { day: 'Mon, Oct 23', title: 'Weekly Ranked Grind 🎮', time: '20:00 - 23:00', status: 'Upcoming' },
  { day: 'Wed, Oct 25', title: 'Community Talk & Q&A 💬', time: '21:00 - 23:00', status: 'Scheduled' },
  { day: 'Sat, Oct 28', title: 'Special 24h Charity Stream ✨', time: '12:00 - 12:00', status: 'Special' },
];

const EventsNotion = () => {
  return (
    <div className="notion-page-container">
      <div className="page-icon">📅</div>
      <h1 className="page-title serif-display">Stream Schedule</h1>
      
      <div className="notion-callout">
        <div className="callout-icon">🗓️</div>
        <div className="callout-content">
           <div className="callout-text">Your upcoming broadcasts and community events. Shared with your Discord automatically.</div>
        </div>
      </div>

      <div className="spacer-lg"></div>

      <h3 className="section-header">October 2023</h3>
      <div className="notion-database">
         <div className="database-header">
            <div className="db-col title-col">Event</div>
            <div className="db-col">Date</div>
            <div className="db-col">Time</div>
            <div className="db-col">Status</div>
         </div>
         {SCHEDULE.map((event, i) => (
            <div className="database-row" key={i}>
               <div className="db-col title-col"><span className="page-icon-sm">📄</span> {event.title}</div>
               <div className="db-col text-muted">{event.day}</div>
               <div className="db-col">{event.time}</div>
               <div className="db-col">
                 <span className={`status-tag ${event.status === 'Upcoming' ? 'highlight' : 'completed'}`}>
                   {event.status}
                 </span>
               </div>
            </div>
         ))}
         <div className="database-new-row">+ Add Event</div>
      </div>
    </div>
  );
};

export default EventsNotion;
