import { useState } from 'react';
import {
  Video, Eye, DollarSign, Link2, TrendingUp, TrendingDown,
  Youtube, Music2, Instagram, ChevronRight, Play
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  dashboardStats, platformStats, weeklyViewsData, videos, platforms
} from '../data/mockData';

const VodHome = ({ onNavigate }) => {
  const [hoveredVideo, setHoveredVideo] = useState(null);

  // 숫자 포맷팅
  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatCurrency = (num) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0
    }).format(num);
  };

  // 최근 영상 5개
  const recentVideos = videos
    .filter(v => v.status === 'published')
    .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
    .slice(0, 5);

  // 플랫폼 아이콘 컴포넌트
  const PlatformIcon = ({ platform, size = 16 }) => {
    const icons = {
      shorts: <Youtube size={size} />,
      tiktok: <Music2 size={size} />,
      reels: <Instagram size={size} />
    };
    return icons[platform] || null;
  };

  return (
    <div className="animate-fade">
      <header className="vod-page-header">
        <div className="vod-page-title">
          <h1>VOD 에이전트 대시보드</h1>
          <p>멀티 플랫폼 쇼츠 업로드 및 수익 관리</p>
        </div>
      </header>

      {/* 통계 카드 */}
      <div className="vod-stats-grid">
        <div className="vod-stat-card clickable" onClick={() => onNavigate('videos')}>
          <div className="vod-stat-header">
            <span>총 영상 수</span>
            <div className="vod-stat-icon" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
              <Video size={20} style={{ color: '#8b5cf6' }} />
            </div>
          </div>
          <div className="vod-stat-content">
            <span className="vod-stat-value">{dashboardStats.totalVideos}</span>
            <div className="vod-stat-change positive">
              <TrendingUp size={14} />
              <span>이번 주 +2</span>
            </div>
          </div>
        </div>

        <div className="vod-stat-card clickable" onClick={() => onNavigate('analytics')}>
          <div className="vod-stat-header">
            <span>총 조회수</span>
            <div className="vod-stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
              <Eye size={20} style={{ color: '#3b82f6' }} />
            </div>
          </div>
          <div className="vod-stat-content">
            <span className="vod-stat-value">{formatNumber(dashboardStats.totalViews)}</span>
            <div className="vod-stat-change positive">
              <TrendingUp size={14} />
              <span>+{dashboardStats.viewsGrowth}%</span>
            </div>
          </div>
        </div>

        <div className="vod-stat-card clickable" onClick={() => onNavigate('revenue')}>
          <div className="vod-stat-header">
            <span>총 수익</span>
            <div className="vod-stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
              <DollarSign size={20} style={{ color: '#10b981' }} />
            </div>
          </div>
          <div className="vod-stat-content">
            <span className="vod-stat-value">{formatCurrency(dashboardStats.totalRevenue)}</span>
            <div className="vod-stat-change positive">
              <TrendingUp size={14} />
              <span>+{dashboardStats.revenueGrowth}%</span>
            </div>
          </div>
        </div>

        <div className="vod-stat-card">
          <div className="vod-stat-header">
            <span>활성 링크</span>
            <div className="vod-stat-icon" style={{ background: 'rgba(251, 146, 60, 0.1)' }}>
              <Link2 size={20} style={{ color: '#fb923c' }} />
            </div>
          </div>
          <div className="vod-stat-content">
            <span className="vod-stat-value">{dashboardStats.activeLinks}</span>
            <div className="vod-stat-change" style={{ color: 'var(--text-muted)' }}>
              <span>총 트래킹 링크</span>
            </div>
          </div>
        </div>
      </div>

      {/* 플랫폼별 성과 요약 */}
      <div className="vod-section">
        <div className="vod-section-header">
          <div className="vod-section-title">
            <Play size={18} style={{ color: 'var(--primary)' }} />
            <h2>플랫폼별 성과</h2>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('analytics')}>
            상세 분석 <ChevronRight size={14} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {Object.entries(platformStats).map(([key, stats]) => (
            <div
              key={key}
              style={{
                padding: '20px',
                borderRadius: '12px',
                border: `1px solid ${platforms[key].color}20`,
                background: platforms[key].bgColor
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div
                  className="vod-platform-icon"
                  style={{ background: platforms[key].bgColor, color: platforms[key].color }}
                >
                  <PlatformIcon platform={key} size={18} />
                </div>
                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{platforms[key].name}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>조회수</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>
                    {formatNumber(stats.totalViews)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>참여율</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: platforms[key].color }}>
                    {stats.avgEngagement}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>좋아요</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>
                    {formatNumber(stats.totalLikes)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>영상 수</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>
                    {stats.videoCount}개
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 주간 조회수 추이 */}
      <div className="vod-section">
        <div className="vod-section-header">
          <div className="vod-section-title">
            <TrendingUp size={18} style={{ color: 'var(--primary)' }} />
            <h2>주간 조회수 추이</h2>
          </div>
        </div>

        <div className="vod-chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weeklyViewsData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorShorts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF0000" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#FF0000" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorTiktok" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00F2EA" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#00F2EA" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorReels" x1="0" y1="0" x2="0" y2="1">
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
              <Area type="monotone" dataKey="shorts" name="Shorts" stroke="#FF0000" fillOpacity={1} fill="url(#colorShorts)" />
              <Area type="monotone" dataKey="tiktok" name="TikTok" stroke="#00F2EA" fillOpacity={1} fill="url(#colorTiktok)" />
              <Area type="monotone" dataKey="reels" name="Reels" stroke="#E4405F" fillOpacity={1} fill="url(#colorReels)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 최근 업로드 영상 */}
      <div className="vod-section">
        <div className="vod-section-header">
          <div className="vod-section-title">
            <Video size={18} style={{ color: 'var(--primary)' }} />
            <h2>최근 업로드 영상</h2>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('videos')}>
            전체 보기 <ChevronRight size={14} />
          </button>
        </div>

        <div className="vod-video-grid">
          {recentVideos.map((video) => {
            const totalViews = Object.values(video.stats).reduce((sum, s) => sum + s.views, 0);
            const totalLikes = Object.values(video.stats).reduce((sum, s) => sum + s.likes, 0);

            return (
              <div
                key={video.id}
                className="vod-video-card"
                onMouseEnter={() => setHoveredVideo(video.id)}
                onMouseLeave={() => setHoveredVideo(null)}
              >
                <div className="vod-video-thumbnail">
                  <img src={video.thumbnail} alt={video.title} />
                  <div className="vod-video-status-overlay">
                    <span className={`vod-status-badge ${video.status}`}>
                      {video.status === 'published' ? '게시됨' : video.status === 'processing' ? '처리중' : '오류'}
                    </span>
                  </div>
                  {video.game && (
                    <div className="vod-video-game-tag">{video.game}</div>
                  )}
                </div>
                <div className="vod-video-info">
                  <div className="vod-video-title">{video.title}</div>
                  <div className="vod-video-meta">
                    <div className="vod-platform-badges">
                      {video.platforms.map((p) => (
                        <span key={p} className={`vod-platform-badge ${p}`}>
                          <PlatformIcon platform={p} size={12} />
                        </span>
                      ))}
                    </div>
                    <span className="vod-video-date">
                      {new Date(video.uploadedAt).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                  <div className="vod-video-stats">
                    <div className="vod-video-stat">
                      <div className="vod-video-stat-value">{formatNumber(totalViews)}</div>
                      <div className="vod-video-stat-label">조회수</div>
                    </div>
                    <div className="vod-video-stat">
                      <div className="vod-video-stat-value">{formatNumber(totalLikes)}</div>
                      <div className="vod-video-stat-label">좋아요</div>
                    </div>
                    <div className="vod-video-stat">
                      <div className="vod-video-stat-value">{formatCurrency(video.revenue)}</div>
                      <div className="vod-video-stat-label">수익</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default VodHome;
