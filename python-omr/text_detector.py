"""
=============================================================================
TEXT DETECTOR - Deep Learning-inspired Text Detection for Exam Sheets
=============================================================================
Implements text region detection using techniques inspired by CTPN and EAST:

  CTPN (Connectionist Text Proposal Network) principles:
    - Vertical anchor mechanism → MSER + connected component vertical analysis
    - Sequential proposal refinement → multi-scale morphological grouping
    - Fine-grained text line detection → stroke-width-aware region growing

  EAST (Efficient and Accurate Scene Text) principles:
    - Multi-scale feature extraction → image pyramid + multi-kernel morphology
    - Score map + geometry prediction → confidence-weighted region scoring
    - NMS (Non-Maximum Suppression) → IoU-based box merging

Pipeline:
  1. Preprocessing: adaptive threshold, edge detection, gradient maps
  2. Text candidate detection: MSER + Canny edges + morphological text masks
  3. Text line grouping: connected components → horizontal/vertical line merging
  4. Region classification: aspect ratio, stroke density, fill ratio filtering
  5. NMS: merge overlapping detections
  6. Output: bounding boxes + confidence scores + region type labels
=============================================================================
"""

import cv2
import numpy as np
from dataclasses import dataclass, field
from typing import List, Tuple, Optional


@dataclass
class TextRegion:
    """Detected text region with metadata"""
    x: int          # top-left x
    y: int          # top-left y
    w: int          # width
    h: int          # height
    confidence: float   # detection confidence [0,1]
    text: str = ""      # recognized text (filled by OCR)
    region_type: str = "text"  # "text", "number", "title", "marker", "bubble_label"
    angle: float = 0.0  # rotation angle in degrees

    @property
    def cx(self) -> float:
        return self.x + self.w / 2

    @property
    def cy(self) -> float:
        return self.y + self.h / 2

    @property
    def area(self) -> int:
        return self.w * self.h

    @property
    def aspect_ratio(self) -> float:
        return self.w / max(self.h, 1)

    def iou(self, other: 'TextRegion') -> float:
        """Intersection over Union"""
        x1 = max(self.x, other.x)
        y1 = max(self.y, other.y)
        x2 = min(self.x + self.w, other.x + other.w)
        y2 = min(self.y + self.h, other.y + other.h)
        if x2 <= x1 or y2 <= y1:
            return 0.0
        inter = (x2 - x1) * (y2 - y1)
        union = self.area + other.area - inter
        return inter / max(union, 1)

    def to_dict(self) -> dict:
        return {
            "x": self.x, "y": self.y, "w": self.w, "h": self.h,
            "confidence": round(self.confidence, 3),
            "text": self.text,
            "region_type": self.region_type,
            "angle": round(self.angle, 2),
        }


