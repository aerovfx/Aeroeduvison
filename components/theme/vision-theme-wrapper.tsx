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
        .vision-container {
          max-width: 1600px;
          margin: 0 auto;
          padding: 0;
        }

        .vision-header {
          text-align: center;
          margin-bottom: 24px;
          animation: visionFadeIn 0.6s ease-out;
        }

        .vision-header h1 {
          font-size: 1.75rem;
          font-weight: 700;
          background: linear-gradient(135deg, hsl(245 85% 75%) 0%, hsl(175 80% 55%) 50%, hsl(280 75% 70%) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 6px;
          letter-spacing: -0.5px;
        }

        .vision-header p {
          color: rgba(255, 255, 255, 0.4);
          font-size: 0.8125rem;
          font-weight: 450;
        }

        .vision-bento-grid {
          display: grid;
          grid-template-columns: repeat(12, 1fr);
          gap: 16px;
          animation: visionFadeIn 0.8s ease-out 0.15s both;
        }

        .vision-bento-item {
          background: rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 16px;
          padding: 24px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: visible;
        }

        .vision-bento-item:hover {
          transform: translateY(-2px);
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(255, 255, 255, 0.1);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35), 0 0 20px rgba(120, 100, 255, 0.06);
        }

        .vision-item-large { grid-column: span 8; grid-row: span 2; }
        .vision-item-medium { grid-column: span 4; grid-row: span 2; }
        .vision-item-small { grid-column: span 4; }
        .vision-item-wide { grid-column: span 6; }
        .vision-item-full { grid-column: span 12; }

        .vision-item-title {
          font-size: 0.7rem;
          font-weight: 600;
          margin-bottom: 14px;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .vision-title-icon {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, hsl(245 85% 60%) 0%, hsl(280 75% 55%) 100%);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 16px;
          box-shadow: 0 0 16px rgba(120, 100, 255, 0.25);
          transition: all 0.3s ease;
        }

        .vision-title-icon:hover {
          transform: scale(1.08);
          box-shadow: 0 0 24px rgba(120, 100, 255, 0.4);
        }

        .vision-card {
          background: rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-radius: 14px;
          padding: 18px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
          transition: all 0.3s ease;
        }

        .vision-card:hover {
          transform: translateY(-2px);
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(255, 255, 255, 0.1);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3), 0 0 20px rgba(120, 100, 255, 0.06);
        }

        .vision-button {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 12px 24px;
          font-size: 0.8125rem;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.7);
          cursor: pointer;
          transition: all 0.25s ease;
        }

        .vision-button:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.12);
          color: rgba(255, 255, 255, 0.9);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .vision-button:active {
          transform: translateY(0);
        }

        .vision-button-primary {
          background: linear-gradient(135deg, hsl(245 85% 60%) 0%, hsl(280 75% 55%) 100%);
          color: white;
          border: none;
          box-shadow: 0 0 20px rgba(120, 100, 255, 0.2);
        }

        .vision-button-primary:hover {
          box-shadow: 0 0 30px rgba(120, 100, 255, 0.35);
          filter: brightness(1.1);
        }

        .vision-input {
          background: rgba(0, 0, 0, 0.25);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          padding: 12px 18px;
          font-size: 0.8125rem;
          color: rgba(255, 255, 255, 0.85);
          width: 100%;
          transition: all 0.25s ease;
        }

        .vision-input:focus {
          outline: none;
          border-color: rgba(120, 100, 255, 0.4);
          box-shadow: 0 0 15px rgba(120, 100, 255, 0.1), inset 0 0 0 1px rgba(120, 100, 255, 0.15);
        }

        .vision-input::placeholder {
          color: rgba(255, 255, 255, 0.25);
        }

        .vision-metric {
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: center;
          text-align: center;
        }

        .vision-metric-value {
          font-size: 2.5rem;
          font-weight: 800;
          background: linear-gradient(135deg, hsl(245 85% 75%) 0%, hsl(175 80% 55%) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          line-height: 1;
          filter: drop-shadow(0 0 10px rgba(120, 100, 255, 0.2));
        }

        .vision-metric-label {
          color: rgba(255, 255, 255, 0.4);
          font-size: 0.65rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          font-weight: 600;
        }

        .vision-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          background: rgba(255, 255, 255, 0.04);
          border-radius: 20px;
          font-size: 0.7rem;
          font-weight: 600;
          color: hsl(245 85% 75%);
          border: 1px solid rgba(120, 100, 255, 0.15);
          box-shadow: 0 0 10px rgba(120, 100, 255, 0.08);
        }

        @keyframes visionFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }

        /* Dark-theme overrides now handled globally in globals.css */

        /* Responsive */
        @media (max-width: 1024px) {
          .vision-bento-grid { grid-template-columns: repeat(8, 1fr); }
          .vision-item-large { grid-column: span 8; }
          .vision-item-medium { grid-column: span 8; }
          .vision-item-small { grid-column: span 4; }
        }

        @media (max-width: 768px) {
          .vision-bento-grid { grid-template-columns: repeat(4, 1fr); }
          .vision-item-large,
          .vision-item-medium,
          .vision-item-small,
          .vision-item-wide,
          .vision-item-full { grid-column: span 4; }
          .vision-header h1 { font-size: 1.5rem; }
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
