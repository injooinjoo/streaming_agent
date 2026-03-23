import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  Check,
  Copy,
  ExternalLink,
  Globe,
  Heart,
  Link2,
  Play,
  Settings,
  Sparkles,
  Users,
  Eye,
} from 'lucide-react';
import { formatCompactKo, formatCurrency, formatFullNumber } from '../../utils/formatters';
import { getPlatformLogo, normalizeMediaEntity } from '../../utils/mediaAssets';
import LoadingSpinner from '../shared/LoadingSpinner';
import {
  AppShell,
  EmptyState,
  EntityCard,
  FormSection,
  InsightStrip,
  MediaHero,
  MediaRail,
  MetricCard,
  PosterCard,
  SectionCard,
  SidebarSection,
  StatusBadge,
  StickyActionDock,
} from '../shared/studio';
import './ChannelPage.css';

const navItems = [
  { id: 'overview', label: '개요', icon: Sparkles },
  { id: 'stats', label: '성과', icon: BarChart3 },
  { id: 'streams', label: '최근 방송', icon: Play },
  { id: 'connections', label: '플랫폼 연결', icon: Link2 },
  { id: 'settings', label: '채널 설정', icon: Settings },
];

const mockChannelData = {
  id: 'demo-channel',
  displayName: '데모 스트리머',
  username: 'demo_streamer',
  avatarUrl:
    'https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=320&q=80',
  coverUrl:
    'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1400&q=80',
  bio: '게임, 토크, 협업 방송을 오가며 브랜드 톤과 방송 운영 완성도를 함께 챙기는 크리에이터 채널입니다.',
  verified: true,
  level: 42,
  createdAt: '2023-05-15',
  region: '서울',
  platforms: [
    {
      id: 'soop',
      name: 'SOOP',
      connected: true,
      followers: 15420,
      channelUrl: 'https://www.sooplive.co.kr/demo',
      imageUrl:
        'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=900&q=80',
      description: '핵심 라이브 채널과 멤버십 동선을 운영하는 메인 플랫폼',
    },
    {
      id: 'chzzk',
      name: 'CHZZK',
      connected: true,
      followers: 8350,
      channelUrl: 'https://chzzk.naver.com/demo',
      imageUrl:
        'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80',
      description: '토크와 협업형 콘텐츠를 빠르게 소화하는 서브 채널',
    },
    {
      id: 'youtube',
      name: 'YouTube',
      connected: false,
      followers: 0,
      channelUrl: '',
      imageUrl:
        'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?auto=format&fit=crop&w=900&q=80',
      description: '하이라이트와 아카이브 재가공 채널',
    },
  ],
  stats: {
    totalFollowers: 23770,
    totalViews: 1250000,
    avgViewers: 342,
    peakViewers: 1580,
    totalStreams: 156,
    totalHours: 892,
    totalDonations: 4520000,
    lastStreamDate: '2026-03-15',
  },
  recentStreams: [
    {
      id: 1,
      title: '[LoL] 시즌 막판 듀오 랭크',
      date: '2026-03-15',
      duration: '4시간 32분',
      viewers: 485,
      category: 'League of Legends',
      platform: 'soop',
      thumbnailUrl:
        'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=900&q=80',
      kicker: 'Ranked Night',
    },
    {
      id: 2,
      title: '시청자 사연 읽기 + 심야 토크',
      date: '2026-03-14',
      duration: '3시간 15분',
      viewers: 312,
      category: 'Just Chatting',
      platform: 'chzzk',
      thumbnailUrl:
        'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80',
      kicker: 'Late Talk',
    },
    {
      id: 3,
      title: '콜라보 썸네일 제작 방송',
      date: '2026-03-12',
      duration: '2시간 45분',
      viewers: 428,
      category: 'Creative',
      platform: 'youtube',
      thumbnailUrl:
        'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?auto=format&fit=crop&w=900&q=80',
      kicker: 'Creative',
    },
  ],
  badges: [
    { id: 'partner', name: '파트너', tone: 'default' },
    { id: 'top100', name: 'TOP 100', tone: 'default' },
    { id: 'verified', name: '공식 인증', tone: 'success' },
  ],
  socialLinks: [
    { platform: 'X', url: 'https://twitter.com/demo', label: '@demo_streamer' },
    { platform: 'Instagram', url: 'https://instagram.com/demo', label: '@demo_streamer' },
    { platform: 'Discord', url: 'https://discord.gg/demo', label: 'Demo Server' },
  ],
};

