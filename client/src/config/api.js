// API Configuration
// Vite 환경변수 사용: import.meta.env.VITE_API_URL
// 프로덕션에서 빈 값이면 현재 origin 사용 (같은 서버에서 서빙)

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

export const getSocketUrl = () => API_URL;

export const getApiUrl = (path) => `${API_URL}${path}`;
