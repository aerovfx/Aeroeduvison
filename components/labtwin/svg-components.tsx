'use client';

import React from 'react';

// ============================================
// High-Fidelity SVG Component Renderers
// Based on Wokwi Elements (wokwi-elements library)
// ALL Wokwi components included
// ============================================

interface ComponentProps {
  id: string;
  x: number;
  y: number;
  attrs: Record<string, any>;
  selected?: boolean;
  pinStates?: Record<string, boolean>;
  onMouseDown?: (e: React.MouseEvent) => void;
  onPinClick?: (pinName: string) => void;
}

// Selection color - Wokwi green dashed style
const SEL_COLOR = '#4caf50';
const SEL_DASH = '6,3';
const SEL_WIDTH = 2;
const SEL_OPACITY = 0.8;

function SelectionBox({ x, y, w, h, rx = 6 }: { x: number; y: number; w: number; h: number; rx?: number }) {
  return (
    <rect x={x} y={y} width={w} height={h} rx={rx}
      fill="none" stroke={SEL_COLOR} strokeWidth={SEL_WIDTH} strokeDasharray={SEL_DASH} opacity={SEL_OPACITY} />
  );
}

// Pin indicator component
function PinDot({ x, y, name, signal, onClick }: {
  x: number; y: number; name: string; signal?: string; onClick?: () => void;
}) {
  const colors: Record<string, string> = {
    power: '#ef4444', ground: '#6b7280', digital: '#3b82f6', analog: '#f59e0b',
  };
  return (
    <g className="pin-dot" onClick={onClick} style={{ cursor: 'pointer' }}>
      <circle cx={x} cy={y} r={3} fill={colors[signal || 'digital']} stroke="#fff" strokeWidth={0.8} opacity={0.85} />
      <title>{name}</title>
    </g>
  );
}

// =========================================================
// ESP32 DevKit C V4
// =========================================================
const ESP32_BOARD_URL = 'https://wokwi.github.io/wokwi-boards/esp32-devkit-c-v4/board.svg?v=4';
const ESP32_LEFT_PINS = [
  { name: '3V3', y: 72 },  { name: 'EN', y: 82 },   { name: 'VP', y: 91 },
  { name: 'VN', y: 101 },  { name: '34', y: 110 },   { name: '35', y: 120 },
  { name: '32', y: 129 },  { name: '33', y: 139 },   { name: '25', y: 148 },
  { name: '26', y: 158 },  { name: '27', y: 167 },   { name: '14', y: 177 },
  { name: '12', y: 186 },  { name: 'GND.1', y: 196 }, { name: '13', y: 205 },
];
const ESP32_RIGHT_PINS = [
  { name: 'GND', y: 72 },  { name: '23', y: 82 },   { name: '22', y: 91 },
  { name: 'TX', y: 101 },  { name: 'RX', y: 110 },  { name: '21', y: 120 },
  { name: '19', y: 129 },  { name: '18', y: 139 },   { name: '5', y: 148 },
  { name: '17', y: 158 },  { name: '16', y: 167 },   { name: '4', y: 177 },
  { name: '0', y: 186 },   { name: '2', y: 196 },    { name: '15', y: 205 },
];

export function ESP32Component({ id, x, y, attrs, selected, onMouseDown, onPinClick }: ComponentProps) {
  const SCALE = 3.78;
  const W = Math.round(27.9 * SCALE);
  const H = Math.round(56.6 * SCALE);
  return (
    <g id={id} transform={`translate(${x},${y})`} onMouseDown={onMouseDown} style={{ cursor: 'move' }}>
      {selected && <SelectionBox x={-6} y={-6} w={W + 12} h={H + 12} rx={8} />}
      <image href={ESP32_BOARD_URL} x={0} y={0} width={W} height={H} preserveAspectRatio="xMidYMid meet" />
      {ESP32_LEFT_PINS.map(pin => (
        <PinDot key={`ld-${pin.name}`} x={-4} y={pin.y} name={pin.name}
          signal={pin.name.includes('GND') ? 'ground' : pin.name === '3V3' ? 'power' : 'digital'}
          onClick={() => onPinClick?.(pin.name)} />
      ))}
      {ESP32_RIGHT_PINS.map(pin => (
        <PinDot key={`rd-${pin.name}`} x={W + 4} y={pin.y} name={pin.name}
          signal={pin.name.includes('GND') ? 'ground' : 'digital'}
          onClick={() => onPinClick?.(pin.name)} />
      ))}
    </g>
  );
}

// =========================================================
// LED - High-fidelity 3D dome shape from Wokwi SVG paths
// =========================================================
export function LEDComponent({ id, x, y, attrs, selected, pinStates, onMouseDown, onPinClick }: ComponentProps) {
  const color = (attrs.color as string) || 'red';
  const isOn = pinStates?.['A'] || false;
  const fillColors: Record<string, string> = {
    red: 'red', green: 'green', blue: 'blue',
    yellow: 'yellow', orange: 'orange', white: '#e8e8e8', purple: 'purple',
  };
  const glowColors: Record<string, string> = {
    red: '#ff4040', green: '#40ff40', blue: '#4040ff',
    yellow: '#ffff40', orange: '#ff8040', white: '#ffffff', purple: '#ff40ff',
  };
  const mainFill = fillColors[color] || 'red';
  const glowFill = glowColors[color] || '#ff4040';
  const S = 4;
  return (
    <g id={id} transform={`translate(${x},${y})`} onMouseDown={onMouseDown} style={{ cursor: 'move' }}>
      <defs>
        <filter id={`light1-${id}`} x="-0.8" y="-0.8" height="2.2" width="2.8"><feGaussianBlur stdDeviation="2" /></filter>
        <filter id={`light2-${id}`} x="-0.8" y="-0.8" height="2.2" width="2.8"><feGaussianBlur stdDeviation="4" /></filter>
      </defs>
      <g transform={`scale(${S})`}>
        <rect x={2.51} y={20.38} width={2.15} height={9.83} fill="#8c8c8c" />
        <path d="m12.977 30.269c0-1.174-0.868-2.513-1.892-3.402-0.416-0.367-1.2-1.002-1.2-1.425v-5.471h-2.161v5.78c0 1.058 0.948 1.879 1.946 2.748 0.444 0.376 1.349 1.25 1.349 1.77" fill="#8c8c8c" />
        <path d="m14.173 13.001v-5.913c0-3.913-3.168-7.088-7.086-7.088-3.912 0-7.088 3.169-7.088 7.088v13.649c1.474 1.651 4.097 2.753 7.088 2.753 4.62 0 8.369-2.618 8.369-5.859v-1.524c-0.001-1.143-0.475-2.204-1.283-3.106z" opacity=".3" />
        <path d="m14.173 13.001v-5.913c0-3.913-3.168-7.088-7.086-7.088-3.912 0-7.088 3.169-7.088 7.088v13.649c1.474 1.651 4.097 2.753 7.088 2.753 4.62 0 8.369-2.618 8.369-5.859v-1.524c-0.001-1.143-0.475-2.204-1.283-3.106z" fill="#e6e6e6" opacity=".5" />
        <path d="m14.173 13.001v3.105c0 2.739-3.166 4.965-7.086 4.965-3.912 0-7.088-2.219-7.088-4.965v4.63c1.474 1.652 4.097 2.753 7.088 2.753 4.62 0 8.369-2.618 8.369-5.859l0-1.524c-0.001-1.142-0.475-2.203-1.283-3.105z" fill="#d1d1d1" opacity=".9" />
        <g>
          <path d="m14.173 13.001v3.105c0 2.739-3.166 4.965-7.086 4.965-3.912 0-7.088-2.219-7.088-4.965v4.63c1.474 1.652 4.097 2.753 7.088 2.753 4.62 0 8.369-2.618 8.369-5.859l0-1.524c-0.001-1.142-0.475-2.203-1.283-3.105z" opacity=".7" />
          <path d="m14.173 13.001v3.105c0 2.739-3.166 4.965-7.086 4.965-3.912 0-7.088-2.219-7.088-4.965v3.105c1.474 1.65 4.097 2.753 7.088 2.753 4.62 0 8.369-2.618 8.369-5.859v0c-0.001-1.142-0.475-2.203-1.283-3.105z" opacity=".25" />
          <ellipse cx={7.088} cy={16.106} rx={7.087} ry={4.961} opacity=".25" />
        </g>
        <polygon points="2.203 16.107 3.196 16.107 3.196 13.095 6.016 13.095 10.012 8.805 3.407 8.805 2.203 9.648" fill="#666" />
        <polygon points="11.215 9.034 7.412 13.095 11.06 13.095 11.06 16.107 11.974 16.107 11.974 8.524 10.778 8.524" fill="#666" />
        <path d="m14.173 13.001v-5.913c0-3.913-3.168-7.088-7.086-7.088-3.912 0-7.088 3.169-7.088 7.088v13.649c1.474 1.651 4.097 2.753 7.088 2.753 4.62 0 8.369-2.618 8.369-5.859v-1.524c-0.001-1.143-0.475-2.204-1.283-3.106z"
          opacity={isOn ? ".85" : ".65"} fill={mainFill} filter={isOn ? `url(#light1-${id})` : undefined} />
        <g fill="#ffffff">
          <path d="m10.388 3.754 1.436-0.274c-0.842-1.132-2.082-1.958-3.542-2.239l0.254 1.081c0.764 0.271 1.407 0.78 1.851 1.431z" opacity=".5" />
          <path d="m0.768 19.926v1.52c0.649 0.529 1.434 0.976 2.308 1.317v-1.525c-0.878-0.336-1.657-0.782-2.308-1.312z" opacity=".5" />
        </g>
        {isOn && (
          <>
            <circle cx={7.088} cy={10} r={8} fill={glowFill} opacity={0.3} filter={`url(#light2-${id})`} />
            <circle cx={7.088} cy={10} r={5} fill={glowFill} opacity={0.15} filter={`url(#light2-${id})`} />
          </>
        )}
      </g>
      <text x={28} y={-6} textAnchor="middle" fill="#94a3b8" fontSize={8} fontWeight="500">{color.toUpperCase()}</text>
      <PinDot x={S * 3.6} y={S * 30.2} name="A" signal="digital" onClick={() => onPinClick?.('A')} />
      <PinDot x={S * 11} y={S * 30.2} name="C" signal="ground" onClick={() => onPinClick?.('C')} />
      {selected && <SelectionBox x={-6} y={-10} w={68} h={140} />}
    </g>
  );
}

