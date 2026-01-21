import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Medal } from 'lucide-react';
import { API_URL } from '../config/api';
import socket from '../config/socket';
import './Overlay.css';

const SubtitleOverlay = () => {
  const { userHash } = useParams();
  const [events, setEvents] = useState([]);
  const [settings, setSettings] = useState({
    theme: 'default',
    mode: 'recent',
    fontSize: 24,
    showMedals: true,
    textFormat: '{닉네임} {금액}'
  });

  const fetchSettings = async () => {
    try {
      const url = userHash
        ? `${API_URL}/api/overlay/${userHash}/settings/subtitle`
        : `${API_URL}/api/settings/subtitle`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.value && data.value !== '{}') {
        setSettings(JSON.parse(data.value));
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    }
  };

  const fetchEvents = async () => {
    const res = await fetch(`${API_URL}/api/events`);
    const data = await res.json();
    setEvents(data.filter(e => e.type === 'donation'));
  };

  useEffect(() => {
    fetchSettings();
    fetchEvents();

    if (userHash) {
      socket.emit("join-overlay", userHash);
    }

    socket.on('new-event', (event) => {
      if (event.type === 'donation') fetchEvents();
    });

    socket.on('settings-updated', (data) => {
      if (data.key === 'subtitle') fetchSettings();
    });

    return () => {
      if (userHash) {
        socket.emit("leave-overlay", userHash);
      }
      socket.off('new-event');
      socket.off('settings-updated');
    };
  }, [userHash]);

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
