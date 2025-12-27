'use client';

import { Brain, Menu, X as CloseIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcherCompact } from '@/components/ui/language-switcher';

export default function TermsPage() {
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
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Điều khoản Sử dụng</h1>
          <p className="text-lg text-gray-600 mb-8">Cập nhật lần cuối: {new Date().toLocaleDateString('vi-VN')}</p>

          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Chấp nhận Điều khoản</h2>
              <p className="text-gray-700 mb-4">
                Chào mừng bạn đến với AeroEdu. Bằng cách truy cập và sử dụng nền tảng của chúng tôi, bạn đồng ý tuân thủ 
                và bị ràng buộc bởi các Điều khoản Sử dụng này. Nếu bạn không đồng ý với bất kỳ phần nào của các điều khoản, 
                vui lòng không sử dụng dịch vụ của chúng tôi.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Mô tả Dịch vụ</h2>
              <p className="text-gray-700 mb-4">
                AeroEdu là một nền tảng giáo dục trực tuyến sử dụng trí tuệ nhân tạo (AI) để cung cấp:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li>Bài học được cá nhân hóa và tạo tự động bởi AI</li>
                <li>Gia sư AI 24/7 hỗ trợ học tập</li>
                <li>Lộ trình học tập thông minh</li>
                <li>Phân tích tiến độ học tập chi tiết</li>
                <li>Phòng thí nghiệm ảo và mô phỏng</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Đăng ký Tài khoản</h2>
              <p className="text-gray-700 mb-4">
                Để sử dụng một số tính năng của AeroEdu, bạn cần tạo tài khoản:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li>Bạn phải cung cấp thông tin chính xác, đầy đủ và cập nhật</li>
                <li>Bạn chịu trách nhiệm bảo mật mật khẩu và tài khoản của mình</li>
                <li>Bạn phải thông báo ngay cho chúng tôi về bất kỳ vi phạm bảo mật nào</li>
                <li>Người dùng dưới 13 tuổi phải có sự đồng ý của phụ huynh</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Quyền và Trách nhiệm của Người dùng</h2>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">4.1. Bạn được phép:</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li>Truy cập và sử dụng nội dung học tập cho mục đích cá nhân</li>
                <li>Tạo và lưu trữ ghi chú học tập</li>
                <li>Tương tác với AI Tutor và các công cụ học tập</li>
                <li>Chia sẻ tiến độ học tập với giáo viên (nếu được phép)</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">4.2. Bạn không được phép:</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li>Chia sẻ tài khoản với người khác</li>
                <li>Sao chép, phân phối hoặc bán nội dung của AeroEdu</li>
                <li>Sử dụng dịch vụ cho mục đích thương mại không được phép</li>
                <li>Can thiệp vào hoạt động của nền tảng</li>
                <li>Đăng tải nội dung vi phạm pháp luật hoặc xúc phạm</li>
                <li>Cố gắng truy cập trái phép vào hệ thống</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Gói Dịch vụ và Thanh toán</h2>
              <p className="text-gray-700 mb-4">
                AeroEdu cung cấp các gói dịch vụ khác nhau:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li><strong>Gói Free:</strong> Miễn phí với tính năng cơ bản</li>
                <li><strong>Gói Pro:</strong> Trả phí hàng tháng/năm với đầy đủ tính năng</li>
                <li><strong>Gói School:</strong> Dành cho tổ chức giáo dục</li>
              </ul>
              <p className="text-gray-700 mb-4">
                Thanh toán được xử lý qua các cổng thanh toán bảo mật. Chúng tôi không lưu trữ thông tin thẻ tín dụng của bạn.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Hủy và Hoàn tiền</h2>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li>Bạn có thể hủy đăng ký bất cứ lúc nào từ trang cài đặt tài khoản</li>
                <li>Chính sách hoàn tiền 100% trong vòng 14 ngày đầu tiên</li>
                <li>Sau 14 ngày, không hoàn lại phí đã thanh toán</li>
                <li>Khi hủy, bạn vẫn có quyền truy cập đến hết chu kỳ thanh toán hiện tại</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Quyền Sở hữu Trí tuệ</h2>
              <p className="text-gray-700 mb-4">
                Tất cả nội dung, thiết kế, logo, và công nghệ của AeroEdu đều thuộc quyền sở hữu của chúng tôi và được bảo vệ 
                bởi luật sở hữu trí tuệ Việt Nam và quốc tế. Nội dung được tạo bởi AI dựa trên dữ liệu đào tạo hợp pháp.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Nội dung do Người dùng Tạo</h2>
              <p className="text-gray-700 mb-4">
                Khi bạn đăng tải nội dung lên AeroEdu (ghi chú, bài tập, v.v.):
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li>Bạn vẫn giữ quyền sở hữu nội dung của mình</li>
                <li>Bạn cấp cho chúng tôi quyền sử dụng nội dung đó để cung cấp dịch vụ</li>
                <li>Bạn đảm bảo nội dung không vi phạm quyền của bên thứ ba</li>
                <li>Chúng tôi có quyền xóa nội dung vi phạm điều khoản</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Giới hạn Trách nhiệm</h2>
              <p className="text-gray-700 mb-4">
                AeroEdu được cung cấp &quot;nguyên trạng&quot; và chúng tôi:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li>Không đảm bảo dịch vụ hoạt động liên tục không gián đoạn</li>
                <li>Không chịu trách nhiệm về kết quả học tập cụ thể</li>
                <li>Không chịu trách nhiệm về mất mát dữ liệu (khuyến khích backup)</li>
                <li>Không chịu trách nhiệm về nội dung do AI tạo ra (chỉ mang tính tham khảo)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Chấm dứt Dịch vụ</h2>
              <p className="text-gray-700 mb-4">
                Chúng tôi có quyền đình chỉ hoặc chấm dứt tài khoản của bạn nếu:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li>Bạn vi phạm các Điều khoản Sử dụng</li>
                <li>Bạn sử dụng dịch vụ một cách lạm dụng hoặc bất hợp pháp</li>
                <li>Có hành vi gian lận hoặc vi phạm pháp luật</li>
                <li>Không thanh toán phí dịch vụ</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Thay đổi Điều khoản</h2>
              <p className="text-gray-700 mb-4">
                Chúng tôi có quyền cập nhật các Điều khoản này bất cứ lúc nào. Thay đổi quan trọng sẽ được thông báo qua email 
                hoặc thông báo trên nền tảng ít nhất 30 ngày trước khi có hiệu lực. Việc tiếp tục sử dụng dịch vụ sau khi 
                thay đổi có hiệu lực đồng nghĩa với việc bạn chấp nhận các điều khoản mới.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Luật Áp dụng</h2>
              <p className="text-gray-700 mb-4">
                Các Điều khoản này được điều chỉnh bởi pháp luật Việt Nam. Mọi tranh chấp sẽ được giải quyết tại Tòa án 
                có thẩm quyền tại Thành phố Hồ Chí Minh.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Liên hệ</h2>
              <p className="text-gray-700 mb-4">
                Nếu bạn có bất kỳ câu hỏi nào về Điều khoản Sử dụng này, vui lòng liên hệ:
              </p>
              <ul className="list-none text-gray-700 space-y-2">
                <li><strong>Email:</strong> thegioithu2@gmail.com </li>
                <li><strong>Điện thoại:</strong> +84 909 933 936</li>
                <li><strong>Địa chỉ:</strong> Ấp 1, Đường 329, Hoà Hội , TP. Hồ Chí Minh</li>
              </ul>
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
              <a href="/terms" className="text-sm text-gray-900 font-semibold">Điều khoản</a>
              <a href="/privacy" className="text-sm text-gray-600 hover:text-gray-900">Bảo mật</a>
              <a href="/cookies" className="text-sm text-gray-600 hover:text-gray-900">Cookie</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

