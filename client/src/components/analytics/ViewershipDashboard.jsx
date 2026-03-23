import { useEffect, useState } from 'react';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Clock, Users, TrendingUp, DollarSign, RefreshCw, LogIn, Monitor, Gamepad2, Flame, Trophy } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import useSectionNavigation from '../../hooks/useSectionNavigation';
import LoadingSpinner from '../shared/LoadingSpinner';
import { API_URL, mockFetch } from '../../config/api';
import { formatCompactKo, formatFullNumber, formatCurrency } from '../../utils/formatters';
import { DEFAULT_VIEWERSHIP_SECTION, VIEWERSHIP_DASHBOARD_SECTIONS } from '../viewership/viewershipSections';
import './ViewershipDashboard.css';

const VIEWERSHIP_SECTION_IDS = VIEWERSHIP_DASHBOARD_SECTIONS.map((section) => section.id);

// 실시간 트렌드 목업 데이터
const MOCK_REALTIME_TREND = [
  { time: '00:00', chzzk: 145000, soop: 89000, twitch: 42000 },
  { time: '02:00', chzzk: 98000, soop: 65000, twitch: 28000 },
  { time: '04:00', chzzk: 52000, soop: 38000, twitch: 15000 },
  { time: '06:00', chzzk: 35000, soop: 22000, twitch: 12000 },
  { time: '08:00', chzzk: 68000, soop: 45000, twitch: 25000 },
  { time: '10:00', chzzk: 125000, soop: 78000, twitch: 38000 },
  { time: '12:00', chzzk: 180000, soop: 95000, twitch: 52000 },
  { time: '14:00', chzzk: 220000, soop: 115000, twitch: 65000 },
  { time: '16:00', chzzk: 265000, soop: 138000, twitch: 78000 },
  { time: '18:00', chzzk: 320000, soop: 175000, twitch: 95000 },
  { time: '20:00', chzzk: 385000, soop: 210000, twitch: 118000 },
  { time: '22:00', chzzk: 350000, soop: 195000, twitch: 105000 }
];

// 실시간 요약 목업 데이터
const MOCK_REALTIME_SUMMARY = {
  totalViewers: 713000,
  platforms: [
    { platform: 'chzzk', name: '치지직', viewers: 385000, channels: 1250, peak: 425000 },
    { platform: 'soop', name: 'SOOP', viewers: 210000, channels: 890, peak: 245000 },
    { platform: 'twitch', name: '트위치', viewers: 118000, channels: 520, peak: 135000 }
  ]
};

// 실시간 방송 랭킹 목업 데이터
const MOCK_LIVE_BROADCASTS = [
  { rank: 1, channelId: 'ch1', broadcasterName: '우왁굳', platform: 'chzzk', categoryName: '종합게임', title: '주간 왁굳 방송', currentViewers: 45000, startedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), profileImageUrl: null, personId: 1 },
  { rank: 2, channelId: 'ch2', broadcasterName: '김도', platform: 'soop', categoryName: 'Just Chatting', title: '오늘도 즐거운 방송', currentViewers: 38000, startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), profileImageUrl: null, personId: 2 },
  { rank: 3, channelId: 'ch3', broadcasterName: '풍월량', platform: 'chzzk', categoryName: '리그 오브 레전드', title: '솔랭 도전기', currentViewers: 32000, startedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), profileImageUrl: null, personId: 3 },
  { rank: 4, channelId: 'ch4', broadcasterName: '침착맨', platform: 'soop', categoryName: 'Just Chatting', title: '침착맨의 침착한 방송', currentViewers: 28000, startedAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(), profileImageUrl: null, personId: 4 },
  { rank: 5, channelId: 'ch5', broadcasterName: '랄로', platform: 'twitch', categoryName: '발로란트', title: '래디언트 가즈아!', currentViewers: 22000, startedAt: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(), profileImageUrl: null, personId: 5 },
  { rank: 6, channelId: 'ch6', broadcasterName: '아구', platform: 'chzzk', categoryName: '메이플스토리', title: '보스 레이드 공략', currentViewers: 18500, startedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), profileImageUrl: null, personId: 6 },
  { rank: 7, channelId: 'ch7', broadcasterName: '샌드박스', platform: 'soop', categoryName: '스타크래프트', title: '프로게이머와 래더', currentViewers: 15000, startedAt: new Date(Date.now() - 3.5 * 60 * 60 * 1000).toISOString(), profileImageUrl: null, personId: 7 },
  { rank: 8, channelId: 'ch8', broadcasterName: '쫀득', platform: 'chzzk', categoryName: 'FC 온라인', title: '월드클래스 뽑기', currentViewers: 12500, startedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), profileImageUrl: null, personId: 8 }
];

