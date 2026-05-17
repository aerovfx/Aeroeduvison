/**
 * Chính sách bảo mật (Privacy Policy) — /cookies
 *
 * Tuân thủ Luật An toàn thông tin mạng 86/2015, Nghị định 13/2023/NĐ-CP
 * về bảo vệ dữ liệu cá nhân, và Luật Giáo dục 2019 đối với dữ liệu HS.
 */
import { Link } from 'react-router-dom'
import { Shield, ArrowLeft, Lock, Database, Eye, Trash2, Mail, AlertTriangle } from 'lucide-react'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0a0f1e] text-zinc-100 px-4 sm:px-6 py-10">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-cyan-400 mb-6">
          <ArrowLeft className="w-4 h-4" /> Về trang chủ
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30">
            <Shield className="w-6 h-6 text-emerald-300" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Chính sách bảo mật</h1>
            <p className="text-xs text-zinc-500 mt-0.5">Cập nhật lần cuối: 17/05/2026</p>
          </div>
        </div>

        <div className="prose prose-invert max-w-none text-sm leading-relaxed space-y-6 mt-6">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
            <p className="text-zinc-300 text-sm">
              <strong className="text-emerald-300">Cam kết của chúng tôi:</strong> AeroEduVision
              tôn trọng quyền riêng tư của giáo viên và học sinh. Chúng tôi không bao giờ
              bán hoặc cho thuê dữ liệu cá nhân cho bên thứ ba vì mục đích quảng cáo.
            </p>
          </div>

          <section>
            <h2 className="text-lg font-bold text-emerald-300 mb-2 flex items-center gap-2">
              <Database className="w-5 h-5" /> 1. Dữ liệu chúng tôi thu thập
            </h2>
            <p className="text-zinc-300 mb-2">Khi đăng ký và sử dụng dịch vụ, chúng tôi thu thập:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-300">
              <li><strong>Bắt buộc:</strong> Họ tên, email, mật khẩu (đã hash), vai trò (giáo viên / học sinh / quản trị).</li>
              <li><strong>Tuỳ chọn:</strong> Ảnh đại diện, số điện thoại, trường đang công tác/học, lớp.</li>
              <li><strong>Học sinh THPT:</strong> Mã định danh cá nhân (10-12 chữ số do Bộ GD&ĐT cấp) —
                <em className="text-amber-300"> chỉ giáo viên có quyền xem khi xuất Excel báo cáo</em>.
              </li>
              <li><strong>Tự động:</strong> Hoạt động học tập (điểm bài thi, lộ trình hoàn thành), thời gian truy cập, IP, thiết bị, trình duyệt.</li>
              <li><strong>Nội dung do bạn tạo:</strong> Đề thi, lộ trình, mạch Custom, ghi chú — bạn là chủ sở hữu.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-emerald-300 mb-2 flex items-center gap-2">
              <Eye className="w-5 h-5" /> 2. Mục đích sử dụng
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-300">
              <li>Cung cấp dịch vụ học tập / giảng dạy (đăng nhập, lưu tiến độ, gửi đề thi).</li>
              <li>Phân tích hiệu suất học tập để gợi ý lộ trình AI cá nhân hoá.</li>
              <li>Gửi thông báo quan trọng (đổi mật khẩu, bài thi mới, lịch thi).</li>
              <li>Cải thiện sản phẩm — analytics ẩn danh, không nhận dạng cá nhân.</li>
              <li>Đảm bảo an ninh — phát hiện đăng nhập bất thường, ngăn lạm dụng.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-emerald-300 mb-2 flex items-center gap-2">
              <Lock className="w-5 h-5" /> 3. Cách chúng tôi bảo vệ dữ liệu
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-300">
              <li>Mật khẩu hash bằng <code className="text-cyan-300 text-xs bg-zinc-900 px-1.5 py-0.5 rounded">argon2id</code> — không thể giải mã ngay cả khi DB rò rỉ.</li>
              <li>Truyền tải qua HTTPS/TLS 1.3 — mọi request đều mã hoá.</li>
              <li>Database PostgreSQL trên Google Cloud, mã hoá at-rest (AES-256).</li>
              <li>Mã định danh học sinh KHÔNG hiển thị trên UI — chỉ xuất Excel khi giáo viên chủ động.</li>
              <li>JWT token có timeout, refresh token rotation, blacklist khi đăng xuất.</li>
              <li>Audit log mọi thao tác xoá / sửa dữ liệu nhạy cảm.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-emerald-300 mb-2">4. Chia sẻ dữ liệu</h2>
            <p className="text-zinc-300 mb-2">Chúng tôi <strong>KHÔNG bán</strong> dữ liệu cho bất kỳ ai. Chia sẻ chỉ trong các trường hợp:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-300">
              <li><strong>Đối tác AI:</strong> Anthropic Claude (xử lý prompt của AI Tutor) — KHÔNG chứa tên thật / mã định danh.</li>
              <li><strong>Cơ quan pháp luật:</strong> Khi có yêu cầu bằng văn bản hợp pháp theo Luật.</li>
              <li><strong>Trong nội bộ:</strong> Giáo viên xem điểm/tiến độ HS mà mình dạy. HS xem GV của mình.</li>
              <li><strong>Bạn chia sẻ chủ động:</strong> Khi bật "Chia sẻ công khai" cho mạch Custom / lộ trình.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-emerald-300 mb-2">5. Cookies & lưu trữ trình duyệt</h2>
            <p className="text-zinc-300">
              Chúng tôi dùng <code className="text-cyan-300 text-xs bg-zinc-900 px-1.5 py-0.5 rounded">localStorage</code>
              để lưu phiên đăng nhập + cài đặt giao diện (chế độ tối, ngôn ngữ).
              KHÔNG dùng cookie quảng cáo bên thứ ba. KHÔNG có Facebook Pixel,
              Google Ads, hoặc tracking cross-site.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-emerald-300 mb-2 flex items-center gap-2">
              <Trash2 className="w-5 h-5" /> 6. Quyền của bạn
            </h2>
            <p className="text-zinc-300 mb-2">Theo Nghị định 13/2023/NĐ-CP, bạn có quyền:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-300">
              <li><strong>Xem:</strong> Truy cập mọi dữ liệu cá nhân của bạn qua trang Cài đặt.</li>
              <li><strong>Sửa:</strong> Cập nhật thông tin cá nhân bất kỳ lúc nào.</li>
              <li><strong>Xuất:</strong> Yêu cầu xuất toàn bộ dữ liệu của bạn (JSON / CSV) qua email.</li>
              <li><strong>Xoá:</strong> Yêu cầu xoá tài khoản và mọi dữ liệu liên quan — hoàn tất trong 30 ngày.</li>
              <li><strong>Phản đối:</strong> Từ chối xử lý dữ liệu cho mục đích phân tích.</li>
              <li><strong>Khiếu nại:</strong> Liên hệ Cục An ninh mạng — Bộ Công an nếu chúng tôi vi phạm.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-emerald-300 mb-2">7. Trẻ em & học sinh dưới 16 tuổi</h2>
            <p className="text-zinc-300">
              Với học sinh dưới 16 tuổi, tài khoản cần được giáo viên hoặc phụ huynh kích hoạt.
              Chúng tôi giới hạn các tính năng AI có thể tương tác (không có AI chat tự do,
              chỉ có AI giải bài có giám sát của giáo viên). Dữ liệu của trẻ em chỉ được sử dụng
              cho mục đích giáo dục — không bao giờ cho marketing.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-emerald-300 mb-2">8. Lưu trữ & xoá dữ liệu</h2>
            <p className="text-zinc-300">
              Dữ liệu được lưu suốt thời gian tài khoản còn hoạt động. Sau khi xoá tài khoản:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-300 mt-2">
              <li>Dữ liệu cá nhân (tên, email, ảnh) → xoá ngay lập tức.</li>
              <li>Bài thi đã làm → ẩn danh hoá (giữ điểm cho thống kê chung của trường).</li>
              <li>Nội dung công khai (mạch chia sẻ, đề thi public) → giữ với chú thích "(deleted user)".</li>
              <li>Log audit → giữ 12 tháng theo yêu cầu pháp lý, sau đó xoá vĩnh viễn.</li>
            </ul>
          </section>

          <section className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-200 text-sm font-semibold mb-1">Báo cáo sự cố bảo mật</p>
                <p className="text-zinc-300 text-xs">
                  Nếu phát hiện lỗ hổng bảo mật hoặc dữ liệu của bạn bị rò rỉ, vui lòng báo
                  ngay cho chúng tôi qua email
                  <a href="mailto:security@inphysic.com" className="text-cyan-400 hover:underline mx-1">
                    security@inphysic.com
                  </a>
                  — chúng tôi cam kết phản hồi trong 24 giờ và công khai post-mortem
                  trong 7 ngày nếu ảnh hưởng người dùng.
                </p>
              </div>
            </div>
          </section>

          <section className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Mail className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-cyan-200 text-sm font-semibold mb-1">Yêu cầu về dữ liệu</p>
                <p className="text-zinc-300 text-xs">
                  Để xuất / xoá / chỉnh sửa dữ liệu cá nhân, gửi email
                  <a href="mailto:privacy@inphysic.com" className="text-cyan-400 hover:underline mx-1">
                    privacy@inphysic.com
                  </a>
                  với chủ đề "Yêu cầu xử lý dữ liệu". Vui lòng xác nhận danh tính
                  bằng email đăng ký tài khoản.
                </p>
              </div>
            </div>
          </section>

          <p className="text-xs text-zinc-500 italic text-center pt-4">
            Bằng cách sử dụng AeroEduVision, bạn xác nhận đã đọc và hiểu Chính sách bảo mật này.
          </p>
        </div>

        <div className="mt-10 flex items-center justify-center gap-3">
          <Link to="/terms" className="text-xs text-zinc-400 hover:text-cyan-400 inline-flex items-center gap-1">
            Điều khoản sử dụng
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
