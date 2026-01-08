import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { API_URL } from "../config/api";
import "./Overlay.css";

const socket = io(API_URL);

const ChatOverlay = () => {
  const { userHash } = useParams();
  const [messages, setMessages] = useState([]);
  const [settings, setSettings] = useState({
    theme: 'default',
    direction: 'left',
    animation: 'fadeIn',
    fontSize: 28,
    transparency: 100,
    showIcons: true,
    nicknameDivider: ' : ',
    fontFamily: 'Pretendard',
    fontBold: false,
    fontOutlineColor: '#000000dd',
    fontOutlineSize: 2,
    useBgColor: false,
    bgColor: '#00000000',
    bgImage: '',
    bgImageMode: 'cover',
    colors: {
      streamer: { nick: '#ffffff', message: '#ffffff' },
      manager: { nick: '#ffffff', message: '#ffffff' },
      vvip: { nick: '#ffffff', message: '#ffffff' },
      vip: { nick: '#ffffff', message: '#ffffff' },
      fan: { nick: '#ffffff', message: '#ffffff' },
      subscriber: { nick: '#ffffff', message: '#ffffff' },
      supporter: { nick: '#ffffff', message: '#ffffff' },
      regular: { nick: '#ffffff', message: '#ffffff' }
    }
  });

  const fetchSettings = async () => {
    try {
      // 해시가 있으면 해시 기반 API, 없으면 레거시 API
      const url = userHash
        ? `${API_URL}/api/overlay/${userHash}/settings/chat`
        : `${API_URL}/api/settings/chat`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.value && data.value !== '{}') {
        const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        setSettings(prev => ({ ...prev, ...parsed }));
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    }
  };

  useEffect(() => {
    fetchSettings();

    // 해시가 있으면 해당 룸에 조인
    if (userHash) {
      socket.emit("join-overlay", userHash);
    }

    socket.on("new-event", (event) => {
      if (event.type === "chat") {
        setMessages((prev) => [...prev.slice(-49), { ...event, timestamp: Date.now() }]);
      }
    });

    socket.on("settings-updated", (data) => {
      if (data.key === 'chat') fetchSettings();
    });

    return () => {
      if (userHash) {
        socket.emit("leave-overlay", userHash);
      }
      socket.off("new-event");
      socket.off("settings-updated");
    };
  }, [userHash]);

  const getAnimationClass = () => {
    switch (settings.animation) {
      case 'slideIn': return 'animate-slide-in';
      case 'bounceIn': return 'animate-bounceIn';
      case 'zoomIn': return 'animate-zoomIn';
      case 'fadeIn': return 'animate-fade-in';
      default: return 'animate-fade-up';
    }
  };

  const getRoleColors = (role) => {
    // Map internal role keys to common tags if needed
    const roleKey = role || 'regular';
    return settings.colors[roleKey] || settings.colors.regular;
  };

  return (
    <div
      className={`chat-overlay theme-${settings.theme} ${settings.direction}`}
      style={{
        alignItems: settings.direction === 'center' ? 'center' : settings.direction === 'right' ? 'flex-end' : 'flex-start',
        opacity: settings.transparency / 100,
        fontFamily: settings.fontFamily,
        backgroundColor: settings.useBgColor ? settings.bgColor : 'transparent',
        backgroundImage: settings.bgImage ? `url(${settings.bgImage})` : 'none',
        backgroundSize: settings.bgImageMode === 'repeat' ? 'auto' : settings.bgImageMode,
        backgroundRepeat: settings.bgImageMode === 'repeat' ? 'repeat' : 'no-repeat',
        backgroundPosition: 'center'
      }}
    >
      <div className="messages-container">
        {messages.map((msg, index) => {
          const roleColors = getRoleColors(msg.role);
          const outlineStyle = settings.fontOutlineSize > 0
            ? { textShadow: `0 0 ${settings.fontOutlineSize}px ${settings.fontOutlineColor}, 0 0 ${settings.fontOutlineSize}px ${settings.fontOutlineColor}` }
            : {};

          return (
            <div
              key={msg.id || index}
              className={`chat-message-item ${getAnimationClass()}`}
              style={{
                fontSize: `${settings.fontSize}px`,
                fontWeight: settings.fontBold ? 'bold' : 'normal',
                color: roleColors.message,
                ...outlineStyle
              }}
            >
              {settings.showIcons && msg.platform && (
                <span className={`platform-badge ${msg.platform}`}>
                  {msg.platform}
                </span>
              )}
              <span className="sender" style={{ color: roleColors.nick }}>
                {msg.sender}{settings.nicknameDivider}
              </span>
              <span className="message-text">
                {msg.message}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ChatOverlay;
