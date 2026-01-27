import React, { useState, useEffect, useRef } from 'react';
import {
  Copy, RefreshCw, Save, Monitor, Settings, Eye,
  Trash2, MessageSquare, Bell, Palette, Type,
  Layout, Shield, BellRing, Info, ExternalLink,
  ChevronDown, Maximize2, RotateCcw, HelpCircle,
  Clock, Megaphone, Pin, Volume2, AlertCircle, Check,
  Image as ImageIcon
} from 'lucide-react';
import { API_URL } from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';
import { OverlayPreviewWrapper } from './shared';
import ChatOverlay from '../ChatOverlay';
import './ChatSettings.css';

// 더미 채팅 메시지 풀 (미리보기 애니메이션용)
const dummyChatPool = [
  { sender: '김스트리머', message: '안녕하세요! 오늘도 방송 시작합니다~', platform: 'soop', role: 'streamer' },
  { sender: '팬클럽장', message: '오늘 방송도 화이팅입니다!', platform: 'chzzk', role: 'fan' },
  { sender: '일반시청자', message: 'ㅋㅋㅋㅋ 재밌다', platform: 'youtube', role: 'regular' },
  { sender: 'VIP유저', message: '후원 감사합니다~', platform: 'soop', role: 'vip' },
  { sender: '매니저', message: '공지: 오늘 이벤트 진행중!', platform: 'chzzk', role: 'manager' },
  { sender: '열혈팬', message: '오늘 컨텐츠 뭐해요?', platform: 'soop', role: 'fan' },
  { sender: '뉴비시청자', message: '처음 왔는데 여기 뭐하는 방송이에요?', platform: 'youtube', role: 'regular' },
  { sender: '구독자123', message: '구독하고 갑니다~', platform: 'chzzk', role: 'subscriber' },
  { sender: '단골손님', message: 'ㅎㅇㅎㅇ', platform: 'soop', role: 'regular' },
  { sender: '치즈버거', message: '배고프다...', platform: 'youtube', role: 'regular' },
  { sender: '웃긴닉네임', message: 'ㅋㅋㅋㅋㅋㅋㅋ', platform: 'chzzk', role: 'regular' },
  { sender: '서포터즈', message: '항상 응원합니다!', platform: 'soop', role: 'supporter' },
  { sender: '게임마스터', message: '이거 어떻게 깨요?', platform: 'youtube', role: 'regular' },
  { sender: '밤샘시청자', message: '졸리다...', platform: 'chzzk', role: 'regular' },
  { sender: '질문봇', message: '나이가 어떻게 되세요?', platform: 'soop', role: 'regular' },
];

const defaultSettings = {
  // Theme
  theme: 'default',
  // Layout & Alignment
  alignment: 'left',
  lineMode: 'wrap',
  lineStyle: 'individual',
  direction: 'left',
  nicknameDivider: ':',
  sortType: 'one-line',
  // Effects
  animation: 'fadeIn',
  animationSpeed: 0.2,
  transparency: 100,
  showTooltip: true,
  showPreview: true,
  useCustomCss: false,
  customCss: '',
  // Detailed
  showIcons: true,
  useScroll: false,
  showNickname: true,
  showUserId: false,
  randomNicknameColor: true,
  setNicknameColor: true,
  topFadeout: true,
  autoHide: false,
  // Overlay Controls (위플랩 스타일)
  showSampleChat: true,
  sampleDelay: 30,
  showHoverPanel: true,
  filterEnabled: true,
  notificationEnabled: true,
  // Filtering
  userFilter: '',
  donationFilter: true,
  botFilter: true,
  wordFilter: '',
  donationMessageFilter: true,
  // 노딱방지 필터
  profanityFilter: false,
  profanityFilterLevel: 'medium',
  profanityFilterAction: 'hide',
  // 이모지 전용 모드
  emojiOnlyMode: false,
  // Notifications
  donationNotify: 'image', // none, text, image
  entryNotify: 'none', // none, text, alert, voice
  chatNotify: 'none', // none, alert, voice
  // Widgets
  viewerCount: { enabled: false, position: 'bottom', url: '' },
  notice: { enabled: false, position: 'top', theme: 'default', url: '' },
  timer: { enabled: false, position: 'bottom', theme: 'default', url: '', base: 'none' },
  // Chat Pin
  pinId: '',
  pinVoice: false,
  pinAutoHide: false,
  // Colors
  colors: {
    streamer: { nick: '#ffffff', message: '#ffffff' },
    manager: { nick: '#ffffff', message: '#ffffff' },
    vvip: { nick: '#ffffff', message: '#ffffff' },
    vip: { nick: '#ffffff', message: '#ffffff' },
    fan: { nick: '#ffffff', message: '#ffffff' },
    subscriber: { nick: '#ffffff', message: '#ffffff' },
    supporter: { nick: '#ffffff', message: '#ffffff' },
    regular: { nick: '#ffffff', message: '#ffffff' },
    donationMsg: '#ffe000',
    entryMsg: '#ffe000'
  },
  // Font & Style
  fontSize: 28,
  fontFamily: 'Pretendard',
  fontBold: false,
  useWebFont: false,
  fontOutlineColor: '#000000dd',
  fontOutlineSize: 2,
  useBgColor: false,
  bgColor: '#00000000',
  bgImage: '',
  bgImageMode: 'cover'
};

const themeOptions = [
  { id: 'default', label: '기본' }, { id: 'tanmak', label: '탄막' }, { id: 'cat', label: '고양이' },
  { id: 'newyear', label: '설날' }, { id: 'lol', label: '롤' }, { id: 'star', label: '스타' },
  { id: 'pubg', label: '배그' }, { id: 'heart', label: '하트' }, { id: 'winter', label: '겨울' },
  { id: 'retro-pink', label: '레트로(핑)' }, { id: 'retro-blue', label: '레트로(블루)' },
  { id: 'rainbow', label: '무지개' }, { id: 'crayon', label: '크레용' }, { id: 'gold', label: '골드' },
  { id: 'dotted', label: '점선' }, { id: 'windows', label: '윈도우' }, { id: 'kakao', label: '카카오톡' },
  { id: 'round', label: '라운드' }, { id: 'balloon', label: '풍선' }, { id: 'chalk', label: '칠판' },
  { id: 'neon', label: '네온' }, { id: 'neon-bg', label: '네온(배경)' }, { id: 'box-white', label: '박스(흰)' },
  { id: 'box-black', label: '박스(검)' }, { id: 'leather', label: '가죽' }, { id: 'postit', label: '포스트잇' },
  { id: 'food', label: '음식' }, { id: 'overwatch', label: '오버워치' }
];

const widgetThemes = [
  '일반', '하트핑크', '스타핑크', '고양이', '설날', '롤', '스타', '배그', '하트', '겨울', 
  '풍선', '칠판', '네온', '가죽', '포스트잇', '꿀잼', '백호구', '오버워치', '하트블루', '하트오렌지', '스타블루', '스타오렌지'
];

