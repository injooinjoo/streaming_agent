import { useState, useEffect } from 'react';
import {
  RefreshCw,
  Check,
  X,
  Eye,
  Clock,
  User,
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
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import './AdminDesignReview.css';

const API_URL = import.meta.env.VITE_API_URL || '';

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

const quickRejectReasons = [
  '저작권 문제가 있습니다.',
  '품질이 마켓플레이스 기준에 미달합니다.',
  '부적절한 콘텐츠가 포함되어 있습니다.',
  '기술적 문제가 발견되었습니다.',
  '유사한 디자인이 이미 등록되어 있습니다.'
];

const AdminDesignReview = () => {
  const { token } = useAuth();
  const [designs, setDesigns] = useState([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  // Modal states
  const [showRejectModal, setShowRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showPreviewModal, setShowPreviewModal] = useState(null);
  const [expandedDesign, setExpandedDesign] = useState(null);

  const fetchPendingDesigns = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/designs/pending`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setDesigns(data.designs || []);
      }
    } catch (err) {
      console.error('Failed to fetch pending designs:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/designs/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setStats(data.stats || { pending: 0, approved: 0, rejected: 0 });
      }
    } catch (err) {
      console.error('Failed to fetch design stats:', err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchPendingDesigns();
      fetchStats();
    }
  }, [token]);

  const handleApprove = async (designId) => {
    if (!confirm('이 디자인을 승인하시겠습니까?\n승인 시 마켓플레이스에 바로 등록됩니다.')) return;

    setActionLoading(designId);
    try {
      const res = await fetch(`${API_URL}/api/admin/designs/${designId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        setDesigns(designs.filter(d => d.id !== designId));
        fetchStats();
        alert('승인되었습니다. 마켓플레이스에 등록되었습니다.');
      } else {
        const data = await res.json();
        alert(data.error || '승인에 실패했습니다.');
      }
    } catch (err) {
      alert('오류가 발생했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!showRejectModal || !rejectReason.trim()) {
      alert('거절 사유를 입력해주세요.');
      return;
    }

    setActionLoading(showRejectModal.id);
    try {
      const res = await fetch(`${API_URL}/api/admin/designs/${showRejectModal.id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason: rejectReason })
      });

      if (res.ok) {
        setDesigns(designs.filter(d => d.id !== showRejectModal.id));
        fetchStats();
        setShowRejectModal(null);
        setRejectReason('');
        alert('거절되었습니다. 사용자에게 사유가 전달됩니다.');
      } else {
        const data = await res.json();
        alert(data.error || '거절에 실패했습니다.');
      }
    } catch (err) {
      alert('오류가 발생했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  const getCategoryInfo = (category) => categoryConfig[category] || { label: category, icon: <Package size={16} /> };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (hours < 1) return '방금 전';
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString('ko-KR');
  };

  const parseDesignData = (data) => {
    if (!data) return {};
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch {
        return {};
      }
    }
    return data;
  };

  return (
    <div className="admin-design-review">
      {/* 헤더 */}
      <div className="review-header">
        <div className="review-header-left">
          <h2>디자인 심사</h2>
          <span className="pending-count">{stats.pending}건 대기중</span>
        </div>
        <button
          className="refresh-btn"
          onClick={() => { fetchPendingDesigns(); fetchStats(); }}
          disabled={loading}
        >
          <RefreshCw size={18} className={loading ? 'spin' : ''} />
          새로고침
        </button>
      </div>

      {/* 통계 카드 */}
      <div className="review-stats">
        <div className="stat-card pending">
          <Clock size={20} />
          <div className="stat-info">
            <span className="stat-value">{stats.pending}</span>
            <span className="stat-label">심사 대기</span>
          </div>
        </div>
        <div className="stat-card approved">
          <Check size={20} />
          <div className="stat-info">
            <span className="stat-value">{stats.approved}</span>
            <span className="stat-label">승인됨</span>
          </div>
        </div>
        <div className="stat-card rejected">
          <X size={20} />
          <div className="stat-info">
            <span className="stat-value">{stats.rejected}</span>
            <span className="stat-label">거절됨</span>
          </div>
        </div>
      </div>

      {/* 디자인 목록 */}
      <div className="review-list">
        {loading ? (
          <div className="review-loading">
            <RefreshCw size={32} className="spin" />
            <p>불러오는 중...</p>
          </div>
        ) : designs.length === 0 ? (
          <div className="review-empty">
            <Check size={48} />
            <h3>심사 대기 중인 디자인이 없습니다</h3>
            <p>모든 디자인이 처리되었습니다.</p>
          </div>
        ) : (
          designs.map(design => {
            const categoryInfo = getCategoryInfo(design.category);
            const designData = parseDesignData(design.design_data);
            const isExpanded = expandedDesign === design.id;

            return (
              <div key={design.id} className="review-card">
                <div className="review-card-main">
                  {/* 썸네일 */}
                  <div className="review-thumbnail">
                    {design.thumbnail_url ? (
                      <img src={design.thumbnail_url} alt={design.name} />
                    ) : (
                      <div className="thumbnail-placeholder">
                        {categoryInfo.icon}
                      </div>
                    )}
                  </div>

                  {/* 정보 */}
                  <div className="review-info">
                    <div className="review-title-row">
                      <h3>{design.name}</h3>
                      <span className="category-badge">
                        {categoryInfo.icon}
                        {categoryInfo.label}
                      </span>
                    </div>

                    {design.description && (
                      <p className="review-description">{design.description}</p>
                    )}

                    <div className="review-meta">
                      <span className="meta-item">
                        <User size={14} />
                        {design.user_email || '알 수 없음'}
                      </span>
                      <span className="meta-item">
                        <Clock size={14} />
                        {formatDate(design.submitted_at)}
                      </span>
                    </div>

                    {design.tags && (
                      <div className="review-tags">
                        {design.tags.split(',').map((tag, i) => (
                          <span key={i} className="tag">{tag.trim()}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 액션 버튼 */}
                  <div className="review-actions">
                    <button
                      className="action-btn preview"
                      onClick={() => setShowPreviewModal(design)}
                      title="미리보기"
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      className="action-btn approve"
                      onClick={() => handleApprove(design.id)}
                      disabled={actionLoading === design.id}
                      title="승인"
                    >
                      {actionLoading === design.id ? (
                        <RefreshCw size={18} className="spin" />
                      ) : (
                        <Check size={18} />
                      )}
                      승인
                    </button>
                    <button
                      className="action-btn reject"
                      onClick={() => { setShowRejectModal(design); setRejectReason(''); }}
                      disabled={actionLoading === design.id}
                      title="거절"
                    >
                      <X size={18} />
                      거절
                    </button>
                    <button
                      className="expand-btn"
                      onClick={() => setExpandedDesign(isExpanded ? null : design.id)}
                    >
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>
                </div>

                {/* 확장된 상세 정보 */}
                {isExpanded && (
                  <div className="review-card-detail">
                    <div className="detail-section">
                      <h4>디자인 데이터</h4>
                      <pre className="json-preview">
                        {JSON.stringify(designData, null, 2)}
                      </pre>
                    </div>
                    {design.custom_css && (
                      <div className="detail-section">
                        <h4>커스텀 CSS</h4>
                        <pre className="css-preview">
                          {design.custom_css}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 거절 모달 */}
      {showRejectModal && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(null)}>
          <div className="modal-content reject-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>디자인 거절</h3>
              <button className="modal-close" onClick={() => setShowRejectModal(null)}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="reject-design-name">
                <strong>{showRejectModal.name}</strong>
              </div>

              <div className="quick-reasons">
                <p>빠른 선택:</p>
                <div className="quick-reason-buttons">
                  {quickRejectReasons.map((reason, i) => (
                    <button
                      key={i}
                      className={`quick-reason-btn ${rejectReason === reason ? 'active' : ''}`}
                      onClick={() => setRejectReason(reason)}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>

              <div className="reason-input">
                <label>거절 사유 (필수)</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="거절 사유를 입력하세요. 사용자에게 전달됩니다."
                  rows={4}
                />
              </div>

              <div className="reject-warning">
                <AlertCircle size={16} />
                <span>거절 사유는 디자인 제출자에게 전달됩니다.</span>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="modal-btn secondary"
                onClick={() => setShowRejectModal(null)}
              >
                취소
              </button>
              <button
                className="modal-btn danger"
                onClick={handleReject}
                disabled={!rejectReason.trim() || actionLoading === showRejectModal.id}
              >
                {actionLoading === showRejectModal.id ? (
                  <RefreshCw size={16} className="spin" />
                ) : (
                  <X size={16} />
                )}
                거절하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 미리보기 모달 */}
      {showPreviewModal && (
        <div className="modal-overlay" onClick={() => setShowPreviewModal(null)}>
          <div className="modal-content preview-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>디자인 미리보기</h3>
              <button className="modal-close" onClick={() => setShowPreviewModal(null)}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="preview-canvas">
                {/* 간단한 미리보기 렌더링 */}
                <div className="preview-placeholder">
                  {getCategoryInfo(showPreviewModal.category).icon}
                  <p>{showPreviewModal.name}</p>
                  <span>{getCategoryInfo(showPreviewModal.category).label} 미리보기</span>
                </div>
              </div>
              {showPreviewModal.custom_css && (
                <style>{showPreviewModal.custom_css}</style>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="modal-btn secondary"
                onClick={() => setShowPreviewModal(null)}
              >
                닫기
              </button>
              <button
                className="modal-btn primary"
                onClick={() => {
                  handleApprove(showPreviewModal.id);
                  setShowPreviewModal(null);
                }}
              >
                <Check size={16} />
                승인하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDesignReview;
