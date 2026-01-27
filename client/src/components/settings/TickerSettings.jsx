import React, { useState, useEffect, useRef } from 'react';
import {
  Copy, RefreshCw, Save, Type, Check,
  Image as ImageIcon, HelpCircle, ExternalLink, Info,
  Monitor, Palette, Settings, RotateCcw, Megaphone,
  Clock, Hash, User, Trash2, Plus, Volume2, Send
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL } from '../../config/api';
import { OverlayPreviewWrapper } from './shared';
import TickerOverlay from '../TickerOverlay';
import './ChatSettings.css';

const defaultSettings = {
  // Base
  transparency: 100,
  showTooltip: true,
  useCustomCss: false,
  customCss: '',

  // Detail
  theme: 'default', // default, forest, chzzk, pink, windows, neon
  autoHide: true,
  showTime: true,
  oneLine: false,
  showTitle: true,
  textFormat: '{닉네임}: {채팅}',
  maxChars: 0, // 0 means no limit
  permissions: 'manager', // manager, ardent, subscriber, donator, all
  scrollSpeed: 15,
  flowDirection: 'left',

  // Font & Style
  fontFamily: 'Pretendard',
  fontBold: false,
  useWebFont: false,
  fontSize: 22,
  fontColor: '#ffffff',
  useBgColor: false,
  bgColor: '#00000088',
  bgImage: '',
  bgImageMode: 'cover'
};

const themeOptions = [
  { id: 'default', label: '기본' },
  { id: 'forest', label: '숲' },
  { id: 'chzzk', label: '치지직' },
  { id: 'pink', label: '핑크' },
  { id: 'windows', label: '윈도우' },
  { id: 'neon', label: '네온' }
];

const TickerSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [activeNav, setActiveNav] = useState('base');
  const overlayHash = user?.userHash || null;
  const [copied, setCopied] = useState(false);

  // Preview test state
  const [testMessages, setTestMessages] = useState([
    { id: 1, text: '테스터: 안녕하세요! 전광판 테스트입니다' },
    { id: 2, text: '시청자: 좋은 방송 감사합니다~' }
  ]);
  const [newMessage, setNewMessage] = useState('');

  const sectionRefs = {
    base: useRef(null),
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
      const res = await fetch(`${API_URL}/api/settings/ticker`);
      const data = await res.json();
      if (data.value && data.value !== '{}') {
        setSettings({ ...defaultSettings, ...JSON.parse(data.value) });
      }
    } catch (error) {
      console.error('Failed to fetch ticker settings', error);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await fetch(`${API_URL}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'ticker', value: settings })
      });
      alert('설정이 저장되었습니다.');
    } finally {
      setSaving(false);
    }
  };

  const overlayUrl = overlayHash
    ? `${window.location.origin}/overlay/${overlayHash}/ticker`
    : '';

  const copyUrl = async () => {
    if (!overlayUrl) return;
    try {
      await navigator.clipboard.writeText(overlayUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
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
            <h2 className="title-text">전광판 설정</h2>
            <div className="badge-wrapper">
              <span className="badge-new">NEW</span>
              <span className="badge-info">PRO</span>
            </div>
          </div>
          <div className="action-area">
            <button className="btn-copy-url" onClick={copyUrl} disabled={!overlayHash}>
              {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? '복사됨' : 'URL 복사'}
            </button>
            <button className="btn-setup-guide" onClick={() => window.open('https://weflab.com/page/heDY1tjC249wZmlYsA', '_blank')}>
              <HelpCircle size={16} /> 기본프리셋
            </button>
            <button className="btn-external-view" onClick={() => overlayHash && window.open(`/overlay/${overlayHash}/ticker`, '_blank')} disabled={!overlayHash}>
              <ExternalLink size={16} /> 새창으로 열기
            </button>
          </div>
        </div>
      </div>

      <div className="chat-settings-container">
        <div className="chat-settings-main">
          <div className="sticky-tabs">
            {[
              { id: 'base', label: '기본 설정', icon: <Settings size={14}/> },
              { id: 'detail', label: '상세 설정', icon: <Megaphone size={14}/> },
              { id: 'font', label: '폰트 · 배경', icon: <Palette size={14}/> }
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
            {/* Section: Base */}
            <section ref={sectionRefs.base} className="settings-section" data-section="base">
              <div className="settings-card glass-premium">
                <div className="card-header">
                  <h3>기본 설정</h3>
                </div>
                
                <div className="settings-row-pair">
                  <div className="row-label">창 투명도</div>
                  <div className="flex-row-gap">
                    <input type="range" min="0" max="100" value={settings.transparency} onChange={(e) => setSettings({ ...settings, transparency: parseInt(e.target.value) })} style={{ flex: 1 }}/>
                    <span className="unit-value">{settings.transparency}%</span>
                  </div>
                </div>

                <div className="settings-row-pair">
                  <div className="row-label">창 툴팁 메뉴</div>
                  <label className={`toggle-button ${settings.showTooltip ? 'active' : ''}`}>
                    <input type="checkbox" checked={settings.showTooltip} onChange={(e) => setSettings({ ...settings, showTooltip: e.target.checked })}/>
                    <div className="check-icon">{settings.showTooltip && <Check size={10} />}</div>
                    창 툴팁 메뉴 사용
                  </label>
                </div>

                <div className="settings-row-pair vertical">
                  <div className="row-label">
                    <span>커스텀 스타일 CSS</span>
                    <label className={`toggle-button-simple ${settings.useCustomCss ? 'active' : ''}`} style={{ marginLeft: '12px' }}>
                      <input type="checkbox" checked={settings.useCustomCss} onChange={(e) => setSettings({ ...settings, useCustomCss: e.target.checked })} style={{ display: 'none' }}/>
                      사용
                    </label>
                  </div>
                  {settings.useCustomCss && (
                    <>
                      <textarea 
                        className="styled-textarea" 
                        placeholder=".ticker-content { ... }" 
                        value={settings.customCss}
                        onChange={(e) => setSettings({...settings, customCss: e.target.value})}
                        style={{ height: '120px', fontFamily: 'monospace' }}
                      />
                      <p className="helper-text warning">변경 내용은 실제 URL에 반영되며, 전체에 영향을 주는 CSS를 주의해주세요! 예:) body{'{'}display:none{'}'}</p>
                    </>
                  ) || (
                    <div className="css-placeholder">CSS 커스텀 기능을 사용하려면 상단 체크박스를 선택하세요.</div>
                  )}
                </div>
              </div>
            </section>

            {/* Section: Detail */}
            <section ref={sectionRefs.detail} className="settings-section" data-section="detail">
              <div className="settings-card glass-premium">
                <div className="card-header">
                  <h3>상세 설정</h3>
                </div>

                <div className="settings-row-pair vertical">
                  <div className="row-label">테마</div>
                  <div className="theme-grid-mini">
                    {themeOptions.map((t) => {
                      const getThemeLogo = (id) => {
                        if (id === 'forest') return '/assets/logos/soop.png';
                        if (id === 'chzzk') return '/assets/logos/chzzk.png';
                        return null;
                      };
                      const themeLogo = getThemeLogo(t.id);
                      
                      return (
                        <button 
                          key={t.id}
                          className={`theme-card-mini ${settings.theme === t.id ? 'active' : ''}`}
                          onClick={() => setSettings({...settings, theme: t.id})}
                        >
                          {themeLogo ? (
                            <img src={themeLogo} alt={t.label} style={{ height: '14px', borderRadius: '2px', marginBottom: '4px' }} />
                          ) : (
                            <div className={`theme-preview-dot ${t.id}`}></div>
                          )}
                          <span>{t.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="settings-row-pair vertical">
                  <div className="row-label">전광판 설정</div>
                  <div className="checkbox-grid-refined">
                    {[
                      { id: 'autoHide', label: '숨김 사용' },
                      { id: 'showTime', label: '남은시간 표시' },
                      { id: 'oneLine', label: '한줄 표시' },
                      { id: 'showTitle', label: '제목 표시' }
                    ].map(opt => (
                      <label key={opt.id} className="checkbox-item">
                        <input type="checkbox" checked={settings[opt.id]} onChange={(e) => setSettings({...settings, [opt.id]: e.target.checked})} />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="settings-row-pair vertical">
                  <div className="row-label">전광판 텍스트</div>
                  <div className="input-with-tags">
                    <input 
                      type="text" 
                      className="styled-input" 
                      value={settings.textFormat}
                      onChange={(e) => setSettings({...settings, textFormat: e.target.value})} 
                    />
                    <div className="quick-tags">
                      <button className="tag-btn" onClick={() => setSettings({...settings, textFormat: '{닉네임}: {채팅}'})}>기본 텍스트</button>
                      <button className="tag-btn" onClick={() => setSettings({...settings, textFormat: '{채팅}'})}>채팅만</button>
                    </div>
                  </div>
                </div>

                <div className="settings-row-pair">
                  <div className="row-label">텍스트 글자수</div>
                  <div className="flex-row-gap">
                    <input 
                      type="number" 
                      className="styled-input" 
                      style={{ width: '100px' }}
                      value={settings.maxChars}
                      onChange={(e) => setSettings({...settings, maxChars: parseInt(e.target.value)})} 
                    />
                    <span className="unit-value">글자</span>
                    <span className="helper-text-inline">(0 입력 시 제한 없음)</span>
                  </div>
                </div>

                <div className="settings-row-pair">
                  <div className="row-label">사용 등급</div>
                  <div className="mode-selector-tabs">
                    {[
                      { id: 'manager', label: '매니저' },
                      { id: 'ardent', label: '열혈' },
                      { id: 'subscriber', label: '구독' },
                      { id: 'donator', label: '후원' },
                      { id: 'all', label: '일반' }
                    ].map(grade => (
                      <button 
                        key={grade.id}
                        className={`mode-tab ${settings.permissions === grade.id ? 'active' : ''}`}
                        onClick={() => setSettings({...settings, permissions: grade.id})}
                      >
                        {grade.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="settings-row-pair">
                  <div className="row-label">스크롤 속도</div>
                  <div className="flex-row-gap">
                    <input 
                      type="range" 
                      min="1" max="60" 
                      value={settings.scrollSpeed} 
                      onChange={(e) => setSettings({ ...settings, scrollSpeed: parseInt(e.target.value) })} 
                      style={{ flex: 1 }}
                    />
                    <span className="unit-value">{settings.scrollSpeed}</span>
                  </div>
                </div>

                <div className="divider-line" />

                <div className="card-header">
                  <h3>전광판 명령어 사용법</h3>
                </div>
                <div className="command-guide-refined">
                   <div className="cmd-item">
                      <span className="cmd-badge">!전광판 [메시지]</span>
                      <span className="cmd-desc">전광판에 새로운 메시지를 등록합니다.</span>
                   </div>
                   <div className="cmd-item">
                      <span className="cmd-badge">!전광판삭제</span>
                      <span className="cmd-desc">현재 표시 중인 전광판 메시지를 즉시 삭제합니다.</span>
                   </div>
                   <div className="cmd-item">
                      <span className="cmd-badge">!전광판숨김</span>
                      <span className="cmd-desc">전광판 영역을 화면에서 숨깁니다.</span>
                   </div>
                </div>
              </div>
            </section>

            {/* Section: Font */}
            <section ref={sectionRefs.font} className="settings-section" data-section="font">
              <div className="settings-card glass-premium">
                <div className="card-header">
                  <h3>폰트 · 배경</h3>
                </div>

                <div className="settings-row-pair vertical">
                  <div className="row-label">폰트 미리보기</div>
                  <div className="preview-box-mini" style={{ 
                    padding: '24px', 
                    background: settings.useBgColor ? settings.bgColor : '#f8fafc', 
                    borderRadius: '16px',
                    border: '1px solid var(--border-light)',
                    fontFamily: settings.fontFamily,
                    fontSize: `${settings.fontSize}px`,
                    fontWeight: settings.fontBold ? 'bold' : 'normal',
                    color: settings.fontColor,
                    textAlign: 'center',
                    minHeight: '100px',
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
                       안녕하세요. 감사합니다! 1234567890 됏 햏 Hello! 你好. こんにちは。
                    </div>
                  </div>
                </div>

                <div className="settings-grid-2col">
                  <div className="settings-row-pair vertical">
                    <div className="row-label">폰트 선택</div>
                    <select 
                      value={settings.fontFamily} 
                      onChange={(e) => setSettings({...settings, fontFamily: e.target.value})} 
                      className="styled-select"
                    >
                      <option value="Pretendard">Pretendard (프리젠테이션)</option>
                      <option value="NanumGothic">나눔고딕</option>
                      <option value="GmarketSans">G마켓 산스</option>
                      <option value="CookieRun">쿠키런</option>
                    </select>
                  </div>
                  <div className="settings-row-pair vertical">
                    <div className="row-label">폰트 스타일</div>
                    <div className="flex-row-gap">
                      <label className={`toggle-button-simple ${settings.fontBold ? 'active' : ''}`}>
                        <input type="checkbox" checked={settings.fontBold} onChange={(e) => setSettings({...settings, fontBold: e.target.checked})} style={{ display: 'none' }}/>
                        굵게 표시
                      </label>
                      <label className={`toggle-button-simple ${settings.useWebFont ? 'active' : ''}`}>
                        <input type="checkbox" checked={settings.useWebFont} onChange={(e) => setSettings({...settings, useWebFont: e.target.checked})} style={{ display: 'none' }}/>
                        웹폰트 사용
                      </label>
                    </div>
                  </div>
                </div>

                <div className="settings-row-pair">
                  <div className="row-label">폰트 크기</div>
                  <div className="flex-row-gap">
                    <input 
                      type="range" 
                      min="12" max="72" 
                      value={settings.fontSize} 
                      onChange={(e) => setSettings({...settings, fontSize: parseInt(e.target.value)})} 
                      style={{ flex: 1 }}
                    />
                    <span className="unit-value">{settings.fontSize}px</span>
                  </div>
                  <p className="helper-text">폰트 크기는 눈으로 보는 크기보다 좀 더 크게 설정해야 시청자들이 보기 좋습니다.</p>
                </div>

                <div className="settings-row-pair">
                  <div className="row-label">배경색</div>
                  <div className="flex-row-gap">
                    <label className={`toggle-button ${settings.useBgColor ? 'active' : ''}`}>
                      <input type="checkbox" checked={settings.useBgColor} onChange={(e) => setSettings({...settings, useBgColor: e.target.checked})}/>
                      <div className="check-icon">{settings.useBgColor && <Check size={10} />}</div>
                      배경색 사용
                    </label>
                    <input 
                      type="color" 
                      value={settings.bgColor?.substring(0, 7) || '#000000'} 
                      onChange={(e) => setSettings({...settings, bgColor: e.target.value + '88'})} 
                      disabled={!settings.useBgColor} 
                    />
                  </div>
                </div>

                <div className="settings-row-pair vertical">
                  <div className="row-label">배경 이미지</div>
                  <div className="bg-upload-zone">
                     <ImageIcon size={24} className="text-muted" />
                     <span>이미지가 없습니다. (파일을 마우스로 끌어다 놓아서 업로드)</span>
                  </div>
                  <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                    <input 
                      type="text" 
                      placeholder="외부 링크 URL" 
                      value={settings.bgImage} 
                      onChange={(e) => setSettings({...settings, bgImage: e.target.value})} 
                      className="styled-input" 
                      style={{ flex: 1 }} 
                    />
                    <select 
                      value={settings.bgImageMode} 
                      onChange={(e) => setSettings({...settings, bgImageMode: e.target.value})} 
                      className="styled-select"
                    >
                      <option value="cover">이미지 채우기</option>
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
          {/* 실시간 미리보기 */}
          <OverlayPreviewWrapper title="전광판 미리보기" height={200}>
            <TickerOverlay
              previewMode={true}
              previewSettings={settings}
              previewMessages={testMessages}
            />
          </OverlayPreviewWrapper>

          {/* 테스트 컨트롤 */}
          <div className="test-controls glass-premium" style={{ marginTop: '16px' }}>
            <div className="test-header">
              <Megaphone size={16} />
              <span>메시지 테스트</span>
            </div>

            <div className="test-input-row" style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <input
                type="text"
                className="styled-input"
                placeholder="테스트 메시지 입력..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && newMessage.trim()) {
                    setTestMessages(prev => [...prev, {
                      id: Date.now(),
                      text: `테스터: ${newMessage}`
                    }]);
                    setNewMessage('');
                  }
                }}
                style={{ flex: 1 }}
              />
              <button
                className="btn-test-action"
                onClick={() => {
                  if (newMessage.trim()) {
                    setTestMessages(prev => [...prev, {
                      id: Date.now(),
                      text: `테스터: ${newMessage}`
                    }]);
                    setNewMessage('');
                  }
                }}
              >
                <Send size={14} />
              </button>
            </div>

            <div className="test-messages-list" style={{ marginTop: '12px', maxHeight: '120px', overflowY: 'auto' }}>
              {testMessages.map((msg) => (
                <div key={msg.id} className="test-message-item" style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 8px',
                  fontSize: '12px',
                  background: 'var(--bg-secondary)',
                  borderRadius: '6px',
                  marginBottom: '4px'
                }}>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {msg.text}
                  </span>
                  <button
                    onClick={() => setTestMessages(prev => prev.filter(m => m.id !== msg.id))}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '2px',
                      color: 'var(--text-muted)'
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>

            <button
              className="btn-test-secondary"
              onClick={() => setTestMessages([])}
              style={{ marginTop: '8px', width: '100%' }}
            >
              <Trash2 size={14} /> 모두 삭제
            </button>
          </div>

          {/* 저장 버튼 */}
          <div className="save-controls-wrapper" style={{ marginTop: '16px' }}>
            <button className="btn-save-full" onClick={saveSettings} disabled={saving}>
              {saving ? <RefreshCw className="spin" size={18}/> : <Save size={18}/>}
              설정 저장하기
            </button>
            <button className="btn-reset-light" onClick={resetSettings}>
              <RotateCcw size={14} /> 전광판 초기화
            </button>
          </div>
        </aside>
      </div>
    </>
  );
};

export default TickerSettings;
