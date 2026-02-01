import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { API_URL } from '../config/api';
import { formatWon } from '../utils/formatters';
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
        // 종류별 필터링: donationTypeSettings에서 비활성화된 종류는 무시
        const donationType = event.content?.donationType || event.donationType;
        if (donationType && settings.donationTypeSettings) {
          // donationType을 settings 키로 매핑
          const typeMap = { star_balloon: 'star', ad_balloon: 'balloon', video_balloon: 'video', cheese: 'star' };
          const settingsKey = typeMap[donationType] || donationType;
          const typeConfig = settings.donationTypeSettings[settingsKey];
          if (typeConfig && !typeConfig.enabled) return;
        }

        setActiveAlert(null);
        setTimeout(() => {
          setActiveAlert({
            ...event,
            sender: event.sender?.nickname || event.sender,
            amount: event.content?.amount || event.amount,
            message: event.content?.message || event.message,
            donationType: event.content?.donationType || event.donationType
          });
          if (settings.ttsVolume > 0) {
            const sender = event.sender?.nickname || event.sender;
            const amount = event.content?.amount || event.amount;
            const message = event.content?.message || event.message || '';
            playTTS(`${sender}님이 ${amount}원 후원! ${message}`);
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

  // 종류별 설정 조회 (fallback: 글로벌 기본값)
  const getDonationTypeConfig = () => {
    if (!displayAlert?.donationType || !activeSettings.donationTypeSettings) return {};
    const typeConfig = activeSettings.donationTypeSettings[displayAlert.donationType];
    if (!typeConfig) return {};
    return typeConfig;
  };

  const typeConfig = getDonationTypeConfig();
  const effectiveAnimation = typeConfig.animation || activeSettings.animation || 'bounceIn';
  const effectiveTextAnimation = typeConfig.textAnimation || activeSettings.textAnimation || 'tada';
  const effectiveHeaderText = typeConfig.headerText || 'NEW DONATION!';
  const effectiveAlertImage = typeConfig.alertImage || '';

  // 폰트 외곽선 스타일 헬퍼
  const getOutlineStyle = () => {
    if (activeSettings.fontOutlineSize > 0) {
      const size = activeSettings.fontOutlineSize;
      const color = activeSettings.fontOutlineColor || '#000000dd';
      return {
        textShadow: `
          -${size}px -${size}px 0 ${color},
          ${size}px -${size}px 0 ${color},
          -${size}px ${size}px 0 ${color},
          ${size}px ${size}px 0 ${color},
          0 -${size}px 0 ${color},
          0 ${size}px 0 ${color},
          -${size}px 0 0 ${color},
          ${size}px 0 0 ${color}
        `
      };
    }
    return {};
  };

  if (!displayAlert) return null;

  return (
    <div
      className={`alert-overlay theme-${activeSettings.theme} ${previewMode ? 'preview-mode' : ''}`}
      style={{
        opacity: (activeSettings.transparency ?? 100) / 100,
        fontFamily: activeSettings.fontFamily || 'Pretendard'
      }}
    >
      <div
        className={`alert-card glass animate-${effectiveAnimation}`}
        style={{
          fontSize: `${activeSettings.fontSize || 28}px`,
          fontWeight: activeSettings.fontBold ? 'bold' : 'normal',
          background: activeSettings.useBgColor ? activeSettings.bgColor : undefined,
          backgroundImage: activeSettings.bgImage ? `url(${activeSettings.bgImage})` : undefined,
          backgroundSize: activeSettings.bgImage ? (activeSettings.bgImageMode === 'repeat' ? 'auto' : (activeSettings.bgImageMode || 'cover')) : undefined,
          backgroundRepeat: activeSettings.bgImage ? (activeSettings.bgImageMode === 'repeat' ? 'repeat' : 'no-repeat') : undefined,
          backgroundPosition: activeSettings.bgImage ? 'center' : undefined,
          ...getOutlineStyle()
        }}
      >
        {effectiveAlertImage && (
          <div className="alert-image">
            <img src={effectiveAlertImage} alt="alert" style={{ maxWidth: '100%', maxHeight: '120px', objectFit: 'contain' }} />
          </div>
        )}
        <div className={`alert-header gradient-text animate-${effectiveTextAnimation}`}>
          {effectiveHeaderText}
        </div>
        <div className="alert-sender" style={{ color: activeSettings.nickColor || '#ffc247' }}>
          {displayAlert.sender}
        </div>
        <div className="alert-amount" style={{ color: activeSettings.amountColor || '#ffc247' }}>
          {formatWon(displayAlert.amount || 0)}
        </div>
        <div className="alert-message" style={{ color: activeSettings.fontColor || '#ffffff' }}>
          {displayAlert.message}
        </div>
      </div>
    </div>
  );
};

export default AlertOverlay;
