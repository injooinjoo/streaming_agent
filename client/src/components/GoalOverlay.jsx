import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Heart, Star } from 'lucide-react';
import { API_URL } from '../config/api';
import socket from '../config/socket';
import './Overlay.css';

const GoalOverlay = ({
  previewMode = false,
  previewSettings = null,
  previewValue = null
}) => {
  const { userHash } = useParams();
  const [settings, setSettings] = useState({
    theme: 'default',
    type: 'bar',
    title: '오늘의 목표',
    currentValue: 0,
    targetValue: 100000,
    barColor: '#10a37f',
    thickness: 24
  });

  const fetchSettings = async () => {
    try {
      const url = userHash
        ? `${API_URL}/api/overlay/${userHash}/settings/goal`
        : `${API_URL}/api/settings/goal`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.value && data.value !== '{}') {
        setSettings(JSON.parse(data.value));
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    }
  };

  useEffect(() => {
    // Skip API/Socket in preview mode
    if (previewMode) return;

    fetchSettings();

    if (userHash) {
      socket.emit("join-overlay", userHash);
    }

    socket.on('settings-updated', (data) => {
      if (data.key === 'goal') fetchSettings();
    });

    // Listen for donation events to auto-increment if configured
    socket.on('new-event', (event) => {
      if (event.type === 'donation') {
        setSettings(prev => ({
          ...prev,
          currentValue: prev.currentValue + (event.amount || 0)
        }));
      }
    });

    return () => {
      if (userHash) {
        socket.emit("leave-overlay", userHash);
      }
      socket.off('settings-updated');
      socket.off('new-event');
    };
  }, [userHash, previewMode]);

  // OBS 브라우저 소스용 투명 배경
  useEffect(() => {
    if (!previewMode) {
      document.body.classList.add('overlay-mode');
      return () => document.body.classList.remove('overlay-mode');
    }
  }, [previewMode]);

  // Use preview settings if in preview mode
  const activeSettings = previewMode && previewSettings ? previewSettings : settings;
  const activeCurrentValue = previewMode && previewValue !== null ? previewValue : activeSettings.currentValue;
  const targetValue = activeSettings.targetValue || 100000;

  const percentage = Math.min(100, Math.max(0, (activeCurrentValue / targetValue) * 100));

  const renderGraph = () => {
    const graphType = activeSettings.graphType || activeSettings.type || 'bar';
    const barColor = activeSettings.gradientStart || activeSettings.barColor || '#10a37f';
    const thickness = activeSettings.thickness || 24;

    if (graphType === 'circle') {
      const radius = 60;
      const circumference = 2 * Math.PI * radius;
      const offset = circumference - (percentage / 100) * circumference;

      return (
        <div className="goal-circle">
          <svg width="140" height="140" className="progress-ring">
            <circle
              stroke="rgba(255,255,255,0.1)"
              strokeWidth={thickness}
              fill="transparent"
              r={radius}
              cx="70"
              cy="70"
            />
            <circle
              stroke={barColor}
              strokeWidth={thickness}
              fill="transparent"
              r={radius}
              cx="70"
              cy="70"
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="progress-ring__circle"
            />
          </svg>
          <div className="goal-percent absolute-center">
            {percentage.toFixed(0)}%
          </div>
        </div>
      );
    }

    if (graphType === 'heart' || graphType === 'star') {
      // Simple fill effect for shapes
      const Icon = graphType === 'heart' ? Heart : Star;
      return (
        <div className="goal-shape" style={{ color: barColor }}>
          <Icon size={140} strokeWidth={1} className="goal-icon-bg" />
          <div className="goal-shape-fill" style={{ height: `${percentage}%`, background: barColor }}>
            <Icon size={140} strokeWidth={1} className="goal-icon-fill" />
          </div>
          <div className="goal-percent absolute-center text-stroke">
            {percentage.toFixed(0)}%
          </div>
        </div>
      );
    }

    // Default bar type
    const title = activeSettings.title || activeSettings.titleTemplate || '오늘의 목표';
    return (
      <div className="goal-bar-container">
        <div className="goal-header">
          <span className="goal-title">{title}</span>
          <span className="goal-values">
            {activeCurrentValue.toLocaleString()} / {targetValue.toLocaleString()}
          </span>
        </div>
        <div className="goal-bar-bg" style={{ height: `${thickness}px` }}>
          <div
            className="goal-bar-fill"
            style={{
              width: `${percentage}%`,
              backgroundColor: barColor,
              boxShadow: `0 0 10px ${barColor}`
            }}
          >
            <div className="shine"></div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`goal-overlay theme-${activeSettings.theme} ${previewMode ? 'preview-mode' : ''}`}>
      <div className="goal-card glass">
        {renderGraph()}
      </div>
    </div>
  );
};

export default GoalOverlay;
