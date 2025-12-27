#!/usr/bin/env python3
"""
Build All Labs - Tích hợp tất cả Python simulations vào LabTwin
Tự động tạo manifest, frontend pages, và API routes

Author: AI Assistant
Date: 2024-10-12
"""

import os
import json
import shutil
from pathlib import Path
from typing import Dict, List, Any

# Base paths
BASE_DIR = Path(__file__).parent
PROJECT_ROOT = BASE_DIR.parent
PUBLIC_LABS = PROJECT_ROOT / "public" / "labs"
APP_LABS = PROJECT_ROOT / "app" / "(dashboard)" / "(routes)" / "dashboard" / "labtwin" / "labs"
COMPONENTS_SIM = PROJECT_ROOT / "components" / "simulations"
API_ROUTES = PROJECT_ROOT / "app" / "api"

# Lab configurations
LAB_CONFIGS = {
    "aerodynamics": {
        "name": "Aerodynamics",
        "title": "Khí động lực học",
        "description": "Mô phỏng dòng chảy không khí và lực khí động",
        "category": "Cơ học",
        "level": "Nâng cao",
        "xp": 250,
        "icon": "Wind",
        "port": 8008
    },
    "aeroflow-3d": {
        "name": "AeroFlow 3D",
        "title": "Dòng chảy 3D nâng cao",
        "description": "Mô phỏng dòng chảy 3D với Taichi và WebGL",
        "category": "Cơ học",
        "level": "Nâng cao",
        "xp": 300,
        "icon": "Wind",
        "port": 8009
    },
    "biogrowth": {
        "name": "BioGrowth",
        "title": "Mô phỏng sinh trưởng",
        "description": "Mô phỏng tăng trưởng tế bào và quần thể",
        "category": "Sinh học",
        "level": "Trung bình",
        "xp": 180,
        "icon": "Activity",
        "port": 8001
    },
    "chemistry-lab": {
        "name": "Chemistry Lab",
        "title": "Phòng thí nghiệm hóa học",
        "description": "Thí nghiệm hóa học tương tác",
        "category": "Hóa học",
        "level": "Dễ",
        "xp": 120,
        "icon": "FlaskConical",
        "port": 8002
    },
    "chemlab-3d": {
        "name": "ChemLab 3D",
        "title": "Thí nghiệm hóa học ảo",
        "description": "Cân bằng phản ứng, nhiệt động học, phân tử 3D",
        "category": "Hóa học",
        "level": "Trung bình",
        "xp": 200,
        "icon": "FlaskConical",
        "port": 8015
    },
    "datasim-ai": {
        "name": "DataSim AI",
        "title": "Mô phỏng dữ liệu và AI",
        "description": "Tạo dữ liệu, huấn luyện AI, phân tích kết quả",
        "category": "Machine Learning",
        "level": "Nâng cao",
        "xp": 300,
        "icon": "Brain",
        "port": 8003
    },
    "harmonic-motion": {
        "name": "Harmonic Motion",
        "title": "Dao động điều hòa",
        "description": "Mô phỏng dao động điều hòa và sóng",
        "category": "Sóng",
        "level": "Trung bình",
        "xp": 180,
        "icon": "Waves",
        "port": 8010
    },
    "mechaforce": {
        "name": "MechaForce",
        "title": "Mô phỏng lực cơ học",
        "description": "Phân tích lực, mômen, chuyển động cơ học",
        "category": "Cơ học",
        "level": "Trung bình",
        "xp": 180,
        "icon": "Settings",
        "port": 8004
    },
    "motion-sim": {
        "name": "MotionSim",
        "title": "Mô phỏng chuyển động vật lý",
        "description": "Rơi tự do, ném xiên, dao động với AI",
        "category": "Cơ học",
        "level": "Trung bình",
        "xp": 200,
        "icon": "Activity",
        "port": 8014
    },
    "motion-tracking": {
        "name": "Motion Tracking",
        "title": "Theo dõi chuyển động",
        "description": "Phân tích và theo dõi chuyển động từ video",
        "category": "Computer Vision",
        "level": "Nâng cao",
        "xp": 250,
        "icon": "Camera",
        "port": 8011
    },
    "motionsim": {
        "name": "MotionSim Pro",
        "title": "Mô phỏng chuyển động nâng cao",
        "description": "Chuyển động phức tạp với va chạm và tương tác",
        "category": "Cơ học",
        "level": "Nâng cao",
        "xp": 250,
        "icon": "Activity",
        "port": 8005
    },
    "ocr-grading": {
        "name": "OCR Grading",
        "title": "Chấm điểm tự động bằng OCR",
        "description": "Nhận diện và chấm điểm bài thi tự động",
        "category": "Computer Vision",
        "level": "Nâng cao",
        "xp": 300,
        "icon": "Camera",
        "port": 8012
    },
    "ocr-simulation": {
        "name": "OCR Simulation",
        "title": "Mô phỏng nhận diện văn bản",
        "description": "Nhận diện văn bản từ hình ảnh với AI",
        "category": "Computer Vision",
        "level": "Trung bình",
        "xp": 200,
        "icon": "Camera",
        "port": 8000
    },
    "optics-lab": {
        "name": "Optics Lab",
        "title": "Phòng thí nghiệm quang học",
        "description": "Mô phỏng hiện tượng quang học và thấu kính",
        "category": "Quang học",
        "level": "Trung bình",
        "xp": 180,
        "icon": "Zap",
        "port": 8013
    },
    "physics-motion": {
        "name": "Physics Motion",
        "title": "Chuyển động vật lý cơ bản",
        "description": "Chuyển động thẳng, biến đổi, tròn đều",
        "category": "Cơ học",
        "level": "Dễ",
        "xp": 120,
        "icon": "Activity",
        "port": 8007
    },
    "projectile": {
        "name": "Projectile Motion",
        "title": "Chuyển động ném xiên",
        "description": "Mô phỏng chuyển động ném xiên và quỹ đạo",
        "category": "Cơ học",
        "level": "Dễ",
        "xp": 120,
        "icon": "Activity",
        "port": 8016
    },
    "refraction": {
        "name": "Refraction",
        "title": "Khúc xạ ánh sáng",
        "description": "Mô phỏng hiện tượng khúc xạ và phản xạ",
        "category": "Quang học",
        "level": "Dễ",
        "xp": 120,
        "icon": "Zap",
        "port": 8017
    },
    "thermoflow": {
        "name": "ThermoFlow",
        "title": "Nhiệt động lực học",
        "description": "Dòng nhiệt, truyền nhiệt, chu trình nhiệt động",
        "category": "Nhiệt học",
        "level": "Nâng cao",
        "xp": 250,
        "icon": "Flame",
        "port": 8006
    },
    "weather-sim": {
        "name": "Weather Analytics",
        "title": "Phân tích thời tiết thời gian thực",
        "description": "Dự báo bão, cảnh báo mưa, giám sát động đất",
        "category": "Khí tượng",
        "level": "Nâng cao",
        "xp": 250,
        "icon": "Wind",
        "port": 8018
    },
    "wfc-builder": {
        "name": "WFC Builder",
        "title": "Wave Function Collapse",
        "description": "Tạo nội dung procedural với thuật toán WFC",
        "category": "Procedural Generation",
        "level": "Nâng cao",
        "xp": 300,
        "icon": "Box",
        "port": 8019
    }
}

