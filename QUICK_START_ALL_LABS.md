# 🚀 Quick Start - All Labs & Simulations

## 1️⃣ Start All Python APIs (3 terminals)

### Terminal 1 - Aerodynamics (Port 8007)
```bash
cd python-simulations/aerodynamics
python api.py
```

### Terminal 2 - WFC Builder (Port 8008)
```bash
cd python-simulations/wfc-builder
python api.py
```

### Terminal 3 - DataSim.AI (Port 8009)
```bash
cd python-simulations/datasim-ai
python api.py
```

## 2️⃣ Start Next.js (Terminal 4)

```bash
npm run dev
```

## 3️⃣ Access Pages

### Main Entry
```
http://localhost:3000/dashboard/labtwin
```

### All Labs
```
http://localhost:3000/dashboard/labtwin/labs
```

### Individual Simulations
```
http://localhost:3000/dashboard/labtwin/labs/aerodynamics
http://localhost:3000/dashboard/labtwin/labs/wfc-builder
http://localhost:3000/dashboard/labtwin/labs/datasim-ai
```

## 4️⃣ Health Check

```bash
# Check all APIs are running
curl http://localhost:8007/health
curl http://localhost:8008/health
curl http://localhost:8009/health

# All should return: {"status":"healthy"}
```

## 5️⃣ API Documentation

```
http://localhost:8007/docs  - Aerodynamics
http://localhost:8008/docs  - WFC Builder
http://localhost:8009/docs  - DataSim.AI
```

---

## 🎨 New UI Features

✅ Card-based design  
✅ Pastel gradients (yellow, pink, purple, blue)  
✅ Emoji icons everywhere  
✅ Modal popups for details  
✅ Hover animations  
✅ Category grouping  
✅ XP & achievement system  
✅ Progress tracking  

---

## 📊 Systems Overview

| System | Port | Category | Tech | XP |
|--------|------|----------|------|-----|
| Aerodynamics | 8007 | Physics | Navier-Stokes, NumPy | 150 |
| WFC Builder | 8008 | Procedural | WFC Algorithm, Voxels | 180 |
| DataSim.AI | 8009 | ML | scikit-learn, PyTorch | 200 |

**Total**: 3 systems | 3 ports | 530 XP | 60+ files

---

## 🎯 Quick Commands

### Rebuild all data:
```bash
cd python-simulations/aerodynamics && python build.py
cd python-simulations/wfc-builder && python build.py
cd python-simulations/datasim-ai && python build.py
```

### Stop all APIs:
```bash
pkill -f "python.*api.py"
```

### Check running processes:
```bash
lsof -i :8007
lsof -i :8008
lsof -i :8009
```

---

**Status**: 🎉 ALL SYSTEMS READY!  
**Documentation**: 15+ MD files  
**Quality**: Production-ready  
**Target**: Students 12-18 years old


