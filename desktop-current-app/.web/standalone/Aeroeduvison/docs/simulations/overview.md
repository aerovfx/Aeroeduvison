# Simulations & Interactive Labs

AeroEduVison features 20+ interactive simulations powered by Python, allowing students to explore complex scientific concepts through hands-on experimentation.

## 🎯 Overview

Our simulation system combines:
- **Python Backend** - High-performance computation
- **Real-time Rendering** - Taichi graphics engine  
- **Interactive Controls** - WebSocket communication
- **Educational Focus** - Curriculum-aligned content

---

## 🔬 Available Simulations

### Physics Labs

#### **Motion & Mechanics**
- **Projectile Motion** - Explore trajectory, velocity, and acceleration
- **Simple Pendulum** - Study periodic motion and harmonic oscillation
- **Spring Systems** - Investigate Hooke's law and oscillations
- **Collision Simulator** - Analyze momentum and energy conservation

#### **Aerodynamics**
- **Airflow Simulation** - Visualize air currents and pressure
- **3D Aeroflow** - Advanced computational fluid dynamics 
- **Wing Design** - Test different airfoil shapes

#### **Optics & Light**
- **Refraction Lab** - Explore Snell's law and light bending
- **Optics Bench** - Lenses, mirrors, and ray tracing
- **Light Experiments** - Interference and diffraction patterns

#### **Weather & Climate**
- **Weather Simulation** - Model atmospheric conditions
- **Climate Patterns** - Long-term weather trends  
- **GPS Personalized Weather** - Location-based forecasts

### Chemistry Labs

#### **3D Molecular Visualization**
- **ChemLab 3D** - Interactive molecular models
- **Chemical Reactions** - Reaction visualization
- **Molecular Dynamics** - Real-time simulations

### Biology Labs

#### **Growth & Population**
- **Bio Growth** - Population dynamics
- **Ecosystem Simulation** - Predator-prey models
- **Cell Division** - Mitosis visualization

---

## 🚀 Quick Start

### Running All Labs

```bash
# Start all Python simulation servers
./Guide/START_ALL_LABS.sh

# Or individually
cd python-simulations/motion-sim
python3 main.py
```

### Accessing Labs

Visit the dashboard and navigate to:
```
http://localhost:3000/dashboard/labtwin
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────┐
│     Next.js Frontend (React)        │
│  ┌───────────────────────────────┐  │
│  │   Simulation UI Components    │  │
│  │   - Controls Panel            │  │
│  │   - Canvas Renderer           │  │
│  │   - Data Visualization        │  │
│  └───────────────┬───────────────┘  │
└──────────────────┼───────────────────┘
                   │ WebSocket
┌──────────────────┼───────────────────┐
│                  │                   │
│  ┌───────────────┴───────────────┐  │
│  │   FastAPI Server (Python)     │  │
│  │   - Physics Engine            │  │
│  │   - Computation Logic         │  │
│  │   - Real-time Updates         │  │
│  └───────────────┬───────────────┘  │
│                  │                   │
│  ┌───────────────┴───────────────┐  │
│  │   Taichi Graphics Engine      │  │
│  │   - GPU Acceleration          │  │
│  │   - Particle Systems          │  │
│  │   - Rendering Pipeline        │  │
│  └───────────────────────────────┘  │
│                                     │
│      Python Simulation Servers      │
└─────────────────────────────────────┘
```

---

## 📝 Features

### Real-time Interaction
- Adjust parameters on-the-fly
- See immediate results
- Pause/play/reset controls

### Data Visualization
- Real-time graphs and charts
- Export data as JSON/CSV
- Statistical analysis

### Educational Tools
- Step-by-step guides
- Theory explanations
- Quiz integration

### Performance
- GPU acceleration with Taichi
- Optimized algorithms
- 60 FPS rendering

---

## 🛠️ Creating Custom Simulations

### Step 1: Create Simulation File

```python
# python-simulations/my-sim/main.py
from fastapi import FastAPI, WebSocket
import taichi as ti

ti.init(arch=ti.gpu)

app = FastAPI()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    while True:
        # Simulation logic here
        data = compute_simulation()
        await websocket.send_json(data)
```

### Step 2: Add to Configuration

```typescript
// Add to simulation registry
const simulations = [
  {
    id: "my-sim",
    name: "My Custom Simulation",
    port: 8010,
    endpoint: "http://localhost:8010/ws"
  }
]
```

### Step 3: Create UI Component

```tsx
// app/dashboard/labtwin/my-sim/page.tsx
"use client"

import { SimulationCanvas } from "@/components/simulations"

export default function MySimPage() {
  return (
    <SimulationCanvas
      endpoint="/api/simulations/my-sim"
      title="My Custom Simulation"
    />
  )
}
```

---

## 📚 Simulation Guides

- [Physics Motion Guide](./physics-labs.md)
- [Chemistry 3D Guide](./chemistry-labs.md)
- [Custom Simulation Tutorial](./custom-simulations.md)
- [Performance Optimization](./performance.md)

---

## 🔧 Configuration

### Environment Variables

```env
# Python Simulations
PYTHON_SIM_PORT_START=8000
PYTHON_SIM_PORT_END=8020

# Performance
TAICHI_ARCH=gpu
SIMULATION_FPS=60
```

### Simulation Server Ports

| Simulation | Port |
|------------|------|
| Motion Sim | 8000 |
| Refraction | 8001 |
| Projectile | 8002 |
| Chemistry  | 8003 |
| Aeroflow   | 8004 |
| Weather    | 8005 |

---

## 🐛 Troubleshooting

### Simulation Won't Start

```bash
# Check Python version
python3 --version  # Should be 3.12+

# Install dependencies
pip install -r requirements.txt

# Check port availability
lsof -i :8000
```

### Performance Issues

```bash
# Use GPU acceleration
export TAICHI_ARCH=gpu

# Reduce frame rate
export SIMULATION_FPS=30
```

### WebSocket Connection Failed

```bash
# Check CORS settings
# Verify API proxy configuration
# Check firewall rules
```

---

## 📊 Performance Metrics

- **Average FPS**: 60
- **Latency**: <16ms  
- **GPU Utilization**: 40-60%
- **Memory Usage**: 200-500MB per simulation

---

## 🎓 Learning Resources

- [Python Simulations Guide](../../Guide/PYTHON_SIMULATIONS_GUIDE.md)
- [Taichi Documentation](https://docs.taichi-lang.org/)
- [FastAPI Docs](https://fastapi.tiangolo.com/)

---

**Next:** [Python Simulations Setup](./python-simulations.md)
