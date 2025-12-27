'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  AlertTriangle, TrendingDown, Users, Brain, Target,
  CheckCircle, Clock, XCircle, Play, ChevronRight, Eye
} from 'lucide-react';

interface AtRiskStudent {
  id: string;
  studentName: string;
  class: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: { factor: string; weight: number; trend: string }[];
  recommendations: { title: string; expectedImpact: number; confidence: number }[];
  status: 'new' | 'in_progress' | 'resolved';
  assignedTo?: string;
  createdAt: string;
}

export default function AdminAtRiskPage() {
  const { t } = useLanguage();
  
  const [selectedStudent, setSelectedStudent] = useState<AtRiskStudent | null>(null);

  const atRiskStudents: AtRiskStudent[] = [
    {
      id: 'risk_1',
      studentName: 'David Brown',
      class: '10C',
      riskScore: 85,
      riskLevel: 'critical',
      factors: [
        { factor: 'No login for 5 days', weight: 0.35, trend: 'declining' },
        { factor: 'XP dropped 20%', weight: 0.25, trend: 'declining' },
        { factor: 'Last emotion: Frustrated', weight: 0.20, trend: 'stable' },
        { factor: 'Quiz scores < 50%', weight: 0.15, trend: 'declining' },
        { factor: 'No peer interaction', weight: 0.05, trend: 'stable' }
      ],
      recommendations: [
        { title: 'Schedule 1-on-1 counseling', expectedImpact: 0.75, confidence: 0.88 },
        { title: 'Contact parent immediately', expectedImpact: 0.65, confidence: 0.82 },
        { title: 'Assign peer mentor', expectedImpact: 0.55, confidence: 0.70 }
      ],
      status: 'new',
      createdAt: '10 minutes ago'
    },
    {
      id: 'risk_2',
      studentName: 'Bob Smith',
      class: '10B',
      riskScore: 72,
      riskLevel: 'high',
      factors: [
        { factor: 'Declining session duration', weight: 0.30, trend: 'declining' },
        { factor: 'Frustration detected 3x', weight: 0.25, trend: 'stable' },
        { factor: 'Help requests increased', weight: 0.20, trend: 'improving' },
        { factor: 'Low quiz completion', weight: 0.15, trend: 'declining' },
        { factor: 'Mastery below target', weight: 0.10, trend: 'stable' }
      ],
      recommendations: [
        { title: 'Adjust learning path difficulty', expectedImpact: 0.70, confidence: 0.85 },
        { title: 'Provide targeted tutoring', expectedImpact: 0.68, confidence: 0.80 },
        { title: 'Send motivational content', expectedImpact: 0.45, confidence: 0.72 }
      ],
      status: 'in_progress',
      assignedTo: 'Ms. Sarah',
      createdAt: '2 hours ago'
    }
  ];

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-100 border-red-400 text-red-800';
      case 'high': return 'bg-orange-100 border-orange-400 text-orange-800';
      case 'medium': return 'bg-yellow-100 border-yellow-400 text-yellow-800';
      default: return 'bg-green-100 border-green-400 text-green-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent mb-2">
          At-Risk & Intervention Manager
        </h1>
        <p className="text-gray-600">AI-powered early intervention system</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Critical', value: 1, color: 'text-red-600' },
          { label: 'High', value: 1, color: 'text-orange-600' },
          { label: 'Medium', value: 0, color: 'text-yellow-600' },
          { label: 'Resolved Today', value: 3, color: 'text-green-600' }
        ].map((stat, idx) => (
          <div key={idx} className="bg-white rounded-lg shadow-sm border p-4">
            <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {atRiskStudents.map((student) => (
          <div key={student.id} className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-bold text-gray-900">{student.studentName}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border-2 ${getRiskColor(student.riskLevel)}`}>
                    {student.riskLevel.toUpperCase()} RISK
                  </span>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                    {student.class}
                  </span>
                
              </div>
                <p className="text-sm text-gray-600">{student.createdAt} • Risk Score: {student.riskScore}/100</p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-red-600 mb-1">{student.riskScore}</div>
                <p className="text-xs text-gray-500">Risk Score</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Factors */}
              <div>
                <h4 className="font-bold text-gray-900 mb-3">Contributing Factors</h4>
                <div className="space-y-2">
                  {student.factors.map((factor, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{factor.factor}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">{Math.round(factor.weight * 100)}%</span>
                        <TrendingDown className={`w-4 h-4 ${
                          factor.trend === 'declining' ? 'text-red-500' :
                          factor.trend === 'improving' ? 'text-green-500' :
                          'text-gray-500'
                        }`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div>
                <h4 className="font-bold text-gray-900 mb-3">AI Recommendations</h4>
                <div className="space-y-2">
                  {student.recommendations.map((rec, idx) => (
                    <button
                      key={idx}
                      className="w-full p-3 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg hover:shadow-md transition-all text-left"
                      onClick={() => alert(`Executing: ${rec.title}`)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900 text-sm">{rec.title}</span>
                        <Play className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-600">
                        <span>Impact: {Math.round(rec.expectedImpact * 100)}%</span>
                        <span>Confidence: {Math.round(rec.confidence * 100)}%</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {student.assignedTo && (
              <div className="mt-4 pt-4 border-t flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  Assigned to: <span className="font-medium text-gray-900">{student.assignedTo}</span>
                </span>
                <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                  IN PROGRESS
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