// 피크 시청자 랭킹 목업 데이터
const MOCK_PEAK_BROADCASTS = [
  { rank: 1, channelId: 'ch1', broadcasterName: '우왁굳', platform: 'chzzk', categoryName: '종합게임', title: '주간 왁굳 방송', peakViewers: 85000, isLive: true, startedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), profileImageUrl: null, personId: 1 },
  { rank: 2, channelId: 'ch2', broadcasterName: '김도', platform: 'soop', categoryName: 'Just Chatting', title: '오늘도 즐거운 방송', peakViewers: 62000, isLive: true, startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), profileImageUrl: null, personId: 2 },
  { rank: 3, channelId: 'ch9', broadcasterName: '감스트', platform: 'soop', categoryName: 'FC 온라인', title: 'FC 온라인 대회', peakViewers: 55000, isLive: false, startedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), profileImageUrl: null, personId: 9 },
  { rank: 4, channelId: 'ch3', broadcasterName: '풍월량', platform: 'chzzk', categoryName: '리그 오브 레전드', title: '솔랭 도전기', peakViewers: 48000, isLive: true, startedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), profileImageUrl: null, personId: 3 },
  { rank: 5, channelId: 'ch10', broadcasterName: '따효니', platform: 'chzzk', categoryName: '배틀그라운드', title: '펍지 스쿼드', peakViewers: 42000, isLive: false, startedAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(), profileImageUrl: null, personId: 10 },
  { rank: 6, channelId: 'ch4', broadcasterName: '침착맨', platform: 'soop', categoryName: 'Just Chatting', title: '침착맨의 침착한 방송', peakViewers: 38000, isLive: true, startedAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(), profileImageUrl: null, personId: 4 },
  { rank: 7, channelId: 'ch5', broadcasterName: '랄로', platform: 'twitch', categoryName: '발로란트', title: '래디언트 가즈아!', peakViewers: 35000, isLive: true, startedAt: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(), profileImageUrl: null, personId: 5 },
  { rank: 8, channelId: 'ch11', broadcasterName: '제이슬', platform: 'twitch', categoryName: 'Just Chatting', title: '새벽 토크쇼', peakViewers: 28000, isLive: false, startedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), profileImageUrl: null, personId: 11 }
];

// 카테고리 목업 데이터
const MOCK_CATEGORIES = [
  { id: 1, name: 'League of Legends', nameKr: '리그 오브 레전드', totalViewers: 125000, platforms: ['chzzk', 'soop', 'twitch'], imageUrl: null },
  { id: 2, name: 'Just Chatting', nameKr: 'Just Chatting', totalViewers: 98000, platforms: ['chzzk', 'soop', 'twitch'], imageUrl: null },
  { id: 3, name: 'VALORANT', nameKr: '발로란트', totalViewers: 75000, platforms: ['chzzk', 'twitch'], imageUrl: null },
  { id: 4, name: 'MapleStory', nameKr: '메이플스토리', totalViewers: 62000, platforms: ['chzzk', 'soop'], imageUrl: null },
  { id: 5, name: 'FC Online', nameKr: 'FC 온라인', totalViewers: 58000, platforms: ['soop', 'chzzk'], imageUrl: null },
  { id: 6, name: 'PUBG', nameKr: '배틀그라운드', totalViewers: 45000, platforms: ['chzzk', 'soop', 'twitch'], imageUrl: null },
  { id: 7, name: 'Minecraft', nameKr: '마인크래프트', totalViewers: 38000, platforms: ['chzzk', 'twitch'], imageUrl: null },
  { id: 8, name: 'StarCraft', nameKr: '스타크래프트', totalViewers: 32000, platforms: ['soop'], imageUrl: null },
  { id: 9, name: 'Overwatch 2', nameKr: '오버워치 2', totalViewers: 28000, platforms: ['chzzk', 'twitch'], imageUrl: null },
  { id: 10, name: 'Lost Ark', nameKr: '로스트아크', totalViewers: 25000, platforms: ['chzzk', 'soop'], imageUrl: null }
];

