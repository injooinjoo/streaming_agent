import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronDown,
  Copy,
  Flame,
  Menu,
  MessageSquare,
  Mic2,
  RotateCcw,
  Search,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import ServiceBar, { SERVICE_BAR_RESELECT_EVENT } from '../shared/ServiceBar';
import { EmptyState, MetricCard, PageHero, SectionCard, StatusBadge } from '../shared/studio';
import '../Dashboard.css';
import '../DashboardStudio.css';
import './EventsShell.css';
import {
  DONATION_TIP_SECTIONS,
  EVENT_CALENDAR_ITEMS,
  EVENT_HOME_METRICS,
  EVENT_HOME_QUICK_ACTIONS,
  EVENT_HOME_SPOTLIGHT,
  EVENT_HOME_TOPIC_CARDS,
  EVENT_HOME_TRENDING_TAGS,
  EVENT_MEME_ENTRIES,
  EVENT_NAV_ITEMS,
  STREAMER_TEST_QUESTIONS,
  STREAMER_TEST_RESULTS,
} from './eventMockData';

const DEFAULT_PAGE = 'home';
const EVENT_GROUPS = [{ label: '팬덤 허브', items: EVENT_NAV_ITEMS }];
const RESULT_ORDER = ['immersive', 'chemistry', 'meme', 'reaction'];

const pageIconMap = {
  sparkles: Sparkles,
  calendar: CalendarDays,
  'message-square': MessageSquare,
  mic: Mic2,
  trophy: Trophy,
};

const timeframeOptions = [
  { id: 'today', label: '오늘' },
  { id: 'week', label: '이번 주' },
  { id: 'upcoming', label: '예정' },
];

const categoryOptions = [
  { id: 'all', label: '전체' },
  { id: 'collab', label: '합방' },
  { id: 'tournament', label: '대회' },
  { id: 'esports', label: 'e스포츠' },
];

const createInitialScore = () => ({
  immersive: 0,
  chemistry: 0,
  meme: 0,
  reaction: 0,
});

const copyToClipboard = async (text) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'absolute';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
};

const getBadgeTone = (badge) => {
  if (badge === '라이브') return 'danger';
  return 'default';
};

