import React, { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, RefreshCw, User, Mail, Calendar, Users } from 'lucide-react';
import { API_URL } from '../../config/api';

const AdminStreamers = ({ onStreamerSelect }) => {
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('total_donations');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [streamers, setStreamers] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 10;

  useEffect(() => {
    fetchStreamers();
  }, [search, sortBy, sortOrder, page]);

  const fetchStreamers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        sortBy,
        sortOrder,
        page: page.toString(),
        limit: limit.toString()
      });

      const response = await fetch(`${API_URL}/api/streamers?${params}`);
      const data = await response.json();

      setStreamers(data.streamers || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.totalCount || 0);
    } catch (error) {
      console.error('Failed to fetch streamers:', error);
      setStreamers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStreamerClick = (streamerId) => {
    if (onStreamerSelect) {
      onStreamerSelect(streamerId);
    }
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchStreamers();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const SortIcon = ({ column }) => {
    if (sortBy !== column) return null;
    return sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  const getRoleBadge = (role) => {
    const badges = {
      admin: { label: '관리자', color: '#ef4444' },
      streamer: { label: '스트리머', color: '#6366f1' },
      advertiser: { label: '광고주', color: '#10b981' },
      user: { label: '일반', color: '#94a3b8' }
    };
    const badge = badges[role] || badges.user;
    return (
      <span className="role-badge" style={{ backgroundColor: `${badge.color}20`, color: badge.color }}>
        {badge.label}
      </span>
    );
  };

  return (
    <div className="admin-streamers">
      {/* Search & Filters */}
      <div className="admin-toolbar">
        <form onSubmit={handleSearch} className="admin-search-form">
          <input
            type="text"
            placeholder="닉네임으로 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-search-input"
          />
          <button type="submit" className="admin-search-btn">
            검색
          </button>
        </form>
        <div className="admin-toolbar-info" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span>총 {totalCount.toLocaleString()}명</span>
          <button
            onClick={fetchStreamers}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: 'var(--color-primary)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} />
            새로고침
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('username')} className="sortable">
                <User size={14} />
                닉네임
                <SortIcon column="username" />
              </th>
              <th>역할</th>
              <th onClick={() => handleSort('total_events')} className="sortable">
                총 이벤트
                <SortIcon column="total_events" />
              </th>
              <th onClick={() => handleSort('total_donations')} className="sortable">
                총 후원금
                <SortIcon column="total_donations" />
              </th>
              <th onClick={() => handleSort('first_seen')} className="sortable">
                <Calendar size={14} />
                첫 활동일
                <SortIcon column="first_seen" />
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="table-loading">
                  <RefreshCw size={20} className="spin" />
                  <span>로딩 중...</span>
                </td>
              </tr>
            ) : streamers.length === 0 ? (
              <tr>
                <td colSpan={5} className="table-empty">
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                    <Users size={48} style={{ opacity: 0.5, marginBottom: '16px' }} />
                    <p>{search ? '검색 결과가 없습니다.' : '활동 내역이 없습니다.'}</p>
                    <p style={{ fontSize: '12px' }}>플랫폼 연결 후 채팅/후원 데이터가 수집됩니다</p>
                  </div>
                </td>
              </tr>
            ) : (
              streamers.map((streamer) => (
                <tr
                  key={streamer.id}
                  className="clickable"
                  onClick={() => handleStreamerClick(streamer.id)}
                >
                  <td>
                    <div className="user-cell">
                      <div className="user-avatar">
                        {streamer.username?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <span>{streamer.username || '-'}</span>
                    </div>
                  </td>
                  <td>{getRoleBadge(streamer.role)}</td>
                  <td>{(streamer.total_events || 0).toLocaleString()}</td>
                  <td>{formatCurrency(streamer.total_donations)}</td>
                  <td>{formatDate(streamer.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="admin-pagination">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="pagination-btn"
          >
            <ChevronLeft size={18} />
            이전
          </button>
          <div className="pagination-info">
            <span>{page}</span> / <span>{totalPages}</span>
          </div>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || loading}
            className="pagination-btn"
          >
            다음
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminStreamers;
