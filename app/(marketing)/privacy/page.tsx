'use client';

import { Brain, Menu, X as CloseIcon, Shield, Lock, Eye, Database, Users, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcherCompact } from '@/components/ui/language-switcher';

export default function PrivacyPage() {
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
              <Shield className="h-10 w-10 text-purple-600 mr-4" />
              <h1 className="text-4xl font-bold text-gray-900">Chính sách Bảo mật</h1>
            </div>
            <p className="text-lg text-gray-600">Cập nhật lần cuối: {new Date().toLocaleDateString('vi-VN')}</p>
            <p className="text-gray-700 mt-4">
              Tại AeroEdu, chúng tôi cam kết bảo vệ quyền riêng tư và dữ liệu cá nhân của bạn. 
              Chính sách này giải thích cách chúng tôi thu thập, sử dụng và bảo vệ thông tin của bạn.
            </p>
          </div>

          {/* Trust Badges */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 text-center">
              <Lock className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-900">Mã hóa SSL</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 text-center">
              <Shield className="h-6 w-6 text-purple-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-900">GDPR Tuân thủ</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 text-center">
              <Eye className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-900">Minh bạch</p>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl p-4 text-center">
              <Database className="h-6 w-6 text-orange-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-900">Bảo mật Dữ liệu</p>
            </div>
          </div>

          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Thông tin Chúng tôi Thu thập</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">1.1. Thông tin Cá nhân</h3>
              <p className="text-gray-700 mb-4">
                Khi bạn đăng ký tài khoản AeroEdu, chúng tôi thu thập:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li>Họ và tên</li>
                <li>Địa chỉ email</li>
                <li>Mật khẩu (được mã hóa)</li>
                <li>Ảnh đại diện (tùy chọn)</li>
                <li>Thông tin thanh toán (qua nhà cung cấp bên thứ ba)</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">1.2. Dữ liệu Học tập</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li>Tiến độ học tập và kết quả bài kiểm tra</li>
                <li>Tương tác với AI Tutor (câu hỏi, câu trả lời)</li>
                <li>Lịch sử học tập và thời gian học</li>
                <li>Ghi chú và bài tập do bạn tạo</li>
                <li>Phản hồi và đánh giá</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">1.3. Dữ liệu Kỹ thuật</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li>Địa chỉ IP và vị trí địa lý</li>
                <li>Loại thiết bị và trình duyệt</li>
                <li>Cookie và công nghệ theo dõi tương tự</li>
                <li>Nhật ký hoạt động và lỗi hệ thống</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Cách Chúng tôi Sử dụng Thông tin</h2>
              <p className="text-gray-700 mb-4">
                Chúng tôi sử dụng thông tin của bạn để:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li><strong>Cung cấp dịch vụ:</strong> Tạo tài khoản, cá nhân hóa trải nghiệm học tập</li>
                <li><strong>Cải thiện AI:</strong> Huấn luyện và tối ưu hóa các mô hình AI</li>
                <li><strong>Phân tích:</strong> Theo dõi tiến độ, tạo báo cáo học tập</li>
                <li><strong>Giao tiếp:</strong> Gửi thông báo, cập nhật và hỗ trợ kỹ thuật</li>
                <li><strong>Bảo mật:</strong> Phát hiện và ngăn chặn gian lận, lạm dụng</li>
                <li><strong>Tuân thủ:</strong> Đáp ứng yêu cầu pháp lý và quy định</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Chia sẻ Thông tin</h2>
              <p className="text-gray-700 mb-4">
                Chúng tôi <strong>KHÔNG</strong> bán dữ liệu cá nhân của bạn. Chúng tôi chỉ chia sẻ thông tin với:
              </p>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">3.1. Nhà cung cấp Dịch vụ</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li><strong>Google Cloud Platform:</strong> Lưu trữ dữ liệu và AI services</li>
                <li><strong>Stripe/PayPal:</strong> Xử lý thanh toán</li>
                <li><strong>SendGrid:</strong> Gửi email thông báo</li>
                <li><strong>Analytics:</strong> Google Analytics (ẩn danh hóa IP)</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">3.2. Giáo viên/Trường học</h3>
              <p className="text-gray-700 mb-4">
                Nếu bạn là học sinh trong tài khoản School, giáo viên có thể xem:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li>Tiến độ học tập và kết quả bài kiểm tra</li>
                <li>Thời gian học và hoạt động trên nền tảng</li>
                <li>Báo cáo phân tích học tập</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">3.3. Yêu cầu Pháp lý</h3>
              <p className="text-gray-700 mb-4">
                Chúng tôi có thể tiết lộ thông tin khi được yêu cầu bởi pháp luật hoặc để bảo vệ quyền lợi hợp pháp của chúng tôi.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Bảo mật Dữ liệu</h2>
              <p className="text-gray-700 mb-4">
                Chúng tôi áp dụng các biện pháp bảo mật tiên tiến:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li><strong>Mã hóa:</strong> SSL/TLS cho tất cả truyền tải dữ liệu</li>
                <li><strong>Mã hóa dữ liệu:</strong> Mật khẩu được hash với bcrypt</li>
                <li><strong>Firewall:</strong> Bảo vệ máy chủ khỏi truy cập trái phép</li>
                <li><strong>Sao lưu:</strong> Backup tự động hàng ngày</li>
                <li><strong>Kiểm tra:</strong> Audit bảo mật định kỳ</li>
                <li><strong>Giới hạn truy cập:</strong> Chỉ nhân viên được ủy quyền</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Quyền của Bạn</h2>
              <p className="text-gray-700 mb-4">
                Bạn có các quyền sau đối với dữ liệu cá nhân:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li><strong>Truy cập:</strong> Xem dữ liệu chúng tôi lưu trữ về bạn</li>
                <li><strong>Sửa đổi:</strong> Cập nhật thông tin cá nhân</li>
                <li><strong>Xóa:</strong> Yêu cầu xóa tài khoản và dữ liệu</li>
                <li><strong>Xuất dữ liệu:</strong> Tải về dữ liệu của bạn (format JSON)</li>
                <li><strong>Từ chối:</strong> Không đồng ý với việc xử lý dữ liệu nhất định</li>
                <li><strong>Khiếu nại:</strong> Liên hệ cơ quan bảo vệ dữ liệu</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Cookie và Công nghệ Theo dõi</h2>
              <p className="text-gray-700 mb-4">
                Chúng tôi sử dụng cookie và công nghệ tương tự để:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li><strong>Cookie cần thiết:</strong> Duy trì phiên đăng nhập</li>
                <li><strong>Cookie chức năng:</strong> Ghi nhớ tùy chọn của bạn</li>
                <li><strong>Cookie phân tích:</strong> Hiểu cách người dùng tương tác</li>
                <li><strong>Cookie marketing:</strong> Cá nhân hóa quảng cáo (với sự đồng ý)</li>
              </ul>
              <p className="text-gray-700 mb-4">
                Bạn có thể quản lý cookie trong cài đặt trình duyệt. Xem thêm tại <a href="/cookies" className="text-purple-600 hover:underline">Chính sách Cookie</a>.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Dữ liệu Trẻ em</h2>
              <p className="text-gray-700 mb-4">
                AeroEdu tuân thủ COPPA (Children&apos;s Online Privacy Protection Act):
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li>Trẻ em dưới 13 tuổi cần sự đồng ý của phụ huynh</li>
                <li>Chúng tôi chỉ thu thập dữ liệu tối thiểu cần thiết</li>
                <li>Phụ huynh có quyền xem, sửa, xóa dữ liệu của con</li>
                <li>Dữ liệu trẻ em được bảo vệ nghiêm ngặt hơn</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Lưu trữ Dữ liệu</h2>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li>Dữ liệu được lưu trữ trên máy chủ tại Việt Nam và Singapore</li>
                <li>Dữ liệu tài khoản: Lưu trữ trong suốt thời gian tài khoản hoạt động</li>
                <li>Dữ liệu học tập: Lưu trữ 5 năm sau khi tài khoản bị xóa</li>
                <li>Logs hệ thống: Lưu trữ 90 ngày</li>
                <li>Dữ liệu thanh toán: 7 năm (theo quy định pháp luật)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Chuyển giao Dữ liệu Quốc tế</h2>
              <p className="text-gray-700 mb-4">
                Dữ liệu của bạn có thể được chuyển đến các máy chủ ở nước ngoài (Google Cloud). 
                Chúng tôi đảm bảo các biện pháp bảo mật tương đương thông qua:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li>Hợp đồng xử lý dữ liệu tiêu chuẩn</li>
                <li>Tuân thủ GDPR và luật bảo vệ dữ liệu Việt Nam</li>
                <li>Mã hóa dữ liệu khi truyền tải</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Cập nhật Chính sách</h2>
              <p className="text-gray-700 mb-4">
                Chúng tôi có thể cập nhật Chính sách Bảo mật này. Thay đổi quan trọng sẽ được thông báo qua:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li>Email đến địa chỉ đăng ký</li>
                <li>Thông báo nổi bật trên nền tảng</li>
                <li>Cập nhật ngày &quot;Cập nhật lần cuối&quot; ở đầu trang</li>
              </ul>
              <p className="text-gray-700 mb-4">
                Việc tiếp tục sử dụng dịch vụ sau 30 ngày kể từ thông báo đồng nghĩa với việc chấp nhận chính sách mới.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Liên hệ về Bảo mật</h2>
              <p className="text-gray-700 mb-4">
                Nếu bạn có câu hỏi, khiếu nại hoặc yêu cầu về quyền riêng tư:
              </p>
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6">
                <p className="text-gray-900 font-semibold mb-3">Nhân viên Bảo vệ Dữ liệu (DPO)</p>
                <ul className="list-none text-gray-700 space-y-2">
                  <li><strong>Email:</strong> thegioithu2@gmail.com</li>
                  <li><strong>Điện thoại:</strong> +84 909 933 936</li>
                  <li><strong>Địa chỉ:</strong> Ấp 1, Đường 329, Hoà Hội, TP. Hồ Chí Minh</li>
                  <li><strong>Thời gian xử lý:</strong> Trong vòng 30 ngày</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <div className="bg-blue-50 border-l-4 border-blue-600 p-6 rounded-r-xl">
                <div className="flex items-start">
                  <Shield className="h-6 w-6 text-blue-600 mr-3 flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-semibold text-blue-900 mb-2">Cam kết của AeroEdu</p>
                    <p className="text-blue-800 text-sm">
                      Chúng tôi cam kết bảo vệ quyền riêng tư của bạn. Dữ liệu cá nhân của bạn được mã hóa, 
                      lưu trữ an toàn và chỉ được sử dụng để cải thiện trải nghiệm học tập của bạn. 
                      Chúng tôi không bao giờ bán dữ liệu của bạn cho bên thứ ba.
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
              <a href="/privacy" className="text-sm text-gray-900 font-semibold">Bảo mật</a>
              <a href="/cookies" className="text-sm text-gray-600 hover:text-gray-900">Cookie</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

