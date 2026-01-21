import React from 'react';
import { Check } from 'lucide-react';

/**
 * 테마 선택 그리드 컴포넌트
 *
 * @param {object} props
 * @param {Array} props.themes - 테마 목록 [{id, label, preview?}]
 * @param {string} props.selectedTheme - 선택된 테마 ID
 * @param {function} props.onSelect - 테마 선택 핸들러
 * @param {string} props.className - 추가 클래스명
 * @param {boolean} props.showLabel - 테마 이름 표시 여부
 */
const ThemeGrid = ({
  themes,
  selectedTheme,
  onSelect,
  className = '',
  showLabel = true
}) => {
  return (
    <div className={`theme-grid ${className}`}>
      {themes.map(theme => (
        <div
          key={theme.id}
          className={`theme-card ${selectedTheme === theme.id ? 'active' : ''}`}
          onClick={() => onSelect(theme.id)}
        >
          <div className="theme-thumb">
            {theme.preview ? (
              <img src={theme.preview} alt={theme.label} className="theme-preview-img" />
            ) : (
              <div className={`theme-thumb-inner theme-${theme.id}`} />
            )}
            {selectedTheme === theme.id && (
              <div className="theme-check">
                <Check size={16} />
              </div>
            )}
          </div>
          {showLabel && (
            <div className="theme-name">{theme.label}</div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ThemeGrid;
