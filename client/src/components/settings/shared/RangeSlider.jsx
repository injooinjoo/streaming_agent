import React from 'react';

/**
 * 범위 슬라이더 컴포넌트
 *
 * @param {object} props
 * @param {number} props.value - 현재 값
 * @param {function} props.onChange - 값 변경 핸들러
 * @param {number} props.min - 최소값
 * @param {number} props.max - 최대값
 * @param {number} props.step - 스텝
 * @param {string} props.unit - 단위 (예: 'px', '%', 's')
 * @param {boolean} props.showValue - 값 표시 여부
 * @param {function} props.formatValue - 값 포맷 함수
 * @param {string} props.className - 추가 클래스명
 */
const RangeSlider = ({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  showValue = true,
  formatValue,
  className = ''
}) => {
  const displayValue = formatValue
    ? formatValue(value)
    : `${value}${unit}`;

  // 진행률 계산
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className={`range-slider ${className}`}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${percentage}%, rgba(255,255,255,0.1) ${percentage}%, rgba(255,255,255,0.1) 100%)`
        }}
      />
      {showValue && (
        <span className="range-value">{displayValue}</span>
      )}
    </div>
  );
};

export default RangeSlider;
