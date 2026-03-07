"""
FastAPI Backend for ChemLab 3D - Virtual Chemistry Laboratory
Features: Reaction balancing, Thermodynamics, 3D molecules
Author: AI Assistant
Date: 2024-10-12
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, Dict, List
import uvicorn

from chemistry_engine import VirtualLab, ReactionBalancer, ThermodynamicsEngine, MoleculeGenerator

app = FastAPI(
    title="ChemLab 3D API",
    description="Virtual Chemistry Laboratory: Reactions, Thermodynamics, 3D Molecules",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize lab
virtual_lab = VirtualLab()

# ==========================================
# REQUEST MODELS
# ==========================================

class BalanceRequest(BaseModel):
    equation: str

class EnthalpyRequest(BaseModel):
    reactants: Dict[str, float]  # {formula: moles}
    products: Dict[str, float]

class GibbsRequest(BaseModel):
    deltaH: float  # kJ/mol
    deltaS: float  # J/mol·K
    temperature: float = 298.15  # K

class MoleculeRequest(BaseModel):
    smiles: str

class ExperimentRequest(BaseModel):
    equation: str
    temperature: float = 298.15
    pressure: float = 1.0

# ==========================================
# ENDPOINTS
# ==========================================

@app.get("/")
async def root():
    return {
        "service": "ChemLab 3D API",
        "version": "1.0.0",
        "status": "running",
        "features": [
            "Chemical Equation Balancing",
            "Thermodynamics Calculations",
            "3D Molecule Generation",
            "Virtual Experiments"
        ]
    }

@app.get("/api/health")
async def health():
    return {
        "status": "healthy",
        "chemistry_engine": "ready",
        "rdkit": RDKIT_AVAILABLE,
        "sympy": SYMPY_AVAILABLE
    }

@app.post("/api/balance")
async def balance_equation(request: BalanceRequest):
    """
    Balance chemical equation
    
    Example: "CH4 + O2 -> CO2 + H2O"
    Returns: "CH4 + 2O2 -> CO2 + 2H2O"
    """
    
    try:
        result = virtual_lab.balancer.balance_equation(request.equation)
        return JSONResponse(content={"success": True, "result": result})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/enthalpy")
async def calculate_enthalpy(request: EnthalpyRequest):
    """
    Calculate enthalpy change (ΔH) of reaction
    
    Uses standard enthalpies of formation
    """
    
    try:
        result = virtual_lab.thermo.calculate_enthalpy_change(
            request.reactants,
            request.products
        )
        return JSONResponse(content={"success": True, "result": result})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/gibbs")
async def calculate_gibbs(request: GibbsRequest):
    """
    Calculate Gibbs free energy (ΔG)
    
    Determines if reaction is spontaneous
    """
    
    try:
        result = virtual_lab.thermo.calculate_gibbs_energy(
            request.deltaH,
            request.deltaS,
            request.temperature
        )
        return JSONResponse(content={"success": True, "result": result})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/molecule/3d")
async def generate_3d_molecule(request: MoleculeRequest):
    """
    Generate 3D molecular structure from SMILES
    
    Returns atomic coordinates for WebGL rendering
    """
    
    try:
        result = virtual_lab.mol_gen.generate_3d_structure(request.smiles)
        return JSONResponse(content={"success": result.get('success', False), "result": result})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/molecule/info")
async def get_molecule_info(request: MoleculeRequest):
    """
    Get molecular properties
    """
    
    try:
        result = virtual_lab.mol_gen.get_molecule_info(request.smiles)
        return JSONResponse(content={"success": True, "result": result})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/experiment")
async def run_experiment(request: ExperimentRequest):
    """
    Run complete virtual experiment
    
    Includes: balancing, thermodynamics, animation data
    """
    
    try:
        result = virtual_lab.run_experiment(
            request.equation,
            request.temperature,
            request.pressure
        )
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/reactions/common")
async def get_common_reactions():
    """Get database of common reactions"""
    
    try:
        result = virtual_lab.get_common_reactions()
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/molecules/common")
async def get_common_molecules():
    """Get common molecules with SMILES"""
    
    common = {
        'water': {'name': 'Nước', 'smiles': 'O', 'formula': 'H2O'},
        'methane': {'name': 'Methane', 'smiles': 'C', 'formula': 'CH4'},
        'ethanol': {'name': 'Ethanol', 'smiles': 'CCO', 'formula': 'C2H5OH'},
        'glucose': {'name': 'Glucose', 'smiles': 'C(C1C(C(C(C(O1)O)O)O)O)O', 'formula': 'C6H12O6'},
        'benzene': {'name': 'Benzene', 'smiles': 'c1ccccc1', 'formula': 'C6H6'},
        'aspirin': {'name': 'Aspirin', 'smiles': 'CC(=O)Oc1ccccc1C(=O)O', 'formula': 'C9H8O4'}
    }
    
    return JSONResponse(content={"success": True, "molecules": common})

if __name__ == "__main__":
    print("🚀 Starting ChemLab 3D API...")
    print("📍 Port: 8015")
    print("🧪 Features:")
    print("   - Chemical equation balancing")
    print("   - Thermodynamics calculations")
    print("   - 3D molecule generation")
    print("   - Virtual experiments")
    print()
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8015,
        reload=True,
        log_level="info"
    )