// =========================================================
// RGB LED
// =========================================================
export function RGBLEDComponent({ id, x, y, attrs, selected, onMouseDown, onPinClick }: ComponentProps) {
  return (
    <g id={id} transform={`translate(${x},${y})`} onMouseDown={onMouseDown} style={{ cursor: 'move' }}>
      <defs>
        <filter id={`rgbglow-${id}`} x="-0.5" y="-0.5" height="2" width="2"><feGaussianBlur stdDeviation="3" /></filter>
      </defs>
      {/* 4 legs */}
      <line x1={10} y1={80} x2={10} y2={121} stroke="#aaa" strokeWidth={1.5} />
      <line x1={22} y1={85} x2={22} y2={121} stroke="#aaa" strokeWidth={1.5} />
      <line x1={38} y1={80} x2={38} y2={121} stroke="#aaa" strokeWidth={1.5} />
      <line x1={50} y1={80} x2={50} y2={121} stroke="#aaa" strokeWidth={1.5} />
      {/* Dome */}
      <ellipse cx={30} cy={45} rx={22} ry={38} fill="#e0e0e0" opacity={0.6} />
      <ellipse cx={30} cy={45} rx={18} ry={34} fill="#f5f5f5" opacity={0.5} />
      {/* Color indicators */}
      <circle cx={18} cy={40} r={6} fill="red" opacity={0.5} filter={`url(#rgbglow-${id})`} />
      <circle cx={30} cy={35} r={6} fill="green" opacity={0.5} filter={`url(#rgbglow-${id})`} />
      <circle cx={42} cy={40} r={6} fill="blue" opacity={0.5} filter={`url(#rgbglow-${id})`} />
      <text x={30} y={-4} textAnchor="middle" fill="#94a3b8" fontSize={8}>RGB LED</text>
      <PinDot x={10} y={121} name="R" signal="digital" onClick={() => onPinClick?.('R')} />
      <PinDot x={22} y={121} name="COM" signal="ground" onClick={() => onPinClick?.('COM')} />
      <PinDot x={38} y={121} name="G" signal="digital" onClick={() => onPinClick?.('G')} />
      <PinDot x={50} y={121} name="B" signal="digital" onClick={() => onPinClick?.('B')} />
      {selected && <SelectionBox x={-4} y={-8} w={68} h={138} />}
    </g>
  );
}

