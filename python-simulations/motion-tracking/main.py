"""
Mô phỏng Motion Tracking với Camera
Theo dõi chuyển động vật thể trong không gian 3D và ước lượng khoảng cách
"""

import numpy as np
import math

class MotionTrackingSimulation:
    def __init__(self, fps=24, focal_length=800, real_width=0.2):
        """
        Khởi tạo simulation motion tracking
        
        Args:
            fps: Frames per second
            focal_length: Tiêu cự camera (pixels)
            real_width: Chiều rộng thực của vật (meters)
        """
        self.fps = fps
        self.focal_length = focal_length
        self.real_width = real_width
        self.cx = 640  # Center X (image width / 2)
        self.cy = 360  # Center Y (image height / 2)
        
    def generate_trajectory(self, motion_type="parabolic", duration=2.0, initial_z=5.0):
        """
        Tạo quỹ đạo chuyển động
        
        Args:
            motion_type: Loại chuyển động (parabolic, linear, circular)
            duration: Thời gian (seconds)
            initial_z: Khoảng cách ban đầu (meters)
        """
        num_frames = int(duration * self.fps)
        t = np.linspace(0, duration, num_frames)
        
        trajectory_3d = []
        trajectory_2d = []
        
        if motion_type == "parabolic":
            # Chuyển động ném xiên
            v0 = 10  # m/s
            angle = 45 * np.pi / 180
            g = 9.8
            
            for ti in t:
                x = v0 * math.cos(angle) * ti
                y = v0 * math.sin(angle) * ti - 0.5 * g * ti**2
                z = initial_z + 0.5 * ti  # Di chuyển xa dần
                
                if y < 0:  # Chạm đất
                    y = 0
                
                trajectory_3d.append({
                    "t": round(float(ti), 3),
                    "x": round(float(x), 3),
                    "y": round(float(y), 3),
                    "z": round(float(z), 3)
                })
                
                # Project sang 2D (pixel coordinates)
                px = self.cx + (x * self.focal_length) / z
                py = self.cy - (y * self.focal_length) / z  # Y đảo ngược trong image
                width_px = (self.real_width * self.focal_length) / z
                
                trajectory_2d.append({
                    "t": round(float(ti), 3),
                    "px": round(float(px), 2),
                    "py": round(float(py), 2),
                    "width_px": round(float(width_px), 2)
                })
        
        elif motion_type == "linear":
            # Chuyển động thẳng đều
            for ti in t:
                x = 2 * ti
                y = 1.5
                z = initial_z + ti
                
                trajectory_3d.append({
                    "t": round(float(ti), 3),
                    "x": round(float(x), 3),
                    "y": round(float(y), 3),
                    "z": round(float(z), 3)
                })
                
                px = self.cx + (x * self.focal_length) / z
                py = self.cy - (y * self.focal_length) / z
                width_px = (self.real_width * self.focal_length) / z
                
                trajectory_2d.append({
                    "t": round(float(ti), 3),
                    "px": round(float(px), 2),
                    "py": round(float(py), 2),
                    "width_px": round(float(width_px), 2)
                })
        
        elif motion_type == "circular":
            # Chuyển động tròn
            radius = 3
            omega = 2 * np.pi / duration  # Angular velocity
            
            for ti in t:
                x = radius * math.cos(omega * ti)
                y = 1.5
                z = initial_z + radius * math.sin(omega * ti)
                
                trajectory_3d.append({
                    "t": round(float(ti), 3),
                    "x": round(float(x), 3),
                    "y": round(float(y), 3),
                    "z": round(float(z), 3)
                })
                
                px = self.cx + (x * self.focal_length) / z
                py = self.cy - (y * self.focal_length) / z
                width_px = (self.real_width * self.focal_length) / z
                
                trajectory_2d.append({
                    "t": round(float(ti), 3),
                    "px": round(float(px), 2),
                    "py": round(float(py), 2),
                    "width_px": round(float(width_px), 2)
                })
        
        return {
            "trajectory_3d": trajectory_3d,
            "trajectory_2d": trajectory_2d,
            "duration": duration,
            "num_frames": num_frames
        }
    
    def calculate_distance_from_width(self, width_px):
        """Tính khoảng cách Z từ chiều rộng pixel"""
        if width_px > 0:
            return (self.real_width * self.focal_length) / width_px
        return 0
    
    def to_dict(self, motion_type="parabolic"):
        """Chuyển đổi kết quả thành dictionary"""
        trajectory_data = self.generate_trajectory(motion_type)
        
        return {
            "fps": self.fps,
            "focal_length": self.focal_length,
            "real_width": self.real_width,
            "cx": self.cx,
            "cy": self.cy,
            "motion_type": motion_type,
            **trajectory_data
        }

