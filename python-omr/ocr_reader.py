"""
=============================================================================
OCR READER - Text Recognition for Vietnamese Exam Sheets
=============================================================================
Combines text detection (TextDetector) with OCR (Tesseract) for reading:
  - Student name (Họ và tên thí sinh)
  - Student ID / SBD (Số báo danh)
  - Exam code (Mã đề)
  - Part labels (PHẦN I, PHẦN II, PHẦN III)
  - Question numbers

Uses Tesseract OCR with preprocessing optimized for:
  - Printed Vietnamese text
  - Handwritten digits
  - Low-contrast scanned documents
=============================================================================
"""

import os
import re
import cv2
import numpy as np
import pytesseract
from dataclasses import dataclass
from typing import List, Optional, Tuple, Dict

from text_detector import TextDetector, TextRegion


# ─── Tesseract config ───
TESSDATA_PREFIX = os.environ.get(
    "TESSDATA_PREFIX",
    os.path.expanduser("~/.tessdata")
)
# Check if Vietnamese model available
_vie_available = os.path.exists(os.path.join(TESSDATA_PREFIX, "vie.traineddata"))
_default_lang = "vie+eng" if _vie_available else "eng"


@dataclass
class ExamInfo:
    """Extracted information from exam sheet header"""
    student_name: str = ""
    student_id: str = ""       # SBD (Số báo danh)
    exam_code: str = ""        # Mã đề
    birth_date: str = ""       # Ngày sinh
    exam_name: str = ""        # Tên kỳ thi
    school_name: str = ""      # Trường
    confidence: float = 0.0

    def to_dict(self) -> dict:
        return {
            "student_name": self.student_name,
            "student_id": self.student_id,
            "exam_code": self.exam_code,
            "birth_date": self.birth_date,
            "exam_name": self.exam_name,
            "school_name": self.school_name,
            "confidence": round(self.confidence, 3),
        }


