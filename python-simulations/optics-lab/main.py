"""
Phòng thí nghiệm Quang học ảo (Virtual Optics Laboratory)
Mô phỏng: Khúc xạ, Phản xạ, Tán sắc ánh sáng, Lăng kính
FastAPI backend với Canvas 2D frontend
"""

import numpy as np
import math
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass, asdict

@dataclass
class Ray:
    """Đại diện cho một tia sáng"""
    start: Tuple[float, float]
    end: Tuple[float, float]
    color: str = "#FFFF00"  # Vàng mặc định
    intensity: float = 1.0
    wavelength: float = 580  # nm (vàng)
    
    def to_dict(self):
        return {
            "start": {"x": round(self.start[0], 2), "y": round(self.start[1], 2)},
            "end": {"x": round(self.end[0], 2), "y": round(self.end[1], 2)},
            "color": self.color,
            "intensity": round(self.intensity, 3),
            "wavelength": round(self.wavelength, 1)
        }

class OpticsSimulation:
    """Lớp cơ sở cho các mô phỏng quang học"""
    
    # Chiết suất của các môi trường phổ biến
    MATERIALS = {
        "vacuum": {"n": 1.0, "name": "Chân không", "color": "#000000"},
        "air": {"n": 1.000293, "name": "Không khí", "color": "#E0F2FE"},
        "water": {"n": 1.333, "name": "Nước", "color": "#0EA5E9"},
        "glass": {"n": 1.5, "name": "Thủy tinh", "color": "#60A5FA"},
        "diamond": {"n": 2.42, "name": "Kim cương", "color": "#E0E7FF"},
        "oil": {"n": 1.47, "name": "Dầu", "color": "#FCD34D"},
        "alcohol": {"n": 1.36, "name": "Cồn", "color": "#BAE6FD"},
        "ice": {"n": 1.31, "name": "Băng", "color": "#DBEAFE"}
    }
    
    # Màu sắc theo bước sóng (phổ khả kiến)
    @staticmethod
    def wavelength_to_color(wavelength: float) -> str:
        """Chuyển bước sóng (nm) sang màu RGB"""
        # Phổ khả kiến: 380-780 nm
        if wavelength < 380:
            return "#8B00FF"  # Tử ngoại
        elif wavelength < 450:
            return "#8B00FF"  # Tím
        elif wavelength < 495:
            return "#0000FF"  # Xanh dương
        elif wavelength < 570:
            return "#00FF00"  # Xanh lá
        elif wavelength < 590:
            return "#FFFF00"  # Vàng
        elif wavelength < 620:
            return "#FFA500"  # Cam
        elif wavelength < 750:
            return "#FF0000"  # Đỏ
        else:
            return "#8B0000"  # Hồng ngoại
    
    @staticmethod
    def wavelength_to_refractive_index(wavelength: float, material: str = "glass") -> float:
        """
        Tính chiết suất phụ thuộc bước sóng (tán sắc)
        Sử dụng công thức Cauchy đơn giản
        """
        base_n = OpticsSimulation.MATERIALS[material]["n"]
        
        # Công thức Cauchy: n(λ) = A + B/λ²
        # Cho thủy tinh: tán sắc khoảng 0.01-0.02
        wavelength_um = wavelength / 1000  # Chuyển sang micromet
        dispersion = 0.015 / (wavelength_um ** 2)
        
        return base_n + dispersion

