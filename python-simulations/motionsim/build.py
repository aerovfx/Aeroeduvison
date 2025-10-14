"""
Build script for MotionSim
"""

import json
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).parent))

from main import simulate_motion


def build():
    print("🚀 Building MotionSim...")
    
    samples = []
    
    # 1. Free fall
    print("\n1. Simulating free fall...")
    free_fall = simulate_motion({
        'motion_type': 'free_fall',
        'h0': 50,
        'v0': 0,
        'g': 9.8,
        'duration': 10
    })
    samples.append({'id': 'free_fall', 'name': 'Rơi tự do', 'data': free_fall})
    print(f"   ✅ Impact time: {free_fall['analytics']['impact_time']:.2f}s")
    
    # 2. Projectile
    print("\n2. Simulating projectile motion...")
    projectile = simulate_motion({
        'motion_type': 'projectile',
        'v0': 25,
        'angle': 45,
        'h0': 0,
        'g': 9.8
    })
    samples.append({'id': 'projectile', 'name': 'Ném xiên', 'data': projectile})
    print(f"   ✅ Range: {projectile['analytics']['range']:.2f}m")
    
    # 3. Harmonic
    print("\n3. Simulating harmonic motion...")
    harmonic = simulate_motion({
        'motion_type': 'harmonic',
        'amplitude': 2.0,
        'frequency': 1.0,
        'phase': 0,
        'duration': 5
    })
    samples.append({'id': 'harmonic', 'name': 'Dao động điều hòa', 'data': harmonic})
    print(f"   ✅ Period: {harmonic['analytics']['period']:.2f}s")
    
    output = {
        'metadata': {
            'name': 'MotionSim',
            'version': '1.0.0',
            'description': 'Physics motion simulation'
        },
        'samples': samples
    }
    
    output_dir = Path(__file__).parent / 'output'
    output_dir.mkdir(exist_ok=True)
    
    with open(output_dir / 'data.json', 'w') as f:
        json.dump(output, f, indent=2)
    
    print(f"\n✅ Build complete!")


if __name__ == "__main__":
    build()


