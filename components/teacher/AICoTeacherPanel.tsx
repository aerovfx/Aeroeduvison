/**
 * AI Co-Teacher Panel
 * 
 * AI-powered insights and suggestions for teachers
 * - At-risk student detection
 * - Learning path recommendations
 * - Automated interventions
 * - Smart notifications
 */

'use client';

import { Sparkles, AlertCircle, TrendingUp, Users, Send, ChevronRight, Brain, Target } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { updateButtonHandlers, initializeEventHandlers } from '../../app/(dashboard)/(routes)/teacher/update-event-handlers';

interface AICoTeacherPanelProps {
  students: any[];
  classStats: any;
}

export default function AICoTeacherPanel({ students, classStats }: AICoTeacherPanelProps) {
  const router = useRouter();

  // Initialize event handlers with router
  useEffect(() => {
    initializeEventHandlers(router);
  }, [router]);

  // Analyze students to generate AI insights
  const atRiskStudents = students.filter(s => s.xpSignal?.trends?.atRisk);
  const lowMotivation = students.filter(s => s.xpSignal?.motivation?.score < 50);
  const excellingStudents = students.filter(s => 
    s.xpSignal?.capability?.overallScore >= 80 && 
    s.xpSignal?.trends?.overall === 'improving'
  );

  const aiSuggestions = [
    // At-risk alerts
    ...atRiskStudents.map(s => ({
      type: 'alert' as const,
      priority: 'high' as const,
      title: `${s.name} cần hỗ trợ khẩn cấp`,
      description: `Có ${s.xpSignal.trends.riskFactors.length} yếu tố nguy cơ`,
      action: 'Gửi động viên',
      studentId: s.id,
      icon: AlertCircle,
      color: 'red'
    })),

    // Low motivation
    ...lowMotivation.slice(0, 2).map(s => ({
      type: 'suggestion' as const,
      priority: 'medium' as const,
      title: `${s.name}: Động lực giảm`,
      description: `Motivation score: ${Math.round(s.xpSignal.motivation.score)}% (${s.xpSignal.motivation.trend})`,
      action: 'Điều chỉnh nội dung',
      studentId: s.id,
      icon: TrendingUp,
      color: 'yellow'
    })),

    // Excellence recognition
    ...excellingStudents.slice(0, 2).map(s => ({
      type: 'opportunity' as const,
      priority: 'low' as const,
      title: `${s.name}: Sẵn sàng nâng cao`,
      description: `Capability ${Math.round(s.xpSignal.capability.overallScore)}%, trending ${s.xpSignal.trends.overall}`,
      action: 'Giao thử thách',
      studentId: s.id,
      icon: Target,
      color: 'green'
    })),
  ].slice(0, 5); // Top 5 suggestions

  // Class-level recommendations
  const classRecommendations = [
    {
      title: 'Tạo module kỹ năng tư duy phản biện',
      description: `${Math.round(classStats.averageCapability)}% học sinh đạt năng lực cao - phù hợp nội dung nâng cao`,
      icon: Brain,
    },
    {
      title: 'Tổ chức session nhóm',
      description: `${atRiskStudents.length} học sinh cần hỗ trợ - học nhóm sẽ hiệu quả`,
      icon: Users,
    },
  ];

  return (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl shadow-lg p-6 border border-purple-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">AI Co-Teacher</h3>
            <p className="text-xs text-gray-600">Trợ lý thông minh</p>
          </div>
        </div>
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
      </div>

      {/* AI Insights */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-gray-700">Phát hiện quan trọng</h4>
          <span className="text-xs text-gray-500">{aiSuggestions.length} cảnh báo</span>
        </div>

        {aiSuggestions.length === 0 ? (
          <div className="text-center py-8">
            <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Tất cả học sinh đều ổn! 🎉</p>
          </div>
        ) : (
          aiSuggestions.map((suggestion, index) => (
            <div
              key={index}
              className={`bg-white rounded-lg p-4 border-l-4 ${
                suggestion.color === 'red' 
                  ? 'border-red-500' 
                  : suggestion.color === 'yellow'
                  ? 'border-yellow-500'
                  : 'border-green-500'
              } hover:shadow-md transition-shadow cursor-pointer group`}
            >
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-lg ${
                  suggestion.color === 'red' 
                    ? 'bg-red-100' 
                    : suggestion.color === 'yellow'
                    ? 'bg-yellow-100'
                    : 'bg-green-100'
                }`}>
                  <suggestion.icon className={`w-4 h-4 ${
                    suggestion.color === 'red' 
                      ? 'text-red-600' 
                      : suggestion.color === 'yellow'
                      ? 'text-yellow-600'
                      : 'text-green-600'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-1">
                    <h5 className="text-sm font-semibold text-gray-900 truncate">
                      {suggestion.title}
                    </h5>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      suggestion.priority === 'high'
                        ? 'bg-red-100 text-red-700'
                        : suggestion.priority === 'medium'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {suggestion.priority === 'high' ? 'Khẩn' : suggestion.priority === 'medium' ? 'TB' : 'Thấp'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">
                    {suggestion.description}
                  </p>
                  <button 
                    onClick={() => {
                      console.log(`🎯 [AI Dashboard] Button clicked: ${suggestion.action}`);
                      
                      if (suggestion.action === 'Gửi động viên') {
                        const studentName = suggestion.title.split(' cần hỗ trợ khẩn cấp')[0];
                        console.log(`💝 [AI] Gửi động viên đến: ${studentName}`);
                        updateButtonHandlers.handleSendEncouragement(suggestion.studentId, studentName);
                      } else if (suggestion.action === 'Điều chỉnh nội dung') {
                        const studentName = suggestion.title.split(':')[0];
                        console.log(`🎯 [AI] Điều chỉnh nội dung cho: ${studentName}`);
                        updateButtonHandlers.handleAdjustLearningPath(suggestion.studentId, studentName);
                      } else if (suggestion.action === 'Tạo thử thách') {
                        console.log(`🏆 [AI] Tạo thử thách mới`);
                        updateButtonHandlers.handleCreateModule('assignment');
                      }
                    }}
                    className="text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center group-hover:underline"
                  >
                    {suggestion.action}
                    <ChevronRight className="w-3 h-3 ml-1" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Class Recommendations */}
      <div className="border-t border-purple-200 pt-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Đề xuất cho lớp</h4>
        <div className="space-y-3">
          {classRecommendations.map((rec, index) => (
            <div
              key={index}
              onClick={() => {
                if (rec.title.includes('Tạo module kỹ năng tư duy phản biện')) {
                  console.log('🤖 [AI Dashboard] Button clicked: Tạo module kỹ năng tư duy phản biện');
                  console.log('📝 [AI] Đang tạo critical thinking module cho môn Tư duy phản biện...');
                  updateButtonHandlers.handleGenerateContent('critical thinking module', 'Tư duy phản biện');
                  
                  // Show notification
                  alert('🤖 AI đang tạo critical thinking module cho môn Tư duy phản biện!\n\nVui lòng chờ trong giây lát...');
                } else if (rec.title.includes('Tổ chức session nhóm')) {
                  console.log('👥 [AI Dashboard] Button clicked: Tổ chức session nhóm');
                  updateButtonHandlers.handleCreateEvent('meeting');
                }
              }}
              className="bg-white rounded-lg p-3 flex items-start space-x-3 hover:shadow-md transition-shadow cursor-pointer hover:bg-purple-50"
            >
              <div className="p-2 bg-purple-100 rounded-lg">
                <rec.icon className="w-4 h-4 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h5 className="text-sm font-medium text-gray-900 mb-1">
                  {rec.title}
                </h5>
                <p className="text-xs text-gray-600">
                  {rec.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 pt-6 border-t border-purple-200">
        <button 
          onClick={() => {
            console.log('📢 [AI Dashboard] Button clicked: Gửi thông báo hàng loạt');
            updateButtonHandlers.handleSendNotification('bulk');
          }}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-lg py-3 px-4 font-medium flex items-center justify-center space-x-2 transition-colors"
        >
          <Send className="w-4 h-4" />
          <span>Gửi thông báo hàng loạt</span>
        </button>
      </div>
    </div>
  );
}

