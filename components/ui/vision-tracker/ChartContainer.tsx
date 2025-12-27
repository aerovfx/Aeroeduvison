import React from 'react';

interface ChartContainerProps {
  children: React.ReactNode;
  minHeight?: number;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({
  children,
  minHeight = 180
}) => {
  return (
    <div className="chart-container" style={{ minHeight: `${minHeight}px` }}>
      {children}
    </div>
  );
};
