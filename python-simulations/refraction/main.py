"""
Mô phỏng khúc xạ ánh sáng (Light Refraction Simulation)
Mô phỏng tia sáng đi từ không khí vào nước, thủy tinh hoặc các môi trường khác
"""

import numpy as np
import math

class RefractionSimulation:
    def __init__(self, n1=1.0, n2=1.33, angle_in_deg=30):
        """
        Khởi tạo mô phỏng khúc xạ
        
        Args:
            n1: Chiết suất môi trường 1 (không khí = 1.0)
            n2: Chiết suất môi trường 2 (nước = 1.33, thủy tinh = 1.5)
            angle_in_deg: Góc tới (độ)
        """
        self.n1 = n1  # Chiết suất môi trường 1
        self.n2 = n2  # Chiết suất môi trường 2
        self.angle_in = math.radians(angle_in_deg)  # Góc tới (radian)
        self.angle_out = None  # Góc khúc xạ
        self.is_total_reflection = False  # Phản xạ toàn phần?
        
    def calculate(self):
        """Tính toán góc khúc xạ theo định luật Snell"""
        # Định luật Snell: n1 * sin(θ1) = n2 * sin(θ2)
        sin_angle_out = (self.n1 * math.sin(self.angle_in)) / self.n2
        
        # Kiểm tra phản xạ toàn phần
        if abs(sin_angle_out) > 1.0:
            self.is_total_reflection = True
            self.angle_out = None
        else:
            self.angle_out = math.asin(sin_angle_out)
            self.is_total_reflection = False
            
        return self.angle_out
    
    def get_ray_points(self, interface_y=0):
        """
        Tạo các điểm để vẽ tia sáng
        
        Args:
            interface_y: Vị trí y của mặt phân cách (mặc định = 0)
            
        Returns:
            dict: Các điểm của tia tới, tia khúc xạ (hoặc phản xạ)
        """
        # Điểm giao với mặt phân cách
        interface_point = [0, interface_y]
        
        # Tia tới (từ trên xuống)
        incident_length = 100
        incident_start = [
            -incident_length * math.sin(self.angle_in),
            interface_y + incident_length * math.cos(self.angle_in)
        ]
        
        if self.is_total_reflection:
            # Phản xạ toàn phần - góc phản xạ = góc tới
            reflected_length = 100
            reflected_end = [
                reflected_length * math.sin(self.angle_in),
                interface_y + reflected_length * math.cos(self.angle_in)
            ]
            return {
                "incident_ray": [incident_start, interface_point],
                "reflected_ray": [interface_point, reflected_end],
                "refracted_ray": None
            }
        else:
            # Tia khúc xạ
            refracted_length = 100
            refracted_end = [
                refracted_length * math.sin(self.angle_out),
                interface_y - refracted_length * math.cos(self.angle_out)
            ]
            
            # Tia phản xạ (luôn có)
            reflected_length = 30  # Ngắn hơn
            reflected_end = [
                reflected_length * math.sin(self.angle_in),
                interface_y + reflected_length * math.cos(self.angle_in)
            ]
            
            return {
                "incident_ray": [incident_start, interface_point],
                "refracted_ray": [interface_point, refracted_end],
                "reflected_ray": [interface_point, reflected_end]
            }
    
    def to_dict(self):
        """Chuyển đổi kết quả thành dictionary"""
        self.calculate()
        rays = self.get_ray_points()
        
        return {
            "n1": self.n1,
            "n2": self.n2,
            "angle_in_deg": math.degrees(self.angle_in),
            "angle_out_deg": math.degrees(self.angle_out) if self.angle_out else None,
            "is_total_reflection": self.is_total_reflection,
            "critical_angle": math.degrees(math.asin(self.n2 / self.n1)) if self.n2 < self.n1 else None,
            "rays": rays
        }

def generate_animation_frames(n1=1.0, n2=1.33, angle_range=(10, 80), num_frames=50):
    """
    Tạo các frame cho animation khúc xạ
    
    Args:
        n1: Chiết suất môi trường 1
        n2: Chiết suất môi trường 2
        angle_range: Khoảng góc tới (min, max)
        num_frames: Số frame
        
    Returns:
        list: Danh sách các frame
    """
    frames = []
    angles = np.linspace(angle_range[0], angle_range[1], num_frames)
    
    for angle in angles:
        sim = RefractionSimulation(n1, n2, angle)
        frame_data = sim.to_dict()
        frames.append(frame_data)
    
    return frames

def generate_materials():
    """Tạo danh sách các môi trường phổ biến"""
    return [
        {"name": "Không khí", "n": 1.0, "color": "#E0F2FE"},
        {"name": "Nước", "n": 1.33, "color": "#0EA5E9"},
        {"name": "Thủy tinh", "n": 1.5, "color": "#60A5FA"},
        {"name": "Kim cương", "n": 2.42, "color": "#E0E7FF"},
        {"name": "Dầu", "n": 1.47, "color": "#FCD34D"}
    ]

if __name__ == "__main__":
    # Test simulation
    sim = RefractionSimulation(n1=1.0, n2=1.33, angle_in_deg=45)
    result = sim.to_dict()
    print("Mô phỏng khúc xạ ánh sáng")
    print(f"Góc tới: {result['angle_in_deg']:.2f}°")
    print(f"Góc khúc xạ: {result['angle_out_deg']:.2f}°" if result['angle_out_deg'] else "Phản xạ toàn phần")
    print(f"Phản xạ toàn phần: {result['is_total_reflection']}")


