import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { StreamingModeProvider } from './contexts/StreamingModeContext';
import Dashboard from './components/Dashboard';
import ChatOverlay from './components/ChatOverlay';
import AlertOverlay from './components/AlertOverlay';
import SubtitleOverlay from './components/SubtitleOverlay';
import GoalOverlay from './components/GoalOverlay';
import TickerOverlay from './components/TickerOverlay';
import RouletteOverlay from './components/RouletteOverlay';
import EmojiOverlay from './components/EmojiOverlay';
import VotingOverlay from './components/VotingOverlay';
import CreditsOverlay from './components/CreditsOverlay';
import AdOverlay from './components/AdOverlay';
import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';
import ProtectedRoute, { AdminRoute, AdvertiserRoute } from './components/auth/ProtectedRoute';
import AdvertiserDashboard from './components/advertiser/AdvertiserDashboard';
import AdminDashboard from './components/admin/AdminDashboard';
import SnowflakeAnalytics from './components/analytics/SnowflakeAnalytics';
import './App.css';

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
        <StreamingModeProvider>
        <Router>
          <div className="app-container">
            <Routes>
            {/* 메인 */}
            <Route path="/" element={<Dashboard />} />

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

            {/* Snowflake Analytics 대시보드 (관리자 권한 필요) */}
            <Route path="/analytics" element={
              <AdminRoute>
                <SnowflakeAnalytics />
              </AdminRoute>
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
          </div>
        </Router>
        </StreamingModeProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
