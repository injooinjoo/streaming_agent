import React from 'react';
import { Maximize2 } from 'lucide-react';
import './OverlayPreviewWrapper.css';

const OverlayPreviewWrapper = ({
  title = '오버레이 미리보기',
  children,
  height = 300,
  scale = 0.5,
  showScale = false,
  onScaleChange,
  className = ''
}) => {
  return (
    <div className={`overlay-preview-wrapper glass-premium ${className}`}>
      <div className="preview-header">
        <div className="preview-status-dots">
          <span className="dot red"></span>
          <span className="dot yellow"></span>
          <span className="dot green"></span>
        </div>
        <span className="preview-title">{title}</span>
        <Maximize2 size={14} className="cursor-pointer" style={{ opacity: 0.5 }} />
      </div>

      <div className="preview-viewport" style={{ height }}>
        <div className="checkerboard-bg"></div>
        <div
          className="preview-content-scaled"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'center center'
          }}
        >
          {children}
        </div>
      </div>

      {showScale && (
        <div className="preview-scale-controls">
          <span className="scale-label">크기</span>
          <input
            type="range"
            min="0.3"
            max="1"
            step="0.1"
            value={scale}
            onChange={(e) => onScaleChange?.(parseFloat(e.target.value))}
            className="scale-slider"
          />
          <span className="scale-value">{Math.round(scale * 100)}%</span>
        </div>
      )}
    </div>
  );
};

export default OverlayPreviewWrapper;
