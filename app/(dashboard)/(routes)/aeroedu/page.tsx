'use client';

import { useState, useEffect } from 'react';
import { 
  Brain, 
  Sparkles, 
  TrendingUp, 
  Users, 
  BookOpen, 
  Award, 
  ArrowRight,
  Play,
  CheckCircle,
  Star,
  Globe,
  Zap,
  Target,
  BarChart3,
  MessageSquare,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AeroEduHomePage() {
  const { t } = useLanguage();
  
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 w-full bg-white/95 backdrop-blur-sm border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900">AeroEdu</span>
              
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#products" className="text-gray-600 hover:text-gray-900 font-medium">Sản phẩm</a>
              <a href="#solutions" className="text-gray-600 hover:text-gray-900 font-medium">Giải pháp</a>
              <a href="#developers" className="text-gray-600 hover:text-gray-900 font-medium">Developers</a>
              <a href="#resources" className="text-gray-600 hover:text-gray-900 font-medium">Tài nguyên</a>
              <a href="/pricing" className="text-gray-600 hover:text-gray-900 font-medium">Giá cả</a>
            </nav>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center space-x-4">
              <button 
                onClick={() => router.push('/auth/login')}
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Đăng nhập
              </button>
              <button 
                onClick={() => router.push('/auth/signup')}
                className="bg-black text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-800 transition-colors"
              >
                Bắt đầu
              </button>
              <button 
                onClick={() => router.push('/contact-sales')}
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Liên hệ sales
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100">
            <div className="px-4 py-4 space-y-4">
              <a href="#products" className="block text-gray-600 hover:text-gray-900 font-medium">Sản phẩm</a>
              <a href="#solutions" className="block text-gray-600 hover:text-gray-900 font-medium">Giải pháp</a>
              <a href="#developers" className="block text-gray-600 hover:text-gray-900 font-medium">Developers</a>
              <a href="#resources" className="block text-gray-600 hover:text-gray-900 font-medium">Tài nguyên</a>
              <a href="/pricing" className="block text-gray-600 hover:text-gray-900 font-medium">Giá cả</a>
              <div className="pt-4 border-t border-gray-100 space-y-2">
                <button 
                  onClick={() => router.push('/auth/login')}
                  className="block w-full text-left text-gray-600 hover:text-gray-900 font-medium"
                >
                  Đăng nhập
                </button>
                <button 
                  onClick={() => router.push('/auth/signup')}
                  className="block w-full bg-black text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-800 transition-colors"
                >
                  Bắt đầu
                </button>
                <button 
                  onClick={() => router.push('/contact-sales')}
                  className="block w-full text-left text-gray-600 hover:text-gray-900 font-medium"
                >
                  Liên hệ sales
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="pt-24 pb-16 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Hero Content */}
            <div className="space-y-8">
              {/* Badge */}
              <div className="inline-flex items-center px-4 py-2 bg-white rounded-full shadow-sm border border-gray-200">
                <Sparkles className="h-4 w-4 text-purple-600 mr-2" />
                <span className="text-sm font-medium text-gray-700">Hệ thống giáo dục AI tiên tiến</span>
              </div>

              {/* Main Headline */}
              <div className="space-y-4">
                <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                  Hạ tầng AI
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                    giáo dục
                  </span>
                  <br />
                  cho tương lai
                </h1>
                <p className="text-xl text-gray-600 max-w-2xl">
                  Tham gia cùng hàng triệu học sinh và giáo viên sử dụng AeroEdu để học tập thông minh, 
                  tạo nội dung giáo dục tự động, và xây dựng mô hình học tập cá nhân hóa.
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={() => router.push('/auth/signup')}
                  className="bg-black text-white px-8 py-4 rounded-xl font-semibold hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl flex items-center justify-center"
                >
                  Bắt đầu ngay
                  <ArrowRight className="ml-2 h-5 w-5" />
                </button>
                <button 
                  onClick={() => router.push('/contact-sales')}
                  className="border border-gray-300 text-gray-700 px-8 py-4 rounded-xl font-semibold hover:bg-gray-50 transition-all flex items-center justify-center"
                >
                  Liên hệ sales
                  <ArrowRight className="ml-2 h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Right Column - Interactive Demo */}
            <div className="relative">
              <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-200">
                {/* Demo Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                      <Brain className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">AI Tutor</h3>
                      <p className="text-sm text-gray-500">Đang hoạt động</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-500">Live</span>
                  </div>
                </div>

                {/* Demo Content */}
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <MessageSquare className="h-4 w-4 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-600 mb-2">Học sinh: &quot;Giải thích về đạo hàm trong toán học&quot;</p>
                        <div className="bg-white rounded-lg p-3 shadow-sm">
                          <p className="text-sm text-gray-700">
                            Đạo hàm là một khái niệm quan trọng trong giải tích, đo lường tốc độ thay đổi của một hàm số...
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <BarChart3 className="h-5 w-5 text-purple-600" />
                        <span className="font-medium text-gray-900">Tiến độ học tập</span>
                      </div>
                      <span className="text-sm font-semibold text-purple-600">+24%</span>
                    </div>
                    <div className="mt-3 bg-white rounded-lg p-3">
                      <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>Toán học</span>
                        <span>85%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full" style={{width: '85%'}}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Demo Stats */}
                <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">10K+</div>
                    <div className="text-sm text-gray-500">Học sinh</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">500+</div>
                    <div className="text-sm text-gray-500">Giáo viên</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">95%</div>
                    <div className="text-sm text-gray-500">Hài lòng</div>
                  </div>
                </div>
              </div>

              {/* Floating Elements */}
              <div className="absolute -top-4 -right-4 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                <Star className="h-4 w-4 text-white" />
              </div>
              <div className="absolute -bottom-4 -left-4 w-6 h-6 bg-green-400 rounded-full flex items-center justify-center">
                <CheckCircle className="h-3 w-3 text-white" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="products" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Sản phẩm AI giáo dục</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Bộ công cụ hoàn chỉnh để tạo ra trải nghiệm học tập thông minh và cá nhân hóa
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* AI Tutor */}
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-8 border border-blue-100">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-6">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">AI Tutor</h3>
              <p className="text-gray-600 mb-6">Gia sư AI 24/7, trả lời câu hỏi và hướng dẫn học tập cá nhân hóa</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Trò chuyện thông minh
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Giải bài tập tự động
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Theo dõi tiến độ
                </li>
              </ul>
            </div>

            {/* Learning Path */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 border border-purple-100">
              <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center mb-6">
                <Target className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Learning Path</h3>
              <p className="text-gray-600 mb-6">Lộ trình học tập thông minh được AI tạo ra dựa trên năng lực cá nhân</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Tạo lộ trình tự động
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Điều chỉnh độ khó
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Mục tiêu học tập
                </li>
              </ul>
            </div>

            {/* Analytics */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 border border-green-100">
              <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center mb-6">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{t('analytics.title')}</h3>
              <p className="text-gray-600 mb-6">Phân tích sâu về hiệu suất học tập và đưa ra gợi ý cải thiện</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Báo cáo chi tiết
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Dự đoán xu hướng
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Gợi ý tối ưu
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-gray-900 mb-2">10,000+</div>
              <div className="text-gray-600">Học sinh đang học</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-gray-900 mb-2">500+</div>
              <div className="text-gray-600">Giáo viên tin dùng</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-gray-900 mb-2">50+</div>
              <div className="text-gray-600">Trường học</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-gray-900 mb-2">95%</div>
              <div className="text-gray-600">Tỷ lệ hài lòng</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-black">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Sẵn sàng bắt đầu hành trình học tập thông minh?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Tham gia cùng hàng nghìn học sinh và giáo viên đã tin tưởng AeroEdu
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => router.push('/auth/signup')}
              className="bg-white text-black px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-all flex items-center justify-center"
            >
              Bắt đầu miễn phí
              <ArrowRight className="ml-2 h-5 w-5" />
            </button>
            <button 
              onClick={() => router.push('/contact-sales')}
              className="border border-gray-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-gray-800 transition-all flex items-center justify-center"
            >
              Liên hệ sales
              <ArrowRight className="ml-2 h-5 w-5" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900">AeroEdu</span>
              </div>
              <p className="text-gray-600 text-sm">
                Nền tảng giáo dục AI tiên tiến cho tương lai học tập thông minh.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Sản phẩm</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-gray-900">AI Tutor</a></li>
                <li><a href="#" className="hover:text-gray-900">Learning Path</a></li>
                <li><a href="#" className="hover:text-gray-900">{t('analytics.title')}</a></li>
                <li><a href="#" className="hover:text-gray-900">API</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Giải pháp</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-gray-900">Trường học</a></li>
                <li><a href="#" className="hover:text-gray-900">Tổ chức</a></li>
                <li><a href="#" className="hover:text-gray-900">Cá nhân</a></li>
                <li><a href="#" className="hover:text-gray-900">Enterprise</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Hỗ trợ</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-gray-900">Trung tâm trợ giúp</a></li>
                <li><a href="#" className="hover:text-gray-900">Tài liệu</a></li>
                <li><a href="#" className="hover:text-gray-900">Liên hệ</a></li>
                <li><a href="#" className="hover:text-gray-900">Trạng thái hệ thống</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-600">
              © 2025 AeroEdu. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-sm text-gray-600 hover:text-gray-900">Điều khoản</a>
              <a href="#" className="text-sm text-gray-600 hover:text-gray-900">Bảo mật</a>
              <a href="#" className="text-sm text-gray-600 hover:text-gray-900">Cookie</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
