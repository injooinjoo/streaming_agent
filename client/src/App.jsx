import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { StreamingModeProvider } from './contexts/StreamingModeContext';
import { ToastProvider } from './contexts/ToastContext';
import ToastContainer from './components/shared/Toast';
import Dashboard from './components/Dashboard';
import ProtectedRoute, { AdminRoute, AdvertiserRoute } from './components/auth/ProtectedRoute';
import './App.css';

// Lazy-loaded pages (코드 스플리팅으로 초기 번들 크기 감소)
const ChannelPage = lazy(() => import('./components/channel/ChannelPage'));
const ChatOverlay = lazy(() => import('./components/ChatOverlay'));
const AlertOverlay = lazy(() => import('./components/AlertOverlay'));
const SubtitleOverlay = lazy(() => import('./components/SubtitleOverlay'));
const GoalOverlay = lazy(() => import('./components/GoalOverlay'));
const TickerOverlay = lazy(() => import('./components/TickerOverlay'));
const RouletteOverlay = lazy(() => import('./components/RouletteOverlay'));
const EmojiOverlay = lazy(() => import('./components/EmojiOverlay'));
const VotingOverlay = lazy(() => import('./components/VotingOverlay'));
const CreditsOverlay = lazy(() => import('./components/CreditsOverlay'));
const AdOverlay = lazy(() => import('./components/AdOverlay'));
const LoginPage = lazy(() => import('./components/auth/LoginPage'));
const RegisterPage = lazy(() => import('./components/auth/RegisterPage'));
const AdvertiserDashboard = lazy(() => import('./components/advertiser/AdvertiserDashboard'));
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'));
const MyDesigns = lazy(() => import('./components/designer/MyDesigns'));
const DesignCustomizer = lazy(() => import('./components/designer/DesignCustomizer'));

function App() {
  // 모바일 브라우저 주소창 대응 viewport height 설정
  useEffect(() => {
    const setVh = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    setVh();
    window.addEventListener('resize', setVh);
    window.addEventListener('orientationchange', setVh);

    return () => {
      window.removeEventListener('resize', setVh);
      window.removeEventListener('orientationchange', setVh);
    };
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
        <StreamingModeProvider>
        <Router>
          <div className="app-container">
            <Suspense fallback={null}>
            <Routes>
            {/* 메인 */}
            <Route path="/" element={<Dashboard />} />

            {/* 채널 정보 페이지 */}
            <Route path="/channel/:channelId" element={<ChannelPage />} />
            <Route path="/channel" element={<ChannelPage />} />

            {/* 인증 */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* 광고주 대시보드 (인증 필요) */}
            <Route path="/advertiser" element={
              <AdvertiserRoute>
                <AdvertiserDashboard />
              </AdvertiserRoute>
            } />

            {/* 관리자 대시보드 (관리자 권한 필요) */}
            <Route path="/admin-dashboard" element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } />

            {/* 디자인 커스터마이저 (인증 필요) */}
            <Route path="/my-designs" element={
              <ProtectedRoute>
                <MyDesigns />
              </ProtectedRoute>
            } />
            <Route path="/designer" element={
              <ProtectedRoute>
                <DesignCustomizer />
              </ProtectedRoute>
            } />
            <Route path="/designer/:designId" element={
              <ProtectedRoute>
                <DesignCustomizer />
              </ProtectedRoute>
            } />

            {/* 해시 기반 오버레이 (신규) */}
            <Route path="/overlay/:userHash/chat" element={<ChatOverlay />} />
            <Route path="/overlay/:userHash/alerts" element={<AlertOverlay />} />
            <Route path="/overlay/:userHash/subtitles" element={<SubtitleOverlay />} />
            <Route path="/overlay/:userHash/goals" element={<GoalOverlay />} />
            <Route path="/overlay/:userHash/ticker" element={<TickerOverlay />} />
            <Route path="/overlay/:userHash/roulette" element={<RouletteOverlay />} />
            <Route path="/overlay/:userHash/emoji" element={<EmojiOverlay />} />
            <Route path="/overlay/:userHash/voting" element={<VotingOverlay />} />
            <Route path="/overlay/:userHash/credits" element={<CreditsOverlay />} />
            <Route path="/overlay/:userHash/ads" element={<AdOverlay />} />

            {/* 레거시 오버레이 라우트 (리다이렉트 안내) */}
            <Route path="/overlay/chat" element={<ChatOverlay />} />
            <Route path="/overlay/alerts" element={<AlertOverlay />} />
            <Route path="/overlay/subtitles" element={<SubtitleOverlay />} />
            <Route path="/overlay/goals" element={<GoalOverlay />} />
            <Route path="/overlay/ticker" element={<TickerOverlay />} />
            <Route path="/overlay/ads" element={<AdOverlay />} />
            </Routes>
            </Suspense>
          </div>
        </Router>
        </StreamingModeProvider>
        <ToastContainer />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
