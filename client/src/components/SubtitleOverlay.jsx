import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Medal } from 'lucide-react';
import { API_URL } from '../config/api';
import socket from '../config/socket';
import './Overlay.css';

const SubtitleOverlay = ({
  previewMode = false,
  previewSettings = null,
  previewEvents = null
}) => {
  const { userHash } = useParams();
  const [events, setEvents] = useState([]);
  const [settings, setSettings] = useState({
    theme: 'default',
    mode: 'recent',
    fontSize: 24,
    showMedals: true,
    textFormat: '{닉네임} {금액}'
  });

  const fetchSettings = async () => {
    try {
      const url = userHash
        ? `${API_URL}/api/overlay/${userHash}/settings/subtitle`
        : `${API_URL}/api/settings/subtitle`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.value && data.value !== '{}') {
        setSettings(JSON.parse(data.value));
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    }
  };

  const fetchEvents = async () => {
    const res = await fetch(`${API_URL}/api/events`);
    const data = await res.json();
    setEvents(data.filter(e => e.type === 'donation'));
  };

  useEffect(() => {
    // Skip API/Socket in preview mode
    if (previewMode) return;

    fetchSettings();
    fetchEvents();

    if (userHash) {
      socket.emit("join-overlay", userHash);
    }

    socket.on('new-event', (event) => {
      if (event.type === 'donation') fetchEvents();
    });

    socket.on('settings-updated', (data) => {
      if (data.key === 'subtitle') fetchSettings();
    });

    return () => {
      if (userHash) {
        socket.emit("leave-overlay", userHash);
      }
      socket.off('new-event');
      socket.off('settings-updated');
    };
  }, [userHash, previewMode]);

  // OBS 브라우저 소스용 투명 배경
  useEffect(() => {
    if (!previewMode) {
      document.body.classList.add('overlay-mode');
      return () => document.body.classList.remove('overlay-mode');
    }
  }, [previewMode]);

  // Use preview settings and events if in preview mode
  const activeSettings = previewMode && previewSettings ? previewSettings : settings;
  const activeEvents = previewMode && previewEvents ? previewEvents : events;

  const renderContent = () => {
    // 이벤트 데이터가 없으면 더미 데이터 표시 (미리보기용)
    const hasEvents = activeEvents && activeEvents.length > 0;

    if (activeSettings.mode === 'recent') {
      const latest = activeEvents[0];
      if (!latest) {
        // 미리보기 모드에서 더미 데이터 표시
        if (previewMode) {
          return "테스터1 10,000원";
        }
        return "수신 대기 중...";
      }
      return (activeSettings.textFormat || '{닉네임} {금액}')
        .replace('{닉네임}', latest.sender)
        .replace('{금액}', `${latest.amount.toLocaleString()}원`);
    }

    if (activeSettings.mode === 'ranking') {
      // Group by sender and sum amounts
      const ranks = activeEvents.reduce((acc, curr) => {
        acc[curr.sender] = (acc[curr.sender] || 0) + curr.amount;
        return acc;
      }, {});
      const sorted = Object.entries(ranks)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3);

      // 미리보기 모드에서 데이터가 없으면 더미 데이터
      const displayData = sorted.length > 0 ? sorted :
        previewMode ? [['테스터1', 10000], ['테스터2', 5000], ['테스터3', 3000]] : [];

      if (displayData.length === 0) {
        return "데이터 없음";
      }

      return (
        <div className="ranking-list">
          {displayData.map(([name, amount], idx) => (
            <div key={name} className="ranking-item">
              {activeSettings.showMedals && <Medal size={activeSettings.fontSize} className={`medal-${idx + 1}`} />}
              <span>{name} {amount.toLocaleString()}원</span>
            </div>
          ))}
        </div>
      );
    }

    if (activeSettings.mode === 'count') {
      // 총 후원 개수 표시
      const totalCount = activeEvents.length;
      const totalAmount = activeEvents.reduce((sum, e) => sum + (e.amount || 0), 0);

      if (!hasEvents && previewMode) {
        return "총 3건 · 18,000원";
      }
      if (!hasEvents) {
        return "후원 0건";
      }
      return `총 ${totalCount}건 · ${totalAmount.toLocaleString()}원`;
    }

    if (activeSettings.mode === 'mvp') {
      // 최고 후원자 (MVP) 표시
      if (!hasEvents) {
        if (previewMode) {
          return "🏆 MVP: 테스터1 (10,000원)";
        }
        return "MVP 없음";
      }
      const ranks = activeEvents.reduce((acc, curr) => {
        acc[curr.sender] = (acc[curr.sender] || 0) + curr.amount;
        return acc;
      }, {});
      const mvp = Object.entries(ranks).sort(([, a], [, b]) => b - a)[0];
      return `🏆 MVP: ${mvp[0]} (${mvp[1].toLocaleString()}원)`;
    }

    if (activeSettings.mode === 'image') {
      // 후원 이미지 모드 - 이미지 표시 또는 텍스트
      if (previewMode) {
        return "📷 후원 이미지 모드";
      }
      return "이미지 모드";
    }

    // 기타 모드 - 기본값으로 count처럼 동작
    const totalCount = activeEvents.length;
    if (!hasEvents && previewMode) {
      return "미리보기 데이터";
    }
    return totalCount > 0 ? `후원 ${totalCount}건` : "대기 중...";
  };

  return (
    <div className={`subtitle-overlay theme-${activeSettings.theme} ${previewMode ? 'preview-mode' : ''}`}>
      <div className="subtitle-container glass" style={{ fontSize: `${activeSettings.fontSize}px` }}>
        {renderContent()}
      </div>
    </div>
  );
};

export default SubtitleOverlay;
