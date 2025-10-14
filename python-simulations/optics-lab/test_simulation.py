#!/usr/bin/env python3
"""
Test script cho Phòng thí nghiệm Quang học ảo
"""

import json
from main import (
    RefractionSimulation,
    ReflectionSimulation,
    PrismSimulation,
    LensSimulation,
    generate_materials_list,
    generate_wavelength_spectrum
)

def test_refraction():
    """Test khúc xạ"""
    print("="*60)
    print("TEST 1: KHÚC XẠ ÁNH SÁNG")
    print("="*60)
    
    # Test case 1: Air → Water
    print("\n1.1. Không khí → Nước (45°)")
    sim = RefractionSimulation(n1=1.0, n2=1.33, angle_deg=45)
    result = sim.to_dict()
    print(f"   ✓ Góc tới: {result['angle_in_deg']}°")
    print(f"   ✓ Góc khúc xạ: {result['angle_out_deg']}°")
    print(f"   ✓ Số tia: {len(result['rays'])}")
    
    # Test case 2: Water → Air (phản xạ toàn phần)
    print("\n1.2. Nước → Không khí (60°) - Phản xạ toàn phần")
    sim = RefractionSimulation(n1=1.33, n2=1.0, angle_deg=60)
    result = sim.to_dict()
    print(f"   ✓ Góc tới: {result['angle_in_deg']}°")
    print(f"   ✓ Phản xạ toàn phần: {result['is_total_reflection']}")
    print(f"   ✓ Góc tới hạn: {result['critical_angle_deg']}°")
    
    # Test case 3: Với bước sóng
    print("\n1.3. Với bước sóng màu đỏ (650nm)")
    sim = RefractionSimulation(n1=1.0, n2=1.5, angle_deg=30, wavelength=650)
    result = sim.to_dict()
    print(f"   ✓ Bước sóng: {result['wavelength']} nm")
    print(f"   ✓ Màu tia: {result['rays'][0]['color']}")
    
    return True

def test_reflection():
    """Test phản xạ"""
    print("\n" + "="*60)
    print("TEST 2: PHẢN XẠ ÁNH SÁNG")
    print("="*60)
    
    # Test case 1: Phản xạ gương
    print("\n2.1. Phản xạ gương (30°)")
    sim = ReflectionSimulation(angle_deg=30, is_diffuse=False)
    result = sim.to_dict()
    print(f"   ✓ Góc tới: {result['angle_in_deg']}°")
    print(f"   ✓ Góc phản xạ: {result['angle_out_deg']}°")
    print(f"   ✓ Số tia: {len(result['rays'])}")
    print(f"   ✓ Loại: {'Khuếch tán' if result['is_diffuse'] else 'Gương'}")
    
    # Test case 2: Phản xạ khuếch tán
    print("\n2.2. Phản xạ khuếch tán (45°)")
    sim = ReflectionSimulation(angle_deg=45, is_diffuse=True)
    result = sim.to_dict()
    print(f"   ✓ Số tia phản xạ: {len(result['rays']) - 1}")  # Trừ tia tới
    print(f"   ✓ Loại: {'Khuếch tán' if result['is_diffuse'] else 'Gương'}")
    
    return True

def test_prism():
    """Test lăng kính"""
    print("\n" + "="*60)
    print("TEST 3: TÁN SẮC QUA LĂNG KÍNH")
    print("="*60)
    
    # Test case 1: Lăng kính đều
    print("\n3.1. Lăng kính đều (60°)")
    sim = PrismSimulation(apex_angle_deg=60, n_prism=1.5, incident_angle_deg=50)
    result = sim.to_dict()
    print(f"   ✓ Góc ở đỉnh: {result['apex_angle_deg']}°")
    print(f"   ✓ Chiết suất: {result['n_prism']}")
    print(f"   ✓ Số tia: {len(result['rays'])}")
    print(f"   ✓ Số màu tán sắc: {len(result['spectrum_colors'])}")
    
    # Hiển thị các màu
    print("\n   Phổ màu:")
    for color_name, color_code in result['spectrum_colors'].items():
        print(f"      - {color_name}: {color_code}")
    
    # Hiển thị góc lệch
    if result['deviations']:
        print("\n   Góc lệch:")
        for color_name, deviation in result['deviations'].items():
            print(f"      - {color_name}: {deviation}°")
    
    return True