class ExamOCRReader:
    """
    OCR reader specialized for Vietnamese exam answer sheets.
    Uses text detection + Tesseract for structured information extraction.
    """

    def __init__(self, lang: str = _default_lang):
        self.lang = lang
        self.detector = TextDetector(
            min_text_height=8,
            max_text_height=120,
            min_confidence=0.25,
        )

        # Tesseract configs for different content types
        self.config_text = f"--tessdata-dir {TESSDATA_PREFIX} --psm 7 -l {self.lang}"
        self.config_digits = f"--tessdata-dir {TESSDATA_PREFIX} --psm 7 -c tessedit_char_whitelist=0123456789"
        self.config_line = f"--tessdata-dir {TESSDATA_PREFIX} --psm 7 -l {self.lang}"
        self.config_block = f"--tessdata-dir {TESSDATA_PREFIX} --psm 6 -l {self.lang}"

    def read_exam_info(self, image: np.ndarray) -> ExamInfo:
        """
        Extract all header information from an exam sheet image.
        Expects a flattened/aligned image.
        """
        h, w = image.shape[:2]
        info = ExamInfo()

        # ─── Region extraction based on known template layout ───
        # Header area: top 30% of sheet
        header = image[0:int(h * 0.30), :]

        # Student name region: roughly x=35-82%, y=5-12%
        name_roi = image[int(h*0.05):int(h*0.12), int(w*0.35):int(w*0.82)]
        info.student_name = self._ocr_text_region(name_roi, "text")

        # SBD region: right side, x=65-80%, y=3-20%
        sbd_roi = image[int(h*0.03):int(h*0.20), int(w*0.65):int(w*0.82)]
        info.student_id = self._read_digit_grid(sbd_roi, expected_digits=6)

        # Exam code region: x=86-96%, y=3-20%
        code_roi = image[int(h*0.03):int(h*0.20), int(w*0.86):int(w*0.97)]
        info.exam_code = self._read_digit_grid(code_roi, expected_digits=3)

        # Birth date: roughly y=8-12%, x=15-35%
        birth_roi = image[int(h*0.08):int(h*0.12), int(w*0.15):int(w*0.35)]
        info.birth_date = self._ocr_text_region(birth_roi, "text")

        # Exam name: top rows
        exam_roi = image[0:int(h*0.04), int(w*0.2):int(w*0.8)]
        info.exam_name = self._ocr_text_region(exam_roi, "text")

        # Confidence based on how many fields we successfully read
        filled = sum([
            1 for v in [info.student_name, info.student_id, info.exam_code]
            if v and len(v) > 0
        ])
        info.confidence = filled / 3.0

        return info

    def read_text_regions(self, image: np.ndarray, max_ocr_regions: int = 30) -> List[TextRegion]:
        """
        Detect and OCR text regions in the image.
        Only OCRs the top `max_ocr_regions` by size/confidence for speed.
        Returns TextRegion objects with .text field populated where OCR ran.
        """
        regions = self.detector.detect(image)
        h, w = image.shape[:2]

        # Filter: only OCR regions in header area (top 35%) or large regions
        # This avoids OCR-ing hundreds of small bubble/marker regions
        header_regions = []
        other_regions = []
        for r in regions:
            if r.y < h * 0.35 or r.h > h * 0.02:
                header_regions.append(r)
            else:
                other_regions.append(r)

        # Sort header regions by area (largest first) and limit
        header_regions.sort(key=lambda r: r.w * r.h, reverse=True)
        ocr_targets = header_regions[:max_ocr_regions]

        for region in ocr_targets:
            roi = image[region.y:region.y+region.h, region.x:region.x+region.w]
            if roi.size == 0:
                continue
            if region.region_type == "number":
                region.text = self._ocr_single_pass(roi, "digits")
            else:
                region.text = self._ocr_single_pass(roi, "text")

        return regions

    def read_full_sheet(self, image: np.ndarray) -> dict:
        """
        Complete OCR pipeline: detect + read + structure.
        Optimized: only OCRs header info + top detected regions.
        """
        # Get exam header info (fixed ROI positions - fast)
        exam_info = self.read_exam_info(image)

        # Detect all text regions (fast, ~0.5s)
        regions = self.detector.detect(image)

        # Only OCR a subset of important regions for speed
        # Full OCR of all regions available via read_text_regions()
        return {
            "exam_info": exam_info.to_dict(),
            "text_regions": [r.to_dict() for r in regions if r.text],
            "all_regions_count": len(regions),
            "stats": {
                "total_regions": len(regions),
                "ocr_lang": self.lang,
                "vie_available": _vie_available,
            }
        }

    # ─────────────────────────────────────────────────────────────
    # Internal OCR methods
    # ─────────────────────────────────────────────────────────────

    def _ocr_single_pass(self, roi: np.ndarray, mode: str = "text") -> str:
        """Fast single-pass OCR with contrast enhancement only"""
        if roi.size == 0 or roi.shape[0] < 5 or roi.shape[1] < 5:
            return ""
        if len(roi.shape) == 3:
            gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        else:
            gray = roi.copy()
        enhanced = self._preprocess_for_ocr(gray, method="contrast")
        text = self._tesseract_ocr(enhanced, mode)
        return text.strip() if text else ""

    def _ocr_text_region(self, roi: np.ndarray, mode: str = "text") -> str:
        """OCR a single region with preprocessing"""
        if roi.size == 0 or roi.shape[0] < 5 or roi.shape[1] < 5:
            return ""

        # Convert to grayscale if needed
        if len(roi.shape) == 3:
            gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        else:
            gray = roi.copy()

        # ─── Multi-pass OCR with different preprocessing ───
        results = []

        # Pass 1: Direct OCR
        text1 = self._tesseract_ocr(gray, mode)
        if text1:
            results.append(text1)

        # Pass 2: Enhanced contrast
        enhanced = self._preprocess_for_ocr(gray, method="contrast")
        text2 = self._tesseract_ocr(enhanced, mode)
        if text2:
            results.append(text2)

        # Pass 3: Binarized
        binary = self._preprocess_for_ocr(gray, method="binary")
        text3 = self._tesseract_ocr(binary, mode)
        if text3:
            results.append(text3)

        # Pick the best result (longest meaningful text)
        if not results:
            return ""

        # For digits, prefer digit-only results
        if mode == "digits":
            digit_results = [r for r in results if re.match(r'^[\d\s]+$', r)]
            if digit_results:
                return max(digit_results, key=len).strip()

        return max(results, key=lambda r: len(r.strip())).strip()

    def _tesseract_ocr(self, gray: np.ndarray, mode: str = "text") -> str:
        """Run Tesseract OCR with appropriate config"""
        try:
            # Resize if too small
            h, w = gray.shape[:2]
            if h < 20:
                scale = 30 / h
                gray = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)

            config = self.config_digits if mode == "digits" else self.config_line

            text = pytesseract.image_to_string(gray, config=config)
            return text.strip()
        except Exception as e:
            return ""

    def _preprocess_for_ocr(self, gray: np.ndarray, method: str = "contrast") -> np.ndarray:
        """Preprocess image for better OCR results"""
        if method == "contrast":
            # CLAHE + sharpen
            clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(4, 4))
            enhanced = clahe.apply(gray)
            # Sharpen
            kernel = np.array([[-1, -1, -1], [-1, 9, -1], [-1, -1, -1]])
            enhanced = cv2.filter2D(enhanced, -1, kernel)
            return enhanced

        elif method == "binary":
            # Adaptive threshold
            binary = cv2.adaptiveThreshold(
                gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                cv2.THRESH_BINARY, 21, 10
            )
            return binary

        elif method == "otsu":
            _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            return binary

        return gray

    def _read_digit_grid(self, roi: np.ndarray, expected_digits: int = 6) -> str:
        """
        Read a digit grid (like SBD or exam code columns).
        Uses column analysis + per-digit OCR for higher accuracy.
        """
        if roi.size == 0:
            return ""

        if len(roi.shape) == 3:
            gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        else:
            gray = roi.copy()

        h, w = gray.shape[:2]

        # Method 1: Try full-region OCR for digits
        full_text = self._ocr_text_region(gray, "digits")
        digits_only = re.sub(r'[^\d]', '', full_text)

        if len(digits_only) == expected_digits:
            return digits_only

        # Method 2: Column-based digit detection
        # For SBD grid, each column is a separate digit
        # Detect darkest cells in each column (filled bubbles)
        col_width = w // expected_digits
        detected_digits = []

        for c in range(expected_digits):
            x_start = c * col_width
            x_end = min(x_start + col_width, w)
            col_roi = gray[:, x_start:x_end]

            if col_roi.size == 0:
                detected_digits.append("")
                continue

            # Divide into 10 rows (0-9)
            row_height = h // 10
            darkest_row = -1
            min_brightness = 255

            for r in range(10):
                y_start = r * row_height
                y_end = min(y_start + row_height, h)
                cell = col_roi[y_start:y_end, :]
                if cell.size == 0:
                    continue
                mean_val = np.mean(cell)
                if mean_val < min_brightness:
                    min_brightness = mean_val
                    darkest_row = r

            if darkest_row >= 0 and min_brightness < 180:
                detected_digits.append(str(darkest_row))
            else:
                detected_digits.append("")

        grid_result = "".join(detected_digits)

        # Return the longer/better result
        if len(grid_result) > len(digits_only):
            return grid_result
        return digits_only if digits_only else grid_result


