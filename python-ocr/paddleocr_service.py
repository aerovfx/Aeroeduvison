from paddleocr import PaddleOCR
import numpy as np
import cv2

# Initialize PaddleOCR once (lang='en' works well for Vietnamese)
ocr = PaddleOCR(lang='en')

def process_image_for_ocr(image_bytes):
    """
    Process image with PaddleOCR
    
    Args:
        image_bytes: Image data in bytes
        
    Returns:
        dict with text, confidence, and boxes
    """
    # Decode image
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        raise ValueError("Could not decode image")

    # Preprocessing (optional)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    # You can add more preprocessing here if needed

    # Save temporarily for OCR
    temp_path = '/tmp/ocr_temp.jpg'
    cv2.imwrite(temp_path, img)

    # Perform OCR using new API
    result = ocr.predict(temp_path)

    extracted_text = ""
    confidence_scores = []
    bounding_boxes = []

    if result and len(result) > 0:
        # Access results using new format
        rec_texts = result[0].get('rec_texts', [])
        rec_scores = result[0].get('rec_scores', [])
        rec_polys = result[0].get('rec_polys', [])
        
        for idx, (text, score) in enumerate(zip(rec_texts, rec_scores)):
            extracted_text += text + " "
            confidence_scores.append(score)
            
            # Get bounding box if available
            box_coords = rec_polys[idx].tolist() if idx < len(rec_polys) else []
            bounding_boxes.append({
                "text": text,
                "confidence": float(score),
                "coordinates": box_coords
            })

    avg_confidence = np.mean(confidence_scores) if confidence_scores else 0

    return {
        "text": extracted_text.strip(),
        "confidence": float(avg_confidence),
        "boxes": bounding_boxes
    }

if __name__ == '__main__':
    # Test
    import sys
    if len(sys.argv) > 1:
        with open(sys.argv[1], 'rb') as f:
            result = process_image_for_ocr(f.read())
            print(f"Text: {result['text']}")
            print(f"Confidence: {result['confidence']:.1%}")
    else:
        print("Usage: python paddleocr_service.py <image_path>")
