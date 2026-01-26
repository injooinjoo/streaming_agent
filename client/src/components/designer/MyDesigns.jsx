import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Send,
  ChevronLeft,
  RefreshCw,
  MessageSquare,
  Bell,
  Target,
  Type,
  Subtitles,
  Circle,
  Smile,
  BarChart,
  Film,
  Monitor,
  Package,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Eye
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../shared/LoadingSpinner';
import './MyDesigns.css';

const API_URL = import.meta.env.VITE_API_URL || '';

const statusConfig = {
  draft: { label: '임시저장', color: 'gray', icon: <Edit size={14} /> },
  pending: { label: '심사중', color: 'yellow', icon: <Clock size={14} /> },
  approved: { label: '승인됨', color: 'green', icon: <CheckCircle size={14} /> },
  rejected: { label: '거절됨', color: 'red', icon: <XCircle size={14} /> },
  archived: { label: '보관됨', color: 'gray', icon: <Circle size={14} /> }
};

const categoryConfig = {
  chat: { label: '채팅', icon: <MessageSquare size={16} /> },
  alert: { label: '알림', icon: <Bell size={16} /> },
  goal: { label: '목표', icon: <Target size={16} /> },
  ticker: { label: '전광판', icon: <Type size={16} /> },
  subtitle: { label: '자막', icon: <Subtitles size={16} /> },
  roulette: { label: '룰렛', icon: <Circle size={16} /> },
  emoji: { label: '이모지', icon: <Smile size={16} /> },
  voting: { label: '투표', icon: <BarChart size={16} /> },
  credits: { label: '크레딧', icon: <Film size={16} /> },
  ad: { label: '광고', icon: <Monitor size={16} /> },
  package: { label: '패키지', icon: <Package size={16} /> }
};

