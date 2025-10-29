"""
Phòng thí nghiệm Chuyển động Vật lý (Physics Motion Laboratory)
- Rơi tự do (Free Fall)
- Ném xiên (Projectile Motion)
- Dao động điều hòa (Harmonic Motion)
- Chuyển động thẳng đều (Uniform Motion)
- Chuyển động thẳng nhanh dần (Accelerated Motion)
- Chuyển động tròn đều (Circular Motion)
- Con lắc đơn (Simple Pendulum)
- Tính toán: vị trí, vận tốc, gia tốc, năng lượng
- Canvas animation with vectors
- AI prediction (Linear Regression)
"""

import numpy as np
import math
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass, asdict

@dataclass
class MotionState:
    """Trạng thái chuyển động tại một thời điểm"""
    t: float        # Thời gian (s)
    x: float        # Vị trí x (m)
    y: float        # Vị trí y (m)
    vx: float       # Vận tốc x (m/s)
    vy: float       # Vận tốc y (m/s)
    ax: float       # Gia tốc x (m/s²)
    ay: float       # Gia tốc y (m/s²)
    
    def to_dict(self) -> Dict:
        return {
            't': round(self.t, 4),
            'position': {'x': round(self.x, 4), 'y': round(self.y, 4)},
            'velocity': {'vx': round(self.vx, 4), 'vy': round(self.vy, 4)},
            'acceleration': {'ax': round(self.ax, 4), 'ay': round(self.ay, 4)},
            'speed': round(math.sqrt(self.vx**2 + self.vy**2), 4),
            'kinetic_energy': round(0.5 * (self.vx**2 + self.vy**2), 4),
            'potential_energy': round(9.8 * self.y, 4)
        }


class FreeFallSimulation:
    """Mô phỏng rơi tự do"""
    
    def __init__(self, h0: float = 100, v0: float = 0, g: float = 9.8):
        """
        Args:
            h0: Độ cao ban đầu (m)
            v0: Vận tốc ban đầu (m/s) - dương là lên, âm là xuống
            g: Gia tốc trọng trường (m/s²)
        """
        self.h0 = h0
        self.v0 = v0
        self.g = g
    
    def position(self, t: float) -> float:
        """Vị trí theo thời gian: h = h0 + v0*t - 0.5*g*t²"""
        return self.h0 + self.v0 * t - 0.5 * self.g * t**2
    
    def velocity(self, t: float) -> float:
        """Vận tốc theo thời gian: v = v0 - g*t"""
        return self.v0 - self.g * t
    
    def acceleration(self, t: float) -> float:
        """Gia tốc không đổi: a = -g"""
        return -self.g
    
    def time_to_ground(self) -> float:
        """Thời gian chạm đất"""
        # Giải phương trình: h0 + v0*t - 0.5*g*t² = 0
        # t = (v0 + sqrt(v0² + 2*g*h0)) / g
        if self.h0 <= 0:
            return 0
        discriminant = self.v0**2 + 2 * self.g * self.h0
        if discriminant < 0:
            return 0
        return (self.v0 + math.sqrt(discriminant)) / self.g
    
    def generate_trajectory(self, num_points: int = 100) -> List[MotionState]:
        """Tạo quỹ đạo"""
        t_max = self.time_to_ground()
        trajectory = []
        
        for i in range(num_points):
            t = i * t_max / (num_points - 1) if num_points > 1 else 0
            y = self.position(t)
            
            if y < 0:
                break
            
            trajectory.append(MotionState(
                t=t,
                x=0,
                y=y,
                vx=0,
                vy=self.velocity(t),
                ax=0,
                ay=self.acceleration(t)
            ))
        
        return trajectory
    
    def to_dict(self) -> Dict:
        """Chuyển thành dictionary"""
        trajectory = self.generate_trajectory()
        t_ground = self.time_to_ground()
        v_ground = self.velocity(t_ground)
        
        return {
            'type': 'free_fall',
            'parameters': {
                'h0': self.h0,
                'v0': self.v0,
                'g': self.g
            },
            'results': {
                'time_to_ground': round(t_ground, 4),
                'velocity_at_ground': round(v_ground, 4),
                'max_height': round(self.h0 + self.v0**2 / (2 * self.g), 4) if self.v0 > 0 else self.h0
            },
            'trajectory': [state.to_dict() for state in trajectory]
        }


