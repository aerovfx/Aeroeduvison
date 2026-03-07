"use client"

import { useEffect, useRef, useState } from "react";
import { RotateCcw, Download, ZoomIn, ZoomOut, Move3d, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface WFC3DViewerProps {
  voxels: any[];
  dimensions: { width: number; height: number; depth: number };
  statistics?: any;
}

export function WFC3DViewer({ voxels, dimensions, statistics }: WFC3DViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState({ x: 30, y: 45 });
  const [zoom, setZoom] = useState(20);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [showAxes, setShowAxes] = useState(true);

  // Render 3D voxels using isometric projection
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !voxels || voxels.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    // Center point
    const centerX = width / 2 + offset.x;
    const centerY = height / 2 + offset.y;

    // Sort voxels by depth for proper rendering
    const sortedVoxels = [...voxels].sort((a, b) => {
      const [ax, ay, az] = a.position;
      const [bx, by, bz] = b.position;
      
      // Calculate depth based on rotation
      const depthA = ax * Math.sin(rotation.y * Math.PI / 180) + 
                     az * Math.cos(rotation.y * Math.PI / 180) + 
                     ay;
      const depthB = bx * Math.sin(rotation.y * Math.PI / 180) + 
                     bz * Math.cos(rotation.y * Math.PI / 180) + 
                     by;
      
      return depthA - depthB;
    });

    // Draw grid if enabled
    if (showGrid) {
      drawGrid(ctx, centerX, centerY, dimensions);
    }

    // Draw axes if enabled
    if (showAxes) {
      drawAxes(ctx, centerX, centerY);
    }

    // Draw voxels
    sortedVoxels.forEach((voxel) => {
      if (voxel.model === 'empty') return;

      const [x, y, z] = voxel.position;
      
      // Convert 3D coordinates to 2D isometric
      const isoX = (x - z) * zoom;
      const isoY = (x + z) * zoom / 2 - y * zoom;
      
      const screenX = centerX + isoX;
      const screenY = centerY + isoY;

      // Draw cube
      drawIsometricCube(ctx, screenX, screenY, zoom, voxel.color);
    });

    // Draw statistics overlay
    if (statistics) {
      drawStatistics(ctx, statistics);
    }

  }, [voxels, dimensions, rotation, zoom, offset, showGrid, showAxes, statistics]);

  const drawIsometricCube = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    color: string
  ) => {
    // Parse color
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 200, g: 200, b: 200 };
    };

    const rgb = hexToRgb(color);

    // Top face (lighter)
    ctx.fillStyle = `rgb(${Math.min(255, rgb.r + 40)}, ${Math.min(255, rgb.g + 40)}, ${Math.min(255, rgb.b + 40)})`;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + size, y + size / 2);
    ctx.lineTo(x, y + size);
    ctx.lineTo(x - size, y + size / 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.stroke();

    // Left face (darker)
    ctx.fillStyle = `rgb(${Math.max(0, rgb.r - 30)}, ${Math.max(0, rgb.g - 30)}, ${Math.max(0, rgb.b - 30)})`;
    ctx.beginPath();
    ctx.moveTo(x, y + size);
    ctx.lineTo(x - size, y + size / 2);
    ctx.lineTo(x - size, y + size / 2 + size);
    ctx.lineTo(x, y + size * 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.stroke();

    // Right face (normal)
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y + size);
    ctx.lineTo(x + size, y + size / 2);
    ctx.lineTo(x + size, y + size / 2 + size);
    ctx.lineTo(x, y + size * 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.stroke();
  };

  const drawGrid = (
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    dims: { width: number; height: number; depth: number }
  ) => {
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
    ctx.lineWidth = 1;

    // Draw grid lines
    for (let x = 0; x <= dims.width; x++) {
      for (let z = 0; z <= dims.depth; z++) {
        const isoX = (x - z) * zoom;
        const isoY = (x + z) * zoom / 2;
        const screenX = centerX + isoX;
        const screenY = centerY + isoY;

        if (x < dims.width) {
          const nextX = x + 1;
          const nextIsoX = (nextX - z) * zoom;
          const nextIsoY = (nextX + z) * zoom / 2;
          ctx.beginPath();
          ctx.moveTo(screenX, screenY);
          ctx.lineTo(centerX + nextIsoX, centerY + nextIsoY);
          ctx.stroke();
        }

        if (z < dims.depth) {
          const nextZ = z + 1;
          const nextIsoX = (x - nextZ) * zoom;
          const nextIsoY = (x + nextZ) * zoom / 2;
          ctx.beginPath();
          ctx.moveTo(screenX, screenY);
          ctx.lineTo(centerX + nextIsoX, centerY + nextIsoY);
          ctx.stroke();
        }
      }
    }
  };

  const drawAxes = (
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number
  ) => {
    const axisLength = 50;

    // X axis (red)
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX - dimensions.width * zoom / 2, centerY);
    ctx.lineTo(centerX - dimensions.width * zoom / 2 + axisLength, centerY + axisLength / 2);
    ctx.stroke();

    // Y axis (green)
    ctx.strokeStyle = '#00FF00';
    ctx.beginPath();
    ctx.moveTo(centerX - dimensions.width * zoom / 2, centerY);
    ctx.lineTo(centerX - dimensions.width * zoom / 2, centerY - axisLength);
    ctx.stroke();

    // Z axis (blue)
    ctx.strokeStyle = '#0000FF';
    ctx.beginPath();
    ctx.moveTo(centerX - dimensions.width * zoom / 2, centerY);
    ctx.lineTo(centerX - dimensions.width * zoom / 2 - axisLength, centerY + axisLength / 2);
    ctx.stroke();
  };

  const drawStatistics = (ctx: CanvasRenderingContext2D, stats: any) => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, 200, 100);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '14px monospace';
    ctx.fillText(`Voxels: ${voxels.length}`, 20, 30);
    ctx.fillText(`Fill: ${(stats.fill_rate * 100).toFixed(1)}%`, 20, 50);
    ctx.fillText(`Iterations: ${stats.iterations}`, 20, 70);
    ctx.fillText(`Success: ${stats.success ? 'Yes' : 'No'}`, 20, 90);
  };

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    if (e.shiftKey) {
      // Pan
      setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    } else {
      // Rotate
      setRotation(prev => ({
        x: (prev.x + dy) % 360,
        y: (prev.y + dx) % 360
      }));
    }

    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(50, prev + 2));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(5, prev - 2));
  };

  const handleReset = () => {
    setRotation({ x: 30, y: 45 });
    setZoom(20);
    setOffset({ x: 0, y: 0 });
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = 'wfc-structure.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className="w-full rounded-lg border border-gray-700 cursor-move"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />

          {/* Controls overlay */}
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            <Button onClick={handleZoomIn} size="sm" variant="secondary">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button onClick={handleZoomOut} size="sm" variant="secondary">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button onClick={handleReset} size="sm" variant="secondary">
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button 
              onClick={() => setShowGrid(!showGrid)} 
              size="sm" 
              variant={showGrid ? "default" : "secondary"}
            >
              {showGrid ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
            <Button onClick={handleDownload} size="sm" variant="secondary">
              <Download className="h-4 w-4" />
            </Button>
          </div>

          {/* Instructions */}
          <div className="absolute bottom-4 left-4 bg-black/70 text-white px-4 py-2 rounded text-sm">
            <div>🖱️ Drag: Rotate</div>
            <div>⇧ + Drag: Pan</div>
            <div>Zoom: {zoom}x</div>
          </div>
        </div>

        {/* Info badges */}
        <div className="flex items-center gap-2 mt-4">
          <Badge variant="secondary">
            {dimensions.width}×{dimensions.height}×{dimensions.depth}
          </Badge>
          <Badge variant="secondary">
            {voxels.length} voxels
          </Badge>
          {statistics && (
            <>
              <Badge variant={statistics.success ? "default" : "destructive"}>
                {statistics.success ? "Success" : "Partial"}
              </Badge>
              <Badge variant="outline">
                {(statistics.fill_rate * 100).toFixed(1)}% filled
              </Badge>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}



