import React, { useState, useEffect, useCallback } from 'react';
import {
  Copy, RefreshCw, Save, ExternalLink, Plus, Trash2,
  Smile, Check, Play, Zap, CloudRain, Wind
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL } from '../../config/api';
import socket from '../../config/socket';
import { OverlayPreviewWrapper } from './shared';
import EmojiOverlay from '../EmojiOverlay';
import LoadingSpinner from '../shared/LoadingSpinner';
import './ChatSettings.css';

const defaultEmojis = ['❤️', '🔥', '👏', '😂', '🎉', '💪', '👍', '🙌'];

const animationStyles = [
  { id: 'float', name: '떠오르기', icon: <Wind size={16} />, description: '아래에서 위로 부드럽게 떠오릅니다' },
  { id: 'explode', name: '폭발', icon: <Zap size={16} />, description: '중앙에서 사방으로 퍼져나갑니다' },
  { id: 'rain', name: '비처럼', icon: <CloudRain size={16} />, description: '위에서 아래로 떨어집니다' },
  { id: 'bounce', name: '바운스', icon: <Play size={16} />, description: '통통 튀면서 나타납니다' }
];

const defaultSettings = {
  emojiSet: defaultEmojis,
  displayDuration: 3000,
  maxConcurrent: 10,
  animationStyle: 'float',
  isActive: true
};

