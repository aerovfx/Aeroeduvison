"""
Aerodynamics Simulation - Navier-Stokes Solver
Mô phỏng động lực học không khí với giải thuật Navier-Stokes đơn giản
"""

import numpy as np
import json
from typing import Dict, List, Tuple, Optional
import time


class NavierStokesSolver:
    """Simplified 2D Navier-Stokes solver using finite difference method"""
    
    def __init__(self, width: int = 200, height: int = 100, viscosity: float = 0.0001):
        self.width = width
        self.height = height
        self.viscosity = viscosity
        self.dt = 0.1  # Time step
        
        # Velocity fields (u: horizontal, v: vertical)
        self.u = np.zeros((height, width))
        self.v = np.zeros((height, width))
        self.u_prev = np.zeros((height, width))
        self.v_prev = np.zeros((height, width))
        
        # Pressure field
        self.p = np.zeros((height, width))
        
        # Density/dye field for visualization
        self.density = np.zeros((height, width))
        self.density_prev = np.zeros((height, width))
        
        # Obstacle mask (1 = solid, 0 = fluid)
        self.obstacle = np.zeros((height, width), dtype=bool)
        
    def add_obstacle(self, shape: str, params: Dict):
        """Add obstacle to the flow field"""
        if shape == "circle":
            cx, cy, r = params['x'], params['y'], params['radius']
            for i in range(self.height):
                for j in range(self.width):
                    if (j - cx)**2 + (i - cy)**2 <= r**2:
                        self.obstacle[i, j] = True
                        
        elif shape == "rectangle":
            x, y, w, h = params['x'], params['y'], params['width'], params['height']
            x, y = int(x), int(y)
            w, h = int(w), int(h)
            self.obstacle[y:y+h, x:x+w] = True
            
        elif shape == "airfoil":
            # NACA airfoil approximation
            cx, cy = params['x'], params['y']
            chord = params.get('chord', 40)
            thickness = params.get('thickness', 0.12)
            
            for i in range(self.height):
                for j in range(self.width):
                    x_rel = (j - cx) / chord
                    if 0 <= x_rel <= 1:
                        # NACA 4-digit airfoil equation
                        yt = 5 * thickness * chord * (
                            0.2969 * np.sqrt(x_rel) - 
                            0.1260 * x_rel - 
                            0.3516 * x_rel**2 + 
                            0.2843 * x_rel**3 - 
                            0.1015 * x_rel**4
                        )
                        if abs(i - cy) <= yt:
                            self.obstacle[i, j] = True
    
    def add_velocity_source(self, x: int, y: int, vx: float, vy: float, radius: int = 5):
        """Add velocity source (inlet)"""
        for i in range(max(0, y-radius), min(self.height, y+radius)):
            for j in range(max(0, x-radius), min(self.width, x+radius)):
                if not self.obstacle[i, j]:
                    self.u[i, j] = vx
                    self.v[i, j] = vy
    
    def add_density_source(self, x: int, y: int, amount: float, radius: int = 5):
        """Add dye/density for visualization"""
        for i in range(max(0, y-radius), min(self.height, y+radius)):
            for j in range(max(0, x-radius), min(self.width, x+radius)):
                if not self.obstacle[i, j]:
                    self.density[i, j] = min(1.0, self.density[i, j] + amount)
    
    def diffuse(self, field: np.ndarray, field_prev: np.ndarray, diff_rate: float, iterations: int = 20):
        """Diffusion step using Gauss-Seidel iteration"""
        a = self.dt * diff_rate * self.width * self.height
        
        for _ in range(iterations):
            for i in range(1, self.height-1):
                for j in range(1, self.width-1):
                    if not self.obstacle[i, j]:
                        field[i, j] = (field_prev[i, j] + a * (
                            field[i-1, j] + field[i+1, j] + 
                            field[i, j-1] + field[i, j+1]
                        )) / (1 + 4*a)
    
    def advect(self, field: np.ndarray, field_prev: np.ndarray, u: np.ndarray, v: np.ndarray):
        """Advection step using semi-Lagrangian method"""
        dt0 = self.dt * max(self.width, self.height)
        
        for i in range(1, self.height-1):
            for j in range(1, self.width-1):
                if not self.obstacle[i, j]:
                    # Trace particle backwards
                    x = j - dt0 * u[i, j]
                    y = i - dt0 * v[i, j]
                    
                    # Clamp to grid
                    x = max(0.5, min(self.width - 1.5, x))
                    y = max(0.5, min(self.height - 1.5, y))
                    
                    # Bilinear interpolation
                    i0, j0 = int(y), int(x)
                    i1, j1 = i0 + 1, j0 + 1
                    
                    s1, s0 = x - j0, j0 + 1 - x
                    t1, t0 = y - i0, i0 + 1 - y
                    
                    field[i, j] = (
                        s0 * (t0 * field_prev[i0, j0] + t1 * field_prev[i1, j0]) +
                        s1 * (t0 * field_prev[i0, j1] + t1 * field_prev[i1, j1])
                    )
    
    def project(self, iterations: int = 20):
        """Projection step to ensure incompressibility"""
        div = np.zeros((self.height, self.width))
        p = np.zeros((self.height, self.width))
        
        # Calculate divergence
        for i in range(1, self.height-1):
            for j in range(1, self.width-1):
                if not self.obstacle[i, j]:
                    div[i, j] = -0.5 * (
                        self.u[i, j+1] - self.u[i, j-1] +
                        self.v[i+1, j] - self.v[i-1, j]
                    ) / max(self.width, self.height)
        
        # Solve for pressure using Gauss-Seidel
        for _ in range(iterations):
            for i in range(1, self.height-1):
                for j in range(1, self.width-1):
                    if not self.obstacle[i, j]:
                        p[i, j] = (div[i, j] + 
                                   p[i-1, j] + p[i+1, j] + 
                                   p[i, j-1] + p[i, j+1]) / 4
        
        # Subtract pressure gradient from velocity
        for i in range(1, self.height-1):
            for j in range(1, self.width-1):
                if not self.obstacle[i, j]:
                    self.u[i, j] -= 0.5 * (p[i, j+1] - p[i, j-1]) * self.width
                    self.v[i, j] -= 0.5 * (p[i+1, j] - p[i-1, j]) * self.height
        
        self.p = p
    
    def apply_boundaries(self):
        """Apply boundary conditions"""
        # Top and bottom walls
        self.u[0, :] = 0
        self.u[-1, :] = 0
        self.v[0, :] = 0
        self.v[-1, :] = 0
        
        # Left and right boundaries (can be inflow/outflow)
        # self.u[:, 0] = inlet velocity
        # self.u[:, -1] = self.u[:, -2]  # outflow
        
        # Obstacle boundaries
        for i in range(1, self.height-1):
            for j in range(1, self.width-1):
                if self.obstacle[i, j]:
                    self.u[i, j] = 0
                    self.v[i, j] = 0
    
    def step(self):
        """Perform one simulation step"""
        # Velocity step
        self.u_prev, self.u = self.u.copy(), self.u_prev
        self.v_prev, self.v = self.v.copy(), self.v_prev
        
        # Diffusion
        self.diffuse(self.u, self.u_prev, self.viscosity)
        self.diffuse(self.v, self.v_prev, self.viscosity)
        
        # Project to make incompressible
        self.project()
        
        # Advection
        self.u_prev, self.u = self.u.copy(), self.u_prev
        self.v_prev, self.v = self.v.copy(), self.v_prev
        self.advect(self.u, self.u_prev, self.u_prev, self.v_prev)
        self.advect(self.v, self.v_prev, self.u_prev, self.v_prev)
        
        # Project again
        self.project()
        
        # Apply boundaries
        self.apply_boundaries()
        
        # Density step
        self.density_prev, self.density = self.density.copy(), self.density_prev
        self.diffuse(self.density, self.density_prev, 0.0001)
        self.density_prev, self.density = self.density.copy(), self.density_prev
        self.advect(self.density, self.density_prev, self.u, self.v)
        
        # Decay density slightly for visualization
        self.density *= 0.995
    
    def calculate_forces(self) -> Dict:
        """Calculate drag and lift forces on obstacles"""
        drag = 0.0
        lift = 0.0
        
        # Simple force calculation based on pressure and velocity
        for i in range(1, self.height-1):
            for j in range(1, self.width-1):
                if self.obstacle[i, j]:
                    # Check neighbors
                    if not self.obstacle[i, j-1]:  # Left
                        drag += self.p[i, j-1] + 0.5 * self.u[i, j-1]**2
                    if not self.obstacle[i, j+1]:  # Right
                        drag -= self.p[i, j+1] + 0.5 * self.u[i, j+1]**2
                    if not self.obstacle[i-1, j]:  # Top
                        lift -= self.p[i-1, j] + 0.5 * self.v[i-1, j]**2
                    if not self.obstacle[i+1, j]:  # Bottom
                        lift += self.p[i+1, j] + 0.5 * self.v[i+1, j]**2
        
        return {
            'drag': float(drag),
            'lift': float(lift),
            'drag_coefficient': float(drag / 100.0),
            'lift_coefficient': float(lift / 100.0)
        }
    
    def get_streamlines(self, num_lines: int = 20) -> List[List[Tuple[float, float]]]:
        """Generate streamlines for visualization"""
        streamlines = []
        
        for i in range(num_lines):
            y_start = int(self.height * (i + 0.5) / num_lines)
            x_start = 5
            
            line = []
            x, y = float(x_start), float(y_start)
            
            for _ in range(300):  # Max points per streamline
                if x < 0 or x >= self.width-1 or y < 0 or y >= self.height-1:
                    break
                
                i_idx, j_idx = int(y), int(x)
                if self.obstacle[i_idx, j_idx]:
                    break
                
                line.append((float(x), float(y)))
                
                # Step along velocity field
                vx = self.u[i_idx, j_idx]
                vy = self.v[i_idx, j_idx]
                
                if abs(vx) < 0.01 and abs(vy) < 0.01:
                    break
                
                x += vx * 0.5
                y += vy * 0.5
            
            if len(line) > 5:
                streamlines.append(line)
        
        return streamlines


