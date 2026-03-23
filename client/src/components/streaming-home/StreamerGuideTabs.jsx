import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, ExternalLink, Link2, Settings2 } from 'lucide-react';
import { SectionCard, StatusBadge } from '../shared/studio';
import {
  defaultStreamerGuideTopicId,
  streamerGuideTopics,
} from './streamerGuideTopics';

const actionIconMap = {
  'internal-tab': Settings2,
  'account-subtab': Link2,
  'external-link': ExternalLink,
};

const StreamerGuideTabs = ({
  onInternalTab,
  onAccountSubTab,
  onExternalLink,
}) => {
  const [activeTopicId, setActiveTopicId] = useState(defaultStreamerGuideTopicId);
  const tabRefs = useRef([]);

  const activeTopic = useMemo(
    () =>
      streamerGuideTopics.find((topic) => topic.id === activeTopicId) ||
      streamerGuideTopics[0],
    [activeTopicId]
  );

  useEffect(() => {
    if (!activeTopic) {
      setActiveTopicId(defaultStreamerGuideTopicId);
    }
  }, [activeTopic]);

  const handleAction = (action) => {
    if (action.type === 'internal-tab') {
      onInternalTab?.(action.targetTab);
      return;
    }

    if (action.type === 'account-subtab') {
      onAccountSubTab?.(action.subTab);
      return;
    }

    if (action.type === 'external-link') {
      onExternalLink?.(action.url);
    }
  };

  const handleKeyDown = (event, index) => {
    if (!streamerGuideTopics.length) return;

    const lastIndex = streamerGuideTopics.length - 1;
    let nextIndex = index;

    if (event.key === 'ArrowRight') nextIndex = index === lastIndex ? 0 : index + 1;
    if (event.key === 'ArrowLeft') nextIndex = index === 0 ? lastIndex : index - 1;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = lastIndex;

    if (nextIndex === index && !['Home', 'End'].includes(event.key)) return;
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;

    event.preventDefault();
    setActiveTopicId(streamerGuideTopics[nextIndex].id);
    tabRefs.current[nextIndex]?.focus();
  };

  if (!activeTopic) return null;

  return (
    <SectionCard
      accent="blue"
      title="스트리머 추천 주제"
      description="방송 퀄리티, 운영, 수익 관리를 빠르게 훑고 필요한 설정이나 공식 자료로 바로 이어가세요."
      actions={
        <StatusBadge className="studio-accent--blue">
          추천 가이드 5선
        </StatusBadge>
      }
    >
      <div className="streamer-guide-tabs" role="tablist" aria-label="스트리머 추천 주제">
        {streamerGuideTopics.map((topic, index) => (
          <button
            key={topic.id}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`streamer-guide-tab-${topic.id}`}
            aria-selected={topic.id === activeTopic.id}
            aria-controls={`streamer-guide-panel-${topic.id}`}
            tabIndex={topic.id === activeTopic.id ? 0 : -1}
            className={`streamer-guide-tab ${topic.id === activeTopic.id ? 'is-active' : ''}`}
            onClick={() => setActiveTopicId(topic.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            <span className="streamer-guide-tab__label">{topic.label}</span>
          </button>
        ))}
      </div>

      <div
        className="streamer-guide-panel"
        id={`streamer-guide-panel-${activeTopic.id}`}
        role="tabpanel"
        aria-labelledby={`streamer-guide-tab-${activeTopic.id}`}
      >
        <article className="streamer-guide-summary">
          <div className="streamer-guide-summary__badge-row">
            <StatusBadge className="studio-accent--blue">추천 주제</StatusBadge>
            <span className="streamer-guide-summary__headline-label">{activeTopic.label}</span>
          </div>
          <h3>{activeTopic.headline}</h3>
          <p>{activeTopic.summary}</p>
          <ul className="streamer-guide-points">
            {activeTopic.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </article>

        <div className="streamer-guide-actions">
          {activeTopic.actions.map((action) => {
            const Icon = actionIconMap[action.type] || ChevronRight;

            return (
              <button
                key={action.id}
                type="button"
                className="streamer-guide-action-card"
                onClick={() => handleAction(action)}
              >
                <div className="streamer-guide-action-card__icon">
                  <Icon size={18} />
                </div>
                <div className="streamer-guide-action-card__body">
                  <span className="streamer-guide-action-card__category">{action.category}</span>
                  <strong>{action.title}</strong>
                  <p>{action.description}</p>
                </div>
                <div className="streamer-guide-action-card__footer">
                  <span>{action.buttonLabel}</span>
                  <ChevronRight size={16} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </SectionCard>
  );
};

export default StreamerGuideTabs;
