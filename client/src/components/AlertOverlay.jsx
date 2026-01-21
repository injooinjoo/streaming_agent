import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { API_URL } from '../config/api';
import socket from '../config/socket';
import './Overlay.css';

const AlertOverlay = () => {
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
  }, [userHash, settings]);

  if (!activeAlert) return null;

  return (
    <div className={`alert-overlay theme-${settings.theme}`}>
      <div className={`alert-card glass animate-${settings.animation}`}>
        <div className={`alert-header gradient-text animate-${settings.textAnimation}`}>
          NEW DONATION!
        </div>
        <div className="alert-sender">{activeAlert.sender}</div>
        <div className="alert-amount">{activeAlert.amount.toLocaleString()} KRW</div>
        <div className="alert-message">{activeAlert.message}</div>
      </div>
    </div>
  );
};

export default AlertOverlay;
