import React, { useState, useEffect, useRef } from 'react';
import { 
  Copy, RefreshCw, Save, Monitor, Settings, Eye, 
  Trash2, MessageSquare, Bell, Palette, Type, 
  Layout, Shield, BellRing, Info, ExternalLink,
  ChevronDown, Maximize2, RotateCcw, HelpCircle,
  Clock, Megaphone, Pin, Volume2
} from 'lucide-react';
import './ChatSettings.css';

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
  // Filtering
  userFilter: '',
  donationFilter: true,
  botFilter: true,
  wordFilter: '',
  donationMessageFilter: true,
  // Notifications
  donationNotify: 'image', // none, text, image
  entryNotify: 'none', // none, text, alert, voice
  chatNotify: 'none', // none, alert, voice
  // Widgets
  viewerCount: { enabled: false, position: 'bottom', url: 'https://weflab.com/page/hN_G2suZmGBvaQ?mode=view' },
  notice: { enabled: false, position: 'top', theme: 'default', url: 'https://weflab.com/page/hN_G2suZmGBvaQ?mode=notice' },
  timer: { enabled: false, position: 'bottom', theme: 'default', url: 'https://weflab.com/page/hN_G2suZmGBvaQ?mode=timer', base: 'none' },
  // Chat Pin
  pinId: '',
  pinVoice: false,
  pinAutoHide: false,
  // Colors
  colors: {
    streamer: { nick: '#ffffff', message: '#ffffff' },
    manager: { nick: '#ffffff', message: '#ffffff' },
    vip: { nick: '#ffffff', message: '#ffffff' },
    fan: { nick: '#ffffff', message: '#ffffff' },
    subscriber: { nick: '#ffffff', message: '#ffffff' },
    supporter: { nick: '#ffffff', message: '#ffffff' },
    regular: { nick: '#ffffff', message: '#ffffff' },
    donationMsg: '#ffe000',
    entryMsg: '#ffe000'
  }
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
  const [settings, setSettings] = useState(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [testChat, setTestChat] = useState({ id: '100', name: '닉네임', message: '채팅 입력' });
  const [activeNav, setActiveNav] = useState('theme');

  // Refs for scrolling
  const sectionRefs = {
    theme: useRef(null),
    detail: useRef(null),
    filtering: useRef(null),
    notif: useRef(null),
    widget: useRef(null),
    color: useRef(null),
    font: useRef(null)
  };

  const scrollToSection = (id) => {
    sectionRefs[id].current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveNav(id);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/settings/chat');
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
      await fetch('http://localhost:3001/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'chat', value: settings })
      });
      alert('설정이 저장되었습니다.');
    } finally { setSaving(false); }
  };

  const copyUrl = (url) => {
    navigator.clipboard.writeText(url);
    alert('URL이 복사되었습니다.');
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

  return (
    <div className="settings-panel animate-fade">
      <div className="settings-card glass-premium">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3>기본프리셋</h3>
            <span className="badge-new">기본프리셋</span>
          </div>
          <p>방송 프로그램의 브라우저 소스에 아래 주소를 입력하세요.</p>
        </div>
        <div className="url-copy-box">
          <div className="url-display">
            <Monitor size={14} />
            <span>https://weflab.com/page/hN_G2suZmGBvaQ</span>
          </div>
          <button className="copy-btn" onClick={() => copyUrl('https://weflab.com/page/hN_G2suZmGBvaQ')}><Copy size={16} /> URL 복사</button>
          <button className="refresh-btn" onClick={() => window.open('/overlay/chat', '_blank')}><ExternalLink size={16} /> 열기</button>
          <button className="refresh-btn" onClick={fetchSettings}><RefreshCw size={16} /> 새로고침</button>
          <button className="refresh-btn reset" onClick={resetSettings}><Trash2 size={16} /> 채팅창 초기화</button>
        </div>
        <div className="info-banner">
          <Info size={18} />
          <span>생방송 시작 직후 1분이 지나도 채팅창이 연결되지 않을 경우 연결 주의사항 및 채팅 재연결을 눌러주세요.</span>
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
            <section ref={sectionRefs.theme} className="settings-section">
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
            <section ref={sectionRefs.detail} className="settings-section">
              <div className="settings-card glass-premium">
                <div className="card-header"><h3>상세 설정</h3></div>
                <div className="settings-row-pair">
                  <div className="row-label">채팅 정렬</div>
                  <div className="checkbox-group no-bg wrap-row">
                    <label><input type="radio" name="sortType" checked={settings.sortType === 'one-line'} onChange={() => setSettings({...settings, sortType: 'one-line'})}/> 한줄</label>
                    <div className="with-divider" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="tiny-label">닉네임 구분 선 :</span>
                      <input type="text" value={settings.nicknameDivider} onChange={(e)=>setSettings({...settings, nicknameDivider:e.target.value})} className="tiny-input" style={{ width: '40px' }}/>
                    </div>
                    <label><input type="radio" name="sortType" checked={settings.sortType === 'multi-line'} onChange={() => setSettings({...settings, sortType: 'multi-line'})}/> 줄바꿈</label>
                    <label><input type="radio" name="sortType" checked={settings.sortType === 'start-align'} onChange={() => setSettings({...settings, sortType: 'start-align'})}/> 시작라인 정렬</label>
                    <label><input type="radio" name="sortType" checked={settings.sortType === 'indiv-align'} onChange={() => setSettings({...settings, sortType: 'indiv-align'})}/> 개별라인 정렬</label>
                  </div>
                </div>
                <div className="settings-row-pair">
                  <div className="row-label">채팅 표시 방향</div>
                  <div className="radio-group-refined">
                    <label><input type="radio" name="direction" checked={settings.direction === 'left'} onChange={() => setSettings({...settings, direction: 'left'})}/> 왼쪽</label>
                    <label><input type="radio" name="direction" checked={settings.direction === 'center'} onChange={() => setSettings({...settings, direction: 'center'})}/> 가운데</label>
                    <label><input type="radio" name="direction" checked={settings.direction === 'right'} onChange={() => setSettings({...settings, direction: 'right'})}/> 오른쪽</label>
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
                   <label><input type="checkbox" checked={settings.showIcons} onChange={(e) => setSettings({...settings, showIcons: e.target.checked})}/> 방송 플랫폼 아이콘 표시 <HelpCircle size={12} className="text-muted"/></label>
                   <label><input type="checkbox" checked={settings.useScroll} onChange={(e) => setSettings({...settings, useScroll: e.target.checked})}/> 스크롤 사용 <HelpCircle size={12} className="text-muted"/></label>
                   <label><input type="checkbox" checked={settings.showNickname} onChange={(e) => setSettings({...settings, showNickname: e.target.checked})}/> 시청자 닉네임 표시</label>
                   <label><input type="checkbox" checked={settings.showUserId} onChange={(e) => setSettings({...settings, showUserId: e.target.checked})}/> 시청자 아이디 표시</label>
                   <label><input type="checkbox" checked={settings.randomNicknameColor} onChange={(e) => setSettings({...settings, randomNicknameColor: e.target.checked})}/> 닉네임 랜덤색 사용</label>
                   <label>
                     <input type="checkbox" checked={settings.setNicknameColor} onChange={(e) => setSettings({...settings, setNicknameColor: e.target.checked})}/> 
                     닉네임 설정색 사용 <MessageSquare size={14} style={{ color: '#9146ff', marginLeft: '4px' }}/> <HelpCircle size={12} className="text-muted"/>
                   </label>
                   <label><input type="checkbox" checked={settings.topFadeout} onChange={(e) => setSettings({...settings, topFadeout: e.target.checked})}/> 채팅 상단 페이드아웃</label>
                   <label><input type="checkbox" checked={settings.autoHide} onChange={(e) => setSettings({...settings, autoHide: e.target.checked})}/> 채팅 자동 숨김 <HelpCircle size={12} className="text-muted"/></label>
                </div>
              </div>
            </section>

            {/* Section: Filtering */}
            <section ref={sectionRefs.filtering} className="settings-section">
              <div className="settings-card glass-premium">
                <div className="card-header"><h3>필터링 설정</h3></div>
                <div className="settings-row-pair">
                  <div className="row-label">사용자 필터링 <HelpCircle size={14} className="text-muted"/></div>
                  <div className="full-width-input" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <input type="text" value={settings.userFilter} onChange={(e) => setSettings({...settings, userFilter: e.target.value})} placeholder="닉네임 또는 아이디 입력" className="styled-input" style={{ flex: 1, minWidth: '200px' }}/>
                    <div className="checkbox-group no-bg" style={{ display: 'flex', gap: '16px' }}>
                      <label><input type="checkbox" /> 후원알림 필터링 <HelpCircle size={12} className="text-muted"/></label>
                      <label><input type="checkbox" checked={settings.botFilter} onChange={(e)=>setSettings({...settings, botFilter:e.target.checked})}/> 봇 필터링 <HelpCircle size={12} className="text-muted"/></label>
                    </div>
                  </div>
                </div>
                <div className="settings-row-pair">
                  <div className="row-label">
                    <span className="badge-orange">NEW</span> 단어 필터링 <HelpCircle size={14} className="text-muted"/>
                  </div>
                  <div className="full-width-input">
                     <textarea value={settings.wordFilter} onChange={(e) => setSettings({...settings, wordFilter: e.target.value})} placeholder="필터링 할 단어 입력" className="styled-input" style={{ height: '80px', width: '100%' }}/>
                     <div style={{ marginTop: '12px' }}>
                        <label><input type="checkbox" checked={settings.donationMessageFilter} onChange={(e)=>setSettings({...settings, donationMessageFilter:e.target.checked})}/> 후원알림 메시지 필터링 <HelpCircle size={12} className="text-muted"/></label>
                     </div>
                  </div>
                </div>
                <div className="info-box-blue">
                   <p><Info size={14} style={{ color: '#3b82f6' }}/> 필터링은 모든 채팅창, 후원알림 프리셋에 공통으로 적용됩니다.</p>
                   <p><Info size={14} style={{ color: '#3b82f6' }}/> 필터링된 단어는 ♡ 로 표시됩니다.</p>
                   <p className="text-red"><Info size={14}/> 필터링 설정은 사용중인 후원알림, 채팅창 URL을 새로고침하셔야 적용됩니다.</p>
                </div>
              </div>
            </section>

            {/* Section: Notifications */}
            <section ref={sectionRefs.notif} className="settings-section">
               <div className="settings-card glass-premium">
                  <div className="card-header"><h3>채팅 알림</h3></div>
                  <div className="settings-row-pair border-bottom">
                    <div className="row-label">후원 알림 <HelpCircle size={14} className="text-muted"/></div>
                    <div className="radio-group-refined">
                       <label><input type="radio" name="donNotif" checked={settings.donationNotify==='none'} onChange={()=>setSettings({...settings, donationNotify:'none'})}/> 사용 안함</label>
                       <label><input type="radio" name="donNotif" checked={settings.donationNotify==='text'} onChange={()=>setSettings({...settings, donationNotify:'text'})}/> 텍스트</label>
                       <label><input type="radio" name="donNotif" checked={settings.donationNotify==='image'} onChange={()=>setSettings({...settings, donationNotify:'image'})}/> 이미지</label>
                    </div>
                  </div>
                  <div className="settings-row-pair border-bottom">
                    <div className="row-label">
                      입장 알림 <span style={{ fontFamily: 'sans-serif', fontWeight: 'bold' }}>∞</span> <HelpCircle size={14} className="text-muted"/>
                    </div>
                    <div className="radio-group-refined">
                       <label><input type="radio" name="entryNotif" checked={settings.entryNotify==='none'} onChange={()=>setSettings({...settings, entryNotify:'none'})}/> 사용 안함</label>
                       <label><input type="radio" name="entryNotif" checked={settings.entryNotify==='text'} onChange={()=>setSettings({...settings, entryNotify:'text'})}/> 텍스트</label>
                       <label><input type="radio" name="entryNotif" checked={settings.entryNotify==='alert'} onChange={()=>setSettings({...settings, entryNotify:'alert'})}/> 알림음</label>
                       <label><input type="radio" name="entryNotif" checked={settings.entryNotify==='voice'} onChange={()=>setSettings({...settings, entryNotify:'voice'})}/> 음성</label>
                    </div>
                  </div>
                  <div className="settings-row-pair">
                    <div className="row-label">채팅 알림 <HelpCircle size={14} className="text-muted"/></div>
                    <div className="radio-group-refined">
                       <label><input type="radio" name="chatNotif" checked={settings.chatNotify==='none'} onChange={()=>setSettings({...settings, chatNotify:'none'})}/> 사용 안함</label>
                       <label><input type="radio" name="chatNotif" checked={settings.chatNotify==='alert'} onChange={()=>setSettings({...settings, chatNotify:'alert'})}/> 알림음</label>
                       <label><input type="radio" name="chatNotif" checked={settings.chatNotify==='voice'} onChange={()=>setSettings({...settings, chatNotify:'voice'})}/> 음성</label>
                    </div>
                  </div>
               </div>
            </section>

            {/* Section: Widget */}
            <section ref={sectionRefs.widget} className="settings-section">
               <div className="settings-card glass-premium">
                  <div className="card-header"><h3>채팅 위젯</h3></div>
                  
                  {/* Viewer Count */}
                  <div className="widget-item-refined">
                    <div className="widget-header-row">
                      <div className="widget-title">총 시청자수</div>
                      <div className="url-copy-bar-mini">
                        <span className="bar-label">전용 URL <HelpCircle size={12} className="text-muted"/></span>
                        <div className="url-box-wrap">
                          <input type="text" readOnly value={settings.viewerCount.url} />
                          <button onClick={()=>copyUrl(settings.viewerCount.url)}><Copy size={12}/> URL 복사</button>
                        </div>
                      </div>
                    </div>
                    <div className="widget-options-grid">
                       <div className={`widget-preview-card ${!settings.viewerCount.enabled ? 'active' : ''}`} onClick={()=>setSettings({...settings, viewerCount:{...settings.viewerCount, enabled:false}})}>
                          <div className="preview-thumb" style={{ background: '#e2e8f0' }}>시 사용 안함</div>
                          <div className="preview-label">사용 안함</div>
                       </div>
                       <div className={`widget-preview-card ${settings.viewerCount.enabled && settings.viewerCount.position==='bottom' ? 'active' : ''}`} onClick={()=>setSettings({...settings, viewerCount:{enabled:true, position:'bottom', url:settings.viewerCount.url}})}>
                          <div className="preview-thumb" style={{ background: 'linear-gradient(to top, #dbeafe 30%, #f8fafc 30%)' }}>아래 표시</div>
                          <div className="preview-label">아래 표시</div>
                       </div>
                       <div className={`widget-preview-card ${settings.viewerCount.enabled && settings.viewerCount.position==='top' ? 'active' : ''}`} onClick={()=>setSettings({...settings, viewerCount:{enabled:true, position:'top', url:settings.viewerCount.url}})}>
                          <div className="preview-thumb" style={{ background: 'linear-gradient(to bottom, #dbeafe 30%, #f8fafc 30%)' }}>위 표시</div>
                          <div className="preview-label">위 표시</div>
                       </div>
                    </div>
                  </div>

                  <div className="divider-line" />

                  {/* Notice */}
                  <div className="widget-item-refined">
                    <div className="widget-header-row">
                      <div className="widget-title">공지</div>
                      <div className="url-copy-bar-mini">
                        <span className="bar-label">전용 URL <HelpCircle size={12} className="text-muted"/></span>
                        <div className="url-box-wrap">
                          <input type="text" readOnly value={settings.notice.url} />
                          <button onClick={()=>copyUrl(settings.notice.url)}><Copy size={12}/> URL 복사</button>
                        </div>
                      </div>
                    </div>
                    <div className="theme-scroll-grid">
                       {widgetThemes.map(t => (
                         <div key={t} className={`theme-item-box ${settings.notice.theme === t ? 'active' : ''}`} onClick={()=>setSettings({...settings, notice:{...settings.notice, theme:t}})}>
                            <div className="theme-visual" style={{ background: t.includes('핑크') ? '#ff7ec1' : '#334155' }}>
                              <span>공지 내용</span>
                            </div>
                            <div className="theme-name-tag">{t}</div>
                         </div>
                       ))}
                    </div>
                    <div className="settings-row-pair" style={{ marginTop: '20px' }}>
                      <div className="row-label">공지</div>
                      <div className="radio-group-refined">
                        <label><input type="radio" name="noticePos" /> 사용 안함</label>
                        <label><input type="radio" name="noticePos" checked /> 위 표시</label>
                        <label><input type="radio" name="noticePos" /> 아래 표시</label>
                      </div>
                    </div>
                    <div className="command-guide-box">
                       <h4><Megaphone size={16} style={{ color: '#3b82f6' }}/> 공지 명령어 사용법</h4>
                       <p className="guide-intro">스트리머, 매니저 등 관리자 이상의 사용자가 채팅창에 아래 명령어를 입력하여 사용</p>
                       <div className="command-list-grid">
                          <div className="cmd-item">
                             <div className="cmd-name">!공지/테마/테마이름</div>
                             <div className="cmd-desc">공지 테마 변경</div>
                          </div>
                          <div className="cmd-item">
                             <div className="cmd-name">!공지/내용, !공지 내용, #공지 내용</div>
                             <div className="cmd-desc">채팅창에 공지내용 표시</div>
                          </div>
                          <div className="cmd-item">
                             <div className="cmd-name">!공지삭제, #공지삭제, !공지끝</div>
                             <div className="cmd-desc">채팅창의 공지내용 삭제</div>
                          </div>
                          <div className="cmd-item">
                             <div className="cmd-name">!공지/계산/내용/값/최소값</div>
                             <div className="cmd-desc">용돈, 킬내기 등 자동계산 표시</div>
                          </div>
                       </div>
                    </div>
                  </div>
               </div>
            </section>

            {/* Section: Timer */}
            <section ref={sectionRefs.timer || {current:null}} id="timer-section" className="settings-section">
               <div className="settings-card glass-premium">
                  <div className="card-header"><h3>타이머</h3></div>
                  <div className="url-copy-bar-mini" style={{ marginBottom: '20px' }}>
                    <span className="bar-label">전용 URL <HelpCircle size={12} className="text-muted"/></span>
                    <div className="url-box-wrap">
                      <input type="text" readOnly value={settings.timer.url} />
                      <button onClick={()=>copyUrl(settings.timer.url)}><Copy size={12}/> URL 복사</button>
                    </div>
                  </div>
                  <div className="theme-scroll-grid">
                      {timerThemes.map(t => (
                         <div key={t} className={`theme-item-box ${settings.timer.theme === t ? 'active' : ''}`} onClick={()=>setSettings({...settings, timer:{...settings.timer, theme:t}})}>
                            <div className="theme-visual" style={{ background: t === '디지털' ? '#000' : '#334155', color: t === '디지털' ? '#0f0' : 'white' }}>
                              {t === '디지털' ? '00:00:00' : '타이머'}
                            </div>
                            <div className="theme-name-tag">{t}</div>
                         </div>
                       ))}
                  </div>
                  <div className="settings-row-pair" style={{ marginTop: '20px' }}>
                    <div className="row-label">타이머</div>
                    <div className="radio-group-refined">
                      <label><input type="radio" name="timerPos" /> 사용 안함</label>
                      <label><input type="radio" name="timerPos" checked /> 위 표시</label>
                      <label><input type="radio" name="timerPos" /> 아래 표시</label>
                    </div>
                  </div>
                  <div className="settings-row-pair">
                    <div className="row-label">기본 시간</div>
                    <div className="radio-group-refined">
                       <label><input type="radio" name="timerMode" /> 표시 안함</label>
                       <label><input type="radio" name="timerMode" checked /> 현재 시간</label>
                       <label><input type="radio" name="timerMode" /> 방송 시간(업타임)</label>
                    </div>
                  </div>
                  <div className="command-guide-box">
                       <h4><Clock size={16} style={{ color: '#3b82f6' }}/> 타이머 명령어 사용법</h4>
                       <div className="command-list-grid">
                          <div className="cmd-item">
                             <div className="cmd-name">!시간/1분, !시간 1시간, !시간 60</div>
                             <div className="cmd-desc">카운트다운 표시</div>
                          </div>
                          <div className="cmd-item">
                             <div className="cmd-name">!시간/0, !시간 0</div>
                             <div className="cmd-desc">0초부터 카운트업 표시</div>
                          </div>
                          <div className="cmd-item">
                             <div className="cmd-name">!시간정지 / !시간시작</div>
                             <div className="cmd-desc">타이머 일시정지 및 재생</div>
                          </div>
                          <div className="cmd-item">
                             <div className="cmd-name">!시간/추가/+1분</div>
                             <div className="cmd-desc">시간 추가 또는 빼기</div>
                          </div>
                       </div>
                  </div>
               </div>
            </section>

             {/* Section: Chat Pin */}
             <section id="pin-section" className="settings-section">
                <div className="settings-card glass-premium">
                   <div className="card-header"><h3>채팅 고정</h3></div>
                   <div className="settings-row-pair">
                      <div className="row-label">닉네임 또는 아이디 입력</div>
                      <input type="text" className="styled-input" style={{ flex: 1 }} placeholder="고정할 유저 입력"/>
                   </div>
                   <div className="checkbox-grid-refined" style={{ marginBottom: '24px' }}>
                      <label><input type="checkbox" /> 음성 고정 <HelpCircle size={12} className="text-muted"/></label>
                      <label><input type="checkbox" /> 고정 자동 숨김 <HelpCircle size={12} className="text-muted"/></label>
                   </div>
                   <div className="command-guide-box">
                        <h4><Pin size={16} style={{ color: '#3b82f6' }}/> 채팅 고정 명령어 사용법</h4>
                        <div className="command-list-grid">
                           <div className="cmd-item">
                              <div className="cmd-name">!고정 닉네임 / !고정/아이디</div>
                              <div className="cmd-desc">채팅창 상단에 채팅 고정 표시</div>
                           </div>
                           <div className="cmd-item">
                              <div className="cmd-name">!음성고정 닉네임</div>
                              <div className="cmd-desc">채팅 고정과 함께 음성으로 알림</div>
                           </div>
                           <div className="cmd-item">
                              <div className="cmd-name">!고정해제 닉네임</div>
                              <div className="cmd-desc">고정된 시청자 개별 삭제</div>
                           </div>
                        </div>
                   </div>
                </div>
             </section>

             {/* Section: Color & Font */}
             <section ref={sectionRefs.color} className="settings-section">
                <div className="settings-card glass-premium">
                  <div className="card-header"><h3>채팅 아이콘 / 색상</h3></div>
                  <div className="settings-row-pair border-bottom">
                     <div className="row-label">SOOP 아이콘</div>
                     <div className="checkbox-group no-bg wrap-row">
                        <span className="badge-new" style={{ background: '#eee', color: '#666' }}>스트리머</span>
                        <span className="badge-new" style={{ background: '#eee', color: '#666' }}>매니저</span>
                        <span className="badge-new" style={{ background: '#eee', color: '#666' }}>팬클럽</span>
                        <span className="badge-new" style={{ background: '#eee', color: '#666' }}>구독</span>
                     </div>
                  </div>
                  <div style={{ marginTop: '24px' }}>
                    <div className="color-bulk-action" style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
                       <button className="btn-outline-small">흰색 닉네임</button>
                       <button className="btn-outline-small">검정 닉네임</button>
                       <button className="btn-outline-small">흰색 채팅</button>
                       <button className="btn-outline-small">검정 채팅</button>
                    </div>
                    <div className="color-settings-list-detailed">
                        {Object.keys(settings.colors).filter(k => typeof settings.colors[k] === 'object').map(role => (
                          <div key={role} className="color-row-detailed">
                            <span className="role-label" style={{ minWidth: '100px' }}>{role.toUpperCase()}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className="tiny-label">닉네임</span>
                              <input type="color" value={settings.colors[role].nick} onChange={(e)=>handleColorChange(role, 'nick', e.target.value)}/>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className="tiny-label">채팅</span>
                              <input type="color" value={settings.colors[role].message} onChange={(e)=>handleColorChange(role, 'message', e.target.value)}/>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
             </section>
          </div>
        </div>


        {/* Sidebar remains sticky/fixed */}
        <aside className="chat-settings-preview-aside">
          <div className="preview-box">
            <div className="preview-header">
              <span>채팅 미리보기</span>
              <Maximize2 size={14} className="cursor-pointer" />
            </div>
            <div className="preview-content" style={{ 
              alignItems: settings.direction === 'center' ? 'center' : settings.direction === 'right' ? 'flex-end' : 'flex-start',
              fontFamily: settings.fontFamily,
              backgroundColor: settings.useBgColor ? settings.bgColor : undefined,
              backgroundImage: settings.useBgColor ? 'none' : undefined
            }}>
              <div className="chat-msg-mock streamer" style={{ 
                fontSize: `${settings.fontSize}px`,
                fontWeight: settings.fontBold ? 'bold' : 'normal',
                color: settings.colors.streamer.message
              }}>
                <span className="sender" style={{ color: settings.colors.streamer.nick }}>[스트리머]{settings.nicknameDivider}</span>
                안녕하세요! 라이브 시작했습니다.
              </div>
              <div className="chat-msg-mock manager" style={{ 
                fontSize: `${settings.fontSize}px`,
                fontWeight: settings.fontBold ? 'bold' : 'normal',
                color: settings.colors.manager.message
              }}>
                <span className="sender" style={{ color: settings.colors.manager.nick }}>[매니저]{settings.nicknameDivider}</span>
                매니저 인사드립니다.
              </div>
              <div className="chat-msg-mock fan" style={{ 
                fontSize: `${settings.fontSize}px`,
                fontWeight: settings.fontBold ? 'bold' : 'normal',
                color: settings.colors.fan.message
              }}>
                <span className="sender" style={{ color: settings.colors.fan.nick }}>[팬클럽]{settings.nicknameDivider}</span>
                오늘 방송도 화이팅!
              </div>
            </div>
          </div>

          <div className="test-controls">
            <h4>테스트 채팅</h4>
            <div className="test-form">
              <input type="text" placeholder="100" />
              <input type="text" placeholder="채팅 입력" />
              <input type="text" placeholder="아이디" />
              <input type="text" placeholder="닉네임" />
              <select className="styled-select"><option>SOOP</option></select>
              <select className="styled-select"><option>별풍선</option></select>
            </div>
            <div className="save-controls">
              <button className="btn-test">테스트</button>
            </div>
          </div>

          <div className="save-controls vertical">
            <button className="btn-primary large-action" onClick={saveSettings} disabled={saving}>
              {saving ? <RefreshCw className="spin" size={18}/> : <Save size={18}/>}
              설정 저장
            </button>
            <button className="btn-reset-large" onClick={resetSettings}><RotateCcw size={16}/> 설정 초기화</button>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default ChatSettings;
