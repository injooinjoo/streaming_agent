import React, { useState, useEffect } from 'react';
import { Copy, RefreshCw, Save, Volume2 } from 'lucide-react';

const defaultSettings = {
  theme: 'default',
  duration: 30,
  volume: 50,
  ttsVolume: 50,
  ttsSpeed: 1,
  ttsMaxChars: 120,
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
  }
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
  { value: 'bounceIn', label: 'Bounce' },
  { value: 'fadeIn', label: 'Fade' },
  { value: 'fadeOut', label: 'Fade Out' },
  { value: 'flipInX', label: 'Flip' },
  { value: 'zoomIn', label: 'Zoom' },
  { value: 'slideInRight', label: 'Slide' }
];

const textEffects = [
  { value: 'tada', label: 'Tada' },
  { value: 'flash', label: 'Flash' },
  { value: 'wobble', label: 'Wobble' },
  { value: 'bounce', label: 'Bounce' },
  { value: 'rotate', label: 'Rotate' },
  { value: 'rollIn', label: 'RollIn' }
];

const AlertSettings = () => {
  const [settings, setSettings] = useState(defaultSettings);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/settings/alert');
      const data = await res.json();
      if (data.value && data.value !== '{}') {
        const parsed = JSON.parse(data.value);
        setSettings({
          ...defaultSettings,
          ...parsed,
          showDonationTypes: {
            ...defaultSettings.showDonationTypes,
            ...(parsed.showDonationTypes || {})
          }
        });
      }
    } catch (error) {
      console.error('Failed to fetch alert settings', error);
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
        body: JSON.stringify({ key: 'alert', value: settings })
      });
      alert('설정이 저장되었습니다.');
    } finally {
      setSaving(false);
    }
  };

  const copyUrl = () => {
    const url = `${window.location.origin}/overlay/alerts`;
    navigator.clipboard.writeText(url);
    alert('오버레이 URL이 복사되었습니다.');
  };

  return (
    <div className="settings-panel animate-fade">
      <div className="settings-card glass-premium">
        <div className="card-header">
          <h3>알림 오버레이 주소</h3>
          <p>후원 시 알림이 표시될 창의 주소입니다.</p>
        </div>
        <div className="url-copy-box">
          <input type="text" readOnly value={`${window.location.origin}/overlay/alerts`} />
          <button className="copy-btn" onClick={copyUrl}><Copy size={16} /> 복사</button>
          <button className="refresh-btn" onClick={fetchSettings}><RefreshCw size={16} /></button>
        </div>
      </div>

      <div className="settings-grid">
        <div className="settings-card glass-premium">
          <div className="card-header">
            <h3>기본 설정</h3>
          </div>
          <div className="form-group-list">
            <div className="form-group">
              <label>알림 테마</label>
              <select value={settings.theme} onChange={(e) => setSettings({ ...settings, theme: e.target.value })}>
                {themeOptions.map((theme) => (
                  <option key={theme.value} value={theme.value}>{theme.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>알림 표시 시간 ({settings.duration}초)</label>
              <input type="number" value={settings.duration} onChange={(e) => setSettings({ ...settings, duration: parseInt(e.target.value, 10) })} />
            </div>
          </div>
        </div>

        <div className="settings-card glass-premium">
          <div className="card-header">
            <h3>창 설정</h3>
          </div>
          <div className="form-group-list">
            <div className="form-group">
              <label>투명도 ({settings.transparency}%)</label>
              <input type="range" min="0" max="100" value={settings.transparency} onChange={(e) => setSettings({ ...settings, transparency: parseInt(e.target.value, 10) })} />
            </div>
            <div className="form-group checkbox-group">
              <label>
                <input type="checkbox" checked={settings.showTooltip} onChange={(e) => setSettings({ ...settings, showTooltip: e.target.checked })} />
                툴팁 표시
              </label>
              <label>
                <input type="checkbox" checked={settings.showPaused} onChange={(e) => setSettings({ ...settings, showPaused: e.target.checked })} />
                일시중지 표시
              </label>
            </div>
            <div className="form-group">
              <label>커스텀 CSS</label>
              <textarea value={settings.customCss} onChange={(e) => setSettings({ ...settings, customCss: e.target.value })} placeholder=".alert-card { ... }" />
            </div>
          </div>
        </div>
      </div>

      <div className="settings-grid">
        <div className="settings-card glass-premium">
          <div className="card-header">
            <h3>작동 규칙</h3>
            <p className="helper-text">개수 중첩 시 마지막 설정이 우선 적용됩니다.</p>
          </div>
          <div className="form-group-list">
            <div className="form-group">
              <label>SOOP 후원 종류</label>
              <div className="checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.showDonationTypes.star}
                    onChange={(e) => setSettings({
                      ...settings,
                      showDonationTypes: { ...settings.showDonationTypes, star: e.target.checked }
                    })}
                  />
                  별풍선
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={settings.showDonationTypes.balloon}
                    onChange={(e) => setSettings({
                      ...settings,
                      showDonationTypes: { ...settings.showDonationTypes, balloon: e.target.checked }
                    })}
                  />
                  애드벌룬
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={settings.showDonationTypes.video}
                    onChange={(e) => setSettings({
                      ...settings,
                      showDonationTypes: { ...settings.showDonationTypes, video: e.target.checked }
                    })}
                  />
                  영상풍선
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={settings.showDonationTypes.mission}
                    onChange={(e) => setSettings({
                      ...settings,
                      showDonationTypes: { ...settings.showDonationTypes, mission: e.target.checked }
                    })}
                  />
                  미션
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={settings.showDonationTypes.sticker}
                    onChange={(e) => setSettings({
                      ...settings,
                      showDonationTypes: { ...settings.showDonationTypes, sticker: e.target.checked }
                    })}
                  />
                  스티커
                </label>
              </div>
            </div>
            <div className="input-row">
              <div className="form-group">
                <label>범위 시작</label>
                <input type="number" value={settings.rangeMin} onChange={(e) => setSettings({ ...settings, rangeMin: parseInt(e.target.value, 10) })} />
              </div>
              <div className="form-group">
                <label>범위 끝</label>
                <input type="number" value={settings.rangeMax} onChange={(e) => setSettings({ ...settings, rangeMax: parseInt(e.target.value, 10) })} />
              </div>
            </div>
            <p className="helper-text">전체 범위 설정은 리스트 최상단에 두는 것을 권장합니다.</p>
          </div>
        </div>

        <div className="settings-card glass-premium">
          <div className="card-header">
            <h3>효과 및 사운드</h3>
          </div>
          <div className="form-group-list">
            <div className="form-group">
              <label>등장 애니메이션</label>
              <select value={settings.animation} onChange={(e) => setSettings({ ...settings, animation: e.target.value })}>
                {animationOptions.map((anim) => (
                  <option key={anim.value} value={anim.value}>{anim.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>퇴장 애니메이션</label>
              <select value={settings.exitAnimation} onChange={(e) => setSettings({ ...settings, exitAnimation: e.target.value })}>
                {animationOptions.map((anim) => (
                  <option key={anim.value} value={anim.value}>{anim.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>텍스트 효과</label>
              <select value={settings.textAnimation} onChange={(e) => setSettings({ ...settings, textAnimation: e.target.value })}>
                {textEffects.map((effect) => (
                  <option key={effect.value} value={effect.value}>{effect.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label><Volume2 size={14} /> 알림음 볼륨 ({settings.volume}%)</label>
              <input type="range" min="0" max="100" value={settings.volume} onChange={(e) => setSettings({ ...settings, volume: parseInt(e.target.value, 10) })} />
            </div>
            <div className="form-group">
              <label><Volume2 size={14} /> TTS 볼륨 ({settings.ttsVolume}%)</label>
              <input type="range" min="0" max="100" value={settings.ttsVolume} onChange={(e) => setSettings({ ...settings, ttsVolume: parseInt(e.target.value, 10) })} />
            </div>
            <div className="input-row">
              <div className="form-group">
                <label>TTS 속도</label>
                <input type="number" step="0.1" value={settings.ttsSpeed} onChange={(e) => setSettings({ ...settings, ttsSpeed: parseFloat(e.target.value) })} />
              </div>
              <div className="form-group">
                <label>글자수 제한</label>
                <input type="number" value={settings.ttsMaxChars} onChange={(e) => setSettings({ ...settings, ttsMaxChars: parseInt(e.target.value, 10) })} />
              </div>
            </div>
            <div className="form-group checkbox-group">
              <label>
                <input type="checkbox" checked={settings.resetGifOnAlert} onChange={(e) => setSettings({ ...settings, resetGifOnAlert: e.target.checked })} />
                GIF 이미지 초기화
              </label>
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

export default AlertSettings;
