'use client';

import { useLanguage } from '@/contexts/LanguageContext';

export default function PythonLearnPage() {
  const { t } = useLanguage();

  
  const lessons = [
    { id: "python-10-1", title: "Python cơ bản - Cài đặt và Hello World", description: "Tìm hiểu về Python và viết chương trình đầu tiên", icon: "🐍", difficulty: "Dễ", duration: "30 phút" },
    { id: "python-10-2", title: "Biến và kiểu dữ liệu - String, int, float, bool", description: "Học về các kiểu dữ liệu cơ bản trong Python", icon: "📊", difficulty: "Dễ", duration: "45 phút" },
    { id: "python-10-3", title: "Cấu trúc điều khiển - If, for, while", description: "Làm chủ các cấu trúc điều khiển trong Python", icon: "🔄", difficulty: "Trung bình", duration: "60 phút" },
    { id: "python-10-4", title: "Hàm và module - Định nghĩa và import", description: "Tạo và sử dụng hàm, module trong Python", icon: "⚙️", difficulty: "Trung bình", duration: "50 phút" },
    { id: "python-10-5", title: "Cấu trúc dữ liệu - List, tuple, dict, set", description: "Khám phá các cấu trúc dữ liệu quan trọng", icon: "🗂️", difficulty: "Trung bình", duration: "70 phút" },
    { id: "python-10-6", title: "Xử lý file - Đọc và ghi file", description: "Học cách làm việc với file trong Python", icon: "📁", difficulty: "Trung bình", duration: "40 phút" },
    { id: "python-10-7", title: "Lập trình hướng đối tượng - Class và object", description: "Tìm hiểu OOP trong Python", icon: "🏗️", difficulty: "Khó", duration: "90 phút" },
    { id: "python-10-8", title: "Xử lý lỗi - Try, except, finally", description: "Xử lý ngoại lệ và lỗi trong Python", icon: "⚠️", difficulty: "Trung bình", duration: "50 phút" },
    { id: "python-10-9", title: "Thư viện Python - NumPy và Pandas", description: "Sử dụng các thư viện phổ biến", icon: "📚", difficulty: "Khó", duration: "80 phút" },
    { id: "python-10-10", title: "Dự án thực tế - Web scraping và data analysis", description: "Áp dụng Python vào dự án thực tế", icon: "🚀", difficulty: "Khó", duration: "120 phút" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 flex items-center justify-center gap-3">
            <span className="text-5xl">🐍</span>
            Python Programming
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Khóa học Python từ cơ bản đến nâng cao. Học lập trình Python một cách có hệ thống và thực tế.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {lessons.map((lesson, index) => (
            <div key={lesson.id} className="bg-slate-800 rounded-lg p-6 hover:bg-slate-700 transition-all duration-300 hover:scale-105">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{lesson.icon}</span>
                <div>
                  <h3 className="text-lg font-semibold">{lesson.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-1 rounded text-xs ${
                      lesson.difficulty === 'Dễ' ? 'bg-green-600' :
                      lesson.difficulty === 'Trung bình' ? 'bg-yellow-600' : 'bg-red-600'
                    }`}>
                      {lesson.difficulty}
                    </span>
                    <span className="text-xs text-gray-400">{lesson.duration}</span>
                  </div>
                </div>
              </div>
              
              <p className="text-gray-300 text-sm mb-4">{lesson.description}</p>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Bài {index + 1}/10</span>
                <a 
                  href={`/learning-paths-demo/python/learn/${lesson.id}`}
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Bắt đầu học
                </a>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-slate-800 rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-6 text-center">Tại sao học Python?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-4xl mb-3">🚀</div>
              <h3 className="text-lg font-semibold mb-2">Dễ học</h3>
              <p className="text-gray-300 text-sm">Cú pháp đơn giản, dễ hiểu, phù hợp cho người mới bắt đầu</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-3">💼</div>
              <h3 className="text-lg font-semibold mb-2">Ứng dụng rộng</h3>
              <p className="text-gray-300 text-sm">Web development, data science, AI, automation và nhiều lĩnh vực khác</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-3">💰</div>
              <h3 className="text-lg font-semibold mb-2">Cơ hội nghề nghiệp</h3>
              <p className="text-gray-300 text-sm">Mức lương cao, nhu cầu tuyển dụng lớn trên thế giới</p>
            </div>
          </div>
        </div>

        <div className="text-center mt-8">
          <a 
            href="/learning-paths-demo/python"
            className="bg-gray-600 hover:bg-gray-700 px-6 py-3 rounded-lg font-medium transition-colors"
          >
            ← Quay lại Python Learning Path
          </a>
        </div>
      </div>
    
              </div>
  );
}
