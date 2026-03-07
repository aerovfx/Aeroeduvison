"""
Mô phỏng Dao động điều hòa (Harmonic Motion)
Vẽ đồ thị chuyển động dựa vào hàm số: x = A*cos(ωt + φ)
"""

import numpy as np
import math

class HarmonicMotionSimulation:
    def __init__(self, A=2.0, f=None, omega=None, phi=0.0):
        """
        Khởi tạo simulation dao động điều hòa
        
        Args:
            A: Biên độ (cm)
            f: Tần số (Hz)
            omega: Tần số góc (rad/s)
            phi: Pha ban đầu (rad)
        """
        self.A = A
        self.phi = phi
        
        # Tính omega từ f hoặc ngược lại
        if f is not None and f > 0:
            self.f = f
            self.omega = 2 * np.pi * f
        elif omega is not None and omega > 0:
            self.omega = omega
            self.f = omega / (2 * np.pi)
        else:
            self.f = 1.0
            self.omega = 2 * np.pi
        
        # Các đại lượng đặc trưng
        self.T = 1 / self.f if self.f > 0 else 1.0  # Chu kỳ (s)
        self.v_max = self.A * self.omega  # Vận tốc cực đại (cm/s)
        self.a_max = self.A * self.omega ** 2  # Gia tốc cực đại (cm/s²)
    
    def position(self, t):
        """Tính li độ tại thời điểm t: x = A*cos(ωt + φ)"""
        return self.A * np.cos(self.omega * t + self.phi)
    
    def velocity(self, t):
        """Tính vận tốc tại thời điểm t: v = -Aω*sin(ωt + φ)"""
        return -self.A * self.omega * np.sin(self.omega * t + self.phi)
    
    def acceleration(self, t):
        """Tính gia tốc tại thời điểm t: a = -Aω²*cos(ωt + φ)"""
        return -self.A * self.omega ** 2 * np.cos(self.omega * t + self.phi)
    
    def energy_kinetic(self, t):
        """Động năng: Wd = (1/2)m*v² (giả sử m=1)"""
        v = self.velocity(t)
        return 0.5 * v ** 2
    
    def energy_potential(self, t):
        """Thế năng: Wt = (1/2)k*x² = (1/2)mω²*x² (giả sử m=1)"""
        x = self.position(t)
        return 0.5 * self.omega ** 2 * x ** 2
    
    def energy_total(self):
        """Cơ năng toàn phần: W = (1/2)mω²A² (giả sử m=1)"""
        return 0.5 * self.omega ** 2 * self.A ** 2
    
    def generate_trajectory(self, t_max=2.0, num_points=500):
        """
        Tạo quỹ đạo chuyển động
        
        Args:
            t_max: Thời gian tối đa (s)
            num_points: Số điểm
        """
        t = np.linspace(0, t_max, num_points)
        trajectory = []
        
        for ti in t:
            trajectory.append({
                "t": round(float(ti), 4),
                "x": round(float(self.position(ti)), 4),
                "v": round(float(self.velocity(ti)), 4),
                "a": round(float(self.acceleration(ti)), 4),
                "Ek": round(float(self.energy_kinetic(ti)), 4),
                "Ep": round(float(self.energy_potential(ti)), 4)
            })
        
        return trajectory
    
    def to_dict(self, t_max=2.0):
        """Chuyển đổi kết quả thành dictionary"""
        trajectory = self.generate_trajectory(t_max)
        
        return {
            "A": self.A,
            "f": round(self.f, 4),
            "omega": round(self.omega, 4),
            "phi": round(self.phi, 4),
            "T": round(self.T, 4),
            "v_max": round(self.v_max, 4),
            "a_max": round(self.a_max, 4),
            "E_total": round(self.energy_total(), 4),
            "t_max": t_max,
            "trajectory": trajectory
        }

def generate_presets():
    """Tạo các preset cho các loại dao động"""
    return [
        {
            "id": "pendulum",
            "name": "Con lắc đơn",
            "icon": "⚖️",
            "A": 5.0,
            "f": 0.5,
            "phi": 0,
            "description": "Dao động của con lắc đơn với biên độ nhỏ"
        },
        {
            "id": "spring",
            "name": "Lò xo",
            "icon": "🔩",
            "A": 10.0,
            "f": 2.0,
            "phi": 0,
            "description": "Vật dao động trên lò xo"
        },
        {
            "id": "wave",
            "name": "Sóng",
            "icon": "🌊",
            "A": 3.0,
            "f": 5.0,
            "phi": 0,
            "description": "Sóng cơ học lan truyền"
        },
        {
            "id": "oscillator",
            "name": "Bộ dao động",
            "icon": "📻",
            "A": 2.0,
            "f": 10.0,
            "phi": 0,
            "description": "Mạch dao động LC"
        }
    ]

def generate_phase_variations(A=2.0, f=1.0):
    """Tạo các scenarios với pha ban đầu khác nhau"""
    phases = [0, np.pi/6, np.pi/4, np.pi/3, np.pi/2, np.pi]
    phase_names = ["0", "π/6", "π/4", "π/3", "π/2", "π"]
    
    scenarios = []
    for phi, name in zip(phases, phase_names):
        sim = HarmonicMotionSimulation(A=A, f=f, phi=phi)
        scenarios.append({
            "phi": round(float(phi), 4),
            "phi_name": name,
            "data": sim.to_dict(t_max=2.0)
        })
    
    return scenarios

def generate_amplitude_variations(f=1.0, phi=0):
    """Tạo các scenarios với biên độ khác nhau"""
    amplitudes = [1.0, 2.0, 3.0, 5.0, 10.0]
    
    scenarios = []
    for A in amplitudes:
        sim = HarmonicMotionSimulation(A=A, f=f, phi=phi)
        scenarios.append({
            "A": A,
            "data": sim.to_dict(t_max=2.0)
        })
    
    return scenarios

def generate_frequency_variations(A=2.0, phi=0):
    """Tạo các scenarios với tần số khác nhau"""
    frequencies = [0.5, 1.0, 2.0, 5.0, 10.0]
    
    scenarios = []
    for f in frequencies:
        sim = HarmonicMotionSimulation(A=A, f=f, phi=phi)
        scenarios.append({
            "f": f,
            "T": round(1/f, 4),
            "data": sim.to_dict(t_max=2.0)
        })
    
    return scenarios

if __name__ == "__main__":
    # Test simulation
    sim = HarmonicMotionSimulation(A=2.0, f=1.0, phi=0)
    result = sim.to_dict(t_max=2.0)
    
    print("Mô phỏng Dao động điều hòa")
    print(f"Biên độ A: {result['A']} cm")
    print(f"Tần số f: {result['f']} Hz")
    print(f"Chu kỳ T: {result['T']} s")
    print(f"Tần số góc ω: {result['omega']} rad/s")
    print(f"Pha ban đầu φ: {result['phi']} rad")
    print(f"Vận tốc cực đại: {result['v_max']} cm/s")
    print(f"Gia tốc cực đại: {result['a_max']} cm/s²")
    print(f"Cơ năng: {result['E_total']}")
    print(f"Số điểm quỹ đạo: {len(result['trajectory'])}")


