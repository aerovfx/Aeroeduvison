'use client';

import { Brain, Menu, X as CloseIcon, Cookie, Check, X, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcherCompact } from '@/components/ui/language-switcher';

export default function CookiesPage() {
  const { t } = useLanguage();

  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

            <nav className="hidden md:flex items-center space-x-8">
              <Link href="/#products" className="text-gray-600 hover:text-gray-900 font-medium">Sản phẩm</Link>
              <Link href="/#solutions" className="text-gray-600 hover:text-gray-900 font-medium">Giải pháp</Link>
              <Link href="/pricing" className="text-gray-600 hover:text-gray-900 font-medium">Giá cả</Link>
            </nav>

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
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2"
            >
              {mobileMenuOpen ? <CloseIcon className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100">
            <div className="px-4 py-4 space-y-4">
              <Link href="/#products" className="block text-gray-600 hover:text-gray-900 font-medium">Sản phẩm</Link>
              <Link href="/#solutions" className="block text-gray-600 hover:text-gray-900 font-medium">Giải pháp</Link>
              <Link href="/pricing" className="block text-gray-600 hover:text-gray-900 font-medium">Giá cả</Link>
            </div>
          </div>
        )}
      </header>

      {/* Content */}
      <div className="pt-24 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-12">
            <div className="flex items-center mb-4">
              <Cookie className="h-10 w-10 text-purple-600 mr-4" />
              <h1 className="text-4xl font-bold text-gray-900">Chính sách Cookie</h1>
            </div>
            <p className="text-lg text-gray-600">Cập nhật lần cuối: {new Date().toLocaleDateString('vi-VN')}</p>
            <p className="text-gray-700 mt-4">
              Chính sách này giải thích Cookie là gì, cách AeroEdu sử dụng Cookie, và cách bạn có thể kiểm soát chúng.
            </p>
          </div>

          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Cookie là gì?</h2>
              <p className="text-gray-700 mb-4">
                Cookie là các tệp văn bản nhỏ được lưu trữ trên thiết bị của bạn khi bạn truy cập website. 
                Cookie giúp website &quot;ghi nhớ&quot; thông tin về lượt truy cập của bạn, làm cho trải nghiệm của bạn 
                dễ dàng và hữu ích hơn.
              </p>
              <div className="bg-purple-50 border-l-4 border-purple-600 p-4 rounded-r-xl mb-4">
                <p className="text-purple-900 text-sm">
                  <strong>Lưu ý:</strong> Cookie không chứa virus và không thể truy cập vào tệp tin trên máy tính của bạn.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Các loại Cookie Chúng tôi Sử dụng</h2>

              {/* Strictly Necessary */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
                <div className="flex items-start mb-4">
                  <div className="bg-red-100 rounded-lg p-3 mr-4">
                    <Check className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">2.1. Cookie Cần thiết</h3>
                    <span className="inline-block px-3 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full mb-3">
                      Luôn hoạt động
                    </span>
                    <p className="text-gray-700 mb-3">
                      Những cookie này cần thiết để website hoạt động và không thể tắt trong hệ thống của chúng tôi.
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-start">
                        <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700"><strong>next-auth.session-token:</strong> Duy trì phiên đăng nhập (30 ngày)</span>
                      </div>
                      <div className="flex items-start">
                        <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700"><strong>next-auth.csrf-token:</strong> Bảo vệ chống tấn công CSRF</span>
                      </div>
                      <div className="flex items-start">
                        <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700"><strong>cookie-consent:</strong> Lưu tùy chọn cookie của bạn (1 năm)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Functional */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
                <div className="flex items-start mb-4">
                  <div className="bg-blue-100 rounded-lg p-3 mr-4">
                    <Settings className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">2.2. Cookie Chức năng</h3>
                    <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full mb-3">
                      Có thể tắt
                    </span>
                    <p className="text-gray-700 mb-3">
                      Cookie này cho phép website cung cấp chức năng nâng cao và cá nhân hóa.
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-start">
                        <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700"><strong>user-preferences:</strong> Lưu cài đặt giao diện (theme, ngôn ngữ)</span>
                      </div>
                      <div className="flex items-start">
                        <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700"><strong>learning-progress:</strong> Lưu tiến độ học tập tạm thời</span>
                      </div>
                      <div className="flex items-start">
                        <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700"><strong>ai-tutor-context:</strong> Ghi nhớ ngữ cảnh cuộc trò chuyện với AI</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Analytics */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
                <div className="flex items-start mb-4">
                  <div className="bg-green-100 rounded-lg p-3 mr-4">
                    <Settings className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">2.3. Cookie Phân tích</h3>
                    <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full mb-3">
                      Có thể tắt
                    </span>
                    <p className="text-gray-700 mb-3">
                      Cookie này giúp chúng tôi hiểu cách người dùng tương tác với website để cải thiện trải nghiệm.
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-start">
                        <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700"><strong>_ga:</strong> Google Analytics - ID người dùng duy nhất (2 năm)</span>
                      </div>
                      <div className="flex items-start">
                        <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700"><strong>_gid:</strong> Google Analytics - Phân biệt người dùng (24 giờ)</span>
                      </div>
                      <div className="flex items-start">
                        <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700"><strong>_gat:</strong> Google Analytics - Giới hạn tốc độ request (1 phút)</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-3">
                      <strong>IP được ẩn danh hóa:</strong> Chúng tôi sử dụng anonymizeIP để bảo vệ quyền riêng tư của bạn.
                    </p>
                  </div>
                </div>
              </div>

              {/* Marketing */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
                <div className="flex items-start mb-4">
                  <div className="bg-purple-100 rounded-lg p-3 mr-4">
                    <Settings className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">2.4. Cookie Marketing</h3>
                    <span className="inline-block px-3 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full mb-3">
                      Yêu cầu đồng ý
                    </span>
                    <p className="text-gray-700 mb-3">
                      Cookie này được sử dụng để cung cấp quảng cáo phù hợp với sở thích của bạn.
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-start">
                        <X className="h-5 w-5 text-gray-400 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700"><strong>Hiện tại:</strong> Chúng tôi không sử dụng cookie marketing</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-3">
                      Nếu trong tương lai chúng tôi sử dụng cookie marketing, bạn sẽ được yêu cầu đồng ý rõ ràng.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Cookie của Bên thứ ba</h2>
              <p className="text-gray-700 mb-4">
                Một số cookie được đặt bởi các dịch vụ bên thứ ba mà chúng tôi sử dụng:
              </p>
              <div className="bg-gray-50 rounded-xl p-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 text-gray-900 font-semibold">Dịch vụ</th>
                      <th className="text-left py-2 text-gray-900 font-semibold">Mục đích</th>
                      <th className="text-left py-2 text-gray-900 font-semibold">Thời hạn</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="py-3 text-gray-700">Google Analytics</td>
                      <td className="py-3 text-gray-700">Phân tích traffic</td>
                      <td className="py-3 text-gray-700">2 năm</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-3 text-gray-700">Google OAuth</td>
                      <td className="py-3 text-gray-700">Đăng nhập</td>
                      <td className="py-3 text-gray-700">Session</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-3 text-gray-700">Stripe</td>
                      <td className="py-3 text-gray-700">Thanh toán</td>
                      <td className="py-3 text-gray-700">Session</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Cách Quản lý Cookie</h2>
              <p className="text-gray-700 mb-4">
                Bạn có thể kiểm soát và xóa cookie theo nhiều cách:
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">4.1. Trong Cài đặt AeroEdu</h3>
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 mb-6">
                <p className="text-gray-700 mb-3">Truy cập <strong>Cài đặt → Quyền riêng tư → Quản lý Cookie</strong> để:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-2">
                  <li>Bật/tắt cookie chức năng</li>
                  <li>Bật/tắt cookie phân tích</li>
                  <li>Xem danh sách cookie đang hoạt động</li>
                  <li>Xóa tất cả cookie (trừ cookie cần thiết)</li>
                </ul>
              </div>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">4.2. Trong Trình duyệt</h3>
              <div className="space-y-4">
                <div className="border border-gray-200 rounded-xl p-4">
                  <p className="font-semibold text-gray-900 mb-2">Chrome</p>
                  <p className="text-sm text-gray-700">Settings → Privacy and security → Cookies and other site data</p>
                </div>
                <div className="border border-gray-200 rounded-xl p-4">
                  <p className="font-semibold text-gray-900 mb-2">Firefox</p>
                  <p className="text-sm text-gray-700">Settings → Privacy & Security → Cookies and Site Data</p>
                </div>
                <div className="border border-gray-200 rounded-xl p-4">
                  <p className="font-semibold text-gray-900 mb-2">Safari</p>
                  <p className="text-sm text-gray-700">Preferences → Privacy → Cookies and website data</p>
                </div>
                <div className="border border-gray-200 rounded-xl p-4">
                  <p className="font-semibold text-gray-900 mb-2">Edge</p>
                  <p className="text-sm text-gray-700">Settings → Cookies and site permissions → Manage and delete cookies</p>
                </div>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-600 p-4 rounded-r-xl mt-6">
                <p className="text-yellow-900 text-sm">
                  <strong>Lưu ý:</strong> Nếu bạn xóa cookie cần thiết, một số tính năng của website có thể không hoạt động đúng. 
                  Ví dụ: bạn sẽ phải đăng nhập lại mỗi lần truy cập.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Do Not Track</h2>
              <p className="text-gray-700 mb-4">
                Chúng tôi tôn trọng tín hiệu &quot;Do Not Track&quot; (DNT) từ trình duyệt của bạn. Khi DNT được bật:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li>Cookie phân tích sẽ tự động bị vô hiệu hóa</li>
                <li>Chúng tôi không theo dõi hoạt động của bạn trên các website khác</li>
                <li>IP của bạn được ẩn danh hóa trong logs</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Thay đổi Chính sách Cookie</h2>
              <p className="text-gray-700 mb-4">
                Chúng tôi có thể cập nhật Chính sách Cookie này để phản ánh các thay đổi trong công nghệ hoặc pháp luật. 
                Thay đổi quan trọng sẽ được thông báo qua email hoặc banner trên website.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Liên hệ</h2>
              <p className="text-gray-700 mb-4">
                Nếu bạn có câu hỏi về cách chúng tôi sử dụng cookie:
              </p>
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6">
                <ul className="list-none text-gray-700 space-y-2">
                  <li><strong>Email:</strong> thegioithu2@gmail.com</li>
                  <li><strong>Điện thoại:</strong> +84 909 933 936</li>
                  <li><strong>Địa chỉ:</strong> Ấp 1, Đường 329, Hoà Hội, TP. Hồ Chí Minh</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <div className="bg-purple-50 border-l-4 border-purple-600 p-6 rounded-r-xl">
                <div className="flex items-start">
                  <Cookie className="h-6 w-6 text-purple-600 mr-3 flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-semibold text-purple-900 mb-2">Tóm tắt</p>
                    <p className="text-purple-800 text-sm">
                      Cookie giúp chúng tôi cung cấp dịch vụ tốt hơn cho bạn. Chúng tôi chỉ sử dụng cookie cần thiết 
                      và cookie chức năng mặc định. Cookie phân tích chỉ được sử dụng nếu bạn đồng ý. 
                      Bạn có thể thay đổi cài đặt cookie bất cứ lúc nào.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-600">
              © 2025 AeroEdu. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="/terms" className="text-sm text-gray-600 hover:text-gray-900">Điều khoản</a>
              <a href="/privacy" className="text-sm text-gray-600 hover:text-gray-900">Bảo mật</a>
              <a href="/cookies" className="text-sm text-gray-900 font-semibold">Cookie</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

