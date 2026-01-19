import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { API_URL } from "../config/api";
import "./Overlay.css";

const socket = io(API_URL);

// 샘플 메시지 데이터
const sampleMessages = [
  { id: 'sample-1', sender: '김스트리머', message: '안녕하세요! 오늘도 방송 시작합니다~', platform: 'soop', role: 'streamer' },
  { id: 'sample-2', sender: '팬클럽장', message: '오늘 방송도 화이팅입니다!', platform: 'chzzk', role: 'fan' },
  { id: 'sample-3', sender: '일반시청자', message: 'ㅋㅋㅋㅋ 재밌다', platform: 'youtube', role: 'regular' },
  { id: 'sample-4', sender: 'VIP유저', message: '후원 감사합니다~', platform: 'soop', role: 'vip' },
  { id: 'sample-5', sender: '매니저', message: '공지: 오늘 이벤트 진행중!', platform: 'chzzk', role: 'manager' },
  { id: 'sample-6', sender: '구독자A', message: '구독 1년 달성했어요!', platform: 'youtube', role: 'subscriber' },
  { id: 'sample-7', sender: '서포터', message: '항상 응원합니다 ❤️', platform: 'soop', role: 'supporter' },
  { id: 'sample-8', sender: 'VVIP멤버', message: '방송 퀄리티 최고네요', platform: 'chzzk', role: 'vvip' },
];

