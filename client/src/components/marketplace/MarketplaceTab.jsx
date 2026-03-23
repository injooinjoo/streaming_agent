import { useMemo, useState } from 'react';
import {
  Bell,
  Download,
  Filter,
  Grid,
  LayoutTemplate,
  List,
  MessageSquare,
  Search,
  Sparkles,
  Star,
  Subtitles,
  Target,
  Type,
  Upload,
  Verified,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../shared/LoadingSpinner';
import {
  ActionCluster,
  EmptyState,
  FilterBar,
  MetricCard,
  PageHero,
  SectionCard,
  StatusBadge,
} from '../shared/studio';
import './MarketplaceStudio.css';

const categories = [
  { id: 'all', label: '전체', icon: Grid, accent: 'blue' },
  { id: 'chat', label: '채팅', icon: MessageSquare, accent: 'blue' },
  { id: 'alert', label: '알림', icon: Bell, accent: 'rose' },
  { id: 'goal', label: '목표', icon: Target, accent: 'amber' },
  { id: 'ticker', label: '전광판', icon: Type, accent: 'emerald' },
  { id: 'subtitle', label: '자막', icon: Subtitles, accent: 'blue' },
];

const sampleDesigns = [
  {
    id: 1,
    name: '스튜디오 펄스 채팅',
    category: 'chat',
    description: '방송 톤을 해치지 않으면서도 존재감이 있는 실시간 채팅 테마입니다.',
    curatorNote: '모던 데스크 셋업과 궁합이 좋습니다.',
    downloadCount: 1234,
    rating: 4.8,
    ratingCount: 56,
    updatedAt: '오늘 업데이트',
    mood: 'Low-light editorial',
    creator: { displayName: 'CyberDesigner', verified: true },
    tags: ['채팅', '네온', '프리미엄'],
  },
  {
    id: 2,
    name: '포그 캔버스 채팅',
    category: 'chat',
    description: '차분한 아이보리 톤과 얇은 타이포그래피로 구성된 미니멀 채팅 세트입니다.',
    curatorNote: '낮 방송과 토크 콘텐츠에 잘 맞습니다.',
    downloadCount: 892,
    rating: 4.5,
    ratingCount: 34,
    updatedAt: '2일 전',
    mood: 'Warm minimal',
    creator: { displayName: 'MinimalStudio', verified: false },
    tags: ['채팅', '미니멀', '토크'],
  },
  {
    id: 3,
    name: '리액터 알림 패키지',
    category: 'alert',
    description: '후원과 구독 알림을 방송 리듬에 맞춰 크게 살리는 알림 패키지입니다.',
    curatorNote: '짧은 임팩트와 선명한 컬러 포인트가 특징입니다.',
    downloadCount: 567,
    rating: 4.9,
    ratingCount: 23,
    updatedAt: '이번 주',
    mood: 'Broadcast cue',
    creator: { displayName: 'RetroMaster', verified: true },
    tags: ['알림', '후원', '임팩트'],
  },
  {
    id: 4,
    name: '오르빗 골 그래프',
    category: 'goal',
    description: '후원 목표와 달성 진행률을 한눈에 보여주는 리치 그래프 스타일입니다.',
    curatorNote: '이벤트 방송이나 챌린지 방송에 적합합니다.',
    downloadCount: 345,
    rating: 4.3,
    ratingCount: 12,
    updatedAt: '3일 전',
    mood: 'Soft data',
    creator: { displayName: 'WaveArt', verified: false },
    tags: ['목표', '그래프', '이벤트'],
  },
  {
    id: 5,
    name: '골드 시그널 티커',
    category: 'ticker',
    description: '공지와 스폰서 메시지를 세련되게 흘려보내는 시그니처 티커 스타일입니다.',
    curatorNote: '광고 문구나 상단 브랜딩 라인에 안정적입니다.',
    downloadCount: 234,
    rating: 4.7,
    ratingCount: 18,
    updatedAt: '어제',
    mood: 'Luxury strip',
    creator: { displayName: 'PremiumDesign', verified: true },
    tags: ['티커', '브랜딩', '공지'],
  },
  {
    id: 6,
    name: '클린 보이스 자막',
    category: 'subtitle',
    description: '후원 메시지와 핵심 멘트를 명료하게 보여주는 스튜디오형 자막 템플릿입니다.',
    curatorNote: '게임 방송보다 토크/인터뷰 포맷에 더 잘 어울립니다.',
    downloadCount: 789,
    rating: 4.6,
    ratingCount: 45,
    updatedAt: '오늘 큐레이션',
    mood: 'Editorial subtitle',
    creator: { displayName: 'CatLover', verified: false },
    tags: ['자막', '토크', '선명함'],
  },
];

const sortLabels = {
  popular: '인기순',
  rating: '평점순',
  newest: '최신순',
};

const getCategoryMeta = (categoryId) =>
  categories.find((category) => category.id === categoryId) || categories[0];

const MarketplaceTab = () => {
  const [designs] = useState(sampleDesigns);
  const [loading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('popular');
  const [viewMode, setViewMode] = useState('grid');
  const { isAuthenticated } = useAuth();

  const filteredDesigns = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return designs.filter((design) => {
      const matchesCategory = selectedCategory === 'all' || design.category === selectedCategory;
      const matchesSearch =
        !normalizedQuery ||
        `${design.name} ${design.description} ${design.tags.join(' ')} ${design.creator.displayName}`
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesCategory && matchesSearch;
    });
  }, [designs, searchQuery, selectedCategory]);

  const sortedDesigns = useMemo(() => {
    return [...filteredDesigns].sort((left, right) => {
      switch (sortBy) {
        case 'rating':
          return right.rating - left.rating;
        case 'newest':
          return right.id - left.id;
        case 'popular':
        default:
          return right.downloadCount - left.downloadCount;
      }
    });
  }, [filteredDesigns, sortBy]);

  const totalDownloads = useMemo(
    () => designs.reduce((sum, design) => sum + design.downloadCount, 0),
    [designs]
  );

  const featuredCount = useMemo(
    () => designs.filter((design) => design.rating >= 4.7).length,
    [designs]
  );

  const selectedCategoryLabel = getCategoryMeta(selectedCategory).label;

  return (
    <div className="marketplace-studio animate-fade">
      <PageHero
        accent="blue"
        eyebrow={
          <StatusBadge className="studio-accent--blue" icon={<LayoutTemplate size={14} />}>
            큐레이션 마켓플레이스
          </StatusBadge>
        }
        title="방송 화면을 고르는 것이 아니라, 방송의 인상을 큐레이션합니다"
        description="채팅, 알림, 목표 그래프, 전광판, 자막까지 지금의 방송 톤에 맞는 오버레이 리소스를 한 장의 갤러리처럼 탐색하세요."
        actions={
          <ActionCluster align="left">
            {isAuthenticated ? (
              <button className="btn btn-primary">
                <Upload size={16} />
                디자인 업로드
              </button>
            ) : null}
            <button className="btn btn-outline" onClick={() => setSelectedCategory('all')}>
              <Sparkles size={16} />
              큐레이션 전체 보기
            </button>
          </ActionCluster>
        }
        aside={
          <div className="marketplace-studio__hero-aside">
            <div className="marketplace-studio__hero-note">
              <span>이번 주 에디터 픽</span>
              <strong>채팅과 알림 패키지 비중이 가장 높습니다</strong>
            </div>
            <div className="marketplace-studio__hero-note">
              <span>현재 필터</span>
              <strong>
                {selectedCategoryLabel} · {sortLabels[sortBy]}
              </strong>
            </div>
          </div>
        }
      />

      <section className="marketplace-studio__metrics">
        <MetricCard
          accent="blue"
          tone="audience"
          label="큐레이션 수"
          value={`${designs.length}개`}
          meta="검수된 샘플 디자인"
          icon={<LayoutTemplate size={18} />}
        />
        <MetricCard
          accent="blue"
          tone="growth"
          label="누적 설치"
          value={`${totalDownloads.toLocaleString()}회`}
          meta="커뮤니티 기준 다운로드"
          icon={<Download size={18} />}
        />
        <MetricCard
          accent="blue"
          tone="revenue"
          label="에디터 픽"
          value={`${featuredCount}개`}
          meta="평점 4.7 이상 디자인"
          icon={<Sparkles size={18} />}
        />
      </section>

      <SectionCard
        accent="blue"
        density="comfortable"
        title="디자인 탐색"
        description="검색, 정렬, 카테고리, 카드 레이아웃을 한곳에서 조정할 수 있습니다."
      >
        <FilterBar
          leading={
            <label className="marketplace-studio__search">
              <Search size={18} />
              <input
                type="text"
                placeholder="디자인, 제작자, 분위기 검색"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </label>
          }
          trailing={
            <div className="marketplace-studio__toolbar-actions">
              <label className="marketplace-studio__select">
                <span>정렬</span>
                <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                  <option value="popular">인기순</option>
                  <option value="rating">평점순</option>
                  <option value="newest">최신순</option>
                </select>
              </label>

              <div className="marketplace-studio__view-toggle" aria-label="보기 방식 전환">
                <button
                  type="button"
                  className={viewMode === 'grid' ? 'active' : ''}
                  onClick={() => setViewMode('grid')}
                >
                  <Grid size={18} />
                </button>
                <button
                  type="button"
                  className={viewMode === 'list' ? 'active' : ''}
                  onClick={() => setViewMode('list')}
                >
                  <List size={18} />
                </button>
              </div>
            </div>
          }
        >
          <div className="marketplace-studio__chips" role="tablist" aria-label="카테고리 필터">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.id}
                  type="button"
                  className={`marketplace-studio__chip ${
                    selectedCategory === category.id ? 'active' : ''
                  }`}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <Icon size={15} />
                  <span>{category.label}</span>
                </button>
              );
            })}
          </div>
        </FilterBar>
      </SectionCard>

      <SectionCard
        accent="blue"
        title={`결과 ${sortedDesigns.length}개`}
        description={
          selectedCategory === 'all'
            ? '전체 카테고리에서 현재 조건과 맞는 디자인만 선별했습니다.'
            : `${selectedCategoryLabel} 카테고리에서 현재 조건과 맞는 디자인만 선별했습니다.`
        }
      >
        {loading ? (
          <LoadingSpinner text="디자인 큐레이션을 불러오는 중입니다..." />
        ) : sortedDesigns.length === 0 ? (
          <EmptyState
            icon={<Filter size={24} />}
            title="조건에 맞는 디자인이 아직 없습니다"
            description="검색어를 줄이거나 카테고리 필터를 전체로 바꿔 다시 살펴보세요."
            action={
              <button
                className="btn btn-outline"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
              >
                필터 초기화
              </button>
            }
          />
        ) : (
          <div className={`marketplace-studio__grid marketplace-studio__grid--${viewMode}`}>
            {sortedDesigns.map((design) => {
              const category = getCategoryMeta(design.category);
              const Icon = category.icon;

              return (
                <article key={design.id} className="marketplace-studio__card">
                  <div className={`marketplace-studio__poster studio-accent--${category.accent}`}>
                    <div className="marketplace-studio__poster-top">
                      <StatusBadge className={`studio-accent--${category.accent}`}>
                        {category.label}
                      </StatusBadge>
                      <span className="marketplace-studio__poster-updated">{design.updatedAt}</span>
                    </div>
                    <div className="marketplace-studio__poster-mark">
                      <Icon size={26} />
                      <strong>{design.mood}</strong>
                    </div>
                    <p>{design.curatorNote}</p>
                  </div>

                  <div className="marketplace-studio__card-body">
                    <div className="marketplace-studio__card-heading">
                      <div>
                        <h3>{design.name}</h3>
                        <p>{design.description}</p>
                      </div>
                      <div className="marketplace-studio__rating">
                        <Star size={15} fill="currentColor" />
                        <span>{design.rating}</span>
                      </div>
                    </div>

                    <div className="marketplace-studio__meta">
                      <span className="marketplace-studio__creator">
                        {design.creator.displayName}
                        {design.creator.verified ? <Verified size={14} /> : null}
                      </span>
                      <span>{design.downloadCount.toLocaleString()}회 설치</span>
                      <span>리뷰 {design.ratingCount}개</span>
                    </div>

                    <div className="marketplace-studio__tags">
                      {design.tags.map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </div>

                    <div className="marketplace-studio__card-actions">
                      <button className="btn btn-primary">
                        <Download size={16} />
                        바로 적용
                      </button>
                      <button className="btn btn-outline">상세 보기</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
};

export default MarketplaceTab;
