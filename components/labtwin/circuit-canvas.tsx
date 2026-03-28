'use client';

import React, { useRef, useState, useCallback } from 'react';
import { DiagramJSON, CanvasState } from '@/lib/labtwin/types';
import { COMPONENT_REGISTRY } from '@/lib/labtwin/component-registry';
import { getComponentRenderer } from './svg-components';

interface CircuitCanvasProps {
  diagram: DiagramJSON;
  onDiagramChange: (diagram: DiagramJSON) => void;
  pinStates?: Record<string, Record<string, boolean>>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export default function CircuitCanvas({
  diagram,
  onDiagramChange,
  pinStates = {},
  selectedId,
  onSelect,
}: CircuitCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [canvas, setCanvas] = useState<CanvasState>({
    zoom: 0.85,
    panX: 50,
    panY: 20,
    gridSize: 10,
    snapToGrid: true,
    selectedId: null,
    draggingId: null,
    wiringFrom: null,
  });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [wiringFrom, setWiringFrom] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const screenToSvg = useCallback((screenX: number, screenY: number) => {
    return {
      x: (screenX - canvas.panX) / canvas.zoom,
      y: (screenY - canvas.panY) / canvas.zoom,
    };
  }, [canvas.panX, canvas.panY, canvas.zoom]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.2, Math.min(3, canvas.zoom * delta));
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setCanvas(prev => ({
      ...prev,
      zoom: newZoom,
      panX: mx - (mx - prev.panX) * (newZoom / prev.zoom),
      panY: my - (my - prev.panY) * (newZoom / prev.zoom),
    }));
  }, [canvas.zoom]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - canvas.panX, y: e.clientY - canvas.panY });
      e.preventDefault();
    } else if (e.button === 0 && e.target === svgRef.current) {
      onSelect(null);
    }
  }, [canvas.panX, canvas.panY, onSelect]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const svgPos = screenToSvg(e.clientX - rect.left, e.clientY - rect.top);
    setMousePos(svgPos);

    if (isPanning) {
      setCanvas(prev => ({
        ...prev,
        panX: e.clientX - panStart.x,
        panY: e.clientY - panStart.y,
      }));
      return;
    }

    if (canvas.draggingId) {
      const snapped = canvas.snapToGrid
        ? {
            x: Math.round((svgPos.x - dragOffset.x) / canvas.gridSize) * canvas.gridSize,
            y: Math.round((svgPos.y - dragOffset.y) / canvas.gridSize) * canvas.gridSize,
          }
        : { x: svgPos.x - dragOffset.x, y: svgPos.y - dragOffset.y };

      const newParts = diagram.parts.map(p =>
        p.id === canvas.draggingId ? { ...p, left: snapped.x, top: snapped.y } : p
      );
      onDiagramChange({ ...diagram, parts: newParts });
    }
  }, [isPanning, panStart, canvas.draggingId, canvas.snapToGrid, canvas.gridSize, dragOffset, diagram, onDiagramChange, screenToSvg]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setCanvas(prev => ({ ...prev, draggingId: null }));
  }, []);

  const handleComponentMouseDown = useCallback((componentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const svgPos = screenToSvg(e.clientX - rect.left, e.clientY - rect.top);
    const comp = diagram.parts.find(p => p.id === componentId);
    if (!comp) return;
    setDragOffset({ x: svgPos.x - comp.left, y: svgPos.y - comp.top });
    setCanvas(prev => ({ ...prev, draggingId: componentId }));
    onSelect(componentId);
  }, [diagram.parts, screenToSvg, onSelect]);

  const handlePinClick = useCallback((componentId: string, pinName: string) => {
    const pinRef = `${componentId}:${pinName}`;
    if (!wiringFrom) {
      setWiringFrom(pinRef);
    } else {
      if (wiringFrom !== pinRef) {
        const newConnection: [string, string, string, string[]] = [wiringFrom, pinRef, '#22c55e', []];
        onDiagramChange({
          ...diagram,
          connections: [...diagram.connections, newConnection],
        });
      }
      setWiringFrom(null);
    }
  }, [wiringFrom, diagram, onDiagramChange]);

  const getPinPosition = useCallback((pinRef: string): { x: number; y: number } | null => {
    const [compId, pinName] = pinRef.split(':');
    if (compId === '$serialMonitor') return null;
    const comp = diagram.parts.find(p => p.id === compId);
    if (!comp) return null;
    const meta = COMPONENT_REGISTRY[comp.type];
    if (!meta) return null;
    const pin = meta.pins.find(p => p.name === pinName);
    if (!pin) return null;

    // Raw pin position (unrotated)
    let px = comp.left + pin.x;
    let py = comp.top + pin.y;

    // Apply rotation around component center if rotated
    const rotation = comp.rotate || 0;
    if (rotation) {
      const cx = comp.left + meta.width / 2;
      const cy = comp.top + meta.height / 2;
      const rad = (rotation * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const dx = px - cx;
      const dy = py - cy;
      px = cx + dx * cos - dy * sin;
      py = cy + dx * sin + dy * cos;
    }

    return { x: px, y: py };
  }, [diagram.parts]);

  // Delete selected
  const handleDelete = useCallback(() => {
    if (selectedId) {
      onDiagramChange({
        ...diagram,
        parts: diagram.parts.filter(p => p.id !== selectedId),
        connections: diagram.connections.filter(c =>
          !c[0].startsWith(selectedId + ':') && !c[1].startsWith(selectedId + ':')
        ),
      });
      onSelect(null);
    }
  }, [selectedId, diagram, onDiagramChange, onSelect]);

  // Rotate selected
  const handleRotate = useCallback(() => {
    if (selectedId) {
      onDiagramChange({
        ...diagram,
        parts: diagram.parts.map(p =>
          p.id === selectedId
            ? { ...p, rotate: ((p.rotate || 0) + 90) % 360 }
            : p
        ),
      });
    }
  }, [selectedId, diagram, onDiagramChange]);

  // Fit to view
  const handleFit = useCallback(() => {
    if (!svgRef.current || diagram.parts.length === 0) {
      setCanvas(prev => ({ ...prev, zoom: 1, panX: 300, panY: 100 }));
      return;
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const part of diagram.parts) {
      const meta = COMPONENT_REGISTRY[part.type];
      const w = meta?.width || 80;
      const h = meta?.height || 80;
      minX = Math.min(minX, part.left);
      minY = Math.min(minY, part.top);
      maxX = Math.max(maxX, part.left + w);
      maxY = Math.max(maxY, part.top + h);
    }
    const contentW = maxX - minX + 60;
    const contentH = maxY - minY + 60;
    const svgRect = svgRef.current.getBoundingClientRect();
    const scaleX = svgRect.width / contentW;
    const scaleY = svgRect.height / contentH;
    const newZoom = Math.max(0.2, Math.min(2, Math.min(scaleX, scaleY) * 0.85));
    const panX = (svgRect.width - contentW * newZoom) / 2 - minX * newZoom + 30;
    const panY = (svgRect.height - contentH * newZoom) / 2 - minY * newZoom + 30;
    setCanvas(prev => ({ ...prev, zoom: newZoom, panX, panY }));
  }, [diagram.parts]);

  // Render wires
  const renderWires = () => {
    return diagram.connections.map((conn, i) => {
      const fromPos = getPinPosition(conn[0]);
      const toPos = getPinPosition(conn[1]);
      if (!fromPos || !toPos) return null;
      const color = conn[2] || '#22c55e';
      const dx = toPos.x - fromPos.x;
      const cx1 = fromPos.x + dx * 0.3;
      const cy1 = fromPos.y;
      const cx2 = toPos.x - dx * 0.3;
      const cy2 = toPos.y;
      return (
        <g key={`wire-${i}`}>
          <path
            d={`M ${fromPos.x} ${fromPos.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${toPos.x} ${toPos.y}`}
            fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" opacity={0.8}
          />
          <circle cx={fromPos.x} cy={fromPos.y} r={3} fill={color} />
          <circle cx={toPos.x} cy={toPos.y} r={3} fill={color} />
        </g>
      );
    });
  };

  const renderWiringPreview = () => {
    if (!wiringFrom) return null;
    const fromPos = getPinPosition(wiringFrom);
    if (!fromPos) return null;
    return (
      <line
        x1={fromPos.x} y1={fromPos.y}
        x2={mousePos.x} y2={mousePos.y}
        stroke="#f59e0b" strokeWidth={2} strokeDasharray="6,3" opacity={0.7}
      />
    );
  };

  const renderGrid = () => {
    const gridLines = [];
    const step = canvas.gridSize;
    for (let x = -1000; x <= 2000; x += step) {
      gridLines.push(
        <line key={`gv-${x}`} x1={x} y1={-1000} x2={x} y2={2000}
          stroke="#1e293b" strokeWidth={x % (step * 10) === 0 ? 0.5 : 0.2} />
      );
    }
    for (let y = -1000; y <= 2000; y += step) {
      gridLines.push(
        <line key={`gh-${y}`} x1={-1000} y1={y} x2={2000} y2={y}
          stroke="#1e293b" strokeWidth={y % (step * 10) === 0 ? 0.5 : 0.2} />
      );
    }
    return <g className="grid">{gridLines}</g>;
  };

  // Wokwi pin state colors
  const PIN_COLORS = [
    '#ff0000', '#00aa00', '#ffff00', '#cc9900',
    '#888888', '#0000ff', '#006600', '#aa00aa',
    '#00cccc', '#ff8800',
  ];

  return (
    <div className="relative w-full h-full bg-[#0a0a1a] overflow-hidden">
      {/* ============================================ */}
      {/* Wokwi-style bottom toolbar bar */}
      {/* Pin indicators [0-9] + select/rotate/delete */}
      {/* ============================================ */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-[#2d2d2d] border-t border-[#444] flex items-center px-3 py-1.5 gap-1">
        {/* Pin state indicators */}
        <div className="flex items-center gap-0.5 mr-3">
          {PIN_COLORS.map((color, i) => (
            <div
              key={i}
              className="w-6 h-6 rounded-sm flex items-center justify-center text-white text-[10px] font-bold border border-[#555]"
              style={{ backgroundColor: color }}
            >
              {i}
            </div>
          ))}
        </div>

        <div className="w-px h-6 bg-[#555] mx-2" />

        {/* Selection tool */}
        <button
          className="w-8 h-8 rounded flex items-center justify-center text-gray-300 hover:bg-[#444] transition-colors"
          title="Select / Move"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" strokeDasharray="3,2" />
            <rect x="14" y="14" width="7" height="7" strokeDasharray="3,2" />
            <line x1="10" y1="6.5" x2="14" y2="6.5" />
            <line x1="17.5" y1="10" x2="17.5" y2="14" />
          </svg>
        </button>

        {/* Rotate tool */}
        <button
          onClick={handleRotate}
          disabled={!selectedId}
          className="w-8 h-8 rounded flex items-center justify-center text-gray-300 hover:bg-[#444] transition-colors disabled:opacity-30"
          title="Rotate (selected component)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.5 2v6h-6" />
            <path d="M21.34 13.12A9 9 0 1 1 19.07 5L21.5 8" />
          </svg>
        </button>

        {/* Delete tool */}
        <button
          onClick={handleDelete}
          disabled={!selectedId}
          className="w-8 h-8 rounded flex items-center justify-center text-gray-300 hover:bg-red-900/40 hover:text-red-400 transition-colors disabled:opacity-30"
          title="Delete (selected component)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M5 6v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </button>

        {/* Spacer + zoom info */}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleFit}
            className="px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-[#444] rounded transition-colors"
          >
            Fit
          </button>
          <span className="text-xs text-gray-500 font-mono w-10 text-right">
            {Math.round(canvas.zoom * 100)}%
          </span>
        </div>

        {/* Close (X) button - Wokwi style */}
        <div className="w-px h-6 bg-[#555] mx-2" />
        <button
          className="w-8 h-8 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#444] transition-colors"
          title="Close simulation"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Wiring indicator */}
      {wiringFrom && (
        <div className="absolute top-2 right-2 z-10 bg-yellow-900/80 text-yellow-200 px-3 py-1 rounded text-sm border border-yellow-700">
          Wiring from: {wiringFrom} — Click target pin or ESC to cancel
        </div>
      )}

      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        style={{ paddingBottom: '44px', outline: 'none' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setWiringFrom(null);
          if (e.key === 'Delete' && selectedId) {
            handleDelete();
          }
        }}
        tabIndex={0}
      >
        <g transform={`translate(${canvas.panX},${canvas.panY}) scale(${canvas.zoom})`}>
          {renderGrid()}
          {renderWires()}
          {renderWiringPreview()}
          {diagram.parts.map((part) => {
            const meta = COMPONENT_REGISTRY[part.type];
            const w = meta?.width || 60;
            const h = meta?.height || 40;
            const rotation = part.rotate || 0;
            // Rotation center = component center
            const cx = part.left + w / 2;
            const cy = part.top + h / 2;
            const rotateTransform = rotation ? `rotate(${rotation},${cx},${cy})` : undefined;

            const Renderer = getComponentRenderer(part.type);
            if (!Renderer) {
              return (
                <g key={part.id} transform={rotateTransform}>
                  <g transform={`translate(${part.left},${part.top})`}>
                    <rect width={w} height={h} rx={4} fill="#333" stroke="#666" />
                    <text x={w/2} y={h/2+4} textAnchor="middle" fill="#999" fontSize={8}>{part.type}</text>
                  </g>
                </g>
              );
            }
            return (
              <g key={part.id} transform={rotateTransform}>
                <Renderer
                  id={part.id}
                  x={part.left}
                  y={part.top}
                  attrs={part.attrs}
                  selected={selectedId === part.id}
                  pinStates={pinStates[part.id]}
                  onMouseDown={(e) => handleComponentMouseDown(part.id, e)}
                  onPinClick={(pin) => handlePinClick(part.id, pin)}
                />
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
