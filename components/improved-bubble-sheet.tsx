
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { 
  calculateTotalScore, 
  StudentSubmission, 
  AnswerKey 
} from '@/lib/grading/grading-logic';

// 📊 Bảng Quy Luật Mapping (QUAN TRỌNG)
const mappingData = {
  1: { char: '-', columns: [2] },           // Dòng 1: Chỉ có giá trị cho cột 2
  2: { char: ',', columns: [3, 4] },        // Dòng 2: Chỉ có giá trị cho cột 3,4
  3: { char: '0', columns: [2, 3, 4, 5] },  // Dòng 3-12: Có tất cả cột
  4: { char: '1', columns: [2, 3, 4, 5] },
  5: { char: '2', columns: [2, 3, 4, 5] },
  6: { char: '3', columns: [2, 3, 4, 5] },
  7: { char: '4', columns: [2, 3, 4, 5] },
  8: { char: '5', columns: [2, 3, 4, 5] },
  9: { char: '6', columns: [2, 3, 4, 5] },
  10: { char: '7', columns: [2, 3, 4, 5] },
  11: { char: '8', columns: [2, 3, 4, 5] },
  12: { char: '9', columns: [2, 3, 4, 5] },
};

interface ImprovedBubbleSheetProps {
  mode?: 'student' | 'key_entry' | 'review';
  initialData?: StudentSubmission;
  officialKey?: AnswerKey;
  onSave?: (data: any) => void;
}

