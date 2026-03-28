/**
 * Transcript Sidebar Component
 * Shows recent transcripts for both students and teachers
 */

"use client"

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { FileText, Clock, ChevronRight, Mic, X } from 'lucide-react';

interface TranscriptItem {
  id: string;
  title: string;
  type: 'lecture' | 'meeting';
  createdAt: string;
  duration: number;
}

export function TranscriptSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'lecture' | 'meeting'>('all');

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      loadTranscripts();
    }
  }, [isOpen, filter]);

  const loadTranscripts = async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.append('type', filter);
      }
      
      const response = await fetch(`/api/transcript/history?${params}`);
      const data = await response.json();
      setTranscripts(data.transcripts?.slice(0, 10) || []); // Show last 10
    } catch (error) {
      console.error('Load transcripts error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (id: string, _type: string) => {
    router.push(`/teacher/transcript/library`);
    setIsOpen(false);
  };

  // Don't show sidebar on transcript pages (all transcript-related routes)
  if (pathname?.includes('/transcript') || pathname?.includes('video-transcript') || pathname?.includes('meeting-notes')) {
    return null;
  }

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed right-4 bottom-4 w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all z-50 flex items-center justify-center"
        title="Video Transcript"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <Mic className="w-6 h-6" />
        )}
      </button>

      {/* Sidebar Panel */}
      <div 
        className={`fixed right-0 top-0 h-full bg-white shadow-2xl transition-all duration-300 z-50 ${
          isOpen ? 'w-80' : 'w-0'
        } overflow-hidden`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Mic className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-gray-900">Video Transcript</h3>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-1">
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                filter === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setFilter('lecture')}
              className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                filter === 'lecture'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Bài giảng
            </button>
            <button
              onClick={() => setFilter('meeting')}
              className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                filter === 'meeting'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Cuộc họp
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-4 border-b border-gray-200">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                router.push('/teacher/transcript/recording');
                setIsOpen(false);
              }}
              className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-xs font-medium flex items-center justify-center gap-1"
            >
              <Mic className="w-3 h-3" />
              Ghi âm
            </button>
            <button
              onClick={() => {
                router.push('/teacher/transcript/library');
                setIsOpen(false);
              }}
              className="px-3 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors text-xs font-medium flex items-center justify-center gap-1"
            >
              <FileText className="w-3 h-3" />
              Thư viện
            </button>
          </div>
        </div>

        {/* Transcript List */}
        <div className="p-4 overflow-y-auto h-[calc(100%-200px)]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
            </div>
          ) : transcripts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Chưa có transcript nào</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transcripts.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg border border-gray-100 hover:bg-gray-50 hover:border-purple-200 cursor-pointer transition-all"
                  onClick={() => handleNavigate(item.id, item.type)}
                >
                  <div className="flex items-start gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      item.type === 'lecture'
                        ? 'bg-blue-50'
                        : 'bg-purple-50'
                    }`}>
                      {item.type === 'lecture' ? (
                        <Mic className="w-4 h-4 text-blue-600" />
                      ) : (
                        <FileText className="w-4 h-4 text-purple-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {item.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          item.type === 'lecture'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {item.type === 'lecture' ? 'Bài giảng' : 'Cuộc họp'}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(item.duration)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
          <button
            onClick={() => {
              router.push('/teacher/transcript/library');
              setIsOpen(false);
            }}
            className="w-full px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Clock className="w-4 h-4" />
            Xem tất cả
          </button>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}p ${secs}s`;
}
