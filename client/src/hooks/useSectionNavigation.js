import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

/**
 * 섹션 네비게이션을 위한 커스텀 훅
 * IntersectionObserver를 사용하여 현재 보이는 섹션을 추적하고
 * 부드러운 스크롤 이동을 제공합니다.
 *
 * @param {string[]} sectionIds - 섹션 ID 배열 (예: ['theme', 'detail', 'color'])
 * @param {object} options - 추가 옵션
 * @param {string} options.defaultSection - 기본 활성 섹션 (기본값: 첫 번째 섹션)
 * @param {string} options.rootMargin - IntersectionObserver rootMargin (기본값: '-100px 0px -70% 0px')
 * @param {number} options.threshold - IntersectionObserver threshold (기본값: 0)
 * @returns {object} 네비게이션 상태 및 함수들
 */
const useSectionNavigation = (sectionIds, options = {}) => {
  const {
    defaultSection,
    rootMargin = '-100px 0px -70% 0px',
    threshold = 0
  } = options;

  const [activeNav, setActiveNav] = useState(defaultSection || sectionIds[0]);

  // 각 섹션에 대한 ref 생성
  const sectionRefs = useMemo(() => {
    const refs = {};
    sectionIds.forEach(id => {
      refs[id] = { current: null };
    });
    return refs;
  }, [sectionIds.join(',')]);

  // ref 설정을 위한 함수
  const setSectionRef = useCallback((id) => (element) => {
    if (sectionRefs[id]) {
      sectionRefs[id].current = element;
    }
  }, [sectionRefs]);

  // 섹션으로 스크롤 이동
  const scrollToSection = useCallback((id) => {
    const ref = sectionRefs[id];
    if (ref?.current) {
      ref.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
      setActiveNav(id);
    }
  }, [sectionRefs]);

  // IntersectionObserver 설정
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin,
      threshold
    };

    const handleIntersect = (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const sectionId = entry.target.getAttribute('data-section');
          if (sectionId && sectionIds.includes(sectionId)) {
            setActiveNav(sectionId);
          }
        }
      });
    };

    const observer = new IntersectionObserver(handleIntersect, observerOptions);

    // 섹션들을 관찰
    const sections = document.querySelectorAll('.settings-section');
    sections.forEach(section => {
      observer.observe(section);
    });

    return () => observer.disconnect();
  }, [sectionIds, rootMargin, threshold]);

  return {
    // 상태
    activeNav,
    setActiveNav,
    sectionRefs,

    // 액션
    scrollToSection,
    setSectionRef
  };
};

export default useSectionNavigation;