const ImprovedBubbleSheet: React.FC<ImprovedBubbleSheetProps> = ({ 
  mode = 'student',
  initialData,
  officialKey,
  onSave 
}) => {
  // State management
  const [selectedCells, setSelectedCells] = useState<{ [key: string]: boolean }>({});
  const [timeLeft, setTimeLeft] = useState(50 * 60); // 50 minutes
  
  // Quiz states
  const [answers, setAnswers] = useState<{ [key: string]: any }>(initialData?.partI as any || {});
  const [part2Answers, setPart2Answers] = useState<{ [key: string]: any }>(initialData?.partII as any || {});
  const [part3Answers, setPart3Answers] = useState<{ [key: string]: any }>(initialData?.partIII as any || {});
  const [essayContent, setEssayContent] = useState(initialData?.essayContent || "");
  const [essayScore, setEssayScore] = useState(initialData?.essayScore || 0);

  // Computed results in review mode
  const [gradingResult, setGradingResult] = useState<any>(null);
  const [isAiGrading, setIsAiGrading] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (mode === 'review' && officialKey) {
      const submission: StudentSubmission = {
        partI: answers as any,
        partII: part2Answers as any,
        partIII: {} as any, // Part III needs conversion from internal state
        essayScore
      };
      
      // Convert Part III raw bubbles to actual values
      for (let q = 0; q < 6; q++) {
        submission.partIII[q + 1] = getActualNumericValue(q);
      }

      setGradingResult(calculateTotalScore(submission, officialKey));
    }
  }, [answers, part2Answers, part3Answers, mode, officialKey, essayScore]);

  // Transform internal bubble state to numeric string (Part III)
  const getActualNumericValue = (qIdx: number) => {
    let result = "";
    if (part3Answers[`part3_${qIdx}_minus_0`] !== undefined) result += "-";
    
    // Column by column (2, 3, 4, 5)
    for (let col = 0; col < 4; col++) {
      // Check if comma
      if (part3Answers[`part3_${qIdx}_comma_${col}`] !== undefined) {
        result += ".";
      }
      // Check if digit
      for (let digit = 0; digit <= 9; digit++) {
        if (part3Answers[`part3_${qIdx}_digit_${digit}_${col}`] !== undefined) {
          result += digit;
          break;
        }
      }
    }
    return result;
  };

  // 🎯 Xử lý click ô tô - Reuse for Part III visual feedback
  const handleCellClick = (row: number, col: number) => {
    // Basic implementation for visual grid (if needed)
  };

  // 🎯 Tính giá trị ô vuông cho PHẦN III
  const getSquareValue = (squareIndex: number, questionIndex: number) => {
    // squareIndex: 0,1,2,3 → cột 2,3,4,5
    const columnPosition = squareIndex; 
    
    // Check for comma in this column
    if (part3Answers[`part3_${questionIndex}_comma_${columnPosition}`] !== undefined) return ',';
    
    // Check for digit in this column
    for (let digit = 0; digit <= 9; digit++) {
      if (part3Answers[`part3_${questionIndex}_digit_${digit}_${columnPosition}`] !== undefined) {
        return digit;
      }
    }
    
    // Special case for minus: only column index 0 can be minus but usually shown separately
    if (squareIndex === 0 && part3Answers[`part3_${questionIndex}_minus_0`] !== undefined) return '-';

    return ''; 
  };

  // 🎯 Reset tất cả
  const resetAll = () => {
    setAnswers({});
    setPart2Answers({});
    setPart3Answers({});
    setEssayContent("");
    setEssayScore(0);
  };

  // 🎯 Handle quiz answer selection
  const handleAnswerSelect = (questionId: string, value: any) => {
    if (mode === 'review') return; // Read-only in review

    if (questionId.startsWith('part2_')) {
      // PHẦN II: True/False
      setPart2Answers(prev => ({
        ...prev,
        [questionId]: value
      }));
    } else if (questionId.startsWith('part3_')) {
      // PHẦN III: Numerical
      const parts = questionId.split('_');
      const questionIndex = parts[1];
      const type = parts[2]; // 'digit', 'minus', 'comma'
      const colPos = parts[parts.length - 1]; // Last part is always column index
      
      setPart3Answers(prev => {
        const newAnswers = { ...prev };
        const isCurrentlySelected = prev[questionId] === value;
        
        // Mutually exclusive in the same column for this question
        Object.keys(newAnswers).forEach(key => {
          if (key.startsWith(`part3_${questionIndex}_`) && key.endsWith(`_${colPos}`)) {
            delete newAnswers[key];
          }
        });
        
        if (!isCurrentlySelected) {
          newAnswers[questionId] = value;
        }
        return newAnswers;
      });
    } else {
      // PHẦN I
      const questionNum = parseInt(questionId);
      setAnswers(prev => ({
        ...prev,
        [questionNum]: prev[questionNum] === value ? undefined : value
      }));
    }
  };

  const handleNopBai = () => {
    if (onSave) {
      const data: StudentSubmission = {
        partI: answers as any,
        partII: part2Answers as any,
        partIII: {} as any,
        essayContent,
        essayScore
      };
      for (let q = 0; q < 6; q++) {
        data.partIII[q + 1] = getActualNumericValue(q);
      }
      onSave(data);
    }
  };

  // Timer effect
  useEffect(() => {
    if (mode !== 'student') return;
    const timer = setInterval(() => {
      setTimeLeft(prev => prev > 0 ? prev - 1 : 0);
    }, 1000);
    return () => clearInterval(timer);
  }, [mode]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      {/* Header */}
      <div className={`sticky top-0 z-50 ${mode === 'key_entry' ? 'bg-orange-600' : mode === 'review' ? 'bg-green-600' : 'bg-blue-600'} text-white p-4 shadow-lg transition-colors`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {mode === 'student' && <div className="text-2xl font-bold">⏰ {formatTime(timeLeft)}</div>}
            <div className="text-lg font-bold">
              {mode === 'student' ? 'LÀM BÀI THI' : mode === 'key_entry' ? 'NHẬP ĐÁP ÁN MẪU' : 'XEM KẾT QUẢ CHẤM ĐIỂM'}
            </div>
          </div>
          {mode === 'review' && gradingResult && (
            <div className="text-xl font-black bg-white text-green-700 px-4 py-1 rounded-full shadow-inner">
              TỔNG ĐIỂM: {gradingResult.total.toFixed(2)}
            </div>
          )}
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" className="bg-transparent border-white text-white hover:bg-white/20" onClick={handleNopBai}>
              {mode === 'review' ? 'Lưu kết quả' : 'Hoàn thành'}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 flex flex-col gap-6">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left/Middle - Answer Sheet Sections */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* PHẦN I - Trắc nghiệm (18 câu - Follow image) */}
            <Card className="border-2 border-blue-200 shadow-md">
              <CardHeader className="bg-blue-50 py-3">
                <CardTitle className="text-center text-blue-700 font-bold uppercase text-base">PHẦN I - Trắc nghiệm (18 câu)</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-8">
                  {[0, 1].map(col => (
                    <div key={col} className="space-y-2">
                      <div className="grid grid-cols-5 gap-2 mb-2 text-center text-xs font-bold text-gray-400">
                        <div></div><div>A</div><div>B</div><div>C</div><div>D</div>
                      </div>
                      {Array.from({ length: 9 }, (_, i) => {
                        const questionNum = col * 9 + i + 1;
                        const studentAns = answers[questionNum];
                        const keyAns = officialKey?.partI[questionNum];
                        const isCorrect = mode === 'review' ? studentAns === keyAns : null;
                        
                        return (
                          <div key={questionNum} className="grid grid-cols-5 gap-2 items-center text-sm">
                            <div className="font-bold text-gray-500">{questionNum}.</div>
                            {[0, 1, 2, 3].map(optIdx => {
                              const isSelected = studentAns === optIdx;
                              const isKey = mode === 'review' && keyAns === optIdx;
                              
                              let bubbleClass = "w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all ";
                              if (isSelected) bubbleClass += "bg-blue-600 border-blue-700 text-white shadow-md ";
                              else bubbleClass += "bg-white border-blue-300 hover:border-blue-500 ";

                              if (mode === 'review') {
                                if (isKey) bubbleClass += " ring-2 ring-green-500 ring-offset-1 ";
                                if (isSelected && !isCorrect) bubbleClass += " bg-red-500 border-red-700 ";
                                if (isSelected && isCorrect) bubbleClass += " bg-green-500 border-green-700 ";
                              }

                              return (
                                <div 
                                  key={optIdx} 
                                  className={bubbleClass}
                                  onClick={() => handleAnswerSelect(questionNum.toString(), optIdx)}
                                >
                                  {isSelected && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* PHẦN II - Câu Đúng/Sai (4 câu) */}
            <Card className="border-2 border-pink-200 shadow-md">
              <CardHeader className="bg-pink-50 py-3">
                <CardTitle className="text-center text-pink-700 font-bold uppercase text-base">PHẦN II - Câu Đúng/Sai (4 câu)</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-6">
                  {Array.from({ length: 4 }, (_, qIdx) => {
                    const qNum = qIdx + 1;
                    return (
                      <div key={qNum} className="border border-pink-100 p-4 rounded-lg bg-white shadow-sm">
                        <div className="font-bold text-pink-600 mb-3 border-b border-pink-50 pb-2">Câu {qNum}</div>
                        <div className="space-y-3">
                          <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold text-gray-400">
                            <div>Lựa chọn</div><div className="text-green-600">Đúng</div><div className="text-red-600">Sai</div>
                          </div>
                          {['a', 'b', 'c', 'd'].map(opt => {
                            const studentVal = part2Answers[`part2_${qIdx}_${opt}`];
                            const keyVal = officialKey?.partII[qNum]?.[opt];
                            const isCorrect = mode === 'review' ? studentVal === keyVal : null;

                            return (
                              <div key={opt} className="grid grid-cols-3 gap-2 items-center text-sm">
                                <div className="font-medium text-gray-500 text-center uppercase">{opt}.</div>
                                {[true, false].map(val => {
                                  const isSelected = studentVal === val;
                                  const isOfficialKey = mode === 'review' && keyVal === val;
                                  
                                  let btnClass = "w-8 h-8 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all ";
                                  if (isSelected) btnClass += val ? "bg-green-500 border-green-600" : "bg-red-500 border-red-600";
                                  else btnClass += "bg-white border-gray-200 hover:border-pink-300";

                                  if (mode === 'review') {
                                    if (isOfficialKey) btnClass += " ring-2 ring-yellow-400 ring-offset-1 ";
                                    if (isSelected && !isCorrect) btnClass += " opacity-50 ";
                                  }

                                  return (
                                    <div key={val.toString()} className="flex justify-center">
                                      <div 
                                        className={btnClass}
                                        onClick={() => handleAnswerSelect(`part2_${qIdx}_${opt}`, val)}
                                      >
                                        {isSelected && <div className="w-3 h-3 bg-white rounded-full"></div>}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* PHẦN III - Đáp án số (6 câu) */}
            <Card className="border-2 border-orange-200 shadow-md">
              <CardHeader className="bg-orange-50 py-3">
                <CardTitle className="text-center text-orange-700 font-bold uppercase text-base">PHẦN III - Đáp án số (6 câu)</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-3 gap-6">
                  {Array.from({ length: 6 }, (_, qIdx) => {
                    const qNum = qIdx + 1;
                    const studentValue = getActualNumericValue(qIdx);
                    const keyValue = officialKey?.partIII[qNum];
                    
                    return (
                      <div key={qNum} className="flex flex-col items-center border border-orange-100 p-3 rounded-lg bg-white">
                        <div className="font-bold text-orange-600 mb-2">Câu {qNum}</div>
                        
                        {/* Display box */}
                        <div className="flex gap-1 mb-4">
                          {[0, 1, 2, 3].map(sqIdx => (
                            <div key={sqIdx} className={`w-8 h-10 border-2 rounded flex items-center justify-center font-bold text-lg ${
                              mode === 'review' && studentValue === keyValue ? 'bg-green-50 text-green-700 border-green-300' : 
                              mode === 'review' && studentValue !== keyValue ? 'bg-red-50 text-red-700 border-red-300' :
                              'bg-gray-50 text-gray-700 border-orange-200 shadow-inner'
                            }`}>
                              {getSquareValue(sqIdx, qIdx)}
                            </div>
                          ))}
                        </div>

                        {/* Numeric Grid simplified for space */}
                        <div className="w-full space-y-2">
                          {/* Sign & Comma Row */}
                          <div className="grid grid-cols-5 gap-1">
                            <div className="text-center text-[10px] font-bold text-gray-400">+/-</div>
                            <div className="flex justify-center">
                              <div className={`w-4 h-4 rounded-full border ${part3Answers[`part3_${qIdx}_minus_0`] !== undefined ? 'bg-black' : 'bg-white'}`} 
                                onClick={() => handleAnswerSelect(`part3_${qIdx}_minus_0`, 0)}></div>
                            </div>
                            <div className="text-center text-[10px] font-bold text-gray-400">,</div>
                            <div className="flex justify-center">
                              <div className={`w-4 h-4 rounded-full border ${part3Answers[`part3_${qIdx}_comma_2`] !== undefined ? 'bg-black' : 'bg-white'}`} 
                                onClick={() => handleAnswerSelect(`part3_${qIdx}_comma_2`, 2)}></div>
                            </div>
                            <div className="flex justify-center">
                              <div className={`w-4 h-4 rounded-full border ${part3Answers[`part3_${qIdx}_comma_3`] !== undefined ? 'bg-black' : 'bg-white'}`} 
                                onClick={() => handleAnswerSelect(`part3_${qIdx}_comma_3`, 3)}></div>
                            </div>
                          </div>
                          
                          {/* Digits 0-9 */}
                          {Array.from({ length: 10 }, (_, digit) => (
                            <div key={digit} className="grid grid-cols-5 gap-1 items-center">
                              <div className="text-center text-[10px] font-bold text-gray-500">{digit}</div>
                              {Array.from({ length: 4 }, (_, col) => (
                                <div key={col} className="flex justify-center">
                                  <div 
                                    className={`w-4 h-4 rounded-full border transition-colors cursor-pointer ${
                                      part3Answers[`part3_${qIdx}_digit_${digit}_${col}`] !== undefined ? 'bg-blue-600 border-blue-800' : 'bg-white border-gray-300'
                                    }`}
                                    onClick={() => handleAnswerSelect(`part3_${qIdx}_digit_${digit}_${col}`, col)}
                                  ></div>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>

                        {mode === 'review' && keyValue && (
                          <div className="mt-3 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">
                            Đáp án: {keyValue}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Right Panel - Essay & Info */}
          <div className="space-y-6">
            
            {/* Student Info Card (Simulation) */}
            <Card className="border-2 border-gray-300 shadow-md">
              <CardHeader className="bg-gray-100">
                <CardTitle className="text-sm uppercase font-bold text-gray-600">Thông tin thí sinh</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">HỌ VÀ TÊN</label>
                  <Input readOnly value="Nguyễn Văn A" className="bg-gray-50 font-medium" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">LỚP</label>
                    <Input readOnly value="12A1" className="bg-gray-50 font-medium" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">MÃ ĐỀ</label>
                    <Input readOnly value="101" className="bg-gray-50 font-black text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Essay Section (NEW) */}
            <Card className="border-2 border-purple-200 shadow-md">
              <CardHeader className="bg-purple-50 flex flex-row items-center justify-between py-3">
                <CardTitle className="text-sm uppercase font-bold text-purple-700">PHẦN TỰ LUẬN</CardTitle>
                {mode !== 'student' && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 text-[10px] font-bold bg-purple-100 text-purple-700 hover:bg-purple-200"
                    onClick={async () => {
                      if (!essayContent) return alert("Vui lòng nhập nội dung bài luận!");
                      setIsAiGrading(true);
                      try {
                        const res = await fetch('/api/grading/essay', {
                          method: 'POST',
                          body: JSON.stringify({ essayContent, maxScore: 2.0 })
                        });
                        const data = await res.json();
                        if (data.success) {
                          setEssayScore(data.result.score);
                          setAiFeedback(data.result.feedback);
                          alert(`AI (${data.model}) đã hoàn tất chấm điểm!`);
                        }
                      } catch (e) {
                        console.error(e);
                      } finally {
                        setIsAiGrading(false);
                      }
                    }}
                    disabled={isAiGrading}
                  >
                    {isAiGrading ? '⏳ ĐANG CHẤM...' : '🤖 AI CHẤM ĐIỂM'}
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <p className="text-xs italic text-gray-600">Nhập nội dung bài làm hoặc nhận xét tại đây.</p>
                <Textarea 
                  placeholder="Học sinh viết bài luận..." 
                  className="min-h-[250px] text-sm leading-relaxed"
                  value={essayContent}
                  onChange={(e) => setEssayContent(e.target.value)}
                  readOnly={mode === 'review' && !onSave}
                />
                
                {aiFeedback && mode !== 'student' && (
                  <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg text-xs text-blue-800">
                    <div className="font-bold flex items-center mb-1">
                      <span className="mr-1">🤖</span> NHẬN XÉT AI:
                    </div>
                    {aiFeedback}
                  </div>
                )}

                {mode !== 'student' && (
                  <div className="pt-4 border-t border-purple-100">
                    <label className="text-xs font-bold text-purple-700 mb-2 block uppercase">Điểm tự luận (tối đa 2.0)</label>
                    <div className="flex items-center space-x-3">
                      <Input 
                        type="number" 
                        step="0.25" 
                        max="2" 
                        min="0"
                        value={essayScore}
                        onChange={(e) => setEssayScore(parseFloat(e.target.value) || 0)}
                        className="w-24 font-bold text-center text-purple-700 border-purple-300"
                        readOnly={isAiGrading || (mode === 'review' && !onSave)}
                      />
                      <span className="text-sm font-bold text-gray-400">/ 2.0</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Score Breakdown (Review Mode) */}
            {mode === 'review' && gradingResult && (
              <Card className="border-2 border-green-200 shadow-xl overflow-hidden sticky top-24">
                <CardHeader className="bg-green-600 text-white">
                  <CardTitle className="text-center font-black">CHI TIẾT ĐIỂM SỐ</CardTitle>
                </CardHeader>
                <div className="p-0">
                  <table className="w-full text-sm">
                    <tbody className="divide-y">
                      <tr className="bg-blue-50">
                        <td className="p-3 font-bold">Phần I (Trắc nghiệm)</td>
                        <td className="p-3 text-right font-black text-blue-700">{gradingResult.partI.toFixed(2)}</td>
                      </tr>
                      <tr className="bg-pink-50">
                        <td className="p-3 font-bold">Phần II (Đúng/Sai)</td>
                        <td className="p-3 text-right font-black text-pink-700">{gradingResult.partII.toFixed(2)}</td>
                      </tr>
                      <tr className="bg-orange-50">
                        <td className="p-3 font-bold">Phần III (Điền số)</td>
                        <td className="p-3 text-right font-black text-orange-700">{gradingResult.partIII.toFixed(2)}</td>
                      </tr>
                      <tr className="bg-purple-50">
                        <td className="p-3 font-bold">Tự luận</td>
                        <td className="p-3 text-right font-black text-purple-700">{gradingResult.essay.toFixed(2)}</td>
                      </tr>
                      <tr className="bg-green-700 text-white">
                        <td className="p-3 text-lg font-black uppercase">Tổng cộng</td>
                        <td className="p-3 text-right text-2xl font-black">{gradingResult.total.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* Actions for other modes */}
            <div className="pt-4 flex flex-col gap-3">
              <Button 
                onClick={resetAll}
                variant="outline"
                className="w-full border-red-200 text-red-600 hover:bg-red-50"
              >
                🔄 Reset dữ liệu
              </Button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ImprovedBubbleSheet;
