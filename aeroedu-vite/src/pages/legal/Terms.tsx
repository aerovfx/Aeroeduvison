/**
 * Điều khoản sử dụng (Terms of Service) — /terms
 *
 * Trang pháp lý cơ bản cho AeroEduVision. Tuân thủ Luật Giao dịch điện tử
 * + Luật An toàn thông tin mạng 86/2015 của Việt Nam.
 */
import { Link } from 'react-router-dom'
import { Shield, FileText, ArrowLeft, Mail, AlertTriangle } from 'lucide-react'
import usePageTitle from '@/hooks/usePageTitle'

export default function TermsPage() {
  usePageTitle('Điều khoản sử dụng')
  return (
    <div className="min-h-screen bg-[#0a0f1e] text-zinc-100 px-4 sm:px-6 py-10">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-cyan-400 mb-6">
          <ArrowLeft className="w-4 h-4" /> Về trang chủ
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-cyan-500/15 border border-cyan-500/30">
            <FileText className="w-6 h-6 text-cyan-300" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Điều khoản sử dụng</h1>
            <p className="text-xs text-zinc-500 mt-0.5">Cập nhật lần cuối: 17/05/2026</p>
          </div>
        </div>

        <div className="prose prose-invert max-w-none text-sm leading-relaxed space-y-6 mt-6">
          <p className="text-zinc-300">
            Chào mừng quý thầy cô và học sinh đến với <strong>AeroEduVision</strong> (gọi tắt là
            "Dịch vụ" hoặc "chúng tôi"). Bằng cách tạo tài khoản và sử dụng nền tảng tại
            <em> inphysic.com</em>, bạn đồng ý tuân thủ các điều khoản dưới đây.
          </p>

          <section>
            <h2 className="text-lg font-bold text-cyan-300 mb-2">1. Đối tượng sử dụng</h2>
            <p className="text-zinc-300">
              Dịch vụ dành cho giáo viên, học sinh và quản lý cơ sở giáo dục THCS / THPT
              tại Việt Nam. Học sinh dưới 16 tuổi cần có sự đồng ý của giáo viên / phụ huynh
              khi đăng ký tài khoản và sử dụng các tính năng AI.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-cyan-300 mb-2">2. Tài khoản người dùng</h2>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-300">
              <li>Cung cấp thông tin chính xác (họ tên thật, email, vai trò).</li>
              <li>Giữ bí mật mật khẩu — chịu trách nhiệm về mọi hoạt động dưới tài khoản của mình.</li>
              <li>Báo cáo ngay cho thegioithu2@gmail.com nếu nghi tài khoản bị xâm nhập.</li>
              <li>Không chia sẻ tài khoản trả phí cho người khác — vi phạm có thể bị khoá tài khoản.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-cyan-300 mb-2">3. Quyền và nghĩa vụ của bạn</h2>
            <p className="text-zinc-300 mb-2">Bạn được phép:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-300 mb-3">
              <li>Sử dụng các tính năng miễn phí: AI Tutor cơ bản, đề thi mẫu, Lab 3D, Mạch Custom.</li>
              <li>Nâng cấp tài khoản trả phí để mở thêm AI sinh đề, transcript chi tiết, mạch nâng cao.</li>
              <li>Xuất dữ liệu cá nhân (báo cáo điểm, lộ trình học) ra Excel / PDF.</li>
            </ul>
            <p className="text-zinc-300 mb-2">Bạn KHÔNG được phép:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-300">
              <li>Sao chép, scrape nội dung hệ thống để dùng cho mục đích thương mại khác.</li>
              <li>Gửi nội dung xâm phạm pháp luật Việt Nam, kích động, đồi trụy, vi phạm bản quyền.</li>
              <li>Tấn công, khai thác lỗ hổng bảo mật — đã được Luật An toàn thông tin 86/2015 nghiêm cấm.</li>
              <li>Dùng AI để sinh đề thi đem bán lại — vi phạm Điều khoản đối tác AI của chúng tôi.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-cyan-300 mb-2">4. Sở hữu trí tuệ</h2>
            <p className="text-zinc-300">
              Nội dung do giáo viên tạo (đề thi, lộ trình học, mạch Custom) thuộc về giáo viên đó.
              Khi giáo viên bật "Chia sẻ công khai", nội dung được cấp phép Creative Commons
              cho cộng đồng giáo viên Việt Nam dùng cho mục đích giảng dạy phi lợi nhuận.
              Mã nguồn AeroEduVision, thương hiệu, logo thuộc sở hữu của đội ngũ sáng lập.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-cyan-300 mb-2">5. Thanh toán & hoàn tiền</h2>
            <p className="text-zinc-300">
              Gói trả phí thanh toán qua chuyển khoản ngân hàng (VietQR) hoặc các cổng thanh
              toán đối tác. Hoàn tiền 100% trong 7 ngày đầu nếu không hài lòng — liên hệ
              <Link to="/contact-sales" className="text-cyan-400 hover:underline mx-1">trang hỗ trợ</Link>
              để yêu cầu. Sau 7 ngày không hoàn tiền nhưng có thể huỷ gia hạn bất kỳ lúc nào.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-cyan-300 mb-2">6. Giới hạn trách nhiệm</h2>
            <p className="text-zinc-300">
              Dịch vụ cung cấp "as-is". Chúng tôi nỗ lực duy trì uptime 99.5% nhưng không
              cam kết 100%. Nội dung AI sinh ra có thể chứa lỗi — giáo viên cần kiểm tra
              trước khi giao cho học sinh. AeroEduVision không chịu trách nhiệm cho thiệt
              hại gián tiếp phát sinh từ việc sử dụng nội dung AI mà không kiểm tra.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-cyan-300 mb-2">7. Chấm dứt dịch vụ</h2>
            <p className="text-zinc-300">
              Chúng tôi có thể khoá tài khoản nếu phát hiện vi phạm. Bạn có thể yêu cầu xoá
              tài khoản và toàn bộ dữ liệu cá nhân bất kỳ lúc nào — gửi email tới
              <a href="mailto:thegioithu2@gmail.com" className="text-cyan-400 hover:underline mx-1">
                thegioithu2@gmail.com
              </a>
              và chúng tôi sẽ xử lý trong 30 ngày.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-cyan-300 mb-2">8. Thay đổi điều khoản</h2>
            <p className="text-zinc-300">
              Chúng tôi có thể cập nhật điều khoản khi cần — thay đổi quan trọng sẽ được
              thông báo qua email tài khoản trước ít nhất 15 ngày. Tiếp tục sử dụng sau ngày
              hiệu lực = đồng ý với điều khoản mới.
            </p>
          </section>

          <section className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-200 text-sm font-semibold mb-1">Pháp luật áp dụng</p>
                <p className="text-zinc-300 text-xs">
                  Điều khoản này được điều chỉnh bởi pháp luật Việt Nam. Mọi tranh chấp giải
                  quyết tại Toà án nhân dân có thẩm quyền tại TP. Hồ Chí Minh.
                </p>
              </div>
            </div>
          </section>

          <section className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Mail className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-cyan-200 text-sm font-semibold mb-1">Liên hệ pháp lý</p>
                <p className="text-zinc-300 text-xs">
                  Mọi câu hỏi về điều khoản hoặc tranh chấp: gửi email
                  <a href="mailto:thegioithu2@gmail.com" className="text-cyan-400 hover:underline mx-1">
                    thegioithu2@gmail.com
                  </a>
                  — chúng tôi phản hồi trong 5 ngày làm việc.
                </p>
              </div>
            </div>
          </section>

          <p className="text-xs text-zinc-500 italic text-center pt-4">
            Cảm ơn quý thầy cô và học sinh đã đồng hành cùng AeroEduVision.
          </p>
        </div>

        <div className="mt-10 flex items-center justify-center gap-3">
          <Link to="/cookies" className="text-xs text-zinc-400 hover:text-cyan-400 inline-flex items-center gap-1">
            <Shield className="w-3 h-3" /> Chính sách bảo mật
          </Link>
          <span className="text-zinc-700">·</span>
          <Link to="/contact-sales" className="text-xs text-zinc-400 hover:text-cyan-400">
            Liên hệ hỗ trợ
          </Link>
          <span className="text-zinc-700">·</span>
          <Link to="/" className="text-xs text-zinc-400 hover:text-cyan-400">
            Trang chủ
          </Link>
        </div>
      </div>
    </div>
  )
}
