import React, { useState, useEffect, useCallback } from 'react';
import {
  Copy, RefreshCw, Save, ExternalLink, Plus, Trash2,
  Film, Check, Play, StopCircle, GripVertical, RotateCcw
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL } from '../../config/api';
import socket from '../../config/socket';
import { OverlayPreviewWrapper } from './shared';
import CreditsOverlay from '../CreditsOverlay';
import LoadingSpinner from '../shared/LoadingSpinner';
import './CreditsSettings.css';

const defaultSettings = {
  title: '오늘의 방송',
  scrollSpeed: 3,
  fontFamily: 'Pretendard',
  theme: 'dark',
  backgroundColor: 'rgba(0, 0, 0, 0.9)',
  autoPopulate: true,
  minDonation: 1000,
  sections: [
    { title: '스태프', items: ['PD: 홍길동', '편집: 김철수'] },
    { title: '후원해주신 분들', items: [] }
  ]
};

const CreditsSettings = () => {
  const { token } = useAuth();
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [overlayHash, setOverlayHash] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Preview state - 페이지 로드 시 자동 재생
  const [previewPlaying, setPreviewPlaying] = useState(true);
  const [previewKey, setPreviewKey] = useState(0);

  // Generate preview credits data from current settings
  const previewCredits = {
    title: settings.title,
    sections: settings.sections.map(sec => ({
      title: sec.title,
      items: sec.items.length > 0 ? sec.items : ['예시 항목 1', '예시 항목 2']
    }))
  };

  const playPreviewCredits = useCallback(() => {
    setPreviewKey(prev => prev + 1);
    setPreviewPlaying(true);
  }, []);

  const stopPreviewCredits = useCallback(() => {
    setPreviewPlaying(false);
  }, []);

  const restartPreviewCredits = useCallback(() => {
    setPreviewPlaying(false);
    setTimeout(() => {
      setPreviewKey(prev => prev + 1);
      setPreviewPlaying(true);
    }, 100);
  }, []);

  const overlayUrl = overlayHash
    ? `${window.location.origin}/overlay/${overlayHash}/credits`
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

      const res = await fetch(`${API_URL}/api/user-settings/credits`, {
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
        body: JSON.stringify({ key: 'credits', value: settings })
      });
      socket.emit('settings-update', { key: 'credits', userHash: overlayHash });
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

  const addSection = () => {
    setSettings(prev => ({
      ...prev,
      sections: [...prev.sections, { title: '새 섹션', items: [] }]
    }));
  };

  const removeSection = (index) => {
    if (settings.sections.length <= 1) return;
    setSettings(prev => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== index)
    }));
  };

  const updateSection = (index, field, value) => {
    setSettings(prev => ({
      ...prev,
      sections: prev.sections.map((sec, i) =>
        i === index ? { ...sec, [field]: value } : sec
      )
    }));
  };

  const addItemToSection = (sectionIndex) => {
    setSettings(prev => ({
      ...prev,
      sections: prev.sections.map((sec, i) =>
        i === sectionIndex ? { ...sec, items: [...sec.items, '새 항목'] } : sec
      )
    }));
  };

  const updateSectionItem = (sectionIndex, itemIndex, value) => {
    setSettings(prev => ({
      ...prev,
      sections: prev.sections.map((sec, i) =>
        i === sectionIndex
          ? { ...sec, items: sec.items.map((item, j) => j === itemIndex ? value : item) }
          : sec
      )
    }));
  };

  const removeSectionItem = (sectionIndex, itemIndex) => {
    setSettings(prev => ({
      ...prev,
      sections: prev.sections.map((sec, i) =>
        i === sectionIndex
          ? { ...sec, items: sec.items.filter((_, j) => j !== itemIndex) }
          : sec
      )
    }));
  };

  const playCredits = () => {
    if (overlayHash) {
      const creditsData = {
        title: settings.title,
        sections: settings.sections.map(sec => ({
          title: sec.title,
          items: sec.items
        }))
      };
      socket.emit('credits-start', { userHash: overlayHash, credits: creditsData });
      setIsPlaying(true);
    }
  };

  const stopCredits = () => {
    if (overlayHash) {
      socket.emit('credits-stop', { userHash: overlayHash });
      setIsPlaying(false);
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
    <div className="settings-panel">
      <div className="premium-settings-header">
        <div className="header-top-row">
          <div className="title-area">
            <Film size={28} />
            <span className="title-text">엔딩 크레딧</span>
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
              <span className={`status-dot ${isPlaying ? 'green' : 'gray'}`}></span>
              {isPlaying ? '재생 중' : '대기 중'}
            </span>
          </div>
          <div className="url-copy-box">
            <div className="url-input-group">
              <Film size={18} className="url-icon" />
              <input type="text" value={overlayUrl} readOnly onClick={(e) => e.target.select()} />
            </div>
            <button className={`url-action-btn primary ${copied ? 'copied' : ''}`} onClick={copyUrl}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? '복사됨' : '복사'}
            </button>
          </div>
        </div>
      </div>

      {/* 실시간 미리보기 */}
      <OverlayPreviewWrapper title="크레딧 미리보기" height={500}>
        <CreditsOverlay
          key={previewKey}
          previewMode={true}
          previewSettings={settings}
          previewCredits={previewCredits}
          previewPlaying={previewPlaying}
        />
      </OverlayPreviewWrapper>

      {/* 미리보기 컨트롤 */}
      <div className="settings-card preview-control-card">
        <div className="preview-controls-row">
          {!previewPlaying ? (
            <button className="btn-preview-play" onClick={playPreviewCredits}>
              <Play size={16} /> 미리보기 재생
            </button>
          ) : (
            <>
              <button className="btn-preview-stop" onClick={stopPreviewCredits}>
                <StopCircle size={16} /> 정지
              </button>
              <button className="btn-preview-restart" onClick={restartPreviewCredits}>
                <RotateCcw size={16} /> 다시 시작
              </button>
            </>
          )}
        </div>
      </div>

      {/* 기본 설정 */}
      <div className="settings-card">
        <div className="card-header">
          <h3>기본 설정</h3>
        </div>

        <div className="settings-row-pair">
          <span className="row-label">크레딧 제목</span>
          <input
            type="text"
            className="styled-input"
            value={settings.title}
            onChange={(e) => setSettings(prev => ({ ...prev, title: e.target.value }))}
            placeholder="예: 오늘의 방송"
          />
        </div>

        <div className="settings-row-pair">
          <span className="row-label">스크롤 속도</span>
          <div className="flex-row-gap">
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={settings.scrollSpeed}
              onChange={(e) => setSettings(prev => ({ ...prev, scrollSpeed: parseInt(e.target.value) }))}
            />
            <span className="unit-value">{settings.scrollSpeed}</span>
          </div>
        </div>

        <div className="settings-row-pair">
          <span className="row-label">테마</span>
          <div className="segmented-control">
            {['dark', 'light'].map((theme) => (
              <div key={theme} className="segmented-item">
                <input
                  type="radio"
                  name="theme"
                  value={theme}
                  checked={settings.theme === theme}
                  onChange={(e) => setSettings(prev => ({ ...prev, theme: e.target.value }))}
                />
                <span className="segmented-label">{theme === 'dark' ? '다크' : '라이트'}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="settings-row-pair">
          <span className="row-label">배경색</span>
          <input
            type="color"
            value={settings.backgroundColor.startsWith('rgba') ? '#000000' : settings.backgroundColor}
            onChange={(e) => setSettings(prev => ({ ...prev, backgroundColor: e.target.value }))}
          />
        </div>
      </div>

      {/* 섹션 설정 */}
      <div className="settings-card">
        <div className="card-header">
          <h3>크레딧 섹션</h3>
          <p>방송 엔딩에 표시될 크레딧 내용을 설정합니다.</p>
        </div>

        <div className="credits-sections-list">
          {settings.sections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="credits-section-item">
              <div className="section-header">
                <GripVertical size={16} className="drag-handle" />
                <input
                  type="text"
                  className="styled-input section-title-input"
                  value={section.title}
                  onChange={(e) => updateSection(sectionIndex, 'title', e.target.value)}
                  placeholder="섹션 제목"
                />
                <button
                  className="btn-icon-small danger"
                  onClick={() => removeSection(sectionIndex)}
                  disabled={settings.sections.length <= 1}
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="section-items">
                {section.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="section-item-row">
                    <input
                      type="text"
                      className="styled-input"
                      value={item}
                      onChange={(e) => updateSectionItem(sectionIndex, itemIndex, e.target.value)}
                      placeholder="항목 내용"
                    />
                    <button
                      className="btn-icon-small danger"
                      onClick={() => removeSectionItem(sectionIndex, itemIndex)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button
                  className="btn-add-item"
                  onClick={() => addItemToSection(sectionIndex)}
                >
                  <Plus size={14} /> 항목 추가
                </button>
              </div>
            </div>
          ))}
        </div>

        <button className="btn-add-section" onClick={addSection}>
          <Plus size={18} /> 섹션 추가
        </button>
      </div>

      {/* 재생 컨트롤 */}
      <div className="settings-card">
        <div className="card-header">
          <h3>크레딧 재생</h3>
        </div>

        <div className="play-controls">
          {!isPlaying ? (
            <button className="btn-play-credits" onClick={playCredits}>
              <Play size={20} /> 크레딧 시작
            </button>
          ) : (
            <button className="btn-stop-credits" onClick={stopCredits}>
              <StopCircle size={20} /> 크레딧 정지
            </button>
          )}
        </div>
      </div>

      {/* 저장 */}
      <div className="save-controls-wrapper">
        <button className="btn-save-full" onClick={saveSettings} disabled={saving}>
          {saving ? <RefreshCw size={18} className="spin" /> : <Save size={18} />}
          {saving ? '저장 중...' : '설정 저장'}
        </button>
      </div>
    </div>
  );
};

export default CreditsSettings;
