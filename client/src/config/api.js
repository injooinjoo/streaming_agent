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

// #region agent log
if (typeof fetch !== 'undefined') { fetch('http://127.0.0.1:7242/ingest/80c0a9e4-2eba-4c84-9403-d1deac15aad6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.js:getBaseUrl',message:'API_URL resolved',data:{API_URL,PROD:!!import.meta.env.PROD},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{}); }
// #endregion

export const getSocketUrl = () => API_URL;

export const getApiUrl = (path) => `${API_URL}${path}`;