def simulate_flow(config: Dict) -> Dict:
    """Main simulation function"""
    
    # Parse configuration
    width = config.get('width', 200)
    height = config.get('height', 100)
    viscosity = config.get('viscosity', 0.0001)
    inlet_velocity = config.get('inletVelocity', 5.0)
    steps = config.get('steps', 100)
    
    # Create solver
    solver = NavierStokesSolver(width, height, viscosity)
    
    # Add obstacles
    for obstacle in config.get('obstacles', []):
        solver.add_obstacle(obstacle['shape'], obstacle['params'])
    
    # Add inlet flow
    inlet_height = height // 4
    for i in range(height // 2 - inlet_height, height // 2 + inlet_height):
        solver.add_velocity_source(5, i, inlet_velocity, 0, radius=2)
        solver.add_density_source(5, i, 1.0, radius=2)
    
    # Run simulation
    results = []
    
    for step in range(steps):
        solver.step()
        
        # Continuously add inlet flow
        for i in range(height // 2 - inlet_height, height // 2 + inlet_height):
            solver.add_velocity_source(5, i, inlet_velocity, 0, radius=2)
            solver.add_density_source(5, i, 1.0, radius=2)
        
        # Record every 5th step
        if step % 5 == 0:
            forces = solver.calculate_forces()
            streamlines = solver.get_streamlines(15)
            
            # Sample velocity field for visualization
            velocity_field = []
            sample_rate = 5
            for i in range(0, height, sample_rate):
                for j in range(0, width, sample_rate):
                    if not solver.obstacle[i, j]:
                        velocity_field.append({
                            'x': j,
                            'y': i,
                            'vx': float(solver.u[i, j]),
                            'vy': float(solver.v[i, j]),
                            'magnitude': float(np.sqrt(solver.u[i, j]**2 + solver.v[i, j]**2))
                        })
            
            # Sample density field
            density_field = []
            for i in range(0, height, sample_rate):
                for j in range(0, width, sample_rate):
                    if solver.density[i, j] > 0.01:
                        density_field.append({
                            'x': j,
                            'y': i,
                            'density': float(solver.density[i, j])
                        })
            
            results.append({
                'step': step,
                'time': step * solver.dt,
                'forces': forces,
                'streamlines': streamlines,
                'velocityField': velocity_field,
                'densityField': density_field,
                'pressureRange': {
                    'min': float(solver.p.min()),
                    'max': float(solver.p.max())
                }
            })
    
    return {
        'success': True,
        'config': config,
        'results': results,
        'finalForces': solver.calculate_forces()
    }


def optimize_shape_with_ai(target: str = "low_drag") -> Dict:
    """AI-based shape optimization"""
    
    best_shapes = []
    
    if target == "low_drag":
        # Test various airfoil configurations
        shapes = [
            {'name': 'Circle', 'shape': 'circle', 'params': {'x': 100, 'y': 50, 'radius': 15}},
            {'name': 'Thick Airfoil', 'shape': 'airfoil', 'params': {'x': 80, 'y': 50, 'chord': 40, 'thickness': 0.15}},
            {'name': 'Thin Airfoil', 'shape': 'airfoil', 'params': {'x': 80, 'y': 50, 'chord': 40, 'thickness': 0.08}},
            {'name': 'Streamlined', 'shape': 'airfoil', 'params': {'x': 80, 'y': 50, 'chord': 50, 'thickness': 0.10}},
        ]
        
        for shape_config in shapes:
            config = {
                'width': 200,
                'height': 100,
                'viscosity': 0.0001,
                'inletVelocity': 5.0,
                'steps': 80,
                'obstacles': [shape_config]
            }
            
            result = simulate_flow(config)
            drag_coef = result['finalForces']['drag_coefficient']
            lift_coef = result['finalForces']['lift_coefficient']
            
            best_shapes.append({
                'name': shape_config['name'],
                'shape': shape_config,
                'dragCoefficient': drag_coef,
                'liftCoefficient': lift_coef,
                'score': -abs(drag_coef)  # Lower drag is better
            })
    
    elif target == "high_lift":
        # Optimize for lift
        angles = [0, 5, 10, 15, 20]
        for angle in angles:
            # Would need to implement rotation, simplified here
            shape_config = {
                'name': f'Airfoil {angle}°',
                'shape': 'airfoil',
                'params': {'x': 80, 'y': 50, 'chord': 40, 'thickness': 0.12}
            }
            
            config = {
                'width': 200,
                'height': 100,
                'viscosity': 0.0001,
                'inletVelocity': 5.0,
                'steps': 80,
                'obstacles': [shape_config]
            }
            
            result = simulate_flow(config)
            lift_coef = result['finalForces']['lift_coefficient']
            
            best_shapes.append({
                'name': shape_config['name'],
                'shape': shape_config,
                'liftCoefficient': lift_coef,
                'score': abs(lift_coef)  # Higher lift is better
            })
    
    # Sort by score
    best_shapes.sort(key=lambda x: x['score'], reverse=True)
    
    return {
        'success': True,
        'target': target,
        'bestShapes': best_shapes,
        'recommendation': best_shapes[0] if best_shapes else None
    }


if __name__ == "__main__":
    # Test simulation
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
    
    print("Running aerodynamics simulation...")
    result = simulate_flow(config)
    print(f"Simulation complete: {len(result['results'])} frames")
    print(f"Final drag coefficient: {result['finalForces']['drag_coefficient']:.4f}")
    print(f"Final lift coefficient: {result['finalForces']['lift_coefficient']:.4f}")

