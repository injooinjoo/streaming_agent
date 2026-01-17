import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, DollarSign, Activity, BarChart3,
  LogOut, Shield, ArrowLeft, Monitor, Gamepad2, Search, Megaphone,
  Menu, X, Database, Radio
} from 'lucide-react';
import AdminOverview from './AdminOverview';
import AdminStreamers from './AdminStreamers';
import AdminRevenue from './AdminRevenue';
import AdminPlatforms from './AdminPlatforms';
import AdminViewership from './AdminViewership';
import AdminStreamerDetail from './AdminStreamerDetail';
import AdminGameAnalytics from './AdminGameAnalytics';
import AdminNexonDiscovery from './AdminNexonDiscovery';
import AdminNexonCampaign from './AdminNexonCampaign';
import AdminAnalytics from './AdminAnalytics';
import AdminPlatformConnections from './AdminPlatformConnections';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [activeSection, setActiveSection] = useState('analytics');
  const [selectedStreamerId, setSelectedStreamerId] = useState(null);
  const [previousSection, setPreviousSection] = useState('streamers');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/');
  };

  const handleStreamerSelect = (streamerId) => {
    setPreviousSection(activeSection);
    setSelectedStreamerId(streamerId);
    setActiveSection('streamer-detail');
  };

  const handleBackFromDetail = () => {
    setSelectedStreamerId(null);
    setActiveSection(previousSection);
  };

  const handleNavClick = (sectionId) => {
    setActiveSection(sectionId);
    setMobileMenuOpen(false);
  };

  const navItems = [
    {
      category: '플랫폼 연결',
      items: [
        { id: 'connections', label: '플랫폼 관리', icon: <Radio size={18} /> },
      ]
    },
    {
      category: 'SOOP Analytics',
      items: [
        { id: 'analytics', label: '시청자 분석', icon: <Database size={18} /> },
      ]
    },
    {
      category: 'NEXON 분석',
      items: [
        { id: 'discovery', label: '인플루언서 발굴', icon: <Search size={18} /> },
        { id: 'campaign', label: '캠페인 성과', icon: <Megaphone size={18} /> },
      ]
    },
    {
      category: '기존 기능',
      items: [
        { id: 'overview', label: '개요', icon: <LayoutDashboard size={18} /> },
        { id: 'streamers', label: '스트리머 관리', icon: <Users size={18} /> },
        { id: 'revenue', label: '수익 분석', icon: <DollarSign size={18} /> },
        { id: 'platforms', label: '플랫폼 비교', icon: <BarChart3 size={18} /> },
        { id: 'viewership', label: '스트리머 분석', icon: <Activity size={18} /> },
        { id: 'game-analytics', label: '게임 데이터', icon: <Gamepad2 size={18} /> },
      ]
    }
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'connections': return <AdminPlatformConnections />;
      case 'analytics': return <AdminAnalytics onStreamerSelect={handleStreamerSelect} />;
      case 'discovery': return <AdminNexonDiscovery onStreamerSelect={handleStreamerSelect} />;
      case 'campaign': return <AdminNexonCampaign />;
      case 'overview': return <AdminOverview />;
      case 'streamers': return <AdminStreamers onStreamerSelect={handleStreamerSelect} />;
      case 'revenue': return <AdminRevenue />;
      case 'platforms': return <AdminPlatforms />;
      case 'viewership': return <AdminViewership onStreamerSelect={handleStreamerSelect} />;
      case 'game-analytics': return <AdminGameAnalytics onStreamerSelect={handleStreamerSelect} />;
      case 'streamer-detail':
        return (
          <AdminStreamerDetail
            streamerId={selectedStreamerId}
            onBack={handleBackFromDetail}
          />
        );
      default: return <AdminAnalytics onStreamerSelect={handleStreamerSelect} />;
    }
  };

  const getCurrentTitle = () => {
    if (activeSection === 'streamer-detail') {
      return '스트리머 상세';
    }
    for (const group of navItems) {
      const item = group.items.find(n => n.id === activeSection);
      if (item) return item.label;
    }
    return '인플루언서 발굴';
  };

  return (
    <div className="admin-layout">
      {/* 모바일 오버레이 */}
      <div
        className={`admin-mobile-overlay ${mobileMenuOpen ? 'active' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
      />

      <aside className={`admin-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="admin-sidebar-header">
          <Shield size={24} className="admin-shield-icon" />
          <span>관리자 대시보드</span>
          <button
            className="admin-mobile-close-btn"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="admin-nav">
          {navItems.map((group, groupIndex) => (
            <React.Fragment key={group.category}>
              <div className={`admin-nav-category ${groupIndex === 0 ? 'first' : ''}`}>
                {group.category}
              </div>
              {group.items.map(item => (
                <button
                  key={item.id}
                  className={`admin-nav-item ${activeSection === item.id ? 'active' : ''}`}
                  onClick={() => handleNavClick(item.id)}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </React.Fragment>
          ))}
        </nav>

      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <button
            className="admin-mobile-menu-btn"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu size={22} />
          </button>
          <h1>{getCurrentTitle()}</h1>
          <div className="admin-header-actions">
            <button className="admin-streamer-mode-btn" onClick={handleBack}>
              <Monitor size={18} />
              <span>스트리머 모드</span>
            </button>
            <span className="admin-badge">
              <Shield size={14} />
              관리자
            </span>
          </div>
        </header>
        <div className="admin-content">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