class ExamSheetEnhancer:
    """
    Deep learning-inspired image enhancement for exam sheets.
    Improves OCR and bubble detection accuracy.
    """

    @staticmethod
    def enhance_for_ocr(image: np.ndarray) -> np.ndarray:
        """
        Multi-step enhancement pipeline for OCR:
        1. Denoise
        2. Contrast enhancement
        3. Sharpening
        4. Background removal
        """
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image.copy()

        # Step 1: Non-local means denoising
        denoised = cv2.fastNlMeansDenoising(gray, h=10, templateWindowSize=7, searchWindowSize=21)

        # Step 2: CLAHE contrast
        clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
        enhanced = clahe.apply(denoised)

        # Step 3: Unsharp masking
        blurred = cv2.GaussianBlur(enhanced, (0, 0), 3)
        sharpened = cv2.addWeighted(enhanced, 1.5, blurred, -0.5, 0)

        # Step 4: Background subtraction (morphological)
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (51, 51))
        background = cv2.morphologyEx(sharpened, cv2.MORPH_CLOSE, kernel)
        # Normalize: divide by background to remove uneven lighting
        normalized = np.clip(sharpened.astype(np.float32) / (background.astype(np.float32) + 1) * 255, 0, 255)
        result = normalized.astype(np.uint8)

        return result

    @staticmethod
    def enhance_for_bubbles(image: np.ndarray) -> np.ndarray:
        """
        Enhancement specifically for bubble fill detection:
        - Removes paper texture
        - Enhances pencil marks
        - Normalizes lighting
        """
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image.copy()

        # Background estimation with large morphological closing
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (31, 31))
        bg = cv2.morphologyEx(gray, cv2.MORPH_CLOSE, kernel)

        # Subtract background → enhances pencil marks
        diff = cv2.subtract(bg, gray)

        # Stretch contrast
        min_val, max_val = np.percentile(diff, [2, 98])
        if max_val > min_val:
            stretched = np.clip((diff - min_val) / (max_val - min_val) * 255, 0, 255).astype(np.uint8)
        else:
            stretched = diff

        return stretched

    @staticmethod
    def deskew_text_line(roi: np.ndarray) -> np.ndarray:
        """
        Correct skew in a text line ROI using projection profile.
        Returns deskewed image.
        """
        if roi.size == 0:
            return roi

        gray = roi if len(roi.shape) == 2 else cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

        # Find optimal angle via horizontal projection profile
        best_angle = 0
        best_score = 0

        for angle in np.arange(-5, 5.5, 0.5):
            M = cv2.getRotationMatrix2D(
                (gray.shape[1] // 2, gray.shape[0] // 2), angle, 1.0
            )
            rotated = cv2.warpAffine(binary, M, (gray.shape[1], gray.shape[0]))
            # Horizontal projection
            proj = np.sum(rotated, axis=1)
            # Score: variance of projection (higher = more aligned)
            score = np.var(proj)
            if score > best_score:
                best_score = score
                best_angle = angle

        if abs(best_angle) > 0.3:
            M = cv2.getRotationMatrix2D(
                (gray.shape[1] // 2, gray.shape[0] // 2), best_angle, 1.0
            )
            return cv2.warpAffine(roi, M, (roi.shape[1], roi.shape[0]),
                                  borderMode=cv2.BORDER_REPLICATE)
        return roi


# ─────────────────────────────────────────────────────────────
# Convenience functions
# ─────────────────────────────────────────────────────────────

def read_exam_sheet(image: np.ndarray) -> dict:
    """One-call function to read all text from an exam sheet"""
    reader = ExamOCRReader()
    return reader.read_full_sheet(image)


def extract_exam_info(image: np.ndarray) -> dict:
    """Extract structured exam header info"""
    reader = ExamOCRReader()
    return reader.read_exam_info(image).to_dict()
