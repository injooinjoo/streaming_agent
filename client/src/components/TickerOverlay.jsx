import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { API_URL } from '../config/api';
import socket from '../config/socket';
import './Overlay.css';

const TickerOverlay = ({
  previewMode = false,
  previewSettings = null,
  previewMessages = null
}) => {
  const { userHash } = useParams();
  const [messages, setMessages] = useState([]);
  const [settings, setSettings] = useState({
    theme: 'default',
    autoHide: true,
    scrollSpeed: 15,
    fontSize: 22,
    textFormat: '{닉네임}: {채팅}'
  });

  const fetchSettings = async () => {
    try {
      const url = userHash
        ? `${API_URL}/api/overlay/${userHash}/settings/ticker`
        : `${API_URL}/api/settings/ticker`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.value && data.value !== '{}') {
        setSettings(JSON.parse(data.value));
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    }
  };

  useEffect(() => {
    // Skip API/Socket in preview mode
    if (previewMode) return;

    fetchSettings();

    if (userHash) {
      socket.emit("join-overlay", userHash);
    }

    socket.on('new-event', (event) => {
      // Add only chat or specific event types to ticker
      if (event.type === 'chat' || event.type === 'donation') {
        const text = settings.textFormat
          .replace('{닉네임}', event.sender)
          .replace('{채팅}', event.message || `${event.amount}원 후원`);

        setMessages(prev => [...prev, { id: Date.now(), text }]);

        // Auto remove after some time (optional, but good for keeping ticker fresh)
        setTimeout(() => {
          setMessages(prev => prev.slice(1));
        }, 30000);
      }
    });

    socket.on("settings-updated", (data) => {
      if (data.key === 'ticker') fetchSettings();
    });

    return () => {
      if (userHash) {
        socket.emit("leave-overlay", userHash);
      }
      socket.off('new-event');
      socket.off('settings-updated');
    };
  }, [userHash, settings.textFormat, previewMode]); // Re-bind if format changes

  // OBS 브라우저 소스용 투명 배경
  useEffect(() => {
    if (!previewMode) {
      document.body.classList.add('overlay-mode');
      return () => document.body.classList.remove('overlay-mode');
    }
  }, [previewMode]);

  // Use preview settings and messages if in preview mode
  const activeSettings = previewMode && previewSettings ? previewSettings : settings;
  const displayMessages = previewMode && previewMessages ? previewMessages : messages;

  if (!previewMode && activeSettings.autoHide && displayMessages.length === 0) return null;

  return (
    <div className={`ticker-overlay theme-${activeSettings.theme} ${previewMode ? 'preview-mode' : ''}`}>
      <div className="ticker-track">
        <div
          className="ticker-content"
          style={{
            animationDuration: `${activeSettings.scrollSpeed}s`,
            fontSize: `${activeSettings.fontSize}px`
          }}
        >
          {displayMessages.map((msg) => (
            <span key={msg.id} className="ticker-item">
              {msg.text} <span className="separator">///</span>
            </span>
          ))}
          {/* Duplicate for seamless loop if needed, simplistic for now */}
          {displayMessages.length > 0 && displayMessages.map((msg) => (
            <span key={`dup-${msg.id}`} className="ticker-item">
              {msg.text} <span className="separator">///</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TickerOverlay;
