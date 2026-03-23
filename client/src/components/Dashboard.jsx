import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Bot,
  ChevronDown,
  Disc,
  ExternalLink,
  Film,
  Gamepad2,
  Gift,
  Layout,
  Link2,
  Megaphone,
  Menu,
  MessageSquare,
  Palette,
  PanelsTopLeft,
  Settings,
  Smile,
  Store,
  Trophy,
  Upload,
  Video,
  Vote,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getPlatformLogo } from '../utils/mediaAssets';
import LoadingSpinner from './shared/LoadingSpinner';
import ServiceBar from './shared/ServiceBar';
import {
  EmptyState,
  EntityCard,
  InsightStrip,
  LogoChip,
  MediaHero,
  MediaRail,
  PosterCard,
  SectionCard,
  StatusBadge,
} from './shared/studio';
import StreamerGuideTabs from './streaming-home/StreamerGuideTabs';
import './vod-agent/VodAgentDashboard.css';
import './Dashboard.css';
import './DashboardNConnect.css';
import './DashboardStudio.css';
import './settings/shared/SettingsStudio.css';
import './nconnect/NConnectPortal.css';

const ChatSettings = lazy(() => import('./settings/ChatSettings'));
const AlertSettings = lazy(() => import('./settings/AlertSettings'));
const SubtitleSettings = lazy(() => import('./settings/SubtitleSettings'));
const GoalSettings = lazy(() => import('./settings/GoalSettings'));
const TickerSettings = lazy(() => import('./settings/TickerSettings'));
const DesignSettings = lazy(() => import('./settings/DesignSettings'));
const AccountSettings = lazy(() => import('./settings/AccountSettings'));
const AdSettings = lazy(() => import('./settings/AdSettings'));
const RouletteSettings = lazy(() => import('./settings/RouletteSettings'));
const EmojiSettings = lazy(() => import('./settings/EmojiSettings'));
const VotingSettings = lazy(() => import('./settings/VotingSettings'));
const CreditsSettings = lazy(() => import('./settings/CreditsSettings'));
const BotSettings = lazy(() => import('./settings/BotSettings'));
const GameSettings = lazy(() => import('./settings/GameSettings'));
const MarketplaceTab = lazy(() => import('./marketplace/MarketplaceTab'));
const VodHome = lazy(() => import('./vod-agent/tabs/VodHome'));
const VodUpload = lazy(() => import('./vod-agent/tabs/VodUpload'));
const VodVideos = lazy(() => import('./vod-agent/tabs/VodVideos'));
const VodAnalytics = lazy(() => import('./vod-agent/tabs/VodAnalytics'));
const VodRevenue = lazy(() => import('./vod-agent/tabs/VodRevenue'));
const VodSettings = lazy(() => import('./vod-agent/tabs/VodSettings'));
const NConnectHome = lazy(() => import('./nconnect/NConnectHome'));
const NConnectContents = lazy(() => import('./nconnect/NConnectContents'));
const NConnectRanking = lazy(() => import('./nconnect/NConnectRanking'));
const NConnectLink = lazy(() => import('./nconnect/NConnectLink'));
const NConnectMembership = lazy(() => import('./nconnect/NConnectMembership'));
const NConnectRewards = lazy(() => import('./nconnect/NConnectRewards'));
const NConnectNotices = lazy(() => import('./nconnect/NConnectNotices'));
const StreamingTipsTab = lazy(() => import('./streaming-home/StreamingTipsTab'));

const STREAMING_HOME_HERO = {
  imageUrl:
    'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
  badge: '2026 HUB',
  aspect: 'portrait',
};

