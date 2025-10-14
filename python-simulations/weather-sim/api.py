"""
Weather Simulation API
Real-time weather data from OpenWeatherMap
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import uvicorn
import sys
import os
from pathlib import Path

sys.path.append(str(Path(__file__).parent))

from main import WeatherAPI, EarthquakeAPI, get_world_weather, MAJOR_CITIES
from weather_ai import WeatherAI

app = FastAPI(title="Weather Simulation API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Keys
API_KEY = os.getenv("OPENWEATHER_API_KEY", "b766ab6d7b5f11f60bb8be5484125bbb")
weather_api = WeatherAPI(API_KEY)
earthquake_api = EarthquakeAPI()


class WeatherRequest(BaseModel):
    city: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None


@app.get("/")
async def root():
    return {
        "name": "Weather Simulation API",
        "version": "1.0.0",
        "status": "running",
        "description": "Real-time weather data integration",
        "api_provider": "OpenWeatherMap",
        "endpoints": [
            "/weather/current",
            "/weather/forecast",
            "/weather/world-map",
            "/weather/cities"
        ]
    }


@app.get("/weather/current")
async def get_current_weather_get(city: Optional[str] = None, lat: Optional[float] = None, lon: Optional[float] = None):
    """Get current weather for a location (GET method)"""
    try:
        if city:
            result = weather_api.get_current_weather(city=city)
        elif lat is not None and lon is not None:
            result = weather_api.get_current_weather(lat=lat, lon=lon)
        else:
            raise HTTPException(status_code=400, detail="Either city or lat/lon required")
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/weather/current")
async def get_current_weather_post(request: WeatherRequest):
    """Get current weather for a location (POST method)"""
    try:
        if request.city:
            result = weather_api.get_current_weather(city=request.city)
        elif request.lat is not None and request.lon is not None:
            result = weather_api.get_current_weather(lat=request.lat, lon=request.lon)
        else:
            raise HTTPException(status_code=400, detail="Either city or lat/lon required")
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/weather/forecast")
async def get_forecast(request: WeatherRequest):
    """Get weather forecast"""
    try:
        if request.city:
            result = weather_api.get_forecast(city=request.city)
        elif request.lat is not None and request.lon is not None:
            result = weather_api.get_forecast(lat=request.lat, lon=request.lon)
        else:
            raise HTTPException(status_code=400, detail="Either city or lat/lon required")
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/weather/world-map")
async def get_world_map_weather():
    """Get weather for major cities on world map"""
    try:
        result = get_world_weather(API_KEY)
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/weather/cities")
async def get_available_cities():
    """Get list of available cities"""
    return {
        "cities": MAJOR_CITIES
    }


@app.get("/earthquakes/{timeframe}/{magnitude}")
async def get_earthquakes(timeframe: str = "day", magnitude: str = "2.5"):
    """
    Get recent earthquakes from USGS
    
    Timeframes: hour, day, week, month
    Magnitudes: 1.0, 2.5, 4.5, significant, all
    
    Source: https://earthquake.usgs.gov/earthquakes/feed/v1.0/atom.php
    """
    try:
        result = earthquake_api.get_recent_earthquakes(timeframe, magnitude)
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/earthquakes/recent")
async def get_recent_earthquakes_default():
    """Get earthquakes from past day, M2.5+"""
    try:
        result = earthquake_api.get_recent_earthquakes(timeframe='day', magnitude='2.5')
        
        if result['success']:
            stats = earthquake_api.get_earthquake_stats(result['earthquakes'])
            result['statistics'] = stats
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ai/predict-storm")
async def predict_storm(request: WeatherRequest):
    """AI: Dự báo bão / áp thấp nhiệt đới"""
    try:
        # Get weather data
        if request.city:
            weather = weather_api.get_current_weather(city=request.city)
        elif request.lat and request.lon:
            weather = weather_api.get_current_weather(lat=request.lat, lon=request.lon)
        else:
            raise HTTPException(status_code=400, detail="City or coordinates required")
        
        if not weather['success']:
            raise HTTPException(status_code=404, detail="Weather data not found")
        
        # AI prediction
        prediction = WeatherAI.predict_tropical_storm(weather)
        prediction['location'] = weather['city']
        
        return prediction
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ai/predict-flood")
async def predict_flood(request: WeatherRequest, terrain: str = "urban"):
    """AI: Cảnh báo lũ quét"""
    try:
        if request.city:
            forecast = weather_api.get_forecast(city=request.city)
        elif request.lat and request.lon:
            forecast = weather_api.get_forecast(lat=request.lat, lon=request.lon)
        else:
            raise HTTPException(status_code=400, detail="City or coordinates required")
        
        if not forecast['success']:
            raise HTTPException(status_code=404, detail="Forecast not found")
        
        prediction = WeatherAI.predict_flash_flood(forecast['forecasts'], terrain)
        prediction['location'] = forecast['city']
        
        return prediction
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/ai/wind-energy/{city}")
async def predict_wind_energy(city: str):
    """AI: Dự đoán năng lượng gió"""
    try:
        forecast = weather_api.get_forecast(city=city)
        
        if not forecast['success']:
            raise HTTPException(status_code=404, detail="Forecast not found")
        
        prediction = WeatherAI.predict_wind_energy(forecast['forecasts'])
        prediction['location'] = city
        
        return prediction
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/ai/earthquake-alert/{earthquake_id}")
async def earthquake_alert(earthquake_id: str):
    """AI: Cảnh báo động đất"""
    try:
        # Get recent earthquakes
        eq_data = earthquake_api.get_recent_earthquakes('day', '2.5')
        
        if not eq_data['success']:
            raise HTTPException(status_code=404, detail="No earthquake data")
        
        # Find specific earthquake
        earthquake = next((eq for eq in eq_data['earthquakes'] if eq['id'] == earthquake_id), None)
        
        if not earthquake:
            raise HTTPException(status_code=404, detail="Earthquake not found")
        
        alert = WeatherAI.earthquake_early_warning(earthquake)
        
        return alert
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/ai/all-predictions")
async def get_all_predictions():
    """Get all AI predictions for demonstration"""
    return {
        "available_predictions": [
            {
                "id": "tropical_storm",
                "name": "Dự báo Bão / Áp thấp",
                "endpoint": "/ai/predict-storm",
                "icon": "🌀"
            },
            {
                "id": "flash_flood",
                "name": "Cảnh báo Lũ quét",
                "endpoint": "/ai/predict-flood",
                "icon": "🌊"
            },
            {
                "id": "infrastructure",
                "name": "Thiệt hại Hạ tầng",
                "endpoint": "/ai/infrastructure-risk",
                "icon": "🏗️"
            },
            {
                "id": "wind_energy",
                "name": "Năng lượng Gió",
                "endpoint": "/ai/wind-energy",
                "icon": "💨"
            },
            {
                "id": "agriculture",
                "name": "Nông nghiệp & Nước",
                "endpoint": "/ai/agriculture-forecast",
                "icon": "🌾"
            },
            {
                "id": "earthquake",
                "name": "Cảnh báo Động đất",
                "endpoint": "/ai/earthquake-alert",
                "icon": "🌋"
            },
            {
                "id": "severe_weather",
                "name": "Thời tiết Cực đoan",
                "endpoint": "/ai/severe-weather",
                "icon": "⛈️"
            },
            {
                "id": "transportation",
                "name": "Ảnh hưởng Giao thông",
                "endpoint": "/ai/transportation-impact",
                "icon": "✈️"
            }
        ]
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy", 
        "api_key_set": bool(API_KEY),
        "ai_features": 8
    }


if __name__ == "__main__":
    print("🌍 Starting Weather Simulation API...")
    print("📡 Server running on http://localhost:8013")
    print("🌤️  Using OpenWeatherMap API")
    print("📚 API docs available at http://localhost:8013/docs")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8013,
        log_level="info"
    )