class RefractionSimulation(OpticsSimulation):
    """Mô phỏng khúc xạ ánh sáng"""
    
    def __init__(self, n1: float = 1.0, n2: float = 1.33, 
                 angle_deg: float = 30, wavelength: float = 580):
        """
        Args:
            n1: Chiết suất môi trường 1
            n2: Chiết suất môi trường 2
            angle_deg: Góc tới (độ)
            wavelength: Bước sóng (nm)
        """
        self.n1 = n1
        self.n2 = n2
        self.angle_in = math.radians(angle_deg)
        self.wavelength = wavelength
        self.angle_out = None
        self.is_total_reflection = False
        
    def calculate_snell(self) -> Optional[float]:
        """Tính toán theo định luật Snell: n1*sin(θ1) = n2*sin(θ2)"""
        sin_angle_out = (self.n1 * math.sin(self.angle_in)) / self.n2
        
        if abs(sin_angle_out) > 1.0:
            self.is_total_reflection = True
            self.angle_out = None
            return None
        else:
            self.angle_out = math.asin(sin_angle_out)
            self.is_total_reflection = False
            return self.angle_out
    
    def get_critical_angle(self) -> Optional[float]:
        """Tính góc tới hạn (khi có phản xạ toàn phần)"""
        if self.n2 >= self.n1:
            return None
        return math.asin(self.n2 / self.n1)
    
    def get_rays(self, interface_y: float = 0) -> List[Ray]:
        """Tạo các tia sáng"""
        self.calculate_snell()
        rays = []
        
        interface_point = (0, interface_y)
        incident_length = 150
        color = self.wavelength_to_color(self.wavelength)
        
        # Tia tới
        incident_start = (
            -incident_length * math.sin(self.angle_in),
            interface_y + incident_length * math.cos(self.angle_in)
        )
        rays.append(Ray(incident_start, interface_point, color, 1.0, self.wavelength))
        
        if self.is_total_reflection:
            # Phản xạ toàn phần
            reflected_end = (
                incident_length * math.sin(self.angle_in),
                interface_y + incident_length * math.cos(self.angle_in)
            )
            rays.append(Ray(interface_point, reflected_end, color, 1.0, self.wavelength))
        else:
            # Tia khúc xạ
            refracted_length = 150
            refracted_end = (
                refracted_length * math.sin(self.angle_out),
                interface_y - refracted_length * math.cos(self.angle_out)
            )
            rays.append(Ray(interface_point, refracted_end, color, 0.9, self.wavelength))
            
            # Tia phản xạ yếu (luôn có)
            reflected_end = (
                50 * math.sin(self.angle_in),
                interface_y + 50 * math.cos(self.angle_in)
            )
            rays.append(Ray(interface_point, reflected_end, color, 0.3, self.wavelength))
        
        return rays
    
    def to_dict(self) -> Dict:
        """Chuyển thành dictionary"""
        self.calculate_snell()
        rays = self.get_rays()
        critical_angle = self.get_critical_angle()
        
        return {
            "type": "refraction",
            "n1": round(self.n1, 4),
            "n2": round(self.n2, 4),
            "wavelength": round(self.wavelength, 1),
            "angle_in_deg": round(math.degrees(self.angle_in), 2),
            "angle_out_deg": round(math.degrees(self.angle_out), 2) if self.angle_out else None,
            "is_total_reflection": self.is_total_reflection,
            "critical_angle_deg": round(math.degrees(critical_angle), 2) if critical_angle else None,
            "rays": [ray.to_dict() for ray in rays]
        }