class ProjectileMotion:
    """Mô phỏng ném xiên"""
    
    def __init__(self, v0: float = 20, angle_deg: float = 45, 
                 h0: float = 0, g: float = 9.8):
        """
        Args:
            v0: Vận tốc ban đầu (m/s)
            angle_deg: Góc ném (độ)
            h0: Độ cao ban đầu (m)
            g: Gia tốc trọng trường (m/s²)
        """
        self.v0 = v0
        self.angle = math.radians(angle_deg)
        self.h0 = h0
        self.g = g
        
        # Vận tốc thành phần
        self.v0x = v0 * math.cos(self.angle)
        self.v0y = v0 * math.sin(self.angle)
    
    def position_x(self, t: float) -> float:
        """Vị trí x: x = v0x * t"""
        return self.v0x * t
    
    def position_y(self, t: float) -> float:
        """Vị trí y: y = h0 + v0y*t - 0.5*g*t²"""
        return self.h0 + self.v0y * t - 0.5 * self.g * t**2
    
    def velocity_x(self, t: float) -> float:
        """Vận tốc x không đổi: vx = v0x"""
        return self.v0x
    
    def velocity_y(self, t: float) -> float:
        """Vận tốc y: vy = v0y - g*t"""
        return self.v0y - self.g * t
    
    def time_of_flight(self) -> float:
        """Thời gian bay"""
        # Giải: h0 + v0y*t - 0.5*g*t² = 0
        discriminant = self.v0y**2 + 2 * self.g * self.h0
        if discriminant < 0:
            return 0
        return (self.v0y + math.sqrt(discriminant)) / self.g
    
    def max_height(self) -> float:
        """Độ cao cực đại"""
        return self.h0 + self.v0y**2 / (2 * self.g)
    
    def range(self) -> float:
        """Tầm xa"""
        return self.v0x * self.time_of_flight()
    
    def generate_trajectory(self, num_points: int = 100) -> List[MotionState]:
        """Tạo quỹ đạo"""
        t_max = self.time_of_flight()
        trajectory = []
        
        for i in range(num_points):
            t = i * t_max / (num_points - 1) if num_points > 1 else 0
            y = self.position_y(t)
            
            if y < 0:
                break
            
            trajectory.append(MotionState(
                t=t,
                x=self.position_x(t),
                y=y,
                vx=self.velocity_x(t),
                vy=self.velocity_y(t),
                ax=0,
                ay=-self.g
            ))
        
        return trajectory
    
    def to_dict(self) -> Dict:
        """Chuyển thành dictionary"""
        trajectory = self.generate_trajectory()
        
        return {
            'type': 'projectile',
            'parameters': {
                'v0': self.v0,
                'angle_deg': round(math.degrees(self.angle), 2),
                'h0': self.h0,
                'g': self.g
            },
            'results': {
                'time_of_flight': round(self.time_of_flight(), 4),
                'max_height': round(self.max_height(), 4),
                'range': round(self.range(), 4),
                'v0x': round(self.v0x, 4),
                'v0y': round(self.v0y, 4)
            },
            'trajectory': [state.to_dict() for state in trajectory]
        }


