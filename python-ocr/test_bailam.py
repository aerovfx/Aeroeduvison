#!/usr/bin/env python3
"""
Test OCR với ảnh bài làm thực tế
"""
from paddleocr import PaddleOCR
import cv2
import numpy as np
import time

print("="*70)
print("🧪 TEST OCR VỚI ẢNH BÀI LÀM THỰC TẾ")
print("="*70)
print()

# Load image
image_path = '/Users/vietchung/lmsmath/public/labs/ocr-grading/bailam.jpg'
print(f"📄 Đang đọc ảnh: {image_path}")

image = cv2.imread(image_path)
if image is None:
    print("❌ Không thể đọc ảnh!")
    exit(1)

h, w = image.shape[:2]
print(f"✅ Ảnh đã đọc: {w}x{h} pixels")
print()

# Initialize PaddleOCR
print("🚀 Khởi tạo PaddleOCR...")
start_init = time.time()
ocr = PaddleOCR(lang='en')
init_time = time.time() - start_init
print(f"✅ PaddleOCR sẵn sàng (khởi tạo: {init_time:.1f}s)")
print()

# Perform OCR
print("🔍 Đang nhận dạng text...")
start_ocr = time.time()
result = ocr.predict(image_path)
ocr_time = time.time() - start_ocr

print(f"✅ OCR hoàn thành (thời gian: {ocr_time:.1f}s)")
print()

# Parse results
if result and len(result) > 0:
    rec_texts = result[0].get('rec_texts', [])
    rec_scores = result[0].get('rec_scores', [])
    rec_polys = result[0].get('rec_polys', [])
    
    print("="*70)
    print(f"📊 KẾT QUẢ: Phát hiện {len(rec_texts)} vùng text")
    print("="*70)
    print()
    
    # Show all detected text
    for idx, (text, score) in enumerate(zip(rec_texts, rec_scores), 1):
        print(f"Dòng {idx:2d}: {text}")
        print(f"         Confidence: {score:.1%}")
        print()
    
    # Combine all text
    full_text = ' '.join(rec_texts)
    avg_score = np.mean(rec_scores) if rec_scores else 0
    
    print("="*70)
    print("📝 FULL TEXT:")
    print("="*70)
    print(full_text)
    print()
    print("="*70)
    print(f"📊 THỐNG KÊ:")
    print(f"   - Tổng số dòng: {len(rec_texts)}")
    print(f"   - Tổng ký tự: {len(full_text)}")
    print(f"   - Confidence trung bình: {avg_score:.1%}")
    print(f"   - Thời gian xử lý: {ocr_time:.1f}s")
    print("="*70)
    
    # Save visualization
    print()
    print("🎨 Vẽ kết quả lên ảnh...")
    vis_image = image.copy()
    
    for poly in rec_polys:
        if len(poly) >= 4:
            pts = poly.astype(np.int32)
            cv2.polylines(vis_image, [pts], True, (0, 255, 0), 2)
    
    output_path = '/tmp/bailam_detected.jpg'
    cv2.imwrite(output_path, vis_image)
    print(f"✅ Đã lưu kết quả visualization: {output_path}")
    
else:
    print("❌ Không phát hiện text nào!")

print()
print("🎉 Test hoàn thành!")
