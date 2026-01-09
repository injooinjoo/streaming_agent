import React, { useState, useEffect, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, RefreshCw, User, Mail, Calendar } from 'lucide-react';

// Mock 스트리머 데이터
const MOCK_STREAMERS = [
  { id: 1, username: '감스트', email: 'gamst@email.com', role: 'streamer', total_events: 145280, total_donations: 485000000, created_at: '2019-03-15' },
  { id: 2, username: '풍월량', email: 'pung@email.com', role: 'streamer', total_events: 132450, total_donations: 420000000, created_at: '2018-06-20' },
  { id: 3, username: '우왁굳', email: 'wak@email.com', role: 'streamer', total_events: 98760, total_donations: 380000000, created_at: '2017-09-10' },
  { id: 4, username: '침착맨', email: 'chimchak@email.com', role: 'streamer', total_events: 87650, total_donations: 320000000, created_at: '2020-01-15' },
  { id: 5, username: '주르르', email: 'jururu@email.com', role: 'streamer', total_events: 76540, total_donations: 280000000, created_at: '2021-04-22' },
  { id: 6, username: '아이리칸나', email: 'irikanna@email.com', role: 'streamer', total_events: 65430, total_donations: 220000000, created_at: '2020-08-12' },
  { id: 7, username: '섭이', email: 'sub@email.com', role: 'streamer', total_events: 54320, total_donations: 195000000, created_at: '2019-11-05' },
  { id: 8, username: '따효니', email: 'ddahyoni@email.com', role: 'streamer', total_events: 43210, total_donations: 175000000, created_at: '2020-03-20' },
  { id: 9, username: '금마', email: 'goldma@email.com', role: 'streamer', total_events: 32100, total_donations: 150000000, created_at: '2021-01-10' },
  { id: 10, username: '쫀득이', email: 'jjonduk@email.com', role: 'streamer', total_events: 21000, total_donations: 125000000, created_at: '2021-06-15' },
  { id: 11, username: '릴파', email: 'lilpa@email.com', role: 'streamer', total_events: 89760, total_donations: 340000000, created_at: '2020-05-18' },
  { id: 12, username: '비챤', email: 'vichan@email.com', role: 'streamer', total_events: 67890, total_donations: 260000000, created_at: '2021-02-14' },
  { id: 13, username: '고세구', email: 'gosegu@email.com', role: 'streamer', total_events: 78900, total_donations: 290000000, created_at: '2020-09-08' },
  { id: 14, username: '징버거', email: 'jingburger@email.com', role: 'streamer', total_events: 56780, total_donations: 210000000, created_at: '2020-11-22' },
  { id: 15, username: 'Admin', email: 'admin@streamagent.com', role: 'admin', total_events: 0, total_donations: 0, created_at: '2018-01-01' }
];

const AdminStreamers = ({ onStreamerSelect }) => {
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const limit = 10;

  const handleStreamerClick = (streamerId) => {
    if (onStreamerSelect) {
      onStreamerSelect(streamerId);
    }
  };

  // 필터링 및 정렬된 데이터
  const { streamers, totalPages, totalCount } = useMemo(() => {
    let filtered = [...MOCK_STREAMERS];

    // 검색 필터
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(s =>
        s.username.toLowerCase().includes(searchLower) ||
        s.email.toLowerCase().includes(searchLower)
      );
    }

    // 정렬
    filtered.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (sortBy === 'created_at') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });

    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / limit);
    const start = (page - 1) * limit;
    const paged = filtered.slice(start, start + limit);

    return { streamers: paged, totalPages, totalCount };
  }, [search, sortBy, sortOrder, page]);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, [search, sortBy, sortOrder, page]);

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
            placeholder="이름, 이메일로 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-search-input"
          />
          <button type="submit" className="admin-search-btn">
            검색
          </button>
        </form>
        <div className="admin-toolbar-info">
          <span>총 {totalCount.toLocaleString()}명</span>
        </div>
      </div>

      {/* Table */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('username')} className="sortable">
                <User size={14} />
                사용자명
                <SortIcon column="username" />
              </th>
              <th onClick={() => handleSort('email')} className="sortable">
                <Mail size={14} />
                이메일
                <SortIcon column="email" />
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
              <th onClick={() => handleSort('created_at')} className="sortable">
                <Calendar size={14} />
                가입일
                <SortIcon column="created_at" />
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="table-loading">
                  <RefreshCw size={20} className="spin" />
                  <span>로딩 중...</span>
                </td>
              </tr>
            ) : streamers.length === 0 ? (
              <tr>
                <td colSpan={6} className="table-empty">
                  {search ? '검색 결과가 없습니다.' : '등록된 스트리머가 없습니다.'}
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
                  <td>{streamer.email || '-'}</td>
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