def test_lens():
    """Test thấu kính"""
    print("\n" + "="*60)
    print("TEST 4: THẤU KÍNH")
    print("="*60)
    
    # Test case 1: Thấu kính hội tụ - ảnh thật
    print("\n4.1. Thấu kính hội tụ - Ảnh thật")
    sim = LensSimulation(focal_length=100, object_distance=150, lens_type="convex")
    result = sim.to_dict()
    image_info = result['image_info']
    print(f"   ✓ Tiêu cự: {result['focal_length']} cm")
    print(f"   ✓ Khoảng cách vật: {result['object_distance']} cm")
    print(f"   ✓ Khoảng cách ảnh: {image_info['image_distance']} cm")
    print(f"   ✓ Loại ảnh: {image_info['image_type']}")
    print(f"   ✓ Độ phóng đại: {image_info['magnification']}")
    print(f"   ✓ Ảnh ngược: {image_info['is_inverted']}")
    
    # Test case 2: Thấu kính hội tụ - ảnh ảo (kính lúp)
    print("\n4.2. Thấu kính hội tụ - Ảnh ảo (kính lúp)")
    sim = LensSimulation(focal_length=100, object_distance=50, lens_type="convex")
    result = sim.to_dict()
    image_info = result['image_info']
    print(f"   ✓ Khoảng cách vật: {result['object_distance']} cm")
    print(f"   ✓ Khoảng cách ảnh: {image_info['image_distance']} cm")
    print(f"   ✓ Loại ảnh: {image_info['image_type']}")
    print(f"   ✓ Độ phóng đại: {image_info['magnification']}")
    
    # Test case 3: Thấu kính phân kỳ
    print("\n4.3. Thấu kính phân kỳ")
    sim = LensSimulation(focal_length=100, object_distance=150, lens_type="concave")
    result = sim.to_dict()
    image_info = result['image_info']
    print(f"   ✓ Tiêu cự: {result['focal_length']} cm (âm)")
    print(f"   ✓ Loại ảnh: {image_info['image_type']}")
    print(f"   ✓ Độ phóng đại: {image_info['magnification']}")
    
    return True

def test_materials():
    """Test danh sách môi trường"""
    print("\n" + "="*60)
    print("TEST 5: DANH SÁCH MÔI TRƯỜNG")
    print("="*60)
    
    materials = generate_materials_list()
    print(f"\n✓ Tổng số môi trường: {len(materials)}")
    print("\nCác môi trường:")
    for mat in materials:
        print(f"   - {mat['name']:15s}: n = {mat['n']:.4f}")
    
    return True

def test_spectrum():
    """Test phổ bước sóng"""
    print("\n" + "="*60)
    print("TEST 6: PHỔ BƯỚC SÓNG")
    print("="*60)
    
    spectrum = generate_wavelength_spectrum()
    print(f"\n✓ Số điểm phổ: {len(spectrum)}")
    
    # Hiển thị một vài điểm
    print("\nMột số bước sóng:")
    for i in range(0, len(spectrum), 10):
        wl = spectrum[i]
        print(f"   {wl['wavelength']} nm → {wl['color']}")
    
    return True

def test_json_serialization():
    """Test JSON serialization"""
    print("\n" + "="*60)
    print("TEST 7: JSON SERIALIZATION")
    print("="*60)
    
    # Test refraction JSON
    sim = RefractionSimulation(n1=1.0, n2=1.33, angle_deg=45)
    result = sim.to_dict()
    json_str = json.dumps(result, indent=2)
    print(f"\n✓ Refraction JSON: {len(json_str)} characters")
    
    # Test prism JSON
    sim = PrismSimulation()
    result = sim.to_dict()
    json_str = json.dumps(result, indent=2)
    print(f"✓ Prism JSON: {len(json_str)} characters")
    
    # Test lens JSON
    sim = LensSimulation()
    result = sim.to_dict()
    json_str = json.dumps(result, indent=2)
    print(f"✓ Lens JSON: {len(json_str)} characters")
    
    return True

def run_all_tests():
    """Chạy tất cả tests"""
    print("\n" + "🔬 PHÒNG THÍ NGHIỆM QUANG HỌC ẢO - TEST SUITE ".center(60, "="))
    print()
    
    tests = [
        ("Khúc xạ ánh sáng", test_refraction),
        ("Phản xạ ánh sáng", test_reflection),
        ("Tán sắc lăng kính", test_prism),
        ("Thấu kính", test_lens),
        ("Danh sách môi trường", test_materials),
        ("Phổ bước sóng", test_spectrum),
        ("JSON Serialization", test_json_serialization)
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            success = test_func()
            results.append((test_name, success))
        except Exception as e:
            print(f"\n❌ Test failed: {e}")
            results.append((test_name, False))
    
    # Tổng kết
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    
    for test_name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{test_name:30s}: {status}")
    
    passed = sum(1 for _, success in results if success)
    total = len(results)
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed!")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        return 1

if __name__ == "__main__":
    import sys
    sys.exit(run_all_tests())


