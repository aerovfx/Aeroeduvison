"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, FileText, Trash2, Eye, Download, Mic } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Transcript {
  id: string;
  title: string;
  type: 'lecture' | 'meeting';
  createdAt: string;
  duration: number;
  summary: string;
}

export default function StudentTranscriptHistory() {
  const router = useRouter();
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTranscripts();
  }, []);

  const loadTranscripts = async () => {
    try {
      const response = await fetch('/api/transcript/history');
      const data = await response.json();
      setTranscripts(data.transcripts || []);
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa transcript này?')) return;

    try {
      await fetch(`/api/transcript/${id}`, { method: 'DELETE' });
      toast.success('Đã xóa');
      loadTranscripts();
    } catch (error) {
      toast.error('Không thể xóa');
    }
  };

  const handleDownload = (transcript: Transcript) => {
    const content = `# ${transcript.title}\n\n${transcript.summary}`;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${transcript.title.replace(/\s+/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Đã tải xuống!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Sticky Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Lịch Sử Ghi Âm</h1>
                <p className="text-sm text-gray-600">Tất cả bài giảng đã ghi</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/student/video-transcript')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium"
            >
              <FileText className="w-4 h-4" />
              Ghi âm mới
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
        ) : transcripts.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Chưa có bài ghi âm nào
            </h3>
            <p className="text-gray-600 mb-4">
              Bắt đầu ghi âm bài giảng đầu tiên của bạn
            </p>
            <button
              onClick={() => router.push('/student/video-transcript')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium inline-flex items-center gap-2"
            >
              <Mic className="w-5 h-5" />
              Ghi âm ngay
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {transcripts.map((transcript) => (
              <div
                key={transcript.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-900 mb-2">
                        {transcript.title}
                      </h3>
                      <div className="flex items-center gap-4 mb-3">
                        <span className="text-sm text-gray-600 flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatDuration(transcript.duration)}
                        </span>
                        <span className="text-sm text-gray-600">
                          {new Date(transcript.createdAt).toLocaleDateString('vi-VN')}
                        </span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                          Bài giảng
                        </span>
                      </div>
                      {transcript.summary && (
                        <p className="text-sm text-gray-700 line-clamp-2">
                          {transcript.summary}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => router.push(`/student/video-transcript/${transcript.id}`)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Xem chi tiết"
                    >
                      <Eye className="w-5 h-5 text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleDownload(transcript)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Tải xuống"
                    >
                      <Download className="w-5 h-5 text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(transcript.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                      title="Xóa"
                    >
                      <Trash2 className="w-5 h-5 text-red-600" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins} phút ${secs} giây`;
}
