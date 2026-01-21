import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { API_URL } from '../config/api';
import socket from '../config/socket';
import './Overlay.css';

const EmojiOverlay = () => {
  const { userHash } = useParams();
  const [emojis, setEmojis] = useState([]);
  const [settings, setSettings] = useState({
    emojiSet: ['❤️', '🔥', '👏', '😂', '🎉'],
    displayDuration: 3000,
    maxConcurrent: 10,
    animationStyle: 'float',
    isActive: true
  });

  const fetchSettings = async () => {
    try {
      const url = userHash
        ? `${API_URL}/api/overlay/${userHash}/settings/emoji`
        : `${API_URL}/api/settings/emoji`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.value && data.value !== '{}') {
        const parsed = JSON.parse(data.value);
        setSettings(prev => ({ ...prev, ...parsed }));
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    }
  };

  const addEmoji = (emoji, position) => {
    if (emojis.length >= settings.maxConcurrent) return;

    const id = Date.now() + Math.random();
    const x = position?.x || Math.random() * 80 + 10; // 10-90% of screen width
    const y = position?.y || 100; // Start from bottom

    setEmojis(prev => [...prev, { id, emoji, x, y }]);

    setTimeout(() => {
      setEmojis(prev => prev.filter(e => e.id !== id));
    }, settings.displayDuration);
  };

  useEffect(() => {
    fetchSettings();

    if (userHash) {
      socket.emit("join-overlay", userHash);
    }

    socket.on('emoji-reaction', (data) => {
      if (data.emoji) {
        addEmoji(data.emoji, data.position);
      }
    });

    socket.on('emoji-burst', (data) => {
      if (data.emojis && Array.isArray(data.emojis)) {
        data.emojis.forEach((emoji, index) => {
          setTimeout(() => {
            addEmoji(emoji, { x: Math.random() * 80 + 10 });
          }, index * 100);
        });
      }
    });

    socket.on('settings-updated', (data) => {
      if (data.key === 'emoji') fetchSettings();
    });

    return () => {
      if (userHash) {
        socket.emit("leave-overlay", userHash);
      }
      socket.off('emoji-reaction');
      socket.off('emoji-burst');
      socket.off('settings-updated');
    };
  }, [userHash, settings.maxConcurrent, settings.displayDuration]);

  const getAnimationClass = () => {
    switch (settings.animationStyle) {
      case 'explode': return 'emoji-explode';
      case 'rain': return 'emoji-rain';
      case 'bounce': return 'emoji-bounce';
      default: return 'emoji-float';
    }
  };

  if (!settings.isActive) return null;

  return (
    <div className="emoji-overlay">
      {emojis.map(({ id, emoji, x }) => (
        <div
          key={id}
          className={`emoji-item ${getAnimationClass()}`}
          style={{
            left: `${x}%`,
            animationDuration: `${settings.displayDuration}ms`
          }}
        >
          {emoji}
        </div>
      ))}
    </div>
  );
};

export default EmojiOverlay;
