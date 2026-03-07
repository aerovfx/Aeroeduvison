"""
MechaForce API
FastAPI server for structural mechanics
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import uvicorn
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent))

from main import analyze_structure, optimize_structure

app = FastAPI(title="MechaForce API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class NodeConfig(BaseModel):
    x: float
    y: float
    z: float = 0.0
    is_fixed: bool = False


class BeamConfig(BaseModel):
    node1_id: int
    node2_id: int
    area: float = 0.01
    E: float = 200e9


class ForceConfig(BaseModel):
    node_id: int
    fx: float
    fy: float
    fz: float = 0.0


class StructureConfig(BaseModel):
    nodes: List[NodeConfig]
    beams: List[BeamConfig]
    forces: List[ForceConfig]


@app.get("/")
async def root():
    return {
        "name": "MechaForce API",
        "version": "1.0.0",
        "status": "running",
        "description": "Structural mechanics and force analysis",
        "endpoints": [
            "/analyze",
            "/optimize",
            "/presets"
        ]
    }


@app.post("/analyze")
async def analyze(config: StructureConfig):
    """Analyze structural mechanics"""
    try:
        config_dict = {
            'nodes': [n.dict() for n in config.nodes],
            'beams': [b.dict() for b in config.beams],
            'forces': [f.dict() for f in config.forces]
        }
        
        result = analyze_structure(config_dict)
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/optimize")
async def optimize(config: StructureConfig):
    """Optimize structure for weight"""
    try:
        config_dict = {
            'nodes': [n.dict() for n in config.nodes],
            'beams': [b.dict() for b in config.beams],
            'forces': [f.dict() for f in config.forces]
        }
        
        result = optimize_structure(config_dict)
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/presets")
async def get_presets():
    """Get preset structures"""
    return {
        "presets": [
            {
                "id": "cantilever",
                "name": "Cantilever Beam",
                "description": "Dầm console chịu tải tập trung",
                "icon": "📏",
                "config": {
                    "nodes": [
                        {"x": 0, "y": 0, "is_fixed": True},
                        {"x": 1, "y": 0, "is_fixed": False},
                        {"x": 2, "y": 0, "is_fixed": False}
                    ],
                    "beams": [
                        {"node1_id": 0, "node2_id": 1, "area": 0.01, "E": 200e9},
                        {"node1_id": 1, "node2_id": 2, "area": 0.01, "E": 200e9}
                    ],
                    "forces": [
                        {"node_id": 2, "fx": 0, "fy": -10000}
                    ]
                }
            },
            {
                "id": "simple_truss",
                "name": "Simple Truss",
                "description": "Giàn đơn giản hình tam giác",
                "icon": "🔺",
                "config": {
                    "nodes": [
                        {"x": 0, "y": 0, "is_fixed": True},
                        {"x": 2, "y": 0, "is_fixed": True},
                        {"x": 1, "y": 1.5, "is_fixed": False}
                    ],
                    "beams": [
                        {"node1_id": 0, "node2_id": 2, "area": 0.01, "E": 200e9},
                        {"node1_id": 1, "node2_id": 2, "area": 0.01, "E": 200e9},
                        {"node1_id": 0, "node2_id": 1, "area": 0.01, "E": 200e9}
                    ],
                    "forces": [
                        {"node_id": 2, "fx": 0, "fy": -15000}
                    ]
                }
            },
            {
                "id": "bridge",
                "name": "Bridge Truss",
                "description": "Giàn cầu với nhiều thanh",
                "icon": "🌉",
                "config": {
                    "nodes": [
                        {"x": 0, "y": 0, "is_fixed": True},
                        {"x": 1, "y": 1, "is_fixed": False},
                        {"x": 2, "y": 0, "is_fixed": False},
                        {"x": 3, "y": 1, "is_fixed": False},
                        {"x": 4, "y": 0, "is_fixed": True}
                    ],
                    "beams": [
                        {"node1_id": 0, "node2_id": 1, "area": 0.01, "E": 200e9},
                        {"node1_id": 1, "node2_id": 2, "area": 0.01, "E": 200e9},
                        {"node1_id": 2, "node2_id": 3, "area": 0.01, "E": 200e9},
                        {"node1_id": 3, "node2_id": 4, "area": 0.01, "E": 200e9},
                        {"node1_id": 0, "node2_id": 2, "area": 0.01, "E": 200e9},
                        {"node1_id": 2, "node2_id": 4, "area": 0.01, "E": 200e9},
                        {"node1_id": 1, "node2_id": 3, "area": 0.01, "E": 200e9}
                    ],
                    "forces": [
                        {"node_id": 1, "fx": 0, "fy": -8000},
                        {"node_id": 3, "fx": 0, "fy": -8000}
                    ]
                }
            },
            {
                "id": "frame",
                "name": "Portal Frame",
                "description": "Khung chữ nhật chịu tải ngang",
                "icon": "🏛️",
                "config": {
                    "nodes": [
                        {"x": 0, "y": 0, "is_fixed": True},
                        {"x": 3, "y": 0, "is_fixed": True},
                        {"x": 0, "y": 2, "is_fixed": False},
                        {"x": 3, "y": 2, "is_fixed": False}
                    ],
                    "beams": [
                        {"node1_id": 0, "node2_id": 2, "area": 0.015, "E": 200e9},
                        {"node1_id": 1, "node2_id": 3, "area": 0.015, "E": 200e9},
                        {"node1_id": 2, "node2_id": 3, "area": 0.012, "E": 200e9}
                    ],
                    "forces": [
                        {"node_id": 2, "fx": 5000, "fy": 0}
                    ]
                }
            }
        ]
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    print("🏗️  Starting MechaForce API...")
    print("📡 Server running on http://localhost:8011")
    print("📚 API docs available at http://localhost:8011/docs")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8011,
        log_level="info"
    )
