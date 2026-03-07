#!/usr/bin/env python3
"""
Wave Function Collapse (WFC) Builder - Backend Server
Port: 8019
"""

import os
import sys
import json
import time
import random
import numpy as np
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from typing import List, Dict, Tuple, Set, Optional
import threading
from dataclasses import dataclass
from enum import Enum

# Add current directory to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

app = Flask(__name__)
CORS(app)

# Configuration
PORT = 8019
DEBUG = True

class Direction(Enum):
    UP = (0, -1)
    DOWN = (0, 1)
    LEFT = (-1, 0)
    RIGHT = (1, 0)

@dataclass
class Tile:
    """Represents a tile with its properties and constraints"""
    id: str
    name: str
    weight: float = 1.0
    constraints: Dict[Direction, List[str]] = None
    
    def __post_init__(self):
        if self.constraints is None:
            self.constraints = {d: [] for d in Direction}

@dataclass
class Cell:
    """Represents a cell in the WFC grid"""
    x: int
    y: int
    possible_tiles: Set[str]
    collapsed: bool = False
    tile: Optional[str] = None
    
    def entropy(self, tiles: Dict[str, Tile]) -> float:
        """Calculate entropy of this cell"""
        if self.collapsed:
            return 0.0
        
        total_weight = sum(tiles[tile_id].weight for tile_id in self.possible_tiles)
        if total_weight == 0:
            return 0.0
        
        entropy = 0.0
        for tile_id in self.possible_tiles:
            p = tiles[tile_id].weight / total_weight
            if p > 0:
                entropy -= p * np.log2(p)
        
        return entropy

class WFCBuilder:
    """Wave Function Collapse algorithm implementation"""
    
    def __init__(self, width: int, height: int):
        self.width = width
        self.height = height
        self.tiles = {}
        self.grid = {}
        self.generation_complete = False
        self.generation_steps = []
        
        # Initialize grid
        for y in range(height):
            for x in range(width):
                self.grid[(x, y)] = Cell(x, y, set())
    
    def add_tile(self, tile: Tile):
        """Add a tile to the tile set"""
        self.tiles[tile.id] = tile
        
        # Add to all cells initially
        for cell in self.grid.values():
            cell.possible_tiles.add(tile.id)
    
    def get_cell(self, x: int, y: int) -> Optional[Cell]:
        """Get cell at position (x, y)"""
        return self.grid.get((x, y))
    
    def get_neighbor(self, x: int, y: int, direction: Direction) -> Optional[Cell]:
        """Get neighbor cell in given direction"""
        dx, dy = direction.value
        return self.get_cell(x + dx, y + dy)
    
    def get_lowest_entropy_cell(self) -> Optional[Cell]:
        """Find cell with lowest entropy (highest priority for collapse)"""
        min_entropy = float('inf')
        candidates = []
        
        for cell in self.grid.values():
            if cell.collapsed:
                continue
            
            entropy = cell.entropy(self.tiles)
            if entropy < min_entropy:
                min_entropy = entropy
                candidates = [cell]
            elif entropy == min_entropy:
                candidates.append(cell)
        
        return random.choice(candidates) if candidates else None
    
    def collapse_cell(self, cell: Cell) -> bool:
        """Collapse a cell to a single tile"""
        if cell.collapsed or not cell.possible_tiles:
            return False
        
        # Weighted random selection
        weights = [self.tiles[tile_id].weight for tile_id in cell.possible_tiles]
        tile_id = random.choices(list(cell.possible_tiles), weights=weights)[0]
        
        cell.collapsed = True
        cell.tile = tile_id
        cell.possible_tiles = {tile_id}
        
        return True
    
    def propagate_constraints(self, cell: Cell):
        """Propagate constraints from a collapsed cell to neighbors"""
        if not cell.collapsed or not cell.tile:
            return
        
        tile = self.tiles[cell.tile]
        
        for direction, allowed_tiles in tile.constraints.items():
            neighbor = self.get_neighbor(cell.x, cell.y, direction)
            if neighbor and not neighbor.collapsed:
                # Update neighbor's possible tiles
                neighbor.possible_tiles &= set(allowed_tiles)
    
    def is_contradiction(self) -> bool:
        """Check if there's a contradiction (cell with no possible tiles)"""
        for cell in self.grid.values():
            if not cell.collapsed and not cell.possible_tiles:
                return True
        return False
    
    def is_complete(self) -> bool:
        """Check if generation is complete"""
        for cell in self.grid.values():
            if not cell.collapsed:
                return False
        return True
    
    def generate_step_by_step(self, max_steps: int = 1000) -> List[Dict]:
        """Generate the pattern step by step for visualization"""
        self.generation_steps = []
        step_count = 0
        
        while not self.is_complete() and not self.is_contradiction() and step_count < max_steps:
            # Find cell with lowest entropy
            cell = self.get_lowest_entropy_cell()
            if not cell:
                break
            
            # Collapse the cell
            if self.collapse_cell(cell):
                # Propagate constraints
                self.propagate_constraints(cell)
                
                # Record step
                step = {
                    'step': step_count,
                    'action': 'collapse',
                    'cell': {'x': cell.x, 'y': cell.y, 'tile': cell.tile},
                    'grid_state': self.get_grid_state()
                }
                self.generation_steps.append(step)
                step_count += 1
        
        self.generation_complete = True
        return self.generation_steps
    
    def get_grid_state(self) -> Dict:
        """Get current state of the grid"""
        state = {}
        for (x, y), cell in self.grid.items():
            state[f"{x},{y}"] = {
                'x': x,
                'y': y,
                'collapsed': cell.collapsed,
                'tile': cell.tile,
                'possible_tiles': list(cell.possible_tiles),
                'entropy': cell.entropy(self.tiles)
            }
        return state
    
    def reset(self):
        """Reset the grid for new generation"""
        for cell in self.grid.values():
            cell.collapsed = False
            cell.tile = None
            cell.possible_tiles = set(self.tiles.keys())
        self.generation_complete = False
        self.generation_steps = []