class ReflectionSimulation(OpticsSimulation):
    """Mô phỏng phản xạ ánh sáng"""
    
    def __init__(self, angle_deg: float = 30, is_diffuse: bool = False):
        """
        Args:
            angle_deg: Góc tới (độ)
            is_diffuse: Phản xạ khuếch tán hay phản xạ gương?
        """
        self.angle_in = math.radians(angle_deg)
        self.is_diffuse = is_diffuse
    
    def get_rays(self, mirror_y: float = 0) -> List[Ray]:
        """Tạo các tia phản xạ"""
        rays = []
        interface_point = (0, mirror_y)
        length = 150
        
        # Tia tới
        incident_start = (
            -length * math.sin(self.angle_in),
            mirror_y + length * math.cos(self.angle_in)
        )
        rays.append(Ray(incident_start, interface_point, "#FFFF00", 1.0))
        
        if self.is_diffuse:
            # Phản xạ khuếch tán - nhiều tia phản xạ khác hướng
            num_reflected = 8
            for i in range(num_reflected):
                angle = math.radians(i * 180 / (num_reflected - 1))
                reflected_end = (
                    length * 0.6 * math.sin(angle),
                    mirror_y + length * 0.6 * math.cos(angle)
                )
                intensity = 0.3 + 0.7 * (1 - abs(i - num_reflected/2) / (num_reflected/2))
                rays.append(Ray(interface_point, reflected_end, "#FFFF00", intensity))
        else:
            # Phản xạ gương - góc phản xạ = góc tới
            reflected_end = (
                length * math.sin(self.angle_in),
                mirror_y + length * math.cos(self.angle_in)
            )
            rays.append(Ray(interface_point, reflected_end, "#FFFF00", 1.0))
        
        return rays
    
    def to_dict(self) -> Dict:
        """Chuyển thành dictionary"""
        rays = self.get_rays()
        
        return {
            "type": "reflection",
            "angle_in_deg": round(math.degrees(self.angle_in), 2),
            "angle_out_deg": round(math.degrees(self.angle_in), 2),
            "is_diffuse": self.is_diffuse,
            "rays": [ray.to_dict() for ray in rays]
        }

class PrismSimulation(OpticsSimulation):
    """Mô phỏng tán sắc ánh sáng qua lăng kính"""
    
    def __init__(self, apex_angle_deg: float = 60, n_prism: float = 1.5,
                 incident_angle_deg: float = 50):
        """
        Args:
            apex_angle_deg: Góc ở đỉnh của lăng kính (độ)
            n_prism: Chiết suất lăng kính
            incident_angle_deg: Góc tới (độ)
        """
        self.apex_angle = math.radians(apex_angle_deg)
        self.n_prism = n_prism
        self.incident_angle = math.radians(incident_angle_deg)
        
        # Các bước sóng của ánh sáng trắng (phổ khả kiến)
        self.wavelengths = {
            "red": 650,
            "orange": 600,
            "yellow": 580,
            "green": 530,
            "blue": 470,
            "violet": 420
        }
    
    def trace_ray_through_prism(self, wavelength: float) -> List[Tuple[float, float]]:
        """
        Theo dõi đường đi của tia sáng qua lăng kính
        
        Returns:
            List of points (x, y)
        """
        # Điều chỉnh chiết suất theo bước sóng (tán sắc)
        n = self.wavelength_to_refractive_index(wavelength, "glass")
        n1 = 1.0  # Không khí
        
        points = []
        
        # Điểm tới mặt thứ nhất (x=0)
        entry_point = (0, 0)
        points.append(entry_point)
        
        # Khúc xạ qua mặt thứ nhất
        sin_r1 = (n1 * math.sin(self.incident_angle)) / n
        if abs(sin_r1) > 1.0:
            return points  # Phản xạ toàn phần
        
        r1 = math.asin(sin_r1)
        
        # Góc tới mặt thứ hai
        i2 = self.apex_angle - r1
        
        # Khoảng cách trong lăng kính
        prism_length = 100
        internal_point = (
            prism_length * math.sin(r1),
            -prism_length * math.cos(r1)
        )
        points.append(internal_point)
        
        # Khúc xạ qua mặt thứ hai
        sin_r2 = (n * math.sin(i2)) / n1
        if abs(sin_r2) > 1.0:
            return points  # Phản xạ toàn phần
        
        r2 = math.asin(sin_r2)
        
        # Tia ló ra ngoài
        exit_length = 100
        angle_out = r2 - self.apex_angle + r1 + self.incident_angle
        exit_point = (
            internal_point[0] + exit_length * math.sin(angle_out),
            internal_point[1] - exit_length * math.cos(angle_out)
        )
        points.append(exit_point)
        
        return points
    
    def get_rays(self) -> List[Ray]:
        """Tạo các tia sáng cho tán sắc"""
        rays = []
        
        # Tia tới (ánh sáng trắng)
        incident_start = (
            -150 * math.sin(self.incident_angle),
            150 * math.cos(self.incident_angle)
        )
        rays.append(Ray(incident_start, (0, 0), "#FFFFFF", 1.0, 580))
        
        # Tán sắc - mỗi bước sóng đi theo đường khác nhau
        for color_name, wavelength in self.wavelengths.items():
            points = self.trace_ray_through_prism(wavelength)
            color = self.wavelength_to_color(wavelength)
            
            if len(points) >= 2:
                # Trong lăng kính
                rays.append(Ray(points[0], points[1], color, 0.8, wavelength))
                
            if len(points) >= 3:
                # Ra khỏi lăng kính
                rays.append(Ray(points[1], points[2], color, 1.0, wavelength))
        
        return rays
    
    def calculate_deviation_angle(self, wavelength: float) -> Optional[float]:
        """Tính góc lệch của tia sáng"""
        points = self.trace_ray_through_prism(wavelength)
        if len(points) < 3:
            return None
        
        # Góc lệch = góc giữa tia tới và tia ló
        # (Cần tính toán phức tạp hơn, đây là xấp xỉ)
        n = self.wavelength_to_refractive_index(wavelength, "glass")
        delta = (n - 1) * self.apex_angle  # Công thức đơn giản
        return delta
    
    def to_dict(self) -> Dict:
        """Chuyển thành dictionary"""
        rays = self.get_rays()
        
        # Tính góc lệch cho các màu
        deviations = {}
        for color_name, wavelength in self.wavelengths.items():
            delta = self.calculate_deviation_angle(wavelength)
            if delta:
                deviations[color_name] = round(math.degrees(delta), 2)
        
        return {
            "type": "prism",
            "apex_angle_deg": round(math.degrees(self.apex_angle), 2),
            "n_prism": round(self.n_prism, 4),
            "incident_angle_deg": round(math.degrees(self.incident_angle), 2),
            "rays": [ray.to_dict() for ray in rays],
            "deviations": deviations,
            "spectrum_colors": {name: self.wavelength_to_color(wl) 
                               for name, wl in self.wavelengths.items()}
        }

