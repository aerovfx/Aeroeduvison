"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  FileText, 
  Edit, 
  Trash2, 
  CheckCircle,
  Clock,
  Users,
  Download,
  BarChart3,
  XCircle,
  Loader2
} from "lucide-react";
import toast from "react-hot-toast";

export default function QuizDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [quiz, setQuiz] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedQuiz, setEditedQuiz] = useState<any>(null);
  const [editingQuestion, setEditingQuestion] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Export quiz as JSON
  const handleExportJSON = () => {
    if (!quiz) return;
    
    const exportData = {
      title: quiz.title,
      subject: quiz.subject,
      grade: quiz.grade,
      topic: quiz.topic,
      difficulty: quiz.difficulty,
      estimatedDuration: quiz.estimatedDuration,
      questions: quiz.quiz?.questions || [],
      metadata: {
        exportedAt: new Date().toISOString(),
        exportedBy: session?.user?.email,
      }
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${quiz.title.replace(/[^a-z0-9]/gi, '_')}_${new Date().getTime()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('✅ Đã export JSON thành công!', { duration: 3000 });
  };

  // Enter edit mode
  const handleEdit = () => {
    setIsEditMode(true);
    // Initialize editedQuiz with current quiz data
    setEditedQuiz(JSON.parse(JSON.stringify(quiz))); // Deep copy
    toast.info('📝 Chế độ chỉnh sửa đã được bật!', { duration: 3000 });
  };

  // Cancel edit mode
  const handleCancelEdit = () => {
    if (confirm('Bạn có chắc muốn hủy các thay đổi?')) {
      setIsEditMode(false);
      setEditedQuiz(null);
      setEditingQuestion(null);
      toast('Đã hủy chỉnh sửa', { duration: 2000 });
    }
  };

  // Save edited quiz
  const handleSaveEdit = async () => {
    if (!editedQuiz) return;
    
    setIsSaving(true);
    const loadingToast = toast.loading('Đang lưu thay đổi...');
    
    try {
      // Update quiz in database
      const response = await fetch(`/api/ai-content/${params.quizId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editedQuiz.title,
          content: editedQuiz.content || editedQuiz,
          subject: editedQuiz.subject,
          grade: editedQuiz.grade,
          topic: editedQuiz.topic,
          difficulty: editedQuiz.difficulty,
        }),
      });

      if (response.ok) {
        const updated = await response.json();
        setQuiz(updated);
        setIsEditMode(false);
        setEditedQuiz(null);
        toast.dismiss(loadingToast);
        toast.success('✅ Đã lưu thay đổi thành công!', { duration: 3000 });
      } else {
        toast.dismiss(loadingToast);
        toast.error('❌ Không thể lưu thay đổi!');
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('❌ Có lỗi xảy ra!');
    } finally {
      setIsSaving(false);
    }
  };

  // Update question in edit mode
  const updateQuestion = (qIdx: number, field: string, value: any) => {
    if (!editedQuiz?.quiz?.questions) return;
    
    const newQuestions = [...editedQuiz.quiz.questions];
    newQuestions[qIdx] = {
      ...newQuestions[qIdx],
      [field]: value
    };
    
    setEditedQuiz({
      ...editedQuiz,
      quiz: {
        ...editedQuiz.quiz,
        questions: newQuestions
      }
    });
  };

  // Update option
  const updateOption = (qIdx: number, optIdx: number, value: string) => {
    if (!editedQuiz?.quiz?.questions) return;
    
    const newQuestions = [...editedQuiz.quiz.questions];
    const newOptions = [...newQuestions[qIdx].options];
    newOptions[optIdx] = value;
    newQuestions[qIdx] = {
      ...newQuestions[qIdx],
      options: newOptions
    };
    
    setEditedQuiz({
      ...editedQuiz,
      quiz: {
        ...editedQuiz.quiz,
        questions: newQuestions
      }
    });
  };

  // Delete quiz
  const handleDelete = async () => {
    if (!confirm('Bạn có chắc muốn xóa quiz này?')) return;
    
    try {
      const response = await fetch(`/api/ai-content/${params.quizId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('✅ Đã xóa quiz thành công!');
        router.push('/teacher/quizzes');
      } else {
        toast.error('❌ Không thể xóa quiz!');
      }
    } catch (error) {
      toast.error('❌ Có lỗi xảy ra!');
    }
  };

  useEffect(() => {
    const loadQuiz = async () => {
      try {
        // Try to load from AIGeneratedContent table
        const response = await fetch(`/api/ai-content/${params.quizId}`);
        
        if (response.ok) {
          const data = await response.json();
          setQuiz(data);
        } else {
          toast.error("Không tìm thấy quiz này!");
        }
      } catch (error) {
        console.error("Load quiz error:", error);
        toast.error("Có lỗi khi tải quiz!");
      } finally {
        setLoading(false);
      }
    };

    if (params.quizId) {
      loadQuiz();
    }
  }, [params.quizId]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Quiz không tồn tại</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Quiz với ID <code className="bg-gray-100 px-2 py-1 rounded">{params.quizId}</code> không được tìm thấy trong hệ thống.
            </p>
            <div className="space-y-2">
              <p className="text-sm text-gray-500">
                💡 <strong>Gợi ý:</strong> Nội dung đã được lưu vào bảng <code>AIGeneratedContent</code>.
              </p>
              <p className="text-sm text-gray-500">
                Để xem quiz này, hãy truy cập database hoặc tạo API endpoint mới.
              </p>
            </div>
            <div className="flex gap-3 mt-6">
              <Button onClick={() => router.push("/dashboard/ai-content-generator")} variant="default">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Về AI Generator
              </Button>
              <Button onClick={() => router.push("/teacher/quizzes")} variant="outline">
                Danh sách Quiz
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Parse quiz content if it's JSON string
  let quizData = quiz;
  if (typeof quiz.content === 'string') {
    try {
      quizData = JSON.parse(quiz.content);
    } catch (e) {
      quizData = quiz;
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Button 
          onClick={() => router.back()} 
          variant="ghost" 
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Quay lại
        </Button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{quizData.title || quiz.title}</h1>
            <div className="flex items-center gap-3 mt-2">
              <Badge variant="outline">{quiz.subject || 'Tổng hợp'}</Badge>
              <Badge variant="outline">{quiz.grade || 'Tự chọn'}</Badge>
              <Badge className="bg-green-100 text-green-700">{quiz.status || 'draft'}</Badge>
            </div>
          </div>
          <div className="flex gap-2">
            {isEditMode ? (
              <>
                <Button 
                  size="sm" 
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Lưu thay đổi
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Hủy
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={handleEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Chỉnh sửa
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportJSON}>
                  <Download className="h-4 w-4 mr-2" />
                  Export JSON
                </Button>
                <Button variant="destructive" size="sm" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Xóa
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Quiz Info */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-500">Số câu hỏi</p>
                <p className="text-2xl font-bold">{quizData.quiz?.questions?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-500">Thời gian</p>
                <p className="text-2xl font-bold">{quiz.estimatedDuration || 45} phút</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-500">Lượt làm</p>
                <p className="text-2xl font-bold">0</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-500">Điểm TB</p>
                <p className="text-2xl font-bold">--</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Questions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Danh sách câu hỏi</CardTitle>
            {isEditMode && (
              <Badge className="bg-blue-100 text-blue-700">
                ✏️ Chế độ chỉnh sửa
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {(isEditMode ? editedQuiz?.quiz?.questions : quizData.quiz?.questions) ? (
            <div className="space-y-4">
              {(isEditMode ? editedQuiz.quiz.questions : quizData.quiz.questions).map((q: any, idx: number) => {
                const isEditing = editingQuestion === idx;
                
                return (
                  <div 
                    key={idx} 
                    className={`border-2 rounded-lg p-4 transition-all ${
                      isEditing 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`font-bold px-3 py-1 rounded-full text-sm ${
                        isEditing 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-indigo-100 text-indigo-700'
                      }`}>
                        Câu {idx + 1}
                      </span>
                      <div className="flex-1">
                        {/* Question - Editable in edit mode */}
                        {isEditMode ? (
                          isEditing ? (
                            <textarea
                              value={q.question}
                              onChange={(e) => updateQuestion(idx, 'question', e.target.value)}
                              className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-semibold text-gray-900 mb-3"
                              rows={2}
                            />
                          ) : (
                            <p className="font-semibold text-gray-900 mb-3">{q.question}</p>
                          )
                        ) : (
                          <p className="font-semibold text-gray-900 mb-3">{q.question}</p>
                        )}
                        
                        {/* Options - Editable in edit mode */}
                        <div className="space-y-2 mb-3">
                          {q.options?.map((opt: string, optIdx: number) => (
                            <div 
                              key={optIdx}
                              className={`p-2 rounded-lg border ${
                                optIdx === q.correctAnswer 
                                  ? 'bg-green-50 border-green-400 text-green-800' 
                                  : 'bg-gray-50 border-gray-200'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {isEditMode && isEditing && (
                                  <input
                                    type="radio"
                                    name={`correct-${idx}`}
                                    checked={optIdx === q.correctAnswer}
                                    onChange={() => updateQuestion(idx, 'correctAnswer', optIdx)}
                                    className="w-4 h-4 text-green-600"
                                  />
                                )}
                                {isEditMode && isEditing ? (
                                  <input
                                    type="text"
                                    value={opt}
                                    onChange={(e) => updateOption(idx, optIdx, e.target.value)}
                                    className="flex-1 px-2 py-1 border border-blue-300 rounded"
                                  />
                                ) : (
                                  <span className="flex-1">{opt}</span>
                                )}
                                {optIdx === q.correctAnswer && (
                                  <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                                    ✓ Đúng
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {/* Explanation - Editable in edit mode */}
                        {q.explanation && (
                          <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r-lg">
                            {isEditMode && isEditing ? (
                              <textarea
                                value={q.explanation}
                                onChange={(e) => updateQuestion(idx, 'explanation', e.target.value)}
                                className="w-full px-2 py-1 border-2 border-blue-300 rounded-lg text-sm"
                                rows={2}
                              />
                            ) : (
                              <p className="text-sm text-amber-800">
                                <span className="font-semibold">💡 Giải thích:</span> {q.explanation}
                              </p>
                            )}
                          </div>
                        )}
                        
                        {/* Edit button for each question in edit mode */}
                        {isEditMode && (
                          <div className="mt-3 pt-3 border-t border-gray-200 flex justify-end">
                            {isEditing ? (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setEditingQuestion(null);
                                  toast.success(`Đã lưu câu ${idx + 1}`, { duration: 2000 });
                                }}
                                className="bg-blue-500 hover:bg-blue-600"
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Xong
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingQuestion(idx)}
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                Sửa câu này
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p>Không có câu hỏi nào</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="mt-6 flex gap-3">
        <Button onClick={() => router.push("/dashboard/ai-content-generator")}>
          Tạo Quiz mới
        </Button>
        <Button variant="outline" onClick={() => router.push("/teacher/quizzes")}>
          Danh sách Quiz
        </Button>
      </div>
    </div>
  );
}

