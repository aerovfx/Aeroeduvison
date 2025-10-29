"""
FastAPI Backend cho Phòng thí nghiệm Chuyển động Vật lý
7 loại chuyển động: Free Fall, Projectile, Harmonic, Uniform, Accelerated, Circular, Pendulum
Endpoints: /free-fall, /projectile, /harmonic, /uniform, /accelerated, /circular, /pendulum, /predict
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
import uvicorn

from main import (
    FreeFallSimulation,
    ProjectileMotion,
    HarmonicMotion,
    UniformMotion,
    AcceleratedMotion,
    CircularMotion,
    SimplePendulum,
    MotionPredictor
)

app = FastAPI(
    title="Phòng thí nghiệm Chuyển động Vật lý API",
    description="API mô phỏng 7 loại chuyển động: Rơi tự do, Ném xiên, Dao động điều hòa, Thẳng đều, Nhanh dần đều, Tròn đều, Con lắc đơn - với AI prediction",
    version="2.0.0"
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

class FreeFallRequest(BaseModel):
    h0: float = Field(100, ge=0, description="Độ cao ban đầu (m)")
    v0: float = Field(0, description="Vận tốc ban đầu (m/s)")
    g: float = Field(9.8, gt=0, description="Gia tốc trọng trường (m/s²)")
    num_points: int = Field(100, ge=10, le=500, description="Số điểm quỹ đạo")

class ProjectileRequest(BaseModel):
    v0: float = Field(20, gt=0, description="Vận tốc ban đầu (m/s)")
    angle_deg: float = Field(45, ge=0, le=90, description="Góc ném (độ)")
    h0: float = Field(0, ge=0, description="Độ cao ban đầu (m)")
    g: float = Field(9.8, gt=0, description="Gia tốc trọng trường (m/s²)")
    num_points: int = Field(100, ge=10, le=500, description="Số điểm quỹ đạo")

class HarmonicRequest(BaseModel):
    A: float = Field(0.1, gt=0, description="Biên độ (m)")
    omega: float = Field(6.28, gt=0, description="Tần số góc (rad/s)")
    phi: float = Field(0, description="Pha ban đầu (rad)")
    t_max: Optional[float] = Field(None, description="Thời gian mô phỏng (s)")
    num_points: int = Field(200, ge=10, le=1000, description="Số điểm")

class UniformRequest(BaseModel):
    v: float = Field(10, description="Vận tốc (m/s)")
    x0: float = Field(0, description="Vị trí ban đầu (m)")
    duration: float = Field(10, gt=0, description="Thời gian chuyển động (s)")
    num_points: int = Field(100, ge=10, le=500, description="Số điểm quỹ đạo")

class AcceleratedRequest(BaseModel):
    v0: float = Field(0, description="Vận tốc ban đầu (m/s)")
    a: float = Field(2, description="Gia tốc (m/s²)")
    x0: float = Field(0, description="Vị trí ban đầu (m)")
    duration: float = Field(10, gt=0, description="Thời gian chuyển động (s)")
    num_points: int = Field(100, ge=10, le=500, description="Số điểm quỹ đạo")

class CircularRequest(BaseModel):
    r: float = Field(5, gt=0, description="Bán kính (m)")
    omega: float = Field(1, gt=0, description="Tốc độ góc (rad/s)")
    duration: float = Field(10, gt=0, description="Thời gian chuyển động (s)")
    num_points: int = Field(200, ge=10, le=1000, description="Số điểm quỹ đạo")

class PendulumRequest(BaseModel):
    L: float = Field(1, gt=0, description="Chiều dài dây (m)")
    theta0_deg: float = Field(30, gt=0, lt=90, description="Góc ban đầu (độ)")
    duration: float = Field(10, gt=0, description="Thời gian dao động (s)")
    g: float = Field(9.8, gt=0, description="Gia tốc trọng trường (m/s²)")
    num_points: int = Field(200, ge=10, le=1000, description="Số điểm quỹ đạo")

class PredictionRequest(BaseModel):
    motion_type: str = Field(..., description="Loại chuyển động: free_fall, projectile")
    training_data: List[Dict] = Field(..., description="Dữ liệu training")
    predict_times: List[float] = Field(..., description="Thời điểm cần dự đoán")

# ==========================================
# ENDPOINTS
# ==========================================

@app.get("/")
async def root():
    """Endpoint gốc"""
    return {
        "name": "Phòng thí nghiệm Chuyển động Vật lý API",
        "version": "2.0.0",
        "description": "7 loại chuyển động vật lý",
        "motions": [
            "Rơi tự do", "Ném xiên", "Dao động điều hòa",
            "Thẳng đều", "Nhanh dần đều", "Tròn đều", "Con lắc đơn"
        ],
        "endpoints": {
            "free_fall": "/api/free-fall",
            "projectile": "/api/projectile",
            "harmonic": "/api/harmonic",
            "uniform": "/api/uniform",
            "accelerated": "/api/accelerated",
            "circular": "/api/circular",
            "pendulum": "/api/pendulum",
            "predict": "/api/predict",
            "compare": "/api/compare"
        }
    }

@app.post("/api/free-fall")
async def simulate_free_fall(request: FreeFallRequest):
    """
    Mô phỏng rơi tự do
    
    - **h0**: Độ cao ban đầu (m)
    - **v0**: Vận tốc ban đầu (m/s) - dương là lên
    - **g**: Gia tốc trọng trường (m/s²)
    """
    try:
        sim = FreeFallSimulation(h0=request.h0, v0=request.v0, g=request.g)
        
        # Override num_points
        trajectory = sim.generate_trajectory(num_points=request.num_points)
        result = sim.to_dict()
        result['trajectory'] = [state.to_dict() for state in trajectory]
        
        return {
            "status": "success",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/projectile")
async def simulate_projectile(request: ProjectileRequest):
    """
    Mô phỏng ném xiên
    
    - **v0**: Vận tốc ban đầu (m/s)
    - **angle_deg**: Góc ném (0-90 độ)
    - **h0**: Độ cao ban đầu (m)
    - **g**: Gia tốc trọng trường (m/s²)
    """
    try:
        sim = ProjectileMotion(
            v0=request.v0,
            angle_deg=request.angle_deg,
            h0=request.h0,
            g=request.g
        )
        
        trajectory = sim.generate_trajectory(num_points=request.num_points)
        result = sim.to_dict()
        result['trajectory'] = [state.to_dict() for state in trajectory]
        
        return {
            "status": "success",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/harmonic")
async def simulate_harmonic(request: HarmonicRequest):
    """
    Mô phỏng dao động điều hòa
    
    - **A**: Biên độ (m)
    - **omega**: Tần số góc (rad/s)
    - **phi**: Pha ban đầu (rad)
    """
    try:
        sim = HarmonicMotion(A=request.A, omega=request.omega, phi=request.phi)
        
        trajectory = sim.generate_trajectory(
            t_max=request.t_max,
            num_points=request.num_points
        )
        result = sim.to_dict()
        result['trajectory'] = [state.to_dict() for state in trajectory]
        
        return {
            "status": "success",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/uniform")
async def simulate_uniform(request: UniformRequest):
    """
    Mô phỏng chuyển động thẳng đều
    
    - **v**: Vận tốc không đổi (m/s)
    - **x0**: Vị trí ban đầu (m)
    - **duration**: Thời gian chuyển động (s)
    """
    try:
        sim = UniformMotion(v=request.v, x0=request.x0, duration=request.duration)
        
        trajectory = sim.generate_trajectory(num_points=request.num_points)
        result = sim.to_dict()
        result['trajectory'] = [state.to_dict() for state in trajectory]
        
        return {
            "status": "success",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/accelerated")
async def simulate_accelerated(request: AcceleratedRequest):
    """
    Mô phỏng chuyển động thẳng nhanh dần đều
    
    - **v0**: Vận tốc ban đầu (m/s)
    - **a**: Gia tốc (m/s²)
    - **x0**: Vị trí ban đầu (m)
    - **duration**: Thời gian chuyển động (s)
    """
    try:
        sim = AcceleratedMotion(
            v0=request.v0,
            a=request.a,
            x0=request.x0,
            duration=request.duration
        )
        
        trajectory = sim.generate_trajectory(num_points=request.num_points)
        result = sim.to_dict()
        result['trajectory'] = [state.to_dict() for state in trajectory]
        
        return {
            "status": "success",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/circular")
async def simulate_circular(request: CircularRequest):
    """
    Mô phỏng chuyển động tròn đều
    
    - **r**: Bán kính (m)
    - **omega**: Tốc độ góc (rad/s)
    - **duration**: Thời gian chuyển động (s)
    """
    try:
        sim = CircularMotion(r=request.r, omega=request.omega, duration=request.duration)
        
        trajectory = sim.generate_trajectory(num_points=request.num_points)
        result = sim.to_dict()
        result['trajectory'] = [state.to_dict() for state in trajectory]
        
        return {
            "status": "success",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/pendulum")
async def simulate_pendulum(request: PendulumRequest):
    """
    Mô phỏng con lắc đơn
    
    - **L**: Chiều dài dây (m)
    - **theta0_deg**: Góc ban đầu (độ)
    - **duration**: Thời gian dao động (s)
    - **g**: Gia tốc trọng trường (m/s²)
    """
    try:
        sim = SimplePendulum(
            L=request.L,
            theta0_deg=request.theta0_deg,
            duration=request.duration,
            g=request.g
        )
        
        trajectory = sim.generate_trajectory(num_points=request.num_points)
        result = sim.to_dict()
        result['trajectory'] = [state.to_dict() for state in trajectory]
        
        return {
            "status": "success",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/predict")
async def predict_motion(request: PredictionRequest):
    """
    AI dự đoán chuyển động
    
    - **motion_type**: "free_fall" hoặc "projectile"
    - **training_data**: Dữ liệu training (list of states)
    - **predict_times**: Thời điểm cần dự đoán
    
    Trả về:
    - Model parameters
    - Predictions
    - Metrics (R², RMSE)
    """
    try:
        # Train model
        if request.motion_type == "free_fall":
            model = MotionPredictor.train_free_fall_model(request.training_data)
        elif request.motion_type == "projectile":
            model = MotionPredictor.train_projectile_model(request.training_data)
        else:
            raise ValueError(f"Unknown motion type: {request.motion_type}")
        
        # Predict
        predictions = MotionPredictor.predict(model, request.predict_times)
        
        return {
            "status": "success",
            "data": {
                "model": model,
                "predictions": predictions
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/presets/free-fall")
async def get_free_fall_presets():
    """Các preset cho rơi tự do"""
    presets = [
        {
            "id": "building_10th_floor",
            "name": "Tầng 10 (30m)",
            "h0": 30,
            "v0": 0,
            "description": "Thả vật từ tầng 10"
        },
        {
            "id": "skydiving",
            "name": "Nhảy dù (1000m)",
            "h0": 1000,
            "v0": 0,
            "description": "Nhảy dù từ máy bay"
        },
        {
            "id": "throw_up",
            "name": "Ném lên (h0=0, v0=20m/s)",
            "h0": 0,
            "v0": 20,
            "description": "Ném vật thẳng đứng lên"
        }
    ]
    return {"status": "success", "data": presets}

@app.get("/api/presets/projectile")
async def get_projectile_presets():
    """Các preset cho ném xiên"""
    presets = [
        {
            "id": "optimal_angle",
            "name": "Góc tối ưu (45°)",
            "v0": 20,
            "angle_deg": 45,
            "h0": 0,
            "description": "Góc 45° cho tầm xa tối đa"
        },
        {
            "id": "basketball",
            "name": "Ném bóng rổ (60°)",
            "v0": 10,
            "angle_deg": 60,
            "h0": 2,
            "description": "Ném bóng rổ từ độ cao 2m"
        },
        {
            "id": "cannon",
            "name": "Pháo (30°, v0=50m/s)",
            "v0": 50,
            "angle_deg": 30,
            "h0": 0,
            "description": "Bắn pháo góc thấp"
        }
    ]
    return {"status": "success", "data": presets}

@app.get("/api/presets/harmonic")
async def get_harmonic_presets():
    """Các preset cho dao động điều hòa"""
    presets = [
        {
            "id": "pendulum",
            "name": "Con lắc đơn",
            "A": 0.1,
            "omega": 6.28,
            "phi": 0,
            "description": "Con lắc đơn f=1Hz"
        },
        {
            "id": "spring",
            "name": "Lò xo",
            "A": 0.05,
            "omega": 12.56,
            "phi": 0,
            "description": "Vật trên lò xo f=2Hz"
        },
        {
            "id": "wave",
            "name": "Sóng",
            "A": 0.02,
            "omega": 31.4,
            "phi": 0,
            "description": "Sóng cơ f=5Hz"
        }
    ]
    return {"status": "success", "data": presets}

@app.post("/api/compare")
async def compare_motions(angles: List[float] = [30, 45, 60]):
    """
    So sánh nhiều góc ném
    
    Trả về dữ liệu để vẽ biểu đồ so sánh
    """
    try:
        results = []
        
        for angle in angles:
            sim = ProjectileMotion(v0=20, angle_deg=angle, h0=0)
            result = sim.to_dict()
            results.append({
                "angle": angle,
                "range": result['results']['range'],
                "max_height": result['results']['max_height'],
                "time_of_flight": result['results']['time_of_flight']
            })
        
        return {
            "status": "success",
            "data": results
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/health")
async def health_check():
    """Kiểm tra sức khỏe API"""
    return {
        "status": "healthy",
        "service": "physics-motion",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    print("🚀 Khởi động Phòng thí nghiệm Chuyển động Vật lý API v2.0")
    print("✨ 7 loại chuyển động:")
    print("   1. Rơi tự do")
    print("   2. Ném xiên") 
    print("   3. Dao động điều hòa")
    print("   4. Thẳng đều")
    print("   5. Nhanh dần đều")
    print("   6. Tròn đều")
    print("   7. Con lắc đơn")
    print("📡 Swagger docs: http://localhost:8007/docs")
    print("🌐 API: http://localhost:8007")
    
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=8007,
        reload=True,
        log_level="info"
    )




