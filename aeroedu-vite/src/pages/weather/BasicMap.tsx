import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, Loader2, Layers } from 'lucide-react'

interface BasicMapProps {
  apiEndpoint: string
}

interface WeatherCity {
  city: string
  display_name?: string
  country: string
  coordinates: { lat: number; lon: number }
  temperature: { current: number }
  weather: { main: string; description: string }
  wind: { speed: number }
  humidity: number
}

interface EarthquakeItem {
  id: string
  place: string
  magnitude: number
  datetime: string
  tsunami: number
  coordinates: { lat: number; lon: number; depth: number }
}

type MapStyle = 'street' | 'satellite' | 'terrain' | 'dark'

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

export function BasicMap({ apiEndpoint }: BasicMapProps) {
  const [weatherData, setWeatherData] = useState<WeatherCity[]>([])
  const [earthquakeData, setEarthquakeData] = useState<EarthquakeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState('')
  const [showEarthquakes, setShowEarthquakes] = useState(true)
  const [showWeather, setShowWeather] = useState(true)
  const [mapStyle, setMapStyle] = useState<MapStyle>('street')
  const mapCenter: [number, number] = [20, 0]

  const loadData = useCallback(async () => {
    setLoading(true)
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
        if (data.success) setEarthquakeData(data.earthquakes || [])
      }
      setLastUpdate(new Date().toLocaleTimeString('vi-VN'))
    } catch { /* api offline */ } finally {
      setLoading(false)
    }
  }, [apiEndpoint])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 600_000)
    return () => clearInterval(interval)
  }, [loadData])

  const getMapEmbedUrl = () => {
    const [lat, lon] = mapCenter
    switch (mapStyle) {
      case 'satellite': return `https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d100000000!2d${lon}!3d${lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e1!3m2!1sen!2s!4v1`
      case 'terrain':   return `https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d100000000!2d${lon}!3d${lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e3!3m2!1sen!2s!4v1`
      case 'dark':      return `https://www.openstreetmap.org/export/embed.html?bbox=${lon-50},${lat-30},${lon+50},${lat+30}&layer=mapnik&marker=${lat},${lon}`
      default:          return `https://www.openstreetmap.org/export/embed.html?bbox=${lon-60},${lat-40},${lon+60},${lat+40}&layer=mapnik`
    }
  }

  const mapStyles: { id: MapStyle; label: string }[] = [
    { id: 'street',    label: '🗺️ Street' },
    { id: 'satellite', label: '🛰️ Satellite' },
    { id: 'terrain',   label: '⛰️ Terrain' },
    { id: 'dark',      label: '🌙 Dark' },
  ]

  return (
    <div className="space-y-4">

      {/* Controls */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowWeather(!showWeather)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${showWeather ? 'bg-blue-500 text-white' : 'bg-white/[0.06] border border-white/[0.1] text-white/60 hover:bg-white/[0.1]'}`}
            >
              🌡️ {showWeather ? 'Ẩn' : 'Hiện'} thời tiết
            </button>
            <button
              onClick={() => setShowEarthquakes(!showEarthquakes)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${showEarthquakes ? 'bg-orange-500 text-white' : 'bg-white/[0.06] border border-white/[0.1] text-white/60 hover:bg-white/[0.1]'}`}
            >
              🌋 {showEarthquakes ? 'Ẩn' : 'Hiện'} động đất
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.08] rounded-lg p-1">
              {mapStyles.map(s => (
                <button
                  key={s.id}
                  onClick={() => setMapStyle(s.id)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${mapStyle === s.id ? 'bg-blue-500 text-white' : 'text-white/60 hover:text-white/80'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {lastUpdate && <span className="text-sm text-white/40">{lastUpdate}</span>}
            <button
              onClick={loadData}
              disabled={loading}
              className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-white/60 hover:bg-white/[0.1] transition disabled:opacity-40"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="overflow-hidden rounded-2xl shadow-2xl relative">
        <div className="w-full h-[600px] relative">
          <iframe
            src={getMapEmbedUrl()}
            width="100%"
            height="600"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="World Map"
            className="absolute inset-0 w-full h-full"
          />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-[hsl(260,30%,8%)]/60 z-10">
              <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
            </div>
          )}

          {/* Info overlay */}
          <div className="absolute top-4 left-4 bg-[hsl(260,30%,10%)]/95 backdrop-blur border border-white/[0.1] rounded-xl p-4 shadow-lg text-sm max-w-xs z-20">
            <div className="font-bold text-lg mb-2 flex items-center gap-2 text-white/85">
              <Layers className="h-5 w-5 text-blue-400" />
              Bản đồ Thế giới
            </div>
            <div className="space-y-1.5 text-white/55">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                <span>Map: OpenStreetMap</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
                <span>Weather: OpenWeatherMap</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0" />
                <span>Earthquake: USGS</span>
              </div>
            </div>
            {lastUpdate && (
              <div className="mt-2 pt-2 border-t border-white/[0.06] text-xs text-white/35">
                Cập nhật: {lastUpdate}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Earthquake stats */}
      {showEarthquakes && earthquakeData.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-orange-500/10 to-red-500/10 border-2 border-orange-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-lg font-bold text-orange-300">🌋 Động đất 24h qua</h3>
            <span className="px-2.5 py-0.5 rounded-full bg-orange-600 text-white text-xs font-semibold">{earthquakeData.length} trận</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {[
              { emoji: '🌋', value: earthquakeData.length, label: 'Tổng số', color: 'text-orange-300' },
              { emoji: '🔴', value: `M${Math.max(...earthquakeData.map(e => e.magnitude || 0)).toFixed(1)}`, label: 'Mạnh nhất', color: 'text-red-300' },
              { emoji: '📊', value: `M${(earthquakeData.reduce((s, e) => s + (e.magnitude || 0), 0) / earthquakeData.length).toFixed(1)}`, label: 'Trung bình', color: 'text-yellow-300' },
              { emoji: '⚠️', value: earthquakeData.filter(e => e.magnitude >= 5.0).length, label: 'Nguy hiểm (M≥5)', color: 'text-purple-300' },
            ].map((stat, idx) => (
              <div key={idx} className="text-center p-4 bg-white/[0.03] rounded-xl hover:bg-white/[0.06] transition">
                <div className="text-4xl mb-2">{stat.emoji}</div>
                <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-sm text-white/50 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {earthquakeData.map(eq => (
              <div
                key={eq.id}
                className="p-4 bg-white/[0.02] border border-white/[0.08] rounded-xl hover:border-orange-500/40 hover:bg-white/[0.04] transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="font-bold text-white/85 flex items-center gap-2 mb-2">
                      <span>🌋</span>
                      <span>{eq.place}</span>
                      {eq.tsunami > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-xs font-semibold animate-pulse">⚠️ Tsunami Warning</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-white/50">
                      <div>📅 {new Date(eq.datetime).toLocaleString('vi-VN')}</div>
                      <div>📏 Độ sâu: {eq.coordinates.depth.toFixed(1)}km</div>
                      <div>📍 Lat: {eq.coordinates.lat.toFixed(2)}°</div>
                      <div>📍 Lon: {eq.coordinates.lon.toFixed(2)}°</div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`inline-block px-4 py-2 rounded-xl text-xl font-bold text-white ${
                      eq.magnitude >= 7 ? 'bg-red-600' :
                      eq.magnitude >= 5 ? 'bg-orange-500' : 'bg-yellow-500'
                    }`}>
                      M{eq.magnitude?.toFixed(1)}
                    </span>
                    <div className="text-xs text-white/40 mt-1">
                      {eq.magnitude >= 7 ? 'Rất mạnh' : eq.magnitude >= 5 ? 'Mạnh' : eq.magnitude >= 4 ? 'Trung bình' : 'Nhẹ'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cities weather grid */}
      {showWeather && weatherData.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {weatherData.map(city => (
            <div
              key={city.city}
              className="group rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-blue-500/40 hover:bg-white/[0.04] hover:-translate-y-1 transition-all duration-300 p-5 text-center cursor-pointer"
            >
              <div className="text-5xl mb-3 transform group-hover:scale-110 transition-transform">
                {getWeatherEmoji(city.weather.main)}
              </div>
              <div className="font-bold text-white/85 text-sm mb-0.5 truncate">
                {city.display_name || city.city}
              </div>
              <div className="text-xs text-white/40 mb-3">{city.country}</div>
              <div className="text-4xl font-bold text-blue-300 mb-2">
                {city.temperature.current.toFixed(0)}°C
              </div>
              <span className="inline-block px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs mb-3 capitalize">
                {city.weather.description}
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center justify-center gap-1 bg-white/[0.04] rounded p-1.5">
                  <span>💨</span><span className="text-white/60">{city.wind.speed.toFixed(1)}m/s</span>
                </div>
                <div className="flex items-center justify-center gap-1 bg-white/[0.04] rounded p-1.5">
                  <span>💧</span><span className="text-white/60">{city.humidity}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
