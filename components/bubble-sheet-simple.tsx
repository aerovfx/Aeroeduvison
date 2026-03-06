'use client';

import React, { useState } from 'react';

// 📊 Bảng Quy Luật Mapping - Simplified Version
const mappingData = [
  { row: 1, char: '-', columns: [2] },           // Dòng 1: chỉ cột 2
  { row: 2, char: ',', columns: [3, 4] },        // Dòng 2: cột 3, 4
  { row: 3, char: '0', columns: [2, 3, 4, 5] },  // Dòng 3-12: tất cả cột
  { row: 4, char: '1', columns: [2, 3, 4, 5] },
  { row: 5, char: '2', columns: [2, 3, 4, 5] },
  { row: 6, char: '3', columns: [2, 3, 4, 5] },
  { row: 7, char: '4', columns: [2, 3, 4, 5] },
  { row: 8, char: '5', columns: [2, 3, 4, 5] },
  { row: 9, char: '6', columns: [2, 3, 4, 5] },
  { row: 10, char: '7', columns: [2, 3, 4, 5] },
  { row: 11, char: '8', columns: [2, 3, 4, 5] },
  { row: 12, char: '9', columns: [2, 3, 4, 5] },
];

const BubbleSheetSimple: React.FC = () => {
  // State: selectedCells[row-col] = true
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
        delete newState[cellKey]; // Deselect
      } else {
        newState[cellKey] = true; // Select
      }
      
      return newState;
    });
  };

  // 🎯 Tính giá trị ô vuông (squareIndex: 0,1,2,3 → cột 2,3,4,5)
  const getSquareValue = (squareIndex: number) => {
    const column = squareIndex + 2; // 2,3,4,5
    
    // Tìm dòng được chọn trong cột này
    for (const data of mappingData) {
      const cellKey = `${data.row}-${column}`;
      if (selectedCells[cellKey]) {
        return data.char;
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

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600 mb-2">
            📝 Phần Tô Trắc Nghiệm - Simple Version
          </h1>
          <p className="text-gray-600">
            Logic mapping chính xác theo bảng quy luật
          </p>
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Panel - Bảng Tô Trắc Nghiệm */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
              🎯 Bảng Tô Trắc Nghiệm
            </h2>
            
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-blue-50">
                    <th className="border border-blue-300 px-3 py-2 text-center font-bold text-blue-700">Dòng</th>
                    <th className="border border-blue-300 px-3 py-2 text-center font-bold text-blue-700">Ký tự</th>
                    <th className="border border-blue-300 px-3 py-2 text-center font-bold text-blue-700">Cột 2</th>
                    <th className="border border-blue-300 px-3 py-2 text-center font-bold text-blue-700">Cột 3</th>
                    <th className="border border-blue-300 px-3 py-2 text-center font-bold text-blue-700">Cột 4</th>
                    <th className="border border-blue-300 px-3 py-2 text-center font-bold text-blue-700">Cột 5</th>
                  </tr>
                </thead>
                <tbody>
                  {mappingData.map((data) => (
                    <tr key={data.row} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-3 py-2 text-center font-medium">{data.row}</td>
                      <td className="border border-gray-300 px-3 py-2 text-center font-bold text-lg">{data.char}</td>
                      
                      {/* Columns 2, 3, 4, 5 */}
                      {[2, 3, 4, 5].map((col) => {
                        const hasValue = data.columns.includes(col);
                        const isSelected = isCellSelected(data.row, col);
                        
                        return (
                          <td key={col} className="border border-gray-300 px-3 py-2 text-center">
                            {hasValue ? (
                              <div
                                className={`w-10 h-10 rounded-full border-2 cursor-pointer transition-all duration-200 mx-auto flex items-center justify-center ${
                                  isSelected
                                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg'
                                    : 'bg-white border-blue-400 text-blue-600 hover:bg-blue-50 hover:border-blue-500'
                                }`}
                                onClick={() => handleCellClick(data.row, col)}
                              >
                                <span className="text-sm font-bold">
                                  {isSelected ? '✓' : ''}
                                </span>
                              </div>
                            ) : (
                              <div className="w-10 h-10"></div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Reset Button */}
            <div className="mt-6 text-center">
              <button
                onClick={resetAll}
                className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium shadow-lg"
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
            <div className="space-y-4 mb-6">
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
                    <div className={`w-20 h-20 border-2 border-blue-400 rounded-lg flex items-center justify-center text-3xl font-bold mx-auto transition-all duration-200 ${
                      value ? 'bg-blue-50 text-blue-600 border-blue-500 shadow-lg' : 'bg-gray-50 text-gray-400'
                    }`}>
                      {value || '?'}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Hướng Dẫn */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-bold text-yellow-800 mb-2 text-sm">📖 Hướng Dẫn</h3>
              <ul className="text-xs text-yellow-700 space-y-1">
                <li>• Click ô tròn để chọn</li>
                <li>• Mỗi cột chỉ chọn 1 ô</li>
                <li>• Chọn mới → bỏ chọn cũ</li>
                <li>• Dòng 1 (-): chỉ cột 2</li>
                <li>• Dòng 2 (,): cột 2, 3</li>
                <li>• Dòng 3-12: tất cả cột</li>
              </ul>
            </div>

            {/* Test Cases */}
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-bold text-green-800 mb-2 text-sm">🧪 Test Cases</h3>
              <ul className="text-xs text-green-700 space-y-1">
                <li>✅ Dòng 1 cột 2 → Ô 1 = &quot;-&quot;</li>
                <li>✅ Dòng 2 cột 3 → Ô 2 = &quot;,&quot;</li>
                <li>✅ Dòng 9 cột 3 → Ô 2 = &quot;6&quot;</li>
                <li>✅ Dòng 12 cột 5 → Ô 4 = &quot;9&quot;</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Current State Display */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
            📊 Trạng Thái Hiện Tại
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[2, 3, 4, 5].map((col) => {
              const selectedRow = Object.keys(selectedCells).find(key => {
                const [, column] = key.split('-').map(Number);
                return column === col;
              });
              
              return (
                <div key={col} className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="font-bold text-lg text-gray-700">Cột {col}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {selectedRow ? (
                      <>
                        <span className="text-green-600">Đã chọn</span>
                        <br />
                        <span className="font-medium">Dòng {selectedRow.split('-')[0]}</span>
                      </>
                    ) : (
                      <span className="text-gray-500">Trống</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BubbleSheetSimple;
