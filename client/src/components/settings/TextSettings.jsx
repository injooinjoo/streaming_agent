import React, { useState, useEffect, useRef } from 'react';
import {
  Copy, RefreshCw, Save, Type, Check,
  Image as ImageIcon, HelpCircle, ExternalLink, Info,
  Monitor, Palette, Settings, RotateCcw, AlignLeft
} from 'lucide-react';
import { API_URL } from '../../config/api';
import './ChatSettings.css';

const defaultSettings = {
  // Basic settings
  mode: 'text',
  scoreboardType: 'star',
  transparency: 100,
  showTooltip: false,
  customCss: '',

  // Detail settings
  textFormat: '방송 준비 중입니다. {시간}',
  alignment: 'center',
  autoSave: false,
  scrollDirection: 'none',
  scrollSpeed: 15,

  // Font settings
  fontSize: 28,
  fontFamily: 'Pretendard',
  fontBold: false,
  useWebFont: false,
  fontColor: '#ffffff',
  fontOutlineColor: '#000000dd',
  fontOutlineSize: 2,

  // Background settings
  useBgColor: false,
  bgColor: '#00000000',
  bgImage: '',
  bgImageMode: 'cover'
};

const scoreboardOptions = [
  { value: 'star', label: '스타 점수' },
  { value: 'box', label: '박스 점수' },
  { value: 'top', label: '상단 점수' },
  { value: 'color', label: '색상 점수' },
  { value: 'multi', label: '멀티 점수' }
];

const scrollOptions = [
  { value: 'none', label: '사용 안함' },
  { value: 'down', label: '아래쪽으로' },
  { value: 'up', label: '위쪽으로' },
  { value: 'left', label: '왼쪽으로' },
  { value: 'right', label: '오른쪽으로' }
];

const alignmentOptions = [
  { value: 'left', label: '왼쪽' },
  { value: 'center', label: '가운데' },
  { value: 'right', label: '오른쪽' }
];