const EventsShell = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activePageId, setActivePageId] = useState(DEFAULT_PAGE);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [calendarTimeframe, setCalendarTimeframe] = useState('today');
  const [calendarCategory, setCalendarCategory] = useState('all');
  const [memeQuery, setMemeQuery] = useState('');
  const [activeMemeTag, setActiveMemeTag] = useState('전체');
  const [answers, setAnswers] = useState({});
  const [testResult, setTestResult] = useState(null);
  const { showError, showSuccess, showWarning } = useToast();

  const activePage = EVENT_NAV_ITEMS.find((item) => item.id === activePageId) || EVENT_NAV_ITEMS[0];

  useEffect(() => {
    const handleServiceReselect = (event) => {
      if (event.detail?.serviceId !== 'events') return;
      setActivePageId(DEFAULT_PAGE);
      setMobileMenuOpen(false);
    };

    window.addEventListener(SERVICE_BAR_RESELECT_EVENT, handleServiceReselect);
    return () => {
      window.removeEventListener(SERVICE_BAR_RESELECT_EVENT, handleServiceReselect);
    };
  }, []);

  const allMemeTags = useMemo(() => {
    const tags = new Set(['전체']);
    EVENT_MEME_ENTRIES.forEach((entry) => {
      entry.tags.forEach((tag) => tags.add(tag));
    });
    return [...tags];
  }, []);

  const filteredCalendarItems = useMemo(() => (
    EVENT_CALENDAR_ITEMS.filter((item) => {
      const matchesTimeframe = item.timeframe === calendarTimeframe;
      const matchesCategory = calendarCategory === 'all' || item.category === calendarCategory;
      return matchesTimeframe && matchesCategory;
    })
  ), [calendarCategory, calendarTimeframe]);

  const filteredMemeEntries = useMemo(() => {
    const query = memeQuery.trim().toLowerCase();
    return EVENT_MEME_ENTRIES.filter((entry) => {
      const matchesTag = activeMemeTag === '전체' || entry.tags.includes(activeMemeTag);
      const haystack = [
        entry.name,
        entry.meaning,
        entry.origin,
        entry.usage,
        entry.example,
        entry.caution,
        ...entry.tags,
      ].join(' ').toLowerCase();
      const matchesQuery = !query || haystack.includes(query);
      return matchesTag && matchesQuery;
    });
  }, [activeMemeTag, memeQuery]);

  const testProgress = useMemo(
    () => Math.round((Object.keys(answers).length / STREAMER_TEST_QUESTIONS.length) * 100),
    [answers]
  );

  const resultConfig = testResult ? STREAMER_TEST_RESULTS[testResult.primary] : null;

  const handleOpenPage = (pageId) => {
    setActivePageId(pageId);
    setMobileMenuOpen(false);
  };

  const toggleGroup = (groupLabel) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupLabel]: !prev[groupLabel],
    }));
  };

  const handleCopy = async (text, label) => {
    try {
      await copyToClipboard(text);
      showSuccess(`${label} 문구를 복사했어요.`);
    } catch (error) {
      showError('복사에 실패했어요. 브라우저 권한을 확인해 주세요.');
    }
  };

  const handleAnswerSelect = (questionId, choiceId) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: choiceId,
    }));
  };

  const handleSubmitTest = () => {
    if (Object.keys(answers).length !== STREAMER_TEST_QUESTIONS.length) {
      showWarning('모든 문항에 답하면 결과를 볼 수 있어요.');
      return;
    }

    const totals = createInitialScore();
    STREAMER_TEST_QUESTIONS.forEach((question) => {
      const selectedChoice = question.choices.find((choice) => choice.id === answers[question.id]);
      if (!selectedChoice) return;

      Object.entries(selectedChoice.scores).forEach(([key, value]) => {
        totals[key] += value;
      });
    });

    const ranked = Object.entries(totals).sort((left, right) => {
      if (right[1] !== left[1]) return right[1] - left[1];
      return RESULT_ORDER.indexOf(left[0]) - RESULT_ORDER.indexOf(right[0]);
    });

    setTestResult({
      primary: ranked[0][0],
      secondary: ranked.slice(1, 3).map(([key]) => key),
    });
  };

  const handleResetTest = () => {
    setAnswers({});
    setTestResult(null);
  };

  const renderHeroAside = (items) => (
    <div className="events-hero-aside">
      {items.map((item) => (
        <div key={item.label} className="events-hero-stat">
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  );

  const renderMetricGrid = (items) => (
    <section className="events-metric-grid">
      {items.map((item) => {
        const Icon = pageIconMap[item.iconKey] || Sparkles;
        return (
          <MetricCard
            key={item.label}
            accent="rose"
            label={item.label}
            value={item.value}
            meta={item.meta}
            icon={<Icon size={18} />}
          />
        );
      })}
    </section>
  );

  const renderHome = () => (
    <div className="events-content">
      <PageHero
        accent="rose"
        eyebrow={(
          <div className="events-hero-eyebrow">
            <StatusBadge className="studio-accent--rose">팬덤형 이벤트 허브</StatusBadge>
            <StatusBadge tone="danger">신규</StatusBadge>
            <StatusBadge tone="default">공개 서비스</StatusBadge>
          </div>
        )}
        title="오늘 팬덤이 같이 달릴 콘텐츠를 한 화면에서 고릅니다."
        description="합방과 대회 캘린더, 밈 사전, 도네이션 꿀팁, 취향 테스트를 한데 모아 시청 전에 빠르게 훑을 수 있게 정리했습니다."
        actions={(
          <>
            <button type="button" className="btn btn-primary" onClick={() => handleOpenPage('calendar')}>
              <CalendarDays size={16} />
              오늘 일정 보기
            </button>
            <button type="button" className="btn btn-outline" onClick={() => handleOpenPage('streamer-test')}>
              <Trophy size={16} />
              취향 테스트 시작
            </button>
          </>
        )}
        aside={renderHeroAside([
          { label: '오늘 체크할 일정', value: '2개' },
          { label: '이번 주 추천 포인트', value: '8개' },
          { label: '빠른 소비 문구', value: '16개' },
        ])}
      />

      {renderMetricGrid(EVENT_HOME_METRICS)}

      <SectionCard
        accent="rose"
        title="무엇을 보고 놀지 한눈에"
        description="허브에서 원하는 주제를 바로 고르고 세부 페이지로 이동할 수 있습니다."
      >
        <div className="events-topic-grid">
          {EVENT_HOME_TOPIC_CARDS.map((card) => {
            const Icon = pageIconMap[card.iconKey] || Sparkles;
            return (
              <button
                key={card.id}
                type="button"
                className="events-topic-card"
                onClick={() => handleOpenPage(card.id)}
              >
                <div className="events-topic-card__top">
                  <div className="events-topic-card__icon">
                    <Icon size={18} />
                  </div>
                  {card.badge ? <StatusBadge tone={getBadgeTone(card.badge)}>{card.badge}</StatusBadge> : null}
                </div>
                <div>
                  <h3>{card.title}</h3>
                  <p>{card.description}</p>
                </div>
                <ul className="events-bullet-list">
                  {card.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>
      </SectionCard>

      <div className="events-spotlight-grid">
        {EVENT_HOME_SPOTLIGHT.map((panel) => (
          <SectionCard
            key={panel.title}
            accent="rose"
            title={panel.title}
            description="지금 많이 찾는 흐름만 짧게 압축했습니다."
          >
            <div className="events-list-card">
              {panel.items.map((item) => (
                <div key={`${panel.title}-${item.title}`} className="events-list-card__item">
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.meta}</span>
                  </div>
                  <StatusBadge tone="default">{item.label}</StatusBadge>
                </div>
              ))}
            </div>
          </SectionCard>
        ))}
      </div>

      <div className="events-spotlight-grid">
        <SectionCard
          accent="rose"
          title="요즘 자주 눌러보는 태그"
          description="팬덤이 빠르게 소모하는 키워드를 태그로 모았습니다."
        >
          <div className="events-tag-cloud">
            {EVENT_HOME_TRENDING_TAGS.map((tag) => (
              <span key={tag} className="events-inline-pill">
                #{tag}
              </span>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          accent="rose"
          title="빠른 이동"
          description="지금 필요한 작업에 맞춰 바로 이동할 수 있습니다."
        >
          <div className="events-list-card">
            {EVENT_HOME_QUICK_ACTIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                className="events-list-card__item"
                onClick={() => handleOpenPage(item.id)}
              >
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.description}</span>
                </div>
                <Sparkles size={16} />
              </button>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );

  const renderCalendar = () => {
    const counts = {
      today: EVENT_CALENDAR_ITEMS.filter((item) => item.timeframe === 'today').length,
      week: EVENT_CALENDAR_ITEMS.filter((item) => item.timeframe === 'week').length,
      upcoming: EVENT_CALENDAR_ITEMS.filter((item) => item.timeframe === 'upcoming').length,
    };

    return (
      <div className="events-content">
        <PageHero
          accent="rose"
          eyebrow={(
            <div className="events-hero-eyebrow">
              <StatusBadge className="studio-accent--rose">합방/대회 캘린더</StatusBadge>
              <StatusBadge tone="danger">실시간 큐레이션</StatusBadge>
            </div>
          )}
          title="합방, 대회, 공동뷰 일정을 팬덤 기준으로 정리했습니다."
          description="오늘부터 예정 일정까지, 어디서 누가 나오고 왜 재미있는지까지 한 번에 볼 수 있게 구성했습니다."
          aside={renderHeroAside([
            { label: '오늘', value: `${counts.today}개` },
            { label: '이번 주', value: `${counts.week}개` },
            { label: '예정', value: `${counts.upcoming}개` },
          ])}
        />

        <SectionCard
          accent="rose"
          title="필터"
          description="시기와 이벤트 종류를 조합해서 원하는 일정만 볼 수 있습니다."
        >
          <div className="events-filter-toolbar">
            <div className="events-filter-group">
              <span className="events-filter-group__label">시기</span>
              <div className="events-filter-row">
                {timeframeOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`events-filter-button ${calendarTimeframe === option.id ? 'is-active' : ''}`}
                    onClick={() => setCalendarTimeframe(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="events-filter-group">
              <span className="events-filter-group__label">분류</span>
              <div className="events-filter-row">
                {categoryOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`events-filter-button ${calendarCategory === option.id ? 'is-active' : ''}`}
                    onClick={() => setCalendarCategory(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>

        {filteredCalendarItems.length ? (
          <div className="events-calendar-grid">
            {filteredCalendarItems.map((item) => (
              <article key={item.id} className="events-calendar-card">
                <div className="events-calendar-card__top">
                  <div className="events-calendar-card__icon">
                    <CalendarDays size={18} />
                  </div>
                  <StatusBadge tone={getBadgeTone(item.badge)}>{item.badge}</StatusBadge>
                </div>

                <div>
                  <h3>{item.title}</h3>
                  <p>{item.dateLabel} · {item.stage}</p>
                </div>

                <div className="events-calendar-card__meta">
                  {item.platforms.map((platform) => (
                    <span key={platform} className="events-inline-pill">
                      {platform}
                    </span>
                  ))}
                </div>

                <dl className="events-detail-list">
                  <div>
                    <dt>참여 스트리머/팀</dt>
                    <dd>{item.participants.join(' · ')}</dd>
                  </div>
                  <div>
                    <dt>기대 포인트</dt>
                    <dd>{item.hook}</dd>
                  </div>
                  <div>
                    <dt>추천 시청 이유</dt>
                    <dd>{item.whyWatch}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        ) : (
          <div className="events-empty">
            <EmptyState
              icon={<CalendarDays size={24} />}
              title="조건에 맞는 일정이 아직 없어요."
              description="다른 시기나 분류를 선택하면 준비된 이벤트를 더 볼 수 있습니다."
            />
          </div>
        )}
      </div>
    );
  };

  const renderMemes = () => (
    <div className="events-content">
      <PageHero
        accent="rose"
        eyebrow={(
          <div className="events-hero-eyebrow">
            <StatusBadge className="studio-accent--rose">밈 사전</StatusBadge>
            <StatusBadge tone="default">영도 참고용</StatusBadge>
          </div>
        )}
        title="요즘 방송 밈을 뜻, 유래, 사용 맥락까지 같이 정리했습니다."
        description="채팅 문맥을 모르고 쓰면 어색해지는 표현들을 예시 멘트와 주의사항까지 포함해 빠르게 찾을 수 있습니다."
        aside={renderHeroAside([
          { label: '등록 밈', value: `${EVENT_MEME_ENTRIES.length}개` },
          { label: 'HOT 태그', value: `${EVENT_MEME_ENTRIES.filter((entry) => entry.hot).length}개` },
          { label: '검색 태그', value: `${allMemeTags.length - 1}개` },
        ])}
      />

      <SectionCard
        accent="rose"
        title="검색과 태그"
        description="밈명이나 문맥 키워드로 찾고, 자주 쓰이는 태그로 좁혀볼 수 있습니다."
      >
        <div className="events-content">
          <div className="events-search-shell">
            <Search size={16} />
            <input
              type="search"
              value={memeQuery}
              onChange={(event) => setMemeQuery(event.target.value)}
              placeholder="밈명, 뜻, 예시 멘트를 검색해 보세요."
            />
          </div>

          <div className="events-tag-cloud">
            {allMemeTags.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`events-tag-button ${activeMemeTag === tag ? 'is-active' : ''}`}
                onClick={() => setActiveMemeTag(tag)}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      </SectionCard>

      {filteredMemeEntries.length ? (
        <div className="events-meme-grid">
          {filteredMemeEntries.map((entry) => (
            <article key={entry.id} className="events-meme-card">
              <div className="events-calendar-card__top">
                <div>
                  <h3>{entry.name}</h3>
                  <p>{entry.meaning}</p>
                </div>
                {entry.hot ? <StatusBadge tone="danger">HOT</StatusBadge> : null}
              </div>

              <div className="events-calendar-card__meta">
                {entry.tags.map((tag) => (
                  <span key={tag} className="events-inline-pill">
                    #{tag}
                  </span>
                ))}
              </div>

              <dl className="events-detail-list">
                <div>
                  <dt>유래</dt>
                  <dd>{entry.origin}</dd>
                </div>
                <div>
                  <dt>언제 쓰는지</dt>
                  <dd>{entry.usage}</dd>
                </div>
              </dl>

              <div>
                <div className="events-section-label">예시 멘트</div>
                <div className="events-meme-card__quote">{entry.example}</div>
              </div>

              <div>
                <div className="events-section-label">주의사항</div>
                <p>{entry.caution}</p>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="events-empty">
          <EmptyState
            icon={<MessageSquare size={24} />}
            title="검색 조건에 맞는 밈이 없어요."
            description="다른 태그를 고르거나 검색어를 조금 더 짧게 바꿔 보세요."
          />
        </div>
      )}
    </div>
  );

  const renderDonationTips = () => (
    <div className="events-content">
      <PageHero
        accent="rose"
        eyebrow={(
          <div className="events-hero-eyebrow">
            <StatusBadge className="studio-accent--rose">도네이션 꿀팁</StatusBadge>
            <StatusBadge tone="default">복사 가능</StatusBadge>
          </div>
        )}
        title="방송 흐름을 살리는 TTS와 한 줄 멘트를 골라 씁니다."
        description="길게 설명하지 않아도 바로 써먹을 수 있도록 TTS 조합과 상황별 멘트를 카드 형태로 정리했습니다."
        actions={(
          <button type="button" className="btn btn-outline" onClick={() => handleOpenPage('memes')}>
            <Flame size={16} />
            밈 사전 같이 보기
          </button>
        )}
        aside={renderHeroAside([
          { label: '복사 가능한 카드', value: '7개' },
          { label: '추천 사용 상황', value: '합방·대회·영도' },
          { label: '주의 항목', value: '3개' },
        ])}
      />

      {DONATION_TIP_SECTIONS.map((section) => (
        <SectionCard
          key={section.id}
          accent="rose"
          title={section.title}
          description={section.description}
        >
          <div className="events-tip-grid">
            {section.items.map((item) => (
              <article key={item.title} className="events-tip-card">
                <div className="events-tip-card__top">
                  <div className="events-tip-card__icon">
                    <Mic2 size={18} />
                  </div>
                  {item.copyText ? <StatusBadge tone="default">복사 가능</StatusBadge> : <StatusBadge tone="danger">주의</StatusBadge>}
                </div>

                <div>
                  <h3>{item.title}</h3>
                  <p>{item.summary}</p>
                </div>

                {item.preview ? (
                  <div>
                    <div className="events-section-label">예시</div>
                    <div className="events-tip-card__preview">{item.preview}</div>
                  </div>
                ) : null}

                <p>{item.note}</p>

                <div className="events-tip-card__actions">
                  <span className="events-inline-pill">{section.title}</span>
                  {item.copyText ? (
                    <button
                      type="button"
                      className="events-copy-button"
                      onClick={() => handleCopy(item.copyText, item.title)}
                    >
                      <Copy size={16} />
                      문구 복사
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      ))}
    </div>
  );

  const renderStreamerTest = () => (
    <div className="events-content">
      <PageHero
        accent="rose"
        eyebrow={(
          <div className="events-hero-eyebrow">
            <StatusBadge className="studio-accent--rose">스트리머 찾기 테스트</StatusBadge>
            <StatusBadge tone="default">7문항</StatusBadge>
          </div>
        )}
        title="내가 좋아하는 방송 텐션을 골라 취향에 맞는 스타일을 찾아봅니다."
        description="MBTI처럼 가볍게 답하고, 지금 팬덤 생활에 잘 맞는 방송 스타일과 추천 예시를 확인해 보세요."
        actions={(
          <button type="button" className="btn btn-outline" onClick={handleResetTest}>
            <RotateCcw size={16} />
            다시 시작
          </button>
        )}
        aside={renderHeroAside([
          { label: '진행 문항', value: `${Object.keys(answers).length}/${STREAMER_TEST_QUESTIONS.length}` },
          { label: '결과 유형', value: '4가지' },
          { label: '추천 예시', value: '플랫폼별 큐레이션' },
        ])}
      />

      <SectionCard
        accent="rose"
        title="진행 상황"
        description="모든 문항을 답하면 결과 카드가 열립니다."
      >
        <div className="events-test-shell">
          <div className="events-test-progress">
            <strong>{testProgress}% 완료</strong>
            <div className="events-progress-track" aria-hidden="true">
              <div className="events-progress-fill" style={{ width: `${testProgress}%` }} />
            </div>
          </div>

          <div className="events-question-list">
            {STREAMER_TEST_QUESTIONS.map((question, index) => (
              <article key={question.id} className="events-question-card">
                <div>
                  <div className="events-section-label">문항 {index + 1}</div>
                  <h3>{question.prompt}</h3>
                </div>

                <div className="events-choice-grid">
                  {question.choices.map((choice) => (
                    <button
                      key={choice.id}
                      type="button"
                      className={`events-choice-button ${answers[question.id] === choice.id ? 'is-selected' : ''}`}
                      onClick={() => handleAnswerSelect(question.id, choice.id)}
                    >
                      {choice.label}
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <div className="events-test-footer">
            <p>모든 답변은 브라우저 로컬 상태로만 계산되며 저장되지 않습니다.</p>
            <button type="button" className="btn btn-primary" onClick={handleSubmitTest}>
              결과 보기
            </button>
          </div>
        </div>
      </SectionCard>

      {resultConfig ? (
        <SectionCard
          accent="rose"
          title="테스트 결과"
          description="현재 취향 기준으로 가장 잘 맞는 방송 스타일입니다."
        >
          <div className="events-content">
            <article className="events-result-card">
              <div className="events-result-card__header">
                <div className="events-result-card__copy">
                  <div className="events-inline-badges">
                    <StatusBadge className="studio-accent--rose">{resultConfig.title}</StatusBadge>
                    {testResult.secondary.map((key) => (
                      <StatusBadge key={key} tone="default">
                        {STREAMER_TEST_RESULTS[key].title}
                      </StatusBadge>
                    ))}
                  </div>
                  <h3>{resultConfig.subtitle}</h3>
                  <p>{resultConfig.summary}</p>
                </div>

                <button type="button" className="events-copy-button" onClick={handleResetTest}>
                  <RotateCcw size={16} />
                  다시 테스트
                </button>
              </div>

              <div className="events-result-card__style">
                <div className="events-section-label">추천 방송 스타일</div>
                <strong>{resultConfig.style}</strong>
              </div>

              <div>
                <div className="events-section-label">잘 맞는 이유</div>
                <ul className="events-reason-list">
                  {resultConfig.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>
            </article>

            <div className="events-result-streamers">
              {resultConfig.recommendedStreamers.map((streamer) => (
                <article key={`${resultConfig.title}-${streamer.name}`} className="events-result-streamer">
                  <div className="events-result-streamer__top">
                    <div>
                      <strong>{streamer.name}</strong>
                      <p>{streamer.vibe}</p>
                    </div>
                    <span className="events-inline-pill">{streamer.platform}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </SectionCard>
      ) : null}
    </div>
  );

  const renderContent = () => {
    if (activePageId === 'calendar') return renderCalendar();
    if (activePageId === 'memes') return renderMemes();
    if (activePageId === 'donation-tips') return renderDonationTips();
    if (activePageId === 'streamer-test') return renderStreamerTest();
    return renderHome();
  };

  return (
    <div className="dashboard-page events-page">
      <ServiceBar />
      <div className="dashboard-layout events-layout">
        {mobileMenuOpen && <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} />}

        <aside className={`chatgpt-sidebar events-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          {mobileMenuOpen && (
            <button type="button" className="sidebar-close-btn" onClick={() => setMobileMenuOpen(false)}>
              <X size={24} />
            </button>
          )}

          <div className="sidebar-top events-sidebar-top">
            <div className="app-logo">
              <div className="logo-icon">EV</div>
              <div>
                <div className="logo-text">이벤트</div>
                <div className="sidebar-note">팬덤형 콘텐츠 허브</div>
              </div>
            </div>

            <div className="events-brand-badges">
              <span className="events-brand-badge">팬덤</span>
              <span className="events-brand-badge is-public">공개</span>
            </div>
          </div>

          <div className="events-info-card">
            <div className="events-info-card__label">한 번에 보기</div>
            <strong>합방 일정부터 밈, 도네 팁, 취향 테스트까지</strong>
            <p>시청 전 빠르게 훑고 바로 이동할 수 있도록 팬덤 소비 흐름에 맞춰 구성했습니다.</p>
          </div>

          <nav className="sidebar-nav" aria-label="이벤트 탐색">
            {EVENT_GROUPS.map((group) => {
              const isCollapsed = collapsedGroups[group.label];
              const hasActiveItem = group.items.some((item) => item.id === activePageId);

              return (
                <div key={group.label} className="nav-group">
                  <button
                    type="button"
                    className={`group-label-btn ${hasActiveItem ? 'has-active' : ''}`}
                    onClick={() => toggleGroup(group.label)}
                  >
                    <span className="group-label">{group.label}</span>
                    <ChevronDown size={14} className={`group-chevron ${isCollapsed ? 'collapsed' : ''}`} />
                  </button>
                  <div className={`nav-group-items ${isCollapsed ? 'collapsed' : ''}`}>
                    {group.items.map((item) => {
                      const Icon = pageIconMap[item.iconKey] || Sparkles;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className={`nav-item events-nav-item ${activePageId === item.id ? 'active' : ''}`}
                          onClick={() => handleOpenPage(item.id)}
                          title={item.label}
                        >
                          <Icon size={18} />
                          <div className="events-nav-copy">
                            <div className="events-nav-title-row">
                              <span className="nav-label">{item.label}</span>
                              {item.badge ? (
                                <span className={`events-nav-badge ${item.badge === '라이브' ? 'is-live' : ''}`}>
                                  {item.badge}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
        </aside>

        <main className="chatgpt-main events-main">
          <header className="top-nav events-top-nav">
            <button type="button" className="mobile-menu-btn" onClick={() => setMobileMenuOpen(true)}>
              <Menu size={24} />
            </button>

            <div className="top-nav__service">
              <div className="top-nav__title">{activePage.label}</div>
              <div className="top-nav__subtitle">{activePage.description}</div>
            </div>
          </header>

          <div className="content-body">{renderContent()}</div>
        </main>
      </div>
    </div>
  );
};

export default EventsShell;
