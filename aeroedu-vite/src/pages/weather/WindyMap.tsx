import { useState, useEffect } from 'react'
import {
  Wind, Waves, Thermometer, Cloud, Droplets,
  Search, Play, Pause, ChevronLeft, ChevronRight,
  Layers, MapPin, TrendingUp,
  Maximize2, Minimize2, ChevronDown, ChevronUp, X,
} from 'lucide-react'

interface WindyMapProps {
  apiEndpoint: string
}

type LayerId = 'wind' | 'temp' | 'rain' | 'waves' | 'clouds'

interface WeatherCity {
  city: string
  display_name?: string
  country: string
  coordinates: { lat: number; lon: number }
  temperature: { current: number }
  weather: { main: string; description: string }
  wind: { speed: number }
  humidity: number
  clouds: number
}

interface EarthquakeItem {
  id: string
  place: string
  magnitude: number
  datetime: string
  tsunami: number
  coordinates: { lat: number; lon: number; depth: number }
}

interface Alert {
  type: string
  severity: 'critical' | 'high' | 'medium'
  title: string
  message: string
  location?: string
  time: string
  depth?: number
  actions: string[]
}

function getWeatherEmoji(weather: string) {
  const w = weather?.toLowerCase() || ''
  if (w.includes('clear'))  return '☀️'
  if (w.includes('cloud'))  return '☁️'
  if (w.includes('rain'))   return '🌧️'
  if (w.includes('snow'))   return '❄️'
  if (w.includes('thunder'))return '⛈️'
  if (w.includes('mist') || w.includes('fog')) return '🌫️'
  return '🌤️'
}

// ─── UI Primitives ────────────────────────────────────────────────────────────

