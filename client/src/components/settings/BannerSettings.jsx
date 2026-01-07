import React, { useState, useEffect } from 'react';
import { Copy, RefreshCw, Save } from 'lucide-react';

const defaultSettings = {
  transition: 'slide',
  displayTime: 8,
  transitionTime: 1,
  images: '',
  fit: 'cover'
};

const BannerSettings = () => {
  const [settings, setSettings] = useState(defaultSettings);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/settings/banner');
      const data = await res.json();
      if (data.value && data.value !== '{}') {
        setSettings({ ...defaultSettings, ...JSON.parse(data.value) });
      }
    } catch (error) {
      console.error('Failed to fetch banner settings', error);
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
        body: JSON.stringify({ key: 'banner', value: settings })
      });
      alert('배너 설정이 저장되었습니다.');
    } finally {
      setSaving(false);
    }
  };

  const copyUrl = () => {
    const url = `${window.location.origin}/overlay/banners`;
    navigator.clipboard.writeText(url);
    alert('오버레이 URL이 복사되었습니다.');
  };

  return (
    <div className="settings-panel animate-fade">
      <div className="settings-card glass-premium">
        <div className="card-header">
          <h3>배너 오버레이 주소</h3>
          <p>이미지 슬라이드 또는 페이드 전환 배너를 표시합니다.</p>
        </div>
        <div className="url-copy-box">
          <input type="text" readOnly value={`${window.location.origin}/overlay/banners`} />
          <button className="copy-btn" onClick={copyUrl}><Copy size={16} /> 복사</button>
          <button className="refresh-btn" onClick={fetchSettings}><RefreshCw size={16} /></button>
        </div>
      </div>

      <div className="settings-grid">
        <div className="settings-card glass-premium">
          <div className="card-header">
            <h3>배너 이미지</h3>
          </div>
          <div className="form-group-list">
            <div className="form-group">
              <label>이미지 URL 목록 (줄바꿈)</label>
              <textarea value={settings.images} onChange={(e) => setSettings({ ...settings, images: e.target.value })} placeholder="https://...\nhttps://..." />
            </div>
            <div className="form-group">
              <label>배너 표시 시간 (초)</label>
              <input type="number" value={settings.displayTime} onChange={(e) => setSettings({ ...settings, displayTime: parseInt(e.target.value, 10) })} />
            </div>
          </div>
        </div>

        <div className="settings-card glass-premium">
          <div className="card-header">
            <h3>전환 효과</h3>
          </div>
          <div className="form-group-list">
            <div className="form-group">
              <label>전환 방식</label>
              <select value={settings.transition} onChange={(e) => setSettings({ ...settings, transition: e.target.value })}>
                <option value="slide">슬라이드</option>
                <option value="fade">페이드</option>
              </select>
            </div>
            <div className="form-group">
              <label>전환 시간 (초)</label>
              <input type="number" value={settings.transitionTime} onChange={(e) => setSettings({ ...settings, transitionTime: parseInt(e.target.value, 10) })} />
            </div>
            <div className="form-group">
              <label>이미지 채우기</label>
              <select value={settings.fit} onChange={(e) => setSettings({ ...settings, fit: e.target.value })}>
                <option value="cover">Cover</option>
                <option value="contain">Contain</option>
                <option value="fill">Fill</option>
              </select>
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

export default BannerSettings;
