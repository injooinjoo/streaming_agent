import React, { useState, useEffect } from 'react';
import { Copy, RefreshCw, Save } from 'lucide-react';

const defaultSettings = {
  theme: 'default',
  alignment: 'left',
  lineMode: 'wrap',
  lineStyle: 'individual',
  animation: 'fadeInUp',
  fontSize: 24,
  transparency: 100,
  showIcons: true,
  showNickname: true,
  showUserId: false,
  useScroll: true,
  randomColor: false,
  showPreview: true,
  showTooltip: false,
  nicknameDivider: false,
  customCss: '',
  fontFamily: 'GmarketSans',
  filterUsers: '',
  filterWords: '',
  filterBots: true,
  filterDonations: false,
  maskCharacter: '♡',
  entryNotify: false,
  chatNotify: false,
  notifyText: '님이 입장했습니다.',
  notifySound: false,
  notifyVoice: false,
  viewerCountEnabled: true,
  viewerCountPosition: 'top',
  noticeEnabled: true,
  noticeTheme: 'default',
  timerEnabled: true,
  timerMode: 'time',
  pinEnabled: false,
  pinTts: false
};

const themeOptions = [
  { value: 'default', label: '기본' },
  { value: 'tanmak', label: '탄막 (좌우 이동)' },
  { value: 'cat', label: '고양이' },
  { value: 'newyear', label: '설날' },
  { value: 'lol', label: '롤' },
  { value: 'star', label: '스타' },
  { value: 'pubg', label: '배그' },
  { value: 'heart', label: '하트' },
  { value: 'winter', label: '겨울' },
  { value: 'retro', label: '레트로' },
  { value: 'rainbow', label: '무지개' },
  { value: 'crayon', label: '크레용' },
  { value: 'gold', label: '골드' },
  { value: 'dotted', label: '점선' },
  { value: 'windows', label: '윈도우' },
  { value: 'kakao', label: '카카오톡' },
  { value: 'round', label: '라운드' },
  { value: 'balloon', label: '풍선' },
  { value: 'chalk', label: '칠판' },
  { value: 'neon', label: '네온' },
  { value: 'box', label: '박스' },
  { value: 'leather', label: '가죽' },
  { value: 'postit', label: '포스트잇' },
  { value: 'food', label: '음식' },
  { value: 'overwatch', label: '오버워치' }
];

const animationOptions = [
  { value: 'slideInRight', label: 'Slide' },
  { value: 'fadeInUp', label: 'Fade' },
  { value: 'bounceIn', label: 'Bounce' },
  { value: 'flipInX', label: 'Flip' },
  { value: 'rotateIn', label: 'Rotate' },
  { value: 'zoomIn', label: 'Zoom' },
  { value: 'tada', label: 'Tada' },
  { value: 'wobble', label: 'Wobble' }
];

const fontOptions = [
  { value: 'GmarketSans', label: 'G마켓 산스' },
  { value: 'NanumGothic', label: '나눔고딕' },
  { value: 'CookieRun', label: '쿠키런' },
  { value: 'BaeMin', label: '배달의민족' },
  { value: 'NotoSans', label: 'Noto Sans KR' }
];