class LensSimulation(OpticsSimulation):
    """Mô phỏng thấu kính"""
    
    def __init__(self, focal_length: float = 100, object_distance: float = 150,
                 lens_type: str = "convex"):
        """
        Args:
            focal_length: Tiêu cự (cm)
            object_distance: Khoảng cách vật (cm)
            lens_type: "convex" (hội tụ) hoặc "concave" (phân kỳ)
        """
        self.f = focal_length if lens_type == "convex" else -focal_length
        self.d_o = object_distance
        self.lens_type = lens_type
        
    def calculate_image(self) -> Dict:
        """Tính vị trí và tính chất ảnh: 1/f = 1/d_o + 1/d_i"""
        try:
            d_i = 1 / (1/self.f - 1/self.d_o)
            magnification = -d_i / self.d_o
            
            return {
                "image_distance": round(d_i, 2),
                "magnification": round(magnification, 2),
                "is_real": d_i > 0,
                "is_inverted": magnification < 0,
                "image_type": "Ảnh thật" if d_i > 0 else "Ảnh ảo"
            }
        except ZeroDivisionError:
            return {
                "image_distance": float('inf'),
                "magnification": 0,
                "is_real": False,
                "is_inverted": False,
                "image_type": "Không có ảnh"
            }
    
    def get_rays(self) -> List[Ray]:
        """Tạo các tia sáng đặc trưng qua thấu kính"""
        rays = []
        lens_x = 0
        object_x = -self.d_o
        object_height = 50
        
        image_info = self.calculate_image()
        image_x = image_info["image_distance"]
        image_height = object_height * image_info["magnification"]
        
        # Tia 1: Song song với trục chính, qua tiêu điểm
        rays.append(Ray(
            (object_x, object_height),
            (lens_x, object_height),
            "#FF0000", 1.0
        ))
        
        if abs(self.f) < 1000:  # Tránh tiêu cự vô cùng
            rays.append(Ray(
                (lens_x, object_height),
                (self.f * 2, 0),
                "#FF0000", 0.8
            ))
        
        # Tia 2: Qua quang tâm, không đổi hướng
        rays.append(Ray(
            (object_x, object_height),
            (lens_x, 0),
            "#00FF00", 1.0
        ))
        
        if abs(image_x) < 500:
            rays.append(Ray(
                (lens_x, 0),
                (image_x, image_height),
                "#00FF00", 0.8
            ))
        
        # Tia 3: Qua tiêu điểm vật, ló ra song song
        if abs(self.f) < 1000:
            rays.append(Ray(
                (object_x, object_height),
                (-self.f, 0),
                "#0000FF", 1.0
            ))
            rays.append(Ray(
                (-self.f, 0),
                (lens_x, 0),
                "#0000FF", 0.8
            ))
        
        return rays
    
    def to_dict(self) -> Dict:
        """Chuyển thành dictionary"""
        image_info = self.calculate_image()
        rays = self.get_rays()
        
        return {
            "type": "lens",
            "lens_type": self.lens_type,
            "focal_length": round(self.f, 2),
            "object_distance": round(self.d_o, 2),
            "image_info": image_info,
            "rays": [ray.to_dict() for ray in rays]
        }

