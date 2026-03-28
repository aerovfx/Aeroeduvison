#!/usr/bin/env python3
"""
Add Config to All Labs - Thêm config object vào tất cả lab pages
Author: AI Assistant
Date: 2024-10-12
"""

import os
import re
from pathlib import Path

# Base paths
BASE_DIR = Path(__file__).parent
APP_LABS = BASE_DIR / "app" / "(dashboard)" / "(routes)" / "dashboard" / "labtwin" / "labs"

# Lab configurations
LAB_CONFIGS = {
    "aerodynamics": {
        "name": "Aerodynamics",
        "title": "Khí động lực học",
        "description": "Mô phỏng dòng chảy không khí và lực khí động",
        "category": "Cơ học",
        "level": "Nâng cao",
        "xp": 250,
        "port": 8008
    },
    "aeroflow-3d": {
        "name": "AeroFlow 3D",
        "title": "Dòng chảy 3D nâng cao",
        "description": "Mô phỏng dòng chảy 3D với Taichi và WebGL",
        "category": "Cơ học",
        "level": "Nâng cao",
        "xp": 300,
        "port": 8009
    },
    "biogrowth": {
        "name": "BioGrowth",
        "title": "Mô phỏng sinh trưởng",
        "description": "Mô phỏng tăng trưởng tế bào và quần thể",
        "category": "Sinh học",
        "level": "Trung bình",
        "xp": 180,
        "port": 8001
    },
    "chemistry-lab": {
        "name": "Chemistry Lab",
        "title": "Phòng thí nghiệm hóa học",
        "description": "Thí nghiệm hóa học tương tác",
        "category": "Hóa học",
        "level": "Dễ",
        "xp": 120,
        "port": 8002
    },
    "chemlab-3d": {
        "name": "ChemLab 3D",
        "title": "Thí nghiệm hóa học ảo",
        "description": "Cân bằng phản ứng, nhiệt động học, phân tử 3D",
        "category": "Hóa học",
        "level": "Trung bình",
        "xp": 200,
        "port": 8015
    },
    "datasim-ai": {
        "name": "DataSim AI",
        "title": "Mô phỏng dữ liệu và AI",
        "description": "Tạo dữ liệu, huấn luyện AI, phân tích kết quả",
        "category": "Machine Learning",
        "level": "Nâng cao",
        "xp": 300,
        "port": 8003
    },
    "harmonic-motion": {
        "name": "Harmonic Motion",
        "title": "Dao động điều hòa",
        "description": "Mô phỏng dao động điều hòa và sóng",
        "category": "Sóng",
        "level": "Trung bình",
        "xp": 180,
        "port": 8010
    },
    "mechaforce": {
        "name": "MechaForce",
        "title": "Mô phỏng lực cơ học",
        "description": "Phân tích lực, mômen, chuyển động cơ học",
        "category": "Cơ học",
        "level": "Trung bình",
        "xp": 180,
        "port": 8004
    },
    "motion-sim": {
        "name": "MotionSim",
        "title": "Mô phỏng chuyển động vật lý",
        "description": "Rơi tự do, ném xiên, dao động với AI",
        "category": "Cơ học",
        "level": "Trung bình",
        "xp": 200,
        "port": 8014
    },
    "motion-tracking": {
        "name": "Motion Tracking",
        "title": "Theo dõi chuyển động",
        "description": "Phân tích và theo dõi chuyển động từ video",
        "category": "Computer Vision",
        "level": "Nâng cao",
        "xp": 250,
        "port": 8011
    },
    "motionsim": {
        "name": "MotionSim Pro",
        "title": "Mô phỏng chuyển động nâng cao",
        "description": "Chuyển động phức tạp với va chạm và tương tác",
        "category": "Cơ học",
        "level": "Nâng cao",
        "xp": 250,
        "port": 8005
    },
    "ocr-grading": {
        "name": "OCR Grading",
        "title": "Chấm điểm tự động bằng OCR",
        "description": "Nhận diện và chấm điểm bài thi tự động",
        "category": "Computer Vision",
        "level": "Nâng cao",
        "xp": 300,
        "port": 8012
    },
    "ocr-simulation": {
        "name": "OCR Simulation",
        "title": "Mô phỏng nhận diện văn bản",
        "description": "Nhận diện văn bản từ hình ảnh với AI",
        "category": "Computer Vision",
        "level": "Trung bình",
        "xp": 200,
        "port": 8000
    },
    "optics-lab": {
        "name": "Optics Lab",
        "title": "Phòng thí nghiệm quang học",
        "description": "Mô phỏng hiện tượng quang học và thấu kính",
        "category": "Quang học",
        "level": "Trung bình",
        "xp": 180,
        "port": 8013
    },
    "physics-motion": {
        "name": "Physics Motion",
        "title": "Chuyển động vật lý cơ bản",
        "description": "Chuyển động thẳng, biến đổi, tròn đều",
        "category": "Cơ học",
        "level": "Dễ",
        "xp": 120,
        "port": 8007
    },
    "projectile": {
        "name": "Projectile Motion",
        "title": "Chuyển động ném xiên",
        "description": "Mô phỏng chuyển động ném xiên và quỹ đạo",
        "category": "Cơ học",
        "level": "Dễ",
        "xp": 120,
        "port": 8016
    },
    "refraction": {
        "name": "Refraction",
        "title": "Khúc xạ ánh sáng",
        "description": "Mô phỏng hiện tượng khúc xạ và phản xạ",
        "category": "Quang học",
        "level": "Dễ",
        "xp": 120,
        "port": 8017
    },
    "thermoflow": {
        "name": "ThermoFlow",
        "title": "Nhiệt động lực học",
        "description": "Dòng nhiệt, truyền nhiệt, chu trình nhiệt động",
        "category": "Nhiệt học",
        "level": "Nâng cao",
        "xp": 250,
        "port": 8006
    },
    "weather-sim": {
        "name": "Weather Analytics",
        "title": "Phân tích thời tiết thời gian thực",
        "description": "Dự báo bão, cảnh báo mưa, giám sát động đất",
        "category": "Khí tượng",
        "level": "Nâng cao",
        "xp": 250,
        "port": 8018
    },
    "wfc-builder": {
        "name": "WFC Builder",
        "title": "Wave Function Collapse",
        "description": "Tạo nội dung procedural với thuật toán WFC",
        "category": "Procedural Generation",
        "level": "Nâng cao",
        "xp": 300,
        "port": 8019
    }
}