const ChatSettings = () => {
  const [settings, setSettings] = useState(defaultSettings);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/settings/chat');
      const data = await res.json();
      if (data.value && data.value !== '{}') {
        setSettings({ ...defaultSettings, ...JSON.parse(data.value) });
      }
    } catch (error) {
      console.error('Failed to fetch chat settings', error);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    try {
      await fetch('http://localhost:3001/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'chat', value: settings })
      });
      alert('설정이 저장되었습니다.');
    } finally {
      setSaving(false);
    }
  };

  const copyUrl = () => {
    const url = `${window.location.origin}/overlay/chat`;
    navigator.clipboard.writeText(url);
    alert('오버레이 URL이 복사되었습니다.');
  };

  return (
    <div className="settings-panel animate-fade">
      <div className="settings-card glass-premium">
        <div className="card-header">
          <h3>오버레이 주소</h3>
          <p>방송 프로그램(OBS, XSplit)의 브라우저 소스에 아래 주소를 입력하세요.</p>
        </div>
        <div className="url-copy-box">
          <input type="text" readOnly value={`${window.location.origin}/overlay/chat`} />
          <button className="copy-btn" onClick={copyUrl}><Copy size={16} /> 복사</button>
          <button className="refresh-btn" onClick={fetchSettings}><RefreshCw size={16} /></button>
        </div>
      </div>

      <div className="settings-grid">
        <div className="settings-card glass-premium">
          <div className="card-header">
            <h3>기본 설정</h3>
            <p>테마, 정렬, 폰트 등 기본 스타일을 설정합니다.</p>
          </div>
          <div className="form-group-list">
            <div className="form-group">
              <label>기본 테마</label>
              <select value={settings.theme} onChange={(e) => setSettings({ ...settings, theme: e.target.value })}>
                {themeOptions.map((theme) => (
                  <option key={theme.value} value={theme.value}>{theme.label}</option>
                ))}
              </select>
            </div>
            <div className="input-row">
              <div className="form-group">
                <label>정렬 방식</label>
                <select value={settings.alignment} onChange={(e) => setSettings({ ...settings, alignment: e.target.value })}>
                  <option value="left">왼쪽 정렬</option>
                  <option value="center">가운데 정렬</option>
                  <option value="right">오른쪽 정렬</option>
                </select>
              </div>
              <div className="form-group">
                <label>표시 방식</label>
                <select value={settings.lineMode} onChange={(e) => setSettings({ ...settings, lineMode: e.target.value })}>
                  <option value="single">한줄 표시</option>
                  <option value="wrap">줄바꿈</option>
                </select>
              </div>
            </div>
            <div className="input-row">
              <div className="form-group">
                <label>폰트 크기 (px)</label>
                <input type="number" value={settings.fontSize} onChange={(e) => setSettings({ ...settings, fontSize: parseInt(e.target.value, 10) })} />
              </div>
              <div className="form-group">
                <label>폰트</label>
                <select value={settings.fontFamily} onChange={(e) => setSettings({ ...settings, fontFamily: e.target.value })}>
                  {fontOptions.map((font) => (
                    <option key={font.value} value={font.value}>{font.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>라인 표시 방식</label>
              <select value={settings.lineStyle} onChange={(e) => setSettings({ ...settings, lineStyle: e.target.value })}>
                <option value="start">시작라인 기준</option>
                <option value="individual">개별라인</option>
              </select>
            </div>
            <div className="form-group checkbox-group">
              <label>
                <input type="checkbox" checked={settings.nicknameDivider} onChange={(e) => setSettings({ ...settings, nicknameDivider: e.target.checked })} />
                닉네임 구분선 표시
              </label>
            </div>
          </div>
        </div>

        <div className="settings-card glass-premium">
          <div className="card-header">
            <h3>표시 및 효과</h3>
            <p>애니메이션과 투명도, 미리보기 옵션을 조정합니다.</p>
          </div>
          <div className="form-group-list">
            <div className="form-group">
              <label>등장 효과</label>
              <select value={settings.animation} onChange={(e) => setSettings({ ...settings, animation: e.target.value })}>
                {animationOptions.map((anim) => (
                  <option key={anim.value} value={anim.value}>{anim.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>배경 투명도 ({settings.transparency}%)</label>
              <input type="range" min="0" max="100" value={settings.transparency} onChange={(e) => setSettings({ ...settings, transparency: parseInt(e.target.value, 10) })} />
            </div>
            <div className="form-group checkbox-group">
              <label>
                <input type="checkbox" checked={settings.showTooltip} onChange={(e) => setSettings({ ...settings, showTooltip: e.target.checked })} />
                툴팁 사용
              </label>
              <label>
                <input type="checkbox" checked={settings.showPreview} onChange={(e) => setSettings({ ...settings, showPreview: e.target.checked })} />
                미리보기 사용
              </label>
            </div>
            <div className="form-group">
              <label>커스텀 CSS</label>
              <textarea value={settings.customCss} onChange={(e) => setSettings({ ...settings, customCss: e.target.value })} placeholder=".chat-message { ... }" />
            </div>
          </div>
        </div>
      </div>

      <div className="settings-grid">
        <div className="settings-card glass-premium">
          <div className="card-header">
            <h3>표시 항목</h3>
            <p>채팅창에 표시할 정보를 선택합니다.</p>
          </div>
          <div className="form-group-list">
            <div className="form-group checkbox-group">
              <label>
                <input type="checkbox" checked={settings.showIcons} onChange={(e) => setSettings({ ...settings, showIcons: e.target.checked })} />
                플랫폼 아이콘 표시
              </label>
              <label>
                <input type="checkbox" checked={settings.showNickname} onChange={(e) => setSettings({ ...settings, showNickname: e.target.checked })} />
                닉네임 표시
              </label>
              <label>
                <input type="checkbox" checked={settings.showUserId} onChange={(e) => setSettings({ ...settings, showUserId: e.target.checked })} />
                ID 표시
              </label>
              <label>
                <input type="checkbox" checked={settings.randomColor} onChange={(e) => setSettings({ ...settings, randomColor: e.target.checked })} />
                랜덤 색상 사용
              </label>
              <label>
                <input type="checkbox" checked={settings.useScroll} onChange={(e) => setSettings({ ...settings, useScroll: e.target.checked })} />
                스크롤 사용
              </label>
            </div>
          </div>
        </div>

        <div className="settings-card glass-premium">
          <div className="card-header">
            <h3>필터링</h3>
            <p>표시 제외 대상을 지정합니다.</p>
          </div>
          <div className="form-group-list">
            <div className="form-group">
              <label>사용자 필터 (쉼표로 구분)</label>
              <input type="text" value={settings.filterUsers} onChange={(e) => setSettings({ ...settings, filterUsers: e.target.value })} placeholder="user1, user2" />
            </div>
            <div className="form-group">
              <label>단어 필터 (쉼표로 구분)</label>
              <input type="text" value={settings.filterWords} onChange={(e) => setSettings({ ...settings, filterWords: e.target.value })} placeholder="스포, 욕설" />
            </div>
            <div className="form-group">
              <label>필터 치환 문자</label>
              <input type="text" value={settings.maskCharacter} onChange={(e) => setSettings({ ...settings, maskCharacter: e.target.value })} maxLength={1} />
            </div>
            <div className="form-group checkbox-group">
              <label>
                <input type="checkbox" checked={settings.filterBots} onChange={(e) => setSettings({ ...settings, filterBots: e.target.checked })} />
                봇 메시지 숨김
              </label>
              <label>
                <input type="checkbox" checked={settings.filterDonations} onChange={(e) => setSettings({ ...settings, filterDonations: e.target.checked })} />
                후원 알림 메시지 숨김
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="settings-grid">
        <div className="settings-card glass-premium">
          <div className="card-header">
            <h3>알림</h3>
            <p>입장/채팅 알림 텍스트와 사운드를 설정합니다.</p>
          </div>
          <div className="form-group-list">
            <div className="form-group checkbox-group">
              <label>
                <input type="checkbox" checked={settings.entryNotify} onChange={(e) => setSettings({ ...settings, entryNotify: e.target.checked })} />
                입장 알림 표시
              </label>
              <label>
                <input type="checkbox" checked={settings.chatNotify} onChange={(e) => setSettings({ ...settings, chatNotify: e.target.checked })} />
                채팅 알림 표시
              </label>
              <label>
                <input type="checkbox" checked={settings.notifySound} onChange={(e) => setSettings({ ...settings, notifySound: e.target.checked })} />
                알림음 사용
              </label>
              <label>
                <input type="checkbox" checked={settings.notifyVoice} onChange={(e) => setSettings({ ...settings, notifyVoice: e.target.checked })} />
                음성 알림(TTS) 사용
              </label>
            </div>
            <div className="form-group">
              <label>알림 텍스트</label>
              <input type="text" value={settings.notifyText} onChange={(e) => setSettings({ ...settings, notifyText: e.target.value })} placeholder="{닉네임}님이 입장했습니다." />
            </div>
          </div>
        </div>

        <div className="settings-card glass-premium">
          <div className="card-header">
            <h3>내장 위젯</h3>
            <p>시청자수, 공지, 타이머, 채팅 고정 위젯 설정입니다.</p>
          </div>
          <div className="form-group-list">
            <div className="form-group checkbox-group">
              <label>
                <input type="checkbox" checked={settings.viewerCountEnabled} onChange={(e) => setSettings({ ...settings, viewerCountEnabled: e.target.checked })} />
                총 시청자수 표시
              </label>
              <label>
                <input type="checkbox" checked={settings.noticeEnabled} onChange={(e) => setSettings({ ...settings, noticeEnabled: e.target.checked })} />
                공지 위젯 사용
              </label>
              <label>
                <input type="checkbox" checked={settings.timerEnabled} onChange={(e) => setSettings({ ...settings, timerEnabled: e.target.checked })} />
                타이머 위젯 사용
              </label>
              <label>
                <input type="checkbox" checked={settings.pinEnabled} onChange={(e) => setSettings({ ...settings, pinEnabled: e.target.checked })} />
                채팅 고정 사용
              </label>
              <label>
                <input type="checkbox" checked={settings.pinTts} onChange={(e) => setSettings({ ...settings, pinTts: e.target.checked })} />
                고정 메시지 TTS 읽기
              </label>
            </div>
            <div className="input-row">
              <div className="form-group">
                <label>시청자수 위치</label>
                <select value={settings.viewerCountPosition} onChange={(e) => setSettings({ ...settings, viewerCountPosition: e.target.value })}>
                  <option value="top">상단</option>
                  <option value="bottom">하단</option>
                </select>
              </div>
              <div className="form-group">
                <label>공지 테마</label>
                <select value={settings.noticeTheme} onChange={(e) => setSettings({ ...settings, noticeTheme: e.target.value })}>
                  <option value="default">기본</option>
                  <option value="neon">네온</option>
                  <option value="box">박스</option>
                  <option value="postit">포스트잇</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>타이머 모드</label>
              <select value={settings.timerMode} onChange={(e) => setSettings({ ...settings, timerMode: e.target.value })}>
                <option value="time">현재 시간</option>
                <option value="uptime">업타임</option>
              </select>
            </div>
            <div className="form-group">
              <label>명령어</label>
              <div className="chip-list">
                <span className="chip">!공지</span>
                <span className="chip">!공지삭제</span>
                <span className="chip">!공지 시간</span>
                <span className="chip">!시간</span>
                <span className="chip">!시간 10분</span>
                <span className="chip">!시간/추가</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="action-bar">
        <button className="save-btn" onClick={saveSettings} disabled={saving}>
          {saving ? <RefreshCw size={18} className="spin" /> : <Save size={18} />}
          설정 저장하기
        </button>
      </div>
    </div>
  );
};

export default ChatSettings;
