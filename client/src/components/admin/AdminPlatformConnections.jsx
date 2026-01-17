import React, { useState, useEffect } from 'react';
import {
  Radio, Wifi, WifiOff, Play, Square, RefreshCw,
  Users, MessageSquare, Gift, AlertCircle, CheckCircle,
  Youtube, Twitch
} from 'lucide-react';

const AdminPlatformConnections = () => {
  const [connections, setConnections] = useState({
    soop: { status: 'disconnected', stats: null, error: null },
    youtube: { status: 'disconnected', stats: null, error: null },
    twitch: { status: 'disconnected', stats: null, error: null },
    chzzk: { status: 'disconnected', stats: null, error: null }
  });
  const [loading, setLoading] = useState({});
  const [formData, setFormData] = useState({
    soop: { bjId: '' },
    youtube: { videoId: '' },
    twitch: { channelId: '' },
    chzzk: { channelId: '' }
  });

  const API_BASE = 'http://localhost:3001/api';

  // 플랫폼 상태 조회
  const fetchStatus = async (platform) => {
    try {
      const res = await fetch(`${API_BASE}/${platform}/status`);
      if (res.ok) {
        const data = await res.json();
        setConnections(prev => ({
          ...prev,
          [platform]: {
            status: data.connected ? 'connected' : 'disconnected',
            stats: data,
            error: null
          }
        }));
      }
    } catch (err) {
      console.error(`[${platform}] Status check failed:`, err);
    }
  };

  // 연결
  const handleConnect = async (platform) => {
    setLoading(prev => ({ ...prev, [platform]: true }));

    try {
      let endpoint = `${API_BASE}/${platform}/connect`;
      let body = {};

      switch (platform) {
        case 'soop':
          body = { bjId: formData.soop.bjId };
          break;
        case 'youtube':
          body = { videoId: formData.youtube.videoId };
          break;
        case 'twitch':
          body = { channelId: formData.twitch.channelId };
          break;
        case 'chzzk':
          body = { channelId: formData.chzzk.channelId };
          break;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (res.ok) {
        setConnections(prev => ({
          ...prev,
          [platform]: {
            status: 'connected',
            stats: data,
            error: null
          }
        }));
      } else {
        setConnections(prev => ({
          ...prev,
          [platform]: {
            ...prev[platform],
            status: 'error',
            error: data.error || '연결 실패'
          }
        }));
      }
    } catch (err) {
      setConnections(prev => ({
        ...prev,
        [platform]: {
          ...prev[platform],
          status: 'error',
          error: err.message
        }
      }));
    } finally {
      setLoading(prev => ({ ...prev, [platform]: false }));
    }
  };

  // 연결 해제
  const handleDisconnect = async (platform) => {
    setLoading(prev => ({ ...prev, [platform]: true }));

    try {
      const res = await fetch(`${API_BASE}/${platform}/disconnect`, {
        method: 'POST'
      });

      if (res.ok) {
        setConnections(prev => ({
          ...prev,
          [platform]: {
            status: 'disconnected',
            stats: null,
            error: null
          }
        }));
      }
    } catch (err) {
      console.error(`[${platform}] Disconnect failed:`, err);
    } finally {
      setLoading(prev => ({ ...prev, [platform]: false }));
    }
  };

  // 초기 상태 조회
  useEffect(() => {
    ['soop', 'youtube', 'twitch', 'chzzk'].forEach(platform => {
      fetchStatus(platform);
    });

    // 10초마다 상태 갱신
    const interval = setInterval(() => {
      ['soop', 'youtube', 'twitch', 'chzzk'].forEach(platform => {
        fetchStatus(platform);
      });
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'connected':
        return <CheckCircle size={16} className="status-icon connected" />;
      case 'error':
        return <AlertCircle size={16} className="status-icon error" />;
      default:
        return <WifiOff size={16} className="status-icon disconnected" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'connected': return '연결됨';
      case 'error': return '오류';
      default: return '연결 안됨';
    }
  };

  const platformConfigs = [
    {
      id: 'soop',
      name: 'SOOP (숲)',
      icon: <Radio size={24} />,
      color: '#7c3aed',
      inputLabel: 'BJ ID',
      inputKey: 'bjId',
      placeholder: 'BJ 아이디 입력'
    },
    {
      id: 'youtube',
      name: 'YouTube Live',
      icon: <Youtube size={24} />,
      color: '#ef4444',
      inputLabel: 'Video ID',
      inputKey: 'videoId',
      placeholder: '라이브 비디오 ID 입력'
    },
    {
      id: 'twitch',
      name: 'Twitch',
      icon: <Twitch size={24} />,
      color: '#9146ff',
      inputLabel: 'Channel ID',
      inputKey: 'channelId',
      placeholder: '채널 ID 입력'
    },
    {
      id: 'chzzk',
      name: 'Chzzk (치지직)',
      icon: <Radio size={24} />,
      color: '#00c73c',
      inputLabel: 'Channel ID',
      inputKey: 'channelId',
      placeholder: '채널 ID 입력'
    }
  ];

  return (
    <div className="platform-connections">
      <style>{`
        .platform-connections {
          padding: 20px;
        }

        .connections-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
        }

        .platform-card {
          background: rgba(30, 41, 59, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 20px;
          transition: all 0.2s;
        }

        .platform-card:hover {
          border-color: rgba(255, 255, 255, 0.2);
        }

        .platform-card.connected {
          border-color: rgba(34, 197, 94, 0.5);
        }

        .platform-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .platform-icon {
          width: 48px;
          height: 48px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .platform-info {
          flex: 1;
        }

        .platform-name {
          font-size: 16px;
          font-weight: 600;
          color: #f1f5f9;
        }

        .platform-status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          margin-top: 4px;
        }

        .status-icon.connected { color: #22c55e; }
        .status-icon.error { color: #ef4444; }
        .status-icon.disconnected { color: #64748b; }

        .platform-form {
          margin-bottom: 16px;
        }

        .form-label {
          display: block;
          font-size: 12px;
          color: #94a3b8;
          margin-bottom: 6px;
        }

        .form-input {
          width: 100%;
          padding: 10px 12px;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: #f1f5f9;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
        }

        .form-input:focus {
          border-color: rgba(99, 102, 241, 0.5);
        }

        .form-input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .platform-actions {
          display: flex;
          gap: 10px;
        }

        .action-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 16px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .action-btn.connect {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
        }

        .action-btn.connect:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
        }

        .action-btn.disconnect {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .action-btn.disconnect:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.3);
        }

        .platform-stats {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .stat-item {
          text-align: center;
        }

        .stat-value {
          font-size: 18px;
          font-weight: 600;
          color: #f1f5f9;
        }

        .stat-label {
          font-size: 11px;
          color: #64748b;
          margin-top: 2px;
        }

        .error-message {
          margin-top: 12px;
          padding: 10px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 8px;
          color: #fca5a5;
          font-size: 13px;
        }

        .loading-spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div className="connections-grid">
        {platformConfigs.map(platform => {
          const conn = connections[platform.id];
          const isConnected = conn.status === 'connected';
          const isLoading = loading[platform.id];

          return (
            <div
              key={platform.id}
              className={`platform-card ${isConnected ? 'connected' : ''}`}
            >
              <div className="platform-header">
                <div
                  className="platform-icon"
                  style={{ background: platform.color }}
                >
                  {platform.icon}
                </div>
                <div className="platform-info">
                  <div className="platform-name">{platform.name}</div>
                  <div className="platform-status">
                    {getStatusIcon(conn.status)}
                    <span style={{ color: conn.status === 'connected' ? '#22c55e' : conn.status === 'error' ? '#ef4444' : '#64748b' }}>
                      {getStatusText(conn.status)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="platform-form">
                <label className="form-label">{platform.inputLabel}</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={platform.placeholder}
                  value={formData[platform.id][platform.inputKey]}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    [platform.id]: {
                      ...prev[platform.id],
                      [platform.inputKey]: e.target.value
                    }
                  }))}
                  disabled={isConnected || isLoading}
                />
              </div>

              <div className="platform-actions">
                {isConnected ? (
                  <button
                    className="action-btn disconnect"
                    onClick={() => handleDisconnect(platform.id)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <RefreshCw size={16} className="loading-spinner" />
                    ) : (
                      <Square size={16} />
                    )}
                    연결 해제
                  </button>
                ) : (
                  <button
                    className="action-btn connect"
                    onClick={() => handleConnect(platform.id)}
                    disabled={isLoading || !formData[platform.id][platform.inputKey]}
                  >
                    {isLoading ? (
                      <RefreshCw size={16} className="loading-spinner" />
                    ) : (
                      <Play size={16} />
                    )}
                    연결
                  </button>
                )}
              </div>

              {isConnected && conn.stats && (
                <div className="platform-stats">
                  <div className="stats-grid">
                    <div className="stat-item">
                      <div className="stat-value">
                        {conn.stats.viewers?.toLocaleString() || 0}
                      </div>
                      <div className="stat-label">시청자</div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-value">
                        {conn.stats.chatCount?.toLocaleString() || 0}
                      </div>
                      <div className="stat-label">채팅</div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-value">
                        {conn.stats.donationCount?.toLocaleString() || 0}
                      </div>
                      <div className="stat-label">후원</div>
                    </div>
                  </div>
                </div>
              )}

              {conn.error && (
                <div className="error-message">
                  <AlertCircle size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                  {conn.error}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminPlatformConnections;
