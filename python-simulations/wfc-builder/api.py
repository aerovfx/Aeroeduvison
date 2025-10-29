"""
WFC Builder API
FastAPI server for Wave Function Collapse algorithm
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, List
import uvicorn
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent))

from main import run_wfc_simulation, TilesetLibrary
from pattern_generator import PatternGenerator

app = FastAPI(title="WFC Builder API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class WFCConfig(BaseModel):
    width: int = 10
    height: int = 10
    depth: int = 10
    tileset: str = "building_blocks"
    seed: Optional[int] = None
    max_iterations: int = 1000


class PatternRequest(BaseModel):
    style: str = "modern"
    customize: Optional[Dict] = None


@app.get("/")
async def root():
    return {
        "name": "WFC Builder API",
        "version": "1.0.0",
        "status": "running",
        "description": "Wave Function Collapse 3D procedural generation",
        "endpoints": [
            "/generate",
            "/patterns/styles",
            "/patterns/generate",
            "/tilesets",
            "/presets"
        ]
    }


@app.post("/generate")
async def generate_structure(config: WFCConfig):
    """Generate 3D structure using WFC algorithm"""
    try:
        config_dict = config.dict()
        result = run_wfc_simulation(config_dict)
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/patterns/styles")
async def get_pattern_styles():
    """Get available pattern styles"""
    return {
        "styles": PatternGenerator.get_available_styles()
    }


@app.post("/patterns/generate")
async def generate_pattern(request: PatternRequest):
    """Generate AI pattern based on style"""
    try:
        pattern = PatternGenerator.generate_procedural_patterns(request.style)
        return pattern
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/tilesets")
async def get_tilesets():
    """Get available tilesets"""
    return {
        "tilesets": [
            {
                "id": "simple_blocks",
                "name": "Simple Blocks",
                "description": "Basic solid and empty blocks",
                "icon": "🟦",
                "tiles_count": 2
            },
            {
                "id": "building_blocks",
                "name": "Building Blocks",
                "description": "Walls, floors, windows, doors, roofs",
                "icon": "🏠",
                "tiles_count": 7
            },
            {
                "id": "dungeon",
                "name": "Dungeon",
                "description": "Corridors, rooms, junctions, walls",
                "icon": "🏰",
                "tiles_count": 5
            }
        ]
    }


@app.get("/presets")
async def get_presets():
    """Get preset configurations"""
    return {
        "presets": [
            {
                "id": "small_house",
                "name": "Small House",
                "description": "Simple 5x5x5 house",
                "config": {
                    "width": 5,
                    "height": 5,
                    "depth": 5,
                    "tileset": "building_blocks",
                    "seed": 42,
                    "max_iterations": 500
                },
                "icon": "🏠"
            },
            {
                "id": "tower",
                "name": "Tower",
                "description": "Tall 5x10x5 tower",
                "config": {
                    "width": 5,
                    "height": 10,
                    "depth": 5,
                    "tileset": "building_blocks",
                    "seed": 123,
                    "max_iterations": 1000
                },
                "icon": "🗼"
            },
            {
                "id": "dungeon_small",
                "name": "Small Dungeon",
                "description": "8x4x8 dungeon",
                "config": {
                    "width": 8,
                    "height": 4,
                    "depth": 8,
                    "tileset": "dungeon",
                    "seed": 456,
                    "max_iterations": 800
                },
                "icon": "🏰"
            },
            {
                "id": "complex_building",
                "name": "Complex Building",
                "description": "Large 12x8x12 building",
                "config": {
                    "width": 12,
                    "height": 8,
                    "depth": 12,
                    "tileset": "building_blocks",
                    "seed": 789,
                    "max_iterations": 2000
                },
                "icon": "🏢"
            },
            {
                "id": "cube",
                "name": "Simple Cube",
                "description": "Basic 8x8x8 cube with simple blocks",
                "config": {
                    "width": 8,
                    "height": 8,
                    "depth": 8,
                    "tileset": "simple_blocks",
                    "seed": 999,
                    "max_iterations": 600
                },
                "icon": "🧊"
            }
        ]
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    print("🏗️  Starting WFC Builder API...")
    print("📡 Server running on http://localhost:8008")
    print("📚 API docs available at http://localhost:8008/docs")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8008,
        log_level="info"
    )