// 어제 요약 목업 데이터
const MOCK_YESTERDAY_SUMMARY = {
  date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  startTime: '09:00',
  endTime: '23:30',
  duration: '14시간 30분',
  avgViewers: 285000,
  peakViewers: 425000,
  chatCount: 1250000,
  donationAmount: 12500000,
  donationCount: 3200
};

const ViewershipDashboard = ({ activeSection, onSectionChange, onGameSelect, onStreamerSelect, hideHeader = false }) => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('viewers'); // viewers | channels | chats
  const [realtimeSummary, setRealtimeSummary] = useState(null);
  const [realtimeTrend, setRealtimeTrend] = useState([]);
  const [yesterdaySummary, setYesterdaySummary] = useState({
    date: '-',
    startTime: '-',
    endTime: '-',
    duration: '데이터 없음',
    avgViewers: 0,
    peakViewers: 0,
    chatCount: 0,
    donationAmount: 0,
    donationCount: 0
  });
  const [viewerTrend, setViewerTrend] = useState([]);
  const [categories, setCategories] = useState([]);
  const [liveBroadcasts, setLiveBroadcasts] = useState([]);
  const [peakBroadcasts, setPeakBroadcasts] = useState([]);
  const [liveRankPlatform, setLiveRankPlatform] = useState(null);
  const [peakRankPlatform, setPeakRankPlatform] = useState(null);
  const [authError, setAuthError] = useState(false);

  const { isAuthenticated, accessToken, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { activeNav: observedSection } = useSectionNavigation(VIEWERSHIP_SECTION_IDS, {
    defaultSection: activeSection || DEFAULT_VIEWERSHIP_SECTION,
    rootMargin: '-120px 0px -55% 0px',
    selector: '.viewership-section',
    refreshDeps: [
      loading,
      authError,
      isAuthenticated,
      realtimeTrend.length,
      viewerTrend.length,
      categories.length,
      liveBroadcasts.length,
      peakBroadcasts.length,
    ],
  });

  useEffect(() => {
    if (authLoading) return; // Wait for auth to finish loading
    if (isAuthenticated) {
      fetchData();
    } else {
      setLoading(false);
      setAuthError(true);
    }
  }, [isAuthenticated, authLoading]);

  // Fetch trend data when tab changes
  useEffect(() => {
    if (isAuthenticated && !loading) {
      fetchRealtimeTrend(activeTab);
    }
  }, [activeTab, isAuthenticated, loading]);

  useEffect(() => {
    if (!observedSection) return;
    onSectionChange?.(observedSection);
  }, [observedSection, onSectionChange]);

  const fetchRealtimeTrend = async (type = 'viewers') => {
    const headers = {
      'Content-Type': 'application/json',
      ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
    };
    try {
      const res = await mockFetch(`${API_URL}/api/stats/realtime/trend?type=${type}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setRealtimeTrend(data);
      }
    } catch (err) {
      console.error('Failed to fetch realtime trend:', err);
    }
  };

  const fetchRanking = async (type, platform = null) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
    };
    try {
      const params = new URLSearchParams({ limit: '20' });
      if (platform) params.set('platform', platform);
      if (type === 'peak') params.set('hours', '18');
      const res = await mockFetch(`${API_URL}/api/stats/ranking/${type}?${params}`, { headers });
      if (res.ok) return await res.json();
    } catch (err) {
      console.error(`Failed to fetch ${type} ranking:`, err);
    }
    return [];
  };

  const fetchData = async () => {
    setLoading(true);
    setAuthError(false);

    const headers = {
      'Content-Type': 'application/json',
      ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
    };

    try {
      const [yesterdayRes, trendRes, categoriesRes, realtimeSummaryRes, realtimeTrendRes] = await Promise.all([
        mockFetch(`${API_URL}/api/stats/yesterday`, { headers }),
        mockFetch(`${API_URL}/api/stats/hourly-by-platform`, { headers }),
        mockFetch(`${API_URL}/api/categories?limit=10`, { headers }),
        mockFetch(`${API_URL}/api/stats/realtime/summary`, { headers }),
        mockFetch(`${API_URL}/api/stats/realtime/trend?type=${activeTab}`, { headers })
      ]);

      // Check if any request requires auth
      if ([yesterdayRes, trendRes].some(res => res.status === 401)) {
        setAuthError(true);
        setLoading(false);
        return;
      }

      const [yesterday, trend, categoriesData, realtimeSummaryData, realtimeTrendData] = await Promise.all([
        yesterdayRes.ok ? yesterdayRes.json() : {},
        trendRes.ok ? trendRes.json() : [],
        categoriesRes.ok ? categoriesRes.json() : { data: [] },
        realtimeSummaryRes.ok ? realtimeSummaryRes.json() : null,
        realtimeTrendRes.ok ? realtimeTrendRes.json() : []
      ]);

      if (yesterday && yesterday.date) {
        setYesterdaySummary(prev => ({ ...prev, ...yesterday }));
      }
      setViewerTrend(trend);
      setCategories(categoriesData.data || []);
      setRealtimeSummary(realtimeSummaryData);
      setRealtimeTrend(realtimeTrendData);

      // Fetch ranking data in parallel
      const [liveData, peakData] = await Promise.all([
        fetchRanking('live', liveRankPlatform),
        fetchRanking('peak', peakRankPlatform)
      ]);
      setLiveBroadcasts(liveData.length > 0 ? liveData : MOCK_LIVE_BROADCASTS);
      setPeakBroadcasts(peakData.length > 0 ? peakData : MOCK_PEAK_BROADCASTS);
      
      // API 데이터가 없으면 목업 사용
      if (!realtimeSummaryData) setRealtimeSummary(MOCK_REALTIME_SUMMARY);
      if (realtimeTrendData.length === 0) setRealtimeTrend(MOCK_REALTIME_TREND);
      if ((categoriesData.data || []).length === 0) setCategories(MOCK_CATEGORIES);
      if (!yesterday?.date) setYesterdaySummary(MOCK_YESTERDAY_SUMMARY);
    } catch (err) {
      console.error('Failed to fetch viewership data:', err);
      // API 실패 시 목업 데이터 사용
      setRealtimeSummary(MOCK_REALTIME_SUMMARY);
      setRealtimeTrend(MOCK_REALTIME_TREND);
      setLiveBroadcasts(MOCK_LIVE_BROADCASTS);
      setPeakBroadcasts(MOCK_PEAK_BROADCASTS);
      setCategories(MOCK_CATEGORIES);
      setYesterdaySummary(MOCK_YESTERDAY_SUMMARY);
      setViewerTrend(MOCK_REALTIME_TREND);
    } finally {
      setLoading(false);
    }
  };

  const getPlatformLogo = (platform) => {
    const logos = {
      soop: '/assets/logos/soop.png',
      chzzk: '/assets/logos/chzzk.png',
      twitch: '/assets/logos/twitch.png',
      youtube: '/assets/logos/youtube.png'
    };
    return logos[platform] || null;
  };

  const getElapsedTime = (startedAt) => {
    if (!startedAt) return '';
    const diff = Date.now() - new Date(startedAt).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}시간 ${minutes}분`;
    return `${minutes}분`;
  };

  const handleLiveRankPlatform = async (platform) => {
    setLiveRankPlatform(platform);
    const data = await fetchRanking('live', platform);
    setLiveBroadcasts(data);
  };

  const handlePeakRankPlatform = async (platform) => {
    setPeakRankPlatform(platform);
    const data = await fetchRanking('peak', platform);
    setPeakBroadcasts(data);
  };

  const now = new Date();
  const updateTime = `수집 | ${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} (${['일', '월', '화', '수', '목', '금', '토'][now.getDay()]}) ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  if (loading) {
    return (
      <div className="viewership-dashboard analytics-page">
        <LoadingSpinner fullHeight />
      </div>
    );
  }

  if (authError || !isAuthenticated) {
    return (
      <div className="viewership-dashboard analytics-page">
        <div className="auth-required-container" style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '400px',
          gap: '16px',
          color: 'var(--text-muted)'
        }}>
          <LogIn size={48} />
          <h2 style={{ margin: 0, color: 'var(--text-main)' }}>로그인이 필요합니다</h2>
          <p style={{ margin: 0 }}>시장 현황을 확인하려면 로그인하세요.</p>
          <button
            onClick={() => navigate('/login')}
            style={{
              marginTop: '8px',
              padding: '12px 24px',
              background: 'var(--primary)',
              color: 'var(--text-on-primary)',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <LogIn size={16} /> 로그인
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="viewership-dashboard analytics-page">
      {!hideHeader && (
        <header className="page-header">
          <div className="page-title">
            <h1>시장 현황</h1>
            <p>SOOP, 치지직, 트위치 한국어 전체 시청자 수를 실시간으로 확인하세요.</p>
          </div>
          <button className="btn-outline" onClick={fetchData} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <RefreshCw size={16} /> 새로고침
          </button>
        </header>
      )}

      {/* 실시간 대시보드 섹션 */}
      <div className="viewership-section" data-section="market-overview">
        <section className="realtime-dashboard-section">
        {/* 왼쪽: 차트 */}
        <div className="realtime-chart-card">
          <div className="realtime-chart-header">
            <div className="realtime-chart-title">
              <Monitor size={18} />
              실시간 시청자 데이터
            </div>
            <div className="realtime-chart-subtitle">
              SOOP, 치지직, 트위치 한국어 전체 시청자 수
            </div>
            <div className="realtime-tabs">
              <button
                className={activeTab === 'viewers' ? 'active' : ''}
                onClick={() => setActiveTab('viewers')}
              >
                시청자
              </button>
              <button
                className={activeTab === 'channels' ? 'active' : ''}
                onClick={() => setActiveTab('channels')}
              >
                채널
              </button>
              <button
                className={activeTab === 'chats' ? 'active' : ''}
                onClick={() => setActiveTab('chats')}
              >
                채팅
              </button>
            </div>
          </div>
          {realtimeTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={realtimeTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={12} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickFormatter={(v) => formatCompactKo(v)} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px'
                  }}
                  formatter={(value, name) => [formatFullNumber(value), name === 'chzzk' ? '치지직' : name === 'soop' ? 'SOOP' : '트위치']}
                />
                <Line type="monotone" dataKey="chzzk" stroke="#00ffa3" strokeWidth={2} dot={false} name="chzzk" />
                <Line type="monotone" dataKey="soop" stroke="#3b82f6" strokeWidth={2} dot={false} name="soop" />
                <Line type="monotone" dataKey="twitch" stroke="#9146ff" strokeWidth={2} dot={false} name="twitch" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '280px', color: '#94a3b8' }}>
              실시간 데이터가 없습니다
            </div>
          )}
        </div>

        {/* 오른쪽: 랭킹 */}
        <div className="realtime-ranking-card">
          <div className="realtime-ranking-header">
            <Monitor size={18} />
            실시간 플랫폼 랭킹
          </div>
          <div className="realtime-ranking-subtitle">
            SOOP, 치지직, 트위치 한국어 전체 시청자 수
          </div>
          <div className="realtime-total-viewers sensitive-blur">
            {formatFullNumber(realtimeSummary?.totalViewers)}
          </div>
          <div className="realtime-platform-list">
            {realtimeSummary?.platforms?.length > 0 ? realtimeSummary.platforms.map((platform, index) => (
              <div key={platform.platform} className="realtime-platform-item">
                <div className={`realtime-platform-rank rank-${index + 1}`}>
                  {index + 1}
                </div>
                <img
                  src={getPlatformLogo(platform.platform)}
                  alt={platform.name}
                  className="realtime-platform-logo"
                />
                <div className="realtime-platform-info">
                  <div className="realtime-platform-name">{platform.name}</div>
                  <div className="realtime-platform-channels">{formatFullNumber(platform.channels)} 채널</div>
                </div>
                <div className="realtime-platform-viewers">
                  <div>
                    <span className="realtime-viewers-value sensitive-blur">{formatFullNumber(platform.viewers)}</span>
                    <span className="realtime-viewers-unit">명</span>
                  </div>
                  <div className="realtime-platform-peak">최고 <span className="sensitive-blur">{formatFullNumber(platform.peak)}</span>명</div>
                </div>
              </div>
            )) : (
              <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                플랫폼 데이터가 없습니다
              </div>
            )}
          </div>
          <div className="realtime-update-time">
            {updateTime}
          </div>
        </div>
        </section>
      </div>

      {/* 방송 랭킹 섹션 */}
      <div className="viewership-section" data-section="live-rankings">
        <section className="broadcast-ranking-section">
        {/* 실시간 방송 랭킹 */}
        <div className="ranking-card">
          <div className="ranking-header">
            <div className="ranking-title">
              <Flame size={18} />
              실시간 방송 랭킹
            </div>
            <div className="ranking-platform-tabs">
              <button className={liveRankPlatform === null ? 'active' : ''} onClick={() => handleLiveRankPlatform(null)}>전체</button>
              <button className={liveRankPlatform === 'soop' ? 'active' : ''} onClick={() => handleLiveRankPlatform('soop')}>SOOP</button>
              <button className={liveRankPlatform === 'chzzk' ? 'active' : ''} onClick={() => handleLiveRankPlatform('chzzk')}>Chzzk</button>
              <button className={liveRankPlatform === 'twitch' ? 'active' : ''} onClick={() => handleLiveRankPlatform('twitch')}>Twitch</button>
            </div>
          </div>
          <div className="ranking-list">
            {liveBroadcasts.length > 0 ? liveBroadcasts.map((item) => (
              <div
                key={item.channelId + '-' + item.rank}
                className={`ranking-item ${item.personId ? 'clickable' : ''}`}
                onClick={() => item.personId && onStreamerSelect?.(item.personId)}
              >
                <div className={`ranking-position rank-${item.rank <= 3 ? item.rank : 'default'}`}>
                  {item.rank}
                </div>
                <div className="ranking-profile">
                  {item.profileImageUrl ? (
                    <img src={item.profileImageUrl} alt={item.broadcasterName} className="ranking-profile-img" />
                  ) : (
                    <div className="ranking-profile-placeholder"><Users size={16} /></div>
                  )}
                  {getPlatformLogo(item.platform) && (
                    <img src={getPlatformLogo(item.platform)} alt={item.platform} className="ranking-platform-badge" />
                  )}
                </div>
                <div className="ranking-info">
                  <div className="ranking-name">
                    {item.broadcasterName}
                  </div>
                  <div className="ranking-meta">
                    {item.categoryName && <span className="ranking-category">{item.categoryName}</span>}
                    <span className="ranking-title-text">{item.title}</span>
                  </div>
                </div>
                <div className="ranking-viewers">
                  <div className="ranking-viewers-value sensitive-blur">{formatCompactKo(item.currentViewers)}</div>
                  <div className="ranking-elapsed">{getElapsedTime(item.startedAt)}</div>
                </div>
              </div>
            )) : (
              <div className="ranking-empty">실시간 방송 데이터가 없습니다</div>
            )}
          </div>
        </div>

        {/* 최고 시청자수 랭킹 */}
        <div className="ranking-card">
          <div className="ranking-header">
            <div className="ranking-title">
              <Trophy size={18} />
              최고 시청자수 랭킹
            </div>
            <div className="ranking-subtitle">최근 18시간 기준</div>
            <div className="ranking-platform-tabs">
              <button className={peakRankPlatform === null ? 'active' : ''} onClick={() => handlePeakRankPlatform(null)}>전체</button>
              <button className={peakRankPlatform === 'soop' ? 'active' : ''} onClick={() => handlePeakRankPlatform('soop')}>SOOP</button>
              <button className={peakRankPlatform === 'chzzk' ? 'active' : ''} onClick={() => handlePeakRankPlatform('chzzk')}>Chzzk</button>
              <button className={peakRankPlatform === 'twitch' ? 'active' : ''} onClick={() => handlePeakRankPlatform('twitch')}>Twitch</button>
            </div>
          </div>
          <div className="ranking-list">
            {peakBroadcasts.length > 0 ? peakBroadcasts.map((item) => (
              <div
                key={item.channelId + '-peak-' + item.rank}
                className={`ranking-item ${item.personId ? 'clickable' : ''}`}
                onClick={() => item.personId && onStreamerSelect?.(item.personId)}
              >
                <div className={`ranking-position rank-${item.rank <= 3 ? item.rank : 'default'}`}>
                  {item.rank}
                </div>
                <div className="ranking-profile">
                  {item.profileImageUrl ? (
                    <img src={item.profileImageUrl} alt={item.broadcasterName} className="ranking-profile-img" />
                  ) : (
                    <div className="ranking-profile-placeholder"><Users size={16} /></div>
                  )}
                  {getPlatformLogo(item.platform) && (
                    <img src={getPlatformLogo(item.platform)} alt={item.platform} className="ranking-platform-badge" />
                  )}
                </div>
                <div className="ranking-info">
                  <div className="ranking-name">
                    {item.broadcasterName}
                    {item.isLive && <span className="ranking-live-badge">LIVE</span>}
                  </div>
                  <div className="ranking-meta">
                    {item.categoryName && <span className="ranking-category">{item.categoryName}</span>}
                    <span className="ranking-title-text">{item.title}</span>
                  </div>
                </div>
                <div className="ranking-viewers">
                  <div className="ranking-viewers-value sensitive-blur">{formatCompactKo(item.peakViewers)}</div>
                  <div className="ranking-elapsed">{getElapsedTime(item.startedAt)}</div>
                </div>
              </div>
            )) : (
              <div className="ranking-empty">최고 시청자 데이터가 없습니다</div>
            )}
          </div>
        </div>
        </section>
      </div>

      {/* 어제 방송 요약 */}
      <div className="viewership-section" data-section="yesterday-summary">
        <div className="yesterday-summary-section">
        <div className="section-title">
          <Clock size={18} />
          어제 방송 요약 ({yesterdaySummary.date})
        </div>
        <div className="yesterday-summary-grid">
          <div className="summary-card">
            <div className="summary-card-icon time">
              <Clock size={20} />
            </div>
            <div className="summary-card-label">활동 시간</div>
            <div className="summary-card-value">{yesterdaySummary.duration}</div>
            <div className="summary-card-sub">{yesterdaySummary.startTime} ~ {yesterdaySummary.endTime}</div>
          </div>
          <div className="summary-card">
            <div className="summary-card-icon viewers">
              <Users size={20} />
            </div>
            <div className="summary-card-label">참여자</div>
            <div className="summary-card-value sensitive-blur">{formatFullNumber(yesterdaySummary.avgViewers)}명</div>
            <div className="summary-card-sub">채팅 <span className="sensitive-blur">{formatFullNumber(yesterdaySummary.chatCount)}</span>개</div>
          </div>
          <div className="summary-card">
            <div className="summary-card-icon peak">
              <TrendingUp size={20} />
            </div>
            <div className="summary-card-label">후원 건수</div>
            <div className="summary-card-value sensitive-blur">{formatFullNumber(yesterdaySummary.donationCount)}건</div>
            <div className="summary-card-sub">어제 기준</div>
          </div>
          <div className="summary-card">
            <div className="summary-card-icon donation">
              <DollarSign size={20} />
            </div>
            <div className="summary-card-label">후원 금액</div>
            <div className="summary-card-value sensitive-blur">{formatCurrency(yesterdaySummary.donationAmount)}</div>
            <div className="summary-card-sub"><span className="sensitive-blur">{formatFullNumber(yesterdaySummary.donationCount)}</span>건의 후원</div>
          </div>
        </div>
        </div>
      </div>

      {/* 24시간 활동 트렌드 */}
      <div className="viewership-section" data-section="daily-trend">
        <div className="trend-chart-section">
        <div className="trend-chart-card">
          <div className="trend-chart-header">
            <div className="trend-chart-title">24시간 활동 데이터</div>
            <div className="trend-chart-legend">
              <div className="legend-item">
                <span className="legend-dot chzzk"></span>
                치지직
              </div>
              <div className="legend-item">
                <span className="legend-dot soop"></span>
                SOOP
              </div>
              <div className="legend-item">
                <span className="legend-dot twitch"></span>
                트위치
              </div>
            </div>
          </div>
          {viewerTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={viewerTrend}>
                <defs>
                  <linearGradient id="colorChzzk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00ffa3" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00ffa3" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSoop" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorTwitch" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9146ff" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#9146ff" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={12} />
                <YAxis stroke="var(--text-muted)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px'
                  }}
                  formatter={(value) => [formatFullNumber(value), '']}
                />
                <Area
                  type="monotone"
                  dataKey="chzzk"
                  stroke="#00ffa3"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorChzzk)"
                  name="치지직"
                />
                <Area
                  type="monotone"
                  dataKey="soop"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorSoop)"
                  name="SOOP"
                />
                <Area
                  type="monotone"
                  dataKey="twitch"
                  stroke="#9146ff"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorTwitch)"
                  name="트위치"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: '#94a3b8' }}>
              활동 데이터가 없습니다
            </div>
          )}
        </div>
        </div>
      </div>

      {/* 인기 카테고리 */}
      <div className="viewership-section" data-section="top-categories">
        <div className="categories-section">
        <div className="section-title">
          <Gamepad2 size={18} />
          인기 카테고리
        </div>
        <div className="categories-grid">
          {categories.length > 0 ? categories.slice(0, 10).map((category, index) => (
            <div key={category.id} className="category-card" onClick={() => onGameSelect?.(category.id)}>
              <div className="category-rank">{index + 1}</div>
              <div className="category-image">
                {category.imageUrl ? (
                  <img src={category.imageUrl} alt={category.nameKr || category.name} />
                ) : (
                  <div className="category-placeholder">
                    <Gamepad2 size={24} />
                  </div>
                )}
              </div>
              <div className="category-info">
                <div className="category-name">{category.nameKr || category.name}</div>
                <div className="category-stats">
                  <span className="category-viewers">
                    <Users size={14} />
                    {formatCompactKo(category.totalViewers || 0)}
                  </span>
                  <div className="category-platforms">
                    {category.platforms?.includes('soop') && (
                      <img src="/assets/logos/soop.png" alt="SOOP" />
                    )}
                    {category.platforms?.includes('chzzk') && (
                      <img src="/assets/logos/chzzk.png" alt="Chzzk" />
                    )}
                    {category.platforms?.includes('twitch') && (
                      <img src="/assets/logos/twitch.png" alt="Twitch" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )) : (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', gridColumn: '1 / -1' }}>
              카테고리 데이터가 없습니다
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
};

export default ViewershipDashboard;
