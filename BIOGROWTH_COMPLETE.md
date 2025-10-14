# 🧬 BioGrowth - Hoàn tất!

## ✅ Summary

**BioGrowth - Phòng thí nghiệm Sinh học Tăng trưởng** với:
- ✅ Exponential & Logistic growth
- ✅ **SciPy ODE solver** (odeint, solve_ivp)
- ✅ Bacterial culture (4 phases)
- ✅ Cell division
- ✅ **AI genetic mutation predictor**
- ✅ Curve fitting (curve_fit)

## 📦 Files

```
biogrowth/
├── main.py              ✅ 600+ lines
├── api.py               ✅ FastAPI
├── build.py             ✅ Build script
├── manifest.json        ✅
├── README.md            ✅
├── requirements.txt     ✅ (scipy!)
├── start_api.sh         ✅
└── output/data.json     ✅
```

## 🎯 Features

### 1. Exponential Growth
- **Formula**: N(t) = N₀e^(rt)
- **Doubling time**: T_d = ln(2)/r

### 2. Logistic Growth  
- **ODE**: dN/dt = rN(1 - N/K)
- **Solver**: SciPy `odeint`
- **Inflection**: t* = ln((K-N₀)/N₀)/r

### 3. Bacterial Culture
- **4 Phases**: Lag → Exponential → Stationary → Death
- **Solver**: SciPy `solve_ivp` (RK45)

### 4. Cell Division
- **Binary fission**: N(gen) = N₀ × 2^gen

### 5. AI Mutation Predictor
- **Random mutations**: A→T, G→C...
- **Statistics**: Total, avg per generation
- **Analysis**: Sequence similarity

### 6. Curve Fitting
- **Exponential fit**: curve_fit
- **Logistic fit**: curve_fit
- **Metrics**: R²

## 🚀 Usage

```bash
cd python-simulations/biogrowth
python3 main.py        # ✅ Test passed
python3 build.py       # ✅ Build complete
bash start_api.sh      # Port 8005
```

## 📡 API (Port 8005)

| Endpoint | Description |
|----------|-------------|
| `/api/exponential` | Exponential growth |
| `/api/logistic` | Logistic (SciPy ODE) |
| `/api/bacterial` | Bacterial culture |
| `/api/mutations` | AI predictions |

## 📊 Example Output

### Exponential
- N₀=100, r=0.5 → Doubling: 1.39h
- N(10h) = 14,841

### Logistic
- K=10,000 → Inflection: 9.19h at N=5,000

### Mutations
- Sequence: 20 bases
- 5 generations → 1 mutation
- Avg: 0.2 mutations/gen

## 🧬 Biology Concepts

- **Exponential**: Unlimited resources
- **Logistic**: Limited resources (K)
- **Lag phase**: Adaptation period
- **Carrying capacity**: Max population
- **Mutation rate**: ~1e-6 per base per generation

## 🤖 AI Model

**Type**: Probabilistic mutation model  
**Input**: DNA sequence, mutation rate  
**Output**: Mutated sequence, statistics  
**Features**: Position, type, frequency

## 📈 Stats

- **Code**: ~600 lines
- **Models**: 6 (Exp, Log, Bacterial, Cell, Mutation, Fit)
- **SciPy**: odeint, solve_ivp, curve_fit
- **API**: 4 endpoints
- **Port**: 8005

## ✨ Highlights

✅ **SciPy Integration** - ODE solvers  
✅ **AI Genetics** - Mutation predictor  
✅ **4 Growth Phases** - Complete bacterial lifecycle  
✅ **Curve Fitting** - Fit experimental data  
✅ **FastAPI** - RESTful API  

## 🎓 Education

**Lớp 10**: Tăng trưởng exponential  
**Lớp 11**: Vi sinh vật, nuôi cấy  
**Lớp 12**: Gen, đột biến, di truyền

---

**Status**: ✅ **COMPLETE**  
**Date**: 2024-10-12  
**Version**: 1.0.0

🧬 **Biology + AI + SciPy = BioGrowth!** ✨



