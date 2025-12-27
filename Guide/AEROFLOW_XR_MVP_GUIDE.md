# 🌊 AeroFlow XR MVP - Complete Guide

**3D Fluid Dynamics Simulation on Web**

MVP Version - Simplified scope for 2-week delivery

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Architecture](#architecture)
4. [Installation](#installation)
5. [Usage](#usage)
6. [API Reference](#api-reference)
7. [Development](#development)
8. [Troubleshooting](#troubleshooting)
9. [Next Steps](#next-steps)

---

## 🎯 Overview

### What is AeroFlow XR?

AeroFlow XR is a **3D fluid dynamics simulation system** that runs entirely in the browser, combining:

- **Python Backend**: Taichi GPU-accelerated Navier-Stokes solver
- **Next.js Frontend**: Three.js WebGL particle visualization
- **Real-time API**: FastAPI streaming simulation results

### MVP Scope

✅ **Included in MVP:**
- 64×32×32 voxel grid (65K cells)
- Sphere obstacle support
- 800-1000 particles per frame
- 4 preset scenarios
- GPU acceleration (CUDA/Metal/Vulkan)
- Drag/lift force calculation
- Real-time 3D visualization

🔜 **Future Phases:**
- Volume rendering
- Custom shape editor
- AI optimization (Copernicus)
- Larger grids (128³+)

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.8+** with pip
- **Node.js 18+** with npm
- **GPU** (recommended): NVIDIA/AMD/Apple Silicon
- **Browser**: Chrome/Firefox/Safari (WebGL 2.0 support)

### 5-Minute Setup

#### 1. Start Python API

```bash
cd python-simulations/aeroflow-3d
chmod +x start_api.sh
./start_api.sh
```

Wait for:
```
🚀 Starting AeroFlow XR API on port 8008...
✅ Ready to receive simulation requests!
```

#### 2. Start Next.js Frontend

```bash
# In project root
npm run dev
```

#### 3. Open Browser

Navigate to:
```
http://localhost:3000/dashboard/labtwin/labs/aeroflow-3d
```

#### 4. Run First Simulation

1. Click **"Sphere in Flow"** preset
2. Wait 5-10 seconds for GPU simulation
3. Click **Play** to watch animation
4. Use mouse to rotate/zoom 3D view

---

## 🏗️ Architecture

### System Design

```
┌─────────────────────────────────────────────────────┐
│                 Browser (Client)                     │
│  ┌───────────────────────────────────────────────┐  │
│  │  Next.js App (localhost:3000)                │  │
│  │  ┌─────────────────────────────────────────┐ │  │
│  │  │  /labs/aeroflow-3d/page.tsx            │ │  │
│  │  │  - UI Controls & State                  │ │  │
│  │  │  - API Integration                      │ │  │
│  │  └─────────────────────────────────────────┘ │  │
│  │                    │                          │  │
│  │  ┌─────────────────▼──────────────────────┐  │  │
│  │  │  aeroflow-particle-viewer.tsx          │  │  │
│  │  │  - Three.js WebGL Canvas               │  │  │
│  │  │  - Particle Rendering                   │  │  │
│  │  │  - Camera Controls                      │  │  │
│  │  └─────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP POST /simulate
                       │ JSON data
                       ▼
┌─────────────────────────────────────────────────────┐
│           Python API Server (port 8008)             │
│  ┌───────────────────────────────────────────────┐  │
│  │  FastAPI (api.py)                            │  │
│  │  - /simulate endpoint                         │  │
│  │  - /presets endpoint                          │  │
│  │  - CORS middleware                            │  │
│  └─────────────────┬─────────────────────────────┘  │
│                    │                                 │
│  ┌─────────────────▼─────────────────────────────┐  │
│  │  Taichi Solver (main_taichi.py)              │  │
│  │  - FluidSolver3D class                        │  │
│  │  - GPU kernels (@ti.kernel)                   │  │
│  │  - Navier-Stokes solver                       │  │
│  │  - Particle sampling                          │  │
│  └───────────────────────────────────────────────┘  │
│                    │                                 │
│                    ▼                                 │
│  ┌─────────────────────────────────────────────┐    │
│  │  GPU (CUDA/Metal/Vulkan)                   │    │
│  │  - Parallel computation                     │    │
│  │  - 10-20 FPS simulation                     │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

### Data Flow

```
1. User clicks preset
   ↓
2. Frontend fetches /presets
   ↓
3. Frontend POSTs /simulate with config
   ↓
4. FastAPI receives request
   ↓
5. Taichi solver runs on GPU (5-10s)
   ↓
6. Results serialized to JSON
   ↓
7. Frontend receives simulation data
   ↓
8. Three.js renders particles
   ↓
9. User controls playback/view
```

---

## 📦 Installation

### Backend Setup

#### Step 1: Create Virtual Environment

```bash
cd python-simulations/aeroflow-3d
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

#### Step 2: Install Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

**Key dependencies:**
- `taichi>=1.7.0` - GPU acceleration
- `fastapi>=0.104.0` - API server
- `uvicorn>=0.24.0` - ASGI server
- `numpy>=1.24.0` - Numerical computation

#### Step 3: Verify Installation

```bash
python -c "import taichi as ti; ti.init(arch=ti.gpu); print('✅ Taichi GPU ready')"
```

Expected output:
```
[Taichi] version 1.7.0, llvm 15.0.1, commit 0f4c47c5, macos, python 3.11.5
[Taichi] Starting on arch=metal
✅ Taichi GPU ready
```

### Frontend Setup

#### Step 1: Install Three.js Dependencies

```bash
# In project root
npm install three @react-three/fiber @react-three/drei
```

#### Step 2: Verify Components

```bash
# Check if files exist
ls -la components/simulations/aeroflow-particle-viewer.tsx
ls -la app/\(dashboard\)/\(routes\)/dashboard/labtwin/labs/aeroflow-3d/page.tsx
```

---

## 🎮 Usage

### Running Simulations

#### Method 1: Web UI (Recommended)

1. **Start API**: `cd python-simulations/aeroflow-3d && ./start_api.sh`
2. **Start Frontend**: `npm run dev`
3. **Open**: http://localhost:3000/dashboard/labtwin/labs/aeroflow-3d
4. **Click Preset**: Choose "Sphere in Flow"
5. **Wait**: 5-10 seconds for simulation
6. **Play**: Click play button to watch animation

#### Method 2: API Testing

```bash
# Terminal 1: Start API
cd python-simulations/aeroflow-3d
python api.py

# Terminal 2: Send request
curl -X POST http://localhost:8008/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "grid_size": [64, 32, 32],
    "steps": 30,
    "inlet_velocity": [5.0, 0.0, 0.0],
    "obstacle": {
      "type": "sphere",
      "position": [30, 16, 16],
      "radius": 6.0
    }
  }'
```

#### Method 3: Python Script

```python
from main_taichi import simulate_3d_flow

config = {
    'grid_size': [64, 32, 32],
    'steps': 50,
    'inlet_velocity': [5.0, 0.0, 0.0],
    'obstacle': {
        'type': 'sphere',
        'position': [30, 16, 16],
        'radius': 6.0
    }
}

result = simulate_3d_flow(config)
print(f"Frames: {len(result['results'])}")
print(f"FPS: {result['stats']['avg_fps']:.1f}")
print(f"Drag: {result['final_forces']['drag_coefficient']:.4f}")
```

### Available Presets

| ID | Name | Description | Velocity | Obstacle |
|----|------|-------------|----------|----------|
| `sphere_flow` | Sphere in Flow | Classic vortex street | 5.0 m/s | r=6 |
| `small_sphere` | Small Sphere | Less turbulence | 5.0 m/s | r=4 |
| `large_sphere` | Large Sphere | More vortices | 5.0 m/s | r=8 |
| `fast_flow` | High Speed | Dramatic effects | 8.0 m/s | r=6 |

---

## 📡 API Reference

### Base URL
```
http://localhost:8008
```

### Endpoints

#### `GET /`
Root endpoint with API information.

**Response:**
```json
{
  "name": "AeroFlow XR API",
  "version": "1.0.0-MVP",
  "status": "running",
  "endpoints": {...}
}
```

#### `POST /simulate`
Run a 3D fluid simulation.

**Request Body:**
```json
{
  "grid_size": [64, 32, 32],
  "steps": 50,
  "inlet_velocity": [5.0, 0.0, 0.0],
  "obstacle": {
    "type": "sphere",
    "position": [30, 16, 16],
    "radius": 6.0
  }
}
```

**Response:**
```json
{
  "success": true,
  "config": {...},
  "grid_size": [64, 32, 32],
  "results": [
    {
      "step": 0,
      "time": 0.0,
      "particles": [
        {
          "position": [10, 15, 16],
          "velocity": [5.0, 0.1, 0.0],
          "density": 0.8
        }
      ],
      "forces": {
        "drag": 12.5,
        "lift": 0.3,
        "drag_coefficient": 0.125,
        "lift_coefficient": 0.003
      },
      "particle_count": 823
    }
  ],
  "final_forces": {...},
  "stats": {
    "total_time": 5.2,
    "avg_fps": 9.6,
    "frames": 10
  }
}
```

#### `GET /presets`
Get available simulation presets.

#### `GET /health`
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "taichi_version": "1.7.0",
  "backend": "GPU",
  "ready": true
}
```

---

## 🛠️ Development

### Project Structure

```
lmsmath/
├── python-simulations/
│   └── aeroflow-3d/
│       ├── main_taichi.py      # Taichi solver (460 lines)
│       ├── api.py              # FastAPI server (192 lines)
│       ├── requirements.txt    # Python dependencies
│       ├── start_api.sh        # Startup script
│       ├── README.md           # Backend docs
│       └── output/             # Test outputs
│
├── components/simulations/
│   └── aeroflow-particle-viewer.tsx  # Three.js viewer (280 lines)
│
├── app/(dashboard)/(routes)/dashboard/labtwin/labs/
│   └── aeroflow-3d/
│       └── page.tsx            # Main page (380 lines)
│
└── AEROFLOW_XR_MVP_GUIDE.md   # This file
```

### Key Files

**Backend:**
- `main_taichi.py`: Core simulation logic
  - `FluidSolver3D` class
  - Taichi GPU kernels
  - Force calculation
  - Particle sampling

- `api.py`: REST API
  - FastAPI routes
  - CORS configuration
  - Preset management

**Frontend:**
- `aeroflow-particle-viewer.tsx`: 3D visualization
  - Three.js Canvas
  - Particle system
  - Obstacle rendering
  - Camera controls

- `page.tsx`: Main UI
  - Preset selection
  - Playback controls
  - Force display
  - Settings panel

### Modifying Parameters

#### Change Grid Size

```python
# In api.py or request body
"grid_size": [48, 24, 24]  # Smaller = faster
"grid_size": [80, 40, 40]  # Larger = slower but more detail
```

#### Adjust Viscosity

```python
# In main_taichi.py
class FluidSolver3D:
    def __init__(self):
        self.viscosity = 0.001  # Lower = less viscous (water)
        # Higher values (0.01) = more viscous (honey)
```

#### Change Particle Count

```python
# In main_taichi.py
def get_particles(self, num_particles: int = 1000):
    # Increase for more particles (slower rendering)
    # Decrease for performance (500-600)
```

---

## 🐛 Troubleshooting

### Issue 1: API Not Starting

**Error:**
```
ModuleNotFoundError: No module named 'taichi'
```

**Solution:**
```bash
cd python-simulations/aeroflow-3d
source venv/bin/activate
pip install -r requirements.txt
```

### Issue 2: GPU Not Detected

**Warning:**
```
⚠️  Taichi using CPU backend (slower)
```

**Solutions:**
1. **NVIDIA GPU**: Install CUDA toolkit
   ```bash
   # Check CUDA
   nvidia-smi
   ```

2. **Apple Silicon**: Should work automatically (Metal)
   ```bash
   # Verify
   python -c "import taichi as ti; ti.init(arch=ti.metal)"
   ```

3. **AMD GPU**: Use Vulkan backend
   ```bash
   # Set environment variable
   export TI_ARCH=vulkan
   ```

4. **No GPU**: CPU mode still works (slower)
   - Reduce grid size to `[48, 24, 24]`
   - Reduce steps to 30

### Issue 3: CORS Errors

**Error:**
```
Access-Control-Allow-Origin blocked
```

**Solution:**
API already has CORS configured. If issue persists:
```python
# In api.py, verify:
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Should be present
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Issue 4: Three.js Not Rendering

**Error:**
```
Error: @react-three/fiber not found
```

**Solution:**
```bash
npm install three @react-three/fiber @react-three/drei
```

### Issue 5: Slow Performance

**Symptoms:**
- Simulation takes >30 seconds
- FPS < 2
- Browser freezes

**Solutions:**
1. **Reduce grid size**:
   ```json
   "grid_size": [48, 24, 24]
   ```

2. **Fewer steps**:
   ```json
   "steps": 30
   ```

3. **Fewer particles**:
   ```python
   get_particles(num_particles=500)
   ```

4. **Check GPU usage**:
   ```bash
   # NVIDIA
   nvidia-smi
   
   # Mac
   sudo powermetrics --samplers gpu_power
   ```

### Issue 6: Out of Memory

**Error:**
```
RuntimeError: [Taichi] Out of memory
```

**Solutions:**
1. Close other GPU applications
2. Reduce grid: `[32, 16, 16]`
3. Reduce particles: `num_particles=300`
4. Restart Python API

---

## 📊 Performance Benchmarks

### Expected Performance

| Hardware | Backend | FPS | Time (50 steps) |
|----------|---------|-----|-----------------|
| **RTX 3060** | CUDA | 25-30 | 2-3s |
| **M1 Pro** | Metal | 15-20 | 3-5s |
| **M1 Max** | Metal | 20-25 | 2-4s |
| **i7-10700K** | CPU | 2-4 | 15-20s |
| **Raspberry Pi 4** | CPU | 0.5-1 | 60-90s |

Grid: 64×32×32, 50 steps

### Optimization Tips

1. **GPU vs CPU**: GPU is 10-15x faster
2. **Grid scaling**: 2x size = 8x slower (cubic)
3. **Particle count**: Linear impact on rendering
4. **Steps**: Linear impact on simulation time

---

## 🎯 Next Steps

### Phase 2: Enhanced Features (Weeks 3-4)

- [ ] **Custom shape editor**
  - Draw obstacles with mouse
  - Import STL/OBJ files
  - Real-time shape editing

- [ ] **Volume rendering**
  - Replace particles with volumetric visualization
  - Density-based coloring
  - Isosurfaces

- [ ] **Larger grids**
  - 128×64×64 support
  - Progressive loading
  - LOD (Level of Detail)

### Phase 3: AI Optimization (Weeks 5-8)

- [ ] **Copernicus AI Layer**
  - Train CNN on simulation data
  - Predict flow from shape
  - Real-time optimization suggestions

- [ ] **Dataset generation**
  - 100-500 simulations
  - Various shapes and conditions
  - Labeled with Cd/Cl

- [ ] **Neural network**
  - 3D CNN architecture
  - Train on GPU
  - Deploy to API

### Phase 4: Production (Weeks 9-10)

- [ ] **Performance optimization**
  - WebSocket streaming
  - Compression
  - Caching

- [ ] **Educational content**
  - Interactive tutorials
  - Theory explanations
  - Quizzes

- [ ] **Export features**
  - Save simulations
  - Export to video
  - Share presets

---

## 📚 Resources

### Documentation

- [Taichi Docs](https://docs.taichi-lang.org/)
- [Three.js Manual](https://threejs.org/manual/)
- [Navier-Stokes Wiki](https://en.wikipedia.org/wiki/Navier%E2%80%93Stokes_equations)

### Papers

1. **Jos Stam - Stable Fluids** (1999)
   - Foundation of modern fluid simulation

2. **Mark Harris - Fast Fluid Dynamics on GPU** (2004)
   - GPU acceleration techniques

3. **Bridson - Fluid Simulation for Computer Graphics** (2015)
   - Comprehensive textbook

### Code Examples

- [Taichi Gallery](https://github.com/taichi-dev/taichi/tree/master/python/taichi/examples)
- [Three.js Examples](https://threejs.org/examples/)

---

## 🤝 Contributing

### Testing

Run the full test suite:

```bash
# Backend tests
cd python-simulations/aeroflow-3d
python main_taichi.py

# Frontend dev
npm run dev
```

### Code Style

- **Python**: PEP 8
- **TypeScript**: ESLint + Prettier
- **Comments**: Explain "why", not "what"

---

## 📄 License

Part of LMSMath educational platform.

---

## 🎓 Educational Value

### Target Audience

- **High School (Grade 12)**: Basic fluid concepts
- **Undergraduate**: CFD fundamentals
- **Graduate**: Advanced optimization

### Learning Outcomes

Students will understand:
1. Navier-Stokes equations
2. Finite difference methods
3. GPU parallel computing
4. 3D visualization
5. Aerodynamic forces

---

## 🎉 Success Criteria

MVP is complete when:

- ✅ Python API starts without errors
- ✅ Frontend renders 3D particles
- ✅ All 4 presets work
- ✅ Simulation completes in <10s on GPU
- ✅ Forces display correctly
- ✅ Playback controls work
- ✅ Documentation is clear

---

**Built with ❤️ using Taichi GPU + Three.js**

🌊 Physics + 💻 Code + 🚀 GPU = Amazing Education!

---

Last updated: October 14, 2025
Version: 1.0.0-MVP

