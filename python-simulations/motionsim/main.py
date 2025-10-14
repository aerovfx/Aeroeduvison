"""
MotionSim - Physics Motion Simulation
Mô phỏng các loại chuyển động: rơi tự do, ném xiên, dao động điều hòa
"""

import numpy as np
import json
from typing import Dict, List, Tuple


class FreeFall:
    """Rơi tự do - Free fall motion"""
    
    def __init__(self, h0: float, v0: float = 0, g: float = 9.8):
        self.h0 = h0  # Độ cao ban đầu
        self.v0 = v0  # Vận tốc ban đầu
        self.g = g    # Gia tốc trọng trường
    
    def calculate(self, t: float) -> Dict:
        """Calculate position, velocity, acceleration at time t"""
        h = self.h0 + self.v0 * t - 0.5 * self.g * t**2
        v = self.v0 - self.g * t
        a = -self.g
        
        return {
            'time': float(t),
            'height': float(max(0, h)),
            'velocity': float(v),
            'acceleration': float(a),
            'kinetic_energy': float(0.5 * v**2) if h > 0 else 0,
            'potential_energy': float(self.g * max(0, h))
        }
    
    def simulate(self, duration: float, dt: float = 0.01) -> List[Dict]:
        """Simulate motion over duration"""
        trajectory = []
        t = 0
        
        while t <= duration:
            state = self.calculate(t)
            trajectory.append(state)
            
            # Stop if hit ground
            if state['height'] <= 0 and t > 0:
                break
            
            t += dt
        
        return trajectory


class Projectile:
    """Chuyển động ném xiên - Projectile motion"""
    
    def __init__(self, v0: float, angle: float, h0: float = 0, g: float = 9.8):
        self.v0 = v0              # Vận tốc ban đầu
        self.angle = np.radians(angle)  # Góc ném (chuyển sang radian)
        self.h0 = h0              # Độ cao ban đầu
        self.g = g                # Gia tốc trọng trường
        
        # Thành phần vận tốc
        self.v0x = v0 * np.cos(self.angle)
        self.v0y = v0 * np.sin(self.angle)
    
    def calculate(self, t: float) -> Dict:
        """Calculate position and velocity at time t"""
        x = self.v0x * t
        y = self.h0 + self.v0y * t - 0.5 * self.g * t**2
        
        vx = self.v0x
        vy = self.v0y - self.g * t
        v = np.sqrt(vx**2 + vy**2)
        
        return {
            'time': float(t),
            'x': float(x),
            'y': float(max(0, y)),
            'vx': float(vx),
            'vy': float(vy),
            'velocity': float(v),
            'angle': float(np.degrees(np.arctan2(vy, vx)))
        }
    
    def get_max_height(self) -> float:
        """Tính độ cao tối đa"""
        return self.h0 + (self.v0y**2) / (2 * self.g)
    
    def get_range(self) -> float:
        """Tính tầm xa"""
        # Giải phương trình y = 0
        t_land = (self.v0y + np.sqrt(self.v0y**2 + 2 * self.g * self.h0)) / self.g
        return self.v0x * t_land
    
    def get_flight_time(self) -> float:
        """Tính thời gian bay"""
        return (self.v0y + np.sqrt(self.v0y**2 + 2 * self.g * self.h0)) / self.g
    
    def simulate(self, dt: float = 0.01) -> List[Dict]:
        """Simulate projectile motion"""
        trajectory = []
        t = 0
        flight_time = self.get_flight_time()
        
        while t <= flight_time + dt:
            state = self.calculate(t)
            trajectory.append(state)
            
            if state['y'] <= 0 and t > 0:
                break
            
            t += dt
        
        return trajectory


class HarmonicOscillator:
    """Dao động điều hòa - Simple Harmonic Motion"""
    
    def __init__(self, amplitude: float, frequency: float, phase: float = 0):
        self.A = amplitude        # Biên độ
        self.f = frequency        # Tần số (Hz)
        self.omega = 2 * np.pi * frequency  # Tần số góc
        self.phi = np.radians(phase)  # Pha ban đầu
    
    def calculate(self, t: float) -> Dict:
        """Calculate position, velocity, acceleration at time t"""
        x = self.A * np.cos(self.omega * t + self.phi)
        v = -self.A * self.omega * np.sin(self.omega * t + self.phi)
        a = -self.A * self.omega**2 * np.cos(self.omega * t + self.phi)
        
        # Năng lượng
        E_total = 0.5 * self.omega**2 * self.A**2  # Tổng năng lượng (đơn vị tương đối)
        E_kinetic = 0.5 * v**2
        E_potential = 0.5 * self.omega**2 * x**2
        
        return {
            'time': float(t),
            'position': float(x),
            'velocity': float(v),
            'acceleration': float(a),
            'kinetic_energy': float(E_kinetic),
            'potential_energy': float(E_potential),
            'total_energy': float(E_total)
        }
    
    def simulate(self, duration: float, dt: float = 0.01) -> List[Dict]:
        """Simulate harmonic motion"""
        trajectory = []
        t = 0
        
        while t <= duration:
            state = self.calculate(t)
            trajectory.append(state)
            t += dt
        
        return trajectory


