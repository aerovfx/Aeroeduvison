#!/usr/bin/env python3
"""
Build script for OCR Simulation V2
Generates sample data using enhanced OCR pipeline
"""

import os
import json
import shutil
from pathlib import Path
import cv2
import numpy as np

# Import enhanced pipeline
from ocr_pipeline_v2 import (
    process_uploaded_image,
    OCRConfig,
    DocumentType
)

# Define paths
CURRENT_DIR = Path(__file__).parent
OUTPUT_DIR = CURRENT_DIR / "output"
DATA_FILE = OUTPUT_DIR / "data.json"

# Colors for terminal output
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
    print(f"{Colors.HEADER}{Colors.BOLD}{text:^60}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}\n")

def print_info(text):
    print(f"{Colors.OKCYAN}ℹ  {text}{Colors.ENDC}")

def print_success(text):
    print(f"{Colors.OKGREEN}✓  {text}{Colors.ENDC}")

def print_warning(text):
    print(f"{Colors.WARNING}⚠  {text}{Colors.ENDC}")

def print_error(text):
    print(f"{Colors.FAIL}✗  {text}{Colors.ENDC}")

def create_sample_images():
    """Create sample images for different document types"""
    
    samples = []
    
    # Sample 1: Student ID Card
    img1 = np.ones((800, 600, 3), dtype=np.uint8) * 240
    # Add header background
    cv2.rectangle(img1, (0, 0), (600, 120), (200, 220, 255), -1)
    cv2.putText(img1, "HANOI UNIVERSITY", (80, 70), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (20, 20, 80), 3)
    cv2.rectangle(img1, (30, 140), (570, 380), (255, 255, 255), -1)
    cv2.rectangle(img1, (30, 140), (570, 380), (150, 150, 150), 2)
    cv2.putText(img1, "Student ID: 20210001", (60, 200), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 0), 2)
    cv2.putText(img1, "Name: Nguyen Van A", (60, 260), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2)
    cv2.putText(img1, "Class: CS-K66", (60, 320), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    
    path1 = CURRENT_DIR / "sample_student_id.png"
    cv2.imwrite(str(path1), img1)
    samples.append(("student_id_card", path1, "Thẻ sinh viên"))
    
    # Sample 2: Academic Transcript
    img2 = np.ones((900, 700, 3), dtype=np.uint8) * 245
    cv2.rectangle(img2, (0, 0), (700, 100), (220, 240, 255), -1)
    cv2.putText(img2, "ACADEMIC TRANSCRIPT", (120, 65), cv2.FONT_HERSHEY_SIMPLEX, 1.3, (20, 20, 100), 3)
    cv2.rectangle(img2, (40, 130), (660, 500), (255, 255, 255), -1)
    cv2.rectangle(img2, (40, 130), (660, 500), (150, 150, 150), 2)
    cv2.putText(img2, "Student ID: 20210002", (70, 200), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 0), 2)
    cv2.putText(img2, "Name: Tran Thi B", (70, 260), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2)
    cv2.putText(img2, "GPA: 3.75/4.00", (70, 320), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2)
    cv2.putText(img2, "Faculty: Computer Science", (70, 380), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    cv2.putText(img2, "Course: AI & Machine Learning", (70, 440), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    
    path2 = CURRENT_DIR / "sample_transcript.png"
    cv2.imwrite(str(path2), img2)
    samples.append(("academic_transcript", path2, "Bảng điểm học tập"))
    
    # Sample 3: Official Document
    img3 = np.ones((800, 600, 3), dtype=np.uint8) * 242
    cv2.rectangle(img3, (0, 0), (600, 100), (255, 220, 200), -1)
    cv2.putText(img3, "OFFICIAL DOCUMENT", (110, 65), cv2.FONT_HERSHEY_SIMPLEX, 1.1, (100, 50, 20), 3)
    cv2.rectangle(img3, (35, 130), (565, 400), (255, 255, 255), -1)
    cv2.rectangle(img3, (35, 130), (565, 400), (150, 150, 150), 2)
    cv2.putText(img3, "HUST - Hanoi University", (60, 200), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2)
    cv2.putText(img3, "Date: 10/12/2024", (60, 260), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2)
    cv2.putText(img3, "Reference: DOC-2024-001", (60, 320), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    cv2.putText(img3, "Issued by: Admin Office", (60, 370), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 2)
    
    path3 = CURRENT_DIR / "sample_official_doc.png"
    cv2.imwrite(str(path3), img3)
    samples.append(("official_document", path3, "Tài liệu chính thức"))
    
    return samples

def build():
    """Main build function"""
    print_header("OCR Simulation V2 - Build Process")
    
    # Clean up previous output
    if OUTPUT_DIR.exists():
        shutil.rmtree(OUTPUT_DIR)
        print_info(f"Cleaned up previous output: {OUTPUT_DIR}")
    
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    print_success(f"Created output directory: {OUTPUT_DIR}")
    
    # Create sample images
    print_info("Creating sample images...")
    samples = create_sample_images()
    print_success(f"Created {len(samples)} sample images")
    
    # Process each sample
    all_results = []
    
    # Create config
    config = OCRConfig(
        min_text_confidence=0.7,
        enable_preprocessing=True,
        enable_rotation_correction=True,
        enable_noise_removal=True
    )
    
    print_info("\nProcessing samples through OCR pipeline...")
    
    for scenario_id, image_path, scenario_name in samples:
        print(f"\n{Colors.OKBLUE}{'─'*60}{Colors.ENDC}")
        print_info(f"Processing: {scenario_name}")
        
        try:
            # Read image
            with open(image_path, 'rb') as f:
                image_data = f.read()
            
            # Process through OCR pipeline
            result = process_uploaded_image(
                image_data,
                image_path.name,
                config
            )
            
            # Add scenario info
            all_results.append({
                "scenario_id": scenario_id,
                "scenario_name": scenario_name,
                "data": result
            })
            
            print_success(f"Completed: {scenario_name}")
            print_info(f"  - Document Type: {result['extracted_data']['document_type']}")
            print_info(f"  - Fields Extracted: {result['extracted_data']['total_fields']}")
            print_info(f"  - Confidence: {result['extracted_data']['confidence_score']:.2%}")
            
        except Exception as e:
            print_error(f"Failed to process {scenario_name}: {str(e)}")
    
    # Write output
    print(f"\n{Colors.OKBLUE}{'─'*60}{Colors.ENDC}")
    print_info("Writing output data...")
    
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(all_results, f, ensure_ascii=False, indent=2)
    
    print_success(f"Output written to: {DATA_FILE}")
    
    # Generate summary
    print_header("Build Summary")
    
    file_size = DATA_FILE.stat().st_size
    print_info(f"Output file size: {file_size:,} bytes ({file_size / 1024:.2f} KB)")
    print_info(f"Total scenarios: {len(all_results)}")
    
    for result in all_results:
        scenario_name = result['scenario_name']
        data = result['data']
        fields = data['extracted_data']['total_fields']
        confidence = data['extracted_data']['confidence_score']
        
        print_success(f"{scenario_name}: {fields} fields, {confidence:.2%} confidence")
    
    # Cleanup sample images
    print_info("\nCleaning up sample images...")
    for _, image_path, _ in samples:
        if image_path.exists():
            image_path.unlink()
    print_success("Sample images cleaned up")
    
    print(f"\n{Colors.OKGREEN}{Colors.BOLD}{'='*60}{Colors.ENDC}")
    print(f"{Colors.OKGREEN}{Colors.BOLD}{'✓ BUILD COMPLETED SUCCESSFULLY':^60}{Colors.ENDC}")
    print(f"{Colors.OKGREEN}{Colors.BOLD}{'='*60}{Colors.ENDC}\n")

if __name__ == "__main__":
    try:
        build()
    except Exception as e:
        print_error(f"Build failed: {str(e)}")
        import traceback
        traceback.print_exc()
        exit(1)
