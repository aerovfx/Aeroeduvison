"""
Build script for Aerodynamics simulation
Generates output data for Next.js integration
"""

import json
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent))

from main import simulate_flow, optimize_shape_with_ai


def build():
    """Generate static simulation data"""
    
    print("🌬️  Building Aerodynamics Simulation...")
    
    # Default configuration
    config = {
        'width': 200,
        'height': 100,
        'viscosity': 0.0001,
        'inletVelocity': 5.0,
        'steps': 100,
        'obstacles': [
            {
                'shape': 'airfoil',
                'params': {'x': 100, 'y': 50, 'chord': 40, 'thickness': 0.12}
            }
        ]
    }
    
    # Run simulation
    print("Running simulation...")
    result = simulate_flow(config)
    
    # Run optimization
    print("Running shape optimization...")
    optimization = optimize_shape_with_ai("low_drag")
    
    # Prepare output
    output = {
        'metadata': {
            'name': 'Aerodynamics Simulation',
            'version': '1.0.0',
            'description': 'Navier-Stokes based fluid dynamics simulation',
            'built_at': str(Path(__file__).stat().st_mtime)
        },
        'defaultSimulation': result,
        'optimization': optimization,
        'presets': [
            {
                'id': 'cylinder',
                'name': 'Vật Cản Hình Trụ',
                'description': 'Dòng khí quanh hình trụ',
                'icon': '⭕'
            },
            {
                'id': 'airfoil',
                'name': 'Cánh Máy Bay',
                'description': 'Profil NACA airfoil',
                'icon': '✈️'
            },
            {
                'id': 'square',
                'name': 'Vật Cản Vuông',
                'description': 'Dòng khí quanh hình vuông',
                'icon': '⬜'
            }
        ]
    }
    
    # Save to output directory
    output_dir = Path(__file__).parent / 'output'
    output_dir.mkdir(exist_ok=True)
    
    output_file = output_dir / 'data.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Build complete! Output saved to {output_file}")
    print(f"📊 Generated {len(result['results'])} simulation frames")
    print(f"🎯 Optimized {len(optimization['bestShapes'])} shapes")


if __name__ == "__main__":
    build()

