import { useState } from 'react';
import {
  Video, Youtube, Music2, Instagram, Eye, Heart, MessageCircle,
  Share2, DollarSign, Link2, MoreVertical, Search, Filter,
  Grid, List, Copy, ExternalLink, Trash2, Edit
} from 'lucide-react';
import { videos, platforms } from '../data/mockData';

const VodVideos = () => {
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVideo, setSelectedVideo] = useState(null);

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

  const formatCurrency = (num) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0
    }).format(num);
  };

  // 필터링 및 정렬
  const filteredVideos = videos
    .filter(v => {
      if (filterPlatform !== 'all' && !v.platforms.includes(filterPlatform)) return false;
      if (filterStatus !== 'all' && v.status !== filterStatus) return false;
      if (searchQuery && !v.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.uploadedAt) - new Date(a.uploadedAt);
        case 'oldest':
          return new Date(a.uploadedAt) - new Date(b.uploadedAt);
        case 'views':
          const aViews = Object.values(a.stats).reduce((sum, s) => sum + s.views, 0);
          const bViews = Object.values(b.stats).reduce((sum, s) => sum + s.views, 0);
          return bViews - aViews;
        case 'revenue':
          return b.revenue - a.revenue;
        default:
          return 0;
      }
    });

  // 링크 복사
  const copyLink = (link) => {
    navigator.clipboard.writeText(link);
  };

  return (
    <div className="animate-fade">
      <header className="vod-page-header">
        <div className="vod-page-title">
          <h1>내 영상</h1>
          <p>업로드한 영상을 관리하세요</p>
        </div>
      </header>

      {/* 필터 바 */}
      <div className="vod-filter-bar">
        <div style={{ position: 'relative', flex: 1, maxWidth: '300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="vod-form-input"
            style={{ paddingLeft: '40px' }}
            placeholder="영상 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          className="vod-filter-select"
          value={filterPlatform}
          onChange={(e) => setFilterPlatform(e.target.value)}
        >
          <option value="all">모든 플랫폼</option>
          <option value="shorts">YouTube Shorts</option>
          <option value="tiktok">TikTok</option>
          <option value="reels">Instagram Reels</option>
        </select>

        <select
          className="vod-filter-select"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">모든 상태</option>
          <option value="published">게시됨</option>
          <option value="processing">처리중</option>
          <option value="error">오류</option>
        </select>

        <select
          className="vod-filter-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="newest">최신순</option>
          <option value="oldest">오래된순</option>
          <option value="views">조회수순</option>
          <option value="revenue">수익순</option>
        </select>

        <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
          <button
            className={`btn btn-icon ${viewMode === 'grid' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setViewMode('grid')}
          >
            <Grid size={18} />
          </button>
          <button
            className={`btn btn-icon ${viewMode === 'list' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setViewMode('list')}
          >
            <List size={18} />
          </button>
        </div>
      </div>

      {/* 결과 카운트 */}
      <div style={{ marginBottom: '16px', fontSize: '14px', color: 'var(--text-muted)' }}>
        총 {filteredVideos.length}개의 영상
      </div>

      {/* 그리드 뷰 */}
      {viewMode === 'grid' && (
        <div className="vod-video-grid">
          {filteredVideos.map((video) => {
            const totalViews = Object.values(video.stats).reduce((sum, s) => sum + s.views, 0);
            const totalLikes = Object.values(video.stats).reduce((sum, s) => sum + s.likes, 0);
            const totalComments = Object.values(video.stats).reduce((sum, s) => sum + s.comments, 0);

            return (
              <div key={video.id} className="vod-video-card" onClick={() => setSelectedVideo(video)}>
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
                      <div className="vod-video-stat-value" style={{ color: '#10b981' }}>{formatCurrency(video.revenue)}</div>
                      <div className="vod-video-stat-label">수익</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 리스트 뷰 */}
      {viewMode === 'list' && (
        <div className="vod-section" style={{ padding: 0 }}>
          <table className="vod-table">
            <thead>
              <tr>
                <th>영상</th>
                <th>플랫폼</th>
                <th>상태</th>
                <th>조회수</th>
                <th>좋아요</th>
                <th>수익</th>
                <th>업로드일</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredVideos.map((video) => {
                const totalViews = Object.values(video.stats).reduce((sum, s) => sum + s.views, 0);
                const totalLikes = Object.values(video.stats).reduce((sum, s) => sum + s.likes, 0);

                return (
                  <tr key={video.id} onClick={() => setSelectedVideo(video)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          style={{ 
                            width: '54px', 
                            height: '72px', 
                            borderRadius: '8px', 
                            objectFit: 'cover',
                            flexShrink: 0
                          }}
                        />
                        <div>
                          <div style={{ fontWeight: 600, marginBottom: '4px' }}>{video.title}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{video.game}</div>
                        </div>
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
                    <td>
                      <span className={`vod-status-badge ${video.status}`}>
                        {video.status === 'published' ? '게시됨' : video.status === 'processing' ? '처리중' : '오류'}
                      </span>
                    </td>
                    <td>{formatNumber(totalViews)}</td>
                    <td>{formatNumber(totalLikes)}</td>
                    <td style={{ color: '#10b981', fontWeight: 600 }}>{formatCurrency(video.revenue)}</td>
                    <td>{new Date(video.uploadedAt).toLocaleDateString('ko-KR')}</td>
                    <td>
                      <button className="btn btn-icon btn-ghost">
                        <MoreVertical size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 빈 상태 */}
      {filteredVideos.length === 0 && (
        <div className="vod-empty-state">
          <div className="vod-empty-icon">
            <Video size={40} />
          </div>
          <div className="vod-empty-title">영상이 없습니다</div>
          <div className="vod-empty-text">검색 조건을 변경하거나 새 영상을 업로드하세요</div>
        </div>
      )}

      {/* 영상 상세 모달 */}
      {selectedVideo && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px'
          }}
          onClick={() => setSelectedVideo(null)}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: '16px',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '24px' }}>
              {/* 헤더 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                  {selectedVideo.game && (
                    <div style={{ 
                      display: 'inline-block',
                      padding: '4px 10px', 
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                      borderRadius: '6px', 
                      fontSize: '12px', 
                      fontWeight: 600, 
                      color: 'white',
                      marginBottom: '8px'
                    }}>
                      {selectedVideo.game}
                    </div>
                  )}
                  <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
                    {selectedVideo.title}
                  </h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="vod-platform-badges">
                      {selectedVideo.platforms.map((p) => (
                        <span key={p} className={`vod-platform-badge ${p}`}>
                          <PlatformIcon platform={p} size={12} />
                          {platforms[p].name}
                        </span>
                      ))}
                    </div>
                    <span className={`vod-status-badge ${selectedVideo.status}`}>
                      {selectedVideo.status === 'published' ? '게시됨' : selectedVideo.status === 'processing' ? '처리중' : '오류'}
                    </span>
                  </div>
                </div>
                <button className="btn btn-icon btn-ghost" onClick={() => setSelectedVideo(null)}>
                  <MoreVertical size={20} />
                </button>
              </div>

              {/* 썸네일 */}
              <div style={{ marginBottom: '24px', textAlign: 'center' }}>
                <img
                  src={selectedVideo.thumbnail}
                  alt={selectedVideo.title}
                  style={{ 
                    maxWidth: '200px', 
                    height: 'auto', 
                    borderRadius: '12px',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)'
                  }}
                />
              </div>

              {/* 플랫폼별 통계 */}
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>플랫폼별 성과</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {selectedVideo.platforms.map((p) => {
                  const stats = selectedVideo.stats[p];
                  return (
                    <div
                      key={p}
                      style={{
                        padding: '16px',
                        borderRadius: '12px',
                        border: `1px solid ${platforms[p].color}30`,
                        background: platforms[p].bgColor
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <div style={{ color: platforms[p].color }}>
                          <PlatformIcon platform={p} size={20} />
                        </div>
                        <span style={{ fontWeight: 600 }}>{platforms[p].name}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>조회수</div>
                          <div style={{ fontSize: '16px', fontWeight: 700 }}>{formatNumber(stats.views)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>좋아요</div>
                          <div style={{ fontSize: '16px', fontWeight: 700 }}>{formatNumber(stats.likes)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>댓글</div>
                          <div style={{ fontSize: '16px', fontWeight: 700 }}>{formatNumber(stats.comments)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>공유</div>
                          <div style={{ fontSize: '16px', fontWeight: 700 }}>{formatNumber(stats.shares)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 추적 링크 & 수익 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div style={{ padding: '16px', background: 'var(--bg-page)', borderRadius: '12px' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    <Link2 size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                    추적 링크
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: 'monospace', color: 'var(--primary)' }}>{selectedVideo.trackingLink}</span>
                    <button className="btn btn-icon btn-ghost btn-sm" onClick={() => copyLink(selectedVideo.trackingLink)}>
                      <Copy size={14} />
                    </button>
                  </div>
                  <div style={{ marginTop: '12px', display: 'flex', gap: '16px', fontSize: '13px' }}>
                    <span>클릭: <strong>{formatNumber(selectedVideo.clicks)}</strong></span>
                    <span>전환: <strong>{formatNumber(selectedVideo.conversions)}</strong></span>
                  </div>
                </div>
                <div style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    <DollarSign size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                    발생 수익
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#10b981' }}>
                    {formatCurrency(selectedVideo.revenue)}
                  </div>
                </div>
              </div>

              {/* 액션 버튼 */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn btn-outline" style={{ flex: 1 }}>
                  <Edit size={16} /> 수정
                </button>
                <button className="btn btn-outline" style={{ flex: 1 }}>
                  <ExternalLink size={16} /> 영상 보기
                </button>
                <button className="btn btn-outline" style={{ flex: 1, color: '#ef4444', borderColor: '#ef4444' }}>
                  <Trash2 size={16} /> 삭제
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VodVideos;
