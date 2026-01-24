import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Filter,
  Download,
  Star,
  ChevronLeft,
  Grid,
  List,
  Upload,
  RefreshCw,
  MessageSquare,
  Bell,
  Target,
  Type,
  Subtitles
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import './MarketplacePage.css';

const categories = [
  { id: 'all', label: '전체', icon: <Grid size={16} /> },
  { id: 'chat', label: '채팅창', icon: <MessageSquare size={16} /> },
  { id: 'alert', label: '후원 알림', icon: <Bell size={16} /> },
  { id: 'goal', label: '목표치', icon: <Target size={16} /> },
  { id: 'ticker', label: '전광판', icon: <Type size={16} /> },
  { id: 'subtitle', label: '자막', icon: <Subtitles size={16} /> },
];

// 샘플 디자인 데이터
const sampleDesigns = [
  {
    id: 1,
    name: '네온 사이버펑크',
    category: 'chat',
    description: '미래적인 네온 스타일의 채팅창 테마',
    thumbnail: null,
    downloadCount: 1234,
    rating: 4.8,
    ratingCount: 56,
    creator: { displayName: 'CyberDesigner', verified: true },
  },
  {
    id: 2,
    name: '미니멀 화이트',
    category: 'chat',
    description: '깔끔하고 심플한 화이트 테마',
    thumbnail: null,
    downloadCount: 892,
    rating: 4.5,
    ratingCount: 34,
    creator: { displayName: 'MinimalStudio', verified: false },
  },
  {
    id: 3,
    name: '레트로 게임',
    category: 'alert',
    description: '8비트 레트로 게임 스타일 알림',
    thumbnail: null,
    downloadCount: 567,
    rating: 4.9,
    ratingCount: 23,
    creator: { displayName: 'RetroMaster', verified: true },
  },
  {
    id: 4,
    name: '그라데이션 웨이브',
    category: 'goal',
    description: '부드러운 그라데이션 목표치 바',
    thumbnail: null,
    downloadCount: 345,
    rating: 4.3,
    ratingCount: 12,
    creator: { displayName: 'WaveArt', verified: false },
  },
  {
    id: 5,
    name: '골드 프리미엄',
    category: 'ticker',
    description: '고급스러운 골드 전광판 테마',
    thumbnail: null,
    downloadCount: 234,
    rating: 4.7,
    ratingCount: 18,
    creator: { displayName: 'PremiumDesign', verified: true },
  },
  {
    id: 6,
    name: '귀여운 고양이',
    category: 'subtitle',
    description: '귀여운 고양이 테마 자막',
    thumbnail: null,
    downloadCount: 789,
    rating: 4.6,
    ratingCount: 45,
    creator: { displayName: 'CatLover', verified: false },
  },
];

const MarketplacePage = () => {
  const [designs, setDesigns] = useState(sampleDesigns);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('popular');
  const [viewMode, setViewMode] = useState('grid');

  const { isAuthenticated, user } = useAuth();

  const filteredDesigns = designs.filter(design => {
    const matchesCategory = selectedCategory === 'all' || design.category === selectedCategory;
    const matchesSearch = design.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          design.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const sortedDesigns = [...filteredDesigns].sort((a, b) => {
    switch (sortBy) {
      case 'popular':
        return b.downloadCount - a.downloadCount;
      case 'rating':
        return b.rating - a.rating;
      case 'newest':
        return b.id - a.id;
      default:
        return 0;
    }
  });

  const getCategoryIcon = (category) => {
    const cat = categories.find(c => c.id === category);
    return cat ? cat.icon : null;
  };

  const getCategoryLabel = (category) => {
    const cat = categories.find(c => c.id === category);
    return cat ? cat.label : category;
  };

  return (
    <div className="marketplace-container">
      {/* 헤더 */}
      <header className="marketplace-header">
        <div className="marketplace-header-left">
          <Link to="/" className="back-button">
            <ChevronLeft size={20} />
            대시보드
          </Link>
        </div>
        <div className="marketplace-header-center">
          <h1 className="marketplace-title">디자인 마켓플레이스</h1>
          <p className="marketplace-subtitle">커뮤니티가 만든 오버레이 디자인을 무료로 다운로드하세요</p>
        </div>
        <div className="marketplace-header-right">
          {isAuthenticated && (
            <Link to="/marketplace/upload" className="upload-button">
              <Upload size={18} />
              디자인 업로드
            </Link>
          )}
        </div>
      </header>

      {/* 검색 및 필터 */}
      <div className="marketplace-filters">
        <div className="search-bar">
          <Search size={18} />
          <input
            type="text"
            placeholder="디자인 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="popular">인기순</option>
            <option value="rating">평점순</option>
            <option value="newest">최신순</option>
          </select>

          <div className="view-toggle">
            <button
              className={viewMode === 'grid' ? 'active' : ''}
              onClick={() => setViewMode('grid')}
            >
              <Grid size={18} />
            </button>
            <button
              className={viewMode === 'list' ? 'active' : ''}
              onClick={() => setViewMode('list')}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* 카테고리 탭 */}
      <div className="category-tabs">
        {categories.map(category => (
          <button
            key={category.id}
            className={`category-tab ${selectedCategory === category.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(category.id)}
          >
            {category.icon}
            {category.label}
          </button>
        ))}
      </div>

      {/* 디자인 그리드 */}
      <div className={`designs-grid ${viewMode}`}>
        {loading ? (
          <div className="loading-state">
            <RefreshCw size={32} className="spin" />
            <p>불러오는 중...</p>
          </div>
        ) : sortedDesigns.length === 0 ? (
          <div className="empty-state">
            <Filter size={48} />
            <h3>디자인이 없습니다</h3>
            <p>검색 조건을 변경해보세요</p>
          </div>
        ) : (
          sortedDesigns.map(design => (
            <div key={design.id} className="design-card">
              <div className="design-thumbnail">
                {design.thumbnail ? (
                  <img src={design.thumbnail} alt={design.name} />
                ) : (
                  <div className="thumbnail-placeholder">
                    {getCategoryIcon(design.category)}
                  </div>
                )}
                <div className="design-category-badge">
                  {getCategoryLabel(design.category)}
                </div>
              </div>

              <div className="design-info">
                <h3 className="design-name">{design.name}</h3>
                <p className="design-description">{design.description}</p>

                <div className="design-creator">
                  <span className="creator-name">
                    {design.creator.displayName}
                    {design.creator.verified && <span className="verified-badge">✓</span>}
                  </span>
                </div>

                <div className="design-stats">
                  <div className="stat">
                    <Download size={14} />
                    <span>{design.downloadCount.toLocaleString()}</span>
                  </div>
                  <div className="stat">
                    <Star size={14} fill="#f59e0b" stroke="#f59e0b" />
                    <span>{design.rating}</span>
                    <span className="rating-count">({design.ratingCount})</span>
                  </div>
                </div>

                <button className="install-button">
                  <Download size={16} />
                  설치하기
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MarketplacePage;
