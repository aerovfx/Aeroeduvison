"""
Weather Simulation Module
Tích hợp OpenWeatherMap API để hiển thị thời tiết thực
"""

import requests
import json
from typing import Dict, List, Optional
from datetime import datetime, timedelta


class WeatherAPI:
    """OpenWeatherMap API wrapper"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.openweathermap.org/data/2.5"
    
    def get_current_weather(self, city: str = None, lat: float = None, lon: float = None) -> Dict:
        """Get current weather for a location"""
        
        params = {
            'appid': self.api_key,
            'units': 'metric',
            'lang': 'vi'
        }
        
        if city:
            params['q'] = city
        elif lat is not None and lon is not None:
            params['lat'] = lat
            params['lon'] = lon
        else:
            raise ValueError("Either city or lat/lon must be provided")
        
        try:
            response = requests.get(f"{self.base_url}/weather", params=params)
            response.raise_for_status()
            data = response.json()
            
            return {
                'success': True,
                'city': data['name'],
                'country': data['sys']['country'],
                'coordinates': {
                    'lat': data['coord']['lat'],
                    'lon': data['coord']['lon']
                },
                'weather': {
                    'main': data['weather'][0]['main'],
                    'description': data['weather'][0]['description'],
                    'icon': data['weather'][0]['icon']
                },
                'temperature': {
                    'current': data['main']['temp'],
                    'feels_like': data['main']['feels_like'],
                    'min': data['main']['temp_min'],
                    'max': data['main']['temp_max']
                },
                'wind': {
                    'speed': data['wind']['speed'],
                    'deg': data['wind'].get('deg', 0)
                },
                'humidity': data['main']['humidity'],
                'pressure': data['main']['pressure'],
                'visibility': data.get('visibility', 0),
                'clouds': data['clouds']['all'],
                'timestamp': data['dt'],
                'timezone': data['timezone']
            }
            
        except requests.exceptions.RequestException as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_forecast(self, city: str = None, lat: float = None, lon: float = None, days: int = 5) -> Dict:
        """Get weather forecast"""
        
        params = {
            'appid': self.api_key,
            'units': 'metric',
            'lang': 'vi',
            'cnt': days * 8  # 8 forecasts per day (3-hour intervals)
        }
        
        if city:
            params['q'] = city
        elif lat is not None and lon is not None:
            params['lat'] = lat
            params['lon'] = lon
        else:
            raise ValueError("Either city or lat/lon must be provided")
        
        try:
            response = requests.get(f"{self.base_url}/forecast", params=params)
            response.raise_for_status()
            data = response.json()
            
            forecasts = []
            for item in data['list']:
                forecasts.append({
                    'timestamp': item['dt'],
                    'datetime': datetime.fromtimestamp(item['dt']).isoformat(),
                    'temperature': item['main']['temp'],
                    'feels_like': item['main']['feels_like'],
                    'weather': item['weather'][0]['description'],
                    'icon': item['weather'][0]['icon'],
                    'wind_speed': item['wind']['speed'],
                    'humidity': item['main']['humidity'],
                    'pop': item.get('pop', 0) * 100  # Probability of precipitation
                })
            
            return {
                'success': True,
                'city': data['city']['name'],
                'country': data['city']['country'],
                'coordinates': {
                    'lat': data['city']['coord']['lat'],
                    'lon': data['city']['coord']['lon']
                },
                'forecasts': forecasts
            }
            
        except requests.exceptions.RequestException as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_multiple_cities_weather(self, cities: List[str]) -> List[Dict]:
        """Get weather for multiple cities"""
        results = []
        
        for city in cities:
            weather = self.get_current_weather(city=city)
            if weather['success']:
                results.append(weather)
        
        return results


# Major cities for world map
MAJOR_CITIES = [
    {"name": "Hanoi,VN", "display": "Hà Nội"},
    {"name": "Ho Chi Minh,VN", "display": "TP.HCM"},
    {"name": "Da Nang,VN", "display": "Đà Nẵng"},
    {"name": "Tokyo,JP", "display": "Tokyo"},
    {"name": "Seoul,KR", "display": "Seoul"},
    {"name": "Beijing,CN", "display": "Beijing"},
    {"name": "Singapore,SG", "display": "Singapore"},
    {"name": "Bangkok,TH", "display": "Bangkok"},
    {"name": "London,UK", "display": "London"},
    {"name": "Paris,FR", "display": "Paris"},
    {"name": "New York,US", "display": "New York"},
    {"name": "Los Angeles,US", "display": "Los Angeles"},
    {"name": "Sydney,AU", "display": "Sydney"},
    {"name": "Moscow,RU", "display": "Moscow"},
    {"name": "Dubai,AE", "display": "Dubai"}
]


def get_world_weather(api_key: str) -> Dict:
    """Get weather data for world map"""
    
    api = WeatherAPI(api_key)
    
    weather_data = []
    for city_info in MAJOR_CITIES:
        try:
            weather = api.get_current_weather(city=city_info["name"])
            if weather['success']:
                weather['display_name'] = city_info["display"]
                weather_data.append(weather)
        except Exception as e:
            print(f"Error fetching {city_info['name']}: {e}")
    
    return {
        'success': True,
        'timestamp': datetime.now().isoformat(),
        'cities': weather_data,
        'total_cities': len(weather_data)
    }


class EarthquakeAPI:
    """USGS Earthquake API wrapper"""
    
    def __init__(self):
        self.base_url = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary"
    
    def get_recent_earthquakes(self, timeframe: str = "day", magnitude: str = "2.5") -> Dict:
        """
        Get recent earthquakes from USGS
        
        Timeframe: 'hour', 'day', 'week', 'month'
        Magnitude: '1.0', '2.5', '4.5', 'significant', 'all'
        
        Source: https://earthquake.usgs.gov/earthquakes/feed/v1.0/atom.php
        """
        
        # Construct feed URL
        if magnitude == 'significant':
            url = f"{self.base_url}/significant_{timeframe}.geojson"
        elif magnitude == 'all':
            url = f"{self.base_url}/all_{timeframe}.geojson"
        else:
            url = f"{self.base_url}/{magnitude}_{timeframe}.geojson"
        
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            earthquakes = []
            for feature in data['features']:
                props = feature['properties']
                coords = feature['geometry']['coordinates']
                
                earthquakes.append({
                    'id': feature['id'],
                    'magnitude': props['mag'],
                    'place': props['place'],
                    'time': props['time'],
                    'datetime': datetime.fromtimestamp(props['time'] / 1000).isoformat(),
                    'coordinates': {
                        'lon': coords[0],
                        'lat': coords[1],
                        'depth': coords[2]
                    },
                    'url': props['url'],
                    'tsunami': props.get('tsunami', 0),
                    'type': props['type'],
                    'title': props['title']
                })
            
            return {
                'success': True,
                'timeframe': timeframe,
                'magnitude_filter': magnitude,
                'count': len(earthquakes),
                'earthquakes': earthquakes,
                'metadata': {
                    'generated': data['metadata']['generated'],
                    'api': data['metadata']['api']
                }
            }
            
        except requests.exceptions.RequestException as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_earthquake_stats(self, earthquakes: List[Dict]) -> Dict:
        """Calculate statistics from earthquake data"""
        if not earthquakes:
            return {
                'count': 0,
                'max_magnitude': 0,
                'avg_magnitude': 0,
                'total_energy': 0
            }
        
        magnitudes = [eq['magnitude'] for eq in earthquakes if eq['magnitude']]
        
        return {
            'count': len(earthquakes),
            'max_magnitude': max(magnitudes) if magnitudes else 0,
            'min_magnitude': min(magnitudes) if magnitudes else 0,
            'avg_magnitude': sum(magnitudes) / len(magnitudes) if magnitudes else 0,
            'significant_count': len([m for m in magnitudes if m >= 5.0]),
            'major_count': len([m for m in magnitudes if m >= 7.0])
        }


if __name__ == "__main__":
    # Test with provided API key
    API_KEY = "b766ab6d7b5f11f60bb8be5484125bbb"
    
    print("🌍 Fetching world weather data...")
    
    api = WeatherAPI(API_KEY)
    
    # Test Hanoi weather
    print("\n1. Testing Hanoi weather...")
    hanoi = api.get_current_weather(city="Hanoi,VN")
    if hanoi['success']:
        print(f"   ✅ {hanoi['city']}, {hanoi['country']}")
        print(f"   🌡️  Temperature: {hanoi['temperature']['current']:.1f}°C")
        print(f"   ☁️  Weather: {hanoi['weather']['description']}")
    
    # Test forecast
    print("\n2. Testing forecast...")
    forecast = api.get_forecast(city="Hanoi,VN", days=3)
    if forecast['success']:
        print(f"   ✅ Got {len(forecast['forecasts'])} forecast points")
    
    # Test earthquakes
    print("\n3. Testing earthquake data...")
    eq_api = EarthquakeAPI()
    earthquakes = eq_api.get_recent_earthquakes(timeframe='day', magnitude='2.5')
    if earthquakes['success']:
        print(f"   ✅ Found {earthquakes['count']} earthquakes in past day")
        stats = eq_api.get_earthquake_stats(earthquakes['earthquakes'])
        print(f"   📊 Max magnitude: {stats['max_magnitude']:.1f}")
        print(f"   📊 Avg magnitude: {stats['avg_magnitude']:.1f}")

