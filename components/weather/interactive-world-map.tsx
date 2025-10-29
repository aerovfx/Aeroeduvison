"use client"

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Loader2, MapPin, Layers } from "lucide-react";

// Dynamic import to avoid SSR issues with Leaflet
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);
const CircleMarker = dynamic(
  () => import('react-leaflet').then((mod) => mod.CircleMarker),
  { ssr: false }
);

interface InteractiveWorldMapProps {
  apiEndpoint: string;
}

export function InteractiveWorldMap({ apiEndpoint }: InteractiveWorldMapProps) {
  const [weatherData, setWeatherData] = useState<any[]>([]);
  const [earthquakeData, setEarthquakeData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [showEarthquakes, setShowEarthquakes] = useState(true);
  const [showWeather, setShowWeather] = useState(true);
  const [mapStyle, setMapStyle] = useState<'street' | 'satellite' | 'terrain'>('street');

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch weather
      const weatherResponse = await fetch(`${apiEndpoint}/weather/world-map`);
      if (weatherResponse.ok) {
        const data = await weatherResponse.json();
        if (data.success) {
          setWeatherData(data.cities || []);
        }
      }
      
      // Fetch earthquakes
      const eqResponse = await fetch(`${apiEndpoint}/earthquakes/recent`);
      if (eqResponse.ok) {
        const data = await eqResponse.json();
        if (data.success) {
          setEarthquakeData(data.earthquakes || []);
        }
      }
      
      setLastUpdate(new Date().toLocaleTimeString('vi-VN'));
    } catch (error) {
      console.error('Data fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 600000); // 10 minutes
    return () => clearInterval(interval);
  }, [apiEndpoint]);

  const getTileLayer = () => {
    switch (mapStyle) {
      case 'satellite':
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      case 'terrain':
        return 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
      default: // street
        return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    }
  };

  const getWeatherColor = (temp: number) => {
    if (temp > 30) return '#EF4444';
    if (temp > 20) return '#F59E0B';
    if (temp > 10) return '#22C55E';
    return '#3B82F6';
  };

  const getEarthquakeColor = (magnitude: number) => {
    if (magnitude >= 7) return '#DC2626';
    if (magnitude >= 5) return '#F97316';
    if (magnitude >= 4) return '#FBBF24';
    return '#FCD34D';
  };

  const getEarthquakeRadius = (magnitude: number) => {
    return 5 + magnitude * 3;
  };

  if (typeof window === 'undefined') {
    return <div>Loading map...</div>;
  }

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
                <MapPin className="h-4 w-4 mr-2" />
                {showWeather ? '🌡️ Ẩn' : '🌡️ Hiện'} thời tiết
              </Button>
              
              <Button
                onClick={() => setShowEarthquakes(!showEarthquakes)}
                variant={showEarthquakes ? "default" : "outline"}
                size="sm"
              >
                🌋 {showEarthquakes ? 'Ẩn' : 'Hiện'} động đất
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 border rounded-lg p-1">
                <Button
                  onClick={() => setMapStyle('street')}
                  variant={mapStyle === 'street' ? 'default' : 'ghost'}
                  size="sm"
                >
                  🗺️ Street
                </Button>
                <Button
                  onClick={() => setMapStyle('satellite')}
                  variant={mapStyle === 'satellite' ? 'default' : 'ghost'}
                  size="sm"
                >
                  🛰️ Satellite
                </Button>
                <Button
                  onClick={() => setMapStyle('terrain')}
                  variant={mapStyle === 'terrain' ? 'default' : 'ghost'}
                  size="sm"
                >
                  ⛰️ Terrain
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
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Map */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div style={{ height: '600px', width: '100%' }}>
            <MapContainer
              center={[20, 0]}
              zoom={2}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url={getTileLayer()}
              />
              
              {/* Weather Markers */}
              {showWeather && weatherData.map((city) => (
                <CircleMarker
                  key={city.city}
                  center={[city.coordinates.lat, city.coordinates.lon]}
                  radius={12}
                  fillColor={getWeatherColor(city.temperature.current)}
                  color="#FFFFFF"
                  weight={2}
                  fillOpacity={0.8}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-bold text-lg mb-2">
                        {city.display_name || city.city}, {city.country}
                      </h3>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center justify-between gap-4">
                          <span>🌡️ Nhiệt độ:</span>
                          <span className="font-semibold">{city.temperature.current.toFixed(1)}°C</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span>☁️ Thời tiết:</span>
                          <span className="capitalize">{city.weather.description}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span>💨 Gió:</span>
                          <span>{city.wind.speed.toFixed(1)} m/s</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span>💧 Độ ẩm:</span>
                          <span>{city.humidity}%</span>
                        </div>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
              
              {/* Earthquake Markers */}
              {showEarthquakes && earthquakeData.map((eq) => (
                <CircleMarker
                  key={eq.id}
                  center={[eq.coordinates.lat, eq.coordinates.lon]}
                  radius={getEarthquakeRadius(eq.magnitude)}
                  fillColor={getEarthquakeColor(eq.magnitude)}
                  color={getEarthquakeColor(eq.magnitude)}
                  weight={2}
                  fillOpacity={0.5}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-bold text-lg mb-2">
                        🌋 {eq.title}
                      </h3>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center justify-between gap-4">
                          <span>📊 Cường độ:</span>
                          <Badge className={
                            eq.magnitude >= 7 ? "bg-red-600" :
                            eq.magnitude >= 5 ? "bg-orange-500" :
                            "bg-yellow-500"
                          }>
                            M {eq.magnitude?.toFixed(1)}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span>📍 Vị trí:</span>
                          <span className="text-xs">{eq.place}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span>⏰ Thời gian:</span>
                          <span className="text-xs">{new Date(eq.datetime).toLocaleString('vi-VN')}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span>📏 Độ sâu:</span>
                          <span>{eq.coordinates.depth.toFixed(1)} km</span>
                        </div>
                        {eq.tsunami > 0 && (
                          <div className="mt-2 p-2 bg-red-100 text-red-800 rounded font-semibold">
                            ⚠️ Cảnh báo Tsunami
                          </div>
                        )}
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <div className="font-semibold mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Nhiệt độ thời tiết:
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-red-500 rounded-full border-2 border-white"></div>
                  <span>&gt; 30°C (Nóng)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-orange-500 rounded-full border-2 border-white"></div>
                  <span>20-30°C (Ấm)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-green-500 rounded-full border-2 border-white"></div>
                  <span>10-20°C (Mát)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-blue-500 rounded-full border-2 border-white"></div>
                  <span>&lt; 10°C (Lạnh)</span>
                </div>
              </div>
            </div>

            <div>
              <div className="font-semibold mb-3 flex items-center gap-2">
                🌋 Cường độ động đất:
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-red-600/50 rounded-full border-2 border-red-600"></div>
                  <span>M ≥ 7.0 (Rất mạnh)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-orange-500/50 rounded-full border-2 border-orange-500"></div>
                  <span>M ≥ 5.0 (Mạnh)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-yellow-400/50 rounded-full border-2 border-yellow-400"></div>
                  <span>M &lt; 5.0 (Trung bình)</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Earthquake Stats */}
      {showEarthquakes && earthquakeData.length > 0 && (
        <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900">
              🌋 Động đất 24h qua (Data from USGS)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center p-3 bg-white rounded-xl shadow-sm">
                <div className="text-4xl font-bold text-orange-700">{earthquakeData.length}</div>
                <div className="text-sm text-gray-600">Trận động đất</div>
              </div>
              <div className="text-center p-3 bg-white rounded-xl shadow-sm">
                <div className="text-4xl font-bold text-red-700">
                  {Math.max(...earthquakeData.map(eq => eq.magnitude || 0)).toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">Cường độ lớn nhất</div>
              </div>
              <div className="text-center p-3 bg-white rounded-xl shadow-sm">
                <div className="text-4xl font-bold text-yellow-700">
                  {(earthquakeData.reduce((sum, eq) => sum + (eq.magnitude || 0), 0) / earthquakeData.length).toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">Trung bình</div>
              </div>
              <div className="text-center p-3 bg-white rounded-xl shadow-sm">
                <div className="text-4xl font-bold text-purple-700">
                  {earthquakeData.filter(eq => eq.magnitude >= 5.0).length}
                </div>
                <div className="text-sm text-gray-600">Mạnh (M≥5.0)</div>
              </div>
            </div>

            {/* Recent earthquakes */}
            <div className="space-y-2 max-h-80 overflow-y-auto">
              <h4 className="font-semibold text-sm text-gray-700 mb-2">10 trận mới nhất:</h4>
              {earthquakeData.slice(0, 10).map((eq) => (
                <div 
                  key={eq.id}
                  className="p-3 bg-white rounded-lg border hover:border-orange-400 transition-colors cursor-pointer hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 flex items-center gap-2">
                        🌋 {eq.place}
                        {eq.tsunami > 0 && (
                          <Badge className="bg-red-600 text-white text-xs">
                            ⚠️ Tsunami
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        📅 {new Date(eq.datetime).toLocaleString('vi-VN')} • 
                        📏 Sâu {eq.coordinates.depth.toFixed(1)}km
                      </div>
                    </div>
                    <Badge className={
                      eq.magnitude >= 7 ? "bg-red-600 text-white" :
                      eq.magnitude >= 5 ? "bg-orange-500 text-white" :
                      "bg-yellow-500 text-gray-900"
                    }>
                      M{eq.magnitude?.toFixed(1)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}



