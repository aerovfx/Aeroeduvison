'use client';

import { useState } from 'react';
import { Upload, FileText, Brain, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'react-hot-toast';

interface Answer {
  question_number: number;
  question: string;
  correct_answer: string;
  max_points: number;
}

interface GradingResult {
  analysis: string;
  correct_points: string[];
  incorrect_points: string[];
  missing_points: string[];
  score: number;
  feedback: string;
  suggestions: string[];
  question_number: number;
  question: string;
}

interface GradingSummary {
  total_score: number;
  max_score: number;
  percentage: number;
  grade: string;
  num_questions: number;
  breakdown: GradingResult[];
}

export default function OCRGradingPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [answerKey, setAnswerKey] = useState<Answer[]>([
    {
      question_number: 1,
      question: 'Photosynthesis là gì? Giải thích cơ chế hoạt động.',
      correct_answer: 'Photosynthesis (quang hợp) là quá trình chuyển hóa năng lượng ánh sáng thành năng lượng hóa học. Thực vật sử dụng CO2 và H2O, với sự hiện diện của chlorophyll và ánh sáng mặt trời, tạo ra glucose (C6H12O6) và O2. Phương trình: 6CO2 + 6H2O + ánh sáng → C6H12O6 + 6O2',
      max_points: 10
    }
  ]);
  const [useLLM, setUseLLM] = useState(true);
  const [llmModel, setLLMModel] = useState<'demo' | 'grok' | 'openai'>('demo');
  const [loading, setLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<any>(null);
  const [gradingResult, setGradingResult] = useState<any>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleOCRExtract = async () => {
    if (!selectedFile) {
      toast.error('Vui lòng chọn file ảnh');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch('/api/ocr/upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setOcrResult(data);
        toast.success(`Trích xuất thành công ${data.word_count} từ`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Lỗi khi trích xuất text');
      }
    } catch (error) {
      console.error('OCR error:', error);
      toast.error('Không thể kết nối đến OCR service. Vui lòng kiểm tra backend đang chạy.');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoGrade = async () => {
    if (!selectedFile) {
      toast.error('Vui lòng chọn file ảnh');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('answer_key', JSON.stringify(answerKey));
    formData.append('use_llm', String(useLLM));
    formData.append('llm_model', llmModel);

    try {
      const response = await fetch('/api/ocr/auto-grade', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setOcrResult(data.ocr_result);
        setGradingResult(data);
        toast.success(`Chấm điểm hoàn tất! Điểm: ${data.grading_summary.total_score}/${data.grading_summary.max_score}`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Lỗi khi chấm điểm');
      }
    } catch (error) {
      console.error('Auto-grading error:', error);
      toast.error('Không thể kết nối đến grading service. Vui lòng kiểm tra backend đang chạy.');
    } finally {
      setLoading(false);
    }
  };

  const addAnswerKey = () => {
    setAnswerKey([...answerKey, {
      question_number: answerKey.length + 1,
      question: '',
      correct_answer: '',
      max_points: 10
    }]);
  };

  const updateAnswerKey = (index: number, field: keyof Answer, value: any) => {
    const updated = [...answerKey];
    updated[index] = { ...updated[index], [field]: value };
    setAnswerKey(updated);
  };

  const removeAnswerKey = (index: number) => {
    setAnswerKey(answerKey.filter((_, i) => i !== index));
  };

  const getGradeColor = (grade: string) => {
    const colors: Record<string, string> = {
      'A': 'text-green-600',
      'B': 'text-blue-600',
      'C': 'text-yellow-600',
      'D': 'text-orange-600',
      'F': 'text-red-600'
    };
    return colors[grade] || 'text-gray-600';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">📝 OCR Auto-Grading System</h1>
        <p className="text-gray-600">
          Hệ thống chấm điểm tự động bài kiểm tra viết tay sử dụng OCR và AI
        </p>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="setup" className="space-y-4">
        <TabsList>
          <TabsTrigger value="setup">1. Setup</TabsTrigger>
          <TabsTrigger value="process">2. Process</TabsTrigger>
          <TabsTrigger value="results">3. Results</TabsTrigger>
        </TabsList>

        {/* Tab 1: Setup */}
        <TabsContent value="setup" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upload File */}
            <Card>
              <CardHeader>
                <CardTitle>📤 Upload Bài Kiểm Tra</CardTitle>
                <CardDescription>Chọn ảnh bài kiểm tra viết tay của học sinh</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <input
                    type="file"
                    accept="image/*,.heic,.heif"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">
                      Click để chọn file hoặc kéo thả vào đây
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      PNG, JPG, JPEG, HEIC (iOS) - tối đa 10MB
                    </p>
                  </label>
                </div>

                {selectedFile && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">File đã chọn:</p>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500">
                        {(selectedFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                )}

                {previewUrl && (
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2">Preview:</p>
                    <img 
                      src={previewUrl} 
                      alt="Preview" 
                      className="w-full rounded-lg border"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Answer Key */}
            <Card>
              <CardHeader>
                <CardTitle>📋 Đáp Án Chuẩn</CardTitle>
                <CardDescription>Nhập đáp án và tiêu chí chấm điểm</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {answerKey.map((answer, index) => (
                    <div key={index} className="border rounded-lg p-3 space-y-2">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium">Câu {answer.question_number}</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAnswerKey(index)}
                          className="h-6 w-6 p-0"
                        >
                          ×
                        </Button>
                      </div>
                      <input
                        type="text"
                        placeholder="Câu hỏi"
                        value={answer.question}
                        onChange={(e) => updateAnswerKey(index, 'question', e.target.value)}
                        className="w-full px-2 py-1 text-sm border rounded"
                      />
                      <textarea
                        placeholder="Đáp án chuẩn"
                        value={answer.correct_answer}
                        onChange={(e) => updateAnswerKey(index, 'correct_answer', e.target.value)}
                        className="w-full px-2 py-1 text-sm border rounded"
                        rows={3}
                      />
                      <input
                        type="number"
                        placeholder="Điểm tối đa"
                        value={answer.max_points}
                        onChange={(e) => updateAnswerKey(index, 'max_points', parseInt(e.target.value))}
                        className="w-24 px-2 py-1 text-sm border rounded"
                      />
                    </div>
                  ))}
                </div>
                <Button onClick={addAnswerKey} variant="outline" className="w-full">
                  + Thêm câu hỏi
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* AI Settings */}
          <Card>
            <CardHeader>
              <CardTitle>🤖 Cài Đặt AI</CardTitle>
              <CardDescription>Chọn mô hình AI để chấm điểm</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={useLLM}
                    onChange={(e) => setUseLLM(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Sử dụng LLM để chấm điểm thông minh</span>
                </label>
              </div>

              {useLLM && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Chọn mô hình LLM:</label>
                  <select
                    value={llmModel}
                    onChange={(e) => setLLMModel(e.target.value as any)}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="demo">🎭 Demo Mode (Keyword Matching)</option>
                    <option value="grok">🚀 Grok (X.AI - Nhanh, chính xác)</option>
                    <option value="openai">🤖 OpenAI GPT-4 (Chất lượng cao nhất)</option>
                  </select>
                  <p className="text-xs text-gray-500">
                    {llmModel === 'demo' && '✅ Không cần API key, sử dụng keyword matching'}
                    {llmModel === 'grok' && '⚡ Cần GROK_API_KEY trong .env'}
                    {llmModel === 'openai' && '🔑 Cần OPENAI_API_KEY trong .env'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Process */}
        <TabsContent value="process" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>⚙️ Xử Lý</CardTitle>
              <CardDescription>Pipeline: OCR → LLM Analysis → Grading</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* OCR Step */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-blue-500" />
                    <div>
                      <h4 className="font-medium">Bước 1: Trích xuất text (OCR)</h4>
                      <p className="text-sm text-gray-600">Nhận diện chữ viết tay từ ảnh</p>
                    </div>
                  </div>
                  <Button onClick={handleOCRExtract} disabled={loading || !selectedFile}>
                    {loading ? 'Đang xử lý...' : 'Trích xuất'}
                  </Button>
                </div>

                {ocrResult && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm font-medium mb-2">Kết quả OCR:</p>
                    <p className="text-sm text-gray-700">{ocrResult.text}</p>
                    <div className="flex gap-4 mt-2 text-xs text-gray-600">
                      <span>Độ tin cậy: {ocrResult.confidence.toFixed(1)}%</span>
                      <span>Số từ: {ocrResult.word_count}</span>
                      <span>Engine: {ocrResult.engine}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Auto Grade */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Brain className="h-5 w-5 text-purple-500" />
                    <div>
                      <h4 className="font-medium">Bước 2: Chấm điểm tự động</h4>
                      <p className="text-sm text-gray-600">OCR + LLM Analysis + Grading</p>
                    </div>
                  </div>
                  <Button onClick={handleAutoGrade} disabled={loading || !selectedFile} className="bg-purple-600 hover:bg-purple-700">
                    {loading ? 'Đang chấm...' : 'Chấm điểm'}
                  </Button>
                </div>
              </div>

              {/* Loading State */}
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Results */}
        <TabsContent value="results" className="space-y-4">
          {gradingResult ? (
            <>
              {/* Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>📊 Tổng Kết</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-3xl font-bold text-purple-600">
                        {gradingResult.grading_summary.total_score}
                      </p>
                      <p className="text-sm text-gray-600">Tổng điểm</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-3xl font-bold text-blue-600">
                        {gradingResult.grading_summary.percentage.toFixed(1)}%
                      </p>
                      <p className="text-sm text-gray-600">Tỷ lệ</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className={`text-3xl font-bold ${getGradeColor(gradingResult.grading_summary.grade)}`}>
                        {gradingResult.grading_summary.grade}
                      </p>
                      <p className="text-sm text-gray-600">Xếp loại</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-3xl font-bold text-gray-600">
                        {gradingResult.grading_summary.num_questions}
                      </p>
                      <p className="text-sm text-gray-600">Số câu</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Detailed Results */}
              <div className="space-y-4">
                {gradingResult.grading_summary.breakdown.map((result: GradingResult, index: number) => (
                  <Card key={index}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>Câu {result.question_number}</CardTitle>
                          <CardDescription>{result.question}</CardDescription>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-purple-600">
                            {result.score}/{answerKey[index]?.max_points || 10}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Analysis */}
                      <div>
                        <h4 className="font-medium mb-2">📝 Phân tích:</h4>
                        <p className="text-sm text-gray-700">{result.analysis}</p>
                      </div>

                      {/* Correct Points */}
                      {result.correct_points?.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            Điểm đúng:
                          </h4>
                          <ul className="list-disc list-inside space-y-1">
                            {result.correct_points.map((point, i) => (
                              <li key={i} className="text-sm text-green-700">{point}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Incorrect Points */}
                      {result.incorrect_points?.length > 0 && result.incorrect_points[0] !== 'Demo mode - chưa phân tích chi tiết' && (
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-red-500" />
                            Điểm sai:
                          </h4>
                          <ul className="list-disc list-inside space-y-1">
                            {result.incorrect_points.map((point, i) => (
                              <li key={i} className="text-sm text-red-700">{point}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Missing Points */}
                      {result.missing_points?.length > 0 && result.missing_points[0] !== 'Demo mode - chưa xác định ý thiếu' && (
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-yellow-500" />
                            Ý còn thiếu:
                          </h4>
                          <ul className="list-disc list-inside space-y-1">
                            {result.missing_points.map((point, i) => (
                              <li key={i} className="text-sm text-yellow-700">{point}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Feedback */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <h4 className="font-medium mb-1">💬 Nhận xét:</h4>
                        <p className="text-sm text-gray-700">{result.feedback}</p>
                      </div>

                      {/* Suggestions */}
                      {result.suggestions?.length > 0 && (
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                          <h4 className="font-medium mb-2">💡 Gợi ý cải thiện:</h4>
                          <ul className="list-disc list-inside space-y-1">
                            {result.suggestions.map((suggestion, i) => (
                              <li key={i} className="text-sm text-gray-700">{suggestion}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-gray-500">Chưa có kết quả chấm điểm. Vui lòng chấm điểm ở tab "Process".</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
