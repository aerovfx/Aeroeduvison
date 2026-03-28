'use client';

import { useState, useRef } from 'react';
import { Check, X, Sparkles, Zap, GraduationCap, Building2, Brain, ArrowRight, Menu, X as CloseIcon, Globe, Shield, Headphones, BarChart3, Bot, FlaskConical, Eye, BookOpen, CreditCard, Landmark } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcherCompact } from '@/components/ui/language-switcher';
import { PRICING_PLANS, type SubscriptionPlan } from '@/lib/ai-permissions';
import PayPalHostedButton from '@/components/payment/PayPalHostedButton';
import { PAYPAL_CLIENT_ID, getHostedButtonId } from '@/lib/paypal-buttons';

function formatVND(amount: number) {
  if (amount === 0) return '0đ';
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
}

function formatUSD(amount: number) {
  if (amount === 0) return '$0';
  return '$' + amount.toFixed(2);
}

// PayPal USD prices
const PAYPAL_PRICES: Record<string, { monthly: number; yearly: number }> = {
  FREE: { monthly: 0, yearly: 0 },
  STUDENT_PRO: { monthly: 1.99, yearly: 19.90 },
  TEACHER_PRO: { monthly: 7.99, yearly: 79.90 },
  SCHOOL: { monthly: 119.99, yearly: 1199.90 },
};

const PLAN_ICONS: Record<SubscriptionPlan, any> = {
  FREE: Sparkles,
  STUDENT_PRO: Zap,
  TEACHER_PRO: GraduationCap,
  SCHOOL: Building2,
};

const PLAN_COLORS: Record<SubscriptionPlan, { border: string; gradient: string; badge: string; button: string }> = {
  FREE: {
    border: 'border-gray-200',
    gradient: 'bg-gradient-to-br from-blue-50 to-cyan-50',
    badge: '',
    button: 'bg-gray-900 text-white hover:bg-gray-800',
  },
  STUDENT_PRO: {
    border: 'border-purple-500 scale-105',
    gradient: 'bg-gradient-to-br from-purple-50 to-pink-50',
    badge: 'bg-gradient-to-r from-purple-600 to-pink-600',
    button: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg',
  },
  TEACHER_PRO: {
    border: 'border-emerald-500',
    gradient: 'bg-gradient-to-br from-emerald-50 to-teal-50',
    badge: 'bg-gradient-to-r from-emerald-600 to-teal-600',
    button: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:shadow-lg',
  },
  SCHOOL: {
    border: 'border-gray-200',
    gradient: 'bg-gradient-to-br from-amber-50 to-orange-50',
    badge: 'bg-gradient-to-r from-amber-600 to-orange-600',
    button: 'bg-gray-900 text-white hover:bg-gray-800',
  },
};

// AI Module feature matrix for comparison
const AI_MODULE_MATRIX = [
  { label: 'AI Trợ giảng (Chat)', icon: Bot, free: '5/ngày', studentPro: '50/ngày', teacherPro: 'Không giới hạn', school: 'Không giới hạn' },
  { label: 'Ngân hàng đề AI', icon: BookOpen, free: '—', studentPro: '10 đề/ngày', teacherPro: 'Không giới hạn', school: 'Không giới hạn' },
  { label: 'Kiểm duyệt nội dung AI', icon: Eye, free: '—', studentPro: '—', teacherPro: 'Không giới hạn', school: 'Không giới hạn' },
  { label: 'AI Vision / Thí nghiệm', icon: FlaskConical, free: '—', studentPro: '20/ngày', teacherPro: 'Không giới hạn', school: 'Không giới hạn' },
];