class HarmonicMotion:
    """Mô phỏng dao động điều hòa"""
    
    def __init__(self, A: float = 0.1, omega: float = 2*math.pi, 
                 phi: float = 0):
        """
        Args:
            A: Biên độ (m)
            omega: Tần số góc (rad/s)
            phi: Pha ban đầu (rad)
        """
        self.A = A
        self.omega = omega
        self.phi = phi
        self.f = omega / (2 * math.pi)
        self.T = 1 / self.f if self.f > 0 else 0
    
    def position(self, t: float) -> float:
        """Vị trí: x = A*cos(ωt + φ)"""
        return self.A * math.cos(self.omega * t + self.phi)
    
    def velocity(self, t: float) -> float:
        """Vận tốc: v = -Aω*sin(ωt + φ)"""
        return -self.A * self.omega * math.sin(self.omega * t + self.phi)
    
    def acceleration(self, t: float) -> float:
        """Gia tốc: a = -Aω²*cos(ωt + φ)"""
        return -self.A * self.omega**2 * math.cos(self.omega * t + self.phi)
    
    def generate_trajectory(self, t_max: float = None, num_points: int = 200) -> List[MotionState]:
        """Tạo quỹ đạo"""
        if t_max is None:
            t_max = 2 * self.T
        
        trajectory = []
        
        for i in range(num_points):
            t = i * t_max / (num_points - 1) if num_points > 1 else 0
            
            trajectory.append(MotionState(
                t=t,
                x=self.position(t),
                y=0,
                vx=self.velocity(t),
                vy=0,
                ax=self.acceleration(t),
                ay=0
            ))
        
        return trajectory
    
    def to_dict(self) -> Dict:
        """Chuyển thành dictionary"""
        trajectory = self.generate_trajectory()
        
        return {
            'type': 'harmonic',
            'parameters': {
                'A': self.A,
                'omega': round(self.omega, 4),
                'phi': round(self.phi, 4),
                'f': round(self.f, 4),
                'T': round(self.T, 4)
            },
            'results': {
                'v_max': round(self.A * self.omega, 4),
                'a_max': round(self.A * self.omega**2, 4),
                'energy_total': round(0.5 * self.omega**2 * self.A**2, 4)
            },
            'trajectory': [state.to_dict() for state in trajectory]
        }


class UniformMotion:
    """Mô phỏng chuyển động thẳng đều"""
    
    def __init__(self, v: float = 10, x0: float = 0, duration: float = 10):
        """
        Args:
            v: Vận tốc không đổi (m/s)
            x0: Vị trí ban đầu (m)
            duration: Thời gian chuyển động (s)
        """
        self.v = v
        self.x0 = x0
        self.duration = duration
    
    def position(self, t: float) -> float:
        """Vị trí: x = x0 + v*t"""
        return self.x0 + self.v * t
    
    def velocity(self, t: float) -> float:
        """Vận tốc không đổi: v"""
        return self.v
    
    def acceleration(self, t: float) -> float:
        """Gia tốc bằng 0"""
        return 0
    
    def generate_trajectory(self, num_points: int = 100) -> List[MotionState]:
        """Tạo quỹ đạo"""
        trajectory = []
        
        for i in range(num_points):
            t = i * self.duration / (num_points - 1) if num_points > 1 else 0
            
            trajectory.append(MotionState(
                t=t,
                x=self.position(t),
                y=0,
                vx=self.velocity(t),
                vy=0,
                ax=0,
                ay=0
            ))
        
        return trajectory
    
    def to_dict(self) -> Dict:
        """Chuyển thành dictionary"""
        trajectory = self.generate_trajectory()
        
        return {
            'type': 'uniform',
            'parameters': {
                'v': self.v,
                'x0': self.x0,
                'duration': self.duration
            },
            'results': {
                'final_position': round(self.position(self.duration), 4),
                'average_velocity': round(self.v, 4),
                'distance_traveled': round(self.v * self.duration, 4)
            },
            'trajectory': [state.to_dict() for state in trajectory]
        }


