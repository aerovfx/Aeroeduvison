'use client';

import { ReactNode } from 'react';

interface VisionThemeWrapperProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showHeader?: boolean;
}

export default function VisionThemeWrapper({
  children,
  title = "Dashboard",
  subtitle = "Hệ thống học tập thông minh",
  showHeader = true
}: VisionThemeWrapperProps) {
  return (
    <>
      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: linear-gradient(135deg, #e0e5ec 0%, #d8dee8 50%, #e0e5ec 100%);
          background-size: 200% 200%;
          animation: gradientShift 15s ease infinite;
          color: #4a5568;
          overflow-x: hidden;
          min-height: 100vh;
        }

        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .vision-container {
          max-width: 1600px;
          margin: 0 auto;
          padding: 20px;
        }

        .vision-header {
          text-align: center;
          margin-bottom: 30px;
          animation: fadeIn 0.8s ease-out;
        }

        .vision-header h1 {
          font-size: 2.5rem;
          font-weight: 700;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 8px;
          letter-spacing: -1px;
        }

        .vision-header p {
          color: #718096;
          font-size: 0.95rem;
          font-weight: 500;
        }

        .vision-bento-grid {
          display: grid;
          grid-template-columns: repeat(12, 1fr);
          gap: 20px;
          animation: fadeIn 1s ease-out 0.2s both;
        }

        .vision-bento-item {
          background: linear-gradient(145deg, #e0e5ec 0%, #d8dee8 100%);
          border-radius: 28px;
          padding: 28px;
          box-shadow:
            14px 14px 28px rgba(163, 177, 198, 0.7),
            -14px -14px 28px rgba(255, 255, 255, 0.95),
            inset 2px 2px 4px rgba(163, 177, 198, 0.1);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: visible;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .vision-bento-item:hover {
          transform: translateY(-6px) scale(1.01);
          box-shadow:
            18px 18px 36px rgba(163, 177, 198, 0.8),
            -18px -18px 36px rgba(255, 255, 255, 1),
            inset 1px 1px 2px rgba(163, 177, 198, 0.1);
        }

        .vision-item-large {
          grid-column: span 8;
          grid-row: span 2;
        }

        .vision-item-medium {
          grid-column: span 4;
          grid-row: span 2;
        }

        .vision-item-small {
          grid-column: span 4;
        }

        .vision-item-wide {
          grid-column: span 6;
        }

        .vision-item-full {
          grid-column: span 12;
        }

        .vision-item-title {
          font-size: 0.85rem;
          font-weight: 700;
          margin-bottom: 16px;
          color: #4a5568;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .vision-title-icon {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 18px;
          box-shadow:
            6px 6px 12px rgba(102, 126, 234, 0.4),
            -4px -4px 8px rgba(255, 255, 255, 0.9),
            inset 2px 2px 4px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
        }

        .vision-title-icon:hover {
          transform: scale(1.1);
          box-shadow:
            8px 8px 16px rgba(102, 126, 234, 0.5),
            -6px -6px 12px rgba(255, 255, 255, 1);
        }

        .vision-card {
          background: linear-gradient(145deg, #e0e5ec 0%, #d8dee8 100%);
          border-radius: 20px;
          padding: 20px;
          box-shadow:
            10px 10px 20px rgba(163, 177, 198, 0.6),
            -10px -10px 20px rgba(255, 255, 255, 0.8),
            inset 1px 1px 2px rgba(163, 177, 198, 0.1);
          transition: all 0.3s ease;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .vision-card:hover {
          transform: translateY(-4px);
          box-shadow:
            12px 12px 24px rgba(163, 177, 198, 0.7),
            -12px -12px 24px rgba(255, 255, 255, 0.9);
        }

        .vision-button {
          background: linear-gradient(145deg, #e0e5ec 0%, #d8dee8 100%);
          border: none;
          border-radius: 16px;
          padding: 14px 28px;
          font-size: 0.9rem;
          font-weight: 600;
          color: #4a5568;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow:
            8px 8px 16px rgba(163, 177, 198, 0.6),
            -8px -8px 16px rgba(255, 255, 255, 0.9),
            inset 1px 1px 2px rgba(163, 177, 198, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .vision-button:hover {
          transform: translateY(-2px);
          box-shadow:
            10px 10px 20px rgba(163, 177, 198, 0.7),
            -10px -10px 20px rgba(255, 255, 255, 1);
        }

        .vision-button:active {
          transform: translateY(0);
          box-shadow:
            inset 6px 6px 12px rgba(163, 177, 198, 0.5),
            inset -6px -6px 12px rgba(255, 255, 255, 0.7);
        }

        .vision-button-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          box-shadow:
            8px 8px 16px rgba(102, 126, 234, 0.4),
            -6px -6px 12px rgba(255, 255, 255, 0.9),
            inset 2px 2px 4px rgba(0, 0, 0, 0.1);
        }

        .vision-button-primary:hover {
          box-shadow:
            10px 10px 20px rgba(102, 126, 234, 0.5),
            -8px -8px 16px rgba(255, 255, 255, 1);
        }

        .vision-input {
          background: linear-gradient(145deg, #e0e5ec 0%, #d8dee8 100%);
          border: none;
          border-radius: 16px;
          padding: 14px 20px;
          font-size: 0.9rem;
          color: #4a5568;
          width: 100%;
          transition: all 0.3s ease;
          box-shadow:
            inset 6px 6px 12px rgba(163, 177, 198, 0.5),
            inset -6px -6px 12px rgba(255, 255, 255, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .vision-input:focus {
          outline: none;
          box-shadow:
            inset 8px 8px 16px rgba(163, 177, 198, 0.6),
            inset -8px -8px 16px rgba(255, 255, 255, 0.8),
            0 0 0 3px rgba(102, 126, 234, 0.2);
        }

        .vision-metric {
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-items: center;
          text-align: center;
        }

        .vision-metric-value {
          font-size: 3rem;
          font-weight: 800;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          line-height: 1;
          filter: drop-shadow(0 2px 6px rgba(102, 126, 234, 0.3));
        }

        .vision-metric-label {
          color: #718096;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          font-weight: 600;
        }

        .vision-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: linear-gradient(145deg, #e0e5ec 0%, #d8dee8 100%);
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
          color: #667eea;
          box-shadow:
            6px 6px 12px rgba(163, 177, 198, 0.5),
            -6px -6px 12px rgba(255, 255, 255, 0.8),
            inset 1px 1px 2px rgba(163, 177, 198, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }

        ::-webkit-scrollbar {
          width: 8px;
        }

        ::-webkit-scrollbar-track {
          background: #e0e5ec;
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #667eea, #764ba2);
          border-radius: 4px;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .vision-bento-grid {
            grid-template-columns: repeat(8, 1fr);
          }

          .vision-item-large {
            grid-column: span 8;
          }

          .vision-item-medium {
            grid-column: span 8;
          }

          .vision-item-small {
            grid-column: span 4;
          }
        }

        @media (max-width: 768px) {
          .vision-bento-grid {
            grid-template-columns: repeat(4, 1fr);
          }

          .vision-item-large,
          .vision-item-medium,
          .vision-item-small,
          .vision-item-wide,
          .vision-item-full {
            grid-column: span 4;
          }

          .vision-header h1 {
            font-size: 2rem;
          }
        }
      `}</style>

      <div className="vision-container">
        {showHeader && (
          <div className="vision-header">
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
        )}
        {children}
      </div>
    </>
  );
}
