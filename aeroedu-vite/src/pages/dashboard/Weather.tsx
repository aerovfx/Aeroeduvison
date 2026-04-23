import { useState } from 'react'
import { Cloud, Map, Info, Wind } from 'lucide-react'
import { WindyMap } from '@/pages/weather/WindyMap'
import { BasicMap } from '@/pages/weather/BasicMap'

const API_ENDPOINT = 'http://localhost:8013'

type Tab = 'windy' | 'basic' | 'info'

export default function WeatherPage() {
  const [activeTab, setActiveTab] = useState<Tab>('windy')

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'windy', label: 'Windy Map', icon: <Wind className="h-4 w-4" /> },
    { id: 'basic', label: 'Bản đồ cơ bản', icon: <Map className="h-4 w-4" /> },
    { id: 'info',  label: 'Thông tin',    icon: <Info className="h-4 w-4" /> },
  ]

  return (
    <div className="min-h-screen bg-[hsl(260,30%,8%)] text-white/85">
      {/* Page header */}
      <div className="border-b border-white/[0.06] px-6 py-5">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/20 border border-blue-500/30">
              <Cloud className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white/90">Thời tiết &amp; Thiên nhiên</h1>
              <p className="text-sm text-white/45 mt-0.5">Bản đồ thời tiết, động đất và cảnh báo thiên tai</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-green-500/20 border border-green-500/30 text-green-300 text-xs font-semibold">
              🟢 Live
            </span>
            <span className="px-2.5 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-semibold">
              OpenWeatherMap
            </span>
            <span className="px-2.5 py-1 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-300 text-xs font-semibold">
              USGS Earthquake
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/[0.06] px-6">
        <div className="max-w-screen-2xl mx-auto">
          <div className="flex gap-1 -mb-px">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-white/50 hover:text-white/75 hover:border-white/20'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-screen-2xl mx-auto px-6 py-6">
        {activeTab === 'windy' && (
          <WindyMap apiEndpoint={API_ENDPOINT} />
        )}
        {activeTab === 'basic' && (
          <BasicMap apiEndpoint={API_ENDPOINT} />
        )}
        {activeTab === 'info' && (
          <InfoTab />
        )}
      </div>
    </div>
  )
}

