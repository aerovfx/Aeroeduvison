'use client';

import { useState } from 'react';
import { FileText, Plus, Calendar, Users, CheckCircle, Clock, Brain, Upload, Sparkles, Eye, Award, TrendingUp } from 'lucide-react';
import { updateButtonHandlers } from '../update-event-handlers';
import { useLanguage } from '@/contexts/LanguageContext';

interface Assignment {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  students: number;
  submitted: number;
  status: 'draft' | 'published' | 'closed';
  answerKey?: string;
  maxScore?: number;
}

interface Submission {
  id: string;
  studentId: string;
  studentName: string;
  assignmentId: string;
  ocrText?: string;
  score?: number;
  maxScore?: number;
  feedback?: string;
  aiProvider?: string;
  submittedAt: string;
  status: 'pending' | 'grading' | 'graded';
  imageUrl?: string;
}

interface StudentCapability {
  studentId: string;
  studentName: string;
  averageScore: number;
  totalSubmissions: number;
  completionRate: number;
  trend: 'improving' | 'stable' | 'declining';
  strengths: string[];
  weaknesses: string[];
}

export default function AssignmentsPage() {
  const { t } = useLanguage();
  
  const [assignments] = useState<Assignment[]>([
    {
      id: '1',
      title: 'Bài tập Toán - Đạo hàm',
      description: 'Giải các bài tập về đạo hàm cơ bản',
      dueDate: '2024-10-25',
      students: 25,
      submitted: 18,
      status: 'published',
      answerKey: 'Đạo hàm của f(x) = x² là f\'(x) = 2x',
      maxScore: 10
    },
    {
      id: '2',
      title: 'Bài tập Vật lý - Cơ học',
      description: 'Bài tập về chuyển động thẳng đều',
      dueDate: '2024-10-28',
      students: 25,
      submitted: 12,
      status: 'published',
      answerKey: 'Vận tốc = Quãng đường / Thời gian. v = s/t',
      maxScore: 10
    },
    {
      id: '3',
      title: 'Bài tập Hóa học - Phản ứng',
      description: 'Viết phương trình phản ứng hóa học',
      dueDate: '2024-10-30',
      students: 25,
      submitted: 0,
      status: 'draft',
      answerKey: '2H2 + O2 → 2H2O',
      maxScore: 10
    }
  ]);

  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [showGradingModal, setShowGradingModal] = useState(false);
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const [showCapabilityModal, setShowCapabilityModal] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [gradingResult, setGradingResult] = useState<Submission | null>(null);
  const [isGrading, setIsGrading] = useState(false);
  const [llmProvider, setLlmProvider] = useState<'auto' | 'gpt4' | 'gemini' | 'grok' | 'ollama'>('auto');
  const [viewMode, setViewMode] = useState<'assignments' | 'submissions' | 'capabilities'>('assignments');

  // Mock submissions data
  const [submissions] = useState<Submission[]>([
    {
      id: 'sub_1',
      studentId: 'student_1',
      studentName: 'Nguyễn Văn A',
      assignmentId: '1',
      ocrText: 'Đạo hàm của f(x) = x² là f\'(x) = 2x. Quy tắc: (x^n)\' = n*x^(n-1)',
      score: 9,
      maxScore: 10,
      feedback: 'Câu trả lời chính xác và có giải thích rõ ràng quy tắc đạo hàm.',
      aiProvider: 'GPT-4',
      submittedAt: '2024-10-23 14:30',
      status: 'graded'
    },
    {
      id: 'sub_2',
      studentId: 'student_2',
      studentName: 'Trần Thị B',
      assignmentId: '1',
      ocrText: 'Đạo hàm của x² là 2x',
      score: 7,
      maxScore: 10,
      feedback: 'Câu trả lời đúng nhưng thiếu giải thích chi tiết về quy tắc.',
      aiProvider: 'Gemini',
      submittedAt: '2024-10-23 15:00',
      status: 'graded'
    },
    {
      id: 'sub_3',
      studentId: 'student_3',
      studentName: 'Lê Văn C',
      assignmentId: '1',
      ocrText: 'f\'(x) = 2x',
      score: 5,
      maxScore: 10,
      feedback: 'Câu trả lời thiếu nhiều chi tiết, không có giải thích.',
      aiProvider: 'GPT-4',
      submittedAt: '2024-10-24 09:15',
      status: 'graded'
    },
    {
      id: 'sub_4',
      studentId: 'student_1',
      studentName: 'Nguyễn Văn A',
      assignmentId: '2',
      ocrText: 'Vận tốc = Quãng đường / Thời gian. Công thức: v = s/t. Ví dụ: nếu đi 100m trong 10s thì v = 100/10 = 10 m/s',
      score: 10,
      maxScore: 10,
      feedback: 'Xuất sắc! Có cả công thức và ví dụ minh họa.',
      aiProvider: 'GPT-4',
      submittedAt: '2024-10-25 10:00',
      status: 'graded'
    },
    {
      id: 'sub_5',
      studentId: 'student_2',
      studentName: 'Trần Thị B',
      assignmentId: '2',
      ocrText: 'v = s/t',
      score: 6,
      maxScore: 10,
      feedback: 'Có công thức nhưng thiếu giải thích ý nghĩa các đại lượng.',
      aiProvider: 'Gemini',
      submittedAt: '2024-10-25 11:30',
      status: 'graded'
    },
    {
      id: 'sub_6',
      studentId: 'student_4',
      studentName: 'Phạm Thị D',
      assignmentId: '1',
      ocrText: '',
      score: 0,
      maxScore: 10,
      feedback: 'Chưa nộp bài',
      submittedAt: '2024-10-24 16:00',
      status: 'pending'
    }
  ]);

  // Calculate student capabilities
  const calculateStudentCapabilities = (): StudentCapability[] => {
    const studentMap = new Map<string, Submission[]>();
    
    submissions.forEach(sub => {
      if (!studentMap.has(sub.studentId)) {
        studentMap.set(sub.studentId, []);
      }
      studentMap.get(sub.studentId)!.push(sub);
    });

    const capabilities: StudentCapability[] = [];

    studentMap.forEach((subs, studentId) => {
      const gradedSubs = subs.filter(s => s.status === 'graded' && s.score !== undefined);
      const totalAssignments = assignments.length;
      
      if (gradedSubs.length === 0) return;

      const averageScore = gradedSubs.reduce((sum, s) => sum + (s.score! / s.maxScore!) * 100, 0) / gradedSubs.length;
      const completionRate = (subs.length / totalAssignments) * 100;

      // Calculate trend
      let trend: 'improving' | 'stable' | 'declining' = 'stable';
      if (gradedSubs.length >= 2) {
        const recent = gradedSubs.slice(-2);
        const scoreDiff = (recent[1].score! / recent[1].maxScore!) - (recent[0].score! / recent[0].maxScore!);
        if (scoreDiff > 0.1) trend = 'improving';
        else if (scoreDiff < -0.1) trend = 'declining';
      }

      // Identify strengths and weaknesses
      const strengths: string[] = [];
      const weaknesses: string[] = [];
      
      if (averageScore >= 80) strengths.push('Điểm số cao');
      if (completionRate >= 90) strengths.push('Nộp bài đầy đủ');
      if (trend === 'improving') strengths.push('Tiến bộ rõ rệt');
      
      if (averageScore < 60) weaknesses.push('Cần cải thiện điểm số');
      if (completionRate < 70) weaknesses.push('Thiếu bài nộp');
      if (trend === 'declining') weaknesses.push('Điểm số giảm');

      capabilities.push({
        studentId,
        studentName: subs[0].studentName,
        averageScore,
        totalSubmissions: subs.length,
        completionRate,
        trend,
        strengths: strengths.length > 0 ? strengths : ['Cần theo dõi'],
        weaknesses: weaknesses.length > 0 ? weaknesses : ['Không có']
      });
    });

    return capabilities.sort((a, b) => b.averageScore - a.averageScore);
  };

  const studentCapabilities = calculateStudentCapabilities();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'published': return 'Đã xuất bản';
      case 'draft': return 'Bản nháp';
      case 'closed': return 'Đã đóng';
      default: return 'Không xác định';
    }
  };

  const handleCreateAssignment = () => {
    updateButtonHandlers.handleCreateAssignment();
  };

  const handleViewAssignment = (id: string) => {
    const assignment = assignments.find(a => a.id === id);
    if (assignment) {
      setSelectedAssignment(assignment);
      setShowGradingModal(true);
    }
  };

  const handleViewSubmissions = (assignmentId: string) => {
    const assignment = assignments.find(a => a.id === assignmentId);
    if (assignment) {
      setSelectedAssignment(assignment);
      setShowSubmissionsModal(true);
      console.log(`📋 [Assignments] Viewing submissions for: ${assignment.title}`);
    }
  };

  const handleViewCapabilities = () => {
    setShowCapabilityModal(true);
    console.log(`📊 [Assignments] Viewing student capabilities`);
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'improving') return '📈';
    if (trend === 'declining') return '📉';
    return '➡️';
  };

  const getTrendColor = (trend: string) => {
    if (trend === 'improving') return 'text-green-600';
    if (trend === 'declining') return 'text-red-600';
    return 'text-gray-600';
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      setUploadedFile(file);
    }
  };

  const handleAIGrading = async () => {
    if (!uploadedFile || !selectedAssignment) return;

    setIsGrading(true);
    setGradingResult(null);

    try {
      console.log('🤖 [AI Grading] Starting AI grading process...');
      
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('assignmentId', selectedAssignment.id);
      formData.append('studentId', 'demo_student_' + Date.now());
      formData.append('answerKey', selectedAssignment.answerKey || '');
      formData.append('maxScore', (selectedAssignment.maxScore || 10).toString());
      formData.append('llmProvider', llmProvider);

      const response = await fetch('/api/assignments/grade-ocr', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('AI grading failed');
      }

      const result = await response.json();
      
      if (result.success) {
        const submission: Submission = {
          id: 'sub_' + Date.now(),
          studentId: result.data.studentId,
          studentName: 'Demo Student',
          assignmentId: result.data.assignmentId,
          ocrText: result.data.ocrText,
          score: result.data.score,
          maxScore: result.data.maxScore,
          feedback: result.data.feedback,
          aiProvider: result.data.aiProvider,
          submittedAt: new Date().toISOString(),
          status: 'graded'
        };

        setGradingResult(submission);
        console.log('✅ [AI Grading] Grading completed successfully');
        alert('✅ Chấm bài thành công với AI!');
      }
    } catch (error) {
      console.error('❌ [AI Grading] Error:', error);
      alert('❌ Lỗi khi chấm bài. Vui lòng thử lại.');
    } finally {
      setIsGrading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl shadow-xl p-8 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <FileText className="w-8 h-8" />
              
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-2">📝 Quản lý Bài tập</h1>
                <p className="text-purple-100">Chấm bài tự động với AI OCR + LLM</p>
              </div>
            </div>
            <button
              onClick={handleCreateAssignment}
              className="bg-white text-purple-600 px-6 py-3 rounded-lg font-semibold hover:bg-purple-50 transition-colors flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Tạo bài tập</span>
            </button>
          </div>
        </div>

        {/* AI Grading Banner */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg p-6 mb-8 text-white">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-white/20 rounded-lg">
              <Brain className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-1">🤖 AI Grading System</h3>
              <p className="text-blue-100">OCR + LLM (GPT-4, Gemini, Grok, Ollama) - Chấm bài tự động thông minh</p>
            </div>
            <Sparkles className="w-12 h-12 text-yellow-300 animate-pulse" />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Tổng bài tập</p>
                <p className="text-3xl font-bold text-gray-900">{assignments.length}</p>
              </div>
              <FileText className="w-12 h-12 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Đã xuất bản</p>
                <p className="text-3xl font-bold text-green-600">
                  {assignments.filter(a => a.status === 'published').length}
                </p>
              </div>
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Bản nháp</p>
                <p className="text-3xl font-bold text-yellow-600">
                  {assignments.filter(a => a.status === 'draft').length}
                </p>
              </div>
              <Clock className="w-12 h-12 text-yellow-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">AI Graded</p>
                <p className="text-3xl font-bold text-purple-600">
                  {assignments.reduce((sum, a) => sum + a.submitted, 0)}
                </p>
              </div>
              <Brain className="w-12 h-12 text-purple-500" />
            </div>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center space-x-2 bg-white rounded-lg p-1 shadow-sm mb-6">
          <button
            onClick={() => setViewMode('assignments')}
            className={`flex-1 px-6 py-3 rounded-md text-sm font-medium transition-all ${
              viewMode === 'assignments'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>Bài tập</span>
            </div>
          </button>
          <button
            onClick={() => setViewMode('submissions')}
            className={`flex-1 px-6 py-3 rounded-md text-sm font-medium transition-all ${
              viewMode === 'submissions'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <CheckCircle className="w-4 h-4" />
              <span>Bài nộp ({submissions.length})</span>
            </div>
          </button>
          <button
            onClick={() => {
              setViewMode('capabilities');
              handleViewCapabilities();
            }}
            className={`flex-1 px-6 py-3 rounded-md text-sm font-medium transition-all ${
              viewMode === 'capabilities'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Brain className="w-4 h-4" />
              <span>Năng lực HS</span>
            </div>
          </button>
        </div>

        {/* Assignments List */}
        {viewMode === 'assignments' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Danh sách Bài tập</h2>
          <div className="space-y-4">
            {assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {assignment.title}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(assignment.status)}`}>
                        {getStatusText(assignment.status)}
                      </span>
                      {assignment.answerKey && (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 flex items-center space-x-1">
                          <Brain className="w-3 h-3" />
                          <span>AI Ready</span>
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 mb-3">{assignment.description}</p>
                    <div className="flex items-center space-x-6 text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4" />
                        <span>Hạn: {assignment.dueDate}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4" />
                        <span>{assignment.submitted}/{assignment.students} học sinh đã nộp</span>
                      </div>
                      {assignment.maxScore && (
                        <div className="flex items-center space-x-2">
                          <Award className="w-4 h-4" />
                          <span>Điểm tối đa: {assignment.maxScore}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handleViewSubmissions(assignment.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Xem bài nộp ({submissions.filter(s => s.assignmentId === assignment.id).length})</span>
                    </button>
                    <button
                      onClick={() => handleViewAssignment(assignment.id)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
                    >
                      <Brain className="w-4 h-4" />
                      <span>Chấm với AI</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* Submissions List */}
        {viewMode === 'submissions' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Danh sách Bài nộp</h2>
            <div className="space-y-4">
              {submissions.map((submission) => {
                const assignment = assignments.find(a => a.id === submission.assignmentId);
                return (
                  <div
                    key={submission.id}
                    className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {submission.studentName}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            submission.status === 'graded' 
                              ? 'bg-green-100 text-green-800' 
                              : submission.status === 'grading'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {submission.status === 'graded' && '✅ Đã chấm'}
                            {submission.status === 'grading' && '⏳ Đang chấm'}
                            {submission.status === 'pending' && '⏰ Chờ chấm'}
                          </span>
                          {submission.aiProvider && (
                            <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-700">
                              {submission.aiProvider}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 mb-2">
                          Bài tập: {assignment?.title || 'N/A'}
                        </p>
                        <div className="flex items-center space-x-6 text-sm text-gray-500 mb-3">
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4" />
                            <span>Nộp: {submission.submittedAt}</span>
                          </div>
                          {submission.score !== undefined && (
                            <div className="flex items-center space-x-2">
                              <Award className="w-4 h-4" />
                              <span className="font-semibold text-purple-600">
                                {submission.score}/{submission.maxScore} điểm
                              </span>
                            </div>
                          )}
                        </div>

                        {/* OCR Text Preview */}
                        {submission.ocrText && (
                          <div className="bg-gray-50 rounded-lg p-3 mb-2">
                            <p className="text-xs font-medium text-gray-600 mb-1">Văn bản (OCR):</p>
                            <p className="text-sm text-gray-700 line-clamp-2">{submission.ocrText}</p>
                          </div>
                        )}

                        {/* Feedback */}
                        {submission.feedback && (
                          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                            <p className="text-xs font-medium text-blue-700 mb-1">Nhận xét AI:</p>
                            <p className="text-sm text-blue-800">{submission.feedback}</p>
                          </div>
                        )}
                      </div>

                      {/* Score Circle */}
                      {submission.score !== undefined && (
                        <div className="ml-4">
                          <div className="w-24 h-24 rounded-full border-4 border-purple-200 flex flex-col items-center justify-center">
                            <span className="text-2xl font-bold text-purple-600">
                              {Math.round((submission.score / submission.maxScore!) * 100)}%
                            </span>
                            <span className="text-xs text-gray-500">Điểm</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Student Capabilities View */}
        {viewMode === 'capabilities' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Đánh giá Năng lực Học sinh</h2>
            <div className="space-y-4">
              {studentCapabilities.map((student) => (
                <div
                  key={student.studentId}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-bold text-lg">
                          {student.studentName.charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{student.studentName}</h3>
                          <div className="flex items-center space-x-2 text-sm">
                            <span className="text-gray-600">
                              {student.totalSubmissions} bài nộp
                            </span>
                            <span className="text-gray-400">•</span>
                            <span className={getTrendColor(student.trend)}>
                              {getTrendIcon(student.trend)} {student.trend === 'improving' ? 'Tiến bộ' : student.trend === 'declining' ? 'Giảm sút' : 'Ổn định'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Điểm TB</span>
                            <TrendingUp className="w-4 h-4 text-blue-500" />
                          </div>
                          <div className="text-2xl font-bold text-blue-600">
                            {student.averageScore.toFixed(1)}%
                          </div>
                        </div>
                        <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Hoàn thành</span>
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          </div>
                          <div className="text-2xl font-bold text-green-600">
                            {student.completionRate.toFixed(0)}%
                          </div>
                        </div>
                      </div>

                      {/* Strengths */}
                      <div className="mb-3">
                        <p className="text-xs font-medium text-gray-600 mb-2">✅ Điểm mạnh:</p>
                        <div className="flex flex-wrap gap-2">
                          {student.strengths.map((strength, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium"
                            >
                              {strength}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Weaknesses */}
                      {student.weaknesses[0] !== 'Không có' && (
                        <div>
                          <p className="text-xs font-medium text-gray-600 mb-2">⚠️ Cần cải thiện:</p>
                          <div className="flex flex-wrap gap-2">
                            {student.weaknesses.map((weakness, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium"
                              >
                                {weakness}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Overall Score Circle */}
                    <div className="ml-4">
                      <div className={`w-28 h-28 rounded-full border-4 flex flex-col items-center justify-center ${
                        student.averageScore >= 80 ? 'border-green-300 bg-green-50' :
                        student.averageScore >= 60 ? 'border-blue-300 bg-blue-50' :
                        'border-orange-300 bg-orange-50'
                      }`}>
                        <span className={`text-3xl font-bold ${
                          student.averageScore >= 80 ? 'text-green-600' :
                          student.averageScore >= 60 ? 'text-blue-600' :
                          'text-orange-600'
                        }`}>
                          {student.averageScore.toFixed(0)}
                        </span>
                        <span className="text-xs text-gray-500 mt-1">Điểm TB</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submissions Modal */}
        {showSubmissionsModal && selectedAssignment && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
            <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-green-600 to-teal-600 p-6 rounded-t-2xl text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold mb-1">📋 Bài nộp - {selectedAssignment.title}</h2>
                    <p className="text-green-100">
                      {submissions.filter(s => s.assignmentId === selectedAssignment.id).length} bài đã nộp
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowSubmissionsModal(false);
                      setSelectedAssignment(null);
                    }}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-4">
                {submissions
                  .filter(s => s.assignmentId === selectedAssignment.id)
                  .map((submission) => (
                    <div
                      key={submission.id}
                      className="border-2 border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-bold">
                            {submission.studentName.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900">{submission.studentName}</h4>
                            <p className="text-xs text-gray-500">{submission.submittedAt}</p>
                          </div>
                        </div>
                        {submission.score !== undefined && (
                          <div className="flex items-center space-x-3">
                            <div className="text-right">
                              <div className="text-2xl font-bold text-purple-600">
                                {submission.score}/{submission.maxScore}
                              </div>
                              <div className="text-xs text-gray-500">{submission.aiProvider}</div>
                            </div>
                            <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center ${
                              (submission.score / submission.maxScore!) >= 0.8 ? 'border-green-300 bg-green-50' :
                              (submission.score / submission.maxScore!) >= 0.6 ? 'border-blue-300 bg-blue-50' :
                              'border-orange-300 bg-orange-50'
                            }`}>
                              <span className={`text-lg font-bold ${
                                (submission.score / submission.maxScore!) >= 0.8 ? 'text-green-600' :
                                (submission.score / submission.maxScore!) >= 0.6 ? 'text-blue-600' :
                                'text-orange-600'
                              }`}>
                                {Math.round((submission.score / submission.maxScore!) * 100)}%
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {submission.ocrText && (
                        <div className="bg-gray-50 rounded-lg p-3 mb-2">
                          <p className="text-xs font-semibold text-gray-700 mb-1">📝 Câu trả lời (OCR):</p>
                          <p className="text-sm text-gray-800">{submission.ocrText}</p>
                        </div>
                      )}

                      {submission.feedback && (
                        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                          <p className="text-xs font-semibold text-blue-700 mb-1">🤖 Nhận xét từ AI:</p>
                          <p className="text-sm text-blue-800">{submission.feedback}</p>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* AI Grading Modal */}
        {showGradingModal && selectedAssignment && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 rounded-t-2xl text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold mb-1">🤖 AI Grading System</h2>
                    <p className="text-purple-100">{selectedAssignment.title}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowGradingModal(false);
                      setUploadedFile(null);
                      setGradingResult(null);
                    }}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                {/* Answer Key */}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h3 className="font-semibold text-blue-900 mb-2 flex items-center space-x-2">
                    <FileText className="w-5 h-5" />
                    <span>Đáp án mẫu:</span>
                  </h3>
                  <p className="text-blue-800">{selectedAssignment.answerKey}</p>
                  <p className="text-sm text-blue-600 mt-2">Điểm tối đa: {selectedAssignment.maxScore}</p>
                </div>

                {/* LLM Provider Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chọn AI Model:
                  </label>
                  <select
                    value={llmProvider}
                    onChange={(e) => setLlmProvider(e.target.value as any)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="auto">🤖 Auto (Tự động chọn model tốt nhất)</option>
                    <option value="gpt4">🌟 GPT-4 (OpenAI - Chất lượng cao)</option>
                    <option value="gemini">✨ Gemini (Google - Nhanh)</option>
                    <option value="grok">🚀 Grok (xAI - Mạnh mẽ)</option>
                    <option value="ollama">🏠 Ollama (Local - Bảo mật)</option>
                  </select>
                </div>

                {/* File Upload */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-500 transition-colors">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center space-y-3"
                  >
                    <Upload className="w-12 h-12 text-gray-400" />
                    <div>
                      <span className="text-purple-600 font-semibold">Click để tải ảnh bài làm</span>
                      <p className="text-gray-500 text-sm mt-1">Hỗ trợ: JPG, PNG, PDF</p>
                    </div>
                  </label>
                  {uploadedFile && (
                    <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-green-800 font-medium">✅ {uploadedFile.name}</p>
                      <p className="text-green-600 text-sm">{(uploadedFile.size / 1024).toFixed(2)} KB</p>
                    </div>
                  )}
                </div>

                {/* Grade Button */}
                <button
                  onClick={handleAIGrading}
                  disabled={!uploadedFile || isGrading}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-4 rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3"
                >
                  {isGrading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Đang chấm bài với AI...</span>
                    </>
                  ) : (
                    <>
                      <Brain className="w-6 h-6" />
                      <span>Chấm bài với AI</span>
                    </>
                  )}
                </button>

                {/* Grading Result */}
                {gradingResult && (
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 border-2 border-green-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
                        <Award className="w-6 h-6 text-yellow-500" />
                        <span>Kết quả chấm điểm</span>
                      </h3>
                      <div className="flex items-center space-x-2">
                        <Sparkles className="w-5 h-5 text-purple-500" />
                        <span className="text-sm text-purple-600 font-medium">
                          {gradingResult.aiProvider}
                        </span>
                      </div>
                    </div>

                    {/* Score */}
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700 font-medium">Điểm số:</span>
                        <span className="text-3xl font-bold text-green-600">
                          {gradingResult.score}/{gradingResult.maxScore}
                        </span>
                      </div>
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-gradient-to-r from-green-500 to-blue-500 h-3 rounded-full transition-all"
                            style={{ width: `${(gradingResult.score! / gradingResult.maxScore!) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {/* OCR Text */}
                    {gradingResult.ocrText && (
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <h4 className="font-semibold text-gray-900 mb-2 flex items-center space-x-2">
                          <FileText className="w-5 h-5 text-blue-500" />
                          <span>Văn bản trích xuất (OCR):</span>
                        </h4>
                        <p className="text-gray-700 whitespace-pre-wrap">{gradingResult.ocrText}</p>
                      </div>
                    )}

                    {/* Feedback */}
                    {gradingResult.feedback && (
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <h4 className="font-semibold text-gray-900 mb-2 flex items-center space-x-2">
                          <Brain className="w-5 h-5 text-purple-500" />
                          <span>Nhận xét từ AI:</span>
                        </h4>
                        <p className="text-gray-700 whitespace-pre-wrap">{gradingResult.feedback}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
