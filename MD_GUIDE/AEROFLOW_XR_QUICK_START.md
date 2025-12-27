# 🚀 AeroFlow XR - Quick Start (5 Minutes)

**Get 3D fluid simulation running in 5 minutes!**

---

## ⚡ TL;DR

```bash
# Terminal 1: Python API
cd python-simulations/aeroflow-3d
./start_api.sh

# Terminal 2: Next.js
npm run dev

# Browser
open http://localhost:3000/dashboard/labtwin/labs/aeroflow-3d
```

Click "Sphere in Flow" → Wait 5s → Click Play → 🎉

---

## 📋 Prerequisites Check

```bash
# Python 3.8+
python3 --version

# Node 18+
node --version

# GPU (optional but recommended)
# NVIDIA: nvidia-smi
# Mac: system_profiler SPDisplaysDataType
```

---

## 🔧 Setup (First Time Only)

### 1. Install Python Dependencies (2 min)

```bash
cd python-simulations/aeroflow-3d
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**Expected output:**
```
Successfully installed taichi-1.7.0 fastapi-0.104.0 ...
```

### 2. Verify GPU (30 sec)

```bash
python -c "import taichi as ti; ti.init(arch=ti.gpu); print('✅ GPU Ready')"
```

**Good output:**
```
[Taichi] Starting on arch=metal (or cuda/vulkan)
✅ GPU Ready
```

**Fallback (CPU mode):**
```
⚠️  Using CPU backend (slower but works)
```

### 3. Install Frontend Dependencies (1 min)

```bash
cd ../..  # Back to project root
npm install
```

---

## 🎮 Run Simulation

### Step 1: Start Python API

```bash
cd python-simulations/aeroflow-3d
./start_api.sh
```

Wait for:
```
🚀 Starting AeroFlow XR API on port 8008...
✅ Ready to receive simulation requests!
```

Keep this terminal running!

### Step 2: Start Next.js

**New terminal:**
```bash
npm run dev
```

Wait for:
```
✓ Ready on http://localhost:3000
```

### Step 3: Open Browser

```
http://localhost:3000/dashboard/labtwin/labs/aeroflow-3d
```

### Step 4: Run First Simulation

1. Click **"🔵 Sphere in Flow"** button
2. Wait 5-10 seconds (you'll see loading spinner)
3. Success! You should see:
   - 3D particle visualization
   - Drag/Lift coefficients
   - Playback controls

4. Click **Play** button to watch animation
5. Use mouse to rotate/zoom the 3D view

---

## 🎯 Quick Test

### Test API Directly

```bash
curl http://localhost:8008/health
```

**Expected:**
```json
{
  "status": "healthy",
  "taichi_version": "1.7.0",
  "backend": "GPU",
  "ready": true
}
```

### Test Simulation

```bash
curl -X POST http://localhost:8008/simulate \
  -H "Content-Type: application/json" \
  -d '{"grid_size": [64,32,32], "steps": 20, "obstacle": {"type": "sphere", "position": [30,16,16], "radius": 6}}'
```

Should return JSON with `"success": true` and simulation results.

---

## 🐛 Common Issues

### Issue: "ModuleNotFoundError: taichi"

**Fix:**
```bash
cd python-simulations/aeroflow-3d
source venv/bin/activate  # Forgot to activate!
pip install -r requirements.txt
```

### Issue: "Connection refused"

**Fix:** Make sure Python API is running on port 8008
```bash
# Check if running
curl http://localhost:8008/health
```

### Issue: "Three.js not found"

**Fix:**
```bash
npm install three @react-three/fiber @react-three/drei
```

### Issue: Very slow (>30s)

**Fix:** Reduce grid size in preset or use CPU mode
```json
"grid_size": [48, 24, 24]
```

---

## 📊 Expected Performance

| Hardware | Time (50 steps) | FPS |
|----------|-----------------|-----|
| **GPU (NVIDIA/M1)** | 3-5 seconds | 15-25 |
| **CPU only** | 15-20 seconds | 2-4 |

---

## 🎓 What's Next?

### Try Other Presets
- ⚪ Small Sphere
- 🔴 Large Sphere
- ⚡ High Speed Flow

### Explore Settings
- Toggle velocity vectors
- Adjust playback speed
- View performance stats

### Read Full Guide
See `AEROFLOW_XR_MVP_GUIDE.md` for:
- Detailed API reference
- Architecture explanation
- Customization options
- Troubleshooting

---

## 🎉 Success Checklist

- [ ] Python API starts without errors
- [ ] `curl http://localhost:8008/health` returns healthy
- [ ] Next.js runs on http://localhost:3000
- [ ] Page loads without errors
- [ ] Can click preset and see simulation
- [ ] 3D particles render
- [ ] Can play/pause animation
- [ ] Can rotate 3D view with mouse

All checked? **You're ready! 🚀**

---

## 📚 Resources

- **Full Guide**: `AEROFLOW_XR_MVP_GUIDE.md`
- **API Docs**: http://localhost:8008/docs
- **Python README**: `python-simulations/aeroflow-3d/README.md`

---

## 🆘 Need Help?

1. Check `AEROFLOW_XR_MVP_GUIDE.md` Troubleshooting section
2. Verify prerequisites are installed
3. Make sure both terminals are running
4. Check browser console for errors (F12)

---

**Built with ❤️ - Get fluid simulation running in minutes!**

Last updated: October 14, 2025