const STREAMING_HOME_MODULES = [
  {
    id: 'chat',
    title: '채팅 오버레이',
    eyebrow: 'Realtime Chat',
    description: '실시간 채팅과 하이라이트를 화면 중심으로 정리합니다.',
    imageUrl:
      'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=900&q=80',
    platform: 'soop',
    badge: '26+ 테마',
  },
  {
    id: 'alerts',
    title: '후원 알림',
    eyebrow: 'Alert Motion',
    description: 'TTS, 사운드, 최소 금액 조건을 미리보기 중심으로 조정합니다.',
    imageUrl:
      'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=900&q=80',
    platform: 'youtube',
    badge: 'TTS',
  },
  {
    id: 'goals',
    title: '목표 그래프',
    eyebrow: 'Goal Track',
    description: '목표치와 진행률을 텍스트보다 시각 흐름 위주로 보여줍니다.',
    imageUrl:
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=900&q=80',
    platform: 'chzzk',
    badge: 'Live Sync',
  },
  {
    id: 'subtitles',
    title: '후원 자막',
    eyebrow: 'Subtitle Layer',
    description: '짧은 문장과 강조 애니메이션 중심으로 정돈했습니다.',
    imageUrl:
      'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80',
    platform: 'twitch',
    badge: 'Caption',
  },
  {
    id: 'roulette',
    title: '룰렛 이벤트',
    eyebrow: 'Interaction',
    description: '참여형 이벤트를 대표 아트 카드처럼 노출합니다.',
    imageUrl:
      'https://images.unsplash.com/photo-1511882150382-421056c89033?auto=format&fit=crop&w=900&q=80',
    platform: 'soop',
    badge: 'Event',
  },
  {
    id: 'ads',
    title: '광고 오버레이',
    eyebrow: 'Brand Layer',
    description: '브랜드 슬롯과 캠페인 노출 영역을 깔끔하게 관리합니다.',
    imageUrl:
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=900&q=80',
    platform: 'youtube',
    badge: 'Sponsor',
  },
];

const STREAMING_HOME_OPERATIONS = [
  {
    id: 'design',
    title: '디자인 스튜디오',
    description: '오버레이 전체 톤과 브랜드 규칙을 한 곳에서 조정합니다.',
    imageUrl:
      'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80',
    logoUrl: getPlatformLogo('chzzk'),
    stats: [
      { label: 'Preset', value: '12개' },
      { label: 'Update', value: '실시간' },
    ],
  },
  {
    id: 'marketplace',
    title: '디자인 마켓',
    description: '다운로드 가능한 템플릿과 커버 자산을 바로 탐색합니다.',
    imageUrl:
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
    logoUrl: getPlatformLogo('soop'),
    stats: [
      { label: 'Template', value: '140+' },
      { label: 'Curated', value: '주간' },
    ],
  },
];

const TOP_TITLE_MAP = {
  account: '계정 설정',
  'streaming-home': '스트리밍 에이전트',
  'streaming-tips': '방송 가이드',
  'nconnect-home': 'N-CONNECT',
  'nconnect-contents': '진행 중인 콘텐츠',
  'nconnect-ranking': '포인트 TOP100',
  'nconnect-link': '계정 연결',
  'nconnect-membership': '멤버십 설명',
  'nconnect-rewards': '보상 안내',
  'nconnect-notices': '공지사항',
  'vod-home': 'VOD 스튜디오',
  'vod-upload': '업로드',
  'vod-videos': '영상 관리',
  'vod-analytics': '성과 분석',
  'vod-revenue': '수익 현황',
  'vod-settings': '채널 설정',
};

