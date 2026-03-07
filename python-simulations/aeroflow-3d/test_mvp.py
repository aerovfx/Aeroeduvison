"""
AeroFlow XR MVP - End-to-End Test Script
Tests all components of the MVP system
"""

import sys
import requests
import time
from pathlib import Path

# Colors for terminal output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_test(name, status, message=""):
    """Print test result"""
    if status == "pass":
        print(f"{GREEN}✓{RESET} {name}")
        if message:
            print(f"  └─ {message}")
    elif status == "fail":
        print(f"{RED}✗{RESET} {name}")
        if message:
            print(f"  └─ {RED}{message}{RESET}")
    elif status == "skip":
        print(f"{YELLOW}⊘{RESET} {name}")
        if message:
            print(f"  └─ {YELLOW}{message}{RESET}")

def test_imports():
    """Test Python imports"""
    print(f"\n{BLUE}=== Testing Python Imports ==={RESET}\n")
    
    try:
        import numpy
        print_test("NumPy", "pass", f"version {numpy.__version__}")
    except ImportError as e:
        print_test("NumPy", "fail", str(e))
        return False
    
    try:
        import taichi as ti
        print_test("Taichi", "pass", f"version {ti.__version__}")
    except ImportError as e:
        print_test("Taichi", "fail", str(e))
        return False
    
    try:
        import fastapi
        print_test("FastAPI", "pass", f"version {fastapi.__version__}")
    except ImportError as e:
        print_test("FastAPI", "fail", str(e))
        return False
    
    try:
        import uvicorn
        print_test("Uvicorn", "pass")
    except ImportError as e:
        print_test("Uvicorn", "fail", str(e))
        return False
    
    return True

def test_taichi_gpu():
    """Test Taichi GPU initialization"""
    print(f"\n{BLUE}=== Testing Taichi GPU ==={RESET}\n")
    
    try:
        import taichi as ti
        
        # Try GPU first
        try:
            ti.init(arch=ti.gpu)
            backend = str(ti.cfg.arch)
            print_test("GPU Backend", "pass", f"Using {backend}")
            return True
        except:
            ti.init(arch=ti.cpu)
            print_test("GPU Backend", "skip", "Using CPU fallback")
            return True
            
    except Exception as e:
        print_test("GPU Backend", "fail", str(e))
        return False

def test_simulation():
    """Test basic simulation"""
    print(f"\n{BLUE}=== Testing Simulation ==={RESET}\n")
    
    try:
        from main_taichi import simulate_3d_flow
        
        config = {
            'grid_size': [32, 16, 16],  # Small for quick test
            'steps': 10,
            'inlet_velocity': [5.0, 0.0, 0.0],
            'obstacle': {
                'type': 'sphere',
                'position': [15, 8, 8],
                'radius': 3.0
            }
        }
        
        start_time = time.time()
        result = simulate_3d_flow(config)
        elapsed = time.time() - start_time
        
        if result.get('success'):
            fps = result['stats']['avg_fps']
            frames = len(result['results'])
            print_test("Simulation Run", "pass", 
                      f"{frames} frames in {elapsed:.2f}s ({fps:.1f} FPS)")
            
            # Check results structure
            if len(result['results']) > 0:
                frame = result['results'][0]
                particles = frame.get('particles', [])
                forces = frame.get('forces', {})
                
                print_test("Particle Output", "pass", f"{len(particles)} particles")
                print_test("Force Calculation", "pass", 
                          f"Cd={forces.get('drag_coefficient', 0):.4f}")
            
            return True
        else:
            print_test("Simulation Run", "fail", "Simulation did not succeed")
            return False
            
    except Exception as e:
        print_test("Simulation Run", "fail", str(e))
        import traceback
        traceback.print_exc()
        return False

