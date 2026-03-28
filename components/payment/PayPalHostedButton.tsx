'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * PayPal Hosted Buttons component.
 *
 * Renders a PayPal hosted button inside a container div.
 * The SDK script is loaded once at the page level (via next/script),
 * and this component calls paypal.HostedButtons().render() when ready.
 *
 * Props:
 *   hostedButtonId — the button ID from PayPal dashboard
 *   planId         — used as key for re-rendering
 */

declare global {
  interface Window {
    paypal?: {
      HostedButtons: (opts: { hostedButtonId: string }) => {
        render: (selector: string | HTMLElement) => Promise<void>;
      };
    };
  }
}

interface PayPalHostedButtonProps {
  hostedButtonId: string;
  planId: string;
}

export default function PayPalHostedButton({ hostedButtonId, planId }: PayPalHostedButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (rendered || !containerRef.current) return;

    const tryRender = () => {
      if (!window.paypal?.HostedButtons) return false;

      try {
        // Clear previous content
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }

        window.paypal
          .HostedButtons({ hostedButtonId })
          .render(containerRef.current!)
          .then(() => setRendered(true))
          .catch((err: Error) => {
            console.error(`[PayPal] Failed to render hosted button for ${planId}:`, err);
            setError(true);
          });
        return true;
      } catch (err) {
        console.error(`[PayPal] Error initializing hosted button for ${planId}:`, err);
        setError(true);
        return true;
      }
    };

    // Try immediately
    if (tryRender()) return;

    // Poll for SDK readiness (loads async)
    const interval = setInterval(() => {
      if (tryRender()) clearInterval(interval);
    }, 300);

    // Give up after 15 seconds
    const timeout = setTimeout(() => {
      clearInterval(interval);
      if (!rendered) {
        console.warn(`[PayPal] SDK not loaded after 15s for ${planId}`);
        setError(true);
      }
    }, 15_000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [hostedButtonId, planId, rendered]);

  // Reset when hostedButtonId changes
  useEffect(() => {
    setRendered(false);
    setError(false);
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }
  }, [hostedButtonId]);

  if (error) {
    return (
      <div className="text-center py-3 text-sm text-red-500">
        Không thể tải nút PayPal. Vui lòng thử lại sau.
      </div>
    );
  }

  return (
    <div>
      <div
        ref={containerRef}
        id={`paypal-hosted-btn-${planId}`}
        className="min-h-[50px] flex items-center justify-center"
      >
        {!rendered && (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-3">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-yellow-500 rounded-full animate-spin" />
            Đang tải PayPal...
          </div>
        )}
      </div>
    </div>
  );
}
