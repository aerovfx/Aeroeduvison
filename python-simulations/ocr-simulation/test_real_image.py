#!/usr/bin/env python3
"""
Test PaddleOCR with Real Student ID Card Image
"""

from ocr_pipeline_paddleocr import PaddleOCRPipeline, OCRConfig
import json

def main():
    print("=" * 80)
    print("🧪 TESTING PADDLEOCR WITH REAL STUDENT ID CARD")
    print("=" * 80)
    print()
    
    # Load real image
    image_path = "thesinhvien.jpg"
    print(f"📸 Loading image: {image_path}")
    
    try:
        with open(image_path, 'rb') as f:
            image_bytes = f.read()
        
        print(f"✅ Image loaded: {len(image_bytes)} bytes")
        print()
        
        # Configure PaddleOCR
        print("⚙️  Configuring PaddleOCR...")
        config = OCRConfig(
            min_text_confidence=0.5,      # Lower threshold for real images
            enable_preprocessing=True,     # Enable all preprocessing
            enable_rotation_correction=True,
            enable_noise_removal=True,
            enable_contrast_enhancement=True,
            use_gpu=False                  # Set to True if you have CUDA
        )
        print("✅ Configuration ready")
        print()
        
        # Initialize pipeline
        print("🚀 Initializing PaddleOCR Pipeline...")
        print("-" * 80)
        pipeline = PaddleOCRPipeline(config)
        print("-" * 80)
        print()
        
        # Run OCR
        print("🔍 Running OCR on real student ID card...")
        print("=" * 80)
        result = pipeline.run_pipeline(image_bytes, "thesinhvien.jpg")
        print("=" * 80)
        print()
        
        # Display results
        print("✅ OCR PROCESSING COMPLETE!")
        print("=" * 80)
        print()
        
        # Summary
        detection = result['detection_results']
        extraction = result['extracted_data']
        quality = result['quality_metrics']
        
        print("📊 SUMMARY:")
        print("-" * 80)
        print(f"  Total text regions: {detection['total_regions']}")
        print(f"  Average confidence: {detection['average_confidence']:.1%}")
        print(f"  Document type: {extraction['document_type']}")
        print(f"  Extracted fields: {extraction['total_fields']}")
        print(f"  Overall confidence: {quality['overall_confidence']:.1%}")
        print(f"  Completeness score: {quality['completeness_score']:.1%}")
        print()
        
        # Extracted text
        print("📝 ALL DETECTED TEXT:")
        print("-" * 80)
        for idx, region in enumerate(detection['text_regions'], 1):
            conf = region['confidence']
            text = region['text']
            lang = region['language']
            print(f"  {idx:2d}. [{conf:.3f}] [{lang}] {text}")
        print()
        
        # Extracted fields
        if extraction['fields']:
            print("📋 EXTRACTED STRUCTURED DATA:")
            print("-" * 80)
            for field_name, field_data in extraction['fields'].items():
                value = field_data['value']
                conf = field_data['confidence']
                print(f"  {field_name:15s}: {value} ({conf:.1%})")
            print()
        else:
            print("⚠️  No structured fields extracted (may need pattern tuning)")
            print()
        
        # Full text
        print("💬 COMPLETE TEXT (Combined):")
        print("-" * 80)
        full_text = " ".join([r['text'] for r in detection['text_regions']])
        print(f"  {full_text}")
        print()
        
        # Save results
        output_file = "thesinhvien_ocr_result.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        
        print(f"💾 Full results saved to: {output_file}")
        print()
        
        # Performance info
        print("⚡ PERFORMANCE:")
        print("-" * 80)
        print(f"  Engine: PaddleOCR 3.2.0")
        print(f"  Model: Chinese + Vietnamese support")
        print(f"  GPU: {'Enabled ⚡' if config.use_gpu else 'Disabled (CPU)'}")
        print(f"  Preprocessing: {'✅ Enabled' if config.enable_preprocessing else '❌ Disabled'}")
        print()
        
        print("=" * 80)
        print("🎉 REAL IMAGE OCR TEST SUCCESSFUL!")
        print("=" * 80)
        print()
        
        # Tips
        print("💡 TIPS TO IMPROVE RESULTS:")
        print("-" * 80)
        print("  1. Use higher resolution images (current: check metadata)")
        print("  2. Ensure good lighting and contrast")
        print("  3. Enable GPU for 10-50x faster processing")
        print("  4. Adjust min_text_confidence if too many/few detections")
        print("  5. Fine-tune regex patterns in ocr_pipeline_paddleocr.py")
        print()
        
    except FileNotFoundError:
        print(f"❌ ERROR: Image file not found: {image_path}")
        print("   Please ensure the file exists in the current directory")
    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()

