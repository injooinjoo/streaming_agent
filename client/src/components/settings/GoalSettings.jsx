import React, { useState, useEffect } from 'react';
import { Copy, RefreshCw, Save, BarChart, Circle, Heart, Star } from 'lucide-react';

const defaultSettings = {
  theme: 'default',
  type: 'bar',
  target: 'donation',
  title: '오늘의 목표 후원',
  currentValue: 0,
  targetValue: 100000,
  barColor: '#10a37f',
  thickness: 24,
  autoIncrement: false,
  autoIncrementStep: 1000,
  autoIncrementInterval: 60,
  loopEffect: 'none',
  completionEffect: 'confetti',
  startDate: ''
};

const GoalSettings = () => {
  const [settings, setSettings] = useState(defaultSettings);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/settings/goal');
      const data = await res.json();
      if (data.value && data.value !== '{}') {
        setSettings({ ...defaultSettings, ...JSON.parse(data.value) });
      }
    } catch (error) {
      console.error('Failed to fetch goal settings', error);
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
        body: JSON.stringify({ key: 'goal', value: settings })
      });
      alert('목표치 그래프 설정이 저장되었습니다.');
    } finally {
      setSaving(false);
    }
  };

  const copyUrl = () => {
    const url = `${window.location.origin}/overlay/goals`;
    navigator.clipboard.writeText(url);
    alert('오버레이 URL이 복사되었습니다.');
  };

  return (
    <div className="settings-panel animate-fade">
      <div className="settings-card glass-premium">
        <div className="card-header">
          <h3>목표치 그래프 오버레이</h3>
          <p>후원금이나 미션 달성률을 시각적으로 보여주는 그래프입니다.</p>
        </div>
        <div className="url-copy-box">
          <input type="text" readOnly value={`${window.location.origin}/overlay/goals`} />
          <button className="copy-btn" onClick={copyUrl}><Copy size={16} /> 복사</button>
          <button className="refresh-btn" onClick={fetchSettings}><RefreshCw size={16} /></button>
        </div>
      </div>

      <div className="settings-grid">
        <div className="settings-card glass-premium">
          <div className="card-header">
            <h3>목표 설정</h3>
          </div>
          <div className="form-group-list">
            <div className="form-group">
              <label>목표 제목</label>
              <input type="text" value={settings.title} onChange={(e) => setSettings({ ...settings, title: e.target.value })} />
            </div>
            <div className="form-group">
              <label>대상</label>
              <select value={settings.target} onChange={(e) => setSettings({ ...settings, target: e.target.value })}>
                <option value="donation">별풍선</option>
                <option value="dosan">두산</option>
                <option value="viewers">시청자 수</option>
              </select>
            </div>
            <div className="form-group">
              <label>시작일 집계</label>
              <input type="date" value={settings.startDate} onChange={(e) => setSettings({ ...settings, startDate: e.target.value })} />
            </div>
            <div className="input-row">
              <div className="form-group">
                <label>시작값</label>
                <input type="number" value={settings.currentValue} onChange={(e) => setSettings({ ...settings, currentValue: parseInt(e.target.value, 10) })} />
              </div>
              <div className="form-group">
                <label>최대값</label>
                <input type="number" value={settings.targetValue} onChange={(e) => setSettings({ ...settings, targetValue: parseInt(e.target.value, 10) })} />
              </div>
            </div>
          </div>
        </div>

        <div className="settings-card glass-premium">
          <div className="card-header">
            <h3>그래프 디자인</h3>
          </div>
          <div className="type-selector-grid">
            <button className={`mode-btn ${settings.type === 'bar' ? 'active' : ''}`} onClick={() => setSettings({ ...settings, type: 'bar' })}>
              <BarChart size={20} /><span>바 (Bar)</span>
            </button>
            <button className={`mode-btn ${settings.type === 'circle' ? 'active' : ''}`} onClick={() => setSettings({ ...settings, type: 'circle' })}>
              <Circle size={20} /><span>원형</span>
            </button>
            <button className={`mode-btn ${settings.type === 'heart' ? 'active' : ''}`} onClick={() => setSettings({ ...settings, type: 'heart' })}>
              <Heart size={20} /><span>하트</span>
            </button>
            <button className={`mode-btn ${settings.type === 'star' ? 'active' : ''}`} onClick={() => setSettings({ ...settings, type: 'star' })}>
              <Star size={20} /><span>별형</span>
            </button>
            <button className={`mode-btn ${settings.type === 'semi' ? 'active' : ''}`} onClick={() => setSettings({ ...settings, type: 'semi' })}>
              <Circle size={20} /><span>반원</span>
            </button>
          </div>
          <div className="form-group-list mt-20">
            <div className="form-group">
              <label>그래프 두께 (px)</label>
              <input type="number" value={settings.thickness} onChange={(e) => setSettings({ ...settings, thickness: parseInt(e.target.value, 10) })} />
            </div>
            <div className="form-group">
              <label>진행 바 색상</label>
              <input type="color" value={settings.barColor} onChange={(e) => setSettings({ ...settings, barColor: e.target.value })} />
            </div>
          </div>
        </div>
      </div>

      <div className="settings-grid">
        <div className="settings-card glass-premium">
          <div className="card-header">
            <h3>효과 및 자동 증가</h3>
          </div>
          <div className="form-group-list">
            <div className="form-group checkbox-group">
              <label>
                <input type="checkbox" checked={settings.autoIncrement} onChange={(e) => setSettings({ ...settings, autoIncrement: e.target.checked })} />
                자동 증가 사용
              </label>
            </div>
            <div className="input-row">
              <div className="form-group">
                <label>증가 단위</label>
                <input type="number" value={settings.autoIncrementStep} onChange={(e) => setSettings({ ...settings, autoIncrementStep: parseInt(e.target.value, 10) })} />
              </div>
              <div className="form-group">
                <label>증가 주기 (초)</label>
                <input type="number" value={settings.autoIncrementInterval} onChange={(e) => setSettings({ ...settings, autoIncrementInterval: parseInt(e.target.value, 10) })} />
              </div>
            </div>
            <div className="form-group">
              <label>반복 효과</label>
              <select value={settings.loopEffect} onChange={(e) => setSettings({ ...settings, loopEffect: e.target.value })}>
                <option value="none">없음</option>
                <option value="pulse">펄스</option>
                <option value="sparkle">스파클</option>
              </select>
            </div>
            <div className="form-group">
              <label>완료 이펙트</label>
              <select value={settings.completionEffect} onChange={(e) => setSettings({ ...settings, completionEffect: e.target.value })}>
                <option value="confetti">컨페티</option>
                <option value="glow">글로우</option>
                <option value="shake">흔들림</option>
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

export default GoalSettings;