function InfoTab() {
  const sources = [
    {
      icon: '🌬️',
      name: 'Windy.com',
      color: 'from-blue-500/10 to-cyan-500/10',
      border: 'border-blue-500/20',
      badge: 'bg-blue-500/20 text-blue-300',
      badgeText: 'Weather',
      description: 'Bản đồ thời tiết toàn cầu với nhiều lớp dữ liệu khí tượng: gió, nhiệt độ, mưa, sóng biển, mây...',
      features: ['Dữ liệu ECMWF (mô hình toàn cầu)', 'Dự báo 10 ngày', 'Nhiều lớp bản đồ', 'Cập nhật mỗi 6 giờ'],
    },
    {
      icon: '🌡️',
      name: 'OpenWeatherMap',
      color: 'from-orange-500/10 to-yellow-500/10',
      border: 'border-orange-500/20',
      badge: 'bg-orange-500/20 text-orange-300',
      badgeText: 'API',
      description: 'API thời tiết cho dữ liệu thực tế từ các thành phố lớn trên toàn thế giới.',
      features: ['Thời tiết hiện tại', 'Nhiệt độ, độ ẩm, gió', '30+ thành phố lớn', 'Cập nhật mỗi 10 phút'],
    },
    {
      icon: '🌋',
      name: 'USGS Earthquake',
      color: 'from-red-500/10 to-orange-500/10',
      border: 'border-red-500/20',
      badge: 'bg-red-500/20 text-red-300',
      badgeText: 'Real-time',
      description: 'Dữ liệu động đất thời gian thực từ Cục Khảo sát Địa chất Hoa Kỳ (USGS).',
      features: ['Động đất 24h qua', 'Cảnh báo sóng thần', 'Thông tin tọa độ & độ sâu', 'Phân loại theo cường độ'],
    },
    {
      icon: '🗺️',
      name: 'OpenStreetMap',
      color: 'from-green-500/10 to-teal-500/10',
      border: 'border-green-500/20',
      badge: 'bg-green-500/20 text-green-300',
      badgeText: 'Maps',
      description: 'Nền bản đồ mã nguồn mở được cộng đồng đóng góp và duy trì.',
      features: ['Bản đồ đường phố', 'Ảnh vệ tinh (Google Maps)', 'Bản đồ địa hình', 'Chế độ ban đêm'],
    },
  ]

  const layers = [
    { emoji: '🌬️', name: 'Wind', desc: 'Gió bề mặt (10m)', color: 'text-blue-400' },
    { emoji: '🌡️', name: 'Temperature', desc: 'Nhiệt độ 2m', color: 'text-orange-400' },
    { emoji: '🌧️', name: 'Rain', desc: 'Lượng mưa', color: 'text-cyan-400' },
    { emoji: '🌊', name: 'Waves', desc: 'Sóng biển', color: 'text-teal-400' },
    { emoji: '☁️', name: 'Clouds', desc: 'Mây che phủ', color: 'text-gray-400' },
  ]

  const magnitudeScales = [
    { range: 'M < 4.0', label: 'Nhẹ', color: 'bg-yellow-500', desc: 'Thường không gây thiệt hại' },
    { range: 'M 4.0–4.9', label: 'Trung bình', color: 'bg-orange-400', desc: 'Có thể cảm nhận được, thiệt hại nhỏ' },
    { range: 'M 5.0–6.9', label: 'Mạnh', color: 'bg-orange-500', desc: 'Gây thiệt hại đáng kể' },
    { range: 'M ≥ 7.0', label: 'Rất mạnh', color: 'bg-red-600', desc: 'Thiệt hại nghiêm trọng, nguy cơ sóng thần' },
  ]

  return (
    <div className="space-y-8">
      {/* Data sources */}
      <section>
        <h2 className="text-xl font-bold text-white/85 mb-5">Nguồn dữ liệu</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {sources.map(src => (
            <div
              key={src.name}
              className={`rounded-2xl bg-gradient-to-br ${src.color} border ${src.border} p-6`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{src.icon}</span>
                  <h3 className="text-lg font-bold text-white/90">{src.name}</h3>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${src.badge}`}>
                  {src.badgeText}
                </span>
              </div>
              <p className="text-sm text-white/60 mb-4 leading-relaxed">{src.description}</p>
              <ul className="space-y-1.5">
                {src.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-white/55">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/40 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Weather layers */}
      <section>
        <h2 className="text-xl font-bold text-white/85 mb-5">Lớp bản đồ thời tiết</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {layers.map(l => (
            <div key={l.name} className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5 text-center hover:border-white/[0.12] transition">
              <div className="text-4xl mb-3">{l.emoji}</div>
              <div className={`font-bold text-sm mb-1 ${l.color}`}>{l.name}</div>
              <div className="text-xs text-white/45">{l.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Earthquake scale */}
      <section>
        <h2 className="text-xl font-bold text-white/85 mb-5">Thang đo cường độ động đất</h2>
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
          <div className="grid grid-cols-4 gap-px bg-white/[0.04]">
            {['Cường độ', 'Phân loại', 'Màu cảnh báo', 'Mô tả'].map(h => (
              <div key={h} className="bg-[hsl(260,30%,8%)] px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">
                {h}
              </div>
            ))}
          </div>
          <div className="divide-y divide-white/[0.04]">
            {magnitudeScales.map(s => (
              <div key={s.range} className="grid grid-cols-4 gap-px">
                <div className="px-4 py-4 font-mono font-bold text-sm text-white/85">{s.range}</div>
                <div className="px-4 py-4 text-sm text-white/70">{s.label}</div>
                <div className="px-4 py-4">
                  <span className={`inline-block px-3 py-1 rounded-full ${s.color} text-white text-xs font-bold`}>
                    {s.range.split(' ')[0]}
                  </span>
                </div>
                <div className="px-4 py-4 text-sm text-white/50">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tips */}
      <section>
        <h2 className="text-xl font-bold text-white/85 mb-5">Hướng dẫn sử dụng</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              icon: '🔄',
              title: 'Cập nhật dữ liệu',
              tips: [
                'Dữ liệu thời tiết cập nhật mỗi 10 phút',
                'Dữ liệu động đất cập nhật theo thời gian thực',
                'Nhấn nút làm mới để lấy dữ liệu mới nhất',
              ],
            },
            {
              icon: '🗺️',
              title: 'Điều hướng bản đồ',
              tips: [
                'Kéo để di chuyển bản đồ',
                'Cuộn chuột để phóng to/thu nhỏ',
                'Chọn lớp dữ liệu từ thanh bên',
              ],
            },
            {
              icon: '⚠️',
              title: 'Cảnh báo thiên tai',
              tips: [
                'Màu đỏ: cảnh báo nguy hiểm cao',
                'Màu cam: cảnh báo mức trung bình',
                'Biểu tượng sóng thần: nguy hiểm đặc biệt',
              ],
            },
          ].map(card => (
            <div key={card.title} className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5">
              <div className="text-2xl mb-3">{card.icon}</div>
              <h3 className="font-bold text-white/85 mb-3">{card.title}</h3>
              <ul className="space-y-2">
                {card.tips.map(tip => (
                  <li key={tip} className="flex items-start gap-2 text-sm text-white/55">
                    <span className="text-blue-400 mt-0.5">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
