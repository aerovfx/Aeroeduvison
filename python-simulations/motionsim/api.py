"""
MotionSim API
FastAPI server for physics motion simulation
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict
import uvicorn
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent))

from main import simulate_motion, predict_motion

app = FastAPI(title="MotionSim API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class MotionConfig(BaseModel):
    motion_type: str = "projectile"
    v0: Optional[float] = 20
    angle: Optional[float] = 45
    h0: Optional[float] = 0
    g: Optional[float] = 9.8
    amplitude: Optional[float] = 1.0
    frequency: Optional[float] = 1.0
    phase: Optional[float] = 0
    duration: Optional[float] = 5


class PredictionRequest(BaseModel):
    motion_type: str = "projectile"
    initial_conditions: Dict
    target_conditions: Dict


@app.get("/")
async def root():
    return {
        "name": "MotionSim API",
        "version": "1.0.0",
        "status": "running",
        "description": "Physics motion simulation system",
        "endpoints": [
            "/simulate",
            "/predict",
            "/presets"
        ]
    }


@app.post("/simulate")
async def run_simulation(config: MotionConfig):
    """Run motion simulation"""
    try:
        config_dict = config.dict()
        result = simulate_motion(config_dict)
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict")
async def predict(request: PredictionRequest):
    """AI prediction for motion parameters"""
    try:
        result = predict_motion(
            request.initial_conditions,
            request.target_conditions
        )
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/presets")
async def get_presets():
    """Get preset configurations"""
    return {
        "presets": [
            {
                "id": "free_fall_high",
                "name": "Rơi tự do (cao)",
                "description": "Rơi từ độ cao 100m",
                "icon": "🪂",
                "motion_type": "free_fall",
                "config": {
                    "motion_type": "free_fall",
                    "h0": 100,
                    "v0": 0,
                    "g": 9.8,
                    "duration": 10
                }
            },
            {
                "id": "projectile_45",
                "name": "Ném xiên 45°",
                "description": "Góc ném tối ưu cho tầm xa",
                "icon": "🎯",
                "motion_type": "projectile",
                "config": {
                    "motion_type": "projectile",
                    "v0": 20,
                    "angle": 45,
                    "h0": 0,
                    "g": 9.8
                }
            },
            {
                "id": "projectile_60",
                "name": "Ném xiên 60°",
                "description": "Góc lớn, độ cao tối đa",
                "icon": "⬆️",
                "motion_type": "projectile",
                "config": {
                    "motion_type": "projectile",
                    "v0": 25,
                    "angle": 60,
                    "h0": 0,
                    "g": 9.8
                }
            },
            {
                "id": "projectile_30",
                "name": "Ném xiên 30°",
                "description": "Góc nhỏ, quỹ đạo dẹt",
                "icon": "➡️",
                "motion_type": "projectile",
                "config": {
                    "motion_type": "projectile",
                    "v0": 30,
                    "angle": 30,
                    "h0": 2,
                    "g": 9.8
                }
            },
            {
                "id": "harmonic_slow",
                "name": "Dao động chậm",
                "description": "Tần số thấp, biên độ lớn",
                "icon": "〰️",
                "motion_type": "harmonic",
                "config": {
                    "motion_type": "harmonic",
                    "amplitude": 2.0,
                    "frequency": 0.5,
                    "phase": 0,
                    "duration": 10
                }
            },
            {
                "id": "harmonic_fast",
                "name": "Dao động nhanh",
                "description": "Tần số cao, biên độ nhỏ",
                "icon": "〰️",
                "motion_type": "harmonic",
                "config": {
                    "motion_type": "harmonic",
                    "amplitude": 1.0,
                    "frequency": 2.0,
                    "phase": 0,
                    "duration": 5
                }
            }
        ]
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    print("🚀 Starting MotionSim API...")
    print("📡 Server running on http://localhost:8012")
    print("📚 API docs available at http://localhost:8012/docs")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8012,
        log_level="info"
    )



