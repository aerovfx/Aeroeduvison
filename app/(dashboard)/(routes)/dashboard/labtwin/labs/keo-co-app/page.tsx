'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Settings, Play, Plus, Trash2, CheckCircle2, XCircle, Clock, Trophy, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

// --- INITIAL DATA ---
const initialQuestions = [
  { id: 1, text: "Phím tắt nào dùng để sao chép văn bản?", options: ["Ctrl + C", "Ctrl + V", "Ctrl + X", "Ctrl + P"], correctIdx: 0 },
  { id: 2, text: "Đâu là một trình duyệt web?", options: ["Microsoft Word", "Google Chrome", "Adobe Photoshop", "Windows 10"], correctIdx: 1 },
  { id: 3, text: "Thiết bị nào sau đây là thiết bị đầu ra?", options: ["Bàn phím", "Chuột", "Màn hình", "Microphone"], correctIdx: 2 },
  { id: 4, text: "1 Byte bằng bao nhiêu Bit?", options: ["4", "8", "16", "32"], correctIdx: 1 },
  { id: 5, text: "Phần mềm nào dùng để soạn thảo văn bản phổ biến nhất?", options: ["Excel", "PowerPoint", "Word", "Access"], correctIdx: 2 },
  { id: 6, text: "Mạng máy tính lớn nhất thế giới gọi là gì?", options: ["LAN", "WAN", "Internet", "Intranet"], correctIdx: 2 },
  { id: 7, text: "Tổ hợp phím Ctrl + Z có chức năng gì?", options: ["Hoàn tác (Undo)", "Lưu file", "Mở file mới", "In tài liệu"], correctIdx: 0 },
  { id: 8, text: "Đâu không phải là ngôn ngữ lập trình?", options: ["Python", "Java", "HTML", "C++"], correctIdx: 2 },
  { id: 9, text: "Khi sử dụng lưới ô vuông trong lệnh Table để tạo bảng nhanh, số lượng hàng và cột tối đa có thể chọn là bao nhiêu?", options: ["8 cột và 8 hàng", "10 cột và 8 hàng", "10 cột và 10 hàng", "8 cột và 10 hàng"], correctIdx: 1 },
  { id: 10, text: "Thông tin nào sau đây phù hợp nhất để trình bày dưới dạng bảng?", options: ["Một bài thơ lục bát", "Thời khóa biểu của lớp", "Một bức tranh phong cảnh", "Lời bài hát"], correctIdx: 1 }
];

type Question = typeof initialQuestions[number];
type Feedback = 'correct' | 'wrong' | null;
type GameMode = 'setup' | 'playing' | 'finished';

