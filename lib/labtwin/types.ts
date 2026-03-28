// ============================================
// Labtwin Circuit Simulator - Core Types
// Compatible with Wokwi diagram.json format
// ============================================

export interface Pin {
  name: string;
  x: number;
  y: number;
  signal?: 'digital' | 'analog' | 'power' | 'ground';
}

export interface ComponentDef {
  type: string;
  id: string;
  top: number;
  left: number;
  attrs: Record<string, string | number | boolean>;
  rotate?: number;
}

export interface Connection {
  from: string;       // "componentId:pinName"
  to: string;         // "componentId:pinName"
  color: string;
  path: string[];     // Wire routing hints
}

export interface DiagramJSON {
  version: number;
  author?: string;
  editor?: string;
  parts: ComponentDef[];
  connections: [string, string, string, string[]][];
  dependencies?: Record<string, string>;
}

// Simulation state
export interface SimulationState {
  running: boolean;
  paused: boolean;
  time: number;            // simulation time in ms
  pinStates: Record<string, PinState>;
  serialOutput: string[];
}

export interface PinState {
  mode: 'INPUT' | 'OUTPUT' | 'INPUT_PULLUP';
  value: boolean;          // digital HIGH/LOW
  analogValue: number;     // 0-4095 for ADC
  pwmValue: number;        // 0-255
}

// Component registry
export type ComponentCategory =
  | 'microcontroller'
  | 'led'
  | 'passive'
  | 'sensor'
  | 'input'
  | 'display'
  | 'actuator'
  | 'module'
  | 'communication'
  | 'logic';

export interface ComponentMeta {
  type: string;
  label: string;
  category: ComponentCategory;
  pins: Pin[];
  defaultAttrs: Record<string, string | number | boolean>;
  width: number;
  height: number;
}

// Canvas state
export interface CanvasState {
  zoom: number;
  panX: number;
  panY: number;
  gridSize: number;
  snapToGrid: boolean;
  selectedId: string | null;
  draggingId: string | null;
  wiringFrom: string | null;  // "componentId:pinName" when drawing wire
}

// Editor state
export interface EditorFile {
  name: string;
  content: string;
  language: string;
}

export interface ProjectState {
  name: string;
  diagram: DiagramJSON;
  files: EditorFile[];
  simulation: SimulationState;
}

// Wire point for routing
export interface WirePoint {
  x: number;
  y: number;
}

export interface Wire {
  id: string;
  from: { componentId: string; pin: string };
  to: { componentId: string; pin: string };
  color: string;
  points: WirePoint[];
}
