'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, ZoomIn, ZoomOut, Send, Map, Users, BarChart3, Play } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

// ═══════════════════════════════════════════════
//  TYPES & CONSTANTS
// ═══════════════════════════════════════════════
const TILE = 32;
const COLS = 18, ROWS = 13;

// Tile types
const TILE_TYPES = {
  FLOOR: 0,
  WALL: 1,
  DESK: 2,
  PLANT: 3,
  MONITOR: 4,
  WINDOW: 5,
  SHELF: 6,
  CHAIR: 7,
  RUG: 8,
  PATH: 9
} as const;

// Color palette
const COLORS = {
  floor1: '#4a6741',
  floor2: '#3d5934',
  wall: '#2c1810',
  wallTop: '#6b3a28',
  wall2: '#3d2515',
  desk: '#8B5E3C',
  desk2: '#7a4e2c',
  desk3: '#5c3920',
  carpet: '#1a3a5c',
  carpet2: '#153252',
  plant: '#2d6a2d',
  plantStem: '#4a8a2d',
  plantPot: '#8B4513',
  monitor: '#1a1a2e',
  monitorScreen: '#00ff88',
  window: '#87ceeb',
  windowFrame: '#8B6914',
  shelf: '#6B4423',
  book1: '#c0392b',
  book2: '#27ae60',
  book3: '#2980b9',
  chair: '#c0392b',
  chairSeat: '#922b21',
  rug: '#8b2252',
  rugBorder: '#c0396b',
  path: '#7a6a50',
  yellow: '#ffd700',
  green: '#00ff88',
  accent: '#e94560',
};

