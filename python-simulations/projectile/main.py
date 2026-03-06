"""
Mô phỏng chuyển động ném xiên (Projectile Motion Simulation)
Mô phỏng chuyển động của vật được ném với vận tốc ban đầu và góc ném
"""

import numpy as np
import math

class ProjectileSimulation:
    def __init__(self, v0=20, angle_deg=45, g=9.8, dt=0.05):
        """
        Khởi tạo mô phỏng chuyển động ném xiên
        
        Args:
            v0: Vận tốc ban đầu (m/s)
            angle_deg: Góc ném (độ)
            g: Gia tốc trọng trường (m/s²)
            dt: Bước thời gian (s)
        """
        self.v0 = v0
        self.angle = math.radians(angle_deg)
        self.g = g
        self.dt = dt
        
        # Thành phần vận tốc
        self.v0x = v0 * math.cos(self.angle)
        self.v0y = v0 * math.sin(self.angle)
        
        # Tính các giá trị quan trọng
        self.time_of_flight = 2 * self.v0y / self.g
        self.max_height = (self.v0y ** 2) / (2 * self.g)
        self.range = (v0 ** 2 * math.sin(2 * self.angle)) / self.g
        
    def position_at_time(self, t):
        """Tính vị trí tại thời điểm t"""
        x = self.v0x * t
        y = self.v0y * t - 0.5 * self.g * t**2
        return x, max(0, y)  # y không âm
    
    def velocity_at_time(self, t):
        """Tính vận tốc tại thời điểm t"""
        vx = self.v0x
        vy = self.v0y - self.g * t
        return vx, vy
    
    def acceleration_at_time(self, t):
        """Tính gia tốc tại thời điểm t"""
        ax = 0  # Không có gia tốc theo phương ngang
        ay = -self.g  # Gia tốc trọng trường
        return ax, ay
    
    def energy_at_time(self, t, m=1.0):
        """
        Tính năng lượng tại thời điểm t
        Args:
            t: thời gian
            m: khối lượng (mặc định = 1kg)
        """
        x, y = self.position_at_time(t)
        vx, vy = self.velocity_at_time(t)
        v = math.sqrt(vx**2 + vy**2)
        
        # Động năng: Ek = (1/2)mv²
        kinetic = 0.5 * m * v**2
        
        # Thế năng: Ep = mgh
        potential = m * self.g * y
        
        # Cơ năng toàn phần
        total = kinetic + potential
        
        return kinetic, potential, total
    
    def generate_trajectory(self):
        """Tạo quỹ đạo hoàn chỉnh với vận tốc, gia tốc và năng lượng"""
        times = np.arange(0, self.time_of_flight + self.dt, self.dt)
        trajectory = []
        m = 1.0  # Khối lượng giả định 1kg
        
        for t in times:
            x, y = self.position_at_time(t)
            vx, vy = self.velocity_at_time(t)
            ax, ay = self.acceleration_at_time(t)
            Ek, Ep, Et = self.energy_at_time(t, m)
            
            v = math.sqrt(vx**2 + vy**2)
            a = math.sqrt(ax**2 + ay**2)
            
            trajectory.append({
                "t": round(float(t), 3),
                "x": round(float(x), 3),
                "y": round(float(y), 3),
                "vx": round(float(vx), 3),
                "vy": round(float(vy), 3),
                "v": round(float(v), 3),
                "ax": round(float(ax), 3),
                "ay": round(float(ay), 3),
                "a": round(float(a), 3),
                "Ek": round(float(Ek), 3),
                "Ep": round(float(Ep), 3),
                "Et": round(float(Et), 3)
            })
            
            if y <= 0 and t > 0:
                break
                
        return trajectory
    
    def to_dict(self):
        """Chuyển đổi kết quả thành dictionary"""
        return {
            "v0": self.v0,
            "angle_deg": math.degrees(self.angle),
            "g": self.g,
            "v0x": round(self.v0x, 3),
            "v0y": round(self.v0y, 3),
            "time_of_flight": round(self.time_of_flight, 3),
            "max_height": round(self.max_height, 3),
            "range": round(self.range, 3),
            "trajectory": self.generate_trajectory()
        }

def generate_animation_frames(v0=20, angle_range=(15, 75), num_frames=30, g=9.8):
    """
    Tạo các frame cho animation ném xiên với các góc khác nhau
    
    Args:
        v0: Vận tốc ban đầu
        angle_range: Khoảng góc (min, max)
        num_frames: Số frame
        g: Gia tốc trọng trường
        
    Returns:
        list: Danh sách các frame
    """
    frames = []
    angles = np.linspace(angle_range[0], angle_range[1], num_frames)
    
    for angle in angles:
        sim = ProjectileSimulation(v0=v0, angle_deg=angle, g=g)
        frame_data = sim.to_dict()
        frames.append(frame_data)
    
    return frames

def generate_velocity_frames(angle=45, v0_range=(10, 40), num_frames=30, g=9.8):
    """
    Tạo các frame cho animation với các vận tốc khác nhau
    
    Args:
        angle: Góc ném cố định
        v0_range: Khoảng vận tốc (min, max)
        num_frames: Số frame
        g: Gia tốc trọng trường
        
    Returns:
        list: Danh sách các frame
    """
    frames = []
    velocities = np.linspace(v0_range[0], v0_range[1], num_frames)
    
    for v0 in velocities:
        sim = ProjectileSimulation(v0=v0, angle_deg=angle, g=g)
        frame_data = sim.to_dict()
        frames.append(frame_data)
    
    return frames

def compare_trajectories(v0=20, angles=[30, 45, 60], g=9.8):
    """So sánh quỹ đạo với các góc khác nhau"""
    trajectories = []
    
    for angle in angles:
        sim = ProjectileSimulation(v0=v0, angle_deg=angle, g=g)
        trajectories.append({
            "angle": angle,
            "data": sim.to_dict()
        })
    
    return trajectories

if __name__ == "__main__":
    # Test simulation
    sim = ProjectileSimulation(v0=20, angle_deg=45, g=9.8)
    result = sim.to_dict()
    
    print("Mô phỏng chuyển động ném xiên")
    print(f"Vận tốc ban đầu: {result['v0']} m/s")
    print(f"Góc ném: {result['angle_deg']}°")
    print(f"Tầm xa: {result['range']:.2f} m")
    print(f"Độ cao tối đa: {result['max_height']:.2f} m")
    print(f"Thời gian bay: {result['time_of_flight']:.2f} s")
    print(f"Số điểm quỹ đạo: {len(result['trajectory'])}")

