import React, { useState, useEffect, useCallback } from 'react';
import {
  Copy, RefreshCw, Save, ExternalLink, Plus, Trash2,
  Disc, Settings, Palette, Volume2, Play, Check, GripVertical,
  AlertCircle, HelpCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL } from '../../config/api';
import socket from '../../config/socket';
import { OverlayPreviewWrapper } from './shared';
import RouletteOverlay from '../RouletteOverlay';
import LoadingSpinner from '../shared/LoadingSpinner';
import './RouletteSettings.css';

const defaultColors = [
  '#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#a8e6cf',
  '#dcedc1', '#ffd93d', '#6bcb77', '#ff8fab', '#a0c4ff'
];

const defaultSettings = {
  triggerType: 'minimum',
  triggerAmount: 1000,
  triggerMax: null,
  spinDuration: 5000,
  segments: [
    { text: '꽝', color: '#ff6b6b', probability: 30 },
    { text: '당첨!', color: '#4ecdc4', probability: 30 },
    { text: '대박!', color: '#ffe66d', probability: 20 },
    { text: '재도전', color: '#95e1d3', probability: 20 }
  ],
  soundUrl: '',
  isActive: true
};

const RouletteSettings = () => {
  const { token, user } = useAuth();
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const overlayHash = user?.userHash || null;
  const [testSpinning, setTestSpinning] = useState(false);

  // Preview state
  const [triggerSpin, setTriggerSpin] = useState(false);
  const [spinResult, setSpinResult] = useState(null);

  const handleSpinComplete = useCallback((result) => {
    setSpinResult(result);
    setTriggerSpin(false);
    setTestSpinning(false);
  }, []);

  const testPreviewSpin = () => {
    if (testSpinning) return;
    setTestSpinning(true);
    setSpinResult(null);
    setTriggerSpin(true);
  };

  const overlayUrl = overlayHash
    ? `${window.location.origin}/overlay/${overlayHash}/roulette`
    : '';

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/api/user-settings/roulette`, {
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
        body: JSON.stringify({ key: 'roulette', value: settings })
      });

      // Notify overlays about settings update
      socket.emit('settings-update', { key: 'roulette', userHash: overlayHash });
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

  const addSegment = () => {
    if (settings.segments.length >= 10) return;
    const newColor = defaultColors[settings.segments.length % defaultColors.length];
    setSettings(prev => ({
      ...prev,
      segments: [...prev.segments, { text: '새 항목', color: newColor, probability: 10 }]
    }));
  };

  const removeSegment = (index) => {
    if (settings.segments.length <= 2) return;
    setSettings(prev => ({
      ...prev,
      segments: prev.segments.filter((_, i) => i !== index)
    }));
  };

  const updateSegment = (index, field, value) => {
    setSettings(prev => ({
      ...prev,
      segments: prev.segments.map((seg, i) =>
        i === index ? { ...seg, [field]: value } : seg
      )
    }));
  };

  const testSpin = () => {
    if (testSpinning) return;
    setTestSpinning(true);

    // Calculate random result based on probability
    const totalProb = settings.segments.reduce((sum, s) => sum + (s.probability || 0), 0);
    let random = Math.random() * totalProb;
    let resultIndex = 0;

    for (let i = 0; i < settings.segments.length; i++) {
      random -= settings.segments[i].probability || 0;
      if (random <= 0) {
        resultIndex = i;
        break;
      }
    }

    // Emit test spin event
    if (overlayHash) {
      socket.emit('roulette-spin', {
        userHash: overlayHash,
        resultIndex,
        segments: settings.segments
      });
    }

    setTimeout(() => setTestSpinning(false), settings.spinDuration + 500);
  };

  const getTotalProbability = () => {
    return settings.segments.reduce((sum, s) => sum + (s.probability || 0), 0);
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
            <Disc size={28} />
            <span className="title-text">룰렛 설정</span>
            <div className="badge-wrapper">
              <span className="badge-new">NEW</span>
            </div>
          </div>
          <div className="action-area">
            <button className="btn-copy-url" onClick={copyUrl}>
              {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? '복사됨' : 'URL 복사'}
            </button>
            <button className="btn-external-view" onClick={() => window.open(overlayUrl, '_blank')}>
              <ExternalLink size={16} /> 오버레이 보기
            </button>
          </div>
        </div>
      </div>

      <div className="roulette-settings-container">
        <div className="roulette-settings-main">
          {/* 트리거 설정 */}
          <div className="settings-card">
            <div className="card-header">
              <h3>룰렛 트리거 설정</h3>
              <p>어떤 후원 금액에서 룰렛이 돌아갈지 설정합니다.</p>
            </div>

            <div className="settings-row-pair">
              <span className="row-label">트리거 조건</span>
              <div className="radio-group-refined">
                <label>
                  <input
                    type="radio"
                    name="triggerType"
                    value="minimum"
                    checked={settings.triggerType === 'minimum'}
                    onChange={(e) => setSettings(prev => ({ ...prev, triggerType: e.target.value }))}
                  />
                  최소 금액 이상
                </label>
                <label>
                  <input
                    type="radio"
                    name="triggerType"
                    value="exact"
                    checked={settings.triggerType === 'exact'}
                    onChange={(e) => setSettings(prev => ({ ...prev, triggerType: e.target.value }))}
                  />
                  정확한 금액
                </label>
                <label>
                  <input
                    type="radio"
                    name="triggerType"
                    value="range"
                    checked={settings.triggerType === 'range'}
                    onChange={(e) => setSettings(prev => ({ ...prev, triggerType: e.target.value }))}
                  />
                  금액 범위
                </label>
              </div>
            </div>

            <div className="settings-row-pair">
              <span className="row-label">
                {settings.triggerType === 'range' ? '최소 금액' : '트리거 금액'}
              </span>
              <div className="flex-row-gap">
                <input
                  type="number"
                  className="styled-input"
                  value={settings.triggerAmount}
                  onChange={(e) => setSettings(prev => ({ ...prev, triggerAmount: parseInt(e.target.value) || 0 }))}
                  min="0"
                  step="100"
                />
                <span className="unit-value">원</span>
              </div>
            </div>

            {settings.triggerType === 'range' && (
              <div className="settings-row-pair">
                <span className="row-label">최대 금액</span>
                <div className="flex-row-gap">
                  <input
                    type="number"
                    className="styled-input"
                    value={settings.triggerMax || ''}
                    onChange={(e) => setSettings(prev => ({ ...prev, triggerMax: parseInt(e.target.value) || null }))}
                    min={settings.triggerAmount}
                    step="100"
                    placeholder="무제한"
                  />
                  <span className="unit-value">원</span>
                </div>
              </div>
            )}

            <div className="settings-row-pair">
              <span className="row-label">회전 시간</span>
              <div className="flex-row-gap">
                <input
                  type="range"
                  min="2000"
                  max="10000"
                  step="500"
                  value={settings.spinDuration}
                  onChange={(e) => setSettings(prev => ({ ...prev, spinDuration: parseInt(e.target.value) }))}
                />
                <span className="unit-value">{(settings.spinDuration / 1000).toFixed(1)}초</span>
              </div>
            </div>
          </div>

          {/* 룰렛 세그먼트 설정 */}
          <div className="settings-card">
            <div className="card-header">
              <h3>룰렛 항목 설정</h3>
              <p>룰렛에 표시될 항목들을 설정합니다. (2~10개)</p>
            </div>

            {getTotalProbability() !== 100 && (
              <div className="warning-banner">
                <AlertCircle size={16} />
                <span>확률 합계가 {getTotalProbability()}%입니다. 100%로 맞춰주세요.</span>
              </div>
            )}

            <div className="segments-list">
              {settings.segments.map((segment, index) => (
                <div key={index} className="segment-item">
                  <div className="segment-drag">
                    <GripVertical size={16} />
                  </div>
                  <div className="segment-number">{index + 1}</div>
                  <div className="segment-fields">
                    <input
                      type="text"
                      className="styled-input segment-text"
                      value={segment.text}
                      onChange={(e) => updateSegment(index, 'text', e.target.value)}
                      placeholder="항목명"
                    />
                    <div className="segment-color-wrap">
                      <input
                        type="color"
                        value={segment.color}
                        onChange={(e) => updateSegment(index, 'color', e.target.value)}
                      />
                    </div>
                    <div className="segment-prob-wrap">
                      <input
                        type="number"
                        className="styled-input"
                        value={segment.probability}
                        onChange={(e) => updateSegment(index, 'probability', parseInt(e.target.value) || 0)}
                        min="0"
                        max="100"
                      />
                      <span>%</span>
                    </div>
                  </div>
                  <button
                    className="btn-icon-small danger"
                    onClick={() => removeSegment(index)}
                    disabled={settings.segments.length <= 2}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <button
              className="btn-add-segment"
              onClick={addSegment}
              disabled={settings.segments.length >= 10}
            >
              <Plus size={18} /> 항목 추가
            </button>
          </div>

          {/* 테스트 컨트롤 */}
          <div className="settings-card">
            <div className="card-header">
              <h3>테스트 스핀</h3>
            </div>

            <div className="test-spin-controls">
              <button
                className="btn-test-spin"
                onClick={testPreviewSpin}
                disabled={testSpinning}
              >
                <Play size={18} />
                {testSpinning ? '회전 중...' : '미리보기 스핀'}
              </button>

              {spinResult && !testSpinning && (
                <div className="spin-result-display">
                  <span className="result-label">결과:</span>
                  <span className="result-value" style={{ color: spinResult.color }}>
                    {spinResult.text}
                  </span>
                </div>
              )}
            </div>

            <p className="test-hint">
              실제 오버레이로 테스트하려면 아래 버튼을 사용하세요.
            </p>

            <button
              className="btn-test-overlay"
              onClick={testSpin}
              disabled={testSpinning}
            >
              <ExternalLink size={16} />
              오버레이 테스트 스핀
            </button>
          </div>

          {/* 저장 버튼 */}
          <div className="save-controls-wrapper">
            <button className="btn-save-full" onClick={saveSettings} disabled={saving}>
              {saving ? <RefreshCw size={18} className="spin" /> : <Save size={18} />}
              {saving ? '저장 중...' : '설정 저장'}
            </button>
          </div>
        </div>

        {/* 실시간 미리보기 - 오른쪽 사이드바 */}
        <aside className="roulette-settings-preview-aside">
          <OverlayPreviewWrapper title="룰렛 미리보기" height={500}>
            <RouletteOverlay
              previewMode={true}
              previewSettings={settings}
              triggerSpin={triggerSpin}
              onSpinComplete={handleSpinComplete}
            />
          </OverlayPreviewWrapper>
        </aside>
      </div>
    </>
  );
};

export default RouletteSettings;