const TOP_SUBTITLE_MAP = {
  account: '채널 연결, 보안, 플랫폼 계정 상태를 한 화면에서 관리합니다.',
  'streaming-home': '오버레이와 운영 자산을 미디어 중심 허브로 정리했습니다.',
  'streaming-tips': '방송 실전 팁과 운영 인사이트를 카드 중심으로 탐색합니다.',
  'nconnect-home': '넥슨 게임 중심 멤버십 운영과 보상 구조를 한눈에 확인합니다.',
  'nconnect-contents': '지금 진행 중인 콘텐츠를 썸네일과 플랫폼 배지 중심으로 확인합니다.',
  'nconnect-ranking': '실시간 포인트 순위와 상위 크리에이터 흐름을 확인합니다.',
  'nconnect-link': '플랫폼과 넥슨 계정 연결 상태를 관리합니다.',
  'nconnect-membership': '멤버십 구조와 참여 방식, 시즌 규칙을 요약합니다.',
  'nconnect-rewards': '보상 체계와 지급 흐름을 카드 구조로 정리했습니다.',
  'nconnect-notices': '운영 공지와 일정 변동 사항을 확인합니다.',
  'vod-home': '업로드, 편집, 수익화를 위한 영상 운영 허브입니다.',
  'vod-upload': '업로드 큐와 메타데이터 정리를 진행합니다.',
  'vod-videos': '기존 업로드 영상과 상태를 관리합니다.',
  'vod-analytics': '조회수와 유지율 중심으로 성과를 확인합니다.',
  'vod-revenue': '광고와 후원 기반 수익 흐름을 확인합니다.',
  'vod-settings': 'VOD 채널 관련 설정을 관리합니다.',
};

