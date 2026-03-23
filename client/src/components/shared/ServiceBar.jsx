import { Bell, Eye, EyeOff, LogIn, Moon, Sun } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useStreamingMode } from '../../contexts/StreamingModeContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { ServiceRail } from './studio';
import './ServiceBar.css';

export const SERVICE_BAR_RESELECT_EVENT = 'service-bar:reselect';

const services = [
  { id: 'n-connect', label: 'N-CONNECT', shortLabel: 'N', path: '/n-connect' },
  { id: 'streaming-agent', label: '오버레이', shortLabel: '오버레이', path: '/streaming-agent' },
  { id: 'viewership', label: '인기', shortLabel: '인기', path: '/viewership' },
  { id: 'events', label: '이벤트', shortLabel: '이벤트', path: '/events' },
  { id: 'advertiser', label: '광고', shortLabel: '광고', path: '/advertiser' },
];

const resolveActiveService = (pathname) => {
  if (pathname.startsWith('/streaming-agent')) return 'streaming-agent';
  if (pathname.startsWith('/viewership')) return 'viewership';
  if (pathname.startsWith('/events')) return 'events';
  if (pathname.startsWith('/advertiser')) return 'advertiser';
  return 'n-connect';
};

const accents = {
  'n-connect': 'amber',
  'streaming-agent': 'blue',
  viewership: 'emerald',
  events: 'rose',
  advertiser: 'rose',
};

const ServiceBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const activeService = resolveActiveService(location.pathname);
  const accent = accents[activeService] || 'amber';
  const { isAuthenticated } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const { isStreamingMode, toggleStreamingMode } = useStreamingMode();
  const { showInfo } = useToast();

  const handleServiceClick = (serviceId, isActive) => {
    if (!isActive) return;

    window.dispatchEvent(
      new CustomEvent(SERVICE_BAR_RESELECT_EVENT, {
        detail: { serviceId },
      })
    );
  };

  const handleAccountClick = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    navigate('/n-connect', {
      state: {
        openAccount: true,
        subTab: 'connection',
      },
    });
  };

  const handleNotificationClick = () => {
    showInfo('알림 기능은 곧 연결됩니다.');
  };

  const themeLabel = resolvedTheme === 'dark' ? '라이트 모드' : '다크 모드';

  return (
    <div className={`service-bar service-bar--${accent}`}>
      <div className="service-bar__content">
        <ServiceRail accent={accent} className="service-bar__rail-wrap">
          <nav className="service-bar__rail" aria-label="서비스 전환">
            {services.map((service) => (
              <NavLink
                key={service.id}
                to={service.path}
                className={`service-bar__item ${activeService === service.id ? 'is-active' : ''}`}
                aria-label={service.label}
                title={service.label}
                onClick={() => handleServiceClick(service.id, activeService === service.id)}
              >
                <span className="service-bar__label service-bar__label--full" aria-hidden="true">
                  {service.label}
                </span>
                <span className="service-bar__label service-bar__label--compact" aria-hidden="true">
                  {service.shortLabel || service.label}
                </span>
              </NavLink>
            ))}
          </nav>
        </ServiceRail>

        <div className="service-bar__actions">
          <button
            type="button"
            className={`service-bar__utility-button ${isStreamingMode ? 'is-active' : ''}`}
            onClick={toggleStreamingMode}
            aria-pressed={isStreamingMode}
            aria-label="스트리밍 모드"
            title="스트리밍 모드"
          >
            {isStreamingMode ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>

          <button
            type="button"
            className="service-bar__utility-button"
            onClick={toggleTheme}
            aria-label={themeLabel}
            title={themeLabel}
          >
            {resolvedTheme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          <button
            type="button"
            className="service-bar__utility-button"
            onClick={handleNotificationClick}
            aria-label="알림"
            title="알림"
          >
            <Bell size={15} />
          </button>

          <button
            type="button"
            className="service-bar__account-button"
            onClick={handleAccountClick}
            aria-label={isAuthenticated ? '계정 설정' : '로그인'}
            title={isAuthenticated ? '계정 설정' : '로그인'}
          >
            <LogIn size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ServiceBar;
