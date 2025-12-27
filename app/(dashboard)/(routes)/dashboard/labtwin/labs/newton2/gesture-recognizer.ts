/**
 * Hand Gesture Recognition for Newton Physics
 * Quy tắc điều khiển bằng cử chỉ tay
 */

export type HandGesture = 
  | 'open-palm'      // Bàn tay mở
  | 'fist'           // Nắm đấm
  | 'pointing'       // Chỉ trỏ (chỉ ngón trỏ)
  | 'peace'          // Chữ V (2 ngón)
  | 'thumbs-up'      // Ngón cái lên
  | 'pinch'          // Nhéo (cái + trỏ)
  | 'three-fingers'  // 3 ngón (trỏ + giữa + áp út)
  | 'four-fingers'   // 4 ngón (trừ ngón cái)
  | 'none';          // Không cử chỉ nào

export interface GestureState {
  gesture: HandGesture;
  confidence: number; // 0-1
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number }; // Hand movement velocity
  direction: number; // Angle in radians
}

export interface PhysicsControl {
  // Left hand controls
  leftHand: {
    gesture: HandGesture;
    massMultiplier: number;      // Điều chỉnh khối lượng
    forceMultiplier: number;      // Điều chỉnh lực
  };
  
  // Right hand controls
  rightHand: {
    gesture: HandGesture;
    forceDirection: { x: number; y: number }; // Hướng lực
    forceActive: boolean;                      // Có tạo lực không
  };
}

/**
 * Detect hand gesture from landmarks
 */
export class GestureRecognizer {
  
  /**
   * Recognize gesture from hand landmarks
   */
  static recognize(landmarks: any[]): GestureState {
    if (!landmarks || landmarks.length < 21) {
      return {
        gesture: 'none',
        confidence: 0,
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0 },
        direction: 0
      };
    }

    // Get key points
    const wrist = landmarks[0];
    const thumb = {
      tip: landmarks[4],
      ip: landmarks[3],
      mcp: landmarks[2]
    };
    const index = {
      tip: landmarks[8],
      pip: landmarks[6],
      mcp: landmarks[5]
    };
    const middle = {
      tip: landmarks[12],
      pip: landmarks[10],
      mcp: landmarks[9]
    };
    const ring = {
      tip: landmarks[16],
      pip: landmarks[14],
      mcp: landmarks[13]
    };
    const pinky = {
      tip: landmarks[20],
      pip: landmarks[18],
      mcp: landmarks[17]
    };

    // Detect finger states (extended or curled)
    const thumbExtended = this.isFingerExtended(thumb.tip, thumb.ip, thumb.mcp);
    const indexExtended = this.isFingerExtended(index.tip, index.pip, index.mcp);
    const middleExtended = this.isFingerExtended(middle.tip, middle.pip, middle.mcp);
    const ringExtended = this.isFingerExtended(ring.tip, ring.pip, ring.mcp);
    const pinkyExtended = this.isFingerExtended(pinky.tip, pinky.pip, pinky.mcp);

    // Check for pinch (thumb + index close)
    const thumbIndexDistance = this.distance3D(thumb.tip, index.tip);
    const isPinching = thumbIndexDistance < 0.05;

    // Count extended fingers
    const extendedCount = [
      thumbExtended,
      indexExtended,
      middleExtended,
      ringExtended,
      pinkyExtended
    ].filter(Boolean).length;

    // Determine gesture
    let gesture: HandGesture = 'none';
    let confidence = 0;

