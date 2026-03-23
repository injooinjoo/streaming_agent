import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, LogIn, Mail, RefreshCw } from 'lucide-react';
import { API_URL } from '../../config/api';
import { PUBLIC_DEMO_MODE } from '../../config/appMode';
import { useAuth } from '../../contexts/AuthContext';
import { FormSection, StatusBadge } from '../shared/studio';
import './AuthForm.css';

const DEMO_ACCOUNT_ID = 'devil0108';

const NaverIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M16.273 12.845 7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z" />
  </svg>
);

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

const TwitchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
  </svg>
);

const LoginAccessCard = ({
  title = '로그인',
  subtitle = '계정을 연결하고 방송 운영을 시작해보세요.',
  afterLoginPath = '/',
  className = '',
  footerText = '아직 계정이 없으신가요?',
  footerLinkLabel = '회원가입',
  footerLinkTo = '/register',
}) => {
  const navigate = useNavigate();
  const { login, loginAsGamst } = useAuth();
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const showAuthMethods = !PUBLIC_DEMO_MODE;

  const handleOAuthLogin = (provider) => {
    window.location.href = `${API_URL}/api/auth/${provider}`;
  };

  const handleEmailLogin = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate(afterLoginPath);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    setLoading(true);

    try {
      await loginAsGamst();
      navigate(afterLoginPath);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={['auth-card', className].filter(Boolean).join(' ')}>
      <div className="auth-card__head">
        <StatusBadge className="studio-accent--blue">Overlay Access</StatusBadge>
        <div className="auth-header">
          <div className="auth-logo">StreamAgent</div>
          <h1 className="auth-title">{title}</h1>
          <p className="auth-subtitle">{subtitle}</p>
        </div>
      </div>

      {error ? <div className="auth-error">{error}</div> : null}

      {showAuthMethods ? (
        <div className="oauth-buttons">
          <button type="button" className="oauth-button soop" onClick={() => handleOAuthLogin('soop')} disabled={loading}>
            <img src="/assets/logos/soop.png" alt="SOOP" />
            SOOP으로 계속하기
          </button>
          <button type="button" className="oauth-button naver" onClick={() => handleOAuthLogin('naver')} disabled={loading}>
            <NaverIcon />
            네이버로 계속하기
          </button>
          <button type="button" className="oauth-button google" onClick={() => handleOAuthLogin('google')} disabled={loading}>
            <GoogleIcon />
            Google로 계속하기
          </button>
          <button type="button" className="oauth-button twitch" onClick={() => handleOAuthLogin('twitch')} disabled={loading}>
            <TwitchIcon />
            Twitch로 계속하기
          </button>
        </div>
      ) : null}

      {showAuthMethods ? (
        <button
          type="button"
          className="oauth-button email auth-email-toggle"
          onClick={() => setShowEmailForm((prev) => !prev)}
          disabled={loading}
        >
          <Mail size={20} />
          이메일 로그인
          {showEmailForm ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      ) : null}

      {showAuthMethods && showEmailForm ? (
        <FormSection
          accent="blue"
          className="auth-form-shell"
          title="이메일 로그인"
          description="이메일 계정으로 로그인해 같은 스튜디오 흐름을 그대로 이어가세요."
        >
          <form className="auth-form" onSubmit={handleEmailLogin}>
            <div className="form-group">
              <label className="form-label">이메일</label>
              <input
                type="email"
                className="form-input"
                placeholder="example@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">비밀번호</label>
              <input
                type="password"
                className="form-input"
                placeholder="비밀번호를 입력하세요"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? (
                <RefreshCw size={18} className="spin" />
              ) : (
                <>
                  <LogIn size={18} />
                  로그인
                </>
              )}
            </button>
          </form>
        </FormSection>
      ) : null}

      <div className="auth-demo-account" aria-label="데모 계정 안내">
        <div className="auth-demo-account__top">
          <StatusBadge className="studio-accent--blue">빠른 체험</StatusBadge>
          <button type="button" className="oauth-button gamst" onClick={handleDemoLogin} disabled={loading}>
            <img src="/assets/logos/soop.png" alt="SOOP" />
            감스트 데모로 보기
          </button>
        </div>
        <div className="auth-demo-account__value">{DEMO_ACCOUNT_ID}</div>
        <p className="auth-demo-account__note">
          데모 계정으로 들어가면 오버레이 관리 화면과 허브 구성을 바로 확인할 수 있습니다.
        </p>
      </div>

      <div className="auth-footer">
        {PUBLIC_DEMO_MODE ? (
          <span>공개 데모는 로그인 없이 바로 체험할 수 있습니다.</span>
        ) : (
          <>
            {footerText}
            <Link to={footerLinkTo} className="auth-link">
              {footerLinkLabel}
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default LoginAccessCard;