def create_manifest(lab_id: str, config: Dict[str, Any]) -> Dict[str, Any]:
    """Tạo manifest.json cho lab"""
    return {
        "id": lab_id,
        "name": config["name"],
        "title": config["title"],
        "description": config["description"],
        "version": "1.0.0",
        "category": config["category"],
        "level": config["level"],
        "difficulty": config["level"],
        "duration": "15-30 phút",
        "xp": config["xp"],
        "icon": config["icon"],
        "tags": [lab_id, config["category"].lower(), "simulation", "interactive"],
        "features": [
            "Interactive simulation",
            "Real-time calculations",
            "Visualization tools",
            "Parameter adjustment"
        ],
        "learning_objectives": [
            f"Hiểu {config['title'].lower()}",
            "Thực hành mô phỏng tương tác",
            "Phân tích kết quả thí nghiệm",
            "Áp dụng kiến thức thực tế"
        ],
        "backend": {
            "port": config["port"],
            "endpoints": [
                "/api/simulate",
                "/api/analyze",
                "/api/visualize"
            ]
        },
        "demo": {
            "features": [
                "Interactive controls",
                "Real-time visualization",
                "Parameter analysis",
                "Results export"
            ]
        }
    }

def create_frontend_page(lab_id: str, config: Dict[str, Any]) -> str:
    """Tạo frontend page cho lab"""
    return f'''"use client";

import React, {{ useState, useEffect }} from 'react';
import {{ Card, CardContent, CardHeader, CardTitle }} from "@/components/ui/card";
import {{ Button }} from "@/components/ui/button";
import {{ Badge }} from "@/components/ui/badge";
import {{ 
  {config['icon']}, 
  Play, 
  RotateCcw,
  Activity,
  Loader2
}} from "lucide-react";

export default function {config['name'].replace(' ', '')}Page() {{
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [loading, setLoading] = useState(false);

  useEffect(() => {{
    // Check backend status
    const checkBackend = async () => {{
      try {{
        const response = await fetch(`http://localhost:{config['port']}/api/health`);
        if (response.ok) {{
          setBackendStatus('online');
        }} else {{
          setBackendStatus('offline');
        }}
      }} catch (error) {{
        setBackendStatus('offline');
      }}
    }};

    checkBackend();
    const interval = setInterval(checkBackend, 10000);
    return () => clearInterval(interval);
  }}, []);

  const runSimulation = async () => {{
    setLoading(true);
    try {{
      // TODO: Implement simulation logic
      await new Promise(resolve => setTimeout(resolve, 2000));
    }} catch (error) {{
      console.error('Simulation error:', error);
    }}
    setLoading(false);
  }};

  return (
    <div className="container mx-auto p-6 space-y-6">
      <!-- Header -->
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3">
          <{config['icon']} className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">{config['title']}</h1>
        </div>
        <p className="text-lg text-muted-foreground">
          {config['description']}
        </p>
        
        <!-- Backend Status -->
        <div className="flex items-center justify-center space-x-2">
          <Badge 
            variant={{backendStatus === 'online' ? 'default' : 'destructive'}}
            className="flex items-center space-x-1"
          >
            <Activity className="h-3 w-3" />
            <span>
              {{backendStatus === 'online' ? 'Backend Online' : 
               backendStatus === 'offline' ? 'Backend Offline' : 'Checking...'}}
            </span>
          </Badge>
          <span className="text-sm text-muted-foreground">
            Port {config['port']}
          </span>
        </div>
      </div>

      <!-- Main Simulation -->
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Play className="h-5 w-5" />
            <span>Simulation Controls</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-8">
            <{config['icon']} className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Ready to Simulate</h3>
            <p className="text-muted-foreground mb-4">
              Click the button below to start the simulation
            </p>
            <Button 
              onClick={{runSimulation}}
              disabled={{loading}}
              className="flex items-center space-x-2"
            >
              {{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}}
              <span>{{loading ? 'Running...' : 'Start Simulation'}}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <!-- Info Card -->
      <Card>
        <CardHeader>
          <CardTitle>About This Simulation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded">
              <div className="text-2xl mb-2">📚</div>
              <h4 className="font-semibold">Level</h4>
              <p className="text-sm text-muted-foreground">{{config['level']}}</p>
            </div>
            <div className="text-center p-4 border rounded">
              <div className="text-2xl mb-2">⭐</div>
              <h4 className="font-semibold">XP Reward</h4>
              <p className="text-sm text-muted-foreground">+{{config['xp']}} XP</p>
            </div>
            <div className="text-center p-4 border rounded">
              <div className="text-2xl mb-2">🔬</div>
              <h4 className="font-semibold">Category</h4>
              <p className="text-sm text-muted-foreground">{{config['category']}}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}}'''

