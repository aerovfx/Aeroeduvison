# 🌍 Weather & Earthquake Module - Complete!

## ✅ Features Hoàn chỉnh

### 1. 🌤️ **Weather Data** (OpenWeatherMap)
- Real-time weather cho 15+ thành phố
- Temperature, humidity, wind, visibility
- 5-day forecast
- Auto-refresh mỗi 10 phút
- API: https://openweathermap.org
- Key: `b766ab6d7b5f11f60bb8be5484125bbb`

### 2. 🌋 **Earthquake Data** (USGS)
- Real-time earthquake data toàn cầu
- Multiple timeframes: Hour, Day, Week, Month
- Magnitude filters: M1.0+, M2.5+, M4.5+, Significant
- Statistics: Max, avg, count
- API: https://earthquake.usgs.gov/earthquakes/feed/v1.0/atom.php
- Format: GeoJSON

## 🗺️ Visualization

### World Map Canvas
- **Weather cities**: Colored dots theo nhiệt độ
  - 🔴 Red: > 30°C (nóng)
  - 🟠 Orange: 20-30°C (ấm)
  - 🟢 Green: 10-20°C (mát)
  - 🔵 Blue: < 10°C (lạnh)

- **Earthquakes**: Pulsing circles theo magnitude
  - 🔴 Red: M ≥ 7.0 (rất mạnh)
  - 🟠 Orange: M ≥ 5.0 (mạnh)
  - 🟡 Yellow: M < 5.0 (trung bình)
  - Size: Lớn hơn = magnitude cao hơn

### Interactive Features
- Click city → Xem chi tiết thời tiết
- Click earthquake → Xem thông tin động đất
- Toggle button: Hiện/Ẩn động đất
- Auto-refresh data
- Responsive grid cities

## 📡 API Endpoints

**Base URL**: `http://localhost:8013`

### Weather:
- `POST /weather/current` - Current weather
- `POST /weather/forecast` - 5-day forecast
- `GET /weather/world-map` - All cities weather
- `GET /weather/cities` - Available cities list

### Earthquakes (NEW!):
- `GET /earthquakes/recent` - Past day, M2.5+ (default)
- `GET /earthquakes/{timeframe}/{magnitude}` - Custom query
  - Timeframes: `hour`, `day`, `week`, `month`
  - Magnitudes: `1.0`, `2.5`, `4.5`, `significant`, `all`

### Examples:
```bash
# Recent earthquakes (24h, M2.5+)
curl http://localhost:8013/earthquakes/recent

# Past week, M4.5+
curl http://localhost:8013/earthquakes/week/4.5

# Significant earthquakes past month
curl http://localhost:8013/earthquakes/month/significant
```

## 🎨 UI Components

### WorldWeatherMap Component
**Features**:
- Dual data sources (Weather + Earthquake)
- Interactive canvas map
- Real-time updates
- Toggle earthquake display
- Stats cards for earthquakes
- List of recent earthquakes (top 10)

### Earthquake Stats Display
- 📊 Total count
- 🔴 Max magnitude
- 📈 Average magnitude
- 🌋 Significant count (M ≥ 5.0)

### Recent Earthquakes List
- Top 10 most recent
- Magnitude badges (color-coded)
- Location and time
- Click to see details

## 🌐 Data Sources

### 1. OpenWeatherMap
**URL**: https://openweathermap.org  
**Docs**: https://openweathermap.org/api  
**API Key**: `b766ab6d7b5f11f60bb8be5484125bbb`  
**Rate Limit**: 60 calls/min, 1M calls/month (free tier)

### 2. USGS Earthquake
**URL**: https://earthquake.usgs.gov  
**Feed**: https://earthquake.usgs.gov/earthquakes/feed/v1.0/atom.php  
**Format**: GeoJSON  
**Update**: Real-time (updated every minute)  
**No API Key Required**: Free public data

## 📊 Response Format

### Earthquake Response:
```json
{
  "success": true,
  "timeframe": "day",
  "magnitude_filter": "2.5",
  "count": 40,
  "earthquakes": [
    {
      "id": "us7000nxxx",
      "magnitude": 5.7,
      "place": "125 km SSE of Tokyo, Japan",
      "time": 1697234567000,
      "datetime": "2025-10-13T12:30:00",
      "coordinates": {
        "lon": 139.75,
        "lat": 35.68,
        "depth": 10.5
      },
      "url": "https://earthquake.usgs.gov/...",
      "tsunami": 0,
      "type": "earthquake",
      "title": "M 5.7 - Japan"
    }
  ],
  "statistics": {
    "count": 40,
    "max_magnitude": 5.7,
    "avg_magnitude": 4.0,
    "significant_count": 2
  }
}
```

## 🎯 Access

### UI:
```
http://localhost:3000/dashboard/weather
```

### API:
```
http://localhost:8013
http://localhost:8013/docs  (Swagger UI)
```

### Test:
```bash
# Weather
curl -X POST http://localhost:8013/weather/current \
  -H "Content-Type: application/json" \
  -d '{"city": "Hanoi,VN"}'

# Earthquakes
curl http://localhost:8013/earthquakes/recent
```

## ⚠️ Important Notes

### Security:
- Move API key to environment variable in production
- Add rate limiting
- Cache responses

### Performance:
- Weather: Cache 10 min
- Earthquakes: Cache 5 min
- Combine both calls in `/world-map`

### Error Handling:
- Graceful fallback if API fails
- Show cached data if available
- User-friendly error messages

## 📚 Educational Value

Students learn:
- ✅ Real-time API integration
- ✅ Geography & world map
- ✅ Weather phenomena
- ✅ Earthquake science
- ✅ Data visualization
- ✅ Multiple data sources
- ✅ GeoJSON format

## 🎓 Science Concepts

### Weather:
- Temperature distribution
- Atmospheric pressure
- Wind patterns
- Humidity & precipitation

### Earthquakes:
- Richter/Moment magnitude scale
- Seismic activity patterns
- Tectonic plate boundaries
- Tsunami warnings
- Depth vs surface effects

## 🔗 References

- [OpenWeatherMap API](https://openweathermap.org/api)
- [USGS Earthquake Feeds](https://earthquake.usgs.gov/earthquakes/feed/v1.0/atom.php)
- [GeoJSON Specification](https://geojson.org/)

---

**Port**: 8013  
**APIs Integrated**: 2 (Weather + Earthquake)  
**Cities Tracked**: 15  
**Real-time**: Yes  
**Auto-refresh**: 10 minutes  
**Status**: ✅ Complete & Running

Created: 2025-10-13  
Updated: 2025-10-13