def simulate_motion(config: Dict) -> Dict:
    """Main simulation function"""
    
    motion_type = config.get('motion_type', 'projectile')
    
    if motion_type == 'free_fall':
        sim = FreeFall(
            h0=config.get('h0', 100),
            v0=config.get('v0', 0),
            g=config.get('g', 9.8)
        )
        trajectory = sim.simulate(duration=config.get('duration', 10))
        
        return {
            'success': True,
            'motion_type': 'free_fall',
            'config': config,
            'trajectory': trajectory,
            'analytics': {
                'initial_height': config.get('h0', 100),
                'impact_time': trajectory[-1]['time'] if trajectory else 0,
                'impact_velocity': abs(trajectory[-1]['velocity']) if trajectory else 0
            }
        }
    
    elif motion_type == 'projectile':
        sim = Projectile(
            v0=config.get('v0', 20),
            angle=config.get('angle', 45),
            h0=config.get('h0', 0),
            g=config.get('g', 9.8)
        )
        trajectory = sim.simulate()
        
        return {
            'success': True,
            'motion_type': 'projectile',
            'config': config,
            'trajectory': trajectory,
            'analytics': {
                'max_height': float(sim.get_max_height()),
                'range': float(sim.get_range()),
                'flight_time': float(sim.get_flight_time()),
                'initial_velocity': config.get('v0', 20),
                'launch_angle': config.get('angle', 45)
            }
        }
    
    elif motion_type == 'harmonic':
        sim = HarmonicOscillator(
            amplitude=config.get('amplitude', 1.0),
            frequency=config.get('frequency', 1.0),
            phase=config.get('phase', 0)
        )
        trajectory = sim.simulate(
            duration=config.get('duration', 5)
        )
        
        return {
            'success': True,
            'motion_type': 'harmonic',
            'config': config,
            'trajectory': trajectory,
            'analytics': {
                'amplitude': config.get('amplitude', 1.0),
                'frequency': config.get('frequency', 1.0),
                'period': 1 / config.get('frequency', 1.0),
                'angular_frequency': 2 * np.pi * config.get('frequency', 1.0)
            }
        }
    
    else:
        raise ValueError(f"Unknown motion type: {motion_type}")


def predict_motion(initial_conditions: Dict, target_conditions: Dict) -> Dict:
    """AI prediction: Given initial and target, find parameters"""
    
    motion_type = initial_conditions.get('motion_type', 'projectile')
    
    if motion_type == 'projectile':
        # Find angle and velocity to hit target
        target_x = target_conditions.get('x', 10)
        target_y = target_conditions.get('y', 0)
        h0 = initial_conditions.get('h0', 0)
        g = initial_conditions.get('g', 9.8)
        
        # Try different angles
        best_solutions = []
        
        for angle in range(15, 76, 5):  # 15° to 75°
            angle_rad = np.radians(angle)
            
            # Calculate required initial velocity
            # Using projectile equations
            numerator = g * target_x**2
            denominator = 2 * (target_x * np.tan(angle_rad) - (target_y - h0)) * np.cos(angle_rad)**2
            
            if denominator > 0:
                v0_squared = numerator / denominator
                if v0_squared > 0:
                    v0 = np.sqrt(v0_squared)
                    
                    # Simulate to verify
                    sim = Projectile(v0, angle, h0, g)
                    final_state = sim.calculate(sim.get_flight_time())
                    
                    error = np.sqrt((final_state['x'] - target_x)**2 + (final_state['y'] - target_y)**2)
                    
                    if error < 1.0:  # Within 1m
                        best_solutions.append({
                            'angle': angle,
                            'v0': float(v0),
                            'error': float(error),
                            'max_height': float(sim.get_max_height()),
                            'flight_time': float(sim.get_flight_time())
                        })
        
        best_solutions.sort(key=lambda x: x['error'])
        
        return {
            'success': True,
            'target': target_conditions,
            'solutions': best_solutions,
            'recommendation': best_solutions[0] if best_solutions else None
        }
    
    return {'success': False, 'message': 'Motion type not supported for prediction'}


if __name__ == "__main__":
    # Test projectile
    config = {
        'motion_type': 'projectile',
        'v0': 20,
        'angle': 45,
        'h0': 0,
        'g': 9.8
    }
    
    print("🚀 Simulating projectile motion...")
    result = simulate_motion(config)
    
    print(f"\n✅ Simulation complete!")
    print(f"   Max height: {result['analytics']['max_height']:.2f} m")
    print(f"   Range: {result['analytics']['range']:.2f} m")
    print(f"   Flight time: {result['analytics']['flight_time']:.2f} s")
    print(f"   Trajectory points: {len(result['trajectory'])}")