def create_api_route(lab_id: str, config: Dict[str, Any]) -> str:
    """Tạo API route cho lab"""
    return f'''import {{ NextRequest, NextResponse }} from 'next/server';

export async function POST(request: NextRequest) {{
  try {{
    const body = await request.json();
    
    const response = await fetch(`http://localhost:{config['port']}/api/simulate`, {{
      method: 'POST',
      headers: {{
        'Content-Type': 'application/json',
      }},
      body: JSON.stringify(body),
    }});

    if (!response.ok) {{
      throw new Error(`Backend responded with ${{response.status}}`);
    }}

    const data = await response.json();
    return NextResponse.json(data);
  }} catch (error) {{
    console.error('{config['name']} API error:', error);
    return NextResponse.json(
      {{ 
        success: false, 
        error: 'Backend not available',
        message: '{config['name']} backend is not running on port {config['port']}'
      }},
      {{ status: 503 }}
    );
  }}
}}

export async function GET() {{
  try {{
    const response = await fetch(`http://localhost:{config['port']}/api/health`);
    
    if (!response.ok) {{
      throw new Error(`Backend responded with ${{response.status}}`);
    }}

    const data = await response.json();
    return NextResponse.json(data);
  }} catch (error) {{
    return NextResponse.json(
      {{ 
        success: false, 
        error: 'Backend not available',
        message: '{config['name']} backend is not running on port {config['port']}'
      }},
      {{ status: 503 }}
    );
  }}
}}'''

