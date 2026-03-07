"""
Aerodynamics Simulation API
FastAPI server for aerodynamics simulation
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import uvicorn
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent))

from main import simulate_flow, optimize_shape_with_ai

app = FastAPI(title="Aerodynamics Simulation API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ObstacleConfig(BaseModel):
    shape: str
    params: Dict


class SimulationConfig(BaseModel):
    width: int = 200
    height: int = 100
    viscosity: float = 0.0001
    inletVelocity: float = 5.0
    steps: int = 100
    obstacles: List[ObstacleConfig] = []


class OptimizationRequest(BaseModel):
    target: str = "low_drag"  # or "high_lift"
    constraints: Optional[Dict] = None


@app.get("/")
async def root():
    return {
        "name": "Aerodynamics Simulation API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": [
            "/simulate",
            "/optimize",
            "/presets"
        ]
    }


@app.post("/simulate")
async def run_simulation(config: SimulationConfig):
    """Run aerodynamics simulation"""
    try:
        # Convert Pydantic models to dicts
        config_dict = config.dict()
        
        # Run simulation
        result = simulate_flow(config_dict)
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/optimize")
async def optimize_shape(request: OptimizationRequest):
    """Optimize shape for aerodynamic performance"""
    try:
        result = optimize_shape_with_ai(request.target)
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/presets")
async def get_presets():
    """Get preset configurations"""
    return {
        "presets": [
            {
                "id": "cylinder",
                "name": "Cylinder in Flow",
                "description": "Classical flow around a cylinder",
                "config": {
                    "width": 200,
                    "height": 100,
                    "viscosity": 0.0001,
                    "inletVelocity": 5.0,
                    "steps": 100,
                    "obstacles": [
                        {
                            "shape": "circle",
                            "params": {"x": 100, "y": 50, "radius": 15}
                        }
                    ]
                }
            },
            {
                "id": "airfoil",
                "name": "Airfoil Profile",
                "description": "NACA airfoil in flow",
                "config": {
                    "width": 200,
                    "height": 100,
                    "viscosity": 0.0001,
                    "inletVelocity": 5.0,
                    "steps": 100,
                    "obstacles": [
                        {
                            "shape": "airfoil",
                            "params": {"x": 80, "y": 50, "chord": 40, "thickness": 0.12}
                        }
                    ]
                }
            },
            {
                "id": "square",
                "name": "Square Obstacle",
                "description": "Flow around a square",
                "config": {
                    "width": 200,
                    "height": 100,
                    "viscosity": 0.0001,
                    "inletVelocity": 5.0,
                    "steps": 100,
                    "obstacles": [
                        {
                            "shape": "rectangle",
                            "params": {"x": 90, "y": 40, "width": 20, "height": 20}
                        }
                    ]
                }
            },
            {
                "id": "multi_cylinder",
                "name": "Multiple Cylinders",
                "description": "Flow around multiple obstacles",
                "config": {
                    "width": 200,
                    "height": 100,
                    "viscosity": 0.0001,
                    "inletVelocity": 5.0,
                    "steps": 100,
                    "obstacles": [
                        {
                            "shape": "circle",
                            "params": {"x": 80, "y": 35, "radius": 10}
                        },
                        {
                            "shape": "circle",
                            "params": {"x": 120, "y": 65, "radius": 10}
                        }
                    ]
                }
            }
        ]
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    print("🌬️  Starting Aerodynamics Simulation API...")
    print("📡 Server running on http://localhost:8007")
    print("📚 API docs available at http://localhost:8007/docs")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8007,
        log_level="info"
    )

