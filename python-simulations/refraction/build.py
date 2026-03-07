"""
Build script cho mô phỏng khúc xạ ánh sáng
Tạo file data.json chứa dữ liệu animation
"""

import json
import os
from main import generate_animation_frames, generate_materials, RefractionSimulation

def build():
    """Tạo file output/data.json"""
    print("🔨 Building refraction simulation...")
    
    # Tạo các scenarios khác nhau
    scenarios = [
        {
            "id": "air_to_water",
            "name": "Không khí → Nước",
            "n1": 1.0,
            "n2": 1.33,
            "description": "Ánh sáng đi từ không khí vào nước"
        },
        {
            "id": "air_to_glass",
            "name": "Không khí → Thủy tinh",
            "n1": 1.0,
            "n2": 1.5,
            "description": "Ánh sáng đi từ không khí vào thủy tinh"
        },
        {
            "id": "water_to_air",
            "name": "Nước → Không khí",
            "n1": 1.33,
            "n2": 1.0,
            "description": "Ánh sáng đi từ nước ra không khí (có thể có phản xạ toàn phần)"
        },
        {
            "id": "glass_to_air",
            "name": "Thủy tinh → Không khí",
            "n1": 1.5,
            "n2": 1.0,
            "description": "Ánh sáng đi từ thủy tinh ra không khí"
        }
    ]
    
    # Tạo dữ liệu cho mỗi scenario
    simulation_data = {
        "title": "Khúc xạ ánh sáng",
        "description": "Mô phỏng tia sáng khúc xạ khi đi qua các môi trường khác nhau",
        "type": "refraction",
        "version": "1.0.0",
        "materials": generate_materials(),
        "scenarios": []
    }
    
    for scenario in scenarios:
        print(f"  📊 Generating frames for: {scenario['name']}")
        
        # Tạo animation frames
        frames = generate_animation_frames(
            n1=scenario['n1'],
            n2=scenario['n2'],
            angle_range=(10, 80),
            num_frames=30
        )
        
        # Tạo frame mặc định với góc 30°
        default_sim = RefractionSimulation(
            n1=scenario['n1'],
            n2=scenario['n2'],
            angle_in_deg=30
        )
        default_frame = default_sim.to_dict()
        
        scenario_data = {
            **scenario,
            "default_frame": default_frame,
            "frames": frames,
            "controls": {
                "angle": {
                    "min": 10,
                    "max": 80,
                    "default": 30,
                    "step": 1,
                    "unit": "°",
                    "label": "Góc tới"
                }
            }
        }
        
        simulation_data["scenarios"].append(scenario_data)
    
    # Tạo thư mục output nếu chưa có
    os.makedirs("output", exist_ok=True)
    
    # Lưu file JSON
    output_path = os.path.join("output", "data.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(simulation_data, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Build completed! Output: {output_path}")
    print(f"   Generated {len(scenarios)} scenarios")
    print(f"   Total frames: {sum(len(s['frames']) for s in simulation_data['scenarios'])}")

if __name__ == "__main__":
    build()