def build_all_labs():
    """Build tất cả labs"""
    print("🚀 Building All Labs for LabTwin...")
    print("=" * 60)
    
    # Tạo directories
    PUBLIC_LABS.mkdir(parents=True, exist_ok=True)
    APP_LABS.mkdir(parents=True, exist_ok=True)
    COMPONENTS_SIM.mkdir(parents=True, exist_ok=True)
    API_ROUTES.mkdir(parents=True, exist_ok=True)
    
    built_labs = []
    
    for lab_id, config in LAB_CONFIGS.items():
        print(f"📦 Building {config['name']}...")
        
        # 1. Tạo manifest.json
        manifest = create_manifest(lab_id, config)
        manifest_path = PUBLIC_LABS / lab_id / "manifest.json"
        manifest_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(manifest_path, 'w', encoding='utf-8') as f:
            json.dump(manifest, f, indent=2, ensure_ascii=False)
        
        # 2. Tạo frontend page
        page_content = create_frontend_page(lab_id, config)
        page_path = APP_LABS / lab_id / "page.tsx"
        page_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(page_path, 'w', encoding='utf-8') as f:
            f.write(page_content)
        
        # 3. Tạo API route
        api_content = create_api_route(lab_id, config)
        api_path = API_ROUTES / lab_id / "route.ts"
        api_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(api_path, 'w', encoding='utf-8') as f:
            f.write(api_content)
        
        built_labs.append({
            "id": lab_id,
            "name": config["name"],
            "category": config["category"],
            "level": config["level"],
            "xp": config["xp"],
            "port": config["port"]
        })
        
        print(f"   ✅ {config['name']} - Port {config['port']}")
    
    # 4. Tạo index.json cho labs page
    index_data = {
        "simulations": built_labs,
        "total": len(built_labs),
        "last_updated": "2024-10-12T00:00:00Z",
        "categories": list(set(lab["category"] for lab in built_labs))
    }
    
    index_path = PUBLIC_LABS / "index.json"
    with open(index_path, 'w', encoding='utf-8') as f:
        json.dump(index_data, f, indent=2, ensure_ascii=False)
    
    print("=" * 60)
    print(f"✅ Built {len(built_labs)} labs successfully!")
    print()
    print("📊 Summary by Category:")
    
    # Group by category
    categories = {}
    for lab in built_labs:
        cat = lab["category"]
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(lab)
    
    for category, labs in categories.items():
        print(f"   {category}: {len(labs)} labs")
        for lab in labs:
            print(f"      • {lab['name']} (Port {lab['port']}, +{lab['xp']} XP)")
    
    print()
    print("🎯 Next Steps:")
    print("   1. Start backends: cd python-simulations && ./START_ALL_SIMULATIONS.sh")
    print("   2. Access LabTwin: http://localhost:3000/dashboard/labtwin/labs")
    print("   3. Test simulations individually")
    print()
    print("🚀 All labs are now integrated into LabTwin!")

if __name__ == "__main__":
    build_all_labs()
