import React, { useState, useEffect } from 'react';
import { Copy, RefreshCw, Save, Medal, Users, Clock, Image as ImageIcon, Hash } from 'lucide-react';

const defaultSettings = {
  theme: 'default',
  mode: 'recent',
  minAmount: 1000,
  fontSize: 24,
  showMedals: true,
  showPlatform: true,
  transparency: 100,
  autoReset: false,
  textFormat: '{닉네임} {금액}',
  dataRange: '7d',
  startDate: '',
  restoreOnReload: true,
  hideAnonymous: false,
  customCss: ''
};

const SubtitleSettings = () => {
  const [settings, setSettings] = useState(defaultSettings);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/settings/subtitle');
      const data = await res.json();
      if (data.value && data.value !== '{}') {
        setSettings({ ...defaultSettings, ...JSON.parse(data.value) });
      }
    } catch (error) {
      console.error('Failed to fetch subtitle settings', error);
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
        body: JSON.stringify({ key: 'subtitle', value: settings })
      });
      alert('후원 자막 설정이 저장되었습니다.');
    } finally {
      setSaving(false);
    }
  };

  const copyUrl = () => {
    const url = `${window.location.origin}/overlay/subtitles`;
    navigator.clipboard.writeText(url);
    alert('오버레이 URL이 복사되었습니다.');
  };

  return (
    <div className="settings-panel animate-fade">
      <div className="settings-card glass-premium">
        <div className="card-header">
          <h3>후원 자막 오버레이</h3>
          <p>화면 하단이나 상단에 고정하여 후원 내역을 보여주는 자막 창입니다.</p>
        </div>
        <div className="url-copy-box">
          <input type="text" readOnly value={`${window.location.origin}/overlay/subtitles`} />
          <button className="copy-btn" onClick={copyUrl}><Copy size={16} /> 복사</button>
          <button className="refresh-btn" onClick={fetchSettings}><RefreshCw size={16} /></button>
        </div>
      </div>

      <div className="settings-grid">
        <div className="settings-card glass-premium">
          <div className="card-header">
            <h3>로직</h3>
            <p>데이터 로드 기간 및 복구 옵션을 설정합니다.</p>
          </div>
          <div className="form-group-list">
            <div className="form-group">
              <label>데이터 로드 범위</label>
              <select value={settings.dataRange} onChange={(e) => setSettings({ ...settings, dataRange: e.target.value })}>
                <option value="7d">최근 1주일</option>
                <option value="30d">최근 1달</option>
              </select>
            </div>
            <div className="form-group">
              <label>시작일 설정 (선택)</label>
              <input type="date" value={settings.startDate} onChange={(e) => setSettings({ ...settings, startDate: e.target.value })} />
            </div>
            <div className="form-group checkbox-group">
              <label>
                <input type="checkbox" checked={settings.restoreOnReload} onChange={(e) => setSettings({ ...settings, restoreOnReload: e.target.checked })} />
                데이터 복구 지원
              </label>
              <label>
                <input type="checkbox" checked={settings.autoReset} onChange={(e) => setSettings({ ...settings, autoReset: e.target.checked })} />
                방송 종료 시 자동 초기화
              </label>
            </div>
          </div>
        </div>

        <div className="settings-card glass-premium">
          <div className="card-header">
            <h3>표시 모드</h3>
          </div>
          <div className="mode-selector-grid">
            <button
              className={`mode-btn ${settings.mode === 'recent' ? 'active' : ''}`}
              onClick={() => setSettings({ ...settings, mode: 'recent' })}
            >
              <Clock size={20} />
              <span>최근 후원</span>
            </button>
            <button
              className={`mode-btn ${settings.mode === 'mvp' ? 'active' : ''}`}
              onClick={() => setSettings({ ...settings, mode: 'mvp' })}
            >
              <Medal size={20} />
              <span>오늘의 MVP</span>
            </button>
            <button
              className={`mode-btn ${settings.mode === 'ranking' ? 'active' : ''}`}
              onClick={() => setSettings({ ...settings, mode: 'ranking' })}
            >
              <Users size={20} />
              <span>후원 랭킹</span>
            </button>
            <button
              className={`mode-btn ${settings.mode === 'count' ? 'active' : ''}`}
              onClick={() => setSettings({ ...settings, mode: 'count' })}
            >
              <Hash size={20} />
              <span>후원 개수</span>
            </button>
            <button
              className={`mode-btn ${settings.mode === 'image' ? 'active' : ''}`}
              onClick={() => setSettings({ ...settings, mode: 'image' })}
            >
              <ImageIcon size={20} />
              <span>후원 이미지</span>
            </button>
          </div>

          <div className="form-group-list mt-20">
            <div className="form-group">
              <label>최소 표시 금액 (KRW)</label>
              <input type="number" value={settings.minAmount} onChange={(e) => setSettings({ ...settings, minAmount: parseInt(e.target.value, 10) })} />
            </div>
            <div className="form-group">
              <label>텍스트 형식</label>
              <input type="text" value={settings.textFormat} onChange={(e) => setSettings({ ...settings, textFormat: e.target.value })} placeholder="{닉네임} {금액}" />
            </div>
          </div>
        </div>
      </div>

      <div className="settings-grid">
        <div className="settings-card glass-premium">
          <div className="card-header">
            <h3>디자인 상세</h3>
          </div>
          <div className="form-group-list">
            <div className="form-group">
              <label>자막 테마</label>
              <select value={settings.theme} onChange={(e) => setSettings({ ...settings, theme: e.target.value })}>
                <option value="default">기본</option>
                <option value="neon">네온</option>
                <option value="box">박스</option>
                <option value="retro">레트로</option>
              </select>
            </div>
            <div className="input-row">
              <div className="form-group">
                <label>폰트 크기</label>
                <input type="number" value={settings.fontSize} onChange={(e) => setSettings({ ...settings, fontSize: parseInt(e.target.value, 10) })} />
              </div>
              <div className="form-group">
                <label>투명도 ({settings.transparency}%)</label>
                <input type="range" min="0" max="100" value={settings.transparency} onChange={(e) => setSettings({ ...settings, transparency: parseInt(e.target.value, 10) })} />
              </div>
            </div>
            <div className="checkbox-group">
              <label>
                <input type="checkbox" checked={settings.showMedals} onChange={(e) => setSettings({ ...settings, showMedals: e.target.checked })} />
                순위 메달 표시
              </label>
              <label>
                <input type="checkbox" checked={settings.showPlatform} onChange={(e) => setSettings({ ...settings, showPlatform: e.target.checked })} />
                플랫폼 아이콘 표시
              </label>
              <label>
                <input type="checkbox" checked={settings.hideAnonymous} onChange={(e) => setSettings({ ...settings, hideAnonymous: e.target.checked })} />
                익명 후원 숨김
              </label>
            </div>
            <div className="form-group">
              <label>커스텀 CSS</label>
              <textarea value={settings.customCss} onChange={(e) => setSettings({ ...settings, customCss: e.target.value })} placeholder=".subtitle-container { ... }" />
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

export default SubtitleSettings;
