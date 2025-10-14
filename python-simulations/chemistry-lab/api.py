"""
FastAPI Backend cho Phòng thí nghiệm Hóa học ảo
Endpoints: /balance, /calculate, /reactions, /simulate
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
import uvicorn

from main import (
    ChemicalEquation,
    MolCalculator,
    ChemicalReaction,
    Molecule,
    ATOMIC_MASSES
)

app = FastAPI(
    title="Phòng thí nghiệm Hóa học ảo API",
    description="API mô phỏng phản ứng hóa học, cân bằng phương trình, tính toán mol",
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

class BalanceEquationRequest(BaseModel):
    equation: str = Field(..., description="Phương trình hóa học: H2 + O2 -> H2O")

class MolCalculationRequest(BaseModel):
    calculation_type: str = Field(..., description="Type: mass_to_mol, mol_to_mass, mol_to_volume, etc.")
    mass: Optional[float] = Field(None, description="Khối lượng (g)")
    mol: Optional[float] = Field(None, description="Số mol")
    molecular_mass: Optional[float] = Field(None, description="Khối lượng phân tử (g/mol)")
    volume: Optional[float] = Field(None, description="Thể tích (L)")
    temperature: Optional[float] = Field(273, description="Nhiệt độ (K)")
    pressure: Optional[float] = Field(1, description="Áp suất (atm)")
    concentration: Optional[float] = Field(None, description="Nồng độ (M)")

class MolecularMassRequest(BaseModel):
    formula: str = Field(..., description="Công thức hóa học: H2O, CuSO4")

class SimulateReactionRequest(BaseModel):
    reaction_id: str = Field(..., description="ID phản ứng")
    reactant_amounts: Dict[str, float] = Field(..., description="Lượng chất tham gia (mol)")

# ==========================================
# ENDPOINTS
# ==========================================

@app.get("/")
async def root():
    """Endpoint gốc"""
    return {
        "name": "Phòng thí nghiệm Hóa học ảo API",
        "version": "1.0.0",
        "endpoints": {
            "balance": "/api/balance",
            "calculate": "/api/calculate",
            "molecular_mass": "/api/molecular-mass",
            "reactions": "/api/reactions",
            "simulate": "/api/simulate",
            "elements": "/api/elements"
        }
    }

@app.post("/api/balance")
async def balance_equation(request: BalanceEquationRequest):
    """
    Cân bằng phương trình hóa học
    
    - **equation**: Phương trình dạng "H2 + O2 -> H2O"
    
    Trả về:
    - Phương trình đã cân bằng
    - Thông tin các chất tham gia và sản phẩm
    """
    try:
        eq = ChemicalEquation(request.equation)
        
        # Thử cân bằng
        eq.balance()
        
        return {
            "status": "success",
            "data": eq.to_dict()
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/calculate")
async def calculate_mol(request: MolCalculationRequest):
    """
    Tính toán mol, khối lượng, thể tích
    
    Các loại tính toán:
    - **mass_to_mol**: Khối lượng → Mol
    - **mol_to_mass**: Mol → Khối lượng
    - **mol_to_volume**: Mol → Thể tích (khí)
    - **volume_to_mol**: Thể tích → Mol
    - **concentration_to_mol**: Nồng độ × Thể tích → Mol
    - **mol_to_concentration**: Mol ÷ Thể tích → Nồng độ
    """
    try:
        calc = MolCalculator()
        result = {}
        
        if request.calculation_type == "mass_to_mol":
            if request.mass is None or request.molecular_mass is None:
                raise ValueError("Cần mass và molecular_mass")
            result['mol'] = calc.mass_to_mol(request.mass, request.molecular_mass)
            result['formula'] = f"{request.mass}g ÷ {request.molecular_mass}g/mol = {result['mol']} mol"
        
        elif request.calculation_type == "mol_to_mass":
            if request.mol is None or request.molecular_mass is None:
                raise ValueError("Cần mol và molecular_mass")
            result['mass'] = calc.mol_to_mass(request.mol, request.molecular_mass)
            result['formula'] = f"{request.mol} mol × {request.molecular_mass}g/mol = {result['mass']}g"
        
        elif request.calculation_type == "mol_to_volume":
            if request.mol is None:
                raise ValueError("Cần mol")
            result['volume'] = calc.mol_to_volume(
                request.mol, 
                request.temperature or 273, 
                request.pressure or 1
            )
            result['formula'] = f"{request.mol} mol × 22.4 L/mol (đktc) = {result['volume']} L"
        
        elif request.calculation_type == "volume_to_mol":
            if request.volume is None:
                raise ValueError("Cần volume")
            result['mol'] = calc.volume_to_mol(
                request.volume,
                request.temperature or 273,
                request.pressure or 1
            )
            result['formula'] = f"{request.volume} L ÷ 22.4 L/mol (đktc) = {result['mol']} mol"
        
        elif request.calculation_type == "concentration_to_mol":
            if request.concentration is None or request.volume is None:
                raise ValueError("Cần concentration và volume")
            result['mol'] = calc.concentration_to_mol(request.concentration, request.volume)
            result['formula'] = f"{request.concentration}M × {request.volume}L = {result['mol']} mol"
        
        elif request.calculation_type == "mol_to_concentration":
            if request.mol is None or request.volume is None:
                raise ValueError("Cần mol và volume")
            result['concentration'] = calc.mol_to_concentration(request.mol, request.volume)
            result['formula'] = f"{request.mol} mol ÷ {request.volume}L = {result['concentration']}M"
        
        else:
            raise ValueError(f"Loại tính toán không hợp lệ: {request.calculation_type}")
        
        return {
            "status": "success",
            "calculation_type": request.calculation_type,
            "data": result
        }
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/molecular-mass")
async def get_molecular_mass(request: MolecularMassRequest):
    """
    Tính khối lượng phân tử
    
    - **formula**: Công thức hóa học (VD: H2O, CuSO4, Ca(OH)2)
    
    Trả về:
    - Khối lượng phân tử (g/mol)
    - Thành phần nguyên tố
    """
    try:
        mol = Molecule(request.formula)
        
        return {
            "status": "success",
            "data": {
                "formula": request.formula,
                "molecular_mass": mol.get_molecular_mass(),
                "elements": mol.parse_formula()
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/reactions")
async def list_reactions():
    """Liệt kê các phản ứng có sẵn"""
    try:
        reactions = ChemicalReaction.list_reactions()
        return {
            "status": "success",
            "data": reactions,
            "count": len(reactions)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/reactions/{reaction_id}")
async def get_reaction(reaction_id: str):
    """Lấy thông tin chi tiết một phản ứng"""
    try:
        reaction = ChemicalReaction.get_reaction(reaction_id)
        if not reaction:
            raise HTTPException(status_code=404, detail="Phản ứng không tồn tại")
        
        return {
            "status": "success",
            "data": reaction
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/simulate")
async def simulate_reaction(request: SimulateReactionRequest):
    """
    Mô phỏng phản ứng với lượng chất cụ thể
    
    - **reaction_id**: ID phản ứng (VD: "zn_hcl", "cuso4_naoh")
    - **reactant_amounts**: Dict lượng chất {"HCl": 0.1, "NaOH": 0.1} (mol)
    
    Trả về:
    - Chất hạn chế
    - Lượng sản phẩm tạo thành
    - Lượng chất dư
    - Hiệu ứng phản ứng
    """
    try:
        result = ChemicalReaction.simulate_reaction(
            request.reaction_id,
            request.reactant_amounts
        )
        
        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])
        
        return {
            "status": "success",
            "data": result
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/elements")
async def get_elements():
    """Lấy danh sách các nguyên tố và khối lượng nguyên tử"""
    try:
        elements = [
            {"symbol": symbol, "atomic_mass": mass, "name": symbol}
            for symbol, mass in sorted(ATOMIC_MASSES.items())
        ]
        
        return {
            "status": "success",
            "data": elements,
            "count": len(elements)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/presets/calculations")
async def get_calculation_presets():
    """Các preset cho tính toán"""
    presets = [
        {
            "id": "water_mass_to_mol",
            "name": "Tính mol của H₂O",
            "calculation_type": "mass_to_mol",
            "data": {"mass": 36, "molecular_mass": 18},
            "description": "36g H₂O = ? mol"
        },
        {
            "id": "co2_mol_to_volume",
            "name": "Thể tích CO₂ (đktc)",
            "calculation_type": "mol_to_volume",
            "data": {"mol": 0.5, "temperature": 273, "pressure": 1},
            "description": "0.5 mol CO₂ = ? L (đktc)"
        },
        {
            "id": "nacl_concentration",
            "name": "Nồng độ NaCl",
            "calculation_type": "mol_to_concentration",
            "data": {"mol": 0.2, "volume": 1},
            "description": "0.2 mol NaCl trong 1L = ? M"
        }
    ]
    return {"status": "success", "data": presets}

@app.get("/health")
async def health_check():
    """Kiểm tra sức khỏe API"""
    return {
        "status": "healthy",
        "service": "chemistry-lab",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    print("🧪 Khởi động Phòng thí nghiệm Hóa học ảo API")
    print("📡 Swagger docs: http://localhost:8003/docs")
    print("🌐 API: http://localhost:8003")
    
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=8003,
        reload=True,
        log_level="info"
    )


