/**
 * Transcript Summary Component
 * Displays AI-generated summary
 */

"use client"

import { useState } from 'react';
import { Brain, Save, Loader2 } from 'lucide-react';

interface Props {
  transcript: string;
  summary: string;
  onSave: (summary: string) => void;
}

export function TranscriptSummary({ transcript, summary, onSave }: Props) {
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [keyPoints, setKeyPoints] = useState<string[]>([]);

  const handleSummarize = async () => {
    if (!transcript) return;

    setIsSummarizing(true);
    try {
      const response = await fetch('/api/transcript/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      });

      const data = await response.json();
      onSave(data.summary);
      setKeyPoints(data.keyPoints);
    } catch (error) {
      console.error('Summarize error:', error);
      alert('Không thể tóm tắt. Vui lòng thử lại.');
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-bold text-gray-900">Tóm tắt AI</h3>
        </div>
        <button
          onClick={handleSummarize}
          disabled={!transcript || isSummarizing}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
        >
          {isSummarizing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang xử lý...
            </>
          ) : (
            <>
              <Brain className="w-4 h-4" />
              Tóm tắt
            </>
          )}
        </button>
      </div>

      {summary ? (
        <div className="space-y-4">
          <div className="prose max-w-none">
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
              {summary}
            </p>
          </div>

          {keyPoints.length > 0 && (
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
              <h4 className="text-sm font-bold text-purple-900 mb-2">
                📌 Ý chính:
              </h4>
              <ul className="space-y-1">
                {keyPoints.map((point, index) => (
                  <li key={index} className="text-sm text-purple-800 flex items-start gap-2">
                    <span className="text-purple-600 mt-1">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={() => onSave(summary)}
            className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 font-medium"
          >
            <Save className="w-4 h-4" />
            Lưu vào lịch sử
          </button>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Nhấn "Tóm tắt" để AI phân tích nội dung</p>
        </div>
      )}
    </div>
  );
}
