import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { API_URL } from '../config/api';
import './Overlay.css';

const socket = io(API_URL);

const CreditsOverlay = () => {
  const { userHash } = useParams();
  const [isPlaying, setIsPlaying] = useState(false);
  const [credits, setCredits] = useState(null);
  const [settings, setSettings] = useState({
    theme: 'dark',
    scrollSpeed: 3,
    fontFamily: 'Pretendard',
    backgroundColor: 'rgba(0, 0, 0, 0.9)'
  });

  const fetchSettings = async () => {
    try {
      const url = userHash
        ? `${API_URL}/api/overlay/${userHash}/settings/credits`
        : `${API_URL}/api/settings/credits`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.value && data.value !== '{}') {
        setSettings(prev => ({ ...prev, ...JSON.parse(data.value) }));
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    }
  };

  useEffect(() => {
    fetchSettings();

    if (userHash) {
      socket.emit("join-overlay", userHash);
    }

    socket.on('credits-start', (data) => {
      setCredits(data);
      setIsPlaying(true);
    });

    socket.on('credits-stop', () => {
      setIsPlaying(false);
      setCredits(null);
    });

    socket.on('settings-updated', (data) => {
      if (data.key === 'credits') fetchSettings();
    });

    return () => {
      if (userHash) {
        socket.emit("leave-overlay", userHash);
      }
      socket.off('credits-start');
      socket.off('credits-stop');
      socket.off('settings-updated');
    };
  }, [userHash]);

  if (!isPlaying || !credits) return null;

  const scrollDuration = (settings.scrollSpeed || 3) * 10; // Higher speed = slower scroll

  return (
    <div
      className={`credits-overlay theme-${settings.theme}`}
      style={{
        backgroundColor: settings.backgroundColor,
        fontFamily: settings.fontFamily
      }}
    >
      <div
        className="credits-container"
        style={{
          animation: `scrollUp ${scrollDuration}s linear forwards`
        }}
      >
        {credits.title && (
          <div className="credits-title">{credits.title}</div>
        )}

        {credits.sections && credits.sections.map((section, index) => (
          <div key={index} className="credits-section">
            <div className="section-title">{section.title}</div>
            <div className="section-items">
              {section.items && section.items.map((item, itemIndex) => (
                <div key={itemIndex} className="credits-item">
                  {typeof item === 'string' ? item : (
                    <>
                      <span className="item-name">{item.name}</span>
                      {item.role && <span className="item-role">{item.role}</span>}
                      {item.amount && <span className="item-amount">{item.amount.toLocaleString()}원</span>}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="credits-footer">
          <div className="thanks-message">
            시청해 주셔서 감사합니다!
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreditsOverlay;
