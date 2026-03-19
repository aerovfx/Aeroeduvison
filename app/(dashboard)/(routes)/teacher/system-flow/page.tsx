'use client';

/**
 * AI-Orchestrated Faculty Model - System Flow Visualization
 * Visual representation of how AI coordinates mentors for multi-disciplinary learning
 */

import { useState } from 'react';
import { Brain, Users, TrendingUp, GitBranch, Target, Award, Sparkles, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function SystemFlowPage() {
  const { t } = useLanguage();
  
  const [activeStep, setActiveStep] = useState<number | null>(null);

  const flowSteps = [
    {
      id: 1,
      title: '👨‍🎓 Student Request',
      subtitle: 'Học sinh yêu cầu lộ trình học',
      description: 'Student submits learning goals, interests, and current knowledge level',
      color: 'from-blue-500 to-cyan-500',
      icon: Users,
      details: [
        'Goal: "Tạo ứng dụng tạo nhạc bằng AI"',
        'Interests: AI, Music, Programming',
        'Current Level: Intermediate Math, Beginner Music'
      ]
    },
    {
      id: 2,
      title: '🤖 AI Coordinator Analysis',
      subtitle: 'Bộ điều phối AI phân tích',
      description: 'AI analyzes goals, identifies domains, segments path, and assigns mentors',
      color: 'from-purple-500 to-pink-500',
      icon: Brain,
      details: [
        'Identified domains: Math, Physics, Music, CS',
        'Created 4 segments (one per domain)',
        'Detected 3 cross-domain transitions',
        'Assigned 4 subject mentors'
      ]
    },
    {
      id: 3,
      title: '👨‍🏫 Subject Mentor Validation',
      subtitle: 'Giáo viên chuyên môn xác nhận',
      description: 'Each mentor reviews and validates content in their domain',
      color: 'from-green-500 to-emerald-500',
      icon: CheckCircle,
      details: [
        'Math Mentor: Approved all nodes',
        'Physics Mentor: Modified difficulty levels',
        'Music Mentor: Suggested harmony module',
        'CS Mentor: Added signal processing module'
      ]
    },
    {
      id: 4,
      title: '🔄 AI Merges Insights',
      subtitle: 'AI tổng hợp phản hồi',
      description: 'AI coordinator merges mentor feedback and optimizes path',
      color: 'from-orange-500 to-red-500',
      icon: GitBranch,
      details: [
        'Collected feedback from 4 mentors',
        'Added 2 new modules per suggestions',
        'Optimized learning sequence',
        'Total: 18 nodes, 3 transitions'
      ]
    },
    {
      id: 5,
      title: '📚 Path Delivered',
      subtitle: 'Lộ trình gửi học sinh',
      description: 'Student receives personalized multi-disciplinary learning path',
      color: 'from-indigo-500 to-purple-500',
      icon: Target,
      details: [
        'Math (5 lessons) → Physics',
        'Physics (4 lessons) → Music',
        'Music (3 lessons) → CS',
        'CS (6 lessons) → Complete'
      ]
    },
    {
      id: 6,
      title: '👥 Cross-Panel Review',
      subtitle: 'Hội đồng liên ngành đánh giá',
      description: 'Panel of mentors reviews cross-domain transitions',
      color: 'from-yellow-500 to-orange-500',
      icon: Users,
      details: [
        'Panel: 4 mentors from 4 domains',
        'Reviewed 3 transitions',
        'Approved 2, modified 1',
        'Set assessment rubrics'
      ]
    },
    {
      id: 7,
      title: '🏫 Academic Operations',
      subtitle: 'Vận hành học thuật theo dõi',
      description: 'Monitoring system health and performance metrics',
      color: 'from-teal-500 to-cyan-500',
      icon: TrendingUp,
      details: [
        'Mentor response time: 2.5h avg',
        'AI accuracy: 94%',
        'Transition success: 89%',
        'System health: Healthy'
      ]
    },
    {
      id: 8,
      title: '📊 Teacher Dashboard',
      subtitle: 'Dashboard giáo viên cập nhật',
      description: 'Teachers see assignments, approvals, and AI suggestions',
      color: 'from-pink-500 to-rose-500',
      icon: Award,
      details: [
        'Active assignments: 5',
        'Pending approvals: 2',
        'Performance: 92% effectiveness',
        'AI suggestions: 3 new alerts'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl shadow-xl p-8 mb-8 text-white">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <Sparkles className="w-8 h-8" />
            
              </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">🎼 AI-Orchestrated Faculty Model</h1>
              <p className="text-purple-100">Hệ thống điều phối giáo viên thông minh cho lộ trình đa chuyên môn</p>
            </div>
          </div>
        </div>

        {/* Flow Diagram */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">System Flow Diagram</h2>
          
          <div className="space-y-4">
            {flowSteps.map((step, index) => (
              <div key={step.id} className="relative">
                {/* Step Card */}
                <div
                  onClick={() => setActiveStep(activeStep === step.id ? null : step.id)}
                  className={`
                    bg-gradient-to-r ${step.color} rounded-xl p-6 cursor-pointer
                    transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]
                    ${activeStep === step.id ? 'shadow-2xl scale-[1.02]' : 'shadow-lg'}
                  `}
                >
                  <div className="flex items-center justify-between text-white">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-white/30 rounded-full flex items-center justify-center font-bold text-xl">
                        {step.id}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold mb-1">{step.title}</h3>
                        <p className="text-white/90 text-sm">{step.subtitle}</p>
                      </div>
                    </div>
                    <step.icon className="w-8 h-8" />
                  </div>

                  {/* Expanded Details */}
                  {activeStep === step.id && (
                    <div className="mt-4 pt-4 border-t border-white/30">
                      <p className="text-white/90 mb-3 font-medium">{step.description}</p>
                      <div className="space-y-2">
                        {step.details.map((detail, idx) => (
                          <div key={idx} className="flex items-start space-x-2 text-white/80 text-sm">
                            <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span>{detail}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Arrow Connector */}
                {index < flowSteps.length - 1 && (
                  <div className="flex justify-center py-3">
                    <ArrowRight className="w-6 h-6 text-gray-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Metrics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-blue-500">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-600">Active Paths</span>
              <GitBranch className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-3xl font-bold text-gray-900">45</div>
            <div className="text-xs text-gray-500 mt-1">Multi-disciplinary paths</div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-green-500">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-600">AI Accuracy</span>
              <Brain className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-3xl font-bold text-gray-900">94%</div>
            <div className="text-xs text-gray-500 mt-1">Matching accuracy</div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-purple-500">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-600">Mentors</span>
              <Users className="w-5 h-5 text-purple-500" />
            </div>
            <div className="text-3xl font-bold text-gray-900">12</div>
            <div className="text-xs text-gray-500 mt-1">Across 12 domains</div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-orange-500">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-600">Success Rate</span>
              <Award className="w-5 h-5 text-orange-500" />
            </div>
            <div className="text-3xl font-bold text-gray-900">89%</div>
            <div className="text-xs text-gray-500 mt-1">Transition success</div>
          </div>
        </div>

        {/* Legend */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Flow Components</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center text-white">
                👨‍🎓
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Student</h4>
                <p className="text-sm text-gray-600">Submits learning goals and interests</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white">
                🤖
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">AI Coordinator</h4>
                <p className="text-sm text-gray-600">Orchestrates learning path and mentor assignment</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center text-white">
                👨‍🏫
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Subject Mentors</h4>
                <p className="text-sm text-gray-600">Validate and enhance domain-specific content</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center text-white">
                👥
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Cross-Panel</h4>
                <p className="text-sm text-gray-600">Reviews cross-domain transitions</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-lg flex items-center justify-center text-white">
                🏫
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Academic Operations</h4>
                <p className="text-sm text-gray-600">Monitors system health and performance</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-rose-500 rounded-lg flex items-center justify-center text-white">
                📊
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Teacher Dashboard</h4>
                <p className="text-sm text-gray-600">Displays assignments and AI suggestions</p>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
          <div className="flex items-start space-x-3">
            <Sparkles className="w-6 h-6 text-purple-600 mt-1" />
            <div>
              <h3 className="font-bold text-gray-900 mb-2">💡 How to Use This Visualization</h3>
              <p className="text-gray-700 mb-3">Click on any step to see detailed information about that part of the flow.</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Each colored card represents a key component in the AI orchestration system</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Arrows show the flow of information between components</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Metrics below show real-time system performance</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

