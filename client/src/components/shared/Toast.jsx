import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import './Toast.css';

/**
 * Toast 아이콘 컴포넌트
 */
const ToastIcon = ({ type }) => {
  const iconProps = { size: 20 };

  switch (type) {
    case 'success':
      return <CheckCircle {...iconProps} />;
    case 'error':
      return <XCircle {...iconProps} />;
    case 'warning':
      return <AlertTriangle {...iconProps} />;
    case 'info':
    default:
      return <Info {...iconProps} />;
  }
};

/**
 * 단일 Toast 아이템 컴포넌트
 */
const ToastItem = ({ toast, onRemove }) => {
  return (
    <div className={`toast-item toast-${toast.type}`}>
      <div className="toast-icon">
        <ToastIcon type={toast.type} />
      </div>
      <div className="toast-content">
        <span className="toast-message">{toast.message}</span>
      </div>
      <button
        className="toast-close"
        onClick={() => onRemove(toast.id)}
        aria-label="닫기"
      >
        <X size={16} />
      </button>
    </div>
  );
};

/**
 * Toast 컨테이너 컴포넌트
 * 모든 Toast를 렌더링합니다.
 */
const ToastContainer = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onRemove={removeToast}
        />
      ))}
    </div>
  );
};

export default ToastContainer;
