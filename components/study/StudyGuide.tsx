'use client';

import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronRight, Star, Clock, Users, TrendingUp } from 'lucide-react';

interface StudyGuideItem {
  id: string;
  title: string;
  description: string;
  progress: number;
  lastStudied?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime?: string;
}

interface StudyGuideProps {
  guides: StudyGuideItem[];
  onGuideSelect?: (guide: StudyGuideItem) => void;
}

export default function StudyGuide({ guides, onGuideSelect }: StudyGuideProps) {
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'outline' | 'quick-reference'>('quick-reference');

  const toggleGuide = (guideId: string) => {
    setExpandedGuide(expandedGuide === guideId ? null : guideId);
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 60) return 'bg-yellow-500';
    if (progress >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
      <div className="bg-purple-500 px-4 py-3">
        <h3 className="text-lg font-semibold text-white">Study Guides</h3>
      </div>
      
      <div className="p-6">
        {guides.map((guide) => (
          <div key={guide.id} className="mb-6 last:mb-0">
            {/* Guide Header */}
            <div 
              className="cursor-pointer"
              onClick={() => {
                toggleGuide(guide.id);
                onGuideSelect?.(guide);
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <BookOpen className="w-5 h-5 text-purple-600" />
                  <h4 className="text-xl font-bold text-gray-900">{guide.title}</h4>
                  {guide.difficulty && (
                    <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(guide.difficulty)}`}>
                      {guide.difficulty}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">{guide.progress}%</div>
                    <div className="text-xs text-gray-500">Complete</div>
                  </div>
                  {expandedGuide === guide.id ? (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-500" />
                  )}
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(guide.progress)}`}
                  style={{ width: `${guide.progress}%` }}
                ></div>
              </div>
              
              {/* Guide Stats */}
              <div className="flex items-center space-x-6 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>{guide.estimatedTime || '30 min'}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Users className="w-4 h-4" />
                  <span>1,234 studying</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Star className="w-4 h-4" />
                  <span>4.8 (234 reviews)</span>
                </div>
              </div>
            </div>
            
            {/* Expanded Content */}
            {expandedGuide === guide.id && (
              <div className="border-t border-gray-200 pt-6 space-y-6">
                {/* Tabs */}
                <div className="flex space-x-1">
                  <button
                    onClick={() => setSelectedTab('outline')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      selectedTab === 'outline'
                        ? 'bg-purple-100 text-purple-700'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Outline
                  </button>
                  <button
                    onClick={() => setSelectedTab('quick-reference')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      selectedTab === 'quick-reference'
                        ? 'bg-purple-100 text-purple-700'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Quick reference
                  </button>
                </div>
                
                {/* Content based on selected tab */}
                {selectedTab === 'outline' ? (
                  <div className="space-y-4">
                    <h5 className="font-semibold text-gray-900">Study Outline</h5>
                    <div className="space-y-3">
                      {[
                        { title: "Introduction", completed: true, time: "5 min" },
                        { title: "Key Concepts", completed: true, time: "15 min" },
                        { title: "Examples & Practice", completed: false, time: "20 min" },
                        { title: "Review & Quiz", completed: false, time: "10 min" }
                      ].map((section, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                              section.completed ? 'bg-green-500 text-white' : 'bg-gray-300'
                            }`}>
                              {section.completed ? '✓' : index + 1}
                            </div>
                            <span className={`font-medium ${section.completed ? 'text-gray-900' : 'text-gray-700'}`}>
                              {section.title}
                            </span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className="text-sm text-gray-500">{section.time}</span>
                            <button className={`px-3 py-1 text-xs rounded-full transition-colors ${
                              section.completed 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            }`}>
                              {section.completed ? 'Completed' : 'Start'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h5 className="font-semibold text-gray-900">Key Information</h5>
                    <div className="space-y-3">
                      {[
                        { title: "Dark Age of Greece", description: "Collapse of Mycenaean pal..." },
                        { title: "Geometric Period", description: "Revival of Greek art, reintroc..." },
                        { title: "Archaic Period", description: "Development of kouros and kore..." },
                        { title: "Classical Period", description: "Golden age of Greek sculpture..." }
                      ].map((item, index) => (
                        <div key={index} className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h6 className="font-medium text-gray-900 mb-1">{item.title}</h6>
                              <p className="text-sm text-gray-600">{item.description}</p>
                            </div>
                            <button className="ml-3 text-purple-600 hover:text-purple-700 text-sm font-medium">
                              Learn more →
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Action Buttons */}
                <div className="flex space-x-3 pt-4 border-t border-gray-200">
                  <button className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg font-medium transition-colors">
                    Start Studying
                  </button>
                  <button className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                    <Star className="w-5 h-5" />
                  </button>
                  <button className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                    Share
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        
        {/* Create New Guide */}
        <div className="border-t border-gray-200 pt-6">
          <button className="w-full py-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-purple-400 hover:text-purple-600 transition-colors">
            <div className="flex items-center justify-center space-x-2">
              <BookOpen className="w-5 h-5" />
              <span className="font-medium">Create New Study Guide</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
