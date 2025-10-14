export default function DashboardPage() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-2xl">🏠</div>
            <h2 className="text-xl font-semibold">Dashboard</h2>
          </div>
          <p className="text-gray-600 mb-4">Trang chủ của hệ thống</p>
          <a href="/dashboard" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
            Truy cập
          </a>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-2xl">🧪</div>
            <h2 className="text-xl font-semibold">LabTwin</h2>
          </div>
          <p className="text-gray-600 mb-4">Phòng thí nghiệm ảo</p>
          <a href="/dashboard/labtwin" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
            Khám phá
          </a>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-2xl">🎓</div>
            <h2 className="text-xl font-semibold">Học tập</h2>
          </div>
          <p className="text-gray-600 mb-4">Các khóa học và bài học</p>
          <a href="/dashboard/learning" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
            Học ngay
          </a>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-2xl">📚</div>
            <h2 className="text-xl font-semibold">Khóa học</h2>
          </div>
          <p className="text-gray-600 mb-4">Danh sách khóa học</p>
          <a href="/dashboard/courses" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
            Xem khóa học
          </a>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-2xl">📝</div>
            <h2 className="text-xl font-semibold">Bài tập</h2>
          </div>
          <p className="text-gray-600 mb-4">Các bài tập và assignment</p>
          <a href="/dashboard/assignments" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
            Làm bài tập
          </a>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-2xl">❓</div>
            <h2 className="text-xl font-semibold">Quiz</h2>
          </div>
          <p className="text-gray-600 mb-4">Các bài kiểm tra</p>
          <a href="/dashboard/quizzes" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
            Làm quiz
          </a>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-lg shadow border-2 border-purple-200 hover:shadow-xl transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-2xl">✨</div>
            <h2 className="text-xl font-semibold text-purple-900">AI Content Generator</h2>
          </div>
          <p className="text-purple-700 mb-4">Tạo nội dung học tập với AI</p>
          <a href="/dashboard/ai-content-generator" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-2 rounded-lg inline-block transition-all">
            Generate với AI ✨
          </a>
        </div>
      </div>

      <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-blue-900 mb-2">LabTwin - Phòng thí nghiệm ảo</h2>
        <p className="text-blue-700 mb-4">Khám phá các hiện tượng vật lý thông qua thí nghiệm tương tác</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="text-2xl">⚡</div>
            <div>
              <h3 className="font-medium text-blue-900">Cơ học</h3>
              <p className="text-sm text-blue-700">Chuyển động, lực, năng lượng</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-2xl">🌊</div>
            <div>
              <h3 className="font-medium text-blue-900">Sóng</h3>
              <p className="text-sm text-blue-700">Sóng cơ học, âm thanh</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-2xl">⚛️</div>
            <div>
              <h3 className="font-medium text-blue-900">Điện từ</h3>
              <p className="text-sm text-blue-700">Điện trường, mạch điện</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-2xl">🔬</div>
            <div>
              <h3 className="font-medium text-blue-900">Quang học</h3>
              <p className="text-sm text-blue-700">Khúc xạ, phản xạ</p>
            </div>
          </div>
        </div>
        
        <a href="/dashboard/labtwin" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg inline-block">
          Khám phá LabTwin
        </a>
      </div>
    </div>
  );
}
