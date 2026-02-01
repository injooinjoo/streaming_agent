import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  User, Link2, BarChart3, Settings, Bell, MessageSquare,
  TrendingUp, Users, Eye, Calendar, ExternalLink, Copy, Check,
  ChevronRight, Play, Pause, RefreshCw, Shield, Star, Award,
  Activity, DollarSign, Clock, Zap, Globe, Youtube, Monitor,
  Hash, AtSign, MapPin, Sparkles, ChevronDown, Heart
} from 'lucide-react';
import { API_URL } from '../../config/api';
import { formatCompactKo, formatCurrency, formatFullNumber } from '../../utils/formatters';
import LoadingSpinner from '../shared/LoadingSpinner';
import './ChannelPage.css';

const ChannelPage = () => {
  const { channelId } = useParams();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('overview');
  const [channelData, setChannelData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [liveStatus, setLiveStatus] = useState(null);

  // 네비게이션 메뉴 항목
  const navItems = [
    { id: 'overview', label: '채널 개요', icon: <User size={18} /> },
    { id: 'stats', label: '통계', icon: <BarChart3 size={18} /> },
    { id: 'streams', label: '방송 기록', icon: <Play size={18} /> },
    { id: 'connections', label: '플랫폼 연결', icon: <Link2 size={18} /> },
    { id: 'settings', label: '채널 설정', icon: <Settings size={18} /> },
  ];

  // 채널 데이터 가져오기 (Mock 데이터)
  useEffect(() => {
    const fetchChannelData = async () => {
      setLoading(true);
      try {
        // 실제 API 호출 예시
        // const res = await fetch(`${API_URL}/api/channel/${channelId}`);
        // const data = await res.json();

        // Mock 데이터 (setTimeout 제거 - 불필요한 500ms 지연 방지)
        setChannelData({
          id: channelId || 'demo-channel',
          displayName: '데모 스트리머',
          username: 'demo_streamer',
          avatar: null,
          bio: '안녕하세요! 다양한 게임과 소통 방송을 진행하는 스트리머입니다. 😊',
          verified: true,
          level: 42,
          createdAt: '2023-05-15',
          platforms: [
            { id: 'soop', name: 'SOOP', connected: true, followers: 15420, channelUrl: 'https://www.sooplive.co.kr/demo' },
            { id: 'chzzk', name: '치지직', connected: true, followers: 8350, channelUrl: 'https://chzzk.naver.com/demo' },
            { id: 'youtube', name: '유튜브', connected: false, followers: 0 },
          ],
          stats: {
            totalFollowers: 23770,
            totalViews: 1250000,
            avgViewers: 342,
            peakViewers: 1580,
            totalStreams: 156,
            totalHours: 892,
            totalDonations: 4520000,
            lastStreamDate: '2026-01-19',
          },
          recentStreams: [
            { id: 1, title: '[LOL] 랭크 도전! 목표는 다이아몬드', date: '2026-01-19', duration: '4h 32m', viewers: 485, category: 'League of Legends' },
            { id: 2, title: '신작 게임 리뷰 + 시청자 참여', date: '2026-01-18', duration: '3h 15m', viewers: 312, category: 'Just Chatting' },
            { id: 3, title: '팬아트 리뷰하며 소통방송', date: '2026-01-17', duration: '2h 45m', viewers: 428, category: 'Art' },
          ],
          badges: [
            { id: 'partner', name: '파트너', icon: <Shield size={14} />, color: '#6366f1' },
            { id: 'top100', name: 'TOP 100', icon: <Award size={14} />, color: '#f59e0b' },
            { id: 'verified', name: '인증됨', icon: <Check size={14} />, color: '#10b981' },
          ],
          socialLinks: [
            { platform: 'twitter', url: 'https://twitter.com/demo', label: '@demo_streamer' },
            { platform: 'instagram', url: 'https://instagram.com/demo', label: '@demo_streamer' },
            { platform: 'discord', url: 'https://discord.gg/demo', label: 'Demo Server' },
          ]
        });
        setLiveStatus({ isLive: true, viewers: 523, startedAt: new Date(Date.now() - 7200000) });
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch channel data:', error);
        setLoading(false);
      }
    };

    fetchChannelData();
  }, [channelId]);

  const copyChannelUrl = async () => {
    const url = `${window.location.origin}/channel/${channelData?.id}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatNumber = (num) => formatCompactKo(num);

  const formatDuration = (ms) => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    return `${hours}시간 ${minutes}분`;
  };

  const getPlatformLogo = (platformId) => {
    const logos = {
      soop: '/assets/logos/soop.png',
      chzzk: '/assets/logos/chzzk.png',
      youtube: '/assets/logos/youtube.png',
      twitch: '/assets/logos/twitch.png',
    };
    return logos[platformId];
  };

  if (loading) {
    return (
      <div className="channel-page">
        <LoadingSpinner fullHeight />
      </div>
    );
  }

  if (!channelData) {
    return (
      <div className="channel-page">
        <div className="channel-not-found">
          <User size={48} />
          <h2>채널을 찾을 수 없습니다</h2>
          <p>요청하신 채널이 존재하지 않거나 비공개 상태입니다.</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const renderOverview = () => (
    <div className="channel-section overview-section animate-fade">
      {/* 프로필 헤더 */}
      <div className="profile-header-card">
        <div className="profile-banner">
          {liveStatus?.isLive && (
            <div className="live-indicator">
              <span className="live-dot"></span>
              LIVE
            </div>
          )}
        </div>
        <div className="profile-content">
          <div className="profile-avatar-wrapper">
            <div className="profile-avatar large">
              {channelData.avatar ? (
                <img src={channelData.avatar} alt={channelData.displayName} />
              ) : (
                <span>{channelData.displayName.charAt(0).toUpperCase()}</span>
              )}
            </div>
            {channelData.verified && (
              <div className="verified-badge" title="인증된 스트리머">
                <Check size={12} />
              </div>
            )}
          </div>
          <div className="profile-info">
            <div className="profile-name-row">
              <h1>{channelData.displayName}</h1>
              <div className="profile-badges">
                {channelData.badges.map(badge => (
                  <span
                    key={badge.id}
                    className="profile-badge"
                    style={{ backgroundColor: `${badge.color}20`, color: badge.color }}
                  >
                    {badge.icon}
                    {badge.name}
                  </span>
                ))}
              </div>
            </div>
            <div className="profile-username">@{channelData.username}</div>
            <p className="profile-bio">{channelData.bio}</p>
            <div className="profile-meta">
              <span><Calendar size={14} /> {channelData.createdAt} 가입</span>
              <span><Star size={14} /> 레벨 {channelData.level}</span>
            </div>
          </div>
          <div className="profile-actions">
            <button className="btn btn-primary">
              <Heart size={16} /> 팔로우
            </button>
            <button className="btn btn-outline" onClick={copyChannelUrl}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? '복사됨' : '공유'}
            </button>
          </div>
        </div>
      </div>

      {/* 라이브 상태 */}
      {liveStatus?.isLive && (
        <div className="live-status-card">
          <div className="live-header">
            <div className="live-badge">
              <span className="live-dot"></span>
              현재 방송 중
            </div>
            <span className="live-duration">
              <Clock size={14} /> {formatDuration(Date.now() - liveStatus.startedAt.getTime())} 방송 중
            </span>
          </div>
          <div className="live-stats">
            <div className="live-stat">
              <Eye size={18} />
              <span className="live-stat-value">{formatFullNumber(liveStatus.viewers || 0)}</span>
              <span className="live-stat-label">시청자</span>
            </div>
          </div>
          <button className="btn btn-primary btn-full">
            <ExternalLink size={16} /> 방송 시청하기
          </button>
        </div>
      )}

      {/* 퀵 통계 */}
      <div className="quick-stats-grid">
        <div className="quick-stat-card">
          <div className="quick-stat-icon" style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
            <Users size={20} />
          </div>
          <div className="quick-stat-content">
            <span className="quick-stat-value">{formatNumber(channelData.stats.totalFollowers)}</span>
            <span className="quick-stat-label">총 팔로워</span>
          </div>
        </div>
        <div className="quick-stat-card">
          <div className="quick-stat-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <Eye size={20} />
          </div>
          <div className="quick-stat-content">
            <span className="quick-stat-value">{formatNumber(channelData.stats.totalViews)}</span>
            <span className="quick-stat-label">총 조회수</span>
          </div>
        </div>
        <div className="quick-stat-card">
          <div className="quick-stat-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <TrendingUp size={20} />
          </div>
          <div className="quick-stat-content">
            <span className="quick-stat-value">{channelData.stats.avgViewers}</span>
            <span className="quick-stat-label">평균 시청자</span>
          </div>
        </div>
        <div className="quick-stat-card">
          <div className="quick-stat-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
            <Zap size={20} />
          </div>
          <div className="quick-stat-content">
            <span className="quick-stat-value">{formatNumber(channelData.stats.peakViewers)}</span>
            <span className="quick-stat-label">최고 동시시청</span>
          </div>
        </div>
      </div>

      {/* 연결된 플랫폼 */}
      <div className="section-card">
        <div className="section-header">
          <h3><Globe size={18} /> 연결된 플랫폼</h3>
        </div>
        <div className="platforms-list">
          {channelData.platforms.filter(p => p.connected).map(platform => (
            <div key={platform.id} className="platform-item">
              <div className="platform-info">
                <img src={getPlatformLogo(platform.id)} alt={platform.name} className="platform-logo" />
                <div className="platform-details">
                  <span className="platform-name">{platform.name}</span>
                  <span className="platform-followers">
                    <Users size={12} /> {formatNumber(platform.followers)} 팔로워
                  </span>
                </div>
              </div>
              <a href={platform.channelUrl} target="_blank" rel="noopener noreferrer" className="platform-link">
                <ExternalLink size={14} />
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* 최근 방송 */}
      <div className="section-card">
        <div className="section-header">
          <h3><Play size={18} /> 최근 방송</h3>
          <button className="section-link" onClick={() => setActiveSection('streams')}>
            전체 보기 <ChevronRight size={14} />
          </button>
        </div>
        <div className="recent-streams-list">
          {channelData.recentStreams.map(stream => (
            <div key={stream.id} className="stream-item">
              <div className="stream-thumbnail">
                <Play size={20} />
              </div>
              <div className="stream-info">
                <h4 className="stream-title">{stream.title}</h4>
                <div className="stream-meta">
                  <span><Calendar size={12} /> {stream.date}</span>
                  <span><Clock size={12} /> {stream.duration}</span>
                  <span><Eye size={12} /> {stream.viewers} 시청자</span>
                </div>
                <span className="stream-category">{stream.category}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStats = () => (
    <div className="channel-section stats-section animate-fade">
      <h2><BarChart3 size={20} /> 채널 통계</h2>

      <div className="stats-overview-grid">
        <div className="stat-card large">
          <div className="stat-icon"><DollarSign size={24} /></div>
          <div className="stat-info">
            <span className="stat-label">총 후원 수익</span>
            <span className="stat-value">{formatCurrency(channelData.stats.totalDonations || 0)}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Play size={24} /></div>
          <div className="stat-info">
            <span className="stat-label">총 방송 횟수</span>
            <span className="stat-value">{channelData.stats.totalStreams}회</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Clock size={24} /></div>
          <div className="stat-info">
            <span className="stat-label">총 방송 시간</span>
            <span className="stat-value">{channelData.stats.totalHours}시간</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Calendar size={24} /></div>
          <div className="stat-info">
            <span className="stat-label">마지막 방송</span>
            <span className="stat-value">{channelData.stats.lastStreamDate}</span>
          </div>
        </div>
      </div>

      <div className="stats-chart-placeholder">
        <Activity size={48} />
        <p>상세 통계 차트가 여기에 표시됩니다</p>
      </div>
    </div>
  );

  const renderStreams = () => (
    <div className="channel-section streams-section animate-fade">
      <h2><Play size={20} /> 방송 기록</h2>

      <div className="streams-filter">
        <button className="filter-btn active">전체</button>
        <button className="filter-btn">이번 주</button>
        <button className="filter-btn">이번 달</button>
      </div>

      <div className="streams-list">
        {channelData.recentStreams.map(stream => (
          <div key={stream.id} className="stream-card">
            <div className="stream-thumbnail large">
              <Play size={32} />
            </div>
            <div className="stream-content">
              <h3>{stream.title}</h3>
              <div className="stream-meta">
                <span><Calendar size={14} /> {stream.date}</span>
                <span><Clock size={14} /> {stream.duration}</span>
                <span><Eye size={14} /> {stream.viewers} 시청자</span>
              </div>
              <div className="stream-category-tag">{stream.category}</div>
            </div>
            <div className="stream-actions">
              <button className="btn btn-outline btn-sm">다시보기</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderConnections = () => (
    <div className="channel-section connections-section animate-fade">
      <h2><Link2 size={20} /> 플랫폼 연결</h2>

      <div className="connections-grid">
        {channelData.platforms.map(platform => (
          <div key={platform.id} className={`connection-card ${platform.connected ? 'connected' : ''}`}>
            <div className="connection-header">
              <img src={getPlatformLogo(platform.id)} alt={platform.name} className="connection-logo" />
              <span className={`connection-status ${platform.connected ? 'active' : ''}`}>
                {platform.connected ? '연결됨' : '미연결'}
              </span>
            </div>
            <h3>{platform.name}</h3>
            {platform.connected ? (
              <>
                <div className="connection-stats">
                  <span><Users size={14} /> {formatNumber(platform.followers)} 팔로워</span>
                </div>
                <div className="connection-actions">
                  <button className="btn btn-outline btn-sm">재연결</button>
                  <button className="btn btn-danger-ghost btn-sm">연결 해제</button>
                </div>
              </>
            ) : (
              <div className="connection-actions">
                <button className="btn btn-primary btn-sm">
                  <Link2 size={14} /> 연결하기
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="channel-section settings-section animate-fade">
      <h2><Settings size={20} /> 채널 설정</h2>

      <div className="settings-group">
        <h3>기본 정보</h3>
        <div className="setting-item">
          <label>채널 이름</label>
          <input type="text" defaultValue={channelData.displayName} />
        </div>
        <div className="setting-item">
          <label>채널 소개</label>
          <textarea defaultValue={channelData.bio} rows={3} />
        </div>
      </div>

      <div className="settings-group">
        <h3>알림 설정</h3>
        <div className="setting-toggle">
          <div className="setting-info">
            <span>방송 시작 알림</span>
            <p>방송 시작 시 팔로워에게 알림 전송</p>
          </div>
          <div className="toggle-switch">
            <input type="checkbox" id="broadcast-notify" defaultChecked />
            <label htmlFor="broadcast-notify"></label>
          </div>
        </div>
        <div className="setting-toggle">
          <div className="setting-info">
            <span>후원 알림</span>
            <p>새로운 후원 시 알림 받기</p>
          </div>
          <div className="toggle-switch">
            <input type="checkbox" id="donation-notify" defaultChecked />
            <label htmlFor="donation-notify"></label>
          </div>
        </div>
      </div>

      <button className="btn btn-primary">변경사항 저장</button>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return renderOverview();
      case 'stats':
        return renderStats();
      case 'streams':
        return renderStreams();
      case 'connections':
        return renderConnections();
      case 'settings':
        return renderSettings();
      default:
        return renderOverview();
    }
  };

  return (
    <div className="channel-page">
      {/* 왼쪽 네비게이션 */}
      <aside className="channel-sidebar">
        <div className="sidebar-header">
          <button className="back-btn" onClick={() => navigate('/')}>
            <ChevronRight size={18} style={{ transform: 'rotate(180deg)' }} />
            <span>돌아가기</span>
          </button>
        </div>

        <div className="sidebar-profile">
          <div className="profile-avatar">
            {channelData.avatar ? (
              <img src={channelData.avatar} alt={channelData.displayName} />
            ) : (
              <span>{channelData.displayName.charAt(0).toUpperCase()}</span>
            )}
            {liveStatus?.isLive && <span className="live-ring"></span>}
          </div>
          <div className="profile-info">
            <span className="profile-name">{channelData.displayName}</span>
            <span className="profile-username">@{channelData.username}</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
              onClick={() => setActiveSection(item.id)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="quick-links">
            {channelData.socialLinks.map((link, i) => (
              <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" title={link.label}>
                <Globe size={16} />
              </a>
            ))}
          </div>
        </div>
      </aside>

      {/* 메인 콘텐츠 */}
      <main className="channel-main">
        {renderContent()}
      </main>
    </div>
  );
};

export default ChannelPage;