export default function PricingPage() {
  const { t } = useLanguage();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [gateway, setGateway] = useState<'sepay' | 'paypal'>('sepay');
  const [checkoutData, setCheckoutData] = useState<{
    checkoutUrl: string;
    formFields: Record<string, string>;
  } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const success = searchParams.get('success');
  const canceled = searchParams.get('canceled');
  const payError = searchParams.get('error');

  // Auto-capture PayPal on redirect back
  const paypalOrderId = searchParams.get('token'); // PayPal returns token param
  const internalOrderId = searchParams.get('order');
  const gatewayParam = searchParams.get('gateway');

  // PayPal capture effect — runs once on redirect back
  const [capturing, setCapturing] = useState(false);
  if (gatewayParam === 'paypal' && paypalOrderId && internalOrderId && success && !capturing) {
    setCapturing(true);
    fetch('/api/payment/paypal/capture-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paypalOrderId, orderId: internalOrderId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.status === 'success') {
          console.log('[PayPal] Subscription activated:', data.plan);
        }
      })
      .catch(console.error);
  }

  const handleCheckout = async (planId: SubscriptionPlan) => {
    if (planId === 'FREE') {
      if (session) {
        router.push('/dashboard');
      } else {
        router.push('/auth/signup');
      }
      return;
    }

    if (planId === 'SCHOOL') {
      router.push('/contact-sales');
      return;
    }

    if (!session) {
      router.push(`/auth/login?callbackUrl=${encodeURIComponent(`/pricing?plan=${planId}&cycle=${billingCycle}`)}`);
      return;
    }

    setLoadingPlan(planId);

    try {
      if (gateway === 'paypal') {
        // ─── PayPal flow ────────────────────────────────────────
        const res = await fetch('/api/payment/paypal/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: planId, billingCycle }),
        });
        const data = await res.json();

        if (data.approvalUrl) {
          window.location.href = data.approvalUrl;
        } else {
          alert(data.error || 'Không thể kết nối PayPal');
          setLoadingPlan(null);
        }
      } else {
        // ─── SePay flow ─────────────────────────────────────────
        const res = await fetch('/api/payment/create-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: planId, billingCycle }),
        });
        const data = await res.json();

        if (data.checkoutUrl && data.formFields) {
          setCheckoutData({ checkoutUrl: data.checkoutUrl, formFields: data.formFields });
          setTimeout(() => formRef.current?.submit(), 100);
        } else {
          alert(data.error || 'Có lỗi xảy ra khi tạo checkout');
          setLoadingPlan(null);
        }
      }
    } catch {
      alert('Có lỗi xảy ra, vui lòng thử lại');
      setLoadingPlan(null);
    }
  };

  const getCTA = (planId: SubscriptionPlan) => {
    switch (planId) {
      case 'FREE': return 'Bắt đầu miễn phí';
      case 'STUDENT_PRO': return 'Nâng cấp Học sinh Pro';
      case 'TEACHER_PRO': return 'Nâng cấp Giáo viên Pro';
      case 'SCHOOL': return 'Liên hệ Sales';
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* PayPal Hosted Buttons SDK — loaded when PayPal gateway is selected */}
      {gateway === 'paypal' && (
        <Script
          src={`https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&components=hosted-buttons&disable-funding=venmo&currency=USD`}
          strategy="lazyOnload"
          crossOrigin="anonymous"
        />
      )}

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
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="/#products" className="text-gray-600 hover:text-gray-900 font-medium">Sản phẩm</Link>
              <Link href="/#solutions" className="text-gray-600 hover:text-gray-900 font-medium">Giải pháp</Link>
              <Link href="/pricing" className="text-gray-900 font-semibold">Giá cả</Link>
            </nav>
            <div className="hidden md:flex items-center space-x-4">
              {session ? (
                <button onClick={() => router.push('/dashboard')} className="bg-black text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-800 transition-colors">
                  Dashboard
                </button>
              ) : (
                <>
                  <button onClick={() => router.push('/auth/login')} className="text-gray-600 hover:text-gray-900 font-medium">
                    Đăng nhập
                  </button>
                  <button onClick={() => router.push('/auth/signup')} className="bg-black text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-800 transition-colors">
                    Bắt đầu
                  </button>
                </>
              )}
            </div>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2">
              {mobileMenuOpen ? <CloseIcon className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100">
            <div className="px-4 py-4 space-y-4">
              <Link href="/#products" className="block text-gray-600 hover:text-gray-900 font-medium">Sản phẩm</Link>
              <Link href="/pricing" className="block text-gray-900 font-semibold">Giá cả</Link>
              <div className="pt-4 border-t border-gray-100 space-y-2">
                <button onClick={() => router.push('/auth/signup')} className="block w-full bg-black text-white px-4 py-2 rounded-lg font-medium">
                  Bắt đầu
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Hidden SePay checkout form — auto-submitted via JS */}
      {checkoutData && (
        <form ref={formRef} action={checkoutData.checkoutUrl} method="POST" style={{ display: 'none' }}>
          {Object.entries(checkoutData.formFields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
        </form>
      )}

      {/* Success / Cancel / Error banners */}
      {success && (
        <div className="fixed top-16 w-full bg-green-500 text-white text-center py-3 z-40 font-medium">
          Thanh toán thành công! Gói AI của bạn đã được kích hoạt.
        </div>
      )}
      {canceled && (
        <div className="fixed top-16 w-full bg-yellow-500 text-white text-center py-3 z-40 font-medium">
          Thanh toán đã bị hủy. Bạn có thể thử lại bất cứ lúc nào.
        </div>
      )}
      {payError && (
        <div className="fixed top-16 w-full bg-red-500 text-white text-center py-3 z-40 font-medium">
          Thanh toán thất bại. Vui lòng thử lại hoặc liên hệ hỗ trợ.
        </div>
      )}

      {/* Pricing Content */}
      <div className={`${success || canceled || payError ? 'pt-36' : 'pt-24'} pb-20 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 bg-white rounded-full shadow-sm border border-gray-200 mb-6">
              <Sparkles className="h-4 w-4 text-purple-600 mr-2" />
              <span className="text-sm font-medium text-gray-700">Phân quyền AI theo gói subscription</span>
            </div>
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Mở khóa sức mạnh AI
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                cho Giáo viên & Học sinh
              </span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              4 gói phù hợp mọi nhu cầu. AI Chat, Ngân hàng đề, Kiểm duyệt nội dung, Thí nghiệm ảo — tất cả trong tầm tay.
            </p>

            {/* Gateway Selector */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <button
                onClick={() => setGateway('sepay')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                  gateway === 'sepay'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                }`}
              >
                <Landmark className="h-4 w-4" />
                Chuyển khoản / QR (VNĐ)
              </button>
              <button
                onClick={() => setGateway('paypal')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                  gateway === 'paypal'
                    ? 'border-yellow-500 bg-yellow-50 text-yellow-700 shadow-sm'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                }`}
              >
                <CreditCard className="h-4 w-4" />
                PayPal (USD)
              </button>
            </div>

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto mb-20">
            {PRICING_PLANS.map((plan) => {
              const Icon = PLAN_ICONS[plan.id];
              const colors = PLAN_COLORS[plan.id];
              const vndPrice = billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
              const usdPrices = PAYPAL_PRICES[plan.id] || { monthly: 0, yearly: 0 };
              const usdPrice = billingCycle === 'monthly' ? usdPrices.monthly : usdPrices.yearly;
              const price = gateway === 'paypal' ? usdPrice : vndPrice;

              return (
                <div
                  key={plan.id}
                  className={`relative bg-white rounded-3xl shadow-xl border-2 ${colors.border} transition-all hover:shadow-2xl`}
                >
                  {plan.badge && (
                    <div className={`absolute -top-4 left-0 right-0 mx-auto w-fit px-4 py-1.5 ${colors.badge} text-white text-xs font-semibold rounded-full shadow-lg`}>
                      {plan.badge}
                    </div>
                  )}

                  <div className="p-6">
                    <div className={`w-12 h-12 ${colors.gradient} rounded-xl flex items-center justify-center mb-4`}>
                      <Icon className="h-6 w-6 text-gray-700" />
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 mb-1">{plan.name}</h3>
                    <p className="text-sm text-gray-600 mb-4">{plan.description}</p>

                    {/* Price */}
                    <div className="mb-6">
                      <div className="flex items-baseline">
                        <span className="text-4xl font-bold text-gray-900">
                          {gateway === 'paypal' ? formatUSD(price) : formatVND(price)}
                        </span>
                        {price > 0 && (
                          <span className="text-gray-500 ml-1 text-sm">
                            /{billingCycle === 'monthly' ? 'tháng' : 'năm'}
                          </span>
                        )}
                      </div>
                      {billingCycle === 'yearly' && price > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          {gateway === 'paypal'
                            ? `${formatUSD(price / 12)}/tháng`
                            : `${formatVND(Math.round(price / 12))}/tháng`
                          }
                        </p>
                      )}
                    </div>

                    {/* CTA */}
                    {gateway === 'paypal' && plan.id !== 'FREE' && plan.id !== 'SCHOOL' && getHostedButtonId(plan.id, billingCycle) ? (
                      <div className="mb-6">
                        <PayPalHostedButton
                          hostedButtonId={getHostedButtonId(plan.id, billingCycle)}
                          planId={`${plan.id}-${billingCycle}`}
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => handleCheckout(plan.id)}
                        disabled={loadingPlan === plan.id}
                        className={`w-full py-3 px-4 rounded-xl font-semibold transition-all mb-6 ${colors.button} disabled:opacity-50`}
                      >
                        {loadingPlan === plan.id ? 'Đang xử lý...' : getCTA(plan.id)}
                      </button>
                    )}

                    {/* Features */}
                    <div className="space-y-2.5">
                      {plan.features.map((f, i) => (
                        <div key={i} className="flex items-start">
                          <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-700">{f}</span>
                        </div>
                      ))}
                      {plan.limitations.map((l, i) => (
                        <div key={`l-${i}`} className="flex items-start">
                          <X className="h-4 w-4 text-gray-300 mr-2 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-400">{l}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* AI Module Comparison Table */}
          <div className="max-w-5xl mx-auto mb-20">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">
              So sánh quyền truy cập AI Modules
            </h2>
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left py-4 px-6 font-semibold text-gray-900">AI Module</th>
                    <th className="text-center py-4 px-4 font-semibold text-gray-500 text-sm">Miễn phí</th>
                    <th className="text-center py-4 px-4 font-semibold text-purple-600 text-sm">HS Pro</th>
                    <th className="text-center py-4 px-4 font-semibold text-emerald-600 text-sm">GV Pro</th>
                    <th className="text-center py-4 px-4 font-semibold text-amber-600 text-sm">Trường</th>
                  </tr>
                </thead>
                <tbody>
                  {AI_MODULE_MATRIX.map((mod, i) => {
                    const ModIcon = mod.icon;
                    return (
                      <tr key={i} className="border-b border-gray-100 last:border-0">
                        <td className="py-4 px-6">
                          <div className="flex items-center">
                            <ModIcon className="h-5 w-5 text-gray-400 mr-3" />
                            <span className="font-medium text-gray-900">{mod.label}</span>
                          </div>
                        </td>
                        <td className="text-center py-4 px-4 text-sm text-gray-500">{mod.free}</td>
                        <td className="text-center py-4 px-4 text-sm font-medium text-purple-700">{mod.studentPro}</td>
                        <td className="text-center py-4 px-4 text-sm font-medium text-emerald-700">{mod.teacherPro}</td>
                        <td className="text-center py-4 px-4 text-sm font-medium text-amber-700">{mod.school}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Trust Section */}
          <div className="text-center mb-16">
            <p className="text-gray-600 mb-8">Được tin dùng bởi hơn 10,000+ học sinh và 500+ giáo viên</p>
            <div className="flex justify-center items-center space-x-12 opacity-50">
              <Globe className="h-8 w-8 text-gray-400" />
              <Shield className="h-8 w-8 text-gray-400" />
              <Headphones className="h-8 w-8 text-gray-400" />
              <BarChart3 className="h-8 w-8 text-gray-400" />
            </div>
          </div>

          {/* FAQ */}
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Câu hỏi thường gặp</h2>
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">AI modules là gì?</h3>
                <p className="text-gray-600">AeroEdu cung cấp 4 module AI chính: AI Trợ giảng (chatbot), Ngân hàng đề AI (tạo đề thi tự động), Kiểm duyệt nội dung AI, và AI Vision/Thí nghiệm ảo. Mỗi gói subscription mở khóa các module khác nhau.</p>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Giáo viên và học sinh dùng gói khác nhau?</h3>
                <p className="text-gray-600">Đúng vậy! Gói Học sinh Pro tập trung vào học tập (chat AI, luyện đề, thí nghiệm). Gói Giáo viên Pro bổ sung thêm kiểm duyệt nội dung, tạo đề không giới hạn và quản lý lớp.</p>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Hết quota ngày thì sao?</h3>
                <p className="text-gray-600">Khi dùng hết quota ngày, bạn sẽ nhận thông báo và có thể nâng cấp gói để có thêm. Quota sẽ reset vào 0h hàng ngày.</p>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Chính sách hoàn tiền?</h3>
                <p className="text-gray-600">Hoàn tiền 100% trong 14 ngày đầu nếu không hài lòng. Hủy bất cứ lúc nào, gói vẫn hoạt động đến hết kỳ thanh toán.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <section className="py-20 bg-black">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Sẵn sàng mở khóa AI cho lớp học?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Tham gia cùng hàng nghìn giáo viên và học sinh đã tin tưởng AeroEdu
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
                <li><a href="#" className="hover:text-gray-900">Ngân hàng đề</a></li>
                <li><a href="#" className="hover:text-gray-900">Thí nghiệm ảo</a></li>
                <li><a href="#" className="hover:text-gray-900">API</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Giải pháp</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-gray-900">Cho học sinh</a></li>
                <li><a href="#" className="hover:text-gray-900">Cho giáo viên</a></li>
                <li><a href="#" className="hover:text-gray-900">Cho trường học</a></li>
                <li><a href="#" className="hover:text-gray-900">Enterprise</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Hỗ trợ</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><Link href="/docs" className="hover:text-gray-900">Tài liệu</Link></li>
                <li><Link href="/contact-sales" className="hover:text-gray-900">Liên hệ</Link></li>
                <li><Link href="/terms" className="hover:text-gray-900">Điều khoản</Link></li>
                <li><Link href="/privacy" className="hover:text-gray-900">Bảo mật</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-600">
              &copy; 2025 AeroEdu. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
