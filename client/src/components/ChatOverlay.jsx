import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import "./Overlay.css";

const socket = io("http://localhost:3001");

const ChatOverlay = () => {
  const [messages, setMessages] = useState([]);
  const [settings, setSettings] = useState({
    theme: 'default',
    alignment: 'left',
    animation: 'fadeInUp',
    fontSize: 24,
    transparency: 100,
    showIcons: true
  });

  const fetchSettings = async () => {
    const res = await fetch('http://localhost:3001/api/settings/chat');
    const data = await res.json();
    if (data.value && data.value !== '{}') {
      setSettings(JSON.parse(data.value));
    }
  };

  useEffect(() => {
    fetchSettings();

    socket.on("new-event", (event) => {
      if (event.type === "chat") {
        setMessages((prev) => [...prev.slice(-19), event]);
      }
    });

    socket.on("settings-updated", (data) => {
      if (data.key === 'chat') fetchSettings();
    });

    return () => {
      socket.off("new-event");
      socket.off("settings-updated");
    };
  }, []);

  const getAnimationClass = () => {
    switch (settings.animation) {
      case 'slideInRight': return 'animate-slide-right';
      case 'bounceIn': return 'animate-bounce-in';
      case 'zoomIn': return 'animate-zoom-in';
      default: return 'animate-fade-up';
    }
  };

  return (
    <div 
      className={`chat-overlay theme-${settings.theme}`} 
      style={{ 
        alignItems: settings.alignment === 'center' ? 'center' : settings.alignment === 'right' ? 'flex-end' : 'flex-start',
        opacity: settings.transparency / 100
      }}
    >
      {messages.map((msg, index) => (
        <div 
          key={msg.id || index} 
          className={`chat-message glass ${getAnimationClass()}`}
          style={{ fontSize: `${settings.fontSize}px` }}
        >
          {settings.showIcons && (
            <span className={`platform-badge ${msg.platform}`}>
              {msg.platform}
            </span>
          )}
          <span className="sender">{msg.sender}:</span>
          <span className="message">{msg.message}</span>
        </div>
      ))}
    </div>
  );
};

export default ChatOverlay;
