import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import './Overlay.css';

const socket = io('http://localhost:3001');

const AlertOverlay = () => {
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
    const res = await fetch('http://localhost:3001/api/settings/alert');
    const data = await res.json();
    if (data.value && data.value !== '{}') {
      setSettings(JSON.parse(data.value));
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
      socket.off('new-event');
      socket.off('settings-updated');
    };
  }, [settings]);

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
