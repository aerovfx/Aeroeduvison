'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { 
  Sparkles, 
  BookOpen, 
  FileText, 
  Presentation, 
  Video,
  Download,
  Copy,
  Save,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface GeneratedContent {
  title: string;
  content: string;
  type: string;
  metadata: {
    subject: string;
    grade: string;
    topic: string;
    estimatedDuration: number;
    difficulty: string;
  };
  quiz?: {
    questions: Array<{
      question: string;
      options: string[];
      correctAnswer: number;
      explanation: string;
    }>;
  };
  slides?: Array<{
    slideNumber: number;
    title: string;
    content: string;
    imagePrompt?: string;
  }>;
}

export default function AIContentGeneratorPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [inputMode, setInputMode] = useState<'structured' | 'freeform'>('freeform');
  const [formData, setFormData] = useState({
    type: 'lesson' as 'lesson' | 'quiz' | 'slides' | 'video-script',
    subject: '',
    grade: '',
    topic: '',
    curriculum: 'Chương trình GDPT 2018',
    duration: 45,
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    additionalContext: '',
    aiModel: 'cursor' as 'auto' | 'openai' | 'cursor' | 'ollama' | 'demo',
    freeformPrompt: '', // New field for freeform input
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);

  // Fix hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Subjects and grades options
  const subjects = [
    'Toán học',
    'Vật lý',
    'Hóa học',
    'Sinh học',
    'Ngữ văn',
    'Tiếng Anh',
    'Lịch sử',
    'Địa lý',
    'Tin học',
    'STEM',
  ];

  const grades = ['6', '7', '8', '9', '10', '11', '12'];

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (inputMode === 'structured') {
      if (!formData.subject || !formData.grade || !formData.topic) {
        toast.error('Vui lòng điền đầy đủ thông tin bắt buộc');
        return;
      }
    } else {
      if (!formData.freeformPrompt || formData.freeformPrompt.trim().length < 10) {
        toast.error('Vui lòng nhập prompt chi tiết (ít nhất 10 ký tự)');
        return;
      }
    }

    setIsGenerating(true);
    setGeneratedContent(null);

    try {
      // Use streaming API for real-time updates
      const response = await fetch('/api/ai-content/generate-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to start generation');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.type === 'status') {
                  // Update status message
                  toast.loading(data.message, { id: 'generation-status' });
                } else if (data.type === 'result') {
                  // Final result
                  setGeneratedContent(data.data);
                  toast.success(`✨ Nội dung đã được tạo thành công với ${data.model}!`, { id: 'generation-status' });
                } else if (data.type === 'error') {
                  toast.error(data.message, { id: 'generation-status' });
                }
              } catch (e) {
                console.error('Parse error:', e);
              }
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Generate error:', error);
      toast.error(error.message || 'Không thể tạo nội dung. Vui lòng thử lại.', { id: 'generation-status' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyContent = () => {
    if (!generatedContent) return;
    
    let textToCopy = `# ${generatedContent.title}\n\n${generatedContent.content}`;
    
    if (generatedContent.quiz) {
      textToCopy += '\n\n## Quiz\n\n';
      generatedContent.quiz.questions.forEach((q, idx) => {
        textToCopy += `${idx + 1}. ${q.question}\n`;
        q.options.forEach(opt => textToCopy += `   ${opt}\n`);
        textToCopy += `   Đáp án: ${String.fromCharCode(65 + q.correctAnswer)}\n`;
        textToCopy += `   ${q.explanation}\n\n`;
      });
    }

    if (generatedContent.slides) {
      textToCopy += '\n\n## Slides\n\n';
      generatedContent.slides.forEach(slide => {
        textToCopy += `### Slide ${slide.slideNumber}: ${slide.title}\n`;
        textToCopy += `${slide.content}\n`;
        if (slide.imagePrompt) {
          textToCopy += `*Hình ảnh: ${slide.imagePrompt}*\n`;
        }
        textToCopy += '\n---\n\n';
      });
    }

    navigator.clipboard.writeText(textToCopy);
    toast.success('Đã sao chép nội dung!');
  };

  const handleDownload = () => {
    if (!generatedContent) return;

    const blob = new Blob([JSON.stringify(generatedContent, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${formData.topic.replace(/\s+/g, '-')}-${formData.type}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Đã tải xuống!');
  };

  const handleAddToModule = async (moduleType: 'course' | 'quiz' | 'video') => {
    if (!generatedContent) return;

    try {
      // Save to database first
      const saveResponse = await fetch('/api/ai-content/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: generatedContent,
          formData: formData,
          moduleType: moduleType,
        }),
      });

      if (!saveResponse.ok) {
        throw new Error('Không thể lưu nội dung');
      }

      const saveData = await saveResponse.json();
      
      // Redirect to appropriate module
      if (moduleType === 'course') {
        router.push(`/teacher/courses/${saveData.courseId}`);
        toast.success('✅ Đã thêm vào Course!');
      } else if (moduleType === 'quiz') {
        router.push(`/teacher/quizzes/${saveData.quizId}`);
        toast.success('✅ Đã thêm vào Quiz!');
      } else if (moduleType === 'video') {
        router.push(`/teacher/videos/${saveData.videoId}`);
        toast.success('✅ Đã thêm vào Video!');
      }
    } catch (error: any) {
      console.error('Add to module error:', error);
      toast.error('Không thể thêm vào module. Vui lòng thử lại.');
    }
  };

  const contentTypeIcons = {
    lesson: BookOpen,
    quiz: FileText,
    slides: Presentation,
    'video-script': Video,
  };

  const ContentTypeIcon = contentTypeIcons[formData.type];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                AI Content Generator
              </h1>
              <p className="text-gray-600 mt-1">
                Tạo tự động bài học, quiz, slides chỉ trong vài giây ⚡
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-gradient-to-r from-blue-100 to-blue-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-700">70-80%</div>
              <div className="text-sm text-blue-600">Tiết kiệm thời gian</div>
            </div>
            <div className="bg-gradient-to-r from-green-100 to-green-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-700">4 Loại</div>
              <div className="text-sm text-green-600">Nội dung khác nhau</div>
            </div>
            <div className="bg-gradient-to-r from-purple-100 to-purple-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-700">AI-Powered</div>
              <div className="text-sm text-purple-600">Chất lượng cao</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <ContentTypeIcon className="h-5 w-5 text-indigo-600" />
              Thông tin nội dung
            </h2>

            <form onSubmit={handleGenerate} className="space-y-4">
              {/* Input Mode Toggle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chế độ nhập liệu
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setInputMode('freeform')}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      inputMode === 'freeform'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-sm">✍️ Prompt tự do</div>
                    <div className="text-xs text-gray-500 mt-1">Linh hoạt, chi tiết</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode('structured')}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      inputMode === 'structured'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-sm">📋 Form có sẵn</div>
                    <div className="text-xs text-gray-500 mt-1">Nhanh, đơn giản</div>
                  </button>
                </div>
              </div>

              {/* Freeform Prompt Input */}
              {inputMode === 'freeform' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nhập prompt chi tiết <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="freeformPrompt"
                      value={formData.freeformPrompt}
                      onChange={handleInputChange}
                      rows={12}
                      placeholder="VD:&#10;&#10;Tạo bài quiz về quan hệ giữa khối lượng và gia tốc&#10;&#10;Khối lượng (m) và gia tốc (a) là hai đại số cơ bản trong vật lý, và chúng có quan hệ mật thiết với nhau.&#10;&#10;**Quan hệ giữa khối lượng và gia tốc**&#10;&#10;Khi một vật bị tác động bởi lực F, nó sẽ thay đổi tốc độ theo tỷ lệ với lực. Quan hệ chính xác giữa khối lượng và gia tốc được mô tả bởi Định luật II Newton:&#10;&#10;F = ma&#10;&#10;Trong đó:&#10;- F là lực tác động (N)&#10;- m là khối lượng (kg)&#10;- a là gia tốc (m/s²)&#10;&#10;Hãy tạo 5 câu hỏi trắc nghiệm về chủ đề này cho học sinh lớp 10."
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                      required={inputMode === 'freeform'}
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      💡 Tip: Nhập chi tiết về nội dung cần tạo, bao gồm lý thuyết, ví dụ, yêu cầu cụ thể. 
                      AI sẽ tạo nội dung dựa trên prompt của bạn.
                    </p>
                  </div>

                  {/* AI Model Selection for Freeform */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      AI Model <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="aiModel"
                      value={formData.aiModel}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      required
                    >
                      <option value="cursor">⚡ Cursor AI (Mặc định - Nhanh, miễn phí)</option>
                      <option value="auto">🤖 Auto (Tự động chọn tốt nhất)</option>
                      <option value="openai">🧠 OpenAI GPT-4 (Chất lượng cao)</option>
                      <option value="ollama">🏠 Ollama (llama3.2:latest - Local AI)</option>
                      <option value="demo">🎭 Demo Mode (Mẫu có sẵn)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.aiModel === 'cursor' && '✅ Sử dụng Cursor API mặc định, nhanh và miễn phí'}
                      {formData.aiModel === 'auto' && 'Sẽ tự động chọn model tốt nhất có sẵn'}
                      {formData.aiModel === 'openai' && 'Cần API key OpenAI, chất lượng cao nhất'}
                      {formData.aiModel === 'ollama' && 'Chạy local với llama3.2:latest, cần cài đặt Ollama'}
                      {formData.aiModel === 'demo' && 'Sử dụng nội dung mẫu để test'}
                    </p>
                  </div>
                </>
              )}

              {/* Structured Form */}
              {inputMode === 'structured' && (
                <>
                  {/* Content Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Loại nội dung <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: 'lesson', label: 'Bài học', icon: BookOpen },
                        { value: 'quiz', label: 'Quiz', icon: FileText },
                        { value: 'slides', label: 'Slides', icon: Presentation },
                        { value: 'video-script', label: 'Video Script', icon: Video },
                      ].map(({ value, label, icon: Icon }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, type: value as any }))}
                          className={`p-3 rounded-lg border-2 transition-all flex items-center gap-2 ${
                            formData.type === value
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          <span className="font-medium text-sm">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

              {/* Subject & Grade */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Môn học <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  >
                    <option value="">Chọn môn học</option>
                    {subjects.map(subject => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lớp <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="grade"
                    value={formData.grade}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  >
                    <option value="">Chọn lớp</option>
                    {grades.map(grade => (
                      <option key={grade} value={grade}>Lớp {grade}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Topic */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chủ đề <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="topic"
                  value={formData.topic}
                  onChange={handleInputChange}
                  placeholder="VD: Phương trình bậc hai, Định luật Newton..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Curriculum */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Khung chương trình
                </label>
                <input
                  type="text"
                  name="curriculum"
                  value={formData.curriculum}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* Duration & Difficulty */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Thời lượng (phút)
                  </label>
                  <input
                    type="number"
                    name="duration"
                    value={formData.duration}
                    onChange={handleInputChange}
                    min="5"
                    max="120"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Độ khó
                  </label>
                  <select
                    name="difficulty"
                    value={formData.difficulty}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="easy">Dễ</option>
                    <option value="medium">Trung bình</option>
                    <option value="hard">Khó</option>
                  </select>
                </div>
              </div>

              {/* AI Model Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  AI Model <span className="text-red-500">*</span>
                </label>
                <select
                  name="aiModel"
                  value={formData.aiModel}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                >
                  <option value="cursor">⚡ Cursor AI (Mặc định - Nhanh, miễn phí)</option>
                  <option value="auto">🤖 Auto (Tự động chọn tốt nhất)</option>
                  <option value="openai">🧠 OpenAI GPT-4 (Chất lượng cao)</option>
                  <option value="ollama">🏠 Ollama (llama3.2:latest - Local AI)</option>
                  <option value="demo">🎭 Demo Mode (Mẫu có sẵn)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.aiModel === 'cursor' && '✅ Sử dụng Cursor API mặc định, nhanh và miễn phí'}
                  {formData.aiModel === 'auto' && 'Sẽ tự động chọn model tốt nhất có sẵn'}
                  {formData.aiModel === 'openai' && 'Cần API key OpenAI, chất lượng cao nhất'}
                  {formData.aiModel === 'ollama' && 'Chạy local với llama3.2:latest, cần cài đặt Ollama'}
                  {formData.aiModel === 'demo' && 'Sử dụng nội dung mẫu để test'}
                </p>
              </div>

              {/* Additional Context */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Yêu cầu thêm (tùy chọn)
                </label>
                <textarea
                  name="additionalContext"
                  value={formData.additionalContext}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="VD: Tập trung vào ứng dụng thực tế, thêm nhiều ví dụ..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              </>
              )}

              {/* Generate Button */}
              {mounted && (
                <button
                  type="submit"
                  disabled={isGenerating}
                  className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all flex items-center justify-center gap-2 ${
                    isGenerating
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl'
                  }`}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Đang tạo nội dung...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      Tạo nội dung với AI
                    </>
                  )}
                </button>
              )}
            </form>
          </div>

          {/* Preview/Result */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Kết quả</h2>
              {generatedContent && (
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyContent}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Sao chép"
                  >
                    <Copy className="h-5 w-5 text-gray-600" />
                  </button>
                  <button
                    onClick={handleDownload}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Tải xuống"
                  >
                    <Download className="h-5 w-5 text-gray-600" />
                  </button>
                </div>
              )}
            </div>

            {!generatedContent && !isGenerating && (
              <div className="flex flex-col items-center justify-center h-96 text-gray-400">
                <AlertCircle className="h-16 w-16 mb-4" />
                <p className="text-center">
                  Điền thông tin và nhấn "Tạo nội dung với AI"<br />
                  để bắt đầu
                </p>
              </div>
            )}

            {isGenerating && (
              <div className="flex flex-col items-center justify-center h-96">
                <Loader2 className="h-16 w-16 animate-spin text-indigo-600 mb-4" />
                <p className="text-gray-600 text-center">
                  AI đang phân tích và tạo nội dung...<br />
                  <span className="text-sm text-gray-400">Vui lòng đợi 10-30 giây</span>
                </p>
              </div>
            )}

            {generatedContent && (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {/* Metadata */}
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-lg text-gray-900">
                      {generatedContent.title}
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAddToModule('course')}
                        className="px-3 py-1 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        📚 Thêm vào Course
                      </button>
                      <button
                        onClick={() => handleAddToModule('quiz')}
                        className="px-3 py-1 bg-green-500 text-white text-xs rounded-lg hover:bg-green-600 transition-colors"
                      >
                        ❓ Thêm vào Quiz
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm">
                    <span className="px-2 py-1 bg-white rounded-full">
                      📚 {generatedContent.metadata.subject}
                    </span>
                    <span className="px-2 py-1 bg-white rounded-full">
                      🎓 Lớp {generatedContent.metadata.grade}
                    </span>
                    <span className="px-2 py-1 bg-white rounded-full">
                      ⏱️ {generatedContent.metadata.estimatedDuration} phút
                    </span>
                    <span className="px-2 py-1 bg-white rounded-full">
                      📊 {generatedContent.metadata.difficulty === 'easy' ? 'Dễ' :
                          generatedContent.metadata.difficulty === 'hard' ? 'Khó' : 'Trung bình'}
                    </span>
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                      🤖 {formData.aiModel.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Content */}
                {(generatedContent.type === 'lesson' || (!generatedContent.quiz && !generatedContent.slides)) && (
                  <div className="space-y-4">
                    {/* Lesson Preview Header */}
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-blue-900 flex items-center gap-2">
                            <BookOpen className="h-5 w-5" />
                            Xem trước Bài học
                          </h4>
                          <p className="text-sm text-blue-700 mt-1">
                            Kiểm tra kỹ nội dung trước khi thêm vào Course
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Lesson Content */}
                    <div className="prose max-w-none bg-white rounded-lg border-2 border-gray-200 p-6">
                      <div 
                        className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed"
                        dangerouslySetInnerHTML={{ 
                          __html: generatedContent.content.replace(/\n/g, '<br/>') 
                        }}
                      />
                    </div>

                    {/* Summary Footer */}
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-white p-2 rounded-lg">
                            <BookOpen className="h-5 w-5 text-indigo-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              Bài học đã sẵn sàng
                            </p>
                            <p className="text-sm text-gray-600">
                              Đã kiểm tra và có thể thêm vào Course
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAddToModule('course')}
                          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                        >
                          <span>✓</span>
                          <span>Thêm vào Course</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {generatedContent.quiz && (
                  <div className="space-y-4">
                    {/* Quiz Preview Header */}
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-blue-900 flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Xem trước Quiz - {generatedContent.quiz.questions.length} câu hỏi
                          </h4>
                          <p className="text-sm text-blue-700 mt-1">
                            Kiểm tra kỹ nội dung trước khi thêm vào Quiz
                          </p>
                        </div>
                        <div className="text-sm text-blue-600">
                          ✓ Sẵn sàng thêm vào Quiz
                        </div>
                      </div>
                    </div>

                    {/* Questions List */}
                    {generatedContent.quiz.questions.map((q, idx) => (
                      <div key={idx} className="border-2 border-gray-200 rounded-xl p-5 hover:border-indigo-300 transition-all bg-white shadow-sm">
                        {/* Question Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="bg-indigo-100 text-indigo-700 font-bold px-3 py-1 rounded-full text-sm">
                                Câu {idx + 1}
                              </span>
                              <span className="text-xs text-gray-500">
                                ({q.options.length} đáp án)
                              </span>
                            </div>
                            <p className="font-semibold text-gray-900 text-base leading-relaxed">
                              {q.question}
                            </p>
                          </div>
                        </div>

                        {/* Options */}
                        <div className="space-y-2 mb-4">
                          {q.options.map((opt, optIdx) => (
                            <div 
                              key={optIdx}
                              className={`p-3 rounded-lg border-2 transition-all ${
                                optIdx === q.correctAnswer 
                                  ? 'bg-green-50 border-green-400 text-green-800' 
                                  : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="flex-1">{opt}</span>
                                {optIdx === q.correctAnswer && (
                                  <span className="ml-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                                    ✓ Đúng
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Explanation */}
                        <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r-lg">
                          <div className="flex items-start gap-2">
                            <span className="text-amber-600 font-semibold text-sm mt-0.5">💡 Giải thích:</span>
                            <p className="text-sm text-amber-800 flex-1 leading-relaxed">
                              {q.explanation}
                            </p>
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
                          <div className="text-xs text-gray-500">
                            Đáp án đúng: <span className="font-semibold text-green-600">
                              {String.fromCharCode(65 + q.correctAnswer)}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                const text = `${q.question}\n\n${q.options.join('\n')}\n\nĐáp án: ${String.fromCharCode(65 + q.correctAnswer)}\nGiải thích: ${q.explanation}`;
                                navigator.clipboard.writeText(text);
                                toast.success(`Đã sao chép câu ${idx + 1}`);
                              }}
                              className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                              📋 Copy
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Summary Footer */}
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-white p-2 rounded-lg">
                            <FileText className="h-5 w-5 text-indigo-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              Tổng cộng: {generatedContent.quiz.questions.length} câu hỏi
                            </p>
                            <p className="text-sm text-gray-600">
                              Đã kiểm tra và sẵn sàng thêm vào Quiz
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAddToModule('quiz')}
                          className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                        >
                          <span>✓</span>
                          <span>Thêm vào Quiz</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {formData.type === 'slides' && generatedContent.slides && (
                  <div className="space-y-4">
                    {/* Slides Preview Header */}
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-blue-900 flex items-center gap-2">
                            <Presentation className="h-5 w-5" />
                            Xem trước Slides - {generatedContent.slides.length} slides
                          </h4>
                          <p className="text-sm text-blue-700 mt-1">
                            Kiểm tra kỹ nội dung các slide trước khi thêm vào Course
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Slides List */}
                    {generatedContent.slides.map((slide) => (
                      <div key={slide.slideNumber} className="border-2 border-gray-200 rounded-xl p-5 bg-white shadow-sm hover:border-indigo-300 transition-all">
                        <div className="flex items-center justify-between mb-3">
                          <span className="bg-indigo-100 text-indigo-700 font-bold px-3 py-1 rounded-full text-sm">
                            Slide {slide.slideNumber}/{generatedContent.slides.length}
                          </span>
                        </div>
                        <h4 className="font-bold text-xl mb-3 text-gray-900">{slide.title}</h4>
                        <div className="bg-gray-50 rounded-lg p-4 mb-3 border border-gray-200">
                          <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                            {slide.content}
                          </div>
                        </div>
                        {slide.imagePrompt && (
                          <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r-lg">
                            <div className="flex items-center gap-2">
                              <span className="text-amber-600 text-sm font-medium">🖼️ Gợi ý hình ảnh:</span>
                              <span className="text-sm text-amber-800">{slide.imagePrompt}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Summary Footer */}
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-white p-2 rounded-lg">
                            <Presentation className="h-5 w-5 text-indigo-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              Tổng cộng: {generatedContent.slides.length} slides
                            </p>
                            <p className="text-sm text-gray-600">
                              Đã kiểm tra và sẵn sàng thêm vào Course
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAddToModule('course')}
                          className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                        >
                          <span>✓</span>
                          <span>Thêm vào Course</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

