import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layout, Upload, Video, BarChart3, DollarSign, Settings,
  ChevronDown, Menu, X, Sun, Moon, ArrowLeft, Youtube
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import VodHome from './tabs/VodHome';
import VodUpload from './tabs/VodUpload';
import VodVideos from './tabs/VodVideos';
import VodAnalytics from './tabs/VodAnalytics';
import VodRevenue from './tabs/VodRevenue';
import VodSettings from './tabs/VodSettings';
import './VodAgentDashboard.css';

const VodAgentDashboard = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const { resolvedTheme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // 네비게이션 메뉴 구성
  const menuGroups = [
    {
      label: '홈',
      items: [
        { id: 'home', label: '대시보드', icon: <Layout size={18} /> }
      ]
    },
    {
      label: '콘텐츠',
      items: [
        { id: 'upload', label: '영상 업로드', icon: <Upload size={18} /> },
        { id: 'videos', label: '내 영상', icon: <Video size={18} /> }
      ]
    },
    {
      label: '분석',
      items: [
        { id: 'analytics', label: '통합 분석', icon: <BarChart3 size={18} /> },
        { id: 'revenue', label: '수익 관리', icon: <DollarSign size={18} /> }
      ]
    },
    {
      label: '설정',
      items: [
        { id: 'settings', label: '설정', icon: <Settings size={18} /> }
      ]
    }
  ];

  const handleNavItemClick = (itemId) => {
    setActiveTab(itemId);
    setMobileMenuOpen(false);
  };

  const toggleGroup = (groupLabel) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupLabel]: !prev[groupLabel]
    }));
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <VodHome onNavigate={setActiveTab} />;
      case 'upload':
        return <VodUpload />;
      case 'videos':
        return <VodVideos />;
      case 'analytics':
        return <VodAnalytics />;
      case 'revenue':
        return <VodRevenue />;
      case 'settings':
        return <VodSettings />;
      default:
        return <VodHome onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="vod-dashboard-layout">
      {/* 모바일 오버레이 배경 */}
      {mobileMenuOpen && (
        <div className="vod-mobile-overlay" onClick={() => setMobileMenuOpen(false)} />
      )}

      <aside className={`vod-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        {/* 닫기 버튼 - 모바일에서만 표시 */}
        {mobileMenuOpen && (
          <button
            className="vod-sidebar-close-btn"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X size={24} />
          </button>
        )}

        {/* 로고 영역 */}
        <div className="vod-sidebar-header">
          <div className="vod-logo">
            <div className="vod-logo-icon">
              <Youtube size={24} />
            </div>
            <span className="vod-logo-text">VOD 에이전트</span>
          </div>
        </div>

        <nav className="vod-sidebar-nav">
          {menuGroups.map((group) => {
            const isCollapsed = collapsedGroups[group.label];
            const hasActiveItem = group.items.some(item => item.id === activeTab);

            return (
              <div key={group.label} className="vod-nav-group">
                <button
                  className={`vod-group-label-btn ${hasActiveItem ? 'has-active' : ''}`}
                  onClick={() => toggleGroup(group.label)}
                >
                  <span className="vod-group-label">{group.label}</span>
                  <ChevronDown
                    size={14}
                    className={`vod-group-chevron ${isCollapsed ? 'collapsed' : ''}`}
                  />
                </button>
                <div className={`vod-nav-group-items ${isCollapsed ? 'collapsed' : ''}`}>
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      className={`vod-nav-item ${activeTab === item.id ? 'active' : ''}`}
                      onClick={() => handleNavItemClick(item.id)}
                      title={item.label}
                    >
                      {item.icon}
                      <span className="vod-nav-label">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* 스트리머 대시보드로 돌아가기 */}
        <div className="vod-sidebar-footer">
          <button
            className="vod-back-btn"
            onClick={() => navigate('/')}
          >
            <ArrowLeft size={18} />
            <span>스트리머 대시보드</span>
          </button>
        </div>
      </aside>

      <main className="vod-main">
        <header className="vod-top-nav">
          {/* 모바일 햄버거 버튼 */}
          <button
            className="vod-mobile-menu-btn"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu size={24} />
          </button>

          <div className="vod-top-nav-title">
            <Youtube size={20} className="vod-header-icon" />
            <span>VOD 에이전트</span>
          </div>

          <div className="vod-top-actions">
            <button
              className="btn btn-icon btn-ghost"
              onClick={toggleTheme}
              title={resolvedTheme === 'dark' ? '라이트 모드' : '다크 모드'}
            >
              {resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              className="btn btn-outline"
              onClick={() => navigate('/')}
            >
              <ArrowLeft size={16} />
              돌아가기
            </button>
          </div>
        </header>

        <div className="vod-content-body">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default VodAgentDashboard;
