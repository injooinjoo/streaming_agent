import React, { useState, useEffect } from 'react';
import { Copy, RefreshCw, Save } from 'lucide-react';

const defaultSettings = {
  mode: 'text',
  scoreboardType: 'star',
  fontSize: 28,
  transparency: 100,
  textFormat: '방송 준비 중입니다. {시간}',
  alignment: 'center',
  customCss: ''
};

const TextSettings = () => {
  const [settings, setSettings] = useState(defaultSettings);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/settings/text');
      const data = await res.json();
      if (data.value && data.value !== '{}') {
        setSettings({ ...defaultSettings, ...JSON.parse(data.value) });
      }
    } catch (error) {
      console.error('Failed to fetch text settings', error);
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
    alert('오버레이 URL이 복사되었습니다.');
  };

  return (
    <div className="settings-panel animate-fade">
      <div className="settings-card glass-premium">
        <div className="card-header">
          <h3>자막 오버레이 주소</h3>
          <p>일반 텍스트 또는 점수판 스타일 자막을 표시합니다.</p>
        </div>
        <div className="url-copy-box">
          <input type="text" readOnly value={`${window.location.origin}/overlay/text`} />
          <button className="copy-btn" onClick={copyUrl}><Copy size={16} /> 복사</button>
          <button className="refresh-btn" onClick={fetchSettings}><RefreshCw size={16} /></button>
        </div>
      </div>

      <div className="settings-grid">
        <div className="settings-card glass-premium">
          <div className="card-header">
            <h3>표시 모드</h3>
          </div>
          <div className="form-group-list">
            <div className="form-group">
              <label>자막 유형</label>
              <select value={settings.mode} onChange={(e) => setSettings({ ...settings, mode: e.target.value })}>
                <option value="text">일반 텍스트</option>
                <option value="scoreboard">점수판</option>
              </select>
            </div>
            <div className="form-group">
              <label>점수판 스타일</label>
              <select value={settings.scoreboardType} onChange={(e) => setSettings({ ...settings, scoreboardType: e.target.value })}>
                <option value="star">스타</option>
                <option value="box">박스</option>
                <option value="multi">멀티</option>
              </select>
            </div>
            <div className="form-group">
              <label>정렬</label>
              <select value={settings.alignment} onChange={(e) => setSettings({ ...settings, alignment: e.target.value })}>
                <option value="left">왼쪽</option>
                <option value="center">가운데</option>
                <option value="right">오른쪽</option>
              </select>
            </div>
          </div>
        </div>

        <div className="settings-card glass-premium">
          <div className="card-header">
            <h3>텍스트 및 스타일</h3>
          </div>
          <div className="form-group-list">
            <div className="form-group">
              <label>텍스트 형식</label>
              <input type="text" value={settings.textFormat} onChange={(e) => setSettings({ ...settings, textFormat: e.target.value })} />
              <p className="helper-text">키워드: {`{시간}`}, {`{날짜}`}, {`{요일}`}, {`{초}`}</p>
            </div>
            <div className="form-group">
              <label>폰트 크기</label>
              <input type="number" value={settings.fontSize} onChange={(e) => setSettings({ ...settings, fontSize: parseInt(e.target.value, 10) })} />
            </div>
            <div className="form-group">
              <label>투명도 ({settings.transparency}%)</label>
              <input type="range" min="0" max="100" value={settings.transparency} onChange={(e) => setSettings({ ...settings, transparency: parseInt(e.target.value, 10) })} />
            </div>
            <div className="form-group">
              <label>커스텀 CSS</label>
              <textarea value={settings.customCss} onChange={(e) => setSettings({ ...settings, customCss: e.target.value })} placeholder=".caption-text { ... }" />
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

export default TextSettings;