const EmojiSettings = () => {
  const { token } = useAuth();
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [overlayHash, setOverlayHash] = useState(null);
  const [newEmoji, setNewEmoji] = useState('');

  // Preview state
  const [previewEmojis, setPreviewEmojis] = useState([]);

  // Add emoji to preview with auto-removal
  const addPreviewEmoji = useCallback((emojiData) => {
    setPreviewEmojis(prev => [...prev, emojiData]);
    setTimeout(() => {
      setPreviewEmojis(prev => prev.filter(e => e.id !== emojiData.id));
    }, settings.displayDuration);
  }, [settings.displayDuration]);

  // Test preview emoji
  const testPreviewEmoji = () => {
    if (settings.emojiSet.length > 0) {
      const randomEmoji = settings.emojiSet[Math.floor(Math.random() * settings.emojiSet.length)];
      addPreviewEmoji({
        id: Date.now() + Math.random(),
        emoji: randomEmoji,
        x: Math.random() * 80 + 10
      });
    }
  };

  // Test preview burst
  const testPreviewBurst = () => {
    if (settings.emojiSet.length > 0) {
      Array(5).fill(null).forEach((_, index) => {
        setTimeout(() => {
          const randomEmoji = settings.emojiSet[Math.floor(Math.random() * settings.emojiSet.length)];
          addPreviewEmoji({
            id: Date.now() + Math.random(),
            emoji: randomEmoji,
            x: Math.random() * 80 + 10
          });
        }, index * 100);
      });
    }
  };

  // Auto-animate emojis on mount for live preview
  useEffect(() => {
    if (settings.emojiSet.length === 0) return;

    // Initial demo: show a few emojis when page loads
    const startDemo = () => {
      settings.emojiSet.slice(0, 3).forEach((emoji, index) => {
        setTimeout(() => {
          addPreviewEmoji({
            id: Date.now() + Math.random(),
            emoji: emoji,
            x: 20 + (index * 30)
          });
        }, index * 400);
      });
    };

    startDemo();

    // Auto-add emoji every 2.5 seconds for natural preview
    const interval = setInterval(() => {
      if (settings.emojiSet.length > 0) {
        const randomEmoji = settings.emojiSet[Math.floor(Math.random() * settings.emojiSet.length)];
        addPreviewEmoji({
          id: Date.now() + Math.random(),
          emoji: randomEmoji,
          x: Math.random() * 80 + 10
        });
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [settings.emojiSet, addPreviewEmoji]);

  const overlayUrl = overlayHash
    ? `${window.location.origin}/overlay/${overlayHash}/emoji`
    : '';

  const fetchSettings = async () => {
    try {
      const urlsRes = await fetch(`${API_URL}/api/overlay/urls`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (urlsRes.ok) {
        const urlsData = await urlsRes.json();
        setOverlayHash(urlsData.hash);
      }

      const res = await fetch(`${API_URL}/api/user-settings/emoji`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.value && data.value !== '{}') {
        setSettings(prev => ({ ...prev, ...JSON.parse(data.value) }));
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await fetch(`${API_URL}/api/user-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ key: 'emoji', value: settings })
      });
      socket.emit('settings-update', { key: 'emoji', userHash: overlayHash });
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(overlayUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const addEmoji = () => {
    if (!newEmoji.trim() || settings.emojiSet.includes(newEmoji.trim())) return;
    setSettings(prev => ({
      ...prev,
      emojiSet: [...prev.emojiSet, newEmoji.trim()]
    }));
    setNewEmoji('');
  };

  const removeEmoji = (index) => {
    if (settings.emojiSet.length <= 1) return;
    setSettings(prev => ({
      ...prev,
      emojiSet: prev.emojiSet.filter((_, i) => i !== index)
    }));
  };

  const testEmoji = () => {
    if (overlayHash && settings.emojiSet.length > 0) {
      const randomEmoji = settings.emojiSet[Math.floor(Math.random() * settings.emojiSet.length)];
      socket.emit('emoji-reaction', {
        userHash: overlayHash,
        emoji: randomEmoji,
        position: { x: Math.random() * 80 + 10 }
      });
    }
  };

  const testEmojiBurst = () => {
    if (overlayHash && settings.emojiSet.length > 0) {
      const burstEmojis = Array(5).fill(null).map(() =>
        settings.emojiSet[Math.floor(Math.random() * settings.emojiSet.length)]
      );
      socket.emit('emoji-burst', {
        userHash: overlayHash,
        emojis: burstEmojis
      });
    }
  };

  useEffect(() => {
    if (token) {
      fetchSettings();
    } else {
      setLoading(false);
    }
  }, [token]);

  if (loading) {
    return (
      <div className="settings-panel">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <>
      <div className="premium-settings-header">
        <div className="header-top-row">
          <div className="title-area">
            <Smile size={28} />
            <span className="title-text">이모지 리액션</span>
            <div className="badge-wrapper">
              <span className="badge-new">NEW</span>
            </div>
          </div>
          <div className="action-area">
            <button className="btn-external-view" onClick={() => window.open(overlayUrl, '_blank')}>
              <ExternalLink size={16} /> 오버레이 보기
            </button>
          </div>
        </div>

        <div className="url-copy-section glass-premium">
          <div className="url-label-row">
            <span className="label">오버레이 URL</span>
            <span className="label-status">
              <span className={`status-dot ${settings.isActive ? 'green' : 'gray'}`}></span>
              {settings.isActive ? '활성화됨' : '비활성화'}
            </span>
          </div>
          <div className="url-copy-box">
            <div className="url-input-group">
              <Smile size={18} className="url-icon" />
              <input type="text" value={overlayUrl} readOnly onClick={(e) => e.target.select()} />
            </div>
            <button className={`url-action-btn primary ${copied ? 'copied' : ''}`} onClick={copyUrl}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? '복사됨' : '복사'}
            </button>
          </div>
        </div>
      </div>

      <div className="chat-settings-container">
        <div className="chat-settings-main">
          {/* 기본 설정 */}
          <div className="settings-card glass-premium">
            <div className="card-header">
              <h3>기본 설정</h3>
            </div>

            <div className="settings-row-pair">
              <span className="row-label">이모지 활성화</span>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.isActive}
                  onChange={(e) => setSettings(prev => ({ ...prev, isActive: e.target.checked }))}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="settings-row-pair">
              <span className="row-label">표시 시간</span>
              <div className="flex-row-gap">
                <input
                  type="range"
                  min="1000"
                  max="10000"
                  step="500"
                  value={settings.displayDuration}
                  onChange={(e) => setSettings(prev => ({ ...prev, displayDuration: parseInt(e.target.value) }))}
                />
                <span className="unit-value">{(settings.displayDuration / 1000).toFixed(1)}초</span>
              </div>
            </div>

            <div className="settings-row-pair">
              <span className="row-label">최대 동시 표시</span>
              <div className="flex-row-gap">
                <input
                  type="range"
                  min="1"
                  max="30"
                  step="1"
                  value={settings.maxConcurrent}
                  onChange={(e) => setSettings(prev => ({ ...prev, maxConcurrent: parseInt(e.target.value) }))}
                />
                <span className="unit-value">{settings.maxConcurrent}개</span>
              </div>
            </div>
          </div>

          {/* 애니메이션 스타일 */}
          <div className="settings-card glass-premium">
            <div className="card-header">
              <h3>애니메이션 스타일</h3>
            </div>

            <div className="animation-style-grid">
              {animationStyles.map((style) => (
                <div
                  key={style.id}
                  className={`animation-style-card ${settings.animationStyle === style.id ? 'active' : ''}`}
                  onClick={() => setSettings(prev => ({ ...prev, animationStyle: style.id }))}
                >
                  <div className="animation-icon">{style.icon}</div>
                  <div className="animation-info">
                    <span className="animation-name">{style.name}</span>
                    <span className="animation-desc">{style.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 이모지 목록 */}
          <div className="settings-card glass-premium">
            <div className="card-header">
              <h3>이모지 목록</h3>
              <p>리액션에 사용될 이모지들을 설정합니다.</p>
            </div>

            <div className="emoji-grid">
              {settings.emojiSet.map((emoji, index) => (
                <div key={index} className="emoji-item">
                  <span className="emoji-display">{emoji}</span>
                  <button
                    className="emoji-remove"
                    onClick={() => removeEmoji(index)}
                    disabled={settings.emojiSet.length <= 1}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div className="add-emoji-row">
              <input
                type="text"
                className="styled-input"
                value={newEmoji}
                onChange={(e) => setNewEmoji(e.target.value)}
                placeholder="새 이모지 입력..."
                onKeyDown={(e) => e.key === 'Enter' && addEmoji()}
              />
              <button className="btn-add-emoji" onClick={addEmoji}>
                <Plus size={18} /> 추가
              </button>
            </div>
          </div>
        </div>

        <aside className="chat-settings-preview-aside">
          {/* 실시간 미리보기 */}
          <OverlayPreviewWrapper title="이모지 미리보기" height={350}>
            <EmojiOverlay
              previewMode={true}
              previewSettings={settings}
              previewEmojis={previewEmojis}
              onAddEmoji={addPreviewEmoji}
            />
          </OverlayPreviewWrapper>

          {/* 테스트 */}
          <div className="test-controls glass-premium">
            <h4>미리보기 테스트</h4>
            <div className="test-buttons">
              <button className="btn-test" onClick={testPreviewEmoji}>
                <Smile size={18} /> 이모지 1개
              </button>
              <button className="btn-test burst" onClick={testPreviewBurst}>
                <Zap size={18} /> 폭발 테스트
              </button>
            </div>

            <div className="divider-line" style={{ margin: '16px 0' }} />

            <h4>실제 오버레이 테스트</h4>
            <div className="test-buttons">
              <button className="btn-test" onClick={testEmoji} disabled={!overlayHash}>
                <Smile size={18} /> 오버레이 전송
              </button>
              <button className="btn-test burst" onClick={testEmojiBurst} disabled={!overlayHash}>
                <Zap size={18} /> 폭발 전송
              </button>
            </div>
          </div>

          {/* 저장 */}
          <div className="save-controls-wrapper">
            <button className="btn-save-full" onClick={saveSettings} disabled={saving}>
              {saving ? <RefreshCw size={18} className="spin" /> : <Save size={18} />}
              {saving ? '저장 중...' : '설정 저장'}
            </button>
          </div>
        </aside>
      </div>
    </>
  );
};

export default EmojiSettings;
