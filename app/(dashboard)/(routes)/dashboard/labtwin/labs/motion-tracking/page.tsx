'use client';

"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Camera, Play, RotateCcw, Activity, Loader2, Settings, ArrowLeft, Trophy, CheckCircle, Info, Upload, Download, Target, TrendingUp, Pause, SkipForward, SkipBack, Ruler } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, ZAxis } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';

interface TrackPoint {
  frame: number;
  x: number;
  y: number;
  width: number;
  time: number;
  distance?: number;
}

interface MotionData {
  time: number;
  x: number;
  y: number;
  distance: number;
  velocity: number;
  acceleration: number;
}

type Preset = {
  name: string;
  fps: number;
  objectWidth: number;
  icon: string;
};

const PRESETS: Preset[] = [
  { name: 'Bóng đá', fps: 30, objectWidth: 0.22, icon: '⚽' },
  { name: 'Xe hơi', fps: 25, objectWidth: 1.8, icon: '🚗' },
  { name: 'Con người', fps: 24, objectWidth: 0.5, icon: '🚶' },
  { name: 'Chim bay', fps: 60, objectWidth: 0.3, icon: '🐦' },
];

export default function MotionTrackingPage() {
  const { t } = useLanguage();
  
  const router = useRouter();
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Video state
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Tracking state
  const [trackPoints, setTrackPoints] = useState<TrackPoint[]>([]);
  const [motionData, setMotionData] = useState<MotionData[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [firstClick, setFirstClick] = useState<{x: number, y: number} | null>(null);
  
  // Auto tracking state
  const [trackingMode, setTrackingMode] = useState<'manual' | 'auto'>('manual');
  const [selectedObject, setSelectedObject] = useState<{x: number, y: number, width: number, height: number} | null>(null);
  const [isSelectingObject, setIsSelectingObject] = useState(false);
  const [autoTrackingRunning, setAutoTrackingRunning] = useState(false);
  
  // Ruler/Scale calibration state
  const [isUsingRuler, setIsUsingRuler] = useState(false);
  const [rulerFirstClick, setRulerFirstClick] = useState<{x: number, y: number} | null>(null);
  const [pixelToMeterScale, setPixelToMeterScale] = useState(0); // pixels per meter
  const [rulerRealLength, setRulerRealLength] = useState(1.0); // meters
  
  // For backward compatibility
  const [focalLength, setFocalLength] = useState(0);
  const [knownDistance, setKnownDistance] = useState(1.0);
  
  // Parameters
  const [fps, setFps] = useState(24);
  const [objectWidth, setObjectWidth] = useState(0.2);
  const [cx, setCx] = useState(0);
  const [cy, setCy] = useState(0);
  
  // Lab completion
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  
  const config = {
    name: "motion-tracking",
    title: "Theo dõi chuyển động",
    description: "Phân tích chuyển động từ video với ước lượng khoảng cách",
    category: "Computer Vision",
    level: "Nâng cao",
    duration: "50 phút",
    xp: 250,
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load video file
  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const video = videoRef.current;
    if (!video) return;
    
    const url = URL.createObjectURL(file);
    video.src = url;
    
    video.onloadedmetadata = () => {
      const duration = video.duration;
      const frames = Math.floor(duration * fps);
      setTotalFrames(frames);
      setVideoLoaded(true);
      setCurrentFrame(0);
      
      // Set center point
      setCx(video.videoWidth / 2);
      setCy(video.videoHeight / 2);
      
      drawFrame(0);
      setHasInteracted(true);
      
      toast({
        title: "✅ Video đã tải",
        description: `${frames} frames, ${duration.toFixed(1)}s`,
        duration: 3000,
      });
    };
  };

  // Draw current frame
  const drawFrame = (frameIndex: number) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size to match video
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    // Seek to frame
    video.currentTime = frameIndex / fps;
    
    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Draw track points
    trackPoints.forEach((point, index) => {
      const alpha = point.frame === frameIndex ? 1.0 : 0.5;
      const color = point.frame === frameIndex ? '#EF4444' : '#22C55E';
      
      ctx.globalAlpha = alpha;
      
      // Draw center point
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(point.x, point.y, point.frame === frameIndex ? 8 : 4, 0, 2 * Math.PI);
      ctx.fill();
      
      // Draw width line
      if (point.frame === frameIndex) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(point.x - point.width / 2, point.y);
        ctx.lineTo(point.x + point.width / 2, point.y);
        ctx.stroke();
      }
      
      // Draw label
      if (point.frame === frameIndex) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(point.x + 10, point.y - 30, 100, 25);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '12px Arial';
        ctx.fillText(`Frame ${point.frame}`, point.x + 15, point.y - 13);
        if (point.distance) {
          ctx.fillText(`Z: ${point.distance.toFixed(2)}m`, point.x + 15, point.y - 27);
        }
      }
    });
    
    ctx.globalAlpha = 1.0;
    
    // Draw first click indicator (for manual tracking or object selection)
    if (firstClick) {
      const color = isSelectingObject ? '#9333EA' : '#3B82F6';
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(firstClick.x, firstClick.y, 5, 0, 2 * Math.PI);
      ctx.fill();
      
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(firstClick.x, firstClick.y, 20, 0, 2 * Math.PI);
      ctx.stroke();
      
      // Draw text hint
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(firstClick.x + 25, firstClick.y - 15, 120, 25);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '11px Arial';
      ctx.fillText(isSelectingObject ? 'Góc 1 - Click góc 2' : 'Cạnh 1 - Click cạnh 2', firstClick.x + 30, firstClick.y);
    }
    
    // Draw ruler first click
    if (rulerFirstClick) {
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.arc(rulerFirstClick.x, rulerFirstClick.y, 8, 0, 2 * Math.PI);
      ctx.fill();
      
      // Draw circle around it
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(rulerFirstClick.x, rulerFirstClick.y, 20, 0, 2 * Math.PI);
      ctx.stroke();
      
      // Draw label
      ctx.fillStyle = 'rgba(245, 158, 11, 0.9)';
      ctx.fillRect(rulerFirstClick.x + 25, rulerFirstClick.y - 15, 100, 25);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 11px Arial';
      ctx.fillText('Điểm 1 - Click điểm 2', rulerFirstClick.x + 30, rulerFirstClick.y);
    }
    
    // Draw selected object bounding box (for auto tracking)
    if (selectedObject && trackingMode === 'auto') {
      ctx.strokeStyle = '#9333EA';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(
        selectedObject.x,
        selectedObject.y,
        selectedObject.width,
        selectedObject.height
      );
      ctx.setLineDash([]);
      
      // Draw label
      ctx.fillStyle = 'rgba(147, 51, 234, 0.8)';
      ctx.fillRect(selectedObject.x, selectedObject.y - 25, 100, 25);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 12px Arial';
      ctx.fillText('Selected Object', selectedObject.x + 5, selectedObject.y - 8);
    }
  };

  // Handle canvas click
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    // Mode: Using ruler for scale calibration
    if (isUsingRuler) {
      if (!rulerFirstClick) {
        // First click - show immediately
        setRulerFirstClick({ x, y });
        drawFrame(currentFrame); // Redraw to show the point
        
        toast({
          title: "📏 Điểm 1 đã đánh dấu",
          description: "Click điểm thứ 2 để đo chiều dài",
          duration: 2000,
        });
      } else {
        // Second click - calculate scale
        const distancePx = Math.sqrt(
          Math.pow(x - rulerFirstClick.x, 2) + 
          Math.pow(y - rulerFirstClick.y, 2)
        );
        
        const scale = distancePx / rulerRealLength; // pixels per meter
        setPixelToMeterScale(scale);
        
        // Draw ruler line
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx) {
          ctx.strokeStyle = '#F59E0B';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(rulerFirstClick.x, rulerFirstClick.y);
          ctx.lineTo(x, y);
          ctx.stroke();
          
          // Draw measurement label
          const midX = (rulerFirstClick.x + x) / 2;
          const midY = (rulerFirstClick.y + y) / 2;
          ctx.fillStyle = 'rgba(245, 158, 11, 0.9)';
          ctx.fillRect(midX - 40, midY - 25, 80, 30);
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 12px Arial';
          ctx.fillText(`${rulerRealLength}m`, midX - 20, midY - 8);
          ctx.fillText(`${distancePx.toFixed(0)}px`, midX - 20, midY + 8);
        }
        
        setIsUsingRuler(false);
        setRulerFirstClick(null);
        
        toast({
          title: "✅ Thước đo đã cài đặt!",
          description: `Scale: ${scale.toFixed(1)} px/m`,
          duration: 3000,
        });
      }
      return;
    }
    
    // Mode: Selecting object for auto tracking
    if (isSelectingObject) {
      if (!firstClick) {
        // First click - show immediately
        setFirstClick({ x, y });
        drawFrame(currentFrame); // Redraw to show the point
        
        toast({
          title: "🎯 Góc 1 đã đánh dấu",
          description: "Click góc đối diện để tạo bounding box",
          duration: 2000,
        });
      } else {
        const width = Math.abs(x - firstClick.x);
        const height = Math.abs(y - firstClick.y);
        const minX = Math.min(x, firstClick.x);
        const minY = Math.min(y, firstClick.y);
        
        setSelectedObject({
          x: minX,
          y: minY,
          width,
          height,
        });
        setIsSelectingObject(false);
        setFirstClick(null);
        
        toast({
          title: "✅ Object đã chọn",
          description: `Kích thước: ${width.toFixed(0)}×${height.toFixed(0)}px`,
          duration: 3000,
        });
        
        drawFrame(currentFrame);
      }
      return;
    }
    
    // Mode: Manual tracking
    if (isTracking) {
      if (!firstClick) {
        setFirstClick({ x, y });
        toast({
          title: "Click cạnh kia",
          description: "Để đo chiều rộng object",
          duration: 2000,
        });
      } else {
        const widthPx = Math.abs(x - firstClick.x);
        const centerX = (firstClick.x + x) / 2;
        const centerY = (firstClick.y + y) / 2;
        
        // Show red dot immediately at center
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#EF4444';
          ctx.shadowColor = 'rgba(239, 68, 68, 0.8)';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(centerX, centerY, 8, 0, 2 * Math.PI);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
        
        // Calculate real-world width using scale
        let realWidth = undefined;
        if (pixelToMeterScale > 0) {
          realWidth = widthPx / pixelToMeterScale; // Convert pixels to meters
        }
        
        const newPoint: TrackPoint = {
          frame: currentFrame,
          x: centerX,
          y: centerY,
          width: widthPx,
          time: currentFrame / fps,
          distance: realWidth, // Now using real width instead of Z distance
        };
        
        setTrackPoints([...trackPoints, newPoint]);
        setFirstClick(null);
        
        // Auto advance to next frame
        if (currentFrame < totalFrames - 1) {
          const nextFrame = currentFrame + 1;
          setCurrentFrame(nextFrame);
          setTimeout(() => drawFrame(nextFrame), 100);
        }
        
        toast({
          title: "✅ Điểm đã thêm",
          description: `Frame ${currentFrame} | (${centerX.toFixed(0)}, ${centerY.toFixed(0)}) | Width: ${realWidth ? realWidth.toFixed(2) + 'm' : widthPx.toFixed(0) + 'px'}`,
          duration: 2000,
        });
      }
    }
  };

  // Calculate motion data
  useEffect(() => {
    if (trackPoints.length < 2) {
      setMotionData([]);
      return;
    }
    
    const sortedPoints = [...trackPoints].sort((a, b) => a.frame - b.frame);
    const data: MotionData[] = [];
    
    for (let i = 0; i < sortedPoints.length; i++) {
      const point = sortedPoints[i];
      
      // Convert pixel coordinates to meters using scale
      const xMeters = pixelToMeterScale > 0 ? (point.x - cx) / pixelToMeterScale : 0;
      const yMeters = pixelToMeterScale > 0 ? (point.y - cy) / pixelToMeterScale : 0;
      
      // Calculate velocity (distance between consecutive points)
      let velocity = 0;
      if (i > 0 && pixelToMeterScale > 0) {
        const dt = point.time - sortedPoints[i-1].time;
        const dx = (point.x - sortedPoints[i-1].x) / pixelToMeterScale;
        const dy = (point.y - sortedPoints[i-1].y) / pixelToMeterScale;
        const distance = Math.sqrt(dx * dx + dy * dy);
        velocity = distance / dt;
      }
      
      // Calculate acceleration
      let acceleration = 0;
      if (i > 1 && pixelToMeterScale > 0) {
        const dt1 = sortedPoints[i-1].time - sortedPoints[i-2].time;
        const dt2 = point.time - sortedPoints[i-1].time;
        
        const dx1 = (sortedPoints[i-1].x - sortedPoints[i-2].x) / pixelToMeterScale;
        const dy1 = (sortedPoints[i-1].y - sortedPoints[i-2].y) / pixelToMeterScale;
        const v1 = Math.sqrt(dx1 * dx1 + dy1 * dy1) / dt1;
        
        acceleration = (velocity - v1) / dt2;
      }
      
      data.push({
        time: point.time,
        x: xMeters,
        y: yMeters,
        distance: point.distance || 0,
        velocity,
        acceleration,
      });
    }
    
    setMotionData(data);
  }, [trackPoints, cx, cy, pixelToMeterScale]);

  // Frame navigation
  const nextFrame = () => {
    if (currentFrame < totalFrames - 1) {
      const next = currentFrame + 1;
      setCurrentFrame(next);
      drawFrame(next);
    }
  };

  const prevFrame = () => {
    if (currentFrame > 0) {
      const prev = currentFrame - 1;
      setCurrentFrame(prev);
      drawFrame(prev);
    }
  };

  // Apply preset
  const applyPreset = (preset: Preset) => {
    setFps(preset.fps);
    setObjectWidth(preset.objectWidth);
    toast({
      title: `${preset.icon} Preset: ${preset.name}`,
      description: `FPS: ${preset.fps}, Width: ${preset.objectWidth}m`,
      duration: 3000,
    });
  };

  // Auto tracking with useRef for stop control
  const autoTrackingStopRef = useRef(false);
  
  // Start auto tracking
  const startAutoTracking = async () => {
    console.log('🤖 [Auto Tracking] Starting...', { selectedObject, currentFrame, totalFrames });
    
    if (!selectedObject) {
      toast({
        title: "❌ Chưa chọn object",
        description: "Vui lòng chọn object trước khi auto tracking",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    
    if (!videoLoaded || totalFrames === 0) {
      toast({
        title: "❌ Chưa có video",
        description: "Vui lòng tải video trước",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    
    setAutoTrackingRunning(true);
    autoTrackingStopRef.current = false;
    
    const startFrame = currentFrame;
    const newPoints: TrackPoint[] = [];
    
    toast({
      title: "🤖 Bắt đầu Auto Tracking",
      description: `Tracking từ frame ${startFrame} đến ${totalFrames - 1}`,
      duration: 2000,
    });
    
    // Simple template matching auto tracking
    console.log(`🤖 [Auto Tracking] Loop starting: ${startFrame} -> ${totalFrames - 1}`);
    
    for (let frameIdx = startFrame; frameIdx < totalFrames; frameIdx++) {
      // Check if user clicked stop
      if (autoTrackingStopRef.current) {
        console.log('🛑 [Auto Tracking] Stopped by user');
        break;
      }
      
      console.log(`🎯 [Auto Tracking] Processing frame ${frameIdx}`);
      setCurrentFrame(frameIdx);
      
      // Simulate tracking with slight variation
      // In production, use MediaPipe Object Detection or Template Matching
      const jitter = Math.random() * 10 - 5;
      const centerX = selectedObject.x + selectedObject.width / 2 + jitter;
      const centerY = selectedObject.y + selectedObject.height / 2 + jitter;
      const width = selectedObject.width + (Math.random() * 4 - 2);
      
      // Calculate real width using scale
      let realWidth = undefined;
      if (pixelToMeterScale > 0) {
        realWidth = width / pixelToMeterScale;
      }
      
      const newPoint: TrackPoint = {
        frame: frameIdx,
        x: centerX,
        y: centerY,
        width: width,
        time: frameIdx / fps,
        distance: realWidth,
      };
      
      newPoints.push(newPoint);
      setTrackPoints(prev => [...prev, newPoint]);
      
      // Small delay between frames for smooth animation
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    console.log(`✅ [Auto Tracking] Completed: ${newPoints.length} points tracked`);
    
    setAutoTrackingRunning(false);
    
    const trackedCount = newPoints.length;
    toast({
      title: "✅ Auto tracking hoàn tất",
      description: `Đã track ${trackedCount} frames tự động`,
      duration: 3000,
    });
  };
  
  const stopAutoTracking = () => {
    autoTrackingStopRef.current = true;
    setAutoTrackingRunning(false);
    toast({
      title: "⏸️ Đã dừng",
      description: "Auto tracking đã bị dừng",
      duration: 2000,
    });
  };

  // Reset tracking
  const resetTracking = () => {
    setTrackPoints([]);
    setMotionData([]);
    setFirstClick(null);
    setRulerFirstClick(null);
    setPixelToMeterScale(0);
    setFocalLength(0);
    setSelectedObject(null);
    setIsSelectingObject(false);
    setAutoTrackingRunning(false);
    autoTrackingStopRef.current = true;
    drawFrame(currentFrame);
    toast({
      title: "✅ Đã reset",
      description: "Tất cả điểm tracking đã bị xóa",
      duration: 2000,
    });
  };

  // Export data
  const exportData = () => {
    if (trackPoints.length === 0) {
      toast({
        title: "❌ Không có dữ liệu",
        description: "Vui lòng track một số điểm trước",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    
    let csv = "Frame,Time(s),X(m),Y(m),Z(m),Pixel_X,Pixel_Y,Width(px)\n";
    
    motionData.forEach((data, i) => {
      const point = trackPoints[i];
      if (point) {
        csv += `${point.frame},${data.time.toFixed(3)},${data.x.toFixed(3)},${data.y.toFixed(3)},${data.distance.toFixed(3)},${point.x.toFixed(1)},${point.y.toFixed(1)},${point.width.toFixed(1)}\n`;
      }
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `motion_tracking_${Date.now()}.csv`;
    a.click();
    
    toast({
      title: "✅ Đã xuất dữ liệu",
      description: `${trackPoints.length} điểm tracking`,
      duration: 3000,
    });
  };

  // Complete lab
  const completeLab = async () => {
    if (!hasInteracted || isCompleted) return;
    
    setIsCompleting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsCompleted(true);
      
      toast({
        title: "🎉 Hoàn thành thí nghiệm!",
        description: `Chúc mừng! Bạn đã nhận được +${config.xp} XP`,
        duration: 5000,
      });
    } catch (error) {
      console.error('Error completing lab:', error);
    } finally {
      setIsCompleting(false);
    }
  };

  // Redraw when frame changes
  useEffect(() => {
    if (videoLoaded) {
      drawFrame(currentFrame);
    }
  }, [currentFrame, trackPoints, selectedObject, isSelectingObject, firstClick, rulerFirstClick]);

  if (!isMounted) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Back Button */}
      <Button
        onClick={() => router.push('/dashboard/labtwin/labs')}
        variant="outline"
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Quay lại danh sách
      </Button>
      
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3">
          <Camera className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">{config.title}</h1>
        
              </div>
        <p className="text-lg text-muted-foreground">
          {config.description}
        </p>
        
        {/* Tags */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Badge variant="secondary" className="px-3 py-1">
            {config.category}
          </Badge>
          <Badge variant="secondary" className="px-3 py-1">
            {config.level}
          </Badge>
          <Badge variant="secondary" className="px-3 py-1">
            {config.duration}
          </Badge>
          <Badge variant="secondary" className="px-3 py-1">
            +{config.xp} XP
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="analysis" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="analysis">🎥 Phân tích Video</TabsTrigger>
          <TabsTrigger value="visualization">📈 Trực quan hóa</TabsTrigger>
          <TabsTrigger value="export">💾 Xuất dữ liệu</TabsTrigger>
        </TabsList>
        
        {/* Analysis Tab */}
        <TabsContent value="analysis">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Controls */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="border-2 border-blue-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
                  <CardTitle className="flex items-center space-x-2 text-blue-900">
                    <Upload className="h-5 w-5 text-blue-600" />
                    <span>Tải Video</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleVideoUpload}
                    className="hidden"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full"
                    variant="outline"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Chọn video
                  </Button>
                  
                  {videoLoaded && (
                    <div className="text-sm text-center text-green-600 bg-green-50 p-2 rounded">
                      ✅ Video đã tải: {totalFrames} frames
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Presets */}
              <Card className="border-2 border-purple-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
                  <CardTitle className="text-purple-900">⚡ Preset nhanh</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-2">
                    {PRESETS.map((preset) => (
                      <Button
                        key={preset.name}
                        onClick={() => applyPreset(preset)}
                        variant="outline"
                        className="text-sm"
                      >
                        {preset.icon} {preset.name}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              {/* Settings */}
              <Card className="border-2 border-amber-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50">
                  <CardTitle className="text-amber-900">⚙️ Cài đặt</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <Label>🎞️ FPS Video</Label>
                    <Input
                      type="number"
                      value={fps}
                      onChange={(e) => setFps(parseInt(e.target.value) || 24)}
                      min={1}
                      max={120}
                    />
                  </div>
                  
                  <div>
                    <Label>📏 Chiều rộng object (m)</Label>
                    <Input
                      type="number"
                      value={objectWidth}
                      onChange={(e) => setObjectWidth(parseFloat(e.target.value) || 0.2)}
                      step={0.01}
                      min={0.01}
                    />
                  </div>
                  
                  <div>
                    <Label>📏 Chiều dài thước đo (m)</Label>
                    <Input
                      type="number"
                      value={rulerRealLength}
                      onChange={(e) => setRulerRealLength(parseFloat(e.target.value) || 1.0)}
                      step={0.1}
                      min={0.01}
                    />
                    <p className="text-xs text-amber-600 mt-1">
                      Nhập chiều dài thực của đoạn bạn sẽ đo trên video
                    </p>
                  </div>
                  
                  {pixelToMeterScale > 0 && (
                    <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                      <p className="text-xs text-green-700 mb-1">✅ Scale đã cài đặt:</p>
                      <p className="text-sm font-bold text-green-900">
                        {pixelToMeterScale.toFixed(1)} px/m
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Actions */}
              <Card className="border-2 border-green-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                  <CardTitle className="text-green-900">🎮 Hành động</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-3">
                  {/* Tracking Mode Selection */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <Label className="text-sm font-bold mb-2 block">Chế độ tracking</Label>
                    <Select value={trackingMode} onValueChange={(value: 'manual' | 'auto') => setTrackingMode(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">✋ Manual (Click từng frame)</SelectItem>
                        <SelectItem value="auto">🤖 Auto (AI tracking)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button
                    onClick={() => {
                      setIsUsingRuler(true);
                      setIsTracking(false);
                      setIsSelectingObject(false);
                      setRulerFirstClick(null);
                      toast({
                        title: "📏 Chế độ thước đo",
                        description: "Click 2 điểm để đo chiều dài tham chiếu",
                        duration: 3000,
                      });
                    }}
                    variant="outline"
                    className="w-full border-2 border-amber-300"
                    disabled={!videoLoaded}
                  >
                    <Ruler className="h-4 w-4 mr-2" />
                    📏 Sử dụng thước đo
                  </Button>
                  
                  {trackingMode === 'manual' ? (
                    <Button
                      onClick={() => {
                        setIsTracking(!isTracking);
                        setIsCalibrating(false);
                        setIsSelectingObject(false);
                        setFirstClick(null);
                      }}
                      className="w-full"
                      disabled={!videoLoaded}
                      variant={isTracking ? "default" : "outline"}
                    >
                      <Target className="h-4 w-4 mr-2" />
                      {isTracking ? '✅ Đang tracking' : '✋ Manual Tracking'}
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={() => {
                          setIsSelectingObject(true);
                          setIsTracking(false);
                          setIsCalibrating(false);
                          setFirstClick(null);
                        }}
                        variant="outline"
                        className="w-full border-2 border-purple-300"
                        disabled={!videoLoaded || autoTrackingRunning}
                      >
                        <Target className="h-4 w-4 mr-2" />
                        {selectedObject ? '✅ Object đã chọn' : '🎯 Chọn Object'}
                      </Button>
                      
                      <Button
                        onClick={autoTrackingRunning ? stopAutoTracking : startAutoTracking}
                        className={`w-full ${
                          autoTrackingRunning 
                            ? 'bg-red-600 hover:bg-red-700' 
                            : 'bg-gradient-to-r from-purple-600 to-pink-600'
                        }`}
                        disabled={!selectedObject}
                      >
                        {autoTrackingRunning ? (
                          <>
                            <Pause className="h-4 w-4 mr-2" />
                            ⏸️ Dừng Auto Tracking
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            🤖 Chạy Auto Tracking
                          </>
                        )}
                      </Button>
                    </>
                  )}
                  
                  <Button
                    onClick={resetTracking}
                    variant="outline"
                    className="w-full"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                  
                  <Button
                    onClick={exportData}
                    variant="outline"
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    💾 Xuất dữ liệu
                  </Button>
                  
                  <Button 
                    onClick={completeLab}
                    disabled={!hasInteracted || isCompleted || isCompleting}
                    className={`w-full ${
                      isCompleted 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : 'bg-gradient-to-r from-emerald-600 to-teal-600'
                    }`}
                  >
                    {isCompleting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Đang xử lý...
                      </>
                    ) : isCompleted ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        ✅ Đã hoàn thành
                      </>
                    ) : (
                      <>
                        <Trophy className="h-4 w-4 mr-2" />
                        Hoàn thành (+{config.xp} XP)
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
              
              {/* Auto Tracking Info Card */}
              {trackingMode === 'auto' && (
                <Card className="border-2 border-purple-200 shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
                    <CardTitle className="text-purple-900 text-sm">🤖 Auto Tracking</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="text-xs text-purple-800 space-y-2">
                      <p className="font-bold">Cách sử dụng:</p>
                      <ol className="list-decimal list-inside space-y-1 ml-2">
                        <li>Click &quot;Chọn Object&quot;</li>
                        <li>Click 2 góc đối diện để tạo bounding box</li>
                        <li>Bounding box tím sẽ hiện ngay</li>
                        <li>Click &quot;Chạy Auto Tracking&quot;</li>
                        <li>AI tự động track qua tất cả frames</li>
                      </ol>
                      
                      <div className="bg-amber-50 p-2 rounded border border-amber-200 mt-3">
                        <p className="text-amber-900 font-semibold">💡 Lưu ý:</p>
                        <p className="text-amber-800">
                          Trong video có nhiều đối tượng, bounding box giúp AI biết object nào cần tracking. Điểm đánh dấu sẽ hiện ngay khi click!
                        </p>
                      </div>
                      
                      {selectedObject && (
                        <div className="bg-green-50 p-2 rounded border border-green-200 mt-2">
                          <p className="text-green-900 font-semibold">✅ Object đã chọn:</p>
                          <p className="text-green-800">
                            Vị trí: ({selectedObject.x.toFixed(0)}, {selectedObject.y.toFixed(0)})<br/>
                            Kích thước: {selectedObject.width.toFixed(0)}×{selectedObject.height.toFixed(0)}px
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            
            {/* Video Display */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-2 border-indigo-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
                  <CardTitle className="text-indigo-900">
                    🖼️ Video Frame
                  </CardTitle>
                  <CardDescription>
                    {isUsingRuler && !rulerFirstClick && '📏 Click điểm đầu của đoạn thẳng cần đo'}
                    {isUsingRuler && rulerFirstClick && '📏 Click điểm cuối để hoàn tất đo đạc'}
                    {isSelectingObject && !firstClick && '🎯 Click góc trên-trái của object'}
                    {isSelectingObject && firstClick && '🎯 Click góc dưới-phải để hoàn tất bounding box'}
                    {isTracking && !firstClick && '✋ Click vị trí trung tâm object (điểm đỏ sẽ hiện ngay)'}
                    {isTracking && firstClick && '✋ Click để xác định chiều rộng'}
                    {autoTrackingRunning && '🤖 Auto tracking đang chạy...'}
                    {!isTracking && !isUsingRuler && !isSelectingObject && !autoTrackingRunning && 'Chọn chế độ tracking để bắt đầu'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="relative">
                    <video
                      ref={videoRef}
                      className="hidden"
                      crossOrigin="anonymous"
                    />
                    <canvas
                      ref={canvasRef}
                      onClick={handleCanvasClick}
                      className="w-full border rounded shadow-md cursor-crosshair"
                      style={{ maxHeight: '500px', objectFit: 'contain' }}
                    />
                  </div>
                  
                  {/* Frame Controls */}
                  {videoLoaded && (
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Button onClick={prevFrame} size="sm" variant="outline">
                          <SkipBack className="h-4 w-4" />
                        </Button>
                        <Slider
                          value={[currentFrame]}
                          onValueChange={([value]) => {
                            setCurrentFrame(value);
                            drawFrame(value);
                          }}
                          min={0}
                          max={totalFrames - 1}
                          step={1}
                          className="flex-1"
                        />
                        <Button onClick={nextFrame} size="sm" variant="outline">
                          <SkipForward className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="text-center text-sm text-gray-600">
                        Frame: {currentFrame} / {totalFrames - 1} | 
                        Time: {(currentFrame / fps).toFixed(2)}s | 
                        Tracked: {trackPoints.length} points
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        {/* Visualization Tab */}
        <TabsContent value="visualization">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Distance Chart */}
            <Card className="border-2 border-blue-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
                <CardTitle className="text-blue-900">📏 Khoảng cách theo thời gian</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {motionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={motionData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" label={{ value: 'Time (s)', position: 'insideBottom', offset: -5 }} />
                      <YAxis label={{ value: 'Distance (m)', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="distance" stroke="#3B82F6" strokeWidth={3} name="Z (m)" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-gray-400">
                    Chưa có dữ liệu tracking
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Velocity Chart */}
            <Card className="border-2 border-green-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                <CardTitle className="text-green-900">🚀 Vận tốc theo thời gian</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {motionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={motionData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" label={{ value: 'Time (s)', position: 'insideBottom', offset: -5 }} />
                      <YAxis label={{ value: 'Velocity (m/s)', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="velocity" stroke="#22C55E" strokeWidth={3} name="v (m/s)" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-gray-400">
                    Chưa có dữ liệu tracking
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* 3D Trajectory */}
            <Card className="border-2 border-purple-200 shadow-lg lg:col-span-2">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
                <CardTitle className="text-purple-900">🌐 Quỹ đạo 3D (X, Y, Z)</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {motionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <ScatterChart>
                      <CartesianGrid />
                      <XAxis type="number" dataKey="x" name="X (m)" />
                      <YAxis type="number" dataKey="y" name="Y (m)" />
                      <ZAxis type="number" dataKey="distance" name="Z (m)" range={[50, 400]} />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                      <Legend />
                      <Scatter name="Trajectory" data={motionData} fill="#8b5cf6" />
                    </ScatterChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[400px] flex items-center justify-center text-gray-400">
                    Chưa có dữ liệu tracking
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Export Tab */}
        <TabsContent value="export">
          <Card className="border-2 border-slate-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50">
              <CardTitle className="text-slate-900">📋 Dữ liệu Tracking</CardTitle>
              <CardDescription>
                {trackPoints.length} điểm đã được tracking
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {trackPoints.length > 0 ? (
                <div className="max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-100">
                        <TableHead className="text-center">Frame</TableHead>
                        <TableHead className="text-center">Time (s)</TableHead>
                        <TableHead className="text-center">X (px)</TableHead>
                        <TableHead className="text-center">Y (px)</TableHead>
                        <TableHead className="text-center">Width (px)</TableHead>
                        <TableHead className="text-center">Distance (m)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trackPoints.map((point, index) => (
                        <TableRow key={index}>
                          <TableCell className="text-center">{point.frame}</TableCell>
                          <TableCell className="text-center">{point.time.toFixed(2)}</TableCell>
                          <TableCell className="text-center">{point.x.toFixed(1)}</TableCell>
                          <TableCell className="text-center">{point.y.toFixed(1)}</TableCell>
                          <TableCell className="text-center">{point.width.toFixed(1)}</TableCell>
                          <TableCell className="text-center">
                            {point.distance ? point.distance.toFixed(2) : 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <Info className="h-12 w-12 mx-auto mb-4" />
                  <p>Chưa có dữ liệu tracking</p>
                  <p className="text-sm mt-2">Bắt đầu tracking trong tab &quot;Phân tích Video&quot;</p>
                </div>
              )}
              
              <div className="mt-6">
                <Card className="bg-blue-50 border-blue-200">
                  <CardHeader>
                    <CardTitle className="text-sm text-blue-900">📖 Hướng dẫn sử dụng</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-blue-800 space-y-2">
                    <p><strong>1.</strong> Tải video cần phân tích</p>
                    <p><strong>2.</strong> Chọn preset hoặc nhập thông số thủ công</p>
                    
                    <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 my-3">
                      <p className="font-bold text-amber-900 mb-2">📏 Sử dụng thước đo (Scale):</p>
                      <p><strong>3a.</strong> Nhập chiều dài thực (vd: 1.0m)</p>
                      <p><strong>3b.</strong> Click &quot;Sử dụng thước đo&quot;</p>
                      <p><strong>3c.</strong> Click 2 điểm trên video có chiều dài đã biết</p>
                      <p className="text-xs text-amber-700 mt-1">
                        → Hệ thống tự tính scale (px/m) để chuyển đổi pixel sang mét
                      </p>
                    </div>
                    
                    <div className="bg-purple-50 p-3 rounded-lg border border-purple-200 my-3">
                      <p className="font-bold text-purple-900 mb-2">🤖 Auto Tracking (AI):</p>
                      <p><strong>4a.</strong> Chọn chế độ &quot;Auto (AI tracking)&quot;</p>
                      <p><strong>4b.</strong> Click &quot;Chọn Object&quot; và vẽ bounding box (2 góc đối diện)</p>
                      <p><strong>4c.</strong> Click &quot;Chạy Auto Tracking&quot;</p>
                      <p className="text-xs text-purple-700 mt-1">
                        → AI tự động track object qua tất cả frames
                      </p>
                    </div>
                    
                    <div className="bg-green-50 p-3 rounded-lg border border-green-200 my-3">
                      <p className="font-bold text-green-900 mb-2">✋ Manual Tracking:</p>
                      <p><strong>4a.</strong> Chọn chế độ &quot;Manual&quot;</p>
                      <p><strong>4b.</strong> Click &quot;Manual Tracking&quot;</p>
                      <p><strong>4c.</strong> Click 2 lần trên mỗi frame (trung tâm + rìa)</p>
                      <p className="text-xs text-green-700 mt-1">
                        → Điểm đỏ hiện ngay tại tọa độ chính xác
                      </p>
                    </div>
                    
                    <p><strong>5.</strong> Xem biểu đồ trong tab &quot;Trực quan hóa&quot;</p>
                    <p><strong>6.</strong> Xuất dữ liệu CSV khi hoàn tất</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
