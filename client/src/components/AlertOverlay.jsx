import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { API_URL } from '../config/api';
import socket from '../config/socket';
import './Overlay.css';

const AlertOverlay = ({
  previewMode = false,
  previewSettings = null,
  previewEvent = null
}) => {
  const { userHash } = useParams();
  const [activeAlert, setActiveAlert] = useState(null);
  const [settings, setSettings] = useState({
    theme: 'default',
    duration: 30,
    volume: 50,
    ttsVolume: 50,
    animation: 'bounceIn',
    textAnimation: 'tada'
  });

  const fetchSettings = async () => {
    try {
      const url = userHash
        ? `${API_URL}/api/overlay/${userHash}/settings/alert`
        : `${API_URL}/api/settings/alert`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.value && data.value !== '{}') {
        setSettings(JSON.parse(data.value));
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    }
  };

  const playTTS = (text) => {
    if (!window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = settings.ttsVolume / 100;
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    // Skip API/Socket in preview mode
    if (previewMode) return;

    fetchSettings();

    if (userHash) {
      socket.emit("join-overlay", userHash);
    }

    socket.on('new-event', (event) => {
      if (event.type === 'donation') {
        setActiveAlert(null);
        setTimeout(() => {
          setActiveAlert(event);
          if (settings.ttsVolume > 0) {
            playTTS(`${event.sender}님이 ${event.amount}원 후원! ${event.message || ''}`);
          }
          setTimeout(() => setActiveAlert(null), (settings.duration || 5) * 1000);
        }, 100);
      }
    });

    socket.on("settings-updated", (data) => {
      if (data.key === 'alert') fetchSettings();
    });

    return () => {
      if (userHash) {
        socket.emit("leave-overlay", userHash);
      }
      socket.off('new-event');
      socket.off('settings-updated');
    };
  }, [userHash, settings, previewMode]);

  // Use preview settings and event if in preview mode
  // OBS 브라우저 소스용 투명 배경
  useEffect(() => {
    if (!previewMode) {
      document.body.classList.add('overlay-mode');
      return () => document.body.classList.remove('overlay-mode');
    }
  }, [previewMode]);

  const activeSettings = previewMode && previewSettings ? previewSettings : settings;
  const displayAlert = previewMode ? previewEvent : activeAlert;

  if (!displayAlert) return null;

  return (
    <div className={`alert-overlay theme-${activeSettings.theme} ${previewMode ? 'preview-mode' : ''}`}>
      <div className={`alert-card glass animate-${activeSettings.animation}`}>
        <div className={`alert-header gradient-text animate-${activeSettings.textAnimation}`}>
          NEW DONATION!
        </div>
        <div className="alert-sender">{displayAlert.sender}</div>
        <div className="alert-amount">{(displayAlert.amount || 0).toLocaleString()} KRW</div>
        <div className="alert-message">{displayAlert.message}</div>
      </div>
    </div>
  );
};

export default AlertOverlay;
