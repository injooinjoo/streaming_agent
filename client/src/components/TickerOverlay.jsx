import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import './Overlay.css';

const socket = io('http://localhost:3001');

const TickerOverlay = () => {
  const [messages, setMessages] = useState([]);
  const [settings, setSettings] = useState({
    theme: 'default',
    autoHide: true,
    scrollSpeed: 15,
    fontSize: 22,
    textFormat: '{닉네임}: {채팅}'
  });

  const fetchSettings = async () => {
    const res = await fetch('http://localhost:3001/api/settings/ticker');
    const data = await res.json();
    if (data.value && data.value !== '{}') {
      setSettings(JSON.parse(data.value));
    }
  };

  useEffect(() => {
    fetchSettings();

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
      socket.off('new-event');
      socket.off('settings-updated');
    };
  }, [settings.textFormat]); // Re-bind if format changes

  if (settings.autoHide && messages.length === 0) return null;

  return (
    <div className={`ticker-overlay theme-${settings.theme}`}>
      <div className="ticker-track">
        <div 
          className="ticker-content" 
          style={{ 
            animationDuration: `${settings.scrollSpeed}s`,
            fontSize: `${settings.fontSize}px`
          }}
        >
          {messages.map((msg) => (
            <span key={msg.id} className="ticker-item">
              {msg.text} <span className="separator">///</span>
            </span>
          ))}
          {/* Duplicate for seamless loop if needed, simplistic for now */}
          {messages.length > 0 && messages.map((msg) => (
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
