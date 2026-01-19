import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layout, Plus, Eye, MousePointerClick, DollarSign, TrendingUp,
  BarChart3, Bell, Settings, Search, Edit2, Trash2, Pause, Play,
  Image as ImageIcon, Video, ChevronRight, LogOut, LogIn, Megaphone
} from 'lucide-react';
import { API_URL } from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';
import CampaignCreate from './CampaignCreate';
import CampaignDetail from './CampaignDetail';
import './Advertiser.css';

const AdvertiserDashboard = () => {
  const [activeView, setActiveView] = useState('list');
  const [campaigns, setCampaigns] = useState([]);
  const [stats, setStats] = useState({
    totalImpressions: 0,
    totalClicks: 0,
    totalSpent: 0,
    activeCampaigns: 0
  });
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [loading, setLoading] = useState(true);

  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      fetchCampaigns();
    }
  }, [isAuthenticated]);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/ads/campaigns`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data);
        calculateStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch campaigns', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (campaignList) => {
    const totalImpressions = campaignList.reduce((acc, c) => acc + (c.impressions || 0), 0);
    const totalClicks = campaignList.reduce((acc, c) => acc + (c.clicks || 0), 0);
    const totalSpent = campaignList.reduce((acc, c) => acc + (c.spent || 0), 0);
    const activeCampaigns = campaignList.filter(c => c.status === 'active').length;
    setStats({ totalImpressions, totalClicks, totalSpent, activeCampaigns });
  };

  const handleStatusChange = async (campaignId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/ads/campaigns/${campaignId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchCampaigns();
      }
    } catch (err) {
      console.error('Failed to update campaign status', err);
    }
  };

  const handleDeleteCampaign = async (campaignId) => {
    if (!confirm('정말 이 캠페인을 삭제하시겠습니까?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/ads/campaigns/${campaignId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchCampaigns();
      }
    } catch (err) {
      console.error('Failed to delete campaign', err);
    }
  };

  const filteredCampaigns = statusFilter === 'all'
    ? campaigns
    : campaigns.filter(c => c.status === statusFilter);

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
  };

  const renderCampaignList = () => (
    <div className="animate-fade">
      <header className="page-header">
        <div className="page-title">
          <h1>광고 캠페인 관리</h1>
          <p>캠페인을 생성하고 성과를 모니터링하세요.</p>
        </div>
        <div className="header-buttons">
          <button className="btn-primary" onClick={() => setActiveView('create')}>
            <Plus size={16} /> 새 캠페인 만들기
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
          <span className="campaign-stat-value">{formatNumber(stats.totalImpressions)}</span>
          <span className="campaign-stat-change positive">+12.5% 이번 주</span>
        </div>
        <div className="campaign-stat-card">
          <div className="campaign-stat-header">
            <span>총 클릭</span>
            <div className="campaign-stat-icon green">
              <MousePointerClick size={18} />
            </div>
          </div>
          <span className="campaign-stat-value">{formatNumber(stats.totalClicks)}</span>
          <span className="campaign-stat-change positive">+8.3% 이번 주</span>
        </div>
        <div className="campaign-stat-card">
          <div className="campaign-stat-header">
            <span>총 지출</span>
            <div className="campaign-stat-icon orange">
              <DollarSign size={18} />
            </div>
          </div>
          <span className="campaign-stat-value">₩{formatNumber(stats.totalSpent)}</span>
          <span className="campaign-stat-change negative">-2.1% 이번 주</span>
        </div>
        <div className="campaign-stat-card">
          <div className="campaign-stat-header">
            <span>활성 캠페인</span>
            <div className="campaign-stat-icon purple">
              <TrendingUp size={18} />
            </div>
          </div>
          <span className="campaign-stat-value">{stats.activeCampaigns}</span>
          <span className="campaign-stat-change positive">2개 진행 중</span>
        </div>
      </div>

      <div className="campaigns-section">
        <div className="campaigns-header">
          <h2>캠페인 목록</h2>
          <div className="campaigns-filters">
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">모든 상태</option>
              <option value="active">활성</option>
              <option value="pending">대기중</option>
              <option value="paused">일시정지</option>
              <option value="completed">완료됨</option>
            </select>
          </div>
        </div>

        {filteredCampaigns.length === 0 ? (
          <div className="campaigns-empty">
            <div className="campaigns-empty-icon">
              <Megaphone size={28} />
            </div>
            <h3>캠페인이 없습니다</h3>
            <p>새로운 광고 캠페인을 생성하여 스트리머들에게 광고를 노출해보세요.</p>
            <button className="btn-primary" onClick={() => setActiveView('create')}>
              <Plus size={16} /> 첫 캠페인 만들기
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
              <span>지출</span>
              <span>액션</span>
            </div>
            {filteredCampaigns.map((campaign) => {
              const ctr = campaign.impressions > 0
                ? ((campaign.clicks / campaign.impressions) * 100).toFixed(2)
                : '0.00';
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
                      <span
                        className="campaign-name"
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          setSelectedCampaign(campaign);
                          setActiveView('detail');
                        }}
                      >
                        {campaign.name}
                      </span>
                      <span className="campaign-type">
                        {campaign.content_type === 'video' ? '영상 광고' : '이미지 광고'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className={`campaign-status-badge ${campaign.status}`}>
                      <span className="status-dot"></span>
                      {campaign.status === 'active' && '활성'}
                      {campaign.status === 'pending' && '대기중'}
                      {campaign.status === 'paused' && '일시정지'}
                      {campaign.status === 'completed' && '완료됨'}
                    </span>
                  </div>
                  <div className="campaign-metric">{formatNumber(campaign.impressions || 0)}</div>
                  <div className="campaign-metric">{formatNumber(campaign.clicks || 0)}</div>
                  <div className="campaign-metric">{ctr}%</div>
                  <div className="campaign-metric">₩{formatNumber(campaign.spent || 0)}</div>
                  <div className="campaign-actions">
                    {campaign.status === 'active' ? (
                      <button
                        className="action-btn"
                        title="일시정지"
                        onClick={() => handleStatusChange(campaign.id, 'paused')}
                      >
                        <Pause size={14} />
                      </button>
                    ) : campaign.status === 'paused' ? (
                      <button
                        className="action-btn"
                        title="재시작"
                        onClick={() => handleStatusChange(campaign.id, 'active')}
                      >
                        <Play size={14} />
                      </button>
                    ) : null}
                    <button
                      className="action-btn"
                      title="편집"
                      onClick={() => {
                        setSelectedCampaign(campaign);
                        setActiveView('edit');
                      }}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      className="action-btn danger"
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
            <p>광고 캠페인을 관리하려면 먼저 로그인해주세요.</p>
            <button className="btn-primary" style={{ marginTop: '24px' }} onClick={() => navigate('/login')}>
              <LogIn size={16} /> 로그인하기
            </button>
          </div>
        </div>
      );
    }

    switch (activeView) {
      case 'create':
        return (
          <CampaignCreate
            onBack={() => setActiveView('list')}
            onSuccess={() => {
              setActiveView('list');
              fetchCampaigns();
            }}
          />
        );
      case 'edit':
        return (
          <CampaignCreate
            campaign={selectedCampaign}
            onBack={() => {
              setSelectedCampaign(null);
              setActiveView('list');
            }}
            onSuccess={() => {
              setSelectedCampaign(null);
              setActiveView('list');
              fetchCampaigns();
            }}
          />
        );
      case 'detail':
        return (
          <CampaignDetail
            campaign={selectedCampaign}
            onBack={() => {
              setSelectedCampaign(null);
              setActiveView('list');
            }}
            onEdit={() => setActiveView('edit')}
          />
        );
      default:
        return renderCampaignList();
    }
  };

  return (
    <div className="advertiser-layout">
      <aside className="chatgpt-sidebar">
        <div className="sidebar-top">
          <div className="app-logo">
            <div className="logo-icon">A</div>
            <span className="logo-text">Ad Manager</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-group">
            <span className="group-label">광고 관리</span>
            <button
              className={`nav-item ${activeView === 'list' ? 'active' : ''}`}
              onClick={() => setActiveView('list')}
            >
              <Layout size={18} />
              <span className="nav-label">캠페인 목록</span>
            </button>
            <button
              className={`nav-item ${activeView === 'create' ? 'active' : ''}`}
              onClick={() => {
                setSelectedCampaign(null);
                setActiveView('create');
              }}
            >
              <Plus size={18} />
              <span className="nav-label">새 캠페인</span>
            </button>
          </div>
          <div className="nav-group">
            <span className="group-label">분석</span>
            <button className="nav-item">
              <BarChart3 size={18} />
              <span className="nav-label">성과 분석</span>
            </button>
          </div>
        </nav>

        <div className="sidebar-user">
          {isAuthenticated ? (
            <div className="user-profile" title="계정 설정">
              <div className="avatar">{user?.displayName?.charAt(0)?.toUpperCase() || 'A'}</div>
              <div className="user-info">
                <span className="username" style={{ color: 'var(--text-main)' }}>{user?.displayName || '광고주'}</span>
                <span className="user-plan">광고주 계정</span>
              </div>
              <button
                className="logout-btn"
                onClick={(e) => { e.stopPropagation(); logout(); navigate('/'); }}
                title="로그아웃"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              className="login-btn"
              onClick={() => navigate('/login')}
              style={{ width: '100%' }}
            >
              <LogIn size={18} />
              <span className="login-text">로그인</span>
            </button>
          )}
        </div>
      </aside>

      <main className="advertiser-main">
        <header className="top-nav">
          <div className="search-container">
            <Search className="search-icon" size={16} />
            <input type="text" placeholder="캠페인 검색..." />
          </div>
          <div className="top-actions">
            <button className="action-icon-btn"><Bell size={18} /></button>
            <button className="action-icon-btn"><Settings size={18} /></button>
            <button className="btn-outline" onClick={() => navigate('/')}>
              스트리머 대시보드
              <ChevronRight size={14} />
            </button>
          </div>
        </header>
        <div className="advertiser-content">
          {loading && activeView === 'list' ? (
            <div className="placeholder-view">
              <div className="spin">
                <Settings size={32} style={{ color: 'var(--primary)' }} />
              </div>
              <p style={{ marginTop: '16px' }}>캠페인 목록을 불러오는 중...</p>
            </div>
          ) : (
            renderContent()
          )}
        </div>
      </main>
    </div>
  );
};

export default AdvertiserDashboard;