const timerThemes = [...widgetThemes, '디지털', '네이버'];

const ChatSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const overlayHash = user?.userHash || null;
  const [testChat, setTestChat] = useState({ 
    amount: '100', 
    message: '채팅 입력', 
    userId: '아이디', 
    nickname: '닉네임',
    platform: 'SOOP',
    type: '별풍선'
  });
  const [activePreviewAlert, setActivePreviewAlert] = useState(null);
  const [activeNav, setActiveNav] = useState('theme');

  // 미리보기 애니메이션 메시지 상태
  const [previewMessages, setPreviewMessages] = useState([]);
  const previewMsgIdRef = useRef(0);

  // 미리보기 채팅 애니메이션 효과
  useEffect(() => {
    // 초기 메시지 3개 추가
    const initialMessages = dummyChatPool.slice(0, 3).map((msg, i) => ({
      ...msg,
      id: `preview-${previewMsgIdRef.current++}`
    }));
    setPreviewMessages(initialMessages);

    // 1.5초마다 새 메시지 추가
    const interval = setInterval(() => {
      const randomMsg = dummyChatPool[Math.floor(Math.random() * dummyChatPool.length)];
      const newMsg = {
        ...randomMsg,
        id: `preview-${previewMsgIdRef.current++}`
      };

      setPreviewMessages(prev => {
        const updated = [...prev, newMsg];
        // 최대 8개 메시지만 유지 (오래된 것 제거)
        if (updated.length > 8) {
          return updated.slice(-8);
        }
        return updated;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  // Refs for scrolling
  const sectionRefs = {
    theme: useRef(null),
    detail: useRef(null),
    filtering: useRef(null),
    notif: useRef(null),
    widget: useRef(null),
    timer: useRef(null),
    pin: useRef(null),
    color: useRef(null),
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
      const res = await fetch(`${API_URL}/api/settings/chat`);
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
        body: JSON.stringify({ key: 'chat', value: settings })
      });
      alert('설정이 저장되었습니다.');
    } finally { setSaving(false); }
  };

  const copyUrl = (url) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetSettings = () => {
    if (window.confirm('모든 설정이 초기화됩니다. 계속하시겠습니까?')) {
      setSettings(defaultSettings);
    }
  };

  const handleColorChange = (role, field, value) => {
    setSettings(prev => ({
      ...prev,
      colors: {
        ...prev.colors,
        [role]: { ...prev.colors[role], [field]: value }
      }
    }));
  };

  const handleColorBulk = (field, value) => {
    setSettings(prev => {
      const newColors = { ...prev.colors };
      Object.keys(newColors).forEach(role => {
        if (typeof newColors[role] === 'object') {
          newColors[role] = { ...newColors[role], [field]: value };
        }
      });
      return { ...prev, colors: newColors };
    });
  };

  const handleTest = () => {
    setActivePreviewAlert(null);
    setTimeout(() => {
      setActivePreviewAlert({
        ...testChat,
        timestamp: Date.now()
      });
      // Auto-hide alert after settings.duration or default 5s
      setTimeout(() => setActivePreviewAlert(null), 5000);
    }, 100);
  };

  return (
    <>
      <div className="premium-settings-header animate-fade">
        <div className="header-top-row">
          <div className="title-area">
            <h2 className="title-text">채팅 오버레이 설정</h2>
            <div className="badge-wrapper">
              <span className="badge-new">NEW</span>
              <span className="badge-info">PRO</span>
            </div>
          </div>
          <div className="action-area">
            <button className="btn-copy-url" onClick={() => overlayHash && copyUrl(`${window.location.origin}/overlay/${overlayHash}/chat`)} disabled={!overlayHash}>
              {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? '복사됨' : 'URL 복사'}
            </button>
            <button className="btn-setup-guide">
              <HelpCircle size={16} /> 설정 가이드
            </button>
            <button className="btn-external-view" onClick={() => overlayHash && window.open(`/overlay/${overlayHash}/chat`, '_blank')} disabled={!overlayHash}>
              <ExternalLink size={16} /> 새창으로 열기
            </button>
          </div>
        </div>
      </div>

      <div className="chat-settings-container">
        <div className="chat-settings-main">
          {/* Sticky Navigation Bars (Anchor Links) */}
          <div className="sticky-tabs">
            {[
              { id: 'theme', label: '테마', icon: <Palette size={14}/> },
              { id: 'detail', label: '상세', icon: <Settings size={14}/> },
              { id: 'filtering', label: '필터링', icon: <Shield size={14}/> },
              { id: 'notif', label: '알림', icon: <BellRing size={14}/> },
              { id: 'widget', label: '위젯', icon: <Layout size={14}/> },
              { id: 'color', label: '색상', icon: <Palette size={14}/> },
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
                        <div className={`theme-thumb-inner theme-${theme.id}`} />
                        <span>Theme</span>
                      </div>
                      <div className="theme-name">{theme.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Section: Detail */}
            <section ref={sectionRefs.detail} className="settings-section" data-section="detail">
              <div className="settings-card glass-premium">
                <div className="card-header"><h3>상세 설정</h3></div>
                <div className="settings-row-pair">
                  <div className="row-label">채팅 정렬</div>
                  <div className="checkbox-group no-bg wrap-row">
                    <div className="segmented-control">
                      <div className="segmented-item">
                        <input type="radio" id="sort-one" name="sortType" checked={settings.sortType === 'one-line'} onChange={() => setSettings({...settings, sortType: 'one-line'})}/>
                        <label htmlFor="sort-one" className="segmented-label">한줄</label>
                      </div>
                      <div className="segmented-item">
                        <input type="radio" id="sort-multi" name="sortType" checked={settings.sortType === 'multi-line'} onChange={() => setSettings({...settings, sortType: 'multi-line'})}/>
                        <label htmlFor="sort-multi" className="segmented-label">줄바꿈</label>
                      </div>
                      <div className="segmented-item">
                        <input type="radio" id="sort-start" name="sortType" checked={settings.sortType === 'start-align'} onChange={() => setSettings({...settings, sortType: 'start-align'})}/>
                        <label htmlFor="sort-start" className="segmented-label">시작라인</label>
                      </div>
                      <div className="segmented-item">
                        <input type="radio" id="sort-indiv" name="sortType" checked={settings.sortType === 'indiv-align'} onChange={() => setSettings({...settings, sortType: 'indiv-align'})}/>
                        <label htmlFor="sort-indiv" className="segmented-label">개별라인</label>
                      </div>
                    </div>

                    <div className="with-divider" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 8px' }}>
                      <span className="tiny-label">닉네임 구분 선 :</span>
                      <input type="text" value={settings.nicknameDivider} onChange={(e)=>setSettings({...settings, nicknameDivider:e.target.value})} className="tiny-input" style={{ width: '40px' }}/>
                    </div>
                  </div>
                </div>
                <div className="settings-row-pair">
                  <div className="row-label">채팅 표시 방향</div>
                  <div className="segmented-control">
                    <div className="segmented-item">
                      <input type="radio" id="dir-left" name="direction" checked={settings.direction === 'left'} onChange={() => setSettings({...settings, direction: 'left'})}/>
                      <label htmlFor="dir-left" className="segmented-label">왼쪽</label>
                    </div>
                    <div className="segmented-item">
                      <input type="radio" id="dir-center" name="direction" checked={settings.direction === 'center'} onChange={() => setSettings({...settings, direction: 'center'})}/>
                      <label htmlFor="dir-center" className="segmented-label">가운데</label>
                    </div>
                    <div className="segmented-item">
                      <input type="radio" id="dir-right" name="direction" checked={settings.direction === 'right'} onChange={() => setSettings({...settings, direction: 'right'})}/>
                      <label htmlFor="dir-right" className="segmented-label">오른쪽</label>
                    </div>
                  </div>
                </div>
                <div className="settings-row-pair">
                  <div className="row-label">표시 효과 & 속도</div>
                  <div className="flex-row-gap">
                    <select value={settings.animation} onChange={(e) => setSettings({...settings, animation: e.target.value})} className="styled-select" style={{ width: '120px' }}>
                      <option value="fadeIn">fadeIn</option>
                      <option value="slideIn">slideIn</option>
                    </select>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input type="range" min="0" max="2" step="0.1" value={settings.animationSpeed} onChange={(e) => setSettings({...settings, animationSpeed: parseFloat(e.target.value)})} style={{ flex: 1 }}/>
                      <span className="unit-value">{settings.animationSpeed}초</span>
                    </div>
                  </div>
                </div>
                <div className="settings-row-pair">
                  <div className="row-label">창 투명도 <HelpCircle size={14} className="text-muted"/></div>
                  <div className="flex-row-gap">
                    <input type="range" min="0" max="100" value={settings.transparency} onChange={(e) => setSettings({...settings, transparency: parseInt(e.target.value)})} style={{ flex: 1 }}/>
                    <span className="unit-value">{settings.transparency}%</span>
                  </div>
                </div>
                
                <div className="divider-line" />
                
                <div className="checkbox-grid-refined">
                   <label className={`toggle-button ${settings.showIcons ? 'active' : ''}`}>
                     <input type="checkbox" checked={settings.showIcons} onChange={(e) => setSettings({...settings, showIcons: e.target.checked})}/>
                     <div className="check-icon">{settings.showIcons && <Check size={10} />}</div>
                     방송 플랫폼 아이콘 표시
                   </label>
                   
                   <label className={`toggle-button ${settings.useScroll ? 'active' : ''}`}>
                     <input type="checkbox" checked={settings.useScroll} onChange={(e) => setSettings({...settings, useScroll: e.target.checked})}/>
                     <div className="check-icon">{settings.useScroll && <Check size={10} />}</div>
                     스크롤 사용
                   </label>

                   <label className={`toggle-button ${settings.showNickname ? 'active' : ''}`}>
                     <input type="checkbox" checked={settings.showNickname} onChange={(e) => setSettings({...settings, showNickname: e.target.checked})}/>
                     <div className="check-icon">{settings.showNickname && <Check size={10} />}</div>
                     시청자 닉네임 표시
                   </label>

                   <label className={`toggle-button ${settings.showUserId ? 'active' : ''}`}>
                     <input type="checkbox" checked={settings.showUserId} onChange={(e) => setSettings({...settings, showUserId: e.target.checked})}/>
                     <div className="check-icon">{settings.showUserId && <Check size={10} />}</div>
                     시청자 아이디 표시
                   </label>

                   <label className={`toggle-button ${settings.randomNicknameColor ? 'active' : ''}`}>
                     <input type="checkbox" checked={settings.randomNicknameColor} onChange={(e) => setSettings({...settings, randomNicknameColor: e.target.checked})}/>
                     <div className="check-icon">{settings.randomNicknameColor && <Check size={10} />}</div>
                     닉네임 랜덤색 사용
                   </label>

                   <label className={`toggle-button ${settings.setNicknameColor ? 'active' : ''}`}>
                     <input type="checkbox" checked={settings.setNicknameColor} onChange={(e) => setSettings({...settings, setNicknameColor: e.target.checked})}/>
                     <div className="check-icon">{settings.setNicknameColor && <Check size={10} />}</div>
                     닉네임 설정색 사용
                   </label>

                   <label className={`toggle-button ${settings.topFadeout ? 'active' : ''}`}>
                     <input type="checkbox" checked={settings.topFadeout} onChange={(e) => setSettings({...settings, topFadeout: e.target.checked})}/>
                     <div className="check-icon">{settings.topFadeout && <Check size={10} />}</div>
                     채팅 상단 페이드아웃
                   </label>

                   <label className={`toggle-button ${settings.autoHide ? 'active' : ''}`}>
                     <input type="checkbox" checked={settings.autoHide} onChange={(e) => setSettings({...settings, autoHide: e.target.checked})}/>
                     <div className="check-icon">{settings.autoHide && <Check size={10} />}</div>
                     채팅 자동 숨김
                   </label>

                   <label className={`toggle-button ${settings.showTooltip ? 'active' : ''}`}>
                     <input type="checkbox" checked={settings.showTooltip} onChange={(e) => setSettings({...settings, showTooltip: e.target.checked})}/>
                     <div className="check-icon">{settings.showTooltip && <Check size={10} />}</div>
                     창 툴팁 메뉴 사용
                   </label>

                   <label className={`toggle-button ${settings.showPreview ? 'active' : ''}`}>
                     <input type="checkbox" checked={settings.showPreview} onChange={(e) => setSettings({...settings, showPreview: e.target.checked})}/>
                     <div className="check-icon">{settings.showPreview && <Check size={10} />}</div>
                     채팅 미리보기 사용
                   </label>
                </div>

                <div className="divider-line" />

                {/* 오버레이 컨트롤 설정 (위플랩 스타일) */}
                <div className="settings-row-pair">
                  <div className="row-label">
                    <span className="badge-orange">NEW</span> 오버레이 호버 패널
                  </div>
                  <div className="checkbox-group">
                    <label className={`toggle-button ${settings.showHoverPanel ? 'active' : ''}`}>
                      <input type="checkbox" checked={settings.showHoverPanel} onChange={(e) => setSettings({...settings, showHoverPanel: e.target.checked})}/>
                      <div className="check-icon">{settings.showHoverPanel && <Check size={10} />}</div>
                      마우스오버 시 컨트롤 패널 표시
                    </label>
                  </div>
                </div>

                <div className="settings-row-pair">
                  <div className="row-label">
                    <span className="badge-orange">NEW</span> 샘플 채팅
                  </div>
                  <div className="checkbox-group wrap-row">
                    <label className={`toggle-button ${settings.showSampleChat ? 'active' : ''}`}>
                      <input type="checkbox" checked={settings.showSampleChat} onChange={(e) => setSettings({...settings, showSampleChat: e.target.checked})}/>
                      <div className="check-icon">{settings.showSampleChat && <Check size={10} />}</div>
                      실제 채팅 없을 때 샘플 표시
                    </label>
                    {settings.showSampleChat && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="tiny-label">표시 딜레이:</span>
                        <input
                          type="number"
                          value={settings.sampleDelay}
                          onChange={(e) => setSettings({...settings, sampleDelay: parseInt(e.target.value) || 30})}
                          className="tiny-input"
                          style={{ width: '60px' }}
                          min="5"
                          max="300"
                        />
                        <span className="tiny-label">초</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="settings-row-pair">
                  <div className="row-label">호버 패널 기본값</div>
                  <div className="checkbox-group">
                    <label className={`toggle-button ${settings.filterEnabled ? 'active' : ''}`}>
                      <input type="checkbox" checked={settings.filterEnabled} onChange={(e) => setSettings({...settings, filterEnabled: e.target.checked})}/>
                      <div className="check-icon">{settings.filterEnabled && <Check size={10} />}</div>
                      필터 활성화
                    </label>
                    <label className={`toggle-button ${settings.notificationEnabled ? 'active' : ''}`}>
                      <input type="checkbox" checked={settings.notificationEnabled} onChange={(e) => setSettings({...settings, notificationEnabled: e.target.checked})}/>
                      <div className="check-icon">{settings.notificationEnabled && <Check size={10} />}</div>
                      알림 활성화
                    </label>
                  </div>
                </div>

                <div className="divider-line" />

                <div className="settings-row-pair vertical">
                  <div className="row-label" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '12px' }}>
                    <span>커스텀 스타일 CSS</span>
                    <label className={`toggle-button small ${settings.useCustomCss ? 'active' : ''}`}>
                      <input type="checkbox" checked={settings.useCustomCss} onChange={(e) => setSettings({...settings, useCustomCss: e.target.checked})}/>
                      <div className="check-icon">{settings.useCustomCss && <Check size={10} />}</div>
                      사용
                    </label>
                  </div>
                  {settings.useCustomCss && (
                    <div className="css-editor-container" style={{ width: '100%' }}>
                      <textarea 
                        className="styled-input css-textarea" 
                        style={{ height: '120px', width: '100%', fontFamily: 'monospace', fontSize: '13px', padding: '12px' }}
                        placeholder="body { background: transparent; } ..."
                        value={settings.customCss}
                        onChange={(e) => setSettings({...settings, customCss: e.target.value})}
                      />
                      <p className="helper-text-alert" style={{ marginTop: '8px' }}>변경 내용은 실제 URL에 반영되며, 전체에 영향을 주는 CSS를 주의해주세요! 예: body {'{'} display: none {'}'}</p>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Section: Filtering */}
            <section ref={sectionRefs.filtering} className="settings-section" data-section="filtering">
              <div className="settings-card glass-premium">
                <div className="card-header">
                  <h3>필터링 설정</h3>
                  <p>불쾌한 사용자나 단어를 관리하여 쾌적한 채팅 환경을 만드세요.</p>
                </div>
                <div className="settings-row-pair">
                  <div className="row-label">사용자 필터링 <HelpCircle size={14} className="text-muted"/></div>
                  <div className="checkbox-group wrap-row">
                    <input 
                      type="text" 
                      value={settings.userFilter} 
                      onChange={(e) => setSettings({...settings, userFilter: e.target.value})} 
                      placeholder="닉네임 또는 아이디 입력 (쉼표로 구분)" 
                      className="styled-input" 
                      style={{ flex: 1, minWidth: '240px' }}
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <label className={`toggle-button ${settings.botFilter ? 'active' : ''}`}>
                        <input type="checkbox" checked={settings.botFilter} onChange={(e)=>setSettings({...settings, botFilter:e.target.checked})}/>
                        <div className="check-icon">{settings.botFilter && <Check size={10} />}</div>
                        봇 필터링
                      </label>
                    </div>
                  </div>
                </div>
                <div className="settings-row-pair">
                  <div className="row-label">
                    <span className="badge-orange">NEW</span> 단어 필터링
                  </div>
                  <div style={{ flex: 1 }}>
                     <textarea 
                        value={settings.wordFilter} 
                        onChange={(e) => setSettings({...settings, wordFilter: e.target.value})} 
                        placeholder="필터링 할 단어 입력 (엔터 또는 쉼표로 구분)" 
                        className="styled-input" 
                        style={{ height: '100px', width: '100%', padding: '12px' }}
                     />
                     <div style={{ marginTop: '16px' }}>
                        <label className={`toggle-button ${settings.donationMessageFilter ? 'active' : ''}`}>
                          <input type="checkbox" checked={settings.donationMessageFilter} onChange={(e)=>setSettings({...settings, donationMessageFilter:e.target.checked})}/>
                          <div className="check-icon">{settings.donationMessageFilter && <Check size={10} />}</div>
                          후원메시지 필터
                        </label>
                     </div>
                  </div>
                </div>
                <div className="divider-line" />

                <div className="card-header">
                  <h3>
                    <span className="badge-orange">NEW</span> 유튜브 노딱방지 필터
                  </h3>
                  <p>욕설, 비속어, 부적절한 채팅을 자동으로 감지하여 오버레이에 표시하지 않습니다.</p>
                </div>

                <div className="settings-row-pair">
                  <div className="row-label">노딱방지 필터</div>
                  <label className={`toggle-button ${settings.profanityFilter ? 'active' : ''}`}>
                    <input type="checkbox" checked={settings.profanityFilter} onChange={(e) => setSettings({...settings, profanityFilter: e.target.checked})}/>
                    <div className="check-icon">{settings.profanityFilter && <Check size={10} />}</div>
                    사용
                  </label>
                </div>

                {settings.profanityFilter && (
                  <>
                    <div className="settings-row-pair">
                      <div className="row-label">필터 강도</div>
                      <div className="segmented-control">
                        <div className="segmented-item">
                          <input type="radio" id="prof-low" name="profLevel" checked={settings.profanityFilterLevel === 'low'} onChange={() => setSettings({...settings, profanityFilterLevel: 'low'})}/>
                          <label htmlFor="prof-low" className="segmented-label">약함</label>
                        </div>
                        <div className="segmented-item">
                          <input type="radio" id="prof-medium" name="profLevel" checked={settings.profanityFilterLevel === 'medium'} onChange={() => setSettings({...settings, profanityFilterLevel: 'medium'})}/>
                          <label htmlFor="prof-medium" className="segmented-label">보통</label>
                        </div>
                        <div className="segmented-item">
                          <input type="radio" id="prof-high" name="profLevel" checked={settings.profanityFilterLevel === 'high'} onChange={() => setSettings({...settings, profanityFilterLevel: 'high'})}/>
                          <label htmlFor="prof-high" className="segmented-label">강함</label>
                        </div>
                      </div>
                    </div>

                    <div className="settings-row-pair">
                      <div className="row-label">필터링 동작</div>
                      <div className="segmented-control">
                        <div className="segmented-item">
                          <input type="radio" id="prof-hide" name="profAction" checked={settings.profanityFilterAction === 'hide'} onChange={() => setSettings({...settings, profanityFilterAction: 'hide'})}/>
                          <label htmlFor="prof-hide" className="segmented-label">숨김</label>
                        </div>
                        <div className="segmented-item">
                          <input type="radio" id="prof-mask" name="profAction" checked={settings.profanityFilterAction === 'mask'} onChange={() => setSettings({...settings, profanityFilterAction: 'mask'})}/>
                          <label htmlFor="prof-mask" className="segmented-label">*** 처리</label>
                        </div>
                      </div>
                    </div>

                    <div className="settings-info-text">
                      <Info size={16} />
                      <span>약함: 심한 욕설만 필터링 | 보통: 일반 비속어 포함 | 강함: 은어, 변형어까지 필터링</span>
                    </div>
                  </>
                )}

                <div className="divider-line" />

                {/* 이모지 전용 모드 */}
                <div className="card-header" style={{ marginTop: '16px' }}>
                  <h3>
                    <span className="badge" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', marginRight: '8px' }}>NEW</span>
                    이모지 전용 모드
                  </h3>
                  <p>트위치 스타일! 텍스트를 모두 숨기고 이모지/이모티콘만 표시합니다.</p>
                </div>

                <div className="settings-row-pair">
                  <div className="row-label">이모지 전용 모드</div>
                  <label className={`toggle-button ${settings.emojiOnlyMode ? 'active' : ''}`}>
                    <input
                      type="checkbox"
                      checked={settings.emojiOnlyMode}
                      onChange={(e) => setSettings({...settings, emojiOnlyMode: e.target.checked})}
                    />
                    <div className="check-icon">{settings.emojiOnlyMode && <Check size={10} />}</div>
                    사용
                  </label>
                </div>

                {settings.emojiOnlyMode && (
                  <div className="settings-info-text">
                    <Info size={16} />
                    <span>이모지가 없는 메시지는 표시되지 않습니다. SOOP 이모티콘({'{:emoteName:}'}) 및 유니코드 이모지(😀🎉❤️)가 지원됩니다.</span>
                  </div>
                )}

                <div className="info-box-blue">
                   <p><Info size={16}/> 필터링은 모든 채팅창, 후원알림 프리셋에 공통으로 적용됩니다.</p>
                   <p><Info size={16}/> 필터링된 단어는 ♡ 로 표시됩니다.</p>
                   <p className="text-red"><AlertCircle size={16}/> 필터링 설정은 오버레이 URL을 새로고침하셔야 적용됩니다.</p>
                </div>
              </div>
            </section>

            {/* Section: Notifications */}
            <section ref={sectionRefs.notif} className="settings-section" data-section="notif">
               <div className="settings-card glass-premium">
                  <div className="card-header">
                    <h3>채팅 알림 설정</h3>
                    <p>중요한 이벤트 발생 시 채팅창에 표시될 알림 방식을 설정하세요.</p>
                  </div>
                  <div className="settings-row-pair">
                    <div className="row-label">후원 알림 <HelpCircle size={14} className="text-muted"/></div>
                    <div className="segmented-control">
                      <div className="segmented-item">
                        <input type="radio" id="don-none" name="donNotif" checked={settings.donationNotify==='none'} onChange={()=>setSettings({...settings, donationNotify:'none'})}/>
                        <label htmlFor="don-none" className="segmented-label">안함</label>
                      </div>
                      <div className="segmented-item">
                        <input type="radio" id="don-text" name="donNotif" checked={settings.donationNotify==='text'} onChange={()=>setSettings({...settings, donationNotify:'text'})}/>
                        <label htmlFor="don-text" className="segmented-label">텍스트</label>
                      </div>
                      <div className="segmented-item">
                        <input type="radio" id="don-image" name="donNotif" checked={settings.donationNotify==='image'} onChange={()=>setSettings({...settings, donationNotify:'image'})}/>
                        <label htmlFor="don-image" className="segmented-label">이미지</label>
                      </div>
                    </div>
                  </div>
                  <div className="settings-row-pair">
                    <div className="row-label">
                      입장 알림 <HelpCircle size={14} className="text-muted"/>
                    </div>
                    <div className="segmented-control">
                      <div className="segmented-item">
                        <input type="radio" id="ent-none" name="entryNotif" checked={settings.entryNotify==='none'} onChange={()=>setSettings({...settings, entryNotify:'none'})}/>
                        <label htmlFor="ent-none" className="segmented-label">안함</label>
                      </div>
                      <div className="segmented-item">
                        <input type="radio" id="ent-text" name="entryNotif" checked={settings.entryNotify==='text'} onChange={()=>setSettings({...settings, entryNotify:'text'})}/>
                        <label htmlFor="ent-text" className="segmented-label">텍스트</label>
                      </div>
                      <div className="segmented-item">
                        <input type="radio" id="ent-alert" name="entryNotif" checked={settings.entryNotify==='alert'} onChange={()=>setSettings({...settings, entryNotify:'alert'})}/>
                        <label htmlFor="ent-alert" className="segmented-label">알림음</label>
                      </div>
                      <div className="segmented-item">
                        <input type="radio" id="ent-voice" name="entryNotif" checked={settings.entryNotify==='voice'} onChange={()=>setSettings({...settings, entryNotify:'voice'})}/>
                        <label htmlFor="ent-voice" className="segmented-label">음성</label>
                      </div>
                    </div>
                  </div>
                  <div className="settings-row-pair">
                    <div className="row-label">채팅 사운드 <HelpCircle size={14} className="text-muted"/></div>
                    <div className="segmented-control">
                      <div className="segmented-item">
                        <input type="radio" id="chat-not-none" name="chatNotif" checked={settings.chatNotify==='none'} onChange={()=>setSettings({...settings, chatNotify:'none'})}/>
                        <label htmlFor="chat-not-none" className="segmented-label">안함</label>
                      </div>
                      <div className="segmented-item">
                        <input type="radio" id="chat-not-alert" name="chatNotif" checked={settings.chatNotify==='alert'} onChange={()=>setSettings({...settings, chatNotify:'alert'})}/>
                        <label htmlFor="chat-not-alert" className="segmented-label">알림음</label>
                      </div>
                      <div className="segmented-item">
                        <input type="radio" id="chat-not-voice" name="chatNotif" checked={settings.chatNotify==='voice'} onChange={()=>setSettings({...settings, chatNotify:'voice'})}/>
                        <label htmlFor="chat-not-voice" className="segmented-label">음성</label>
                      </div>
                    </div>
                  </div>
               </div>
            </section>

            {/* Section: Widget */}
            <section ref={sectionRefs.widget} className="settings-section" data-section="widget">
               <div className="settings-card glass-premium">
                  <div className="card-header">
                    <h3>채팅 위젯</h3>
                    <p>채팅창과 함께 사용할 수 있는 다양한 부가 기능을 설정하세요.</p>
                  </div>
                  
                  {/* Viewer Count */}
                  <div className="widget-item-refined">
                    <div className="widget-header-row">
                      <div className="widget-title">총 시청자수 표시</div>
                      <div className="url-copy-bar-mini">
                        <span className="bar-label">전용 URL</span>
                        <div className="url-box-wrap">
                          <input type="text" readOnly value={overlayHash ? `${window.location.origin}/overlay/${overlayHash}/chat?mode=view` : ''} />
                          <button onClick={()=>overlayHash && copyUrl(`${window.location.origin}/overlay/${overlayHash}/chat?mode=view`)} disabled={!overlayHash}><Copy size={12}/> 복사</button>
                        </div>
                      </div>
                    </div>
                    <div className="widget-options-grid">
                       <div className={`widget-preview-card ${!settings.viewerCount.enabled ? 'active' : ''}`} onClick={()=>setSettings({...settings, viewerCount:{...settings.viewerCount, enabled:false}})}>
                          <div className="preview-thumb" style={{ background: '#f1f5f9' }}>OFF</div>
                          <div className="preview-label">사용 안함</div>
                       </div>
                       <div className={`widget-preview-card ${settings.viewerCount.enabled && settings.viewerCount.position==='top' ? 'active' : ''}`} onClick={()=>setSettings({...settings, viewerCount:{enabled:true, position:'top', url:settings.viewerCount.url}})}>
                          <div className="preview-thumb" style={{ background: 'linear-gradient(to bottom, var(--primary-light) 30%, #f1f5f9 30%)' }}>상단</div>
                          <div className="preview-label">위 표시</div>
                       </div>
                       <div className={`widget-preview-card ${settings.viewerCount.enabled && settings.viewerCount.position==='bottom' ? 'active' : ''}`} onClick={()=>setSettings({...settings, viewerCount:{enabled:true, position:'bottom', url:settings.viewerCount.url}})}>
                          <div className="preview-thumb" style={{ background: 'linear-gradient(to top, var(--primary-light) 30%, #f1f5f9 30%)' }}>하단</div>
                          <div className="preview-label">아래 표시</div>
                       </div>
                    </div>
                  </div>

                  <div className="divider-line" />

                  {/* Notice */}
                  <div className="widget-item-refined">
                    <div className="widget-header-row">
                      <div className="widget-title">공지 사항</div>
                      <div className="url-copy-bar-mini">
                        <span className="bar-label">전용 URL</span>
                        <div className="url-box-wrap">
                          <input type="text" readOnly value={overlayHash ? `${window.location.origin}/overlay/${overlayHash}/chat?mode=notice` : ''} />
                          <button onClick={()=>overlayHash && copyUrl(`${window.location.origin}/overlay/${overlayHash}/chat?mode=notice`)} disabled={!overlayHash}><Copy size={12}/> 복사</button>
                        </div>
                      </div>
                    </div>
                    <div className="theme-scroll-grid">
                       {widgetThemes.map(t => (
                         <div key={t} className={`theme-item-box ${settings.notice.theme === t ? 'active' : ''}`} onClick={()=>setSettings({...settings, notice:{...settings.notice, theme:t}})}>
                            <div className="theme-visual" style={{ background: t.includes('핑크') ? '#ff7ec1' : '#334155' }}>
                               <span>Notice</span>
                            </div>
                            <div className="theme-name-tag">{t}</div>
                         </div>
                       ))}
                    </div>
                     <div className="settings-row-pair" style={{ marginTop: '24px' }}>
                       <div className="row-label">표시 위치</div>
                       <div className="segmented-control">
                         <div className="segmented-item">
                           <input type="radio" id="not-pos-none" name="noticePos" checked={!settings.notice.enabled} onChange={() => setSettings({...settings, notice: {...settings.notice, enabled: false}})}/>
                           <label htmlFor="not-pos-none" className="segmented-label">안함</label>
                         </div>
                         <div className="segmented-item">
                           <input type="radio" id="not-pos-top" name="noticePos" checked={settings.notice.enabled && settings.notice.position === 'top'} onChange={() => setSettings({...settings, notice: {enabled: true, position: 'top', url: settings.notice.url, theme: settings.notice.theme}})}/>
                           <label htmlFor="not-pos-top" className="segmented-label">위</label>
                         </div>
                         <div className="segmented-item">
                           <input type="radio" id="not-pos-bottom" name="noticePos" checked={settings.notice.enabled && settings.notice.position === 'bottom'} onChange={() => setSettings({...settings, notice: {enabled: true, position: 'bottom', url: settings.notice.url, theme: settings.notice.theme}})}/>
                           <label htmlFor="not-pos-bottom" className="segmented-label">아래</label>
                         </div>
                       </div>
                     </div>
                    <div className="command-guide-box">
                       <h4><Megaphone size={18} style={{ color: 'var(--primary)' }}/> 공지 명령어 사용법</h4>
                       <p className="guide-intro">스트리머, 매니저 등 관리자 이상이 채팅창에 입력</p>
                       <div className="command-list-grid">
                          <div className="cmd-item">
                             <div className="cmd-name">!공지/테마/테마이름</div>
                             <div className="cmd-desc">공지 테마 즉시 변경</div>
                          </div>
                          <div className="cmd-item">
                             <div className="cmd-name">!공지 (내용), #공지 (내용)</div>
                             <div className="cmd-desc">채팅창 상단에 공지 표시</div>
                          </div>
                          <div className="cmd-item">
                             <div className="cmd-name">!공지삭제, !공지끝, #공지삭제</div>
                             <div className="cmd-desc">표시 중인 공지 숨기기</div>
                          </div>
                          <div className="cmd-item">
                             <div className="cmd-name">!공지/시간, !공지 방송시간</div>
                             <div className="cmd-desc">현재 시간 또는 방송 업타임 표시</div>
                          </div>
                          <div className="cmd-item">
                             <div className="cmd-name">!공지/계산/내용/값/최소값</div>
                             <div className="cmd-desc">킬내기, 용돈 등 자동 합산 표시</div>
                          </div>
                          <div className="cmd-item">
                             <div className="cmd-name">!공지/계산/+-값</div>
                             <div className="cmd-desc">기존 값에 더하기/빼기 계산</div>
                          </div>
                       </div>
                    </div>
                  </div>
               </div>
            </section>

            {/* Section: Timer */}
            <section ref={sectionRefs.timer} id="timer-section" className="settings-section" data-section="widget">
               <div className="settings-card glass-premium">
                  <div className="card-header">
                    <h3>타이머</h3>
                    <p>방송 시간이나 카운트다운을 채팅창에 표시합니다.</p>
                  </div>
                  <div className="url-copy-bar-mini" style={{ marginBottom: '24px' }}>
                    <span className="bar-label">전용 URL</span>
                    <div className="url-box-wrap">
                      <input type="text" readOnly value={overlayHash ? `${window.location.origin}/overlay/${overlayHash}/chat?mode=timer` : ''} />
                      <button onClick={()=>overlayHash && copyUrl(`${window.location.origin}/overlay/${overlayHash}/chat?mode=timer`)} disabled={!overlayHash}><Copy size={12}/> 복사</button>
                    </div>
                  </div>
                  <div className="theme-scroll-grid">
                      {timerThemes.map(t => (
                         <div key={t} className={`theme-item-box ${settings.timer.theme === t ? 'active' : ''}`} onClick={()=>setSettings({...settings, timer:{...settings.timer, theme:t}})}>
                            <div className="theme-visual" style={{ background: t === '디지털' ? '#000' : '#334155', color: t === '디지털' ? '#0f0' : 'white' }}>
                              {t === '디지털' ? '00:00:00' : 'Time'}
                            </div>
                            <div className="theme-name-tag">{t}</div>
                         </div>
                       ))}
                  </div>
                   <div className="settings-row-pair" style={{ marginTop: '32px' }}>
                     <div className="row-label">표시 위치</div>
                     <div className="segmented-control">
                       <div className="segmented-item">
                         <input type="radio" id="time-pos-none" name="timerPos" checked={!settings.timer.enabled} onChange={() => setSettings({...settings, timer: {...settings.timer, enabled: false}})}/>
                         <label htmlFor="time-pos-none" className="segmented-label">안함</label>
                       </div>
                       <div className="segmented-item">
                         <input type="radio" id="time-pos-top" name="timerPos" checked={settings.timer.enabled && settings.timer.position === 'top'} onChange={() => setSettings({...settings, timer: {enabled: true, position: 'top', url: settings.timer.url, theme: settings.timer.theme, base: settings.timer.base}})}/>
                         <label htmlFor="time-pos-top" className="segmented-label">위</label>
                       </div>
                       <div className="segmented-item">
                         <input type="radio" id="time-pos-bottom" name="timerPos" checked={settings.timer.enabled && settings.timer.position === 'bottom'} onChange={() => setSettings({...settings, timer: {enabled: true, position: 'bottom', url: settings.timer.url, theme: settings.timer.theme, base: settings.timer.base}})}/>
                         <label htmlFor="time-pos-bottom" className="segmented-label">아래</label>
                       </div>
                     </div>
                   </div>
                   <div className="settings-row-pair">
                     <div className="row-label">기본 모드</div>
                     <div className="segmented-control">
                       <div className="segmented-item">
                         <input type="radio" id="time-mode-none" name="timerMode" checked={settings.timer.base === 'none'} onChange={() => setSettings({...settings, timer: {...settings.timer, base: 'none'}})}/>
                         <label htmlFor="time-mode-none" className="segmented-label">안함</label>
                       </div>
                       <div className="segmented-item">
                         <input type="radio" id="time-mode-curr" name="timerMode" checked={settings.timer.base === 'current'} onChange={() => setSettings({...settings, timer: {...settings.timer, base: 'current'}})}/>
                         <label htmlFor="time-mode-curr" className="segmented-label">현재시간</label>
                       </div>
                       <div className="segmented-item">
                         <input type="radio" id="time-mode-stream" name="timerMode" checked={settings.timer.base === 'stream'} onChange={() => setSettings({...settings, timer: {...settings.timer, base: 'stream'}})}/>
                         <label htmlFor="time-mode-stream" className="segmented-label">방송시간</label>
                       </div>
                     </div>
                   </div>
                  <div className="command-guide-box">
                       <h4><Clock size={18} style={{ color: 'var(--primary)' }}/> 타이머 명령어 사용법</h4>
                       <div className="command-list-grid">
                          <div className="cmd-item">
                             <div className="cmd-name">!시간/테마/테마이름</div>
                             <div className="cmd-desc">타이머 테마 즉시 변경</div>
                          </div>
                          <div className="cmd-item">
                             <div className="cmd-name">!시간, #시간, !시간삭제</div>
                             <div className="cmd-desc">현재 시간 표시 또는 삭제</div>
                          </div>
                          <div className="cmd-item">
                             <div className="cmd-name">!시간 10분, !시간 600, !시간 0</div>
                             <div className="cmd-desc">카운트다운 또는 카운트업 시작</div>
                          </div>
                          <div className="cmd-item">
                             <div className="cmd-name">!시간정지 / !시간시작</div>
                             <div className="cmd-desc">타이머 일시정지 및 재개</div>
                          </div>
                          <div className="cmd-item">
                             <div className="cmd-name">!시간/추가/+1분, !시간/추가/-10</div>
                             <div className="cmd-desc">진행 중인 시간 추가 또는 차감</div>
                          </div>
                          <div className="cmd-item">
                             <div className="cmd-name">!시간 방송시간, !시간 업타임</div>
                             <div className="cmd-desc">방송 시작 후 경과 시간 표시</div>
                          </div>
                       </div>
                  </div>
               </div>
            </section>

             {/* Section: Chat Pin */}
             <section ref={sectionRefs.pin} id="pin-section" className="settings-section" data-section="widget">
                <div className="settings-card glass-premium">
                   <div className="card-header">
                     <h3>채팅 고정</h3>
                     <p>특정 유저의 채팅을 오버레이 상단에 고정합니다.</p>
                   </div>
                   <div className="settings-row-pair">
                      <div className="row-label">대상 유저</div>
                       <div className="checkbox-group no-bg wrap-row">
                         <input type="text" className="styled-input" style={{ flex: 1, minWidth: '200px' }} placeholder="고정할 닉네임 또는 아이디 입력" value={settings.pinId} onChange={(e) => setSettings({...settings, pinId: e.target.value})}/>
                         <div style={{ display: 'flex', gap: '8px' }}>
                           <label className={`toggle-button ${settings.pinVoice ? 'active' : ''}`}>
                             <input type="checkbox" checked={settings.pinVoice} onChange={(e)=>setSettings({...settings, pinVoice: e.target.checked})}/>
                             <div className="check-icon">{settings.pinVoice && <Check size={10} />}</div>
                             음성 고정
                           </label>
                           <label className={`toggle-button ${settings.pinAutoHide ? 'active' : ''}`}>
                             <input type="checkbox" checked={settings.pinAutoHide} onChange={(e)=>setSettings({...settings, pinAutoHide: e.target.checked})}/>
                             <div className="check-icon">{settings.pinAutoHide && <Check size={10} />}</div>
                             자동 숨김
                           </label>
                         </div>
                       </div>
                   </div>
                   <div className="command-guide-box">
                        <h4><Pin size={18} style={{ color: 'var(--primary)' }}/> 채팅 고정 명령어 사용법</h4>
                        <div className="command-list-grid">
                           <div className="cmd-item">
                              <div className="cmd-name">!고정 닉네임 / !고정 (아이디)</div>
                              <div className="cmd-desc">채팅창 상단에 해당 채팅 박제</div>
                           </div>
                           <div className="cmd-item">
                              <div className="cmd-name">!음성고정 (닉네임)</div>
                              <div className="cmd-desc">고정 박제와 함께 음성 알림</div>
                           </div>
                           <div className="cmd-item">
                              <div className="cmd-name">!고정해제 / !고정삭제</div>
                              <div className="cmd-desc">고정된 모든 채팅 내리기</div>
                           </div>
                        </div>
                   </div>
                </div>
             </section>

             {/* Section: Color & Font */}
             <section ref={sectionRefs.color} className="settings-section" data-section="color">
                <div className="settings-card glass-premium">
                  <div className="card-header">
                    <h3>채팅 아이콘 / 색상</h3>
                    <p>플랫폼별 아이콘과 역할별 닉네임/채팅 색상을 설정하세요.</p>
                  </div>
                  <div className="settings-row-pair">
                     <div className="row-label">플랫폼 배지</div>
                     <div className="checkbox-group wrap-row">
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                           <span className="badge-new" style={{ background: '#eee', color: '#666' }}>스트리머</span>
                           <span className="badge-new" style={{ background: '#eee', color: '#666' }}>매니저</span>
                           <span className="badge-new" style={{ background: '#eee', color: '#666' }}>열혈</span>
                           <span className="badge-new" style={{ background: '#eee', color: '#666' }}>팬클럽</span>
                           <span className="badge-new" style={{ background: '#eee', color: '#666' }}>구독</span>
                        </div>
                        <p style={{ fontSize: '12px', color: '#94a3b8', marginLeft: '8px' }}>* SOOP 전용 배지 설정</p>
                     </div>
                  </div>
                  <div className="divider-line" />
                  <div>
                    <div className="color-bulk-action">
                       <button className="btn-outline-small" onClick={() => handleColorBulk('nick', '#ffffff')}>흰색 닉네임</button>
                       <button className="btn-outline-small" onClick={() => handleColorBulk('nick', '#000000')}>검정 닉네임</button>
                       <button className="btn-outline-small" onClick={() => handleColorBulk('message', '#ffffff')}>흰색 채팅</button>
                       <button className="btn-outline-small" onClick={() => handleColorBulk('message', '#000000')}>검정 채팅</button>
                    </div>
                    <div className="color-settings-list-detailed">
                        {Object.keys(settings.colors).filter(k => typeof settings.colors[k] === 'object').map(role => (
                          <div key={role} className="color-row-detailed">
                            <span className="role-label">{role.toUpperCase()}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span className="tiny-label">닉네임</span>
                              <input type="color" value={settings.colors[role].nick} onChange={(e)=>handleColorChange(role, 'nick', e.target.value)}/>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span className="tiny-label">채팅</span>
                              <input type="color" value={settings.colors[role].message} onChange={(e)=>handleColorChange(role, 'message', e.target.value)}/>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* Section: Font & Background */}
              <section ref={sectionRefs.font} className="settings-section" data-section="font">
                <div className="settings-card glass-premium">
                  <div className="card-header">
                    <h3>폰트 · 배경 설정</h3>
                    <p>채팅창의 가독성을 높이고 배경 이미지를 커스터마이징하세요.</p>
                  </div>

                  <div className="settings-row-pair">
                    <div className="row-label">기본 폰트</div>
                    <div className="flex-row-gap">
                      <select value={settings.fontFamily} onChange={(e) => setSettings({...settings, fontFamily: e.target.value})} className="styled-select" style={{ flex: 1 }}>
                        <option value="Pretendard">Pretendard (기본)</option>
                        <option value="NanumGothic">나눔고딕</option>
                        <option value="GmarketSans">G마켓 산스</option>
                        <option value="MapleStory">메이플스토리</option>
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
                    <div className="bg-upload-zone" style={{ width: '100%', height: '100px', border: '2px dashed var(--border-medium)', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#f8fafc' }}>
                      <ImageIcon size={24} className="text-muted" />
                      <span style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>이미지가 없습니다. (파일을 마우스로 끌어다 놓으세요)</span>
                    </div>
                    <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                      <input type="text" placeholder="외부 이미지 URL 입력" value={settings.bgImage} onChange={(e) => setSettings({...settings, bgImage: e.target.value})} className="styled-input" style={{ flex: 1 }} />
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


        {/* Sidebar remains sticky/fixed */}
        <aside className="chat-settings-preview-aside">
          {/* 실시간 채팅 미리보기 */}
          <OverlayPreviewWrapper title="채팅 미리보기" height={500}>
            <ChatOverlay
              previewMode={true}
              previewSettings={settings}
              previewMessages={previewMessages}
            />
          </OverlayPreviewWrapper>

          <div className="test-controls glass-premium">
            <div className="section-title-with-badge">
              <span className="badge-new">NEW</span>
              <h4>테스트</h4>
              <HelpCircle size={14} className="text-muted" />
            </div>
            
            <div className="test-form">
              <input 
                type="text" 
                className="styled-input" 
                placeholder="100" 
                value={testChat.amount}
                onChange={(e) => setTestChat({...testChat, amount: e.target.value})}
              />
              <input 
                type="text" 
                className="styled-input" 
                placeholder="채팅 입력" 
                value={testChat.message}
                onChange={(e) => setTestChat({...testChat, message: e.target.value})}
              />
              <input 
                type="text" 
                className="styled-input" 
                placeholder="아이디" 
                value={testChat.userId}
                onChange={(e) => setTestChat({...testChat, userId: e.target.value})}
              />
              <input 
                type="text" 
                className="styled-input" 
                placeholder="닉네임" 
                value={testChat.nickname}
                onChange={(e) => setTestChat({...testChat, nickname: e.target.value})}
              />
              <div className="styled-select-wrapper">
                <div className="platform-icon-mini">
                  {testChat.platform === 'SOOP' ? <div className="icon-soop-mini"></div> : <div className="icon-chzzk-mini"></div>}
                </div>
                <select 
                  className="styled-select"
                  value={testChat.platform}
                  onChange={(e) => setTestChat({...testChat, platform: e.target.value})}
                >
                  <option value="SOOP">SOOP</option>
                  <option value="CHZZK">CHZZK</option>
                </select>
                <ChevronDown className="select-arrow" size={14} />
              </div>
              <div className="styled-select-wrapper">
                <select 
                  className="styled-select"
                  value={testChat.type}
                  onChange={(e) => setTestChat({...testChat, type: e.target.value})}
                >
                  <option value="별풍선">별풍선</option>
                  <option value="치즈">치즈</option>
                  <option value="후원">후원</option>
                </select>
                <ChevronDown className="select-arrow" size={14} />
              </div>
            </div>
            
            <button className="btn-test-primary" onClick={handleTest}>
              <ExternalLink size={16} /> 테스트
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

export default ChatSettings;
