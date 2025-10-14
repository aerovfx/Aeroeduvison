"""
ThermoFlow - Heat Transfer and Fluid Flow Simulation
Giải phương trình truyền nhiệt (Heat Equation) bằng NumPy
"""

import numpy as np
import json
from typing import Dict, List, Tuple, Optional


class HeatTransferSolver:
    """Solve 2D heat equation using finite difference method"""
    
    def __init__(self, width: int = 100, height: int = 100, 
                 thermal_diffusivity: float = 0.1):
        self.width = width
        self.height = height
        self.alpha = thermal_diffusivity  # Thermal diffusivity
        self.dt = 0.1  # Time step
        
        # Temperature field
        self.T = np.zeros((height, width))
        self.T_prev = np.zeros((height, width))
        
        # Heat sources (1 = heat source, 0 = normal)
        self.sources = np.zeros((height, width))
        
        # Obstacles (1 = obstacle, 0 = normal)
        self.obstacles = np.zeros((height, width), dtype=bool)
        
        # Material properties (thermal conductivity)
        self.conductivity = np.ones((height, width))
        
    def add_heat_source(self, x: int, y: int, temperature: float, radius: int = 5):
        """Add a heat source"""
        for i in range(max(0, y-radius), min(self.height, y+radius)):
            for j in range(max(0, x-radius), min(self.width, x+radius)):
                if (j - x)**2 + (i - y)**2 <= radius**2:
                    self.sources[i, j] = temperature
    
    def add_heat_sink(self, x: int, y: int, temperature: float, radius: int = 5):
        """Add a heat sink (cooling)"""
        self.add_heat_source(x, y, temperature, radius)
    
    def add_obstacle(self, x: int, y: int, width: int, height: int, 
                    conductivity: float = 0.5):
        """Add obstacle with different thermal conductivity"""
        x, y = int(x), int(y)
        width, height = int(width), int(height)
        
        for i in range(max(0, y), min(self.height, y + height)):
            for j in range(max(0, x), min(self.width, x + width)):
                self.obstacles[i, j] = True
                self.conductivity[i, j] = conductivity
    
    def set_initial_temperature(self, temperature: float):
        """Set initial temperature for entire field"""
        self.T.fill(temperature)
    
    def step(self):
        """Perform one time step using explicit finite difference"""
        self.T_prev = self.T.copy()
        
        # Heat equation: ∂T/∂t = α∇²T
        for i in range(1, self.height - 1):
            for j in range(1, self.width - 1):
                if not self.obstacles[i, j]:
                    # Laplacian (5-point stencil)
                    laplacian = (
                        self.T_prev[i+1, j] + self.T_prev[i-1, j] +
                        self.T_prev[i, j+1] + self.T_prev[i, j-1] -
                        4 * self.T_prev[i, j]
                    )
                    
                    # Update temperature
                    k = self.conductivity[i, j]
                    self.T[i, j] = self.T_prev[i, j] + self.alpha * k * self.dt * laplacian
        
        # Apply heat sources
        self.T += self.sources * self.dt
        
        # Boundary conditions (fixed temperature at boundaries)
        self.T[0, :] = 20  # Top
        self.T[-1, :] = 20  # Bottom
        self.T[:, 0] = 20  # Left
        self.T[:, -1] = 20  # Right
    
    def get_statistics(self) -> Dict:
        """Get temperature statistics"""
        return {
            'min': float(np.min(self.T)),
            'max': float(np.max(self.T)),
            'mean': float(np.mean(self.T)),
            'std': float(np.std(self.T))
        }
    
    def get_hot_regions(self, threshold: float = None) -> List[Tuple[int, int]]:
        """Identify hot regions (AI prediction)"""
        if threshold is None:
            threshold = np.mean(self.T) + np.std(self.T)
        
        hot_regions = []
        for i in range(self.height):
            for j in range(self.width):
                if self.T[i, j] > threshold:
                    hot_regions.append((int(j), int(i), float(self.T[i, j])))
        
        return hot_regions
    
    def to_heatmap_data(self, sample_rate: int = 1) -> List[Dict]:
        """Convert temperature field to heatmap data"""
        heatmap = []
        
        for i in range(0, self.height, sample_rate):
            for j in range(0, self.width, sample_rate):
                heatmap.append({
                    'x': j,
                    'y': i,
                    'temperature': float(self.T[i, j]),
                    'isObstacle': bool(self.obstacles[i, j])
                })
        
        return heatmap


