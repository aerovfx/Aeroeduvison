import React from 'react';

interface VisionButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export const VisionButton: React.FC<VisionButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  className = '',
  type = 'button'
}) => {
  const buttonClass = variant === 'secondary' ? 'vision-button-secondary' : 'vision-button';

  return (
    <button
      type={type}
      className={`${buttonClass} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};
