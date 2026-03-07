"""
Build script for ThermoFlow
Generates sample heat transfer simulations
"""

import json
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent))

from main import simulate_heat_transfer


def build():
    """Generate static thermal simulation data"""
    
    print("🔥 Building ThermoFlow...")
    
    # Default simulation
    print("\n1. Generating default simulation...")
    config = {
        'width': 100,
        'height': 100,
        'thermal_diffusivity': 0.15,
        'steps': 100,
        'initial_temperature': 20,
        'heat_sources': [
            {'x': 50, 'y': 50, 'temperature': 100, 'radius': 10}
        ],
        'heat_sinks': [],
        'obstacles': []
    }
    
    result = simulate_heat_transfer(config)
    print(f"   ✅ Generated {len(result['results'])} frames")
    print(f"   Temperature range: {result['final_statistics']['min']:.1f}°C - {result['final_statistics']['max']:.1f}°C")
    
    # Prepare output
    output = {
        'metadata': {
            'name': 'ThermoFlow',
            'version': '1.0.0',
            'description': 'Heat transfer and thermal flow simulation'
        },
        'defaultSimulation': result,
        'presets': [
            {'id': 'single_source', 'name': 'Một nguồn nhiệt', 'icon': '🔥'},
            {'id': 'two_sources', 'name': 'Hai nguồn nhiệt', 'icon': '🔥🔥'},
            {'id': 'cooling_system', 'name': 'Hệ thống làm mát', 'icon': '❄️'},
            {'id': 'insulation', 'name': 'Vật liệu cách nhiệt', 'icon': '🧱'},
            {'id': 'heat_flow', 'name': 'Dòng nhiệt', 'icon': '🌡️'}
        ]
    }
    
    # Save
    output_dir = Path(__file__).parent / 'output'
    output_dir.mkdir(exist_ok=True)
    
    output_file = output_dir / 'data.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ Build complete! Output saved to {output_file}")


if __name__ == "__main__":
    build()
