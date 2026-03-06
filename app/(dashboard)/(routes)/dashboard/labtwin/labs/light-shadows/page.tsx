'use client';

export default function LightShadowsPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      <div className="text-center p-8 bg-white rounded-xl shadow-2xl border-2 border-purple-200">
        <h1 className="text-4xl font-bold mb-2 text-purple-700">🔦 Bóng ngoài sáng</h1>
        <p className="text-lg text-gray-600 mb-4">Phòng thí nghiệm đang được cập nhật...</p>
        <div className="text-sm text-gray-500">Vui lòng quay lại sau</div>
      </div>
    </div>
  );
}