const ChannelPage = () => {
  const { channelId } = useParams();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('overview');
  const [channelData, setChannelData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [liveStatus, setLiveStatus] = useState(null);

  useEffect(() => {
    const fetchChannelData = async () => {
      setLoading(true);

      try {
        setChannelData({
          ...mockChannelData,
          id: channelId || mockChannelData.id,
        });
        setLiveStatus({
          isLive: true,
          viewers: 523,
          startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          title: '실시간 토크 + 오버레이 세팅 방송',
          category: 'Just Chatting',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchChannelData();
  }, [channelId]);

  const copyChannelUrl = async () => {
    if (!channelData) return;

    const url = `${window.location.origin}/channel/${channelData.id}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const connectedPlatforms = useMemo(
    () => channelData?.platforms.filter((platform) => platform.connected) || [],
    [channelData]
  );

  const liveDuration = useMemo(() => {
    if (!liveStatus?.startedAt) return '';

    const elapsed = Date.now() - liveStatus.startedAt.getTime();
    const hours = Math.floor(elapsed / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    return `${hours}시간 ${minutes}분 진행 중`;
  }, [liveStatus]);

  if (loading) {
    return (
      <AppShell accent="blue">
        <div className="channel-studio channel-studio--loading">
          <LoadingSpinner fullHeight text="채널 정보를 불러오는 중입니다..." />
        </div>
      </AppShell>
    );
  }

  if (!channelData) {
    return (
      <AppShell accent="blue">
        <div className="channel-studio">
          <EmptyState
            icon={<Users size={28} />}
            title="채널 정보를 찾을 수 없습니다"
            description="요청한 채널이 존재하지 않거나 공개 상태가 아닙니다."
            action={
              <button className="btn btn-primary" onClick={() => navigate('/streaming-agent')}>
                홈으로 이동
              </button>
            }
          />
        </div>
      </AppShell>
    );
  }

  const heroMedia = normalizeMediaEntity(channelData, {
    imageUrl: channelData.coverUrl,
    avatarUrl: channelData.avatarUrl,
    platform: connectedPlatforms[0]?.id,
    label: channelData.displayName,
  });

  const overviewInsights = [
    {
      kicker: 'Brand',
      title: '방송과 채널 페이지 톤이 잘 맞춰진 채널',
      body: '최근 방송 썸네일과 플랫폼 소개가 모두 같은 다크 톤으로 정리되어 브랜드 일관성이 좋습니다.',
    },
    {
      kicker: 'Growth',
      title: '실시간 토크형 콘텐츠에서 반응이 특히 강함',
      body: '게임 방송보다 토크와 협업형 방송에서 시청자 체류가 더 오래 유지되는 흐름입니다.',
    },
    {
      kicker: 'Ops',
      title: 'SOOP 메인, CHZZK 보조 운영 구조',
      body: '메인 라이브와 토크형 서브 운영을 분리해 채널 성격을 분명하게 가져가고 있습니다.',
    },
  ];

  const renderOverview = () => (
    <div className="channel-studio__section-stack">
      <MediaRail
        title="최근 방송 포스터"
        description="텍스트 줄 목록 대신 최근 방송을 썸네일 중심 카드로 바로 훑을 수 있게 구성했습니다."
      >
        {channelData.recentStreams.map((stream) => {
          const media = normalizeMediaEntity(stream, {
            platform: stream.platform,
            label: stream.title,
          });

          return (
            <PosterCard
              key={stream.id}
              accent="blue"
              eyebrow={stream.kicker}
              title={stream.title}
              description={`${stream.date} · ${stream.duration} · ${stream.category}`}
              imageUrl={media.thumbnailUrl}
              logoUrl={media.logoUrl}
              badge={stream.platform.toUpperCase()}
              stats={[
                { label: '시청', value: `${formatFullNumber(stream.viewers)}명`, sensitive: true },
                { label: '카테고리', value: stream.category },
              ]}
              action={<button className="btn btn-outline">방송 보기</button>}
            />
          );
        })}
      </MediaRail>

      <section className="channel-studio__entity-grid">
        {connectedPlatforms.map((platform) => {
          const media = normalizeMediaEntity(platform, {
            imageUrl: platform.imageUrl,
            platform: platform.id,
            label: platform.name,
          });

          return (
            <EntityCard
              key={platform.id}
              accent="blue"
              eyebrow="Platform"
              title={platform.name}
              description={platform.description}
              coverUrl={media.imageUrl}
              avatarUrl={getPlatformLogo(platform.id)}
              logoUrl={media.logoUrl}
              badge={platform.connected ? '연결됨' : '대기'}
              stats={[
                { label: '팔로워', value: formatCompactKo(platform.followers), sensitive: true },
                { label: '상태', value: platform.connected ? '운영 중' : '연결 전' },
              ]}
              action={
                platform.channelUrl ? (
                  <a href={platform.channelUrl} target="_blank" rel="noreferrer" className="btn btn-outline">
                    <ExternalLink size={16} />
                    채널 열기
                  </a>
                ) : (
                  <button className="btn btn-primary">연결 시작</button>
                )
              }
            />
          );
        })}
      </section>

      <SectionCard
        accent="blue"
        title="운영 인사이트"
        description="숫자만 나열하지 않고 현재 채널 운영의 강점을 한 문장씩 빠르게 읽을 수 있도록 정리했습니다."
      >
        <InsightStrip items={overviewInsights} />
      </SectionCard>
    </div>
  );

  const renderStats = () => (
    <div className="channel-studio__section-stack channel-studio__section-stack--stats">
      <SectionCard
        accent="blue"
        title="채널 성과 요약"
        description="핵심 지표와 최근 흐름을 한 번에 확인할 수 있도록 재구성했습니다."
      >
        <div className="channel-studio__stats-board">
          <div className="channel-studio__stats-row">
            <span>누적 후원</span>
            <strong>{formatCurrency(channelData.stats.totalDonations)}</strong>
          </div>
          <div className="channel-studio__stats-row">
            <span>총 방송 수</span>
            <strong>{channelData.stats.totalStreams}회</strong>
          </div>
          <div className="channel-studio__stats-row">
            <span>누적 방송 시간</span>
            <strong>{channelData.stats.totalHours}시간</strong>
          </div>
          <div className="channel-studio__stats-row">
            <span>마지막 방송</span>
            <strong>{channelData.stats.lastStreamDate}</strong>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        accent="blue"
        title="콘텐츠 메모"
        description="브랜드와 운영 방향을 설명형 문장으로 간단히 남겨두는 공간입니다."
      >
        <div className="channel-studio__editorial-note">
          <p>
            평균 시청자 규모는 안정적으로 유지되고 있으며, 심야 토크와 협업형 방송에서 피크가 크게
            올라가는 패턴이 반복됩니다.
          </p>
          <p>
            게임과 토크를 오가는 편성 구조라서 썸네일, 알림, 채팅 오버레이 톤을 동일하게 맞추면 채널
            인상이 더 선명해질 수 있습니다.
          </p>
        </div>
      </SectionCard>
    </div>
  );

  const renderStreams = () => (
    <MediaRail
      title="방송 아카이브"
      description="최근 방송을 방송 썸네일 카드로 정리해 어떤 콘텐츠가 반복되고 있는지 바로 보이게 했습니다."
    >
      {channelData.recentStreams.map((stream) => {
        const media = normalizeMediaEntity(stream, {
          platform: stream.platform,
          label: stream.title,
        });

        return (
          <PosterCard
            key={stream.id}
            accent="blue"
            eyebrow={stream.date}
            title={stream.title}
            description={`${stream.duration} · ${stream.category}`}
            imageUrl={media.imageUrl}
            logoUrl={media.logoUrl}
            badge={`${formatCompactKo(stream.viewers)} 시청`}
            stats={[
              { label: '플랫폼', value: stream.platform.toUpperCase() },
              { label: '시청자', value: `${formatFullNumber(stream.viewers)}명`, sensitive: true },
            ]}
            action={<button className="btn btn-outline">상세 보기</button>}
          />
        );
      })}
    </MediaRail>
  );

  const renderConnections = () => (
    <section className="channel-studio__entity-grid">
      {channelData.platforms.map((platform) => {
        const media = normalizeMediaEntity(platform, {
          imageUrl: platform.imageUrl,
          platform: platform.id,
          label: platform.name,
        });

        return (
          <EntityCard
            key={platform.id}
            accent="blue"
            eyebrow={platform.connected ? 'Connected' : 'Pending'}
            title={platform.name}
            description={
              platform.connected
                ? `${formatCompactKo(platform.followers)} 팔로워와 연결된 공개 채널입니다.`
                : '아직 계정 연결이 완료되지 않았습니다.'
            }
            coverUrl={media.imageUrl}
            avatarUrl={getPlatformLogo(platform.id)}
            logoUrl={media.logoUrl}
            badge={platform.connected ? '활성' : '비활성'}
            stats={[
              { label: '팔로워', value: formatCompactKo(platform.followers), sensitive: true },
              { label: 'URL', value: platform.channelUrl ? '연결됨' : '미설정' },
            ]}
            action={
              <div className="channel-studio__connection-actions">
                {platform.connected ? (
                  <>
                    <button className="btn btn-outline">설정 보기</button>
                    <a href={platform.channelUrl} target="_blank" rel="noreferrer" className="btn btn-primary">
                      채널 열기
                    </a>
                  </>
                ) : (
                  <button className="btn btn-primary">연결 시작</button>
                )}
              </div>
            }
          />
        );
      })}
    </section>
  );

  const renderSettings = () => (
    <div className="channel-studio__settings-layout">
      <FormSection
        accent="blue"
        title="기본 정보"
        description="공개 채널명과 소개 문구, 지역 정보를 정리합니다."
      >
        <div className="channel-studio__field-grid">
          <label className="channel-studio__field">
            <span>채널 이름</span>
            <input type="text" defaultValue={channelData.displayName} />
          </label>
          <label className="channel-studio__field">
            <span>대표 지역</span>
            <input type="text" defaultValue={channelData.region} />
          </label>
          <label className="channel-studio__field channel-studio__field--full">
            <span>채널 소개</span>
            <textarea rows={4} defaultValue={channelData.bio} />
          </label>
        </div>
      </FormSection>

      <FormSection
        accent="blue"
        title="노출 옵션"
        description="방송 공지와 후원 하이라이트 노출 규칙을 관리합니다."
      >
        <div className="channel-studio__toggle-list">
          <div className="channel-studio__toggle-card">
            <div>
              <strong>방송 시작 알림</strong>
              <p>라이브 시작 시 팔로워에게 자동 공지와 알림을 발송합니다.</p>
            </div>
            <input type="checkbox" defaultChecked />
          </div>
          <div className="channel-studio__toggle-card">
            <div>
              <strong>후원 하이라이트 노출</strong>
              <p>최근 후원과 반응을 채널 상단에서 미리 볼 수 있게 유지합니다.</p>
            </div>
            <input type="checkbox" defaultChecked />
          </div>
        </div>
      </FormSection>

      <StickyActionDock
        secondaryAction={<button className="btn btn-outline">초기화</button>}
        primaryAction={<button className="btn btn-primary">변경 사항 저장</button>}
      />
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'stats':
        return renderStats();
      case 'streams':
        return renderStreams();
      case 'connections':
        return renderConnections();
      case 'settings':
        return renderSettings();
      case 'overview':
      default:
        return renderOverview();
    }
  };

  return (
    <AppShell accent="blue">
      <div className="channel-studio">
        <aside className="channel-studio__rail">
          <SidebarSection compact>
            <button className="channel-studio__back" onClick={() => navigate(-1)}>
              <ArrowLeft size={16} />
              돌아가기
            </button>
          </SidebarSection>

          <SidebarSection title="Channel">
            <div className="channel-studio__identity-card">
              <div className="channel-studio__avatar">
                {channelData.avatarUrl ? (
                  <img src={channelData.avatarUrl} alt={channelData.displayName} />
                ) : (
                  <span>{channelData.displayName.charAt(0)}</span>
                )}
              </div>
              <div>
                <strong>{channelData.displayName}</strong>
                <span>@{channelData.username}</span>
              </div>
              <div className="channel-studio__identity-badges">
                {channelData.verified ? <StatusBadge tone="success">인증됨</StatusBadge> : null}
                {liveStatus?.isLive ? <StatusBadge tone="danger">LIVE</StatusBadge> : null}
              </div>
            </div>
          </SidebarSection>

          <SidebarSection title="탐색">
            <nav className="channel-studio__nav">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={activeSection === item.id ? 'active' : ''}
                    onClick={() => setActiveSection(item.id)}
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </SidebarSection>

          <SidebarSection title="소셜">
            <div className="channel-studio__social-links">
              {channelData.socialLinks.map((link) => (
                <a key={link.platform} href={link.url} target="_blank" rel="noreferrer">
                  <Globe size={15} />
                  <span>{link.label}</span>
                </a>
              ))}
            </div>
          </SidebarSection>
        </aside>

        <main className="channel-studio__main">
          <MediaHero
            accent="blue"
            eyebrow={
              <>
                <StatusBadge className="studio-accent--blue" icon={<Sparkles size={14} />}>
                  Creator Channel
                </StatusBadge>
                {connectedPlatforms.map((platform) => (
                  <StatusBadge key={platform.id}>{platform.name}</StatusBadge>
                ))}
              </>
            }
            title={channelData.displayName}
            description={`${channelData.bio} 현재 ${connectedPlatforms.length}개 플랫폼과 연결되어 있으며, 평균 ${formatCompactKo(
              channelData.stats.avgViewers
            )}명의 시청자가 유입되고 있습니다.`}
            media={{
              imageUrl: heroMedia.imageUrl,
              logoUrl: heroMedia.logoUrl,
              label: channelData.displayName,
              badge: liveStatus?.isLive ? 'LIVE NOW' : 'Archive',
              aspect: 'portrait',
            }}
            stats={[
              { label: '생성일', value: channelData.createdAt },
              { label: '지역', value: channelData.region },
              { label: '연결 플랫폼', value: `${connectedPlatforms.length}개` },
            ]}
            actions={
              <>
                <button className="btn btn-primary">
                  <Heart size={16} />
                  팔로우
                </button>
                <button className="btn btn-outline" onClick={copyChannelUrl}>
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? '복사됨' : '채널 공유'}
                </button>
              </>
            }
            insights={overviewInsights.slice(0, 2)}
            overlay={
              liveStatus?.isLive ? (
                <div className="channel-studio__live-panel">
                  <div>
                    <StatusBadge tone="danger">LIVE</StatusBadge>
                    <h3>{liveStatus.title}</h3>
                    <p>{liveDuration}</p>
                  </div>
                  <div className="channel-studio__live-stats">
                    <div>
                      <span>현재 시청자</span>
                      <strong>{formatFullNumber(liveStatus.viewers)}명</strong>
                    </div>
                    <div>
                      <span>라이브 카테고리</span>
                      <strong>{liveStatus.category}</strong>
                    </div>
                  </div>
                </div>
              ) : null
            }
          />

          <section className="channel-studio__metrics">
            <MetricCard
              accent="blue"
              tone="audience"
              label="팔로워"
              value={`${formatCompactKo(channelData.stats.totalFollowers)}명`}
              meta="전체 플랫폼 합산"
              sensitiveValue
              icon={<Users size={18} />}
            />
            <MetricCard
              accent="blue"
              tone="activity"
              label="누적 조회"
              value={`${formatCompactKo(channelData.stats.totalViews)}회`}
              meta="라이브와 VOD 포함"
              sensitiveValue
              icon={<Eye size={18} />}
            />
            <MetricCard
              accent="blue"
              tone="growth"
              label="평균 시청"
              value={`${formatFullNumber(channelData.stats.avgViewers)}명`}
              meta={`피크 ${formatFullNumber(channelData.stats.peakViewers)}명`}
              sensitiveValue
              sensitiveMeta
              icon={<BarChart3 size={18} />}
            />
          </section>

          {renderContent()}

          {activeSection !== 'settings' ? (
            <StickyActionDock
              secondaryAction={
                <button className="btn btn-outline" onClick={() => setActiveSection('connections')}>
                  <Link2 size={16} />
                  플랫폼 연결 보기
                </button>
              }
              primaryAction={
                <button className="btn btn-primary" onClick={() => setActiveSection('streams')}>
                  <Play size={16} />
                  최근 방송 보기
                </button>
              }
            />
          ) : null}
        </main>
      </div>
    </AppShell>
  );
};

export default ChannelPage;
