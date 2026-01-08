import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const AnalyticsCard = ({ title, value, change, trend, icon, subtitle, onClick }) => {
  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp size={14} />;
    if (trend === 'down') return <TrendingDown size={14} />;
    return <Minus size={14} />;
  };

  const getTrendClass = () => {
    if (trend === 'up') return 'positive';
    if (trend === 'down') return 'negative';
    return 'neutral';
  };

  return (
    <div
      className={`analytics-card ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
    >
      <div className="analytics-card-header">
        <span className="analytics-card-title">{title}</span>
        {icon && <div className="analytics-card-icon">{icon}</div>}
      </div>
      <div className="analytics-card-content">
        <span className="analytics-card-value">{value}</span>
        {change && (
          <span className={`analytics-card-change ${getTrendClass()}`}>
            {getTrendIcon()}
            {change}
          </span>
        )}
      </div>
      {subtitle && <span className="analytics-card-subtitle">{subtitle}</span>}
    </div>
  );
};

export default AnalyticsCard;
