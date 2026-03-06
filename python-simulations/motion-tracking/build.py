"""
Build script cho mô phỏng Motion Tracking
Tạo file data.json chứa dữ liệu tracking và visualization
"""

import json
import os
from main import (
    MotionTrackingSimulation,
    generate_presets,
    generate_motion_types,
    generate_scenarios
)

def build():
    """Tạo file output/data.json"""
    print("🔨 Building motion tracking simulation...")
    
    presets = generate_presets()
    motion_types = generate_motion_types()
    
    # Tạo scenarios cho mỗi combination
    all_scenarios = []
    
    for motion_type in motion_types:
        print(f"  📊 Generating scenarios for: {motion_type['name']}")
        
        for preset in presets[:3]:  # Top 3 presets để không quá lớn
            print(f"     - {preset['name']}")
            
            scenarios = generate_scenarios(
                motion_type=motion_type['id'],
                preset=preset['id']
            )
            
            scenario_data = {
                "id": f"{motion_type['id']}_{preset['id']}",
                "name": f"{motion_type['name']} - {preset['name']}",
                "motion_type": motion_type['id'],
                "motion_name": motion_type['name'],
                "preset_id": preset['id'],
                "preset_name": preset['name'],
                "preset_icon": preset['icon'],
                "description": f"{motion_type['description']} với {preset['description']}",
                "scenarios": scenarios
            }
            
            all_scenarios.append(scenario_data)
    
    # Tạo default simulation
    default_sim = MotionTrackingSimulation(fps=30, focal_length=800, real_width=0.22)
    default_data = default_sim.to_dict("parabolic")
    
    # Tạo dữ liệu hoàn chỉnh
    simulation_data = {
        "title": "Motion Tracking với Camera",
        "description": "Theo dõi chuyển động vật thể trong không gian 3D và ước lượng khoảng cách từ camera",
        "type": "motion-tracking",
        "version": "1.0.0",
        "presets": presets,
        "motion_types": motion_types,
        "scenarios": all_scenarios,
        "default_data": default_data,
        "camera_settings": {
            "focal_length": {
                "min": 400,
                "max": 1200,
                "default": 800,
                "step": 50,
                "unit": "px",
                "label": "Tiêu cự camera"
            },
            "fps": {
                "min": 15,
                "max": 120,
                "default": 30,
                "step": 1,
                "unit": "fps",
                "label": "Frames per second"
            },
            "real_width": {
                "min": 0.1,
                "max": 3.0,
                "default": 0.22,
                "step": 0.01,
                "unit": "m",
                "label": "Chiều rộng vật thể"
            }
        },
        "formulas": {
            "focal_length_calibration": "f = (width_px × distance) / real_width",
            "distance_estimation": "Z = (real_width × focal_length) / width_px",
            "projection_x": "px = cx + (X × f) / Z",
            "projection_y": "py = cy - (Y × f) / Z",
            "world_x": "X = (px - cx) × Z / f",
            "world_y": "Y = (cy - py) × Z / f"
        },
        "theory": {
            "camera_model": "Pinhole Camera Model - mô hình camera lỗ nhỏ",
            "projection": "Chiếu từ tọa độ 3D (X,Y,Z) sang tọa độ 2D (px,py)",
            "distance_from_size": "Ước lượng khoảng cách dựa vào kích thước vật trong ảnh",
            "focal_length": "Tiêu cự camera (pixels) - quan hệ giữa kích thước thực và kích thước ảnh"
        }
    }
    
    print(f"  📊 Generated {len(all_scenarios)} scenario combinations")
    total_data_points = sum(
        sum(len(s['data']['trajectory_3d']) for s in scenario['scenarios'])
        for scenario in all_scenarios
    )
    print(f"     Total data points: {total_data_points}")
    
    # Tạo thư mục output
    os.makedirs("output", exist_ok=True)
    
    # Lưu file JSON
    output_path = os.path.join("output", "data.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(simulation_data, f, ensure_ascii=False, indent=2)
    
    file_size = os.path.getsize(output_path) / 1024
    print(f"✅ Build completed! Output: {output_path}")
    print(f"   File size: {file_size:.2f} KB")
    print(f"   Scenarios: {len(all_scenarios)}")
    print(f"   Presets: {len(presets)}")
    print(f"   Motion types: {len(motion_types)}")

if __name__ == "__main__":
    build()


