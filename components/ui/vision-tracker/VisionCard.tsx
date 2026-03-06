import React from 'react';

interface VisionCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const VisionCard: React.FC<VisionCardProps> = ({
  children,
  className = '',
  onClick
}) => {
  return (
    <div
      className={`vision-card ${className}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {children}
    </div>
  );
};
