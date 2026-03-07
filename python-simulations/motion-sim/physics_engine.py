"""
Physics Engine for Motion Simulation
Implements: Free Fall, Projectile Motion, Harmonic Oscillation
Author: AI Assistant
Date: 2024-10-12
"""

import numpy as np
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
import json

# Physical constants
G = 9.81  # m/s² (gravity)
PI = np.pi

@dataclass
class SimulationConfig:
    """Configuration for physics simulation"""
    dt: float = 0.01  # Time step (seconds)
    duration: float = 10.0  # Total simulation time (seconds)
    g: float = G  # Gravity

class PhysicsEngine:
    """Complete physics engine for motion simulations"""
    
    def __init__(self, config: SimulationConfig = None):
        self.config = config or SimulationConfig()
        print("🔧 Physics Engine initialized")
    
    # ==========================================
    # 1. RƠI TỰ DO (FREE FALL)
    # ==========================================
    
    def simulate_free_fall(
        self,
        h0: float,  # Initial height (m)
        v0: float = 0.0,  # Initial velocity (m/s), default 0
        mass: float = 1.0  # Mass (kg)
    ) -> Dict:
        """
        Simulate free fall motion
        
        Equations:
        - v(t) = v0 + g*t
        - h(t) = h0 + v0*t + 0.5*g*t²
        - a(t) = -g (constant)
        """
        
        times = []
        heights = []
        velocities = []
        accelerations = []
        energies = {'potential': [], 'kinetic': [], 'total': []}
        
        t = 0.0
        h = h0
        v = v0
        a = -self.config.g
        
        while h > 0 and t < self.config.duration:
            # Record state
            times.append(t)
            heights.append(h)
            velocities.append(v)
            accelerations.append(a)
            
            # Energy calculations
            PE = mass * self.config.g * h  # Potential energy
            KE = 0.5 * mass * v**2  # Kinetic energy
            TE = PE + KE  # Total energy (conserved)
            
            energies['potential'].append(PE)
            energies['kinetic'].append(KE)
            energies['total'].append(TE)
            
            # Update using Euler method
            v = v + a * self.config.dt
            h = h + v * self.config.dt
            t = t + self.config.dt
        
        # Calculate landing info
        if h <= 0:
            impact_velocity = velocities[-1] if velocities else 0
            impact_time = times[-1] if times else 0
        else:
            impact_velocity = None
            impact_time = None
        
        return {
            'type': 'free_fall',
            'parameters': {'h0': h0, 'v0': v0, 'mass': mass, 'g': self.config.g},
            'trajectory': {
                'time': times,
                'position': heights,
                'velocity': velocities,
                'acceleration': accelerations
            },
            'energy': energies,
            'results': {
                'max_height': h0 if v0 <= 0 else h0 + v0**2 / (2 * self.config.g),
                'impact_velocity': impact_velocity,
                'impact_time': impact_time,
                'total_points': len(times)
            }
        }
    
    # ==========================================
    # 2. NÉM XIÊN (PROJECTILE MOTION)
    # ==========================================
    
    def simulate_projectile(
        self,
        v0: float,  # Initial velocity (m/s)
        angle: float,  # Launch angle (degrees)
        h0: float = 0.0,  # Initial height (m)
        mass: float = 1.0,  # Mass (kg)
        air_resistance: bool = False,
        drag_coefficient: float = 0.1
    ) -> Dict:
        """
        Simulate projectile motion (parabolic trajectory)
        
        Equations (no air resistance):
        - x(t) = v0*cos(θ)*t
        - y(t) = h0 + v0*sin(θ)*t - 0.5*g*t²
        - vx(t) = v0*cos(θ) (constant)
        - vy(t) = v0*sin(θ) - g*t
        """
        
        # Convert angle to radians
        theta = np.radians(angle)
        
        # Initial velocity components
        vx0 = v0 * np.cos(theta)
        vy0 = v0 * np.sin(theta)
        
        times = []
        x_positions = []
        y_positions = []
        vx_velocities = []
        vy_velocities = []
        speeds = []
        
        t = 0.0
        x = 0.0
        y = h0
        vx = vx0
        vy = vy0
        
        max_height = h0
        
        while y >= 0 and t < self.config.duration:
            # Record state
            times.append(t)
            x_positions.append(x)
            y_positions.append(y)
            vx_velocities.append(vx)
            vy_velocities.append(vy)
            speeds.append(np.sqrt(vx**2 + vy**2))
            
            # Track max height
            if y > max_height:
                max_height = y
            
            # Calculate accelerations
            if air_resistance:
                # Air drag: F_drag = -0.5 * ρ * Cd * A * v²
                v_total = np.sqrt(vx**2 + vy**2)
                drag_force = drag_coefficient * v_total**2
                
                ax = -drag_force * vx / v_total / mass if v_total > 0 else 0
                ay = -self.config.g - drag_force * vy / v_total / mass if v_total > 0 else -self.config.g
            else:
                ax = 0
                ay = -self.config.g
            
            # Update using Euler method
            vx = vx + ax * self.config.dt
            vy = vy + ay * self.config.dt
            x = x + vx * self.config.dt
            y = y + vy * self.config.dt
            t = t + self.config.dt
        
        # Theoretical calculations (no air resistance)
        t_flight_theory = (vy0 + np.sqrt(vy0**2 + 2 * self.config.g * h0)) / self.config.g
        range_theory = vx0 * t_flight_theory
        max_height_theory = h0 + vy0**2 / (2 * self.config.g)
        
        return {
            'type': 'projectile',
            'parameters': {
                'v0': v0, 'angle': angle, 'h0': h0, 
                'mass': mass, 'air_resistance': air_resistance
            },
            'trajectory': {
                'time': times,
                'x': x_positions,
                'y': y_positions,
                'vx': vx_velocities,
                'vy': vy_velocities,
                'speed': speeds
            },
            'results': {
                'range': x_positions[-1] if x_positions else 0,
                'max_height': max_height,
                'flight_time': times[-1] if times else 0,
                'impact_velocity': speeds[-1] if speeds else 0,
                'impact_angle': np.degrees(np.arctan2(vy_velocities[-1], vx_velocities[-1])) if vx_velocities and vy_velocities else 0,
                'total_points': len(times)
            },
            'theoretical': {
                'range': range_theory,
                'max_height': max_height_theory,
                'flight_time': t_flight_theory
            }
        }
    
    # ==========================================
    # 3. DAO ĐỘNG ĐIỀU HÒA (HARMONIC OSCILLATION)
    # ==========================================
    
    def simulate_harmonic_motion(
        self,
        amplitude: float,  # A (meters)
        frequency: float = 1.0,  # f (Hz)
        phase: float = 0.0,  # φ (radians)
        damping: float = 0.0,  # γ (damping coefficient)
        mass: float = 1.0  # Mass (kg)
    ) -> Dict:
        """
        Simulate harmonic oscillation
        
        Equations:
        - Simple: x(t) = A*cos(ωt + φ)
        - Damped: x(t) = A*e^(-γt)*cos(ωt + φ)
        - v(t) = dx/dt
        - a(t) = dv/dt = -ω²*x (simple)
        
        where ω = 2πf (angular frequency)
        """
        
        omega = 2 * PI * frequency  # Angular frequency
        
        times = []
        positions = []
        velocities = []
        accelerations = []
        energies = {'potential': [], 'kinetic': [], 'total': []}
        
        t = 0.0
        
        # Spring constant (for energy calculations)
        k = mass * omega**2
        
        while t < self.config.duration:
            # Calculate position, velocity, acceleration
            if damping > 0:
                # Damped oscillation
                decay = np.exp(-damping * t)
                x = amplitude * decay * np.cos(omega * t + phase)
                v = -amplitude * decay * (damping * np.cos(omega * t + phase) + 
                                          omega * np.sin(omega * t + phase))
                a = -amplitude * decay * ((damping**2 - omega**2) * np.cos(omega * t + phase) + 
                                          2 * damping * omega * np.sin(omega * t + phase))
            else:
                # Simple harmonic motion
                x = amplitude * np.cos(omega * t + phase)
                v = -amplitude * omega * np.sin(omega * t + phase)
                a = -amplitude * omega**2 * np.cos(omega * t + phase)
            
            # Record state
            times.append(t)
            positions.append(x)
            velocities.append(v)
            accelerations.append(a)
            
            # Energy calculations
            PE = 0.5 * k * x**2  # Elastic potential energy
            KE = 0.5 * mass * v**2  # Kinetic energy
            
            # For damped motion, total energy decreases
            if damping > 0:
                TE = (PE + KE) * np.exp(-2 * damping * t)
            else:
                TE = PE + KE
            
            energies['potential'].append(PE)
            energies['kinetic'].append(KE)
            energies['total'].append(TE)
            
            t = t + self.config.dt
        
        # Calculate period
        period = 1.0 / frequency if frequency > 0 else 0
        
        return {
            'type': 'harmonic',
            'parameters': {
                'amplitude': amplitude,
                'frequency': frequency,
                'period': period,
                'omega': omega,
                'phase': phase,
                'damping': damping,
                'mass': mass
            },
            'trajectory': {
                'time': times,
                'position': positions,
                'velocity': velocities,
                'acceleration': accelerations
            },
            'energy': energies,
            'results': {
                'period': period,
                'max_displacement': amplitude,
                'max_velocity': amplitude * omega,
                'max_acceleration': amplitude * omega**2,
                'total_points': len(times)
            }
        }
    
    # ==========================================
    # ANALYSIS FUNCTIONS
    # ==========================================
    
    def analyze_motion(self, simulation_data: Dict) -> Dict:
        """Analyze motion characteristics"""
        
        trajectory = simulation_data['trajectory']
        motion_type = simulation_data['type']
        
        analysis = {
            'type': motion_type,
            'statistics': {},
            'characteristics': {}
        }
        
        if motion_type == 'free_fall':
            positions = trajectory['position']
            velocities = trajectory['velocity']
            
            analysis['statistics'] = {
                'max_height': max(positions),
                'min_height': min(positions),
                'max_speed': max(abs(v) for v in velocities),
                'avg_speed': np.mean([abs(v) for v in velocities])
            }
            
        elif motion_type == 'projectile':
            x_pos = trajectory['x']
            y_pos = trajectory['y']
            speeds = trajectory['speed']
            
            analysis['statistics'] = {
                'max_range': max(x_pos),
                'max_height': max(y_pos),
                'max_speed': max(speeds),
                'landing_distance': x_pos[-1] if x_pos else 0
            }
            
            # Find apex (highest point)
            apex_idx = np.argmax(y_pos)
            analysis['characteristics']['apex'] = {
                'time': trajectory['time'][apex_idx],
                'height': y_pos[apex_idx],
                'horizontal_distance': x_pos[apex_idx]
            }
            
        elif motion_type == 'harmonic':
            positions = trajectory['position']
            velocities = trajectory['velocity']
            
            # Find zero crossings (period)
            zero_crossings = []
            for i in range(1, len(positions)):
                if positions[i-1] * positions[i] < 0:
                    zero_crossings.append(trajectory['time'][i])
            
            measured_period = (zero_crossings[-1] - zero_crossings[0]) / (len(zero_crossings) - 1) * 2 if len(zero_crossings) > 1 else 0
            
            analysis['statistics'] = {
                'amplitude_measured': max(abs(p) for p in positions),
                'max_velocity': max(abs(v) for v in velocities),
                'period_measured': measured_period,
                'zero_crossings': len(zero_crossings)
            }
        
        return analysis