# Global WFC instance
wfc_builder = None

def initialize_wfc():
    """Initialize WFC with default tiles"""
    global wfc_builder
    wfc_builder = WFCBuilder(20, 20)
    
    # Add basic tiles
    tiles = [
        Tile("empty", "Empty", 1.0),
        Tile("wall", "Wall", 1.0),
        Tile("floor", "Floor", 1.0),
        Tile("door", "Door", 0.5),
        Tile("window", "Window", 0.3),
    ]
    
    # Set up constraints (simplified)
    for tile in tiles:
        wfc_builder.add_tile(tile)
    
    # Set up basic constraints
    wall_tile = wfc_builder.tiles["wall"]
    wall_tile.constraints[Direction.UP] = ["wall", "empty"]
    wall_tile.constraints[Direction.DOWN] = ["wall", "empty"]
    wall_tile.constraints[Direction.LEFT] = ["wall", "empty"]
    wall_tile.constraints[Direction.RIGHT] = ["wall", "empty"]
    
    floor_tile = wfc_builder.tiles["floor"]
    floor_tile.constraints[Direction.UP] = ["floor", "wall"]
    floor_tile.constraints[Direction.DOWN] = ["floor", "wall"]
    floor_tile.constraints[Direction.LEFT] = ["floor", "wall"]
    floor_tile.constraints[Direction.RIGHT] = ["floor", "wall"]

# API Routes

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'WFC Builder',
        'port': PORT,
        'timestamp': time.time()
    })

@app.route('/api/status', methods=['GET'])
def get_status():
    """Get current WFC status"""
    if not wfc_builder:
        return jsonify({'error': 'WFC not initialized'}), 500
    
    return jsonify({
        'width': wfc_builder.width,
        'height': wfc_builder.height,
        'tiles_count': len(wfc_builder.tiles),
        'generation_complete': wfc_builder.generation_complete,
        'steps_count': len(wfc_builder.generation_steps)
    })

@app.route('/api/tiles', methods=['GET'])
def get_tiles():
    """Get all available tiles"""
    if not wfc_builder:
        return jsonify({'error': 'WFC not initialized'}), 500
    
    tiles_data = {}
    for tile_id, tile in wfc_builder.tiles.items():
        tiles_data[tile_id] = {
            'id': tile.id,
            'name': tile.name,
            'weight': tile.weight,
            'constraints': {d.name: constraints for d, constraints in tile.constraints.items()}
        }
    
    return jsonify(tiles_data)

