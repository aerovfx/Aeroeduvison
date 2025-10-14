"use client"

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Circle, Loader2 } from "lucide-react";

interface PipelineStep {
  step: number;
  name: string;
  description: string;
  technologies?: string[];
}

interface PipelineStepsDisplayProps {
  steps: PipelineStep[];
  currentStep?: string;
  progress?: number;
}

export function PipelineStepsDisplay({ 
  steps, 
  currentStep = '',
  progress = 0 
}: PipelineStepsDisplayProps) {
  
  // Determine which step is currently active based on progress
  const getStepStatus = (stepIndex: number) => {
    const stepProgress = (stepIndex / steps.length) * 100;
    const nextStepProgress = ((stepIndex + 1) / steps.length) * 100;
    
    if (progress >= nextStepProgress) {
      return 'completed';
    } else if (progress >= stepProgress) {
      return 'active';
    } else {
      return 'pending';
    }
  };

  // Check if current step name matches
  const isCurrentStep = (step: PipelineStep) => {
    if (!currentStep) return false;
    const stepNameLower = step.name.toLowerCase();
    const currentStepLower = currentStep.toLowerCase();
    return currentStepLower.includes(stepNameLower) || 
           currentStepLower.includes(step.step.toString());
  };

  return (
    <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              OCR Pipeline Process
            </span>
          </h3>
          {progress > 0 && progress < 100 && (
            <div className="flex items-center gap-2 text-blue-600 animate-pulse">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="font-semibold">Processing...</span>
            </div>
          )}
          {progress === 100 && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-semibold">Complete!</span>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {steps.map((step, index) => {
            const status = getStepStatus(index);
            const isCurrent = isCurrentStep(step);
            
            return (
              <div 
                key={step.step} 
                className={`
                  text-center p-5 rounded-xl transition-all duration-500 transform
                  ${status === 'completed' ? 'bg-gradient-to-br from-green-50 to-emerald-100 border-2 border-green-400 shadow-md hover:shadow-lg' : ''}
                  ${status === 'active' || isCurrent ? 'bg-gradient-to-br from-blue-50 to-indigo-100 border-2 border-blue-500 scale-105 shadow-xl ring-4 ring-blue-200 ring-opacity-50' : ''}
                  ${status === 'pending' ? 'bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-300 opacity-70 hover:opacity-90' : ''}
                `}
              >
                {/* Step Icon */}
                <div className="relative mx-auto mb-3">
                  <div 
                    className={`
                      w-16 h-16 rounded-full flex items-center justify-center mx-auto font-bold text-lg
                      transition-all duration-500 transform
                      ${status === 'completed' ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg scale-110' : ''}
                      ${status === 'active' || isCurrent ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white animate-pulse shadow-2xl scale-110' : ''}
                      ${status === 'pending' ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-600 shadow-sm' : ''}
                    `}
                  >
                    {status === 'completed' ? (
                      <CheckCircle className="h-7 w-7" />
                    ) : status === 'active' || isCurrent ? (
                      <Loader2 className="h-7 w-7 animate-spin" />
                    ) : (
                      <span>{step.step}</span>
                    )}
                  </div>
                  
                  {/* Connector line with arrow */}
                  {index < steps.length - 1 && (
                    <div className="absolute top-8 left-full w-full h-0 -ml-2 hidden md:block" style={{ width: 'calc(100% + 16px)' }}>
                      <div 
                        className={`
                          relative h-1 transition-all duration-500
                          ${status === 'completed' ? 'bg-gradient-to-r from-green-400 to-green-500' : 'bg-gradient-to-r from-gray-300 to-gray-400'}
                        `}
                      >
                        {/* Arrow tip */}
                        <div 
                          className={`
                            absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 
                            border-t-4 border-b-4 border-l-4 border-t-transparent border-b-transparent
                            ${status === 'completed' ? 'border-l-green-500' : 'border-l-gray-400'}
                          `}
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Step Info */}
                <h4 
                  className={`
                    font-semibold text-sm mb-1
                    ${status === 'completed' ? 'text-green-700' : ''}
                    ${status === 'active' || isCurrent ? 'text-blue-700' : ''}
                    ${status === 'pending' ? 'text-gray-500' : ''}
                  `}
                >
                  {step.name}
                </h4>
                
                <p 
                  className={`
                    text-xs mb-2
                    ${status === 'completed' ? 'text-green-600' : ''}
                    ${status === 'active' || isCurrent ? 'text-blue-600' : ''}
                    ${status === 'pending' ? 'text-gray-500' : ''}
                  `}
                >
                  {step.description}
                </p>
                
                {/* Technologies */}
                {step.technologies && step.technologies.length > 0 && (
                  <div className="flex flex-wrap gap-1 justify-center mt-2">
                    {step.technologies.map((tech, techIndex) => (
                      <Badge 
                        key={techIndex} 
                        variant="outline" 
                        className={`
                          text-xs px-1 py-0
                          ${status === 'completed' ? 'border-green-400 text-green-700' : ''}
                          ${status === 'active' || isCurrent ? 'border-blue-400 text-blue-700' : ''}
                          ${status === 'pending' ? 'border-gray-300 text-gray-500' : ''}
                        `}
                      >
                        {tech}
                      </Badge>
                    ))}
                  </div>
                )}
                
                {/* Status Badge */}
                <div className="mt-3">
                  {status === 'completed' && (
                    <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-semibold px-3 py-1 shadow-md">
                      ✓ Complete
                    </Badge>
                  )}
                  {(status === 'active' || isCurrent) && (
                    <Badge className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-semibold px-3 py-1 animate-pulse shadow-lg">
                      ⚡ Processing...
                    </Badge>
                  )}
                  {status === 'pending' && (
                    <Badge variant="outline" className="text-xs text-gray-500 border-gray-400 px-3 py-1">
                      ○ Pending
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Current Step Message */}
        {currentStep && (
          <div className="mt-6 p-5 bg-gradient-to-r from-blue-100 via-indigo-100 to-purple-100 border-2 border-blue-400 rounded-xl shadow-lg animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-md">
                <Loader2 className="h-6 w-6 text-white animate-spin" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide mb-1">Current Step</p>
                <span className="font-bold text-blue-900 text-lg">
                  {currentStep}
                </span>
              </div>
            </div>
          </div>
        )}
        
        {/* Progress Bar */}
        {progress > 0 && (
          <div className="mt-6">
            <div className="flex justify-between items-center text-sm mb-3">
              <span className="font-semibold text-gray-700">Overall Progress</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {Math.round(progress)}%
                </span>
                {progress === 100 && (
                  <CheckCircle className="h-5 w-5 text-green-500 animate-bounce" />
                )}
              </div>
            </div>
            <div className="relative w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
              <div 
                className="absolute inset-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 h-full transition-all duration-500 ease-out rounded-full shadow-lg"
                style={{ width: `${progress}%` }}
              >
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer" />
              </div>
              {/* Progress markers */}
              <div className="absolute inset-0 flex justify-between px-1">
                {[20, 40, 60, 80].map((marker) => (
                  <div 
                    key={marker} 
                    className="w-px h-full bg-gray-300 opacity-50"
                    style={{ left: `${marker}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Missing import
import { Activity } from "lucide-react";