// =========================================================
// Resistor
// =========================================================
export function ResistorComponent({ id, x, y, attrs, selected, onMouseDown, onPinClick }: ComponentProps) {
  const value = parseInt(String(attrs.value || '1000'));
  const BAND_COLORS: Record<number, string> = {
    0: '#000000', 1: '#8B4513', 2: '#ff0000', 3: '#ff8c00', 4: '#ffff00',
    5: '#22c55e', 6: '#3b82f6', 7: '#8b5cf6', 8: '#808080', 9: '#ffffff',
  };
  const getColorBands = (ohms: number): [string, string, string, string] => {
    if (ohms <= 0) return [BAND_COLORS[0], BAND_COLORS[0], BAND_COLORS[0], '#c0a030'];
    let exp = 0; let val = ohms;
    while (val >= 100) { val = Math.floor(val / 10); exp++; }
    const d1 = Math.floor(val / 10); const d2 = val % 10;
    return [BAND_COLORS[d1] || '#000', BAND_COLORS[d2] || '#000', BAND_COLORS[exp] || '#000', '#c0a030'];
  };
  const bands = getColorBands(value);
  const label = value >= 1000000 ? `${value / 1000000}MΩ` : value >= 1000 ? `${value / 1000}kΩ` : `${value}Ω`;
  const S = 8;
  return (
    <g id={id} transform={`translate(${x},${y})`} onMouseDown={onMouseDown} style={{ cursor: 'move' }}>
      <defs>
        <linearGradient id={`res-grad-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#323232" stopOpacity={0} />
          <stop offset="100%" stopColor="#fff" stopOpacity={0.42} />
        </linearGradient>
      </defs>
      <g transform={`scale(${S})`}>
        <rect y={1.176} width={15.558} height={0.638} fill="#aaa" />
        <g strokeWidth={0.145} fill="#d5b597">
          <path d="m4.692 0c-1.059 0-1.919 0.675-1.919 1.502 0 0.828 0.86 1.498 1.919 1.498 0.424 0 0.814-0.112 1.131-0.294h4.095c0.318 0.183 0.711 0.294 1.136 0.294 1.059 0 1.919-0.67 1.919-1.498 0-0.828-0.86-1.502-1.919-1.502-0.425 0-0.818 0.111-1.136 0.294h-4.095c-0.318-0.182-0.707-0.294-1.131-0.294z" />
          <path d="m4.692 0c-1.059 0-1.919 0.675-1.919 1.502 0 0.828 0.86 1.498 1.919 1.498 0.424 0 0.814-0.112 1.131-0.294h4.095c0.318 0.183 0.711 0.294 1.136 0.294 1.059 0 1.919-0.67 1.919-1.498 0-0.828-0.86-1.502-1.919-1.502-0.425 0-0.818 0.111-1.136 0.294h-4.095c-0.318-0.182-0.707-0.294-1.131-0.294z"
            fill={`url(#res-grad-${id})`} opacity={0.45} />
        </g>
        <rect x={4.5} y={0.15} width={1.0} height={2.7} rx={0.15} fill={bands[0]} opacity={0.9} />
        <rect x={6.1} y={0.15} width={1.0} height={2.7} rx={0.15} fill={bands[1]} opacity={0.9} />
        <rect x={7.7} y={0.15} width={1.0} height={2.7} rx={0.15} fill={bands[2]} opacity={0.9} />
        <rect x={10.2} y={0.15} width={1.0} height={2.7} rx={0.15} fill={bands[3]} opacity={0.9} />
      </g>
      <text x={S * 7.8} y={-5} textAnchor="middle" fill="#94a3b8" fontSize={8} fontWeight="500">{label}</text>
      <PinDot x={0} y={S * 1.5} name="1" signal="digital" onClick={() => onPinClick?.('1')} />
      <PinDot x={S * 15.6} y={S * 1.5} name="2" signal="digital" onClick={() => onPinClick?.('2')} />
      {selected && <SelectionBox x={-4} y={-8} w={S * 15.6 + 8} h={S * 3 + 16} />}
    </g>
  );
}

// =========================================================
// Push Button
// =========================================================
export function PushButtonComponent({ id, x, y, attrs, selected, pinStates, onMouseDown, onPinClick }: ComponentProps) {
  const color = (attrs.color as string) || 'red';
  const isPressed = pinStates?.['1.l'] || false;
  const S = 3.33;
  return (
    <g id={id} transform={`translate(${x},${y})`} onMouseDown={onMouseDown} style={{ cursor: 'move' }}>
      <defs>
        <linearGradient x1="0" x2="1" y1="0" y2="1" id={`grad-up-${id}`}>
          <stop stopColor="#ffffff" offset="0" /><stop offset="0.3" stopColor={color} /><stop offset="0.5" stopColor={color} /><stop offset="1" />
        </linearGradient>
        <linearGradient x1="1" x2="0" y1="1" y2="0" id={`grad-dn-${id}`}>
          <stop stopColor="#ffffff" offset="0" /><stop offset="0.3" stopColor={color} /><stop offset="0.5" stopColor={color} /><stop offset="1" />
        </linearGradient>
      </defs>
      <g transform={`scale(${S})`}>
        <rect x={0} y={0} width={12} height={12} rx={0.44} ry={0.44} fill="#464646" />
        <rect x={0.75} y={0.75} width={10.5} height={10.5} rx={0.211} ry={0.211} fill="#eaeaea" />
        <g fill="#1b1b1b">
          <circle cx={1.767} cy={1.792} r={0.37} /><circle cx={10.161} cy={1.792} r={0.37} />
          <circle cx={10.161} cy={10.197} r={0.37} /><circle cx={1.767} cy={10.197} r={0.37} />
        </g>
        <g fill="#999">
          <path d="m12.365 2.426c0.06 0 0.108 0.047 0.108 0.105v0.387h2.217c0.12 0 0.217 0.094 0.217 0.21v0.507c0 0.117-0.097 0.21-0.217 0.21h-2.217v0.401c0 0.058-0.048 0.105-0.108 0.105h-0.368v-1.927z" />
          <path d="m12.365 7.5c0.06 0 0.108 0.047 0.108 0.105v0.387h2.217c0.12 0 0.217 0.094 0.217 0.21v0.507c0 0.117-0.097 0.21-0.217 0.21h-2.217v0.401c0 0.058-0.048 0.105-0.108 0.105h-0.368v-1.927z" />
          <path d="m-0.351 4.353c-0.06 0-0.108-0.047-0.108-0.105v-0.387h-2.217c-0.12 0-0.217-0.094-0.217-0.21v-0.507c0-0.117 0.097-0.21 0.217-0.21h2.217v-0.401c0-0.058 0.048-0.105 0.108-0.105h0.368v1.927z" />
          <path d="m-0.351 9.427c-0.06 0-0.108-0.047-0.108-0.105v-0.387h-2.217c-0.12 0-0.217-0.094-0.217-0.21v-0.507c0-0.117 0.097-0.21 0.217-0.21h2.217v-0.401c0-0.058 0.048-0.105 0.108-0.105h0.368v1.927z" />
        </g>
        <circle cx={6} cy={6} r={3.822} fill={`url(#grad-up-${id})`} />
        {isPressed && <circle cx={6} cy={6} r={3.822} fill={`url(#grad-dn-${id})`} />}
        <circle cx={6} cy={6} r={2.9} stroke="#2f2f2f" strokeOpacity={0.47} strokeWidth={0.08} fill={color} />
      </g>
      <PinDot x={S * -2.5} y={S * 3.4} name="1.l" signal="digital" onClick={() => onPinClick?.('1.l')} />
      <PinDot x={S * -2.5} y={S * 8.5} name="2.l" signal="digital" onClick={() => onPinClick?.('2.l')} />
      <PinDot x={S * 14.5} y={S * 3.4} name="1.r" signal="digital" onClick={() => onPinClick?.('1.r')} />
      <PinDot x={S * 14.5} y={S * 8.5} name="2.r" signal="digital" onClick={() => onPinClick?.('2.r')} />
      {selected && <SelectionBox x={-12} y={-4} w={S * 18 + 8} h={S * 12 + 8} />}
    </g>
  );
}

// =========================================================
// Buzzer
// =========================================================
export function BuzzerComponent({ id, x, y, attrs, selected, pinStates, onMouseDown, onPinClick }: ComponentProps) {
  const isActive = pinStates?.['1'] || false;
  const S = 2.6;
  return (
    <g id={id} transform={`translate(${x},${y})`} onMouseDown={onMouseDown} style={{ cursor: 'move' }}>
      <g transform={`scale(${S})`}>
        <path d="m7.23 16.5v3.5" fill="none" stroke="#000" strokeWidth={0.5} />
        <path d="m9.77 16.5v3.5" fill="#f00" stroke="#f00" strokeWidth={0.5} />
        <g stroke="#000">
          <ellipse cx={8.5} cy={8.5} rx={8.15} ry={8.15} fill="#1a1a1a" strokeWidth={0.7} />
          <circle cx={8.5} cy={8.5} r={6.347} fill="none" strokeWidth={0.3} />
          <circle cx={8.5} cy={8.5} r={4.349} fill="none" strokeWidth={0.3} />
          <circle cx={8.5} cy={8.5} r={1.374} fill="#ccc" strokeWidth={0.25} />
        </g>
        <text x={4} y={4} fill="#888" fontSize={2.5} fontWeight="bold">+</text>
      </g>
      {isActive && (
        <g opacity={0.4}>
          <circle cx={S * 8.5} cy={S * 8.5} r={S * 10} fill="none" stroke="#f59e0b" strokeWidth={0.8} />
          <circle cx={S * 8.5} cy={S * 8.5} r={S * 12} fill="none" stroke="#f59e0b" strokeWidth={0.5} />
        </g>
      )}
      <PinDot x={S * 7.23} y={S * 20} name="1" signal="digital" onClick={() => onPinClick?.('1')} />
      <PinDot x={S * 9.77} y={S * 20} name="2" signal="ground" onClick={() => onPinClick?.('2')} />
      {selected && <SelectionBox x={-2} y={-2} w={S * 17 + 4} h={S * 20 + 4} />}
    </g>
  );
}

// =========================================================
// Potentiometer
// =========================================================
export function PotentiometerComponent({ id, x, y, attrs, selected, onMouseDown, onPinClick }: ComponentProps) {
  const S = 2.75;
  return (
    <g id={id} transform={`translate(${x},${y})`} onMouseDown={onMouseDown} style={{ cursor: 'move' }}>
      <g transform={`scale(${S})`}>
        <rect x={0.15} y={0.15} width={19.5} height={19.5} ry={1.23} fill="#045881" stroke="#045881" strokeWidth={0.3} />
        <rect x={5.4} y={0.7} width={9.1} height={1.9} fill="#ccdae3" />
        <ellipse cx={9.91} cy={8.18} rx={7.27} ry={7.43} fill="#e4e8eb" />
        <ellipse cx={9.95} cy={8.06} rx={6.6} ry={6.58} fill="#c3c2c3" />
        <rect x={10} y={2} width={0.42} height={3.1} fill="#000" />
        <g fill="#fff">
          <ellipse cx={1.68} cy={1.81} rx={0.99} ry={0.96} />
          <ellipse cx={1.48} cy={18.37} rx={0.99} ry={0.96} />
          <ellipse cx={17.97} cy={18.47} rx={0.99} ry={0.96} />
          <ellipse cx={18.07} cy={1.91} rx={0.99} ry={0.96} />
        </g>
        <g fill="#b3b1b0">
          <ellipse cx={7.68} cy={18} rx={0.61} ry={0.63} />
          <ellipse cx={10.22} cy={18} rx={0.61} ry={0.63} />
          <ellipse cx={12.76} cy={18} rx={0.61} ry={0.63} />
        </g>
      </g>
      <PinDot x={S * 7.68} y={S * 19.5} name="GND" signal="ground" onClick={() => onPinClick?.('GND')} />
      <PinDot x={S * 10.22} y={S * 19.5} name="SIG" signal="analog" onClick={() => onPinClick?.('SIG')} />
      <PinDot x={S * 12.76} y={S * 19.5} name="VCC" signal="power" onClick={() => onPinClick?.('VCC')} />
      {selected && <SelectionBox x={-2} y={-2} w={S * 20 + 4} h={S * 20 + 4} />}
    </g>
  );
}

// =========================================================
// Servo Motor
// =========================================================
export function ServoComponent({ id, x, y, attrs, selected, onMouseDown, onPinClick }: ComponentProps) {
  const S = 0.5;
  return (
    <g id={id} transform={`translate(${x},${y})`} onMouseDown={onMouseDown} style={{ cursor: 'move' }}>
      <g transform={`scale(${S})`}>
        <g strokeWidth={2.7} fill="none">
          <path stroke="#b44200" d="m83.32,56.6c0,0-32.99,0.96-43.32,0-6.2-0.58-10.6-6.2-14.87-6.31" />
          <path stroke="#ff2300" d="m83.326 59.6h-62.971" />
          <path stroke="#f47b00" d="m83.32,62.6c0,0-32.6-0.61-43.33-0.15-6.87,0.29-12.01,6.82-14.77,6.73" />
        </g>
        <rect fill="#666" y={45.5} width={25.71} height={28} rx={1.14} />
        <g>
          <g><rect x={4.7} y={48.15} width={3.72} height={3.71} fill="#999" /><rect fill="#ccc" x={5.03} y={48.83} width={3.04} height={2.46} rx={0.15} /></g>
          <g><rect x={4.7} y={57.75} width={3.72} height={3.71} fill="#999" /><rect fill="#ccc" x={5.03} y={58.43} width={3.04} height={2.46} rx={0.15} /></g>
          <g><rect x={4.7} y={67.35} width={3.72} height={3.71} fill="#999" /><rect fill="#ccc" x={5.03} y={68.03} width={3.04} height={2.46} rx={0.15} /></g>
        </g>
        <rect fill="#3f7cac" x={87.86} y={32.16} width={76.22} height={54.88} rx={3.745} />
        <rect fill="#3f7cac" x={83.32} y={45.39} width={4.54} height={28.42} rx={1.5} />
        <rect fill="#3f7cac" x={164.14} y={45.39} width={5.94} height={28.42} rx={1.5} />
        <circle fill="gray" cx={91.47} cy={59.77} r={8.37} />
        <circle fill="#ccc" cx={91.47} cy={59.77} r={6.25} />
        <text x={120} y={64} fill="#fff" fontSize={10} fontWeight="bold" fontFamily="sans-serif">SG90</text>
      </g>
      <PinDot x={S * 4.7} y={S * 50} name="GND" signal="ground" onClick={() => onPinClick?.('GND')} />
      <PinDot x={S * 4.7} y={S * 59.6} name="V+" signal="power" onClick={() => onPinClick?.('V+')} />
      <PinDot x={S * 4.7} y={S * 69.3} name="PWM" signal="digital" onClick={() => onPinClick?.('PWM')} />
      {selected && <SelectionBox x={-4} y={S * 30} w={S * 170 + 8} h={S * 60 + 8} />}
    </g>
  );
}

// =========================================================
// LCD 1602
// =========================================================
export function LCD1602Component({ id, x, y, attrs, selected, onMouseDown, onPinClick }: ComponentProps) {
  const text1 = (attrs.text as string) || 'Hello, World!';
  const text2 = (attrs.text2 as string) || '';
  const S = 2;
  return (
    <g id={id} transform={`translate(${x},${y})`} onMouseDown={onMouseDown} style={{ cursor: 'move' }}>
      <g transform={`scale(${S})`}>
        <rect fill="#087f45" width={80} height={36} />
        <rect x={4.95} y={5.7} width={71.2} height={25.2} fill="#333" />
        <rect x={7.55} y={10.3} rx={1.5} ry={1.5} width={66} height={16} fill="#6cb201" />
        <g fill="#c8a92e">
          {Array.from({ length: 16 }).map((_, i) => (
            <rect key={i} x={-2.5} y={7.55 + i * 1.27} width={2.5} height={0.8} rx={0.1} />
          ))}
        </g>
        <text x={12.45} y={17} fill="#1a3a0f" fontSize={4.5} fontFamily="'Courier New', monospace" fontWeight="bold">{text1.substring(0, 16)}</text>
        <text x={12.45} y={24} fill="#1a3a0f" fontSize={4.5} fontFamily="'Courier New', monospace" fontWeight="bold">{text2.substring(0, 16)}</text>
        <text fill="white" fontSize={1.5} fontFamily="monospace" x={2} y={4}>LCD1602</text>
      </g>
      <PinDot x={-6} y={S * 8} name="VSS" signal="ground" onClick={() => onPinClick?.('VSS')} />
      <PinDot x={-6} y={S * 11} name="VDD" signal="power" onClick={() => onPinClick?.('VDD')} />
      <PinDot x={-6} y={S * 17} name="SDA" signal="digital" onClick={() => onPinClick?.('SDA')} />
      <PinDot x={-6} y={S * 20} name="SCL" signal="digital" onClick={() => onPinClick?.('SCL')} />
      {selected && <SelectionBox x={-4} y={-10} w={168} h={82} />}
    </g>
  );
}

// =========================================================
// DHT22
// =========================================================
export function DHT22Component({ id, x, y, attrs, selected, onMouseDown, onPinClick }: ComponentProps) {
  const S = 3;
  return (
    <g id={id} transform={`translate(${x},${y})`} onMouseDown={onMouseDown} style={{ cursor: 'move' }}>
      <g transform={`scale(${S})`}>
        <g fill="#ccc" strokeWidth={0.21}>
          <rect x={3.57} y={23.885} width={0.75} height={7} rx={0.2} />
          <rect x={6.11} y={23.885} width={0.75} height={7} rx={0.2} />
          <rect x={8.65} y={23.885} width={0.75} height={7} rx={0.2} />
          <rect x={11.19} y={23.885} width={0.75} height={7} rx={0.2} />
        </g>
        <path d="M15.05 23.995V5.033c0-0.107-1.069-4.962-2.662-4.96L2.803 0.09C1.193 0.09 0.05 4.926 0.05 5.033v18.962c0 0.107 0.086 0.192 0.192 0.192h14.616a0.192 0.192 0 000.192-0.192" fill="#e8e8e8" stroke="#ccc" strokeWidth={0.15} />
        <circle cx={7.615} cy={2.84} r={1.892} fill="#d5d5d5" stroke="#bbb" strokeWidth={0.1} />
        <g fill="#ddd" stroke="#ccc" strokeWidth={0.05}>
          {[8.66, 10.02, 11.37, 12.72, 14.07, 15.43, 16.78, 18.13].map((yy, i) => (
            <g key={i}>
              <rect x={4.97} y={yy} width={0.93} height={1.36} rx={0.21} />
              <rect x={7.13} y={yy} width={0.93} height={1.36} rx={0.21} />
              <rect x={9.29} y={yy} width={0.93} height={1.36} rx={0.21} />
            </g>
          ))}
        </g>
        <text x={7.5} y={7.5} textAnchor="middle" fill="#555" fontSize={1.8} fontWeight="bold" fontFamily="sans-serif">DHT22</text>
      </g>
      <PinDot x={S * 3.95} y={S * 30.9} name="VCC" signal="power" onClick={() => onPinClick?.('VCC')} />
      <PinDot x={S * 6.49} y={S * 30.9} name="SDA" signal="digital" onClick={() => onPinClick?.('SDA')} />
      <PinDot x={S * 9.03} y={S * 30.9} name="NC" signal="digital" onClick={() => onPinClick?.('NC')} />
      <PinDot x={S * 11.57} y={S * 30.9} name="GND" signal="ground" onClick={() => onPinClick?.('GND')} />
      {selected && <SelectionBox x={-4} y={-4} w={S * 15.1 + 8} h={S * 30.9 + 8} />}
    </g>
  );
}

// =========================================================
// Arduino Uno
// =========================================================
export function ArduinoUnoComponent({ id, x, y, attrs, selected, onMouseDown, onPinClick }: ComponentProps) {
  const W = 220, H = 280;
  return (
    <g id={id} transform={`translate(${x},${y})`} onMouseDown={onMouseDown} style={{ cursor: 'move' }}>
      {selected && <SelectionBox x={-6} y={-6} w={W + 12} h={H + 12} rx={12} />}
      <rect x={0} y={0} width={W} height={H} rx={6} fill="#0068a5" stroke="#005080" strokeWidth={1.2} />
      <circle cx={12} cy={14} r={4} fill="#004070" /><circle cx={208} cy={14} r={4} fill="#004070" />
      <circle cx={12} cy={266} r={4} fill="#004070" /><circle cx={208} cy={266} r={4} fill="#004070" />
      <rect x={80} y={120} width={60} height={36} rx={2} fill="#222" stroke="#444" strokeWidth={0.5} />
      <circle cx={85} cy={125} r={1.5} fill="#555" />
      <text x={110} y={142} textAnchor="middle" fill="#888" fontSize={6} fontFamily="monospace">ATmega328P</text>
      <rect x={85} y={254} width={50} height={26} rx={3} fill="#bbb" stroke="#999" strokeWidth={1} />
      <rect x={91} y={260} width={38} height={14} rx={2} fill="#888" />
      <rect x={10} y={254} width={26} height={22} rx={2} fill="#222" stroke="#444" strokeWidth={0.8} />
      <text x={110} y={100} textAnchor="middle" fill="#87ceeb" fontSize={14} fontWeight="bold">ARDUINO</text>
      <text x={110} y={112} textAnchor="middle" fill="#87ceeb" fontSize={8}>UNO R3</text>
      <circle cx={168} cy={172} r={2} fill="#22c55e" opacity={0.8} />
      {['D0','D1','D2','D3','D4','D5','D6','D7','D8','D9','D10','D11','D12','D13','GND','AREF'].map((name, i) => (
        <g key={`dp-${name}`}>
          <rect x={25 + i * 11.5} y={0} width={6} height={10} rx={0.5} fill="#333" />
          <rect x={26.5 + i * 11.5} y={1} width={3} height={8} rx={0.3} fill="#c8a92e" />
          <PinDot x={28 + i * 11.5} y={-3} name={name} signal={name.includes('GND') ? 'ground' : 'digital'} onClick={() => onPinClick?.(name)} />
        </g>
      ))}
      {['A0','A1','A2','A3','A4','A5','VIN','GND.2','GND.3','5V','3V3','RST'].map((name, i) => (
        <g key={`ap-${name}`}>
          <rect x={40 + i * 12} y={H - 10} width={6} height={10} rx={0.5} fill="#333" />
          <rect x={41.5 + i * 12} y={H - 9} width={3} height={8} rx={0.3} fill="#c8a92e" />
          <PinDot x={43 + i * 12} y={H + 3} name={name}
            signal={name.includes('GND') ? 'ground' : name.includes('V') ? 'power' : 'analog'}
            onClick={() => onPinClick?.(name)} />
        </g>
      ))}
    </g>
  );
}

// =========================================================
// Generic Board Component (for Arduino Mega, Nano, ESP32-S2/S3/C3, Pi Pico, ATtiny85)
// =========================================================
export function GenericBoardComponent({ id, x, y, attrs, selected, onMouseDown, onPinClick }: ComponentProps & { label: string; w: number; h: number; color: string }) {
  const { label, w, h, color } = attrs as any;
  const W = w || 100, H = h || 150;
  const boardColor = color || '#0068a5';
  return (
    <g id={id} transform={`translate(${x},${y})`} onMouseDown={onMouseDown} style={{ cursor: 'move' }}>
      {selected && <SelectionBox x={-6} y={-6} w={W + 12} h={H + 12} rx={8} />}
      <rect x={0} y={0} width={W} height={H} rx={4} fill={boardColor} stroke="#333" strokeWidth={1} />
      <rect x={W / 2 - 15} y={4} width={30} height={12} rx={2} fill="#333" />
      <text x={W / 2} y={H / 2} textAnchor="middle" fill="#fff" fontSize={10} fontWeight="bold">{(attrs._label as string) || 'BOARD'}</text>
    </g>
  );
}

// =========================================================
// NEW DISPLAY COMPONENTS
// =========================================================

// NeoPixel Ring
export function NeoPixelRingComponent({ id, x, y, attrs, selected, onMouseDown, onPinClick }: ComponentProps) {
  const pixels = parseInt(String(attrs.pixels || '16'));
  return (
    <g id={id} transform={`translate(${x},${y})`} onMouseDown={onMouseDown} style={{ cursor: 'move' }}>
      <circle cx={40} cy={40} r={38} fill="#1a1a1a" stroke="#333" strokeWidth={1} />
      <circle cx={40} cy={40} r={28} fill="none" stroke="#333" strokeWidth={0.5} />
      {Array.from({ length: pixels }).map((_, i) => {
        const angle = (i / pixels) * Math.PI * 2 - Math.PI / 2;
        const cx = 40 + Math.cos(angle) * 30;
        const cy = 40 + Math.sin(angle) * 30;
        return <circle key={i} cx={cx} cy={cy} r={3} fill="#444" stroke="#555" strokeWidth={0.5} />;
      })}
      <text x={40} y={44} textAnchor="middle" fill="#888" fontSize={7}>WS2812</text>
      <PinDot x={10} y={80} name="GND" signal="ground" onClick={() => onPinClick?.('GND')} />
      <PinDot x={30} y={80} name="VCC" signal="power" onClick={() => onPinClick?.('VCC')} />
      <PinDot x={50} y={80} name="DIN" signal="digital" onClick={() => onPinClick?.('DIN')} />
      <PinDot x={70} y={80} name="DOUT" signal="digital" onClick={() => onPinClick?.('DOUT')} />
      {selected && <SelectionBox x={-4} y={-4} w={88} h={88} />}
    </g>
  );
}

// LED Strip
export function LEDStripComponent({ id, x, y, attrs, selected, onMouseDown, onPinClick }: ComponentProps) {
  const pixels = parseInt(String(attrs.pixels || '8'));
  return (
    <g id={id} transform={`translate(${x},${y})`} onMouseDown={onMouseDown} style={{ cursor: 'move' }}>
      <rect x={0} y={0} width={200} height={30} rx={3} fill="#1a1a1a" stroke="#333" strokeWidth={1} />
      {Array.from({ length: pixels }).map((_, i) => (
        <g key={i}>
          <rect x={8 + i * 24} y={6} width={18} height={18} rx={2} fill="#2a2a2a" stroke="#444" strokeWidth={0.5} />
          <circle cx={17 + i * 24} cy={15} r={4} fill="#444" />
        </g>
      ))}
      <PinDot x={0} y={25} name="GND" signal="ground" onClick={() => onPinClick?.('GND')} />
      <PinDot x={0} y={15} name="VCC" signal="power" onClick={() => onPinClick?.('VCC')} />
      <PinDot x={0} y={5} name="DIN" signal="digital" onClick={() => onPinClick?.('DIN')} />
      {selected && <SelectionBox x={-4} y={-4} w={208} h={38} />}
    </g>
  );
}

// LED Matrix
export function LEDMatrixComponent({ id, x, y, attrs, selected, onMouseDown, onPinClick }: ComponentProps) {
  return (
    <g id={id} transform={`translate(${x},${y})`} onMouseDown={onMouseDown} style={{ cursor: 'move' }}>
      <rect x={0} y={0} width={100} height={100} rx={3} fill="#1a1a1a" stroke="#333" strokeWidth={1} />
      {Array.from({ length: 8 }).map((_, row) =>
        Array.from({ length: 8 }).map((_, col) => (
          <circle key={`${row}-${col}`} cx={12 + col * 11} cy={12 + row * 11} r={3} fill="#333" stroke="#555" strokeWidth={0.3} />
        ))
      )}
      <text x={50} y={96} textAnchor="middle" fill="#666" fontSize={5}>8x8 NeoPixel</text>
      <PinDot x={10} y={100} name="GND" signal="ground" onClick={() => onPinClick?.('GND')} />
      <PinDot x={30} y={100} name="VCC" signal="power" onClick={() => onPinClick?.('VCC')} />
      <PinDot x={50} y={100} name="DIN" signal="digital" onClick={() => onPinClick?.('DIN')} />
      {selected && <SelectionBox x={-4} y={-4} w={108} h={108} />}
    </g>
  );
}

// Seven Segment Display
export function SevenSegmentComponent({ id, x, y, attrs, selected, onMouseDown, onPinClick }: ComponentProps) {
  const color = (attrs.color as string) || 'red';
  return (
    <g id={id} transform={`translate(${x},${y})`} onMouseDown={onMouseDown} style={{ cursor: 'move' }}>
      <rect x={0} y={0} width={50} height={70} rx={2} fill="#1a1a1a" stroke="#333" strokeWidth={1} />
      {/* Segment pattern */}
      <rect x={14} y={8} width={22} height={4} rx={1} fill={color} opacity={0.3} />  {/* A */}
      <rect x={36} y={13} width={4} height={20} rx={1} fill={color} opacity={0.3} /> {/* B */}
      <rect x={36} y={37} width={4} height={20} rx={1} fill={color} opacity={0.3} /> {/* C */}
      <rect x={14} y={56} width={22} height={4} rx={1} fill={color} opacity={0.3} /> {/* D */}
      <rect x={10} y={37} width={4} height={20} rx={1} fill={color} opacity={0.3} /> {/* E */}
      <rect x={10} y={13} width={4} height={20} rx={1} fill={color} opacity={0.3} /> {/* F */}
      <rect x={14} y={32} width={22} height={4} rx={1} fill={color} opacity={0.3} /> {/* G */}
      <circle cx={44} cy={60} r={2} fill={color} opacity={0.3} /> {/* DP */}
      {selected && <SelectionBox x={-4} y={-4} w={58} h={78} />}
    </g>
  );
}

// Seven Segment 4 Digit
export function SevenSegment4DigitComponent({ id, x, y, attrs, selected, onMouseDown }: ComponentProps) {
  const color = (attrs.color as string) || 'red';
  return (
    <g id={id} transform={`translate(${x},${y})`} onMouseDown={onMouseDown} style={{ cursor: 'move' }}>
      <rect x={0} y={0} width={120} height={70} rx={2} fill="#1a1a1a" stroke="#333" strokeWidth={1} />
      {[0, 1, 2, 3].map(d => (
        <g key={d} transform={`translate(${5 + d * 28}, 0)`}>
          <rect x={4} y={8} width={16} height={3} rx={0.5} fill={color} opacity={0.3} />
          <rect x={20} y={12} width={3} height={15} rx={0.5} fill={color} opacity={0.3} />
          <rect x={20} y={35} width={3} height={15} rx={0.5} fill={color} opacity={0.3} />
          <rect x={4} y={54} width={16} height={3} rx={0.5} fill={color} opacity={0.3} />
          <rect x={1} y={35} width={3} height={15} rx={0.5} fill={color} opacity={0.3} />
          <rect x={1} y={12} width={3} height={15} rx={0.5} fill={color} opacity={0.3} />
          <rect x={4} y={30} width={16} height={3} rx={0.5} fill={color} opacity={0.3} />
        </g>
      ))}
      {/* Colons */}
      <circle cx={60} cy={28} r={2} fill={color} opacity={0.4} />
      <circle cx={60} cy={45} r={2} fill={color} opacity={0.4} />
      {selected && <SelectionBox x={-4} y={-4} w={128} h={78} />}
    </g>
  );
}

// TM1637 Display
export function TM1637Component({ id, x, y, attrs, selected, onMouseDown, onPinClick }: ComponentProps) {
  return (
    <g id={id} transform={`translate(${x},${y})`} onMouseDown={onMouseDown} style={{ cursor: 'move' }}>
      <rect x={0} y={0} width={120} height={55} rx={3} fill="#c41010" stroke="#a00" strokeWidth={1} />
      <rect x={8} y={6} width={104} height={36} rx={2} fill="#1a1a1a" />
      {[0, 1, 2, 3].map(d => (
        <g key={d} transform={`translate(${12 + d * 25}, 8)`}>
          <rect x={3} y={2} width={14} height={2.5} rx={0.5} fill="red" opacity={0.4} />
          <rect x={17} y={5} width={2.5} height={10} rx={0.5} fill="red" opacity={0.4} />
          <rect x={17} y={18} width={2.5} height={10} rx={0.5} fill="red" opacity={0.4} />
          <rect x={3} y={30} width={14} height={2.5} rx={0.5} fill="red" opacity={0.4} />
          <rect x={0.5} y={18} width={2.5} height={10} rx={0.5} fill="red" opacity={0.4} />
          <rect x={0.5} y={5} width={2.5} height={10} rx={0.5} fill="red" opacity={0.4} />
          <rect x={3} y={15} width={14} height={2.5} rx={0.5} fill="red" opacity={0.4} />
        </g>
      ))}
      <PinDot x={20} y={55} name="CLK" signal="digital" onClick={() => onPinClick?.('CLK')} />
      <PinDot x={40} y={55} name="DIO" signal="digital" onClick={() => onPinClick?.('DIO')} />
      <PinDot x={80} y={55} name="VCC" signal="power" onClick={() => onPinClick?.('VCC')} />
      <PinDot x={100} y={55} name="GND" signal="ground" onClick={() => onPinClick?.('GND')} />
      {selected && <SelectionBox x={-4} y={-4} w={128} h={63} />}
    </g>
  );
}

// LED Bar Graph
export function LEDBarGraphComponent({ id, x, y, attrs, selected, onMouseDown }: ComponentProps) {
  const colors = ['#22c55e', '#22c55e', '#22c55e', '#22c55e', '#22c55e', '#22c55e', '#22c55e', '#f59e0b', '#ef4444', '#ef4444'];
  return (
    <g id={id} transform={`translate(${x},${y})`} onMouseDown={onMouseDown} style={{ cursor: 'move' }}>
      <rect x={0} y={0} width={50} height={80} rx={2} fill="#333" stroke="#555" strokeWidth={0.5} />
      {colors.map((c, i) => (
        <rect key={i} x={8} y={4 + i * 7.2} width={34} height={5.5} rx={1} fill={c} opacity={0.4} />
      ))}
      {selected && <SelectionBox x={-4} y={-4} w={58} h={88} />}
    </g>
  );
}

// SSD1306 OLED
export function SSD1306Component({ id, x, y, attrs, selected, onMouseDown, onPinClick }: ComponentProps) {
  return (
    <g id={id} transform={`translate(${x},${y})`} onMouseDown={onMouseDown} style={{ cursor: 'move' }}>
      <rect x={0} y={0} width={80} height={50} rx={2} fill="#1565c0" stroke="#0d47a1" strokeWidth={1} />
      <rect x={5} y={3} width={70} height={34} rx={1} fill="#000" />
      <text x={40} y={22} textAnchor="middle" fill="#fff" fontSize={6} fontFamily="monospace">128x64 OLED</text>
      <text x={40} y={48} textAnchor="middle" fill="#fff" fontSize={4}>SSD1306</text>
      <PinDot x={15} y={50} name="GND" signal="ground" onClick={() => onPinClick?.('GND')} />
      <PinDot x={30} y={50} name="VCC" signal="power" onClick={() => onPinClick?.('VCC')} />
      <PinDot x={45} y={50} name="SCL" signal="digital" onClick={() => onPinClick?.('SCL')} />
      <PinDot x={60} y={50} name="SDA" signal="digital" onClick={() => onPinClick?.('SDA')} />
      {selected && <SelectionBox x={-4} y={-4} w={88} h={58} />}
    </g>
  );
}

// ILI9341 LCD
export function ILI9341Component({ id, x, y, attrs, selected, onMouseDown }: ComponentProps) {
  return (
    <g id={id} transform={`translate(${x},${y})`} onMouseDown={onMouseDown} style={{ cursor: 'move' }}>
      <rect x={0} y={0} width={120} height={160} rx={3} fill="#c41010" stroke="#a00" strokeWidth={1} />
      <rect x={8} y={12} width={104} height={136} rx={2} fill="#000" />
      <text x={60} y={80} textAnchor="middle" fill="#333" fontSize={8}>320x240</text>
      <text x={60} y={10} textAnchor="middle" fill="#fff" fontSize={5}>ILI9341</text>
      {selected && <SelectionBox x={-4} y={-4} w={128} h={168} />}
    </g>
  );
}

// LCD 2004
export function LCD2004Component({ id, x, y, attrs, selected, onMouseDown, onPinClick }: ComponentProps) {
  const S = 2;
  return (
    <g id={id} transform={`translate(${x},${y})`} onMouseDown={onMouseDown} style={{ cursor: 'move' }}>
      <g transform={`scale(${S})`}>
        <rect fill="#087f45" width={90} height={45} />
        <rect x={5} y={5} width={80} height={35} fill="#333" />
        <rect x={8} y={8} rx={1.5} ry={1.5} width={74} height={29} fill="#6cb201" />
        <text fill="white" fontSize={1.5} fontFamily="monospace" x={2} y={4}>LCD2004</text>
        {[0, 1, 2, 3].map(line => (
          <text key={line} x={12} y={15 + line * 6} fill="#1a3a0f" fontSize={3.5} fontFamily="'Courier New', monospace">
            {line === 0 ? 'Hello World!' : ''}
          </text>
        ))}
      </g>
      <PinDot x={-6} y={S * 10} name="VSS" signal="ground" onClick={() => onPinClick?.('VSS')} />
      <PinDot x={-6} y={S * 14} name="VDD" signal="power" onClick={() => onPinClick?.('VDD')} />
      <PinDot x={-6} y={S * 22} name="SDA" signal="digital" onClick={() => onPinClick?.('SDA')} />
      <PinDot x={-6} y={S * 26} name="SCL" signal="digital" onClick={() => onPinClick?.('SCL')} />
      {selected && <SelectionBox x={-4} y={-4} w={188} h={98} />}
    </g>
  );
}

// MAX7219 Dot Matrix
export function MAX7219Component({ id, x, y, attrs, selected, onMouseDown }: ComponentProps) {
  return (
    <g id={id} transform={`translate(${x},${y})`} onMouseDown={onMouseDown} style={{ cursor: 'move' }}>
      <rect x={0} y={0} width={65} height={65} rx={2} fill="#2a5016" stroke="#1a3010" strokeWidth={1} />
      {Array.from({ length: 8 }).map((_, row) =>
        Array.from({ length: 8 }).map((_, col) => (
          <circle key={`${row}-${col}`} cx={8 + col * 7} cy={8 + row * 7} r={2.5} fill="#400" opacity={0.6} />
        ))
      )}
      <text x={32} y={62} textAnchor="middle" fill="#aaa" fontSize={4}>MAX7219</text>
      {selected && <SelectionBox x={-4} y={-4} w={73} h={73} />}
    </g>
  );
}

// =========================================================
// NEW INPUT COMPONENTS
// =========================================================

// Slide Potentiometer
export function SlidePotentiometerComponent({ id, x, y, attrs, selected, onMouseDown, onPinClick }: ComponentProps) {
  return (
    <g id={id} transform={`translate(${x},${y})`} onMouseDown={onMouseDown} style={{ cursor: 'move' }}>
      <rect x={0} y={0} width={120} height={25} rx={3} fill="#333" stroke="#555" strokeWidth={0.5} />
      <rect x={10} y={10} width={100} height={5} rx={2} fill="#666" />
      <rect x={55} y={3} width={10} height={19} rx={2} fill="#ccc" stroke="#aaa" strokeWidth={0.5} />
      <PinDot x={20} y={25} name="VCC" signal="power" onClick={() => onPinClick?.('VCC')} />
      <PinDot x={60} y={25} name="SIG" signal="analog" onClick={() => onPinClick?.('SIG')} />
      <PinDot x={100} y={25} name="GND" signal="ground" onClick={() => onPinClick?.('GND')} />
      {selected && <SelectionBox x={-4} y={-4} w={128} h={33} />}
    </g>
  );
}

// Analog Joystick
export function AnalogJoystickComponent({ id, x, y, attrs, selected, onMouseDown, onPinClick }: ComponentProps) {
  return (
    <g id={id} transform={`translate(${x},${y})`} onMouseDown={onMouseDown} style={{ cursor: 'move' }}>
      <rect x={0} y={0} width={70} height={60} rx={3} fill="#1565c0" stroke="#0d47a1" strokeWidth={1} />
      <circle cx={35} cy={28} r={20} fill="#333" />
      <circle cx={35} cy={28} r={12} fill="#555" />
      <circle cx={35} cy={28} r={8} fill="#777" />
      <PinDot x={10} y={60} name="VCC" signal="power" onClick={() => onPinClick?.('VCC')} />
      <PinDot x={22} y={60} name="VERT" signal="analog" onClick={() => onPinClick?.('VERT')} />
      <PinDot x={34} y={60} name="HORZ" signal="analog" onClick={() => onPinClick?.('HORZ')} />
      <PinDot x={46} y={60} name="SEL" signal="digital" onClick={() => onPinClick?.('SEL')} />
      <PinDot x={58} y={60} name="GND" signal="ground" onClick={() => onPinClick?.('GND')} />
      {selected && <SelectionBox x={-4} y={-4} w={78} h={68} />}
    </g>
  );
}

// Membrane Keypad
export function MembraneKeypadComponent({ id, x, y, attrs, selected, onMouseDown }: ComponentProps) {
  const keys = ['1','2','3','A','4','5','6','B','7','8','9','C','*','0','#','D'];
  return (
    <g id={id} transform={`translate(${x},${y})`} onMouseDown={onMouseDown} style={{ cursor: 'move' }}>
      <rect x={0} y={0} width={80} height={100} rx={3} fill="#e8e8e8" stroke="#ccc" strokeWidth={1} />
      {keys.map((k, i) => {
        const row = Math.floor(i / 4), col = i % 4;
        return (
          <g key={k}>
            <rect x={6 + col * 18} y={6 + row * 22} width={16} height={18} rx={2} fill="#ddd" stroke="#bbb" strokeWidth={0.5} />
            <text x={14 + col * 18} y={19 + row * 22} textAnchor="middle" fill="#333" fontSize={8} fontWeight="bold">{k}</text>
          </g>
        );
      })}
      {selected && <SelectionBox x={-4} y={-4} w={88} h={108} />}
    </g>
  );
}

// Rotary Encoder KY-040
export function RotaryEncoderComponent({ id, x, y, attrs, selected, onMouseDown, onPinClick }: ComponentProps) {
  return (
    <g id={id} transform={`translate(${x},${y})`} onMouseDown={onMouseDown} style={{ cursor: 'move' }}>
      <rect x={0} y={0} width={40} height={40} rx={2} fill="#1565c0" stroke="#0d47a1" strokeWidth={1} />
      <circle cx={20} cy={18} r={12} fill="#333" />
      <circle cx={20} cy={18} r={8} fill="#555" />
      <rect x={18} y={6} width={4} height={8} rx={1} fill="#888" />
      <PinDot x={5} y={40} name="CLK" signal="digital" onClick={() => onPinClick?.('CLK')} />
      <PinDot x={13} y={40} name="DT" signal="digital" onClick={() => onPinClick?.('DT')} />
      <PinDot x={21} y={40} name="SW" signal="digital" onClick={() => onPinClick?.('SW')} />
      <PinDot x={29} y={40} name="VCC" signal="power" onClick={() => onPinClick?.('VCC')} />
      <PinDot x={37} y={40} name="GND" signal="ground" onClick={() => onPinClick?.('GND')} />
      {selected && <SelectionBox x={-4} y={-4} w={48} h={48} />}
    </g>
  );
}

// Slide Switch
export function SlideSwitchComponent({ id, x, y, attrs, selected, onMouseDown, onPinClick }: ComponentProps) {
  return (
    <g id={id} transform={`translate(${x},${y})`} onMouseDown={onMouseDown} style={{ cursor: 'move' }}>
      <rect x={0} y={0} width={30} height={12} rx={2} fill="#333" stroke="#555" strokeWidth={0.5} />
      <rect x={2} y={3} width={12} height={6} rx={1} fill="#ccc" />
      <line x1={5} y1={12} x2={5} y2={20} stroke="#aaa" strokeWidth={1.5} />
      <line x1={15} y1={12} x2={15} y2={20} stroke="#aaa" strokeWidth={1.5} />
      <line x1={25} y1={12} x2={25} y2={20} stroke="#aaa" strokeWidth={1.5} />
      <PinDot x={5} y={20} name="1" signal="digital" onClick={() => onPinClick?.('1')} />
      <PinDot x={15} y={20} name="2" signal="digital" onClick={() => onPinClick?.('2')} />
      <PinDot x={25} y={20} name="3" signal="digital" onClick={() => onPinClick?.('3')} />
      {selected && <SelectionBox x={-4} y={-4} w={38} h={28} />}
    </g>
  );
}

// DIP Switch 8
export function DIPSwitch8Component({ id, x, y, attrs, selected, onMouseDown }: ComponentProps) {
  return (
    <g id={id} transform={`translate(${x},${y})`} onMouseDown={onMouseDown} style={{ cursor: 'move' }}>
      <rect x={0} y={0} width={80} height={25} rx={2} fill="#c41010" stroke="#900" strokeWidth={0.5} />
      {Array.from({ length: 8 }).map((_, i) => (
        <g key={i}>
          <rect x={5 + i * 9} y={3} width={6} height={19} rx={1} fill="#800" />
          <rect x={5.5 + i * 9} y={3} width={5} height={9} rx={0.5} fill="#ddd" />
        </g>
      ))}
      <text x={40} y={23} textAnchor="middle" fill="#fff" fontSize={3}>DIP SW</text>
      {selected && <SelectionBox x={-4} y={-4} w={88} h={33} />}
    </g>
  );
}

// =========================================================
// NEW SENSOR COMPONENTS
// =========================================================

// PIR Motion Sensor
export function PIRSensorComponent({ id, x, y, attrs, selected, onMouseDown, onPinClick }: ComponentProps) {
  return (
    <g id={id} transform={`translate(${x},${y})`} onMouseDown={onMouseDown} style={{ cursor: 'move' }}>
      <rect x={5} y={25} width={50} height={35} rx={3} fill="#2a5016" stroke="#1a3010" strokeWidth={1} />
      <circle cx={30} cy={22} r={22} fill="#e8e8e8" stroke="#ccc" strokeWidth={0.5} />
      <circle cx={30} cy={20} r={16} fill="#f5f5f5" opacity={0.8} />
      <text x={30} y={55} textAnchor="middle" fill="#aaa" fontSize={5}>PIR</text>
      <PinDot x={15} y={60} name="GND" signal="ground" onClick={() => onPinClick?.('GND')} />
      <PinDot x={30} y={60} name="OUT" signal="digital" onClick={() => onPinClick?.('OUT')} />
      <PinDot x={45} y={60} name="VCC" signal="power" onClick={() => onPinClick?.('VCC')} />
      {selected && <SelectionBox x={-2} y={-4} w={64} h={68} />}
    </g>
  );
}

// HC-SR04 Ultrasonic
export function HCSR04Component({ id, x, y, attrs, selected, onMouseDown, onPinClick }: ComponentProps) {
  return (
    <g id={id} transform={`translate(${x},${y})`} onMouseDown={onMouseDown} style={{ cursor: 'move' }}>
      <rect x={0} y={0} width={80} height={35} rx={2} fill="#1565c0" stroke="#0d47a1" strokeWidth={1} />
      <circle cx={20} cy={17} r={12} fill="#ccc" stroke="#aaa" strokeWidth={1} />
      <circle cx={60} cy={17} r={12} fill="#ccc" stroke="#aaa" strokeWidth={1} />
      <circle cx={20} cy={17} r={8} fill="#999" />
      <circle cx={60} cy={17} r={8} fill="#999" />
      <text x={40} y={7} textAnchor="middle" fill="#fff" fontSize={4}>HC-SR04</text>
      <PinDot x={15} y={35} name="VCC" signal="power" onClick={() => onPinClick?.('VCC')} />
      <PinDot x={30} y={35} name="TRIG" signal="digital" onClick={() => onPinClick?.('TRIG')} />
      <PinDot x={50} y={35} name="ECHO" signal="digital" onClick={() => onPinClick?.('ECHO')} />
      <PinDot x={65} y={35} name="GND" signal="ground" onClick={() => onPinClick?.('GND')} />
      {selected && <SelectionBox x={-4} y={-4} w={88} h={43} />}
    </g>
  );
}

// NTC Temperature Sensor
export function NTCSensorComponent({ id, x, y, attrs, selected, onMouseDown, onPinClick }: ComponentProps) {
  return (
    <g id={id} transform={`translate(${x},${y})`} onMouseDown={onMouseDown} style={{ cursor: 'move' }}>
      <line x1={8} y1={20} x2={8} y2={35} stroke="#aaa" strokeWidth={1.5} />
      <line x1={17} y1={20} x2={17} y2={35} stroke="#aaa" strokeWidth={1.5} />
      <ellipse cx={12.5} cy={12} rx={8} ry={12} fill="#2a4a6a" stroke="#1a3050" strokeWidth={0.5} />
      <text x={12.5} y={14} textAnchor="middle" fill="#aaa" fontSize={4}>NTC</text>
      <PinDot x={8} y={35} name="1" signal="analog" onClick={() => onPinClick?.('1')} />
      <PinDot x={17} y={35} name="2" signal="analog" onClick={() => onPinClick?.('2')} />
      {selected && <SelectionBox x={-2} y={-4} w={29} h={43} />}
    </g>
  );
}

// Photoresistor (LDR)
export function PhotoresistorComponent({ id, x, y, attrs, selected, onMouseDown, onPinClick }: ComponentProps) {
  return (
    <g id={id} transform={`translate(${x},${y})`} onMouseDown={onMouseDown} style={{ cursor: 'move' }}>
      <line x1={8} y1={20} x2={8} y2={35} stroke="#aaa" strokeWidth={1.5} />
      <line x1={17} y1={20} x2={17} y2={35} stroke="#aaa" strokeWidth={1.5} />
      <circle cx={12.5} cy={12} r={10} fill="#c63" stroke="#a42" strokeWidth={0.5} />
      <path d="M7 12 L18 12 M7 9 L18 9 M7 15 L18 15" stroke="#d84" strokeWidth={0.8} fill="none" />
      <text x={12.5} y={-2} textAnchor="middle" fill="#94a3b8" fontSize={6}>LDR</text>
      <PinDot x={8} y={35} name="1" signal="analog" onClick={() => onPinClick?.('1')} />
      <PinDot x={17} y={35} name="2" signal="analog" onClick={() => onPinClick?.('2')} />
      {selected && <SelectionBox x={-2} y={-4} w={29} h={43} />}
    </g>
  );
}

// IR Receiver
export function IRReceiverComponent({ id, x, y, attrs, selected, onMouseDown, onPinClick }: ComponentProps) {
  return (
    <g id={id} transform={`translate(${x},${y})`} onMouseDown={onMouseDown} style={{ cursor: 'move' }}>
      <path d="M2 22 V5 Q2 0 10 0 Q18 0 18 5 V22 Z" fill="#222" stroke="#444" strokeWidth={0.5} />
      <circle cx={10} cy={10} r={4} fill="#333" />
      <PinDot x={3} y={22} name="GND" signal="ground" onClick={() => onPinClick?.('GND')} />
      <PinDot x={10} y={22} name="VCC" signal="power" onClick={() => onPinClick?.('VCC')} />
      <PinDot x={17} y={22} name="DAT" signal="digital" onClick={() => onPinClick?.('DAT')} />
      {selected && <SelectionBox x={-2} y={-4} w={24} h={30} />}
    </g>
  );
}

// DS1307 RTC
export function DS1307Component({ id, x, y, attrs, selected, onMouseDown, onPinClick }: ComponentProps) {
  return (
    <g id={id} transform={`translate(${x},${y})`} onMouseDown={onMouseDown} style={{ cursor: 'move' }}>
      <rect x={0} y={0} width={40} height={40} rx={2} fill="#1565c0" stroke="#0d47a1" strokeWidth={1} />
      <circle cx={20} cy={16} r={10} fill="#333" stroke="#555" strokeWidth={0.5} />
      <text x={20} y={19} textAnchor="middle" fill="#aaa" fontSize={5}>RTC</text>
      <text x={20} y={36} textAnchor="middle" fill="#fff" fontSize={4}>DS1307</text>
      <PinDot x={5} y={40} name="GND" signal="ground" onClick={() => onPinClick?.('GND')} />
      <PinDot x={15} y={40} name="VCC" signal="power" onClick={() => onPinClick?.('VCC')} />
      <PinDot x={25} y={40} name="SDA" signal="digital" onClick={() => onPinClick?.('SDA')} />
      <PinDot x={35} y={40} name="SCL" signal="digital" onClick={() => onPinClick?.('SCL')} />
      {selected && <SelectionBox x={-4} y={-4} w={48} h={48} />}
    </g>
  );
}

// MPU6050 Accelerometer
export function MPU6050Component({ id, x, y, attrs, selected, onMouseDown, onPinClick }: ComponentProps) {
  return (
    <g id={id} transform={`translate(${x},${y})`} onMouseDown={onMouseDown} style={{ cursor: 'move' }}>
      <rect x={0} y={0} width={40} height={45} rx={2} fill="#8e24aa" stroke="#6a1b9a" strokeWidth={1} />
      <rect x={10} y={10} width={20} height={15} rx={1} fill="#222" stroke="#444" strokeWidth={0.5} />
      <text x={20} y={20} textAnchor="middle" fill="#aaa" fontSize={3}>6050</text>
      <text x={20} y={40} textAnchor="middle" fill="#fff" fontSize={4}>MPU6050</text>
      <PinDot x={5} y={-4} name="VCC" signal="power" onClick={() => onPinClick?.('VCC')} />
      <PinDot x={12} y={-4} name="GND" signal="ground" onClick={() => onPinClick?.('GND')} />
      <PinDot x={19} y={-4} name="SCL" signal="digital" onClick={() => onPinClick?.('SCL')} />
      <PinDot x={26} y={-4} name="SDA" signal="digital" onClick={() => onPinClick?.('SDA')} />
      {selected && <SelectionBox x={-4} y={-8} w={48} h={57} />}
    </g>
  );
}

// =========================================================
// NEW OUTPUT/ACTUATOR COMPONENTS
// =========================================================

// Stepper Motor
export function StepperMotorComponent({ id, x, y, attrs, selected, onMouseDown, onPinClick }: ComponentProps) {
  return (
    <g id={id} transform={`translate(${x},${y})`} onMouseDown={onMouseDown} style={{ cursor: 'move' }}>
      <circle cx={35} cy={30} r={28} fill="#666" stroke="#555" strokeWidth={1} />
      <circle cx={35} cy={30} r={22} fill="#888" />
      <circle cx={35} cy={30} r={5} fill="#aaa" />
      <rect x={33} y={5} width={4} height={12} fill="#aaa" />
      <text x={35} y={55} textAnchor="middle" fill="#94a3b8" fontSize={6}>Stepper</text>
      <PinDot x={10} y={60} name="A-" signal="digital" onClick={() => onPinClick?.('A-')} />
      <PinDot x={25} y={60} name="A+" signal="digital" onClick={() => onPinClick?.('A+')} />
      <PinDot x={45} y={60} name="B+" signal="digital" onClick={() => onPinClick?.('B+')} />
      <PinDot x={60} y={60} name="B-" signal="digital" onClick={() => onPinClick?.('B-')} />
      {selected && <SelectionBox x={-2} y={-2} w={74} h={66} />}
    </g>
  );
}

// Relay Module
export function RelayModuleComponent({ id, x, y, attrs, selected, onMouseDown, onPinClick }: ComponentProps) {
  return (
    <g id={id} transform={`translate(${x},${y})`} onMouseDown={onMouseDown} style={{ cursor: 'move' }}>
      <rect x={0} y={0} width={60} height={60} rx={3} fill="#1565c0" stroke="#0d47a1" strokeWidth={1} />
      <rect x={8} y={8} width={44} height={30} rx={2} fill="#333" stroke="#555" strokeWidth={0.5} />
      <text x={30} y={26} textAnchor="middle" fill="#3b82f6" fontSize={6}>RELAY</text>
      <circle cx={15} cy={50} r={3} fill="#22c55e" opacity={0.6} />
      <text x={30} y={54} textAnchor="middle" fill="#aaa" fontSize={4}>1CH</text>
      <PinDot x={10} y={-4} name="VCC" signal="power" onClick={() => onPinClick?.('VCC')} />
      <PinDot x={30} y={-4} name="GND" signal="ground" onClick={() => onPinClick?.('GND')} />
      <PinDot x={50} y={-4} name="IN" signal="digital" onClick={() => onPinClick?.('IN')} />
      <PinDot x={10} y={64} name="NC" signal="digital" onClick={() => onPinClick?.('NC')} />
      <PinDot x={30} y={64} name="COM" signal="digital" onClick={() => onPinClick?.('COM')} />
      <PinDot x={50} y={64} name="NO" signal="digital" onClick={() => onPinClick?.('NO')} />
      {selected && <SelectionBox x={-4} y={-8} w={68} h={76} />}
    </g>
  );
}

// A4988 Stepper Driver
export function A4988Component({ id, x, y, attrs, selected, onMouseDown }: ComponentProps) {
  return (
    <g id={id} transform={`translate(${x},${y})`} onMouseDown={onMouseDown} style={{ cursor: 'move' }}>
      <rect x={0} y={0} width={40} height={55} rx={2} fill="#c41010" stroke="#a00" strokeWidth={1} />
      <rect x={8} y={5} width={24} height={20} rx={1} fill="#222" stroke="#444" strokeWidth={0.5} />
      <rect x={12} y={28} width={16} height={12} rx={1} fill="#aaa" />
      <text x={20} y={16} textAnchor="middle" fill="#aaa" fontSize={3.5}>A4988</text>
      <text x={20} y={52} textAnchor="middle" fill="#fff" fontSize={4}>DRIVER</text>
      {selected && <SelectionBox x={-4} y={-4} w={48} h={63} />}
    </g>
  );
}

// =========================================================
// LOGIC / COMMUNICATION COMPONENTS
// =========================================================

// 74HC595 Shift Register
export function ShiftRegister595Component({ id, x, y, attrs, selected, onMouseDown }: ComponentProps) {
  return (
    <g id={id} transform={`translate(${x},${y})`} onMouseDown={onMouseDown} style={{ cursor: 'move' }}>
      <rect x={0} y={0} width={40} height={50} rx={1} fill="#333" stroke="#555" strokeWidth={0.5} />
      <circle cx={6} cy={6} r={2} fill="#555" />
      <text x={20} y={28} textAnchor="middle" fill="#aaa" fontSize={4}>74HC595</text>
      {Array.from({ length: 8 }).map((_, i) => (
        <g key={`l${i}`}>
          <rect x={-4} y={4 + i * 5.5} width={4} height={2} fill="#aaa" />
          <rect x={40} y={4 + i * 5.5} width={4} height={2} fill="#aaa" />
        </g>
      ))}
      {selected && <SelectionBox x={-8} y={-4} w={56} h={58} />}
    </g>
  );
}

// Breadboard Half
export function BreadboardHalfComponent({ id, x, y, attrs, selected, onMouseDown }: ComponentProps) {
  return (
    <g id={id} transform={`translate(${x},${y})`} onMouseDown={onMouseDown} style={{ cursor: 'move' }}>
      <rect x={0} y={0} width={280} height={180} rx={3} fill="#e8e8d8" stroke="#ccc" strokeWidth={1} />
      {/* Power rails */}
      <rect x={10} y={8} width={260} height={20} rx={1} fill="#f0f0e0" stroke="#ddd" strokeWidth={0.5} />
      <rect x={10} y={152} width={260} height={20} rx={1} fill="#f0f0e0" stroke="#ddd" strokeWidth={0.5} />
      {/* Main rows */}
      {Array.from({ length: 5 }).map((_, row) => (
        <g key={`top-${row}`}>
          {Array.from({ length: 30 }).map((_, col) => (
            <circle key={`t-${row}-${col}`} cx={18 + col * 8.5} cy={38 + row * 8.5} r={1.5} fill="#666" opacity={0.5} />
          ))}
        </g>
      ))}
      {Array.from({ length: 5 }).map((_, row) => (
        <g key={`bot-${row}`}>
          {Array.from({ length: 30 }).map((_, col) => (
            <circle key={`b-${row}-${col}`} cx={18 + col * 8.5} cy={100 + row * 8.5} r={1.5} fill="#666" opacity={0.5} />
          ))}
        </g>
      ))}
      {/* Center divider */}
      <rect x={10} y={82} width={260} height={12} rx={1} fill="#d8d8c8" />
      {selected && <SelectionBox x={-4} y={-4} w={288} h={188} />}
    </g>
  );
}

// =========================================================
// GENERIC FALLBACK - for any new component not yet rendered
// =========================================================
export function GenericComponent({ id, x, y, attrs, selected, onMouseDown }: ComponentProps & { label?: string; componentType?: string }) {
  const label = (attrs._label as string) || (attrs.componentType as string) || 'Component';
  const w = Number(attrs._w) || 60;
  const h = Number(attrs._h) || 60;
  return (
    <g id={id} transform={`translate(${x},${y})`} onMouseDown={onMouseDown} style={{ cursor: 'move' }}>
      <rect x={0} y={0} width={w} height={h} rx={4} fill="#2a2a3e" stroke="#555" strokeWidth={1} strokeDasharray="4,2" />
      <text x={w / 2} y={h / 2 + 4} textAnchor="middle" fill="#888" fontSize={Math.min(8, w / 6)}>{label}</text>
      {selected && <SelectionBox x={-4} y={-4} w={w + 8} h={h + 8} />}
    </g>
  );
}

// =========================================================
// Component renderer dispatcher
// =========================================================
export function renderComponent(type: string, props: ComponentProps): React.ReactNode {
  switch (type) {
    case 'board-esp32-devkit-c-v4': return <ESP32Component {...props} />;
    case 'wokwi-arduino-uno': return <ArduinoUnoComponent {...props} />;
    case 'wokwi-led': return <LEDComponent {...props} />;
    case 'wokwi-rgb-led': return <RGBLEDComponent {...props} />;
    case 'wokwi-resistor': return <ResistorComponent {...props} />;
    case 'wokwi-pushbutton': return <PushButtonComponent {...props} />;
    case 'wokwi-buzzer': return <BuzzerComponent {...props} />;
    case 'wokwi-potentiometer': return <PotentiometerComponent {...props} />;
    case 'wokwi-servo': return <ServoComponent {...props} />;
    case 'wokwi-lcd1602': return <LCD1602Component {...props} />;
    case 'wokwi-lcd2004': return <LCD2004Component {...props} />;
    case 'wokwi-dht22': return <DHT22Component {...props} />;
    // Display
    case 'wokwi-neopixel-ring': return <NeoPixelRingComponent {...props} />;
    case 'wokwi-led-strip': return <LEDStripComponent {...props} />;
    case 'wokwi-led-matrix': return <LEDMatrixComponent {...props} />;
    case 'wokwi-7segment': return <SevenSegmentComponent {...props} />;
    case 'wokwi-7segment-4digit': return <SevenSegment4DigitComponent {...props} />;
    case 'wokwi-tm1637': return <TM1637Component {...props} />;
    case 'wokwi-led-bar-graph': return <LEDBarGraphComponent {...props} />;
    case 'wokwi-ssd1306': return <SSD1306Component {...props} />;
    case 'wokwi-ili9341': return <ILI9341Component {...props} />;
    case 'wokwi-max7219-matrix': return <MAX7219Component {...props} />;
    // Input
    case 'wokwi-slide-potentiometer': return <SlidePotentiometerComponent {...props} />;
    case 'wokwi-analog-joystick': return <AnalogJoystickComponent {...props} />;
    case 'wokwi-membrane-keypad': return <MembraneKeypadComponent {...props} />;
    case 'wokwi-ky-040': return <RotaryEncoderComponent {...props} />;
    case 'wokwi-slide-switch': return <SlideSwitchComponent {...props} />;
    case 'wokwi-dip-switch-8': return <DIPSwitch8Component {...props} />;
    // Sensor
    case 'wokwi-pir-motion-sensor': return <PIRSensorComponent {...props} />;
    case 'wokwi-hc-sr04': return <HCSR04Component {...props} />;
    case 'wokwi-ntc-temperature-sensor': return <NTCSensorComponent {...props} />;
    case 'wokwi-photoresistor-sensor': return <PhotoresistorComponent {...props} />;
    case 'wokwi-ir-receiver': return <IRReceiverComponent {...props} />;
    case 'wokwi-ds1307': return <DS1307Component {...props} />;
    case 'wokwi-mpu6050': return <MPU6050Component {...props} />;
    // Actuator
    case 'wokwi-stepper-motor': return <StepperMotorComponent {...props} />;
    case 'wokwi-relay-module': return <RelayModuleComponent {...props} />;
    case 'wokwi-a4988': return <A4988Component {...props} />;
    // Logic
    case 'wokwi-74hc595': return <ShiftRegister595Component {...props} />;
    // Passive
    case 'wokwi-breadboard-half': return <BreadboardHalfComponent {...props} />;
    case 'wokwi-breadboard': return <BreadboardHalfComponent {...props} />;
    // Generic boards
    case 'wokwi-arduino-mega':
    case 'wokwi-arduino-nano':
    case 'board-esp32-s2-devkitm-1':
    case 'board-esp32-s3-devkitc-1':
    case 'board-esp32-c3-devkitm-1':
    case 'wokwi-pi-pico':
    case 'wokwi-pi-pico-w':
    case 'wokwi-attiny85': {
      const boardLabels: Record<string, string> = {
        'wokwi-arduino-mega': 'Arduino Mega',
        'wokwi-arduino-nano': 'Arduino Nano',
        'board-esp32-s2-devkitm-1': 'ESP32-S2',
        'board-esp32-s3-devkitc-1': 'ESP32-S3',
        'board-esp32-c3-devkitm-1': 'ESP32-C3',
        'wokwi-pi-pico': 'Pi Pico',
        'wokwi-pi-pico-w': 'Pi Pico W',
        'wokwi-attiny85': 'ATtiny85',
      };
      const boardColors: Record<string, string> = {
        'wokwi-arduino-mega': '#0068a5',
        'wokwi-arduino-nano': '#0068a5',
        'board-esp32-s2-devkitm-1': '#1a1a2e',
        'board-esp32-s3-devkitc-1': '#1a1a2e',
        'board-esp32-c3-devkitm-1': '#1a1a2e',
        'wokwi-pi-pico': '#2d8a4e',
        'wokwi-pi-pico-w': '#2d8a4e',
        'wokwi-attiny85': '#333',
      };
      const sizes: Record<string, [number, number]> = {
        'wokwi-arduino-mega': [280, 320],
        'wokwi-arduino-nano': [70, 180],
        'board-esp32-s2-devkitm-1': [100, 200],
        'board-esp32-s3-devkitc-1': [105, 220],
        'board-esp32-c3-devkitm-1': [90, 160],
        'wokwi-pi-pico': [90, 210],
        'wokwi-pi-pico-w': [90, 210],
        'wokwi-attiny85': [40, 50],
      };
      const [w, h] = sizes[type] || [100, 100];
      const boardLabel = boardLabels[type] || type;
      const boardColor = boardColors[type] || '#333';
      const { id, x, y, selected } = props;
      return (
        <g id={id} transform={`translate(${x},${y})`} onMouseDown={props.onMouseDown} style={{ cursor: 'move' }}>
          {selected && <SelectionBox x={-6} y={-6} w={w + 12} h={h + 12} rx={8} />}
          <rect x={0} y={0} width={w} height={h} rx={4} fill={boardColor} stroke="#555" strokeWidth={1} />
          <rect x={w / 2 - 15} y={4} width={30} height={12} rx={2} fill="#444" />
          <text x={w / 2} y={h / 2 + 4} textAnchor="middle" fill="#fff" fontSize={Math.min(10, w / 5)} fontWeight="bold">{boardLabel}</text>
          {/* Pin rows */}
          {Array.from({ length: Math.floor((h - 30) / 10) }).map((_, i) => (
            <React.Fragment key={i}>
              <rect x={-3} y={25 + i * 10} width={4} height={3} rx={0.5} fill="#c8a92e" />
              <rect x={w - 1} y={25 + i * 10} width={4} height={3} rx={0.5} fill="#c8a92e" />
            </React.Fragment>
          ))}
        </g>
      );
    }
    // Fallback for anything else
    default: {
      return <GenericComponent {...props} attrs={{ ...props.attrs, _label: type.replace('wokwi-', '').replace('board-', '') }} />;
    }
  }
}

// ============================================
// getComponentRenderer — returns a stable React FC
// Used by circuit-canvas.tsx: const Renderer = getComponentRenderer(type); <Renderer ... />
// Cached so the same component reference is returned each time (prevents React remounting)
// ============================================
const rendererCache = new Map<string, React.FC<ComponentProps>>();

export function getComponentRenderer(type: string): React.FC<ComponentProps> {
  let cached = rendererCache.get(type);
  if (!cached) {
    const Wrapper: React.FC<ComponentProps> = (props) => {
      return <>{renderComponent(type, props)}</>;
    };
    Wrapper.displayName = `Renderer_${type}`;
    cached = Wrapper;
    rendererCache.set(type, cached);
  }
  return cached;
}
