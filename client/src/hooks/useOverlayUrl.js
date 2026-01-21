import { useState, useCallback, useMemo } from 'react';
import { API_URL } from '../config/api';

/**
 * 오버레이 URL 관리를 위한 커스텀 훅
 * URL 생성, 클립보드 복사 등의 기능을 제공합니다.
 *
 * @param {string} overlayHash - 사용자의 오버레이 해시
 * @param {string} overlayType - 오버레이 타입 (chat, alerts, goals 등)
 * @param {object} options - 추가 옵션
 * @param {function} options.onCopySuccess - 복사 성공 콜백 (선택)
 * @param {function} options.onCopyError - 복사 실패 콜백 (선택)
 * @param {number} options.copiedDuration - 복사됨 상태 유지 시간 ms (기본값: 2000)
 * @returns {object} URL 상태 및 함수들
 */
const useOverlayUrl = (overlayHash, overlayType, options = {}) => {
  const {
    onCopySuccess,
    onCopyError,
    copiedDuration = 2000
  } = options;

  const [copied, setCopied] = useState(false);

  // 오버레이 URL 생성
  const overlayUrl = useMemo(() => {
    if (!overlayHash) return '';

    // API_URL에서 프로토콜과 호스트 추출
    const baseUrl = API_URL.replace('/api', '').replace(':3001', ':5173');
    return `${baseUrl}/overlay/${overlayHash}/${overlayType}`;
  }, [overlayHash, overlayType]);

  // 프로덕션 URL (실제 배포 시 사용)
  const productionUrl = useMemo(() => {
    if (!overlayHash) return '';
    return `${window.location.origin}/overlay/${overlayHash}/${overlayType}`;
  }, [overlayHash, overlayType]);

  // URL 복사
  const copyUrl = useCallback(async (url) => {
    const targetUrl = url || overlayUrl;

    if (!targetUrl) {
      onCopyError?.(new Error('URL이 없습니다.'));
      return false;
    }

    try {
      await navigator.clipboard.writeText(targetUrl);
      setCopied(true);
      onCopySuccess?.();

      // 일정 시간 후 복사됨 상태 초기화
      setTimeout(() => {
        setCopied(false);
      }, copiedDuration);

      return true;
    } catch (e) {
      console.error('URL 복사 에러:', e);
      onCopyError?.(e);
      return false;
    }
  }, [overlayUrl, onCopySuccess, onCopyError, copiedDuration]);

  // 기본 URL 복사 (overlayUrl 사용)
  const copyOverlayUrl = useCallback(() => {
    return copyUrl(overlayUrl);
  }, [copyUrl, overlayUrl]);

  // 프로덕션 URL 복사
  const copyProductionUrl = useCallback(() => {
    return copyUrl(productionUrl);
  }, [copyUrl, productionUrl]);

  // 새 창에서 오버레이 열기
  const openOverlay = useCallback(() => {
    if (overlayUrl) {
      window.open(overlayUrl, '_blank', 'width=800,height=600');
    }
  }, [overlayUrl]);

  return {
    // 상태
    overlayUrl,
    productionUrl,
    copied,
    hasHash: !!overlayHash,

    // 액션
    copyUrl,
    copyOverlayUrl,
    copyProductionUrl,
    openOverlay
  };
};

export default useOverlayUrl;