    if (isPinching) {
      gesture = 'pinch';
      confidence = 1 - (thumbIndexDistance / 0.05);
    } else if (extendedCount === 5) {
      gesture = 'open-palm';
      confidence = 0.9;
    } else if (extendedCount === 0) {
      gesture = 'fist';
      confidence = 0.9;
    } else if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      gesture = 'pointing';
      confidence = 0.85;
    } else if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
      gesture = 'peace';
      confidence = 0.85;
    } else if (thumbExtended && !indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      gesture = 'thumbs-up';
      confidence = 0.8;
    } else if (indexExtended && middleExtended && ringExtended && !pinkyExtended) {
      gesture = 'three-fingers';
      confidence = 0.8;
    } else if (indexExtended && middleExtended && ringExtended && pinkyExtended && !thumbExtended) {
      gesture = 'four-fingers';
      confidence = 0.8;
    }

    // Calculate hand center position
    const position = {
      x: wrist.x,
      y: wrist.y,
      z: wrist.z
    };

    // Calculate pointing direction (for pointing gesture)
    const direction = indexExtended 
      ? Math.atan2(index.tip.y - wrist.y, index.tip.x - wrist.x)
      : 0;

    return {
      gesture,
      confidence,
      position,
      velocity: { x: 0, y: 0 }, // Will be calculated by comparing frames
      direction
    };
  }

  /**
   * Check if finger is extended
   */
  private static isFingerExtended(tip: any, pip: any, mcp: any): boolean {
    // Distance from tip to MCP
    const tipToMcp = this.distance3D(tip, mcp);
    
    // Distance from PIP to MCP
    const pipToMcp = this.distance3D(pip, mcp);
    
    // Finger is extended if tip is farther from MCP than PIP
    return tipToMcp > pipToMcp * 1.2;
  }

  /**
   * Calculate 3D distance
   */
  private static distance3D(p1: any, p2: any): number {
    return Math.sqrt(
      Math.pow(p1.x - p2.x, 2) +
      Math.pow(p1.y - p2.y, 2) +
      Math.pow(p1.z - p2.z, 2)
    );
  }
}

/**
 * Physics Control Rules
 */
export class PhysicsControlRules {
  
  /**
   * TAY TRÁI: Điều chỉnh thông số vật lý
   */
  static getLeftHandControl(gesture: HandGesture): {
    massMultiplier: number;
    forceMultiplier: number;
    description: string;
  } {
    switch (gesture) {
      case 'fist':
        // Nắm đấm: Khối lượng NHỎ (0.5x)
        return {
          massMultiplier: 0.5,
          forceMultiplier: 1.0,
          description: '✊ Khối lượng NHỎ (m × 0.5)'
        };
      
      case 'peace':
        // 2 ngón: Khối lượng TRUNG BÌNH (1.0x)
        return {
          massMultiplier: 1.0,
          forceMultiplier: 1.0,
          description: '✌️ Khối lượng TRUNG BÌNH (m × 1.0)'
        };
      
      case 'three-fingers':
        // 3 ngón: Khối lượng LỚN (2.0x)
        return {
          massMultiplier: 2.0,
          forceMultiplier: 1.0,
          description: '🖖 Khối lượng LỚN (m × 2.0)'
        };
      
      case 'open-palm':
        // Bàn tay mở: Khối lượng RẤT LỚN (3.0x)
        return {
          massMultiplier: 3.0,
          forceMultiplier: 1.0,
          description: '🖐️ Khối lượng RẤT LỚN (m × 3.0)'
        };
      
      case 'thumbs-up':
        // Ngón cái lên: LỰC MẠNH (2.0x force)
        return {
          massMultiplier: 1.0,
          forceMultiplier: 2.0,
          description: '👍 LỰC MẠNH (F × 2.0)'
        };
      
      case 'pinch':
        // Nhéo: LỰC YẾU (0.5x force)
        return {
          massMultiplier: 1.0,
          forceMultiplier: 0.5,
          description: '🤏 LỰC YẾU (F × 0.5)'
        };
      
      default:
        return {
          massMultiplier: 1.0,
          forceMultiplier: 1.0,
          description: 'Không có cử chỉ'
        };
    }
  }