def generate_materials_list():
    """Tạo danh sách các môi trường"""
    return [
        {"id": key, **value} 
        for key, value in OpticsSimulation.MATERIALS.items()
    ]

def generate_wavelength_spectrum():
    """Tạo phổ bước sóng"""
    wavelengths = []
    for wl in range(380, 781, 10):
        wavelengths.append({
            "wavelength": wl,
            "color": OpticsSimulation.wavelength_to_color(wl)
        })
    return wavelengths

if __name__ == "__main__":
    print("=== PHÒNG THÍ NGHIỆM QUANG HỌC ẢO ===\n")
    
    # Test 1: Khúc xạ
    print("1. Khúc xạ ánh sáng:")
    refraction = RefractionSimulation(n1=1.0, n2=1.33, angle_deg=45)
    result = refraction.to_dict()
    print(f"   Góc tới: {result['angle_in_deg']}°")
    print(f"   Góc khúc xạ: {result['angle_out_deg']}°" if result['angle_out_deg'] else "   Phản xạ toàn phần")
    print(f"   Số tia: {len(result['rays'])}\n")
    
    # Test 2: Phản xạ
    print("2. Phản xạ ánh sáng:")
    reflection = ReflectionSimulation(angle_deg=30, is_diffuse=False)
    result = reflection.to_dict()
    print(f"   Góc tới: {result['angle_in_deg']}°")
    print(f"   Góc phản xạ: {result['angle_out_deg']}°")
    print(f"   Số tia: {len(result['rays'])}\n")
    
    # Test 3: Lăng kính
    print("3. Tán sắc qua lăng kính:")
    prism = PrismSimulation(apex_angle_deg=60, n_prism=1.5, incident_angle_deg=50)
    result = prism.to_dict()
    print(f"   Góc ở đỉnh: {result['apex_angle_deg']}°")
    print(f"   Số tia: {len(result['rays'])}")
    print(f"   Số màu tán sắc: {len(result['spectrum_colors'])}\n")
    
    # Test 4: Thấu kính
    print("4. Thấu kính:")
    lens = LensSimulation(focal_length=100, object_distance=150, lens_type="convex")
    result = lens.to_dict()
    print(f"   Tiêu cự: {result['focal_length']} cm")
    print(f"   Khoảng cách vật: {result['object_distance']} cm")
    print(f"   Khoảng cách ảnh: {result['image_info']['image_distance']} cm")
    print(f"   Loại ảnh: {result['image_info']['image_type']}")
    print(f"   Độ phóng đại: {result['image_info']['magnification']}")