function Btn({
  onClick, active = false, disabled = false, className = '', children, title,
}: {
  onClick?: () => void; active?: boolean; disabled?: boolean
  className?: string; children: React.ReactNode; title?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition
        disabled:opacity-40 disabled:cursor-not-allowed
        ${active
          ? 'bg-blue-500 text-white'
          : 'bg-white/[0.06] border border-white/[0.1] text-white/70 hover:bg-white/[0.1] hover:text-white/90'}
        ${className}`}
    >
      {children}
    </button>
  )
}

function Badge({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${className}`}>
      {children}
    </span>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WindyMap({ apiEndpoint }: WindyMapProps) {
  const [selectedLayer, setSelectedLayer] = useState<LayerId>('wind')
  const [timeIndex, setTimeIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [searchCity, setSearchCity] = useState('')
  const [mapCenter, setMapCenter] = useState<[number, number]>([16, 107])
  const [weatherData, setWeatherData] = useState<WeatherCity[]>([])
  const [earthquakeData, setEarthquakeData] = useState<EarthquakeItem[]>([])
  const [selectedLocation, setSelectedLocation] = useState<WeatherCity | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showStats, setShowStats] = useState(true)
  const [showCities, setShowCities] = useState(false)
  const [showAlerts, setShowAlerts] = useState(true)

  // Load weather and earthquake data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [weatherRes, eqRes] = await Promise.all([
          fetch(`${apiEndpoint}/weather/world-map`),
          fetch(`${apiEndpoint}/earthquakes/recent`),
        ])
        if (weatherRes.ok) {
          const data = await weatherRes.json()
          if (data.success) setWeatherData(data.cities || [])
        }
        if (eqRes.ok) {
          const data = await eqRes.json()
          if (data.success) {
            const quakes: EarthquakeItem[] = data.earthquakes || []
            setEarthquakeData(quakes)

            const newAlerts: Alert[] = []
            quakes.filter(eq => eq.tsunami > 0).forEach(eq => {
              newAlerts.push({
                type: 'tsunami', severity: 'critical',
                title: '🌊 CẢNH BÁO SÓNG THẦN',
                message: `Động đất M${eq.magnitude?.toFixed(1)} tại ${eq.place} có khả năng gây sóng thần`,
                location: eq.place, time: new Date(eq.datetime).toLocaleString('vi-VN'),
                actions: ['🚨 DI CHUYỂN LÊN CAO NGAY LẬP TỨC', '📢 Thông báo cho mọi người', '🏃 Tránh xa bờ biển', '📱 Theo dõi cảnh báo chính thức'],
              })
            })
            quakes.filter(eq => eq.magnitude >= 6.0).forEach(eq => {
              newAlerts.push({
                type: 'earthquake', severity: eq.magnitude >= 7 ? 'critical' : 'high',
                title: `⚠️ ĐỘNG ĐẤT MẠNH M${eq.magnitude?.toFixed(1)}`,
                message: `Vị trí: ${eq.place}`, location: eq.place,
                time: new Date(eq.datetime).toLocaleString('vi-VN'),
                depth: eq.coordinates.depth,
                actions: [eq.magnitude >= 7 ? '🚨 Sơ tán khẩn cấp' : '🏠 Tìm nơi trú ẩn an toàn', '🆘 Tránh xa cửa sổ, vật dễ đổ', '📞 Liên hệ gia đình', '⚠️ Cảnh giác dư chấn'],
              })
            })
            const strongCount = quakes.filter(eq => eq.magnitude >= 5.0 && eq.magnitude < 6.0).length
            if (strongCount > 0) {
              newAlerts.push({
                type: 'earthquake', severity: 'medium',
                title: `📊 ${strongCount} động đất mạnh (M≥5.0)`,
                message: 'Theo dõi và chuẩn bị ứng phó',
                time: new Date().toLocaleString('vi-VN'),
                actions: ['📋 Kiểm tra kế hoạch ứng phó', '🎒 Chuẩn bị túi khẩn cấp', '📱 Theo dõi tin tức'],
              })
            }
            setAlerts(newAlerts)
          }
        }
      } catch (e) { /* api offline */ }
    }
    loadData()
    const interval = setInterval(loadData, 300_000)
    return () => clearInterval(interval)
  }, [apiEndpoint])

  // Auto-play animation
  useEffect(() => {
    if (!isPlaying) return
    const interval = setInterval(() => setTimeIndex(p => (p + 1) % 48), 500)
    return () => clearInterval(interval)
  }, [isPlaying])

  const layers: { id: LayerId; name: string; icon: React.ReactNode; grad: string }[] = [
    { id: 'wind',   name: 'Gió',       icon: <Wind className="h-3.5 w-3.5" />,        grad: 'from-blue-500 to-cyan-500' },
    { id: 'temp',   name: 'Nhiệt độ',  icon: <Thermometer className="h-3.5 w-3.5" />, grad: 'from-orange-500 to-red-500' },
    { id: 'rain',   name: 'Mưa',       icon: <Droplets className="h-3.5 w-3.5" />,    grad: 'from-blue-600 to-blue-800' },
    { id: 'waves',  name: 'Sóng biển', icon: <Waves className="h-3.5 w-3.5" />,       grad: 'from-cyan-500 to-blue-600' },
    { id: 'clouds', name: 'Mây',       icon: <Cloud className="h-3.5 w-3.5" />,        grad: 'from-gray-400 to-gray-600' },
  ]

  const getWindyEmbedUrl = () => {
    const [lat, lon] = mapCenter
    const layer = selectedLayer === 'temp' ? 'temp' : selectedLayer === 'rain' ? 'rain' : selectedLayer === 'waves' ? 'waves' : selectedLayer === 'clouds' ? 'clouds' : 'wind'
    return `https://embed.windy.com/embed2.html?lat=${lat}&lon=${lon}&detailLat=${lat}&detailLon=${lon}&width=100%25&height=600&zoom=5&level=surface&overlay=${layer}&product=ecmwf&menu=&message=&marker=&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=default&metricTemp=default&radarRange=-1`
  }

  const handleSearch = () => {
    const city = weatherData.find(c =>
      c.city.toLowerCase().includes(searchCity.toLowerCase()) ||
      (c.display_name && c.display_name.toLowerCase().includes(searchCity.toLowerCase()))
    )
    if (city) {
      setMapCenter([city.coordinates.lat, city.coordinates.lon])
      setSelectedLocation(city)
    }
  }

  return (
    <div className="space-y-3">

      {/* Top bar */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Wind className="h-5 w-5 text-white" />
            <span className="font-bold text-white hidden sm:inline">WindyStyle Weather</span>
            <Badge className="bg-white/20 text-white">Real-time</Badge>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Tìm thành phố..."
              value={searchCity}
              onChange={e => setSearchCity(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="w-32 sm:w-48 bg-white/90 text-gray-800 rounded-lg px-3 py-1.5 text-sm focus:outline-none placeholder-gray-500"
            />
            <button
              onClick={handleSearch}
              className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-blue-600 hover:bg-white/90 transition"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Layer selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {layers.map(layer => (
          <button
            key={layer.id}
            onClick={() => setSelectedLayer(layer.id)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition flex-shrink-0 ${
              selectedLayer === layer.id
                ? `bg-gradient-to-r ${layer.grad} text-white border-0`
                : 'bg-white/[0.06] border border-white/[0.1] text-white/70 hover:bg-white/[0.1]'
            }`}
          >
            {layer.icon}
            <span className="hidden sm:inline">{layer.name}</span>
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.1] text-white/70 hover:bg-white/[0.1] flex items-center justify-center transition"
          title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>

      {/* Main map */}
      <div className={`overflow-hidden rounded-2xl shadow-2xl ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''}`}>
        <div className="relative">
          <iframe
            src={getWindyEmbedUrl()}
            width="100%"
            height={isFullscreen ? '100vh' : '680'}
            frameBorder="0"
            className="w-full block"
            title="Windy Weather Map"
          />

          {/* Earthquake overlay */}
          {earthquakeData.length > 0 && (
            <div className="absolute top-4 right-4 bg-[hsl(260,30%,10%)]/95 backdrop-blur border border-white/[0.1] rounded-xl shadow-xl max-w-xs z-10">
              <div
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-white/[0.05] rounded-t-xl"
                onClick={() => setShowStats(!showStats)}
              >
                <h3 className="font-bold text-sm flex items-center gap-2 text-white/85">
                  <span>🌍</span> Động đất 24h
                </h3>
                {showStats ? <ChevronUp className="h-4 w-4 text-white/50" /> : <ChevronDown className="h-4 w-4 text-white/50" />}
              </div>
              {showStats && (
                <div className="p-3 pt-0 space-y-2">
                  <div className="flex items-center justify-between p-2 bg-red-500/10 rounded text-sm">
                    <span className="text-white/70">⚠️ Mạnh (≥6.0)</span>
                    <Badge className="bg-red-600 text-white">{earthquakeData.filter(e => e.magnitude >= 6.0).length}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-orange-500/10 rounded text-sm">
                    <span className="text-white/70">📊 TB (5.0–6.0)</span>
                    <Badge className="bg-orange-600 text-white">{earthquakeData.filter(e => e.magnitude >= 5.0 && e.magnitude < 6.0).length}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-blue-500/10 rounded text-sm">
                    <span className="text-white/70">ℹ️ Nhẹ (2.5–5.0)</span>
                    <Badge className="bg-blue-600 text-white">{earthquakeData.filter(e => e.magnitude >= 2.5 && e.magnitude < 5.0).length}</Badge>
                  </div>
                  {earthquakeData.filter(e => e.tsunami > 0).length > 0 && (
                    <div className="flex items-center justify-between p-2 bg-purple-500/10 border border-purple-500/40 rounded text-sm">
                      <span className="text-white/70">🌊 Sóng thần</span>
                      <Badge className="bg-purple-600 text-white animate-pulse">{earthquakeData.filter(e => e.tsunami > 0).length}</Badge>
                    </div>
                  )}
                  {earthquakeData.filter(e => e.magnitude >= 5.5).slice(0, 3).map((eq, idx) => (
                    <div key={idx} className="text-xs p-2 bg-white/[0.04] rounded">
                      <div className="flex items-center justify-between mb-1">
                        <Badge className={eq.magnitude >= 7 ? 'bg-red-600 text-white' : eq.magnitude >= 6 ? 'bg-orange-600 text-white' : 'bg-yellow-600 text-white'}>
                          M{eq.magnitude?.toFixed(1)}
                        </Badge>
                        {eq.tsunami > 0 && <span>🌊</span>}
                      </div>
                      <div className="text-white/70 truncate">{eq.place}</div>
                      <div className="text-white/40">{new Date(eq.datetime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Selected location overlay */}
          {selectedLocation && (
            <div className="absolute bottom-4 left-4 bg-[hsl(260,30%,10%)]/95 backdrop-blur border border-white/[0.1] rounded-xl p-4 shadow-xl max-w-xs z-10">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm flex items-center gap-2 text-white/85">
                  <MapPin className="h-4 w-4 text-blue-400" />
                  {selectedLocation.display_name || selectedLocation.city}
                </h3>
                <button
                  onClick={() => setSelectedLocation(null)}
                  className="text-white/40 hover:text-white/70 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-center p-2 bg-orange-500/10 rounded">
                  <Thermometer className="h-4 w-4 mx-auto mb-1 text-orange-400" />
                  <div className="text-xl font-bold text-orange-300">{selectedLocation.temperature.current.toFixed(0)}°C</div>
                </div>
                <div className="text-center p-2 bg-blue-500/10 rounded">
                  <Wind className="h-4 w-4 mx-auto mb-1 text-blue-400" />
                  <div className="text-xl font-bold text-blue-300">{selectedLocation.wind.speed.toFixed(1)}</div>
                  <div className="text-white/40">m/s</div>
                </div>
                <div className="text-center p-2 bg-cyan-500/10 rounded">
                  <Droplets className="h-4 w-4 mx-auto mb-1 text-cyan-400" />
                  <div className="font-bold text-cyan-300">{selectedLocation.humidity}%</div>
                </div>
                <div className="text-center p-2 bg-purple-500/10 rounded">
                  <Cloud className="h-4 w-4 mx-auto mb-1 text-purple-400" />
                  <div className="font-bold text-purple-300">{selectedLocation.clouds}%</div>
                </div>
              </div>
              <div className="mt-2 p-2 bg-white/[0.04] rounded text-xs capitalize text-center text-white/60">
                {selectedLocation.weather.description}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Timeline control */}
      {!isFullscreen && (
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4">
          <div className="flex items-center gap-3">
            <Btn onClick={() => setIsPlaying(!isPlaying)} active={isPlaying} className="w-8 h-8 p-0">
              {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </Btn>
            <Btn onClick={() => setTimeIndex(Math.max(0, timeIndex - 1))} disabled={timeIndex === 0} className="w-8 h-8 p-0">
              <ChevronLeft className="h-3.5 w-3.5" />
            </Btn>
            <span className="text-xs font-medium min-w-[60px] text-center text-white/60">+{timeIndex * 3}h</span>
            <Btn onClick={() => setTimeIndex(Math.min(47, timeIndex + 1))} disabled={timeIndex === 47} className="w-8 h-8 p-0">
              <ChevronRight className="h-3.5 w-3.5" />
            </Btn>
            <input
              type="range"
              min={0} max={47} step={1}
              value={timeIndex}
              onChange={e => setTimeIndex(+e.target.value)}
              className="flex-1 accent-blue-500"
            />
            <div className="text-xs text-white/40 min-w-[80px] text-right">
              {new Date(Date.now() + timeIndex * 3 * 3_600_000).toLocaleString('vi-VN', { day: 'numeric', hour: '2-digit' })}
            </div>
          </div>
        </div>
      )}

      {/* Cities grid (collapsible) */}
      {!isFullscreen && (
        <div>
          <button
            onClick={() => setShowCities(!showCities)}
            className="w-full mb-3 flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.05] transition text-sm text-white/70"
          >
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Thành phố nổi bật ({weatherData.length})
            </span>
            {showCities ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showCities && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {weatherData.slice(0, 10).map(city => (
                <button
                  key={city.city}
                  onClick={() => { setMapCenter([city.coordinates.lat, city.coordinates.lon]); setSelectedLocation(city) }}
                  className="group text-left rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-blue-500/40 hover:bg-white/[0.05] transition p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-3xl">{getWeatherEmoji(city.weather.main)}</div>
                    <Badge className="bg-blue-500/20 text-blue-200">
                      <Wind className="h-3 w-3 mr-0.5" />
                      {city.wind.speed.toFixed(0)}
                    </Badge>
                  </div>
                  <div className="font-bold text-white/85 text-sm truncate">{city.display_name || city.city}</div>
                  <div className="text-2xl font-bold text-orange-300 mt-1">{city.temperature.current.toFixed(0)}°C</div>
                  <div className="text-xs text-white/40 capitalize mt-0.5 truncate">{city.weather.description}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Alerts (collapsible) */}
      {!isFullscreen && alerts.length > 0 && (
        <div>
          <button
            onClick={() => setShowAlerts(!showAlerts)}
            className="w-full mb-3 flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.05] transition text-sm text-white/70"
          >
            <span className="flex items-center gap-2">
              {alerts.some(a => a.severity === 'critical') && <span className="animate-pulse">🚨</span>}
              Cảnh báo ({alerts.length})
            </span>
            {showAlerts ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showAlerts && (
            <div className="space-y-3">
              {alerts.filter(a => a.severity === 'critical').map((alert, idx) => (
                <div key={idx} className="rounded-2xl bg-gradient-to-r from-red-600 to-orange-600 p-4 animate-pulse">
                  <div className="flex items-start gap-3">
                    <div className="text-4xl">{alert.type === 'tsunami' ? '🌊' : '⚠️'}</div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-1">{alert.title}</h3>
                      <p className="text-white/90 mb-2">{alert.message}</p>
                      <div className="text-sm text-white/75 mb-3">📍 {alert.location} • 🕐 {alert.time}</div>
                      <div className="bg-white/20 rounded-lg p-3">
                        <div className="font-bold text-white mb-2">HÀNH ĐỘNG NGAY:</div>
                        <ul className="space-y-1 text-white/90 text-sm">
                          {alert.actions.map((a, i) => (
                            <li key={i}><span className="font-bold">{i + 1}.</span> {a}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {alerts.filter(a => a.severity === 'high').map((alert, idx) => (
                <div key={idx} className="rounded-2xl bg-gradient-to-r from-orange-500 to-yellow-500 p-4">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">⚠️</div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{alert.title}</h3>
                      <p className="text-white/90">{alert.message}</p>
                      <div className="text-sm text-white/75 mt-1">
                        {alert.time}{alert.depth != null && ` • Độ sâu: ${alert.depth.toFixed(1)}km`}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {alerts.filter(a => a.severity === 'medium').map((alert, idx) => (
                <div key={idx} className="rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 p-3 flex items-center gap-2">
                  <div className="text-2xl">ℹ️</div>
                  <div className="text-white">
                    <span className="font-bold">{alert.title}</span>
                    <span className="ml-2 text-white/80">{alert.message}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Major earthquake cards */}
      {!isFullscreen && earthquakeData.filter(e => e.magnitude >= 6.0).length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-bold flex items-center gap-2 text-white/85">
            <span>⚠️</span> Động đất mạnh gần đây (M≥6.0)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {earthquakeData.filter(e => e.magnitude >= 6.0).map((eq, idx) => (
              <div
                key={idx}
                className={`rounded-2xl border-2 p-4 ${
                  eq.tsunami > 0 ? 'border-purple-500/60 bg-purple-500/10' :
                  eq.magnitude >= 7 ? 'border-red-500/60 bg-red-500/10' : 'border-orange-500/60 bg-orange-500/10'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className={`text-4xl font-bold ${eq.magnitude >= 7 ? 'text-red-300' : 'text-orange-300'}`}>
                      M{eq.magnitude?.toFixed(1)}
                    </div>
                    {eq.tsunami > 0 && <Badge className="bg-purple-600 text-white animate-pulse mt-1">🌊 SÓNG THẦN</Badge>}
                  </div>
                  <div className="text-right text-sm text-white/50">
                    <div>{new Date(eq.datetime).toLocaleDateString('vi-VN')}</div>
                    <div className="font-bold">{new Date(eq.datetime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>
                <div className="font-bold text-white/85 mb-2">{eq.place}</div>
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div className="bg-white/[0.05] rounded p-2">
                    <div className="text-white/40 text-xs">Độ sâu</div>
                    <div className="font-bold text-white/75">{eq.coordinates.depth.toFixed(1)} km</div>
                  </div>
                  <div className="bg-white/[0.05] rounded p-2">
                    <div className="text-white/40 text-xs">Vị trí</div>
                    <div className="font-bold text-white/75 text-xs">{eq.coordinates.lat.toFixed(2)}°, {eq.coordinates.lon.toFixed(2)}°</div>
                  </div>
                </div>
                {eq.tsunami > 0 && (
                  <div className="bg-purple-500/10 border border-purple-500/40 rounded p-2 text-xs mb-3">
                    <div className="font-bold text-purple-300 mb-1">⚠️ CẢNH BÁO:</div>
                    <ul className="text-purple-200 space-y-0.5">
                      <li>🚨 Di chuyển lên cao ngay</li>
                      <li>🏃 Tránh xa bờ biển</li>
                      <li>📱 Theo dõi cảnh báo địa phương</li>
                    </ul>
                  </div>
                )}
                <button
                  onClick={() => setMapCenter([eq.coordinates.lat, eq.coordinates.lon])}
                  className="w-full py-2 rounded-lg bg-blue-500 hover:bg-blue-600 transition text-white text-sm font-medium"
                >
                  📍 Xem trên bản đồ
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info panel */}
      {!isFullscreen && (
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <h3 className="font-bold text-white/70 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
                <Layers className="h-4 w-4" /> Về Bản đồ
              </h3>
              <ul className="text-sm text-white/50 space-y-1.5">
                <li>• Powered by <a href="https://www.windy.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">Windy.com</a></li>
                <li>• Dữ liệu từ ECMWF & GFS</li>
                <li>• Cập nhật mỗi 3–6 giờ</li>
                <li>• Dự báo 10 ngày</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-white/70 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
                <Wind className="h-4 w-4" /> Layers có sẵn
              </h3>
              <ul className="text-sm text-white/50 space-y-1.5">
                <li>🌬️ Gió (wind flow animation)</li>
                <li>🌡️ Nhiệt độ (temperature)</li>
                <li>💧 Mưa & tuyết (precipitation)</li>
                <li>🌊 Sóng biển (waves)</li>
                <li>☁️ Mây (clouds coverage)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-white/70 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
                <TrendingUp className="h-4 w-4" /> Hướng dẫn
              </h3>
              <ul className="text-sm text-white/50 space-y-1.5">
                <li>🖱️ Kéo thả để di chuyển</li>
                <li>🔍 Scroll để zoom in/out</li>
                <li>📍 Click cities để xem chi tiết</li>
                <li>⏯️ Play/Pause animation</li>
                <li>⏱️ Kéo timeline để xem dự báo</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-red-300/70 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
                <span>⚠️</span> Cảnh báo Động đất
              </h3>
              <ul className="text-sm text-white/50 space-y-1.5">
                <li>🌊 <span className="font-bold text-white/60">Sóng thần</span>: Di chuyển lên cao ngay</li>
                <li>⚠️ <span className="font-bold text-white/60">M≥7.0</span>: Sơ tán khẩn cấp</li>
                <li>📊 <span className="font-bold text-white/60">M≥6.0</span>: Tìm nơi trú ẩn</li>
                <li>ℹ️ <span className="font-bold text-white/60">M≥5.0</span>: Theo dõi tin tức</li>
                <li>🔄 Dữ liệu USGS real-time</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
