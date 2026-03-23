import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { StreamingModeProvider } from './contexts/StreamingModeContext';
import { ToastProvider } from './contexts/ToastContext';
import ToastContainer from './components/shared/Toast';
import ProtectedRoute, { AdminRoute, AdvertiserRoute } from './components/auth/ProtectedRoute';
import RoleBasedHomeRedirect from './components/auth/RoleBasedHomeRedirect';
import './App.css';

const Dashboard = lazy(() => import('./components/Dashboard'));
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
const StreamerDetail = lazy(() => import('./components/streamer/StreamerDetail'));
const ViewershipShell = lazy(() => import('./components/viewership/ViewershipShell'));
const EventsShell = lazy(() => import('./components/events/EventsShell'));

function App() {
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
                    <Route path="/" element={<RoleBasedHomeRedirect />} />
                    <Route path="/n-connect" element={<Dashboard mode="nconnect" />} />
                    <Route path="/streaming-agent" element={<Dashboard mode="streaming" />} />
                    <Route path="/viewership" element={<ViewershipShell />} />
                    <Route path="/events" element={<EventsShell />} />
                    <Route
                      path="/vod-agent"
                      element={<Dashboard mode="nconnect" initialTab="vod-home" />}
                    />

                    <Route path="/channel/:channelId" element={<ChannelPage />} />
                    <Route path="/channel" element={<ChannelPage />} />
                    <Route path="/streamer/:personId" element={<StreamerDetail />} />

                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />

                    <Route
                      path="/advertiser"
                      element={(
                        <AdvertiserRoute>
                          <AdvertiserDashboard />
                        </AdvertiserRoute>
                      )}
                    />

                    <Route
                      path="/admin-dashboard"
                      element={(
                        <AdminRoute>
                          <AdminDashboard />
                        </AdminRoute>
                      )}
                    />

                    <Route
                      path="/my-designs"
                      element={(
                        <ProtectedRoute>
                          <MyDesigns />
                        </ProtectedRoute>
                      )}
                    />
                    <Route
                      path="/designer"
                      element={(
                        <ProtectedRoute>
                          <DesignCustomizer />
                        </ProtectedRoute>
                      )}
                    />
                    <Route
                      path="/designer/:designId"
                      element={(
                        <ProtectedRoute>
                          <DesignCustomizer />
                        </ProtectedRoute>
                      )}
                    />

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
