#!/usr/bin/env python3
"""
Script to process uploaded image through OCR pipeline
Called by Next.js API route
"""

import sys
import json
import os
from pathlib import Path

# Add the current directory to Python path
sys.path.append(str(Path(__file__).parent))

from main import process_uploaded_image

def main():
    if len(sys.argv) != 2:
        print(json.dumps({"error": "Usage: python3 process_upload.py <image_path>"}))
        sys.exit(1)
    
    image_path = sys.argv[1]
    
    try:
        # Check if file exists
        if not os.path.exists(image_path):
            print(json.dumps({"error": f"Image file not found: {image_path}"}))
            sys.exit(1)
        
        # Read image file
        with open(image_path, 'rb') as f:
            image_data = f.read()
        
        # Get filename from path
        filename = os.path.basename(image_path)
        
        # Process through OCR pipeline
        result = process_uploaded_image(image_data, filename)
        
        # Output JSON result
        print(json.dumps(result, ensure_ascii=False, indent=2))
        
    except Exception as e:
        error_result = {
            "error": "OCR processing failed",
            "details": str(e),
            "image_path": image_path
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == "__main__":
    main()
