'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcherCompact } from '@/components/ui/language-switcher';
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
  X,
  Microscope,
  FlaskConical,
  Atom,
  Calculator,
  Camera,
  Eye,
  MapPin,
  Activity,
  Heart,
  Map,
  FileText,
  Video,
  Kanban
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const { t } = useLanguage();

  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <>
      <style jsx>{`
        @keyframes gradient-x {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        
        .animate-gradient-x {
          animation: gradient-x 4s ease infinite;
        }
      `}</style>
      <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 w-full bg-white/95 backdrop-blur-sm border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 flex items-center justify-center">
                  <Brain className="w-6 h-6 text-gray-700" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-red-400 via-teal-400 to-green-400 bg-[length:300%_300%] animate-gradient-x bg-clip-text text-transparent">
                  AeroEdu
                </span>
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
              <LanguageSwitcherCompact />
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
                <div className="flex justify-center mb-2">
                  <LanguageSwitcherCompact />
                </div>
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
              <p className="text-sm text-gray-500 mt-4">
                Bằng cách đăng ký, bạn đồng ý với{' '}
                <a href="/terms" className="text-purple-600 hover:underline">Điều khoản sử dụng</a>
                {' '}và{' '}
                <a href="/privacy" className="text-purple-600 hover:underline">Chính sách bảo mật</a>
                {' '}của chúng tôi.
              </p>
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
                        <p className="text-sm text-gray-600 mb-2">Học sinh: "Giải thích về đạo hàm trong toán học"</p>
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
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-8 border border-blue-100 hover:shadow-lg transition-all duration-300">
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
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 border border-purple-100 hover:shadow-lg transition-all duration-300">
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
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 border border-green-100 hover:shadow-lg transition-all duration-300">
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

            {/* STEM */}
            <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-8 border border-orange-100 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center mb-6">
                <Atom className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">STEM</h3>
              <p className="text-gray-600 mb-6">Hệ thống học tập tích hợp Science, Technology, Engineering & Mathematics</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Dự án thực hành
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Mô phỏng 3D
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Thí nghiệm ảo
                </li>
              </ul>
            </div>

            {/* LabTwin */}
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-8 border border-indigo-100 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mb-6">
                <Microscope className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">LabTwin</h3>
              <p className="text-gray-600 mb-6">Phòng thí nghiệm ảo với các mô phỏng vật lý, hóa học và sinh học</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Thí nghiệm tương tác
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Mô phỏng vật lý
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Dữ liệu thời gian thực
                </li>
              </ul>
            </div>

            {/* Vision Tracker */}
            <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl p-8 border border-teal-100 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center mb-6">
                <Camera className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{t('vision.title')}</h3>
              <p className="text-gray-600 mb-6">Theo dõi ánh mắt và chuyển động để phân tích mức độ tập trung</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  AI Attention Monitoring
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Gaze Tracking
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Focus Analysis
                </li>
              </ul>
            </div>

            {/* Heart Map */}
            <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl p-8 border border-pink-100 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 bg-pink-600 rounded-xl flex items-center justify-center mb-6">
                <Heart className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{t('emotion.heart-map')}</h3>
              <p className="text-gray-600 mb-6">Sơ đồ chỗ ngồi thông minh với heatmap cảm xúc và tiến độ học tập</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Heatmap Visualization
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Emotion Tracking
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Progress Mapping
                </li>
              </ul>
            </div>

            {/* AeroEdu Vision */}
            <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl p-8 border border-violet-100 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 bg-violet-600 rounded-xl flex items-center justify-center mb-6">
                <Eye className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">AeroEdu Vision</h3>
              <p className="text-gray-600 mb-6">AI chấm bài thông minh - Ứng dụng chấm bài thi tự luận tự động với AI và OCR tiên tiến</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  AI Smart Grading
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Handwriting Recognition
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  94% Accuracy Rate
                </li>
              </ul>
            </div>

            {/* Smart Classroom */}
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-8 border border-emerald-100 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center mb-6">
                <MapPin className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Smart Classroom</h3>
              <p className="text-gray-600 mb-6">Lớp học thông minh với quản lý học sinh và theo dõi hoạt động</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Student Management
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Activity Tracking
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Real-time Analytics
                </li>
              </ul>
            </div>

            {/* Quản lý dự án */}
            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-8 border border-amber-100 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 bg-amber-600 rounded-xl flex items-center justify-center mb-6">
                <Kanban className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Quản lý dự án</h3>
              <p className="text-gray-600 mb-6">Hệ thống quản lý dự án và công việc theo phương pháp Agile với Scrum Board</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Scrum Board
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Sprint Planning
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Task Management
                </li>
              </ul>
            </div>

            {/* Motion Tracking */}
            <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl p-8 border border-slate-100 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 bg-slate-600 rounded-xl flex items-center justify-center mb-6">
                <Video className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Motion Tracking</h3>
              <p className="text-gray-600 mb-6">Ứng dụng phân tích chuyển động qua video và cho ra kết quả loại chuyển động, đồ thị và số liệu</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Video Analysis
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Motion Classification
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Data Visualization
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

      {/* AeroEdu Vision App Section */}
      <section className="py-20 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full mb-6">
              <Sparkles className="h-5 w-5 text-purple-600 mr-2" />
              <span className="text-sm font-semibold text-purple-900">Ứng dụng AI mới nhất</span>
            </div>
            
            {/* AeroEdu Vision Logo */}
            <div className="flex justify-center mb-8">
              <div className="w-24 h-24 rounded-full bg-gradient-to-r from-purple-600 to-pink-500 flex items-center justify-center shadow-2xl">
                <svg width="60" height="60" viewBox="0 0 60 60" className="text-white">
                  {/* Organic shape outline */}
                  <path d="M15 10 C10 15, 10 25, 15 30 C20 35, 40 35, 45 30 C50 25, 50 15, 45 10 C40 5, 20 5, 15 10 Z" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"/>
                  
                  {/* Central vertical line */}
                  <line x1="30" y1="12" x2="30" y2="48" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round"/>
                  
                  {/* Left half diagonal lines */}
                  <line x1="30" y1="20" x2="22" y2="16" 
                        stroke="currentColor" 
                        strokeWidth="1.5" 
                        strokeLinecap="round"/>
                  <line x1="30" y1="25" x2="22" y2="21" 
                        stroke="currentColor" 
                        strokeWidth="1.5" 
                        strokeLinecap="round"/>
                  
                  {/* Right half diagonal lines */}
                  <line x1="30" y1="20" x2="38" y2="24" 
                        stroke="currentColor" 
                        strokeWidth="1.5" 
                        strokeLinecap="round"/>
                  <line x1="30" y1="25" x2="38" y2="29" 
                        stroke="currentColor" 
                        strokeWidth="1.5" 
                        strokeLinecap="round"/>
                </svg>
              </div>
            </div>
            
            <h2 className="text-5xl font-bold text-gray-900 mb-6">
              AeroEdu Vision
              <span className="block text-3xl text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
                AI Chấm Bài Thông Minh
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              AeroEdu Vision - AI chấm bài thông minh với độ chính xác 94%. 
              Chấm điểm tự động, nhận dạng chữ viết tay, và phản hồi chi tiết cho từng học sinh.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left - Enhanced Info */}
            <div>
              {/* Key Features */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white rounded-xl p-6 shadow-lg border border-purple-100">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center mb-4">
                    <Brain className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">AI Thông Minh</h3>
                  <p className="text-gray-600 text-sm">Phân tích nội dung và chấm điểm chính xác đến 95%</p>
                </div>
                
                <div className="bg-white rounded-xl p-6 shadow-lg border border-blue-100">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center mb-4">
                    <MessageSquare className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">OCR Tiên Tiến</h3>
                  <p className="text-gray-600 text-sm">Nhận dạng chữ viết tay tiếng Việt với độ chính xác cao</p>
                </div>
                
                <div className="bg-white rounded-xl p-6 shadow-lg border border-green-100">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center mb-4">
                    <Zap className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">Tốc Độ Cao</h3>
                  <p className="text-gray-600 text-sm">Chấm hàng trăm bài trong vài phút</p>
                </div>
                
                <div className="bg-white rounded-xl p-6 shadow-lg border border-orange-100">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl flex items-center justify-center mb-4">
                    <Target className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">Phản Hồi Chi Tiết</h3>
                  <p className="text-gray-600 text-sm">Gợi ý cải thiện và giải thích cho từng câu trả lời</p>
                </div>
              </div>
              
              {/* Detailed Features List */}
              <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100 mb-8">
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                  <Star className="h-6 w-6 text-yellow-500 mr-2" />
                  Tính năng nổi bật
                </h3>
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <CheckCircle className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-900">Chấm điểm đa tiêu chí</p>
                      <p className="text-gray-600 text-sm">Đánh giá nội dung, cấu trúc, ngữ pháp và logic</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-900">Nhận dạng chữ viết tay</p>
                      <p className="text-gray-600 text-sm">OCR tiên tiến cho chữ viết tay tiếng Việt</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-900">Báo cáo chi tiết</p>
                      <p className="text-gray-600 text-sm">Thống kê điểm số, xu hướng và gợi ý cải thiện</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-900">Tích hợp dễ dàng</p>
                      <p className="text-gray-600 text-sm">API mở cho các hệ thống LMS hiện có</p>
                    </div>
                  </li>
                </ul>
              </div>
              
              {/* App Statistics */}
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-6 text-white mb-8">
                <h3 className="text-lg font-bold mb-4 flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Thống kê ứng dụng
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">24</div>
                    <div className="text-sm opacity-90">Bài đã chấm</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">3</div>
                    <div className="text-sm opacity-90">Đang xử lý</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-pink-600">94%</div>
                    <div className="text-sm opacity-90">Độ chính xác</div>
                  </div>
                </div>
              </div>
              
              {/* Download Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <a 
                  href="https://apps.apple.com/app/aeroedu-vision" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center bg-black text-white px-8 py-4 rounded-xl font-semibold hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl"
                >
                  <svg className="h-8 w-8 mr-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                  <div className="text-left">
                    <div className="text-xs">Tải về trên</div>
                    <div className="text-lg font-bold">App Store</div>
                  </div>
                </a>
                
                <div className="flex items-center bg-gray-300 text-gray-500 px-8 py-4 rounded-xl font-semibold cursor-not-allowed shadow-lg">
                  <svg className="h-8 w-8 mr-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                  </svg>
                  <div className="text-left">
                    <div className="text-xs">Sắp có trên</div>
                    <div className="text-lg font-bold">Google Play</div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">🍎 iOS:</span> Yêu cầu iOS 15.0 trở lên • Miễn phí tải về<br/>
                  <span className="font-semibold">🤖 Android:</span> Đang phát triển, sẽ cập nhật trong thời gian sớm nhất<br/>
                  <span className="font-semibold">💻 Web:</span> Truy cập ngay tại <a href="/dashboard/llm-grading" className="underline">AeroEdu Dashboard</a>
                </p>
              </div>
            </div>
            
            {/* Right - Enhanced App Preview */}
            <div className="relative">
              {/* Main App Mockup */}
              <div className="bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-600 rounded-3xl p-8 shadow-2xl">
                <div className="bg-white rounded-2xl p-6 shadow-xl">
                  {/* iPhone Mockup */}
                  <div className="aspect-[9/19.5] bg-black rounded-3xl p-2 mx-auto max-w-xs">
                    <div className="bg-white rounded-2xl h-full flex flex-col">
                      {/* Status bar */}
                      <div className="h-8 bg-white rounded-t-2xl flex items-center justify-between px-4">
                        <span className="text-xs font-semibold text-gray-900">9:41</span>
                        <div className="flex items-center space-x-1">
                          <div className="w-4 h-2 bg-gray-900 rounded-sm"></div>
                          <div className="w-1 h-1 bg-gray-900 rounded-full"></div>
                        </div>
                      </div>
                      
                      {/* App content */}
                      <div className="flex-1 bg-gradient-to-br from-purple-50 to-blue-50 p-4">
                        {/* Header */}
                        <div className="text-center mb-4">
                          <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl mx-auto mb-3 flex items-center justify-center">
                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </div>
                          <h3 className="font-bold text-gray-900 text-sm">AeroEdu Vision</h3>
                          <p className="text-xs text-gray-600">AI Grading Assistant</p>
                        </div>
                        
                        {/* Stats Cards */}
                        <div className="space-y-2 mb-4">
                          <div className="bg-white rounded-lg p-3 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-semibold text-gray-700">Bài thi Toán</span>
                              <span className="text-xs text-green-600 font-bold">8.5/10</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div className="bg-green-500 h-1.5 rounded-full" style={{width: '85%'}}></div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Nội dung tốt, cần cải thiện trình bày</p>
                          </div>
                          
                          <div className="bg-white rounded-lg p-3 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-semibold text-gray-700">Bài thi Văn</span>
                              <span className="text-xs text-blue-600 font-bold">7.0/10</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div className="bg-blue-500 h-1.5 rounded-full" style={{width: '70%'}}></div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Ý tưởng hay, cần mở rộng thêm</p>
                          </div>
                          
                          <div className="bg-white rounded-lg p-3 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-semibold text-gray-700">Bài thi Lý</span>
                              <span className="text-xs text-purple-600 font-bold">9.2/10</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div className="bg-purple-500 h-1.5 rounded-full" style={{width: '92%'}}></div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Xuất sắc! Giải thích rõ ràng</p>
                          </div>
                        </div>
                        
                        {/* Action Button */}
                        <button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-2 rounded-lg text-sm font-semibold shadow-lg">
                          📸 Chấm bài mới
                        </button>
                      </div>
                      
                      {/* Home indicator */}
                      <div className="h-6 bg-white rounded-b-2xl flex items-center justify-center">
                        <div className="w-20 h-1 bg-gray-800 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Enhanced Floating badges */}
                <div className="absolute -top-6 -left-6 bg-white rounded-2xl p-4 shadow-xl border border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                      <Star className="h-6 w-6 text-yellow-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-medium">App Store Rating</p>
                      <p className="font-bold text-gray-900 text-lg">4.8/5</p>
                      <p className="text-xs text-gray-500">2,847 reviews</p>
                    </div>
                  </div>
                </div>
                
                <div className="absolute -bottom-6 -right-6 bg-white rounded-2xl p-4 shadow-xl border border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                      <Users className="h-6 w-6 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-medium">Downloads</p>
                      <p className="font-bold text-gray-900 text-lg">10K+</p>
                      <p className="text-xs text-gray-500">This month</p>
                    </div>
                  </div>
                </div>
                
                <div className="absolute top-1/2 -left-8 bg-white rounded-xl p-3 shadow-lg border border-gray-100">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Accuracy</p>
                      <p className="font-bold text-gray-900">95%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Được tin tưởng bởi giáo viên và học sinh
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Hàng nghìn giáo viên đã sử dụng AeroEdu Vision để tiết kiệm thời gian và nâng cao chất lượng chấm bài
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8 border border-blue-100">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">NT</span>
                </div>
                <div className="ml-4">
                  <h4 className="font-semibold text-gray-900">Nguyễn Thị Lan</h4>
                  <p className="text-sm text-gray-600">Giáo viên Toán - THPT Nguyễn Du</p>
                </div>
              </div>
              <p className="text-gray-700 mb-4">
                "AeroEdu Vision đã giúp tôi tiết kiệm 80% thời gian chấm bài. 
                Độ chính xác cao và phản hồi chi tiết giúp học sinh hiểu rõ điểm mạnh, điểm yếu."
              </p>
              <div className="flex items-center">
                <Star className="h-5 w-5 text-yellow-500" />
                <Star className="h-5 w-5 text-yellow-500" />
                <Star className="h-5 w-5 text-yellow-500" />
                <Star className="h-5 w-5 text-yellow-500" />
                <Star className="h-5 w-5 text-yellow-500" />
                <span className="ml-2 text-sm text-gray-600">5.0</span>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 border border-green-100">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">PT</span>
                </div>
                <div className="ml-4">
                  <h4 className="font-semibold text-gray-900">Phạm Văn Tuấn</h4>
                  <p className="text-sm text-gray-600">Giáo viên Văn - THCS Lê Lợi</p>
                </div>
              </div>
              <p className="text-gray-700 mb-4">
                "OCR nhận dạng chữ viết tay của học sinh rất tốt. 
                Tôi có thể chấm bài ngay trên điện thoại, rất tiện lợi khi đi công tác."
              </p>
              <div className="flex items-center">
                <Star className="h-5 w-5 text-yellow-500" />
                <Star className="h-5 w-5 text-yellow-500" />
                <Star className="h-5 w-5 text-yellow-500" />
                <Star className="h-5 w-5 text-yellow-500" />
                <Star className="h-5 w-5 text-yellow-500" />
                <span className="ml-2 text-sm text-gray-600">5.0</span>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 border border-purple-100">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">LH</span>
                </div>
                <div className="ml-4">
                  <h4 className="font-semibold text-gray-900">Lê Thị Hoa</h4>
                  <p className="text-sm text-gray-600">Hiệu trưởng - THPT Trần Phú</p>
                </div>
              </div>
              <p className="text-gray-700 mb-4">
                "Toàn bộ giáo viên trong trường đều sử dụng AeroEdu Vision. 
                Chất lượng giáo dục được nâng cao đáng kể nhờ phản hồi kịp thời."
              </p>
              <div className="flex items-center">
                <Star className="h-5 w-5 text-yellow-500" />
                <Star className="h-5 w-5 text-yellow-500" />
                <Star className="h-5 w-5 text-yellow-500" />
                <Star className="h-5 w-5 text-yellow-500" />
                <Star className="h-5 w-5 text-yellow-500" />
                <span className="ml-2 text-sm text-gray-600">5.0</span>
              </div>
            </div>
          </div>

          {/* Use Cases */}
          <div className="mt-20">
            <h3 className="text-3xl font-bold text-gray-900 text-center mb-12">
              Ứng dụng trong thực tế
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="h-8 w-8 text-white" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Chấm bài tập về nhà</h4>
                <p className="text-gray-600 text-sm">Chấm nhanh hàng trăm bài tập hàng ngày</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-green-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Award className="h-8 w-8 text-white" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Kiểm tra định kỳ</h4>
                <p className="text-gray-600 text-sm">Đánh giá chính xác bài thi giữa kỳ, cuối kỳ</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Lớp học đông</h4>
                <p className="text-gray-600 text-sm">Xử lý hiệu quả lớp học 40-50 học sinh</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-600 to-orange-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="h-8 w-8 text-white" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Báo cáo tiến độ</h4>
                <p className="text-gray-600 text-sm">Theo dõi và phân tích xu hướng học tập</p>
              </div>
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
          <p className="text-sm text-gray-400 mt-6">
            Bằng cách đăng ký, bạn đồng ý với{' '}
            <a href="/terms" className="text-white hover:underline">Điều khoản sử dụng</a>
            {' '}và{' '}
            <a href="/privacy" className="text-white hover:underline">Chính sách bảo mật</a>
            {' '}của chúng tôi.
          </p>
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
              <a href="/terms" className="text-sm text-gray-600 hover:text-gray-900">Điều khoản</a>
              <a href="/privacy" className="text-sm text-gray-600 hover:text-gray-900">Bảo mật</a>
              <a href="/cookies" className="text-sm text-gray-600 hover:text-gray-900">Cookie</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}