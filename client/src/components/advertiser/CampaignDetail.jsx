import { useState, useEffect } from 'react';
import {
  ArrowLeft, Edit2, Eye, MousePointerClick, DollarSign, TrendingUp,
  Calendar, Target, ExternalLink, Pause, Play, BarChart3,
  Image as ImageIcon, Video
} from 'lucide-react';
import { API_URL } from '../../config/api';
import './Advertiser.css';

const CampaignDetail = ({ campaign, onBack, onEdit }) => {
  const [stats, setStats] = useState({
    impressions: 0,
    clicks: 0,
    spent: 0,
    ctr: 0,
    daily: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (campaign?.id) {
      fetchCampaignStats();
    }
  }, [campaign]);

  const fetchCampaignStats = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/ads/campaigns/${campaign.id}/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats({
          impressions: data.impressions || campaign.impressions || 0,
          clicks: data.clicks || campaign.clicks || 0,
          spent: data.spent || campaign.spent || 0,
          ctr: data.ctr || (data.impressions > 0 ? ((data.clicks / data.impressions) * 100).toFixed(2) : 0),
          daily: data.daily || []
        });
      } else {
        // Use campaign data as fallback
        setStats({
          impressions: campaign.impressions || 0,
          clicks: campaign.clicks || 0,
          spent: campaign.spent || 0,
          ctr: campaign.impressions > 0 ? ((campaign.clicks / campaign.impressions) * 100).toFixed(2) : 0,
          daily: []
        });
      }
    } catch (err) {
      console.error('Failed to fetch campaign stats', err);
      setStats({
        impressions: campaign.impressions || 0,
        clicks: campaign.clicks || 0,
        spent: campaign.spent || 0,
        ctr: campaign.impressions > 0 ? ((campaign.clicks / campaign.impressions) * 100).toFixed(2) : 0,
        daily: []
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/ads/campaigns/${campaign.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        // Update local state
        campaign.status = newStatus;
        fetchCampaignStats();
      }
    } catch (err) {
      console.error('Failed to update campaign status', err);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num?.toLocaleString() || '0';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'active': return '활성';
      case 'pending': return '대기중';
      case 'paused': return '일시정지';
      case 'completed': return '완료됨';
      default: return status;
    }
  };

  const targetCategories = (() => {
    try {
      return campaign.target_categories ? JSON.parse(campaign.target_categories) : [];
    } catch {
      return [];
    }
  })();

  const categoryLabels = {
    game: '게임',
    talk: '토크/잡담',
    music: '음악',
    art: '그림/창작',
    sports: '스포츠',
    education: '교육'
  };

  const budgetUsagePercent = campaign.budget_total > 0
    ? Math.min(100, (stats.spent / campaign.budget_total) * 100)
    : 0;

  return (
    <div className="animate-fade">
      <div className="campaign-detail-header">
        <div className="campaign-detail-title">
          <button
            className="btn-outline"
            style={{ padding: '10px', borderRadius: '10px' }}
            onClick={onBack}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1>{campaign.name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
              <span className={`campaign-status-badge ${campaign.status}`}>
                <span className="status-dot"></span>
                {getStatusLabel(campaign.status)}
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                {campaign.content_type === 'video' ? '영상 광고' : '이미지 광고'}
              </span>
            </div>
          </div>
        </div>
        <div className="campaign-detail-actions">
          {campaign.status === 'active' ? (
            <button
              className="btn-outline"
              onClick={() => handleStatusChange('paused')}
            >
              <Pause size={16} /> 일시정지
            </button>
          ) : campaign.status === 'paused' ? (
            <button
              className="btn-outline"
              onClick={() => handleStatusChange('active')}
            >
              <Play size={16} /> 재시작
            </button>
          ) : null}
          <button className="btn-primary" onClick={onEdit}>
            <Edit2 size={16} /> 수정
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="campaign-stats-grid" style={{ marginBottom: '24px' }}>
        <div className="campaign-stat-card">
          <div className="campaign-stat-header">
            <span>총 노출</span>
            <div className="campaign-stat-icon blue">
              <Eye size={18} />
            </div>
          </div>
          <span className="campaign-stat-value">{formatNumber(stats.impressions)}</span>
        </div>
        <div className="campaign-stat-card">
          <div className="campaign-stat-header">
            <span>총 클릭</span>
            <div className="campaign-stat-icon green">
              <MousePointerClick size={18} />
            </div>
          </div>
          <span className="campaign-stat-value">{formatNumber(stats.clicks)}</span>
        </div>
        <div className="campaign-stat-card">
          <div className="campaign-stat-header">
            <span>CTR</span>
            <div className="campaign-stat-icon orange">
              <TrendingUp size={18} />
            </div>
          </div>
          <span className="campaign-stat-value">{stats.ctr}%</span>
        </div>
        <div className="campaign-stat-card">
          <div className="campaign-stat-header">
            <span>지출 금액</span>
            <div className="campaign-stat-icon purple">
              <DollarSign size={18} />
            </div>
          </div>
          <span className="campaign-stat-value">₩{formatNumber(stats.spent)}</span>
        </div>
      </div>

      <div className="campaign-detail-grid">
        {/* Left Column - Performance & Preview */}
        <div>
          {/* Performance Chart */}
          <div className="campaign-detail-card" style={{ marginBottom: '24px' }}>
            <h3><BarChart3 size={18} /> 성과 추이</h3>
            <div className="chart-placeholder">
              {loading ? (
                <span>데이터 로딩 중...</span>
              ) : stats.daily && stats.daily.length > 0 ? (
                <span>차트 데이터 준비됨 (차트 라이브러리 연동 필요)</span>
              ) : (
                <span>아직 충분한 데이터가 없습니다.</span>
              )}
            </div>
          </div>

          {/* Ad Preview */}
          <div className="campaign-detail-card">
            <h3>
              {campaign.content_type === 'video' ? <Video size={18} /> : <ImageIcon size={18} />}
              광고 미리보기
            </h3>
            <div className="campaign-preview">
              {campaign.content_url ? (
                campaign.content_type === 'video' ? (
                  <video src={campaign.content_url} controls style={{ maxWidth: '100%' }} />
                ) : (
                  <img src={campaign.content_url} alt={campaign.name} style={{ maxWidth: '100%' }} />
                )
              ) : (
                <div style={{ padding: '40px', color: 'var(--text-muted)' }}>
                  미리보기 이미지 없음
                </div>
              )}
            </div>
            {campaign.click_url && (
              <div style={{ marginTop: '16px', textAlign: 'center' }}>
                <a
                  href={campaign.click_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: 'var(--primary)',
                    fontSize: '13px',
                    fontWeight: '500'
                  }}
                >
                  <ExternalLink size={14} />
                  랜딩 페이지 열기
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Campaign Info */}
        <div>
          {/* Budget Info */}
          <div className="campaign-detail-card" style={{ marginBottom: '24px' }}>
            <h3><DollarSign size={18} /> 예산 정보</h3>
            <div className="campaign-info-list">
              <div className="campaign-info-item">
                <span className="campaign-info-label">총 예산</span>
                <span className="campaign-info-value">₩{campaign.budget_total?.toLocaleString()}</span>
              </div>
              <div className="campaign-info-item">
                <span className="campaign-info-label">일일 예산</span>
                <span className="campaign-info-value">
                  {campaign.budget_daily > 0 ? `₩${(campaign.budget_daily || 0).toLocaleString()}` : '제한 없음'}
                </span>
              </div>
              <div className="campaign-info-item">
                <span className="campaign-info-label">CPM</span>
                <span className="campaign-info-value">₩{campaign.cpm?.toLocaleString()}</span>
              </div>
              <div className="campaign-info-item">
                <span className="campaign-info-label">CPC</span>
                <span className="campaign-info-value">₩{campaign.cpc?.toLocaleString()}</span>
              </div>
              <div className="campaign-info-item">
                <span className="campaign-info-label">예산 소진율</span>
                <span className="campaign-info-value">{budgetUsagePercent.toFixed(1)}%</span>
              </div>
            </div>
            <div style={{ marginTop: '16px' }}>
              <div style={{
                height: '8px',
                background: 'var(--bg-sidebar)',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${budgetUsagePercent}%`,
                  height: '100%',
                  background: budgetUsagePercent > 90 ? '#ef4444' : budgetUsagePercent > 70 ? '#f97316' : '#10b981',
                  borderRadius: '4px',
                  transition: 'width 0.3s ease'
                }} />
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '8px',
                fontSize: '12px',
                color: 'var(--text-muted)'
              }}>
                <span>₩{stats.spent?.toLocaleString()} 사용</span>
                <span>₩{(campaign.budget_total - stats.spent)?.toLocaleString()} 남음</span>
              </div>
            </div>
          </div>

          {/* Schedule Info */}
          <div className="campaign-detail-card" style={{ marginBottom: '24px' }}>
            <h3><Calendar size={18} /> 기간</h3>
            <div className="campaign-info-list">
              <div className="campaign-info-item">
                <span className="campaign-info-label">시작일</span>
                <span className="campaign-info-value">{formatDate(campaign.start_date)}</span>
              </div>
              <div className="campaign-info-item">
                <span className="campaign-info-label">종료일</span>
                <span className="campaign-info-value">{formatDate(campaign.end_date)}</span>
              </div>
              <div className="campaign-info-item">
                <span className="campaign-info-label">생성일</span>
                <span className="campaign-info-value">{formatDate(campaign.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Targeting Info */}
          <div className="campaign-detail-card">
            <h3><Target size={18} /> 타겟팅</h3>
            <div className="campaign-info-list">
              <div className="campaign-info-item">
                <span className="campaign-info-label">노출 대상</span>
                <span className="campaign-info-value">
                  {campaign.target_streamers === 'all' ? '전체 스트리머' : '선택한 스트리머'}
                </span>
              </div>
              {targetCategories.length > 0 && (
                <div className="campaign-info-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                  <span className="campaign-info-label">타겟 카테고리</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {targetCategories.map(cat => (
                      <span
                        key={cat}
                        style={{
                          padding: '4px 10px',
                          background: 'var(--primary-light)',
                          color: 'var(--primary)',
                          borderRadius: '50px',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}
                      >
                        {categoryLabels[cat] || cat}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignDetail;