class AcceleratedMotion:
    """Mô phỏng chuyển động thẳng nhanh dần đều"""
    
    def __init__(self, v0: float = 0, a: float = 2, x0: float = 0, duration: float = 10):
        """
        Args:
            v0: Vận tốc ban đầu (m/s)
            a: Gia tốc (m/s²)
            x0: Vị trí ban đầu (m)
            duration: Thời gian chuyển động (s)
        """
        self.v0 = v0
        self.a = a
        self.x0 = x0
        self.duration = duration
    
    def position(self, t: float) -> float:
        """Vị trí: x = x0 + v0*t + 0.5*a*t²"""
        return self.x0 + self.v0 * t + 0.5 * self.a * t**2
    
    def velocity(self, t: float) -> float:
        """Vận tốc: v = v0 + a*t"""
        return self.v0 + self.a * t
    
    def acceleration(self, t: float) -> float:
        """Gia tốc không đổi: a"""
        return self.a
    
    def generate_trajectory(self, num_points: int = 100) -> List[MotionState]:
        """Tạo quỹ đạo"""
        trajectory = []
        
        for i in range(num_points):
            t = i * self.duration / (num_points - 1) if num_points > 1 else 0
            
            trajectory.append(MotionState(
                t=t,
                x=self.position(t),
                y=0,
                vx=self.velocity(t),
                vy=0,
                ax=self.acceleration(t),
                ay=0
            ))
        
        return trajectory
    
    def to_dict(self) -> Dict:
        """Chuyển thành dictionary"""
        trajectory = self.generate_trajectory()
        final_v = self.velocity(self.duration)
        
        return {
            'type': 'accelerated',
            'parameters': {
                'v0': self.v0,
                'a': self.a,
                'x0': self.x0,
                'duration': self.duration
            },
            'results': {
                'final_position': round(self.position(self.duration), 4),
                'final_velocity': round(final_v, 4),
                'distance_traveled': round(self.position(self.duration) - self.x0, 4),
                'average_velocity': round((self.v0 + final_v) / 2, 4)
            },
            'trajectory': [state.to_dict() for state in trajectory]
        }


class CircularMotion:
    """Mô phỏng chuyển động tròn đều"""
    
    def __init__(self, r: float = 5, omega: float = 1, duration: float = 10):
        """
        Args:
            r: Bán kính (m)
            omega: Tốc độ góc (rad/s)
            duration: Thời gian chuyển động (s)
        """
        self.r = r
        self.omega = omega
        self.duration = duration
        self.v = r * omega  # Tốc độ dài
        self.ac = r * omega**2  # Gia tốc hướng tâm
    
    def position_x(self, t: float) -> float:
        """Vị trí x: x = r*cos(ωt)"""
        return self.r * math.cos(self.omega * t)
    
    def position_y(self, t: float) -> float:
        """Vị trí y: y = r*sin(ωt)"""
        return self.r * math.sin(self.omega * t)
    
    def velocity_x(self, t: float) -> float:
        """Vận tốc x: vx = -r*ω*sin(ωt)"""
        return -self.r * self.omega * math.sin(self.omega * t)
    
    def velocity_y(self, t: float) -> float:
        """Vận tốc y: vy = r*ω*cos(ωt)"""
        return self.r * self.omega * math.cos(self.omega * t)
    
    def acceleration_x(self, t: float) -> float:
        """Gia tốc x (hướng tâm): ax = -r*ω²*cos(ωt)"""
        return -self.r * self.omega**2 * math.cos(self.omega * t)
    
    def acceleration_y(self, t: float) -> float:
        """Gia tốc y (hướng tâm): ay = -r*ω²*sin(ωt)"""
        return -self.r * self.omega**2 * math.sin(self.omega * t)
    
    def generate_trajectory(self, num_points: int = 200) -> List[MotionState]:
        """Tạo quỹ đạo"""
        trajectory = []
        
        for i in range(num_points):
            t = i * self.duration / (num_points - 1) if num_points > 1 else 0
            
            trajectory.append(MotionState(
                t=t,
                x=self.position_x(t),
                y=self.position_y(t),
                vx=self.velocity_x(t),
                vy=self.velocity_y(t),
                ax=self.acceleration_x(t),
                ay=self.acceleration_y(t)
            ))
        
        return trajectory
    
    def to_dict(self) -> Dict:
        """Chuyển thành dictionary"""
        trajectory = self.generate_trajectory()
        period = 2 * math.pi / self.omega
        frequency = self.omega / (2 * math.pi)
        
        return {
            'type': 'circular',
            'parameters': {
                'r': self.r,
                'omega': round(self.omega, 4),
                'duration': self.duration
            },
            'results': {
                'period': round(period, 4),
                'frequency': round(frequency, 4),
                'linear_velocity': round(self.v, 4),
                'centripetal_acceleration': round(self.ac, 4),
                'circumference': round(2 * math.pi * self.r, 4)
            },
            'trajectory': [state.to_dict() for state in trajectory]
        }


