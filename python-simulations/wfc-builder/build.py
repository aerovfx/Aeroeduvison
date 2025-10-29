"""
Build script for WFC Builder
Generates sample structures for Next.js integration
"""

import json
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent))

from main import run_wfc_simulation
from pattern_generator import PatternGenerator


def build():
    """Generate static WFC data"""
    
    print("🏗️  Building WFC Builder...")
    
    # Generate sample structures
    samples = []
    
    # 1. Small house
    print("\n1. Generating small house...")
    house = run_wfc_simulation({
        'width': 6,
        'height': 5,
        'depth': 6,
        'tileset': 'building_blocks',
        'seed': 42,
        'max_iterations': 1000
    })
    samples.append({
        'id': 'house',
        'name': 'Small House',
        'data': house
    })
    print(f"   ✅ Generated {len(house['voxels'])} voxels")
    
    # 2. Dungeon
    print("\n2. Generating dungeon...")
    dungeon = run_wfc_simulation({
        'width': 10,
        'height': 4,
        'depth': 10,
        'tileset': 'dungeon',
        'seed': 123,
        'max_iterations': 1000
    })
    samples.append({
        'id': 'dungeon',
        'name': 'Dungeon',
        'data': dungeon
    })
    print(f"   ✅ Generated {len(dungeon['voxels'])} voxels")
    
    # 3. Simple blocks
    print("\n3. Generating simple structure...")
    simple = run_wfc_simulation({
        'width': 8,
        'height': 8,
        'depth': 8,
        'tileset': 'simple_blocks',
        'seed': 456,
        'max_iterations': 800
    })
    samples.append({
        'id': 'simple',
        'name': 'Simple Structure',
        'data': simple
    })
    print(f"   ✅ Generated {len(simple['voxels'])} voxels")
    
    # Get pattern styles
    print("\n4. Loading pattern styles...")
    styles = PatternGenerator.get_available_styles()
    
    # Prepare output
    output = {
        'metadata': {
            'name': 'WFC Builder',
            'version': '1.0.0',
            'description': 'Wave Function Collapse 3D procedural generation',
            'algorithm': 'Wave Function Collapse'
        },
        'samples': samples,
        'pattern_styles': styles,
        'tilesets': [
            {
                'id': 'simple_blocks',
                'name': 'Simple Blocks',
                'description': 'Basic solid and empty blocks'
            },
            {
                'id': 'building_blocks',
                'name': 'Building Blocks',
                'description': 'Walls, floors, windows, doors, roofs'
            },
            {
                'id': 'dungeon',
                'name': 'Dungeon',
                'description': 'Corridors, rooms, junctions, walls'
            }
        ]
    }
    
    # Save to output directory
    output_dir = Path(__file__).parent / 'output'
    output_dir.mkdir(exist_ok=True)
    
    output_file = output_dir / 'data.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ Build complete! Output saved to {output_file}")
    print(f"📊 Generated {len(samples)} sample structures")
    print(f"🎨 Loaded {len(styles)} pattern styles")


if __name__ == "__main__":
    build()



