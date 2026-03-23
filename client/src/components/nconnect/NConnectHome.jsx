import { CalendarRange, Gift, Link2, Rocket, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import SensitiveValue from '../shared/SensitiveValue';
import {
  EntityCard,
  LogoChip,
  MediaHero,
  MediaRail,
  MetricCard,
  PosterCard,
  SectionCard,
  StatusBadge,
} from '../shared/studio';
import { getPlatformLogo } from '../../utils/mediaAssets';
import {
  nconnectHighlights,
  nconnectPointPillars,
  nconnectPromotionRewards,
  nconnectTimeline,
} from './nconnectContent';

const QUICK_OPERATIONS = [
  {
    id: 'nconnect-ranking',
    title: '포인트 TOP100',
    eyebrow: 'Ranking',
    description: '상위 멤버십 크리에이터를 썸네일 중심으로 빠르게 탐색합니다.',
    imageUrl:
      'https://images.unsplash.com/photo-1511882150382-421056c89033?auto=format&fit=crop&w=900&q=80',
    logoUrl: getPlatformLogo('soop'),
    badge: 'Live',
  },
  {
    id: 'nconnect-link',
    title: '계정 연결',
    eyebrow: 'Connect',
    description: 'SOOP, CHZZK, 넥슨 계정을 연결하고 상태를 즉시 확인합니다.',
    imageUrl:
      'https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=900&q=80',
    logoUrl: getPlatformLogo('chzzk'),
    badge: 'Ready',
  },
  {
    id: 'nconnect-membership',
    title: '멤버십 구조',
    eyebrow: 'Membership',
    description: '포인트 산정과 시즌 구조를 큰 카드 흐름으로 정리했습니다.',
    imageUrl:
      'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=900&q=80',
    logoUrl: getPlatformLogo('soop'),
    badge: '2026',
  },
];

const NConnectHome = ({ onNavigate }) => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const handleJoinClick = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    onNavigate('nconnect-link');
  };

  return (
    <div className="nconnect-page animate-fade">
      <MediaHero
        accent="amber"
        eyebrow={
          <>
            <StatusBadge className="studio-accent--amber">NEXON Membership</StatusBadge>
            <LogoChip logoUrl={getPlatformLogo('soop')} label="SOOP" />
            <LogoChip logoUrl={getPlatformLogo('chzzk')} label="CHZZK" />
          </>
        }
        title="브라운 톤 운영 허브 안에 멤버십 요약과 퀵 액션을 한 번에 담았습니다."
        description={
          isAuthenticated
            ? `${user?.displayName || '크리에이터'}님의 계정 상태를 기준으로 포인트, 보상, 시즌 진입 흐름을 더 짧고 선명한 카드 구조로 정리했습니다.`
            : 'N-CONNECT는 넥슨 게임 중심 활동을 포인트와 보상 구조로 연결하는 멤버십 허브입니다. 텍스트 설명 대신 운영에 바로 필요한 화면부터 전면에 배치했습니다.'
        }
        media={{
          imageUrl:
            'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
          badge: 'Season 2026',
          aspect: 'portrait',
        }}
        stats={[
          { label: '운영 시즌', value: '2026.04~09' },
          { label: '보상 규모', value: '6.8억' },
          { label: '랭킹 대상', value: 'TOP 100' },
        ]}
        actions={
          <>
            <button type="button" className="btn btn-primary" onClick={() => onNavigate('nconnect-ranking')}>
              <Trophy size={16} />
              TOP100 보기
            </button>
            <button type="button" className="btn btn-outline" onClick={handleJoinClick}>
              <Link2 size={16} />
              계정 연결
            </button>
            <button type="button" className="btn btn-outline" onClick={() => onNavigate('nconnect-membership')}>
              <Rocket size={16} />
              멤버십 구조
            </button>
          </>
        }
        insights={[
          {
            kicker: 'Quick Action',
            title: '홈에서 바로 랭킹과 연결로 이동',
            body: '설명 카드보다 운영 액션을 먼저 배치해 진입 속도를 높였습니다.',
          },
          {
            kicker: 'Reward',
            title: '보상/일정 흐름을 카드로 압축',
            body: '긴 문단 대신 시즌 구조와 보상을 짧은 카드 묶음으로 보여줍니다.',
          },
        ]}
        overlay={
          <div className="nconnect-hero-stats">
            {nconnectHighlights.map((item) => (
              <div key={item.label} className="nconnect-summary-card">
                <span className="nconnect-summary-card__label">{item.label}</span>
                <strong className="nconnect-summary-card__value">
                  <SensitiveValue>{item.value}</SensitiveValue>
                </strong>
                <p>{item.description}</p>
              </div>
            ))}
          </div>
        }
      />

      <section className="studio-metric-grid" aria-label="N-CONNECT 핵심 지표">
        <MetricCard
          accent="amber"
          tone="activity"
          label="랭킹 보상 대상"
          value="100명"
          meta="플랫폼 통합 기준"
          sensitiveValue
          icon={<Trophy size={18} />}
        />
        <MetricCard
          accent="amber"
          tone="revenue"
          label="총 보상 예산"
          value="6.8억 원"
          meta="상금 + 인센티브"
          sensitiveValue
          sensitiveMeta
          icon={<Gift size={18} />}
        />
        <MetricCard
          accent="amber"
          tone="growth"
          label="프리시즌 기간"
          value="2026.04~09"
          meta="검증 및 시즌 준비"
          sensitiveValue
          icon={<CalendarRange size={18} />}
        />
        <MetricCard
          accent="amber"
          tone="audience"
          label="추천 코드 보상"
          value="최대 100만 원"
          meta="월 1회 정산"
          sensitiveValue
          sensitiveMeta
          icon={<Link2 size={18} />}
        />
      </section>

      <MediaRail
        title="빠른 오퍼레이션"
        description="아이콘 버튼 대신 대표 아트와 로고가 들어간 카드로 주요 액션을 바로 실행할 수 있게 바꿨습니다."
      >
        {QUICK_OPERATIONS.map((item) => (
          <PosterCard
            key={item.id}
            accent="amber"
            eyebrow={item.eyebrow}
            title={item.title}
            description={item.description}
            imageUrl={item.imageUrl}
            logoUrl={item.logoUrl}
            badge={item.badge}
            stats={[
              { label: '액션', value: '즉시' },
              { label: '진입', value: '1클릭' },
            ]}
            onClick={() => onNavigate(item.id)}
          />
        ))}
      </MediaRail>

      <SectionCard
        accent="amber"
        title="포인트 산정 구조"
        description="포인트 축을 설명형 문단 대신 카드와 핵심 bullet 위주로 요약했습니다."
      >
        <div className="nconnect-pillars-grid">
          {nconnectPointPillars.map((pillar) => (
            <EntityCard
              key={pillar.title}
              accent="amber"
              eyebrow="Point Pillar"
              title={pillar.title}
              description={pillar.description}
              coverUrl="https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=900&q=80"
              avatarUrl={getPlatformLogo('soop')}
              logoUrl={getPlatformLogo('soop')}
              stats={pillar.bullets.slice(0, 2).map((bullet, index) => ({
                label: index === 0 ? '핵심' : '보너스',
                value: bullet,
              }))}
            />
          ))}
        </div>
      </SectionCard>

      <div className="nconnect-two-column">
        <SectionCard
          accent="amber"
          title="주요 일정"
          description="프리시즌부터 정식 시즌 전환까지의 핵심 일정만 추려서 배치했습니다."
        >
          <div className="nconnect-panel-list">
            {nconnectTimeline.map((item) => (
              <article key={item.date} className="nconnect-panel-card">
                <span className="nconnect-section-kicker">{item.date}</span>
                <strong>{item.title}</strong>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          accent="amber"
          title="연결 프로모션"
          description="기본 보상과 추천 코드 보상을 짧은 카드 묶음으로 재구성했습니다."
          actions={
            <button type="button" className="section-link" onClick={() => onNavigate('nconnect-link')}>
              연결 플로우 보기
            </button>
          }
        >
          <div className="nconnect-panel-list">
            {nconnectPromotionRewards.map((item) => (
              <article key={item.title} className="nconnect-panel-card">
                <span className="nconnect-section-kicker">{item.title}</span>
                <strong>
                  <SensitiveValue>{item.value}</SensitiveValue>
                </strong>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

export default NConnectHome;
