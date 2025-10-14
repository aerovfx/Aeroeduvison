export default function LearningPage() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Học tập</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-2xl">📚</div>
            <h2 className="text-xl font-semibold">Toán học</h2>
          </div>
          <p className="text-gray-600 mb-4">Các khóa học toán học cơ bản</p>
          <a href="/learning-paths-demo/toan-hoc" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
            Học ngay
          </a>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-2xl">⚗️</div>
            <h2 className="text-xl font-semibold">Hóa học</h2>
          </div>
          <p className="text-gray-600 mb-4">Các khóa học hóa học</p>
          <a href="/learning-paths-demo/hoa-hoc" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg">
            Học ngay
          </a>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-2xl">⚛️</div>
            <h2 className="text-xl font-semibold">Vật lý</h2>
          </div>
          <p className="text-gray-600 mb-4">Các khóa học vật lý</p>
          <a href="/learning-paths-demo/vat-ly" className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg">
            Học ngay
          </a>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-2xl">🧬</div>
            <h2 className="text-xl font-semibold">Sinh học</h2>
          </div>
          <p className="text-gray-600 mb-4">Các khóa học sinh học</p>
          <a href="/learning-paths-demo/sinh-hoc" className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg">
            Học ngay
          </a>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-2xl">🐍</div>
            <h2 className="text-xl font-semibold">Python</h2>
          </div>
          <p className="text-gray-600 mb-4">Lập trình Python cơ bản</p>
          <a href="/learning-paths-demo/python" className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg">
            Học ngay
          </a>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-2xl">🧪</div>
            <h2 className="text-xl font-semibold">LabTwin</h2>
          </div>
          <p className="text-gray-600 mb-4">Phòng thí nghiệm ảo</p>
          <a href="/dashboard/labtwin" className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg">
            Khám phá
          </a>
        </div>
      </div>

      <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-blue-900 mb-2">Hướng dẫn học tập</h2>
        <p className="text-blue-700 mb-4">Làm thế nào để học hiệu quả</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
            <div>
              <h4 className="font-medium text-blue-900">Chọn môn học</h4>
              <p className="text-sm text-blue-700">Chọn môn học bạn muốn học</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
            <div>
              <h4 className="font-medium text-blue-900">Học từng bài</h4>
              <p className="text-sm text-blue-700">Học từng bài một cách có hệ thống</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
            <div>
              <h4 className="font-medium text-blue-900">Luyện tập</h4>
              <p className="text-sm text-blue-700">Luyện tập và kiểm tra kiến thức</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