const Dashboard = ({ mode = 'nconnect', initialTab }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isVodShell = location.pathname.startsWith('/vod-agent');
  const defaultTab =
    initialTab || (mode === 'streaming' ? 'streaming-home' : isVodShell ? 'vod-home' : 'nconnect-home');

  const [activeTab, setActiveTab] = useState(defaultTab);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [accountInitialSubTab, setAccountInitialSubTab] = useState('connection');
  const [accountActivationKey, setAccountActivationKey] = useState(0);

  const overlayHash = user?.userHash || user?.overlayHash || null;
  const dashboardMode = mode === 'streaming' ? 'streaming' : 'nconnect';

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  const nConnectMenu = useMemo(
    () => [
      {
        label: 'N-CONNECT',
        items: [
          { id: 'nconnect-home', label: '홈', icon: <Layout size={18} /> },
          { id: 'nconnect-contents', label: '진행 중인 콘텐츠', icon: <PanelsTopLeft size={18} /> },
          { id: 'nconnect-ranking', label: '포인트 TOP100', icon: <Trophy size={18} /> },
        ],
      },
      {
        label: '멤버십',
        items: [
          { id: 'nconnect-link', label: '계정 연결', icon: <Link2 size={18} /> },
          { id: 'nconnect-membership', label: '멤버십 설명', icon: <Gift size={18} /> },
          { id: 'nconnect-rewards', label: '보상 안내', icon: <Gift size={18} /> },
          { id: 'nconnect-notices', label: '공지사항', icon: <Megaphone size={18} /> },
        ],
      },
    ],
    []
  );

  const vodMenu = useMemo(
    () => [
      {
        label: 'VOD 스튜디오',
        items: [
          { id: 'vod-home', label: '홈', icon: <Video size={18} /> },
          { id: 'vod-upload', label: '업로드', icon: <Upload size={18} /> },
          { id: 'vod-videos', label: '영상 관리', icon: <Video size={18} /> },
          { id: 'vod-analytics', label: '성과 분석', icon: <Trophy size={18} /> },
          { id: 'vod-revenue', label: '수익 현황', icon: <Gift size={18} /> },
          { id: 'vod-settings', label: '채널 설정', icon: <Settings size={18} /> },
        ],
      },
    ],
    []
  );

  const streamingAgentMenu = useMemo(
    () => [
      {
        label: '허브',
        items: [
          { id: 'streaming-home', label: '스트리밍 홈', icon: <Layout size={18} /> },
          { id: 'streaming-tips', label: '방송 팁', icon: <PanelsTopLeft size={18} /> },
        ],
      },
      {
        label: '오버레이 설정',
        items: [
          { id: 'chat', label: '채팅 오버레이', icon: <MessageSquare size={18} /> },
          { id: 'alerts', label: '후원 알림', icon: <Megaphone size={18} /> },
          { id: 'game', label: '게임 설정', icon: <Gamepad2 size={18} /> },
          { id: 'subtitles', label: '후원 자막', icon: <Gift size={18} /> },
          { id: 'goals', label: '목표 그래프', icon: <Trophy size={18} /> },
          { id: 'ticker', label: '전광판', icon: <Megaphone size={18} /> },
          { id: 'roulette', label: '룰렛', icon: <Disc size={18} /> },
          { id: 'emoji', label: '이모지 반응', icon: <Smile size={18} /> },
          { id: 'voting', label: '실시간 투표', icon: <Vote size={18} /> },
          { id: 'credits', label: '엔딩 크레딧', icon: <Film size={18} /> },
          { id: 'bot', label: '봇 설정', icon: <Bot size={18} /> },
          { id: 'ads', label: '광고 오버레이', icon: <Megaphone size={18} /> },
        ],
      },
      {
        label: '운영 자산',
        items: [
          { id: 'design', label: '디자인 스튜디오', icon: <Palette size={18} /> },
          { id: 'marketplace', label: '디자인 마켓', icon: <Store size={18} /> },
        ],
      },
    ],
    []
  );

  const menuGroups = mode === 'streaming' ? streamingAgentMenu : isVodShell ? vodMenu : nConnectMenu;

  const handleNavItemClick = (itemId) => {
    setActiveTab(itemId);
    setMobileMenuOpen(false);
  };

  const toggleGroup = (groupLabel) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupLabel]: !prev[groupLabel],
    }));
  };

  const openDefaultOverlay = () => {
    const overlayPath = overlayHash ? `/overlay/${overlayHash}/chat` : '/overlay/chat';
    window.open(overlayPath, '_blank', 'noopener,noreferrer');
  };

  const openExternalGuide = (url) => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openAccountSettings = (subTab = 'connection') => {
    setAccountInitialSubTab(subTab);
    setAccountActivationKey((prev) => prev + 1);
    setActiveTab('account');
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    if (!location.state?.openAccount) return;

    openAccountSettings(location.state.subTab || 'connection');
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  const renderStreamingHome = () => (
    <div className="animate-fade studio-dashboard-home">
      <MediaHero
        accent="blue"
        eyebrow={
          <>
            <StatusBadge className="studio-accent--blue">스트리밍 에이전트</StatusBadge>
            <LogoChip logoUrl={getPlatformLogo('soop')} label="SOOP" />
            <LogoChip logoUrl={getPlatformLogo('chzzk')} label="CHZZK" />
            <LogoChip logoUrl={getPlatformLogo('youtube')} label="YouTube" />
            <LogoChip logoUrl={getPlatformLogo('twitch')} label="Twitch" />
          </>
        }
        title="텍스트보다 화면이 먼저 보이는 오버레이 허브"
        description="대표 비주얼, 모듈 썸네일, 플랫폼 로고, 운영 자산을 같은 문법으로 묶어 방송 준비 흐름이 한 화면에서 바로 읽히도록 바꿨습니다."
        media={STREAMING_HOME_HERO}
        stats={[
          { label: '활성 모듈', value: '12개' },
          { label: '지원 플랫폼', value: '4개' },
          { label: '동기화', value: '실시간' },
        ]}
        actions={
          <>
            <button type="button" className="btn btn-outline" onClick={() => navigate('/n-connect')}>
              <Layout size={16} />
              N-CONNECT 보기
            </button>
            <button type="button" className="btn btn-primary" onClick={openDefaultOverlay}>
              <ExternalLink size={16} />
              기본 오버레이 열기
            </button>
          </>
        }
        insights={[
          {
            kicker: 'Media First',
            title: '아이콘 대신 실제 모듈 썸네일',
            body: '긴 설명보다 이미지, 배지, 핵심 상태만 빠르게 읽히도록 구성했습니다.',
          },
          {
            kicker: 'Operation',
            title: '디자인 자산도 같은 흐름으로 연결',
            body: '디자인 스튜디오와 마켓플레이스도 별도 도구가 아니라 같은 허브 경험 안에 놓았습니다.',
          },
        ]}
        overlay={
          <div className="studio-dashboard-home__hero-stack">
            <div className="studio-dashboard-home__hero-metric">
              <span>Live Preview</span>
              <strong>화면 미리보기 중심</strong>
              <p>이미지, 로고, 상태 배지로 지금 보이는 구성을 바로 파악할 수 있습니다.</p>
            </div>
            <InsightStrip
              items={[
                { kicker: 'Cover', title: '카테고리 썸네일', body: '게임 이미지 우선 노출' },
                { kicker: 'Brand', title: '플랫폼 배지', body: '서비스 식별 속도 개선' },
              ]}
            />
          </div>
        }
      />

      <StreamerGuideTabs
        onInternalTab={handleNavItemClick}
        onAccountSubTab={openAccountSettings}
        onExternalLink={openExternalGuide}
      />

      <MediaRail
        title="오버레이 모듈"
        description="가장 자주 여는 모듈을 썸네일 중심 포스터 카드로 재구성했습니다."
      >
        {STREAMING_HOME_MODULES.map((item) => (
          <PosterCard
            key={item.id}
            accent="blue"
            eyebrow={item.eyebrow}
            title={item.title}
            description={item.description}
            imageUrl={item.imageUrl}
            logoUrl={getPlatformLogo(item.platform)}
            badge={item.badge}
            stats={[
              { label: '상태', value: '준비됨' },
              { label: '진입', value: '즉시' },
            ]}
            onClick={() => handleNavItemClick(item.id)}
          />
        ))}
      </MediaRail>

      <SectionCard
        accent="blue"
        title="운영 자산"
        description="디자인과 마켓 자산도 이미지와 로고 중심 카드로 같은 흐름에 연결했습니다."
      >
        <div className="studio-dashboard-home__entity-grid">
          {STREAMING_HOME_OPERATIONS.map((item) => (
            <EntityCard
              key={item.id}
              accent="blue"
              eyebrow="Studio Asset"
              title={item.title}
              description={item.description}
              avatarUrl={item.logoUrl}
              coverUrl={item.imageUrl}
              logoUrl={item.logoUrl}
              stats={item.stats}
              action={<span className="section-link">바로 이동</span>}
              onClick={() => handleNavItemClick(item.id)}
            />
          ))}
        </div>
      </SectionCard>
    </div>
  );

  const tabComponents = {
    'nconnect-home': NConnectHome,
    'nconnect-contents': NConnectContents,
    'nconnect-ranking': NConnectRanking,
    'nconnect-link': NConnectLink,
    'nconnect-membership': NConnectMembership,
    'nconnect-rewards': NConnectRewards,
    'nconnect-notices': NConnectNotices,
    chat: ChatSettings,
    alerts: AlertSettings,
    subtitles: SubtitleSettings,
    goals: GoalSettings,
    ticker: TickerSettings,
    roulette: RouletteSettings,
    emoji: EmojiSettings,
    voting: VotingSettings,
    credits: CreditsSettings,
    bot: BotSettings,
    game: GameSettings,
    'streaming-tips': StreamingTipsTab,
    design: DesignSettings,
    ads: AdSettings,
    marketplace: MarketplaceTab,
    'vod-home': VodHome,
    'vod-upload': VodUpload,
    'vod-videos': VodVideos,
    'vod-analytics': VodAnalytics,
    'vod-revenue': VodRevenue,
    'vod-settings': VodSettings,
  };

  const renderContent = () => {
    if (activeTab === 'streaming-home') return renderStreamingHome();

    if (activeTab === 'account') {
      return (
        <AccountSettings
          initialSubTab={accountInitialSubTab}
          activationKey={accountActivationKey}
        />
      );
    }

    const ActiveComponent = tabComponents[activeTab];
    if (ActiveComponent) {
      if (activeTab === 'game' || activeTab === 'vod-home') {
        return <ActiveComponent onNavigate={setActiveTab} />;
      }

      if (activeTab.startsWith('nconnect-')) {
        return (
          <ActiveComponent
            onNavigate={setActiveTab}
            onOpenAccountSettings={openAccountSettings}
          />
        );
      }

      return <ActiveComponent />;
    }

    return (
      <EmptyState
        className={`studio-accent--${mode === 'streaming' ? 'blue' : 'amber'}`}
        icon={<Settings size={28} />}
        title="아직 준비 중인 화면입니다"
        description="선택한 메뉴는 현재 레이아웃을 정리 중이며, 같은 디자인 시스템으로 순차 적용됩니다."
        action={
          <button
            type="button"
            className="btn btn-outline"
            onClick={() =>
              setActiveTab(mode === 'streaming' ? 'streaming-home' : isVodShell ? 'vod-home' : 'nconnect-home')
            }
          >
            홈으로 돌아가기
          </button>
        }
      />
    );
  };

  const getTopTitle = () => TOP_TITLE_MAP[activeTab] || 'N-CONNECT';

  const getTopSubtitle = () =>
    TOP_SUBTITLE_MAP[activeTab] || '넥슨 게임 크리에이터 운영 허브를 한 화면에서 관리합니다.';

  const isNConnectHome = !isVodShell && mode !== 'streaming' && activeTab === 'nconnect-home';

  return (
    <div className="dashboard-page" data-dashboard-mode={dashboardMode}>
      <ServiceBar />
      <div className="dashboard-layout">
        {mobileMenuOpen ? (
          <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} />
        ) : null}

        <aside className={`chatgpt-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          {mobileMenuOpen ? (
            <button type="button" className="sidebar-close-btn" onClick={() => setMobileMenuOpen(false)}>
              <X size={24} />
            </button>
          ) : null}

          <div className="sidebar-top">
            <div className="app-logo">
              <div className="logo-icon">{mode === 'streaming' ? 'O' : isVodShell ? 'V' : 'N'}</div>
              <div>
                <div className="logo-text">
                  {mode === 'streaming' ? '스트리밍 에이전트' : isVodShell ? 'VOD 스튜디오' : 'N-CONNECT'}
                </div>
                <div className="sidebar-note">
                  {mode === 'streaming'
                    ? '오버레이 운영과 방송 자산 관리를 위한 허브'
                    : isVodShell
                      ? '업로드부터 수익화까지 영상 운영 전용 허브'
                      : '넥슨 게임 멤버십 운영을 위한 전용 허브'}
                </div>
              </div>
            </div>
          </div>

          <nav className="sidebar-nav">
            {menuGroups.map((group) => {
              const isCollapsed = collapsedGroups[group.label];
              const hasActiveItem = group.items.some((item) => item.id === activeTab);

              return (
                <div key={group.label} className="nav-group">
                  <button
                    type="button"
                    className={`group-label-btn ${hasActiveItem ? 'has-active' : ''}`}
                    onClick={() => toggleGroup(group.label)}
                  >
                    <span className="group-label">{group.label}</span>
                    <ChevronDown size={14} className={`group-chevron ${isCollapsed ? 'collapsed' : ''}`} />
                  </button>
                  <div className={`nav-group-items ${isCollapsed ? 'collapsed' : ''}`}>
                    {group.items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                        onClick={() => handleNavItemClick(item.id)}
                        title={item.label}
                      >
                        {item.icon}
                        <span className="nav-label">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </nav>
        </aside>

        <main className="chatgpt-main">
          <header className="top-nav">
            <button type="button" className="mobile-menu-btn" onClick={() => setMobileMenuOpen(true)}>
              <Menu size={24} />
            </button>

            {!isNConnectHome ? (
              <div className="top-nav__service">
                <div className="top-nav__title">{getTopTitle()}</div>
                <div className="top-nav__subtitle">{getTopSubtitle()}</div>
              </div>
            ) : null}
          </header>

          <div className="content-body">
            <Suspense fallback={<LoadingSpinner fullHeight text="화면을 준비하고 있습니다..." />}>
              {renderContent()}
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
