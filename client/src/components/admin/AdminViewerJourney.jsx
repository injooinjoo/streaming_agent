import React, { useState, useEffect } from 'react';
import {
  RefreshCw, Users, Search, MessageSquare, DollarSign, Clock, Tv,
  Gamepad2, ChevronRight, ArrowLeft, Activity, Calendar, Eye
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../shared/LoadingSpinner';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const AdminViewerJourney = () => {
  const [loading, setLoading] = useState(true);
  const [viewers, setViewers] = useState([]);
  const [selectedViewer, setSelectedViewer] = useState(null);
  const [journeyData, setJourneyData] = useState(null);
  const [journeyLoading, setJourneyLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('total_chats');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState(null);

  const { accessToken } = useAuth();

  useEffect(() => {
    fetchViewers();
  }, [sortBy, page]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchViewers();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchViewers = async () => {
    setLoading(true);
    setError(null);

    const headers = {
      'Content-Type': 'application/json',
      ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
    };

    try {
      const params = new URLSearchParams({
        search,
        sortBy,
        sortOrder: 'desc',
        page: page.toString(),
        limit: '30'
      });

      const response = await fetch(`${API_BASE}/api/stats/viewers/list?${params}`, { headers });

      if (response.ok) {
        const result = await response.json();
        setViewers(result.viewers || []);
        setTotalPages(result.totalPages || 1);
        setTotalCount(result.totalCount || 0);
      } else {
        setViewers([]);
        setError('데이터를 불러오는데 실패했습니다.');
      }
    } catch (err) {
      console.error('Failed to fetch viewers:', err);
      setError('서버 연결에 실패했습니다.');
      setViewers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchViewerJourney = async (personId) => {
    setJourneyLoading(true);

    const headers = {
      'Content-Type': 'application/json',
      ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
    };

    try {
      const response = await fetch(`${API_BASE}/api/stats/viewers/${personId}/journey`, { headers });

      if (response.ok) {
        const result = await response.json();
        setJourneyData(result);
      } else {
        setJourneyData(null);
      }
    } catch (err) {
      console.error('Failed to fetch viewer journey:', err);
      setJourneyData(null);
    } finally {
      setJourneyLoading(false);
    }
  };

  const handleViewerClick = (viewer) => {
    setSelectedViewer(viewer);
    fetchViewerJourney(viewer.id);
  };

  const handleBackToList = () => {
    setSelectedViewer(null);
    setJourneyData(null);
  };

  const formatDuration = (seconds) => {
    if (!seconds || seconds === 0) return '0분';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours === 0) return `${minutes}분`;
    if (minutes === 0) return `${hours}시간`;
    return `${hours}시간 ${minutes}분`;
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num?.toLocaleString() || '0';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
    return `${Math.floor(diffDays / 30)}개월 전`;
  };

  const getPlatformLogo = (platform) => {
    const platformMap = {
      soop: '/assets/logos/soop.png',
      chzzk: '/assets/logos/chzzk.png',
      youtube: '/assets/logos/youtube.png'
    };
    return platformMap[platform?.toLowerCase()];
  };

  // Render viewer detail view
  if (selectedViewer && journeyData) {
    return (
      <div className="admin-viewer-journey">
        {/* Back Button */}
        <button className="admin-back-btn" onClick={handleBackToList}>
          <ArrowLeft size={18} />
          <span>시청자 목록으로</span>
        </button>

        {journeyLoading ? (
          <LoadingSpinner />
        ) : (
          <>
            {/* Viewer Header */}
            <div className="viewer-detail-header">
              <div className="viewer-avatar-large">
                {journeyData.viewer.profileImage ? (
                  <img src={journeyData.viewer.profileImage} alt={journeyData.viewer.nickname} />
                ) : (
                  <Users size={40} />
                )}
              </div>
              <div className="viewer-header-info">
                <h2>{journeyData.viewer.nickname}</h2>
                <div className="viewer-meta">
                  {journeyData.viewer.platform && (
                    <span className="platform-badge">
                      {getPlatformLogo(journeyData.viewer.platform) ? (
                        <img src={getPlatformLogo(journeyData.viewer.platform)} alt={journeyData.viewer.platform} />
                      ) : journeyData.viewer.platform}
                    </span>
                  )}
                  <span className="first-seen">
                    <Calendar size={14} />
                    첫 방문: {journeyData.viewer.firstSeen ? new Date(journeyData.viewer.firstSeen).toLocaleDateString('ko-KR') : '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* Total Stats Cards */}
            <div className="viewer-stats-grid">
              <div className="viewer-stat-card">
                <div className="stat-icon" style={{ backgroundColor: '#3b82f620', color: '#3b82f6' }}>
                  <Clock size={20} />
                </div>
                <div className="stat-content">
                  <span className="stat-label">총 시청 시간</span>
                  <span className="stat-value">{formatDuration(journeyData.totals.totalWatchTime)}</span>
                </div>
              </div>
              <div className="viewer-stat-card">
                <div className="stat-icon" style={{ backgroundColor: '#10b98120', color: '#10b981' }}>
                  <MessageSquare size={20} />
                </div>
                <div className="stat-content">
                  <span className="stat-label">총 채팅</span>
                  <span className="stat-value">{formatNumber(journeyData.totals.totalChats)}회</span>
                </div>
              </div>
              <div className="viewer-stat-card">
                <div className="stat-icon" style={{ backgroundColor: '#f59e0b20', color: '#f59e0b' }}>
                  <DollarSign size={20} />
                </div>
                <div className="stat-content">
                  <span className="stat-label">총 후원</span>
                  <span className="stat-value">{journeyData.totals.totalDonations}회</span>
                  <span className="stat-subvalue">{formatCurrency(journeyData.totals.totalAmount)}</span>
                </div>
              </div>
              <div className="viewer-stat-card">
                <div className="stat-icon" style={{ backgroundColor: '#8b5cf620', color: '#8b5cf6' }}>
                  <Tv size={20} />
                </div>
                <div className="stat-content">
                  <span className="stat-label">시청 채널</span>
                  <span className="stat-value">{journeyData.channels.length}개</span>
                </div>
              </div>
            </div>

            {/* Channels Watched */}
            <div className="journey-section">
              <div className="section-header">
                <Tv size={18} />
                <h3>시청한 채널</h3>
                <span className="section-count">{journeyData.channels.length}개</span>
              </div>
              <div className="journey-list">
                {journeyData.channels.length > 0 ? (
                  journeyData.channels.map((channel, index) => (
                    <div key={`${channel.channelId}-${index}`} className="journey-item">
                      <div className="journey-rank">#{index + 1}</div>
                      <div className="journey-avatar">
                        {channel.streamerImage ? (
                          <img src={channel.streamerImage} alt={channel.streamerName} />
                        ) : (
                          <Users size={24} />
                        )}
                      </div>
                      <div className="journey-info">
                        <span className="journey-name">{channel.streamerName}</span>
                        <span className="journey-meta">
                          {channel.platform && getPlatformLogo(channel.platform) && (
                            <img src={getPlatformLogo(channel.platform)} alt={channel.platform} className="platform-mini" />
                          )}
                          <span>{channel.visitCount}회 방문</span>
                        </span>
                      </div>
                      <div className="journey-value">
                        <span className="value-main">{formatDuration(channel.watchSeconds)}</span>
                        <span className="value-sub">마지막 방문: {formatRelativeTime(channel.lastVisit)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">시청 기록이 없습니다.</div>
                )}
              </div>
            </div>

            {/* Categories Watched */}
            <div className="journey-section">
              <div className="section-header">
                <Gamepad2 size={18} />
                <h3>시청한 카테고리</h3>
                <span className="section-count">{journeyData.categories.length}개</span>
              </div>
              <div className="journey-list">
                {journeyData.categories.length > 0 ? (
                  journeyData.categories.map((category, index) => (
                    <div key={`${category.categoryId}-${index}`} className="journey-item">
                      <div className="journey-rank">#{index + 1}</div>
                      <div className="journey-avatar category-avatar">
                        {category.categoryImage ? (
                          <img src={category.categoryImage} alt={category.categoryName} />
                        ) : (
                          <Gamepad2 size={24} />
                        )}
                      </div>
                      <div className="journey-info">
                        <span className="journey-name">{category.categoryName}</span>
                        <span className="journey-meta">{category.streamersWatched}개 채널에서 시청</span>
                      </div>
                      <div className="journey-value">
                        <span className="value-main">{formatDuration(category.watchSeconds)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">카테고리 기록이 없습니다.</div>
                )}
              </div>
            </div>

            {/* Engagement per Channel */}
            <div className="journey-section">
              <div className="section-header">
                <Activity size={18} />
                <h3>채널별 활동</h3>
              </div>
              <div className="engagement-table">
                <div className="engagement-header">
                  <span>채널</span>
                  <span>채팅</span>
                  <span>후원</span>
                  <span>후원 금액</span>
                  <span>마지막 활동</span>
                </div>
                {journeyData.engagement.length > 0 ? (
                  journeyData.engagement.map((eng, index) => (
                    <div key={`${eng.channelId}-${index}`} className="engagement-row">
                      <span className="engagement-channel">
                        {eng.platform && getPlatformLogo(eng.platform) && (
                          <img src={getPlatformLogo(eng.platform)} alt={eng.platform} className="platform-mini" />
                        )}
                        {eng.streamerName}
                      </span>
                      <span>{formatNumber(eng.chatCount)}회</span>
                      <span>{eng.donationCount}회</span>
                      <span className="amount">{formatCurrency(eng.donationAmount)}</span>
                      <span className="time">{formatRelativeTime(eng.lastSeen)}</span>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">활동 기록이 없습니다.</div>
                )}
              </div>
            </div>

            {/* Recent Sessions */}
            <div className="journey-section">
              <div className="section-header">
                <Eye size={18} />
                <h3>최근 시청 세션</h3>
              </div>
              <div className="sessions-list">
                {journeyData.recentSessions.length > 0 ? (
                  journeyData.recentSessions.map((session) => (
                    <div key={session.id} className="session-item">
                      <div className="session-time">
                        {session.startedAt ? new Date(session.startedAt).toLocaleString('ko-KR', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : '-'}
                      </div>
                      <div className="session-info">
                        <span className="session-channel">
                          {session.platform && getPlatformLogo(session.platform) && (
                            <img src={getPlatformLogo(session.platform)} alt={session.platform} className="platform-mini" />
                          )}
                          {session.streamerName}
                        </span>
                        {session.categoryId && (
                          <span className="session-category">{session.categoryId}</span>
                        )}
                      </div>
                      <div className="session-duration">
                        {formatDuration(session.durationSeconds)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">세션 기록이 없습니다.</div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // Render viewer list view
  return (
    <div className="admin-viewer-journey">
      {/* Toolbar */}
      <div className="admin-toolbar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="닉네임으로 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="sort-selector">
          <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1); }}>
            <option value="total_chats">채팅 수</option>
            <option value="total_amount">후원 금액</option>
            <option value="total_watch_time">시청 시간</option>
            <option value="last_activity">최근 활동</option>
          </select>
        </div>
        <button className="admin-refresh-btn" onClick={fetchViewers} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
        </button>
      </div>

      {/* Summary */}
      <div className="viewer-summary">
        <Users size={18} />
        <span>총 {formatNumber(totalCount)}명의 시청자</span>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mock-data-notice" style={{ backgroundColor: '#fef3c7', borderColor: '#f59e0b' }}>
          <span className="notice-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* Viewers List */}
          <div className="viewers-list">
            {viewers.length > 0 ? (
              viewers.map((viewer, index) => (
                <div
                  key={viewer.id}
                  className="viewer-card"
                  onClick={() => handleViewerClick(viewer)}
                >
                  <div className="viewer-rank">#{(page - 1) * 30 + index + 1}</div>
                  <div className="viewer-avatar">
                    {viewer.profileImage ? (
                      <img src={viewer.profileImage} alt={viewer.nickname} />
                    ) : (
                      <Users size={28} />
                    )}
                  </div>
                  <div className="viewer-info">
                    <span className="viewer-name">{viewer.nickname}</span>
                    <span className="viewer-meta">
                      {viewer.platform && getPlatformLogo(viewer.platform) && (
                        <img src={getPlatformLogo(viewer.platform)} alt={viewer.platform} className="platform-mini" />
                      )}
                      <span>{viewer.channelsWatched}개 채널</span>
                      <span>•</span>
                      <span>마지막 활동: {formatRelativeTime(viewer.lastActivity)}</span>
                    </span>
                  </div>
                  <div className="viewer-stats">
                    <div className="mini-stat">
                      <MessageSquare size={14} />
                      <span>{formatNumber(viewer.totalChats)}</span>
                    </div>
                    <div className="mini-stat">
                      <DollarSign size={14} />
                      <span>{formatNumber(viewer.totalAmount)}</span>
                    </div>
                    <div className="mini-stat">
                      <Clock size={14} />
                      <span>{formatDuration(viewer.totalWatchTime)}</span>
                    </div>
                  </div>
                  <ChevronRight size={18} className="viewer-arrow" />
                </div>
              ))
            ) : (
              <div className="empty-state">
                <Users size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
                <p>시청자 데이터가 없습니다.</p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>플랫폼 연결 후 시청자 데이터가 수집됩니다.</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                이전
              </button>
              <span>{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                다음
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminViewerJourney;
