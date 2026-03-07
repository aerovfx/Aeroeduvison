'use client';

import React, { useState } from 'react';

// 📊 Bảng Quy Luật Mapping
const mappingData = {
  1: { char: '-', values: ['-', '', '', ''] },
  2: { char: ',', values: ['', ',', ',', ''] },
  3: { char: '0', values: ['0', '0', '0', '0'] },
  4: { char: '1', values: ['1', '1', '1', '1'] },
  5: { char: '2', values: ['2', '2', '2', '2'] },
  6: { char: '3', values: ['3', '3', '3', '3'] },
  7: { char: '4', values: ['4', '4', '4', '4'] },
  8: { char: '5', values: ['5', '5', '5', '5'] },
  9: { char: '6', values: ['6', '6', '6', '6'] },
  10: { char: '7', values: ['7', '7', '7', '7'] },
  11: { char: '8', values: ['8', '8', '8', '8'] },
  12: { char: '9', values: ['9', '9', '9', '9'] },
};

interface BubbleSheetProps {}

const BubbleSheet: React.FC<BubbleSheetProps> = () => {
  // State management
  const [selectedCells, setSelectedCells] = useState<{ [key: string]: boolean }>({});

  // 🎯 Xử lý click ô tô
  const handleCellClick = (row: number, col: number) => {
    setSelectedCells(prev => {
      const newState = { ...prev };
      const cellKey = `${row}-${col}`;
      
      // Clear all selections in the same column first
      Object.keys(newState).forEach(key => {
        const [, column] = key.split('-').map(Number);
        if (column === col) {
          delete newState[key];
        }
      });
      
      // Toggle the clicked cell
      if (prev[cellKey]) {
        // If already selected, deselect it
        delete newState[cellKey];
      } else {
        // If not selected, select it
        newState[cellKey] = true;
      }
      
      return newState;
    });
  };

  // 🎯 Tính giá trị ô vuông
  const getSquareValue = (squareIndex: number) => {
    // squareIndex: 0,1,2,3 tương ứng với cột 2,3,4,5
    const column = squareIndex + 2; // 2,3,4,5
    
    // Tìm dòng được chọn trong cột này
    for (let row = 1; row <= 12; row++) {
      const cellKey = `${row}-${column}`;
      if (selectedCells[cellKey]) {
        return mappingData[row as keyof typeof mappingData].char;
      }
    }
    
    return ''; // Không có gì được chọn
  };

  // 🎯 Reset tất cả
  const resetAll = () => {
    setSelectedCells({});
  };

  // 🎯 Kiểm tra ô có được chọn không
  const isCellSelected = (row: number, col: number) => {
    return selectedCells[`${row}-${col}`] || false;
  };

  // 🎯 Kiểm tra cột có ô nào được chọn không
  const isColumnEmpty = (col: number) => {
    for (let row = 1; row <= 12; row++) {
      if (isCellSelected(row, col)) return false;
    }
    return true;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600 mb-2">
            📝 Phần Tô Trắc Nghiệm
          </h1>
          <p className="text-gray-600">
            Ứng dụng React với logic mapping theo bảng quy luật cụ thể
          </p>
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Panel - Bảng Tô Trắc Nghiệm */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
              🎯 Bảng Tô Trắc Nghiệm
            </h2>
            
            {/* Table Header */}
            <div className="grid grid-cols-5 gap-2 mb-4 bg-blue-50 p-3 rounded-lg">
              <div className="text-center font-bold text-blue-700">Dòng</div>
              <div className="text-center font-bold text-blue-700">Ký tự</div>
              <div className="text-center font-bold text-blue-700">Cột 2</div>
              <div className="text-center font-bold text-blue-700">Cột 3</div>
              <div className="text-center font-bold text-blue-700">Cột 4</div>
            </div>

            {/* Table Body */}
            <div className="space-y-2">
              {Object.entries(mappingData).map(([row, data]) => {
                const rowNum = parseInt(row);
                return (
                  <div key={row} className="grid grid-cols-5 gap-2 items-center">
                    {/* Row Number */}
                    <div className="text-center font-medium text-gray-600">
                      {rowNum}
                    </div>
                    
                    {/* Character */}
                    <div className="text-center font-bold text-lg">
                      {data.char}
                    </div>
                    
                    {/* Columns 2, 3, 4, 5 */}
                    {[2, 3, 4, 5].map((col) => {
                      const hasValue = data.values[col - 2] !== '';
                      const isSelected = isCellSelected(rowNum, col);
                      
                      return (
                        <div key={col} className="flex justify-center">
                          {hasValue ? (
                            <div
                              className={`w-8 h-8 rounded-full border-2 cursor-pointer transition-all duration-200 ${
                                isSelected
                                  ? 'bg-blue-600 border-blue-600 text-white'
                                  : 'bg-white border-blue-400 text-blue-600 hover:bg-blue-50'
                              }`}
                              onClick={() => handleCellClick(rowNum, col)}
                            >
                              <div className="flex items-center justify-center h-full text-sm font-bold">
                                {isSelected ? '✓' : ''}
                              </div>
                            </div>
                          ) : (
                            <div className="w-8 h-8"></div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Reset Button */}
            <div className="mt-6 text-center">
              <button
                onClick={resetAll}
                className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
              >
                🔄 Reset Tất Cả
              </button>
            </div>
          </div>

          {/* Right Panel - Kết Quả Hiển Thị */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
              📊 Kết Quả Hiển Thị
            </h2>
            
            {/* 4 Ô Vuông Kết Quả */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {[1, 2, 3, 4].map((squareIndex) => {
                const value = getSquareValue(squareIndex - 1);
                const column = squareIndex + 1; // 2, 3, 4, 5
                
                return (
                  <div key={squareIndex} className="text-center">
                    <div className="mb-2">
                      <span className="text-sm font-medium text-gray-600">
                        Ô vuông {squareIndex}
                      </span>
                      <br />
                      <span className="text-xs text-gray-500">
                        (Cột {column})
                      </span>
                    </div>
                    <div className={`w-16 h-16 border-2 border-blue-400 rounded-lg flex items-center justify-center text-2xl font-bold mx-auto ${
                      value ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-400'
                    }`}>
                      {value || '?'}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Hướng Dẫn Sử Dụng */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-bold text-yellow-800 mb-2">📖 Hướng Dẫn Sử Dụng</h3>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Click vào ô tròn để chọn/deselect</li>
                <li>• Mỗi cột chỉ được chọn 1 ô duy nhất</li>
                <li>• Chọn ô mới sẽ tự động bỏ chọn ô cũ</li>
                <li>• Ký tự được chọn sẽ hiển thị ở ô vuông tương ứng</li>
                <li>• Dòng 1 (-): Chỉ có cột 2</li>
                <li>• Dòng 2 (,): Chỉ có cột 2, 3</li>
                <li>• Dòng 3-12 (0-9): Có tất cả cột 2, 3, 4, 5</li>
              </ul>
            </div>

            {/* Trạng Thái Hiện Tại */}
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-bold text-green-800 mb-2">📊 Trạng Thái Hiện Tại</h3>
              <div className="text-sm text-green-700">
                <div className="grid grid-cols-2 gap-2">
                  {[2, 3, 4, 5].map((col) => (
                    <div key={col} className="flex justify-between">
                      <span>Cột {col}:</span>
                      <span className={isColumnEmpty(col) ? 'text-gray-500' : 'text-green-600 font-medium'}>
                        {isColumnEmpty(col) ? 'Trống' : 'Đã chọn'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Test Cases Section */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
            🧪 Test Cases Quan Trọng
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-bold text-blue-800 mb-2">✅ Test Mapping Accuracy</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Tô dòng 1 cột 2 → Ô vuông 1 = &quot;-&quot;</li>
                <li>• Tô dòng 2 cột 3 → Ô vuông 2 = &quot;,&quot;</li>
                <li>• Tô dòng 9 cột 3 → Ô vuông 2 = &quot;6&quot;</li>
                <li>• Tô dòng 12 cột 5 → Ô vuông 4 = &quot;9&quot;</li>
              </ul>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-bold text-green-800 mb-2">✅ Test Constraints</h3>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Chọn 2 ô trong cùng cột → chỉ ô cuối được giữ</li>
                <li>• Click ô đã chọn → bỏ chọn</li>
                <li>• Reset → tất cả ô trống</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BubbleSheet;
