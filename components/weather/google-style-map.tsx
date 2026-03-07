"use client"

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Loader2, Plus, Minus, Maximize2, MapPin } from "lucide-react";

interface GoogleStyleMapProps {
  apiEndpoint: string;
}

export function GoogleStyleMap({ apiEndpoint }: GoogleStyleMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [weatherData, setWeatherData] = useState<any[]>([]);
  const [earthquakeData, setEarthquakeData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [showEarthquakes, setShowEarthquakes] = useState(true);
  const [showWeather, setShowWeather] = useState(true);
  
  // Map controls (giống Google Maps)
  const [zoom, setZoom] = useState(1.5);
  const [center, setCenter] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedMarker, setSelectedMarker] = useState<any>(null);

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

  // Draw map
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#E0F2FE');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Draw continents (simplified SVG-style)
    ctx.fillStyle = '#D4E5D4';
    ctx.strokeStyle = '#8B9D8B';
    ctx.lineWidth = 1;
    
    // Simple continent shapes
    drawContinent(ctx, width, height);

    // Draw grid (latitude/longitude lines)
    ctx.strokeStyle = 'rgba(150, 150, 150, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 12; i++) {
      // Longitude lines
      ctx.beginPath();
      ctx.moveTo((width / 12) * i * zoom + center.x, 0);
      ctx.lineTo((width / 12) * i * zoom + center.x, height);
      ctx.stroke();
    }
    for (let i = 0; i <= 6; i++) {
      // Latitude lines
      ctx.beginPath();
      ctx.moveTo(0, (height / 6) * i * zoom + center.y);
      ctx.lineTo(width, (height / 6) * i * zoom + center.y);
      ctx.stroke();
    }

    // Convert lat/lon to screen coordinates
    const latLonToScreen = (lat: number, lon: number) => {
      const x = ((lon + 180) / 360) * width * zoom + center.x;
      const y = ((90 - lat) / 180) * height * zoom + center.y;
      return { x, y };
    };

    // Draw earthquakes
    if (showEarthquakes) {
      earthquakeData.forEach((eq) => {
        const { x, y } = latLonToScreen(eq.coordinates.lat, eq.coordinates.lon);
        
        if (x < 0 || x > width || y < 0 || y > height) return;

        const mag = eq.magnitude;
        const radius = 4 + mag * 2.5;
        
        let color = '#FCD34D';
        if (mag >= 7) color = '#DC2626';
        else if (mag >= 5) color = '#F97316';
        else if (mag >= 4) color = '#FBBF24';

        // Pulsing effect
        ctx.beginPath();
        ctx.arc(x, y, radius + 4, 0, Math.PI * 2);
        ctx.fillStyle = color + '30';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = color + 'CC';
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    }

    // Draw weather markers
    if (showWeather) {
      weatherData.forEach((city) => {
        const { x, y } = latLonToScreen(city.coordinates.lat, city.coordinates.lon);
        
        if (x < 0 || x > width || y < 0 || y > height) return;

        const temp = city.temperature.current;
        let color = '#3B82F6';
        if (temp > 30) color = '#EF4444';
        else if (temp > 20) color = '#F59E0B';
        else if (temp > 10) color = '#22C55E';

        // Draw marker
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3;
        ctx.stroke();

        // City name
        ctx.fillStyle = '#1F2937';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(city.display_name || city.city, x, y - 15);
        
        // Temperature label
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText(`${temp.toFixed(0)}°`, x, y + 4);
      });
    }

  }, [weatherData, earthquakeData, showWeather, showEarthquakes, zoom, center]);

  const drawContinent = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    // Simplified continents
    // Asia
    ctx.beginPath();
    ctx.ellipse(w * 0.65, h * 0.35, w * 0.15, h * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Europe
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.3, w * 0.08, h * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Africa
    ctx.beginPath();
    ctx.ellipse(w * 0.52, h * 0.55, w * 0.1, h * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Americas
    ctx.beginPath();
    ctx.ellipse(w * 0.25, h * 0.4, w * 0.08, h * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Australia
    ctx.beginPath();
    ctx.ellipse(w * 0.8, h * 0.7, w * 0.06, h * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  };

  // Mouse handlers (giống Google Maps)
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - center.x, y: e.clientY - center.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setCenter({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(5, prev * 1.2));
  const handleZoomOut = () => setZoom(prev => Math.max(0.5, prev / 1.2));
  const handleReset = () => { setZoom(1.5); setCenter({ x: 0, y: 0 }); };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="flex items-center gap-2">
              🌍 Bản đồ Thời tiết & Động đất Thế giới
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button onClick={() => setShowWeather(!showWeather)} variant={showWeather ? "default" : "outline"} size="sm">
                {showWeather ? '🌡️ Ẩn' : '🌡️ Hiện'} thời tiết
              </Button>
              <Button onClick={() => setShowEarthquakes(!showEarthquakes)} variant={showEarthquakes ? "default" : "outline"} size="sm">
                {showEarthquakes ? '🌋 Ẩn' : '🌋 Hiện'} động đất
              </Button>
              <Button onClick={loadData} disabled={loading} variant="outline" size="sm">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 relative">
          <canvas
            ref={canvasRef}
            width={1400}
            height={700}
            className="w-full cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
          
          {/* Zoom Controls (giống Google Maps) */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-2 bg-white rounded-lg shadow-lg p-1">
            <Button onClick={handleZoomIn} size="sm" variant="ghost" className="h-8 w-8 p-0">
              <Plus className="h-4 w-4" />
            </Button>
            <div className="h-px bg-gray-300"></div>
            <Button onClick={handleZoomOut} size="sm" variant="ghost" className="h-8 w-8 p-0">
              <Minus className="h-4 w-4" />
            </Button>
            <div className="h-px bg-gray-300"></div>
            <Button onClick={handleReset} size="sm" variant="ghost" className="h-8 w-8 p-0">
              <Maximize2 className="h-3 w-3" />
            </Button>
          </div>

          {/* Info overlay */}
          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur rounded-lg p-3 shadow-lg text-sm">
            <div className="font-semibold mb-1">🗺️ Điều khiển:</div>
            <div className="text-gray-600 space-y-1">
              <div>🖱️ Kéo thả để di chuyển</div>
              <div>🔍 Zoom: {zoom.toFixed(1)}x</div>
              <div className="text-xs pt-1 border-t">
                {lastUpdate && `Cập nhật: ${lastUpdate}`}
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
              🌋 Động đất 24h qua (USGS Data)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center p-4 bg-white rounded-xl shadow-sm">
                <div className="text-4xl font-bold text-orange-700">{earthquakeData.length}</div>
                <div className="text-sm text-gray-600">Trận động đất</div>
              </div>
              <div className="text-center p-4 bg-white rounded-xl shadow-sm">
                <div className="text-4xl font-bold text-red-700">
                  {Math.max(...earthquakeData.map(eq => eq.magnitude || 0)).toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">Cường độ max</div>
              </div>
              <div className="text-center p-4 bg-white rounded-xl shadow-sm">
                <div className="text-4xl font-bold text-yellow-700">
                  {(earthquakeData.reduce((sum, eq) => sum + (eq.magnitude || 0), 0) / earthquakeData.length).toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">Trung bình</div>
              </div>
              <div className="text-center p-4 bg-white rounded-xl shadow-sm">
                <div className="text-4xl font-bold text-purple-700">
                  {earthquakeData.filter(eq => eq.magnitude >= 5.0).length}
                </div>
                <div className="text-sm text-gray-600">Mạnh (M≥5.0)</div>
              </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {earthquakeData.slice(0, 15).map((eq) => (
                <div 
                  key={eq.id}
                  className="p-3 bg-white rounded-lg border-2 hover:border-orange-400 transition-all cursor-pointer hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-bold text-gray-900 flex items-center gap-2">
                        🌋 {eq.place}
                        {eq.tsunami > 0 && (
                          <Badge className="bg-red-600 text-white">⚠️ Tsunami</Badge>
                        )}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        📅 {new Date(eq.datetime).toLocaleString('vi-VN')} • 
                        📏 Sâu {eq.coordinates.depth.toFixed(1)}km
                      </div>
                    </div>
                    <Badge className={
                      eq.magnitude >= 7 ? "bg-red-600 text-white text-lg px-3" :
                      eq.magnitude >= 5 ? "bg-orange-500 text-white text-lg px-3" :
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

      {/* Cities Weather Cards */}
      {showWeather && weatherData.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {weatherData.map((city) => (
            <Card 
              key={city.city}
              className="hover:shadow-xl transition-all cursor-pointer border-2 hover:border-blue-400"
            >
              <CardContent className="p-4 text-center">
                <div className="text-2xl mb-2">{getWeatherEmoji(city.weather.main)}</div>
                <div className="font-bold text-gray-900 mb-1">
                  {city.display_name || city.city}
                </div>
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {city.temperature.current.toFixed(0)}°C
                </div>
                <div className="text-xs text-gray-600 capitalize mb-2">
                  {city.weather.description}
                </div>
                <div className="flex items-center justify-center gap-3 text-xs text-gray-600">
                  <span>💨 {city.wind.speed.toFixed(1)}m/s</span>
                  <span>💧 {city.humidity}%</span>
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
  const w = weather.toLowerCase();
  if (w.includes('clear')) return '☀️';
  if (w.includes('cloud')) return '☁️';
  if (w.includes('rain')) return '🌧️';
  if (w.includes('snow')) return '❄️';
  if (w.includes('thunder')) return '⛈️';
  return '🌤️';
}

