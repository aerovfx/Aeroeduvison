/**
 * Liên hệ hỗ trợ / sale — /contact-sales
 *
 * Trang static cho user / trường / đối tác liên hệ. Tránh phụ thuộc
 * backend cho form (hiển thị các kênh liên hệ trực tiếp).
 */
import { Link } from 'react-router-dom'
import {
  Mail, Phone, MessageCircle, ArrowLeft, MapPin,
  Building2, Users, GraduationCap, Send, Clock, CheckCircle2,
} from 'lucide-react'
import { useState } from 'react'

export default function ContactSalesPage() {
  const [copied, setCopied] = useState<string | null>(null)
  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 1500)
    })
  }

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-zinc-100 px-4 sm:px-6 py-10">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-cyan-400 mb-6">
          <ArrowLeft className="w-4 h-4" /> Về trang chủ
        </Link>

        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 mb-4">
            <MessageCircle className="w-8 h-8 text-cyan-300" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">Liên hệ với chúng tôi</h1>
          <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto">
            Đội ngũ AeroEduVision luôn sẵn sàng hỗ trợ giáo viên, học sinh và trường học
            triển khai nền tảng. Chọn kênh phù hợp nhất bên dưới.
          </p>
        </div>

        {/* Contact channels — 3 cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          {/* Email */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 flex flex-col">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-2 rounded-lg bg-cyan-500/15 border border-cyan-500/30">
                <Mail className="w-5 h-5 text-cyan-300" />
              </div>
              <h3 className="font-bold text-zinc-100">Email</h3>
            </div>
            <p className="text-xs text-zinc-400 mb-3 flex-1">
              Phản hồi trong 1 ngày làm việc. Đính kèm screenshot nếu báo lỗi.
            </p>
            <a
              href="mailto:hello@inphysic.com"
              className="text-sm text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1.5 break-all"
            >
              hello@inphysic.com
            </a>
            <button
              onClick={() => copy('hello@inphysic.com', 'email')}
              className="mt-2 text-[11px] text-zinc-500 hover:text-zinc-300 inline-flex items-center gap-1 self-start"
            >
              {copied === 'email' ? <><CheckCircle2 className="w-3 h-3 text-emerald-400" /> Đã copy</> : 'Copy'}
            </button>
          </div>

          {/* Hotline */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 flex flex-col">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30">
                <Phone className="w-5 h-5 text-emerald-300" />
              </div>
              <h3 className="font-bold text-zinc-100">Hotline</h3>
            </div>
            <p className="text-xs text-zinc-400 mb-3 flex-1">
              Thứ 2 - Thứ 7, 8:00 - 18:00. Hỗ trợ kỹ thuật + tư vấn gói.
            </p>
            <a
              href="tel:+84909000000"
              className="text-sm text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1.5"
            >
              +84 909 000 000
            </a>
            <span className="mt-2 text-[11px] text-zinc-500 inline-flex items-center gap-1">
              <Clock className="w-3 h-3" /> 8h - 18h, T2-T7
            </span>
          </div>

          {/* Telegram */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 flex flex-col">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-2 rounded-lg bg-blue-500/15 border border-blue-500/30">
                <Send className="w-5 h-5 text-blue-300" />
              </div>
              <h3 className="font-bold text-zinc-100">Telegram</h3>
            </div>
            <p className="text-xs text-zinc-400 mb-3 flex-1">
              Nhanh nhất — admin xem 24/7. Phù hợp khi cần xử lý gấp.
            </p>
            <a
              href="https://t.me/aeroeduvision"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-400 hover:text-blue-300 inline-flex items-center gap-1.5"
            >
              @aeroeduvision
            </a>
            <span className="mt-2 text-[11px] text-zinc-500 inline-flex items-center gap-1">
              <Clock className="w-3 h-3" /> 24/7 — phản hồi &lt; 1h
            </span>
          </div>
        </div>

        {/* Audience-specific */}
        <h2 className="text-xl font-bold text-zinc-100 mb-4">Bạn là?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-12">
          {[
            {
              icon: GraduationCap,
              title: 'Giáo viên cá nhân',
              desc: 'Đăng ký dùng miễn phí ngay, nâng cấp trả phí khi cần.',
              cta: 'Đăng ký', href: '/auth/register',
              hex: { fg: '#67e8f9', fgHover: '#22d3ee', bg: 'rgba(34,211,238,0.12)', border: 'rgba(34,211,238,0.35)' },
            },
            {
              icon: Building2,
              title: 'Trường học / Sở GD',
              desc: 'Triển khai cho cả trường, ưu đãi theo quy mô, tích hợp SSO.',
              cta: 'Yêu cầu báo giá', href: 'mailto:hello@inphysic.com?subject=Yêu%20cầu%20báo%20giá%20cho%20trường',
              hex: { fg: '#6ee7b7', fgHover: '#34d399', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.35)' },
            },
            {
              icon: Users,
              title: 'Đối tác / Nhà phân phối',
              desc: 'Hợp tác phát hành nội dung, reseller, integration.',
              cta: 'Liên hệ partnership', href: 'mailto:partner@inphysic.com',
              hex: { fg: '#d8b4fe', fgHover: '#a855f7', bg: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.35)' },
            },
          ].map(({ icon: Icon, title, desc, cta, href, hex }) => (
            <a
              key={title}
              href={href}
              {...(href.startsWith('http') || href.startsWith('mailto') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              className="block rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 hover:bg-zinc-900/70 transition-colors group"
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = hex.border }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '' }}
            >
              <div
                className="p-2 rounded-lg inline-block mb-3 border"
                style={{ background: hex.bg, borderColor: hex.border }}
              >
                <Icon className="w-5 h-5" style={{ color: hex.fg }} />
              </div>
              <h3 className="font-bold text-sm text-zinc-100 mb-1">{title}</h3>
              <p className="text-xs text-zinc-400 mb-3">{desc}</p>
              <span
                className="text-xs font-semibold inline-flex items-center gap-1"
                style={{ color: hex.fg }}
              >
                {cta} →
              </span>
            </a>
          ))}
        </div>

        {/* Office */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 mb-6">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-500/30">
              <MapPin className="w-5 h-5 text-amber-300" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-sm text-zinc-100 mb-1">Trụ sở</h3>
              <p className="text-sm text-zinc-300">
                Xã Hồ Tràm, TP. Hồ Chí Minh, Việt Nam
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Đội ngũ làm việc remote-first — gặp mặt trực tiếp theo lịch hẹn.
              </p>
            </div>
          </div>
        </div>

        {/* Footer help text */}
        <div className="text-center pt-4 border-t border-zinc-800">
          <p className="text-xs text-zinc-500">
            Trước khi liên hệ, bạn có thể xem
            <Link to="/docs" className="text-cyan-400 hover:underline mx-1">tài liệu hướng dẫn</Link>
            — đa số câu hỏi đã có câu trả lời.
          </p>
        </div>
      </div>
    </div>
  )
}
