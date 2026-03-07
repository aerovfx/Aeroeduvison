"""
Build script cho mô phỏng Dao động điều hòa
Tạo file data.json chứa dữ liệu đồ thị và animation
"""

import json
import os
from main import (
    HarmonicMotionSimulation,
    generate_presets,
    generate_phase_variations,
    generate_amplitude_variations,
    generate_frequency_variations
)

def build():
    """Tạo file output/data.json"""
    print("🔨 Building harmonic motion simulation...")
    
    presets = generate_presets()
    
    # Các loại scenarios
    scenarios = []
    
    # 1. Thay đổi pha ban đầu
    print("  📊 Generating phase variations...")
    phase_scenarios = generate_phase_variations(A=2.0, f=1.0)
    scenarios.append({
        "id": "phase_variation",
        "name": "Thay đổi pha ban đầu φ",
        "description": "Quan sát ảnh hưởng của pha ban đầu đến đồ thị",
        "type": "phase",
        "fixed_params": {"A": 2.0, "f": 1.0},
        "scenarios": phase_scenarios,
        "controls": {
            "phi": {
                "min": 0,
                "max": 3.14159,
                "default": 0,
                "step": 0.1,
                "unit": "rad",
                "label": "Pha ban đầu φ"
            }
        }
    })
    
    # 2. Thay đổi biên độ
    print("  📊 Generating amplitude variations...")
    amplitude_scenarios = generate_amplitude_variations(f=1.0, phi=0)
    scenarios.append({
        "id": "amplitude_variation",
        "name": "Thay đổi biên độ A",
        "description": "Quan sát ảnh hưởng của biên độ đến dao động",
        "type": "amplitude",
        "fixed_params": {"f": 1.0, "phi": 0},
        "scenarios": amplitude_scenarios,
        "controls": {
            "A": {
                "min": 1,
                "max": 10,
                "default": 2,
                "step": 0.5,
                "unit": "cm",
                "label": "Biên độ A"
            }
        }
    })
    
    # 3. Thay đổi tần số
    print("  📊 Generating frequency variations...")
    frequency_scenarios = generate_frequency_variations(A=2.0, phi=0)
    scenarios.append({
        "id": "frequency_variation",
        "name": "Thay đổi tần số f",
        "description": "Quan sát ảnh hưởng của tần số đến chu kỳ",
        "type": "frequency",
        "fixed_params": {"A": 2.0, "phi": 0},
        "scenarios": frequency_scenarios,
        "controls": {
            "f": {
                "min": 0.5,
                "max": 10,
                "default": 1,
                "step": 0.5,
                "unit": "Hz",
                "label": "Tần số f"
            }
        }
    })
    
    # 4. Presets với các dao động thực tế
    print("  📊 Generating preset scenarios...")
    for preset in presets:
        sim = HarmonicMotionSimulation(
            A=preset["A"],
            f=preset["f"],
            phi=preset["phi"]
        )
        
        scenarios.append({
            "id": f"preset_{preset['id']}",
            "name": f"{preset['icon']} {preset['name']}",
            "description": preset["description"],
            "type": "preset",
            "preset_id": preset["id"],
            "scenarios": [{
                "data": sim.to_dict(t_max=3.0)
            }]
        })
    
    # Tạo default simulation
    default_sim = HarmonicMotionSimulation(A=2.0, f=1.0, phi=0)
    default_data = default_sim.to_dict(t_max=2.0)
    
    # Tạo dữ liệu hoàn chỉnh
    simulation_data = {
        "title": "Dao động điều hòa",
        "description": "Vẽ đồ thị chuyển động dựa vào hàm số x = A×cos(ωt + φ)",
        "type": "harmonic-motion",
        "version": "1.0.0",
        "presets": presets,
        "scenarios": scenarios,
        "default_data": default_data,
        "formulas": {
            "position": "x = A × cos(ωt + φ)",
            "velocity": "v = -Aω × sin(ωt + φ)",
            "acceleration": "a = -Aω² × cos(ωt + φ)",
            "omega": "ω = 2πf",
            "period": "T = 1/f = 2π/ω",
            "kinetic_energy": "Eₖ = (1/2)mv²",
            "potential_energy": "Eₚ = (1/2)kx² = (1/2)mω²x²",
            "total_energy": "E = (1/2)mω²A²",
            "v_max": "vₘₐₓ = Aω",
            "a_max": "aₘₐₓ = Aω²"
        },
        "theory": {
            "definition": "Dao động điều hòa là dao động trong đó li độ của vật là hàm cosin (hoặc sin) của thời gian",
            "characteristics": [
                "Quỹ đạo là đường thẳng",
                "Lực kéo về tỉ lệ với li độ: F = -kx",
                "Cơ năng được bảo toàn",
                "Chu kỳ và tần số không phụ thuộc biên độ"
            ],
            "examples": [
                "Con lắc đơn (với góc nhỏ)",
                "Con lắc lò xo",
                "Sóng âm",
                "Mạch dao động LC"
            ]
        },
        "chart_config": {
            "x_axis": {
                "label": "t (s)",
                "unit": "s"
            },
            "y_axis": {
                "label": "x (cm)",
                "unit": "cm"
            },
            "grid": {
                "major": {"color": "blue", "alpha": 0.5},
                "minor": {"color": "blue", "alpha": 0.3}
            }
        }
    }
    
    total_points = sum(
        sum(len(s['data']['trajectory']) for s in scenario['scenarios'])
        for scenario in scenarios
    )
    
    print(f"  📊 Generated {len(scenarios)} scenario types")
    print(f"     Total data points: {total_points}")
    
    # Tạo thư mục output
    os.makedirs("output", exist_ok=True)
    
    # Lưu file JSON
    output_path = os.path.join("output", "data.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(simulation_data, f, ensure_ascii=False, indent=2)
    
    file_size = os.path.getsize(output_path) / 1024
    print(f"✅ Build completed! Output: {output_path}")
    print(f"   File size: {file_size:.2f} KB")
    print(f"   Scenarios: {len(scenarios)}")
    print(f"   Presets: {len(presets)}")

if __name__ == "__main__":
    build()


