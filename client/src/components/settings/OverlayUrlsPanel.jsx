import React, { useState, useEffect } from 'react';
import {
  Copy, RefreshCw, ExternalLink, Check, AlertCircle,
  MessageSquare, Bell, Subtitles, Target, Newspaper,
  Disc, Smile, Vote, Film, Link2, Shield
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL } from '../../config/api';
import './OverlayUrlsPanel.css';

const overlayTypes = [
  { key: 'chat', name: '채팅', icon: MessageSquare, description: '실시간 채팅 오버레이' },
  { key: 'alerts', name: '알림', icon: Bell, description: '후원/구독 알림' },
  { key: 'subtitles', name: '자막', icon: Subtitles, description: '후원 자막 표시' },
  { key: 'goals', name: '목표', icon: Target, description: '후원 목표 그래프' },
  { key: 'ticker', name: '전광판', icon: Newspaper, description: '채팅/후원 전광판' },
  { key: 'roulette', name: '룰렛', icon: Disc, description: '후원 룰렛' },
  { key: 'emoji', name: '이모지', icon: Smile, description: '이모지 리액션' },
  { key: 'voting', name: '투표', icon: Vote, description: '실시간 투표' },
  { key: 'credits', name: '크레딧', icon: Film, description: '엔딩 크레딧' },
];

const OverlayUrlsPanel = () => {
  const { token, user } = useAuth();
  const [overlayHash, setOverlayHash] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const [error, setError] = useState(null);

  const fetchOverlayUrls = async () => {
    try {
      setError(null);
      const res = await fetch(`${API_URL}/api/overlay/urls`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('오버레이 URL을 불러오는데 실패했습니다.');
      }

      const data = await res.json();
      setOverlayHash(data.hash);
    } catch (err) {
      console.error('Failed to fetch overlay URLs:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const regenerateHash = async () => {
    if (!window.confirm('해시를 재발급하면 기존 URL이 더 이상 작동하지 않습니다. 계속하시겠습니까?')) {
      return;
    }

    try {
      setRegenerating(true);
      setError(null);

      const res = await fetch(`${API_URL}/api/overlay/regenerate-hash`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('해시 재발급에 실패했습니다.');
      }

      const data = await res.json();
      setOverlayHash(data.hash);
    } catch (err) {
      console.error('Failed to regenerate hash:', err);
      setError(err.message);
    } finally {
      setRegenerating(false);
    }
  };

  const getOverlayUrl = (overlayKey) => {
    if (!overlayHash) return '';
    const baseUrl = window.location.origin;
    return `${baseUrl}/overlay/${overlayHash}/${overlayKey}`;
  };

  const copyToClipboard = async (overlayKey) => {
    const url = getOverlayUrl(overlayKey);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedKey(overlayKey);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const openOverlay = (overlayKey) => {
    const url = getOverlayUrl(overlayKey);
    window.open(url, '_blank');
  };

  useEffect(() => {
    if (token) {
      fetchOverlayUrls();
    }
  }, [token]);

  if (loading) {
    return (
      <div className="settings-panel">
        <div className="loading-state">
          <RefreshCw className="spin" size={24} />
          <span>오버레이 URL 불러오는 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-panel">
      <div className="premium-settings-header">
        <div className="header-top-row">
          <div className="title-area">
            <Link2 size={28} />
            <span className="title-text">오버레이 URL</span>
            <div className="badge-wrapper">
              <span className="badge-info">OBS 브라우저 소스</span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* 해시 정보 카드 */}
      <div className="settings-card hash-info-card">
        <div className="hash-info-header">
          <div className="hash-info-left">
            <Shield size={20} />
            <div>
              <h4>개인 오버레이 해시</h4>
              <p>이 해시는 {user?.displayName || '사용자'}님만의 고유 식별자입니다.</p>
            </div>
          </div>
          <div className="hash-value">
            <code>{overlayHash || '없음'}</code>
          </div>
        </div>
        <div className="hash-actions">
          <button
            className="btn-regenerate"
            onClick={regenerateHash}
            disabled={regenerating}
          >
            <RefreshCw size={16} className={regenerating ? 'spin' : ''} />
            {regenerating ? '재발급 중...' : '해시 재발급'}
          </button>
          <span className="hash-warning">
            <AlertCircle size={14} />
            재발급 시 기존 URL이 무효화됩니다
          </span>
        </div>
      </div>

      {/* URL 목록 */}
      <div className="settings-card">
        <div className="card-header">
          <h3>오버레이 URL 목록</h3>
          <p>OBS Studio에서 "브라우저 소스"로 추가하여 사용하세요.</p>
        </div>

        <div className="overlay-urls-grid">
          {overlayTypes.map((overlay) => {
            const IconComponent = overlay.icon;
            const isCopied = copiedKey === overlay.key;

            return (
              <div key={overlay.key} className="overlay-url-item">
                <div className="overlay-url-header">
                  <div className="overlay-icon-wrapper">
                    <IconComponent size={20} />
                  </div>
                  <div className="overlay-info">
                    <span className="overlay-name">{overlay.name}</span>
                    <span className="overlay-description">{overlay.description}</span>
                  </div>
                </div>

                <div className="overlay-url-box">
                  <input
                    type="text"
                    value={getOverlayUrl(overlay.key)}
                    readOnly
                    onClick={(e) => e.target.select()}
                  />
                  <div className="overlay-url-actions">
                    <button
                      className={`btn-copy ${isCopied ? 'copied' : ''}`}
                      onClick={() => copyToClipboard(overlay.key)}
                      title="URL 복사"
                    >
                      {isCopied ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                    <button
                      className="btn-open"
                      onClick={() => openOverlay(overlay.key)}
                      title="새 탭에서 열기"
                    >
                      <ExternalLink size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 사용 가이드 */}
      <div className="settings-card">
        <div className="card-header">
          <h3>OBS Studio 설정 가이드</h3>
        </div>
        <div className="guide-steps">
          <div className="guide-step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h4>소스 추가</h4>
              <p>OBS Studio에서 소스 목록의 + 버튼을 클릭하고 "브라우저"를 선택합니다.</p>
            </div>
          </div>
          <div className="guide-step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h4>URL 입력</h4>
              <p>위에서 복사한 오버레이 URL을 "URL" 필드에 붙여넣기합니다.</p>
            </div>
          </div>
          <div className="guide-step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h4>크기 설정</h4>
              <p>너비: 1920, 높이: 1080 (또는 방송 해상도에 맞게 조정)</p>
            </div>
          </div>
          <div className="guide-step">
            <div className="step-number">4</div>
            <div className="step-content">
              <h4>배치 조정</h4>
              <p>미리보기에서 오버레이 위치와 크기를 원하는 대로 조정합니다.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverlayUrlsPanel;
