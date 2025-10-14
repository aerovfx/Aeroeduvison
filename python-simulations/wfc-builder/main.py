"""
Wave Function Collapse (WFC) Algorithm - 3D Implementation
Procedural generation using constraint satisfaction
"""

import numpy as np
import json
from typing import Dict, List, Tuple, Set, Optional
import random
from collections import defaultdict
from dataclasses import dataclass, asdict


@dataclass
class Tile:
    """Represents a 3D tile/module with adjacency rules"""
    id: str
    name: str
    model: str  # Model type (cube, l_shape, t_shape, etc.)
    color: str
    rotation: int = 0
    
    # Adjacency constraints: which tiles can be adjacent in each direction
    # Directions: +x, -x, +y, -y, +z, -z
    adjacent_rules: Dict[str, List[str]] = None
    
    def __post_init__(self):
        if self.adjacent_rules is None:
            self.adjacent_rules = {
                '+x': [], '-x': [], 
                '+y': [], '-y': [], 
                '+z': [], '-z': []
            }
    
    def to_dict(self):
        return asdict(self)


class WFC3D:
    """Wave Function Collapse algorithm for 3D procedural generation"""
    
    def __init__(self, width: int, height: int, depth: int, tiles: List[Tile]):
        self.width = width
        self.height = height
        self.depth = depth
        self.tiles = tiles
        self.tile_dict = {tile.id: tile for tile in tiles}
        
        # Wave function: each cell contains set of possible tiles
        self.grid = np.empty((width, height, depth), dtype=object)
        for x in range(width):
            for y in range(height):
                for z in range(depth):
                    self.grid[x, y, z] = set(tile.id for tile in tiles)
        
        # Collapsed state: which tiles are finalized
        self.collapsed = np.zeros((width, height, depth), dtype=bool)
        
        # Final result
        self.result = np.empty((width, height, depth), dtype=object)
        
        # Statistics
        self.iteration_count = 0
        self.contradiction_count = 0
        
    def get_entropy(self, x: int, y: int, z: int) -> float:
        """Calculate entropy (number of possible states) at position"""
        if self.collapsed[x, y, z]:
            return 0
        return len(self.grid[x, y, z])
    
    def find_min_entropy_cell(self) -> Optional[Tuple[int, int, int]]:
        """Find cell with minimum entropy (fewest possibilities) to collapse next"""
        min_entropy = float('inf')
        candidates = []
        
        for x in range(self.width):
            for y in range(self.height):
                for z in range(self.depth):
                    if not self.collapsed[x, y, z]:
                        entropy = self.get_entropy(x, y, z)
                        if entropy == 0:
                            return None  # Contradiction
                        if entropy < min_entropy:
                            min_entropy = entropy
                            candidates = [(x, y, z)]
                        elif entropy == min_entropy:
                            candidates.append((x, y, z))
        
        if not candidates:
            return None
        
        return random.choice(candidates)
    
    def collapse(self, x: int, y: int, z: int):
        """Collapse wave function at position to single tile"""
        if self.collapsed[x, y, z]:
            return
        
        possible_tiles = list(self.grid[x, y, z])
        if not possible_tiles:
            self.contradiction_count += 1
            return
        
        # Choose random tile from possibilities
        chosen_tile_id = random.choice(possible_tiles)
        self.result[x, y, z] = chosen_tile_id
        self.collapsed[x, y, z] = True
        self.grid[x, y, z] = {chosen_tile_id}
        
    def get_neighbors(self, x: int, y: int, z: int) -> List[Tuple[int, int, int, str]]:
        """Get valid neighbors and their directions"""
        neighbors = []
        
        if x + 1 < self.width:
            neighbors.append((x + 1, y, z, '+x'))
        if x - 1 >= 0:
            neighbors.append((x - 1, y, z, '-x'))
        if y + 1 < self.height:
            neighbors.append((x, y + 1, z, '+y'))
        if y - 1 >= 0:
            neighbors.append((x, y - 1, z, '-y'))
        if z + 1 < self.depth:
            neighbors.append((x, y, z + 1, '+z'))
        if z - 1 >= 0:
            neighbors.append((x, y, z - 1, '-z'))
        
        return neighbors
    
    def propagate(self, x: int, y: int, z: int):
        """Propagate constraints from collapsed cell to neighbors"""
        stack = [(x, y, z)]
        
        while stack:
            cx, cy, cz = stack.pop()
            
            if not self.collapsed[cx, cy, cz]:
                continue
            
            current_tile_id = self.result[cx, cy, cz]
            current_tile = self.tile_dict[current_tile_id]
            
            # Check all neighbors
            for nx, ny, nz, direction in self.get_neighbors(cx, cy, cz):
                if self.collapsed[nx, ny, nz]:
                    continue
                
                # Get valid tiles for this neighbor based on constraints
                valid_tiles = set(current_tile.adjacent_rules.get(direction, []))
                
                # Intersect with current possibilities
                old_possibilities = self.grid[nx, ny, nz].copy()
                self.grid[nx, ny, nz] &= valid_tiles
                
                # If possibilities changed, add to stack for further propagation
                if len(self.grid[nx, ny, nz]) < len(old_possibilities):
                    if len(self.grid[nx, ny, nz]) == 0:
                        self.contradiction_count += 1
                    stack.append((nx, ny, nz))
    
    def is_complete(self) -> bool:
        """Check if all cells are collapsed"""
        return np.all(self.collapsed)
    
    def run(self, max_iterations: int = 1000) -> bool:
        """Run WFC algorithm"""
        self.iteration_count = 0
        
        while not self.is_complete() and self.iteration_count < max_iterations:
            self.iteration_count += 1
            
            # Find cell with minimum entropy
            cell = self.find_min_entropy_cell()
            
            if cell is None:
                # Either complete or contradiction
                if self.is_complete():
                    return True
                else:
                    print(f"Contradiction at iteration {self.iteration_count}")
                    return False
            
            x, y, z = cell
            
            # Collapse the cell
            self.collapse(x, y, z)
            
            # Propagate constraints
            self.propagate(x, y, z)
        
        return self.is_complete()
    
    def get_result_array(self) -> np.ndarray:
        """Get final result as numpy array of tile IDs"""
        result = np.empty((self.width, self.height, self.depth), dtype=object)
        for x in range(self.width):
            for y in range(self.height):
                for z in range(self.depth):
                    if self.collapsed[x, y, z]:
                        result[x, y, z] = self.result[x, y, z]
                    else:
                        result[x, y, z] = None
        return result
    
    def to_json(self) -> Dict:
        """Export result to JSON format"""
        voxels = []
        
        for x in range(self.width):
            for y in range(self.height):
                for z in range(self.depth):
                    if self.collapsed[x, y, z]:
                        tile_id = self.result[x, y, z]
                        tile = self.tile_dict[tile_id]
                        
                        voxels.append({
                            'position': [int(x), int(y), int(z)],
                            'tile_id': tile_id,
                            'tile_name': tile.name,
                            'model': tile.model,
                            'color': tile.color,
                            'rotation': tile.rotation
                        })
        
        return {
            'dimensions': {
                'width': int(self.width),
                'height': int(self.height),
                'depth': int(self.depth)
            },
            'voxels': voxels,
            'statistics': {
                'iterations': int(self.iteration_count),
                'contradictions': int(self.contradiction_count),
                'success': bool(self.is_complete()),
                'fill_rate': float(len(voxels) / (self.width * self.height * self.depth))
            }
        }


