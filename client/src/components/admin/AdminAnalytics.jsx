import React, { useState, useEffect } from 'react';
import {
  Users, Activity, TrendingUp, RefreshCw, Database,
  Eye, MessageSquare, Gift, Radio, Search, ChevronRight,
  BarChart3, Clock, Percent
} from 'lucide-react';

const AdminAnalytics = ({ onStreamerSelect }) => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');
  const [summary, setSummary] = useState(null);
  const [topViewers, setTopViewers] = useState([]);
  const [streamers, setStreamers] = useState([]);
  const [liveBroadcasts, setLiveBroadcasts] = useState([]);
  const [recentBroadcasts, setRecentBroadcasts] = useState([]);
  const [selectedBroadcast, setSelectedBroadcast] = useState(null);
  const [broadcastDetail, setBroadcastDetail] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchSummary();
  }, []);

  useEffect(() => {
    if (activeTab === 'viewers') fetchTopViewers();
    if (activeTab === 'streamers') fetchStreamers();
    if (activeTab === 'live') fetchLiveBroadcasts();
    if (activeTab === 'recent') fetchRecentBroadcasts();
  }, [activeTab]);

  const getToken = () => localStorage.getItem('token');

  const fetchWithAuth = async (url) => {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const data = await fetchWithAuth('http://localhost:3001/api/analytics/summary');
      setSummary(data);
    } catch (err) {
      console.error('Failed to fetch summary:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTopViewers = async () => {
    try {
      const data = await fetchWithAuth('http://localhost:3001/api/analytics/top-viewers?limit=50');
      setTopViewers(data);
    } catch (err) {
      console.error('Failed to fetch top viewers:', err);
    }
  };

  const fetchStreamers = async () => {
    try {
      const data = await fetchWithAuth('http://localhost:3001/api/analytics/streamers?limit=100');
      setStreamers(data);
    } catch (err) {
      console.error('Failed to fetch streamers:', err);
    }
  };

  const fetchLiveBroadcasts = async () => {
    try {
      const data = await fetchWithAuth('http://localhost:3001/api/analytics/broadcasts/live');
      setLiveBroadcasts(data);
    } catch (err) {
      console.error('Failed to fetch live broadcasts:', err);
    }
  };

  const fetchRecentBroadcasts = async () => {
    try {
      const data = await fetchWithAuth('http://localhost:3001/api/analytics/broadcasts/recent');
      setRecentBroadcasts(data);
    } catch (err) {
      console.error('Failed to fetch recent broadcasts:', err);
    }
  };

  const fetchBroadcastDetail = async (broadcastId) => {
    try {
      const data = await fetchWithAuth(`http://localhost:3001/api/analytics/broadcast/${broadcastId}`);
      setBroadcastDetail(data);
      setSelectedBroadcast(broadcastId);
    } catch (err) {
      console.error('Failed to fetch broadcast detail:', err);
    }
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '-';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}시간 ${minutes}분`;
    return `${minutes}분`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && !summary) {
    return (
      <div className="admin-loading-section">
        <RefreshCw size={24} className="spin" />
        <p>데이터 로딩 중...</p>
      </div>
    );
  }

  const tabs = [
    { id: 'summary', label: '요약', icon: <BarChart3 size={16} /> },
    { id: 'live', label: '라이브', icon: <Radio size={16} /> },
    { id: 'recent', label: '최근 방송', icon: <Clock size={16} /> },
    { id: 'streamers', label: '스트리머', icon: <Users size={16} /> },
    { id: 'viewers', label: '다시청자', icon: <Eye size={16} /> },
  ];

  return (
    <div className="admin-analytics">
      {/* 탭 네비게이션 */}
      <div className="admin-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`admin-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 요약 탭 */}
      {activeTab === 'summary' && summary && (
        <div className="admin-section">
          <div className="admin-section-header">
            <h2>SOOP Analytics 요약</h2>
            <button className="admin-refresh-btn" onClick={fetchSummary}>
              <RefreshCw size={16} />
            </button>
          </div>

          <div className="admin-metrics-grid">
            <div className="admin-metric-card">
              <div className="admin-metric-icon" style={{ background: 'rgba(99, 102, 241, 0.1)' }}>
                <Database size={24} color="#6366f1" />
              </div>
              <div className="admin-metric-content">
                <span className="admin-metric-value">{formatNumber(summary.broadcasts)}</span>
                <span className="admin-metric-label">총 방송</span>
              </div>
            </div>

            <div className="admin-metric-card">
              <div className="admin-metric-icon" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                <Radio size={24} color="#10b981" />
              </div>
              <div className="admin-metric-content">
                <span className="admin-metric-value">{formatNumber(summary.liveBroadcasts)}</span>
                <span className="admin-metric-label">현재 라이브</span>
              </div>
            </div>

            <div className="admin-metric-card">
              <div className="admin-metric-icon" style={{ background: 'rgba(236, 72, 153, 0.1)' }}>
                <Users size={24} color="#ec4899" />
              </div>
              <div className="admin-metric-content">
                <span className="admin-metric-value">{formatNumber(summary.streamers)}</span>
                <span className="admin-metric-label">스트리머</span>
              </div>
            </div>

            <div className="admin-metric-card">
              <div className="admin-metric-icon" style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
                <Eye size={24} color="#f59e0b" />
              </div>
              <div className="admin-metric-content">
                <span className="admin-metric-value">{formatNumber(summary.uniqueViewers)}</span>
                <span className="admin-metric-label">유니크 시청자</span>
              </div>
            </div>

            <div className="admin-metric-card">
              <div className="admin-metric-icon" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
                <Activity size={24} color="#3b82f6" />
              </div>
              <div className="admin-metric-content">
                <span className="admin-metric-value">{formatNumber(summary.viewingRecords)}</span>
                <span className="admin-metric-label">시청 기록</span>
              </div>
            </div>

            <div className="admin-metric-card">
              <div className="admin-metric-icon" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                <Gift size={24} color="#ef4444" />
              </div>
              <div className="admin-metric-content">
                <span className="admin-metric-value">{formatNumber(summary.donations?.count || 0)}</span>
                <span className="admin-metric-label">후원 ({formatCurrency(summary.donations?.totalAmount)})</span>
              </div>
            </div>

            <div className="admin-metric-card">
              <div className="admin-metric-icon" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
                <MessageSquare size={24} color="#8b5cf6" />
              </div>
              <div className="admin-metric-content">
                <span className="admin-metric-value">{formatNumber(summary.stats5min)}</span>
                <span className="admin-metric-label">5분 통계</span>
              </div>
            </div>

            <div className="admin-metric-card">
              <div className="admin-metric-icon" style={{ background: 'rgba(20, 184, 166, 0.1)' }}>
                <TrendingUp size={24} color="#14b8a6" />
              </div>
              <div className="admin-metric-content">
                <span className="admin-metric-value">{formatNumber(summary.broadcastChanges)}</span>
                <span className="admin-metric-label">방송 변경 기록</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 라이브 방송 탭 */}
      {activeTab === 'live' && (
        <div className="admin-section">
          <div className="admin-section-header">
            <h2>현재 라이브 방송 ({liveBroadcasts.length})</h2>
            <button className="admin-refresh-btn" onClick={fetchLiveBroadcasts}>
              <RefreshCw size={16} />
            </button>
          </div>

          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>스트리머</th>
                  <th>제목</th>
                  <th>카테고리</th>
                  <th>시청자</th>
                  <th>시작</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {liveBroadcasts.map(b => (
                  <tr key={b.broadcastId}>
                    <td>
                      <div className="admin-user-cell">
                        <span className="admin-user-name">{b.streamerNickname || b.streamerUsername}</span>
                        <span className="admin-user-id">@{b.streamerUsername}</span>
                      </div>
                    </td>
                    <td className="admin-title-cell">{b.title}</td>
                    <td>{b.category || '-'}</td>
                    <td>
                      <span className="admin-badge success">{formatNumber(b.currentViewers || b.peakViewers)}</span>
                    </td>
                    <td>{formatDate(b.startedAt)}</td>
                    <td>
                      <button
                        className="admin-action-btn"
                        onClick={() => fetchBroadcastDetail(b.broadcastId)}
                      >
                        <ChevronRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {liveBroadcasts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="admin-empty-cell">라이브 방송이 없습니다</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 최근 방송 탭 */}
      {activeTab === 'recent' && (
        <div className="admin-section">
          <div className="admin-section-header">
            <h2>최근 방송</h2>
            <button className="admin-refresh-btn" onClick={fetchRecentBroadcasts}>
              <RefreshCw size={16} />
            </button>
          </div>

          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>스트리머</th>
                  <th>제목</th>
                  <th>시청자 (최고)</th>
                  <th>방송 시간</th>
                  <th>상태</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recentBroadcasts.map(b => (
                  <tr key={b.broadcastId}>
                    <td>
                      <div className="admin-user-cell">
                        <span className="admin-user-name">{b.streamerNickname || b.streamerUsername}</span>
                      </div>
                    </td>
                    <td className="admin-title-cell">{b.title}</td>
                    <td>{formatNumber(b.peakViewers)}</td>
                    <td>{formatDuration(b.durationSeconds)}</td>
                    <td>
                      <span className={`admin-badge ${b.isLive ? 'success' : 'neutral'}`}>
                        {b.isLive ? 'LIVE' : '종료'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="admin-action-btn"
                        onClick={() => fetchBroadcastDetail(b.broadcastId)}
                      >
                        <ChevronRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 스트리머 탭 */}
      {activeTab === 'streamers' && (
        <div className="admin-section">
          <div className="admin-section-header">
            <h2>스트리머 목록 ({streamers.length})</h2>
            <button className="admin-refresh-btn" onClick={fetchStreamers}>
              <RefreshCw size={16} />
            </button>
          </div>

          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>스트리머</th>
                  <th>방송 수</th>
                  <th>최고 시청자</th>
                  <th>최근 활동</th>
                </tr>
              </thead>
              <tbody>
                {streamers.map(s => (
                  <tr key={s.id}>
                    <td>
                      <div className="admin-user-cell">
                        <span className="admin-user-name">{s.nickname || s.userId}</span>
                        <span className="admin-user-id">@{s.userId}</span>
                      </div>
                    </td>
                    <td>{s.broadcastCount || 0}</td>
                    <td>{formatNumber(s.peakViewers)}</td>
                    <td>{formatDate(s.lastSeen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 다시청자 탭 */}
      {activeTab === 'viewers' && (
        <div className="admin-section">
          <div className="admin-section-header">
            <h2>다시청 유저 TOP 50</h2>
            <button className="admin-refresh-btn" onClick={fetchTopViewers}>
              <RefreshCw size={16} />
            </button>
          </div>

          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>시청자</th>
                  <th>시청 방송 수</th>
                  <th>스트리머 수</th>
                  <th>추정 시청 시간</th>
                </tr>
              </thead>
              <tbody>
                {topViewers.map((v, idx) => (
                  <tr key={v.viewer_username}>
                    <td className="admin-rank-cell">{idx + 1}</td>
                    <td>
                      <div className="admin-user-cell">
                        <span className="admin-user-name">{v.nickname || v.viewer_username}</span>
                      </div>
                    </td>
                    <td>{v.broadcasts_watched}</td>
                    <td>{v.streamers_watched}</td>
                    <td>{formatDuration(v.estimated_watch_minutes * 60)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 방송 상세 모달 */}
      {selectedBroadcast && broadcastDetail && (
        <div className="admin-modal-overlay" onClick={() => setSelectedBroadcast(null)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>방송 상세: {broadcastDetail.broadcast?.title}</h3>
              <button className="admin-modal-close" onClick={() => setSelectedBroadcast(null)}>
                &times;
              </button>
            </div>
            <div className="admin-modal-content">
              <div className="admin-detail-grid">
                <div className="admin-detail-item">
                  <label>스트리머</label>
                  <span>{broadcastDetail.broadcast?.streamer_username}</span>
                </div>
                <div className="admin-detail-item">
                  <label>카테고리</label>
                  <span>{broadcastDetail.broadcast?.category || '-'}</span>
                </div>
                <div className="admin-detail-item">
                  <label>시작 시간</label>
                  <span>{formatDate(broadcastDetail.broadcast?.started_at)}</span>
                </div>
                <div className="admin-detail-item">
                  <label>최고 시청자</label>
                  <span>{formatNumber(broadcastDetail.broadcast?.peak_viewers)}</span>
                </div>
              </div>

              {broadcastDetail.stats5min?.length > 0 && (
                <div className="admin-detail-section">
                  <h4>5분 통계 (최근 10개)</h4>
                  <div className="admin-stats-timeline">
                    {broadcastDetail.stats5min.slice(-10).map((stat, idx) => (
                      <div key={idx} className="admin-stat-row">
                        <span className="admin-stat-time">{formatDate(stat.snapshot_at)}</span>
                        <span className="admin-stat-value">
                          <Eye size={12} /> {stat.viewer_count}
                        </span>
                        <span className="admin-stat-value">
                          <Percent size={12} /> 구독 {(stat.subscriber_ratio * 100).toFixed(1)}%
                        </span>
                        <span className="admin-stat-value">
                          <MessageSquare size={12} /> {stat.chat_count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {broadcastDetail.changes?.length > 0 && (
                <div className="admin-detail-section">
                  <h4>변경 이력</h4>
                  <div className="admin-changes-list">
                    {broadcastDetail.changes.map((change, idx) => (
                      <div key={idx} className="admin-change-item">
                        <span className="admin-change-time">{formatDate(change.changed_at)}</span>
                        <span className="admin-change-field">{change.field_name}</span>
                        <span className="admin-change-old">{change.old_value}</span>
                        <span className="admin-change-arrow">→</span>
                        <span className="admin-change-new">{change.new_value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {broadcastDetail.donations?.length > 0 && (
                <div className="admin-detail-section">
                  <h4>후원 통계</h4>
                  <div className="admin-donation-stats">
                    {broadcastDetail.donations.map((d, idx) => (
                      <div key={idx} className="admin-donation-item">
                        <span className="admin-donation-type">{d.donation_type}</span>
                        <span className="admin-donation-count">{d.count}건</span>
                        <span className="admin-donation-amount">{formatCurrency(d.total_amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .admin-analytics {
          padding: 0;
        }

        .admin-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          flex-wrap: wrap;
        }

        .admin-tab {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: rgba(255, 255, 255, 0.7);
          cursor: pointer;
          transition: all 0.2s;
        }

        .admin-tab:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .admin-tab.active {
          background: rgba(99, 102, 241, 0.2);
          border-color: #6366f1;
          color: white;
        }

        .admin-section {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 24px;
        }

        .admin-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .admin-section-header h2 {
          font-size: 18px;
          font-weight: 600;
          color: white;
          margin: 0;
        }

        .admin-refresh-btn {
          padding: 8px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: rgba(255, 255, 255, 0.7);
          cursor: pointer;
          transition: all 0.2s;
        }

        .admin-refresh-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .admin-metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 16px;
        }

        .admin-metric-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
        }

        .admin-metric-icon {
          padding: 12px;
          border-radius: 12px;
        }

        .admin-metric-content {
          display: flex;
          flex-direction: column;
        }

        .admin-metric-value {
          font-size: 24px;
          font-weight: 700;
          color: white;
        }

        .admin-metric-label {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.5);
        }

        .admin-table-container {
          overflow-x: auto;
        }

        .admin-table {
          width: 100%;
          border-collapse: collapse;
        }

        .admin-table th {
          text-align: left;
          padding: 12px 16px;
          font-size: 12px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .admin-table td {
          padding: 14px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.9);
        }

        .admin-table tr:hover td {
          background: rgba(255, 255, 255, 0.02);
        }

        .admin-user-cell {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .admin-user-name {
          font-weight: 500;
        }

        .admin-user-id {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.4);
        }

        .admin-title-cell {
          max-width: 300px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .admin-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }

        .admin-badge.success {
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
        }

        .admin-badge.neutral {
          background: rgba(148, 163, 184, 0.2);
          color: #94a3b8;
        }

        .admin-action-btn {
          padding: 6px;
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          transition: color 0.2s;
        }

        .admin-action-btn:hover {
          color: white;
        }

        .admin-rank-cell {
          font-weight: 700;
          color: rgba(255, 255, 255, 0.5);
        }

        .admin-empty-cell {
          text-align: center;
          color: rgba(255, 255, 255, 0.4);
          padding: 40px !important;
        }

        /* Modal */
        .admin-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .admin-modal {
          background: #1a1a2e;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          width: 100%;
          max-width: 700px;
          max-height: 80vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .admin-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .admin-modal-header h3 {
          margin: 0;
          font-size: 18px;
          color: white;
        }

        .admin-modal-close {
          background: none;
          border: none;
          font-size: 24px;
          color: rgba(255, 255, 255, 0.5);
          cursor: pointer;
        }

        .admin-modal-content {
          padding: 24px;
          overflow-y: auto;
        }

        .admin-detail-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        .admin-detail-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .admin-detail-item label {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
        }

        .admin-detail-item span {
          color: white;
          font-weight: 500;
        }

        .admin-detail-section {
          margin-top: 24px;
        }

        .admin-detail-section h4 {
          font-size: 14px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.7);
          margin: 0 0 12px 0;
        }

        .admin-stats-timeline {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .admin-stat-row {
          display: flex;
          gap: 16px;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 8px;
          font-size: 13px;
        }

        .admin-stat-time {
          color: rgba(255, 255, 255, 0.5);
          min-width: 100px;
        }

        .admin-stat-value {
          display: flex;
          align-items: center;
          gap: 4px;
          color: rgba(255, 255, 255, 0.8);
        }

        .admin-changes-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .admin-change-item {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 8px;
          font-size: 13px;
          align-items: center;
        }

        .admin-change-time {
          color: rgba(255, 255, 255, 0.5);
        }

        .admin-change-field {
          background: rgba(99, 102, 241, 0.2);
          color: #6366f1;
          padding: 2px 8px;
          border-radius: 4px;
        }

        .admin-change-old {
          color: rgba(239, 68, 68, 0.8);
          text-decoration: line-through;
        }

        .admin-change-arrow {
          color: rgba(255, 255, 255, 0.3);
        }

        .admin-change-new {
          color: rgba(16, 185, 129, 0.9);
        }

        .admin-donation-stats {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .admin-donation-item {
          display: flex;
          justify-content: space-between;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 8px;
        }

        .admin-donation-type {
          font-weight: 500;
        }

        .admin-donation-count {
          color: rgba(255, 255, 255, 0.6);
        }

        .admin-donation-amount {
          color: #f59e0b;
          font-weight: 600;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        .admin-loading-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px;
          color: rgba(255, 255, 255, 0.5);
          gap: 16px;
        }
      `}</style>
    </div>
  );
};

export default AdminAnalytics;