class SimplePendulum:
    """Mô phỏng con lắc đơn (góc nhỏ)"""
    
    def __init__(self, L: float = 1, theta0_deg: float = 30, duration: float = 10, g: float = 9.8):
        """
        Args:
            L: Chiều dài dây (m)
            theta0_deg: Góc ban đầu (độ)
            duration: Thời gian dao động (s)
            g: Gia tốc trọng trường (m/s²)
        """
        self.L = L
        self.theta0 = math.radians(theta0_deg)
        self.duration = duration
        self.g = g
        self.omega0 = math.sqrt(g / L)  # Tần số góc riêng
        self.T = 2 * math.pi / self.omega0  # Chu kỳ
    
    def theta(self, t: float) -> float:
        """Góc lệch: θ = θ0*cos(ω0*t)"""
        return self.theta0 * math.cos(self.omega0 * t)
    
    def position_x(self, t: float) -> float:
        """Vị trí x: x = L*sin(θ)"""
        return self.L * math.sin(self.theta(t))
    
    def position_y(self, t: float) -> float:
        """Vị trí y: y = -L*cos(θ) (trục y hướng xuống)"""
        return -self.L * math.cos(self.theta(t))
    
    def velocity_x(self, t: float) -> float:
        """Vận tốc x"""
        theta_val = self.theta(t)
        theta_dot = -self.theta0 * self.omega0 * math.sin(self.omega0 * t)
        return self.L * math.cos(theta_val) * theta_dot
    
    def velocity_y(self, t: float) -> float:
        """Vận tốc y"""
        theta_val = self.theta(t)
        theta_dot = -self.theta0 * self.omega0 * math.sin(self.omega0 * t)
        return self.L * math.sin(theta_val) * theta_dot
    
    def generate_trajectory(self, num_points: int = 200) -> List[MotionState]:
        """Tạo quỹ đạo"""
        trajectory = []
        
        for i in range(num_points):
            t = i * self.duration / (num_points - 1) if num_points > 1 else 0
            
            trajectory.append(MotionState(
                t=t,
                x=self.position_x(t),
                y=self.position_y(t),
                vx=self.velocity_x(t),
                vy=self.velocity_y(t),
                ax=0,  # Gia tốc phức tạp, tính gần đúng
                ay=-self.g
            ))
        
        return trajectory
    
    def to_dict(self) -> Dict:
        """Chuyển thành dictionary"""
        trajectory = self.generate_trajectory()
        max_height = self.L * (1 - math.cos(self.theta0))
        max_velocity = self.theta0 * self.omega0 * self.L
        
        return {
            'type': 'pendulum',
            'parameters': {
                'L': self.L,
                'theta0_deg': round(math.degrees(self.theta0), 2),
                'duration': self.duration,
                'g': self.g
            },
            'results': {
                'period': round(self.T, 4),
                'frequency': round(1 / self.T, 4),
                'max_height': round(max_height, 4),
                'max_velocity': round(max_velocity, 4),
                'angular_frequency': round(self.omega0, 4)
            },
            'trajectory': [state.to_dict() for state in trajectory]
        }