class TilesetLibrary:
    """Predefined tilesets for different architectural styles"""
    
    @staticmethod
    def create_simple_blocks() -> List[Tile]:
        """Simple colored blocks"""
        tiles = []
        
        # Solid block - can connect to anything
        solid = Tile(
            id='solid',
            name='Solid Block',
            model='cube',
            color='#4CAF50',
            adjacent_rules={
                '+x': ['solid', 'empty'],
                '-x': ['solid', 'empty'],
                '+y': ['solid', 'empty'],
                '-y': ['solid', 'empty'],
                '+z': ['solid', 'empty'],
                '-z': ['solid', 'empty']
            }
        )
        tiles.append(solid)
        
        # Empty space
        empty = Tile(
            id='empty',
            name='Empty',
            model='empty',
            color='#FFFFFF',
            adjacent_rules={
                '+x': ['solid', 'empty'],
                '-x': ['solid', 'empty'],
                '+y': ['solid', 'empty'],
                '-y': ['solid', 'empty'],
                '+z': ['solid', 'empty'],
                '-z': ['solid', 'empty']
            }
        )
        tiles.append(empty)
        
        return tiles
    
    @staticmethod
    def create_building_blocks() -> List[Tile]:
        """Building blocks with walls, floors, corners"""
        tiles = []
        
        # Floor
        floor = Tile(
            id='floor',
            name='Floor',
            model='cube',
            color='#8D6E63',
            adjacent_rules={
                '+x': ['floor', 'wall', 'corner', 'empty'],
                '-x': ['floor', 'wall', 'corner', 'empty'],
                '+y': ['wall', 'window', 'door', 'empty'],
                '-y': ['empty'],
                '+z': ['floor', 'wall', 'corner', 'empty'],
                '-z': ['floor', 'wall', 'corner', 'empty']
            }
        )
        tiles.append(floor)
        
        # Wall
        wall = Tile(
            id='wall',
            name='Wall',
            model='cube',
            color='#BDBDBD',
            adjacent_rules={
                '+x': ['wall', 'corner', 'window', 'empty'],
                '-x': ['wall', 'corner', 'window', 'empty'],
                '+y': ['wall', 'roof', 'empty'],
                '-y': ['floor', 'door'],
                '+z': ['wall', 'corner', 'window', 'empty'],
                '-z': ['wall', 'corner', 'window', 'empty']
            }
        )
        tiles.append(wall)
        
        # Window
        window = Tile(
            id='window',
            name='Window',
            model='cube',
            color='#64B5F6',
            adjacent_rules={
                '+x': ['wall', 'empty'],
                '-x': ['wall', 'empty'],
                '+y': ['wall', 'roof', 'empty'],
                '-y': ['wall', 'floor'],
                '+z': ['wall', 'empty'],
                '-z': ['wall', 'empty']
            }
        )
        tiles.append(window)
        
        # Door
        door = Tile(
            id='door',
            name='Door',
            model='cube',
            color='#8D6E63',
            adjacent_rules={
                '+x': ['wall', 'empty'],
                '-x': ['wall', 'empty'],
                '+y': ['wall', 'empty'],
                '-y': ['floor'],
                '+z': ['wall', 'empty'],
                '-z': ['wall', 'empty']
            }
        )
        tiles.append(door)
        
        # Roof
        roof = Tile(
            id='roof',
            name='Roof',
            model='cube',
            color='#D32F2F',
            adjacent_rules={
                '+x': ['roof', 'empty'],
                '-x': ['roof', 'empty'],
                '+y': ['empty'],
                '-y': ['wall'],
                '+z': ['roof', 'empty'],
                '-z': ['roof', 'empty']
            }
        )
        tiles.append(roof)
        
        # Corner
        corner = Tile(
            id='corner',
            name='Corner',
            model='cube',
            color='#757575',
            adjacent_rules={
                '+x': ['wall', 'floor', 'empty'],
                '-x': ['wall', 'floor', 'empty'],
                '+y': ['wall', 'corner', 'empty'],
                '-y': ['floor', 'corner'],
                '+z': ['wall', 'floor', 'empty'],
                '-z': ['wall', 'floor', 'empty']
            }
        )
        tiles.append(corner)
        
        # Empty
        empty = Tile(
            id='empty',
            name='Empty',
            model='empty',
            color='#FFFFFF',
            adjacent_rules={
                '+x': ['floor', 'wall', 'window', 'door', 'roof', 'corner', 'empty'],
                '-x': ['floor', 'wall', 'window', 'door', 'roof', 'corner', 'empty'],
                '+y': ['wall', 'window', 'roof', 'empty'],
                '-y': ['floor', 'roof', 'empty'],
                '+z': ['floor', 'wall', 'window', 'door', 'roof', 'corner', 'empty'],
                '-z': ['floor', 'wall', 'window', 'door', 'roof', 'corner', 'empty']
            }
        )
        tiles.append(empty)
        
        return tiles
    
    @staticmethod
    def create_dungeon_tiles() -> List[Tile]:
        """Dungeon tiles with corridors, rooms, walls"""
        tiles = []
        
        # Corridor - straight
        corridor = Tile(
            id='corridor',
            name='Corridor',
            model='cube',
            color='#616161',
            adjacent_rules={
                '+x': ['corridor', 'junction', 'room', 'empty'],
                '-x': ['corridor', 'junction', 'room', 'empty'],
                '+y': ['corridor', 'empty'],
                '-y': ['corridor', 'empty'],
                '+z': ['wall', 'empty'],
                '-z': ['wall', 'empty']
            }
        )
        tiles.append(corridor)
        
        # Junction
        junction = Tile(
            id='junction',
            name='Junction',
            model='cube',
            color='#9E9E9E',
            adjacent_rules={
                '+x': ['corridor', 'junction', 'room'],
                '-x': ['corridor', 'junction', 'room'],
                '+y': ['corridor', 'junction', 'empty'],
                '-y': ['corridor', 'junction', 'empty'],
                '+z': ['corridor', 'junction', 'room'],
                '-z': ['corridor', 'junction', 'room']
            }
        )
        tiles.append(junction)
        
        # Room
        room = Tile(
            id='room',
            name='Room',
            model='cube',
            color='#FDD835',
            adjacent_rules={
                '+x': ['room', 'corridor', 'junction', 'wall'],
                '-x': ['room', 'corridor', 'junction', 'wall'],
                '+y': ['room', 'empty'],
                '-y': ['room', 'empty'],
                '+z': ['room', 'corridor', 'junction', 'wall'],
                '-z': ['room', 'corridor', 'junction', 'wall']
            }
        )
        tiles.append(room)
        
        # Wall
        wall = Tile(
            id='wall',
            name='Wall',
            model='cube',
            color='#424242',
            adjacent_rules={
                '+x': ['wall', 'empty'],
                '-x': ['wall', 'empty'],
                '+y': ['wall', 'empty'],
                '-y': ['wall', 'empty'],
                '+z': ['corridor', 'room', 'wall', 'empty'],
                '-z': ['corridor', 'room', 'wall', 'empty']
            }
        )
        tiles.append(wall)
        
        # Empty
        empty = Tile(
            id='empty',
            name='Empty',
            model='empty',
            color='#000000',
            adjacent_rules={
                '+x': ['corridor', 'junction', 'wall', 'empty'],
                '-x': ['corridor', 'junction', 'wall', 'empty'],
                '+y': ['corridor', 'junction', 'room', 'empty'],
                '-y': ['corridor', 'junction', 'room', 'empty'],
                '+z': ['wall', 'empty'],
                '-z': ['wall', 'empty']
            }
        )
        tiles.append(empty)
        
        return tiles


