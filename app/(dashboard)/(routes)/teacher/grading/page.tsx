'use client';

import { useState } from 'react';
import { Award, Star, CheckCircle, Clock, AlertCircle, TrendingUp, Brain, Upload, Sparkles, FileText, Send, X } from 'lucide-react';

interface Grade {
  id: string;
  studentName: string;
  assignment: string;
  score: number;
  maxScore: number;
  status: 'graded' | 'pending' | 'late';
  submittedDate: string;
  gradeDate?: string;
}

interface GradingResult {
  score: number;
  maxScore: number;
  feedback: string;
  ocrText: string;
  aiProvider: string;
  confidence: number;
}

export default function GradingPage() {
  const [showGradingModal, setShowGradingModal] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isGrading, setIsGrading] = useState(false);
  const [llmProvider, setLlmProvider] = useState<'auto' | 'gpt4' | 'gemini' | 'grok'>('auto');
  const [gradingResult, setGradingResult] = useState<GradingResult | null>(null);

  const [grades] = useState<Grade[]>([
    {
      id: '1',
      studentName: 'Nguyễn Văn A',
      assignment: 'Bài tập Toán - Đạo hàm',
      score: 85,
      maxScore: 100,
      status: 'graded',
      submittedDate: '2024-10-22',
      gradeDate: '2024-10-23'
    },
    {
      id: '2',
      studentName: 'Trần Thị B',
      assignment: 'Bài tập Toán - Đạo hàm',
      score: 0,
      maxScore: 100,
      status: 'pending',
      submittedDate: '2024-10-22'
    },
    {
      id: '3',
      studentName: 'Lê Văn C',
      assignment: 'Bài tập Vật lý - Cơ học',
      score: 92,
      maxScore: 100,
      status: 'graded',
      submittedDate: '2024-10-21',
      gradeDate: '2024-10-22'
    },
    {
      id: '4',
      studentName: 'Phạm Thị D',
      assignment: 'Bài tập Vật lý - Cơ học',
      score: 0,
      maxScore: 100,
      status: 'late',
      submittedDate: '2024-10-20'
    }
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'graded': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'late': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'graded': return 'Đã chấm';
      case 'pending': return 'Chờ chấm';
      case 'late': return 'Nộp muộn';
      default: return 'Không xác định';
    }
  };

  const handleGrade = (id: string) => {
    const grade = grades.find(g => g.id === id);
    if (grade) {
      setSelectedGrade(grade);
      setShowGradingModal(true);
      setGradingResult(null);
      setUploadedFile(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      setUploadedFile(file);
    }
  };

  const handleAIGrading = async () => {
    if (!uploadedFile || !selectedGrade) return;

    setIsGrading(true);
    setGradingResult(null);

    try {
      // Simulate AI grading with mock data
      await new Promise(resolve => setTimeout(resolve, 2000));

      const mockResult: GradingResult = {
        score: Math.floor(Math.random() * 20) + 80,
        maxScore: selectedGrade.maxScore,
        feedback: `Bài làm tốt, thể hiện sự hiểu biết vững vàng về ${selectedGrade.assignment}.`,
        ocrText: `Đạo hàm của f(x) = x² là f'(x) = 2x.\nQuy tắc: (x^n)' = n*x^(n-1)`,
        aiProvider: llmProvider === 'auto' ? 'gemini' : llmProvider,
        confidence: 0.92
      };

      setGradingResult(mockResult);
    } catch (error) {
      console.error('AI Grading Error:', error);
      alert('Có lỗi khi chấm bài.');
    } finally {
      setIsGrading(false);
    }
  };

  const averageScore = grades.filter(g => g.status === 'graded').reduce((sum, g) => sum + g.score, 0) / grades.filter(g => g.status === 'graded').length || 0;
  const pendingCount = grades.filter(g => g.status === 'pending').length;
  const gradedCount = grades.filter(g => g.status === 'graded').length;
  const lateCount = grades.filter(g => g.status === 'late').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl shadow-xl p-8 mb-8 text-white">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <Award className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">🏆 Chấm điểm & Đánh giá</h1>
              <p className="text-purple-100">Quản lý điểm số và phản hồi cho học sinh</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Điểm trung bình</p>
                <p className="text-3xl font-bold text-blue-600">{averageScore.toFixed(1)}</p>
              </div>
              <TrendingUp className="w-12 h-12 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Đã chấm</p>
                <p className="text-3xl font-bold text-green-600">{gradedCount}</p>
              </div>
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Chờ chấm</p>
                <p className="text-3xl font-bold text-yellow-600">{pendingCount}</p>
              </div>
              <Clock className="w-12 h-12 text-yellow-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Nộp muộn</p>
                <p className="text-3xl font-bold text-red-600">{lateCount}</p>
              </div>
              <AlertCircle className="w-12 h-12 text-red-500" />
            </div>
          </div>
        </div>

        {/* Grades List */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Danh sách Chấm điểm</h2>
          <div className="space-y-4">
            {grades.map((grade) => (
              <div key={grade.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{grade.studentName}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(grade.status)}`}>
                        {getStatusText(grade.status)}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-3">{grade.assignment}</p>
                    <div className="flex items-center space-x-6 text-sm text-gray-500">
                      <span>Nộp: {grade.submittedDate}</span>
                      {grade.gradeDate && <span>Chấm: {grade.gradeDate}</span>}
                      {grade.status === 'graded' && (
                        <div className="flex items-center space-x-2">
                          <Star className="w-4 h-4 text-yellow-500" />
                          <span className="font-semibold">{grade.score}/{grade.maxScore}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button onClick={() => alert('Xem: ' + grade.id)} className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600">
                      Xem chi tiết
                    </button>
                    {grade.status !== 'graded' && (
                      <button onClick={() => handleGrade(grade.id)} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center space-x-2">
                        <Brain className="w-4 h-4" />
                        <span>Chấm với AI</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Grading Modal */}
        {showGradingModal && selectedGrade && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 rounded-t-2xl text-white flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-1">🤖 AI Grading System</h2>
                  <p className="text-purple-100">{selectedGrade.studentName} - {selectedGrade.assignment}</p>
                </div>
                <button onClick={() => { setShowGradingModal(false); setUploadedFile(null); setGradingResult(null); }} className="p-2 hover:bg-white/20 rounded-lg transition-colors text-2xl">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-4 text-white">
                  <div className="flex items-center space-x-3">
                    <Sparkles className="w-6 h-6" />
                    <div>
                      <h3 className="font-semibold">AI-Powered Grading</h3>
                      <p className="text-sm text-blue-100">OCR + LLM (GPT-4, Grok, Gemini)</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Chọn AI Model:</label>
                  <select value={llmProvider} onChange={(e) => setLlmProvider(e.target.value as any)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-base">
                    <option value="auto">🤖 Auto (Tự động chọn)</option>
                    <option value="gpt4">🌟 GPT-4 (Chất lượng cao)</option>
                    <option value="grok">🚀 Grok (Mạnh mẽ)</option>
                    <option value="gemini">✨ Gemini (Nhanh)</option>
                  </select>
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-500">
                  <input type="file" accept="image/*,application/pdf" onChange={handleFileUpload} className="hidden" id="file-upload" />
                  <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center space-y-3">
                    <Upload className="w-12 h-12 text-gray-400" />
                    <div>
                      <span className="text-purple-600 font-semibold">Click để tải ảnh</span>
                      <p className="text-gray-500 text-sm">JPG, PNG, PDF</p>
                    </div>
                  </label>
                  {uploadedFile && (
                    <div className="mt-4 p-3 bg-green-50 rounded-lg">
                      <p className="text-green-800 font-medium">✅ {uploadedFile.name}</p>
                    </div>
                  )}
                </div>

                <button onClick={handleAIGrading} disabled={!uploadedFile || isGrading} className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-4 rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center space-x-3">
                  {isGrading ? (
                    <><div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span>Đang chấm...</span></>
                  ) : (
                    <><Brain className="w-6 h-6" /><span>Chấm bài với AI</span></>
                  )}
                </button>

                {gradingResult && (
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 border-2 border-green-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold flex items-center space-x-2">
                        <Award className="w-6 h-6 text-yellow-500" />
                        <span>Kết quả</span>
                      </h3>
                      <span className="bg-purple-100 px-3 py-1 rounded-full text-sm text-purple-700">{gradingResult.aiProvider}</span>
                    </div>
                    <div className="bg-white rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-gray-700 font-medium">Điểm:</span>
                        <div className="flex items-center space-x-3">
                          <span className="text-4xl font-bold text-green-600">{gradingResult.score}</span>
                          <span className="text-2xl text-gray-400">/</span>
                          <span className="text-2xl text-gray-600">{gradingResult.maxScore}</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-4">
                        <div className="bg-gradient-to-r from-green-500 to-blue-500 h-4 rounded-full" style={{ width: `${(gradingResult.score / gradingResult.maxScore) * 100}%` }}></div>
                      </div>
                    </div>
                    {gradingResult.ocrText && (
                      <div className="bg-white rounded-lg p-4">
                        <h4 className="font-semibold mb-2 flex items-center space-x-2">
                          <FileText className="w-5 h-5 text-blue-500" />
                          <span>OCR Text:</span>
                        </h4>
                        <div className="bg-gray-50 rounded p-3">
                          <p className="text-gray-700 whitespace-pre-wrap">{gradingResult.ocrText}</p>
                        </div>
                      </div>
                    )}
                    {gradingResult.feedback && (
                      <div className="bg-white rounded-lg p-4">
                        <h4 className="font-semibold mb-2 flex items-center space-x-2">
                          <Brain className="w-5 h-5 text-purple-500" />
                          <span>Feedback:</span>
                        </h4>
                        <div className="bg-purple-50 rounded p-3">
                          <p className="text-gray-700 whitespace-pre-wrap">{gradingResult.feedback}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex space-x-3">
                      <button onClick={() => { alert('Saved!'); setShowGradingModal(false); }} className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold">Lưu điểm</button>
                      <button onClick={() => alert('Sent!')} className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold">Gửi phản hồi</button>
                    </div>
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
