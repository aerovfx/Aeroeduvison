"use client"

import React from 'react';
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Clock, Loader2 } from "lucide-react";

interface ProgressTrackerProps {
  progress: number;
  currentStep: string;
  completedSteps: string[];
  isProcessing: boolean;
}

export function ProgressTracker({ 
  progress, 
  currentStep, 
  completedSteps, 
  isProcessing 
}: ProgressTrackerProps) {
  const pipelineSteps = [
    { id: 1, name: "Uploading image", icon: "📤" },
    { id: 2, name: "Image Pre-processing", icon: "🔧" },
    { id: 3, name: "Text Detection", icon: "🔍" },
    { id: 4, name: "Text Recognition", icon: "📝" },
    { id: 5, name: "Data Extraction", icon: "📊" },
    { id: 6, name: "Generating results", icon: "✅" }
  ];

  return (
    <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-700">
                {isProcessing ? currentStep : 'Ready to process'}
              </span>
              <span className="text-blue-600 font-semibold">
                {Math.round(progress)}%
              </span>
            </div>
            <Progress 
              value={progress} 
              className="h-3 bg-blue-100"
            />
          </div>

          {/* Pipeline Steps */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-600">
              OCR Pipeline Steps:
            </div>
            <div className="grid grid-cols-1 gap-2">
              {pipelineSteps.map((step, index) => {
                const isCompleted = completedSteps.some(completed => 
                  completed.toLowerCase().includes(step.name.toLowerCase().split(' ')[0])
                );
                const isCurrent = currentStep.toLowerCase().includes(step.name.toLowerCase().split(' ')[0]);
                const isUpcoming = index > completedSteps.length && !isCurrent;

                return (
                  <div 
                    key={step.id} 
                    className={`flex items-center gap-3 p-2 rounded-lg transition-all duration-300 ${
                      isCompleted 
                        ? 'bg-green-100 border border-green-200' 
                        : isCurrent 
                        ? 'bg-blue-100 border border-blue-200' 
                        : 'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <div className="flex-shrink-0">
                      {isCompleted ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : isCurrent ? (
                        <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                      ) : (
                        <Clock className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-lg">{step.icon}</span>
                      <span className={`text-sm font-medium ${
                        isCompleted 
                          ? 'text-green-800' 
                          : isCurrent 
                          ? 'text-blue-800' 
                          : 'text-gray-600'
                      }`}>
                        {step.name}
                      </span>
                    </div>
                    {isCurrent && (
                      <div className="text-xs text-blue-600 font-medium">
                        Processing...
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Status Message */}
          {isProcessing && (
            <div className="text-center p-3 bg-blue-100 rounded-lg border border-blue-200">
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <span className="text-sm text-blue-800 font-medium">
                  {currentStep}
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
