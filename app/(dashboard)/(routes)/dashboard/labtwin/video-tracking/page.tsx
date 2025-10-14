"use client"

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, Upload, Play, Pause, SkipBack, SkipForward, 
  RotateCcw, Download, Camera, Target, Activity 
} from "lucide-react";

interface TrajectoryPoint {
  frame: number;
  x: number;
  y: number;
  t: number;
}

export default function VideoTrackingPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  const [fps, setFps] = useState(30);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trajectory, setTrajectory] = useState<TrajectoryPoint[]>([]);
  const [bboxSize, setBboxSize] = useState([80]);
  
  // Handle video upload
  const handleVideoUpload = useCallback((file: File) => {
    if (!file) return;
    
    const video = videoRef.current;
    if (!video) return;
    
    const url = URL.createObjectURL(file);
    video.src = url;
    setVideoFile(file);
    
    video.onloadedmetadata = () => {
      setVideoLoaded(true);
      setTotalFrames(Math.floor(video.duration * fps));
      setCurrentFrame(0);
      drawFrame(0);
    };
  }, [fps]);

  // Handle file input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleVideoUpload(file);
    }
  };

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
      handleVideoUpload(file);
    }
  }, [handleVideoUpload]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Draw current frame to canvas
  const drawFrame = (frameNum: number) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set video time
    video.currentTime = frameNum / fps;
    
    video.onseeked = () => {
      // Draw video frame
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Draw trajectory points
      trajectory.forEach((point, index) => {
        if (point.frame === frameNum) {
          // Current frame point - larger
          ctx.fillStyle = '#EF4444';
          ctx.beginPath();
          ctx.arc(point.x, point.y, 8, 0, 2 * Math.PI);
          ctx.fill();
          
          // Bbox
          const halfSize = bboxSize[0] / 2;
          ctx.strokeStyle = '#EF4444';
          ctx.lineWidth = 2;
          ctx.strokeRect(point.x - halfSize, point.y - halfSize, bboxSize[0], bboxSize[0]);
        } else {
          // Other frame points - smaller
          ctx.fillStyle = 'rgba(59, 130, 246, 0.6)';
          ctx.beginPath();
          ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
          ctx.fill();
        }
        
        // Draw lines connecting points
        if (index > 0 && trajectory[index - 1].frame < frameNum && point.frame <= frameNum) {
          const prev = trajectory[index - 1];
          ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(point.x, point.y);
          ctx.stroke();
        }
      });
      
      // Frame info overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(10, 10, 200, 30);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 16px Arial';
      ctx.fillText(`Frame: ${frameNum}/${totalFrames - 1}`, 20, 32);
    };
  };

  // Handle canvas click
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !videoLoaded) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const newPoint: TrajectoryPoint = {
      frame: currentFrame,
      x,
      y,
      t: currentFrame / fps
    };

    setTrajectory(prev => [...prev, newPoint]);
    
    // Auto advance to next frame
    if (currentFrame < totalFrames - 1) {
      const nextFrame = currentFrame + 1;
      setCurrentFrame(nextFrame);
      drawFrame(nextFrame);
    }
  };

  // Navigation
  const goToFrame = (frame: number) => {
    const newFrame = Math.max(0, Math.min(frame, totalFrames - 1));
    setCurrentFrame(newFrame);
    drawFrame(newFrame);
  };

  // Export data
  const exportData = () => {
    if (trajectory.length === 0) {
      alert('No trajectory data to export');
      return;
    }

    let csv = 'Frame,Time(s),X(px),Y(px)\n';
    trajectory.forEach(point => {
      csv += `${point.frame},${point.t.toFixed(3)},${point.x.toFixed(1)},${point.y.toFixed(1)}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'trajectory-data.csv';
    a.click();
  };

  // Reset
  const resetTracking = () => {
    setTrajectory([]);
    drawFrame(currentFrame);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/dashboard/labtwin" 
            className="inline-flex items-center text-indigo-600 hover:text-indigo-700 mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại LabTwin
          </Link>
          
          <div className="flex items-center gap-4 mb-6">
            <div className="p-4 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl text-white">
              <Camera className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                🎬 Video Trajectory Tracking
              </h1>
              <p className="text-gray-600 mt-1">
                Upload video và theo dõi chuyển động vật thể qua từng frame
              </p>
              <div className="flex items-center gap-4 mt-2">
                <Badge variant="secondary">Web-based</Badge>
                <Badge variant="outline">Real-time</Badge>
                <Badge className="bg-purple-600">+120 XP</Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Controls */}
          <div className="space-y-6">
            {/* Video Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload Video
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-all"
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 mb-2">
                    Click or drag video here
                  </p>
                  <p className="text-xs text-gray-500">
                    Supports: MP4, MOV, AVI, WebM
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
                {videoFile && (
                  <div className="mt-3 text-sm text-green-600">
                    ✅ {videoFile.name}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Navigation */}
            {videoLoaded && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Frame Navigation</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-4 gap-2">
                      <Button size="sm" onClick={() => goToFrame(0)}>
                        <SkipBack className="h-4 w-4" />
                      </Button>
                      <Button size="sm" onClick={() => goToFrame(currentFrame - 1)}>
                        ← Prev
                      </Button>
                      <Button size="sm" onClick={() => goToFrame(currentFrame + 1)}>
                        Next →
                      </Button>
                      <Button size="sm" onClick={() => goToFrame(totalFrames - 1)}>
                        <SkipForward className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium mb-2">
                        Frame: {currentFrame} / {totalFrames - 1}
                      </div>
                      <Slider
                        value={[currentFrame]}
                        onValueChange={(value) => {
                          setCurrentFrame(value[0]);
                          drawFrame(value[0]);
                        }}
                        min={0}
                        max={totalFrames - 1}
                        step={1}
                        className="w-full"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        FPS: {fps}
                      </label>
                      <Input
                        type="number"
                        value={fps}
                        onChange={(e) => setFps(parseInt(e.target.value) || 30)}
                        min="1"
                        max="120"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Bbox Size: {bboxSize[0]}px
                      </label>
                      <Slider
                        value={bboxSize}
                        onValueChange={setBboxSize}
                        min={20}
                        max={200}
                        step={10}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button 
                      onClick={resetTracking}
                      variant="outline"
                      className="w-full"
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Reset Tracking
                    </Button>
                    <Button 
                      onClick={exportData}
                      className="w-full bg-green-600 hover:bg-green-700"
                      disabled={trajectory.length === 0}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export CSV ({trajectory.length} points)
                    </Button>
                  </CardContent>
                </Card>

                {/* Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Statistics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Points:</span>
                      <span className="font-semibold">{trajectory.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Current Frame:</span>
                      <span className="font-semibold">{currentFrame}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Time:</span>
                      <span className="font-semibold">{(currentFrame / fps).toFixed(2)}s</span>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Right Panel - Video Display */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Video Frame - Click để đánh dấu vị trí
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <canvas
                    ref={canvasRef}
                    onClick={handleCanvasClick}
                    className="w-full border-2 border-gray-200 rounded-lg cursor-crosshair bg-gray-900"
                    style={{ maxHeight: '500px' }}
                  />
                  <video
                    ref={videoRef}
                    className="hidden"
                    playsInline
                  />
                </div>
                
                {!videoLoaded && (
                  <div className="text-center py-12 text-gray-500">
                    <Camera className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <p>Upload video để bắt đầu tracking</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card className="bg-gradient-to-r from-indigo-50 to-purple-50">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-3">📖 Hướng dẫn sử dụng:</h3>
                <ol className="space-y-2 text-sm text-gray-700">
                  <li>1️⃣ <strong>Upload video</strong> - Click hoặc kéo thả video vào ô upload</li>
                  <li>2️⃣ <strong>Click vật thể</strong> - Click vào vật cần theo dõi trên frame</li>
                  <li>3️⃣ <strong>Tự động chuyển frame</strong> - Sau mỗi click, tự động sang frame tiếp theo</li>
                  <li>4️⃣ <strong>Điều chỉnh</strong> - Dùng slider để chuyển frame thủ công khi cần</li>
                  <li>5️⃣ <strong>Export</strong> - Click "Export CSV" để tải dữ liệu</li>
                </ol>
                
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-xs text-yellow-800">
                    💡 <strong>Tips:</strong> Click chính giữa vật thể để tracking chính xác. 
                    Adjust Bbox Size phù hợp với kích thước vật.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}


