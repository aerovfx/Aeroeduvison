export default function LabTwinStaticPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-3 bg-blue-500 rounded-xl text-white">
              🧪
            </div>
            LabTwin - Phòng thí nghiệm ảo
          </h1>
          <p className="text-gray-600 mt-2">
            Khám phá các hiện tượng vật lý thông qua thí nghiệm tương tác
          </p>
        </div>
        <a href="/learning-paths-demo/labtwin" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
          Xem tất cả thí nghiệm
          <span>→</span>
        </a>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tổng thí nghiệm</p>
              <p className="text-2xl font-bold text-blue-600">6</p>
            </div>
            <div className="text-2xl">🧪</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Đã hoàn thành</p>
              <p className="text-2xl font-bold text-green-600">0</p>
            </div>
            <div className="text-2xl">⭐</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tổng XP</p>
              <p className="text-2xl font-bold text-yellow-600">455</p>
            </div>
            <div className="text-2xl">🏆</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Thời gian học</p>
              <p className="text-2xl font-bold text-purple-600">0 giờ</p>
            </div>
            <div className="text-2xl">⏰</div>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="bg-white rounded-lg shadow border">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Danh mục thí nghiệm</h2>
          <p className="text-gray-600 mt-1">Khám phá các chủ đề vật lý khác nhau</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg border-2 border-gray-200 hover:border-blue-300 transition-colors cursor-pointer">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center text-white">
                  ⚡
                </div>
                <h3 className="font-semibold text-sm">Cơ học</h3>
              </div>
              <p className="text-xs text-gray-600">2 thí nghiệm</p>
            </div>
            <div className="p-4 rounded-lg border-2 border-gray-200 hover:border-blue-300 transition-colors cursor-pointer">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-white">
                  🌊
                </div>
                <h3 className="font-semibold text-sm">Sóng</h3>
              </div>
              <p className="text-xs text-gray-600">1 thí nghiệm</p>
            </div>
            <div className="p-4 rounded-lg border-2 border-gray-200 hover:border-blue-300 transition-colors cursor-pointer">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white">
                  ⚛️
                </div>
                <h3 className="font-semibold text-sm">Điện từ</h3>
              </div>
              <p className="text-xs text-gray-600">2 thí nghiệm</p>
            </div>
            <div className="p-4 rounded-lg border-2 border-gray-200 hover:border-blue-300 transition-colors cursor-pointer">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center text-white">
                  🔬
                </div>
                <h3 className="font-semibold text-sm">Quang học</h3>
              </div>
              <p className="text-xs text-gray-600">1 thí nghiệm</p>
            </div>
          </div>
        </div>
      </div>

      {/* All Experiments */}
      <div className="bg-white rounded-lg shadow border">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Tất cả thí nghiệm</h2>
          <p className="text-gray-600 mt-1">Danh sách đầy đủ các thí nghiệm có sẵn</p>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <span className="text-blue-600">🧪</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">1. Chuyển động thẳng đều</h3>
                  <p className="text-sm text-gray-600">Mô phỏng chuyển động thẳng đều với đồ thị vận tốc</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">Vật lý</span>
                    <span className="text-xs text-gray-500">⏰ 30 phút</span>
                    <span className="text-xs text-yellow-600">⭐ +60 XP</span>
                  </div>
                </div>
              </div>
              <a href="/learning-paths-demo/labtwin/experiment/mechanics-1" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
                ▶️ Bắt đầu
              </a>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <span className="text-blue-600">🧪</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">2. Rơi tự do</h3>
                  <p className="text-sm text-gray-600">Thí nghiệm rơi tự do với gia tốc trọng trường</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">Vật lý</span>
                    <span className="text-xs text-gray-500">⏰ 35 phút</span>
                    <span className="text-xs text-yellow-600">⭐ +70 XP</span>
                  </div>
                </div>
              </div>
              <a href="/learning-paths-demo/labtwin/experiment/mechanics-2" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
                ▶️ Bắt đầu
              </a>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <span className="text-blue-600">🧪</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">3. Sóng cơ học</h3>
                  <p className="text-sm text-gray-600">Mô phỏng sóng dọc và sóng ngang</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">Vật lý</span>
                    <span className="text-xs text-gray-500">⏰ 40 phút</span>
                    <span className="text-xs text-yellow-600">⭐ +80 XP</span>
                  </div>
                </div>
              </div>
              <a href="/learning-paths-demo/labtwin/experiment/waves-1" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
                ▶️ Bắt đầu
              </a>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <span className="text-blue-600">🧪</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">4. Điện trường</h3>
                  <p className="text-sm text-gray-600">Mô phỏng điện trường của các điện tích điểm</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">Vật lý</span>
                    <span className="text-xs text-gray-500">⏰ 50 phút</span>
                    <span className="text-xs text-yellow-600">⭐ +90 XP</span>
                  </div>
                </div>
              </div>
              <a href="/learning-paths-demo/labtwin/experiment/electricity-1" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
                ▶️ Bắt đầu
              </a>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <span className="text-blue-600">🧪</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">5. Mạch điện DC</h3>
                  <p className="text-sm text-gray-600">Thí nghiệm mạch điện một chiều với điện trở</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">Vật lý</span>
                    <span className="text-xs text-gray-500">⏰ 40 phút</span>
                    <span className="text-xs text-yellow-600">⭐ +75 XP</span>
                  </div>
                </div>
              </div>
              <a href="/learning-paths-demo/labtwin/experiment/electricity-2" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
                ▶️ Bắt đầu
              </a>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <span className="text-blue-600">🧪</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">6. Khúc xạ ánh sáng</h3>
                  <p className="text-sm text-gray-600">Thí nghiệm khúc xạ qua lăng kính và thấu kính</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">Vật lý</span>
                    <span className="text-xs text-gray-500">⏰ 45 phút</span>
                    <span className="text-xs text-yellow-600">⭐ +80 XP</span>
                  </div>
                </div>
              </div>
              <a href="/learning-paths-demo/labtwin/experiment/optics-1" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
                ▶️ Bắt đầu
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Start Guide */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-blue-900 mb-2">Hướng dẫn bắt đầu</h2>
        <p className="text-blue-700 mb-4">Làm quen với LabTwin trong vài phút</p>
        
        <div className="space-y-3 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
            <div>
              <h4 className="font-medium text-blue-900">Chọn thí nghiệm</h4>
              <p className="text-sm text-blue-700">Bắt đầu với "Chuyển động thẳng đều" để làm quen</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
            <div>
              <h4 className="font-medium text-blue-900">Điều chỉnh tham số</h4>
              <p className="text-sm text-blue-700">Sử dụng sliders và controls để thay đổi các giá trị</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
            <div>
              <h4 className="font-medium text-blue-900">Quan sát kết quả</h4>
              <p className="text-sm text-blue-700">Xem animation và dữ liệu thu thập được</p>
            </div>
          </div>
        </div>
        
        <a href="/learning-paths-demo/labtwin/experiment/mechanics-1" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 inline-block">
          Bắt đầu thí nghiệm đầu tiên
          <span>→</span>
        </a>
      </div>
    </div>
  );
}