const TextSettings = () => {
  const [settings, setSettings] = useState(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [activeNav, setActiveNav] = useState('basic');

  const sectionRefs = {
    basic: useRef(null),
    detail: useRef(null),
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
      const res = await fetch(`${API_URL}/api/settings/text`);
      const data = await res.json();
      if (data.value && data.value !== '{}') {
        const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        setSettings({ ...defaultSettings, ...parsed });
      }
    } catch (error) {
      console.error('Failed to fetch text settings', error);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await fetch(`${API_URL}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'text', value: settings })
      });
      alert('자막 설정이 저장되었습니다.');
    } finally {
      setSaving(false);
    }
  };

  const copyUrl = () => {
    const url = `${window.location.origin}/overlay/text`;
    navigator.clipboard.writeText(url);
    alert('URL이 복사되었습니다.');
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
            <h2 className="title-text">자막 설정</h2>
            <div className="badge-wrapper">
              <span className="badge-info">PRO</span>
            </div>
          </div>
          <div className="action-area">
            <button className="btn-setup-guide">
              <HelpCircle size={16} /> 설정 가이드
            </button>
            <button className="btn-external-view" onClick={() => window.open('/overlay/text', '_blank')}>
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
                value={`${window.location.origin}/overlay/text`}
              />
            </div>
            <div className="url-actions">
              <button className="url-action-btn primary" onClick={copyUrl}>
                <Copy size={15} /> URL 복사
              </button>
              <button className="url-action-btn" onClick={fetchSettings}>
                <RefreshCw size={15} /> 새로고침
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="chat-settings-container">
        <div className="chat-settings-main">
          <div className="sticky-tabs">
            {[
              { id: 'basic', label: '기본 설정', icon: <Palette size={14}/> },
              { id: 'detail', label: '상세 설정', icon: <Settings size={14}/> },
              { id: 'font', label: '폰트 · 배경', icon: <Type size={14}/> }
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
            {/* Section: Basic */}
            <section ref={sectionRefs.basic} className="settings-section" data-section="basic">
              <div className="settings-card glass-premium">
                <div className="card-header">
                  <h3>기본 설정</h3>
                </div>

                <div className="settings-row-pair">
                  <div className="row-label">자막 종류</div>
                  <select
                    value={settings.mode}
                    className="styled-select"
                    onChange={(e) => setSettings({ ...settings, mode: e.target.value })}
                  >
                    <option value="text">텍스트</option>
                    <option value="scoreboard">점수판</option>
                  </select>
                </div>

                {settings.mode === 'scoreboard' && (
                  <div className="settings-row-pair">
                    <div className="row-label">점수판 스타일</div>
                    <select
                      value={settings.scoreboardType}
                      className="styled-select"
                      onChange={(e) => setSettings({ ...settings, scoreboardType: e.target.value })}
                    >
                      {scoreboardOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="settings-row-pair">
                  <div className="row-label">창 투명도</div>
                  <div className="flex-row-gap">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.transparency}
                      onChange={(e) => setSettings({ ...settings, transparency: parseInt(e.target.value) })}
                      style={{ flex: 1 }}
                    />
                    <span className="unit-value">{settings.transparency}%</span>
                  </div>
                </div>

                <div className="settings-row-pair">
                  <div className="row-label">창 부가 설정</div>
                  <label className={`toggle-button ${settings.showTooltip ? 'active' : ''}`}>
                    <input
                      type="checkbox"
                      checked={settings.showTooltip}
                      onChange={(e) => setSettings({ ...settings, showTooltip: e.target.checked })}
                    />
                    <div className="check-icon">{settings.showTooltip && <Check size={10} />}</div>
                    창 툴팁 메뉴 사용
                  </label>
                </div>

                <div className="settings-row-pair vertical">
                  <div className="row-label">커스텀 CSS</div>
                  <textarea
                    className="styled-textarea"
                    placeholder=".caption-text { ... }"
                    value={settings.customCss}
                    onChange={(e) => setSettings({ ...settings, customCss: e.target.value })}
                  />
                </div>
              </div>
            </section>

            {/* Section: Detail */}
            <section ref={sectionRefs.detail} className="settings-section" data-section="detail">
              <div className="settings-card glass-premium">
                <div className="card-header">
                  <h3>상세 설정</h3>
                </div>

                <div className="settings-row-pair">
                  <div className="row-label">자막 자동 저장</div>
                  <label className={`toggle-button ${settings.autoSave ? 'active' : ''}`}>
                    <input
                      type="checkbox"
                      checked={settings.autoSave}
                      onChange={(e) => setSettings({ ...settings, autoSave: e.target.checked })}
                    />
                    <div className="check-icon">{settings.autoSave && <Check size={10} />}</div>
                    자동 저장 사용
                  </label>
                </div>

                {settings.autoSave && (
                  <div className="settings-info-text" style={{ marginBottom: '16px' }}>
                    <Info size={16} />
                    <span>입력된 자막 내용이 실시간으로 방송화면에 반영됩니다.</span>
                  </div>
                )}

                <div className="settings-row-pair vertical">
                  <div className="row-label">텍스트 형식</div>
                  <input
                    type="text"
                    className="styled-input"
                    value={settings.textFormat}
                    onChange={(e) => setSettings({ ...settings, textFormat: e.target.value })}
                  />
                  <p className="helper-text-alert" style={{ marginTop: '8px' }}>
                    키워드: {'{시간}'}, {'{날짜}'}, {'{요일}'}, {'{초}'}
                  </p>
                </div>

                <div className="settings-row-pair">
                  <div className="row-label"><AlignLeft size={14} /> 정렬</div>
                  <select
                    value={settings.alignment}
                    className="styled-select"
                    onChange={(e) => setSettings({ ...settings, alignment: e.target.value })}
                  >
                    {alignmentOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="divider-line" />

                <div className="card-header">
                  <h3>자막 스크롤</h3>
                </div>

                <div className="settings-row-pair">
                  <div className="row-label">스크롤 방향</div>
                  <select
                    value={settings.scrollDirection}
                    className="styled-select"
                    onChange={(e) => setSettings({ ...settings, scrollDirection: e.target.value })}
                  >
                    {scrollOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {settings.scrollDirection !== 'none' && (
                  <div className="settings-row-pair">
                    <div className="row-label">스크롤 속도</div>
                    <div className="flex-row-gap">
                      <input
                        type="range"
                        min="1"
                        max="60"
                        value={settings.scrollSpeed}
                        onChange={(e) => setSettings({ ...settings, scrollSpeed: parseInt(e.target.value) })}
                        style={{ flex: 1 }}
                      />
                      <span className="unit-value">{settings.scrollSpeed}초</span>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Section: Font */}
            <section ref={sectionRefs.font} className="settings-section" data-section="font">
              <div className="settings-card glass-premium">
                <div className="card-header">
                  <h3>폰트 · 배경 설정</h3>
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
                    textAlign: settings.alignment,
                    minHeight: '100px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: settings.alignment === 'left' ? 'flex-start' : settings.alignment === 'right' ? 'flex-end' : 'center',
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
                      안녕하세요. 감사합니다! 1234567890
                    </div>
                  </div>
                </div>

                <div className="settings-row-pair">
                  <div className="row-label">폰트 선택</div>
                  <div className="flex-row-gap">
                    <select
                      value={settings.fontFamily}
                      onChange={(e) => setSettings({ ...settings, fontFamily: e.target.value })}
                      className="styled-select"
                      style={{ flex: 1 }}
                    >
                      <option value="Pretendard">Pretendard (기본)</option>
                      <option value="NanumGothic">나눔고딕</option>
                      <option value="GmarketSans">G마켓 산스</option>
                      <option value="CookieRun">쿠키런</option>
                    </select>
                    <label className={`toggle-button ${settings.fontBold ? 'active' : ''}`}>
                      <input
                        type="checkbox"
                        checked={settings.fontBold}
                        onChange={(e) => setSettings({ ...settings, fontBold: e.target.checked })}
                      />
                      <div className="check-icon">{settings.fontBold && <Check size={10} />}</div>
                      굵게
                    </label>
                  </div>
                </div>

                <div className="settings-row-pair">
                  <div className="row-label">폰트 크기</div>
                  <div className="flex-row-gap">
                    <input
                      type="range"
                      min="12"
                      max="72"
                      value={settings.fontSize}
                      onChange={(e) => setSettings({ ...settings, fontSize: parseInt(e.target.value) })}
                      style={{ flex: 1 }}
                    />
                    <span className="unit-value">{settings.fontSize}px</span>
                  </div>
                </div>

                <div className="settings-row-pair">
                  <div className="row-label">폰트 색상</div>
                  <input
                    type="color"
                    value={settings.fontColor}
                    onChange={(e) => setSettings({ ...settings, fontColor: e.target.value })}
                  />
                </div>

                <div className="settings-row-pair">
                  <div className="row-label">폰트 외곽선</div>
                  <div className="flex-row-gap">
                    <input
                      type="color"
                      value={settings.fontOutlineColor?.substring(0, 7)}
                      onChange={(e) => setSettings({ ...settings, fontOutlineColor: e.target.value + 'dd' })}
                    />
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="0.5"
                      value={settings.fontOutlineSize}
                      onChange={(e) => setSettings({ ...settings, fontOutlineSize: parseFloat(e.target.value) })}
                      style={{ flex: 1 }}
                    />
                    <span className="unit-value">{settings.fontOutlineSize}px</span>
                  </div>
                </div>

                <div className="divider-line" />

                <div className="settings-row-pair">
                  <div className="row-label">배경색 사용</div>
                  <div className="flex-row-gap">
                    <label className={`toggle-button ${settings.useBgColor ? 'active' : ''}`}>
                      <input
                        type="checkbox"
                        checked={settings.useBgColor}
                        onChange={(e) => setSettings({ ...settings, useBgColor: e.target.checked })}
                      />
                      <div className="check-icon">{settings.useBgColor && <Check size={10} />}</div>
                      배경색 사용
                    </label>
                    <input
                      type="color"
                      value={settings.bgColor?.substring(0, 7)}
                      onChange={(e) => setSettings({ ...settings, bgColor: e.target.value + 'ff' })}
                      disabled={!settings.useBgColor}
                    />
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
                      onChange={(e) => setSettings({ ...settings, bgImage: e.target.value })}
                      className="styled-input"
                      style={{ flex: 1 }}
                    />
                    <select
                      value={settings.bgImageMode}
                      onChange={(e) => setSettings({ ...settings, bgImageMode: e.target.value })}
                      className="styled-select"
                    >
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
          <div className="save-controls-wrapper" style={{ position: 'sticky', top: '24px' }}>
            <button className="btn-save-full" onClick={saveSettings} disabled={saving}>
              {saving ? <RefreshCw className="spin" size={18}/> : <Save size={18}/>}
              설정 저장하기
            </button>
            <button className="btn-reset-light" onClick={resetSettings}>
              <RotateCcw size={14} /> 설정 초기화
            </button>

            <div className="info-box-premium" style={{ marginTop: '20px' }}>
              <div className="info-header">
                <HelpCircle size={14} />
                <span>도움말</span>
              </div>
              <p>자막 설정은 생방송 진행 중에도 실시간으로 반영됩니다.</p>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
};

export default TextSettings;
