import React from 'react';

interface BentoCardProps {
  title: string;
  icon: string;
  size?: 'small' | 'medium' | 'large' | 'wide' | 'full';
  children: React.ReactNode;
  badge?: string;
  className?: string;
}

export const BentoCard: React.FC<BentoCardProps> = ({
  title,
  icon,
  size = 'small',
  children,
  badge,
  className = ''
}) => {
  const sizeClass = `item-${size}`;

  return (
    <div className={`bento-item ${sizeClass} ${className}`}>
      <div className="item-title">
        <div className="title-icon">{icon}</div>
        {title}
        {badge && <span className="info-badge">{badge}</span>}
      </div>
      {children}
    </div>
  );
};
