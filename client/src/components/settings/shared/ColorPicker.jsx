import React, { useState, useRef, useEffect } from 'react';
import { Pipette } from 'lucide-react';

/**
 * 색상 선택기 컴포넌트
 *
 * @param {object} props
 * @param {string} props.value - 현재 색상값 (hex)
 * @param {function} props.onChange - 색상 변경 핸들러
 * @param {string} props.label - 레이블 (선택)
 * @param {boolean} props.showHex - HEX 값 표시 여부
 * @param {string[]} props.presets - 프리셋 색상 배열 (선택)
 * @param {string} props.className - 추가 클래스명
 */
const ColorPicker = ({
  value = '#ffffff',
  onChange,
  label,
  showHex = true,
  presets,
  className = ''
}) => {
  const [showPresets, setShowPresets] = useState(false);
  const containerRef = useRef(null);

  // 외부 클릭 시 프리셋 닫기
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowPresets(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleColorChange = (e) => {
    onChange(e.target.value);
  };

  const handlePresetClick = (color) => {
    onChange(color);
    setShowPresets(false);
  };

  return (
    <div className={`color-picker ${className}`} ref={containerRef}>
      {label && <span className="color-picker-label">{label}</span>}

      <div className="color-picker-controls">
        <div className="color-input-wrapper">
          <input
            type="color"
            value={value}
            onChange={handleColorChange}
            className="color-input"
          />
          <div
            className="color-preview"
            style={{ backgroundColor: value }}
          />
        </div>

        {showHex && (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="color-hex-input"
            maxLength={9}
            placeholder="#ffffff"
          />
        )}

        {presets && presets.length > 0 && (
          <button
            className="color-presets-toggle"
            onClick={() => setShowPresets(!showPresets)}
            title="프리셋 색상"
          >
            <Pipette size={16} />
          </button>
        )}
      </div>

      {showPresets && presets && presets.length > 0 && (
        <div className="color-presets-dropdown">
          {presets.map((color, index) => (
            <button
              key={index}
              className={`color-preset ${value === color ? 'active' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => handlePresetClick(color)}
              title={color}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ColorPicker;
