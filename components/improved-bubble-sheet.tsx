'use client';

import React, { useState, useEffect } from 'react';

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

interface ImprovedBubbleSheetProps {}

const ImprovedBubbleSheet: React.FC<ImprovedBubbleSheetProps> = () => {
  // State management
  const [selectedCells, setSelectedCells] = useState<{ [key: string]: boolean }>({});
  const [animations, setAnimations] = useState<{ [key: string]: boolean }>({});
  const [showInstructions, setShowInstructions] = useState(true);
  const [timeLeft, setTimeLeft] = useState(50 * 60); // 50 minutes
  const [currentPage, setCurrentPage] = useState(1);
  
  // Quiz states
  const [answers, setAnswers] = useState<{ [key: string]: number }>({});
  const [part2Answers, setPart2Answers] = useState<{ [key: string]: boolean }>({});
  const [part3Answers, setPart3Answers] = useState<{ [key: string]: number }>({});

  // 🎯 Xử lý click ô tô với validation
  const handleCellClick = (row: number, col: number) => {
    // Validation: Đảm bảo không crash khi click linh tinh
    if (!mappingData[row as keyof typeof mappingData]) {
      console.warn(`Invalid row: ${row}`);
      return;
    }

    const data = mappingData[row as keyof typeof mappingData];
    if (!data.columns.includes(col)) {
      console.warn(`Column ${col} not available for row ${row}`);
      return;
    }

    setSelectedCells(prev => {
      const newState = { ...prev };
      const cellKey = `${row}-${col}`;
      
      // Check if the clicked cell is already selected
      const isCurrentlySelected = prev[cellKey];
      
      // Clear all selections in the same column first
      Object.keys(newState).forEach(key => {
        const [, column] = key.split('-').map(Number);
        if (column === col) {
          delete newState[key];
        }
      });
      
      // Toggle behavior: Click vào ô đã chọn → bỏ chọn ô đó
      if (!isCurrentlySelected) {
        newState[cellKey] = true;
        
        // Trigger animation
        setAnimations(prev => ({ ...prev, [cellKey]: true }));
        setTimeout(() => {
          setAnimations(prev => ({ ...prev, [cellKey]: false }));
        }, 300);
      }
      
      return newState;
    });
  };

  // 🎯 Tính giá trị ô vuông cho PHẦN III (squareIndex: 0,1,2,3 → cột 2,3,4,5)
  const getSquareValue = (squareIndex: number, questionIndex?: number) => {
    if (questionIndex !== undefined) {
      // PHẦN III: Sử dụng part3Answers
      const columnPosition = squareIndex + 1; // 1,2,3,4
      
      // Tìm trong part3Answers
      for (const [key, value] of Object.entries(part3Answers)) {
        if (key.startsWith(`part3_${questionIndex}_`) && key.endsWith(`_${columnPosition}`)) {
          const parts = key.split('_');
          const type = parts[2];
          const digitIndex = parts[3];
          
          if (type === 'minus') return '-';
          if (type === 'comma') return ',';
          if (type === 'digit') return digitIndex;
        }
      }
      
      return ''; // Không tô gì → ô vuông hiển thị trống
    } else {
      // Fallback cho bubble sheet gốc
      const column = squareIndex + 2; // 2,3,4,5
      
      for (let row = 1; row <= 12; row++) {
        const cellKey = `${row}-${column}`;
        if (selectedCells[cellKey]) {
          return mappingData[row as keyof typeof mappingData].char;
        }
      }
      
      return '';
    }
  };

  // 🎯 Reset tất cả
  const resetAll = () => {
    setSelectedCells({});
    setAnimations({});
  };

  // 🎯 Kiểm tra ô có được chọn không
  const isCellSelected = (row: number, col: number) => {
    return selectedCells[`${row}-${col}`] || false;
  };

  // 🎯 Đếm tổng số ô đã chọn
  const getTotalSelected = () => {
    return Object.keys(selectedCells).length;
  };

  // 🎯 Handle quiz answer selection
  const handleAnswerSelect = (questionId: string, answerIndex?: any) => {
    if (questionId.startsWith('part2_')) {
      // PHẦN II: True/False
      setPart2Answers(prev => {
        const newAnswers = { ...prev };
        // Clear other selections for the same question
        const questionPrefix = questionId.split('_').slice(0, 2).join('_');
        Object.keys(newAnswers).forEach(key => {
          if (key.startsWith(questionPrefix)) {
            delete newAnswers[key];
          }
        });
        // Set new selection
        newAnswers[questionId] = answerIndex;
        return newAnswers;
      });
    } else if (questionId.startsWith('part3_')) {
      // PHẦN III: Numerical answers - FIXED logic for mutually exclusive per column
      const parts = questionId.split('_');
      const questionIndex = parts[1];
      const type = parts[2];
      const columnPosition = parts[3]; // This is the actual column position (0,1,2,3)
      
      setPart3Answers(prev => {
        const newAnswers = { ...prev };
        
        // Check if the clicked cell is already selected
        const isCurrentlySelected = prev[questionId] === answerIndex;
        
        // CRITICAL FIX: Clear ALL selections in the same column for this question
        // For digits: bubbleIndex (0,1,2,3) maps to column (1,2,3,4)
        // For minus: position 0 maps to column 1  
        // For comma: position 2,3 maps to column 3,4
        Object.keys(newAnswers).forEach(key => {
          if (key.startsWith(`part3_${questionIndex}_`) && key.endsWith(`_${columnPosition}`)) {
            delete newAnswers[key];
          }
        });
        
        // Toggle behavior: Click vào ô đã chọn → bỏ chọn ô đó
        if (!isCurrentlySelected) {
          newAnswers[questionId] = answerIndex;
        }
        
        // Debug log
        const selectedInColumn = Object.keys(newAnswers).filter(k => 
          k.startsWith(`part3_${questionIndex}_`) && k.endsWith(`_${columnPosition}`)
        ).length;
        console.log(`🎯 PHẦN III: ${questionId} | Column: ${columnPosition} | Selected in Column: ${selectedInColumn}`);
        
        return newAnswers;
      });
    } else {
      // PHẦN I: Multiple choice (1-40)
      const questionNum = parseInt(questionId);
      setAnswers(prev => ({
        ...prev,
        [questionNum]: answerIndex
      }));
    }
  };

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Auto-hide instructions after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowInstructions(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress
  const progress = (getTotalSelected() / 4) * 100;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sticky Timer Header */}
      <div className="sticky top-0 z-50 bg-blue-600 text-white p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-2xl font-bold">⏰ {formatTime(timeLeft)}</div>
            <div className="text-sm">Thời gian còn lại</div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm">Tiến độ: {getTotalSelected()}/4</div>
            <div className="w-32 bg-blue-400 rounded-full h-2">
              <div 
                className="bg-white h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left Panel - PDF Content */}
          <div className="bg-white rounded-lg shadow-lg border-2 border-gray-300">
            <div className="bg-blue-600 text-white p-3 rounded-t-lg">
              <div className="flex items-center justify-between">
                <span className="font-semibold">📄 Đề thi mẫu</span>
                <div className="flex items-center space-x-2">
                  <button className="text-white hover:bg-blue-700 p-1 rounded">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </button>
                  <span className="text-sm">Trang {currentPage}/1</span>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-4 text-gray-800 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
              {/* Mock PDF Content */}
              <div className="text-center mb-6">
                <div className="text-lg font-bold text-blue-600 mb-2">BỘ GIÁO DỤC VÀ ĐÀO TẠO</div>
                <div className="text-sm text-gray-600">KỲ THI TRUNG HỌC PHỔ THÔNG QUỐC GIA NĂM 2024</div>
                <div className="text-lg font-bold text-blue-600 mt-2">MÔN TOÁN HỌC</div>
                <div className="text-sm text-gray-600">Thời gian làm bài: 50 phút</div>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-blue-600 mb-3">PHẦN III: ĐÁP ÁN SỐ (6 câu)</h3>
                  <div className="space-y-3">
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="font-medium">Câu 1: Giải phương trình 2x + 3 = 7</p>
                      <p className="text-sm text-gray-600 mt-1">Nhập kết quả vào phiếu trả lời bên phải</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="font-medium">Câu 2: Tính giá trị của biểu thức √16 + 3²</p>
                      <p className="text-sm text-gray-600 mt-1">Nhập kết quả vào phiếu trả lời bên phải</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="font-medium">Câu 3: Tìm nghiệm của phương trình x² - 5x + 6 = 0</p>
                      <p className="text-sm text-gray-600 mt-1">Nhập kết quả vào phiếu trả lời bên phải</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="font-medium">Câu 4: Tính diện tích hình tròn có bán kính r = 3</p>
                      <p className="text-sm text-gray-600 mt-1">Nhập kết quả vào phiếu trả lời bên phải</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="font-medium">Câu 5: Giải bất phương trình 2x - 1 &gt; 5</p>
                      <p className="text-sm text-gray-600 mt-1">Nhập kết quả vào phiếu trả lời bên phải</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="font-medium">Câu 6: Tính log₂(8) + log₃(27)</p>
                      <p className="text-sm text-gray-600 mt-1">Nhập kết quả vào phiếu trả lời bên phải</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center text-sm text-gray-500 border-t pt-4 mt-6">
                <p>Mã đề: 001</p>
                <p>Trang 1/1</p>
              </div>
            </div>
          </div>

          {/* Right Panel - Answer Sheet */}
          <div className="bg-white rounded-lg shadow-lg border-2 border-gray-300">
            <div className="bg-white text-blue-600 p-3 rounded-t-lg border-b">
              <h2 className="font-bold text-lg text-center">PHIẾU TRẢ LỜI</h2>
            </div>
            
            <div className="p-4 space-y-4">
              {/* PHẦN I - Trắc nghiệm đa lựa chọn (40 câu) */}
              <div className="bg-blue-50 border-2 border-blue-300 p-3 rounded">
                <div className="text-center text-sm font-bold mb-3 text-blue-600">PHẦN I</div>
                <div className="text-xs text-center mb-3">(Trắc nghiệm đa lựa chọn - 40 câu)</div>
                
                <div className="grid grid-cols-2 gap-4">
                  {/* Questions 1-20 */}
                  <div className="space-y-1">
                    <div className="text-center text-xs font-bold mb-2">1-20</div>
                    <div className="grid grid-cols-5 gap-1 mb-2">
                      <div className="text-center font-medium text-red-600"></div>
                      <div className="text-center font-medium text-red-600">A</div>
                      <div className="text-center font-medium text-red-600">B</div>
                      <div className="text-center font-medium text-red-600">C</div>
                      <div className="text-center font-medium text-red-600">D</div>
                    </div>
                    {Array.from({ length: 20 }, (_, index) => {
                      const questionId = (index + 1).toString();
                      const selectedAnswer = answers[parseInt(questionId)];
                      
                      return (
                        <div key={index} className="grid grid-cols-5 gap-1 text-xs">
                          <div className="text-center font-medium">{index + 1}.</div>
                          {['A', 'B', 'C', 'D'].map((letter, letterIndex) => (
                            <div key={letter} className="flex justify-center">
                              <div
                                className={`w-3 h-3 rounded-full border border-red-500 cursor-pointer transition-all ${
                                  selectedAnswer === letterIndex
                                    ? 'bg-black'
                                    : 'bg-white hover:bg-gray-200'
                                }`}
                                onClick={() => handleAnswerSelect(questionId, letterIndex)}
                              >
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>

                  {/* Questions 21-40 */}
                  <div className="space-y-1">
                    <div className="text-center text-xs font-bold mb-2">21-40</div>
                    <div className="grid grid-cols-5 gap-1 mb-2">
                      <div className="text-center font-medium text-red-600"></div>
                      <div className="text-center font-medium text-red-600">A</div>
                      <div className="text-center font-medium text-red-600">B</div>
                      <div className="text-center font-medium text-red-600">C</div>
                      <div className="text-center font-medium text-red-600">D</div>
                    </div>
                    {Array.from({ length: 20 }, (_, index) => {
                      const questionId = (index + 21).toString();
                      const selectedAnswer = answers[parseInt(questionId)];
                      
                      return (
                        <div key={index} className="grid grid-cols-5 gap-1 text-xs">
                          <div className="text-center font-medium">{index + 21}.</div>
                          {['A', 'B', 'C', 'D'].map((letter, letterIndex) => (
                            <div key={letter} className="flex justify-center">
                              <div
                                className={`w-3 h-3 rounded-full border border-red-500 cursor-pointer transition-all ${
                                  selectedAnswer === letterIndex
                                    ? 'bg-black'
                                    : 'bg-white hover:bg-gray-200'
                                }`}
                                onClick={() => handleAnswerSelect(questionId, letterIndex)}
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

              {/* PHẦN II - Câu đúng/sai (4 câu) */}
              <div className="bg-pink-100 border-2 border-pink-300 p-3 rounded">
                <div className="text-center text-sm font-bold mb-3 text-blue-600">PHẦN II</div>
                <div className="text-xs text-center mb-3">(Câu đúng/sai - 4 câu)</div>
                
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

              {/* PHẦN III - Đáp án số (6 câu) */}
              <div className="bg-pink-100 border-2 border-pink-300 p-3 rounded">
                <div className="flex justify-between items-center mb-3">
                  <div className="text-sm font-bold text-blue-600">PHẦN III</div>
                  <div className="text-xs text-gray-600">Hướng dẫn điền</div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {/* Row 1: Câu 1-3 */}
                  {Array.from({ length: 3 }, (_, index) => (
                    <div key={index} className="text-center">
                      <div className="text-xs font-bold mb-2">Câu {index + 1}</div>
                      <div className="space-y-1">
                        {/* 4 ô vuông ở trên - bố trí từ cột 2 đến cột 5 */}
                        <div className="flex justify-center space-x-1 mb-2">
                          {[0, 1, 2, 3].map((squareIndex) => (
                            <div key={squareIndex} className="w-6 h-6 border border-red-500 bg-white rounded flex items-center justify-center text-xs font-bold text-red-600">
                              {getSquareValue(squareIndex, index)}
                            </div>
                          ))}
                        </div>
                        
                        {/* Header row với số cột */}
                        <div className="grid grid-cols-5 gap-1 mb-1">
                          <div className="text-center text-xs font-medium"></div>
                          <div className="text-center text-xs font-medium">2</div>
                          <div className="text-center text-xs font-medium">3</div>
                          <div className="text-center text-xs font-medium">4</div>
                          <div className="text-center text-xs font-medium">5</div>
                        </div>
                        
                        {/* Dấu trừ - chỉ cột 1 (position 0) */}
                        <div className="grid grid-cols-5 gap-1">
                          <div className="text-center text-xs">-</div>
                          <div className="flex justify-center">
                            <div 
                              className={`w-3 h-3 rounded-full border border-red-500 cursor-pointer hover:bg-gray-200 ${
                                part3Answers[`part3_${index}_minus_0`] !== undefined ? 'bg-black' : 'bg-white'
                              }`}
                              onClick={() => handleAnswerSelect(`part3_${index}_minus_0`, 0)}
                            ></div>
                          </div>
                          <div className="w-3 h-3"></div>
                          <div className="w-3 h-3"></div>
                          <div className="w-3 h-3"></div>
                        </div>

                        {/* Dấu phẩy - chỉ cột 3,4 (position 2,3) */}
                        <div className="grid grid-cols-5 gap-1">
                          <div className="text-center text-xs">,</div>
                          <div className="w-3 h-3"></div>
                          <div className="w-3 h-3"></div>
                          <div className="flex justify-center">
                            <div 
                              className={`w-3 h-3 rounded-full border border-red-500 cursor-pointer hover:bg-gray-200 ${
                                part3Answers[`part3_${index}_comma_2`] !== undefined ? 'bg-black' : 'bg-white'
                              }`}
                              onClick={() => handleAnswerSelect(`part3_${index}_comma_2`, 2)}
                            ></div>
                          </div>
                          <div className="flex justify-center">
                            <div 
                              className={`w-3 h-3 rounded-full border border-red-500 cursor-pointer hover:bg-gray-200 ${
                                part3Answers[`part3_${index}_comma_3`] !== undefined ? 'bg-black' : 'bg-white'
                              }`}
                              onClick={() => handleAnswerSelect(`part3_${index}_comma_3`, 3)}
                            ></div>
                          </div>
                        </div>
                        
                        {/* Số 0-9 - tất cả 4 cột */}
                        {Array.from({ length: 10 }, (_, digitIndex) => (
                          <div key={digitIndex} className="grid grid-cols-5 gap-1">
                            <div className="text-center text-xs">{digitIndex}</div>
                            {Array.from({ length: 4 }, (_, bubbleIndex) => (
                              <div key={bubbleIndex} className="flex justify-center">
                                <div 
                                  className={`w-3 h-3 rounded-full border border-red-500 cursor-pointer hover:bg-gray-200 ${
                                    part3Answers[`part3_${index}_digit_${digitIndex}_${bubbleIndex}`] !== undefined ? 'bg-black' : 'bg-white'
                                  }`}
                                  onClick={() => handleAnswerSelect(`part3_${index}_digit_${digitIndex}_${bubbleIndex}`, bubbleIndex)}
                                ></div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-3 gap-4 mt-4">
                  {/* Row 2: Câu 4-6 */}
                  {Array.from({ length: 3 }, (_, index) => {
                    const actualIndex = index + 3;
                    return (
                      <div key={actualIndex} className="text-center">
                        <div className="text-xs font-bold mb-2">Câu {actualIndex + 1}</div>
                        <div className="space-y-1">
                          {/* 4 ô vuông ở trên - bố trí từ cột 2 đến cột 5 */}
                          <div className="flex justify-center space-x-1 mb-2">
                            {[0, 1, 2, 3].map((squareIndex) => (
                              <div key={squareIndex} className="w-6 h-6 border border-red-500 bg-white rounded flex items-center justify-center text-xs font-bold text-red-600">
                                {getSquareValue(squareIndex, index)}
                              </div>
                            ))}
                          </div>
                          
                          {/* Header row với số cột */}
                          <div className="grid grid-cols-5 gap-1 mb-1">
                            <div className="text-center text-xs font-medium"></div>
                            <div className="text-center text-xs font-medium">2</div>
                            <div className="text-center text-xs font-medium">3</div>
                            <div className="text-center text-xs font-medium">4</div>
                            <div className="text-center text-xs font-medium">5</div>
                          </div>
                          
                          {/* Dấu trừ - chỉ cột 1 (position 0) */}
                          <div className="grid grid-cols-5 gap-1">
                            <div className="text-center text-xs">-</div>
                            <div className="flex justify-center">
                              <div 
                                className={`w-3 h-3 rounded-full border border-red-500 cursor-pointer hover:bg-gray-200 ${
                                  part3Answers[`part3_${actualIndex}_minus_0`] !== undefined ? 'bg-black' : 'bg-white'
                                }`}
                                onClick={() => handleAnswerSelect(`part3_${actualIndex}_minus_0`, 0)}
                              ></div>
                            </div>
                            <div className="w-3 h-3"></div>
                            <div className="w-3 h-3"></div>
                            <div className="w-3 h-3"></div>
                          </div>

                          {/* Dấu phẩy - chỉ cột 3,4 (position 2,3) */}
                          <div className="grid grid-cols-5 gap-1">
                            <div className="text-center text-xs">,</div>
                            <div className="w-3 h-3"></div>
                            <div className="w-3 h-3"></div>
                            <div className="flex justify-center">
                              <div 
                                className={`w-3 h-3 rounded-full border border-red-500 cursor-pointer hover:bg-gray-200 ${
                                  part3Answers[`part3_${actualIndex}_comma_2`] !== undefined ? 'bg-black' : 'bg-white'
                                }`}
                                onClick={() => handleAnswerSelect(`part3_${actualIndex}_comma_2`, 2)}
                              ></div>
                            </div>
                            <div className="flex justify-center">
                              <div 
                                className={`w-3 h-3 rounded-full border border-red-500 cursor-pointer hover:bg-gray-200 ${
                                  part3Answers[`part3_${actualIndex}_comma_3`] !== undefined ? 'bg-black' : 'bg-white'
                                }`}
                                onClick={() => handleAnswerSelect(`part3_${actualIndex}_comma_3`, 3)}
                              ></div>
                            </div>
                          </div>
                          
                          {/* Số 0-9 - tất cả 4 cột */}
                          {Array.from({ length: 10 }, (_, digitIndex) => (
                            <div key={digitIndex} className="grid grid-cols-5 gap-1">
                              <div className="text-center text-xs">{digitIndex}</div>
                              {Array.from({ length: 4 }, (_, bubbleIndex) => (
                                <div key={bubbleIndex} className="flex justify-center">
                                  <div 
                                    className={`w-3 h-3 rounded-full border border-red-500 cursor-pointer hover:bg-gray-200 ${
                                      part3Answers[`part3_${actualIndex}_digit_${digitIndex}_${bubbleIndex}`] !== undefined ? 'bg-black' : 'bg-white'
                                    }`}
                                    onClick={() => handleAnswerSelect(`part3_${actualIndex}_digit_${digitIndex}_${bubbleIndex}`, bubbleIndex)}
                                  ></div>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center space-x-4 pt-4">
                <button
                  onClick={resetAll}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors duration-200 text-sm font-medium"
                >
                  🔄 Reset
                </button>
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors duration-200 text-sm font-medium"
                >
                  📤 Nộp bài
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImprovedBubbleSheet;
