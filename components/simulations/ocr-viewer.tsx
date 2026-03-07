"use client"

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProgressTracker } from "./progress-tracker";
import { 
  FileText, 
  Eye, 
  CheckCircle, 
  Clock, 
  Target, 
  Brain,
  Settings,
  Download,
  Upload,
  Image as ImageIcon,
  Zap,
  Activity,
  FileImage,
  AlertCircle
} from "lucide-react";

interface OCRViewerProps {
  data: any;
  onProgressUpdate?: (progress: number, step: string) => void;
}

interface PipelineStep {
  step: number;
  name: string;
  description: string;
  technologies?: string[];
}

export function OCRViewer({ data, onProgressUpdate }: OCRViewerProps) {
  const [selectedScenario, setSelectedScenario] = useState(0);
  const [selectedStep, setSelectedStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  
  // Upload states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Progress tracking states
  const [processingProgress, setProcessingProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [processingSteps, setProcessingSteps] = useState<string[]>([]);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animationRef = useRef<number>();

  // Handle both data structures:
  // 1. Array of scenarios (from build.py): [{scenario_id, data}, ...]
  // 2. Object with scenarios array (legacy): {scenarios: [...], pipeline_info: {...}}
  const scenarios = Array.isArray(data) ? data : (data?.scenarios || []);
  const currentScenario = scenarios[selectedScenario];
  const pipelineSteps = data?.pipeline_info?.steps || [];

  // Animation effect
  useEffect(() => {
    if (isAnimating && animationProgress < 100) {
      animationRef.current = requestAnimationFrame(() => {
        setAnimationProgress(prev => {
          if (prev >= 100) {
            setIsAnimating(false);
            return 100;
          }
          return prev + 2;
        });
      });
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isAnimating, animationProgress]);

  const startAnimation = () => {
    setAnimationProgress(0);
    setIsAnimating(true);
    setSelectedStep(0);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setUploadError('Invalid file type. Please upload JPEG, PNG, or WebP images only.');
        return;
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        setUploadError('File too large. Maximum size is 10MB.');
        return;
      }

      setSelectedFile(file);
      setUploadError(null);
      setUploadResult(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadError(null);
    setProcessingProgress(0);
    setCurrentStep('Starting upload...');
    setProcessingSteps([]);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile); // Changed from 'image' to 'file' to match backend

      // Simulate progress steps
      const progressSteps = [
        'Uploading image...',
        'Image Pre-processing...',
        'Text Detection...',
        'Text Recognition...',
        'Data Extraction...',
        'Generating results...'
      ];

      // Start progress simulation
      let stepIndex = 0;
      const progressInterval = setInterval(() => {
        if (stepIndex < progressSteps.length) {
          const step = progressSteps[stepIndex];
          const progress = (stepIndex + 1) * 16.67; // ~100% / 6 steps
          setCurrentStep(step);
          setProcessingProgress(progress);
          setProcessingSteps(prev => [...prev, step]);
          
          // Call parent callback
          if (onProgressUpdate) {
            onProgressUpdate(progress, step);
          }
          
          stepIndex++;
        }
      }, 800);

      const response = await fetch('/api/ocr/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      setUploadResult(result);
      setProcessingProgress(100);
      setCurrentStep('Processing completed!');
      
      // Final callback
      if (onProgressUpdate) {
        onProgressUpdate(100, 'Processing completed!');
      }
      console.log('🎯 OCR Result:', result);
      console.log('🎯 Result structure:', {
        hasResult: !!result.result,
        hasDetection: !!result.result?.detection_results,
        hasRecognition: !!result.result?.recognition_results,
        hasExtracted: !!result.result?.extracted_data,
        fullResult: JSON.stringify(result, null, 2)
      });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
      setCurrentStep('Processing failed');
    } finally {
      setIsUploading(false);
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setUploadResult(null);
    setUploadError(null);
    setProcessingProgress(0);
    setCurrentStep('');
    setProcessingSteps([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    // Reset parent progress
    if (onProgressUpdate) {
      onProgressUpdate(0, '');
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setUploadError('Invalid file type. Please upload JPEG, PNG, or WebP images only.');
        return;
      }
      
      // Validate file size
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        setUploadError('File too large. Maximum size is 10MB.');
        return;
      }
      
      setSelectedFile(file);
      setUploadError(null);
      setUploadResult(null);
    }
  };

  const drawPipelineVisualization = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background with gradient
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, '#f0f9ff');
    gradient.addColorStop(0.5, '#e0f2fe');
    gradient.addColorStop(1, '#f0f9ff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Use default 6 steps if pipelineSteps is not available
    const steps = pipelineSteps.length > 0 ? pipelineSteps : [
      { step: 1, name: 'Pre-process', description: '', technologies: [] },
      { step: 2, name: 'Detection', description: '', technologies: [] },
      { step: 3, name: 'Recognition', description: '', technologies: [] },
      { step: 4, name: 'Extraction', description: '', technologies: [] },
      { step: 5, name: 'JSON Output', description: '', technologies: [] },
      { step: 6, name: 'Complete', description: '', technologies: [] }
    ];

    // Draw pipeline steps
    const stepWidth = width / steps.length;
    const stepHeight = 80;
    const centerY = height / 2;

    steps.forEach((step: PipelineStep, index: number) => {
      const x = index * stepWidth + stepWidth / 2;
      const y = centerY;

      // Determine step state based on progress
      const stepProgress = ((index + 1) / steps.length) * 100;
      const isActive = animationProgress >= (index * (100 / steps.length)) && animationProgress < stepProgress;
      const isCompleted = animationProgress >= stepProgress;
      
      // Draw step box with shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 4;
      
      ctx.fillStyle = isCompleted ? '#10b981' : isActive ? '#3b82f6' : '#e5e7eb';
      ctx.fillRect(x - 60, y - 30, 120, stepHeight);

      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // Draw step border
      ctx.strokeStyle = isCompleted ? '#059669' : isActive ? '#2563eb' : '#9ca3af';
      ctx.lineWidth = 3;
      ctx.strokeRect(x - 60, y - 30, 120, stepHeight);

      // Draw step number
      ctx.fillStyle = isCompleted || isActive ? '#ffffff' : '#6b7280';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(step.step.toString(), x, y);

      // Draw step name
      ctx.fillStyle = isCompleted || isActive ? '#ffffff' : '#6b7280';
      ctx.font = 'bold 11px Arial';
      ctx.fillText(step.name, x, y + 25);

      // Draw arrow to next step
      if (index < steps.length - 1) {
        const arrowColor = isCompleted ? '#10b981' : '#d1d5db';
        ctx.strokeStyle = arrowColor;
        ctx.fillStyle = arrowColor;
        ctx.lineWidth = 4;
        
        // Arrow line
        ctx.beginPath();
        ctx.moveTo(x + 60, y);
        ctx.lineTo(x + stepWidth - 60, y);
        ctx.stroke();

        // Arrow head
        ctx.beginPath();
        ctx.moveTo(x + stepWidth - 70, y - 7);
        ctx.lineTo(x + stepWidth - 55, y);
        ctx.lineTo(x + stepWidth - 70, y + 7);
        ctx.closePath();
        ctx.fill();
      }

      // Draw active indicator (pulsing dot)
      if (isActive && isAnimating) {
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        const pulseSize = 8 + Math.sin(Date.now() / 200) * 3;
        ctx.arc(x, y - 50, pulseSize, 0, 2 * Math.PI);
        ctx.fill();
      }

      // Draw completed checkmark
      if (isCompleted) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x - 15, y);
        ctx.lineTo(x - 5, y + 10);
        ctx.lineTo(x + 15, y - 10);
        ctx.stroke();
      }
    });

    // Draw progress bar at bottom
    const progressBarY = height - 30;
    const progressBarHeight = 8;
    
    // Background bar
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(20, progressBarY, width - 40, progressBarHeight);
    
    // Progress bar
    const progressGradient = ctx.createLinearGradient(20, 0, width - 40, 0);
    progressGradient.addColorStop(0, '#3b82f6');
    progressGradient.addColorStop(0.5, '#8b5cf6');
    progressGradient.addColorStop(1, '#10b981');
    ctx.fillStyle = progressGradient;
    const progressWidth = ((width - 40) * animationProgress) / 100;
    ctx.fillRect(20, progressBarY, progressWidth, progressBarHeight);
    
    // Progress text
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(animationProgress)}%`, width / 2, progressBarY - 5);
  };

  // Draw canvas initially and when dependencies change
  useEffect(() => {
    drawPipelineVisualization();
  }, [selectedStep, animationProgress, currentScenario, pipelineSteps]);

  // Continuous animation frame when animating (for pulsing effect)
  useEffect(() => {
    if (isAnimating) {
      const animate = () => {
        drawPipelineVisualization();
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
      
      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [isAnimating]);

  if (!data || !currentScenario) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Đang tải dữ liệu OCR simulation...</p>
        </div>
      </div>
    );
  }

  // Handle different data structures
  // Priority 1: Upload result (has nested 'result' object)
  // Priority 2: Demo data (direct structure)
  // Structure from upload: {success, filename, status, result: {detection_results, ...}}
  // Structure from demo: [{detection_results, ...}] or {detection_results, ...}
  const sourceData = uploadResult?.result || currentScenario.data || currentScenario;
  const scenarioData = sourceData;
  const pipelineResults = scenarioData.pipeline_results || scenarioData;
  const qualityMetrics = scenarioData.quality_metrics || {};
  const detectionResults = scenarioData.detection_results || {};
  const extractedData = scenarioData.extracted_data || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg text-white">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  OCR Pipeline Simulation
                  <Badge className="bg-blue-100 text-blue-800">Computer Vision</Badge>
                </CardTitle>
                <CardDescription>
                  Pipeline hoàn chỉnh: Image Pre-processing → Text Detection → Text Recognition → Restructuring → JSON Output
                </CardDescription>
              </div>
            </div>
            <Button onClick={startAnimation} disabled={isAnimating} className="bg-blue-600 hover:bg-blue-700">
              <Zap className="mr-2 h-4 w-4" />
              {isAnimating ? 'Đang chạy...' : 'Chạy Pipeline'}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Compact Pipeline Control with Drag & Drop */}
      <Card className="border-2 border-blue-200 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            OCR Pipeline Control
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Step 1: Upload Image with Drag & Drop */}
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex-shrink-0 mt-2">
              1
            </div>
            <div className="flex-1">
              {/* Compact Drag & Drop Zone */}
              <div 
                className={`
                  border-2 border-dashed rounded-lg p-4 text-center transition-all duration-200 cursor-pointer
                  ${isDragging 
                    ? 'border-blue-500 bg-blue-50 scale-[1.02]' 
                    : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                  }
                `}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Input
                  ref={fileInputRef}
                  id="image-upload"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                {!selectedFile ? (
                  <div className="space-y-2">
                    <Upload className={`h-8 w-8 mx-auto ${isDragging ? 'text-blue-600' : 'text-gray-400'}`} />
                    <div>
                      <p className={`text-sm font-medium ${isDragging ? 'text-blue-700' : 'text-gray-700'}`}>
                        {isDragging ? '📥 Thả ảnh vào đây' : '📤 Kéo thả hoặc click để chọn'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        JPEG, PNG, WebP • Max 10MB
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileImage className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-800 truncate">
                        {selectedFile.name}
                      </span>
                      <Badge variant="secondary" className="text-xs flex-shrink-0">
                        {(selectedFile.size / 1024 / 1024).toFixed(1)}MB
                      </Badge>
                    </div>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        resetUpload();
                      }}
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 flex-shrink-0"
                      disabled={isUploading}
                    >
                      ✕
                    </Button>
                  </div>
                )}
              </div>
              
              {uploadError && (
                <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {uploadError}
                </p>
              )}
            </div>
          </div>

          {/* Step 2: Process */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 font-bold text-sm">
              2
            </div>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 h-9"
            >
              {isUploading ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Bắt đầu OCR
                </>
              )}
            </Button>
          </div>

          {/* Step 3: Run Demo */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold text-sm">
              3
            </div>
            <Button
              onClick={startAnimation}
              disabled={isAnimating}
              variant="outline"
              className="flex-1 h-9"
            >
              <Activity className="mr-2 h-4 w-4" />
              {isAnimating ? 'Đang demo...' : 'Demo Pipeline'}
            </Button>
          </div>

          {/* Processing Progress */}
          {isUploading && (
            <div className="pt-2 border-t">
              <ProgressTracker
                progress={processingProgress}
                currentStep={currentStep}
                completedSteps={processingSteps}
                isProcessing={isUploading}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Results */}
      {uploadResult && (
        <Card className="border-2 border-green-300 bg-gradient-to-r from-green-50 to-blue-50">
          <CardHeader className="bg-gradient-to-r from-green-100 to-blue-100">
            <CardTitle className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-5 w-5" />
              OCR Processing Results
            </CardTitle>
            <CardDescription>
              Kết quả xử lý ảnh: {uploadResult.filename}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {uploadResult.result ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="p-3 bg-white rounded-lg border">
                    <div className="text-sm text-gray-600">Text Regions</div>
                    <div className="text-2xl font-bold text-green-600">
                      {uploadResult.result?.detection_results?.total_regions || 0}
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded-lg border">
                    <div className="text-sm text-gray-600">Recognized Texts</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {uploadResult.result?.recognition_results?.total_texts || 0}
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded-lg border">
                    <div className="text-sm text-gray-600">Extracted Fields</div>
                    <div className="text-2xl font-bold text-purple-600">
                      {uploadResult.result?.extracted_data?.fields ? 
                        Object.keys(uploadResult.result.extracted_data.fields).length : 0}
                    </div>
                  </div>
                </div>

                {/* Extracted Data */}
                {uploadResult.result?.extracted_data?.fields && 
                 Object.keys(uploadResult.result.extracted_data.fields).length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold">Extracted Information:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {Object.entries(uploadResult.result.extracted_data.fields).map(([key, field]: [string, any]) => (
                        <div key={key} className="p-2 bg-white rounded border">
                          <div className="flex justify-between items-center">
                            <span className="font-medium capitalize">{key.replace('_', ' ')}:</span>
                            <div className="text-right">
                              <div className="text-sm">{field.value}</div>
                              <Badge className="text-xs bg-green-100 text-green-800">
                                {(field.confidence * 100).toFixed(1)}%
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* JSON Output */}
                <details className="mt-4">
                  <summary className="cursor-pointer font-medium text-sm text-gray-700 hover:text-gray-900">
                    View Complete JSON Output
                  </summary>
                  <div className="mt-2 bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto max-h-64">
                    <pre className="text-xs">
                      {JSON.stringify(uploadResult.result, null, 2)}
                    </pre>
                  </div>
                </details>
              </>
            ) : (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-yellow-800 font-medium">⚠️ No OCR result data found</p>
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm text-yellow-700">
                    Debug: View raw response
                  </summary>
                  <pre className="mt-2 text-xs bg-white p-2 rounded overflow-auto">
                    {JSON.stringify(uploadResult, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Scenario Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Chọn Scenario
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {scenarios.map((scenario: any, index: number) => (
              <div
                key={scenario.scenario_id || scenario.id || `scenario-${index}`}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedScenario === index
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
                onClick={() => setSelectedScenario(index)}
              >
                <div className="flex items-center gap-3 mb-2">
                  <ImageIcon className="h-5 w-5 text-blue-600" />
                  <h4 className="font-semibold">{scenario.scenario_name || scenario.name}</h4>
                </div>
                <p className="text-sm text-gray-600 mb-2">{scenario.description || `Scenario ${scenario.scenario_id}`}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {scenario.difficulty || 'Medium'}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {scenario.image_type || scenario.category || 'OCR'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pipeline Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Pipeline Visualization
          </CardTitle>
          <CardDescription>
            Theo dõi tiến trình xử lý qua từng bước của pipeline OCR
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border-2 border-blue-200 shadow-inner">
              <canvas
                ref={canvasRef}
                width={1200}
                height={240}
                className="w-full rounded-lg"
                style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex-1">
                {isAnimating && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm font-medium">
                      <span className="text-blue-700">🔄 Tiến trình pipeline</span>
                      <span className="text-blue-900 font-bold">{animationProgress}%</span>
                    </div>
                    <Progress value={animationProgress} className="h-3" />
                  </div>
                )}
                {!isAnimating && animationProgress === 100 && (
                  <div className="text-sm font-semibold text-green-600 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    ✅ Pipeline hoàn thành! (100%)
                  </div>
                )}
              </div>
              {!isAnimating && (
                <Button 
                  onClick={startAnimation} 
                  className="ml-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg"
                >
                  <Zap className="mr-2 h-4 w-4" />
                  🎬 Demo Pipeline Animation
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Tabs */}
      <Tabs defaultValue="detection" className="w-full">
        <TabsList className="grid w-full grid-cols-6 bg-gradient-to-r from-blue-100 to-indigo-100">
          <TabsTrigger value="detection" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white">
            <Eye className="h-4 w-4 mr-2" />
            Text Detection
          </TabsTrigger>
          <TabsTrigger value="recognition" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-600 data-[state=active]:text-white">
            <Brain className="h-4 w-4 mr-2" />
            Recognition
          </TabsTrigger>
          <TabsTrigger value="fulltext" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white">
            <FileText className="h-4 w-4 mr-2" />
            Full Text
          </TabsTrigger>
          <TabsTrigger value="extraction" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-600 data-[state=active]:text-white">
            <Settings className="h-4 w-4 mr-2" />
            Extraction
          </TabsTrigger>
          <TabsTrigger value="output" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white">
            <FileText className="h-4 w-4 mr-2" />
            JSON Output
          </TabsTrigger>
          <TabsTrigger value="metrics" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-teal-600 data-[state=active]:text-white">
            <Target className="h-4 w-4 mr-2" />
            Metrics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="detection">
          <Card className="border-2 border-green-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg shadow">
                      <Eye className="h-5 w-5 text-white" />
                    </div>
                    <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                      Text Detection Results
                    </span>
                  </CardTitle>
                  <CardDescription className="mt-1">
                    📍 {uploadResult ? 'Real OCR Detection (Tesseract)' : 'OpenCV-EAST algorithm simulation'} - Phát hiện vùng chứa text
                  </CardDescription>
                </div>
                {uploadResult && (
                  <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-1 shadow-md">
                    ✓ Real Data
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                {/* Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-300 shadow-md">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-green-800">Total Regions</h4>
                      <Target className="h-5 w-5 text-green-600" />
                    </div>
                    <p className="text-3xl font-bold text-green-900">
                      {detectionResults?.total_regions || 0}
                    </p>
                    <p className="text-sm text-green-600 mt-1">regions detected</p>
                  </div>
                  
                  <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-300 shadow-md">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-blue-800">Avg Confidence</h4>
                      <Activity className="h-5 w-5 text-blue-600" />
                    </div>
                    <p className="text-3xl font-bold text-blue-900">
                      {(detectionResults?.average_confidence * 100 || 0).toFixed(1)}%
                    </p>
                    <p className="text-sm text-blue-600 mt-1">detection confidence</p>
                  </div>
                  
                  <div className="p-5 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-300 shadow-md">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-purple-800">Status</h4>
                      <CheckCircle className="h-5 w-5 text-purple-600" />
                    </div>
                    <p className="text-xl font-bold text-purple-900">
                      {detectionResults?.total_regions > 0 ? '✓ Success' : '○ No Data'}
                    </p>
                    <p className="text-sm text-purple-600 mt-1">
                      {detectionResults?.total_regions > 0 ? 'Regions found' : 'No regions detected'}
                    </p>
                  </div>
                </div>

                {/* Detected Regions List */}
                {detectionResults?.text_regions && detectionResults.text_regions.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-green-600" />
                      Detected Text Regions ({detectionResults.text_regions.length})
                    </h4>
                    <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
                      {detectionResults.text_regions.map((region: any, idx: number) => (
                        <div key={idx} className="p-4 bg-white rounded-lg border-2 border-green-200 hover:border-green-400 transition-all shadow-sm hover:shadow-md">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className="bg-green-500 text-white">Region #{region.region_id || idx}</Badge>
                                {region.language && (
                                  <Badge variant="outline" className="text-xs">{region.language}</Badge>
                                )}
                              </div>
                              <p className="font-mono text-sm text-gray-700 mb-2 bg-gray-50 p-2 rounded">
                                "{region.text || 'N/A'}"
                              </p>
                              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                                <div>
                                  <span className="font-semibold">Position:</span> 
                                  <span className="font-mono ml-1">
                                    x:{region.bbox?.x || 0}, y:{region.bbox?.y || 0}
                                  </span>
                                </div>
                                <div>
                                  <span className="font-semibold">Size:</span> 
                                  <span className="font-mono ml-1">
                                    {region.bbox?.width || 0}×{region.bbox?.height || 0}px
                                  </span>
                                </div>
                              </div>
                            </div>
                            <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-1 ml-4">
                              {((region.bbox?.confidence || region.confidence || 0) * 100).toFixed(1)}%
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No Data Message */}
                {(!detectionResults?.text_regions || detectionResults.text_regions.length === 0) && (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <Eye className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">No text regions detected</p>
                    <p className="text-sm text-gray-500 mt-1">Upload an image to see real detection results</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recognition">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-600" />
                Text Recognition Results
              </CardTitle>
              <CardDescription>
                OpenCV-CRNN algorithm simulation - Nhận diện text trong các vùng đã detect
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  {detectionResults?.text_regions?.map((text: any, idx: number) => (
                    <div key={idx} className="p-4 bg-purple-50 rounded-lg border-l-4 border-purple-500">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 mb-1">{text.text}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>Region ID: {text.region_id}</span>
                            <span>Bbox: [{text.bbox?.x || 0}, {text.bbox?.y || 0}, {text.bbox?.width || 0}, {text.bbox?.height || 0}]</span>
                          </div>
                        </div>
                        <Badge className="bg-purple-100 text-purple-800">
                          {(text.confidence * 100).toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fulltext">
          <Card className="border-2 border-indigo-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow">
                      <FileText className="h-5 w-5 text-white" />
                    </div>
                    <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                      Full Text Output
                    </span>
                  </CardTitle>
                  <CardDescription className="mt-1">
                    📝 {uploadResult ? 'Real OCR Full Text' : 'Complete text content'} - Toàn bộ nội dung đã trích xuất
                  </CardDescription>
                </div>
                {uploadResult && (
                  <Badge className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-3 py-1 shadow-md">
                    ✓ Real Data
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                {/* Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-5 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border-2 border-indigo-300 shadow-md">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-indigo-800">Total Characters</h4>
                      <FileText className="h-5 w-5 text-indigo-600" />
                    </div>
                    <p className="text-3xl font-bold text-indigo-900">
                      {detectionResults?.text_regions?.reduce((sum: number, r: any) => sum + (r.text?.length || 0), 0) || 0}
                    </p>
                    <p className="text-sm text-indigo-600 mt-1">characters detected</p>
                  </div>
                  
                  <div className="p-5 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-300 shadow-md">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-purple-800">Total Regions</h4>
                      <Target className="h-5 w-5 text-purple-600" />
                    </div>
                    <p className="text-3xl font-bold text-purple-900">
                      {detectionResults?.text_regions?.length || 0}
                    </p>
                    <p className="text-sm text-purple-600 mt-1">text regions</p>
                  </div>
                  
                  <div className="p-5 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-300 shadow-md">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-blue-800">Languages</h4>
                      <Brain className="h-5 w-5 text-blue-600" />
                    </div>
                    <p className="text-xl font-bold text-blue-900">
                      {(() => {
                        const langs = new Set(detectionResults?.text_regions?.map((r: any) => r.language) || []);
                        return Array.from(langs).filter(Boolean).join(', ') || 'N/A';
                      })()}
                    </p>
                    <p className="text-sm text-blue-600 mt-1">detected languages</p>
                  </div>
                </div>

                {/* Full Text Display */}
                {detectionResults?.text_regions && detectionResults.text_regions.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-indigo-600" />
                        Complete Text Content
                      </h4>
                      <button
                        onClick={() => {
                          const fullText = detectionResults.text_regions
                            .map((r: any) => r.text)
                            .filter(Boolean)
                            .join('\n');
                          navigator.clipboard.writeText(fullText);
                          alert('✓ Text copied to clipboard!');
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium"
                      >
                        📋 Copy Text
                      </button>
                    </div>
                    
                    {/* Full Text Box */}
                    <div className="relative">
                      <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-indigo-200 shadow-inner">
                        <div className="font-mono text-base leading-relaxed whitespace-pre-wrap text-gray-800">
                          {detectionResults.text_regions
                            .map((r: any) => r.text)
                            .filter(Boolean)
                            .join('\n')}
                        </div>
                      </div>
                      
                      {/* Word Count */}
                      <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
                        <div className="flex items-center gap-4">
                          <span>
                            📝 Words: <strong>
                              {detectionResults.text_regions
                                .map((r: any) => r.text)
                                .filter(Boolean)
                                .join(' ')
                                .split(/\s+/)
                                .filter(Boolean).length}
                            </strong>
                          </span>
                          <span>
                            📄 Lines: <strong>{detectionResults.text_regions.length}</strong>
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">Scroll to view more</span>
                      </div>
                    </div>

                    {/* Text by Region */}
                    <div className="space-y-2">
                      <h4 className="font-semibold text-gray-800 flex items-center gap-2 mt-6">
                        <Eye className="h-4 w-4 text-purple-600" />
                        Text by Region
                      </h4>
                      <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
                        {detectionResults.text_regions.map((region: any, idx: number) => (
                          <div key={idx} className="p-3 bg-white rounded-lg border border-indigo-200 hover:border-indigo-400 transition-all shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge className="bg-indigo-500 text-white text-xs">#{idx + 1}</Badge>
                                  {region.language && (
                                    <Badge variant="outline" className="text-xs">{region.language}</Badge>
                                  )}
                                </div>
                                <p className="font-mono text-sm text-gray-800 break-words">
                                  {region.text || 'N/A'}
                                </p>
                              </div>
                              <Badge className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs px-2 py-1 shrink-0">
                                {((region.confidence || 0) * 100).toFixed(0)}%
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">No text content available</p>
                    <p className="text-sm text-gray-500 mt-1">Upload an image to extract text</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="extraction">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-orange-600" />
                Data Extraction Results
              </CardTitle>
              <CardDescription>
                Pattern matching & ID data extraction - Trích xuất structured data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <h4 className="font-semibold text-orange-800 mb-3">Extracted Fields</h4>
                    <div className="space-y-2">
                      {Object.entries(extractedData?.fields || {}).map(([key, field]: [string, any]) => (
                        <div key={key} className="flex justify-between items-center p-2 bg-white rounded border">
                          <span className="font-medium capitalize">{key.replace('_', ' ')}:</span>
                          <div className="text-right">
                            <div className="font-mono text-sm">{field.value}</div>
                            <Badge className="text-xs mt-1 bg-orange-100 text-orange-800">
                              {(field.confidence * 100).toFixed(1)}%
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-800 mb-3">Document Info</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Document Type:</span>
                        <Badge className="bg-blue-100 text-blue-800">
                          {extractedData?.document_type || 'unknown'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Fields Extracted:</span>
                        <span className="font-medium">
                          {extractedData?.total_fields || 0}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Confidence Score:</span>
                        <span className="font-medium">
                          {(extractedData?.confidence_score * 100 || 0).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="output">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5 text-green-600" />
                JSON Output
              </CardTitle>
              <CardDescription>
                Structured JSON output với toàn bộ kết quả OCR pipeline
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto max-h-96">
                <pre className="text-sm">
                  {JSON.stringify({
                    scenario: currentScenario.scenario_name || currentScenario.name,
                    detection_results: detectionResults,
                    extracted_data: extractedData,
                    quality_metrics: qualityMetrics,
                    timestamp: new Date().toISOString()
                  }, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Quality Metrics
              </CardTitle>
              <CardDescription>
                Đánh giá chất lượng kết quả OCR pipeline
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600 mb-2">
                    {(qualityMetrics?.average_confidence * 100 || 0).toFixed(1)}%
                  </div>
                  <div className="text-sm text-green-800">Overall Confidence</div>
                  <div className="text-xs text-gray-600 mt-1">Average OCR confidence</div>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600 mb-2">
                    {(qualityMetrics?.extraction_success_rate * 100 || 0).toFixed(1)}%
                  </div>
                  <div className="text-sm text-blue-800">Extraction Success</div>
                  <div className="text-xs text-gray-600 mt-1">Fields extracted successfully</div>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-purple-600 mb-2">
                    {qualityMetrics?.total_regions || 0}
                  </div>
                  <div className="text-sm text-purple-800">Text Regions</div>
                  <div className="text-xs text-gray-600 mt-1">Total regions detected</div>
                </div>
              </div>

              {/* Detailed Metrics */}
              <div className="mt-6 space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Detection Quality</span>
                    <span className="text-sm font-bold text-gray-900">
                      {qualityMetrics?.average_confidence ? 
                        (qualityMetrics.average_confidence >= 0.7 ? '✅ Good' : 
                         qualityMetrics.average_confidence >= 0.4 ? '⚠️ Fair' : '❌ Poor') 
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">
                    Regions: {qualityMetrics?.total_regions || 0} | 
                    Avg Confidence: {(qualityMetrics?.average_confidence * 100 || 0).toFixed(1)}%
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Extraction Quality</span>
                    <span className="text-sm font-bold text-gray-900">
                      {qualityMetrics?.extraction_success_rate ? 
                        (qualityMetrics.extraction_success_rate >= 0.5 ? '✅ Good' : 
                         qualityMetrics.extraction_success_rate >= 0.2 ? '⚠️ Fair' : '❌ Poor') 
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">
                    Success Rate: {(qualityMetrics?.extraction_success_rate * 100 || 0).toFixed(1)}% | 
                    Extracted: {extractedData?.total_fields_extracted || 0} fields
                  </div>
                </div>

                {qualityMetrics?.average_confidence && qualityMetrics.average_confidence < 0.5 && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-yellow-800">Low Confidence Detected</p>
                        <p className="text-xs text-yellow-700 mt-1">
                          Recommendations:
                        </p>
                        <ul className="text-xs text-yellow-700 mt-1 space-y-1 ml-4 list-disc">
                          <li>Ensure good image quality and lighting</li>
                          <li>Avoid blurry or low-resolution images</li>
                          <li>Check if text is clearly visible</li>
                          <li>Try adjusting image orientation</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
