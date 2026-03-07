#!/usr/bin/env python3
"""
Master build script cho tất cả Python simulations
Chạy build.py trong mỗi thư mục simulation và copy output sang Next.js
"""

import os
import sys
import json
import shutil
import subprocess
from pathlib import Path

# Màu sắc cho terminal
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_header(text):
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{text}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}\n")

def print_success(text):
    print(f"{Colors.OKGREEN}✅ {text}{Colors.ENDC}")

def print_error(text):
    print(f"{Colors.FAIL}❌ {text}{Colors.ENDC}")

def print_info(text):
    print(f"{Colors.OKCYAN}ℹ️  {text}{Colors.ENDC}")

def find_simulations():
    """Tìm tất cả các thư mục simulation"""
    simulations = []
    base_dir = Path(__file__).parent
    
    # Danh sách các simulation cần build (theo thứ tự ưu tiên)
    simulation_order = [
        "refraction",
        "projectile", 
        "motion-tracking",
        "harmonic-motion",
        "ocr-simulation"  # Thêm OCR simulation
    ]
    
    # Thêm các simulation có sẵn theo thứ tự
    for sim_name in simulation_order:
        sim_path = base_dir / sim_name
        if sim_path.exists():
            manifest_path = sim_path / "manifest.json"
            build_path = sim_path / "build.py"
            
            if manifest_path.exists() and build_path.exists():
                simulations.append(sim_path)
    
    # Thêm các simulation khác (nếu có)
    for item in base_dir.iterdir():
        if item.is_dir() and not item.name.startswith('.') and not item.name.startswith('__'):
            if item not in simulations:
                manifest_path = item / "manifest.json"
                build_path = item / "build.py"
                
                if manifest_path.exists() and build_path.exists():
                    simulations.append(item)
    
    return simulations

def build_simulation(sim_path):
    """Build một simulation cụ thể"""
    sim_name = sim_path.name
    print_info(f"Building {sim_name}...")
    
    try:
        # Chạy build.py trong thư mục simulation
        result = subprocess.run(
            [sys.executable, "build.py"],
            cwd=sim_path,
            capture_output=True,
            text=True,
            check=True
        )
        
        # Hiển thị output
        if result.stdout:
            for line in result.stdout.strip().split('\n'):
                print(f"  {line}")
        
        # Kiểm tra output file
        output_file = sim_path / "output" / "data.json"
        if not output_file.exists():
            print_error(f"Output file not found: {output_file}")
            return False
        
        file_size = output_file.stat().st_size / 1024
        print_success(f"Built {sim_name} ({file_size:.2f} KB)")
        return True
        
    except subprocess.CalledProcessError as e:
        print_error(f"Build failed for {sim_name}")
        if e.stderr:
            print(f"  Error: {e.stderr}")
        return False
    except Exception as e:
        print_error(f"Unexpected error: {str(e)}")
        return False

def copy_to_nextjs(sim_path, nextjs_root):
    """Copy output sang Next.js public folder"""
    sim_name = sim_path.name
    source_file = sim_path / "output" / "data.json"
    source_manifest = sim_path / "manifest.json"
    
    # Đích: /app/public/labs/[sim_name]/
    dest_dir = nextjs_root / "public" / "labs" / sim_name
    dest_dir.mkdir(parents=True, exist_ok=True)
    
    try:
        # Copy data.json
        dest_data = dest_dir / "data.json"
        shutil.copy2(source_file, dest_data)
        
        # Copy manifest.json
        dest_manifest = dest_dir / "manifest.json"
        shutil.copy2(source_manifest, dest_manifest)
        
        print_success(f"Copied {sim_name} to {dest_dir}")
        return True
        
    except Exception as e:
        print_error(f"Failed to copy {sim_name}: {str(e)}")
        return False

def create_index_file(simulations, nextjs_root):
    """Tạo file index.json chứa danh sách tất cả simulations"""
    index_data = {
        "simulations": [],
        "total": len(simulations),
        "last_updated": None
    }
    
    for sim_path in simulations:
        manifest_path = sim_path / "manifest.json"
        
        try:
            with open(manifest_path, 'r', encoding='utf-8') as f:
                manifest = json.load(f)
                index_data["simulations"].append(manifest)
        except Exception as e:
            print_error(f"Failed to read manifest for {sim_path.name}: {str(e)}")
    
    # Lưu index.json
    index_path = nextjs_root / "public" / "labs" / "index.json"
    index_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Thêm timestamp
    from datetime import datetime
    index_data["last_updated"] = datetime.now().isoformat()
    
    try:
        with open(index_path, 'w', encoding='utf-8') as f:
            json.dump(index_data, f, ensure_ascii=False, indent=2)
        
        print_success(f"Created index file: {index_path}")
        return True
        
    except Exception as e:
        print_error(f"Failed to create index file: {str(e)}")
        return False

def main():
    print_header("🚀 LabTwin Python Simulations Builder")
    
    # Tìm thư mục gốc của Next.js
    base_dir = Path(__file__).parent
    nextjs_root = base_dir.parent  # Giả sử python-simulations nằm trong root của project
    
    if not nextjs_root.exists():
        print_error(f"Next.js root not found: {nextjs_root}")
        sys.exit(1)
    
    print_info(f"Python simulations: {base_dir}")
    print_info(f"Next.js root: {nextjs_root}")
    
    # Tìm tất cả simulations
    simulations = find_simulations()
    
    if not simulations:
        print_error("No simulations found!")
        sys.exit(1)
    
    print_info(f"Found {len(simulations)} simulation(s): {', '.join(s.name for s in simulations)}")
    
    # Build từng simulation
    print_header("📦 Building Simulations")
    
    built_count = 0
    failed_count = 0
    
    for sim_path in simulations:
        if build_simulation(sim_path):
            built_count += 1
        else:
            failed_count += 1
    
    print(f"\n{Colors.BOLD}Build Summary:{Colors.ENDC}")
    print(f"  ✅ Success: {built_count}")
    if failed_count > 0:
        print(f"  ❌ Failed: {failed_count}")
    
    if built_count == 0:
        print_error("No simulations were built successfully!")
        sys.exit(1)
    
    # Copy sang Next.js
    print_header("📋 Copying to Next.js")
    
    copied_count = 0
    for sim_path in simulations:
        if copy_to_nextjs(sim_path, nextjs_root):
            copied_count += 1
    
    print(f"\n{Colors.BOLD}Copy Summary:{Colors.ENDC}")
    print(f"  ✅ Copied: {copied_count}/{len(simulations)}")
    
    # Tạo index file
    print_header("📝 Creating Index")
    create_index_file(simulations, nextjs_root)
    
    # Tổng kết
    print_header("✨ Build Complete!")
    print(f"{Colors.OKGREEN}{Colors.BOLD}All simulations are ready!{Colors.ENDC}")
    print(f"\n{Colors.OKCYAN}Next steps:{Colors.ENDC}")
    print(f"  1. Start your Next.js dev server: npm run dev")
    print(f"  2. Visit: http://localhost:3000/dashboard/labtwin/labs")
    print(f"  3. Test the simulations!")
    print()

if __name__ == "__main__":
    main()


