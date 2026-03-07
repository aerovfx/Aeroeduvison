"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Clock, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Download
} from "lucide-react";

interface Question {
  id: number;
  question: string;
  options: string[];
  type?: "multiple-choice" | "true-false";
  points?: number;
}

interface EducationQuizInterfaceProps {
  quizData: {
    id: string;
    title: string;
    description: string;
    timeLimit: number; // in minutes
    totalQuestions: number;
    questions: Question[];
  };
  onSubmit: (answers: Record<number, number>) => void;
  onBack?: () => void;
}

export const EducationQuizInterface = ({
  quizData,
  onSubmit,
  onBack
}: EducationQuizInterfaceProps) => {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [part2Answers, setPart2Answers] = useState<Record<string, boolean>>({});
  const [part3Answers, setPart3Answers] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState(quizData.timeLimit * 60); // Convert to seconds
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Timer effect
  useEffect(() => {
    if (timeLeft > 0 && !isSubmitted) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      handleSubmit();
    }
  }, [timeLeft, isSubmitted]);

  const handleAnswerSelect = (questionId: string | number, answerIndex: number | boolean) => {
    if (typeof questionId === 'string') {
      if (questionId.startsWith('part2_')) {
        // PHẦN II: True/False logic
        const parts = questionId.split('_');
        const questionIndex = parts[1]; // part2_0, part2_1, etc.
        const optionIndex = parts[2]; // part2_0_0, part2_0_1, etc.
        const choiceType = parts[3]; // 'true' or 'false'
        
        setPart2Answers(prev => {
          const newAnswers = { ...prev };
          
          // Clear all answers for this question and option
          Object.keys(newAnswers).forEach(key => {
            if (key.startsWith(`part2_${questionIndex}_${optionIndex}_`)) {
              delete newAnswers[key];
            }
          });
          
          // Set the new answer
          newAnswers[questionId] = answerIndex as boolean;
          
          return newAnswers;
        });
      } else if (questionId.startsWith('part3_')) {
        // PHẦN III: Simplified row-column logic
        const parts = questionId.split('_');
        const questionIndex = parts[1]; // part3_0, part3_1, etc.
        const rowInfo = parts[2]; // row1, row2, row3-row12
        const colInfo = parts[3]; // col2, col3, col4, col5
        
        setPart3Answers(prev => {
          const newAnswers = { ...prev };
          const column = colInfo; // col2, col3, col4, col5
          
          // Check if the clicked cell is already selected
          const isCurrentlySelected = prev[questionId] !== undefined;
          
          // Clear all selections in the same column for this question
          Object.keys(newAnswers).forEach(key => {
            if (key.startsWith(`part3_${questionIndex}_`) && key.includes(column)) {
              delete newAnswers[key];
            }
          });
          
          // Toggle behavior: if not currently selected, select it
          if (!isCurrentlySelected) {
            newAnswers[questionId] = answerIndex as number;
          }
          
          return newAnswers;
        });
      }
    } else {
      // PHẦN I: Multiple choice
      setAnswers(prev => ({
        ...prev,
        [questionId]: answerIndex as number
      }));
    }
  };

  const handleSubmit = () => {
    setIsSubmitted(true);
    onSubmit(answers);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const answeredCountPart1 = Object.keys(answers).length;
  const answeredCountPart2 = Math.floor(Object.keys(part2Answers).length / 4); // Each question has 4 options
  const answeredCountPart3 = Object.keys(part3Answers).length;
  const totalAnswered = answeredCountPart1 + answeredCountPart2 + answeredCountPart3;
  const totalQuestions = quizData.totalQuestions + 16 + 24; // 40 + 16 (part2: 4 questions × 4 options) + 24 (part3: 6 questions × 4 positions)
  const progress = (totalAnswered / totalQuestions) * 100;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Bộ Giáo dục Header */}
      <div className="bg-white border-b-2 border-black py-3">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center">
            <div className="text-xs font-bold mb-1">BỘ GIÁO DỤC VÀ ĐÀO TẠO</div>
            <div className="text-xs font-bold mb-1">ĐỀ THI CHÍNH THỨC</div>
            <div className="text-xs font-bold mb-2">(Đề thi có {Math.ceil(quizData.totalQuestions / 4)} trang)</div>
            <div className="text-sm font-bold">{quizData.title}</div>
            <div className="text-xs mt-1">Thời gian làm bài: {quizData.timeLimit} phút (không kể thời gian phát đề)</div>
            <div className="text-xs">Mã đề thi: {quizData.id.toUpperCase()}</div>
          </div>
        </div>
      </div>

      {/* Timer và Progress - Fixed Top */}
      <div className="bg-blue-600 text-white py-2 px-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="font-mono text-lg">{formatTime(timeLeft)}</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>{totalAnswered}/{totalQuestions} câu</span>
            </div>
          </div>
          <Progress value={progress} className="w-48" />
          <Button 
            onClick={onBack}
            variant="outline" 
            size="sm"
            className="text-white border-white hover:bg-white hover:text-blue-600"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Quay lại
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - PDF Content (Questions) */}
          <div className="bg-white border-2 border-gray-400 shadow-lg">
            {/* PDF Header */}
            <div className="bg-gray-800 text-white p-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="text-sm font-medium">Đề thi - Trang 1/{Math.ceil(quizData.totalQuestions / 4)}</span>
              </div>
              <Button size="sm" variant="outline" className="text-white border-white hover:bg-white hover:text-gray-800">
                <Download className="h-3 w-3 mr-1" />
                Tải về
              </Button>
            </div>
            
            {/* PDF Content - Questions */}
            <div className="p-6 bg-gray-50 min-h-[800px] max-h-[800px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
              <div className="space-y-6">
                {quizData.questions.map((question, index) => (
                  <div key={question.id} className="bg-white p-4 border border-gray-300 rounded shadow-sm">
                    <div className="text-sm font-medium mb-2">
                      Câu {index + 1}. {question.question}
                    </div>
                    <div className="space-y-1">
                      {question.options.map((option, optIndex) => (
                        <div key={optIndex} className="text-sm flex items-start gap-2">
                          <span className="font-medium min-w-[20px]">
                            {String.fromCharCode(65 + optIndex)}.
                          </span>
                          <span>{option}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* PDF Footer */}
              <div className="mt-8 text-center text-xs text-gray-500 border-t pt-4">
                Trang 1/{Math.ceil(quizData.totalQuestions / 4)} - Mã đề {quizData.id.toUpperCase()}
              </div>
            </div>
          </div>

          {/* Right Panel - Answer Sheet (Phiếu trả lời) */}
          <div className="bg-white border-2 border-gray-400 shadow-lg">
            {/* Answer Sheet Header */}
            <div className="bg-blue-600 text-white p-3 text-center">
              <h2 className="text-lg font-bold">PHIẾU TRẢ LỜI</h2>
              <p className="text-blue-100 text-sm">Trắc nghiệm khách quan</p>
            </div>
            
            {/* Answer Grid */}
            <div className="p-4 max-h-[800px] overflow-y-auto">
              <div className="space-y-4">
                {/* Instructions */}
                <div className="bg-yellow-50 border border-yellow-200 p-2 rounded text-xs">
                  <p className="font-medium text-yellow-800 mb-1">HƯỚNG DẪN:</p>
                  <p className="text-yellow-700">- Tô đen hoàn toàn ô tròn tương ứng với đáp án đã chọn</p>
                  <p className="text-yellow-700">- Chỉ được tô một đáp án cho mỗi câu hỏi</p>
                </div>

                {/* PHẦN I - Trắc nghiệm đa lựa chọn */}
                <div className="bg-pink-100 border-2 border-pink-300 p-3 rounded">
                  <div className="text-center text-sm font-bold mb-3 text-blue-600">PHẦN I</div>
                  <div className="grid grid-cols-4 gap-2">
                    {/* Questions 1-10 */}
                    <div className="space-y-1">
                      <div className="text-center text-xs font-bold mb-2">1-10</div>
                      <div className="grid grid-cols-5 gap-1 mb-2">
                        <div className="text-center font-medium text-red-600"></div>
                        <div className="text-center font-medium text-red-600">A</div>
                        <div className="text-center font-medium text-red-600">B</div>
                        <div className="text-center font-medium text-red-600">C</div>
                        <div className="text-center font-medium text-red-600">D</div>
                      </div>
                      {Array.from({ length: 10 }, (_, index) => {
                        const questionId = quizData.questions[index]?.id;
                        const selectedAnswer = questionId ? answers[questionId] : undefined;
                        
                        return (
                          <div key={index} className="grid grid-cols-5 gap-1 text-xs">
                            <div className="text-center font-medium">{index + 1}.</div>
                            {['A', 'B', 'C', 'D'].map((letter, letterIndex) => (
                              <div key={letter} className="flex justify-center">
                                <div
                                  className={`w-4 h-4 rounded-full border border-red-500 cursor-pointer transition-all ${
                                    selectedAnswer === letterIndex
                                      ? 'bg-black'
                                      : 'bg-white hover:bg-gray-200'
                                  }`}
                                  onClick={() => handleAnswerSelect(questionId || 0, letterIndex)}
                                >
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>

                    {/* Questions 11-20 */}
                    <div className="space-y-1">
                      <div className="text-center text-xs font-bold mb-2">11-20</div>
                      <div className="grid grid-cols-5 gap-1 mb-2">
                        <div className="text-center font-medium text-red-600"></div>
                        <div className="text-center font-medium text-red-600">A</div>
                        <div className="text-center font-medium text-red-600">B</div>
                        <div className="text-center font-medium text-red-600">C</div>
                        <div className="text-center font-medium text-red-600">D</div>
                      </div>
                      {Array.from({ length: 10 }, (_, index) => {
                        const actualIndex = index + 10;
                        const questionId = quizData.questions[actualIndex]?.id;
                        const selectedAnswer = questionId ? answers[questionId] : undefined;
                        
                        return (
                          <div key={actualIndex} className="grid grid-cols-5 gap-1 text-xs">
                            <div className="text-center font-medium">{actualIndex + 1}.</div>
                            {['A', 'B', 'C', 'D'].map((letter, letterIndex) => (
                              <div key={letter} className="flex justify-center">
                                <div
                                  className={`w-4 h-4 rounded-full border border-red-500 cursor-pointer transition-all ${
                                    selectedAnswer === letterIndex
                                      ? 'bg-black'
                                      : 'bg-white hover:bg-gray-200'
                                  }`}
                                  onClick={() => handleAnswerSelect(questionId || 0, letterIndex)}
                                >
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>

                    {/* Questions 21-30 */}
                    <div className="space-y-1">
                      <div className="text-center text-xs font-bold mb-2">21-30</div>
                      <div className="grid grid-cols-5 gap-1 mb-2">
                        <div className="text-center font-medium text-red-600"></div>
                        <div className="text-center font-medium text-red-600">A</div>
                        <div className="text-center font-medium text-red-600">B</div>
                        <div className="text-center font-medium text-red-600">C</div>
                        <div className="text-center font-medium text-red-600">D</div>
                      </div>
                      {Array.from({ length: 10 }, (_, index) => {
                        const actualIndex = index + 20;
                        const questionId = quizData.questions[actualIndex]?.id;
                        const selectedAnswer = questionId ? answers[questionId] : undefined;
                        
                        return (
                          <div key={actualIndex} className="grid grid-cols-5 gap-1 text-xs">
                            <div className="text-center font-medium">{actualIndex + 1}.</div>
                            {['A', 'B', 'C', 'D'].map((letter, letterIndex) => (
                              <div key={letter} className="flex justify-center">
                                <div
                                  className={`w-4 h-4 rounded-full border border-red-500 cursor-pointer transition-all ${
                                    selectedAnswer === letterIndex
                                      ? 'bg-black'
                                      : 'bg-white hover:bg-gray-200'
                                  }`}
                                  onClick={() => handleAnswerSelect(questionId || 0, letterIndex)}
                                >
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>

                    {/* Questions 31-40 */}
                    <div className="space-y-1">
                      <div className="text-center text-xs font-bold mb-2">31-40</div>
                      <div className="grid grid-cols-5 gap-1 mb-2">
                        <div className="text-center font-medium text-red-600"></div>
                        <div className="text-center font-medium text-red-600">A</div>
                        <div className="text-center font-medium text-red-600">B</div>
                        <div className="text-center font-medium text-red-600">C</div>
                        <div className="text-center font-medium text-red-600">D</div>
                      </div>
                      {Array.from({ length: 10 }, (_, index) => {
                        const actualIndex = index + 30;
                        const questionId = quizData.questions[actualIndex]?.id;
                        const selectedAnswer = questionId ? answers[questionId] : undefined;
                        
                        return (
                          <div key={actualIndex} className="grid grid-cols-5 gap-1 text-xs">
                            <div className="text-center font-medium">{actualIndex + 1}.</div>
                            {['A', 'B', 'C', 'D'].map((letter, letterIndex) => (
                              <div key={letter} className="flex justify-center">
                                <div
                                  className={`w-4 h-4 rounded-full border border-red-500 cursor-pointer transition-all ${
                                    selectedAnswer === letterIndex
                                      ? 'bg-black'
                                      : 'bg-white hover:bg-gray-200'
                                  }`}
                                  onClick={() => handleAnswerSelect(questionId || 0, letterIndex)}
                                >
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* PHẦN II - Câu đúng/sai */}
                <div className="bg-pink-100 border-2 border-pink-300 p-3 rounded">
                  <div className="text-center text-sm font-bold mb-3 text-blue-600">PHẦN II</div>
                  <div className="grid grid-cols-4 gap-4">
                    {Array.from({ length: 4 }, (_, index) => (
                      <div key={index} className="border border-red-500 p-2 rounded">
                        <div className="text-center text-xs font-bold mb-2">Câu {index + 1}</div>
                        <div className="text-xs">
                          <div className="grid grid-cols-3 gap-1 mb-2">
                            <div className="text-center font-medium text-red-600"></div>
                            <div className="text-center font-medium text-red-600">Đúng</div>
                            <div className="text-center font-medium text-red-600">Sai</div>
                          </div>
                          {['a)', 'b)', 'c)', 'd)'].map((option, optIndex) => (
                            <div key={option} className="grid grid-cols-3 gap-1 mb-1">
                              <div className="text-center">{option}</div>
                              <div className="flex justify-center">
                                <div 
                                  className={`w-3 h-3 rounded-full border border-red-500 cursor-pointer hover:bg-gray-200 ${
                                    part2Answers[`part2_${index}_${optIndex}_true`] === true ? 'bg-black' : 'bg-white'
                                  }`}
                                  onClick={() => handleAnswerSelect(`part2_${index}_${optIndex}_true`, true)}
                                ></div>
                              </div>
                              <div className="flex justify-center">
                                <div 
                                  className={`w-3 h-3 rounded-full border border-red-500 cursor-pointer hover:bg-gray-200 ${
                                    part2Answers[`part2_${index}_${optIndex}_false`] === false ? 'bg-black' : 'bg-white'
                                  }`}
                                  onClick={() => handleAnswerSelect(`part2_${index}_${optIndex}_false`, false)}
                                ></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* PHẦN III - Đáp án số */}
                <div className="bg-pink-100 border-2 border-pink-300 p-3 rounded">
                  <div className="flex justify-between items-center mb-3">
                    <div className="text-sm font-bold text-blue-600">PHẦN III</div>
                    <div className="text-xs text-gray-600">Hướng dẫn điền đáp án số</div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {/* Row 1: Câu 1-3 */}
                    {Array.from({ length: 3 }, (_, index) => (
                      <div key={index} className="text-center">
                        <div className="text-xs font-bold mb-2">Câu {index + 1}</div>
                        <div className="space-y-1">
                          {/* 4 ô vuông hiển thị kết quả */}
                          <div className="grid grid-cols-5 gap-1 mb-2">
                            <div className="w-6 h-6"></div>
                            {Array.from({ length: 4 }, (_, squareIndex) => {
                              const column = squareIndex + 2; // Cột 2, 3, 4, 5
                              
                              // Tìm ký tự được chọn cho cột này
                              let displayChar = '';
                              
                              // Kiểm tra dấu trừ (chỉ cột 2)
                              if (column === 2 && part3Answers[`part3_${index}_row1_col${column}`]) {
                                displayChar = '-';
                              }
                              // Kiểm tra dấu phẩy (chỉ cột 3, 4)
                              else if ((column === 3 || column === 4) && part3Answers[`part3_${index}_row2_col${column}`]) {
                                displayChar = ',';
                              }
                              // Kiểm tra số 0-9 (tất cả cột 2,3,4,5)
                              else {
                                for (let digit = 0; digit <= 9; digit++) {
                                  if (part3Answers[`part3_${index}_row${digit + 3}_col${column}`]) {
                                    displayChar = digit.toString();
                                    break;
                                  }
                                }
                              }
                              
                              return (
                                <div
                                  key={squareIndex}
                                  className="w-6 h-6 border-2 border-red-500 bg-white text-center text-xs flex items-center justify-center font-bold"
                                >
                                  {displayChar}
                                </div>
                              );
                            })}
                          </div>
                          
                          {/* Header row */}
                          <div className="grid grid-cols-5 gap-1 mb-2">
                            <div className="text-center font-medium text-red-600"></div>
                            <div className="text-center font-medium text-red-600">2</div>
                            <div className="text-center font-medium text-red-600">3</div>
                            <div className="text-center font-medium text-red-600">4</div>
                            <div className="text-center font-medium text-red-600">5</div>
                          </div>
                          
                          {/* Selection options */}
                          <div className="space-y-1">
                            {/* Dấu trừ - chỉ cột 2 */}
                            <div className="grid grid-cols-5 gap-1">
                              <div className="text-center text-xs">-</div>
                              <div className="flex justify-center">
                                <div 
                                  className={`w-3 h-3 rounded-full border border-red-500 cursor-pointer hover:bg-gray-200 ${
                                    part3Answers[`part3_${index}_row1_col2`] ? 'bg-black' : 'bg-white'
                                  }`}
                                  onClick={() => handleAnswerSelect(`part3_${index}_row1_col2`, 1)}
                                ></div>
                              </div>
                              <div className="w-3 h-3"></div>
                              <div className="w-3 h-3"></div>
                              <div className="w-3 h-3"></div>
                            </div>
                            
                            {/* Dấu phẩy - chỉ cột 3, 4 */}
                            <div className="grid grid-cols-5 gap-1">
                              <div className="text-center text-xs">,</div>
                              <div className="w-3 h-3"></div>
                              <div className="flex justify-center">
                                <div 
                                  className={`w-3 h-3 rounded-full border border-red-500 cursor-pointer hover:bg-gray-200 ${
                                    part3Answers[`part3_${index}_row2_col3`] ? 'bg-black' : 'bg-white'
                                  }`}
                                  onClick={() => handleAnswerSelect(`part3_${index}_row2_col3`, 2)}
                                ></div>
                              </div>
                              <div className="flex justify-center">
                                <div 
                                  className={`w-3 h-3 rounded-full border border-red-500 cursor-pointer hover:bg-gray-200 ${
                                    part3Answers[`part3_${index}_row2_col4`] ? 'bg-black' : 'bg-white'
                                  }`}
                                  onClick={() => handleAnswerSelect(`part3_${index}_row2_col4`, 2)}
                                ></div>
                              </div>
                              <div className="w-3 h-3"></div>
                            </div>
                            
                            {/* Số 0-9 - tất cả 4 cột */}
                            {Array.from({ length: 10 }, (_, digitIndex) => (
                              <div key={digitIndex} className="grid grid-cols-5 gap-1">
                                <div className="text-center text-xs">{digitIndex}</div>
                                {Array.from({ length: 4 }, (_, colIndex) => {
                                  const column = colIndex + 2; // Cột 2, 3, 4, 5
                                  const rowNum = digitIndex + 3; // Row 3-12 cho số 0-9
                                  return (
                                    <div key={colIndex} className="flex justify-center">
                                      <div 
                                        className={`w-3 h-3 rounded-full border border-red-500 cursor-pointer hover:bg-gray-200 ${
                                          part3Answers[`part3_${index}_row${rowNum}_col${column}`] ? 'bg-black' : 'bg-white'
                                        }`}
                                        onClick={() => handleAnswerSelect(`part3_${index}_row${rowNum}_col${column}`, digitIndex)}
                                      ></div>
                                    </div>
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Row 2: Câu 4-6 */}
                    {Array.from({ length: 3 }, (_, index) => {
                      const actualIndex = index + 3; // Câu 4, 5, 6
                      return (
                        <div key={actualIndex} className="text-center">
                          <div className="text-xs font-bold mb-2">Câu {actualIndex + 1}</div>
                          <div className="space-y-1">
                            {/* 4 ô vuông hiển thị kết quả */}
                            <div className="grid grid-cols-5 gap-1 mb-2">
                              <div className="w-6 h-6"></div>
                              {Array.from({ length: 4 }, (_, squareIndex) => {
                                const column = squareIndex + 2; // Cột 2, 3, 4, 5
                                
                                // Tìm ký tự được chọn cho cột này
                                let displayChar = '';
                                
                                // Kiểm tra dấu trừ (chỉ cột 2)
                                if (column === 2 && part3Answers[`part3_${actualIndex}_row1_col${column}`]) {
                                  displayChar = '-';
                                }
                                // Kiểm tra dấu phẩy (chỉ cột 3, 4)
                                else if ((column === 3 || column === 4) && part3Answers[`part3_${actualIndex}_row2_col${column}`]) {
                                  displayChar = ',';
                                }
                                // Kiểm tra số 0-9 (tất cả cột 2,3,4,5)
                                else {
                                  for (let digit = 0; digit <= 9; digit++) {
                                    if (part3Answers[`part3_${actualIndex}_row${digit + 3}_col${column}`]) {
                                      displayChar = digit.toString();
                                      break;
                                    }
                                  }
                                }
                                
                                return (
                                  <div 
                                    key={squareIndex}
                                    className="w-6 h-6 border-2 border-red-500 bg-white text-center text-xs flex items-center justify-center font-bold"
                                  >
                                    {displayChar}
                                  </div>
                                );
                              })}
                            </div>
                            
                            {/* Header row */}
                            <div className="grid grid-cols-5 gap-1 mb-2">
                              <div className="text-center font-medium text-red-600"></div>
                              <div className="text-center font-medium text-red-600">2</div>
                              <div className="text-center font-medium text-red-600">3</div>
                              <div className="text-center font-medium text-red-600">4</div>
                              <div className="text-center font-medium text-red-600">5</div>
                            </div>
                            
                            {/* Selection options */}
                            <div className="space-y-1">
                              {/* Dấu trừ - chỉ cột 2 */}
                              <div className="grid grid-cols-5 gap-1">
                                <div className="text-center text-xs">-</div>
                                <div className="flex justify-center">
                                  <div 
                                    className={`w-3 h-3 rounded-full border border-red-500 cursor-pointer hover:bg-gray-200 ${
                                      part3Answers[`part3_${actualIndex}_row1_col2`] ? 'bg-black' : 'bg-white'
                                    }`}
                                    onClick={() => handleAnswerSelect(`part3_${actualIndex}_row1_col2`, 1)}
                                  ></div>
                                </div>
                                <div className="w-3 h-3"></div>
                                <div className="w-3 h-3"></div>
                                <div className="w-3 h-3"></div>
                              </div>
                              
                              {/* Dấu phẩy - chỉ cột 3, 4 */}
                              <div className="grid grid-cols-5 gap-1">
                                <div className="text-center text-xs">,</div>
                                <div className="w-3 h-3"></div>
                                <div className="flex justify-center">
                                  <div 
                                    className={`w-3 h-3 rounded-full border border-red-500 cursor-pointer hover:bg-gray-200 ${
                                      part3Answers[`part3_${actualIndex}_row2_col3`] ? 'bg-black' : 'bg-white'
                                    }`}
                                    onClick={() => handleAnswerSelect(`part3_${actualIndex}_row2_col3`, 2)}
                                  ></div>
                                </div>
                                <div className="flex justify-center">
                                  <div 
                                    className={`w-3 h-3 rounded-full border border-red-500 cursor-pointer hover:bg-gray-200 ${
                                      part3Answers[`part3_${actualIndex}_row2_col4`] ? 'bg-black' : 'bg-white'
                                    }`}
                                    onClick={() => handleAnswerSelect(`part3_${actualIndex}_row2_col4`, 2)}
                                  ></div>
                                </div>
                                <div className="w-3 h-3"></div>
                              </div>
                              
                              {/* Số 0-9 - tất cả 4 cột */}
                              {Array.from({ length: 10 }, (_, digitIndex) => (
                                <div key={digitIndex} className="grid grid-cols-5 gap-1">
                                  <div className="text-center text-xs">{digitIndex}</div>
                                  {Array.from({ length: 4 }, (_, colIndex) => {
                                    const column = colIndex + 2; // Cột 2, 3, 4, 5
                                    const rowNum = digitIndex + 3; // Row 3-12 cho số 0-9
                                    return (
                                      <div key={colIndex} className="flex justify-center">
                                        <div 
                                          className={`w-3 h-3 rounded-full border border-red-500 cursor-pointer hover:bg-gray-200 ${
                                            part3Answers[`part3_${actualIndex}_row${rowNum}_col${column}`] ? 'bg-black' : 'bg-white'
                                          }`}
                                          onClick={() => handleAnswerSelect(`part3_${actualIndex}_row${rowNum}_col${column}`, digitIndex)}
                                        ></div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="mt-8 pt-6 border-t-2 border-gray-300">
                  <Button 
                    onClick={handleSubmit}
                    disabled={isSubmitted}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg font-semibold"
                  >
                    {isSubmitted ? (
                      <>
                        <CheckCircle className="h-5 w-5 mr-2" />
                        ĐÃ NỘP BÀI
                      </>
                    ) : (
                      <>
                        <FileText className="h-5 w-5 mr-2" />
                        NỘP BÀI THI ({totalAnswered}/{totalQuestions})
                      </>
                    )}
                  </Button>
                  
                  {totalAnswered < totalQuestions && !isSubmitted && (
                    <p className="text-center text-sm text-orange-600 mt-3 font-medium">
                      <AlertCircle className="h-4 w-4 inline mr-1" />
                      Bạn chưa trả lời {totalQuestions - totalAnswered} câu hỏi
                    </p>
                  )}
                </div>

                {/* Answer Sheet Footer */}
                <div className="mt-6 text-center text-xs text-gray-500 border-t pt-4">
                  <p>Phiếu trả lời này phải được nộp cùng với đề thi</p>
                  <p>Thí sinh không được rời khỏi phòng thi trong suốt thời gian làm bài</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EducationQuizInterface;