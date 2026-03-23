import { useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { Bell, Layers3, MessageSquare, Sparkles, Subtitles, Target } from 'lucide-react';
import { PUBLIC_DEMO_MODE, PUBLIC_HOME_PATH } from '../../config/appMode';
import {
  LogoChip,
  MediaHero,
  PosterCard,
  SectionCard,
  StatusBadge,
} from '../shared/studio';
import { getPlatformLogo } from '../../utils/mediaAssets';
import LoginAccessCard from './LoginAccessCard';
import './AuthForm.css';

const overlayFeatures = [
  {
    key: 'chat',
    name: '채팅 오버레이',
    icon: MessageSquare,
    description: '브랜드 톤에 맞춘 채팅 UI를 실시간으로 적용합니다.',
    badge: '26+ 테마',
    imageUrl:
      'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=900&q=80',
  },
  {
    key: 'alert',
    name: '후원 알림',
    icon: Bell,
    description: '후원과 구독 알림을 대표 카드처럼 세련되게 노출합니다.',
    badge: 'TTS 지원',
    imageUrl:
      'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=900&q=80',
  },
  {
    key: 'goal',
    name: '목표 그래프',
    icon: Target,
    description: '진행률을 수치보다 화면 흐름 중심으로 표현합니다.',
    badge: '실시간 반영',
    imageUrl:
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=900&q=80',
  },
  {
    key: 'subtitle',
    name: '후원 자막',
    icon: Subtitles,
    description: '짧은 자막과 강조 애니메이션으로 몰입감을 높입니다.',
    badge: '다중 스타일',
    imageUrl:
      'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80',
  },
];

const trustMarks = [
  { label: '실시간 동기화', value: 'Socket.io' },
  { label: '지원 플랫폼', value: 'SOOP / CHZZK / YouTube / Twitch' },
  { label: '운영 허브', value: '오버레이 / 자산 / 마켓 / 분석' },
];

const LoginPage = () => {
  const loginSectionRef = useRef(null);

  if (PUBLIC_DEMO_MODE) {
    return <Navigate to={PUBLIC_HOME_PATH} replace />;
  }

  const scrollToLogin = () => {
    loginSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="auth-landing">
      <section className="auth-landing__hero">
        <MediaHero
          accent="blue"
          eyebrow={
            <>
              <StatusBadge className="studio-accent--blue" icon={<Sparkles size={14} />}>
                실시간 오버레이 스튜디오
              </StatusBadge>
              <LogoChip logoUrl={getPlatformLogo('soop')} label="SOOP" />
              <LogoChip logoUrl={getPlatformLogo('chzzk')} label="CHZZK" />
            </>
          }
          title="브랜드처럼 보이는 오버레이, 운영 화면도 같은 밀도로"
          description="로그인 화면부터 서비스 쉘과 같은 톤을 유지하도록 재구성했습니다. 왼쪽은 시각 중심 브랜드 블록, 오른쪽은 바로 진입 가능한 인증 카드로 정리했습니다."
          media={{
            imageUrl:
              'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
            badge: 'StreamAgent',
            aspect: 'portrait',
          }}
          stats={[
            { label: '지원 오버레이', value: '10종' },
            { label: '플랫폼', value: '4개' },
            { label: '운영 툴', value: '통합' },
          ]}
          actions={
            <>
              <button className="btn btn-primary" onClick={scrollToLogin}>
                지금 시작하기
              </button>
              <button
                className="btn btn-outline"
                onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
              >
                기능 먼저 보기
              </button>
            </>
          }
          insights={[
            {
              kicker: 'Access',
              title: '로그인 카드가 바로 보이는 구조',
              body: '서비스 첫 진입에서도 기능 소개와 인증 흐름이 분리되지 않도록 한 화면에 정리했습니다.',
            },
            {
              kicker: 'Visual',
              title: '텍스트보다 브랜드 무드가 먼저 보이도록',
              body: '이미지, 로고, 배지 위주 구성으로 첫인상을 더 빠르게 전달합니다.',
            },
          ]}
          overlay={
            <div ref={loginSectionRef}>
              <LoginAccessCard
                className="auth-card--embedded studio-auth-card"
                title="스튜디오 입장"
                subtitle="계정을 연결하고 오버레이 운영 허브를 바로 시작하세요."
              />
            </div>
          }
        />
      </section>

      <section className="auth-landing__trust">
        {trustMarks.map((mark) => (
          <div key={mark.label} className="auth-trust-card">
            <span className="auth-trust-card__label">{mark.label}</span>
            <strong className="auth-trust-card__value">{mark.value}</strong>
          </div>
        ))}
      </section>

      <SectionCard
        accent="blue"
        className="auth-feature-section"
        title="방송 운영자가 자주 여는 화면"
        description="텍스트 설명 대신 기능별 대표 이미지를 먼저 보여주고, 핵심 요약만 짧게 남겼습니다."
      >
        <div className="auth-feature-grid">
          {overlayFeatures.map((feature) => (
            <PosterCard
              key={feature.key}
              accent="blue"
              eyebrow={feature.badge}
              title={feature.name}
              description={feature.description}
              imageUrl={feature.imageUrl}
              logoUrl={getPlatformLogo('soop')}
              badge="Overlay"
            />
          ))}

          <article className="auth-feature-card auth-feature-card--wide">
            <div className="auth-feature-card__icon">
              <Layers3 size={24} />
            </div>
            <div className="auth-feature-card__body">
              <div className="auth-feature-card__header">
                <h3>운영 스튜디오 전체 흐름</h3>
                <StatusBadge className="studio-accent--blue">통합 허브</StatusBadge>
              </div>
              <p>
                로그인 이후에는 N-CONNECT, 오버레이 설정, 디자인 자산, 마켓플레이스, 채널 상세가
                같은 톤의 쉘 안에서 이어집니다. 시작 화면부터 실제 서비스 문법을 그대로 가져와
                경험이 끊기지 않도록 정리했습니다.
              </p>
            </div>
          </article>
        </div>
      </SectionCard>
    </div>
  );
};

export default LoginPage;
