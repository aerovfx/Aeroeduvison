# 🎓 Hệ thống Phòng thí nghiệm Ảo - LMS Math

## 🎉 6 Phòng thí nghiệm hoàn chỉnh

| Lab | Category | Port | Features | AI/ML | Status |
|-----|----------|------|----------|-------|--------|
| 🔬 **Optics** | Quang học | 8002 | Khúc xạ, tán sắc, lens | - | ✅ |
| 🧪 **Chemistry** | Hóa học | 8003 | Cân bằng PT, mol, reactions | - | ✅ |
| 🚀 **Physics** | Chuyển động | 8004 | Rơi, ném xiên, SHM | Linear Reg | ✅ |
| 🧬 **BioGrowth** | Sinh học | 8005 | Tăng trưởng, ODE | Mutations | ✅ |
| ⚙️ **MechaForce** | Cơ học | 8007 | Dầm, khung 3D | GA Optimize | ✅ |
| 🌡️ **ThermoFlow** | Nhiệt/Lưu | 8006 | PDE, heatmap | Hotspot | ✅ |

---

## 🚀 Quick Start

### Start tất cả (1 lệnh)
```bash
cd python-simulations
bash START_ALL_SIMULATIONS.sh
```

### Start từng cái
```bash
cd optics-lab && bash start_api.sh      # Port 8002
cd chemistry-lab && bash start_api.sh   # Port 8003
cd physics-motion && bash start_api.sh  # Port 8004
cd biogrowth && bash start_api.sh       # Port 8005
cd thermoflow && bash start_api.sh      # Port 8006
cd mechaforce && bash start_api.sh      # Port 8007
```

### Stop tất cả
```bash
bash STOP_ALL_SIMULATIONS.sh
```

---

## 📡 API Access

### Swagger Documentation
- **Optics**: http://localhost:8002/docs
- **Chemistry**: http://localhost:8003/docs
- **Physics**: http://localhost:8004/docs
- **BioGrowth**: http://localhost:8005/docs
- **ThermoFlow**: http://localhost:8006/docs
- **MechaForce**: http://localhost:8007/docs

### Example Calls
```bash
# Optics - Khúc xạ
curl -X POST http://localhost:8002/api/refraction \
  -H "Content-Type: application/json" \
  -d '{"n1": 1.0, "n2": 1.33, "angle_deg": 45}'

# Chemistry - Cân bằng
curl -X POST http://localhost:8003/api/balance \
  -H "Content-Type: application/json" \
  -d '{"equation": "H2 + O2 -> H2O"}'

# Physics - AI Prediction
curl -X POST http://localhost:8004/api/predict \
  -H "Content-Type: application/json" \
  -d '{"motion_type": "free_fall", "training_data": [...], "predict_times": [1,2,3]}'
```

---

## 📊 Features Comparison

| Feature | Optics | Chem | Physics | Bio | Thermo | Mecha |
|---------|--------|------|---------|-----|--------|-------|
| Canvas 2D | ✅ | ✅ | ✅ | ✅ | ✅ | - |
| WebGL 3D | - | - | - | - | - | ✅ |
| AI/ML | - | - | ✅ | ✅ | ✅ | ✅ |
| NumPy | ✅ | - | ✅ | ✅ | ✅ | ✅ |
| SciPy | - | - | - | ✅ | - | - |
| PDE | - | - | - | - | ✅ | - |
| ODE | - | - | - | ✅ | - | - |

---

## 🎯 Use Cases

### Giáo dục
- Minh họa bài giảng
- Thí nghiệm tương tác
- Bài tập có hướng dẫn

### Nghiên cứu
- Demo khoa học
- Prototype nhanh
- Data visualization

### Phát triển
- API integration
- Web/mobile apps
- Educational games

---

## 📚 Documentation

### Master Guides
- `COMPLETE_VIRTUAL_LABS_SYSTEM.md` - Tổng quan hệ thống
- `SIMULATIONS_MASTER_GUIDE.md` - Hướng dẫn sử dụng
- `FINAL_6_SIMULATIONS_SUMMARY.md` - Tóm tắt kỹ thuật

### Individual Docs
Each simulation has complete documentation in its directory.

---

## 🌟 Highlights

### Scientific Accuracy
✅ Real physics formulas  
✅ Chemical equations balanced  
✅ Biological models validated  

### AI Integration
✅ 4 AI/ML models  
✅ Predictions & optimization  
✅ Real-world applications  

### Developer Experience
✅ RESTful APIs  
✅ Swagger docs  
✅ Type safety  
✅ Easy deployment  

---

## 📞 Support

### Quick Help
1. Check `/docs` endpoint for API specs
2. Run `python3 main.py` to test core
3. Check logs in `/tmp/*.log`
4. See individual README.md files

### Troubleshooting
```bash
# Restart specific simulation
cd python-simulations/optics-lab
bash start_api.sh

# Check if running
ps aux | grep uvicorn

# Kill all
bash STOP_ALL_SIMULATIONS.sh
```

---

**Total**: 6 simulations, 26 endpoints, 4 AI models, ~5,000 lines

**Ready to use!** 🎉🚀✨



