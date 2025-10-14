"""
ThermoFlow API
FastAPI server for heat transfer simulation
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import uvicorn
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent))

from main import simulate_heat_transfer, predict_hot_zones
import numpy as np

app = FastAPI(title="ThermoFlow API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class HeatSource(BaseModel):
    x: int
    y: int
    temperature: float
    radius: int = 5


class Obstacle(BaseModel):
    x: int
    y: int
    width: int
    height: int
    conductivity: float = 0.5


class SimulationConfig(BaseModel):
    width: int = 100
    height: int = 100
    thermal_diffusivity: float = 0.1
    steps: int = 100
    initial_temperature: float = 20
    heat_sources: List[HeatSource] = []
    heat_sinks: List[HeatSource] = []
    obstacles: List[Obstacle] = []


class PredictionRequest(BaseModel):
    threshold_factor: float = 1.5


@app.get("/")
async def root():
    return {
        "name": "ThermoFlow API",
        "version": "1.0.0",
        "status": "running",
        "description": "Heat transfer and thermal flow simulation",
        "endpoints": [
            "/simulate",
            "/predict-hot-zones",
            "/presets"
        ]
    }


@app.post("/simulate")
async def run_simulation(config: SimulationConfig):
    """Run heat transfer simulation"""
    try:
        config_dict = config.dict()
        result = simulate_heat_transfer(config_dict)
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/presets")
async def get_presets():
    """Get preset configurations"""
    return {
        "presets": [
            {
                "id": "single_source",
                "name": "Single Heat Source",
                "description": "Một nguồn nhiệt ở trung tâm",
                "icon": "🔥",
                "config": {
                    "width": 100,
                    "height": 100,
                    "thermal_diffusivity": 0.15,
                    "steps": 100,
                    "initial_temperature": 20,
                    "heat_sources": [
                        {"x": 50, "y": 50, "temperature": 100, "radius": 10}
                    ],
                    "heat_sinks": [],
                    "obstacles": []
                }
            },
            {
                "id": "two_sources",
                "name": "Two Heat Sources",
                "description": "Hai nguồn nhiệt tương tác",
                "icon": "🔥🔥",
                "config": {
                    "width": 100,
                    "height": 100,
                    "thermal_diffusivity": 0.1,
                    "steps": 100,
                    "initial_temperature": 20,
                    "heat_sources": [
                        {"x": 25, "y": 50, "temperature": 100, "radius": 8},
                        {"x": 75, "y": 50, "temperature": 90, "radius": 8}
                    ],
                    "heat_sinks": [],
                    "obstacles": []
                }
            },
            {
                "id": "cooling_system",
                "name": "Cooling System",
                "description": "Hệ thống làm mát với heat sink",
                "icon": "❄️",
                "config": {
                    "width": 100,
                    "height": 100,
                    "thermal_diffusivity": 0.12,
                    "steps": 100,
                    "initial_temperature": 60,
                    "heat_sources": [
                        {"x": 50, "y": 50, "temperature": 100, "radius": 12}
                    ],
                    "heat_sinks": [
                        {"x": 25, "y": 25, "temperature": -30, "radius": 8},
                        {"x": 75, "y": 25, "temperature": -30, "radius": 8},
                        {"x": 25, "y": 75, "temperature": -30, "radius": 8},
                        {"x": 75, "y": 75, "temperature": -30, "radius": 8}
                    ],
                    "obstacles": []
                }
            },
            {
                "id": "insulation",
                "name": "Thermal Insulation",
                "description": "Vật liệu cách nhiệt",
                "icon": "🧱",
                "config": {
                    "width": 100,
                    "height": 100,
                    "thermal_diffusivity": 0.1,
                    "steps": 100,
                    "initial_temperature": 20,
                    "heat_sources": [
                        {"x": 30, "y": 50, "temperature": 100, "radius": 10}
                    ],
                    "heat_sinks": [],
                    "obstacles": [
                        {"x": 45, "y": 35, "width": 10, "height": 30, "conductivity": 0.1}
                    ]
                }
            },
            {
                "id": "heat_flow",
                "name": "Heat Flow Pattern",
                "description": "Dòng nhiệt phức tạp",
                "icon": "🌡️",
                "config": {
                    "width": 100,
                    "height": 100,
                    "thermal_diffusivity": 0.15,
                    "steps": 120,
                    "initial_temperature": 20,
                    "heat_sources": [
                        {"x": 20, "y": 20, "temperature": 90, "radius": 6},
                        {"x": 80, "y": 20, "temperature": 85, "radius": 6},
                        {"x": 50, "y": 80, "temperature": 95, "radius": 8}
                    ],
                    "heat_sinks": [
                        {"x": 50, "y": 50, "temperature": -15, "radius": 5}
                    ],
                    "obstacles": []
                }
            }
        ]
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    print("🔥 Starting ThermoFlow API...")
    print("📡 Server running on http://localhost:8010")
    print("📚 API docs available at http://localhost:8010/docs")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8010,
        log_level="info"
    )
