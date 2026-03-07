"""
FastAPI Backend for MotionSim - Physics Motion Simulation
Endpoints: Simulate motion, Predict, Analyze
Author: AI Assistant
Date: 2024-10-12
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List
import uvicorn

from physics_engine import PhysicsEngine, MotionPredictor, SimulationConfig

app = FastAPI(
    title="MotionSim API",
    description="Physics Motion Simulation: Free Fall, Projectile, Harmonic Oscillation",
    version="1.0.0"
)

# CORS for Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize physics engine and predictor
physics_engine = PhysicsEngine()
predictor = MotionPredictor()

# ==========================================
# REQUEST/RESPONSE MODELS
# ==========================================

class FreeFallRequest(BaseModel):
    h0: float  # Initial height (m)
    v0: float = 0.0  # Initial velocity (m/s)
    mass: float = 1.0  # Mass (kg)

class ProjectileRequest(BaseModel):
    v0: float  # Initial velocity (m/s)
    angle: float  # Launch angle (degrees)
    h0: float = 0.0  # Initial height (m)
    mass: float = 1.0  # Mass (kg)
    air_resistance: bool = False
    drag_coefficient: float = 0.1

class HarmonicRequest(BaseModel):
    amplitude: float  # A (meters)
    frequency: float = 1.0  # f (Hz)
    phase: float = 0.0  # φ (radians)
    damping: float = 0.0  # γ (damping coefficient)
    mass: float = 1.0  # Mass (kg)

class PredictionRequest(BaseModel):
    v0: float
    angle: float
    h0: float = 0.0

class OptimizationRequest(BaseModel):
    v0: float
    h0: float = 0.0

# ==========================================
# ENDPOINTS
# ==========================================

@app.get("/")
async def root():
    """Health check"""
    return {
        "service": "MotionSim API",
        "version": "1.0.0",
        "status": "running",
        "features": [
            "Free Fall Simulation",
            "Projectile Motion Simulation",
            "Harmonic Oscillation Simulation",
            "AI Motion Prediction",
            "Range Optimization"
        ]
    }

@app.get("/api/health")
async def health():
    """Detailed health check"""
    return {
        "status": "healthy",
        "physics_engine": "ready",
        "ai_predictor": "ready"
    }

# ==========================================
# SIMULATION ENDPOINTS
# ==========================================

@app.post("/api/simulate/free-fall")
async def simulate_free_fall(request: FreeFallRequest):
    """
    Simulate free fall motion
    
    Parameters:
    - h0: Initial height (meters)
    - v0: Initial velocity (m/s), positive = upward
    - mass: Object mass (kg)
    """
    
    try:
        result = physics_engine.simulate_free_fall(
            h0=request.h0,
            v0=request.v0,
            mass=request.mass
        )
        
        # Analyze
        analysis = physics_engine.analyze_motion(result)
        
        return JSONResponse(content={
            "success": True,
            "simulation": result,
            "analysis": analysis
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/simulate/projectile")
async def simulate_projectile(request: ProjectileRequest):
    """
    Simulate projectile motion (parabolic trajectory)
    
    Parameters:
    - v0: Initial velocity (m/s)
    - angle: Launch angle (degrees, 0-90)
    - h0: Initial height (meters)
    - mass: Object mass (kg)
    - air_resistance: Enable air drag
    """
    
    try:
        result = physics_engine.simulate_projectile(
            v0=request.v0,
            angle=request.angle,
            h0=request.h0,
            mass=request.mass,
            air_resistance=request.air_resistance,
            drag_coefficient=request.drag_coefficient
        )
        
        # Analyze
        analysis = physics_engine.analyze_motion(result)
        
        return JSONResponse(content={
            "success": True,
            "simulation": result,
            "analysis": analysis
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/simulate/harmonic")
async def simulate_harmonic(request: HarmonicRequest):
    """
    Simulate harmonic oscillation
    
    Parameters:
    - amplitude: Maximum displacement (meters)
    - frequency: Oscillation frequency (Hz)
    - phase: Initial phase (radians)
    - damping: Damping coefficient (0 = no damping)
    - mass: Object mass (kg)
    """
    
    try:
        result = physics_engine.simulate_harmonic_motion(
            amplitude=request.amplitude,
            frequency=request.frequency,
            phase=request.phase,
            damping=request.damping,
            mass=request.mass
        )
        
        # Analyze
        analysis = physics_engine.analyze_motion(result)
        
        return JSONResponse(content={
            "success": True,
            "simulation": result,
            "analysis": analysis
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# AI PREDICTION ENDPOINTS
# ==========================================

@app.post("/api/predict/landing")
async def predict_landing(request: PredictionRequest):
    """
    AI Prediction: Where will projectile land?
    
    Uses analytical equations for high-accuracy prediction
    """
    
    try:
        prediction = predictor.predict_landing_point(
            v0=request.v0,
            angle=request.angle,
            h0=request.h0
        )
        
        return JSONResponse(content={
            "success": True,
            "prediction": prediction,
            "model": "analytical_kinematics"
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/optimize/range")
async def optimize_range(request: OptimizationRequest):
    """
    AI Optimization: Find optimal launch angle for maximum range
    
    Returns optimal angle and maximum achievable range
    """
    
    try:
        optimization = predictor.optimize_projectile_range(
            v0=request.v0,
            h0=request.h0
        )
        
        return JSONResponse(content={
            "success": True,
            "optimization": optimization,
            "recommendation": f"Launch at {optimization['optimal_angle']:.1f}° for maximum range of {optimization['max_range']:.2f}m"
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analyze/motion")
async def analyze_motion_data(
    positions: List[float],
    times: List[float]
):
    """
    AI Analysis: Determine motion type from observed data
    
    Fits linear/quadratic models to identify:
    - Uniform motion (constant velocity)
    - Accelerated motion (constant acceleration)
    - Complex motion
    """
    
    try:
        if len(positions) != len(times):
            raise ValueError("Positions and times must have same length")
        
        if len(positions) < 3:
            raise ValueError("Need at least 3 data points")
        
        analysis = predictor.fit_motion_model(positions, times)
        
        return JSONResponse(content={
            "success": True,
            "analysis": analysis,
            "model": "polynomial_regression"
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# UTILITY ENDPOINTS
# ==========================================

@app.get("/api/presets")
async def get_presets():
    """Get preset simulation scenarios"""
    
    presets = {
        "free_fall": [
            {"name": "Rơi từ tầng 10", "h0": 30, "v0": 0, "mass": 1.0},
            {"name": "Thả bóng từ tòa nhà", "h0": 100, "v0": 0, "mass": 0.5},
            {"name": "Ném lên cao rồi rơi", "h0": 2, "v0": 10, "mass": 1.0}
        ],
        "projectile": [
            {"name": "Bóng đá (45°)", "v0": 20, "angle": 45, "h0": 0},
            {"name": "Pháo hoa", "v0": 50, "angle": 75, "h0": 1},
            {"name": "Ném xa Olympic", "v0": 25, "angle": 42, "h0": 2}
        ],
        "harmonic": [
            {"name": "Con lắc đơn", "amplitude": 0.1, "frequency": 1.0, "damping": 0.0},
            {"name": "Lò xo", "amplitude": 0.05, "frequency": 2.0, "damping": 0.0},
            {"name": "Dao động tắt dần", "amplitude": 0.1, "frequency": 1.0, "damping": 0.1}
        ]
    }
    
    return JSONResponse(content={
        "success": True,
        "presets": presets
    })

@app.get("/api/formulas")
async def get_formulas():
    """Get physics formulas used"""
    
    formulas = {
        "free_fall": {
            "position": "h(t) = h₀ + v₀t - ½gt²",
            "velocity": "v(t) = v₀ - gt",
            "acceleration": "a(t) = -g",
            "energy": "E = mgh + ½mv²"
        },
        "projectile": {
            "x_position": "x(t) = v₀cos(θ)t",
            "y_position": "y(t) = h₀ + v₀sin(θ)t - ½gt²",
            "x_velocity": "vₓ(t) = v₀cos(θ)",
            "y_velocity": "vᵧ(t) = v₀sin(θ) - gt",
            "range": "R = v₀²sin(2θ)/g",
            "max_height": "H = h₀ + v₀²sin²(θ)/(2g)"
        },
        "harmonic": {
            "position": "x(t) = A cos(ωt + φ)",
            "velocity": "v(t) = -Aω sin(ωt + φ)",
            "acceleration": "a(t) = -Aω² cos(ωt + φ)",
            "angular_frequency": "ω = 2πf",
            "period": "T = 1/f = 2π/ω",
            "energy": "E = ½kA² (conserved)"
        }
    }
    
    return JSONResponse(content={
        "success": True,
        "formulas": formulas
    })

if __name__ == "__main__":
    print("🚀 Starting MotionSim API...")
    print("📍 Endpoints:")
    print("   - POST /api/simulate/free-fall")
    print("   - POST /api/simulate/projectile")
    print("   - POST /api/simulate/harmonic")
    print("   - POST /api/predict/landing")
    print("   - POST /api/optimize/range")
    print("   - GET  /api/presets")
    print("   - GET  /api/formulas")
    print()
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8014,  # Different port from OCR
        reload=True,
        log_level="info"
    )

