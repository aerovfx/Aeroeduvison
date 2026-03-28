'use client';

import React, { useRef, useEffect, useState } from 'react';

interface SerialMonitorProps {
  output: string[];
  onSend?: (message: string) => void;
  isRunning: boolean;
}

export default function SerialMonitor({ output, onSend, isRunning }: SerialMonitorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');
  const [baudRate, setBaudRate] = useState(115200);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [output, autoScroll]);

  const handleSend = () => {
    if (input.trim() && onSend) {
      onSend(input);
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1117] border-t border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#161b22] border-b border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-green-400">Serial Monitor</span>
          <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`} />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={baudRate}
            onChange={(e) => setBaudRate(Number(e.target.value))}
            className="bg-gray-800 text-gray-400 text-xs px-1 py-0.5 rounded border border-gray-700"
          >
            {[9600, 19200, 38400, 57600, 115200].map(rate => (
              <option key={rate} value={rate}>{rate} baud</option>
            ))}
          </select>
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`text-xs px-2 py-0.5 rounded ${autoScroll ? 'bg-green-800 text-green-300' : 'bg-gray-800 text-gray-500'}`}
          >
            Auto-scroll
          </button>
        </div>
      </div>

      {/* Output area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-2 font-mono text-xs"
        style={{ fontFamily: "'Fira Code', monospace" }}
      >
        {output.length === 0 ? (
          <div className="text-gray-600 text-center py-4">
            {isRunning ? 'Đang chờ output...' : 'Nhấn ▶ Start để bắt đầu mô phỏng'}
          </div>
        ) : (
          output.map((line, i) => (
            <div key={i} className="text-green-400 leading-5 hover:bg-gray-800/50 px-1 rounded">
              <span className="text-gray-600 select-none mr-2">{String(i + 1).padStart(3, ' ')}</span>
              {line}
            </div>
          ))
        )}
      </div>

      {/* Input area */}
      <div className="flex items-center gap-1 px-2 py-1.5 bg-[#161b22] border-t border-gray-800">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Gửi tới Serial..."
          className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-green-500"
        />
        <button
          onClick={handleSend}
          className="px-3 py-1 bg-green-700 text-white text-xs rounded hover:bg-green-600 transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
