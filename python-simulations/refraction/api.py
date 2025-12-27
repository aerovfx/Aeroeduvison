"""
FastAPI backend cho mô phỏng khúc xạ ánh sáng
API endpoints cho refraction simulation
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import uvicorn

from main import RefractionSimulation, generate_animation_frames, generate_materials

app = FastAPI(
    title="Khúc xạ ánh sáng API",
    description="API mô phỏng khúc xạ ánh sáng với định luật Snell và phản xạ toàn phần",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request models
class RefractionRequest(BaseModel):
    n1: float = 1.0
    n2: float = 1.33
    angle_in_deg: float = 30.0

class AnimationRequest(BaseModel):
    n1: float = 1.0
    n2: float = 1.33
    angle_range: tuple = (10, 80)
    num_frames: int = 50

class MaterialRequest(BaseModel):
    material1: str = "air"
    material2: str = "water"
    angle_in_deg: float = 30.0

# Response models
class RefractionResponse(BaseModel):
    status: str
    data: dict

@app.get("/")
async def root():
    return {
        "name": "Khúc xạ ánh sáng API",
        "version": "1.0.0",
        "description": "Mô phỏng khúc xạ ánh sáng với định luật Snell",
        "features": [
            "Định luật Snell",
            "Phản xạ toàn phần",
            "Nhiều môi trường",
            "Animation frames"
        ],
        "endpoints": {
            "refraction": "/api/refraction",
            "animation": "/api/animation",
            "materials": "/api/materials",
            "health": "/api/health"
        }
    }

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "message": "Refraction API is running"}

@app.post("/api/refraction")
async def simulate_refraction(request: RefractionRequest):
    """
    Mô phỏng khúc xạ ánh sáng với các tham số cho trước
    """
    try:
        # Validate input
        if request.n1 <= 0 or request.n2 <= 0:
            raise HTTPException(status_code=400, detail="Refractive indices must be positive")
        
        if request.angle_in_deg < 0 or request.angle_in_deg > 90:
            raise HTTPException(status_code=400, detail="Angle must be between 0 and 90 degrees")
        
        # Create simulation
        sim = RefractionSimulation(
            n1=request.n1,
            n2=request.n2,
            angle_in_deg=request.angle_in_deg
        )
        
        # Get results
        result = sim.to_dict()
        
        return RefractionResponse(
            status="success",
            data=result
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/animation")
async def generate_refraction_animation(request: AnimationRequest):
    """
    Tạo animation frames cho khúc xạ
    """
    try:
        # Validate input
        if request.n1 <= 0 or request.n2 <= 0:
            raise HTTPException(status_code=400, detail="Refractive indices must be positive")
        
        if request.angle_range[0] < 0 or request.angle_range[1] > 90:
            raise HTTPException(status_code=400, detail="Angle range must be between 0 and 90 degrees")
        
        if request.num_frames < 1 or request.num_frames > 200:
            raise HTTPException(status_code=400, detail="Number of frames must be between 1 and 200")
        
        # Generate frames
        frames = generate_animation_frames(
            n1=request.n1,
            n2=request.n2,
            angle_range=request.angle_range,
            num_frames=request.num_frames
        )
        
        return RefractionResponse(
            status="success",
            data={
                "frames": frames,
                "total_frames": len(frames),
                "angle_range": request.angle_range,
                "parameters": {
                    "n1": request.n1,
                    "n2": request.n2
                }
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/materials")
async def get_materials():
    """
    Lấy danh sách các môi trường có sẵn
    """
    try:
        materials = generate_materials()
        return RefractionResponse(
            status="success",
            data={
                "materials": materials,
                "total_materials": len(materials)
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/materials/refraction")
async def simulate_material_refraction(request: MaterialRequest):
    """
    Mô phỏng khúc xạ với tên vật liệu
    """
    try:
        # Material mapping
        material_map = {
            "air": 1.0,
            "water": 1.33,
            "glass": 1.5,
            "diamond": 2.42,
            "oil": 1.47
        }
        
        if request.material1 not in material_map:
            raise HTTPException(status_code=400, detail=f"Unknown material: {request.material1}")
        
        if request.material2 not in material_map:
            raise HTTPException(status_code=400, detail=f"Unknown material: {request.material2}")
        
        # Get refractive indices
        n1 = material_map[request.material1]
        n2 = material_map[request.material2]
        
        # Create simulation
        sim = RefractionSimulation(
            n1=n1,
            n2=n2,
            angle_in_deg=request.angle_in_deg
        )
        
        # Get results
        result = sim.to_dict()
        
        # Add material names
        result["material1"] = request.material1
        result["material2"] = request.material2
        
        return RefractionResponse(
            status="success",
            data=result
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/snell-law")
async def explain_snell_law():
    """
    Giải thích định luật Snell
    """
    return {
        "law": "Snell's Law",
        "formula": "n₁ × sin(θ₁) = n₂ × sin(θ₂)",
        "description": "Định luật Snell mô tả mối quan hệ giữa góc tới và góc khúc xạ khi ánh sáng đi qua mặt phân cách giữa hai môi trường có chiết suất khác nhau",
        "variables": {
            "n1": "Chiết suất môi trường 1",
            "n2": "Chiết suất môi trường 2", 
            "θ1": "Góc tới (độ)",
            "θ2": "Góc khúc xạ (độ)"
        },
        "total_internal_reflection": {
            "condition": "Khi n₁ > n₂ và θ₁ > θ_critical",
            "critical_angle": "θ_critical = arcsin(n₂/n₁)",
            "description": "Khi góc tới lớn hơn góc tới hạn, toàn bộ ánh sáng bị phản xạ trở lại môi trường ban đầu"
        }
    }

if __name__ == "__main__":
    print("🚀 Khởi động Khúc xạ ánh sáng API")
    print("✨ Tính năng:")
    print("   - Định luật Snell")
    print("   - Phản xạ toàn phần")
    print("   - Nhiều môi trường")
    print("   - Animation frames")
    print("📡 Swagger docs: http://localhost:8017/docs")
    print("🌐 API: http://localhost:8017")
    
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=8017,
        reload=True,
        log_level="info"
    )

