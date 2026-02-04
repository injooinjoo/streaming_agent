import { useState } from 'react';
import {
  BarChart3, Youtube, Music2, Instagram, TrendingUp, Users, Clock,
  Eye, Heart, MessageCircle, Share2, Globe
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, AreaChart, Area
} from 'recharts';
import {
  platforms, platformStats, weeklyViewsData, hourlyViewsData,
  demographicsData, topVideos, engagementComparison
} from '../data/mockData';

const VodAnalytics = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedPlatform, setSelectedPlatform] = useState('all');

  // 플랫폼 아이콘
  const PlatformIcon = ({ platform, size = 16 }) => {
    const icons = {
      shorts: <Youtube size={size} />,
      tiktok: <Music2 size={size} />,
      reels: <Instagram size={size} />
    };
    return icons[platform] || null;
  };

  // 숫자 포맷팅
  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  // 파이차트 색상
  const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6b7280'];
  const PLATFORM_COLORS = {
    shorts: '#FF0000',
    tiktok: '#00F2EA',
    reels: '#E4405F'
  };

  // 총 통계 계산
  const totalStats = {
    views: Object.values(platformStats).reduce((sum, s) => sum + s.totalViews, 0),
    likes: Object.values(platformStats).reduce((sum, s) => sum + s.totalLikes, 0),
    comments: Object.values(platformStats).reduce((sum, s) => sum + s.totalComments, 0),
    videos: Object.values(platformStats).reduce((sum, s) => sum + s.videoCount, 0)
  };

  return (
    <div className="animate-fade">
      <header className="vod-page-header">
        <div className="vod-page-title">
          <h1>통합 분석</h1>
          <p>플랫폼별 성과를 비교 분석하세요</p>
        </div>
      </header>

      {/* 필터 바 */}
      <div className="vod-filter-bar">
        <select
          className="vod-filter-select"
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
        >
          <option value="7d">최근 7일</option>
          <option value="30d">최근 30일</option>
          <option value="90d">최근 90일</option>
          <option value="1y">최근 1년</option>
        </select>

        <select
          className="vod-filter-select"
          value={selectedPlatform}
          onChange={(e) => setSelectedPlatform(e.target.value)}
        >
          <option value="all">모든 플랫폼</option>
          <option value="shorts">YouTube Shorts</option>
          <option value="tiktok">TikTok</option>
          <option value="reels">Instagram Reels</option>
        </select>
      </div>

      {/* 통계 카드 */}
      <div className="vod-stats-grid">
        <div className="vod-stat-card">
          <div className="vod-stat-header">
            <span>총 조회수</span>
            <div className="vod-stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
              <Eye size={20} style={{ color: '#3b82f6' }} />
            </div>
          </div>
          <div className="vod-stat-content">
            <span className="vod-stat-value">{formatNumber(totalStats.views)}</span>
            <div className="vod-stat-change positive">
              <TrendingUp size={14} />
              <span>+23.5%</span>
            </div>
          </div>
        </div>

        <div className="vod-stat-card">
          <div className="vod-stat-header">
            <span>총 좋아요</span>
            <div className="vod-stat-icon" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
              <Heart size={20} style={{ color: '#ef4444' }} />
            </div>
          </div>
          <div className="vod-stat-content">
            <span className="vod-stat-value">{formatNumber(totalStats.likes)}</span>
            <div className="vod-stat-change positive">
              <TrendingUp size={14} />
              <span>+18.2%</span>
            </div>
          </div>
        </div>

        <div className="vod-stat-card">
          <div className="vod-stat-header">
            <span>총 댓글</span>
            <div className="vod-stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
              <MessageCircle size={20} style={{ color: '#10b981' }} />
            </div>
          </div>
          <div className="vod-stat-content">
            <span className="vod-stat-value">{formatNumber(totalStats.comments)}</span>
            <div className="vod-stat-change positive">
              <TrendingUp size={14} />
              <span>+15.8%</span>
            </div>
          </div>
        </div>

        <div className="vod-stat-card">
          <div className="vod-stat-header">
            <span>평균 참여율</span>
            <div className="vod-stat-icon" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
              <Users size={20} style={{ color: '#8b5cf6' }} />
            </div>
          </div>
          <div className="vod-stat-content">
            <span className="vod-stat-value">9.7%</span>
            <div className="vod-stat-change positive">
              <TrendingUp size={14} />
              <span>+2.1%</span>
            </div>
          </div>
        </div>
      </div>

      {/* 플랫폼별 조회수 비교 차트 */}
      <div className="vod-section">
        <div className="vod-section-header">
          <div className="vod-section-title">
            <BarChart3 size={18} style={{ color: 'var(--primary)' }} />
            <h2>플랫폼별 조회수 추이</h2>
          </div>
        </div>

        <div className="vod-chart-container" style={{ height: '350px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weeklyViewsData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="analyticsShorts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF0000" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#FF0000" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="analyticsTiktok" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00F2EA" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#00F2EA" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="analyticsReels" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E4405F" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#E4405F" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} tickFormatter={formatNumber} />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                formatter={(value) => [formatNumber(value), '']}
              />
              <Legend />
              <Area type="monotone" dataKey="shorts" name="Shorts" stroke="#FF0000" fillOpacity={1} fill="url(#analyticsShorts)" strokeWidth={2} />
              <Area type="monotone" dataKey="tiktok" name="TikTok" stroke="#00F2EA" fillOpacity={1} fill="url(#analyticsTiktok)" strokeWidth={2} />
              <Area type="monotone" dataKey="reels" name="Reels" stroke="#E4405F" fillOpacity={1} fill="url(#analyticsReels)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        {/* 시간대별 시청자 */}
        <div className="vod-section">
          <div className="vod-section-header">
            <div className="vod-section-title">
              <Clock size={18} style={{ color: 'var(--primary)' }} />
              <h2>시간대별 조회수</h2>
            </div>
          </div>

          <div className="vod-chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyViewsData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.9}/>
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0.6}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={formatNumber} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value) => [formatNumber(value), '조회수']}
                />
                <Bar dataKey="views" fill="url(#barGradient)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 참여율 비교 */}
        <div className="vod-section">
          <div className="vod-section-header">
            <div className="vod-section-title">
              <Share2 size={18} style={{ color: 'var(--primary)' }} />
              <h2>플랫폼별 참여율</h2>
            </div>
          </div>

          <div className="vod-chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={engagementComparison} layout="vertical" margin={{ top: 10, right: 30, left: 60, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="metric" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value) => [`${value}%`, '']}
                />
                <Legend />
                <Bar dataKey="shorts" name="Shorts" fill="#FF0000" radius={[0, 4, 4, 0]} />
                <Bar dataKey="tiktok" name="TikTok" fill="#00F2EA" radius={[0, 4, 4, 0]} />
                <Bar dataKey="reels" name="Reels" fill="#E4405F" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        {/* 연령 분포 */}
        <div className="vod-section">
          <div className="vod-section-header">
            <div className="vod-section-title">
              <Users size={18} style={{ color: 'var(--primary)' }} />
              <h2>연령 분포</h2>
            </div>
          </div>

          <div className="vod-chart-container" style={{ height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={demographicsData.age}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  dataKey="percentage"
                  nameKey="range"
                  label={({ range, percentage }) => `${range}: ${percentage}%`}
                >
                  {demographicsData.age.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value}%`, '비율']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 성별 분포 */}
        <div className="vod-section">
          <div className="vod-section-header">
            <div className="vod-section-title">
              <Users size={18} style={{ color: 'var(--primary)' }} />
              <h2>성별 분포</h2>
            </div>
          </div>

          <div style={{ padding: '20px 0' }}>
            {demographicsData.gender.map((item, index) => (
              <div key={item.type} style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '14px', color: 'var(--text-main)' }}>{item.type}</span>
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>{item.percentage}%</span>
                </div>
                <div style={{ height: '8px', background: 'var(--bg-page)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${item.percentage}%`,
                    height: '100%',
                    background: COLORS[index],
                    borderRadius: '4px'
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 지역 분포 */}
        <div className="vod-section">
          <div className="vod-section-header">
            <div className="vod-section-title">
              <Globe size={18} style={{ color: 'var(--primary)' }} />
              <h2>지역 분포</h2>
            </div>
          </div>

          <div style={{ padding: '20px 0' }}>
            {demographicsData.region.map((item, index) => (
              <div key={item.name} style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '14px', color: 'var(--text-main)' }}>{item.name}</span>
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>{item.percentage}%</span>
                </div>
                <div style={{ height: '8px', background: 'var(--bg-page)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${item.percentage}%`,
                    height: '100%',
                    background: COLORS[index % COLORS.length],
                    borderRadius: '4px'
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 인기 영상 TOP 10 */}
      <div className="vod-section">
        <div className="vod-section-header">
          <div className="vod-section-title">
            <TrendingUp size={18} style={{ color: 'var(--primary)' }} />
            <h2>인기 영상 TOP 10</h2>
          </div>
        </div>

        <table className="vod-table">
          <thead>
            <tr>
              <th>#</th>
              <th>영상</th>
              <th>플랫폼</th>
              <th>조회수</th>
              <th>좋아요</th>
              <th>참여율</th>
            </tr>
          </thead>
          <tbody>
            {topVideos.map((video, index) => {
              const engagementRate = ((video.totalLikes / video.totalViews) * 100).toFixed(1);

              return (
                <tr key={video.id}>
                  <td>
                    <span style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '6px',
                      background: index < 3 ? 'var(--primary)' : 'var(--bg-page)',
                      color: index < 3 ? 'white' : 'var(--text-muted)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 600
                    }}>
                      {index + 1}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        style={{ width: '60px', height: '34px', borderRadius: '4px', objectFit: 'cover' }}
                      />
                      <span style={{ fontWeight: 500, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {video.title}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="vod-platform-badges">
                      {video.platforms.map((p) => (
                        <span key={p} className={`vod-platform-badge ${p}`}>
                          <PlatformIcon platform={p} size={12} />
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ fontWeight: 600 }}>{formatNumber(video.totalViews)}</td>
                  <td>{formatNumber(video.totalLikes)}</td>
                  <td>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '20px',
                      background: parseFloat(engagementRate) > 8 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(251, 191, 36, 0.1)',
                      color: parseFloat(engagementRate) > 8 ? '#10b981' : '#f59e0b',
                      fontSize: '12px',
                      fontWeight: 500
                    }}>
                      {engagementRate}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VodAnalytics;
