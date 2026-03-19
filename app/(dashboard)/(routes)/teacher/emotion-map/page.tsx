'use client';

import dynamic from 'next/dynamic';

const EmotionMapContent = dynamic(() => import('./_EmotionMapContent'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Đang tải Bản đồ cảm xúc...</p>
      </div>
    </div>
  ),
});

export default function EmotionMapPage() {
  return <EmotionMapContent />;
}
