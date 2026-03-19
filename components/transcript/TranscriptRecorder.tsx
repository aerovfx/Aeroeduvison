/**
 * Transcript Recorder Component
 * Records audio and sends to transcript API
 */

"use client"

import { useState, useRef } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';

interface Props {
  isRecording: boolean;
  onStart: () => void;
  onStop: (transcript: string) => void;
}

export function TranscriptRecorder({ isRecording, onStart, onStop }: Props) {
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const audioData = await blobToBase64(blob);
        
        // Send to transcript API
        const response = await fetch('/api/transcript', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audioData, language: 'vi' }),
        });
        
        const data = await response.json();
        onStop(data.transcript);
        
        // Clean up
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      onStart();
      
      // Update duration
      timerRef.current = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Không thể truy cập microphone. Vui lòng kiểm tra quyền.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setDuration(0);
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Remove data:audio/webm;base64, prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="text-center mb-4">
        <h3 className="text-lg font-bold text-gray-900 mb-2">
          {isRecording ? 'Đang ghi âm...' : 'Bắt đầu ghi âm'}
        </h3>
        <div className="text-3xl font-bold text-blue-600 font-mono">
          {formatDuration(duration)}
        </div>
      </div>

      <button
        onClick={isRecording ? stopRecording : startRecording}
        className={`w-full py-3 rounded-lg flex items-center justify-center gap-2 font-semibold transition-all ${
          isRecording
            ? 'bg-red-500 text-white hover:bg-red-600'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {isRecording ? (
          <>
            <Square className="w-5 h-5" />
            Dừng ghi
          </>
        ) : (
          <>
            <Mic className="w-5 h-5" />
            Bắt đầu
          </>
        )}
      </button>

      {isRecording && (
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            🎤 Microphone đang hoạt động...
          </p>
        </div>
      )}
    </div>
  );
}