def run_wfc_simulation(config: Dict) -> Dict:
    """Run WFC simulation with given configuration"""
    
    # Parse config
    width = config.get('width', 10)
    height = config.get('height', 10)
    depth = config.get('depth', 10)
    tileset_name = config.get('tileset', 'simple_blocks')
    seed = config.get('seed', None)
    max_iterations = config.get('max_iterations', 1000)
    
    if seed is not None:
        random.seed(seed)
        np.random.seed(seed)
    
    # Load tileset
    if tileset_name == 'simple_blocks':
        tiles = TilesetLibrary.create_simple_blocks()
    elif tileset_name == 'building_blocks':
        tiles = TilesetLibrary.create_building_blocks()
    elif tileset_name == 'dungeon':
        tiles = TilesetLibrary.create_dungeon_tiles()
    else:
        tiles = TilesetLibrary.create_simple_blocks()
    
    # Create and run WFC
    wfc = WFC3D(width, height, depth, tiles)
    success = wfc.run(max_iterations)
    
    # Get result
    result = wfc.to_json()
    result['tileset'] = tileset_name
    result['tiles_library'] = [tile.to_dict() for tile in tiles]
    result['config'] = config
    
    return result


if __name__ == "__main__":
    # Test WFC with building blocks
    config = {
        'width': 8,
        'height': 6,
        'depth': 8,
        'tileset': 'building_blocks',
        'seed': 42,
        'max_iterations': 1000
    }
    
    print("🏗️  Running Wave Function Collapse simulation...")
    result = run_wfc_simulation(config)
    
    print(f"\n✅ Simulation complete!")
    print(f"   Iterations: {result['statistics']['iterations']}")
    print(f"   Success: {result['statistics']['success']}")
    print(f"   Voxels generated: {len(result['voxels'])}")
    print(f"   Fill rate: {result['statistics']['fill_rate']:.2%}")
    print(f"   Contradictions: {result['statistics']['contradictions']}")

