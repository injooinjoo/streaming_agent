// API Configuration
// Vite 환경변수 사용: import.meta.env.VITE_API_URL
// 프로덕션에서 빈 값이면 현재 origin 사용 (같은 서버에서 서빙)

import { mockFetch as _mockFetch, USE_MOCK } from '../data/mockApi';
import { SHOULD_USE_MOCK_DATA } from './appMode';

const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) return envUrl;

  // 프로덕션에서 빈 값이면 현재 origin 사용
  if (import.meta.env.PROD) {
    return window.location.origin;
  }

  // 개발 환경 기본값
  return 'http://localhost:3001';
};

export const API_URL = getBaseUrl();

// Mock 모드 여부
export const USE_MOCK_DATA = SHOULD_USE_MOCK_DATA || USE_MOCK;

// Mock fetch 함수 - 목업 모드일 때 목업 데이터 반환, 아니면 원본 fetch 사용
export const mockFetch = _mockFetch;

if (USE_MOCK_DATA && globalThis.fetch !== _mockFetch) {
  globalThis.fetch = _mockFetch;
}

export const getSocketUrl = () => API_URL;

export const getApiUrl = (path) => `${API_URL}${path}`;
