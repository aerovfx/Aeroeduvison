"use client"

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Star, Clock, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { OCRViewer } from "@/components/simulations/ocr-viewer";
import { PipelineStepsDisplay } from "@/components/simulations/pipeline-steps-display";

export default function OCRSimulationPage() {
  const [data, setData] = useState<any>(null);
  const [manifest, setManifest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Pipeline progress states
  const [pipelineProgress, setPipelineProgress] = useState(0);
  const [currentPipelineStep, setCurrentPipelineStep] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [simData, manifestData] = await Promise.all([
          fetch('/labs/ocr-simulation/data.json').then(r => r.json()),
          fetch('/labs/ocr-simulation/manifest.json').then(r => r.json())
        ]);
        
        setData(simData);
        setManifest(manifestData);
      } catch (error) {
        console.error('Error loading OCR simulation data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải OCR simulation...</p>
        </div>
      </div>
    );
  }

  if (!data || !manifest) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Không thể tải dữ liệu OCR simulation</p>
          <Link href="/dashboard/labtwin/labs" className="text-blue-600 hover:text-blue-700 mt-2 inline-block">
            Quay lại danh sách
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard/labtwin/labs" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại Labs
          </Link>
          
          <div className="flex items-center gap-4 mb-6">
            <div className="p-4 bg-blue-500 rounded-xl text-white">
              <FileText className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{manifest.name}</h1>
              <p className="text-gray-600 mt-1">{manifest.description}</p>
              <div className="flex items-center gap-4 mt-2">
                <Badge variant="secondary">{manifest.level}</Badge>
                <Badge variant="outline">{manifest.duration}</Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  +{manifest.xp_reward} XP
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Pipeline Steps Info - Dynamic */}
        <PipelineStepsDisplay 
          steps={manifest.pipeline_steps}
          currentStep={currentPipelineStep}
          progress={pipelineProgress}
        />

        {/* OCR Viewer */}
        <div className="mt-6">
          <OCRViewer 
            data={data}
            onProgressUpdate={(progress, step) => {
              setPipelineProgress(progress);
              setCurrentPipelineStep(step);
            }}
          />
        </div>

        {/* Learning Objectives */}
        <Card className="mt-8">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-600" />
              Learning Objectives
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Kiến thức đạt được:</h4>
                <ul className="space-y-1 text-sm text-gray-700">
                  {manifest.learning_objectives.slice(0, 3).map((objective: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-blue-600 mt-1">•</span>
                      <span>{objective}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Công nghệ sử dụng:</h4>
                <div className="flex flex-wrap gap-2">
                  {manifest.technologies.map((tech: string, index: number) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
