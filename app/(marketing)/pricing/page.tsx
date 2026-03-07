'use client';

import { useState } from 'react';
import { Check, X, Sparkles, Users, Building2, Zap, TrendingUp, FileText, BarChart3, Globe, Shield, Headphones, Brain, ArrowRight, Menu, X as CloseIcon } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcherCompact } from '@/components/ui/language-switcher';

interface PlanFeature {
  text: string;
  included: boolean;
  highlight?: boolean;
}

interface PricingPlan {
  id: string;
  name: string;
  tagline: string;
  icon: any;
  price: {
    monthly: number;
    yearly: number;
  };
  currency: string;
  popular?: boolean;
  features: PlanFeature[];
  cta: string;
  color: string;
  gradient: string;
}

export default function PricingPage() {
  const { t } = useLanguage();

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();

  const plans: PricingPlan[] = [
    {
      id: 'free',
      name: 'Free',
      tagline: 'Khởi đầu hành trình học tập',
      icon: Sparkles,
      price: { monthly: 0, yearly: 0 },
      currency: 'USD',
      color: 'from-blue-500 to-cyan-500',
      gradient: 'bg-gradient-to-br from-blue-50 to-cyan-50',
      features: [
        { text: '3-5 bài học cá nhân hóa với AI', included: true, highlight: true },
        { text: 'AI feedback cơ bản', included: true },
        { text: 'Học với AI Tutor', included: true },
        { text: 'Truy cập thư viện bài tập', included: true },
        { text: 'Dashboard phân tích', included: false },
        { text: 'Không giới hạn bài học', included: false },
        { text: 'Track tiến độ chi tiết', included: false },
        { text: 'Xuất báo cáo PDF', included: false },
      ],
      cta: 'Bắt đầu miễn phí',
    },
    {
      id: 'pro',
      name: 'Pro',
      tagline: 'Cho học sinh nghiêm túc',
      icon: Zap,
      price: { monthly: 7, yearly: 70 },
      currency: 'USD',
      popular: true,
      color: 'from-purple-500 to-pink-500',
      gradient: 'bg-gradient-to-br from-purple-50 to-pink-50',
      features: [
        { text: 'Không giới hạn bài học AI', included: true, highlight: true },
        { text: 'AI sinh quiz tự động', included: true, highlight: true },
        { text: 'Track tiến độ học chi tiết', included: true, highlight: true },
        { text: 'Phân tích điểm mạnh/yếu', included: true },
        { text: 'Dashboard analytics nâng cao', included: true },
        { text: 'Xuất báo cáo PDF', included: true },
        { text: 'AI feedback chi tiết', included: true },
        { text: 'Lộ trình học cá nhân hóa', included: true },
        { text: 'Ưu tiên hỗ trợ', included: true },
        { text: 'Quản lý nhiều học sinh', included: false },
      ],
      cta: 'Nâng cấp Pro',
    },
    {
      id: 'school',
      name: 'Teacher / School',
      tagline: 'Giải pháp cho tổ chức giáo dục',
      icon: Building2,
      price: { monthly: 35, yearly: 350 },
      currency: 'USD',
      color: 'from-emerald-500 to-teal-500',
      gradient: 'bg-gradient-to-br from-emerald-50 to-teal-50',
      features: [
        { text: 'Tất cả tính năng Pro', included: true },
        { text: 'Quản lý không giới hạn học sinh', included: true, highlight: true },
        { text: 'Dashboard & Analytics toàn trường', included: true, highlight: true },
        { text: 'Tạo lộ trình học nhóm', included: true, highlight: true },
        { text: 'API tích hợp LMS', included: true },
        { text: 'Tích hợp Google Classroom', included: true },
        { text: 'Báo cáo chi tiết theo lớp/nhóm', included: true },
        { text: 'White-label branding', included: true },
        { text: 'SSO (Single Sign-On)', included: true },
        { text: 'Account manager riêng', included: true },
      ],
      cta: 'Liên hệ Sales',
    },
  ];

  const handleCTAClick = (planId: string) => {
    if (planId === 'free') {
      if (session) {
        router.push('/dashboard');
      } else {
        router.push('/auth/signup');
      }
    } else if (planId === 'school') {
      router.push('/contact-sales');
    } else {
      router.push(`/checkout?plan=${planId}&cycle=${billingCycle}`);
    }
  };

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
              
              <LanguageSwitcherCompact /></div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="/#products" className="text-gray-600 hover:text-gray-900 font-medium">Sản phẩm</Link>
              <Link href="/#solutions" className="text-gray-600 hover:text-gray-900 font-medium">Giải pháp</Link>
              <Link href="/#developers" className="text-gray-600 hover:text-gray-900 font-medium">Developers</Link>
              <Link href="/#resources" className="text-gray-600 hover:text-gray-900 font-medium">Tài nguyên</Link>
              <Link href="/pricing" className="text-gray-900 font-semibold">Giá cả</Link>
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
              <Link href="/pricing" className="block text-gray-900 font-semibold">Giá cả</Link>
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

      {/* Pricing Content */}
      <div className="pt-24 pb-20 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 bg-white rounded-full shadow-sm border border-gray-200 mb-6">
              <Sparkles className="h-4 w-4 text-purple-600 mr-2" />
              <span className="text-sm font-medium text-gray-700">Giá cả minh bạch, phù hợp mọi nhu cầu</span>
            </div>
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Định giá đơn giản,
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                giá trị vượt trội
              </span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Lựa chọn gói phù hợp với nhu cầu học tập của bạn. Nâng cấp hoặc hạ cấp bất cứ lúc nào.
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center space-x-4">
              <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-gray-900' : 'text-gray-500'}`}>
                Hàng tháng
              </span>
              <button
                onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  billingCycle === 'yearly' ? 'bg-purple-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    billingCycle === 'yearly' ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-sm font-medium ${billingCycle === 'yearly' ? 'text-gray-900' : 'text-gray-500'}`}>
                Hàng năm
              </span>
              {billingCycle === 'yearly' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                  Tiết kiệm 17%
                </span>
              )}
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {plans.map((plan) => {
              const Icon = plan.icon;
              const price = billingCycle === 'monthly' ? plan.price.monthly : plan.price.yearly;
              
              return (
                <div
                  key={plan.id}
                  className={`relative bg-white rounded-3xl shadow-xl border-2 ${
                    plan.popular ? 'border-purple-500 scale-105' : 'border-gray-200'
                  } transition-all hover:shadow-2xl`}
                >
                  {plan.popular && (
                    <div className="absolute -top-5 left-0 right-0 mx-auto w-fit px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-semibold rounded-full shadow-lg">
                      🔥 Phổ biến nhất
                    </div>
                  )}

                  <div className="p-8">
                    {/* Plan Header */}
                    <div className={`w-14 h-14 ${plan.gradient} rounded-2xl flex items-center justify-center mb-6`}>
                      <Icon className={`h-7 w-7 bg-gradient-to-r ${plan.color} bg-clip-text text-transparent`} />
                    </div>
                    
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                    <p className="text-gray-600 mb-6">{plan.tagline}</p>

                    {/* Price */}
                    <div className="mb-8">
                      <div className="flex items-baseline">
                        <span className="text-5xl font-bold text-gray-900">${price}</span>
                        <span className="text-gray-600 ml-2">
                          /{billingCycle === 'monthly' ? 'tháng' : 'năm'}
                        </span>
                      </div>
                      {billingCycle === 'yearly' && price > 0 && (
                        <p className="text-sm text-gray-500 mt-1">
                          ${(price / 12).toFixed(2)}/tháng khi thanh toán hàng năm
                        </p>
                      )}
                    </div>

                    {/* CTA Button */}
                    <button
                      onClick={() => handleCTAClick(plan.id)}
                      className={`w-full py-4 px-6 rounded-xl font-semibold transition-all mb-8 ${
                        plan.popular
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg'
                          : 'bg-gray-900 text-white hover:bg-gray-800'
                      }`}
                    >
                      {plan.cta}
                    </button>

                    {/* Features */}
                    <div className="space-y-4">
                      <p className="text-sm font-semibold text-gray-900 mb-4">Tính năng bao gồm:</p>
                      {plan.features.map((feature, index) => (
                        <div key={index} className="flex items-start">
                          {feature.included ? (
                            <Check className={`h-5 w-5 ${feature.highlight ? 'text-purple-600' : 'text-green-500'} mr-3 flex-shrink-0 mt-0.5`} />
                          ) : (
                            <X className="h-5 w-5 text-gray-300 mr-3 flex-shrink-0 mt-0.5" />
                          )}
                          <span className={`text-sm ${feature.included ? (feature.highlight ? 'text-gray-900 font-semibold' : 'text-gray-700') : 'text-gray-400'}`}>
                            {feature.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Trust Section */}
          <div className="mt-20 text-center">
            <p className="text-gray-600 mb-8">Được tin dùng bởi hơn 10,000+ học sinh và 500+ giáo viên</p>
            <div className="flex justify-center items-center space-x-12 opacity-50">
              <Globe className="h-8 w-8 text-gray-400" />
              <Shield className="h-8 w-8 text-gray-400" />
              <Headphones className="h-8 w-8 text-gray-400" />
              <BarChart3 className="h-8 w-8 text-gray-400" />
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mt-20 max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Câu hỏi thường gặp</h2>
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Tôi có thể nâng cấp hoặc hạ cấp khi nào?</h3>
                <p className="text-gray-600">Bạn có thể thay đổi gói bất cứ lúc nào. Nâng cấp có hiệu lực ngay lập tức, hạ cấp có hiệu lực từ kỳ thanh toán tiếp theo.</p>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Có bản dùng thử miễn phí không?</h3>
                <p className="text-gray-600">Có! Gói Free cho phép bạn trải nghiệm 3-5 bài học với AI hoàn toàn miễn phí, không cần thẻ tín dụng.</p>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Chính sách hoàn tiền như thế nào?</h3>
                <p className="text-gray-600">Chúng tôi cung cấp chính sách hoàn tiền 100% trong vòng 14 ngày nếu bạn không hài lòng với dịch vụ.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

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
