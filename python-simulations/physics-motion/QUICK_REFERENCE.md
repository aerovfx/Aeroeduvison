# ⚡ Physics Motion v2.0 - Quick Reference

## 🚀 Quick Start
```bash
cd python-simulations/physics-motion
python3 demo.py              # Demo all 7 types
bash start_api.sh            # API on port 8007
```

## 🎯 7 Motion Types

| # | Name | Equation | API Endpoint |
|---|------|----------|--------------|
| 1 | 🔻 Rơi tự do | h = h₀ + v₀t - ½gt² | `/api/free-fall` |
| 2 | 🎯 Ném xiên | x = v₀ₓt, y = h₀ + v₀ᵧt - ½gt² | `/api/projectile` |
| 3 | 〰️ Dao động | x = A cos(ωt + φ) | `/api/harmonic` |
| 4 | ➡️ Thẳng đều | x = x₀ + vt | `/api/uniform` |
| 5 | 🚀 Nhanh dần | x = x₀ + v₀t + ½at² | `/api/accelerated` |
| 6 | ⭕ Tròn đều | x = r cos(ωt) | `/api/circular` |
| 7 | 🔶 Con lắc | θ = θ₀ cos(ω₀t) | `/api/pendulum` |

## 📡 API Examples

```bash
# 1. Free Fall
curl -X POST http://localhost:8007/api/free-fall \
  -H "Content-Type: application/json" \
  -d '{"h0": 100, "v0": 0, "g": 9.8}'

# 2. Projectile
curl -X POST http://localhost:8007/api/projectile \
  -H "Content-Type: application/json" \
  -d '{"v0": 20, "angle_deg": 45, "h0": 0}'

# 3. Harmonic
curl -X POST http://localhost:8007/api/harmonic \
  -H "Content-Type: application/json" \
  -d '{"A": 0.1, "omega": 6.28, "phi": 0}'

# 4. Uniform
curl -X POST http://localhost:8007/api/uniform \
  -H "Content-Type: application/json" \
  -d '{"v": 10, "x0": 0, "duration": 10}'

# 5. Accelerated
curl -X POST http://localhost:8007/api/accelerated \
  -H "Content-Type: application/json" \
  -d '{"v0": 0, "a": 2, "x0": 0, "duration": 10}'

# 6. Circular
curl -X POST http://localhost:8007/api/circular \
  -H "Content-Type: application/json" \
  -d '{"r": 5, "omega": 1, "duration": 10}'

# 7. Pendulum
curl -X POST http://localhost:8007/api/pendulum \
  -H "Content-Type: application/json" \
  -d '{"L": 1, "theta0_deg": 30, "duration": 10}'
```

## 🎨 Frontend URL
```
http://localhost:3000/dashboard/labtwin/labs/physics-motion
```

## 📚 Docs
```
http://localhost:8007/docs
```

## ✅ Status
- **Version:** 2.0.0
- **Motion Types:** 7
- **API Endpoints:** 9
- **Status:** ✅ Production Ready


