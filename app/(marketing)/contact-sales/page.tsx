'use client';

import { useState } from 'react';
import { Building2, Users, Mail, Phone, MapPin, Send, Check, Brain, Menu, X as CloseIcon, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcherCompact } from '@/components/ui/language-switcher';

export default function ContactSalesPage() {
  const { t } = useLanguage();

  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    organization: '',
    students: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setSubmitted(true);
    setLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="fixed top-0 w-full bg-white/95 backdrop-blur-sm border-b border-gray-100 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <div className="flex items-center space-x-2 cursor-pointer" onClick={() => router.push('/')}>
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                    <Brain className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xl font-bold text-gray-900">AeroEdu</span>
                
              <LanguageSwitcherCompact /></div>
              </div>
            </div>
          </div>
        </header>

        <div className="pt-24 min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Cảm ơn bạn đã liên hệ!</h2>
            <p className="text-gray-600 mb-6">
              Chúng tôi đã nhận được yêu cầu của bạn. Đội ngũ sales sẽ liên hệ với bạn trong vòng 24 giờ làm việc.
            </p>
            <button
              onClick={() => router.push('/pricing')}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all"
            >
              Quay lại trang Pricing
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 w-full bg-white/95 backdrop-blur-sm border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="flex items-center space-x-2 cursor-pointer" onClick={() => router.push('/')}>
                <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900">AeroEdu</span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="/#products" className="text-gray-600 hover:text-gray-900 font-medium">Sản phẩm</Link>
              <Link href="/#solutions" className="text-gray-600 hover:text-gray-900 font-medium">Giải pháp</Link>
              <Link href="/#developers" className="text-gray-600 hover:text-gray-900 font-medium">Developers</Link>
              <Link href="/#resources" className="text-gray-600 hover:text-gray-900 font-medium">Tài nguyên</Link>
              <Link href="/pricing" className="text-gray-600 hover:text-gray-900 font-medium">Giá cả</Link>
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
                className="text-gray-900 font-semibold"
              >
                Liên hệ sales
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2"
            >
              {mobileMenuOpen ? <CloseIcon className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100">
            <div className="px-4 py-4 space-y-4">
              <Link href="/#products" className="block text-gray-600 hover:text-gray-900 font-medium">Sản phẩm</Link>
              <Link href="/#solutions" className="block text-gray-600 hover:text-gray-900 font-medium">Giải pháp</Link>
              <Link href="/#developers" className="block text-gray-600 hover:text-gray-900 font-medium">Developers</Link>
              <Link href="/#resources" className="block text-gray-600 hover:text-gray-900 font-medium">Tài nguyên</Link>
              <Link href="/pricing" className="block text-gray-600 hover:text-gray-900 font-medium">Giá cả</Link>
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
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Content */}
      <div className="pt-24 pb-20 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Left Column - Info */}
            <div>
              <div className="mb-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                  Liên hệ đội ngũ Sales
                </h1>
                <p className="text-xl text-gray-600">
                  Chúng tôi sẵn sàng tư vấn giải pháp phù hợp nhất cho tổ chức giáo dục của bạn
                </p>
              </div>

              {/* Benefits */}
              <div className="bg-white rounded-3xl p-8 shadow-xl mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">Lợi ích khi làm việc với chúng tôi</h3>
                <ul className="space-y-4">
                  {[
                    { icon: Building2, text: 'Giải pháp tùy chỉnh cho tổ chức' },
                    { icon: Users, text: 'Không giới hạn số lượng học sinh' },
                    { icon: Phone, text: 'Hỗ trợ 24/7 với account manager riêng' },
                    { icon: Check, text: 'Đào tạo onboarding miễn phí' },
                    { icon: Check, text: 'Tích hợp với hệ thống hiện có' },
                    { icon: Check, text: 'Báo cáo và analytics chi tiết' },
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg flex-shrink-0">
                        <item.icon className="h-5 w-5 text-purple-600" />
                      </div>
                      <span className="text-gray-700 mt-1">{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Contact Info */}
              <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-3xl p-8 text-white">
                <h3 className="text-xl font-semibold mb-6">Thông tin liên hệ</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-medium">{t('form.email')}</p>
                      <p className="text-purple-100">thegioithu2@gmail.com</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-medium">Hotline</p>
                      <p className="text-purple-100">+84 909 933 936</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-medium">Địa chỉ</p>
                      <p className="text-purple-100">
                        Ấp 1, Đường 329, Hoà Hội, TP. Hồ Chí Minh
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Form */}
            <div className="bg-white rounded-3xl p-8 shadow-xl h-fit">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Gửi yêu cầu tư vấn</h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Họ và tên <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Nguyễn Văn A"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="example@school.edu.vn"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Số điện thoại <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+84 xxx xxx xxx"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tên tổ chức/trường học <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="organization"
                    value={formData.organization}
                    onChange={handleChange}
                    placeholder="Trường THPT XYZ"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Số lượng học sinh dự kiến
                  </label>
                  <select
                    name="students"
                    value={formData.students}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Chọn số lượng</option>
                    <option value="50-100">50-100 học sinh</option>
                    <option value="100-500">100-500 học sinh</option>
                    <option value="500-1000">500-1000 học sinh</option>
                    <option value="1000+">1000+ học sinh</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nội dung yêu cầu
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Mô tả chi tiết nhu cầu của bạn..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Đang gửi...
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5" />
                      Gửi yêu cầu
                    </>
                  )}
                </button>

                <p className="text-xs text-gray-500 text-center">
                  Bằng cách gửi form, bạn đồng ý với{' '}
                  <a href="/privacy" className="text-purple-600 hover:underline">
                    Chính sách bảo mật
                  </a>{' '}
                  của chúng tôi
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>

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

