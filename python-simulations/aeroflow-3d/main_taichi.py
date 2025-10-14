"""
AeroFlow XR - 3D Fluid Dynamics Simulation
MVP version with Taichi GPU acceleration
Simplified 64x32x32 grid for performance
"""

import taichi as ti
import numpy as np
import json
from typing import Dict, List, Tuple
import time

# Initialize Taichi with GPU backend (fallback to CPU if needed)
try:
    ti.init(arch=ti.gpu)
    print("✅ Taichi initialized with GPU backend")
except:
    ti.init(arch=ti.cpu)
    print("⚠️  Taichi using CPU backend (slower)")


@ti.data_oriented
class FluidSolver3D:
    """
    3D Navier-Stokes solver using Taichi
    Simplified version for MVP - 64x32x32 grid
    """
    
    def __init__(self, nx: int = 64, ny: int = 32, nz: int = 32):
        self.nx = nx
        self.ny = ny
        self.nz = nz
        
        # Time step
        self.dt = 0.03
        
        # Fluid properties
        self.viscosity = 0.001
        self.density_diffusion = 0.0001
        
        # Velocity field (3 components)
        self.vel = ti.Vector.field(3, dtype=ti.f32, shape=(nx, ny, nz))
        self.vel_prev = ti.Vector.field(3, dtype=ti.f32, shape=(nx, ny, nz))
        
        # Pressure field
        self.pressure = ti.field(dtype=ti.f32, shape=(nx, ny, nz))
        self.divergence = ti.field(dtype=ti.f32, shape=(nx, ny, nz))
        
        # Density field (for visualization)
        self.density = ti.field(dtype=ti.f32, shape=(nx, ny, nz))
        self.density_prev = ti.field(dtype=ti.f32, shape=(nx, ny, nz))
        
        # Obstacle mask (0 = fluid, 1 = solid)
        self.obstacle = ti.field(dtype=ti.i32, shape=(nx, ny, nz))
        
        print(f"📦 Initialized 3D grid: {nx}×{ny}×{nz} = {nx*ny*nz:,} voxels")
    
    @ti.kernel
    def add_sphere_obstacle(self, cx: ti.f32, cy: ti.f32, cz: ti.f32, radius: ti.f32):
        """Add a sphere obstacle to the flow field"""
        for i, j, k in self.obstacle:
            dx = i - cx
            dy = j - cy
            dz = k - cz
            dist = ti.sqrt(dx*dx + dy*dy + dz*dz)
            if dist <= radius:
                self.obstacle[i, j, k] = 1
    
    @ti.kernel
    def add_inlet_velocity(self, vx: ti.f32, vy: ti.f32, vz: ti.f32):
        """Add constant inlet velocity at the left boundary"""
        for j, k in ti.ndrange(self.ny, self.nz):
            # Inlet region (left side, middle area)
            if self.ny//4 <= j < 3*self.ny//4 and self.nz//4 <= k < 3*self.nz//4:
                for i in range(5):  # First 5 columns
                    if self.obstacle[i, j, k] == 0:
                        self.vel[i, j, k] = ti.Vector([vx, vy, vz])
                        self.density[i, j, k] = 1.0
    
    @ti.kernel
    def diffuse(self, iterations: ti.i32):
        """Diffusion step using Jacobi iteration"""
        a = self.dt * self.viscosity
        
        for _ in range(iterations):
            for i, j, k in self.vel:
                if 0 < i < self.nx-1 and 0 < j < self.ny-1 and 0 < k < self.nz-1:
                    if self.obstacle[i, j, k] == 0:
                        # Jacobi iteration for diffusion
                        neighbors = (
                            self.vel_prev[i-1, j, k] + self.vel_prev[i+1, j, k] +
                            self.vel_prev[i, j-1, k] + self.vel_prev[i, j+1, k] +
                            self.vel_prev[i, j, k-1] + self.vel_prev[i, j, k+1]
                        )
                        self.vel[i, j, k] = (self.vel_prev[i, j, k] + a * neighbors) / (1.0 + 6.0 * a)
    
    @ti.kernel
    def advect(self):
        """Advection step using semi-Lagrangian method"""
        dt = self.dt
        
        for i, j, k in self.vel:
            if 0 < i < self.nx-1 and 0 < j < self.ny-1 and 0 < k < self.nz-1:
                if self.obstacle[i, j, k] == 0:
                    # Trace particle backwards
                    vel_curr = self.vel_prev[i, j, k]
                    
                    x = ti.cast(i, ti.f32) - dt * vel_curr[0]
                    y = ti.cast(j, ti.f32) - dt * vel_curr[1]
                    z = ti.cast(k, ti.f32) - dt * vel_curr[2]
                    
                    # Clamp to grid boundaries
                    x = ti.max(0.5, ti.min(self.nx - 1.5, x))
                    y = ti.max(0.5, ti.min(self.ny - 1.5, y))
                    z = ti.max(0.5, ti.min(self.nz - 1.5, z))
                    
                    # Trilinear interpolation
                    i0, j0, k0 = ti.cast(ti.floor(x), ti.i32), ti.cast(ti.floor(y), ti.i32), ti.cast(ti.floor(z), ti.i32)
                    i1, j1, k1 = i0 + 1, j0 + 1, k0 + 1
                    
                    sx, sy, sz = x - i0, y - j0, z - k0
                    tx, ty, tz = 1.0 - sx, 1.0 - sy, 1.0 - sz
                    
                    # Interpolate velocity
                    self.vel[i, j, k] = (
                        tx * ty * tz * self.vel_prev[i0, j0, k0] +
                        sx * ty * tz * self.vel_prev[i1, j0, k0] +
                        tx * sy * tz * self.vel_prev[i0, j1, k0] +
                        sx * sy * tz * self.vel_prev[i1, j1, k0] +
                        tx * ty * sz * self.vel_prev[i0, j0, k1] +
                        sx * ty * sz * self.vel_prev[i1, j0, k1] +
                        tx * sy * sz * self.vel_prev[i0, j1, k1] +
                        sx * sy * sz * self.vel_prev[i1, j1, k1]
                    )
    
    @ti.kernel
    def compute_divergence(self):
        """Calculate divergence of velocity field"""
        for i, j, k in self.divergence:
            if 0 < i < self.nx-1 and 0 < j < self.ny-1 and 0 < k < self.nz-1:
                if self.obstacle[i, j, k] == 0:
                    div = (
                        self.vel[i+1, j, k][0] - self.vel[i-1, j, k][0] +
                        self.vel[i, j+1, k][1] - self.vel[i, j-1, k][1] +
                        self.vel[i, j, k+1][2] - self.vel[i, j, k-1][2]
                    )
                    self.divergence[i, j, k] = -0.5 * div
    
    @ti.kernel
    def pressure_solve(self, iterations: ti.i32):
        """Solve pressure using Jacobi iteration"""
        for _ in range(iterations):
            for i, j, k in self.pressure:
                if 0 < i < self.nx-1 and 0 < j < self.ny-1 and 0 < k < self.nz-1:
                    if self.obstacle[i, j, k] == 0:
                        neighbors = (
                            self.pressure[i-1, j, k] + self.pressure[i+1, j, k] +
                            self.pressure[i, j-1, k] + self.pressure[i, j+1, k] +
                            self.pressure[i, j, k-1] + self.pressure[i, j, k+1]
                        )
                        self.pressure[i, j, k] = (self.divergence[i, j, k] + neighbors) / 6.0
    
    @ti.kernel
    def subtract_pressure_gradient(self):
        """Subtract pressure gradient to make velocity field divergence-free"""
        for i, j, k in self.vel:
            if 0 < i < self.nx-1 and 0 < j < self.ny-1 and 0 < k < self.nz-1:
                if self.obstacle[i, j, k] == 0:
                    grad_p = ti.Vector([
                        self.pressure[i+1, j, k] - self.pressure[i-1, j, k],
                        self.pressure[i, j+1, k] - self.pressure[i, j-1, k],
                        self.pressure[i, j, k+1] - self.pressure[i, j, k-1]
                    ])
                    self.vel[i, j, k] -= 0.5 * grad_p
    
    @ti.kernel
    def apply_boundary_conditions(self):
        """Apply no-slip boundary conditions"""
        # Walls
        for j, k in ti.ndrange(self.ny, self.nz):
            self.vel[0, j, k] = ti.Vector([0.0, 0.0, 0.0])
            self.vel[self.nx-1, j, k] = self.vel[self.nx-2, j, k]  # Outflow
        
        for i, k in ti.ndrange(self.nx, self.nz):
            self.vel[i, 0, k] = ti.Vector([0.0, 0.0, 0.0])
            self.vel[i, self.ny-1, k] = ti.Vector([0.0, 0.0, 0.0])
        
        for i, j in ti.ndrange(self.nx, self.ny):
            self.vel[i, j, 0] = ti.Vector([0.0, 0.0, 0.0])
            self.vel[i, j, self.nz-1] = ti.Vector([0.0, 0.0, 0.0])
        
        # Obstacles
        for i, j, k in self.vel:
            if self.obstacle[i, j, k] == 1:
                self.vel[i, j, k] = ti.Vector([0.0, 0.0, 0.0])
    
    @ti.kernel
    def advect_density(self):
        """Advect density field for visualization"""
        dt = self.dt
        
        for i, j, k in self.density:
            if 0 < i < self.nx-1 and 0 < j < self.ny-1 and 0 < k < self.nz-1:
                if self.obstacle[i, j, k] == 0:
                    # Trace backwards
                    vel_curr = self.vel[i, j, k]
                    
                    x = ti.cast(i, ti.f32) - dt * vel_curr[0]
                    y = ti.cast(j, ti.f32) - dt * vel_curr[1]
                    z = ti.cast(k, ti.f32) - dt * vel_curr[2]
                    
                    x = ti.max(0.5, ti.min(self.nx - 1.5, x))
                    y = ti.max(0.5, ti.min(self.ny - 1.5, y))
                    z = ti.max(0.5, ti.min(self.nz - 1.5, z))
                    
                    i0, j0, k0 = ti.cast(ti.floor(x), ti.i32), ti.cast(ti.floor(y), ti.i32), ti.cast(ti.floor(z), ti.i32)
                    i1, j1, k1 = i0 + 1, j0 + 1, k0 + 1
                    
                    sx, sy, sz = x - i0, y - j0, z - k0
                    tx, ty, tz = 1.0 - sx, 1.0 - sy, 1.0 - sz
                    
                    # Trilinear interpolation
                    self.density[i, j, k] = (
                        tx * ty * tz * self.density_prev[i0, j0, k0] +
                        sx * ty * tz * self.density_prev[i1, j0, k0] +
                        tx * sy * tz * self.density_prev[i0, j1, k0] +
                        sx * sy * tz * self.density_prev[i1, j1, k0] +
                        tx * ty * sz * self.density_prev[i0, j0, k1] +
                        sx * ty * sz * self.density_prev[i1, j0, k1] +
                        tx * sy * sz * self.density_prev[i0, j1, k1] +
                        sx * sy * sz * self.density_prev[i1, j1, k1]
                    ) * 0.995  # Decay
    
    def swap_buffers(self):
        """Swap current and previous buffers"""
        self.vel, self.vel_prev = self.vel_prev, self.vel
        self.density, self.density_prev = self.density_prev, self.density
    
    def step(self):
        """Perform one simulation step"""
        # Add inlet velocity continuously
        self.add_inlet_velocity(5.0, 0.0, 0.0)
        
        # Velocity step
        self.swap_buffers()
        self.diffuse(iterations=10)
        
        self.swap_buffers()
        self.advect()
        
        # Projection step (make incompressible)
        self.compute_divergence()
        self.pressure_solve(iterations=20)
        self.subtract_pressure_gradient()
        
        # Boundary conditions
        self.apply_boundary_conditions()
        
        # Density advection
        self.swap_buffers()
        self.advect_density()
    
    def get_particles(self, num_particles: int = 1000) -> List[Dict]:
        """
        Sample particles from velocity field for visualization
        Returns positions and velocities
        """
        particles = []
        vel_np = self.vel.to_numpy()
        density_np = self.density.to_numpy()
        
        # Sample particles where density > threshold
        threshold = 0.1
        indices = np.argwhere(density_np > threshold)
        
        if len(indices) > num_particles:
            # Randomly sample
            idx = np.random.choice(len(indices), num_particles, replace=False)
            indices = indices[idx]
        
        for i, j, k in indices:
            vel = vel_np[i, j, k]
            particles.append({
                'position': [float(i), float(j), float(k)],
                'velocity': [float(vel[0]), float(vel[1]), float(vel[2])],
                'density': float(density_np[i, j, k])
            })
        
        return particles
    
    def calculate_forces(self) -> Dict[str, float]:
        """Calculate drag and lift forces on obstacles"""
        pressure_np = self.pressure.to_numpy()
        vel_np = self.vel.to_numpy()
        obstacle_np = self.obstacle.to_numpy()
        
        drag = 0.0
        lift = 0.0
        side_force = 0.0
        
        # Simple force calculation
        for i in range(1, self.nx-1):
            for j in range(1, self.ny-1):
                for k in range(1, self.nz-1):
                    if obstacle_np[i, j, k] == 1:
                        # Check neighbors
                        if obstacle_np[i-1, j, k] == 0:  # Left (upstream)
                            drag += pressure_np[i-1, j, k]
                        if obstacle_np[i+1, j, k] == 0:  # Right (downstream)
                            drag -= pressure_np[i+1, j, k]
                        
                        if obstacle_np[i, j-1, k] == 0:  # Bottom
                            lift += pressure_np[i, j-1, k]
                        if obstacle_np[i, j+1, k] == 0:  # Top
                            lift -= pressure_np[i, j+1, k]
                        
                        if obstacle_np[i, j, k-1] == 0:  # Front
                            side_force += pressure_np[i, j, k-1]
                        if obstacle_np[i, j, k+1] == 0:  # Back
                            side_force -= pressure_np[i, j, k+1]
        
        return {
            'drag': float(drag),
            'lift': float(lift),
            'side_force': float(side_force),
            'drag_coefficient': float(drag / 100.0),
            'lift_coefficient': float(lift / 100.0)
        }


