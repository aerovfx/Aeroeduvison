"use client"

import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface MLScatterPlotProps {
  data: {
    X: number[][];
    y_true: number[];
    y_pred: number[];
  };
  title: string;
  decisionBoundary?: any;
  showBoundary?: boolean;
}

export function MLScatterPlot({ data, title, decisionBoundary, showBoundary = true }: MLScatterPlotProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || !data.X || data.X.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;
    const plotWidth = width - 2 * padding;
    const plotHeight = height - 2 * padding;

    // Clear canvas
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // Find data bounds
    const X = data.X;
    const xValues = X.map(p => p[0]);
    const yValues = X.map(p => p[1] || 0);
    
    const xMin = Math.min(...xValues) - 1;
    const xMax = Math.max(...xValues) + 1;
    const yMin = Math.min(...yValues) - 1;
    const yMax = Math.max(...yValues) + 1;

    // Scale functions
    const scaleX = (x: number) => padding + ((x - xMin) / (xMax - xMin)) * plotWidth;
    const scaleY = (y: number) => height - padding - ((y - yMin) / (yMax - yMin)) * plotHeight;

    // Draw decision boundary if available
    if (showBoundary && decisionBoundary && decisionBoundary.x) {
      const boundaryX = decisionBoundary.x;
      const boundaryY = decisionBoundary.y;
      const boundaryZ = decisionBoundary.z;
      
      const resolution = boundaryX[0].length;
      const cellWidth = plotWidth / resolution;
      const cellHeight = plotHeight / resolution;

      for (let i = 0; i < boundaryX.length; i++) {
        for (let j = 0; j < boundaryX[i].length; j++) {
          const x = boundaryX[i][j];
          const y = boundaryY[i][j];
          const classValue = boundaryZ[i][j];
          
          const screenX = scaleX(x) - cellWidth / 2;
          const screenY = scaleY(y) - cellHeight / 2;
          
          // Color by class
          const alpha = 0.1;
          if (classValue === 0) {
            ctx.fillStyle = `rgba(59, 130, 246, ${alpha})`; // Blue
          } else if (classValue === 1) {
            ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`; // Red
          } else if (classValue === 2) {
            ctx.fillStyle = `rgba(34, 197, 94, ${alpha})`; // Green
          } else {
            ctx.fillStyle = `rgba(168, 85, 247, ${alpha})`; // Purple
          }
          
          ctx.fillRect(screenX, screenY, cellWidth, cellHeight);
        }
      }
    }

    // Draw axes
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.stroke();

    // Draw grid
    ctx.strokeStyle = '#F3F4F6';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const x = padding + (plotWidth / 5) * i;
      const y = height - padding - (plotHeight / 5) * i;
      
      ctx.beginPath();
      ctx.moveTo(x, height - padding);
      ctx.lineTo(x, padding);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Draw data points
    X.forEach((point, i) => {
      const x = scaleX(point[0]);
      const y = scaleY(point[1] || 0);
      const trueClass = data.y_true[i];
      const predClass = data.y_pred[i];
      const isCorrect = trueClass === predClass;
      
      // Determine color based on true class
      let color = '#3B82F6'; // Blue
      if (trueClass === 1) color = '#EF4444'; // Red
      if (trueClass === 2) color = '#22C55E'; // Green
      if (trueClass === 3) color = '#A855F7'; // Purple
      
      // Draw point
      ctx.beginPath();
      ctx.arc(x, y, isCorrect ? 6 : 8, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      
      // If prediction is wrong, draw X
      if (!isCorrect) {
        ctx.strokeStyle = '#1F2937';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - 5, y - 5);
        ctx.lineTo(x + 5, y + 5);
        ctx.moveTo(x + 5, y - 5);
        ctx.lineTo(x - 5, y + 5);
        ctx.stroke();
      }
    });

    // Draw axis labels
    ctx.fillStyle = '#6B7280';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Feature 1', width / 2, height - 10);
    
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Feature 2', 0, 0);
    ctx.restore();

  }, [data, decisionBoundary, showBoundary]);

  // Calculate accuracy
  let accuracy = 0;
  if (data && data.y_true && data.y_pred) {
    const correct = data.y_true.filter((y, i) => y === data.y_pred[i]).length;
    accuracy = (correct / data.y_true.length) * 100;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <Badge className="bg-green-100 text-green-800">
            {accuracy.toFixed(1)}% accuracy
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <canvas
          ref={canvasRef}
          width={600}
          height={500}
          className="w-full rounded-lg border border-gray-200"
        />
        <div className="mt-3 flex items-center justify-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
            <span>Class 0</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded-full"></div>
            <span>Class 1</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded-full"></div>
            <span>Class 2</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-gray-900"></div>
            <span>✗ = Sai</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}



