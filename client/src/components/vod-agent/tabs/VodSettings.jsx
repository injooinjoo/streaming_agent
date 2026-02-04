import { useState } from 'react';
import {
  Settings, Youtube, Music2, Instagram, Link2, Bell, Tag,
  Check, X, ExternalLink, RefreshCw, AlertCircle
} from 'lucide-react';
import { platforms, platformConnections, settingsData } from '../data/mockData';

const VodSettings = () => {
  const [settings, setSettings] = useState(settingsData);
  const [connections, setConnections] = useState(platformConnections);
  const [saving, setSaving] = useState(false);

  // 플랫폼 아이콘
  const PlatformIcon = ({ platform, size = 16 }) => {
    const icons = {
      shorts: <Youtube size={size} />,
      tiktok: <Music2 size={size} />,
      reels: <Instagram size={size} />
    };
    return icons[platform] || null;
  };

  // 설정 업데이트
  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // 알림 설정 업데이트
  const updateNotification = (key, value) => {
    setSettings(prev => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: value }
    }));
  };

  // 저장 시뮬레이션
  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
    }, 1000);
  };

  // 연결 해제 시뮬레이션
  const handleDisconnect = (platform) => {
    setConnections(prev => ({
      ...prev,
      [platform]: { ...prev[platform], connected: false, accountName: null }
    }));
  };

  // 연결 시뮬레이션
  const handleConnect = (platform) => {
    setConnections(prev => ({
      ...prev,
      [platform]: {
        connected: true,
        accountName: platform === 'reels' ? '@creator_insta' : prev[platform].accountName,
        connectedAt: new Date().toISOString(),
        followers: 45000
      }
    }));
  };

  return (
    <div className="animate-fade">
      <header className="vod-page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="vod-page-title">
            <h1>설정</h1>
            <p>플랫폼 연동 및 환경을 설정하세요</p>
          </div>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <RefreshCw size={16} className="animate-spin" /> 저장 중...
              </>
            ) : (
              <>
                <Check size={16} /> 저장
              </>
            )}
          </button>
        </div>
      </header>

      {/* 플랫폼 연동 */}
      <div className="vod-section">
        <div className="vod-section-header">
          <div className="vod-section-title">
            <Settings size={18} style={{ color: 'var(--primary)' }} />
            <h2>플랫폼 연동</h2>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {Object.entries(platforms).map(([key, platform]) => {
            const connection = connections[key];

            return (
              <div
                key={key}
                style={{
                  padding: '20px',
                  borderRadius: '12px',
                  border: `1px solid ${connection.connected ? platform.color + '40' : 'var(--border-medium)'}`,
                  background: connection.connected ? platform.bgColor : 'var(--bg-page)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: connection.connected ? platform.color : 'var(--border-medium)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white'
                      }}
                    >
                      <PlatformIcon platform={key} size={24} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '16px', marginBottom: '4px' }}>
                        {platform.name}
                      </div>
                      {connection.connected ? (
                        <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                          {connection.accountName}
                          {connection.followers && (
                            <span style={{ marginLeft: '8px' }}>
                              · {(connection.followers / 1000).toFixed(1)}K 팔로워
                            </span>
                          )}
                        </div>
                      ) : (
                        <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                          연결되지 않음
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {connection.connected ? (
                      <>
                        <span style={{
                          padding: '6px 12px',
                          borderRadius: '20px',
                          background: 'rgba(16, 185, 129, 0.1)',
                          color: '#10b981',
                          fontSize: '13px',
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <Check size={14} /> 연결됨
                        </span>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => handleDisconnect(key)}
                          style={{ color: '#ef4444', borderColor: '#ef4444' }}
                        >
                          연결 해제
                        </button>
                      </>
                    ) : (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleConnect(key)}
                        style={{ background: platform.color }}
                      >
                        <ExternalLink size={14} /> 연결하기
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 자동 게시 설정 */}
      <div className="vod-section">
        <div className="vod-section-header">
          <div className="vod-section-title">
            <RefreshCw size={18} style={{ color: 'var(--primary)' }} />
            <h2>자동 게시</h2>
          </div>
        </div>

        <div style={{ padding: '16px', background: 'var(--bg-page)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>자동 게시 활성화</div>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
              업로드 후 선택한 모든 플랫폼에 자동으로 게시됩니다
            </div>
          </div>
          <label className="vod-toggle">
            <input
              type="checkbox"
              checked={settings.autoPublish}
              onChange={(e) => updateSetting('autoPublish', e.target.checked)}
            />
            <span className="vod-toggle-slider"></span>
          </label>
        </div>
      </div>

      {/* 기본 태그 설정 */}
      <div className="vod-section">
        <div className="vod-section-header">
          <div className="vod-section-title">
            <Tag size={18} style={{ color: 'var(--primary)' }} />
            <h2>기본 태그 / 해시태그</h2>
          </div>
        </div>

        <div className="vod-form-group">
          <label className="vod-form-label">기본 태그</label>
          <input
            type="text"
            className="vod-form-input"
            value={settings.defaultTags.join(', ')}
            onChange={(e) => updateSetting('defaultTags', e.target.value.split(',').map(t => t.trim()))}
            placeholder="쉼표로 구분하여 입력"
          />
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
            모든 영상 업로드 시 기본으로 적용됩니다
          </div>
        </div>

        <div className="vod-form-group">
          <label className="vod-form-label">기본 해시태그</label>
          <input
            type="text"
            className="vod-form-input"
            value={settings.defaultHashtags}
            onChange={(e) => updateSetting('defaultHashtags', e.target.value)}
            placeholder="#shorts #tiktok #reels"
          />
        </div>
      </div>

      {/* 링크 설정 */}
      <div className="vod-section">
        <div className="vod-section-header">
          <div className="vod-section-title">
            <Link2 size={18} style={{ color: 'var(--primary)' }} />
            <h2>링크 설정</h2>
          </div>
        </div>

        <div className="vod-form-group">
          <label className="vod-form-label">링크 도메인</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              className="vod-form-input"
              value={settings.linkDomain}
              onChange={(e) => updateSetting('linkDomain', e.target.value)}
              style={{ flex: 1 }}
            />
            <button className="btn btn-outline">
              도메인 변경
            </button>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
            커스텀 도메인을 사용하려면 DNS 설정이 필요합니다
          </div>
        </div>

        <div className="vod-form-group">
          <label className="vod-form-label">링크 만료 기간</label>
          <select
            className="vod-filter-select"
            style={{ width: '100%' }}
            value={settings.linkExpiry}
            onChange={(e) => updateSetting('linkExpiry', e.target.value)}
          >
            <option value="never">만료 없음</option>
            <option value="30days">30일</option>
            <option value="90days">90일</option>
            <option value="1year">1년</option>
          </select>
        </div>
      </div>

      {/* 알림 설정 */}
      <div className="vod-section">
        <div className="vod-section-header">
          <div className="vod-section-title">
            <Bell size={18} style={{ color: 'var(--primary)' }} />
            <h2>알림 설정</h2>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { key: 'uploadComplete', label: '업로드 완료', desc: '영상 업로드가 완료되면 알림을 받습니다' },
            { key: 'revenueGenerated', label: '수익 발생', desc: '링크를 통해 수익이 발생하면 알림을 받습니다' },
            { key: 'weeklyReport', label: '주간 리포트', desc: '매주 월요일 성과 요약 리포트를 받습니다' },
            { key: 'milestoneReached', label: '마일스톤 달성', desc: '조회수, 수익 등 목표 달성 시 알림을 받습니다' }
          ].map(({ key, label, desc }) => (
            <div
              key={key}
              style={{
                padding: '16px',
                background: 'var(--bg-page)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>{label}</div>
                <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{desc}</div>
              </div>
              <label className="vod-toggle">
                <input
                  type="checkbox"
                  checked={settings.notifications[key]}
                  onChange={(e) => updateNotification(key, e.target.checked)}
                />
                <span className="vod-toggle-slider"></span>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* 위험 영역 */}
      <div className="vod-section" style={{ border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.05)' }}>
        <div className="vod-section-header">
          <div className="vod-section-title">
            <AlertCircle size={18} style={{ color: '#ef4444' }} />
            <h2 style={{ color: '#ef4444' }}>위험 영역</h2>
          </div>
        </div>

        <div style={{ padding: '16px', background: 'var(--bg-card)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>모든 데이터 삭제</div>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
              업로드된 영상, 수익 내역 등 모든 데이터가 영구 삭제됩니다
            </div>
          </div>
          <button className="btn btn-outline" style={{ color: '#ef4444', borderColor: '#ef4444' }}>
            데이터 삭제
          </button>
        </div>
      </div>
    </div>
  );
};

export default VodSettings;
