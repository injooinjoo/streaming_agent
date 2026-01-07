import React, { useState, useEffect } from 'react';
import { RefreshCw, Save } from 'lucide-react';

const defaultSettings = {
  soopIconSet: 'default',
  soopIconStyle: 'color',
  fontFamily: 'GmarketSans',
  customFontUrl: '',
  backgroundColor: '#111111',
  backgroundImageUrl: '',
  backgroundFit: 'cover',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'center'
};

const DesignSettings = () => {
  const [settings, setSettings] = useState(defaultSettings);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/settings/design');
      const data = await res.json();
      if (data.value && data.value !== '{}') {
        setSettings({ ...defaultSettings, ...JSON.parse(data.value) });
      }
    } catch (error) {
      console.error('Failed to fetch design settings', error);
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
        body: JSON.stringify({ key: 'design', value: settings })
      });
      alert('디자인 커스텀 설정이 저장되었습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-panel animate-fade">
      <div className="settings-card glass-premium">
        <div className="card-header">
          <h3>디자인 커스텀</h3>
          <p>아이콘, 폰트, 배경 등 공통 디자인 옵션을 설정합니다.</p>
        </div>
      </div>

      <div className="settings-grid">
        <div className="settings-card glass-premium">
          <div className="card-header">
            <h3>아이콘</h3>
          </div>
          <div className="form-group-list">
            <div className="form-group">
              <label>SOOP 아이콘 세트</label>
              <select value={settings.soopIconSet} onChange={(e) => setSettings({ ...settings, soopIconSet: e.target.value })}>
                <option value="default">기본</option>
                <option value="minimal">미니멀</option>
                <option value="premium">프리미엄</option>
              </select>
            </div>
            <div className="form-group">
              <label>아이콘 스타일</label>
              <select value={settings.soopIconStyle} onChange={(e) => setSettings({ ...settings, soopIconStyle: e.target.value })}>
                <option value="color">컬러</option>
                <option value="mono">모노</option>
                <option value="outline">아웃라인</option>
              </select>
            </div>
          </div>
        </div>

        <div className="settings-card glass-premium">
          <div className="card-header">
            <h3>폰트</h3>
          </div>
          <div className="form-group-list">
            <div className="form-group">
              <label>기본 폰트</label>
              <select value={settings.fontFamily} onChange={(e) => setSettings({ ...settings, fontFamily: e.target.value })}>
                <option value="GmarketSans">G마켓 산스</option>
                <option value="NanumGothic">나눔고딕</option>
                <option value="CookieRun">쿠키런</option>
                <option value="BaeMin">배달의민족</option>
                <option value="NotoSans">Noto Sans KR</option>
              </select>
            </div>
            <div className="form-group">
              <label>웹폰트 URL</label>
              <input type="text" value={settings.customFontUrl} onChange={(e) => setSettings({ ...settings, customFontUrl: e.target.value })} placeholder="https://..." />
            </div>
          </div>
        </div>
      </div>

      <div className="settings-card glass-premium">
        <div className="card-header">
          <h3>배경</h3>
        </div>
        <div className="form-group-list">
          <div className="input-row">
            <div className="form-group">
              <label>배경색</label>
              <input type="color" value={settings.backgroundColor} onChange={(e) => setSettings({ ...settings, backgroundColor: e.target.value })} />
            </div>
            <div className="form-group">
              <label>배경 이미지 URL</label>
              <input type="text" value={settings.backgroundImageUrl} onChange={(e) => setSettings({ ...settings, backgroundImageUrl: e.target.value })} placeholder="https://..." />
            </div>
          </div>
          <div className="form-group">
            <label>이미지 업로드</label>
            <input type="file" accept="image/*" />
          </div>
          <div className="input-row">
            <div className="form-group">
              <label>채우기 옵션</label>
              <select value={settings.backgroundFit} onChange={(e) => setSettings({ ...settings, backgroundFit: e.target.value })}>
                <option value="cover">가득 채우기 (Cover)</option>
                <option value="contain">맞춤 (Contain)</option>
                <option value="fill">비율에 맞춰 채우기 (Fill)</option>
              </select>
            </div>
            <div className="form-group">
              <label>반복</label>
              <select value={settings.backgroundRepeat} onChange={(e) => setSettings({ ...settings, backgroundRepeat: e.target.value })}>
                <option value="no-repeat">반복 없음</option>
                <option value="repeat">반복</option>
                <option value="repeat-x">가로 반복</option>
                <option value="repeat-y">세로 반복</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>배경 위치</label>
            <select value={settings.backgroundPosition} onChange={(e) => setSettings({ ...settings, backgroundPosition: e.target.value })}>
              <option value="center">가운데</option>
              <option value="top">상단</option>
              <option value="bottom">하단</option>
              <option value="left">왼쪽</option>
              <option value="right">오른쪽</option>
            </select>
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

export default DesignSettings;
