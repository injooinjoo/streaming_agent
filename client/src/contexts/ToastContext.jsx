import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

const ToastContext = createContext(null);

/**
 * Toast 타입
 * @typedef {'success' | 'error' | 'warning' | 'info'} ToastType
 */

/**
 * Toast 아이템
 * @typedef {Object} ToastItem
 * @property {string} id - 고유 ID
 * @property {string} message - 메시지
 * @property {ToastType} type - 타입
 * @property {number} duration - 표시 시간 (ms)
 */

/**
 * Toast Provider 컴포넌트
 * 앱 전체에서 Toast 알림을 관리합니다.
 */
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  // Toast 제거
  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // Toast 추가
  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const newToast = {
      id,
      message,
      type,
      duration
    };

    setToasts(prev => [...prev, newToast]);

    // 자동 제거
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, [removeToast]);

  // 편의 메서드들
  const showSuccess = useCallback((message, duration) => {
    return addToast(message, 'success', duration);
  }, [addToast]);

  const showError = useCallback((message, duration) => {
    return addToast(message, 'error', duration || 5000); // 에러는 더 오래 표시
  }, [addToast]);

  const showWarning = useCallback((message, duration) => {
    return addToast(message, 'warning', duration);
  }, [addToast]);

  const showInfo = useCallback((message, duration) => {
    return addToast(message, 'info', duration);
  }, [addToast]);

  // 모든 Toast 제거
  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  const value = useMemo(() => ({
    toasts,
    addToast,
    removeToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    clearAll
  }), [toasts, addToast, removeToast, showSuccess, showError, showWarning, showInfo, clearAll]);

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
};

/**
 * Toast Context 사용을 위한 훅
 * @returns {Object} Toast 상태 및 메서드
 */
export const useToast = () => {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast는 ToastProvider 내에서 사용해야 합니다.');
  }

  return context;
};

export default ToastContext;
