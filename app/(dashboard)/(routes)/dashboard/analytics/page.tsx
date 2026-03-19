'use client';

import dynamic from 'next/dynamic';

const AnalyticsContent = dynamic(() => import('./_AnalyticsContent'), {
  ssr: false,
  loading: () => (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-white/10 border-t-[hsl(245,85%,65%)] rounded-full animate-spin mx-auto mb-3" />
        <p className="text-white/30 text-xs font-medium">Đang tải Analytics...</p>
      </div>
    </div>
  ),
});

export default function AnalyticsPage() {
  return <AnalyticsContent />;
}
