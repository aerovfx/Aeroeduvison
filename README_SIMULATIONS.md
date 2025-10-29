# 🧪 LMS Simulations - Complete Guide

## 🎯 Overview

Hệ thống **11 công cụ giáo dục tương tác** bao gồm:
- 10 Python Simulations (labs)
- 1 Real-time Weather + Earthquake Module

---

## 🚀 Quick Start (1 command)

```bash
./START_ALL_LABS.sh
```

Sau đó truy cập: `http://localhost:3000/dashboard/labtwin`

---

## 📚 All Simulations

### 1. 🌬️ Aerodynamics (Port 8007)
**Category**: Cơ học | **XP**: 150

- Navier-Stokes fluid solver
- Drag & lift forces
- AI optimization
- `/dashboard/labtwin/labs/aerodynamics`

### 2. 🏗️ WFC Builder (Port 8008)
**Category**: Procedural Generation | **XP**: 180

- Wave Function Collapse 3D
- Procedural architecture
- `/dashboard/labtwin/labs/wfc-builder`

### 3. 🤖 DataSim.AI (Port 8009)
**Category**: Machine Learning | **XP**: 200

- 6 ML models (scikit-learn + PyTorch)
- Decision boundaries
- `/dashboard/labtwin/labs/datasim-ai`

### 4. 🔥 ThermoFlow (Port 8010)
**Category**: Nhiệt học | **XP**: 120

- Heat equation solver
- Thermal heatmaps
- `/dashboard/labtwin/labs/thermoflow`

### 5. 🚀 MotionSim (Port 8012)
**Category**: Cơ học | **XP**: 100

- Free fall, projectile, harmonic
- Motion graphs
- `/dashboard/labtwin/labs/motionsim`

### 6. 🌍 Weather + Earthquake (Port 8013)
**Category**: Geography

- Real-time weather (15+ cities)
- Live earthquake data
- `/dashboard/weather`

### 7-10. Existing Labs
- Khúc xạ ánh sáng (Quang học)
- Chuyển động ném xiên (Cơ học)
- Dao động điều hòa (Cơ học)
- Motion Tracking (Computer Vision)
- OCR Pipeline (Computer Vision)

---

## 🎨 UI Theme

**Student-Friendly Design**:
- 🌈 Pastel gradients
- 😊 Emoji icons
- 🎮 XP & achievements
- 🎯 Card layouts
- ✨ Smooth animations

---

## 📊 By Category

| Category | Count | Total XP |
|----------|-------|----------|
| ⚡ Cơ học | 4 | 410 |
| 🔥 Nhiệt học | 1 | 120 |
| 💡 Quang học | 1 | 80 |
| 👁️ Computer Vision | 2 | 250 |
| 🎲 Procedural Gen | 1 | 180 |
| 🤖 Machine Learning | 1 | 200 |

**Total**: 10 labs | 1,240 XP

---

## 🔧 Commands

### Start all:
```bash
./START_ALL_LABS.sh
```

### Stop all:
```bash
pkill -f "python.*api.py"
```

### Test all:
```bash
./test-all-simulations.sh
```

### Rebuild data:
```bash
cd python-simulations
python build-all.py  # If available
# Or individually:
cd aerodynamics && python build.py
cd ../wfc-builder && python build.py
# etc...
```

---

## 📡 Ports

| Port | Service |
|------|---------|
| 3000 | Next.js UI |
| 8007 | Aerodynamics |
| 8008 | WFC Builder |
| 8009 | DataSim.AI |
| 8010 | ThermoFlow |
| 8012 | MotionSim |
| 8013 | Weather+EQ |

---

## 📖 Documentation

- **COMPLETE_PROJECT_SUMMARY.md** - Full overview
- **QUICK_START_ALL_LABS.md** - Quick start guide
- **CATEGORY_FILTER_GUIDE.md** - Category filtering
- **UI_REDESIGN_COMPLETE.md** - UI design guide
- Individual READMEs in each `python-simulations/*/`

---

## 🎓 For Students

**Access**: `http://localhost:3000/dashboard/labtwin`

**How to use**:
1. Browse categories or view all labs
2. Click on a lab to start
3. Follow interactive instructions
4. Earn XP and achievements
5. Track your progress

---

## 👨‍💻 For Developers

**Structure**:
```
python-simulations/     # Python backends
  ├── aerodynamics/
  ├── wfc-builder/
  ├── datasim-ai/
  ├── thermoflow/
  ├── motionsim/
  └── weather-sim/

app/(dashboard)/.../labtwin/labs/  # React UIs
components/simulations/             # Shared components
public/labs/                        # Static data
```

**Add new simulation**:
1. Create folder in `python-simulations/`
2. Write `main.py`, `api.py`, `build.py`
3. Run `python build.py`
4. Copy to `public/labs/`
5. Add to `index.json`
6. Create React page

---

**Status**: ✅ Complete  
**Quality**: Production  
**Ready**: For deployment

🎉 Happy Learning! 🎓



