/**
 * Transcript Viewer Component
 * Displays transcript text
 */

"use client"

import { Copy, Download, Mic } from 'lucide-react';

interface Props {
  transcript: string;
  isLoading?: boolean;
}

export function TranscriptViewer({ transcript, isLoading = false }: Props) {
  const handleCopy = async () => {
    await navigator.clipboard.writeText(transcript);
    alert('Đã copy vào clipboard!');
  };

  const handleDownload = () => {
    const blob = new Blob([transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">Nội dung ghi âm</h3>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Copy"
          >
            <Copy className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={handleDownload}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Download"
          >
            <Download className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600 ml-3">Đang xử lý...</p>
        </div>
      ) : transcript ? (
        <div className="prose max-w-none">
          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
            {transcript}
          </p>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <Mic className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Chưa có nội dung ghi âm</p>
          <p className="text-sm mt-1">Bắt đầu ghi âm để xem nội dung</p>
        </div>
      )}
    </div>
  );
}
