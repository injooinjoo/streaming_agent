import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  DollarSign,
  Edit2,
  ExternalLink,
  Eye,
  Image as ImageIcon,
  MousePointerClick,
  Pause,
  Play,
  Target,
  TrendingUp,
  Video,
} from 'lucide-react';
import { API_URL, mockFetch } from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';
import { formatCompactKo, formatCurrency, formatCurrencyCompact, formatPercent } from '../../utils/formatters';
import './Advertiser.css';

const getAuthToken = (accessToken) =>
  accessToken || localStorage.getItem('accessToken') || localStorage.getItem('token') || null;

const parseCategories = (targetCategories) => {
  if (Array.isArray(targetCategories)) {
    return targetCategories;
  }

  if (typeof targetCategories === 'string' && targetCategories) {
    try {
      return JSON.parse(targetCategories);
    } catch {
      return [];
    }
  }

  return [];
};

const getStatusLabel = (status) => {
  switch (status) {
    case 'active':
      return '진행중';
    case 'pending':
      return '대기중';
    case 'paused':
      return '일시중지';
    case 'completed':
      return '종료';
    default:
      return status || '미정';
  }
};

const formatDate = (value) => {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const CampaignDetail = ({ campaign, onBack, onEdit, onUpdated }) => {
  const { accessToken } = useAuth();

  const [status, setStatus] = useState(campaign?.status || 'pending');
  const [stats, setStats] = useState({
    impressions: Number(campaign?.impressions || 0),
    clicks: Number(campaign?.clicks || 0),
    spent: Number(campaign?.spent ?? campaign?.budget_spent ?? 0),
    ctrLabel:
      Number(campaign?.impressions || 0) > 0
        ? formatPercent(Number(campaign?.clicks || 0) / Number(campaign?.impressions || 1), 2, { isRatio: true })
        : '0.00%',
  });
  const [loading, setLoading] = useState(true);

  const authToken = getAuthToken(accessToken);

  useEffect(() => {
    setStatus(campaign?.status || 'pending');
  }, [campaign?.status]);

  useEffect(() => {
    const fetchCampaignStats = async () => {
      if (!campaign?.id || !authToken) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const response = await mockFetch(`${API_URL}/api/ads/campaigns/${campaign.id}/stats`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        const impressions = Number(data.impressions ?? campaign.impressions ?? 0);
        const clicks = Number(data.clicks ?? campaign.clicks ?? 0);
        const spent = Number(data.total_spent ?? data.spent ?? campaign.spent ?? campaign.budget_spent ?? 0);
        const ctrLabel =
          data.ctr !== undefined
            ? formatPercent(Number(data.ctr || 0), 2)
            : impressions > 0
              ? formatPercent(clicks / impressions, 2, { isRatio: true })
              : '0.00%';

        setStats({
          impressions,
          clicks,
          spent,
          ctrLabel,
        });
      } catch (error) {
        console.error('Failed to fetch campaign stats', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCampaignStats();
  }, [authToken, campaign]);

  const handleStatusChange = async (nextStatus) => {
    if (!campaign?.id || !authToken) {
      return;
    }

    try {
      const response = await mockFetch(`${API_URL}/api/ads/campaigns/${campaign.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!response.ok) {
        return;
      }

      setStatus(nextStatus);
      onUpdated?.({ status: nextStatus });
    } catch (error) {
      console.error('Failed to update campaign status', error);
    }
  };

  const targetCategories = useMemo(() => parseCategories(campaign?.target_categories), [campaign?.target_categories]);

  const categoryLabels = {
    game: '게임',
    talk: '토크/잡담',
    music: '음악',
    art: '그림/창작',
    sports: '스포츠',
    education: '교육',
  };

  const totalBudget = Number(campaign?.budget_total || 0);
  const budgetUsagePercent = totalBudget > 0 ? Math.min(100, (stats.spent / totalBudget) * 100) : 0;

  if (!campaign) {
    return null;
  }

  return (
    <div className="animate-fade">
      <div className="campaign-detail-header">
        <div className="campaign-detail-title">
          <button type="button" className="btn-outline" style={{ padding: '10px', borderRadius: '10px' }} onClick={onBack}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1>{campaign.name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
              <span className={`campaign-status-badge ${status}`}>
                <span className="status-dot"></span>
                {getStatusLabel(status)}
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                {campaign.content_type === 'video' ? '동영상 광고' : '이미지 광고'}
              </span>
            </div>
          </div>
        </div>

        <div className="campaign-detail-actions">
          {status === 'active' ? (
            <button className="btn-outline" onClick={() => handleStatusChange('paused')}>
              <Pause size={16} /> 일시중지
            </button>
          ) : null}

          {status === 'paused' ? (
            <button className="btn-outline" onClick={() => handleStatusChange('active')}>
              <Play size={16} /> 다시 시작
            </button>
          ) : null}

          <button className="btn-primary" onClick={onEdit}>
            <Edit2 size={16} /> 수정
          </button>
        </div>
      </div>

      <div className="campaign-stats-grid" style={{ marginBottom: '24px' }}>
        <div className="campaign-stat-card">
          <div className="campaign-stat-header">
            <span>총 노출</span>
            <div className="campaign-stat-icon blue">
              <Eye size={18} />
            </div>
          </div>
          <span className="campaign-stat-value">{formatCompactKo(stats.impressions)}</span>
        </div>

        <div className="campaign-stat-card">
          <div className="campaign-stat-header">
            <span>총 클릭</span>
            <div className="campaign-stat-icon green">
              <MousePointerClick size={18} />
            </div>
          </div>
          <span className="campaign-stat-value">{formatCompactKo(stats.clicks)}</span>
        </div>

        <div className="campaign-stat-card">
          <div className="campaign-stat-header">
            <span>CTR</span>
            <div className="campaign-stat-icon orange">
              <TrendingUp size={18} />
            </div>
          </div>
          <span className="campaign-stat-value">{stats.ctrLabel}</span>
        </div>

        <div className="campaign-stat-card">
          <div className="campaign-stat-header">
            <span>집행액</span>
            <div className="campaign-stat-icon purple">
              <DollarSign size={18} />
            </div>
          </div>
          <span className="campaign-stat-value">{formatCurrencyCompact(stats.spent)}</span>
        </div>
      </div>

      <div className="campaign-detail-grid">
        <div>
          <div className="campaign-detail-card" style={{ marginBottom: '24px' }}>
            <h3>
              <BarChart3 size={18} /> 성과 요약
            </h3>
            <div className="chart-placeholder">
              {loading ? <span>데이터를 불러오는 중입니다...</span> : <span>일별 성과 차트는 다음 단계에서 연결할 수 있습니다.</span>}
            </div>
          </div>

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
                <div style={{ padding: '40px', color: 'var(--text-muted)' }}>등록된 광고 소재가 없습니다.</div>
              )}
            </div>

            {campaign.click_url ? (
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
                    fontWeight: '500',
                  }}
                >
                  <ExternalLink size={14} />
                  랜딩 페이지 열기
                </a>
              </div>
            ) : null}
          </div>
        </div>

        <div>
          <div className="campaign-detail-card" style={{ marginBottom: '24px' }}>
            <h3>
              <DollarSign size={18} /> 예산 정보
            </h3>
            <div className="campaign-info-list">
              <div className="campaign-info-item">
                <span className="campaign-info-label">총 예산</span>
                <span className="campaign-info-value">{formatCurrency(totalBudget)}</span>
              </div>
              <div className="campaign-info-item">
                <span className="campaign-info-label">일일 예산</span>
                <span className="campaign-info-value">
                  {Number(campaign.budget_daily || 0) > 0 ? formatCurrency(campaign.budget_daily) : '제한 없음'}
                </span>
              </div>
              <div className="campaign-info-item">
                <span className="campaign-info-label">CPM</span>
                <span className="campaign-info-value">{formatCurrency(campaign.cpm)}</span>
              </div>
              <div className="campaign-info-item">
                <span className="campaign-info-label">CPC</span>
                <span className="campaign-info-value">{formatCurrency(campaign.cpc)}</span>
              </div>
              <div className="campaign-info-item">
                <span className="campaign-info-label">예산 소진율</span>
                <span className="campaign-info-value">{formatPercent(budgetUsagePercent, 1)}</span>
              </div>
            </div>

            <div style={{ marginTop: '16px' }}>
              <div
                style={{
                  height: '8px',
                  background: 'var(--bg-sidebar)',
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${budgetUsagePercent}%`,
                    height: '100%',
                    background: budgetUsagePercent > 90 ? '#ef4444' : budgetUsagePercent > 70 ? '#f97316' : '#10b981',
                    borderRadius: '4px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '8px',
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                }}
              >
                <span>{formatCurrency(stats.spent)} 사용</span>
                <span>{formatCurrency(Math.max(0, totalBudget - stats.spent))} 남음</span>
              </div>
            </div>
          </div>

          <div className="campaign-detail-card" style={{ marginBottom: '24px' }}>
            <h3>
              <Calendar size={18} /> 집행 일정
            </h3>
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

          <div className="campaign-detail-card">
            <h3>
              <Target size={18} /> 타겟팅
            </h3>
            <div className="campaign-info-list">
              <div className="campaign-info-item">
                <span className="campaign-info-label">스트리머 범위</span>
                <span className="campaign-info-value">
                  {campaign.target_streamers === 'all' ? '전체 스트리머' : '선택한 스트리머만'}
                </span>
              </div>

              {targetCategories.length > 0 ? (
                <div className="campaign-info-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                  <span className="campaign-info-label">카테고리</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {targetCategories.map((category) => (
                      <span
                        key={category}
                        style={{
                          padding: '4px 10px',
                          background: 'var(--primary-light)',
                          color: 'var(--primary)',
                          borderRadius: '50px',
                          fontSize: '12px',
                          fontWeight: '500',
                        }}
                      >
                        {categoryLabels[category] || category}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignDetail;