def simulate_3d_flow(config: Dict) -> Dict:
    """
    Main simulation function
    
    Args:
        config: Simulation configuration
            - grid_size: [nx, ny, nz]
            - steps: number of simulation steps
            - obstacle: obstacle configuration
            - inlet_velocity: [vx, vy, vz]
    
    Returns:
        Simulation results with particles and forces
    """
    
    # Parse config
    grid = config.get('grid_size', [64, 32, 32])
    steps = config.get('steps', 50)
    inlet_vel = config.get('inlet_velocity', [5.0, 0.0, 0.0])
    obstacle_config = config.get('obstacle', {})
    
    print(f"\n🚀 Starting 3D simulation...")
    print(f"   Grid: {grid[0]}×{grid[1]}×{grid[2]}")
    print(f"   Steps: {steps}")
    print(f"   Inlet velocity: {inlet_vel}")
    
    # Create solver
    solver = FluidSolver3D(grid[0], grid[1], grid[2])
    
    # Add obstacle
    if obstacle_config.get('type') == 'sphere':
        pos = obstacle_config.get('position', [grid[0]//2, grid[1]//2, grid[2]//2])
        radius = obstacle_config.get('radius', 5.0)
        solver.add_sphere_obstacle(pos[0], pos[1], pos[2], radius)
        print(f"   Obstacle: Sphere at {pos} with radius {radius}")
    
    # Run simulation
    results = []
    start_time = time.time()
    
    for step in range(steps):
        solver.step()
        
        # Record every 5th step
        if step % 5 == 0:
            particles = solver.get_particles(num_particles=800)
            forces = solver.calculate_forces()
            
            results.append({
                'step': step,
                'time': step * solver.dt,
                'particles': particles,
                'forces': forces,
                'particle_count': len(particles)
            })
            
            # Progress
            if step % 10 == 0:
                elapsed = time.time() - start_time
                fps = (step + 1) / elapsed if elapsed > 0 else 0
                print(f"   Step {step}/{steps} | Particles: {len(particles)} | FPS: {fps:.1f}")
    
    elapsed_total = time.time() - start_time
    print(f"\n✅ Simulation complete in {elapsed_total:.2f}s")
    print(f"   Average FPS: {steps/elapsed_total:.1f}")
    print(f"   Total frames: {len(results)}")
    
    return {
        'success': True,
        'config': config,
        'grid_size': grid,
        'results': results,
        'final_forces': solver.calculate_forces(),
        'stats': {
            'total_time': elapsed_total,
            'avg_fps': steps / elapsed_total,
            'frames': len(results)
        }
    }


if __name__ == "__main__":
    # Test simulation
    config = {
        'grid_size': [64, 32, 32],
        'steps': 50,
        'inlet_velocity': [5.0, 0.0, 0.0],
        'obstacle': {
            'type': 'sphere',
            'position': [30, 16, 16],
            'radius': 6.0
        }
    }
    
    result = simulate_3d_flow(config)
    
    print("\n📊 Final Results:")
    print(f"   Drag coefficient: {result['final_forces']['drag_coefficient']:.4f}")
    print(f"   Lift coefficient: {result['final_forces']['lift_coefficient']:.4f}")
    print(f"   Total particles: {sum(r['particle_count'] for r in result['results'])}")
    
    # Save to JSON for testing
    output_path = "output/test_3d.json"
    import os
    os.makedirs("output", exist_ok=True)
    
    with open(output_path, 'w') as f:
        json.dump(result, f, indent=2)
    
    print(f"\n💾 Results saved to {output_path}")

