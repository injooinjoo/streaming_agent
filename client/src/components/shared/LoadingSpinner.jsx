import './LoadingSpinner.css';

/**
 * 통일된 로딩 스피너 컴포넌트
 * 모든 로딩 상태에서 일관된 UI를 제공합니다.
 */
const LoadingSpinner = ({
  text = '불러오는 중...',
  size = 'medium',  // 'small' | 'medium' | 'large'
  showText = true,
  fullHeight = false,
  className = ''
}) => {
  const sizeClass = `loading-spinner--${size}`;
  const containerClass = `loading-spinner-container ${sizeClass} ${fullHeight ? 'loading-spinner--full-height' : ''} ${className}`;

  return (
    <div className={containerClass}>
      <div className="loading-spinner">
        <div className="loading-spinner__circle"></div>
        <div className="loading-spinner__circle loading-spinner__circle--delayed"></div>
      </div>
      {showText && <span className="loading-spinner__text">{text}</span>}
    </div>
  );
};

export default LoadingSpinner;
