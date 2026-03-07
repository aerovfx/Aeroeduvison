#!/usr/bin/env python3
"""
Demo script cho mô phỏng khúc xạ ánh sáng
Test tất cả các tính năng của refraction simulation
"""

from main import RefractionSimulation, generate_animation_frames, generate_materials
import json

def print_section(title):
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)

def demo_refraction_simulation():
    print_section("🔆 KHÚC XẠ ÁNH SÁNG - DEMO COMPLETE")
    
    # 1. Basic refraction examples
    print("\n1. 🔍 Các ví dụ khúc xạ cơ bản:")
    
    examples = [
        {"name": "Không khí → Nước", "n1": 1.0, "n2": 1.33, "angle": 30},
        {"name": "Không khí → Thủy tinh", "n1": 1.0, "n2": 1.5, "angle": 45},
        {"name": "Nước → Không khí", "n1": 1.33, "n2": 1.0, "angle": 30},
        {"name": "Thủy tinh → Không khí", "n1": 1.5, "n2": 1.0, "angle": 50},
    ]
    
    for i, example in enumerate(examples, 1):
        sim = RefractionSimulation(
            n1=example["n1"],
            n2=example["n2"],
            angle_in_deg=example["angle"]
        )
        result = sim.to_dict()
        
        print(f"\n   {i}. {example['name']}:")
        print(f"      Góc tới: {result['angle_in_deg']:.1f}°")
        if result['angle_out_deg']:
            print(f"      Góc khúc xạ: {result['angle_out_deg']:.1f}°")
        else:
            print(f"      Phản xạ toàn phần: {result['is_total_reflection']}")
        print(f"      Chiết suất: n₁={result['n1']}, n₂={result['n2']}")
    
    # 2. Total internal reflection
    print("\n2. 🔄 Phản xạ toàn phần:")
    
    # Glass to air - should show total internal reflection
    sim = RefractionSimulation(n1=1.5, n2=1.0, angle_in_deg=60)
    result = sim.to_dict()
    
    print(f"   Thủy tinh → Không khí (góc tới: 60°):")
    print(f"   Góc tới: {result['angle_in_deg']:.1f}°")
    print(f"   Phản xạ toàn phần: {result['is_total_reflection']}")
    if result['critical_angle']:
        print(f"   Góc tới hạn: {result['critical_angle']:.1f}°")
    
    # 3. Materials
    print("\n3. 🧪 Các môi trường có sẵn:")
    materials = generate_materials()
    for material in materials:
        print(f"   • {material['name']}: n = {material['n']}")
    
    # 4. Animation frames
    print("\n4. 🎬 Animation frames:")
    frames = generate_animation_frames(n1=1.0, n2=1.33, angle_range=(10, 80), num_frames=10)
    print(f"   Tạo {len(frames)} frames cho animation")
    print(f"   Góc từ {frames[0]['angle_in_deg']:.1f}° đến {frames[-1]['angle_in_deg']:.1f}°")
    
    # 5. Ray visualization data
    print("\n5. 📐 Dữ liệu tia sáng:")
    sim = RefractionSimulation(n1=1.0, n2=1.33, angle_in_deg=30)
    result = sim.to_dict()
    rays = result['rays']
    
    print(f"   Tia tới: {rays['incident_ray']}")
    if rays['refracted_ray']:
        print(f"   Tia khúc xạ: {rays['refracted_ray']}")
    if rays['reflected_ray']:
        print(f"   Tia phản xạ: {rays['reflected_ray']}")
    
    # 6. Snell's law verification
    print("\n6. 📊 Kiểm tra định luật Snell:")
    sim = RefractionSimulation(n1=1.0, n2=1.33, angle_in_deg=30)
    result = sim.to_dict()
    
    import math
    n1, n2 = result['n1'], result['n2']
    theta1 = math.radians(result['angle_in_deg'])
    theta2 = math.radians(result['angle_out_deg']) if result['angle_out_deg'] else 0
    
    left_side = n1 * math.sin(theta1)
    right_side = n2 * math.sin(theta2)
    
    print(f"   n₁ × sin(θ₁) = {left_side:.4f}")
    print(f"   n₂ × sin(θ₂) = {right_side:.4f}")
    print(f"   Chênh lệch: {abs(left_side - right_side):.6f}")
    print(f"   ✅ Định luật Snell: {'ĐÚNG' if abs(left_side - right_side) < 0.001 else 'SAI'}")
    
    # 7. Export data
    print("\n7. 💾 Export dữ liệu:")
    demo_data = {
        "version": "1.0.0",
        "examples": examples,
        "materials": materials,
        "animation_frames": len(frames),
        "snell_verification": {
            "left_side": left_side,
            "right_side": right_side,
            "difference": abs(left_side - right_side),
            "verified": abs(left_side - right_side) < 0.001
        }
    }
    
    with open('output/demo_data.json', 'w', encoding='utf-8') as f:
        json.dump(demo_data, f, indent=2, ensure_ascii=False)
    
    print(f"   ✅ Demo data saved to: output/demo_data.json")
    
    # Summary
    print_section("📊 SUMMARY")
    print(f"\n✅ Total examples: {len(examples)}")
    print(f"✅ Materials available: {len(materials)}")
    print(f"✅ Animation frames: {len(frames)}")
    print(f"✅ Snell's law verified: {'YES' if abs(left_side - right_side) < 0.001 else 'NO'}")
    print(f"✅ Data export: COMPLETE")
    
    print_section("🎉 DEMO COMPLETE")
    print("\n✅ Khúc xạ ánh sáng simulation hoạt động hoàn hảo!")
    print("✅ Sẵn sàng cho API và Frontend\n")

if __name__ == "__main__":
    demo_refraction_simulation()

