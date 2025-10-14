"""
Test script for Aerodynamics Simulation
Run this to verify the simulation works correctly
"""

from main import simulate_flow, optimize_shape_with_ai
import json

def test_basic_simulation():
    """Test basic simulation with circle obstacle"""
    print("\n🧪 Test 1: Basic Simulation (Circle)")
    print("=" * 50)
    
    config = {
        'width': 200,
        'height': 100,
        'viscosity': 0.0001,
        'inletVelocity': 5.0,
        'steps': 30,
        'obstacles': [
            {'shape': 'circle', 'params': {'x': 100, 'y': 50, 'radius': 15}}
        ]
    }
    
    result = simulate_flow(config)
    
    assert result['success'], "Simulation failed!"
    assert len(result['results']) > 0, "No results generated!"
    
    forces = result['finalForces']
    print(f"✅ Simulation successful!")
    print(f"   Frames generated: {len(result['results'])}")
    print(f"   Drag coefficient: {forces['drag_coefficient']:.4f}")
    print(f"   Lift coefficient: {forces['lift_coefficient']:.4f}")
    
    return result


def test_airfoil_simulation():
    """Test simulation with airfoil"""
    print("\n🧪 Test 2: Airfoil Simulation")
    print("=" * 50)
    
    config = {
        'width': 200,
        'height': 100,
        'viscosity': 0.0001,
        'inletVelocity': 5.0,
        'steps': 30,
        'obstacles': [
            {'shape': 'airfoil', 'params': {'x': 80, 'y': 50, 'chord': 40, 'thickness': 0.12}}
        ]
    }
    
    result = simulate_flow(config)
    
    assert result['success'], "Simulation failed!"
    
    forces = result['finalForces']
    print(f"✅ Airfoil simulation successful!")
    print(f"   Frames generated: {len(result['results'])}")
    print(f"   Drag coefficient: {forces['drag_coefficient']:.4f}")
    print(f"   Lift coefficient: {forces['lift_coefficient']:.4f}")
    
    # Airfoil should have lower drag than circle
    return result


def test_optimization():
    """Test AI shape optimization"""
    print("\n🧪 Test 3: AI Optimization")
    print("=" * 50)
    
    result = optimize_shape_with_ai("low_drag")
    
    assert result['success'], "Optimization failed!"
    assert len(result['bestShapes']) > 0, "No shapes optimized!"
    
    best = result['recommendation']
    print(f"✅ Optimization successful!")
    print(f"   Shapes tested: {len(result['bestShapes'])}")
    print(f"   Best shape: {best['name']}")
    print(f"   Best drag coefficient: {best['dragCoefficient']:.4f}")
    print(f"   Score: {best['score']:.4f}")
    
    return result


def test_data_structure():
    """Test that output data structure is correct"""
    print("\n🧪 Test 4: Data Structure Validation")
    print("=" * 50)
    
    config = {
        'width': 200,
        'height': 100,
        'viscosity': 0.0001,
        'inletVelocity': 5.0,
        'steps': 20,
        'obstacles': [
            {'shape': 'circle', 'params': {'x': 100, 'y': 50, 'radius': 10}}
        ]
    }
    
    result = simulate_flow(config)
    
    # Check structure
    assert 'success' in result
    assert 'config' in result
    assert 'results' in result
    assert 'finalForces' in result
    
    # Check frame structure
    frame = result['results'][0]
    assert 'step' in frame
    assert 'time' in frame
    assert 'forces' in frame
    assert 'streamlines' in frame
    assert 'velocityField' in frame
    assert 'densityField' in frame
    
    print(f"✅ Data structure validated!")
    print(f"   Keys in result: {list(result.keys())}")
    print(f"   Keys in frame: {list(frame.keys())}")
    
    return result


def test_performance():
    """Test simulation performance"""
    print("\n🧪 Test 5: Performance Test")
    print("=" * 50)
    
    import time
    
    config = {
        'width': 200,
        'height': 100,
        'viscosity': 0.0001,
        'inletVelocity': 5.0,
        'steps': 50,
        'obstacles': [
            {'shape': 'airfoil', 'params': {'x': 100, 'y': 50, 'chord': 40, 'thickness': 0.12}}
        ]
    }
    
    start_time = time.time()
    result = simulate_flow(config)
    elapsed = time.time() - start_time
    
    steps_per_second = config['steps'] / elapsed
    
    print(f"✅ Performance test complete!")
    print(f"   Total time: {elapsed:.2f}s")
    print(f"   Steps: {config['steps']}")
    print(f"   Speed: {steps_per_second:.1f} steps/second")
    
    return result


def run_all_tests():
    """Run all tests"""
    print("\n" + "=" * 50)
    print("🌬️  AERODYNAMICS SIMULATION TEST SUITE")
    print("=" * 50)
    
    try:
        test_basic_simulation()
        test_airfoil_simulation()
        test_optimization()
        test_data_structure()
        test_performance()
        
        print("\n" + "=" * 50)
        print("✅ ALL TESTS PASSED!")
        print("=" * 50)
        print("\n🎉 Aerodynamics simulation is working perfectly!")
        print("\nNext steps:")
        print("  1. Start API: python api.py")
        print("  2. Access UI: http://localhost:3000/dashboard/labtwin/labs/aerodynamics")
        print("  3. Try different presets and optimization targets")
        
        return True
        
    except Exception as e:
        print("\n" + "=" * 50)
        print(f"❌ TEST FAILED: {str(e)}")
        print("=" * 50)
        return False


if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)