def generate_presets():
    """Tạo các preset cho các loại object khác nhau"""
    return [
        {
            "id": "ball",
            "name": "⚽ Bóng đá",
            "icon": "⚽",
            "fps": 30,
            "real_width": 0.22,
            "description": "Tracking bóng đá với FPS cao"
        },
        {
            "id": "car",
            "name": "🚗 Xe hơi",
            "icon": "🚗",
            "fps": 25,
            "real_width": 1.8,
            "description": "Tracking xe hơi trên đường"
        },
        {
            "id": "person",
            "name": "🚶 Con người",
            "icon": "🚶",
            "fps": 24,
            "real_width": 0.5,
            "description": "Tracking chuyển động con người"
        },
        {
            "id": "bird",
            "name": "🐦 Chim bay",
            "icon": "🐦",
            "fps": 60,
            "real_width": 0.3,
            "description": "Tracking chim bay với FPS rất cao"
        },
        {
            "id": "drone",
            "name": "🛸 Drone",
            "icon": "🛸",
            "fps": 30,
            "real_width": 0.4,
            "description": "Tracking drone bay"
        }
    ]

def generate_motion_types():
    """Các loại chuyển động"""
    return [
        {
            "id": "parabolic",
            "name": "Chuyển động ném xiên",
            "description": "Quỹ đạo parabol với trọng lực",
            "icon": "📈"
        },
        {
            "id": "linear",
            "name": "Chuyển động thẳng",
            "description": "Di chuyển theo đường thẳng",
            "icon": "➡️"
        },
        {
            "id": "circular",
            "name": "Chuyển động tròn",
            "description": "Quỹ đạo hình tròn",
            "icon": "🔄"
        }
    ]

def generate_scenarios(motion_type="parabolic", preset="ball"):
    """Tạo scenarios cho animation"""
    presets_map = {p["id"]: p for p in generate_presets()}
    preset_data = presets_map.get(preset, presets_map["ball"])
    
    scenarios = []
    distances = [3, 5, 7, 10, 15]  # Khoảng cách ban đầu khác nhau
    
    for initial_z in distances:
        sim = MotionTrackingSimulation(
            fps=preset_data["fps"],
            focal_length=800,
            real_width=preset_data["real_width"]
        )
        
        data = sim.to_dict(motion_type)
        
        scenarios.append({
            "initial_z": initial_z,
            "data": data
        })
    
    return scenarios

if __name__ == "__main__":
    # Test simulation
    sim = MotionTrackingSimulation(fps=30, focal_length=800, real_width=0.22)
    result = sim.to_dict("parabolic")
    
    print("Mô phỏng Motion Tracking")
    print(f"FPS: {result['fps']}")
    print(f"Focal length: {result['focal_length']}px")
    print(f"Real width: {result['real_width']}m")
    print(f"Motion type: {result['motion_type']}")
    print(f"Duration: {result['duration']}s")
    print(f"Number of frames: {result['num_frames']}")
    print(f"3D points: {len(result['trajectory_3d'])}")
    print(f"2D points: {len(result['trajectory_2d'])}")

