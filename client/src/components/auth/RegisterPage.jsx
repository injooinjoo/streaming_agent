import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Mail, RefreshCw, UserPlus } from 'lucide-react';
import { API_URL } from '../../config/api';
import { PUBLIC_DEMO_MODE, PUBLIC_HOME_PATH } from '../../config/appMode';
import { useAuth } from '../../contexts/AuthContext';
import { FormSection, PageHero, StatusBadge } from '../shared/studio';
import './AuthForm.css';

const SoopIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <text x="12" y="16" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">S</text>
  </svg>
);

const NaverIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M16.273 12.845 7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z" />
  </svg>
);

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const TwitchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
  </svg>
);

const RegisterPage = () => {
  const [showEmailForm, setShowEmailForm] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  if (PUBLIC_DEMO_MODE) {
    return <Navigate to={PUBLIC_HOME_PATH} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    setLoading(true);

    try {
      await register(email, password, displayName);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = (provider) => {
    window.location.href = `${API_URL}/api/auth/${provider}`;
  };

  return (
    <div className="auth-register-shell">
      <PageHero
        accent="amber"
        eyebrow={<StatusBadge className="studio-accent--amber">Create Studio</StatusBadge>}
        title="내 방송 운영 스튜디오를 여는 첫 단계"
        description="하나의 계정으로 대시보드, 오버레이 설정, 채널 운영 화면까지 같은 흐름으로 이어집니다. 먼저 가입하고 브랜드 톤에 맞는 화면을 쌓아보세요."
        aside={
          <div className="auth-card auth-card--embedded studio-auth-card">
            <div className="auth-card__head">
              <StatusBadge className="studio-accent--amber">회원가입</StatusBadge>
              <div className="auth-header">
                <div className="auth-logo">StreamAgent</div>
                <h1 className="auth-title">운영 스튜디오 만들기</h1>
                <p className="auth-subtitle">가입 후 바로 대시보드와 오버레이 설정으로 이어집니다.</p>
              </div>
            </div>

            {error ? <div className="auth-error">{error}</div> : null}

            <div className="oauth-buttons">
              <button type="button" className="oauth-button soop" onClick={() => handleOAuthLogin('soop')}>
                <SoopIcon />
                SOOP으로 계속하기
              </button>
              <button type="button" className="oauth-button naver" onClick={() => handleOAuthLogin('naver')}>
                <NaverIcon />
                네이버로 계속하기
              </button>
              <button type="button" className="oauth-button google" onClick={() => handleOAuthLogin('google')}>
                <GoogleIcon />
                Google로 계속하기
              </button>
              <button type="button" className="oauth-button twitch" onClick={() => handleOAuthLogin('twitch')}>
                <TwitchIcon />
                Twitch로 계속하기
              </button>
            </div>

            <button
              type="button"
              className="oauth-button email auth-email-toggle"
              onClick={() => setShowEmailForm((prev) => !prev)}
            >
              <Mail size={20} />
              이메일로 가입하기
              {showEmailForm ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showEmailForm ? (
              <FormSection
                accent="amber"
                className="auth-form-shell"
                title="이메일 가입"
                description="운영용 이름과 로그인 정보를 입력하면 바로 스튜디오를 시작할 수 있습니다."
              >
                <form className="auth-form" onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label className="form-label">운영 이름</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="방송에서 사용할 이름"
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      required
                    />
                  </div>

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
                      placeholder="6자 이상"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">비밀번호 확인</label>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="비밀번호를 다시 입력하세요"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      required
                    />
                  </div>

                  <button type="submit" className="auth-button" disabled={loading}>
                    {loading ? (
                      <RefreshCw size={18} className="spin" />
                    ) : (
                      <>
                        <UserPlus size={18} />
                        회원가입
                      </>
                    )}
                  </button>
                </form>
              </FormSection>
            ) : null}

            <div className="auth-footer">
              이미 계정이 있으신가요?
              <Link to="/login" className="auth-link">
                로그인
              </Link>
            </div>
          </div>
        }
      />
    </div>
  );
};

export default RegisterPage;
