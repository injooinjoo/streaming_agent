import { Monitor, Target, TrendingUp, Zap } from 'lucide-react';
import { MetricCard, PageHero, SectionCard, StatusBadge } from '../shared/studio';
import './StreamingTipsTab.css';

const topicCards = [
  {
    id: 'fps-optimization',
    icon: <Target size={20} />,
    kicker: '성능 튜닝',
    title: '게임 프레임(FPS) 최적화 방법',
    summary:
      '발로란트, 배틀그라운드, 롤처럼 입력 지연에 민감한 게임은 프레임 방어와 핑 안정화 자체가 체감 실력으로 연결됩니다.',
    bullets: [
      '발로란트와 배그는 백그라운드 정리, 전원 관리, 저지연 옵션 세팅으로 교전 순간 프레임 드롭을 줄입니다.',
      '롤은 고정 프레임, 렌더링 옵션, 네트워크 우선순위 조합으로 핑 튐과 순간 끊김을 줄이는 방향이 핵심입니다.',
      '단순 사양 자랑보다 설정 전후 수치와 실제 교전 장면 비교가 설득력을 만듭니다.',
    ],
    tags: [
      { label: '대표 게임', value: '발로란트 · 배틀그라운드 · 롤' },
      { label: '콘텐츠 형식', value: '전후 비교 · 세팅 체크리스트' },
      { label: '추천 톤', value: '실전형 · 수치 중심' },
    ],
  },
  {
    id: 'gaming-gear',
    icon: <Zap size={20} />,
    kicker: '입력 장비 분석',
    title: '게이밍 기어 실전 리뷰',
    summary:
      '비싼 장비 소개보다 래피드 트리거, 스위치 입력감, 폴링레이트가 실제 티어 상승에 얼마나 영향을 주는지 분석하는 콘텐츠가 먹힙니다.',
    bullets: [
      '래피드 트리거 키보드는 반응 속도보다도 입력 복귀 타이밍과 실수 감소에 어떤 차이를 만드는지 보여줘야 합니다.',
      '마우스 폴링레이트는 숫자만 나열하지 말고 에임 안정감, 미세 조준, 장시간 플레이 피로도까지 묶어 설명합니다.',
      '프로 세팅 따라하기보다 티어별 체감 차이와 추천 조건을 나누면 시청 유지율이 높습니다.',
    ],
    tags: [
      { label: '대표 게임', value: 'FPS · 리듬 · 경쟁 PvP' },
      { label: '콘텐츠 형식', value: '장비 비교 · 티어별 체감 리뷰' },
      { label: '추천 톤', value: '냉정한 검증 · 과장 배제' },
    ],
  },
  {
    id: 'meta-patch',
    icon: <TrendingUp size={20} />,
    kicker: '정보 압축',
    title: '메타 요약 및 패치노트',
    summary:
      '게이머는 긴 패치노트를 전부 읽기보다 지금 당장 써먹을 수 있는 상향 포인트와 메타 변화를 빠르게 소비하길 원합니다.',
    bullets: [
      '"이번 패치로 떡상한 챔피언/무기 TOP 3"처럼 바로 결과가 보이는 제목 구조가 클릭률을 높입니다.',
      '핵심 변경점, 실전 영향, 추천 픽만 3줄로 압축하면 정보 소비 속도가 빨라집니다.',
      '패치 직후에는 장문의 해설보다 요약 카드, 추천 빌드, 금지 픽 정리가 먼저 반응을 가져옵니다.',
    ],
    tags: [
      { label: '대표 게임', value: '롤 · 발로란트 · 배그' },
      { label: '콘텐츠 형식', value: '3줄 요약 · TOP 3 카드' },
      { label: '추천 톤', value: '빠른 브리핑 · 메타 중심' },
    ],
  },
];

const heroStats = [
  { label: '추천 주제', value: '3개' },
  { label: '핵심 키워드', value: '실력 향상 · 정보' },
  { label: '소비 방식', value: '짧고 강한 실전형' },
];

const StreamingTipsTab = () => (
  <div className="animate-fade streaming-tips-tab">
    <PageHero
      accent="blue"
      eyebrow={<StatusBadge className="studio-accent--blue">방송 팁</StatusBadge>}
      title="하드코어 게이머 타겟 추천 주제"
      description="게이머는 감성보다도 실력 향상과 즉시 써먹을 수 있는 정보에 민감합니다. 프레임 방어, 입력 장비, 패치 요약처럼 성과와 연결되는 주제를 빠르게 소비할 수 있게 정리합니다."
      aside={
        <div className="streaming-tips-hero-aside">
          {heroStats.map((item) => (
            <div key={item.label} className="streaming-tips-hero-stat">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      }
    />

    <section className="studio-metric-grid" aria-label="방송 팁 핵심 포인트">
      <MetricCard
        accent="blue"
        tone="growth"
        label="실전 체감"
        value="프레임 · 핑"
        meta="교전 순간 성능 저하를 줄이는 설정형 주제가 반응이 빠릅니다."
        icon={<Monitor size={18} />}
      />
      <MetricCard
        accent="blue"
        tone="activity"
        label="장비 관심사"
        value="입력 정확도"
        meta="래피드 트리거, 폴링레이트처럼 티어와 연결되는 키워드에 관심이 쏠립니다."
        icon={<Zap size={18} />}
      />
      <MetricCard
        accent="blue"
        tone="audience"
        label="정보 소비"
        value="3줄 요약"
        meta="긴 패치노트보다 한눈에 읽히는 메타 브리핑 포맷이 강합니다."
        icon={<Target size={18} />}
      />
    </section>

    <SectionCard
      accent="blue"
      title="주제 카드"
      description="하드코어 게이머가 바로 저장하거나 공유하고 싶어할 만한 주제를 카드형으로 정리했습니다."
    >
      <div className="streaming-tips-grid">
        {topicCards.map((topic) => (
          <article key={topic.id} className="streaming-tips-card">
            <div className="streaming-tips-card__head">
              <span className="streaming-tips-card__kicker">{topic.kicker}</span>
              <span className="streaming-tips-card__icon">{topic.icon}</span>
            </div>

            <div className="streaming-tips-card__copy">
              <h3>{topic.title}</h3>
              <p>{topic.summary}</p>
            </div>

            <ul className="streaming-tips-card__list">
              {topic.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>

            <div className="streaming-tips-card__tags">
              {topic.tags.map((tag) => (
                <div key={`${topic.id}-${tag.label}`} className="streaming-tips-card__tag">
                  <span>{tag.label}</span>
                  <strong>{tag.value}</strong>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </SectionCard>
  </div>
);

export default StreamingTipsTab;
