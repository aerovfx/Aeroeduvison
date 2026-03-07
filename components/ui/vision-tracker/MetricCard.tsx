import React from 'react';

interface MetricCardProps {
  value: string | number;
  label: string;
  icon?: string;
  size?: 'small' | 'medium' | 'large';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  value,
  label,
  icon,
  size = 'medium'
}) => {
  const fontSize = size === 'large' ? '4rem' : size === 'medium' ? '3rem' : '2rem';

  return (
    <div className="metric">
      {icon && <div className="title-icon" style={{ marginBottom: '12px' }}>{icon}</div>}
      <div className="metric-value" style={{ fontSize }}>{value}</div>
      <div className="metric-label">{label}</div>
    </div>
  );
};