  /**
   * TAY PHẢI: Điều khiển hướng và tạo lực
   */
  static getRightHandControl(
    gesture: HandGesture,
    position: { x: number; y: number },
    direction: number,
    canvasWidth: number,
    canvasHeight: number
  ): {
    forceDirection: { x: number; y: number };
    forceActive: boolean;
    forceMagnitude: number;
    description: string;
  } {
    // Convert position to canvas coordinates
    const screenX = position.x * canvasWidth;
    const screenY = position.y * canvasHeight;

    switch (gesture) {
      case 'pointing':
        // Chỉ trỏ: Tạo lực theo hướng ngón trỏ
        return {
          forceDirection: {
            x: Math.cos(direction),
            y: Math.sin(direction)
          },
          forceActive: true,
          forceMagnitude: 1.0,
          description: '☝️ Chỉ hướng lực'
        };
      
      case 'peace':
        // 2 ngón: Tạo lực LỆCH 45° sang phải
        return {
          forceDirection: {
            x: Math.cos(direction + Math.PI / 4),
            y: Math.sin(direction + Math.PI / 4)
          },
          forceActive: true,
          forceMagnitude: 1.0,
          description: '✌️ Lực lệch 45° phải'
        };
      
      case 'fist':
        // Nắm đấm: Tạo lực MẠNH XUỐNG (gravity boost)
        return {
          forceDirection: { x: 0, y: 1 },
          forceActive: true,
          forceMagnitude: 2.0,
          description: '✊ Lực mạnh xuống'
        };
      
      case 'open-palm':
        // Bàn tay mở: Tạo lực MẠNH LÊN (anti-gravity)
        return {
          forceDirection: { x: 0, y: -1 },
          forceActive: true,
          forceMagnitude: 2.0,
          description: '🖐️ Lực mạnh lên'
        };
      
      case 'thumbs-up':
        // Ngón cái lên: Tạo lực SANG PHẢI
        return {
          forceDirection: { x: 1, y: 0 },
          forceActive: true,
          forceMagnitude: 1.5,
          description: '👍 Lực sang phải'
        };
      
      case 'pinch':
        // Nhéo: DỪNG lực (reset velocity)
        return {
          forceDirection: { x: 0, y: 0 },
          forceActive: false,
          forceMagnitude: 0,
          description: '🤏 DỪNG lực'
        };
      
      default:
        return {
          forceDirection: { x: 0, y: 0 },
          forceActive: false,
          forceMagnitude: 0,
          description: 'Không có cử chỉ'
        };
    }
  }

  /**
   * Get visual indicator for gesture
   */
  static getGestureIndicator(gesture: HandGesture): {
    emoji: string;
    color: string;
    label: string;
  } {
    const indicators: Record<HandGesture, { emoji: string; color: string; label: string }> = {
      'open-palm': { emoji: '🖐️', color: '#f59e0b', label: 'Bàn tay mở' },
      'fist': { emoji: '✊', color: '#ef4444', label: 'Nắm đấm' },
      'pointing': { emoji: '☝️', color: '#3b82f6', label: 'Chỉ trỏ' },
      'peace': { emoji: '✌️', color: '#10b981', label: 'Chữ V' },
      'thumbs-up': { emoji: '👍', color: '#8b5cf6', label: 'Ngón cái lên' },
      'pinch': { emoji: '🤏', color: '#ec4899', label: 'Nhéo' },
      'three-fingers': { emoji: '🖖', color: '#06b6d4', label: '3 ngón' },
      'four-fingers': { emoji: '🖐', color: '#f97316', label: '4 ngón' },
      'none': { emoji: '❓', color: '#6b7280', label: 'Không rõ' }
    };

    return indicators[gesture];
  }
}

/**
 * Velocity tracker for hand movement
 */
export class HandVelocityTracker {
  private previousPositions: Map<string, { x: number; y: number; time: number }[]> = new Map();
  private maxHistory = 5;

  track(handId: string, position: { x: number; y: number }): { x: number; y: number } {
    const now = Date.now();
    
    if (!this.previousPositions.has(handId)) {
      this.previousPositions.set(handId, []);
    }

    const history = this.previousPositions.get(handId)!;
    history.push({ ...position, time: now });

    // Keep only recent history
    if (history.length > this.maxHistory) {
      history.shift();
    }

    // Calculate velocity
    if (history.length < 2) {
      return { x: 0, y: 0 };
    }

    const first = history[0];
    const last = history[history.length - 1];
    const deltaTime = (last.time - first.time) / 1000; // seconds

    if (deltaTime === 0) {
      return { x: 0, y: 0 };
    }

    return {
      x: (last.x - first.x) / deltaTime,
      y: (last.y - first.y) / deltaTime
    };
  }

  reset(handId: string) {
    this.previousPositions.delete(handId);
  }
}

