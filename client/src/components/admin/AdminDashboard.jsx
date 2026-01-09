import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, DollarSign, Activity, BarChart3,
  LogOut, Shield, ArrowLeft, Monitor, Gamepad2
} from 'lucide-react';
import AdminOverview from './AdminOverview';
import AdminStreamers from './AdminStreamers';
import AdminRevenue from './AdminRevenue';
import AdminPlatforms from './AdminPlatforms';
import AdminViewership from './AdminViewership';
import AdminStreamerDetail from './AdminStreamerDetail';
import AdminGameAnalytics from './AdminGameAnalytics';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [activeSection, setActiveSection] = useState('overview');
  const [selectedStreamerId, setSelectedStreamerId] = useState(null);
  const [previousSection, setPreviousSection] = useState('streamers');
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

  const navItems = [
    { id: 'overview', label: '개요', icon: <LayoutDashboard size={18} /> },
    { id: 'streamers', label: '스트리머 관리', icon: <Users size={18} /> },
    { id: 'revenue', label: '수익 분석', icon: <DollarSign size={18} /> },
    { id: 'platforms', label: '플랫폼 비교', icon: <BarChart3 size={18} /> },
    { id: 'viewership', label: '시청자 분석', icon: <Activity size={18} /> },
    { id: 'game-analytics', label: '게임 데이터', icon: <Gamepad2 size={18} /> },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'overview': return <AdminOverview />;
      case 'streamers': return <AdminStreamers onStreamerSelect={handleStreamerSelect} />;
      case 'revenue': return <AdminRevenue />;
      case 'platforms': return <AdminPlatforms />;
      case 'viewership': return <AdminViewership onStreamerSelect={handleStreamerSelect} />;
      case 'game-analytics': return <AdminGameAnalytics />;
      case 'streamer-detail':
        return (
          <AdminStreamerDetail
            streamerId={selectedStreamerId}
            onBack={handleBackFromDetail}
          />
        );
      default: return <AdminOverview />;
    }
  };

  const getCurrentTitle = () => {
    if (activeSection === 'streamer-detail') {
      return '스트리머 상세';
    }
    return navItems.find(n => n.id === activeSection)?.label || '개요';
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <Shield size={24} className="admin-shield-icon" />
          <span>관리자 대시보드</span>
        </div>

        <nav className="admin-nav">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`admin-nav-item ${activeSection === item.id ? 'active' : ''}`}
              onClick={() => setActiveSection(item.id)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

      </aside>

      <main className="admin-main">
        <header className="admin-header">
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
