"""
Build script cho mô phỏng chuyển động ném xiên
Tạo file data.json chứa dữ liệu animation
"""

import json
import os
from main import (
    generate_animation_frames, 
    generate_velocity_frames,
    compare_trajectories,
    ProjectileSimulation
)

def build():
    """Tạo file output/data.json"""
    print("🔨 Building projectile motion simulation...")
    
    # Các scenarios khác nhau
    scenarios = [
        {
            "id": "angle_variation",
            "name": "Thay đổi góc ném",
            "description": "Quan sát ảnh hưởng của góc ném đến quỹ đạo",
            "mode": "angle",
            "fixed_params": {"v0": 20, "g": 9.8},
            "frames": generate_animation_frames(v0=20, angle_range=(15, 75), num_frames=30, g=9.8),
            "controls": {
                "angle": {
                    "min": 15,
                    "max": 75,
                    "default": 45,
                    "step": 1,
                    "unit": "°",
                    "label": "Góc ném"
                }
            }
        },
        {
            "id": "velocity_variation",
            "name": "Thay đổi vận tốc",
            "description": "Quan sát ảnh hưởng của vận tốc ban đầu đến quỹ đạo",
            "mode": "velocity",
            "fixed_params": {"angle": 45, "g": 9.8},
            "frames": generate_velocity_frames(angle=45, v0_range=(10, 40), num_frames=30, g=9.8),
            "controls": {
                "v0": {
                    "min": 10,
                    "max": 40,
                    "default": 20,
                    "step": 1,
                    "unit": "m/s",
                    "label": "Vận tốc ban đầu"
                }
            }
        },
        {
            "id": "gravity_variation",
            "name": "Thay đổi trọng lực",
            "description": "So sánh chuyển động ở các hành tinh khác nhau",
            "mode": "gravity",
            "planets": [
                {"name": "Mặt Trăng", "g": 1.62, "color": "#94A3B8"},
                {"name": "Sao Hỏa", "g": 3.71, "color": "#F87171"},
                {"name": "Trái Đất", "g": 9.8, "color": "#3B82F6"},
                {"name": "Sao Mộc", "g": 24.79, "color": "#F59E0B"}
            ],
            "frames": [],
            "controls": {
                "g": {
                    "min": 1,
                    "max": 25,
                    "default": 9.8,
                    "step": 0.1,
                    "unit": "m/s²",
                    "label": "Gia tốc trọng trường"
                }
            }
        }
    ]
    
    # Tạo frames cho gravity variation
    for g_value in [1.62, 3.71, 9.8, 24.79]:
        sim = ProjectileSimulation(v0=20, angle_deg=45, g=g_value)
        scenarios[2]["frames"].append(sim.to_dict())
    
    # So sánh quỹ đạo với các góc khác nhau
    comparison = compare_trajectories(v0=20, angles=[30, 45, 60, 75], g=9.8)
    
    # Tạo frame mặc định
    default_sim = ProjectileSimulation(v0=20, angle_deg=45, g=9.8)
    default_frame = default_sim.to_dict()
    
    # Tạo dữ liệu hoàn chỉnh
    simulation_data = {
        "title": "Chuyển động ném xiên",
        "description": "Mô phỏng chuyển động của vật được ném với vận tốc ban đầu và góc ném",
        "type": "projectile",
        "version": "1.0.0",
        "default_frame": default_frame,
        "scenarios": scenarios,
        "comparison": comparison,
        "formulas": {
            "range": "R = v₀² × sin(2θ) / g",
            "max_height": "H = v₀² × sin²(θ) / (2g)",
            "time_of_flight": "T = 2v₀ × sin(θ) / g",
            "position_x": "x = v₀ × cos(θ) × t",
            "position_y": "y = v₀ × sin(θ) × t - ½gt²",
            "velocity_x": "vₓ = v₀ × cos(θ)",
            "velocity_y": "vᵧ = v₀ × sin(θ) - gt"
        },
        "constants": {
            "g_earth": 9.8,
            "g_moon": 1.62,
            "g_mars": 3.71,
            "g_jupiter": 24.79
        }
    }
    
    print(f"  📊 Generated {len(scenarios)} scenarios")
    for scenario in scenarios:
        print(f"     - {scenario['name']}: {len(scenario['frames'])} frames")
    
    # Tạo thư mục output nếu chưa có
    os.makedirs("output", exist_ok=True)
    
    # Lưu file JSON
    output_path = os.path.join("output", "data.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(simulation_data, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Build completed! Output: {output_path}")
    total_frames = sum(len(s['frames']) for s in scenarios)
    print(f"   Total frames: {total_frames}")
    print(f"   File size: {os.path.getsize(output_path) / 1024:.2f} KB")

if __name__ == "__main__":
    build()