// Map layout
const MAP = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,2,0,0,1,0,0,0,5,0,0,0,0,1],
  [1,0,4,4,0,2,0,0,1,0,6,6,6,6,0,0,0,1],
  [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,3,1],
  [1,3,0,0,0,0,0,0,9,0,0,8,8,8,0,0,0,1],
  [1,0,0,0,0,0,0,0,9,0,0,8,7,8,0,3,0,1],
  [1,0,2,2,0,0,0,0,9,0,0,8,8,8,0,0,0,1],
  [1,0,0,0,0,3,0,0,9,0,0,0,0,0,0,0,0,1],
  [1,0,2,2,2,0,0,0,1,0,6,6,6,0,0,0,3,1],
  [1,0,0,0,0,0,0,0,1,0,0,0,0,0,2,2,0,1],
  [1,3,0,0,0,0,0,0,1,0,0,3,0,0,4,0,0,1],
  [1,0,0,0,5,0,0,0,1,0,0,3,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

// Agent replies for chat
const AGENT_REPLIES = [
  "Đang phân tích codebase... tìm thấy 47 file. Kiến trúc khá sạch sẽ!",
  "Subagent #1 hoàn thành! Đề xuất: tạo landing page với demo video.",
  "Subagent #2 báo cáo: 3 TODO còn lại, coverage test ~82%.",
  "Tôi sẽ khám phá khu vực phía Đông của bản đồ ngay bây giờ.",
  "Phát hiện pattern thú vị trong module xử lý dữ liệu. Tối ưu hoá 30% tốc độ.",
  "Đã gọi thêm 2 subagent để xử lý song song nhiệm vụ mới.",
  "Mission complete! Kết quả được lưu vào /reports/summary.md",
  "Đang tối ưu hóa thuật toán render để cải thiện FPS...",
  "Phân tích xong! Đề xuất refactor 5 file chính.",
];

type Message = {
  id: string;
  type: 'user' | 'agent' | 'system';
  text: string;
  timestamp: number;
};

type NPC = {
  x: number;
  y: number;
  px: number;
  py: number;
  color: string;
  name: string;
  busy: boolean;
};

type Player = {
  x: number;
  y: number;
  px: number;
  py: number;
  moving: boolean;
};

export default function PixelAgentsPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 7, y: 5 });
  const [state, setState] = useState('Idle');
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', type: 'system', text: '✦ Session bắt đầu · ID: bb044fa4-2bc3-47f2', timestamp: Date.now() }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  
  const playerRef = useRef<Player>({ x: 7, y: 5, px: 7 * TILE, py: 5 * TILE, moving: false });
  const npcsRef = useRef<NPC[]>([
    { x: 2, y: 2, px: 2 * TILE, py: 2 * TILE, color: '#e8a87c', name: 'Agent #1', busy: true },
    { x: 12, y: 5, px: 12 * TILE, py: 5 * TILE, color: '#a87ce8', name: 'Agent #2', busy: false },
    { x: 14, y: 9, px: 14 * TILE, py: 9 * TILE, color: '#7ce8a8', name: 'Agent #3', busy: false },
  ]);
  const keysRef = useRef<Record<string, boolean>>({});
  const animationFrameRef = useRef<number>();
  const lastMoveRef = useRef<number>(0);
  const npcTimerRef = useRef<number>(0);
  const replyIdxRef = useRef<number>(0);

  // Check if tile is walkable
  const walkable = useCallback((tx: number, ty: number) => {
    if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return false;
    const t = MAP[ty][tx];
    return t === TILE_TYPES.FLOOR || t === TILE_TYPES.RUG || t === TILE_TYPES.PATH;
  }, []);

  // Resize canvas
  useEffect(() => {
    const resize = () => {
      if (!wrapRef.current || !canvasRef.current) return;
      const w = wrapRef.current.clientWidth;
      const h = wrapRef.current.clientHeight;
      const newScale = Math.min(Math.floor(w / (COLS * TILE)), Math.floor(h / (ROWS * TILE))) || 1;
      const clampedScale = Math.max(1, Math.min(newScale, 3)) * zoomLevel;
      setScale(clampedScale);
      canvasRef.current.width = COLS * TILE;
      canvasRef.current.height = ROWS * TILE;
      canvasRef.current.style.width = `${COLS * TILE * clampedScale}px`;
      canvasRef.current.style.height = `${ROWS * TILE * clampedScale}px`;
    };
    
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [zoomLevel]);

  // Drawing helpers
  const drawRect = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, stroke?: string, sw?: number) => {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = sw || 1;
      ctx.strokeRect(x, y, w, h);
    }
  }, []);

  // Draw floor
  const drawFloor = useCallback((ctx: CanvasRenderingContext2D) => {
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const t = MAP[row][col];
        const x = col * TILE, y = row * TILE;
        const odd = (row + col) % 2;
        if (t === TILE_TYPES.WALL) {
          drawRect(ctx, x, y, TILE, TILE, COLORS.wall);
          drawRect(ctx, x, y, TILE, 4, COLORS.wallTop);
        } else if (t === TILE_TYPES.PATH) {
          drawRect(ctx, x, y, TILE, TILE, COLORS.path);
          drawRect(ctx, x, y, TILE, 2, '#8B7A60');
        } else if (t === TILE_TYPES.RUG) {
          drawRect(ctx, x, y, TILE, TILE, odd ? COLORS.carpet : COLORS.carpet2);
        } else {
          drawRect(ctx, x, y, TILE, TILE, odd ? COLORS.floor1 : COLORS.floor2);
        }
      }
    }
  }, [drawRect]);

  // Draw objects
  const drawDesk = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number) => {
    drawRect(ctx, x + 2, y + 8, TILE - 4, TILE - 10, COLORS.desk, COLORS.desk3, 1);
    drawRect(ctx, x + 2, y + 8, TILE - 4, 6, COLORS.desk2);
    drawRect(ctx, x + 3, y + TILE - 6, 4, 6, COLORS.desk3);
    drawRect(ctx, x + TILE - 7, y + TILE - 6, 4, 6, COLORS.desk3);
  }, [drawRect]);

  const drawPlant = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number) => {
    drawRect(ctx, x + 10, y + 22, 12, 10, COLORS.plantPot);
    drawRect(ctx, x + 11, y + 21, 10, 2, '#7a3e10');
    ctx.fillStyle = COLORS.plant;
    ctx.beginPath(); ctx.ellipse(x + 16, y + 14, 7, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + 10, y + 17, 5, 7, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + 22, y + 17, 5, 7, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = COLORS.plantStem;
    ctx.beginPath(); ctx.ellipse(x + 16, y + 10, 4, 6, 0, 0, Math.PI * 2); ctx.fill();
  }, [drawRect]);

  const drawMonitor = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number) => {
    drawRect(ctx, x + 4, y + 4, TILE - 8, TILE - 14, '#111', '#333', 1);
    drawRect(ctx, x + 6, y + 6, TILE - 12, TILE - 18, COLORS.carpet);
    ctx.fillStyle = 'rgba(0,255,136,0.15)';
    ctx.fillRect(x + 6, y + 6, TILE - 12, TILE - 18);
    ctx.fillStyle = 'rgba(0,255,136,0.5)';
    for (let i = 0; i < 4; i++) ctx.fillRect(x + 8, y + 8 + i * 4, Math.random() * 10 + 5, 1);
    drawRect(ctx, x + 12, y + TILE - 10, 8, 4, '#333');
    drawRect(ctx, x + 8, y + TILE - 7, 16, 4, '#444');
  }, [drawRect]);

  const drawWindow = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number) => {
    drawRect(ctx, x + 1, y + 2, TILE - 2, TILE - 4, COLORS.windowFrame);
    drawRect(ctx, x + 3, y + 4, TILE - 6, TILE - 8, COLORS.window);
    ctx.fillStyle = COLORS.yellow;
    ctx.beginPath(); ctx.arc(x + 20, y + 12, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = COLORS.plantStem;
    ctx.beginPath(); ctx.ellipse(x + 10, y + TILE - 6, 10, 7, 0, 0, Math.PI); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + 22, y + TILE - 6, 10, 7, 0, 0, Math.PI); ctx.fill();
    ctx.strokeStyle = COLORS.windowFrame; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x + TILE / 2, y + 4); ctx.lineTo(x + TILE / 2, y + TILE - 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 3, y + TILE / 2); ctx.lineTo(x + TILE - 3, y + TILE / 2); ctx.stroke();
  }, [drawRect]);

  const drawShelf = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number) => {
    drawRect(ctx, x + 1, y + 4, TILE - 2, 6, COLORS.shelf);
    const books = [COLORS.book1, COLORS.book2, COLORS.book3, '#e67e22', '#8e44ad'];
    for (let i = 0; i < 5; i++) drawRect(ctx, x + 2 + i * 6, y + 5, 5, TILE - 10, books[i % 5]);
    drawRect(ctx, x + 1, y + TILE - 5, TILE - 2, 4, COLORS.shelf);
  }, [drawRect]);

  const drawChair = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number) => {
    drawRect(ctx, x + 4, y + 14, TILE - 8, TILE - 18, COLORS.chair, '#7d1e1e', 1);
    drawRect(ctx, x + 6, y + 6, TILE - 12, 10, COLORS.chairSeat, '#6b1919', 1);
    drawRect(ctx, x + 4, y + TILE - 8, 4, 8, COLORS.desk3);
    drawRect(ctx, x + TILE - 8, y + TILE - 8, 4, 8, COLORS.desk3);
  }, [drawRect]);

  const drawObjects = useCallback((ctx: CanvasRenderingContext2D) => {
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const t = MAP[row][col];
        const x = col * TILE, y = row * TILE;
        if (t === TILE_TYPES.DESK) drawDesk(ctx, x, y);
        else if (t === TILE_TYPES.PLANT) drawPlant(ctx, x, y);
        else if (t === TILE_TYPES.MONITOR) drawMonitor(ctx, x, y);
        else if (t === TILE_TYPES.WINDOW) drawWindow(ctx, x, y);
        else if (t === TILE_TYPES.SHELF) drawShelf(ctx, x, y);
        else if (t === TILE_TYPES.CHAIR) drawChair(ctx, x, y);
        else if (t === TILE_TYPES.RUG) {
          const hasL = col === 0 || MAP[row][col - 1] !== TILE_TYPES.RUG;
          const hasR = col === COLS - 1 || MAP[row][col + 1] !== TILE_TYPES.RUG;
          const hasT = row === 0 || MAP[row - 1][col] !== TILE_TYPES.RUG;
          const hasB = row === ROWS - 1 || MAP[row + 1][col] !== TILE_TYPES.RUG;
          if (hasL || hasR || hasT || hasB) {
            ctx.strokeStyle = COLORS.rugBorder; ctx.lineWidth = 2;
            ctx.strokeRect(x + 1, y + 1, TILE - 2, TILE - 2);
          }
        }
      }
    }
  }, [drawDesk, drawPlant, drawMonitor, drawWindow, drawShelf, drawChair]);

  // Draw character
  const drawChar = useCallback((ctx: CanvasRenderingContext2D, px: number, py: number, col: string, name: string, busy: boolean) => {
    const x = Math.round(px), y = Math.round(py);
    const bob = Math.sin(Date.now() / 200) * 1.5;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(x + TILE / 2, y + TILE - 3, 8, 3, 0, 0, Math.PI * 2); ctx.fill();

    // Body
    drawRect(ctx, x + 10, y + 16 + bob, 12, 12, col);
    // Head
    drawRect(ctx, x + 8, y + 6 + bob, 16, 14, col);
    // Eyes
    drawRect(ctx, x + 11, y + 9 + bob, 3, 3, '#fff');
    drawRect(ctx, x + 18, y + 9 + bob, 3, 3, '#fff');
    drawRect(ctx, x + 12, y + 10 + bob, 2, 2, '#222');
    drawRect(ctx, x + 19, y + 10 + bob, 2, 2, '#222');
    // Hair
    drawRect(ctx, x + 8, y + 5 + bob, 16, 4, '#3d2510');
    // Shirt detail
    drawRect(ctx, x + 10, y + 20 + bob, 12, 2, 'rgba(0,0,0,0.2)');
    // Legs
    drawRect(ctx, x + 10, y + 28 + bob, 5, 6, '#3d5a9e');
    drawRect(ctx, x + 17, y + 28 + bob, 5, 6, '#3d5a9e');
    // Shoes
    drawRect(ctx, x + 9, y + 33 + bob, 7, 4, '#222');
    drawRect(ctx, x + 16, y + 33 + bob, 7, 4, '#222');

    // Busy indicator
    if (busy) {
      const t = Date.now() / 500;
      ctx.fillStyle = `hsl(${(t * 60) % 360}, 80%, 60%)`;
      ctx.beginPath(); ctx.arc(x + TILE / 2, y + bob - 4, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '6px VT323'; ctx.textAlign = 'center';
      ctx.fillText('!', x + TILE / 2, y + bob - 2);
    }

    // Name tag
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.beginPath();
    ctx.roundRect(x + TILE / 2 - 18, y - 2 + bob, 36, 10, 3);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '8px "Share Tech Mono"'; ctx.textAlign = 'center';
    ctx.fillText(name, x + TILE / 2, y + 7 + bob);
  }, [drawRect]);

  const drawPlayer = useCallback((ctx: CanvasRenderingContext2D) => {
    const player = playerRef.current;
    const bob = player.moving ? Math.sin(Date.now() / 120) * 2 : 0;
    const x = Math.round(player.px), y = Math.round(player.py);

    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(x + TILE / 2, y + TILE - 3, 9, 3, 0, 0, Math.PI * 2); ctx.fill();

    // Selection ring
    ctx.strokeStyle = 'rgba(255,213,0,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x + TILE / 2, y + TILE - 3, 10, 4, 0, 0, Math.PI * 2); ctx.stroke();

    // Body (blue shirt)
    drawRect(ctx, x + 9, y + 16 + bob, 14, 13, '#2965b0');
    // Head (skin)
    drawRect(ctx, x + 7, y + 5 + bob, 18, 16, '#f0c070');
    // Hair
    drawRect(ctx, x + 7, y + 4 + bob, 18, 5, '#3d2510');
    drawRect(ctx, x + 7, y + 5 + bob, 3, 10, '#3d2510');
    // Eyes
    drawRect(ctx, x + 11, y + 9 + bob, 3, 3, '#fff');
    drawRect(ctx, x + 19, y + 9 + bob, 3, 3, '#fff');
    drawRect(ctx, x + 12, y + 10 + bob, 2, 2, '#222');
    drawRect(ctx, x + 20, y + 10 + bob, 2, 2, '#222');
    // Shirt line
    drawRect(ctx, x + 9, y + 21 + bob, 14, 2, 'rgba(0,0,0,0.25)');
    // Arms
    drawRect(ctx, x + 5, y + 17 + bob, 5, 10, '#f0c070');
    drawRect(ctx, x + 22, y + 17 + bob, 5, 10, '#f0c070');
    // Pants
    drawRect(ctx, x + 9, y + 29 + bob, 6, 8, '#1a1a4a');
    drawRect(ctx, x + 17, y + 29 + bob, 6, 8, '#1a1a4a');
    // Shoes
    drawRect(ctx, x + 8, y + 36 + bob, 8, 5, '#111');
    drawRect(ctx, x + 16, y + 36 + bob, 8, 5, '#111');

    // YOU label
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.beginPath();
    ctx.roundRect(x + TILE / 2 - 12, y - 3 + bob, 24, 10, 3);
    ctx.fill();
    ctx.fillStyle = COLORS.yellow;
    ctx.font = '8px "Share Tech Mono"'; ctx.textAlign = 'center';
    ctx.fillText('YOU', x + TILE / 2, y + 6 + bob);
  }, [drawRect]);

  // Movement
  const tryMove = useCallback((dx: number, dy: number) => {
    const player = playerRef.current;
    const nx = player.x + dx, ny = player.y + dy;
    if (walkable(nx, ny)) {
      player.x = nx; player.y = ny;
      setPos({ x: nx, y: ny });
      const targetX = nx * TILE, targetY = ny * TILE;
      player.px = targetX; player.py = targetY;
      player.moving = true;
      setState('Moving');
    }
  }, [walkable]);

  const handleInput = useCallback((ts: number) => {
    if (ts - lastMoveRef.current < 150) return;
    let dx = 0, dy = 0;
    const keys = keysRef.current;
    if (keys['ArrowUp'] || keys['w'] || keys['W']) dy = -1;
    else if (keys['ArrowDown'] || keys['s'] || keys['S']) dy = 1;
    else if (keys['ArrowLeft'] || keys['a'] || keys['A']) dx = -1;
    else if (keys['ArrowRight'] || keys['d'] || keys['D']) dx = 1;
    if (dx || dy) { tryMove(dx, dy); lastMoveRef.current = ts; }
  }, [tryMove]);

  const updatePlayer = useCallback(() => {
    const player = playerRef.current;
    const SPEED = 2;
    const dx = player.px - player.x * TILE;
    const dy = player.py - player.y * TILE;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 1) {
      player.px -= (dx / dist) * SPEED * (TILE / 8);
      player.py -= (dy / dist) * SPEED * (TILE / 8);
      player.moving = true;
    } else {
      player.px = player.x * TILE;
      player.py = player.y * TILE;
      player.moving = false;
      setState('Idle');
    }
  }, []);

  const updateNpcs = useCallback((ts: number) => {
    const npcs = npcsRef.current;
    if (ts - npcTimerRef.current > 2000) {
      npcTimerRef.current = ts;
      npcs.forEach(n => {
        if (n.busy) return;
        const dx = [0, 0, 1, -1][Math.floor(Math.random() * 4)];
        const dy = dx ? 0 : [1, -1][Math.floor(Math.random() * 2)];
        const nx = n.x + dx, ny = n.y + dy;
        if (walkable(nx, ny)) { n.x = nx; n.y = ny; }
      });
    }
    npcs.forEach(n => {
      const tx = n.x * TILE, ty = n.y * TILE;
      const dx = tx - n.px, dy = ty - n.py;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 1) { n.px += (dx / d) * 1.5; n.py += (dy / d) * 1.5; }
      else { n.px = tx; n.py = ty; }
    });
  }, [walkable]);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = (ts: number) => {
      handleInput(ts);
      updatePlayer();
      updateNpcs(ts);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawFloor(ctx);
      drawObjects(ctx);

      // Draw NPCs
      npcsRef.current.forEach(n => drawChar(ctx, n.px, n.py, n.color, n.name, n.busy));
      // Draw player
      drawPlayer(ctx);

      animationFrameRef.current = requestAnimationFrame(loop);
    };
    
    animationFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [handleInput, updatePlayer, updateNpcs, drawFloor, drawObjects, drawChar, drawPlayer]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { keysRef.current[e.key] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keysRef.current[e.key] = false; };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Chat functions
  const addMessage = useCallback((type: 'user' | 'agent' | 'system', text: string) => {
    setMessages(prev => [...prev, { id: Date.now().toString(), type, text, timestamp: Date.now() }]);
  }, []);

  const sendMessage = useCallback(() => {
    const txt = inputValue.trim();
    if (!txt) return;
    
    addMessage('user', txt);
    setInputValue('');
    setIsThinking(true);
    
    setTimeout(() => {
      const reply = AGENT_REPLIES[replyIdxRef.current % AGENT_REPLIES.length];
      replyIdxRef.current++;
      addMessage('agent', reply);
      setIsThinking(false);
    }, 800 + Math.random() * 700);
  }, [inputValue, addMessage]);

  const handleQuickMsg = useCallback((txt: string) => {
    setInputValue(txt);
    setTimeout(() => sendMessage(), 50);
  }, [sendMessage]);

  const handleZoom = useCallback((delta: number) => {
    setZoomLevel(prev => Math.max(0.5, Math.min(2, prev + delta)));
  }, []);

  return (
    <div className="min-h-screen bg-[#1a1a2e] flex flex-col font-mono text-[#c8d8e8] overflow-hidden" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
      {/* TOP BAR */}
      <div id="topbar" className="h-9 bg-[#0d1117] border-b border-[#2a4a6a] flex items-center flex-shrink-0">
        <div className="px-4 h-full flex items-center text-[11px] text-[#567890] cursor-pointer border-r border-[#2a4a6a] hover:text-[#c8d8e8] transition-colors">📁 File</div>
        <div className="px-4 h-full flex items-center text-[11px] text-[#567890] cursor-pointer border-r border-[#2a4a6a] hover:text-[#c8d8e8] transition-colors">✏️ Edit</div>
        <div className="px-4 h-full flex items-center text-[11px] text-[#567890] cursor-pointer border-r border-[#2a4a6a] hover:text-[#c8d8e8] transition-colors">☰ Selection</div>
        <div className="px-4 h-full flex items-center text-[11px] text-[#567890] cursor-pointer border-r border-[#2a4a6a] hover:text-[#c8d8e8] transition-colors">👁 View</div>
        <div className="px-4 h-full flex items-center text-[11px] text-[#567890] cursor-pointer border-r border-[#2a4a6a] hover:text-[#c8d8e8] transition-colors">···</div>
        <div className="px-4 h-full flex items-center text-[11px] text-[#567890] cursor-pointer border-r border-[#2a4a6a] border-l hover:text-[#c8d8e8] transition-colors">
          PROBLEMS <Badge className="ml-1.5 bg-[#e94560] text-white text-[9px] px-1.5 py-0.5 rounded-full">18</Badge>
        </div>
        <div className="px-4 h-full flex items-center text-[11px] text-[#567890] cursor-pointer border-r border-[#2a4a6a] hover:text-[#c8d8e8] transition-colors">OUTPUT</div>
        <div className="px-4 h-full flex items-center text-[11px] text-[#567890] cursor-pointer border-r border-[#2a4a6a] hover:text-[#c8d8e8] transition-colors">DEBUG CONSOLE</div>
        <div className="px-4 h-full flex items-center text-[11px] text-[#c8d8e8] cursor-pointer border-r border-[#2a4a6a] relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#e94560]">TERMINAL</div>
        <div className="px-4 h-full flex items-center text-[11px] text-[#567890] cursor-pointer border-r border-[#2a4a6a] hover:text-[#c8d8e8] transition-colors">PORTS</div>
        <div className="ml-auto px-3 text-[11px] text-[#567890] flex items-center gap-4">
          <span className="flex items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] inline-block mr-1 animate-pulse"></span>
            CONNECTED
          </span>
          <span className="text-[#ffd700]">⚡ Claude Max</span>
        </div>
      </div>

      {/* MAIN */}
      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR */}
        <div className="w-12 bg-[#0d1117] border-r border-[#2a4a6a] flex flex-col items-center py-2 gap-1 flex-shrink-0">
          <div className="w-9 h-9 rounded-md flex items-center justify-center cursor-pointer text-lg bg-[#0f3460] hover:bg-[#0f3460] transition-colors active" title="Explorer">📁</div>
          <div className="w-9 h-9 rounded-md flex items-center justify-center cursor-pointer text-lg hover:bg-[#0f3460] transition-colors" title="Search">🔍</div>
          <div className="w-9 h-9 rounded-md flex items-center justify-center cursor-pointer text-lg hover:bg-[#0f3460] transition-colors" title="Git">🌿</div>
          <div className="w-9 h-9 rounded-md flex items-center justify-center cursor-pointer text-lg hover:bg-[#0f3460] transition-colors" title="Debug">🐛</div>
          <div className="w-9 h-9 rounded-md flex items-center justify-center cursor-pointer text-lg hover:bg-[#0f3460] transition-colors" title="Extensions">🧩</div>
          <div className="flex-1"></div>
          <div className="w-9 h-9 rounded-md flex items-center justify-center cursor-pointer text-lg hover:bg-[#0f3460] transition-colors" title="Settings">⚙️</div>
        </div>

        {/* GAME PANEL */}
        <div className="flex-1 flex flex-col bg-[#16213e] border-r border-[#2a4a6a] overflow-hidden">
          <div className="bg-[#0d1117] px-3 py-1 text-[11px] text-[#567890] border-b border-[#2a4a6a] flex items-center gap-2">
            <span className="text-[#ffd700] font-[VT323] text-lg tracking-[2px]">∨ PIXEL AGENTS</span>
            <div className="ml-auto flex gap-2">
              <Button variant="ghost" size="sm" className="w-6 h-6 p-0 bg-[#0f3460] hover:bg-[#e94560] text-[#c8d8e8]" onClick={() => handleZoom(0.2)}>
                <ZoomIn className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="sm" className="w-6 h-6 p-0 bg-[#0f3460] hover:bg-[#e94560] text-[#c8d8e8]" onClick={() => handleZoom(-0.2)}>
                <ZoomOut className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          <div ref={wrapRef} className="flex-1 flex items-center justify-center bg-[#0a0a14] relative overflow-hidden">
            <canvas ref={canvasRef} className="image-pixelated" style={{ imageRendering: 'pixelated' }} />
            <div className="absolute bottom-2 left-2 bg-black/60 border border-[#2a4a6a] rounded-md px-2.5 py-2 text-[10px] text-[#567890] pointer-events-none">
              <div className="text-[#c8d8e8] mb-1">DI CHUYỂN</div>
              <div className="flex flex-col items-center gap-0.5">
                <span className="inline-block bg-[#2a4a6a] text-[#c8d8e8] w-4 h-4 text-center leading-4 rounded text-[9px]">W</span>
                <div>
                  <span className="inline-block bg-[#2a4a6a] text-[#c8d8e8] w-4 h-4 text-center leading-4 rounded text-[9px]">A</span>
                  <span className="inline-block bg-[#2a4a6a] text-[#c8d8e8] w-4 h-4 text-center leading-4 rounded text-[9px] ml-0.5">S</span>
                  <span className="inline-block bg-[#2a4a6a] text-[#c8d8e8] w-4 h-4 text-center leading-4 rounded text-[9px] ml-0.5">D</span>
                </div>
                <div className="text-[#567890] text-[9px] mt-1">hoặc ↑ ↓ ← →</div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="w-[340px] flex flex-col bg-[#0d1117] flex-shrink-0">
          <div className="px-3.5 py-2.5 border-b border-[#2a4a6a] flex items-center gap-2.5">
            <div className="w-[42px] h-[42px] bg-gradient-to-br from-[#e8734a] to-[#c8522a] rounded-md flex items-center justify-center text-2xl relative flex-shrink-0 before:absolute before:top-[-3px] before:left-1/2 before:-translate-x-1/2 before:w-1 before:h-1.5 before:bg-[#a855f7] before:rounded-[2px]">
              🤖
            </div>
            <div className="flex-1">
              <div className="font-[VT323] text-[#c8d8e8] text-lg tracking-[1px]">Claude Code</div>
              <div className="text-[10px] text-[#567890]">v2.1.49 · Opus 4.6</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-[#4fc3f7]">Claude Max</div>
              <div className="text-[9px] text-[#567890]">~/Desktop/...</div>
            </div>
          </div>

          <div id="chat-log" className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex flex-col gap-0.5 animate-[fadeIn_0.3s_ease] ${msg.type === 'user' ? 'items-end' : ''}`}>
                {msg.type === 'user' && <div className="text-[10px] text-[#567890] px-0.5">Bạn</div>}
                {msg.type === 'agent' && <div className="text-[10px] text-[#567890] px-0.5">Agent</div>}
                <div className={`px-2.5 py-2 text-[12px] max-w-[90%] ${
                  msg.type === 'user' 
                    ? 'bg-[#0f3460] border border-[#2a4a6a] rounded-md rounded-br-sm text-[#c8d8e8] self-end' 
                    : msg.type === 'system'
                    ? 'bg-[#0a1a0a] border border-[#1a3a1a] border-l-[3px] border-l-[#00ff88] rounded text-[#00ff88] opacity-85'
                    : 'bg-[#141e30] border border-[#2a3a50] border-l-[3px] border-l-[#e94560] rounded-bl-md rounded-tr-md rounded-br-md text-[#c8d8e8] leading-relaxed'
                }`}>
                  {msg.type === 'user' && <span className="text-[#00ff88] font-bold mr-1">&gt; </span>}
                  <span dangerouslySetInnerHTML={{ __html: msg.text }} />
                </div>
              </div>
            ))}
            {isThinking && (
              <div className="flex items-center gap-1.5 text-[11px] text-[#a855f7] py-1">
                <div className="flex gap-0.5">
                  <span className="inline-block w-1 h-1 rounded-full bg-[#a855f7] animate-[bounce_0.8s_infinite]"></span>
                  <span className="inline-block w-1 h-1 rounded-full bg-[#a855f7] animate-[bounce_0.8s_infinite] [animation-delay:0.15s]"></span>
                  <span className="inline-block w-1 h-1 rounded-full bg-[#a855f7] animate-[bounce_0.8s_infinite] [animation-delay:0.3s]"></span>
                </div>
                Agent đang xử lý...
              </div>
            )}
          </div>

          <div className="border-t border-[#2a4a6a] px-3 py-2.5 flex flex-col gap-2">
            <div className="flex gap-1.5 flex-wrap">
              <Button variant="outline" size="sm" className="h-6 text-[10px] bg-[#0f3460] border-[#2a4a6a] text-[#567890] hover:border-[#4fc3f7] hover:text-[#4fc3f7]" onClick={() => handleQuickMsg('🗺 Khám phá bản đồ')}>
                🗺 Khám phá
              </Button>
              <Button variant="outline" size="sm" className="h-6 text-[10px] bg-[#0f3460] border-[#2a4a6a] text-[#567890] hover:border-[#4fc3f7] hover:text-[#4fc3f7]" onClick={() => handleQuickMsg('🤖 Thêm Agent')}>
                🤖 Thêm Agent
              </Button>
              <Button variant="outline" size="sm" className="h-6 text-[10px] bg-[#0f3460] border-[#2a4a6a] text-[#567890] hover:border-[#4fc3f7] hover:text-[#4fc3f7]" onClick={() => handleQuickMsg('📊 Báo cáo')}>
                📊 Báo cáo
              </Button>
              <Button variant="outline" size="sm" className="h-6 text-[10px] bg-[#0f3460] border-[#2a4a6a] text-[#567890] hover:border-[#4fc3f7] hover:text-[#4fc3f7]" onClick={() => handleQuickMsg('▶ Tiếp tục')}>
                ▶ Tiếp tục
              </Button>
            </div>
            <div className="flex items-center gap-2 bg-[#141e30] border border-[#2a4a6a] rounded-md px-2.5 py-1.5">
              <span className="text-[#00ff88] text-sm">›</span>
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Nhập lệnh cho agent..."
                className="flex-1 bg-transparent border-none outline-none text-[#c8d8e8] text-[12px] placeholder:text-[#567890] focus-visible:ring-0 focus-visible:ring-offset-0 caret-[#00ff88] p-0 h-auto"
              />
              <Button onClick={sendMessage} className="bg-[#e94560] hover:bg-[#e94560]/80 text-white font-[VT323] text-[14px] tracking-[1px] px-2.5 py-0.5 h-auto">
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* STATUS BAR */}
      <div className="h-[22px] bg-[#e94560] flex items-center px-3 gap-5 text-[10px] text-white tracking-[1px] flex-shrink-0">
        <span>⚡ PIXEL AGENTS</span>
        <span>X: {pos.x}  Y: {pos.y}</span>
        <span>{state}</span>
        <span className="ml-auto">Opus 4.6 · Claude Max · UTF-8</span>
      </div>

      {/* Global styles */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=VT323&family=Share+Tech+Mono&display=swap');
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: none; }
        }
        
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        
        #chat-log::-webkit-scrollbar { width: 4px; }
        #chat-log::-webkit-scrollbar-thumb { background: #2a4a6a; border-radius: 2px; }
        
        .image-pixelated {
          image-rendering: pixelated;
          image-rendering: crisp-edges;
        }
      `}</style>
    </div>
  );
}