def test_api_server():
    """Test API server (if running)"""
    print(f"\n{BLUE}=== Testing API Server ==={RESET}\n")
    
    API_URL = "http://localhost:8008"
    
    try:
        # Test health endpoint
        response = requests.get(f"{API_URL}/health", timeout=2)
        if response.status_code == 200:
            data = response.json()
            print_test("API Health Check", "pass", 
                      f"Status: {data.get('status')}, Backend: {data.get('backend')}")
        else:
            print_test("API Health Check", "fail", f"Status code: {response.status_code}")
            return False
        
        # Test presets endpoint
        response = requests.get(f"{API_URL}/presets", timeout=2)
        if response.status_code == 200:
            data = response.json()
            presets = data.get('presets', [])
            print_test("Presets Endpoint", "pass", f"{len(presets)} presets available")
        else:
            print_test("Presets Endpoint", "fail", f"Status code: {response.status_code}")
            return False
        
        # Test simulation endpoint (quick test)
        config = {
            'grid_size': [32, 16, 16],
            'steps': 5,
            'inlet_velocity': [5.0, 0.0, 0.0],
            'obstacle': {
                'type': 'sphere',
                'position': [15, 8, 8],
                'radius': 3.0
            }
        }
        
        print(f"  Running quick API simulation test...")
        response = requests.post(f"{API_URL}/simulate", json=config, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                frames = len(data.get('results', []))
                print_test("Simulate Endpoint", "pass", f"{frames} frames returned")
            else:
                print_test("Simulate Endpoint", "fail", "Simulation not successful")
                return False
        else:
            print_test("Simulate Endpoint", "fail", f"Status code: {response.status_code}")
            return False
        
        return True
        
    except requests.exceptions.ConnectionError:
        print_test("API Health Check", "skip", 
                  "API server not running (start with: python api.py)")
        return None  # Not a failure, just not running
    except Exception as e:
        print_test("API Connection", "fail", str(e))
        return False

def test_file_structure():
    """Test file structure"""
    print(f"\n{BLUE}=== Testing File Structure ==={RESET}\n")
    
    required_files = [
        'main_taichi.py',
        'api.py',
        'requirements.txt',
        'start_api.sh',
        'README.md'
    ]
    
    all_exist = True
    for filename in required_files:
        if Path(filename).exists():
            print_test(filename, "pass")
        else:
            print_test(filename, "fail", "File not found")
            all_exist = False
    
    return all_exist

def main():
    """Run all tests"""
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}  AeroFlow XR MVP - End-to-End Test Suite{RESET}")
    print(f"{BLUE}{'='*60}{RESET}")
    
    results = {
        'file_structure': test_file_structure(),
        'imports': test_imports(),
        'gpu': test_taichi_gpu(),
        'simulation': test_simulation(),
        'api': test_api_server()
    }
    
    # Summary
    print(f"\n{BLUE}=== Test Summary ==={RESET}\n")
    
    passed = sum(1 for v in results.values() if v is True)
    failed = sum(1 for v in results.values() if v is False)
    skipped = sum(1 for v in results.values() if v is None)
    total = len(results)
    
    print(f"Total Tests: {total}")
    print(f"{GREEN}Passed: {passed}{RESET}")
    if failed > 0:
        print(f"{RED}Failed: {failed}{RESET}")
    if skipped > 0:
        print(f"{YELLOW}Skipped: {skipped}{RESET}")
    
    # Final verdict
    print(f"\n{BLUE}{'='*60}{RESET}")
    
    if failed == 0 and passed >= 3:
        print(f"{GREEN}✓ MVP is ready to use!{RESET}")
        print(f"\nNext steps:")
        print(f"  1. Start API: ./start_api.sh")
        print(f"  2. Start Frontend: npm run dev")
        print(f"  3. Open: http://localhost:3000/dashboard/labtwin/labs/aeroflow-3d")
        return 0
    elif failed == 0:
        print(f"{YELLOW}⚠ Partial success - some tests skipped{RESET}")
        print(f"\nTo run all tests:")
        print(f"  1. Start API server: python api.py")
        print(f"  2. Run tests again: python test_mvp.py")
        return 0
    else:
        print(f"{RED}✗ Some tests failed - check errors above{RESET}")
        print(f"\nCommon fixes:")
        print(f"  - Install dependencies: pip install -r requirements.txt")
        print(f"  - Activate venv: source venv/bin/activate")
        print(f"  - Check Python version: python3 --version (need 3.8+)")
        return 1

if __name__ == "__main__":
    sys.exit(main())