const MyDesigns = () => {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(null);

  const { user, token } = useAuth();
  const navigate = useNavigate();

  const fetchDesigns = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') {
        params.append('status', filterStatus);
      }

      const res = await fetch(`${API_URL}/api/designs?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setDesigns(data.designs || []);
      }
    } catch (err) {
      console.error('Failed to fetch designs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDesigns();
  }, [token, filterStatus]);

  const handleDelete = async (designId) => {
    if (!confirm('정말 이 디자인을 삭제하시겠습니까?')) return;

    try {
      const res = await fetch(`${API_URL}/api/designs/${designId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        setDesigns(designs.filter(d => d.id !== designId));
      } else {
        const data = await res.json();
        alert(data.error || '삭제에 실패했습니다.');
      }
    } catch (err) {
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const handleSubmit = async (designId) => {
    if (!confirm('이 디자인을 마켓플레이스 심사에 제출하시겠습니까?')) return;

    try {
      const res = await fetch(`${API_URL}/api/designs/${designId}/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        fetchDesigns();
        alert('심사에 제출되었습니다.');
      } else {
        const data = await res.json();
        alert(data.error || '제출에 실패했습니다.');
      }
    } catch (err) {
      alert('제출 중 오류가 발생했습니다.');
    }
  };

  const filteredDesigns = designs.filter(design => {
    const matchesSearch = design.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (design.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const getCategoryInfo = (category) => categoryConfig[category] || { label: category, icon: <Package size={16} /> };
  const getStatusInfo = (status) => statusConfig[status] || statusConfig.draft;

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return '오늘';
    if (days === 1) return '어제';
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString('ko-KR');
  };

  return (
    <div className="my-designs-container">
      {/* 헤더 */}
      <header className="my-designs-header">
        <div className="header-left">
          <Link to="/" className="back-button">
            <ChevronLeft size={20} />
            대시보드
          </Link>
        </div>
        <div className="header-center">
          <h1 className="page-title">내 디자인</h1>
          <p className="page-subtitle">만든 오버레이 디자인을 관리하세요</p>
        </div>
        <div className="header-right">
          <Link to="/designer" className="create-button">
            <Plus size={18} />
            새 디자인 만들기
          </Link>
        </div>
      </header>

      {/* 필터 영역 */}
      <div className="my-designs-filters">
        <div className="search-bar">
          <Search size={18} />
          <input
            type="text"
            placeholder="디자인 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-tabs">
          <button
            className={`filter-tab ${filterStatus === 'all' ? 'active' : ''}`}
            onClick={() => setFilterStatus('all')}
          >
            전체
          </button>
          {Object.entries(statusConfig).map(([status, config]) => (
            <button
              key={status}
              className={`filter-tab ${filterStatus === status ? 'active' : ''} status-${config.color}`}
              onClick={() => setFilterStatus(status)}
            >
              {config.icon}
              {config.label}
            </button>
          ))}
        </div>

        <button onClick={fetchDesigns} className="refresh-button" disabled={loading}>
          <RefreshCw size={18} className={loading ? 'spin' : ''} />
        </button>
      </div>

      {/* 디자인 목록 */}
      <div className="designs-list">
        {loading ? (
          <LoadingSpinner />
        ) : filteredDesigns.length === 0 ? (
          <div className="empty-state">
            <Package size={48} />
            <h3>디자인이 없습니다</h3>
            <p>새 디자인을 만들어보세요!</p>
            <Link to="/designer" className="empty-create-button">
              <Plus size={18} />
              새 디자인 만들기
            </Link>
          </div>
        ) : (
          <div className="designs-grid">
            {filteredDesigns.map(design => {
              const categoryInfo = getCategoryInfo(design.category);
              const statusInfo = getStatusInfo(design.status);
              const canEdit = design.status === 'draft' || design.status === 'rejected';
              const canDelete = design.status !== 'pending';
              const canSubmit = design.status === 'draft' || design.status === 'rejected';

              return (
                <div key={design.id} className="design-card">
                  <div className="design-thumbnail">
                    {design.thumbnail_url ? (
                      <img src={design.thumbnail_url} alt={design.name} />
                    ) : (
                      <div className="thumbnail-placeholder">
                        {categoryInfo.icon}
                      </div>
                    )}
                    <div className={`status-badge ${statusInfo.color}`}>
                      {statusInfo.icon}
                      {statusInfo.label}
                    </div>
                    <div className="category-badge">
                      {categoryInfo.label}
                    </div>
                  </div>

                  <div className="design-content">
                    <h3 className="design-name">{design.name}</h3>
                    {design.description && (
                      <p className="design-description">{design.description}</p>
                    )}

                    <div className="design-meta">
                      <span className="meta-item">
                        {formatDate(design.updated_at || design.created_at)}
                      </span>
                      {design.submitted_at && design.status === 'pending' && (
                        <span className="meta-item pending-info">
                          {formatDate(design.submitted_at)} 제출
                        </span>
                      )}
                    </div>

                    {/* 거절 사유 표시 */}
                    {design.status === 'rejected' && design.rejection_reason && (
                      <div className="rejection-reason">
                        <AlertCircle size={14} />
                        <span>거절 사유: {design.rejection_reason}</span>
                        <button
                          className="view-reason-button"
                          onClick={() => setShowRejectModal(design)}
                        >
                          자세히
                        </button>
                      </div>
                    )}

                    <div className="design-actions">
                      {canEdit && (
                        <button
                          className="action-button edit"
                          onClick={() => navigate(`/designer/${design.id}`)}
                          title="편집"
                        >
                          <Edit size={16} />
                          편집
                        </button>
                      )}

                      <button
                        className="action-button preview"
                        onClick={() => navigate(`/designer/${design.id}?preview=true`)}
                        title="미리보기"
                      >
                        <Eye size={16} />
                        미리보기
                      </button>

                      {canSubmit && (
                        <button
                          className="action-button submit"
                          onClick={() => handleSubmit(design.id)}
                          title="심사 제출"
                        >
                          <Send size={16} />
                          {design.status === 'rejected' ? '재제출' : '공유하기'}
                        </button>
                      )}

                      {canDelete && (
                        <button
                          className="action-button delete"
                          onClick={() => handleDelete(design.id)}
                          title="삭제"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 거절 사유 모달 */}
      {showRejectModal && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>거절 사유</h3>
              <button className="modal-close" onClick={() => setShowRejectModal(null)}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="reject-design-info">
                <strong>{showRejectModal.name}</strong>
                <span className="reject-date">
                  {formatDate(showRejectModal.reviewed_at)} 거절됨
                </span>
              </div>
              <div className="reject-reason-text">
                {showRejectModal.rejection_reason}
              </div>
              <p className="reject-help">
                거절 사유를 확인하고 디자인을 수정한 후 다시 제출할 수 있습니다.
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="modal-button secondary"
                onClick={() => setShowRejectModal(null)}
              >
                닫기
              </button>
              <button
                className="modal-button primary"
                onClick={() => {
                  navigate(`/designer/${showRejectModal.id}`);
                  setShowRejectModal(null);
                }}
              >
                수정하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyDesigns;