@app.route('/api/grid', methods=['GET'])
def get_grid():
    """Get current grid state"""
    if not wfc_builder:
        return jsonify({'error': 'WFC not initialized'}), 500
    
    return jsonify({
        'grid': wfc_builder.get_grid_state(),
        'generation_complete': wfc_builder.generation_complete
    })

@app.route('/api/generate', methods=['POST'])
def generate_pattern():
    """Generate a new pattern"""
    if not wfc_builder:
        return jsonify({'error': 'WFC not initialized'}), 500
    
    data = request.get_json() or {}
    max_steps = data.get('max_steps', 1000)
    
    # Reset and generate
    wfc_builder.reset()
    steps = wfc_builder.generate_step_by_step(max_steps)
    
    return jsonify({
        'success': True,
        'steps': steps,
        'generation_complete': wfc_builder.generation_complete,
        'total_steps': len(steps)
    })

@app.route('/api/step', methods=['POST'])
def generate_single_step():
    """Generate a single step"""
    if not wfc_builder:
        return jsonify({'error': 'WFC not initialized'}), 500
    
    if wfc_builder.is_complete():
        return jsonify({'error': 'Generation already complete'}), 400
    
    if wfc_builder.is_contradiction():
        return jsonify({'error': 'Contradiction detected'}), 400
    
    # Find and collapse next cell
    cell = wfc_builder.get_lowest_entropy_cell()
    if not cell:
        return jsonify({'error': 'No cell to collapse'}), 400
    
    # Collapse and propagate
    wfc_builder.collapse_cell(cell)
    wfc_builder.propagate_constraints(cell)
    
    return jsonify({
        'success': True,
        'cell': {'x': cell.x, 'y': cell.y, 'tile': cell.tile},
        'grid_state': wfc_builder.get_grid_state(),
        'complete': wfc_builder.is_complete(),
        'contradiction': wfc_builder.is_contradiction()
    })

@app.route('/api/reset', methods=['POST'])
def reset_generation():
    """Reset the generation"""
    if not wfc_builder:
        return jsonify({'error': 'WFC not initialized'}), 500
    
    wfc_builder.reset()
    
    return jsonify({
        'success': True,
        'message': 'Generation reset',
        'grid_state': wfc_builder.get_grid_state()
    })

@app.route('/api/config', methods=['POST'])
def update_config():
    """Update WFC configuration"""
    if not wfc_builder:
        return jsonify({'error': 'WFC not initialized'}), 500
    
    data = request.get_json() or {}
    width = data.get('width')
    height = data.get('height')
    
    if width and height:
        global wfc_builder
        wfc_builder = WFCBuilder(width, height)
        initialize_wfc()
    
    return jsonify({
        'success': True,
        'width': wfc_builder.width,
        'height': wfc_builder.height
    })

@app.route('/api/export', methods=['GET'])
def export_pattern():
    """Export the generated pattern"""
    if not wfc_builder:
        return jsonify({'error': 'WFC not initialized'}), 500
    
    pattern = []
    for y in range(wfc_builder.height):
        row = []
        for x in range(wfc_builder.width):
            cell = wfc_builder.get_cell(x, y)
            if cell and cell.collapsed:
                row.append(cell.tile)
            else:
                row.append(None)
        pattern.append(row)
    
    return jsonify({
        'pattern': pattern,
        'width': wfc_builder.width,
        'height': wfc_builder.height,
        'tiles': list(wfc_builder.tiles.keys())
    })

# Serve static files
@app.route('/')
def serve_index():
    """Serve the main HTML file"""
    return send_from_directory('.', 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    """Serve static files"""
    return send_from_directory('.', filename)

def main():
    """Main function to run the server"""
    print(f"🧠 Starting WFC Builder Server on port {PORT}")
    print(f"📊 Wave Function Collapse Algorithm")
    print(f"🎮 WebGL Visualization Ready")
    print(f"🐍 Python Backend Active")
    
    # Initialize WFC
    initialize_wfc()
    print(f"✅ WFC initialized with {len(wfc_builder.tiles)} tiles")
    
    # Start server
    app.run(host='0.0.0.0', port=PORT, debug=DEBUG, threaded=True)

if __name__ == '__main__':
    main()












