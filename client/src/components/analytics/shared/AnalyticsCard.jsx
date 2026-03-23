import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import SensitiveValue from '../../shared/SensitiveValue';

const AnalyticsCard = ({ title, value, change, trend, icon, subtitle, onClick, sensitiveSubtitle = false }) => {
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
        <SensitiveValue className="analytics-card-value">{value}</SensitiveValue>
        {change && (
          <span className={`analytics-card-change ${getTrendClass()}`}>
            {getTrendIcon()}
            {change}
          </span>
        )}
      </div>
      {subtitle ? (
        sensitiveSubtitle ? (
          <SensitiveValue className="analytics-card-subtitle">{subtitle}</SensitiveValue>
        ) : (
          <span className="analytics-card-subtitle">{subtitle}</span>
        )
      ) : null}
    </div>
  );
};

export default AnalyticsCard;
