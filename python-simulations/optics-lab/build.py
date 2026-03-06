"""
Build script cho Optics Lab Simulation
Tạo file JSON output cho Next.js frontend
"""

import json
import os
from main import (
    RefractionSimulation,
    ReflectionSimulation,
    PrismSimulation,
    LensSimulation,
    generate_materials_list,
    generate_wavelength_spectrum
)

def build_simulation():
    """Tạo data cho simulation"""
    
    print("🔬 Building Optics Lab Simulation...")
    
    # 1. Khúc xạ - nhiều trường hợp
    print("  📐 Generating refraction scenarios...")
    refraction_scenarios = []
    
    # Air → Water
    for angle in [15, 30, 45, 60, 75]:
        sim = RefractionSimulation(n1=1.0, n2=1.33, angle_deg=angle)
        refraction_scenarios.append({
            "id": f"air_water_{angle}",
            "name": f"Không khí → Nước ({angle}°)",
            "data": sim.to_dict()
        })
    
    # Water → Air (phản xạ toàn phần)
    for angle in [30, 40, 48.6, 60, 75]:
        sim = RefractionSimulation(n1=1.33, n2=1.0, angle_deg=angle)
        refraction_scenarios.append({
            "id": f"water_air_{angle}",
            "name": f"Nước → Không khí ({angle}°)",
            "data": sim.to_dict()
        })
    
    # 2. Phản xạ
    print("  🪞 Generating reflection scenarios...")
    reflection_scenarios = []
    
    # Phản xạ gương
    for angle in [15, 30, 45, 60, 75]:
        sim = ReflectionSimulation(angle_deg=angle, is_diffuse=False)
        reflection_scenarios.append({
            "id": f"specular_{angle}",
            "name": f"Phản xạ gương ({angle}°)",
            "data": sim.to_dict()
        })
    
    # Phản xạ khuếch tán
    for angle in [30, 45, 60]:
        sim = ReflectionSimulation(angle_deg=angle, is_diffuse=True)
        reflection_scenarios.append({
            "id": f"diffuse_{angle}",
            "name": f"Phản xạ khuếch tán ({angle}°)",
            "data": sim.to_dict()
        })
    
    # 3. Lăng kính (tán sắc)
    print("  🌈 Generating prism scenarios...")
    prism_scenarios = []
    
    # Lăng kính đều
    for incident_angle in [40, 50, 60]:
        sim = PrismSimulation(apex_angle_deg=60, n_prism=1.5, incident_angle_deg=incident_angle)
        prism_scenarios.append({
            "id": f"equilateral_{incident_angle}",
            "name": f"Lăng kính đều (góc tới {incident_angle}°)",
            "data": sim.to_dict()
        })
    
    # Lăng kính vuông
    sim = PrismSimulation(apex_angle_deg=90, n_prism=1.5, incident_angle_deg=45)
    prism_scenarios.append({
        "id": "right_angle",
        "name": "Lăng kính vuông",
        "data": sim.to_dict()
    })
    
    # 4. Thấu kính
    print("  🔍 Generating lens scenarios...")
    lens_scenarios = []
    
    # Thấu kính hội tụ
    for object_dist in [50, 100, 150, 200, 300]:
        sim = LensSimulation(focal_length=100, object_distance=object_dist, lens_type="convex")
        lens_scenarios.append({
            "id": f"convex_{object_dist}",
            "name": f"Thấu kính hội tụ (d={object_dist}cm)",
            "data": sim.to_dict()
        })
    
    # Thấu kính phân kỳ
    for object_dist in [50, 100, 150, 200]:
        sim = LensSimulation(focal_length=100, object_distance=object_dist, lens_type="concave")
        lens_scenarios.append({
            "id": f"concave_{object_dist}",
            "name": f"Thấu kính phân kỳ (d={object_dist}cm)",
            "data": sim.to_dict()
        })
    
    # 5. Materials và Spectrum
    print("  🎨 Generating materials and spectrum data...")
    materials = generate_materials_list()
    spectrum = generate_wavelength_spectrum()
    
    # Tổng hợp data
    output_data = {
        "simulation_type": "optics-lab",
        "version": "1.0.0",
        "description": "Phòng thí nghiệm Quang học ảo - Mô phỏng các hiện tượng quang học",
        "data": {
            "refraction": {
                "description": "Khúc xạ ánh sáng theo định luật Snell",
                "scenarios": refraction_scenarios,
                "count": len(refraction_scenarios)
            },
            "reflection": {
                "description": "Phản xạ ánh sáng (gương và khuếch tán)",
                "scenarios": reflection_scenarios,
                "count": len(reflection_scenarios)
            },
            "prism": {
                "description": "Tán sắc ánh sáng qua lăng kính",
                "scenarios": prism_scenarios,
                "count": len(prism_scenarios)
            },
            "lens": {
                "description": "Tạo ảnh qua thấu kính",
                "scenarios": lens_scenarios,
                "count": len(lens_scenarios)
            },
            "materials": {
                "description": "Các môi trường và chiết suất",
                "data": materials,
                "count": len(materials)
            },
            "spectrum": {
                "description": "Phổ bước sóng ánh sáng khả kiến",
                "data": spectrum,
                "count": len(spectrum)
            }
        },
        "statistics": {
            "total_scenarios": (
                len(refraction_scenarios) + 
                len(reflection_scenarios) + 
                len(prism_scenarios) + 
                len(lens_scenarios)
            ),
            "total_materials": len(materials),
            "total_wavelengths": len(spectrum)
        }
    }
    
    # Tạo thư mục output
    os.makedirs("output", exist_ok=True)
    
    # Ghi file JSON
    output_file = "output/data.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ Build completed!")
    print(f"📊 Statistics:")
    print(f"   - Refraction scenarios: {len(refraction_scenarios)}")
    print(f"   - Reflection scenarios: {len(reflection_scenarios)}")
    print(f"   - Prism scenarios: {len(prism_scenarios)}")
    print(f"   - Lens scenarios: {len(lens_scenarios)}")
    print(f"   - Total scenarios: {output_data['statistics']['total_scenarios']}")
    print(f"   - Materials: {len(materials)}")
    print(f"   - Spectrum points: {len(spectrum)}")
    print(f"\n💾 Output saved to: {output_file}")
    
    return output_data

if __name__ == "__main__":
    build_simulation()


