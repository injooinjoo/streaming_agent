import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { API_URL } from '../config/api';
import socket from '../config/socket';
import './Overlay.css';

const RouletteOverlay = ({
  previewMode = false,
  previewSettings = null,
  triggerSpin = false,
  onSpinComplete = null
}) => {
  const { userHash } = useParams();
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [settings, setSettings] = useState({
    segments: [
      { text: '꽝', color: '#ff6b6b', probability: 30 },
      { text: '당첨!', color: '#4ecdc4', probability: 20 },
      { text: '대박!', color: '#ffe66d', probability: 10 },
      { text: '재도전', color: '#95e1d3', probability: 40 }
    ],
    spinDuration: 5000,
    theme: 'default'
  });
  const wheelRef = useRef(null);

  // OBS 브라우저 소스용 투명 배경
  useEffect(() => {
    if (!previewMode) {
      document.body.classList.add('overlay-mode');
      return () => document.body.classList.remove('overlay-mode');
    }
  }, [previewMode]);

  // Use preview settings if in preview mode
  const activeSettings = previewMode && previewSettings ? previewSettings : settings;

  const fetchSettings = async () => {
    try {
      const url = userHash
        ? `${API_URL}/api/overlay/${userHash}/settings/roulette`
        : `${API_URL}/api/settings/roulette`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.value && data.value !== '{}') {
        const parsed = JSON.parse(data.value);
        if (parsed.segments && parsed.segments.length > 0) {
          setSettings(prev => ({ ...prev, ...parsed }));
        }
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    }
  };

  const spinWheel = useCallback((resultIndex) => {
    if (isSpinning) return;

    setIsSpinning(true);
    setResult(null);

    const duration = previewMode && previewSettings ? previewSettings.spinDuration : settings.spinDuration;
    const segments = previewMode && previewSettings ? previewSettings.segments : settings.segments;
    const segmentAngle = 360 / segments.length;
    const targetAngle = 360 - (resultIndex * segmentAngle) - (segmentAngle / 2);
    const spins = 5; // Number of full rotations
    const finalRotation = rotation + (spins * 360) + targetAngle;

    setRotation(finalRotation);

    setTimeout(() => {
      setIsSpinning(false);
      setResult(segments[resultIndex]);
      if (onSpinComplete) onSpinComplete(segments[resultIndex]);
    }, duration);
  }, [isSpinning, previewMode, previewSettings, settings, rotation, onSpinComplete]);

  // Handle triggerSpin prop for preview
  useEffect(() => {
    if (previewMode && triggerSpin && !isSpinning) {
      const segments = previewSettings?.segments || settings.segments;
      const totalProb = segments.reduce((sum, s) => sum + (s.probability || 0), 0);
      let random = Math.random() * totalProb;
      let resultIndex = 0;

      for (let i = 0; i < segments.length; i++) {
        random -= segments[i].probability || 0;
        if (random <= 0) {
          resultIndex = i;
          break;
        }
      }
      spinWheel(resultIndex);
    }
  }, [triggerSpin, previewMode, previewSettings, settings, isSpinning, spinWheel]);

  useEffect(() => {
    // Skip API/Socket in preview mode
    if (previewMode) return;

    fetchSettings();

    if (userHash) {
      socket.emit("join-overlay", userHash);
    }

    socket.on('roulette-spin', (data) => {
      if (data.resultIndex !== undefined) {
        spinWheel(data.resultIndex);
      }
    });

    socket.on('settings-updated', (data) => {
      if (data.key === 'roulette') fetchSettings();
    });

    return () => {
      if (userHash) {
        socket.emit("leave-overlay", userHash);
      }
      socket.off('roulette-spin');
      socket.off('settings-updated');
    };
  }, [userHash, previewMode, spinWheel]);

  const renderWheel = () => {
    const segments = activeSettings.segments;
    const segmentAngle = 360 / segments.length;

    return (
      <div
        ref={wheelRef}
        className="roulette-wheel"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: isSpinning ? `transform ${activeSettings.spinDuration}ms cubic-bezier(0.17, 0.67, 0.12, 0.99)` : 'none'
        }}
      >
        {segments.map((segment, index) => {
          const startAngle = index * segmentAngle;
          const endAngle = (index + 1) * segmentAngle;
          const largeArc = segmentAngle > 180 ? 1 : 0;

          // Calculate SVG arc path
          const startRad = (startAngle - 90) * Math.PI / 180;
          const endRad = (endAngle - 90) * Math.PI / 180;
          const x1 = 150 + 140 * Math.cos(startRad);
          const y1 = 150 + 140 * Math.sin(startRad);
          const x2 = 150 + 140 * Math.cos(endRad);
          const y2 = 150 + 140 * Math.sin(endRad);

          const pathD = `M 150 150 L ${x1} ${y1} A 140 140 0 ${largeArc} 1 ${x2} ${y2} Z`;

          // Text position
          const textAngle = startAngle + segmentAngle / 2 - 90;
          const textRad = textAngle * Math.PI / 180;
          const textX = 150 + 90 * Math.cos(textRad);
          const textY = 150 + 90 * Math.sin(textRad);

          return (
            <g key={index}>
              <path d={pathD} fill={segment.color} stroke="#fff" strokeWidth="2" />
              <text
                x={textX}
                y={textY}
                fill="#fff"
                fontSize="14"
                fontWeight="bold"
                textAnchor="middle"
                dominantBaseline="middle"
                transform={`rotate(${startAngle + segmentAngle / 2}, ${textX}, ${textY})`}
                style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
              >
                {segment.text}
              </text>
            </g>
          );
        })}
      </div>
    );
  };

  return (
    <div className={`roulette-overlay theme-${activeSettings.theme} ${previewMode ? 'preview-mode' : ''}`}>
      <div className="roulette-container">
        <div className="roulette-pointer">▼</div>
        <svg width="300" height="300" viewBox="0 0 300 300">
          {renderWheel()}
        </svg>
        {result && !isSpinning && (
          <div className="roulette-result animate-bounceIn">
            <div className="result-text" style={{ color: result.color }}>
              {result.text}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RouletteOverlay;
