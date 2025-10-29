'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
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
  AlertCircle,
  Edit,
  Check,
  X
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
  const { t } = useLanguage();
  
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
    aiModel: 'cursor' as 'auto' | 'grok' | 'openai' | 'cursor' | 'ollama' | 'demo',
    freeformPrompt: '', // New field for freeform input
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [selectedQuestions, setSelectedQuestions] = useState<number[]>([]); // Track selected question indices
  const [editingQuestion, setEditingQuestion] = useState<number | null>(null); // Track which question is being edited
  const [editedQuestions, setEditedQuestions] = useState<any>({}); // Store edited questions

  // Fix hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset selected questions when new content is generated
  useEffect(() => {
    if (generatedContent?.quiz) {
      // Select all questions by default
      setSelectedQuestions(generatedContent.quiz.questions.map((_, idx) => idx));
    }
  }, [generatedContent]);

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

  const toggleQuestionSelection = (index: number) => {
    setSelectedQuestions(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index];
      }
    });
  };

  const selectAllQuestions = () => {
    if (generatedContent?.quiz) {
      setSelectedQuestions(generatedContent.quiz.questions.map((_, idx) => idx));
    }
  };

  const deselectAllQuestions = () => {
    setSelectedQuestions([]);
  };

  // Edit question functions
  const startEditingQuestion = (idx: number) => {
    setEditingQuestion(idx);
    // Initialize edited question with current data if not already edited
    if (!editedQuestions[idx] && generatedContent?.quiz) {
      setEditedQuestions({
        ...editedQuestions,
        [idx]: { ...generatedContent.quiz.questions[idx] }
      });
    }
  };

  const cancelEditingQuestion = () => {
    setEditingQuestion(null);
  };

  const saveEditedQuestion = (idx: number) => {
    setEditingQuestion(null);
    toast.success(`✅ Đã lưu chỉnh sửa câu ${idx + 1}`, { duration: 2000 });
  };

  const updateEditedQuestion = (idx: number, field: string, value: any) => {
    setEditedQuestions({
      ...editedQuestions,
      [idx]: {
        ...editedQuestions[idx],
        [field]: value
      }
    });
  };

  const updateEditedOption = (idx: number, optIdx: number, value: string) => {
    const newOptions = [...(editedQuestions[idx]?.options || generatedContent?.quiz?.questions[idx].options || [])];
    newOptions[optIdx] = value;
    updateEditedQuestion(idx, 'options', newOptions);
  };

  // Get question data (edited or original)
  const getQuestionData = (idx: number) => {
    if (editedQuestions[idx]) {
      return editedQuestions[idx];
    }
    return generatedContent?.quiz?.questions[idx];
  };

  const handleAddToModule = async (moduleType: 'course' | 'quiz' | 'video') => {
    if (!generatedContent) return;

    // For quiz, check if any questions are selected
    if (moduleType === 'quiz' && selectedQuestions.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 câu hỏi để thêm vào Quiz!', { duration: 4000 });
      return;
    }

    const loadingToast = toast.loading(
      moduleType === 'quiz' 
        ? `Đang lưu ${selectedQuestions.length} câu hỏi đã chọn...` 
        : 'Đang lưu nội dung...'
    );

    try {
      // Filter selected questions and merge with edited versions
      let contentToSave = generatedContent;
      if (moduleType === 'quiz' && generatedContent.quiz) {
        const selectedQuestionsData = generatedContent.quiz.questions
          .map((q, idx) => {
            // Use edited version if exists, otherwise original
            return editedQuestions[idx] || q;
          })
          .filter((_, idx) => selectedQuestions.includes(idx));
        
        contentToSave = {
          ...generatedContent,
          quiz: { questions: selectedQuestionsData }
        };
      }

      // Save to database first
      const saveResponse = await fetch('/api/ai-content/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: contentToSave,
          formData: formData,
          moduleType: moduleType,
        }),
      });

      if (!saveResponse.ok) {
        throw new Error('Không thể lưu nội dung');
      }

      const saveData = await saveResponse.json();

      toast.dismiss(loadingToast);
      
      // Show detailed success message without redirect
      if (moduleType === 'course') {
        toast.success(
          `✅ Đã lưu bài học thành công!\n\n📚 Tiêu đề: ${contentToSave.title}\n💾 ID: ${saveData.contentId}\n📁 Loại: ${contentToSave.type}\n\nBạn có thể xem lại trong database (bảng AIGeneratedContent).`, 
          { duration: 8000, style: { minWidth: '400px' } }
        );
      } else if (moduleType === 'quiz') {
        const editedCount = Object.keys(editedQuestions).filter(k => selectedQuestions.includes(parseInt(k))).length;
        toast.success(
          `✅ Đã lưu Quiz thành công!\n\n📝 Tiêu đề: ${contentToSave.title}\n❓ Số câu đã chọn: ${selectedQuestions.length} câu${editedCount > 0 ? `\n✏️  Đã chỉnh sửa: ${editedCount} câu` : ''}\n💾 ID: ${saveData.contentId}\n📊 Độ khó: ${contentToSave.metadata.difficulty}`, 
          { 
            duration: 10000, 
            style: { minWidth: '400px' },
          }
        );
        
        // Show action buttons in a second toast
        setTimeout(() => {
          const viewQuizButton = document.createElement('div');
          viewQuizButton.innerHTML = `
            <div class="flex gap-2 mt-2">
              <a href="/teacher/quizzes/${saveData.contentId}" class="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">
                👁️ Xem Quiz
              </a>
              <button onclick="typeof window !== 'undefined' && location.href='/dashboard/ai-content-generator'" class="px-3 py-1 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600">
                ✨ Tạo Quiz mới
              </button>
            </div>
          `;
          toast(
            `💡 Quiz đã sẵn sàng!\n\nBạn có thể xem chi tiết hoặc tạo quiz mới.`,
            { 
              duration: 8000,
              icon: '🎯'
            }
          );
        }, 1500);
      } else if (moduleType === 'video') {
        toast.success(
          `✅ Đã lưu Video Script thành công!\n\n🎬 Tiêu đề: ${contentToSave.title}\n💾 ID: ${saveData.contentId}\n\nBạn có thể xem lại trong database (bảng AIGeneratedContent).`, 
          { duration: 8000, style: { minWidth: '400px' } }
        );
      }

      // Show info about saved content location
      setTimeout(() => {
        toast(
          '💡 Nội dung đã được lưu vào database.\n\nĐể tích hợp vào Course/Quiz module, cần cấu hình thêm trong Prisma schema.', 
          { duration: 6000, icon: 'ℹ️' }
        );
      }, 1000);
      
    } catch (error: any) {
      console.error('Add to module error:', error);
      toast.dismiss(loadingToast);
      toast.error(error.message || 'Không thể lưu nội dung. Vui lòng thử lại.', { duration: 5000 });
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
                      <option value="grok">🚀 Grok (X.AI - Nhanh, mạnh mẽ)</option>
                      <option value="auto">🤖 Auto (Tự động chọn tốt nhất)</option>
                      <option value="openai">🧠 OpenAI GPT-4 (Chất lượng cao)</option>
                      <option value="ollama">🏠 Ollama (llama3.2:latest - Local AI)</option>
                      <option value="demo">🎭 Demo Mode (Mẫu có sẵn)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.aiModel === 'cursor' && '✅ Sử dụng Cursor API mặc định, nhanh và miễn phí'}
                      {formData.aiModel === 'grok' && '🚀 Sử dụng Grok (X.AI) - Nhanh, mạnh mẽ, cần credits'}
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
                  <option value="grok">🚀 Grok (X.AI - Nhanh, mạnh mẽ)</option>
                  <option value="auto">🤖 Auto (Tự động chọn tốt nhất)</option>
                  <option value="openai">🧠 OpenAI GPT-4 (Chất lượng cao)</option>
                  <option value="ollama">🏠 Ollama (llama3.2:latest - Local AI)</option>
                  <option value="demo">🎭 Demo Mode (Mẫu có sẵn)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.aiModel === 'cursor' && '✅ Sử dụng Cursor API mặc định, nhanh và miễn phí'}
                  {formData.aiModel === 'grok' && '🚀 Sử dụng Grok (X.AI) - Nhanh, mạnh mẽ, cần credits'}
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
                            Chọn các câu hỏi phù hợp để thêm vào Quiz ({selectedQuestions.length}/{generatedContent.quiz.questions.length} đã chọn)
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={selectAllQuestions}
                            className="text-xs px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                          >
                            ✓ Chọn tất cả
                          </button>
                          <button
                            onClick={deselectAllQuestions}
                            className="text-xs px-3 py-1 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                          >
                            ✗ Bỏ chọn tất cả
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Questions List */}
                    {generatedContent.quiz.questions.map((q, idx) => {
                      const isSelected = selectedQuestions.includes(idx);
                      const isEditing = editingQuestion === idx;
                      const questionData = getQuestionData(idx);
                      const isEdited = !!editedQuestions[idx];
                      
                      return (
                        <div 
                          key={idx} 
                          className={`border-2 rounded-xl p-5 transition-all shadow-sm ${
                            isEditing 
                              ? 'border-blue-500 bg-blue-50' 
                              : isSelected 
                                ? 'border-green-400 bg-green-50' 
                                : 'border-gray-200 bg-white hover:border-indigo-300'
                          }`}
                        >
                          {/* Question Header with Checkbox */}
                          <div className="flex items-start gap-3 mb-3">
                            {/* Checkbox */}
                            <div className="pt-1">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleQuestionSelection(idx)}
                                className="w-5 h-5 text-green-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-green-500 cursor-pointer"
                                disabled={isEditing}
                              />
                            </div>
                            
                            {/* Question Content */}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`font-bold px-3 py-1 rounded-full text-sm ${
                                  isEditing
                                    ? 'bg-blue-500 text-white'
                                    : isSelected 
                                      ? 'bg-green-500 text-white' 
                                      : 'bg-indigo-100 text-indigo-700'
                                }`}>
                                  Câu {idx + 1}
                                </span>
                                <span className="text-xs text-gray-500">
                                  ({questionData.options.length} đáp án)
                                </span>
                                {isEdited && !isEditing && (
                                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium">
                                    ✏️ Đã chỉnh sửa
                                  </span>
                                )}
                                {isSelected && !isEditing && (
                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                                    ✓ Đã chọn
                                  </span>
                                )}
                                {isEditing && (
                                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                                    ✏️ Đang chỉnh sửa
                                  </span>
                                )}
                              </div>
                              
                              {/* Question Text - Editable */}
                              {isEditing ? (
                                <textarea
                                  value={questionData.question}
                                  onChange={(e) => updateEditedQuestion(idx, 'question', e.target.value)}
                                  className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-semibold text-gray-900"
                                  rows={2}
                                />
                              ) : (
                                <p className="font-semibold text-gray-900 text-base leading-relaxed">
                                  {questionData.question}
                                </p>
                              )}
                            </div>
                          </div>

                        {/* Options - Editable */}
                        <div className="space-y-2 mb-4">
                          {questionData.options.map((opt: string, optIdx: number) => (
                            <div 
                              key={optIdx}
                              className={`p-3 rounded-lg border-2 transition-all ${
                                optIdx === questionData.correctAnswer 
                                  ? 'bg-green-50 border-green-400 text-green-800' 
                                  : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {isEditing && (
                                  <input
                                    type="radio"
                                    name={`correct-answer-${idx}`}
                                    checked={optIdx === questionData.correctAnswer}
                                    onChange={() => updateEditedQuestion(idx, 'correctAnswer', optIdx)}
                                    className="w-4 h-4 text-green-600"
                                  />
                                )}
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={opt}
                                    onChange={(e) => updateEditedOption(idx, optIdx, e.target.value)}
                                    className="flex-1 px-2 py-1 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500"
                                  />
                                ) : (
                                  <span className="flex-1">{opt}</span>
                                )}
                                {!isEditing && optIdx === questionData.correctAnswer && (
                                  <span className="ml-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                                    ✓ Đúng
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Explanation - Editable */}
                        <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r-lg">
                          <div className="flex items-start gap-2">
                            <span className="text-amber-600 font-semibold text-sm mt-0.5">💡 Giải thích:</span>
                            {isEditing ? (
                              <textarea
                                value={questionData.explanation}
                                onChange={(e) => updateEditedQuestion(idx, 'explanation', e.target.value)}
                                className="flex-1 px-2 py-1 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                rows={2}
                              />
                            ) : (
                              <p className="text-sm text-amber-800 flex-1 leading-relaxed">
                                {questionData.explanation}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
                          <div className="text-xs text-gray-500">
                            Đáp án đúng: <span className="font-semibold text-green-600">
                              {String.fromCharCode(65 + questionData.correctAnswer)}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => saveEditedQuestion(idx)}
                                  className="text-xs px-4 py-2 rounded-lg font-medium bg-blue-500 text-white hover:bg-blue-600 transition-all flex items-center gap-1"
                                >
                                  <Check className="h-3 w-3" />
                                  Lưu
                                </button>
                                <button
                                  onClick={cancelEditingQuestion}
                                  className="text-xs px-4 py-2 rounded-lg font-medium bg-gray-500 text-white hover:bg-gray-600 transition-all flex items-center gap-1"
                                >
                                  <X className="h-3 w-3" />
                                  Hủy
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEditingQuestion(idx)}
                                  className="text-xs px-4 py-2 rounded-lg font-medium bg-orange-500 text-white hover:bg-orange-600 transition-all flex items-center gap-1"
                                >
                                  <Edit className="h-3 w-3" />
                                  Sửa
                                </button>
                                <button
                                  onClick={() => toggleQuestionSelection(idx)}
                                  className={`text-xs px-4 py-2 rounded-lg font-medium transition-all ${
                                    isSelected
                                      ? 'bg-red-500 text-white hover:bg-red-600'
                                      : 'bg-green-500 text-white hover:bg-green-600'
                                  }`}
                                >
                                  {isSelected ? '✗ Bỏ chọn' : '✓ Chọn câu này'}
                                </button>
                                <button
                                  onClick={() => {
                                    const text = `${questionData.question}\n\n${questionData.options.join('\n')}\n\nĐáp án: ${String.fromCharCode(65 + questionData.correctAnswer)}\nGiải thích: ${questionData.explanation}`;
                                    navigator.clipboard.writeText(text);
                                    toast.success(`Đã sao chép câu ${idx + 1}`);
                                  }}
                                  className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                >
                                  📋 Copy
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                    })}

                    {/* Summary Footer */}
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-white p-2 rounded-lg">
                            <FileText className="h-5 w-5 text-indigo-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {selectedQuestions.length} / {generatedContent.quiz.questions.length} câu hỏi đã chọn
                            </p>
                            <p className="text-sm text-gray-600">
                              {selectedQuestions.length === 0 
                                ? 'Chọn ít nhất 1 câu để thêm vào Quiz' 
                                : `Sẵn sàng thêm ${selectedQuestions.length} câu vào Quiz`
                              }
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAddToModule('quiz')}
                          disabled={selectedQuestions.length === 0}
                          className={`px-6 py-3 font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl flex items-center gap-2 ${
                            selectedQuestions.length === 0
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700'
                          }`}
                        >
                          <span>✓</span>
                          <span>Thêm {selectedQuestions.length} câu vào Quiz</span>
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
                    {generatedContent.slides?.map((slide) => (
                      <div key={slide.slideNumber} className="border-2 border-gray-200 rounded-xl p-5 bg-white shadow-sm hover:border-indigo-300 transition-all">
                        <div className="flex items-center justify-between mb-3">
                          <span className="bg-indigo-100 text-indigo-700 font-bold px-3 py-1 rounded-full text-sm">
                            Slide {slide.slideNumber}/{(generatedContent.slides && generatedContent.slides.length) || 0}
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

