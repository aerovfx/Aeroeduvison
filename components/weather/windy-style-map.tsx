"use client"

import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { 
  Wind, Waves, Thermometer, Cloud, Droplets, Eye, 
  Search, Play, Pause, ChevronLeft, ChevronRight,
  Layers, MapPin, TrendingUp, Settings, 
  Maximize2, Minimize2, ChevronDown, ChevronUp
} from "lucide-react";

interface WindyStyleMapProps {
  apiEndpoint: string;
}

export function WindyStyleMap({ apiEndpoint }: WindyStyleMapProps) {
  const [selectedLayer, setSelectedLayer] = useState<'wind' | 'temp' | 'rain' | 'waves' | 'clouds'>('wind');
  const [timeIndex, setTimeIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [searchCity, setSearchCity] = useState('');
  const [mapCenter, setMapCenter] = useState<[number, number]>([16, 107]); // Vietnam
  const [weatherData, setWeatherData] = useState<any[]>([]);
  const [earthquakeData, setEarthquakeData] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [showCities, setShowCities] = useState(false);
  const [showAlerts, setShowAlerts] = useState(true);

  // Load weather and earthquake data
  useEffect(() => {
    const loadData = async () => {
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
          if (data.success) {
            setEarthquakeData(data.earthquakes || []);
            
            // Generate alerts
            const newAlerts: any[] = [];
            
            // Tsunami warnings
            const tsunamiQuakes = data.earthquakes.filter((eq: any) => eq.tsunami > 0);
            tsunamiQuakes.forEach((eq: any) => {
              newAlerts.push({
                type: 'tsunami',
                severity: 'critical',
                title: '🌊 CẢNH BÁO SÓNG THẦN',
                message: `Động đất M${eq.magnitude?.toFixed(1)} tại ${eq.place} có khả năng gây sóng thần`,
                location: eq.place,
                time: new Date(eq.datetime).toLocaleString('vi-VN'),
                actions: [
                  '🚨 DI CHUYỂN LÊN CAO NGAY LẬP TỨC',
                  '📢 Thông báo cho mọi người',
                  '🏃 Tránh xa bờ biển',
                  '📱 Theo dõi cảnh báo chính thức'
                ]
              });
            });
            
            // Major earthquakes (M >= 6.0)
            const majorQuakes = data.earthquakes.filter((eq: any) => eq.magnitude >= 6.0);
            majorQuakes.forEach((eq: any) => {
              newAlerts.push({
                type: 'earthquake',
                severity: eq.magnitude >= 7 ? 'critical' : 'high',
                title: `⚠️ ĐỘNG ĐẤT MẠNH M${eq.magnitude?.toFixed(1)}`,
                message: `Vị trí: ${eq.place}`,
                location: eq.place,
                time: new Date(eq.datetime).toLocaleString('vi-VN'),
                depth: eq.coordinates.depth,
                actions: [
                  eq.magnitude >= 7 ? '🚨 Sơ tán khẩn cấp' : '🏠 Tìm nơi trú ẩn an toàn',
                  '🆘 Tránh xa cửa sổ, vật dễ đổ',
                  '📞 Liên hệ gia đình',
                  '⚠️ Cảnh giác dư chấn'
                ]
              });
            });
            
            // Strong earthquakes (M >= 5.0 && M < 6.0)
            const strongQuakes = data.earthquakes.filter((eq: any) => eq.magnitude >= 5.0 && eq.magnitude < 6.0);
            if (strongQuakes.length > 0) {
              newAlerts.push({
                type: 'earthquake',
                severity: 'medium',
                title: `📊 ${strongQuakes.length} động đất mạnh (M≥5.0)`,
                message: 'Theo dõi và chuẩn bị ứng phó',
                time: new Date().toLocaleString('vi-VN'),
                actions: [
                  '📋 Kiểm tra kế hoạch ứng phó',
                  '🎒 Chuẩn bị túi khẩn cấp',
                  '📱 Theo dõi tin tức'
                ]
              });
            }
            
            setAlerts(newAlerts);
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    loadData();
    
    // Auto refresh every 5 minutes for alerts
    const interval = setInterval(loadData, 300000);
    return () => clearInterval(interval);
  }, [apiEndpoint]);

  // Auto-play animation
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setTimeIndex((prev) => (prev + 1) % 48); // 48 hours forecast
    }, 500);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const layers = [
    { id: 'wind', name: 'Gió', icon: <Wind className="h-4 w-4" />, color: 'from-blue-500 to-cyan-500' },
    { id: 'temp', name: 'Nhiệt độ', icon: <Thermometer className="h-4 w-4" />, color: 'from-orange-500 to-red-500' },
    { id: 'rain', name: 'Mưa', icon: <Droplets className="h-4 w-4" />, color: 'from-blue-600 to-blue-800' },
    { id: 'waves', name: 'Sóng biển', icon: <Waves className="h-4 w-4" />, color: 'from-cyan-500 to-blue-600' },
    { id: 'clouds', name: 'Mây', icon: <Cloud className="h-4 w-4" />, color: 'from-gray-400 to-gray-600' }
  ];

  const getWindyEmbedUrl = () => {
    const lat = mapCenter[0];
    const lon = mapCenter[1];
    const layer = selectedLayer === 'temp' ? 'temp' : 
                  selectedLayer === 'rain' ? 'rain' :
                  selectedLayer === 'waves' ? 'waves' :
                  selectedLayer === 'clouds' ? 'clouds' :
                  'wind';
    
    // Windy.com embed URL
    return `https://embed.windy.com/embed2.html?lat=${lat}&lon=${lon}&detailLat=${lat}&detailLon=${lon}&width=100%&height=600&zoom=5&level=surface&overlay=${layer}&product=ecmwf&menu=&message=&marker=&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=default&metricTemp=default&radarRange=-1`;
  };

  const handleSearch = () => {
    // Find city in weather data
    const city = weatherData.find(c => 
      c.city.toLowerCase().includes(searchCity.toLowerCase()) ||
      (c.display_name && c.display_name.toLowerCase().includes(searchCity.toLowerCase()))
    );
    
    if (city) {
      setMapCenter([city.coordinates.lat, city.coordinates.lon]);
      setSelectedLocation(city);
    }
  };

  return (
    <div className="space-y-3">
      {/* Compact Top Bar */}
      <Card className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-0">
        <CardContent className="p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Wind className="h-5 w-5" />
              <span className="font-bold hidden sm:inline">WindyStyle Weather</span>
              <Badge className="bg-white/20 text-white border-0 text-xs">Real-time</Badge>
            </div>

            {/* Search */}
            <div className="flex items-center gap-2">
              <Input
                placeholder="Tìm..."
                value={searchCity}
                onChange={(e) => setSearchCity(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-32 sm:w-48 bg-white/90 h-8 text-sm"
              />
              <Button onClick={handleSearch} size="sm" className="bg-white text-blue-600 h-8 w-8 p-0">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compact Layer Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {layers.map((layer) => (
          <Button
            key={layer.id}
            onClick={() => setSelectedLayer(layer.id as any)}
            variant={selectedLayer === layer.id ? 'default' : 'outline'}
            size="sm"
            className={`${selectedLayer === layer.id ? `bg-gradient-to-r ${layer.color} text-white border-0` : ''} h-8 text-xs`}
          >
            {layer.icon}
            <span className="ml-1 hidden sm:inline">{layer.name}</span>
          </Button>
        ))}
        
        <div className="flex-1"></div>
        
        {/* View Controls */}
        <Button
          onClick={() => setIsFullscreen(!isFullscreen)}
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          title={isFullscreen ? "Thu nhỏ" : "Toàn màn hình"}
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </div>

      {/* Main Map - Windy Embed */}
      <Card className={`overflow-hidden shadow-2xl ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''}`}>
        <CardContent className="p-0 relative">
          <iframe
            src={getWindyEmbedUrl()}
            width="100%"
            height={isFullscreen ? "100vh" : "750"}
            frameBorder="0"
            className="w-full"
            title="Windy Weather Map"
          />

          {/* Collapsible Earthquake Stats Overlay */}
          {earthquakeData.length > 0 && (
            <div className="absolute top-4 right-4 bg-white/95 backdrop-blur rounded-xl shadow-xl max-w-xs z-10">
              <div 
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 rounded-t-xl"
                onClick={() => setShowStats(!showStats)}
              >
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <span className="text-xl">🌍</span>
                  Động đất 24h
                </h3>
                {showStats ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
              
              {showStats && (
                <div className="p-3 pt-0">
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between p-2 bg-red-50 rounded">
                  <span>⚠️ Mạnh (≥6.0)</span>
                  <Badge className="bg-red-600">
                    {earthquakeData.filter(e => e.magnitude >= 6.0).length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-orange-50 rounded">
                  <span>📊 Trung bình (5.0-6.0)</span>
                  <Badge className="bg-orange-600">
                    {earthquakeData.filter(e => e.magnitude >= 5.0 && e.magnitude < 6.0).length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                  <span>ℹ️ Nhẹ (2.5-5.0)</span>
                  <Badge className="bg-blue-600">
                    {earthquakeData.filter(e => e.magnitude >= 2.5 && e.magnitude < 5.0).length}
                  </Badge>
                </div>
                
                {earthquakeData.filter(e => e.tsunami > 0).length > 0 && (
                  <div className="flex items-center justify-between p-2 bg-purple-50 rounded border-2 border-purple-400">
                    <span>🌊 Cảnh báo Sóng thần</span>
                    <Badge className="bg-purple-600 animate-pulse">
                      {earthquakeData.filter(e => e.tsunami > 0).length}
                    </Badge>
                  </div>
                )}
              </div>

                  {/* Recent Major Quakes */}
                  {earthquakeData.filter(e => e.magnitude >= 5.5).slice(0, 3).length > 0 && (
                    <div className="mt-3 border-t pt-3">
                      <div className="font-bold mb-2 text-xs text-gray-600">MỚI NHẤT:</div>
                      {earthquakeData.filter(e => e.magnitude >= 5.5).slice(0, 3).map((eq, idx) => (
                        <div key={idx} className="text-xs p-2 bg-gray-50 rounded mb-1">
                          <div className="flex items-center justify-between mb-1">
                            <Badge className={
                              eq.magnitude >= 7 ? "bg-red-600" : 
                              eq.magnitude >= 6 ? "bg-orange-600" : "bg-yellow-600"
                            }>
                              M{eq.magnitude?.toFixed(1)}
                            </Badge>
                            {eq.tsunami > 0 && <span className="text-purple-600">🌊</span>}
                          </div>
                          <div className="text-gray-700 font-medium line-clamp-1">{eq.place}</div>
                          <div className="text-gray-500">
                            {new Date(eq.datetime).toLocaleTimeString('vi-VN', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Compact Selected Location Info */}
          {selectedLocation && (
            <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur rounded-xl p-3 shadow-xl max-w-xs z-10">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  {selectedLocation.display_name || selectedLocation.city}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedLocation(null)}
                  className="h-5 w-5 p-0 text-gray-500 hover:text-gray-700"
                >
                  ×
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-center p-2 bg-gradient-to-br from-orange-50 to-red-50 rounded">
                  <Thermometer className="h-4 w-4 mx-auto mb-1 text-orange-600" />
                  <div className="text-xl font-bold text-orange-700">
                    {selectedLocation.temperature.current.toFixed(0)}°C
                  </div>
                </div>
                
                <div className="text-center p-2 bg-gradient-to-br from-blue-50 to-cyan-50 rounded">
                  <Wind className="h-4 w-4 mx-auto mb-1 text-blue-600" />
                  <div className="text-xl font-bold text-blue-700">
                    {selectedLocation.wind.speed.toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-600">m/s</div>
                </div>
                
                <div className="text-center p-2 bg-gradient-to-br from-cyan-50 to-blue-50 rounded">
                  <Droplets className="h-4 w-4 mx-auto mb-1 text-cyan-600" />
                  <div className="font-bold text-cyan-700">{selectedLocation.humidity}%</div>
                </div>
                
                <div className="text-center p-2 bg-gradient-to-br from-purple-50 to-pink-50 rounded">
                  <Cloud className="h-4 w-4 mx-auto mb-1 text-purple-600" />
                  <div className="font-bold text-purple-700">{selectedLocation.clouds}%</div>
                </div>
              </div>

              <div className="mt-2 p-2 bg-blue-50 rounded text-xs capitalize text-center">
                {selectedLocation.weather.description}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Compact Timeline Control */}
      {!isFullscreen && (
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setIsPlaying(!isPlaying)}
                size="sm"
                variant={isPlaying ? 'default' : 'outline'}
                className="h-8 w-8 p-0"
              >
                {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              </Button>
              <Button
                onClick={() => setTimeIndex(Math.max(0, timeIndex - 1))}
                size="sm"
                variant="outline"
                disabled={timeIndex === 0}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <span className="text-xs font-medium min-w-[60px] text-center">
                +{timeIndex * 3}h
              </span>
              <Button
                onClick={() => setTimeIndex(Math.min(47, timeIndex + 1))}
                size="sm"
                variant="outline"
                disabled={timeIndex === 47}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-3 w-3" />
              </Button>

              <Slider
                value={[timeIndex]}
                onValueChange={(v) => setTimeIndex(v[0])}
                min={0}
                max={47}
                step={1}
                className="flex-1"
              />

              <div className="text-xs text-gray-600 min-w-[80px] text-right">
                {new Date(Date.now() + timeIndex * 3 * 3600000).toLocaleString('vi-VN', {
                  day: 'numeric',
                  hour: '2-digit'
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Collapsible Quick Cities */}
      {!isFullscreen && (
        <div>
          <Button
            onClick={() => setShowCities(!showCities)}
            variant="outline"
            className="w-full mb-3 justify-between"
            size="sm"
          >
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Thành phố nổi bật ({weatherData.length})
            </span>
            {showCities ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          
          {showCities && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {weatherData.slice(0, 10).map((city) => (
          <Card 
            key={city.city}
            className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer border-2 hover:border-blue-400 bg-gradient-to-br from-white to-blue-50"
            onClick={() => {
              setMapCenter([city.coordinates.lat, city.coordinates.lon]);
              setSelectedLocation(city);
            }}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-3xl">{getWeatherEmoji(city.weather.main)}</div>
                <Badge className="bg-blue-100 text-blue-700">
                  <Wind className="h-3 w-3 mr-1" />
                  {city.wind.speed.toFixed(0)}
                </Badge>
              </div>
              <div className="font-bold text-gray-900 mb-1">
                {city.display_name || city.city}
              </div>
              <div className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                {city.temperature.current.toFixed(0)}°C
              </div>
              <div className="text-xs text-gray-600 capitalize mt-1">
                {city.weather.description}
              </div>
            </CardContent>
          </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Collapsible Alerts Section */}
      {!isFullscreen && alerts.length > 0 && (
        <div>
          <Button
            onClick={() => setShowAlerts(!showAlerts)}
            variant="outline"
            className="w-full mb-3 justify-between"
            size="sm"
          >
            <span className="flex items-center gap-2">
              {alerts.some(a => a.severity === 'critical') && <span className="animate-pulse">🚨</span>}
              Cảnh báo ({alerts.length})
            </span>
            {showAlerts ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          
          {showAlerts && (
            <div className="space-y-3">
                      {alerts.filter(a => a.severity === 'critical').length > 0 && (
        <Card className="bg-gradient-to-r from-red-600 to-orange-600 text-white border-0 animate-pulse">
          <CardContent className="p-4">
            <div className="space-y-3">
              {alerts.filter(a => a.severity === 'critical').map((alert, idx) => (
                <div key={idx} className="bg-white/20 backdrop-blur rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-4xl">{alert.type === 'tsunami' ? '🌊' : '⚠️'}</div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold mb-2">{alert.title}</h3>
                      <p className="text-lg mb-2">{alert.message}</p>
                      <div className="text-sm opacity-90 mb-3">
                        📍 {alert.location} • 🕐 {alert.time}
                      </div>
                      <div className="bg-white/30 rounded-lg p-3">
                        <div className="font-bold mb-2">HÀNH ĐỘNG NGAY:</div>
                        <ul className="space-y-1">
                          {alert.actions.map((action: string, i: number) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="font-bold">{i + 1}.</span>
                              <span>{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
              )}

              {alerts.filter(a => a.severity === 'high').length > 0 && (
        <Card className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white border-0">
          <CardContent className="p-4">
            {alerts.filter(a => a.severity === 'high').map((alert, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="text-3xl">⚠️</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold">{alert.title}</h3>
                  <p>{alert.message}</p>
                  <div className="text-sm opacity-90 mt-1">
                    {alert.time} {alert.depth && `• Độ sâu: ${alert.depth.toFixed(1)}km`}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
              )}

              {alerts.filter(a => a.severity === 'medium').length > 0 && (
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0">
          <CardContent className="p-3">
            {alerts.filter(a => a.severity === 'medium').map((alert, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="text-2xl">ℹ️</div>
                <div>
                  <span className="font-bold">{alert.title}</span>
                  <span className="ml-2 opacity-90">{alert.message}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
              )}
            </div>
          )}
        </div>
      )}

      {/* Earthquake Detail Cards */}
      {!isFullscreen && earthquakeData.filter(e => e.magnitude >= 6.0).length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <span className="text-2xl">⚠️</span>
            Động đất mạnh gần đây (M≥6.0)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {earthquakeData.filter(e => e.magnitude >= 6.0).map((eq, idx) => (
              <Card 
                key={idx}
                className={`border-2 ${
                  eq.tsunami > 0 ? 'border-purple-500 bg-purple-50' :
                  eq.magnitude >= 7 ? 'border-red-500 bg-red-50' : 
                  'border-orange-500 bg-orange-50'
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="text-4xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                        M{eq.magnitude?.toFixed(1)}
                      </div>
                      {eq.tsunami > 0 && (
                        <Badge className="bg-purple-600 mt-1 animate-pulse">
                          🌊 SÓNG THẦN
                        </Badge>
                      )}
                    </div>
                    <div className="text-right text-sm text-gray-600">
                      <div>{new Date(eq.datetime).toLocaleDateString('vi-VN')}</div>
                      <div className="font-bold">
                        {new Date(eq.datetime).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="font-bold text-gray-900">{eq.place}</div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-white p-2 rounded">
                        <div className="text-gray-600 text-xs">Độ sâu</div>
                        <div className="font-bold">{eq.coordinates.depth.toFixed(1)} km</div>
                      </div>
                      <div className="bg-white p-2 rounded">
                        <div className="text-gray-600 text-xs">Vị trí</div>
                        <div className="font-bold text-xs">
                          {eq.coordinates.lat.toFixed(2)}°, {eq.coordinates.lon.toFixed(2)}°
                        </div>
                      </div>
                    </div>

                    {eq.tsunami > 0 && (
                      <div className="bg-purple-100 border-2 border-purple-500 rounded p-2 text-sm">
                        <div className="font-bold text-purple-900 mb-1">⚠️ CẢNH BÁO:</div>
                        <ul className="text-purple-800 text-xs space-y-1">
                          <li>🚨 Di chuyển lên cao ngay</li>
                          <li>🏃 Tránh xa bờ biển</li>
                          <li>📱 Theo dõi cảnh báo địa phương</li>
                        </ul>
                      </div>
                    )}
                  </div>

                  <Button
                    size="sm"
                    className="w-full mt-3"
                    onClick={() => setMapCenter([eq.coordinates.lat, eq.coordinates.lon])}
                  >
                    📍 Xem trên bản đồ
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Info Panel */}
      {!isFullscreen && (
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Về Bản đồ
              </h3>
              <ul className="text-sm text-blue-800 space-y-2">
                <li>• Powered by <a href="https://www.windy.com" target="_blank" rel="noopener noreferrer" className="underline">Windy.com</a></li>
                <li>• Dữ liệu từ ECMWF & GFS</li>
                <li>• Cập nhật mỗi 3-6 giờ</li>
                <li>• Dự báo 10 ngày</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                <Wind className="h-5 w-5" />
                Layers có sẵn
              </h3>
              <ul className="text-sm text-blue-800 space-y-2">
                <li>🌬️ Gió (wind flow animation)</li>
                <li>🌡️ Nhiệt độ (temperature)</li>
                <li>💧 Mưa & tuyết (precipitation)</li>
                <li>🌊 Sóng biển (waves)</li>
                <li>☁️ Mây (clouds coverage)</li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Hướng dẫn
              </h3>
              <ul className="text-sm text-blue-800 space-y-2">
                <li>🖱️ Kéo thả để di chuyển</li>
                <li>🔍 Scroll để zoom in/out</li>
                <li>📍 Click cities để xem chi tiết</li>
                <li>⏯️ Play/Pause animation</li>
                <li>⏱️ Kéo timeline để xem dự báo</li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-red-900 mb-3 flex items-center gap-2">
                <span className="text-xl">⚠️</span>
                Cảnh báo Động đất
              </h3>
              <ul className="text-sm text-red-800 space-y-2">
                <li>🌊 <span className="font-bold">Sóng thần</span>: Di chuyển lên cao ngay</li>
                <li>⚠️ <span className="font-bold">M≥7.0</span>: Sơ tán khẩn cấp</li>
                <li>📊 <span className="font-bold">M≥6.0</span>: Tìm nơi trú ẩn</li>
                <li>ℹ️ <span className="font-bold">M≥5.0</span>: Theo dõi tin tức</li>
                <li>🔄 Dữ liệu USGS real-time</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
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

