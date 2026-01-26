import React, { useState, useEffect, useRef } from 'react';
import {
  Copy, RefreshCw, Save, Volume2, Type, Check,
  Image as ImageIcon, HelpCircle, ExternalLink, Info,
  Monitor, Palette, Settings, RotateCcw, Filter, List,
  GripVertical, Plus, Trash2, ChevronDown, ChevronUp, Music, Play
} from 'lucide-react';
import { API_URL } from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';
import { OverlayPreviewWrapper } from './shared';
import AlertOverlay from '../AlertOverlay';
import './ChatSettings.css';

const defaultSettings = {
  theme: 'default',
  duration: 30,
  volume: 50,
  ttsVolume: 50,
  ttsSpeed: 1,
  ttsMaxChars: 120,
  ttsVoice: 'default',
  animation: 'bounceIn',
  exitAnimation: 'fadeOut',
  textAnimation: 'tada',
  transparency: 100,
  showTooltip: false,
  customCss: '',
  showPaused: false,
  rangeMin: 0,
  rangeMax: 0,
  resetGifOnAlert: false,
  showDonationTypes: {
    star: true,
    balloon: true,
    video: true,
    mission: true,
    sticker: true
  },
  // Roulette settings
  useRoulette: false,
  rouletteOnly: false,
  // Filtering settings
  userFilter: '',
  botFilter: true,
  wordFilter: '',
  filterDonationMsg: true,
  // Signature list
  signatures: [
    {
      id: 1,
      minAmount: 1,
      maxAmount: 30000,
      alertSound: '',
      alertImage: '',
      animation: 'bounceIn',
      exitAnimation: 'fadeOut',
      textAnimation: 'tada',
      textFormat: '{닉네임}님 {종류} {개수}{개} 감사합니다!'
    }
  ],
  // Font & Style
  fontSize: 28,
  fontFamily: 'Pretendard',
  fontBold: false,
  useWebFont: false,
  fontColor: '#ffffff',
  nickColor: '#ffc247',
  amountColor: '#ffc247',
  rouletteColor: '#ffc247',
  fontOutlineColor: '#000000dd',
  fontOutlineSize: 2,
  useBgColor: false,
  bgColor: '#000000ff',
  bgImage: '',
  bgImageMode: 'cover'
};

const themeOptions = [
  { value: 'default', label: '기본 테마' },
  { value: 'heart', label: '하트 모션' },
  { value: 'star', label: '스타 모션' },
  { value: 'cat', label: '고양이' },
  { value: 'newyear', label: '설날' },
  { value: 'lol', label: '롤 (LoL)' },
  { value: 'pubg', label: '배그' }
];

const animationOptions = [
  { value: 'bounceIn', label: '바운스' },
  { value: 'fadeIn', label: '페이드 인' },
  { value: 'fadeOut', label: '페이드 아웃' },
  { value: 'flipInX', label: '플립' },
  { value: 'zoomIn', label: '확대' },
  { value: 'slideInRight', label: '슬라이드' }
];

const textEffects = [
  { value: 'tada', label: '타다' },
  { value: 'flash', label: '번쩍임' },
  { value: 'wobble', label: '흔들림' },
  { value: 'bounce', label: '통통' },
  { value: 'rotate', label: '회전' },
  { value: 'rollIn', label: '롤인' }
];

const ttsVoiceOptions = [
  { value: 'default', label: '기본 (여성)' },
  { value: 'male1', label: '남성 1' },
  { value: 'male2', label: '남성 2 (저음)' },
  { value: 'female1', label: '여성 1' },
  { value: 'female2', label: '여성 2 (밝은)' },
  { value: 'child', label: '어린이' },
  { value: 'robot', label: '로봇' },
  { value: 'streamer', label: '스트리머 목소리', badge: 'NEW' }
];

const AlertSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const overlayHash = user?.userHash || null;
  const [activeNav, setActiveNav] = useState('theme');
  const [expandedSignatures, setExpandedSignatures] = useState({});
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [testEvent, setTestEvent] = useState({
    sender: '테스트유저',
    amount: 10000,
    message: '테스트 후원 메시지입니다!'
  });
  const [testData, setTestData] = useState({
    sender: '테스트유저',
    amount: 1000,
    message: '응원합니다!'
  });

  const sectionRefs = {
    theme: useRef(null),
    specifics: useRef(null),
    signatures: useRef(null),
    filtering: useRef(null),
    font: useRef(null)
  };

  const scrollToSection = (id) => {
    sectionRefs[id].current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveNav(id);
  };

  useEffect(() => {
    fetchSettings();

    const options = {
      root: null,
      rootMargin: '-100px 0px -70% 0px',
      threshold: 0
    };

    const handleIntersect = (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const sectionId = entry.target.getAttribute('data-section');
          if (sectionId) setActiveNav(sectionId);
        }
      });
    };

    const observer = new IntersectionObserver(handleIntersect, options);
    const sections = document.querySelectorAll('.settings-section');
    sections.forEach(sec => observer.observe(sec));

    return () => observer.disconnect();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/api/settings/alert`);
      const data = await res.json();
      if (data.value && data.value !== '{}') {
        const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        setSettings({
          ...defaultSettings,
          ...parsed,
          showDonationTypes: {
            ...defaultSettings.showDonationTypes,
            ...(parsed.showDonationTypes || {})
          },
          signatures: parsed.signatures || defaultSettings.signatures
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Signature management functions
  const addSignature = () => {
    const newId = Math.max(...settings.signatures.map(s => s.id), 0) + 1;
    setSettings({
      ...settings,
      signatures: [...settings.signatures, {
        id: newId,
        minAmount: 1,
        maxAmount: 30000,
        alertSound: '',
        alertImage: '',
        animation: 'bounceIn',
        exitAnimation: 'fadeOut',
        textAnimation: 'tada',
        textFormat: '{닉네임}님 {종류} {개수}{개} 감사합니다!'
      }]
    });
  };

  const removeSignature = (id) => {
    if (settings.signatures.length <= 1) {
      alert('최소 1개의 시그니처가 필요합니다.');
      return;
    }
    setSettings({
      ...settings,
      signatures: settings.signatures.filter(s => s.id !== id)
    });
  };

  const updateSignature = (id, field, value) => {
    setSettings({
      ...settings,
      signatures: settings.signatures.map(s =>
        s.id === id ? { ...s, [field]: value } : s
      )
    });
  };

  const toggleSignatureExpand = (id) => {
    setExpandedSignatures(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Drag and drop handlers
  const handleDragStart = (idx) => {
    setDraggedIdx(idx);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (dropIdx) => {
    if (draggedIdx === null || draggedIdx === dropIdx) return;
    const newSignatures = [...settings.signatures];
    const [dragged] = newSignatures.splice(draggedIdx, 1);
    newSignatures.splice(dropIdx, 0, dragged);
    setSettings({ ...settings, signatures: newSignatures });
    setDraggedIdx(null);
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await fetch(`${API_URL}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'alert', value: settings })
      });
      alert('설정이 저장되었습니다.');
    } finally {
      setSaving(false);
    }
  };

  const copyUrl = () => {
    if (!overlayHash) return;
    const url = `${window.location.origin}/overlay/${overlayHash}/alerts`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetSettings = () => {
    if (window.confirm('모든 설정이 초기화됩니다. 계속하시겠습니까?')) {
      setSettings(defaultSettings);
    }
  };

  return (
    <>
      <div className="premium-settings-header animate-fade">
        <div className="header-top-row">
          <div className="title-area">
            <h2 className="title-text">후원 알림 설정</h2>
            <div className="badge-wrapper">
              <span className="badge-new">NEW</span>
              <span className="badge-info">PRO</span>
            </div>
          </div>
          <div className="action-area">
            <button className="btn-setup-guide">
              <HelpCircle size={16} /> 설정 가이드
            </button>
            <button className="btn-external-view" onClick={() => overlayHash && window.open(`/overlay/${overlayHash}/alerts`, '_blank')} disabled={!overlayHash}>
              <ExternalLink size={16} /> 새창으로 열기
            </button>
          </div>
        </div>

        <div className="url-copy-section glass-premium">
          <div className="url-label-row">
            <span className="label">방송 프로그램 브라우저 주소</span>
            <div className="label-status">
              <span className="status-dot green"></span>
              연결됨
            </div>
          </div>
          <div className="url-copy-box">
            <div className="url-input-group">
              <Monitor className="url-icon" size={18} />
              <input
                type="text"
                readOnly
                value={overlayHash ? `${window.location.origin}/overlay/${overlayHash}/alerts` : '로그인이 필요합니다'}
              />
            </div>
            <div className="url-actions">
              <button className="url-action-btn primary" onClick={copyUrl} disabled={!overlayHash}>
                {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? '복사됨' : 'URL 복사'}
              </button>
              <button className="url-action-btn" onClick={fetchSettings}>
                <RefreshCw size={15} /> 새로고침
              </button>
            </div>
          </div>
          <div className="settings-info-text">
            <Info size={16} />
            <span>생방송 시작 직후 1분이 지나도 알림창이 연결되지 않을 경우 연결 주의사항 및 새로고침을 눌러주세요.</span>
          </div>
        </div>
      </div>

      <div className="chat-settings-container">
        <div className="chat-settings-main">
          <div className="sticky-tabs">
            {[
              { id: 'theme', label: '테마', icon: <Palette size={14}/> },
              { id: 'specifics', label: '후원', icon: <Settings size={14}/> },
              { id: 'signatures', label: '시그니처', icon: <List size={14}/> },
              { id: 'filtering', label: '필터링', icon: <Filter size={14}/> },
              { id: 'font', label: '폰트 · 스타일', icon: <Type size={14}/> }
            ].map(tab => (
              <button
                key={tab.id}
                className={`settings-tab-btn ${activeNav === tab.id ? 'active' : ''}`}
                onClick={() => scrollToSection(tab.id)}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          <div className="scrolling-content-sections">
            {/* Section: Theme */}
            <section ref={sectionRefs.theme} className="settings-section" data-section="theme">
              <div className="settings-card glass-premium">
                <div className="card-header">
                  <h3>기본 및 테마 설정</h3>
                </div>
                <div className="settings-row-pair">
                  <div className="row-label">알림 테마</div>
                  <select value={settings.theme} className="styled-select" onChange={(e) => setSettings({ ...settings, theme: e.target.value })}>
                    {themeOptions.map((theme) => (
                      <option key={theme.value} value={theme.value}>{theme.label}</option>
                    ))}
                  </select>
                </div>
                <div className="settings-row-pair">
                  <div className="row-label">표시 시간</div>
                  <div className="flex-row-gap">
                    <input type="range" min="1" max="60" value={settings.duration} onChange={(e) => setSettings({ ...settings, duration: parseInt(e.target.value) })} style={{ flex: 1 }}/>
                    <span className="unit-value">{settings.duration}초</span>
                  </div>
                </div>
                <div className="settings-row-pair">
                    <div className="row-label">창 투명도</div>
                    <div className="flex-row-gap">
                        <input type="range" min="0" max="100" value={settings.transparency} onChange={(e) => setSettings({ ...settings, transparency: parseInt(e.target.value) })} style={{ flex: 1 }}/>
                        <span className="unit-value">{settings.transparency}%</span>
                    </div>
                </div>
                <div className="settings-row-pair">
                  <div className="row-label">창 부가 설정</div>
                  <div className="checkbox-group no-bg">
                    <label className={`toggle-button ${settings.showTooltip ? 'active' : ''}`}>
                      <input type="checkbox" checked={settings.showTooltip} onChange={(e) => setSettings({ ...settings, showTooltip: e.target.checked })}/>
                      <div className="check-icon">{settings.showTooltip && <Check size={10} />}</div>
                      툴팁 표시
                    </label>
                    <label className={`toggle-button ${settings.showPaused ? 'active' : ''}`}>
                      <input type="checkbox" checked={settings.showPaused} onChange={(e) => setSettings({ ...settings, showPaused: e.target.checked })}/>
                      <div className="check-icon">{settings.showPaused && <Check size={10} />}</div>
                      일시중지 표시
                    </label>
                  </div>
                </div>
                <div className="settings-row-pair vertical">
                    <div className="row-label">커스텀 CSS</div>
                    <textarea 
                        className="styled-textarea" 
                        placeholder=".alert-card { ... }" 
                        value={settings.customCss}
                        onChange={(e) => setSettings({...settings, customCss: e.target.value})}
                    />
                </div>
              </div>
            </section>

            {/* Section: Specifics */}
            <section ref={sectionRefs.specifics} className="settings-section" data-section="specifics">
              <div className="settings-card glass-premium">
                <div className="card-header">
                  <h3>SOOP 후원 설정</h3>
                  <p className="helper-text-alert">각 후원 종류별 노출 여부와 범위를 설정합니다.</p>
                </div>

                <div className="settings-row-pair">
                  <div className="row-label">후원 알림</div>
                  <div className="checkbox-group no-bg">
                    <label className={`toggle-button ${settings.useRoulette ? 'active' : ''}`}>
                      <input type="checkbox" checked={settings.useRoulette} onChange={(e) => setSettings({ ...settings, useRoulette: e.target.checked })}/>
                      <div className="check-icon">{settings.useRoulette && <Check size={10} />}</div>
                      룰렛 후원 사용
                    </label>
                  </div>
                </div>
                {settings.useRoulette && (
                  <div className="settings-info-text" style={{ marginBottom: '16px' }}>
                    <Info size={16} />
                    <span>룰렛 후원만 사용할 경우 룰렛 후원 사용 체크, 후원 종류를 모두 해제해주세요.</span>
                  </div>
                )}

                <div className="settings-row-pair vertical">
                  <div className="row-label">후원 종류</div>
                  <div className="checkbox-grid-refined">
                    {[
                      { id: 'star', label: '별풍선' },
                      { id: 'balloon', label: '애드벌룬' },
                      { id: 'video', label: '영상풍선' },
                      { id: 'mission', label: '미션(도전,대결)' },
                      { id: 'sticker', label: '스티커' }
                    ].map(type => (
                      <label key={type.id}>
                        <input
                          type="checkbox"
                          checked={settings.showDonationTypes[type.id]}
                          onChange={(e) => setSettings({
                            ...settings,
                            showDonationTypes: { ...settings.showDonationTypes, [type.id]: e.target.checked }
                          })}
                        />
                        {type.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="divider-line" />

                <div className="card-header">
                  <h3>효과 및 사운드</h3>
                </div>
                <div className="settings-row-pair">
                  <div className="row-label">등장 애니메이션</div>
                  <select value={settings.animation} className="styled-select" onChange={(e) => setSettings({ ...settings, animation: e.target.value })}>
                    {animationOptions.map((anim) => <option key={anim.value} value={anim.value}>{anim.label}</option>)}
                  </select>
                </div>
                <div className="settings-row-pair">
                  <div className="row-label">텍스트 효과</div>
                  <select value={settings.textAnimation} className="styled-select" onChange={(e) => setSettings({ ...settings, textAnimation: e.target.value })}>
                    {textEffects.map((effect) => <option key={effect.value} value={effect.value}>{effect.label}</option>)}
                  </select>
                </div>
                <div className="settings-row-pair">
                  <div className="row-label">알림음 볼륨</div>
                  <div className="flex-row-gap">
                    <Volume2 size={16} className="text-muted" />
                    <input type="range" min="0" max="100" value={settings.volume} onChange={(e) => setSettings({ ...settings, volume: parseInt(e.target.value) })} style={{ flex: 1 }}/>
                    <span className="unit-value">{settings.volume}%</span>
                  </div>
                </div>
                <div className="settings-row-pair">
                  <div className="row-label">TTS 설정</div>
                  <div className="flex-row-gap wrap-row">
                    <div className="color-input-item" style={{ minWidth: '140px' }}>
                        <span className="tiny-label">TTS 목소리</span>
                        <select
                          value={settings.ttsVoice}
                          onChange={(e) => setSettings({ ...settings, ttsVoice: e.target.value })}
                          className="styled-select"
                        >
                          {ttsVoiceOptions.map((voice) => (
                            <option key={voice.value} value={voice.value}>
                              {voice.label}{voice.badge ? ` (${voice.badge})` : ''}
                            </option>
                          ))}
                        </select>
                    </div>
                    <div className="color-input-item">
                        <span className="tiny-label">TTS 볼륨</span>
                        <input type="range" min="0" max="100" value={settings.ttsVolume} onChange={(e) => setSettings({ ...settings, ttsVolume: parseInt(e.target.value) })} />
                    </div>
                    <div className="color-input-item" style={{ width: '80px' }}>
                        <span className="tiny-label">속도</span>
                        <input type="number" step="0.1" className="styled-input" value={settings.ttsSpeed} onChange={(e) => setSettings({ ...settings, ttsSpeed: parseFloat(e.target.value) })} />
                    </div>
                    <div className="color-input-item" style={{ width: '80px' }}>
                        <span className="tiny-label">글자수 제한</span>
                        <input type="number" className="styled-input" value={settings.ttsMaxChars} onChange={(e) => setSettings({ ...settings, ttsMaxChars: parseInt(e.target.value) })} />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section: Signatures */}
            <section ref={sectionRefs.signatures} className="settings-section" data-section="signatures">
              <div className="settings-card glass-premium">
                <div className="card-header">
                  <h3>후원 리스트 (시그니처)</h3>
                  <p className="helper-text-alert">후원 개수 범위별로 다른 알림 설정을 적용합니다.</p>
                </div>

                <div className="settings-info-text" style={{ marginBottom: '16px' }}>
                  <Info size={16} />
                  <span>후원 개수가 겹칠 경우 마지막 설정이 우선순위입니다. 전체 범위는 ☰를 드래그해서 최상위로 옮겨주세요.</span>
                </div>

                <div className="signature-list">
                  {settings.signatures.map((sig, idx) => (
                    <div
                      key={sig.id}
                      className={`signature-item ${draggedIdx === idx ? 'dragging' : ''}`}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(idx)}
                    >
                      <div className="signature-header">
                        <div className="drag-handle">
                          <GripVertical size={16} />
                        </div>
                        <span className="signature-number">{idx + 1}</span>
                        <div className="signature-range">
                          <input
                            type="number"
                            className="styled-input tiny-input"
                            value={sig.minAmount}
                            onChange={(e) => updateSignature(sig.id, 'minAmount', parseInt(e.target.value) || 0)}
                            min="0"
                          />
                          <span>~</span>
                          <input
                            type="number"
                            className="styled-input tiny-input"
                            value={sig.maxAmount}
                            onChange={(e) => updateSignature(sig.id, 'maxAmount', parseInt(e.target.value) || 0)}
                            min="0"
                          />
                          <span className="tiny-label">개</span>
                        </div>
                        <button
                          className="btn-icon-small"
                          onClick={() => toggleSignatureExpand(sig.id)}
                          title="상세 설정"
                        >
                          {expandedSignatures[sig.id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                        <button
                          className="btn-icon-small danger"
                          onClick={() => removeSignature(sig.id)}
                          title="삭제"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="signature-text-format">
                        <input
                          type="text"
                          className="styled-input"
                          value={sig.textFormat}
                          onChange={(e) => updateSignature(sig.id, 'textFormat', e.target.value)}
                          placeholder="{닉네임}님 {종류} {개수}{개} 감사합니다!"
                        />
                      </div>

                      {expandedSignatures[sig.id] && (
                        <div className="signature-details">
                          <div className="settings-row-pair">
                            <div className="row-label"><Music size={14} /> 알림음 URL</div>
                            <input
                              type="text"
                              className="styled-input"
                              value={sig.alertSound}
                              onChange={(e) => updateSignature(sig.id, 'alertSound', e.target.value)}
                              placeholder="https://example.com/sound.mp3"
                            />
                          </div>
                          <div className="settings-row-pair">
                            <div className="row-label"><ImageIcon size={14} /> 알림 이미지 URL</div>
                            <input
                              type="text"
                              className="styled-input"
                              value={sig.alertImage}
                              onChange={(e) => updateSignature(sig.id, 'alertImage', e.target.value)}
                              placeholder="https://example.com/image.gif"
                            />
                          </div>
                          <div className="settings-row-pair">
                            <div className="row-label">등장 애니메이션</div>
                            <select
                              value={sig.animation}
                              className="styled-select"
                              onChange={(e) => updateSignature(sig.id, 'animation', e.target.value)}
                            >
                              {animationOptions.map((anim) => (
                                <option key={anim.value} value={anim.value}>{anim.label}</option>
                              ))}
                            </select>
                          </div>
                          <div className="settings-row-pair">
                            <div className="row-label">텍스트 효과</div>
                            <select
                              value={sig.textAnimation}
                              className="styled-select"
                              onChange={(e) => updateSignature(sig.id, 'textAnimation', e.target.value)}
                            >
                              {textEffects.map((effect) => (
                                <option key={effect.value} value={effect.value}>{effect.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <button className="btn-add-signature" onClick={addSignature}>
                  <Plus size={16} /> 시그니처 추가
                </button>
              </div>
            </section>

            {/* Section: Filtering */}
            <section ref={sectionRefs.filtering} className="settings-section" data-section="filtering">
              <div className="settings-card glass-premium">
                <div className="card-header">
                  <h3>필터링 설정</h3>
                  <p className="helper-text-alert">특정 사용자나 단어를 필터링합니다.</p>
                </div>

                <div className="settings-row-pair vertical">
                  <div className="row-label">사용자 필터링</div>
                  <textarea
                    className="styled-textarea"
                    placeholder="닉네임 또는 아이디 입력 (쉼표 또는 줄바꿈으로 구분)"
                    value={settings.userFilter}
                    onChange={(e) => setSettings({ ...settings, userFilter: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="settings-row-pair">
                  <div className="row-label">봇 필터링</div>
                  <label className={`toggle-button ${settings.botFilter ? 'active' : ''}`}>
                    <input
                      type="checkbox"
                      checked={settings.botFilter}
                      onChange={(e) => setSettings({ ...settings, botFilter: e.target.checked })}
                    />
                    <div className="check-icon">{settings.botFilter && <Check size={10} />}</div>
                    봇 필터링 사용
                  </label>
                </div>

                <div className="settings-row-pair vertical">
                  <div className="row-label">단어 필터링</div>
                  <textarea
                    className="styled-textarea"
                    placeholder="필터링 할 단어 입력 (쉼표 또는 줄바꿈으로 구분)"
                    value={settings.wordFilter}
                    onChange={(e) => setSettings({ ...settings, wordFilter: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="settings-row-pair">
                  <div className="row-label">후원 메시지 필터링</div>
                  <label className={`toggle-button ${settings.filterDonationMsg ? 'active' : ''}`}>
                    <input
                      type="checkbox"
                      checked={settings.filterDonationMsg}
                      onChange={(e) => setSettings({ ...settings, filterDonationMsg: e.target.checked })}
                    />
                    <div className="check-icon">{settings.filterDonationMsg && <Check size={10} />}</div>
                    후원알림 메시지 필터링
                  </label>
                </div>

                <div className="settings-info-text">
                  <Info size={16} />
                  <span>필터링된 단어는 ♡로 표시됩니다. 필터링 설정은 URL을 새로고침해야 적용됩니다.</span>
                </div>
              </div>
            </section>

            {/* Section: Font */}
            <section ref={sectionRefs.font} className="settings-section" data-section="font">
              <div className="settings-card glass-premium">
                <div className="card-header">
                  <h3>폰트 · 스타일 설정</h3>
                </div>

                <div className="settings-row-pair vertical">
                  <div className="row-label">폰트 미리보기</div>
                  <div className="preview-box-mini" style={{
                    padding: '32px',
                    background: settings.useBgColor ? settings.bgColor : '#f8fafc', 
                    borderRadius: '16px',
                    border: '1px solid var(--border-light)',
                    fontFamily: settings.fontFamily,
                    fontSize: `${settings.fontSize}px`,
                    fontWeight: settings.fontBold ? 'bold' : 'normal',
                    color: settings.fontColor,
                    textShadow: settings.fontOutlineSize > 0 ? `0 0 ${settings.fontOutlineSize}px ${settings.fontOutlineColor}` : 'none',
                    textAlign: 'center',
                    minHeight: '140px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    {settings.bgImage && (
                      <div style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundImage: `url(${settings.bgImage})`,
                        backgroundSize: settings.bgImageMode === 'repeat' ? 'auto' : settings.bgImageMode,
                        backgroundPosition: 'center',
                        zIndex: 0,
                        opacity: 0.5
                      }}></div>
                    )}
                    <div style={{ position: 'relative', zIndex: 1 }}>
                       <span style={{ color: settings.nickColor }}>위플랩</span>님 <span style={{ color: settings.amountColor }}>100개</span> 감사합니다!
                    </div>
                  </div>
                </div>

                <div className="settings-row-pair">
                  <div className="row-label">폰트 선택</div>
                  <div className="flex-row-gap">
                    <select value={settings.fontFamily} onChange={(e) => setSettings({...settings, fontFamily: e.target.value})} className="styled-select" style={{ flex: 1 }}>
                      <option value="Pretendard">Pretendard (기본)</option>
                      <option value="NanumGothic">나눔고딕</option>
                      <option value="GmarketSans">G마켓 산스</option>
                      <option value="CookieRun">쿠키런</option>
                    </select>
                    <label className={`toggle-button ${settings.fontBold ? 'active' : ''}`}>
                      <input type="checkbox" checked={settings.fontBold} onChange={(e) => setSettings({...settings, fontBold: e.target.checked})}/>
                      <div className="check-icon">{settings.fontBold && <Check size={10} />}</div>
                      굵게
                    </label>
                  </div>
                </div>

                <div className="settings-row-pair vertical">
                    <div className="row-label">색상 설정</div>
                    <div className="flex-row-gap wrap-row">
                        <div className="color-input-item">
                            <span className="tiny-label">기본 텍스트</span>
                            <input type="color" value={settings.fontColor} onChange={(e) => setSettings({...settings, fontColor: e.target.value})} />
                        </div>
                        <div className="color-input-item">
                            <span className="tiny-label">닉네임</span>
                            <input type="color" value={settings.nickColor} onChange={(e) => setSettings({...settings, nickColor: e.target.value})} />
                        </div>
                        <div className="color-input-item">
                            <span className="tiny-label">후원 개수</span>
                            <input type="color" value={settings.amountColor} onChange={(e) => setSettings({...settings, amountColor: e.target.value})} />
                        </div>
                        <div className="color-input-item">
                            <span className="tiny-label">룰렛/미션</span>
                            <input type="color" value={settings.rouletteColor} onChange={(e) => setSettings({...settings, rouletteColor: e.target.value})} />
                        </div>
                    </div>
                </div>

                <div className="settings-row-pair">
                  <div className="row-label">폰트 외곽선</div>
                  <div className="flex-row-gap">
                    <input type="color" value={settings.fontOutlineColor?.substring(0, 7)} onChange={(e) => setSettings({...settings, fontOutlineColor: e.target.value + 'dd'})} />
                    <input type="range" min="0" max="10" step="0.5" value={settings.fontOutlineSize} onChange={(e) => setSettings({...settings, fontOutlineSize: parseFloat(e.target.value)})} style={{ flex: 1 }}/>
                    <span className="unit-value">{settings.fontOutlineSize}px</span>
                  </div>
                </div>

                <div className="divider-line" />

                <div className="settings-row-pair">
                  <div className="row-label">배경색 사용</div>
                  <div className="flex-row-gap">
                    <label className={`toggle-button ${settings.useBgColor ? 'active' : ''}`}>
                      <input type="checkbox" checked={settings.useBgColor} onChange={(e) => setSettings({...settings, useBgColor: e.target.checked})}/>
                      <div className="check-icon">{settings.useBgColor && <Check size={10} />}</div>
                      배경색 사용
                    </label>
                    <input type="color" value={settings.bgColor?.substring(0, 7)} onChange={(e) => setSettings({...settings, bgColor: e.target.value + 'ff'})} disabled={!settings.useBgColor} />
                  </div>
                </div>

                <div className="settings-row-pair vertical">
                  <div className="row-label">배경 이미지</div>
                  <div className="bg-upload-zone">
                    <ImageIcon size={24} className="text-muted" />
                    <span>이미지가 없습니다. (파일을 마우스로 끌어다 놓으세요)</span>
                  </div>
                  <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                    <input 
                      type="text" 
                      placeholder="외부 이미지 URL" 
                      value={settings.bgImage} 
                      onChange={(e) => setSettings({...settings, bgImage: e.target.value})} 
                      className="styled-input" 
                      style={{ flex: 1 }} 
                    />
                    <select value={settings.bgImageMode} onChange={(e) => setSettings({...settings, bgImageMode: e.target.value})} className="styled-select">
                      <option value="cover">꽉 채우기</option>
                      <option value="contain">맞춤</option>
                      <option value="repeat">반복</option>
                    </select>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        <aside className="chat-settings-preview-aside">
          <OverlayPreviewWrapper title="후원 알림 미리보기" height={450}>
            <AlertOverlay
              previewMode={true}
              previewSettings={settings}
              previewEvent={testEvent}
            />
          </OverlayPreviewWrapper>

          <div className="test-controls glass-premium">
            <div className="section-title-with-badge">
              <h4>테스트</h4>
            </div>

            <div className="test-form" style={{ marginTop: '12px' }}>
              <input
                type="text"
                className="styled-input"
                placeholder="닉네임"
                value={testData.sender}
                onChange={(e) => setTestData({ ...testData, sender: e.target.value })}
              />
              <input
                type="number"
                className="styled-input"
                placeholder="금액"
                value={testData.amount}
                onChange={(e) => setTestData({ ...testData, amount: parseInt(e.target.value) || 0 })}
              />
              <input
                type="text"
                className="styled-input"
                placeholder="메시지"
                value={testData.message}
                onChange={(e) => setTestData({ ...testData, message: e.target.value })}
                style={{ gridColumn: 'span 2' }}
              />
            </div>

            <button
              className="btn-test-primary"
              onClick={() => {
                setTestEvent(null);
                setTimeout(() => {
                  setTestEvent({
                    sender: testData.sender,
                    amount: testData.amount,
                    message: testData.message
                  });
                  setTimeout(() => setTestEvent(null), (settings.duration || 5) * 1000);
                }, 100);
              }}
              style={{ marginTop: '16px' }}
            >
              <Play size={16} /> 알림 테스트
            </button>
          </div>

          <div className="save-controls-wrapper">
            <button className="btn-save-full" onClick={saveSettings} disabled={saving}>
              {saving ? <RefreshCw className="spin" size={18}/> : <Save size={18}/>}
              설정 저장하기
            </button>
            <button className="btn-reset-light" onClick={resetSettings}>
              <RotateCcw size={14} /> 설정 초기화
            </button>
          </div>
        </aside>
      </div>
    </>
  );
};

export default AlertSettings;