// 테마 목록
const themeOptions = [
  'default', 'tanmak', 'cat', 'newyear', 'lol', 'star', 'pubg', 'heart', 'winter',
  'retro-pink', 'retro-blue', 'rainbow', 'crayon', 'gold', 'dotted', 'windows', 'kakao',
  'round', 'balloon', 'chalk', 'neon', 'neon-bg', 'box-white', 'box-black', 'leather', 'postit', 'food', 'overwatch'
];

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
    showSampleChat: true,
    sampleDelay: 30,
    showHoverPanel: true,
    filterEnabled: true,
    notificationEnabled: true,
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

  // 추가 상태
  const [isPaused, setIsPaused] = useState(false);
  const [showSample, setShowSample] = useState(false);
  const [sampleIndex, setSampleIndex] = useState(0);
  const [displayedSamples, setDisplayedSamples] = useState([]);
  const lastRealMessageRef = useRef(Date.now());
  const sampleIntervalRef = useRef(null);
  const checkIntervalRef = useRef(null);

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
        // 일시정지 상태가 아닐 때만 메시지 추가
        if (!isPaused) {
          setMessages((prev) => [...prev.slice(-49), { ...event, timestamp: Date.now() }]);
        }
        // 실제 메시지 수신 시 타임스탬프 갱신 및 샘플 숨김
        lastRealMessageRef.current = Date.now();
        setShowSample(false);
        setDisplayedSamples([]);
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
  }, [userHash, isPaused]);

  // 샘플 채팅 표시 로직
  useEffect(() => {
    if (!settings.showSampleChat) return;

    // 실제 채팅이 없을 때 샘플 표시 여부 체크
    checkIntervalRef.current = setInterval(() => {
      const timeSinceLastMessage = Date.now() - lastRealMessageRef.current;
      const delayMs = (settings.sampleDelay || 30) * 1000;

      if (timeSinceLastMessage > delayMs && messages.length === 0) {
        setShowSample(true);
      }
    }, 1000);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [settings.showSampleChat, settings.sampleDelay, messages.length]);

  // 샘플 메시지 순환 표시
  useEffect(() => {
    if (!showSample) {
      if (sampleIntervalRef.current) {
        clearInterval(sampleIntervalRef.current);
      }
      return;
    }

    // 첫 샘플 메시지 즉시 추가
    const addSampleMessage = () => {
      setSampleIndex((prev) => {
        const nextIndex = (prev + 1) % sampleMessages.length;
        const newSample = {
          ...sampleMessages[nextIndex],
          id: `sample-${Date.now()}`,
          timestamp: Date.now(),
          isSample: true
        };
        setDisplayedSamples((prevSamples) => [...prevSamples.slice(-4), newSample]);
        return nextIndex;
      });
    };

    addSampleMessage();
    sampleIntervalRef.current = setInterval(addSampleMessage, 3000);

    return () => {
      if (sampleIntervalRef.current) {
        clearInterval(sampleIntervalRef.current);
      }
    };
  }, [showSample]);

  // 호버 패널 핸들러
  const handlePauseToggle = () => {
    setIsPaused(!isPaused);
  };

  const handleClearMessages = () => {
    setMessages([]);
    setDisplayedSamples([]);
  };

  const handleThemeChange = async (e) => {
    const newTheme = e.target.value;
    const newSettings = { ...settings, theme: newTheme };
    setSettings(newSettings);

    // 설정 저장
    try {
      await fetch(`${API_URL}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'chat', value: newSettings })
      });
    } catch (err) {
      console.error('Failed to save theme:', err);
    }
  };

  const handleFontSizeChange = async (delta) => {
    const newSize = Math.max(12, Math.min(72, settings.fontSize + delta));
    const newSettings = { ...settings, fontSize: newSize };
    setSettings(newSettings);

    try {
      await fetch(`${API_URL}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'chat', value: newSettings })
      });
    } catch (err) {
      console.error('Failed to save font size:', err);
    }
  };

  const handleFilterToggle = async () => {
    const newSettings = { ...settings, filterEnabled: !settings.filterEnabled };
    setSettings(newSettings);

    try {
      await fetch(`${API_URL}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'chat', value: newSettings })
      });
    } catch (err) {
      console.error('Failed to save filter setting:', err);
    }
  };

  const handleNotificationToggle = async () => {
    const newSettings = { ...settings, notificationEnabled: !settings.notificationEnabled };
    setSettings(newSettings);

    try {
      await fetch(`${API_URL}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'chat', value: newSettings })
      });
    } catch (err) {
      console.error('Failed to save notification setting:', err);
    }
  };

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

  // 표시할 메시지 (실제 또는 샘플)
  const displayMessages = messages.length > 0 ? messages : displayedSamples;

  return (
    <div
      className={`chat-overlay theme-${settings.theme} ${settings.direction} ${isPaused ? 'paused' : ''}`}
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
      {/* 호버 컨트롤 패널 */}
      {settings.showHoverPanel && (
        <div className="overlay-hover-panel">
          <div className="hover-controls">
            <button
              className={`hover-btn ${isPaused ? 'active' : ''}`}
              onClick={handlePauseToggle}
              title={isPaused ? '재개' : '일시정지'}
            >
              {isPaused ? '▶️' : '⏸️'}
            </button>

            <button
              className="hover-btn"
              onClick={handleClearMessages}
              title="채팅 지우기"
            >
              🗑️
            </button>

            <div className="hover-divider" />

            <select
              className="hover-select"
              value={settings.theme}
              onChange={handleThemeChange}
              title="테마 선택"
            >
              {themeOptions.map(theme => (
                <option key={theme} value={theme}>{theme}</option>
              ))}
            </select>

            <div className="hover-divider" />

            <div className="font-size-controls">
              <button
                className="hover-btn small"
                onClick={() => handleFontSizeChange(-2)}
                title="폰트 작게"
              >
                A-
              </button>
              <span className="font-size-display">{settings.fontSize}px</span>
              <button
                className="hover-btn small"
                onClick={() => handleFontSizeChange(2)}
                title="폰트 크게"
              >
                A+
              </button>
            </div>

            <div className="hover-divider" />

            <button
              className={`hover-btn ${settings.filterEnabled ? 'active' : ''}`}
              onClick={handleFilterToggle}
              title={settings.filterEnabled ? '필터 끄기' : '필터 켜기'}
            >
              {settings.filterEnabled ? '🔇' : '🔊'}
            </button>

            <button
              className={`hover-btn ${settings.notificationEnabled ? 'active' : ''}`}
              onClick={handleNotificationToggle}
              title={settings.notificationEnabled ? '알림 끄기' : '알림 켜기'}
            >
              {settings.notificationEnabled ? '🔔' : '🔕'}
            </button>
          </div>
        </div>
      )}

      {/* 일시정지 인디케이터 */}
      {isPaused && (
        <div className="paused-indicator">
          ⏸️ 일시정지됨
        </div>
      )}

      <div className="messages-container">
        {displayMessages.map((msg, index) => {
          const roleColors = getRoleColors(msg.role);
          const outlineStyle = settings.fontOutlineSize > 0
            ? { textShadow: `0 0 ${settings.fontOutlineSize}px ${settings.fontOutlineColor}, 0 0 ${settings.fontOutlineSize}px ${settings.fontOutlineColor}` }
            : {};

          return (
            <div
              key={msg.id || index}
              className={`chat-message-item ${getAnimationClass()} ${msg.isSample ? 'sample' : ''}`}
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
