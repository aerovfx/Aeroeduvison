"""
AeroFlow XR API Server
FastAPI endpoint for 3D fluid simulation
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

from main_taichi import simulate_3d_flow

app = FastAPI(
    title="AeroFlow XR API",
    description="3D Fluid Dynamics Simulation with Taichi GPU acceleration",
    version="1.0.0-MVP"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ObstacleConfig(BaseModel):
    type: str = "sphere"  # sphere, box, etc.
    position: List[float] = [30, 16, 16]
    radius: Optional[float] = 6.0
    size: Optional[List[float]] = None


class SimulationConfig(BaseModel):
    grid_size: List[int] = [64, 32, 32]
    steps: int = 50
    inlet_velocity: List[float] = [5.0, 0.0, 0.0]
    obstacle: ObstacleConfig = ObstacleConfig()


@app.get("/")
async def root():
    return {
        "name": "AeroFlow XR API",
        "version": "1.0.0-MVP",
        "description": "3D Fluid Dynamics with Taichi GPU",
        "status": "running",
        "endpoints": {
            "simulate": "POST /simulate - Run 3D fluid simulation",
            "presets": "GET /presets - Get preset configurations",
            "health": "GET /health - Health check"
        },
        "tech_stack": {
            "solver": "Taichi GPU",
            "grid": "64x32x32 voxels",
            "visualization": "Particle-based"
        }
    }


@app.post("/simulate")
async def run_simulation(config: SimulationConfig):
    """
    Run 3D fluid simulation
    
    Request body:
    {
        "grid_size": [64, 32, 32],
        "steps": 50,
        "inlet_velocity": [5.0, 0.0, 0.0],
        "obstacle": {
            "type": "sphere",
            "position": [30, 16, 16],
            "radius": 6.0
        }
    }
    
    Returns:
    {
        "success": true,
        "results": [...],  // Array of frames with particles
        "final_forces": {...},
        "stats": {...}
    }
    """
    try:
        # Convert Pydantic model to dict
        config_dict = config.dict()
        
        # Run simulation
        print(f"\n📥 Received simulation request:")
        print(f"   Grid: {config.grid_size}")
        print(f"   Steps: {config.steps}")
        
        result = simulate_3d_flow(config_dict)
        
        print(f"✅ Simulation complete, returning {len(result['results'])} frames")
        
        return result
        
    except Exception as e:
        print(f"❌ Simulation error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/presets")
async def get_presets():
    """Get preset simulation configurations"""
    return {
        "presets": [
            {
                "id": "sphere_flow",
                "name": "Sphere in Flow",
                "description": "Classic flow around a sphere - von Kármán vortex street",
                "icon": "🔵",
                "config": {
                    "grid_size": [64, 32, 32],
                    "steps": 50,
                    "inlet_velocity": [5.0, 0.0, 0.0],
                    "obstacle": {
                        "type": "sphere",
                        "position": [30, 16, 16],
                        "radius": 6.0
                    }
                }
            },
            {
                "id": "small_sphere",
                "name": "Small Sphere",
                "description": "Smaller obstacle - less turbulence",
                "icon": "⚪",
                "config": {
                    "grid_size": [64, 32, 32],
                    "steps": 50,
                    "inlet_velocity": [5.0, 0.0, 0.0],
                    "obstacle": {
                        "type": "sphere",
                        "position": [30, 16, 16],
                        "radius": 4.0
                    }
                }
            },
            {
                "id": "large_sphere",
                "name": "Large Sphere",
                "description": "Larger obstacle - more turbulence and vortices",
                "icon": "🔴",
                "config": {
                    "grid_size": [64, 32, 32],
                    "steps": 50,
                    "inlet_velocity": [5.0, 0.0, 0.0],
                    "obstacle": {
                        "type": "sphere",
                        "position": [30, 16, 16],
                        "radius": 8.0
                    }
                }
            },
            {
                "id": "fast_flow",
                "name": "High Speed Flow",
                "description": "Faster inlet velocity - more dramatic effects",
                "icon": "⚡",
                "config": {
                    "grid_size": [64, 32, 32],
                    "steps": 50,
                    "inlet_velocity": [8.0, 0.0, 0.0],
                    "obstacle": {
                        "type": "sphere",
                        "position": [30, 16, 16],
                        "radius": 6.0
                    }
                }
            }
        ]
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        import taichi as ti
        taichi_version = ti.__version__
        backend = "GPU" if ti.cfg.arch == ti.gpu else "CPU"
    except:
        taichi_version = "Not available"
        backend = "Unknown"
    
    return {
        "status": "healthy",
        "taichi_version": taichi_version,
        "backend": backend,
        "ready": True
    }


@app.get("/info")
async def get_info():
    """Get detailed system information"""
    try:
        import taichi as ti
        
        return {
            "solver": {
                "name": "AeroFlow XR",
                "version": "1.0.0-MVP",
                "type": "3D Navier-Stokes",
                "method": "Finite Difference + Semi-Lagrangian"
            },
            "grid": {
                "default_size": [64, 32, 32],
                "total_voxels": 64 * 32 * 32,
                "recommended_max": [128, 64, 64]
            },
            "performance": {
                "backend": ti.cfg.arch,
                "expected_fps": "10-20 on GPU, 1-5 on CPU",
                "particle_count": "500-1000 per frame"
            },
            "visualization": {
                "method": "Particle-based",
                "renderer": "Three.js WebGL",
                "features": ["Velocity vectors", "Pressure coloring", "Streamlines"]
            }
        }
    except Exception as e:
        return {
            "error": str(e),
            "message": "Could not retrieve system info"
        }


if __name__ == "__main__":
    print("🌊 Starting AeroFlow XR API Server...")
    print("=" * 60)
    print("📡 Server: http://localhost:8008")
    print("📚 API Docs: http://localhost:8008/docs")
    print("🔍 Health Check: http://localhost:8008/health")
    print("=" * 60)
    print("\n⚡ Ready to receive simulation requests!\n")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8008,
        log_level="info"
    )

