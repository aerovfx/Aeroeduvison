"""
Build script cho Physics Motion Simulation
"""

import json
import os
from main import (
    FreeFallSimulation,
    ProjectileMotion,
    HarmonicMotion,
    MotionPredictor
)

def build_simulation():
    print("🚀 Building Physics Motion Simulation...")
    
    # 1. Free fall scenarios
    print("  ⬇️  Generating free fall scenarios...")
    free_fall_scenarios = []
    
    for h0 in [10, 30, 50, 100]:
        sim = FreeFallSimulation(h0=h0, v0=0)
        free_fall_scenarios.append({
            "id": f"free_fall_{h0}m",
            "name": f"Rơi từ {h0}m",
            "data": sim.to_dict()
        })
    
    # 2. Projectile scenarios
    print("  🎯 Generating projectile scenarios...")
    projectile_scenarios = []
    
    for angle in [30, 45, 60]:
        sim = ProjectileMotion(v0=20, angle_deg=angle)
        projectile_scenarios.append({
            "id": f"projectile_{angle}deg",
            "name": f"Ném xiên {angle}°",
            "data": sim.to_dict()
        })
    
    # 3. Harmonic scenarios
    print("  〰️  Generating harmonic scenarios...")
    harmonic_scenarios = []
    
    for A in [0.05, 0.1, 0.2]:
        sim = HarmonicMotion(A=A, omega=6.28)
        harmonic_scenarios.append({
            "id": f"harmonic_A{A}",
            "name": f"Dao động A={A}m",
            "data": sim.to_dict()
        })
    
    # 4. AI Prediction demo
    print("  🤖 Generating AI prediction demo...")
    ff = FreeFallSimulation(h0=100)
    training_data = [s.to_dict() for s in ff.generate_trajectory(20)]
    model = MotionPredictor.train_free_fall_model(training_data)
    predictions = MotionPredictor.predict(model, [1, 2, 3, 4])
    
    # Compile output
    output_data = {
        "simulation_type": "physics-motion",
        "version": "1.0.0",
        "description": "Mô phỏng chuyển động vật lý với AI prediction",
        "data": {
            "free_fall": {
                "description": "Rơi tự do",
                "scenarios": free_fall_scenarios,
                "count": len(free_fall_scenarios)
            },
            "projectile": {
                "description": "Ném xiên",
                "scenarios": projectile_scenarios,
                "count": len(projectile_scenarios)
            },
            "harmonic": {
                "description": "Dao động điều hòa",
                "scenarios": harmonic_scenarios,
                "count": len(harmonic_scenarios)
            },
            "ai_prediction": {
                "description": "AI dự đoán chuyển động",
                "model": model,
                "predictions": predictions
            }
        },
        "statistics": {
            "total_scenarios": len(free_fall_scenarios) + len(projectile_scenarios) + len(harmonic_scenarios)
        }
    }
    
    os.makedirs("output", exist_ok=True)
    output_file = "output/data.json"
    
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ Build completed!")
    print(f"   - Free fall: {len(free_fall_scenarios)}")
    print(f"   - Projectile: {len(projectile_scenarios)}")
    print(f"   - Harmonic: {len(harmonic_scenarios)}")
    print(f"   - Total: {output_data['statistics']['total_scenarios']}")
    print(f"\n💾 Output: {output_file}")
    
    return output_data

if __name__ == "__main__":
    build_simulation()