def simulate_heat_transfer(config: Dict) -> Dict:
    """Main simulation function"""
    
    # Parse config
    width = config.get('width', 100)
    height = config.get('height', 100)
    thermal_diffusivity = config.get('thermal_diffusivity', 0.1)
    steps = config.get('steps', 100)
    initial_temp = config.get('initial_temperature', 20)
    
    # Create solver
    solver = HeatTransferSolver(width, height, thermal_diffusivity)
    solver.set_initial_temperature(initial_temp)
    
    # Add heat sources
    for source in config.get('heat_sources', []):
        solver.add_heat_source(
            source['x'], source['y'], 
            source['temperature'], 
            source.get('radius', 5)
        )
    
    # Add heat sinks
    for sink in config.get('heat_sinks', []):
        solver.add_heat_sink(
            sink['x'], sink['y'], 
            sink['temperature'], 
            sink.get('radius', 5)
        )
    
    # Add obstacles
    for obstacle in config.get('obstacles', []):
        solver.add_obstacle(
            obstacle['x'], obstacle['y'],
            obstacle['width'], obstacle['height'],
            obstacle.get('conductivity', 0.5)
        )
    
    # Run simulation
    results = []
    
    for step in range(steps):
        solver.step()
        
        # Record every 5th step
        if step % 5 == 0:
            stats = solver.get_statistics()
            hot_regions = solver.get_hot_regions()
            heatmap = solver.to_heatmap_data(sample_rate=2)
            
            results.append({
                'step': step,
                'time': step * solver.dt,
                'statistics': stats,
                'hot_regions': hot_regions[:50],  # Limit to top 50
                'heatmap': heatmap
            })
    
    # Final predictions
    final_stats = solver.get_statistics()
    hot_regions_final = solver.get_hot_regions()
    
    return {
        'success': True,
        'config': config,
        'results': results,
        'final_statistics': final_stats,
        'hot_regions_prediction': hot_regions_final[:100]
    }


def predict_hot_zones(temperature_field: np.ndarray, config: Dict = None) -> Dict:
    """AI-based prediction of hot zones"""
    
    # Simple threshold-based prediction
    threshold_factor = config.get('threshold_factor', 1.5) if config else 1.5
    
    mean_temp = np.mean(temperature_field)
    std_temp = np.std(temperature_field)
    threshold = mean_temp + threshold_factor * std_temp
    
    # Find hot zones
    hot_mask = temperature_field > threshold
    hot_zones = np.argwhere(hot_mask)
    
    # Cluster hot zones (simplified)
    clusters = []
    if len(hot_zones) > 0:
        # Group nearby points
        for point in hot_zones[:50]:
            y, x = point
            clusters.append({
                'x': int(x),
                'y': int(y),
                'temperature': float(temperature_field[y, x]),
                'confidence': float((temperature_field[y, x] - threshold) / std_temp)
            })
    
    return {
        'threshold': float(threshold),
        'hot_zones': clusters,
        'total_hot_pixels': int(np.sum(hot_mask)),
        'percentage_hot': float(np.sum(hot_mask) / temperature_field.size * 100)
    }


if __name__ == "__main__":
    # Test simulation
    config = {
        'width': 100,
        'height': 100,
        'thermal_diffusivity': 0.1,
        'steps': 100,
        'initial_temperature': 20,
        'heat_sources': [
            {'x': 25, 'y': 50, 'temperature': 100, 'radius': 8},
            {'x': 75, 'y': 50, 'temperature': 80, 'radius': 6}
        ],
        'heat_sinks': [
            {'x': 50, 'y': 25, 'temperature': -20, 'radius': 5}
        ],
        'obstacles': [
            {'x': 40, 'y': 40, 'width': 20, 'height': 20, 'conductivity': 0.3}
        ]
    }
    
    print("🔥 Running ThermoFlow simulation...")
    result = simulate_heat_transfer(config)
    
    print(f"\n✅ Simulation complete!")
    print(f"   Frames: {len(result['results'])}")
    print(f"   Final temp range: {result['final_statistics']['min']:.1f}°C - {result['final_statistics']['max']:.1f}°C")
    print(f"   Mean temp: {result['final_statistics']['mean']:.1f}°C")
    print(f"   Hot regions detected: {len(result['hot_regions_prediction'])}")
