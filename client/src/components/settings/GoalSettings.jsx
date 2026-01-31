import React, { useState, useEffect, useRef } from 'react';
import {
  Copy, RefreshCw, Save, Medal, Users, Clock, Image as ImageIcon, Hash,
  Palette, Settings, Shield, Type, HelpCircle, ExternalLink, Info,
  Monitor, Plus, Trash2, RotateCcw, ChevronDown, Check, BarChart, Circle, Heart, Star,
  Play
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL } from '../../config/api';
import { OverlayPreviewWrapper } from './shared';
import GoalOverlay from '../GoalOverlay';
import './ChatSettings.css';

const defaultSettings = {
  // Theme
  theme: 'default',
  graphType: 'bar', // bar, circle, heart, star, semi
  thickness: 20,
  barBgColor: '#dddddd',
  gradientStart: '#39ba51',
  gradientEnd: '#46e65a',
  useAnimation: true,
  transparency: 100,
  showTooltip: true,
  useCustomCss: false,
  customCss: '',
  
  // Goal
  platform: 'SOOP',
  goalSource: '별풍선', // 별풍선, 두산, 시청자수
  startValue: 0,
  targetValue: 1000,
  
  // Detail
  textPosition: 'top', // top, center, bottom, double
  titleTemplate: '{목표종류}',
  contentTemplate: '{목표값} / {최대값} {개}',
  useStartDate: false,
  startDate: '',
  autoIncrement: false,
  loopEffect: false,
  completionEffect: true,
  autoReset: false,
  
  // Font & Style
  fontFamily: 'Pretendard',
  fontBold: false,
  useWebFont: false,
  fontSize: 28,
  fontColor: '#ffffff',
  fontOutlineColor: '#000000dd',
  fontOutlineSize: 2,
  useBgColor: false,
  bgColor: '#00000000',
  bgImage: '',
  bgImageMode: 'cover'
};

const themeOptions = [
  { id: 'default', label: '기본' },
  { id: 'heart_motion', label: '하트모션' },
  { id: 'star_motion', label: '스타모션' },
  { id: 'cherry', label: '벚꽃' },
  { id: 'cat', label: '고양이' },
  { id: 'lunar', label: '설날' },
  { id: 'lol', label: '롤' },
  { id: 'star_theme', label: '스타' },
  { id: 'pubg', label: '배그' },
  { id: 'heart_theme', label: '하트' }
];

const GoalSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [activeNav, setActiveNav] = useState('theme');
  const overlayHash = user?.userHash || null;
  const [copied, setCopied] = useState(false);
  const [testValue, setTestValue] = useState(500);
  const [isAnimating, setIsAnimating] = useState(false);

  const sectionRefs = {
    theme: useRef(null),
    goal: useRef(null),
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
      const res = await fetch(`${API_URL}/api/settings/goal`);
      const data = await res.json();
      if (data.value && data.value !== '{}') {
        const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        setSettings({ ...defaultSettings, ...parsed });
      }
    } catch (e) { console.error(e); }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await fetch(`${API_URL}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'goal', value: settings })
      });
      alert('설정이 저장되었습니다.');
    } finally { setSaving(false); }
  };

  const overlayUrl = overlayHash
    ? `${window.location.origin}/overlay/${overlayHash}/goals`
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
            <h2 className="title-text">목표치 그래프 설정</h2>
            <div className="badge-wrapper">
              <span className="badge-new">NEW</span>
              <span className="badge-info">PRO</span>
            </div>
          </div>
          <div className="action-area">
            <button className="btn-copy-url" onClick={copyUrl} disabled={!overlayHash}>
              {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? '복사됨' : 'URL 복사'}
            </button>
            <button className="btn-setup-guide">
              <HelpCircle size={16} /> 설정 가이드
            </button>
            <button className="btn-external-view" onClick={() => overlayHash && window.open(`/overlay/${overlayHash}/goals`, '_blank')} disabled={!overlayHash}>
              <ExternalLink size={16} /> 새창으로 열기
            </button>
          </div>
        </div>
      </div>

      <div className="chat-settings-container">
        <div className="chat-settings-main">
          <div className="sticky-tabs">
            {[
              { id: 'theme', label: '테마', icon: <Palette size={14}/> },
              { id: 'goal', label: '목표치', icon: <Hash size={14}/> },
              { id: 'detail', label: '상세', icon: <Settings size={14}/> },
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
            {/* Section: Theme */}
            <section ref={sectionRefs.theme} className="settings-section" data-section="theme">
              <div className="settings-card glass-premium">
                <div className="card-header">
                  <h3>테마 설정</h3>
                  <p className="helper-text-alert">테마 변경시 설정값이 테마 기본값으로 변경되니 주의해주세요!</p>
                </div>
                <div className="theme-grid">
                  {themeOptions.map(theme => (
                    <div 
                      key={theme.id} 
                      className={`theme-card ${settings.theme === theme.id ? 'active' : ''}`}
                      onClick={() => setSettings({ ...settings, theme: theme.id })}
                    >
                      <div className="theme-thumb">
                        <div className={`thumb-bg theme-${theme.id}`}></div>
                      </div>
                      <span className="theme-name">{theme.label}</span>
                    </div>
                  ))}
                </div>
                
                <div className="divider-line" />

                <div className="settings-row-pair vertical">
                  <div className="row-label">그래프 종류</div>
                  <div className="mode-selector-tabs">
                    {[
                      { id: 'bar', label: '바', icon: <BarChart size={16}/> },
                      { id: 'circle', label: '원', icon: <Circle size={16}/> },
                      { id: 'heart', label: '하트♡', icon: <Heart size={16}/> },
                      { id: 'star', label: '별☆', icon: <Star size={16}/> },
                      { id: 'semi', label: '반원', icon: <Circle size={16}/> }
                    ].map(type => (
                      <button 
                        key={type.id}
                        className={`mode-tab ${settings.graphType === type.id ? 'active' : ''}`}
                        onClick={() => setSettings({...settings, graphType: type.id})}
                      >
                        {type.icon} {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="settings-row-pair">
                  <div className="row-label">그래프 굵기</div>
                  <div className="flex-row-gap">
                    <input type="range" min="1" max="100" value={settings.thickness} onChange={(e) => setSettings({...settings, thickness: parseInt(e.target.value)})} style={{ flex: 1 }}/>
                    <span className="unit-value">{settings.thickness}px</span>
                  </div>
                </div>

                <div className="settings-row-pair vertical">
                    <div className="row-label">그래프 배경색</div>
                    <div className="flex-row-gap wrap-row">
                        <div className="color-input-item">
                            <span className="tiny-label">바 배경색</span>
                            <input type="color" value={settings.barBgColor} onChange={(e) => setSettings({...settings, barBgColor: e.target.value})} />
                        </div>
                        <div className="color-input-item">
                            <span className="tiny-label">시작 배경색</span>
                            <input type="color" value={settings.gradientStart} onChange={(e) => setSettings({...settings, gradientStart: e.target.value})} />
                        </div>
                        <div className="color-input-item">
                            <span className="tiny-label">끝 배경색</span>
                            <input type="color" value={settings.gradientEnd} onChange={(e) => setSettings({...settings, gradientEnd: e.target.value})} />
                        </div>
                    </div>
                </div>
                
                <div className="settings-row-pair">
                  <div className="row-label">배경 애니메이션</div>
                  <label className={`toggle-button ${settings.useAnimation ? 'active' : ''}`}>
                    <input type="checkbox" checked={settings.useAnimation} onChange={(e) => setSettings({...settings, useAnimation: e.target.checked})}/>
                    <div className="check-icon">{settings.useAnimation && <Check size={10} />}</div>
                    애니메이션 사용
                  </label>
                </div>

                <div className="settings-row-pair">
                  <div className="row-label">창 투명도</div>
                  <div className="flex-row-gap">
                    <input type="range" min="0" max="100" value={settings.transparency} onChange={(e) => setSettings({...settings, transparency: parseInt(e.target.value)})} style={{ flex: 1 }}/>
                    <span className="unit-value">{settings.transparency}%</span>
                  </div>
                </div>

                <div className="settings-row-pair">
                  <div className="row-label">창 툴팁 메뉴</div>
                  <label className={`toggle-button ${settings.showTooltip ? 'active' : ''}`}>
                    <input type="checkbox" checked={settings.showTooltip} onChange={(e) => setSettings({...settings, showTooltip: e.target.checked})}/>
                    <div className="check-icon">{settings.showTooltip && <Check size={10} />}</div>
                    창 툴팁 메뉴 사용
                  </label>
                </div>

                <div className="settings-row-pair vertical">
                  <div className="row-label">커스텀 스타일 CSS</div>
                  <label className={`toggle-button ${settings.useCustomCss ? 'active' : ''}`} style={{ marginBottom: '12px' }}>
                    <input type="checkbox" checked={settings.useCustomCss} onChange={(e) => setSettings({...settings, useCustomCss: e.target.checked})}/>
                    <div className="check-icon">{settings.useCustomCss && <Check size={10} />}</div>
                    커스텀 스타일 CSS 사용
                  </label>
                  {settings.useCustomCss && (
                    <div className="custom-css-area">
                      <textarea 
                        className="styled-textarea" 
                        placeholder=".goal-container { ... }" 
                        value={settings.customCss}
                        onChange={(e) => setSettings({...settings, customCss: e.target.value})}
                      />
                      <p className="helper-text-alert" style={{ marginTop: '8px' }}>변경 내용은 실제 URL에 반영되며, 전체에 영향을 주는 CSS를 주의해주세요! 예: body {'{'} display: none {'}'}</p>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Section: Goal */}
            <section ref={sectionRefs.goal} className="settings-section" data-section="goal">
              <div className="settings-card glass-premium">
                <div className="card-header"><h3>목표치 설정</h3></div>
                
                <div className="settings-row-pair">
                  <div className="row-label">플랫폼</div>
                  <div className="mode-selector-tabs">
                    {[
                      { id: 'SOOP', label: 'SOOP', logo: '/assets/logos/soop.png' },
                      { id: 'CHZZK', label: 'CHZZK', logo: '/assets/logos/chzzk.png' }
                    ].map(p => (
                      <button 
                        key={p.id}
                        className={`mode-tab ${settings.platform === p.id ? 'active' : ''}`}
                        onClick={() => setSettings({...settings, platform: p.id})}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}
                      >
                        <img src={p.logo} alt={p.label} style={{ height: '18px', borderRadius: '4px' }} />
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="settings-row-pair vertical">
                    <div className="row-label">목표 종류</div>
                    <div className="mode-selector-tabs">
                        {['별풍선', '두산', '시청자수'].map(source => (
                            <button 
                                key={source}
                                className={`mode-tab ${settings.goalSource === source ? 'active' : ''}`}
                                onClick={() => setSettings({...settings, goalSource: source})}
                            >
                                {source}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="settings-row-pair">
                  <div className="row-label">{settings.goalSource} 목표치</div>
                  <div className="flex-row-gap">
                    <span className="tiny-label">시작값:</span>
                    <input type="number" className="styled-input" value={settings.startValue} onChange={(e) => setSettings({...settings, startValue: parseInt(e.target.value)})} style={{ width: '100px' }}/>
                    <span className="tiny-label" style={{ marginLeft: '12px' }}>최대값:</span>
                    <input type="number" className="styled-input" value={settings.targetValue} onChange={(e) => setSettings({...settings, targetValue: parseInt(e.target.value)})} style={{ width: '100px' }}/>
                  </div>
                </div>
              </div>
            </section>

            {/* Section: Detail */}
            <section ref={sectionRefs.detail} className="settings-section" data-section="detail">
              <div className="settings-card glass-premium">
                <div className="card-header"><h3>상세 설정</h3></div>
                
                <div className="settings-row-pair vertical">
                  <div className="row-label">텍스트 위치</div>
                  <div className="mode-selector-tabs">
                    {[
                      { id: 'top', label: '위' },
                      { id: 'center', label: '가운데' },
                      { id: 'bottom', label: '아래' },
                      { id: 'double', label: '두줄' }
                    ].map(pos => (
                      <button 
                        key={pos.id}
                        className={`mode-tab ${settings.textPosition === pos.id ? 'active' : ''}`}
                        onClick={() => setSettings({...settings, textPosition: pos.id})}
                      >
                        {pos.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="settings-row-pair">
                  <div className="row-label">목표치 제목 텍스트</div>
                  <div className="flex-row-gap" style={{ flex: 1 }}>
                    <input type="text" className="styled-input" value={settings.titleTemplate} onChange={(e) => setSettings({...settings, titleTemplate: e.target.value})} style={{ flex: 1 }}/>
                    <span className="unit-value">기본 텍스트</span>
                  </div>
                </div>

                <div className="settings-row-pair">
                  <div className="row-label">목표치 내용 텍스트</div>
                  <div className="flex-row-gap" style={{ flex: 1 }}>
                    <input type="text" className="styled-input" value={settings.contentTemplate} onChange={(e) => setSettings({...settings, contentTemplate: e.target.value})} style={{ flex: 1 }}/>
                    <span className="unit-value">기본 텍스트</span>
                  </div>
                </div>

                <div className="divider-line" />

                <div className="settings-row-pair">
                  <div className="row-label">목표치 시작일</div>
                  <div className="flex-row-gap">
                    <label className={`toggle-button ${settings.useStartDate ? 'active' : ''}`}>
                      <input type="checkbox" checked={settings.useStartDate} onChange={(e) => setSettings({...settings, useStartDate: e.target.checked})}/>
                      <div className="check-icon">{settings.useStartDate && <Check size={10} />}</div>
                      시작일 사용
                    </label>
                    {settings.useStartDate && (
                      <input type="datetime-local" className="styled-input" value={settings.startDate} onChange={(e) => setSettings({...settings, startDate: e.target.value})}/>
                    )}
                  </div>
                </div>

                <div className="settings-row-pair">
                  <div className="row-label">목표치 자동 증가</div>
                  <label className={`toggle-button ${settings.autoIncrement ? 'active' : ''}`}>
                    <input type="checkbox" checked={settings.autoIncrement} onChange={(e) => setSettings({...settings, autoIncrement: e.target.checked})}/>
                    <div className="check-icon">{settings.autoIncrement && <Check size={10} />}</div>
                    자동 증가 사용
                  </label>
                </div>

                <div className="settings-row-pair">
                  <div className="row-label">목표치 반복 효과</div>
                  <label className={`toggle-button ${settings.loopEffect ? 'active' : ''}`}>
                    <input type="checkbox" checked={settings.loopEffect} onChange={(e) => setSettings({...settings, loopEffect: e.target.checked})}/>
                    <div className="check-icon">{settings.loopEffect && <Check size={10} />}</div>
                    반복 효과 사용
                  </label>
                </div>

                <div className="settings-row-pair">
                  <div className="row-label">목표치 완료 효과</div>
                  <label className={`toggle-button ${settings.completionEffect ? 'active' : ''}`}>
                    <input type="checkbox" checked={settings.completionEffect} onChange={(e) => setSettings({...settings, completionEffect: e.target.checked})}/>
                    <div className="check-icon">{settings.completionEffect && <Check size={10} />}</div>
                    완료 효과 사용
                  </label>
                </div>

                <div className="settings-row-pair">
                  <div className="row-label">목표치 자동 초기화</div>
                  <label className={`toggle-button ${settings.autoReset ? 'active' : ''}`}>
                    <input type="checkbox" checked={settings.autoReset} onChange={(e) => setSettings({...settings, autoReset: e.target.checked})}/>
                    <div className="check-icon">{settings.autoReset && <Check size={10} />}</div>
                    자동 초기화 사용
                  </label>
                </div>
              </div>
            </section>

            {/* Section: Font & Background */}
            <section ref={sectionRefs.font} className="settings-section" data-section="font">
              <div className="settings-card glass-premium">
                <div className="card-header">
                  <h3>폰트 · 배경 설정</h3>
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
                    textShadow: settings.fontOutlineSize > 0 ? `0 0 ${settings.fontOutlineSize}px ${settings.fontOutlineColor}` : 'none',
                    textAlign: 'center',
                    minHeight: '120px',
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

                <div className="settings-row-pair">
                  <div className="row-label">폰트 선택</div>
                  <div className="flex-row-gap">
                    <select value={settings.fontFamily} onChange={(e) => setSettings({...settings, fontFamily: e.target.value})} className="styled-select" style={{ flex: 1 }}>
                      <option value="Pretendard">Pretendard (기본)</option>
                      <option value="GmarketSans">G마켓 산스</option>
                      <option value="NanumGothic">나눔고딕</option>
                      <option value="CookieRun">쿠키런</option>
                    </select>
                    <label className={`toggle-button ${settings.fontBold ? 'active' : ''}`}>
                      <input type="checkbox" checked={settings.fontBold} onChange={(e) => setSettings({...settings, fontBold: e.target.checked})}/>
                      <div className="check-icon">{settings.fontBold && <Check size={10} />}</div>
                      굵게
                    </label>
                    <label className={`toggle-button ${settings.useWebFont ? 'active' : ''}`}>
                      <input type="checkbox" checked={settings.useWebFont} onChange={(e) => setSettings({...settings, useWebFont: e.target.checked})}/>
                      <div className="check-icon">{settings.useWebFont && <Check size={10} />}</div>
                      웹폰트
                    </label>
                  </div>
                </div>

                <div className="settings-row-pair">
                  <div className="row-label">폰트 크기</div>
                  <div className="flex-row-gap">
                    <input type="range" min="12" max="72" value={settings.fontSize} onChange={(e) => setSettings({...settings, fontSize: parseInt(e.target.value)})} style={{ flex: 1 }}/>
                    <span className="unit-value">{settings.fontSize}px</span>
                  </div>
                </div>

                <div className="settings-row-pair">
                  <div className="row-label">폰트 색상</div>
                  <div className="color-input-item">
                    <input type="color" value={settings.fontColor} onChange={(e) => setSettings({...settings, fontColor: e.target.value})} />
                  </div>
                </div>

                <div className="settings-row-pair">
                  <div className="row-label">폰트 외곽선</div>
                  <div className="flex-row-gap">
                    <input type="color" value={settings.fontOutlineColor?.substring(0, 7) || '#000000'} onChange={(e) => setSettings({...settings, fontOutlineColor: e.target.value + 'dd'})} />
                    <input type="range" min="0" max="10" step="0.5" value={settings.fontOutlineSize} onChange={(e) => setSettings({...settings, fontOutlineSize: parseFloat(e.target.value)})} style={{ flex: 1 }}/>
                    <span className="unit-value">{settings.fontOutlineSize}px</span>
                  </div>
                </div>

                <div className="divider-line" />

                <div className="settings-row-pair">
                  <div className="row-label">배경색</div>
                  <div className="flex-row-gap">
                    <label className={`toggle-button ${settings.useBgColor ? 'active' : ''}`}>
                      <input type="checkbox" checked={settings.useBgColor} onChange={(e) => setSettings({...settings, useBgColor: e.target.checked})}/>
                      <div className="check-icon">{settings.useBgColor && <Check size={10} />}</div>
                      사용
                    </label>
                    <input type="color" value={settings.bgColor?.substring(0, 7) || '#000000'} onChange={(e) => setSettings({...settings, bgColor: e.target.value + 'ff'})} disabled={!settings.useBgColor} />
                    <input type="text" value={settings.bgColor} onChange={(e) => setSettings({...settings, bgColor: e.target.value})} className="styled-input" style={{ width: '100px' }} disabled={!settings.useBgColor} />
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
                      placeholder="외부 이미지 URL 입력" 
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
          <OverlayPreviewWrapper title="목표치 미리보기" height={350}>
            <GoalOverlay
              previewMode={true}
              previewSettings={settings}
              previewValue={testValue}
            />
          </OverlayPreviewWrapper>

          <div className="test-controls glass-premium">
            <div className="section-title-with-badge">
              <h4>테스트</h4>
            </div>

            <div className="settings-row-pair vertical" style={{ marginTop: '12px' }}>
              <div className="row-label">진행률 테스트</div>
              <div className="flex-row-gap">
                <input
                  type="range"
                  min="0"
                  max={settings.targetValue}
                  value={testValue}
                  onChange={(e) => setTestValue(parseInt(e.target.value))}
                  style={{ flex: 1 }}
                />
                <span className="unit-value">{(testValue || 0).toLocaleString()}</span>
              </div>
            </div>

            <button
              className="btn-test-primary"
              onClick={() => {
                setIsAnimating(true);
                const targetVal = settings.targetValue;
                let current = 0;
                const interval = setInterval(() => {
                  current += Math.ceil(targetVal / 20);
                  if (current >= targetVal) {
                    current = targetVal;
                    clearInterval(interval);
                    setTimeout(() => setIsAnimating(false), 500);
                  }
                  setTestValue(current);
                }, 50);
              }}
              disabled={isAnimating}
              style={{ marginTop: '16px' }}
            >
              <Play size={16} /> {isAnimating ? '애니메이션 중...' : '애니메이션 테스트'}
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

export default GoalSettings;
