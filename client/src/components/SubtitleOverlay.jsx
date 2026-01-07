import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { Medal } from 'lucide-react';
import './Overlay.css';

const socket = io('http://localhost:3001');

const SubtitleOverlay = () => {
  const [events, setEvents] = useState([]);
  const [settings, setSettings] = useState({
    theme: 'default',
    mode: 'recent',
    fontSize: 24,
    showMedals: true,
    textFormat: '{닉네임} {금액}'
  });

  const fetchSettings = async () => {
    const res = await fetch('http://localhost:3001/api/settings/subtitle');
    const data = await res.json();
    if (data.value && data.value !== '{}') {
      setSettings(JSON.parse(data.value));
    }
  };

  const fetchEvents = async () => {
    const res = await fetch('http://localhost:3001/api/events');
    const data = await res.json();
    setEvents(data.filter(e => e.type === 'donation'));
  };

  useEffect(() => {
    fetchSettings();
    fetchEvents();

    socket.on('new-event', (event) => {
      if (event.type === 'donation') fetchEvents();
    });

    socket.on('settings-updated', (data) => {
      if (data.key === 'subtitle') fetchSettings();
    });

    return () => {
      socket.off('new-event');
      socket.off('settings-updated');
    };
  }, []);

  const renderContent = () => {
    if (settings.mode === 'recent') {
      const latest = events[0];
      if (!latest) return "수신 대기 중...";
      return settings.textFormat
        .replace('{닉네임}', latest.sender)
        .replace('{금액}', `${latest.amount.toLocaleString()}원`);
    }
    
    if (settings.mode === 'ranking') {
      // Group by sender and sum amounts
      const ranks = events.reduce((acc, curr) => {
        acc[curr.sender] = (acc[curr.sender] || 0) + curr.amount;
        return acc;
      }, {});
      const sorted = Object.entries(ranks)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3);

      return (
        <div className="ranking-list">
          {sorted.map(([name, amount], idx) => (
            <div key={name} className="ranking-item">
              {settings.showMedals && <Medal size={settings.fontSize} className={`medal-${idx + 1}`} />}
              <span>{name} {amount.toLocaleString()}원</span>
            </div>
          ))}
        </div>
      );
    }

    return "준비 중...";
  };

  return (
    <div className={`subtitle-overlay theme-${settings.theme}`}>
      <div className="subtitle-container glass" style={{ fontSize: `${settings.fontSize}px` }}>
        {renderContent()}
      </div>
    </div>
  );
};

export default SubtitleOverlay;
