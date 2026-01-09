import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Activity, Clock, Users, TrendingUp, DollarSign, Heart, UserPlus, Gift } from 'lucide-react';
import './ViewershipDashboard.css';

const ViewershipDashboard = () => {
  // Mock 데이터: 플랫폼 랭킹
  const platformRanking = [
    { platform: 'chzzk', name: '치지직', viewers: 92289, channels: 2438, peak: 264871 },
    { platform: 'soop', name: 'SOOP', viewers: 87107, channels: 2144, peak: 361049 },
    { platform: 'twitch', name: '트위치', viewers: 2916, channels: 108, peak: 4633 }
  ];

  // Mock 데이터: 어제 방송 요약
  const yesterdaySummary = {
    date: '2026-01-08',
    startTime: '19:00',
    endTime: '23:30',
    duration: '4시간 30분',
    avgViewers: 542,
    peakViewers: 842,
    chatCount: 3240,
    donationAmount: 125000
  };

  // Mock 데이터: 24시간 시청자 트렌드
  const viewerTrend = [
    { time: '18:00', chzzk: 85000, soop: 72000 },
    { time: '19:00', chzzk: 92000, soop: 78000 },
    { time: '20:00', chzzk: 105000, soop: 89000 },
    { time: '21:00', chzzk: 125000, soop: 98000 },
    { time: '22:00', chzzk: 118000, soop: 92000 },
    { time: '23:00', chzzk: 98000, soop: 85000 },
    { time: '00:00', chzzk: 72000, soop: 65000 },
    { time: '01:00', chzzk: 45000, soop: 38000 },
    { time: '02:00', chzzk: 28000, soop: 22000 },
    { time: '03:00', chzzk: 18000, soop: 15000 },
    { time: '06:00', chzzk: 25000, soop: 20000 },
    { time: '09:00', chzzk: 42000, soop: 35000 },
    { time: '12:00', chzzk: 58000, soop: 48000 },
    { time: '15:00', chzzk: 75000, soop: 62000 }
  ];

  // Mock 데이터: 최근 활동
  const recentActivity = [
    { id: 1, time: '23:15', platform: 'soop', user: '행복한돌고래', type: 'donation', amount: 10000, message: '오늘 방송 너무 재밌었어요!' },
    { id: 2, time: '22:58', platform: 'chzzk', user: '치즈케이크123', type: 'subscribe', message: '1개월 구독' },
    { id: 3, time: '22:45', platform: 'soop', user: '게임러버', type: 'donation', amount: 5000, message: '화이팅!' },
    { id: 4, time: '22:30', platform: 'chzzk', user: '새벽감성', type: 'follow', message: '팔로우' },
    { id: 5, time: '22:15', platform: 'soop', user: '열혈시청자', type: 'donation', amount: 20000, message: '항상 응원합니다' },
    { id: 6, time: '21:50', platform: 'chzzk', user: '밤올빼미', type: 'subscribe', message: '3개월 구독' }
  ];

  const totalViewers = platformRanking.reduce((sum, p) => sum + p.viewers, 0);

  const getPlatformLogo = (platform) => {
    const logos = {
      soop: '/assets/logos/soop.png',
      chzzk: '/assets/logos/chzzk.png',
      twitch: '/assets/logos/twitch.png',
      youtube: '/assets/logos/youtube.png'
    };
    return logos[platform] || null;
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'donation': return <Gift size={16} />;
      case 'subscribe': return <Heart size={16} />;
      case 'follow': return <UserPlus size={16} />;
      default: return <Activity size={16} />;
    }
  };

  const getActivityText = (activity) => {
    switch (activity.type) {
      case 'donation':
        return `${activity.user}님이 ₩${activity.amount.toLocaleString()} 후원`;
      case 'subscribe':
        return `${activity.user}님이 구독`;
      case 'follow':
        return `${activity.user}님이 팔로우`;
      default:
        return `${activity.user}님`;
    }
  };

  const now = new Date();
  const updateTime = `수집 | ${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} (${['일', '월', '화', '수', '목', '금', '토'][now.getDay()]}) ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return (
    <div className="viewership-dashboard analytics-page">
      <header className="page-header">
        <div className="page-title">
          <h1>뷰어십 현황</h1>
          <p>실시간 플랫폼 시청자 현황과 어제 방송 요약을 확인하세요.</p>
        </div>
      </header>

      {/* 플랫폼 랭킹 섹션 */}
      <div className="viewership-header-section">
        <div className="viewership-total-card">
          <div className="viewership-total-label">
            <Activity size={16} />
            실시간 플랫폼 랭킹
          </div>
          <div className="viewership-total-value">
            {totalViewers.toLocaleString()}
          </div>
          <div className="viewership-total-unit">
            SOOP, 치지직, 트위치 전체 시청자 수
          </div>
          <div className="viewership-update-time">
            {updateTime}
          </div>
        </div>

        <div className="platform-ranking-card">
          <div className="platform-ranking-title">
            <TrendingUp size={18} />
            플랫폼별 순위
          </div>
          <div className="platform-ranking-list">
            {platformRanking.map((platform, index) => (
              <div key={platform.platform} className="platform-ranking-item">
                <div className={`platform-rank rank-${index + 1}`}>
                  {index + 1}
                </div>
                <img
                  src={getPlatformLogo(platform.platform)}
                  alt={platform.name}
                  className="platform-logo"
                />
                <div className="platform-info">
                  <div className="platform-name">{platform.name}</div>
                  <div className="platform-channels">{platform.channels.toLocaleString()} 채널</div>
                </div>
                <div className="platform-viewers">
                  <div>
                    <span className="platform-viewers-value">{platform.viewers.toLocaleString()}</span>
                    <span className="platform-viewers-unit">명</span>
                  </div>
                  <div className="platform-peak">최고 {platform.peak.toLocaleString()}명</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 어제 방송 요약 */}
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
            <div className="summary-card-label">방송 시간</div>
            <div className="summary-card-value">{yesterdaySummary.duration}</div>
            <div className="summary-card-sub">{yesterdaySummary.startTime} ~ {yesterdaySummary.endTime}</div>
          </div>
          <div className="summary-card">
            <div className="summary-card-icon viewers">
              <Users size={20} />
            </div>
            <div className="summary-card-label">평균 시청자</div>
            <div className="summary-card-value">{yesterdaySummary.avgViewers.toLocaleString()}명</div>
            <div className="summary-card-sub">채팅 {yesterdaySummary.chatCount.toLocaleString()}개</div>
          </div>
          <div className="summary-card">
            <div className="summary-card-icon peak">
              <TrendingUp size={20} />
            </div>
            <div className="summary-card-label">최고 동시시청자</div>
            <div className="summary-card-value">{yesterdaySummary.peakViewers.toLocaleString()}명</div>
            <div className="summary-card-sub">20:30 기록</div>
          </div>
          <div className="summary-card">
            <div className="summary-card-icon donation">
              <DollarSign size={20} />
            </div>
            <div className="summary-card-label">후원 금액</div>
            <div className="summary-card-value">₩{yesterdaySummary.donationAmount.toLocaleString()}</div>
            <div className="summary-card-sub">12건의 후원</div>
          </div>
        </div>
      </div>

      {/* 24시간 시청자 트렌드 */}
      <div className="trend-chart-section">
        <div className="trend-chart-card">
          <div className="trend-chart-header">
            <div className="trend-chart-title">실시간 시청자 데이터</div>
            <div className="trend-chart-legend">
              <div className="legend-item">
                <span className="legend-dot chzzk"></span>
                치지직
              </div>
              <div className="legend-item">
                <span className="legend-dot soop"></span>
                SOOP
              </div>
            </div>
          </div>
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
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={12} />
              <YAxis stroke="var(--text-muted)" fontSize={12} tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px'
                }}
                formatter={(value) => [`${value.toLocaleString()}명`, '']}
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
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 최근 활동 피드 */}
      <div className="activity-feed-section">
        <div className="section-title">
          <Activity size={18} />
          최근 활동
        </div>
        <div className="activity-feed-card">
          <div className="activity-feed-list">
            {recentActivity.map((activity) => (
              <div key={activity.id} className={`activity-feed-item ${activity.type}`}>
                <img
                  src={getPlatformLogo(activity.platform)}
                  alt={activity.platform}
                  className="activity-platform-logo"
                />
                <div className="activity-content">
                  <div className="activity-user">
                    {getActivityIcon(activity.type)}
                    {' '}
                    {getActivityText(activity)}
                  </div>
                  {activity.message && (
                    <div className="activity-message">{activity.message}</div>
                  )}
                </div>
                <div className="activity-time">{activity.time}</div>
                {activity.amount && (
                  <div className="activity-amount">₩{activity.amount.toLocaleString()}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewershipDashboard;
