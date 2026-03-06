"use client"

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Cloud, CloudRain, Sun, Wind, Droplets, Eye, RefreshCw, Loader2 } from "lucide-react";

interface WeatherMapProps {
  apiEndpoint: string;
}

export function WorldWeatherMap({ apiEndpoint }: WeatherMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [weatherData, setWeatherData] = useState<any[]>([]);
  const [earthquakeData, setEarthquakeData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState<any>(null);
  const [selectedEarthquake, setSelectedEarthquake] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [showEarthquakes, setShowEarthquakes] = useState(true);

  const loadWorldWeather = async () => {
    setLoading(true);
    try {
      // Fetch weather
      const weatherResponse = await fetch(`${apiEndpoint}/weather/world-map`);
      if (weatherResponse.ok) {
        const weatherData = await weatherResponse.json();
        if (weatherData.success) {
          setWeatherData(weatherData.cities || []);
        }
      }
      
      // Fetch earthquakes
      const eqResponse = await fetch(`${apiEndpoint}/earthquakes/recent`);
      if (eqResponse.ok) {
        const eqData = await eqResponse.json();
        if (eqData.success) {
          setEarthquakeData(eqData.earthquakes || []);
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
    loadWorldWeather();
    // Auto refresh every 10 minutes
    const interval = setInterval(loadWorldWeather, 600000);
    return () => clearInterval(interval);
  }, [apiEndpoint]);

  // Draw world map
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.fillStyle = '#E0F2FE';
    ctx.fillRect(0, 0, width, height);

    // Draw simplified world map outline
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo((width / 4) * i, 0);
      ctx.lineTo((width / 4) * i, height);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(0, (height / 3) * i);
      ctx.lineTo(width, (height / 3) * i);
      ctx.stroke();
    }

    // Plot earthquakes (if enabled)
    if (showEarthquakes) {
      earthquakeData.forEach((eq) => {
        const lat = eq.coordinates.lat;
        const lon = eq.coordinates.lon;
        
        const x = ((lon + 180) / 360) * width;
        const y = ((90 - lat) / 180) * height;

        // Size and color based on magnitude
        const mag = eq.magnitude;
        let radius = 3 + mag * 2;
        let color = '#FCD34D';
        if (mag >= 7) color = '#DC2626';
        else if (mag >= 5) color = '#F97316';
        else if (mag >= 4) color = '#FBBF24';
        
        // Draw pulsing circle
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = color + '80';
        ctx.fill();
        
        // Outer ring
        ctx.beginPath();
        ctx.arc(x, y, radius + 3, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    }

    // Plot cities
    weatherData.forEach((city) => {
      const lat = city.coordinates.lat;
      const lon = city.coordinates.lon;
      
      const x = ((lon + 180) / 360) * width;
      const y = ((90 - lat) / 180) * height;

      // Weather icon color
      const temp = city.temperature.current;
      let color = '#3B82F6';
      if (temp > 30) color = '#EF4444';
      else if (temp > 20) color = '#F59E0B';
      else if (temp > 10) color = '#22C55E';
      else color = '#3B82F6';

      // Draw circle
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw city name (small)
      ctx.fillStyle = '#1F2937';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(city.display_name || city.city, x, y - 12);
    });

  }, [weatherData, earthquakeData, showEarthquakes]);

  const getWeatherIcon = (weather: string) => {
    const w = weather.toLowerCase();
    if (w.includes('rain') || w.includes('mưa')) return <CloudRain className="h-5 w-5" />;
    if (w.includes('cloud') || w.includes('mây')) return <Cloud className="h-5 w-5" />;
    if (w.includes('clear') || w.includes('nắng')) return <Sun className="h-5 w-5" />;
    return <Cloud className="h-5 w-5" />;
  };

  return (
    <div className="space-y-4">
      {/* World Map */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              🌍 Bản đồ Thời tiết Thế giới
            </CardTitle>
            <div className="flex items-center gap-2">
              {lastUpdate && (
                <span className="text-sm text-gray-600">
                  Cập nhật: {lastUpdate}
                </span>
              )}
              <Button 
                onClick={() => setShowEarthquakes(!showEarthquakes)}
                variant={showEarthquakes ? "default" : "outline"}
                size="sm"
                className="mr-2"
              >
                {showEarthquakes ? "🌋 Ẩn" : "🌋 Hiện"} động đất
              </Button>
              <Button 
                onClick={loadWorldWeather} 
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
        </CardHeader>
        <CardContent>
          <canvas
            ref={canvasRef}
            width={1200}
            height={600}
            className="w-full rounded-lg border-2 border-gray-300 cursor-crosshair"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = ((e.clientX - rect.left) / rect.width) * 1200;
              const y = ((e.clientY - rect.top) / rect.height) * 600;
              
              // Find closest city
              let closest = null;
              let minDist = Infinity;
              
              weatherData.forEach((city) => {
                const cx = ((city.coordinates.lon + 180) / 360) * 1200;
                const cy = ((90 - city.coordinates.lat) / 180) * 600;
                const dist = Math.sqrt((x - cx)**2 + (y - cy)**2);
                
                if (dist < minDist && dist < 30) {
                  minDist = dist;
                  closest = city;
                }
              });
              
              if (closest) setSelectedCity(closest);
            }}
          />
          
          {/* Legend */}
          <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-semibold mb-2 text-gray-700">🌡️ Nhiệt độ:</div>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                  <span>&gt; 30°C</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
                  <span>20-30°C</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                  <span>10-20°C</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                  <span>&lt; 10°C</span>
                </div>
              </div>
            </div>
            <div>
              <div className="font-semibold mb-2 text-gray-700">🌋 Động đất:</div>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-600 rounded-full"></div>
                  <span>M ≥ 7.0</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
                  <span>M ≥ 5.0</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-400 rounded-full"></div>
                  <span>M &lt; 5.0</span>
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
              🌋 Động đất 24h qua
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center p-3 bg-white rounded-lg">
                <div className="text-3xl font-bold text-orange-700">{earthquakeData.length}</div>
                <div className="text-sm text-gray-600">Trận động đất</div>
              </div>
              <div className="text-center p-3 bg-white rounded-lg">
                <div className="text-3xl font-bold text-red-700">
                  {Math.max(...earthquakeData.map(eq => eq.magnitude || 0)).toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">Cường độ lớn nhất</div>
              </div>
              <div className="text-center p-3 bg-white rounded-lg">
                <div className="text-3xl font-bold text-yellow-700">
                  {(earthquakeData.reduce((sum, eq) => sum + (eq.magnitude || 0), 0) / earthquakeData.length).toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">Trung bình</div>
              </div>
              <div className="text-center p-3 bg-white rounded-lg">
                <div className="text-3xl font-bold text-purple-700">
                  {earthquakeData.filter(eq => eq.magnitude >= 5.0).length}
                </div>
                <div className="text-sm text-gray-600">Mạnh (≥5.0)</div>
              </div>
            </div>
            
            {/* Recent earthquakes list */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {earthquakeData.slice(0, 10).map((eq) => (
                <div 
                  key={eq.id}
                  className="p-3 bg-white rounded-lg border hover:border-orange-300 cursor-pointer transition-colors"
                  onClick={() => setSelectedEarthquake(eq)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">
                        M{eq.magnitude?.toFixed(1)} - {eq.place}
                      </div>
                      <div className="text-xs text-gray-600">
                        {new Date(eq.datetime).toLocaleString('vi-VN')}
                      </div>
                    </div>
                    <Badge className={
                      eq.magnitude >= 7 ? "bg-red-600" :
                      eq.magnitude >= 5 ? "bg-orange-500" :
                      "bg-yellow-500"
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

      {/* Selected City Detail */}
      {selectedCity && (
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getWeatherIcon(selectedCity.weather.description)}
              {selectedCity.display_name || selectedCity.city}, {selectedCity.country}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-700">
                  {selectedCity.temperature.current.toFixed(1)}°C
                </div>
                <div className="text-sm text-gray-600">Nhiệt độ</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-700 flex items-center justify-center gap-2">
                  <Droplets className="h-5 w-5" />
                  {selectedCity.humidity}%
                </div>
                <div className="text-sm text-gray-600">Độ ẩm</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-700 flex items-center justify-center gap-2">
                  <Wind className="h-5 w-5" />
                  {selectedCity.wind.speed.toFixed(1)} m/s
                </div>
                <div className="text-sm text-gray-600">Gió</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-700 flex items-center justify-center gap-2">
                  <Eye className="h-5 w-5" />
                  {(selectedCity.visibility / 1000).toFixed(1)} km
                </div>
                <div className="text-sm text-gray-600">Tầm nhìn</div>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-blue-100 rounded-lg">
              <div className="flex items-center gap-2 text-blue-900">
                {getWeatherIcon(selectedCity.weather.description)}
                <span className="font-medium capitalize">
                  {selectedCity.weather.description}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cities List */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {weatherData.map((city) => (
          <Card 
            key={city.city}
            className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-blue-300"
            onClick={() => setSelectedCity(city)}
          >
            <CardContent className="p-3">
              <div className="text-center">
                <div className="font-bold text-gray-900 mb-1">
                  {city.display_name || city.city}
                </div>
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {city.temperature.current.toFixed(0)}°C
                </div>
                <div className="flex items-center justify-center gap-1 text-xs text-gray-600">
                  {getWeatherIcon(city.weather.description)}
                  <span className="capitalize">{city.weather.main}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

