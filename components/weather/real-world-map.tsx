"use client"

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Loader2, Plus, Minus, Maximize2, Navigation, Layers } from "lucide-react";

interface RealWorldMapProps {
  apiEndpoint: string;
}

export function RealWorldMap({ apiEndpoint }: RealWorldMapProps) {
  const [weatherData, setWeatherData] = useState<any[]>([]);
  const [earthquakeData, setEarthquakeData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [showEarthquakes, setShowEarthquakes] = useState(true);
  const [showWeather, setShowWeather] = useState(true);
  const [mapStyle, setMapStyle] = useState<'street' | 'satellite' | 'terrain' | 'dark'>('street');
  const [mapCenter] = useState<[number, number]>([20, 0]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [weatherRes, eqRes] = await Promise.all([
        fetch(`${apiEndpoint}/weather/world-map`),
        fetch(`${apiEndpoint}/earthquakes/recent`)
      ]);
      
      if (weatherRes.ok) {
        const data = await weatherRes.json();
        if (data.success) setWeatherData(data.cities || []);
      }
      
      if (eqRes.ok) {
        const data = await eqRes.json();
        if (data.success) setEarthquakeData(data.earthquakes || []);
      }
      
      setLastUpdate(new Date().toLocaleTimeString('vi-VN'));
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 600000);
    return () => clearInterval(interval);
  }, []);

  // Get map embed URL based on style
  const getMapEmbedUrl = () => {
    const lat = mapCenter[0];
    const lon = mapCenter[1];
    
    switch (mapStyle) {
      case 'satellite':
        return `https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d100000000!2d${lon}!3d${lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e1!3m2!1sen!2s!4v1`;
      case 'terrain':
        return `https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d100000000!2d${lon}!3d${lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e3!3m2!1sen!2s!4v1`;
      case 'dark':
        return `https://www.openstreetmap.org/export/embed.html?bbox=${lon-50},${lat-30},${lon+50},${lat+30}&layer=mapnik&marker=${lat},${lon}`;
      default: // street
        return `https://www.openstreetmap.org/export/embed.html?bbox=${lon-60},${lat-40},${lon+60},${lat+40}&layer=mapnik`;
    }
  };

  return (
    <div className="space-y-4">
      {/* Map Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowWeather(!showWeather)}
                variant={showWeather ? "default" : "outline"}
                size="sm"
              >
                🌡️ {showWeather ? 'Ẩn' : 'Hiện'} thời tiết
              </Button>
              
              <Button
                onClick={() => setShowEarthquakes(!showEarthquakes)}
                variant={showEarthquakes ? "default" : "outline"}
                size="sm"
              >
                🌋 {showEarthquakes ? 'Ẩn' : 'Hiện'} động đất
              </Button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 bg-white border-2 rounded-lg p-1">
                <Button
                  onClick={() => setMapStyle('street')}
                  variant={mapStyle === 'street' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8"
                >
                  🗺️ Street
                </Button>
                <Button
                  onClick={() => setMapStyle('satellite')}
                  variant={mapStyle === 'satellite' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8"
                >
                  🛰️ Satellite
                </Button>
                <Button
                  onClick={() => setMapStyle('terrain')}
                  variant={mapStyle === 'terrain' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8"
                >
                  ⛰️ Terrain
                </Button>
                <Button
                  onClick={() => setMapStyle('dark')}
                  variant={mapStyle === 'dark' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8"
                >
                  🌙 Dark
                </Button>
              </div>

              {lastUpdate && (
                <span className="text-sm text-gray-600">
                  {lastUpdate}
                </span>
              )}
              
              <Button 
                onClick={loadData} 
                disabled={loading}
                variant="outline"
                size="sm"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Real Map Container */}
      <Card className="overflow-hidden">
        <CardContent className="p-0 relative">
          <div className="w-full h-[600px] bg-blue-50 relative overflow-hidden rounded-lg">
            <iframe
              src={getMapEmbedUrl()}
              width="100%"
              height="600"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="World Map"
              className="absolute inset-0"
            />
            
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            )}
          </div>

          {/* Map Info Overlay */}
          <div className="absolute top-4 left-4 bg-white/95 backdrop-blur rounded-xl p-4 shadow-lg text-sm max-w-xs z-20">
            <div className="font-bold text-lg mb-2 flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-600" />
              Bản đồ Thế giới
            </div>
            <div className="space-y-1 text-gray-700">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span>Map: OpenStreetMap</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>Weather: OpenWeatherMap</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                <span>Earthquake: USGS</span>
              </div>
            </div>
            {lastUpdate && (
              <div className="mt-2 pt-2 border-t text-xs text-gray-600">
                Cập nhật: {lastUpdate}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Earthquake Stats */}
      {showEarthquakes && earthquakeData.length > 0 && (
        <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900">
              🌋 Động đất 24h qua
              <Badge className="bg-orange-600 text-white">
                {earthquakeData.length} trận
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="text-5xl mb-2">🌋</div>
                <div className="text-3xl font-bold text-orange-700">{earthquakeData.length}</div>
                <div className="text-sm text-gray-600">Tổng số</div>
              </div>
              <div className="text-center p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="text-5xl mb-2">🔴</div>
                <div className="text-3xl font-bold text-red-700">
                  M{Math.max(...earthquakeData.map(eq => eq.magnitude || 0)).toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">Mạnh nhất</div>
              </div>
              <div className="text-center p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="text-5xl mb-2">📊</div>
                <div className="text-3xl font-bold text-yellow-700">
                  M{(earthquakeData.reduce((sum, eq) => sum + (eq.magnitude || 0), 0) / earthquakeData.length).toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">Trung bình</div>
              </div>
              <div className="text-center p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="text-5xl mb-2">⚠️</div>
                <div className="text-3xl font-bold text-purple-700">
                  {earthquakeData.filter(eq => eq.magnitude >= 5.0).length}
                </div>
                <div className="text-sm text-gray-600">Nguy hiểm (M≥5)</div>
              </div>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {earthquakeData.map((eq) => (
                <div 
                  key={eq.id}
                  className="p-4 bg-white rounded-xl border-2 hover:border-orange-400 transition-all cursor-pointer hover:shadow-lg"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="font-bold text-gray-900 flex items-center gap-2 mb-2">
                        <span className="text-2xl">🌋</span>
                        <span>{eq.place}</span>
                        {eq.tsunami > 0 && (
                          <Badge className="bg-red-600 text-white animate-pulse">
                            ⚠️ Tsunami Warning
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                        <div>📅 {new Date(eq.datetime).toLocaleString('vi-VN')}</div>
                        <div>📏 Độ sâu: {eq.coordinates.depth.toFixed(1)}km</div>
                        <div>📍 Lat: {eq.coordinates.lat.toFixed(2)}°</div>
                        <div>📍 Lon: {eq.coordinates.lon.toFixed(2)}°</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={`text-xl px-4 py-2 ${
                        eq.magnitude >= 7 ? "bg-gradient-to-r from-red-600 to-red-700 text-white" :
                        eq.magnitude >= 5 ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white" :
                        "bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900"
                      }`}>
                        M{eq.magnitude?.toFixed(1)}
                      </Badge>
                      <div className="text-xs text-gray-500 mt-1">
                        {eq.magnitude >= 7 ? 'Rất mạnh' :
                         eq.magnitude >= 5 ? 'Mạnh' :
                         eq.magnitude >= 4 ? 'Trung bình' : 'Nhẹ'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cities Weather Grid */}
      {showWeather && weatherData.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {weatherData.map((city) => (
            <Card 
              key={city.city}
              className="group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer border-2 hover:border-blue-400 bg-gradient-to-br from-white to-blue-50"
            >
              <CardContent className="p-5 text-center">
                <div className="text-5xl mb-3 transform group-hover:scale-110 transition-transform">
                  {getWeatherEmoji(city.weather.main)}
                </div>
                <div className="font-bold text-lg text-gray-900 mb-1">
                  {city.display_name || city.city}
                </div>
                <div className="text-sm text-gray-600 mb-3">{city.country}</div>
                <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2">
                  {city.temperature.current.toFixed(0)}°C
                </div>
                <Badge className="mb-3 capitalize bg-blue-100 text-blue-700">
                  {city.weather.description}
                </Badge>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center justify-center gap-1 bg-gray-50 rounded p-2">
                    <span>💨</span>
                    <span>{city.wind.speed.toFixed(1)}m/s</span>
                  </div>
                  <div className="flex items-center justify-center gap-1 bg-gray-50 rounded p-2">
                    <span>💧</span>
                    <span>{city.humidity}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function getWeatherEmoji(weather: string) {
  const w = weather?.toLowerCase() || '';
  if (w.includes('clear')) return '☀️';
  if (w.includes('cloud')) return '☁️';
  if (w.includes('rain')) return '🌧️';
  if (w.includes('snow')) return '❄️';
  if (w.includes('thunder')) return '⛈️';
  if (w.includes('mist') || w.includes('fog')) return '🌫️';
  return '🌤️';
}