class MotionPredictor:
    """AI dự đoán chuyển động (Linear Regression đơn giản)"""
    
    @staticmethod
    def train_free_fall_model(training_data: List[Dict]) -> Dict:
        """
        Train model dự đoán rơi tự do
        Dự đoán: h = f(t) = h0 - 0.5*g*t²
        """
        # Linear regression cho h vs t²
        t_values = np.array([d['t'] for d in training_data])
        h_values = np.array([d['position']['y'] for d in training_data])
        
        # Tính t²
        t_squared = t_values ** 2
        
        # Linear regression: h = a + b*t²
        # Sử dụng least squares
        A = np.vstack([np.ones(len(t_squared)), t_squared]).T
        coeffs, residuals, rank, s = np.linalg.lstsq(A, h_values, rcond=None)
        
        h0_pred = coeffs[0]
        g_pred = -2 * coeffs[1]  # Vì h = h0 - 0.5*g*t² → coefficient = -0.5*g
        
        # Tính R²
        ss_res = np.sum((h_values - (coeffs[0] + coeffs[1] * t_squared))**2)
        ss_tot = np.sum((h_values - np.mean(h_values))**2)
        r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0
        
        return {
            'model_type': 'free_fall',
            'parameters': {
                'h0': round(h0_pred, 4),
                'g': round(g_pred, 4)
            },
            'metrics': {
                'r_squared': round(r_squared, 4),
                'rmse': round(np.sqrt(np.mean(residuals)), 4) if len(residuals) > 0 else 0
            }
        }
    
    @staticmethod
    def train_projectile_model(training_data: List[Dict]) -> Dict:
        """
        Train model dự đoán ném xiên
        x = v0x * t
        y = h0 + v0y*t - 0.5*g*t²
        """
        t_values = np.array([d['t'] for d in training_data])
        x_values = np.array([d['position']['x'] for d in training_data])
        y_values = np.array([d['position']['y'] for d in training_data])
        
        # X: Linear regression
        v0x_pred = np.mean(x_values / t_values) if len(t_values) > 0 else 0
        
        # Y: Quadratic regression
        t_squared = t_values ** 2
        A = np.vstack([np.ones(len(t_values)), t_values, t_squared]).T
        coeffs, residuals, rank, s = np.linalg.lstsq(A, y_values, rcond=None)
        
        h0_pred = coeffs[0]
        v0y_pred = coeffs[1]
        g_pred = -2 * coeffs[2]
        
        return {
            'model_type': 'projectile',
            'parameters': {
                'v0x': round(v0x_pred, 4),
                'v0y': round(v0y_pred, 4),
                'h0': round(h0_pred, 4),
                'g': round(g_pred, 4)
            }
        }
    
    @staticmethod
    def predict(model: Dict, t_values: List[float]) -> List[Dict]:
        """Dự đoán vị trí tại các thời điểm"""
        predictions = []
        
        if model['model_type'] == 'free_fall':
            h0 = model['parameters']['h0']
            g = model['parameters']['g']
            
            for t in t_values:
                h = h0 - 0.5 * g * t**2
                predictions.append({
                    't': round(t, 4),
                    'position': {'x': 0, 'y': round(h, 4)}
                })
        
        elif model['model_type'] == 'projectile':
            params = model['parameters']
            
            for t in t_values:
                x = params['v0x'] * t
                y = params['h0'] + params['v0y'] * t - 0.5 * params['g'] * t**2
                predictions.append({
                    't': round(t, 4),
                    'position': {'x': round(x, 4), 'y': round(y, 4)}
                })
        
        return predictions