export default function KeoCoApp() {
  // --- STATE ---
  const [mode, setMode] = useState<GameMode>('setup');
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [gameTime, setGameTime] = useState(90); // in seconds
  
  // Game State
  const [timeLeft, setTimeLeft] = useState(0);
  const [blueScore, setBlueScore] = useState(0);
  const [redScore, setRedScore] = useState(0);
  const [blueCurrentQ, setBlueCurrentQ] = useState<Question | null>(null);
  const [redCurrentQ, setRedCurrentQ] = useState<Question | null>(null);
  const [blueAvailableQs, setBlueAvailableQs] = useState<Question[]>([]);
  const [redAvailableQs, setRedAvailableQs] = useState<Question[]>([]);
  
  // Visuals
  const [blueFeedback, setBlueFeedback] = useState<Feedback>(null);
  const [redFeedback, setRedFeedback] = useState<Feedback>(null);

  // --- LOGIC ---
  const shuffleArray = <T,>(array: T[]): T[] => {
    let shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const startGame = () => {
    if (questions.length < 2) {
      alert("Cần ít nhất 2 câu hỏi để bắt đầu!");
      return;
    }
    setBlueScore(0);
    setRedScore(0);
    setTimeLeft(gameTime);
    
    // Give each team a shuffled copy of all questions to cycle through
    const shuffledForBlue = shuffleArray(questions);
    const shuffledForRed = shuffleArray(questions);
    
    setBlueAvailableQs(shuffledForBlue);
    setRedAvailableQs(shuffledForRed);
    
    setBlueCurrentQ(shuffledForBlue[0]);
    setRedCurrentQ(shuffledForRed[0]);
    
    setMode('playing');
  };

  const stopGame = useCallback(() => {
    setMode('finished');
  }, []);

  // Timer Effect
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (mode === 'playing' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (mode === 'playing' && timeLeft <= 0) {
      stopGame();
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [mode, timeLeft, stopGame]);

  const getNextQuestion = (team: 'blue' | 'red'): Question | null => {
    if (team === 'blue') {
      const remaining = blueAvailableQs.filter(q => q.id !== blueCurrentQ?.id);
      if (remaining.length === 0) {
        // Reshuffle if run out
        const fresh = shuffleArray(questions);
        setBlueAvailableQs(fresh);
        return fresh[0];
      }
      setBlueAvailableQs(remaining);
      return remaining[0];
    } else {
      const remaining = redAvailableQs.filter(q => q.id !== redCurrentQ?.id);
      if (remaining.length === 0) {
        const fresh = shuffleArray(questions);
        setRedAvailableQs(fresh);
        return fresh[0];
      }
      setRedAvailableQs(remaining);
      return remaining[0];
    }
  };

  const handleAnswer = (team: 'blue' | 'red', selectedIdx: number) => {
    if (mode !== 'playing') return;

    const currentQ = team === 'blue' ? blueCurrentQ : redCurrentQ;
    if (!currentQ) return;
    
    const isCorrect = selectedIdx === currentQ.correctIdx;

    if (team === 'blue') {
      setBlueFeedback(isCorrect ? 'correct' : 'wrong');
      if (isCorrect) setBlueScore(s => s + 1);
      
      setTimeout(() => {
        setBlueFeedback(null);
        setBlueCurrentQ(getNextQuestion('blue'));
      }, 800);
    } else {
      setRedFeedback(isCorrect ? 'correct' : 'wrong');
      if (isCorrect) setRedScore(s => s + 1);
      
      setTimeout(() => {
        setRedFeedback(null);
        setRedCurrentQ(getNextQuestion('red'));
      }, 800);
    }
  };

  // Calculate Tug Position (-50 to +50)
  const MAX_ADVANTAGE = 10;
  let advantage = redScore - blueScore;
  advantage = Math.max(-MAX_ADVANTAGE, Math.min(MAX_ADVANTAGE, advantage));
  const tugOffset = (advantage / MAX_ADVANTAGE) * 40;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // --- SUB-COMPONENTS ---

  const TeacherSetup = () => {
    const [newQText, setNewQText] = useState("");
    const [opts, setOpts] = useState(["", "", "", ""]);
    const [correctIdx, setCorrectIdx] = useState(0);

    const handleAdd = () => {
      if (!newQText.trim() || opts.some(o => !o.trim())) {
        alert("Vui lòng nhập đầy đủ câu hỏi và 4 đáp án.");
        return;
      }
      const newQuestion: Question = {
        id: Date.now(),
        text: newQText,
        options: [...opts],
        correctIdx
      };
      setQuestions([...questions, newQuestion]);
      setNewQText("");
      setOpts(["", "", "", ""]);
      setCorrectIdx(0);
    };

    const handleDelete = (id: number) => {
      setQuestions(questions.filter(q => q.id !== id));
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-8 font-sans text-slate-800">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link href="/dashboard/labtwin/labs" className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4">
              <ArrowLeft className="w-5 h-5" />
              Quay lại danh sách Lab
            </Link>
            
            <Card className="border-2 border-indigo-200 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-3xl font-bold flex items-center gap-3">
                      <Settings className="w-8 h-8" />
                      Kéo Co Kiến Thức
                    </CardTitle>
                    <CardDescription className="text-indigo-100 mt-2">
                      Trò chơi đối kháng kiến thức - Hai đội thi đấu trả lời câu hỏi
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={startGame}
                    className="bg-green-500 hover:bg-green-400 text-white px-8 py-6 rounded-xl font-bold text-xl flex items-center gap-2 transition-transform hover:scale-105 active:scale-95 shadow-lg"
                  >
                    <Play className="w-6 h-6 fill-current" /> Bắt Đầu Chơi
                  </Button>
                </div>
              </CardHeader>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form Thêm Câu Hỏi */}
            <div className="lg:col-span-1">
              <Card className="border-2 border-indigo-200 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2 text-indigo-700">
                    <Plus className="w-5 h-5" /> Thêm Câu Hỏi Mới
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="font-semibold">Nội dung câu hỏi</Label>
                    <Textarea 
                      className="min-h-[100px] focus:ring-2 focus:ring-indigo-500"
                      value={newQText}
                      onChange={(e) => setNewQText(e.target.value)}
                      placeholder="Nhập câu hỏi tại đây..."
                    />
                  </div>

                  <div>
                    <Label className="font-semibold mb-2 block">Các đáp án (Chọn đáp án đúng)</Label>
                    <RadioGroup value={String(correctIdx)} onValueChange={(v) => setCorrectIdx(Number(v))}>
                      {opts.map((opt, idx) => (
                        <div key={idx} className="flex items-center gap-2 mb-2">
                          <RadioGroupItem value={String(idx)} id={`opt-${idx}`} />
                          <Input 
                            className={`flex-1 ${correctIdx === idx ? 'bg-green-50 border-green-300' : ''}`}
                            placeholder={`Đáp án ${String.fromCharCode(65 + idx)}`}
                            value={opt}
                            onChange={(e) => {
                              const newOpts = [...opts];
                              newOpts[idx] = e.target.value;
                              setOpts(newOpts);
                            }}
                          />
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  <Button 
                    onClick={handleAdd}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 font-bold"
                  >
                    Lưu Câu Hỏi
                  </Button>

                  <div className="pt-4 border-t">
                    <Label className="font-semibold">Thời gian chơi (giây)</Label>
                    <Input 
                      type="number" 
                      className="mt-1"
                      value={gameTime}
                      onChange={(e) => setGameTime(Number(e.target.value))}
                      min="30" 
                      step="30"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Danh sách câu hỏi */}
            <div className="lg:col-span-2">
              <Card className="border-2 border-purple-200 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl text-slate-800">
                    Ngân Hàng Câu Hỏi ({questions.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                    {questions.map((q, index) => (
                      <div key={q.id} className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow flex gap-4 group">
                        <div className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-lg mb-2">{q.text}</p>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {q.options.map((opt, oIdx) => (
                              <div key={oIdx} className={`p-2 rounded-md ${oIdx === q.correctIdx ? 'bg-green-100 text-green-800 font-medium border border-green-200' : 'bg-slate-50 text-slate-600'}`}>
                                {String.fromCharCode(65 + oIdx)}. {opt}
                              </div>
                            ))}
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDelete(q.id)}
                          className="text-red-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    ))}
                    {questions.length === 0 && (
                      <div className="text-center py-12 text-slate-400">
                        Chưa có câu hỏi nào. Hãy thêm câu hỏi ở cột bên trái.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const TeamPanel = ({ teamColor, teamName, score, currentQ, feedback, onAnswer }: {
    teamColor: 'blue' | 'red';
    teamName: string;
    score: number;
    currentQ: Question | null;
    feedback: Feedback;
    onAnswer: (team: 'blue' | 'red', idx: number) => void;
  }) => {
    const isBlue = teamColor === 'blue';
    const bgMain = isBlue ? 'bg-gradient-to-br from-blue-600 to-blue-800' : 'bg-gradient-to-br from-red-600 to-red-800';
    const bgQuestion = isBlue ? 'bg-blue-500/30' : 'bg-red-500/30';
    const hoverBtn = isBlue ? 'hover:bg-blue-50 border-blue-200' : 'hover:bg-red-50 border-red-200';
    
    return (
      <div className={`flex-1 flex flex-col ${bgMain} p-4 rounded-3xl m-4 shadow-2xl relative overflow-hidden border-4 border-white/30`}>
        
        {/* Overlay Feedback */}
        {feedback && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-2xl">
            {feedback === 'correct' ? (
              <div className="bg-green-500 text-white p-6 rounded-full animate-bounce shadow-2xl">
                <CheckCircle2 className="w-24 h-24" />
              </div>
            ) : (
              <div className="bg-red-500 text-white p-6 rounded-full animate-pulse shadow-2xl">
                <XCircle className="w-24 h-24" />
              </div>
            )}
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center bg-white/20 text-white p-4 rounded-2xl mb-4 backdrop-blur-sm">
          <h2 className="text-3xl font-extrabold uppercase tracking-wider">{teamName}</h2>
          <div className="bg-yellow-400 text-black px-6 py-2 rounded-xl text-3xl font-black shadow-md border-2 border-yellow-500">
            {score}
          </div>
        </div>

        {/* Question Area */}
        <div className="flex-1 flex flex-col gap-4">
          <div className={`${bgQuestion} flex-1 rounded-2xl p-6 flex items-center justify-center text-center backdrop-blur-sm border border-white/20`}>
            <p className="text-white text-2xl lg:text-3xl font-bold leading-tight drop-shadow-md">
              {currentQ?.text || "Đang tải câu hỏi..."}
            </p>
          </div>

          {/* Answers Area */}
          <div className="grid grid-cols-2 gap-3 mt-auto h-1/2">
            {currentQ?.options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => onAnswer(teamColor, idx)}
                disabled={!!feedback}
                className={`bg-white text-slate-800 text-xl font-bold rounded-xl p-4 shadow-md transition-transform active:scale-95 flex items-center justify-center text-center border-b-4 ${hoverBtn}`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const GameBoard = () => (
    <div className="min-h-screen bg-slate-900 flex flex-col font-sans overflow-hidden">
      
      {/* Top Bar - Timer */}
      <div className="h-20 bg-slate-800 flex justify-center items-center relative shadow-lg z-10 border-b border-slate-700">
        <button 
          onClick={() => setMode('setup')}
          className="absolute left-6 text-slate-400 hover:text-white flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" /> Về Cài Đặt
        </button>
        
        <div className={`flex items-center gap-3 bg-slate-900 px-8 py-3 rounded-full border-2 ${timeLeft < 10 ? 'border-red-500 text-red-500 animate-pulse' : 'border-slate-600 text-white'}`}>
          <Clock className="w-6 h-6" />
          <span className="text-4xl font-mono font-bold tracking-wider">{formatTime(timeLeft)}</span>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="flex-1 flex relative">
        {/* Teams */}
        <TeamPanel 
          teamColor="blue" 
          teamName="Đội Xanh" 
          score={blueScore} 
          currentQ={blueCurrentQ}
          feedback={blueFeedback}
          onAnswer={handleAnswer}
        />
        
        {/* Center Tug of War Arena */}
        <div className="w-1/4 max-w-sm flex flex-col justify-center items-center relative z-0 mx-[-2rem] my-4 bg-white rounded-3xl z-10 shadow-2xl overflow-hidden border-8 border-slate-200">
          
          {/* Decorative Dashed Center Line */}
          <div className="absolute top-0 bottom-0 left-1/2 border-l-4 border-dashed border-green-400 opacity-50 transform -translate-x-1/2"></div>
          
          {/* The Rope */}
          <div className="relative w-full h-64 flex items-center justify-center mt-[-50px]">
             <div className="absolute w-[150%] h-3 bg-amber-700 rounded-full shadow-sm z-10" />
             
             {/* The Ribbon/Knot */}
             <div 
               className="absolute z-20 transition-all duration-700 ease-out"
               style={{ left: `calc(50% + ${tugOffset}%)` }}
             >
                <div className="relative -top-3 -left-3">
                  <div className="w-8 h-8 bg-red-600 rounded-full border-2 border-white shadow-md flex items-center justify-center">
                    <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                  </div>
                  <div className="absolute top-4 left-[-10px] w-6 h-2 bg-red-500 rotate-[30deg] origin-right rounded"></div>
                  <div className="absolute top-4 right-[-10px] w-6 h-2 bg-red-500 -rotate-[30deg] origin-left rounded"></div>
                </div>
             </div>

             {/* Team Blue abstract characters */}
             <div className="absolute left-[-20px] top-1/2 -translate-y-1/2 flex gap-1 z-0">
               {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <div className="w-8 h-8 bg-blue-300 rounded-full border-2 border-blue-600"></div>
                    <div className="w-6 h-10 bg-blue-500 rounded-t-lg mt-1 skew-x-[-10deg]"></div>
                  </div>
               ))}
             </div>

             {/* Team Red abstract characters */}
             <div className="absolute right-[-20px] top-1/2 -translate-y-1/2 flex gap-1 flex-row-reverse z-0">
               {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <div className="w-8 h-8 bg-red-300 rounded-full border-2 border-red-600"></div>
                    <div className="w-6 h-10 bg-red-500 rounded-t-lg mt-1 skew-x-[10deg]"></div>
                  </div>
               ))}
             </div>
          </div>
          
          <div className="absolute bottom-8 px-6 text-center text-slate-500 font-medium text-sm">
            Trả lời đúng để kéo dây về phía đội mình!
          </div>
        </div>

        <TeamPanel 
          teamColor="red" 
          teamName="Đội Đỏ" 
          score={redScore} 
          currentQ={redCurrentQ}
          feedback={redFeedback}
          onAnswer={handleAnswer}
        />
      </div>
    </div>
  );

  const ResultScreen = () => {
    let winner = null;
    if (blueScore > redScore) winner = "ĐỘI XANH";
    else if (redScore > blueScore) winner = "ĐỘI ĐỎ";
    else winner = "HÒA NHAU";

    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full text-center shadow-2xl relative overflow-hidden border-0">
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-blue-500 via-purple-500 to-red-500"></div>
          
          <CardContent className="p-12 pt-16">
            <Trophy className="w-32 h-32 mx-auto text-yellow-400 relative z-10 mt-[-40px] drop-shadow-xl bg-white rounded-full p-4" />
            
            <h1 className="text-5xl font-black text-slate-800 mt-6 mb-2">HẾT GIỜ!</h1>
            <p className="text-2xl font-bold text-slate-500 mb-8">KẾT QUẢ CHUNG CUỘC</p>

            <div className="flex justify-center items-center gap-12 mb-12">
              <div className="text-center">
                <div className="text-6xl font-black text-blue-600 mb-2">{blueScore}</div>
                <div className="text-xl font-bold text-slate-600">ĐỘI XANH</div>
              </div>
              <div className="text-4xl font-bold text-slate-300">-</div>
              <div className="text-center">
                <div className="text-6xl font-black text-red-600 mb-2">{redScore}</div>
                <div className="text-xl font-bold text-slate-600">ĐỘI ĐỎ</div>
              </div>
            </div>

            <Card className={`mb-8 p-6 ${winner === "HÒA NHAU" ? 'bg-amber-100 border-amber-200' : 'bg-gradient-to-r from-yellow-100 to-amber-100 border-yellow-200'}`}>
              <h2 className="text-3xl font-bold text-amber-800">
                {winner === "HÒA NHAU" ? "TRẬN ĐẤU HÒA!" : `CHIẾN THẮNG: ${winner}`}
              </h2>
            </Card>

            <div className="flex justify-center gap-4">
              <Button 
                onClick={() => setMode('setup')}
                variant="outline"
                className="px-8 py-3 text-lg"
              >
                Về Cài Đặt
              </Button>
              <Button 
                onClick={startGame}
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-lg shadow-lg"
              >
                Chơi Lại Ngay
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // --- RENDER ---
  if (mode === 'setup') return <TeacherSetup />;
  if (mode === 'playing') return <GameBoard />;
  if (mode === 'finished') return <ResultScreen />;
  
  return null;
}
