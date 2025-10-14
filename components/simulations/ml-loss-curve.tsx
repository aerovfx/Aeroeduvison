"use client"

import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MLLossCurveProps {
  history: {
    train_loss: number[];
    test_loss?: number[];
    epochs: number[];
  };
  title?: string;
}

export function MLLossCurve({ history, title = "Training Loss" }: MLLossCurveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !history || !history.train_loss || history.train_loss.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;
    const plotWidth = width - 2 * padding;
    const plotHeight = height - 2 * padding;

    // Clear
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    const trainLoss = history.train_loss;
    const testLoss = history.test_loss || [];
    const epochs = history.epochs || trainLoss.map((_, i) => i);

    const maxEpoch = Math.max(...epochs);
    const maxLoss = Math.max(...trainLoss, ...(testLoss.length > 0 ? testLoss : [0]));
    const minLoss = Math.min(...trainLoss, ...(testLoss.length > 0 ? testLoss : [0]));

    // Scale functions
    const scaleX = (epoch: number) => padding + (epoch / maxEpoch) * plotWidth;
    const scaleY = (loss: number) => height - padding - ((loss - minLoss) / (maxLoss - minLoss + 0.001)) * plotHeight;

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

    // Draw axes
    ctx.strokeStyle = '#9CA3AF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.stroke();

    // Draw training loss
    if (trainLoss.length > 0) {
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      epochs.forEach((epoch, i) => {
        const x = scaleX(epoch);
        const y = scaleY(trainLoss[i]);
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
      
      // Draw points
      epochs.forEach((epoch, i) => {
        const x = scaleX(epoch);
        const y = scaleY(trainLoss[i]);
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#3B82F6';
        ctx.fill();
      });
    }

    // Draw test loss
    if (testLoss.length > 0) {
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      epochs.forEach((epoch, i) => {
        const x = scaleX(epoch);
        const y = scaleY(testLoss[i]);
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Draw points
      epochs.forEach((epoch, i) => {
        const x = scaleX(epoch);
        const y = scaleY(testLoss[i]);
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#EF4444';
        ctx.fill();
      });
    }

    // Labels
    ctx.fillStyle = '#6B7280';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Epoch', width / 2, height - 10);
    
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Loss', 0, 0);
    ctx.restore();

  }, [history]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-blue-500"></div>
              <span className="text-gray-600">Train</span>
            </div>
            {history.test_loss && history.test_loss.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-red-500 border-dashed"></div>
                <span className="text-gray-600">Test</span>
              </div>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <canvas
          ref={canvasRef}
          width={600}
          height={400}
          className="w-full rounded-lg border border-gray-200"
        />
        {history.train_loss && history.train_loss.length > 0 && (
          <div className="mt-3 text-sm text-gray-600 text-center">
            Final train loss: <span className="font-semibold text-blue-600">
              {history.train_loss[history.train_loss.length - 1]?.toFixed(4)}
            </span>
            {history.test_loss && history.test_loss.length > 0 && (
              <>
                {' | '}Test loss: <span className="font-semibold text-red-600">
                  {history.test_loss[history.test_loss.length - 1]?.toFixed(4)}
                </span>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