# ==========================================
# AI PREDICTION MODEL
# ==========================================

class MotionPredictor:
    """
    AI Model to predict motion parameters
    Uses polynomial fitting and pattern recognition
    """
    
    def __init__(self):
        print("🤖 Motion Predictor initialized")
    
    def predict_landing_point(self, v0: float, angle: float, h0: float = 0.0) -> Dict:
        """
        Predict where projectile will land
        Using kinematic equations
        """
        
        theta = np.radians(angle)
        vx0 = v0 * np.cos(theta)
        vy0 = v0 * np.sin(theta)
        
        # Calculate flight time
        # Solve: h0 + vy0*t - 0.5*g*t² = 0
        discriminant = vy0**2 + 2 * G * h0
        if discriminant < 0:
            return {'error': 'Invalid parameters'}
        
        t_flight = (vy0 + np.sqrt(discriminant)) / G
        
        # Landing point
        x_landing = vx0 * t_flight
        
        # Max height
        t_max_height = vy0 / G
        y_max = h0 + vy0 * t_max_height - 0.5 * G * t_max_height**2
        
        # Impact velocity
        v_impact = np.sqrt(vx0**2 + (vy0 - G * t_flight)**2)
        
        return {
            'landing_distance': x_landing,
            'flight_time': t_flight,
            'max_height': y_max,
            'impact_velocity': v_impact,
            'confidence': 0.99  # Analytical solution = high confidence
        }
    
    def optimize_projectile_range(self, v0: float, h0: float = 0.0) -> Dict:
        """
        Find optimal angle for maximum range
        Theoretical: 45° for h0=0, < 45° for h0>0
        """
        
        angles = np.linspace(1, 89, 89)
        ranges = []
        
        for angle in angles:
            pred = self.predict_landing_point(v0, angle, h0)
            if 'landing_distance' in pred:
                ranges.append(pred['landing_distance'])
            else:
                ranges.append(0)
        
        optimal_idx = np.argmax(ranges)
        optimal_angle = angles[optimal_idx]
        max_range = ranges[optimal_idx]
        
        return {
            'optimal_angle': optimal_angle,
            'max_range': max_range,
            'all_angles': angles.tolist(),
            'all_ranges': ranges
        }
    
    def fit_motion_model(self, observed_positions: List[float], observed_times: List[float]) -> Dict:
        """
        Fit motion model to observed data
        Determine if motion is:
        - Linear (constant velocity)
        - Quadratic (constant acceleration)
        - Harmonic (oscillation)
        """
        
        # Try polynomial fits
        linear_fit = np.polyfit(observed_times, observed_positions, 1)
        quadratic_fit = np.polyfit(observed_times, observed_positions, 2)
        
        # Calculate R² for each fit
        linear_pred = np.polyval(linear_fit, observed_times)
        quadratic_pred = np.polyval(quadratic_fit, observed_times)
        
        linear_r2 = 1 - np.sum((np.array(observed_positions) - linear_pred)**2) / np.var(observed_positions) / len(observed_positions)
        quadratic_r2 = 1 - np.sum((np.array(observed_positions) - quadratic_pred)**2) / np.var(observed_positions) / len(observed_positions)
        
        # Determine motion type
        if quadratic_r2 > 0.95 and abs(quadratic_fit[0]) > 0.1:
            motion_type = 'accelerated'
            acceleration = 2 * quadratic_fit[0]
        elif linear_r2 > 0.95:
            motion_type = 'uniform'
            velocity = linear_fit[0]
            acceleration = 0
        else:
            motion_type = 'complex'
            acceleration = None
            velocity = None
        
        return {
            'motion_type': motion_type,
            'linear_fit': {
                'coefficients': linear_fit.tolist(),
                'r_squared': linear_r2
            },
            'quadratic_fit': {
                'coefficients': quadratic_fit.tolist(),
                'r_squared': quadratic_r2,
                'acceleration': 2 * quadratic_fit[0] if motion_type == 'accelerated' else None
            },
            'parameters': {
                'velocity': linear_fit[0] if motion_type == 'uniform' else None,
                'acceleration': acceleration
            }
        }


