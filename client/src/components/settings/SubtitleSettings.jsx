import React, { useState, useEffect, useRef } from 'react';
import {
  Copy, RefreshCw, Save, Medal, Users, Clock, Image as ImageIcon, Hash,
  Palette, Settings, Shield, Type, HelpCircle, ExternalLink, Info,
  Monitor, Plus, Trash2, RotateCcw, ChevronDown, Check, Megaphone, Gift
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL } from '../../config/api';
import { OverlayPreviewWrapper } from './shared';
import SubtitleOverlay from '../SubtitleOverlay';
import './ChatSettings.css';

const defaultSettings = {
  // Theme
  theme: 'default',
  transparency: 100,
  showTooltip: true,
  useCustomCss: false,
  customCss: '',
  
  // Detail
  platform: 'SOOP',
  minAmount: 1,
  mode: 'count', // count, mvp, ranking, recent, image
  rankingDisplay: 'rank', // rank, medal, image
  showPlatformIcon: true,
  textType: 'rank', // rank, basic
  useStartDate: false,
  startDate: '',
  unit: 'default', // default, count
  verticalAlign: 'top', // top, bottom
  autoReset: false,
  
  // Filtering
  userFilter: '',
  showAnonymous: true,
  
  // Font & Style
  fontFamily: 'Pretendard',
  fontBold: false,
  useWebFont: false,
  fontSize: 28,
  fontColor: '#ffffff',
  nicknameColor: '#ffc247',
  amountColor: '#ffc247',
  fontOutlineColor: '#000000dd',
  fontOutlineSize: 2,
  useBgColor: false,
  bgColor: '#00000000',
  bgImage: '',
  bgImageMode: 'cover'
};

const themeOptions = [
  { id: 'default', label: '기본' },
  { id: 'lunar', label: '설날' },
  { id: 'lol', label: '롤' },
  { id: 'star', label: '스타' },
  { id: 'pubg', label: '배그' },
  { id: 'heart', label: '하트' },
  { id: 'winter', label: '겨울' },
  { id: 'retro_pink', label: '레트로(핑)' },
  { id: 'retro_blue', label: '레트로(블루)' },
  { id: 'rainbow', label: '무지개' }
];

const SubtitleSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [activeNav, setActiveNav] = useState('theme');
  const overlayHash = user?.userHash || null;
  const [copied, setCopied] = useState(false);

  // Preview test state
  const [testEvents, setTestEvents] = useState([
    { id: 1, sender: '테스터1', amount: 10000, type: 'donation' },
    { id: 2, sender: '테스터2', amount: 5000, type: 'donation' },
    { id: 3, sender: '테스터3', amount: 3000, type: 'donation' }
  ]);
  const [newDonation, setNewDonation] = useState({ sender: '', amount: '' });

  const sectionRefs = {
    theme: useRef(null),
    detail: useRef(null),
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
      const res = await fetch(`${API_URL}/api/settings/subtitle`);
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
        body: JSON.stringify({ key: 'subtitle', value: settings })
      });
      alert('설정이 저장되었습니다.');
    } finally { setSaving(false); }
  };

  const overlayUrl = overlayHash
    ? `${window.location.origin}/overlay/${overlayHash}/subtitles`
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
            <h2 className="title-text">후원 자막 설정</h2>
            <div className="badge-wrapper">
              <span className="badge-new">NEW</span>
              <span className="badge-info">PRO</span>
            </div>
          </div>
          <div className="action-area">
            <button className="btn-setup-guide">
              <HelpCircle size={16} /> 설정 가이드
            </button>
            <button className="btn-external-view" onClick={() => overlayHash && window.open(`/overlay/${overlayHash}/subtitles`, '_blank')} disabled={!overlayHash}>
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
                value={overlayHash ? overlayUrl : '로그인이 필요합니다'}
              />
            </div>
            <div className="url-actions">
              <button className={`url-action-btn primary ${copied ? 'copied' : ''}`} onClick={copyUrl} disabled={!overlayHash}>
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? '복사됨' : 'URL 복사'}
              </button>
              <button className="url-action-btn" onClick={fetchSettings}>
                <RefreshCw size={15} /> 새로고침
              </button>
              <button className="url-action-btn reset" onClick={resetSettings}>
                <Trash2 size={15} /> 초기화
              </button>
            </div>
          </div>
          <div className="settings-info-text">
            <Info size={16} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span>후원 자막은 생방송 연결 후 데이터를 자동으로 불러옵니다. 최대 일주일의 데이터를 불러오며, 후원 시작일 설정 시 최대 한달 전의 데이터를 불러올 수 있습니다.</span>
              <span>후원 내역이 초기화된 경우 후원 시작일 설정에서 다시 불러올 수 있습니다.</span>
            </div>
          </div>
        </div>
      </div>

      <div className="chat-settings-container">
        <div className="chat-settings-main">
          <div className="sticky-tabs">
            {[
              { id: 'theme', label: '테마', icon: <Palette size={14}/> },
              { id: 'detail', label: '상세', icon: <Settings size={14}/> },
              { id: 'filtering', label: '필터링', icon: <Shield size={14}/> },
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
                        placeholder=".subtitle-container { ... }" 
                        value={settings.customCss}
                        onChange={(e) => setSettings({...settings, customCss: e.target.value})}
                      />
                      <p className="helper-text-alert" style={{ marginTop: '8px' }}>변경 내용은 실제 URL에 반영되며, 전체에 영향을 주는 CSS를 주의해주세요! 예: body {'{'} display: none {'}'}</p>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Section: Detail */}
            <section ref={sectionRefs.detail} className="settings-section" data-section="detail">
              <div className="settings-card glass-premium">
                <div className="card-header"><h3>상세 설정</h3></div>
                
                <div className="settings-row-pair">
                  <div className="row-label">후원 종류</div>
                  <div className="mode-selector-tabs">
                    {[
                      { id: 'SOOP', label: 'SOOP', logo: '/assets/logos/soop.png' },
                      { id: 'CHZZK', label: 'CHZZK', logo: '/assets/logos/chzzk.png' },
                      { id: 'ALL', label: '통합', icon: <Megaphone size={14} /> }
                    ].map(p => (
                      <button 
                        key={p.id}
                        className={`mode-tab ${settings.platform === p.id ? 'active' : ''}`}
                        onClick={() => setSettings({...settings, platform: p.id})}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}
                      >
                        {p.logo ? (
                          <img src={p.logo} alt={p.label} style={{ height: '18px', borderRadius: '4px' }} />
                        ) : p.icon}
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="settings-row-pair">
                  <div className="row-label">후원 최소 개수</div>
                  <div className="flex-row-gap">
                    <input type="number" className="styled-input" value={settings.minAmount} onChange={(e) => setSettings({...settings, minAmount: parseInt(e.target.value)})} style={{ width: '80px' }}/>
                    <span className="unit-value">개 이상</span>
                  </div>
                </div>

                <div className="settings-row-pair vertical">
                  <div className="row-label">후원 자막 종류</div>
                  <div className="mode-selector-tabs">
                    {[
                      { id: 'count', label: '개수', icon: <Hash size={16}/> },
                      { id: 'mvp', label: 'MVP', icon: <Medal size={16}/> },
                      { id: 'ranking', label: '랭킹', icon: <Users size={16}/> },
                      { id: 'recent', label: '최근', icon: <Clock size={16}/> },
                      { id: 'image', label: '후원이미지', icon: <ImageIcon size={16}/> }
                    ].map(mode => (
                      <button 
                        key={mode.id}
                        className={`mode-tab ${settings.mode === mode.id ? 'active' : ''}`}
                        onClick={() => setSettings({...settings, mode: mode.id})}
                      >
                        {mode.icon} {mode.label}
                      </button>
                    ))}
                  </div>
                </div>

                {settings.mode === 'ranking' && (
                  <div className="settings-row-pair">
                    <div className="row-label">순위 표시</div>
                    <select value={settings.rankingDisplay} className="styled-select" onChange={(e) => setSettings({...settings, rankingDisplay: e.target.value})}>
                      <option value="rank">등수</option>
                      <option value="medal">메달</option>
                      <option value="image">이미지</option>
                    </select>
                  </div>
                )}

                <div className="divider-line" />

                <div className="settings-row-pair">
                  <div className="row-label">자막 상세</div>
                  <div className="checkbox-group wrap-row">
                    <label className={`toggle-button ${settings.showPlatformIcon ? 'active' : ''}`}>
                      <input type="checkbox" checked={settings.showPlatformIcon} onChange={(e) => setSettings({...settings, showPlatformIcon: e.target.checked})}/>
                      <div className="check-icon">{settings.showPlatformIcon && <Check size={10} />}</div>
                      방송 플랫폼별 구분
                    </label>
                  </div>
                </div>

                <div className="settings-row-pair">
                  <div className="row-label">자막 텍스트</div>
                  <select value={settings.textType} className="styled-select" onChange={(e) => setSettings({...settings, textType: e.target.value})}>
                    <option value="rank">후원 순위</option>
                    <option value="basic">기본 텍스트</option>
                  </select>
                </div>

                <div className="settings-row-pair">
                  <div className="row-label">후원 시작일</div>
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
                  <div className="row-label">후원 단위</div>
                  <select value={settings.unit} className="styled-select" onChange={(e) => setSettings({...settings, unit: e.target.value})}>
                    <option value="default">기본</option>
                    <option value="count">개수</option>
                  </select>
                </div>

                <div className="settings-row-pair">
                  <div className="row-label">자막 세로 정렬</div>
                  <select value={settings.verticalAlign} className="styled-select" onChange={(e) => setSettings({...settings, verticalAlign: e.target.value})}>
                    <option value="top">위</option>
                    <option value="bottom">아래</option>
                  </select>
                </div>

                <div className="settings-row-pair">
                  <div className="row-label">후원 자동 초기화</div>
                  <label className={`toggle-button ${settings.autoReset ? 'active' : ''}`}>
                    <input type="checkbox" checked={settings.autoReset} onChange={(e) => setSettings({...settings, autoReset: e.target.checked})}/>
                    <div className="check-icon">{settings.autoReset && <Check size={10} />}</div>
                    자동 초기화 사용
                  </label>
                </div>
              </div>
            </section>

            {/* Section: Filtering */}
            <section ref={sectionRefs.filtering} className="settings-section" data-section="filtering">
              <div className="settings-card glass-premium">
                <div className="card-header">
                  <h3>필터링 설정</h3>
                  <p>제외할 사용자나 출력 옵션을 설정합니다.</p>
                </div>
                <div className="settings-row-pair">
                  <div className="row-label">사용자 필터링</div>
                  <input 
                    type="text" 
                    className="styled-input" 
                    placeholder="닉네임 또는 아이디 입력" 
                    value={settings.userFilter} 
                    onChange={(e) => setSettings({...settings, userFilter: e.target.value})}
                    style={{ flex: 1 }}
                  />
                </div>
                <div className="settings-row-pair">
                  <div className="row-label">익명 표시</div>
                  <label className={`toggle-button ${settings.showAnonymous ? 'active' : ''}`}>
                    <input type="checkbox" checked={settings.showAnonymous} onChange={(e) => setSettings({...settings, showAnonymous: e.target.checked})}/>
                    <div className="check-icon">{settings.showAnonymous && <Check size={10} />}</div>
                    익명 표시 허용
                  </label>
                </div>
              </div>
            </section>

            {/* Section: Font & Background */}
            <section ref={sectionRefs.font} className="settings-section" data-section="font">
              <div className="settings-card glass-premium">
                <div className="card-header">
                  <h3>폰트 · 배경 설정</h3>
                  <p>가독성을 높이고 배경 이미지를 커스터마이징하세요.</p>
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
                    overflow: 'hidden',
                    position: 'relative'
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
                  <div className="flex-row-gap wrap-row">
                    <div className="color-input-item">
                      <span className="tiny-label">기본</span>
                      <input type="color" value={settings.fontColor} onChange={(e) => setSettings({...settings, fontColor: e.target.value})} />
                    </div>
                    <div className="color-input-item">
                      <span className="tiny-label">닉네임</span>
                      <input type="color" value={settings.nicknameColor} onChange={(e) => setSettings({...settings, nicknameColor: e.target.value})} />
                    </div>
                    <div className="color-input-item">
                      <span className="tiny-label">개수</span>
                      <input type="color" value={settings.amountColor} onChange={(e) => setSettings({...settings, amountColor: e.target.value})} />
                    </div>
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
          {/* 실시간 미리보기 */}
          <OverlayPreviewWrapper title="후원 자막 미리보기" height={300}>
            <SubtitleOverlay
              previewMode={true}
              previewSettings={settings}
              previewEvents={testEvents}
            />
          </OverlayPreviewWrapper>

          {/* 테스트 컨트롤 */}
          <div className="test-controls glass-premium" style={{ marginTop: '16px' }}>
            <div className="test-header">
              <Gift size={16} />
              <span>후원 테스트</span>
            </div>

            <div className="test-form" style={{ marginTop: '12px' }}>
              <div className="flex-row-gap" style={{ marginBottom: '8px' }}>
                <input
                  type="text"
                  className="styled-input"
                  placeholder="후원자 닉네임"
                  value={newDonation.sender}
                  onChange={(e) => setNewDonation({ ...newDonation, sender: e.target.value })}
                  style={{ flex: 1 }}
                />
                <input
                  type="number"
                  className="styled-input"
                  placeholder="금액"
                  value={newDonation.amount}
                  onChange={(e) => setNewDonation({ ...newDonation, amount: e.target.value })}
                  style={{ width: '100px' }}
                />
              </div>
              <button
                className="btn-test-action"
                onClick={() => {
                  if (newDonation.sender && newDonation.amount) {
                    setTestEvents(prev => [{
                      id: Date.now(),
                      sender: newDonation.sender,
                      amount: parseInt(newDonation.amount),
                      type: 'donation'
                    }, ...prev]);
                    setNewDonation({ sender: '', amount: '' });
                  }
                }}
                style={{ width: '100%' }}
              >
                <Plus size={14} /> 후원 추가
              </button>
            </div>

            <div className="test-events-list" style={{ marginTop: '12px', maxHeight: '100px', overflowY: 'auto' }}>
              {testEvents.map((evt) => (
                <div key={evt.id} className="test-event-item" style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 8px',
                  fontSize: '12px',
                  background: 'var(--bg-secondary)',
                  borderRadius: '6px',
                  marginBottom: '4px'
                }}>
                  <span>{evt.sender}: {evt.amount.toLocaleString()}원</span>
                  <button
                    onClick={() => setTestEvents(prev => prev.filter(e => e.id !== evt.id))}
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
              onClick={() => setTestEvents([])}
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
              <RotateCcw size={14} /> 설정 초기화
            </button>
          </div>
        </aside>
      </div>
    </>
  );
};

export default SubtitleSettings;
