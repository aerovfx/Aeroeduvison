"""FastAPI cho BioGrowth"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict
import uvicorn
from main import *

app = FastAPI(title="BioGrowth API", version="1.0.0")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class ExponentialRequest(BaseModel):
    N0: float = Field(100, description="Quần thể ban đầu")
    r: float = Field(0.5, description="Tốc độ tăng trưởng")
    t_max: float = Field(10, description="Thời gian (h)")

class LogisticRequest(BaseModel):
    N0: float = Field(100)
    r: float = Field(0.5)
    K: float = Field(10000, description="Carrying capacity")
    t_max: float = Field(50)

class BacterialRequest(BaseModel):
    N0: float = Field(100)
    r_max: float = Field(0.7)
    K: float = Field(1e8)
    t_max: float = Field(48)

class MutationRequest(BaseModel):
    sequence_length: int = Field(100, ge=10, le=1000)
    generations: int = Field(10, ge=1, le=50)
    mutation_rate: float = Field(1e-6, gt=0, lt=1)

@app.get("/")
async def root():
    return {"name": "BioGrowth API", "version": "1.0.0"}

@app.post("/api/exponential")
async def simulate_exponential(req: ExponentialRequest):
    try:
        sim = ExponentialGrowth(N0=req.N0, r=req.r)
        return {"status": "success", "data": sim.to_dict()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/logistic")
async def simulate_logistic(req: LogisticRequest):
    try:
        sim = LogisticGrowth(N0=req.N0, r=req.r, K=req.K)
        return {"status": "success", "data": sim.to_dict()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/bacterial")
async def simulate_bacterial(req: BacterialRequest):
    try:
        sim = BacterialCulture(N0=req.N0, r_max=req.r_max, K=req.K)
        result = sim.simulate(t_max=req.t_max)
        return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/mutations")
async def predict_mutations(req: MutationRequest):
    try:
        predictor = GeneticMutationPredictor(mutation_rate=req.mutation_rate)
        seq = predictor.generate_sequence(req.sequence_length)
        result = predictor.predict_mutations(seq, req.generations)
        return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "biogrowth"}

if __name__ == "__main__":
    print("🧬 BioGrowth API: http://localhost:8005/docs")
    uvicorn.run("api:app", host="0.0.0.0", port=8005, reload=True)



