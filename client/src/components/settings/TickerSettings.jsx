import React, { useState, useEffect } from 'react';
import { Copy, RefreshCw, Save } from 'lucide-react';

const defaultSettings = {
  theme: 'default',
  autoHide: true,
  showTime: true,
  oneLine: false,
  fontSize: 22,
  scrollSpeed: 15,
  permissions: 'all',
  textFormat: '{닉네임}: {채팅}',
  flowDirection: 'left'
};

const TickerSettings = () => {
  const [settings, setSettings] = useState(defaultSettings);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/settings/ticker');
      const data = await res.json();
      if (data.value && data.value !== '{}') {
        setSettings({ ...defaultSettings, ...JSON.parse(data.value) });
      }
    } catch (error) {
      console.error('Failed to fetch ticker settings', error);
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
        body: JSON.stringify({ key: 'ticker', value: settings })
      });
      alert('전광판 설정이 저장되었습니다.');
    } finally {
      setSaving(false);
    }
  };

  const copyUrl = () => {
    const url = `${window.location.origin}/overlay/ticker`;
    navigator.clipboard.writeText(url);
    alert('오버레이 URL이 복사되었습니다.');
  };

  return (
    <div className="settings-panel animate-fade">
      <div className="settings-card glass-premium">
        <div className="card-header">
          <h3>전광판 오버레이 주소</h3>
          <p>스크롤되는 긴 메시지나 공지를 표시하는 전광판 위젯입니다. 명령어(`!전광판`)로 제어 가능합니다.</p>
        </div>
        <div className="url-copy-box">
          <input type="text" readOnly value={`${window.location.origin}/overlay/ticker`} />
          <button className="copy-btn" onClick={copyUrl}><Copy size={16} /> 복사</button>
          <button className="refresh-btn" onClick={fetchSettings}><RefreshCw size={16} /></button>
        </div>
      </div>

      <div className="settings-grid">
        <div className="settings-card glass-premium">
          <div className="card-header">
            <h3>표시 및 동작</h3>
          </div>
          <div className="form-group-list">
            <div className="form-group checkbox-group">
              <label><input type="checkbox" checked={settings.autoHide} onChange={(e) => setSettings({ ...settings, autoHide: e.target.checked })} /> 숨김 모드 (메시지 없을 때)</label>
              <label><input type="checkbox" checked={settings.showTime} onChange={(e) => setSettings({ ...settings, showTime: e.target.checked })} /> 남은 시간 표시</label>
              <label><input type="checkbox" checked={settings.oneLine} onChange={(e) => setSettings({ ...settings, oneLine: e.target.checked })} /> 여러 메시지 한 줄 표시</label>
            </div>
            <div className="form-group">
              <label>메시지 흐름 방향</label>
              <select value={settings.flowDirection} onChange={(e) => setSettings({ ...settings, flowDirection: e.target.value })}>
                <option value="left">좌 → 우</option>
                <option value="right">우 → 좌</option>
              </select>
            </div>
            <div className="form-group">
              <label>스크롤 속도 (초/바퀴)</label>
              <input type="number" value={settings.scrollSpeed} onChange={(e) => setSettings({ ...settings, scrollSpeed: parseInt(e.target.value, 10) })} />
            </div>
          </div>
        </div>

        <div className="settings-card glass-premium">
          <div className="card-header">
            <h3>권한 및 명령어</h3>
          </div>
          <div className="form-group-list">
            <div className="form-group">
              <label>사용 가능 등급</label>
              <select value={settings.permissions} onChange={(e) => setSettings({ ...settings, permissions: e.target.value })}>
                <option value="all">모든 시청자</option>
                <option value="subscriber">구독자 이상</option>
                <option value="ardent">열혈 이상</option>
                <option value="manager">매니저 이상</option>
                <option value="donator">후원자 이상</option>
              </select>
            </div>
            <div className="form-group">
              <label>텍스트 형식</label>
              <input type="text" value={settings.textFormat} onChange={(e) => setSettings({ ...settings, textFormat: e.target.value })} />
            </div>
            <div className="form-group">
              <label>폰트 크기</label>
              <input type="number" value={settings.fontSize} onChange={(e) => setSettings({ ...settings, fontSize: parseInt(e.target.value, 10) })} />
            </div>
            <div className="form-group">
              <label>명령어</label>
              <div className="chip-list">
                <span className="chip">!전광판</span>
                <span className="chip">!전광판삭제</span>
                <span className="chip">!전광판숨김</span>
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

export default TickerSettings;
