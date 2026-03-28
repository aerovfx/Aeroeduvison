'use client';

import React, { useRef, useEffect, useState } from 'react';
import { EditorFile } from '@/lib/labtwin/types';

interface CodeEditorProps {
  files: EditorFile[];
  activeFileIndex: number;
  onFileChange: (index: number, content: string) => void;
  onActiveFileChange: (index: number) => void;
}

export default function CodeEditor({
  files,
  activeFileIndex,
  onFileChange,
  onActiveFileChange,
}: CodeEditorProps) {
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const [lineNumbers, setLineNumbers] = useState<number[]>([]);
  const activeFile = files[activeFileIndex];

  useEffect(() => {
    if (activeFile) {
      const lines = activeFile.content.split('\n').length;
      setLineNumbers(Array.from({ length: lines }, (_, i) => i + 1));
    }
  }, [activeFile]);

  const handleScroll = () => {
    const textarea = editorRef.current;
    const lineNumEl = document.getElementById('line-numbers');
    if (textarea && lineNumEl) {
      lineNumEl.scrollTop = textarea.scrollTop;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onFileChange(activeFileIndex, e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Tab indent
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const value = e.currentTarget.value;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onFileChange(activeFileIndex, newValue);
      requestAnimationFrame(() => {
        if (editorRef.current) {
          editorRef.current.selectionStart = editorRef.current.selectionEnd = start + 2;
        }
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1117] border-l border-gray-800">
      {/* File tabs */}
      <div className="flex border-b border-gray-800 bg-[#161b22]">
        {files.map((file, i) => (
          <button
            key={file.name}
            onClick={() => onActiveFileChange(i)}
            className={`px-3 py-1.5 text-xs border-r border-gray-800 transition-colors flex items-center gap-1 ${
              i === activeFileIndex
                ? 'bg-[#0d1117] text-white border-b-2 border-b-purple-500'
                : 'bg-[#161b22] text-gray-500 hover:text-gray-300'
            }`}
          >
            <span className={i === activeFileIndex ? 'text-purple-400' : 'text-gray-600'}>
              {file.name.endsWith('.ino') ? '📄' : file.name.endsWith('.json') ? '📋' : '📁'}
            </span>
            {file.name}
          </button>
        ))}
      </div>

      {/* Editor body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Line numbers */}
        <div
          id="line-numbers"
          className="w-12 bg-[#0d1117] text-gray-600 text-right py-2 px-1 overflow-hidden select-none border-r border-gray-800/50"
          style={{ fontFamily: "'Fira Code', 'Cascadia Code', monospace", fontSize: '13px', lineHeight: '20px' }}
        >
          {lineNumbers.map(n => (
            <div key={n}>{n}</div>
          ))}
        </div>

        {/* Code area */}
        <textarea
          ref={editorRef}
          value={activeFile?.content || ''}
          onChange={handleChange}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          className="flex-1 bg-[#0d1117] text-gray-200 resize-none py-2 px-3 focus:outline-none"
          style={{
            fontFamily: "'Fira Code', 'Cascadia Code', monospace",
            fontSize: '13px',
            lineHeight: '20px',
            tabSize: 2,
          }}
        />
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-[#161b22] border-t border-gray-800 text-xs text-gray-500">
        <span>{activeFile?.language || 'cpp'}</span>
        <span>Lines: {lineNumbers.length}</span>
        <span>UTF-8</span>
      </div>
    </div>
  );
}
