import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, MessageSquare, Bell, Target, Newspaper, Subtitles, Code } from 'lucide-react';
import './AuthForm.css';

// 오버레이 기능 데이터
const overlayFeatures = [
  {
    key: 'chat',
    name: '채팅',
    icon: MessageSquare,
    description: '실시간 채팅 오버레이',
    badge: '26+ 테마'
  },
  {
    key: 'alert',
    name: '알림',
    icon: Bell,
    description: '후원/구독 알림 표시',
    badge: 'TTS 지원'
  },
  {
    key: 'goal',
    name: '목표',
    icon: Target,
    description: '목표치 그래프 위젯',
    badge: '실시간'
  },
  {
    key: 'ticker',
    name: '전광판',
    icon: Newspaper,
    description: '뉴스 티커 스타일 표시',
    badge: '커스텀'
  },
  {
    key: 'subtitle',
    name: '자막',
    icon: Subtitles,
    description: '후원 자막 오버레이',
    badge: '다양한 스타일'
  },
];

const LoginPage = () => {
  const navigate = useNavigate();
  const loginSectionRef = useRef(null);

  const handleGuestAccess = () => {
    navigate('/');
  };

  const scrollToLogin = () => {
    loginSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 개발자 모드 - 바로 어드민 대시보드로 이동
  const handleDeveloperMode = () => {
    navigate('/admin-dashboard');
  };

  return (
    <div className="landing-container">
      {/* Header */}
      <header className="landing-header">
        <div className="header-logo">StreamAgent</div>
        <div className="header-actions">
          <button
            className="dev-mode-toggle"
            onClick={handleDeveloperMode}
            title="관리자 대시보드"
          >
            <Code size={18} />
          </button>
          <button className="header-login-btn" onClick={scrollToLogin}>
            <LogIn size={18} />
            로그인
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="hero-content">
          <div className="hero-badge">스트리머를 위한 올인원 솔루션</div>
          <h1 className="hero-title">
            방송을 더 특별하게,<br />
            <span className="hero-highlight">StreamAgent</span>
          </h1>
          <p className="hero-description">
            채팅, 알림, 목표, 전광판, 자막까지<br />
            모든 오버레이를 한 곳에서 관리하세요
          </p>
          <button className="hero-cta" onClick={handleGuestAccess}>
            지금 시작하기
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section className="landing-features">
        <div className="features-header">
          <h2>주요 기능</h2>
          <p>스트리밍에 필요한 모든 오버레이</p>
        </div>
        <div className="features-grid">
          {overlayFeatures.map((feature) => (
            <div key={feature.key} className="feature-card">
              <div className="feature-icon-wrapper">
                <feature.icon size={28} />
              </div>
              <h3 className="feature-title">{feature.name}</h3>
              <p className="feature-description">{feature.description}</p>
              <span className="feature-badge">{feature.badge}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Login Section */}
      <section className="landing-login" ref={loginSectionRef}>
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">StreamAgent</div>
            <h1 className="auth-title">로그인</h1>
            <p className="auth-subtitle">계정을 연결하여 시작하세요</p>
          </div>

          <div className="oauth-buttons">
            <button className="oauth-button soop" disabled>
              <img src="/assets/logos/soop.png" alt="SOOP" style={{ height: '20px', borderRadius: '4px' }} />
              숲(SOOP)으로 계속하기
            </button>
            <button className="oauth-button naver" disabled>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z"/>
              </svg>
              네이버로 계속하기
            </button>
            <button className="oauth-button google" disabled>
              <svg viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google로 계속하기
            </button>
            <button className="oauth-button twitch" disabled>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
              </svg>
              Twitch로 계속하기
            </button>
          </div>

          <div className="auth-divider">
            <span>또는</span>
          </div>

          <button className="guest-button" onClick={handleGuestAccess}>
            로그인 없이 둘러보기
          </button>

          <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', marginTop: '24px' }}>
            소셜 로그인 기능은 준비 중입니다
          </p>
        </div>
      </section>
    </div>
  );
};

export default LoginPage;