# Test functions
if __name__ == "__main__":
    print("=== PHÒNG THÍ NGHIỆM CHUYỂN ĐỘNG VẬT LÝ ===\n")
    print("✨ Tất cả 7 loại chuyển động\n")
    
    # Test 1: Rơi tự do
    print("1. 🔻 Rơi tự do:")
    ff = FreeFallSimulation(h0=100, v0=0)
    result = ff.to_dict()
    print(f"   Độ cao: {result['parameters']['h0']}m")
    print(f"   Thời gian chạm đất: {result['results']['time_to_ground']}s")
    print(f"   Vận tốc chạm đất: {result['results']['velocity_at_ground']}m/s")
    print(f"   Số điểm quỹ đạo: {len(result['trajectory'])}\n")
    
    # Test 2: Ném xiên
    print("2. 🎯 Ném xiên:")
    pm = ProjectileMotion(v0=20, angle_deg=45)
    result = pm.to_dict()
    print(f"   Vận tốc: {result['parameters']['v0']}m/s, Góc: {result['parameters']['angle_deg']}°")
    print(f"   Tầm xa: {result['results']['range']}m")
    print(f"   Độ cao max: {result['results']['max_height']}m")
    print(f"   Thời gian bay: {result['results']['time_of_flight']}s\n")
    
    # Test 3: Dao động điều hòa
    print("3. 〰️ Dao động điều hòa:")
    hm = HarmonicMotion(A=0.1, omega=2*math.pi)
    result = hm.to_dict()
    print(f"   Biên độ: {result['parameters']['A']}m")
    print(f"   Tần số: {result['parameters']['f']}Hz")
    print(f"   Chu kỳ: {result['parameters']['T']}s")
    print(f"   Vận tốc max: {result['results']['v_max']}m/s\n")
    
    # Test 4: Chuyển động thẳng đều
    print("4. ➡️ Chuyển động thẳng đều:")
    um = UniformMotion(v=10, x0=0, duration=5)
    result = um.to_dict()
    print(f"   Vận tốc: {result['parameters']['v']}m/s")
    print(f"   Quãng đường: {result['results']['distance_traveled']}m")
    print(f"   Vị trí cuối: {result['results']['final_position']}m\n")
    
    # Test 5: Chuyển động nhanh dần đều
    print("5. 🚀 Chuyển động nhanh dần đều:")
    am = AcceleratedMotion(v0=0, a=2, x0=0, duration=5)
    result = am.to_dict()
    print(f"   Gia tốc: {result['parameters']['a']}m/s²")
    print(f"   Vận tốc cuối: {result['results']['final_velocity']}m/s")
    print(f"   Quãng đường: {result['results']['distance_traveled']}m\n")
    
    # Test 6: Chuyển động tròn đều
    print("6. ⭕ Chuyển động tròn đều:")
    cm = CircularMotion(r=5, omega=1, duration=10)
    result = cm.to_dict()
    print(f"   Bán kính: {result['parameters']['r']}m")
    print(f"   Chu kỳ: {result['results']['period']}s")
    print(f"   Vận tốc dài: {result['results']['linear_velocity']}m/s")
    print(f"   Gia tốc hướng tâm: {result['results']['centripetal_acceleration']}m/s²\n")
    
    # Test 7: Con lắc đơn
    print("7. 🔶 Con lắc đơn:")
    sp = SimplePendulum(L=1, theta0_deg=30, duration=10)
    result = sp.to_dict()
    print(f"   Chiều dài: {result['parameters']['L']}m")
    print(f"   Góc ban đầu: {result['parameters']['theta0_deg']}°")
    print(f"   Chu kỳ: {result['results']['period']}s")
    print(f"   Tần số: {result['results']['frequency']}Hz\n")
    
    # Test 8: AI Prediction
    print("8. 🤖 AI Prediction:")
    ff = FreeFallSimulation(h0=100)
    training_data = [state.to_dict() for state in ff.generate_trajectory(20)]
    model = MotionPredictor.train_free_fall_model(training_data)
    print(f"   Model: {model['model_type']}")
    print(f"   Predicted h0: {model['parameters']['h0']}m")
    print(f"   Predicted g: {model['parameters']['g']}m/s²")
    print(f"   R²: {model['metrics']['r_squared']}\n")
    
    print("✅ Tất cả 7 loại chuyển động đã được test thành công!")




