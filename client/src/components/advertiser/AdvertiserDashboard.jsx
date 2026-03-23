import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  DollarSign,
  Edit2,
  Eye,
  Image as ImageIcon,
  Layout,
  LogIn,
  Megaphone,
  MousePointerClick,
  Pause,
  Play,
  Plus,
  Receipt,
  Search,
  Settings,
  Trash2,
  TrendingUp,
  Video,
} from 'lucide-react';
import { API_URL, mockFetch } from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';
import { formatCompactKo, formatCurrencyCompact, formatPercent } from '../../utils/formatters';
import LoadingSpinner from '../shared/LoadingSpinner';
import ServiceBar from '../shared/ServiceBar';
import AdvertiserBillingPanel from './AdvertiserBillingPanel';
import CampaignCreate from './CampaignCreate';
import CampaignDetail from './CampaignDetail';
import '../Dashboard.css';
import './Advertiser.css';

const getAuthToken = (accessToken) =>
  accessToken || localStorage.getItem('accessToken') || localStorage.getItem('token') || null;

const getCampaignSpent = (campaign) => Number(campaign?.spent ?? campaign?.total_spent ?? campaign?.budget_spent ?? 0);

const normalizeCampaigns = (payload) => {
  const list = Array.isArray(payload) ? payload : payload?.campaigns;
  if (!Array.isArray(list)) return [];

  return list.map((campaign) => ({
    ...campaign,
    spent: getCampaignSpent(campaign),
    impressions: Number(campaign.impressions ?? 0),
    clicks: Number(campaign.clicks ?? 0),
  }));
};

const getStatusLabel = (status) => {
  switch (status) {
    case 'active':
      return '집행 중';
    case 'pending':
      return '대기 중';
    case 'paused':
      return '일시중지';
    case 'completed':
      return '종료';
    default:
      return status || '미정';
  }
};

