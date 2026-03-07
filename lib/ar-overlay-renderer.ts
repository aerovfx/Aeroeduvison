/**
 * AR Overlay Renderer
 * Vẽ các AR assets lên canvas dựa trên face landmarks
 */

import { FaceLandmarkerResult } from '@mediapipe/tasks-vision';

export interface OverlayPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

/**
 * Calculate position for hat overlays
 * Dựa vào landmarks đầu để đặt mũ
 */
export const calculateHatPosition = (
  landmarks: any[],
  canvasWidth: number,
  canvasHeight: number
): OverlayPosition => {
  // Forehead landmarks (10, 151, 9, 8, 107, 66)
  const forehead = landmarks[10];
  const topHead = landmarks[151];
  const leftTemple = landmarks[234];
  const rightTemple = landmarks[454];
  
  // Calculate head width
  const headWidth = Math.abs(
    (rightTemple.x - leftTemple.x) * canvasWidth
  );
  
  // Calculate position
  const x = forehead.x * canvasWidth;
  const y = topHead.y * canvasHeight - headWidth * 0.3; // Above head
  const width = headWidth * 1.3;
  const height = width * 0.8;
  
  // Calculate rotation based on head tilt
  const rotation = Math.atan2(
    rightTemple.y - leftTemple.y,
    rightTemple.x - leftTemple.x
  );
  
  return { x, y, width, height, rotation };
};

/**
 * Calculate position for antler overlays (reindeer horns)
 */
export const calculateAntlerPosition = (
  landmarks: any[],
  canvasWidth: number,
  canvasHeight: number
): OverlayPosition => {
  const forehead = landmarks[10];
  const leftTemple = landmarks[234];
  const rightTemple = landmarks[454];
  
  const headWidth = Math.abs(
    (rightTemple.x - leftTemple.x) * canvasWidth
  );
  
  const x = forehead.x * canvasWidth;
  const y = forehead.y * canvasHeight - headWidth * 0.5;
  const width = headWidth * 1.6;
  const height = width * 1.2;
  
  const rotation = Math.atan2(
    rightTemple.y - leftTemple.y,
    rightTemple.x - leftTemple.x
  );
  
  return { x, y, width, height, rotation };
};

/**
 * Calculate position for face masks
 */
export const calculateMaskPosition = (
  landmarks: any[],
  canvasWidth: number,
  canvasHeight: number
): OverlayPosition => {
  // Nose tip (center reference)
  const nose = landmarks[1];
  const leftCheek = landmarks[234];
  const rightCheek = landmarks[454];
  const chin = landmarks[152];
  const forehead = landmarks[10];
  
  // Face dimensions
  const faceWidth = Math.abs(
    (rightCheek.x - leftCheek.x) * canvasWidth
  );
  const faceHeight = Math.abs(
    (chin.y - forehead.y) * canvasHeight
  );
  
  const x = nose.x * canvasWidth;
  const y = nose.y * canvasHeight;
  const width = faceWidth * 1.2;
  const height = faceHeight * 1.1;
  
  const rotation = Math.atan2(
    rightCheek.y - leftCheek.y,
    rightCheek.x - leftCheek.x
  );
  
  return { x, y, width, height, rotation };
};

/**
 * Calculate position for full face overlays
 */
export const calculateFullFacePosition = (
  landmarks: any[],
  canvasWidth: number,
  canvasHeight: number
): OverlayPosition => {
  const nose = landmarks[1];
  const leftCheek = landmarks[234];
  const rightCheek = landmarks[454];
  const chin = landmarks[152];
  const topHead = landmarks[10];
  
  const faceWidth = Math.abs(
    (rightCheek.x - leftCheek.x) * canvasWidth
  );
  const faceHeight = Math.abs(
    (chin.y - topHead.y) * canvasHeight
  );
  
  const x = nose.x * canvasWidth;
  const y = ((topHead.y + chin.y) / 2) * canvasHeight;
  const width = faceWidth * 1.4;
  const height = faceHeight * 1.4;
  
  const rotation = Math.atan2(
    rightCheek.y - leftCheek.y,
    rightCheek.x - leftCheek.x
  );
  
  return { x, y, width, height, rotation };
};

/**
 * Draw AR overlay on canvas
 */
export const drawAROverlay = (
  ctx: CanvasRenderingContext2D,
  assetType: 'hat' | 'mask' | 'accessory' | 'full-face',
  emoji: string,
  position: OverlayPosition,
  scale: number = 1
) => {
  ctx.save();
  
  // Translate to center
  ctx.translate(position.x, position.y);
  
  // Apply rotation
  ctx.rotate(position.rotation);
  
  // Set font size based on width
  const fontSize = position.width * 0.8 * scale;
  ctx.font = `${fontSize}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Add shadow for depth
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 3;
  
  // Draw emoji
  ctx.fillText(emoji, 0, 0);
  
  ctx.restore();
};

/**
 * Draw specific AR overlays
 */
export const drawSantaHat = (
  ctx: CanvasRenderingContext2D,
  position: OverlayPosition
) => {
  ctx.save();
  ctx.translate(position.x, position.y);
  ctx.rotate(position.rotation);
  
  // Draw hat body (red triangle)
  ctx.fillStyle = '#DC143C';
  ctx.beginPath();
  ctx.moveTo(0, -position.height * 0.2);
  ctx.lineTo(-position.width * 0.4, position.height * 0.3);
  ctx.lineTo(position.width * 0.4, position.height * 0.3);
  ctx.closePath();
  ctx.fill();
  
  // Draw white trim
  ctx.fillStyle = 'white';
  ctx.fillRect(
    -position.width * 0.45,
    position.height * 0.25,
    position.width * 0.9,
    position.height * 0.15
  );
  
  // Draw white pom-pom
  ctx.beginPath();
  ctx.arc(0, -position.height * 0.25, position.width * 0.12, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
};

export const drawReindeerAntlers = (
  ctx: CanvasRenderingContext2D,
  position: OverlayPosition
) => {
  ctx.save();
  ctx.translate(position.x, position.y);
  ctx.rotate(position.rotation);
  
  const antlerColor = '#8B4513';
  ctx.strokeStyle = antlerColor;
  ctx.fillStyle = antlerColor;
  ctx.lineWidth = position.width * 0.03;
  ctx.lineCap = 'round';
  
  // Left antler
  drawAntlerBranch(ctx, -position.width * 0.25, 0, position.width * 0.15);
  
  // Right antler
  drawAntlerBranch(ctx, position.width * 0.25, 0, position.width * 0.15);
  
  // Red nose (Rudolph)
  ctx.fillStyle = '#FF0000';
  ctx.beginPath();
  ctx.arc(0, position.height * 0.4, position.width * 0.08, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
};

const drawAntlerBranch = (
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  size: number
) => {
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(startX, startY - size * 0.8);
  ctx.stroke();
  
  // Branches
  const branches = [
    { angle: -45, length: 0.5 },
    { angle: -20, length: 0.6 },
    { angle: 20, length: 0.5 }
  ];
  
  branches.forEach(branch => {
    const branchY = startY - size * 0.3;
    const angle = (branch.angle * Math.PI) / 180;
    const endX = startX + Math.cos(angle) * size * branch.length;
    const endY = branchY + Math.sin(angle) * size * branch.length;
    
    ctx.beginPath();
    ctx.moveTo(startX, branchY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
  });
};

