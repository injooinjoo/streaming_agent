import React from 'react';

const TimeRangeSelector = ({ value, onChange }) => {
  const options = [
    { value: 'day', label: '일간' },
    { value: 'week', label: '주간' },
    { value: 'month', label: '월간' }
  ];

  return (
    <div className="time-range-selector">
      {options.map((option) => (
        <button
          key={option.value}
          className={`time-range-btn ${value === option.value ? 'active' : ''}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

export default TimeRangeSelector;