def add_config_to_file(file_path: Path):
    """Add config object to a lab file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Get lab ID from path
        lab_id = file_path.parent.name
        
        if lab_id not in LAB_CONFIGS:
            print(f"⚠️  No config found for {lab_id}")
            return False
        
        config = LAB_CONFIGS[lab_id]
        
        # Check if config already exists
        if 'const config = {' in content:
            print(f"ℹ️  Config already exists in {lab_id}")
            return False
        
        # Find the function start
        function_pattern = r'export default function (\w+)\(\) \{'
        match = re.search(function_pattern, content)
        
        if not match:
            print(f"❌ Could not find function in {lab_id}")
            return False
        
        function_name = match.group(1)
        
        # Find the state declarations
        state_pattern = r'const \[loading, setLoading\] = useState\(false\);'
        state_match = re.search(state_pattern, content)
        
        if not state_match:
            print(f"❌ Could not find state declarations in {lab_id}")
            return False
        
        # Insert config after state declarations
        config_code = f'''  const [loading, setLoading] = useState(false);
  
  // Lab configuration
  const config = {{
    name: "{config['name']}",
    title: "{config['title']}",
    description: "{config['description']}",
    category: "{config['category']}",
    level: "{config['level']}",
    xp: {config['xp']},
    port: {config['port']}
  }};'''
        
        # Replace the state declarations with state + config
        new_content = content.replace(
            '  const [loading, setLoading] = useState(false);',
            config_code
        )
        
        # Write back to file
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        print(f"✅ Added config to {lab_id}")
        return True
        
    except Exception as e:
        print(f"❌ Error adding config to {file_path.name}: {e}")
        return False

def main():
    """Add config to all lab pages"""
    print("🔧 Adding config to all lab pages...")
    print("=" * 50)
    
    fixed_count = 0
    total_count = 0
    
    # Find all TSX files
    for tsx_file in APP_LABS.rglob("*.tsx"):
        if tsx_file.name == "page.tsx":
            total_count += 1
            if add_config_to_file(tsx_file):
                fixed_count += 1
    
    print("=" * 50)
    print(f"✅ Added config to {fixed_count}/{total_count} files")
    print("🚀 All labs now have config!")

if __name__ == "__main__":
    main()