class TextDetector:
    """
    Multi-stage text detector combining MSER, morphological analysis,
    and gradient-based detection - inspired by CTPN/EAST architectures.
    """

    def __init__(
        self,
        min_text_height: int = 8,
        max_text_height: int = 200,
        min_confidence: float = 0.3,
        nms_threshold: float = 0.4,
        multi_scale: bool = True,
    ):
        self.min_text_height = min_text_height
        self.max_text_height = max_text_height
        self.min_confidence = min_confidence
        self.nms_threshold = nms_threshold
        self.multi_scale = multi_scale

        # MSER detector (character-level)
        self.mser = cv2.MSER_create()
        self.mser.setDelta(5)
        self.mser.setMinArea(30)
        self.mser.setMaxArea(14400)
        self.mser.setMaxVariation(0.25)

    def detect(self, image: np.ndarray) -> List[TextRegion]:
        """
        Full detection pipeline:
        1. Preprocess → grayscale, enhance contrast
        2. Multi-method detection (MSER, morphological, gradient)
        3. Merge & NMS
        4. Classify regions
        """
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image.copy()

        h, w = gray.shape[:2]

        # ─── Stage 1: Preprocessing ───
        enhanced = self._enhance_contrast(gray)

        # ─── Stage 2: Multi-method text candidate detection ───
        candidates = []

        # Method A: MSER-based character detection → group into words/lines
        mser_regions = self._detect_mser(enhanced, w, h)
        candidates.extend(mser_regions)

        # Method B: Morphological text line detection (EAST-inspired)
        morph_regions = self._detect_morphological(enhanced, w, h)
        candidates.extend(morph_regions)

        # Method C: Gradient-based text detection (CTPN-inspired vertical anchors)
        grad_regions = self._detect_gradient_based(enhanced, w, h)
        candidates.extend(grad_regions)

        if self.multi_scale:
            # Multi-scale detection (half resolution)
            if w > 600 and h > 600:
                small = cv2.resize(enhanced, (w // 2, h // 2))
                ms_regions = self._detect_morphological(small, w // 2, h // 2)
                for r in ms_regions:
                    r.x *= 2; r.y *= 2; r.w *= 2; r.h *= 2
                    r.confidence *= 0.9  # slight penalty for upscaled
                candidates.extend(ms_regions)

        # ─── Stage 3: NMS (Non-Maximum Suppression) ───
        filtered = self._nms(candidates)

        # ─── Stage 4: Classify region types ───
        classified = self._classify_regions(filtered, gray)

        # Filter by confidence
        result = [r for r in classified if r.confidence >= self.min_confidence]
        result.sort(key=lambda r: (r.y, r.x))

        return result

    def detect_exam_regions(self, image: np.ndarray) -> dict:
        """
        Specialized detection for Vietnamese exam answer sheets.
        Returns structured regions: header, student_info, sbd, exam_code, parts.
        """
        regions = self.detect(image)
        h, w = image.shape[:2]

        # Classify into exam zones based on position
        header_regions = []
        student_info = []
        sbd_region = []
        exam_code_region = []
        part_labels = []
        other = []

        for r in regions:
            ny = r.cy / h  # normalized y
            nx = r.cx / w  # normalized x

            if ny < 0.15:
                # Top 15% = header area
                if nx > 0.6:
                    if r.region_type == "number":
                        sbd_region.append(r)
                    else:
                        exam_code_region.append(r)
                else:
                    header_regions.append(r)
            elif ny < 0.30:
                # 15-30% = student info
                student_info.append(r)
            elif r.region_type == "title":
                part_labels.append(r)
            else:
                other.append(r)

        return {
            "header": [r.to_dict() for r in header_regions],
            "student_info": [r.to_dict() for r in student_info],
            "sbd": [r.to_dict() for r in sbd_region],
            "exam_code": [r.to_dict() for r in exam_code_region],
            "part_labels": [r.to_dict() for r in part_labels],
            "other": [r.to_dict() for r in other],
            "total_regions": len(regions),
            "all_regions": [r.to_dict() for r in regions],
        }

    # ─────────────────────────────────────────────────────────────
    # PREPROCESSING
    # ─────────────────────────────────────────────────────────────

    def _enhance_contrast(self, gray: np.ndarray) -> np.ndarray:
        """CLAHE contrast enhancement + denoising"""
        # CLAHE for local contrast
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)
        # Light blur to reduce noise without losing text edges
        enhanced = cv2.GaussianBlur(enhanced, (3, 3), 0)
        return enhanced

    # ─────────────────────────────────────────────────────────────
    # METHOD A: MSER-based text detection
    # ─────────────────────────────────────────────────────────────

    def _detect_mser(self, gray: np.ndarray, w: int, h: int) -> List[TextRegion]:
        """
        MSER detects character-level blobs, then groups them into text lines.
        Inspired by CTPN's sequential proposal mechanism.
        """
        regions, _ = self.mser.detectRegions(gray)

        # Extract bounding boxes for each MSER region
        char_boxes = []
        for region in regions:
            x, y, rw, rh = cv2.boundingRect(region)
            if rh < self.min_text_height or rh > self.max_text_height:
                continue
            if rw < 3 or rw > w * 0.5:
                continue
            ar = rw / max(rh, 1)
            if ar > 10:  # too wide for a character
                continue
            char_boxes.append((x, y, rw, rh))

        if not char_boxes:
            return []

        # ─── Group characters into text lines (CTPN-inspired) ───
        # Sort by y-center for horizontal grouping
        char_boxes.sort(key=lambda b: (b[1] + b[3] // 2))

        # Group boxes that are vertically aligned (same text line)
        lines = []
        used = set()

        for i, box in enumerate(char_boxes):
            if i in used:
                continue
            line = [box]
            used.add(i)
            bx, by, bw, bh = box
            cy = by + bh / 2

            for j in range(i + 1, len(char_boxes)):
                if j in used:
                    continue
                ox, oy, ow, oh = char_boxes[j]
                ocy = oy + oh / 2

                # Same vertical band (within 60% of height)
                if abs(ocy - cy) < max(bh, oh) * 0.6:
                    # Horizontal proximity (gap < 3x char width)
                    last_right = max(b[0] + b[2] for b in line)
                    if ox - last_right < max(bw, ow) * 3:
                        line.append(char_boxes[j])
                        used.add(j)

            if len(line) >= 2:  # at least 2 characters for a text region
                lines.append(line)

        # Convert grouped characters to text regions
        text_regions = []
        for line in lines:
            x_min = min(b[0] for b in line)
            y_min = min(b[1] for b in line)
            x_max = max(b[0] + b[2] for b in line)
            y_max = max(b[1] + b[3] for b in line)

            rw = x_max - x_min
            rh = y_max - y_min
            char_count = len(line)

            # Confidence based on character count and regularity
            avg_h = np.mean([b[3] for b in line])
            h_std = np.std([b[3] for b in line])
            regularity = 1.0 - min(h_std / max(avg_h, 1), 1.0)
            conf = min(0.5 + 0.1 * char_count + 0.3 * regularity, 0.95)

            text_regions.append(TextRegion(
                x=x_min, y=y_min, w=rw, h=rh,
                confidence=conf,
                region_type="text",
            ))

        return text_regions

    # ─────────────────────────────────────────────────────────────
    # METHOD B: Morphological text detection (EAST-inspired)
    # ─────────────────────────────────────────────────────────────

    def _detect_morphological(self, gray: np.ndarray, w: int, h: int) -> List[TextRegion]:
        """
        Uses morphological operations to create a text probability map,
        similar to EAST's score map approach.
        """
        # Adaptive threshold for text extraction
        binary = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY_INV, 15, 10
        )

        # ─── Create text probability map (EAST score map analog) ───
        # Horizontal kernel: connect characters in a line
        h_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 1))
        h_connected = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, h_kernel)

        # Vertical kernel: connect line features
        v_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 3))
        text_mask = cv2.morphologyEx(h_connected, cv2.MORPH_CLOSE, v_kernel)

        # Dilate to merge nearby text
        dilate_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 5))
        text_mask = cv2.dilate(text_mask, dilate_kernel, iterations=2)

        # Find connected components
        contours, _ = cv2.findContours(text_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        regions = []
        for cnt in contours:
            x, y, rw, rh = cv2.boundingRect(cnt)

            if rh < self.min_text_height or rh > self.max_text_height:
                continue
            if rw < 10:
                continue
            if rw > w * 0.95 and rh > h * 0.3:  # too large, probably not text
                continue

            # Compute fill ratio (text density in bounding box)
            roi = binary[y:y+rh, x:x+rw]
            fill_ratio = np.count_nonzero(roi) / max(roi.size, 1)

            if fill_ratio < 0.05 or fill_ratio > 0.85:
                continue

            # Confidence from fill ratio and aspect ratio
            ar = rw / max(rh, 1)
            conf = 0.4
            if 0.1 < fill_ratio < 0.6:
                conf += 0.2
            if ar > 1.5:  # horizontal text line
                conf += 0.15
            if rh > 10 and rh < 50:  # normal text height
                conf += 0.1

            regions.append(TextRegion(
                x=x, y=y, w=rw, h=rh,
                confidence=min(conf, 0.9),
                region_type="text",
            ))

        return regions

    # ─────────────────────────────────────────────────────────────
    # METHOD C: Gradient-based detection (CTPN vertical anchor inspired)
    # ─────────────────────────────────────────────────────────────

    def _detect_gradient_based(self, gray: np.ndarray, w: int, h: int) -> List[TextRegion]:
        """
        Uses gradient analysis to find text regions.
        Inspired by CTPN's vertical anchor mechanism:
        - Compute horizontal and vertical gradients
        - Find regions with strong horizontal gradient (text edges)
        - Group into proposals
        """
        # Sobel gradients
        grad_x = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
        grad_y = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)

        # Gradient magnitude
        magnitude = np.sqrt(grad_x**2 + grad_y**2)
        magnitude = np.uint8(np.clip(magnitude / magnitude.max() * 255, 0, 255))

        # Threshold gradient map
        _, grad_binary = cv2.threshold(magnitude, 50, 255, cv2.THRESH_BINARY)

        # ─── Vertical anchor mechanism (CTPN-inspired) ───
        # Divide image into vertical slices (anchors)
        anchor_width = 16
        n_anchors = w // anchor_width

        # For each anchor column, compute gradient density
        anchor_scores = np.zeros((h, n_anchors))
        for a in range(n_anchors):
            x_start = a * anchor_width
            x_end = min(x_start + anchor_width, w)
            slice_data = grad_binary[:, x_start:x_end]
            # Sliding window vertical score
            for y in range(h):
                y_start = max(0, y - 8)
                y_end = min(h, y + 8)
                window = slice_data[y_start:y_end, :]
                anchor_scores[y, a] = np.count_nonzero(window) / max(window.size, 1)

        # Find horizontal runs of high-scoring anchors (text proposals)
        score_thresh = 0.15
        text_proposals = []

        for y in range(0, h, 4):
            # Scan horizontally for connected anchor runs
            in_run = False
            run_start = 0

            for a in range(n_anchors):
                if anchor_scores[y, a] > score_thresh:
                    if not in_run:
                        in_run = True
                        run_start = a
                elif in_run:
                    in_run = False
                    run_len = a - run_start
                    if run_len >= 3:  # at least 3 anchors wide
                        text_proposals.append((
                            run_start * anchor_width,
                            max(0, y - 12),
                            run_len * anchor_width,
                            24,  # default height
                        ))

            if in_run:
                run_len = n_anchors - run_start
                if run_len >= 3:
                    text_proposals.append((
                        run_start * anchor_width,
                        max(0, y - 12),
                        run_len * anchor_width,
                        24,
                    ))

        # Merge vertically adjacent proposals
        regions = []
        if text_proposals:
            # Sort by y, x
            text_proposals.sort(key=lambda p: (p[1], p[0]))
            merged = [list(text_proposals[0])]

            for prop in text_proposals[1:]:
                last = merged[-1]
                # Check vertical adjacency and horizontal overlap
                if (prop[1] - (last[1] + last[3]) < 8 and
                    abs(prop[0] - last[0]) < last[2] * 0.3):
                    # Merge
                    last[2] = max(last[0] + last[2], prop[0] + prop[2]) - min(last[0], prop[0])
                    last[0] = min(last[0], prop[0])
                    last[3] = (prop[1] + prop[3]) - last[1]
                else:
                    merged.append(list(prop))

            for m in merged:
                x, y, rw, rh = m
                if rh < self.min_text_height or rh > self.max_text_height:
                    continue
                if rw < 20:
                    continue

                regions.append(TextRegion(
                    x=x, y=y, w=rw, h=rh,
                    confidence=0.45,
                    region_type="text",
                ))

        return regions

    # ─────────────────────────────────────────────────────────────
    # NMS (Non-Maximum Suppression) - EAST-inspired
    # ─────────────────────────────────────────────────────────────

    def _nms(self, regions: List[TextRegion]) -> List[TextRegion]:
        """IoU-based NMS with confidence weighting"""
        if not regions:
            return []

        # Sort by confidence (descending)
        regions.sort(key=lambda r: r.confidence, reverse=True)

        kept = []
        suppressed = set()

        for i, region in enumerate(regions):
            if i in suppressed:
                continue

            kept.append(region)

            for j in range(i + 1, len(regions)):
                if j in suppressed:
                    continue
                if region.iou(regions[j]) > self.nms_threshold:
                    suppressed.add(j)
                    # Absorb: expand kept region if suppressed one extends it
                    if regions[j].w * regions[j].h > region.w * region.h * 0.5:
                        new_x = min(region.x, regions[j].x)
                        new_y = min(region.y, regions[j].y)
                        new_r = max(region.x + region.w, regions[j].x + regions[j].w)
                        new_b = max(region.y + region.h, regions[j].y + regions[j].h)
                        region.x = new_x
                        region.y = new_y
                        region.w = new_r - new_x
                        region.h = new_b - new_y

        return kept

    # ─────────────────────────────────────────────────────────────
    # Region Classification
    # ─────────────────────────────────────────────────────────────

    def _classify_regions(self, regions: List[TextRegion], gray: np.ndarray) -> List[TextRegion]:
        """Classify detected regions by type"""
        h, w = gray.shape[:2]

        for r in regions:
            ar = r.aspect_ratio

            # Extract ROI for analysis
            roi = gray[r.y:r.y+r.h, r.x:r.x+r.w]
            if roi.size == 0:
                continue

            mean_val = np.mean(roi)
            std_val = np.std(roi)

            # Title: large text, wide aspect ratio, dark
            if r.h > 20 and ar > 3 and r.w > w * 0.15:
                r.region_type = "title"
                r.confidence = min(r.confidence + 0.1, 0.95)

            # Number: small region with digit-like characteristics
            elif r.h < 40 and ar < 3 and std_val > 40:
                r.region_type = "number"

            # Marker/label: very small text near bubbles
            elif r.h < 15 and r.w < 30:
                r.region_type = "bubble_label"
                r.confidence *= 0.8  # lower priority

        return regions

    # ─────────────────────────────────────────────────────────────
    # Visualization
    # ─────────────────────────────────────────────────────────────

    def draw_detections(
        self,
        image: np.ndarray,
        regions: List[TextRegion],
        show_labels: bool = True
    ) -> np.ndarray:
        """Draw detected text regions on image"""
        vis = image.copy()
        if len(vis.shape) == 2:
            vis = cv2.cvtColor(vis, cv2.COLOR_GRAY2BGR)

        colors = {
            "text": (0, 255, 0),
            "number": (255, 0, 0),
            "title": (0, 0, 255),
            "marker": (255, 255, 0),
            "bubble_label": (128, 128, 128),
        }

        for r in regions:
            color = colors.get(r.region_type, (0, 255, 0))
            cv2.rectangle(vis, (r.x, r.y), (r.x + r.w, r.y + r.h), color, 2)

            if show_labels:
                label = f"{r.region_type} ({r.confidence:.2f})"
                if r.text:
                    label = f"{r.text} [{r.region_type}]"
                cv2.putText(vis, label, (r.x, r.y - 5),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1)

        return vis


# ─────────────────────────────────────────────────────────────
# Convenience function
# ─────────────────────────────────────────────────────────────

def detect_text_regions(
    image: np.ndarray,
    min_confidence: float = 0.3,
    multi_scale: bool = True
) -> List[TextRegion]:
    """Detect text regions in an image"""
    detector = TextDetector(min_confidence=min_confidence, multi_scale=multi_scale)
    return detector.detect(image)
