"""
FastAPI Backend cho Phòng thí nghiệm Quang học ảo
Endpoints: /refraction, /reflection, /prism, /lens
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
import uvicorn

from main import (
    RefractionSimulation,
    ReflectionSimulation,
    PrismSimulation,
    LensSimulation,
    generate_materials_list,
    generate_wavelength_spectrum
)

app = FastAPI(
    title="Phòng thí nghiệm Quang học ảo API",
    description="API mô phỏng các hiện tượng quang học: khúc xạ, phản xạ, tán sắc, thấu kính",
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

# ==========================================
# REQUEST MODELS
# ==========================================

class RefractionRequest(BaseModel):
    n1: float = Field(1.0, ge=1.0, le=3.0, description="Chiết suất môi trường 1")
    n2: float = Field(1.33, ge=1.0, le=3.0, description="Chiết suất môi trường 2")
    angle_deg: float = Field(30.0, ge=0.0, le=90.0, description="Góc tới (độ)")
    wavelength: float = Field(580.0, ge=380.0, le=780.0, description="Bước sóng (nm)")

class ReflectionRequest(BaseModel):
    angle_deg: float = Field(30.0, ge=0.0, le=90.0, description="Góc tới (độ)")
    is_diffuse: bool = Field(False, description="Phản xạ khuếch tán?")

class PrismRequest(BaseModel):
    apex_angle_deg: float = Field(60.0, ge=30.0, le=90.0, description="Góc ở đỉnh lăng kính (độ)")
    n_prism: float = Field(1.5, ge=1.0, le=3.0, description="Chiết suất lăng kính")
    incident_angle_deg: float = Field(50.0, ge=0.0, le=90.0, description="Góc tới (độ)")

class LensRequest(BaseModel):
    focal_length: float = Field(100.0, description="Tiêu cự (cm)")
    object_distance: float = Field(150.0, ge=0.1, description="Khoảng cách vật (cm)")
    lens_type: str = Field("convex", description="Loại thấu kính: convex hoặc concave")

class RayTracingRequest(BaseModel):
    """Yêu cầu truy vết tia sáng tùy chỉnh"""
    rays: List[Dict] = Field(..., description="Danh sách các tia sáng")
    surfaces: List[Dict] = Field(..., description="Danh sách các bề mặt")

# ==========================================
# ENDPOINTS
# ==========================================

@app.get("/")
async def root():
    """Endpoint gốc"""
    return {
        "name": "Phòng thí nghiệm Quang học ảo API",
        "version": "1.0.0",
        "endpoints": {
            "refraction": "/api/refraction",
            "reflection": "/api/reflection",
            "prism": "/api/prism",
            "lens": "/api/lens",
            "materials": "/api/materials",
            "spectrum": "/api/spectrum"
        }
    }

@app.post("/api/refraction")
async def calculate_refraction(request: RefractionRequest):
    """
    Tính toán khúc xạ ánh sáng
    
    - **n1**: Chiết suất môi trường 1 (1.0 - 3.0)
    - **n2**: Chiết suất môi trường 2 (1.0 - 3.0)
    - **angle_deg**: Góc tới (0 - 90 độ)
    - **wavelength**: Bước sóng ánh sáng (380 - 780 nm)
    """
    try:
        sim = RefractionSimulation(
            n1=request.n1,
            n2=request.n2,
            angle_deg=request.angle_deg,
            wavelength=request.wavelength
        )
        result = sim.to_dict()
        return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/reflection")
async def calculate_reflection(request: ReflectionRequest):
    """
    Tính toán phản xạ ánh sáng
    
    - **angle_deg**: Góc tới (0 - 90 độ)
    - **is_diffuse**: True cho phản xạ khuếch tán, False cho phản xạ gương
    """
    try:
        sim = ReflectionSimulation(
            angle_deg=request.angle_deg,
            is_diffuse=request.is_diffuse
        )
        result = sim.to_dict()
        return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/prism")
async def calculate_prism(request: PrismRequest):
    """
    Tính toán tán sắc ánh sáng qua lăng kính
    
    - **apex_angle_deg**: Góc ở đỉnh lăng kính (30 - 90 độ)
    - **n_prism**: Chiết suất lăng kính (1.0 - 3.0)
    - **incident_angle_deg**: Góc tới (0 - 90 độ)
    """
    try:
        sim = PrismSimulation(
            apex_angle_deg=request.apex_angle_deg,
            n_prism=request.n_prism,
            incident_angle_deg=request.incident_angle_deg
        )
        result = sim.to_dict()
        return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/lens")
async def calculate_lens(request: LensRequest):
    """
    Tính toán ảnh qua thấu kính
    
    - **focal_length**: Tiêu cự (cm)
    - **object_distance**: Khoảng cách vật (cm)
    - **lens_type**: Loại thấu kính ("convex" hoặc "concave")
    """
    try:
        if request.lens_type not in ["convex", "concave"]:
            raise ValueError("lens_type phải là 'convex' hoặc 'concave'")
        
        sim = LensSimulation(
            focal_length=request.focal_length,
            object_distance=request.object_distance,
            lens_type=request.lens_type
        )
        result = sim.to_dict()
        return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/materials")
async def get_materials():
    """Lấy danh sách các môi trường với chiết suất"""
    try:
        materials = generate_materials_list()
        return {
            "status": "success",
            "data": materials,
            "count": len(materials)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/spectrum")
async def get_spectrum():
    """Lấy phổ bước sóng và màu sắc"""
    try:
        spectrum = generate_wavelength_spectrum()
        return {
            "status": "success",
            "data": spectrum,
            "count": len(spectrum)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/presets/refraction")
async def get_refraction_presets():
    """Các preset cho khúc xạ"""
    presets = [
        {
            "id": "air_water",
            "name": "Không khí → Nước",
            "n1": 1.0,
            "n2": 1.33,
            "angle_deg": 45,
            "description": "Ánh sáng từ không khí vào nước"
        },
        {
            "id": "air_glass",
            "name": "Không khí → Thủy tinh",
            "n1": 1.0,
            "n2": 1.5,
            "angle_deg": 45,
            "description": "Ánh sáng từ không khí vào thủy tinh"
        },
        {
            "id": "water_glass",
            "name": "Nước → Thủy tinh",
            "n1": 1.33,
            "n2": 1.5,
            "angle_deg": 45,
            "description": "Ánh sáng từ nước vào thủy tinh"
        },
        {
            "id": "glass_air",
            "name": "Thủy tinh → Không khí",
            "n1": 1.5,
            "n2": 1.0,
            "angle_deg": 30,
            "description": "Ánh sáng từ thủy tinh ra không khí (có thể có phản xạ toàn phần)"
        },
        {
            "id": "water_air",
            "name": "Nước → Không khí",
            "n1": 1.33,
            "n2": 1.0,
            "angle_deg": 50,
            "description": "Ánh sáng từ nước ra không khí (có thể có phản xạ toàn phần)"
        }
    ]
    return {"status": "success", "data": presets}

@app.get("/api/presets/prism")
async def get_prism_presets():
    """Các preset cho lăng kính"""
    presets = [
        {
            "id": "equilateral",
            "name": "Lăng kính đều",
            "apex_angle_deg": 60,
            "n_prism": 1.5,
            "incident_angle_deg": 50,
            "description": "Lăng kính tam giác đều (60°)"
        },
        {
            "id": "right_angle",
            "name": "Lăng kính vuông",
            "apex_angle_deg": 90,
            "n_prism": 1.5,
            "incident_angle_deg": 45,
            "description": "Lăng kính vuông (90°)"
        },
        {
            "id": "flint_glass",
            "name": "Thủy tinh Flint",
            "apex_angle_deg": 60,
            "n_prism": 1.65,
            "incident_angle_deg": 50,
            "description": "Lăng kính thủy tinh Flint (tán sắc mạnh)"
        }
    ]
    return {"status": "success", "data": presets}

@app.get("/api/presets/lens")
async def get_lens_presets():
    """Các preset cho thấu kính"""
    presets = [
        {
            "id": "convex_real",
            "name": "Thấu kính hội tụ - Ảnh thật",
            "focal_length": 100,
            "object_distance": 150,
            "lens_type": "convex",
            "description": "Vật ở ngoài tiêu cự → ảnh thật, ngược chiều"
        },
        {
            "id": "convex_virtual",
            "name": "Thấu kính hội tụ - Ảnh ảo",
            "focal_length": 100,
            "object_distance": 50,
            "lens_type": "convex",
            "description": "Vật ở trong tiêu cự → ảnh ảo, cùng chiều"
        },
        {
            "id": "concave",
            "name": "Thấu kính phân kỳ",
            "focal_length": 100,
            "object_distance": 150,
            "lens_type": "concave",
            "description": "Thấu kính phân kỳ luôn cho ảnh ảo"
        },
        {
            "id": "magnifying",
            "name": "Kính lúp",
            "focal_length": 50,
            "object_distance": 30,
            "lens_type": "convex",
            "description": "Vật gần thấu kính hội tụ → ảnh ảo, phóng đại"
        }
    ]
    return {"status": "success", "data": presets}

@app.get("/health")
async def health_check():
    """Kiểm tra sức khỏe API"""
    return {
        "status": "healthy",
        "service": "optics-lab",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    print("🔬 Khởi động Phòng thí nghiệm Quang học ảo API")
    print("📡 Swagger docs: http://localhost:8002/docs")
    print("🌐 API: http://localhost:8002")
    
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=8002,
        reload=True,
        log_level="info"
    )


