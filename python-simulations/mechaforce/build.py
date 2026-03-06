"""
Build script for MechaForce
"""

import json
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent))

from main import analyze_structure, optimize_structure


def build():
    print("🏗️  Building MechaForce...")
    
    # Cantilever beam
    config = {
        'nodes': [
            {'x': 0, 'y': 0, 'is_fixed': True},
            {'x': 1, 'y': 0, 'is_fixed': False},
            {'x': 2, 'y': 0, 'is_fixed': False}
        ],
        'beams': [
            {'node1_id': 0, 'node2_id': 1, 'area': 0.01, 'E': 200e9},
            {'node1_id': 1, 'node2_id': 2, 'area': 0.01, 'E': 200e9}
        ],
        'forces': [
            {'node_id': 2, 'fx': 0, 'fy': -10000}
        ]
    }
    
    print("\n1. Analyzing cantilever beam...")
    result = analyze_structure(config)
    print(f"   ✅ Max displacement: {result['max_displacement']:.6f} m")
    print(f"   ✅ Max stress: {result['max_stress']/1e6:.2f} MPa")
    
    print("\n2. Running optimization...")
    optimization = optimize_structure(config)
    print(f"   ✅ Best config: {optimization['recommendation']['area']} m²")
    
    output = {
        'metadata': {
            'name': 'MechaForce',
            'version': '1.0.0',
            'description': 'Structural mechanics analysis'
        },
        'defaultAnalysis': result,
        'optimization': optimization
    }
    
    output_dir = Path(__file__).parent / 'output'
    output_dir.mkdir(exist_ok=True)
    
    with open(output_dir / 'data.json', 'w') as f:
        json.dump(output, f, indent=2)
    
    print(f"\n✅ Build complete!")


if __name__ == "__main__":
    build()