const createMonthLabel = (offset = 0) => {
  const date = new Date();
  date.setMonth(date.getMonth() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const buildFallbackBilling = (campaigns = []) => {
  const monthlySpent = campaigns.reduce((sum, campaign) => sum + getCampaignSpent(campaign), 0);
  const remainingBudget = campaigns.reduce(
    (sum, campaign) => sum + Math.max(0, Number(campaign.budget_total || 0) - getCampaignSpent(campaign)),
    0
  );
  const activeCampaigns = campaigns.filter((campaign) => campaign.status === 'active').length;
  const pendingInvoice = Math.round(monthlySpent * 0.45);

  return {
    summary: {
      monthlySpent,
      remainingBudget,
      activeCampaigns,
      pendingInvoice,
    },
    monthlyStatements: monthlySpent
      ? [
          {
            month: createMonthLabel(0),
            amount: pendingInvoice,
            status: 'scheduled',
            dueDate: `${createMonthLabel(1)}-05`,
            paidDate: null,
          },
          {
            month: createMonthLabel(-1),
            amount: Math.round(monthlySpent * 0.62),
            status: 'paid',
            dueDate: `${createMonthLabel(0)}-05`,
            paidDate: `${createMonthLabel(0)}-04`,
          },
        ]
      : [],
    campaignSpend: campaigns.map((campaign) => ({
      campaignId: campaign.id,
      name: campaign.name,
      status: campaign.status,
      spent: getCampaignSpent(campaign),
      budgetTotal: Number(campaign.budget_total || 0),
      startDate: campaign.start_date || null,
      endDate: campaign.end_date || null,
    })),
  };
};

const AdvertiserDashboard = () => {
  const navigate = useNavigate();
  const { accessToken, isAuthenticated } = useAuth();
  const authToken = getAuthToken(accessToken);

  const [activeSection, setActiveSection] = useState('campaigns');
  const [activeView, setActiveView] = useState('list');
  const [campaigns, setCampaigns] = useState([]);
  const [billing, setBilling] = useState(buildFallbackBilling([]));
  const [stats, setStats] = useState({
    totalImpressions: 0,
    totalClicks: 0,
    totalSpent: 0,
    activeCampaigns: 0,
  });
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [loadingBilling, setLoadingBilling] = useState(true);

  const calculateStats = useCallback((campaignList) => {
    setStats({
      totalImpressions: campaignList.reduce((sum, campaign) => sum + Number(campaign.impressions || 0), 0),
      totalClicks: campaignList.reduce((sum, campaign) => sum + Number(campaign.clicks || 0), 0),
      totalSpent: campaignList.reduce((sum, campaign) => sum + getCampaignSpent(campaign), 0),
      activeCampaigns: campaignList.filter((campaign) => campaign.status === 'active').length,
    });
  }, []);

  const fetchCampaigns = useCallback(async () => {
    if (!authToken) {
      setCampaigns([]);
      calculateStats([]);
      setSelectedCampaign(null);
      setLoadingCampaigns(false);
      return [];
    }

    setLoadingCampaigns(true);

    try {
      const response = await mockFetch(`${API_URL}/api/ads/campaigns`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        setCampaigns([]);
        calculateStats([]);
        setSelectedCampaign(null);
        return [];
      }

      const payload = await response.json();
      const normalizedCampaigns = normalizeCampaigns(payload);

      setCampaigns(normalizedCampaigns);
      calculateStats(normalizedCampaigns);
      setSelectedCampaign((current) =>
        current ? normalizedCampaigns.find((campaign) => campaign.id === current.id) || null : null
      );

      return normalizedCampaigns;
    } catch (error) {
      console.error('Failed to fetch campaigns', error);
      setCampaigns([]);
      calculateStats([]);
      setSelectedCampaign(null);
      return [];
    } finally {
      setLoadingCampaigns(false);
    }
  }, [authToken, calculateStats]);

  const fetchBilling = useCallback(
    async (campaignList = []) => {
      if (!authToken) {
        setBilling(buildFallbackBilling([]));
        setLoadingBilling(false);
        return;
      }

      setLoadingBilling(true);

      try {
        const response = await mockFetch(`${API_URL}/api/ads/advertiser/billing`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        if (!response.ok) {
          setBilling(buildFallbackBilling(campaignList));
          return;
        }

        const payload = await response.json();
        setBilling(payload?.summary || payload?.campaignSpend ? payload : buildFallbackBilling(campaignList));
      } catch (error) {
        console.error('Failed to fetch advertiser billing data', error);
        setBilling(buildFallbackBilling(campaignList));
      } finally {
        setLoadingBilling(false);
      }
    },
    [authToken]
  );

  const refreshAllData = useCallback(async () => {
    const nextCampaigns = await fetchCampaigns();
    await fetchBilling(nextCampaigns);
  }, [fetchBilling, fetchCampaigns]);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoadingCampaigns(false);
      setLoadingBilling(false);
      setCampaigns([]);
      setBilling(buildFallbackBilling([]));
      return;
    }

    refreshAllData();
  }, [isAuthenticated, refreshAllData]);

  const filteredCampaigns = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return campaigns.filter((campaign) => {
      const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;
      if (!matchesStatus) return false;

      if (!normalizedQuery) return true;

      const campaignName = `${campaign.name || ''}`.toLowerCase();
      const clickUrl = `${campaign.click_url || ''}`.toLowerCase();
      return campaignName.includes(normalizedQuery) || clickUrl.includes(normalizedQuery);
    });
  }, [campaigns, searchQuery, statusFilter]);

  const openCampaignSection = (view = 'list') => {
    setActiveSection('campaigns');
    setActiveView(view);
    if (view !== 'edit' && view !== 'detail') {
      setSelectedCampaign(null);
    }
  };

  const openCreateView = () => {
    setSelectedCampaign(null);
    openCampaignSection('create');
  };

  const handleStatusChange = async (campaignId, newStatus) => {
    if (!authToken) return;

    try {
      const response = await mockFetch(`${API_URL}/api/ads/campaigns/${campaignId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setSelectedCampaign((current) => (current?.id === campaignId ? { ...current, status: newStatus } : current));
        await refreshAllData();
      }
    } catch (error) {
      console.error('Failed to update campaign status', error);
    }
  };

  const handleDeleteCampaign = async (campaignId) => {
    if (!authToken) return;
    if (!window.confirm('정말로 이 캠페인을 삭제하시겠습니까?')) return;

    try {
      const response = await mockFetch(`${API_URL}/api/ads/campaigns/${campaignId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        if (selectedCampaign?.id === campaignId) {
          setSelectedCampaign(null);
          setActiveView('list');
        }
        await refreshAllData();
      }
    } catch (error) {
      console.error('Failed to delete campaign', error);
    }
  };

  const handleCampaignUpdated = async (updates = {}) => {
    setSelectedCampaign((current) => (current ? { ...current, ...updates } : current));
    await refreshAllData();
  };

  const renderCampaignList = () => (
    <div className="animate-fade">
      <header className="page-header">
        <div className="page-title">
          <span className="page-badge page-badge--orange">광고 집행</span>
          <h1>광고 캠페인 관리</h1>
          <p>광고주 전용 공간에서 캠페인 집행 상태와 성과를 한 번에 관리해 보세요.</p>
        </div>
        <div className="header-buttons">
          <button className="btn btn-outline" type="button" onClick={() => navigate('/n-connect')}>
            N-CONNECT 보기
          </button>
          <button className="btn btn-primary" type="button" onClick={openCreateView}>
            <Plus size={16} />
            새 캠페인 만들기
          </button>
        </div>
      </header>

      <div className="campaign-stats-grid">
        <div className="campaign-stat-card">
          <div className="campaign-stat-header">
            <span>총 노출</span>
            <div className="campaign-stat-icon blue">
              <Eye size={18} />
            </div>
          </div>
          <span className="campaign-stat-value">{formatCompactKo(stats.totalImpressions)}</span>
          <span className="campaign-stat-change positive">전체 캠페인 합산</span>
        </div>

        <div className="campaign-stat-card">
          <div className="campaign-stat-header">
            <span>총 클릭</span>
            <div className="campaign-stat-icon green">
              <MousePointerClick size={18} />
            </div>
          </div>
          <span className="campaign-stat-value">{formatCompactKo(stats.totalClicks)}</span>
          <span className="campaign-stat-change positive">랜딩 유입 누적</span>
        </div>

        <div className="campaign-stat-card">
          <div className="campaign-stat-header">
            <span>총 집행액</span>
            <div className="campaign-stat-icon orange">
              <DollarSign size={18} />
            </div>
          </div>
          <span className="campaign-stat-value">{formatCurrencyCompact(stats.totalSpent)}</span>
          <span className="campaign-stat-change negative">전체 예산 사용 금액</span>
        </div>

        <div className="campaign-stat-card">
          <div className="campaign-stat-header">
            <span>집행 중 캠페인</span>
            <div className="campaign-stat-icon purple">
              <TrendingUp size={18} />
            </div>
          </div>
          <span className="campaign-stat-value">{stats.activeCampaigns}</span>
          <span className="campaign-stat-change positive">실시간 노출 중</span>
        </div>
      </div>

      <div className="campaigns-section">
        <div className="campaigns-header">
          <h2>캠페인 목록</h2>
          <div className="campaigns-filters">
            <select className="filter-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">전체 상태</option>
              <option value="active">집행 중</option>
              <option value="pending">대기 중</option>
              <option value="paused">일시중지</option>
              <option value="completed">종료</option>
            </select>
          </div>
        </div>

        {!filteredCampaigns.length ? (
          <div className="campaigns-empty">
            <div className="campaigns-empty-icon">
              <Megaphone size={28} />
            </div>
            <h3>등록된 캠페인이 없습니다</h3>
            <p>첫 광고 캠페인을 만들고 스트리머 오버레이에 광고를 집행해 보세요.</p>
            <button className="btn-primary" type="button" onClick={openCreateView}>
              <Plus size={16} />
              첫 캠페인 만들기
            </button>
          </div>
        ) : (
          <div className="campaigns-table">
            <div className="campaigns-table-header">
              <span>캠페인</span>
              <span>상태</span>
              <span>노출</span>
              <span>클릭</span>
              <span>CTR</span>
              <span>집행액</span>
              <span>액션</span>
            </div>

            {filteredCampaigns.map((campaign) => {
              const ctrLabel =
                campaign.impressions > 0
                  ? formatPercent(campaign.clicks / campaign.impressions, 2, { isRatio: true })
                  : '0.00%';

              return (
                <div key={campaign.id} className="campaigns-table-row">
                  <div className="campaign-name-cell">
                    {campaign.content_url ? (
                      campaign.content_type === 'video' ? (
                        <video className="campaign-thumbnail" src={campaign.content_url} muted />
                      ) : (
                        <img className="campaign-thumbnail" src={campaign.content_url} alt={campaign.name} />
                      )
                    ) : (
                      <div className="campaign-thumbnail-placeholder">
                        {campaign.content_type === 'video' ? <Video size={20} /> : <ImageIcon size={20} />}
                      </div>
                    )}

                    <div className="campaign-name-info">
                      <button
                        type="button"
                        className="campaign-name-button"
                        onClick={() => {
                          setSelectedCampaign(campaign);
                          setActiveSection('campaigns');
                          setActiveView('detail');
                        }}
                      >
                        {campaign.name}
                      </button>
                      <span className="campaign-type">
                        {campaign.content_type === 'video' ? '동영상 광고' : '이미지 광고'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className={`campaign-status-badge ${campaign.status}`}>
                      <span className="status-dot"></span>
                      {getStatusLabel(campaign.status)}
                    </span>
                  </div>

                  <div className="campaign-metric">{formatCompactKo(campaign.impressions)}</div>
                  <div className="campaign-metric">{formatCompactKo(campaign.clicks)}</div>
                  <div className="campaign-metric">{ctrLabel}</div>
                  <div className="campaign-metric">{formatCurrencyCompact(getCampaignSpent(campaign))}</div>

                  <div className="campaign-actions">
                    {campaign.status === 'active' ? (
                      <button
                        className="action-btn"
                        type="button"
                        title="일시중지"
                        onClick={() => handleStatusChange(campaign.id, 'paused')}
                      >
                        <Pause size={14} />
                      </button>
                    ) : null}

                    {campaign.status === 'paused' ? (
                      <button
                        className="action-btn"
                        type="button"
                        title="다시 시작"
                        onClick={() => handleStatusChange(campaign.id, 'active')}
                      >
                        <Play size={14} />
                      </button>
                    ) : null}

                    <button
                      className="action-btn"
                      type="button"
                      title="수정"
                      onClick={() => {
                        setSelectedCampaign(campaign);
                        setActiveSection('campaigns');
                        setActiveView('edit');
                      }}
                    >
                      <Edit2 size={14} />
                    </button>

                    <button
                      className="action-btn danger"
                      type="button"
                      title="삭제"
                      onClick={() => handleDeleteCampaign(campaign.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  const renderContent = () => {
    if (!isAuthenticated) {
      return (
        <div className="animate-fade">
          <div className="placeholder-view">
            <Megaphone size={64} style={{ color: 'var(--border-medium)' }} strokeWidth={1} />
            <h3 style={{ color: 'var(--text-main)', marginTop: '20px' }}>로그인이 필요합니다</h3>
            <p>광고 캠페인 집행과 정산 현황은 광고주 계정으로 로그인해야 확인할 수 있습니다.</p>
            <button className="btn-primary" style={{ marginTop: '24px' }} type="button" onClick={() => navigate('/login')}>
              <LogIn size={16} />
              로그인하기
            </button>
          </div>
        </div>
      );
    }

    if (activeSection === 'billing') {
      return <AdvertiserBillingPanel billing={billing} loading={loadingBilling} />;
    }

    switch (activeView) {
      case 'create':
        return (
          <CampaignCreate
            onBack={() => openCampaignSection('list')}
            onSuccess={async () => {
              openCampaignSection('list');
              await refreshAllData();
            }}
          />
        );
      case 'edit':
        return (
          <CampaignCreate
            campaign={selectedCampaign}
            onBack={() => {
              setSelectedCampaign(null);
              openCampaignSection('list');
            }}
            onSuccess={async () => {
              setSelectedCampaign(null);
              openCampaignSection('list');
              await refreshAllData();
            }}
          />
        );
      case 'detail':
        return (
          <CampaignDetail
            campaign={selectedCampaign}
            onBack={() => {
              setSelectedCampaign(null);
              openCampaignSection('list');
            }}
            onEdit={() => setActiveView('edit')}
            onUpdated={handleCampaignUpdated}
          />
        );
      default:
        return renderCampaignList();
    }
  };

  const showSearch = activeSection === 'campaigns' && activeView === 'list';

  return (
    <div className="dashboard-page advertiser-page">
      <ServiceBar />
      <div className="advertiser-layout">
        <aside className="chatgpt-sidebar">
          <div className="sidebar-top">
            <div className="app-logo">
              <div className="logo-icon">A</div>
              <div>
                <div className="logo-text">광고 센터</div>
                <div className="sidebar-note">광고 집행과 정산을 한 곳에서 관리</div>
              </div>
            </div>
          </div>

          <nav className="sidebar-nav">
            <div className="nav-group">
              <span className="group-label">광고주 메뉴</span>
              <button
                className={`nav-item ${activeSection === 'campaigns' ? 'active' : ''}`}
                type="button"
                onClick={() => openCampaignSection(activeView === 'create' || activeView === 'edit' || activeView === 'detail' ? activeView : 'list')}
              >
                <Layout size={18} />
                <span className="nav-label">캠페인 집행</span>
              </button>
              <button className={`nav-item ${activeSection === 'billing' ? 'active' : ''}`} type="button" onClick={() => setActiveSection('billing')}>
                <Receipt size={18} />
                <span className="nav-label">집행비 정산</span>
              </button>
              <button
                className={`nav-item ${activeSection === 'campaigns' && activeView === 'create' ? 'active' : ''}`}
                type="button"
                onClick={openCreateView}
              >
                <Plus size={18} />
                <span className="nav-label">새 캠페인</span>
              </button>
            </div>
          </nav>
        </aside>

        <main className="advertiser-main">
          <header className="top-nav">
            <div className="search-container">
              <Search className="search-icon" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={showSearch ? '캠페인 이름 또는 URL 검색' : '캠페인 집행 탭에서 검색할 수 있습니다'}
                disabled={!showSearch}
              />
            </div>
          </header>

          <div className="advertiser-tabs">
            <button
              className={`advertiser-tab ${activeSection === 'campaigns' ? 'active' : ''}`}
              type="button"
              onClick={() => openCampaignSection('list')}
            >
              캠페인 집행
            </button>
            <button
              className={`advertiser-tab ${activeSection === 'billing' ? 'active' : ''}`}
              type="button"
              onClick={() => setActiveSection('billing')}
            >
              집행비 정산
            </button>
          </div>

          <div className="advertiser-content">
            {activeSection === 'campaigns' && activeView === 'list' && loadingCampaigns ? <LoadingSpinner /> : renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdvertiserDashboard;
