import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const TrendIndicator = ({ value, showIcon = true }) => {
  const isPositive = value && value.startsWith('+');
  const isNegative = value && value.startsWith('-');

  const getClass = () => {
    if (isPositive) return 'positive';
    if (isNegative) return 'negative';
    return 'neutral';
  };

  const getIcon = () => {
    if (isPositive) return <TrendingUp size={12} />;
    if (isNegative) return <TrendingDown size={12} />;
    return <Minus size={12} />;
  };

  return (
    <span className={`trend-indicator ${getClass()}`}>
      {showIcon && getIcon()}
      {value}
    </span>
  );
};

export default TrendIndicator;
