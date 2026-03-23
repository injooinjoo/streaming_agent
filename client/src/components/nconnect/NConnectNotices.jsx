import { Bell, Pin, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import LoadingSpinner from '../shared/LoadingSpinner';
import { EmptyState, PageHero, SectionCard, StatusBadge } from '../shared/studio';
import { fetchNConnectNoticeDetail, fetchNConnectNotices } from './api';

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
};

const NConnectNotices = () => {
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadList = async () => {
      setLoadingList(true);
      setError('');

      try {
        const result = await fetchNConnectNotices();
        if (!cancelled) {
          setItems(result.items || []);
          setSelectedId((current) => current || result.items?.[0]?.id || null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message);
        }
      } finally {
        if (!cancelled) {
          setLoadingList(false);
        }
      }
    };

    loadList();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadDetail = async () => {
      if (!selectedId) return;
      setLoadingDetail(true);

      try {
        const result = await fetchNConnectNoticeDetail(selectedId);
        if (!cancelled) {
          setDetail(result.item || null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message);
        }
      } finally {
        if (!cancelled) {
          setLoadingDetail(false);
        }
      }
    };

    loadDetail();

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const bodyParagraphs = useMemo(() => (detail?.body ? detail.body.split('\n\n') : []), [detail]);

  if (loadingList) {
    return (
      <div className="nconnect-loading">
        <LoadingSpinner text="공지사항을 불러오는 중입니다..." />
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div className="nconnect-page animate-fade">
        <EmptyState
          className="studio-accent--amber"
          icon={<RefreshCw size={24} />}
          title="공지사항을 불러오지 못했습니다."
          description={error}
        />
      </div>
    );
  }

  return (
    <div className="nconnect-page animate-fade">
      <PageHero
        accent="amber"
        eyebrow={<StatusBadge className="studio-accent--amber">공지사항</StatusBadge>}
        title="넥슨이 운영 공지와 일정 업데이트를 이 공간에 직접 반영할 수 있도록 준비했습니다."
        description="공지 목록과 상세 페이지를 같은 화면에 배치해 최신 안내를 빠르게 확인할 수 있으며, 이후 실제 CMS 또는 운영 데이터로 쉽게 교체할 수 있습니다."
        aside={
          <div className="nconnect-hero-stats">
            <div className="nconnect-summary-card">
              <span className="nconnect-summary-card__label">총 공지 수</span>
              <strong className="nconnect-summary-card__value">{items.length}건</strong>
              <p>고정 공지와 일반 공지를 분리해 우선순위를 유지합니다.</p>
            </div>
            <div className="nconnect-summary-card">
              <span className="nconnect-summary-card__label">현재 선택</span>
              <strong className="nconnect-summary-card__value">{detail?.category || '공지 없음'}</strong>
              <p>{detail ? formatDate(detail.publishedAt) : '상세 공지를 선택하면 이 영역에 표시됩니다.'}</p>
            </div>
          </div>
        }
      />

      <div className="nconnect-notices-layout">
        <SectionCard
          accent="amber"
          title="공지 목록"
          description="고정 공지를 상단에 배치하고, 클릭 시 우측 상세 패널을 갱신합니다."
        >
          <div className="nconnect-notice-list">
            {items.map((notice) => (
              <button
                key={notice.id}
                type="button"
                className={`nconnect-notice-card ${selectedId === notice.id ? 'is-active' : ''}`}
                onClick={() => setSelectedId(notice.id)}
              >
                <div className="nconnect-notice-card__header">
                  <div>
                    <div className="nconnect-inline-actions">
                      {notice.isPinned ? (
                        <span className="nconnect-pin-chip">
                          <Pin size={12} />
                          고정
                        </span>
                      ) : null}
                      <span className="nconnect-tier-chip">{notice.category}</span>
                    </div>
                    <div className="nconnect-notice-card__title">{notice.title}</div>
                  </div>
                  <span className="nconnect-notice-card__meta">{formatDate(notice.publishedAt)}</span>
                </div>
                <p className="nconnect-notice-card__summary">{notice.summary}</p>
              </button>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          accent="amber"
          title="공지 상세"
          description="실제 운영 단계에서는 넥슨이 이 영역의 내용을 직접 입력하는 구조로 교체할 수 있습니다."
        >
          {loadingDetail ? (
            <div className="nconnect-loading">
              <LoadingSpinner text="상세 공지를 불러오는 중입니다..." />
            </div>
          ) : detail ? (
            <div className="nconnect-detail">
              <div className="nconnect-detail-header">
                <div>
                  <div className="nconnect-inline-actions">
                    <span className="nconnect-tier-chip">{detail.category}</span>
                    {detail.isPinned ? (
                      <span className="nconnect-pin-chip">
                        <Pin size={12} />
                        고정 공지
                      </span>
                    ) : null}
                  </div>
                  <h3 className="nconnect-detail-title">{detail.title}</h3>
                </div>
                <span className="nconnect-detail-meta">{formatDate(detail.publishedAt)}</span>
              </div>
              <div className="nconnect-detail-body">
                {bodyParagraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState
              className="studio-accent--amber"
              icon={<Bell size={24} />}
              title="선택된 공지가 없습니다."
              description="좌측 목록에서 공지를 선택하면 상세 내용이 이 영역에 표시됩니다."
            />
          )}
        </SectionCard>
      </div>
    </div>
  );
};

export default NConnectNotices;