# ==========================================
# HELPER FUNCTIONS
# ==========================================

def export_to_json(simulation_result: Dict, filename: str):
    """Export simulation results to JSON file"""
    with open(filename, 'w') as f:
        json.dump(simulation_result, f, indent=2)
    print(f"✅ Results exported to {filename}")


def compare_simulations(results: List[Dict]) -> Dict:
    """Compare multiple simulation runs"""
    
    comparison = {
        'num_simulations': len(results),
        'types': [r['type'] for r in results],
        'summary': []
    }
    
    for result in results:
        summary = {
            'type': result['type'],
            'parameters': result['parameters'],
            'key_results': result['results']
        }
        comparison['summary'].append(summary)
    
    return comparison


# ==========================================
# EXAMPLE USAGE
# ==========================================

if __name__ == "__main__":
    print("="*70)
    print("🎯 PHYSICS ENGINE - MOTION SIMULATION")
    print("="*70)
    print()
    
    engine = PhysicsEngine()
    predictor = MotionPredictor()
    
    # Example 1: Free Fall
    print("1️⃣ FREE FALL SIMULATION")
    print("-" * 70)
    free_fall = engine.simulate_free_fall(h0=100, v0=0, mass=1.0)
    print(f"   Initial height: {free_fall['parameters']['h0']} m")
    print(f"   Impact velocity: {free_fall['results']['impact_velocity']:.2f} m/s")
    print(f"   Impact time: {free_fall['results']['impact_time']:.2f} s")
    print(f"   Total points: {free_fall['results']['total_points']}")
    print()
    
    # Example 2: Projectile Motion
    print("2️⃣ PROJECTILE MOTION SIMULATION")
    print("-" * 70)
    projectile = engine.simulate_projectile(v0=20, angle=45, h0=0)
    print(f"   Initial velocity: {projectile['parameters']['v0']} m/s")
    print(f"   Angle: {projectile['parameters']['angle']}°")
    print(f"   Range: {projectile['results']['range']:.2f} m")
    print(f"   Max height: {projectile['results']['max_height']:.2f} m")
    print(f"   Flight time: {projectile['results']['flight_time']:.2f} s")
    print()
    
    # Example 3: Harmonic Motion
    print("3️⃣ HARMONIC OSCILLATION SIMULATION")
    print("-" * 70)
    harmonic = engine.simulate_harmonic_motion(amplitude=0.1, frequency=2.0, damping=0.0)
    print(f"   Amplitude: {harmonic['parameters']['amplitude']} m")
    print(f"   Frequency: {harmonic['parameters']['frequency']} Hz")
    print(f"   Period: {harmonic['results']['period']:.3f} s")
    print(f"   Max velocity: {harmonic['results']['max_velocity']:.2f} m/s")
    print(f"   Max acceleration: {harmonic['results']['max_acceleration']:.2f} m/s²")
    print()
    
    # Example 4: AI Prediction
    print("4️⃣ AI MOTION PREDICTION")
    print("-" * 70)
    prediction = predictor.predict_landing_point(v0=25, angle=60, h0=10)
    print(f"   Predicted landing: {prediction['landing_distance']:.2f} m")
    print(f"   Predicted max height: {prediction['max_height']:.2f} m")
    print(f"   Confidence: {prediction['confidence'] * 100:.0f}%")
    print()
    
    # Example 5: Optimization
    print("5️⃣ RANGE OPTIMIZATION")
    print("-" * 70)
    optimization = predictor.optimize_projectile_range(v0=20, h0=0)
    print(f"   Optimal angle: {optimization['optimal_angle']:.1f}°")
    print(f"   Maximum range: {optimization['max_range']:.2f} m")
    print()
    
    print("="*70)
    print("✅ ALL SIMULATIONS COMPLETE!")
    print("="*70)

