"use client"

import { useState } from 'react';
import { Mic, FileText, Clock, Sparkles } from 'lucide-react';
import { TranscriptRecorder } from '@/components/transcript/TranscriptRecorder';
import { TranscriptViewer } from '@/components/transcript/TranscriptViewer';
import { TranscriptSummary } from '@/components/transcript/TranscriptSummary';
import { toast } from 'react-hot-toast';

export default function StudentVideoTranscript() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [summary, setSummary] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (summaryText: string) => {
    if (!transcript) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/transcript/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          summary: summaryText,
          type: 'lecture',
          title: `Bài giảng ${new Date().toLocaleDateString('vi-VN')}`,
          duration: 0, // Will be calculated from recording
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Đã lưu vào lịch sử!');
        // Reset for new recording
        setTranscript('');
        setSummary('');
      } else {
        toast.error('Không thể lưu. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Lỗi khi lưu transcript');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Sticky Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Mic className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Ghi Âm Bài Giảng</h1>
                <p className="text-sm text-gray-600">Ghi lại và tóm tắt lời giảng</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="/student/video-transcript/history"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Clock className="w-4 h-4" />
                Lịch sử
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Tổng số bài</p>
                <p className="text-xl font-bold text-gray-900">0</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Thời lượng</p>
                <p className="text-xl font-bold text-gray-900">0 phút</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Đã tóm tắt</p>
                <p className="text-xl font-bold text-gray-900">0</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Recording Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Recorder */}
          <div className="lg:col-span-1">
            <TranscriptRecorder
              isRecording={isRecording}
              onStart={() => {
                setIsRecording(true);
                setTranscript('');
                setSummary('');
              }}
              onStop={(newTranscript) => {
                setTranscript(newTranscript);
                setIsRecording(false);
              }}
            />

            {/* Tips Card */}
            <div className="mt-6 bg-blue-50 rounded-xl border border-blue-100 p-4">
              <h4 className="text-sm font-bold text-blue-900 mb-2">
                💡 Mẹo ghi âm:
              </h4>
              <ul className="space-y-1 text-sm text-blue-800">
                <li>• Đặt microphone gần nguồn âm</li>
                <li>• Ghi ở nơi yên tĩnh</li>
                <li>• Nói rõ ràng, tốc độ vừa phải</li>
                <li>• Có thể tạm dừng và tiếp tục</li>
              </ul>
            </div>
          </div>

          {/* Right: Transcript & Summary */}
          <div className="lg:col-span-2 space-y-6">
            <TranscriptViewer 
              transcript={transcript}
              isLoading={isRecording}
            />
            
            <TranscriptSummary 
              transcript={transcript}
              summary={summary}
              onSave={handleSave}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
