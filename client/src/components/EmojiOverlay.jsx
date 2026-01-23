import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { API_URL } from '../config/api';
import socket from '../config/socket';
import './Overlay.css';

const EmojiOverlay = ({
  previewMode = false,
  previewSettings = null,
  previewEmojis = null,
  onAddEmoji = null
}) => {
  const { userHash } = useParams();
  const [emojis, setEmojis] = useState([]);
  const [settings, setSettings] = useState({
    emojiSet: ['❤️', '🔥', '👏', '😂', '🎉'],
    displayDuration: 3000,
    maxConcurrent: 10,
    animationStyle: 'float',
    isActive: true
  });

  // OBS 브라우저 소스용 투명 배경
  useEffect(() => {
    if (!previewMode) {
      document.body.classList.add('overlay-mode');
      return () => document.body.classList.remove('overlay-mode');
    }
  }, [previewMode]);

  // Use preview settings if in preview mode
  const activeSettings = previewMode && previewSettings ? previewSettings : settings;
  const activeEmojis = previewMode && previewEmojis ? previewEmojis : emojis;

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

  const addEmoji = useCallback((emoji, position) => {
    const maxConcurrent = previewMode && previewSettings ? previewSettings.maxConcurrent : settings.maxConcurrent;
    const displayDuration = previewMode && previewSettings ? previewSettings.displayDuration : settings.displayDuration;

    if (emojis.length >= maxConcurrent) return;

    const id = Date.now() + Math.random();
    const x = position?.x || Math.random() * 80 + 10; // 10-90% of screen width
    const y = position?.y || 100; // Start from bottom

    if (previewMode && onAddEmoji) {
      onAddEmoji({ id, emoji, x, y });
    } else {
      setEmojis(prev => [...prev, { id, emoji, x, y }]);

      setTimeout(() => {
        setEmojis(prev => prev.filter(e => e.id !== id));
      }, displayDuration);
    }
  }, [previewMode, previewSettings, settings, emojis.length, onAddEmoji]);

  useEffect(() => {
    // Skip API/Socket in preview mode
    if (previewMode) return;

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
  }, [userHash, settings.maxConcurrent, settings.displayDuration, previewMode, addEmoji]);

  const getAnimationClass = () => {
    switch (activeSettings.animationStyle) {
      case 'explode': return 'emoji-explode';
      case 'rain': return 'emoji-rain';
      case 'bounce': return 'emoji-bounce';
      default: return 'emoji-float';
    }
  };

  if (!previewMode && !activeSettings.isActive) return null;

  return (
    <div className={`emoji-overlay ${previewMode ? 'preview-mode' : ''}`}>
      {activeEmojis.map(({ id, emoji, x }) => (
        <div
          key={id}
          className={`emoji-item ${getAnimationClass()}`}
          style={{
            left: `${x}%`,
            animationDuration: `${activeSettings.displayDuration}ms`
          }}
        >
          {emoji}
        </div>
      ))}
    </div>
  );
};

export default EmojiOverlay;
