# 🧬 BioGrowth - Sinh học Tăng trưởng

Mô phỏng tăng trưởng sinh học với **SciPy ODE solver** và **AI mutation predictor**.

## Features

✅ **Exponential Growth** - dN/dt = rN  
✅ **Logistic Growth** - SciPy odeint  
✅ **Bacterial Culture** - 4 phases (lag, exponential, stationary, death)  
✅ **Cell Division** - Phân chia nhị phân  
✅ **AI Mutations** - Dự đoán biến thể gen  
✅ **Curve Fitting** - Fit data thực nghiệm  

## Quick Start

```bash
cd python-simulations/biogrowth
python3 main.py        # Test ✅
python3 build.py       # Build data
bash start_api.sh      # API: http://localhost:8005
```

## API

- `/api/exponential` - Tăng trưởng exponential
- `/api/logistic` - Logistic với SciPy
- `/api/bacterial` - Nuôi cấy vi khuẩn
- `/api/mutations` - AI dự đoán đột biến

## Formulas

**Exponential**: N(t) = N₀e^(rt)  
**Logistic**: dN/dt = rN(1 - N/K)  
**Doubling time**: T_d = ln(2)/r  

---

**Docs**: http://localhost:8005/docs 🧬




