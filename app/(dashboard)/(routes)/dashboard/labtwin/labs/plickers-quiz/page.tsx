'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Camera, 
  Users, 
  Trophy, 
  BarChart3, 
  Play, 
  Square, 
  RotateCcw, 
  Download,
  Upload,
  CheckCircle,
  XCircle,
  Clock,
  Settings,
  HelpCircle
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Types
interface Student {
  id: string;
  name: string;
  cardId: number;
}

interface Question {
  id: string;
  text: string;
  choices: { a: string; b: string; c: string; d: string };
  correctAnswer: 'a' | 'b' | 'c' | 'd';
}

interface Response {
  studentId: string;
  questionId: string;
  answer: 'a' | 'b' | 'c' | 'd';
  correct: boolean;
  timestamp: number;
}

interface CardDetection {
  cardId: number;
  orientation: 'a' | 'b' | 'c' | 'd';
  confidence: number;
}

// Plickers-style marker patterns (simplified 63 unique patterns)
const MARKER_PATTERNS = Array.from({ length: 63 }, (_, i) => ({
  id: i + 1,
  pattern: generateMarkerPattern(i),
}));

function generateMarkerPattern(index: number): string[][] {
  // Simplified 4x4 binary pattern for demonstration
  const pattern: string[][] = [];
  for (let i = 0; i < 4; i++) {
    pattern[i] = [];
    for (let j = 0; j < 4; j++) {
      pattern[i][j] = ((index >> (i * 4 + j)) & 1) ? '█' : '░';
    }
  }
  return pattern;
}

export default function PlickersGame() {
  // Game state
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'results'>('setup');
  const [students, setStudents] = useState<Student[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Response[]>([]);
  const [detectedCards, setDetectedCards] = useState<CardDetection[]>([]);
  
  // Scanner state
  const [isScanning, setIsScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  
  // UI state
  const [showCardGenerator, setShowCardGenerator] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedStudentCard, setSelectedStudentCard] = useState<number | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize with sample data
  useEffect(() => {
    const sampleStudents: Student[] = Array.from({ length: 10 }, (_, i) => ({
      id: `student-${i + 1}`,
      name: `Học sinh ${i + 1}`,
      cardId: i + 1,
    }));
    setStudents(sampleStudents);

    const sampleQuestions: Question[] = [
      {
        id: 'q1',
        text: 'Thủ đô của Việt Nam là gì?',
        choices: {
          a: 'Hồ Chí Minh',
          b: 'Hà Nội',
          c: 'Đà Nẵng',
          d: 'Huế',
        },
        correctAnswer: 'b',
      },
      {
        id: 'q2',
        text: '2 + 2 × 2 = ?',
        choices: {
          a: '6',
          b: '8',
          c: '4',
          d: '10',
        },
        correctAnswer: 'a',
      },
      {
        id: 'q3',
        text: 'Nguyên tố hóa học nào có ký hiệu là O?',
        choices: {
          a: 'Vàng',
          b: 'Bạc',
          c: 'Oxi',
          d: 'Sắt',
        },
        correctAnswer: 'c',
      },
    ];
    setQuestions(sampleQuestions);
  }, []);

  // Camera handling
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
        setIsScanning(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setCameraActive(false);
      setIsScanning(false);
    }
  };

  // Simulate card detection (in production, use OpenCV/MediaPipe)
  useEffect(() => {
    if (!isScanning || !cameraActive) return;

    const interval = setInterval(() => {
      // Simulate detecting cards
      const randomCards: CardDetection[] = [];
      const numDetected = Math.floor(Math.random() * 5) + 3; // 3-7 cards
      
      for (let i = 0; i < numDetected; i++) {
        const cardId = Math.floor(Math.random() * 10) + 1;
        const orientations: ('a' | 'b' | 'c' | 'd')[] = ['a', 'b', 'c', 'd'];
        randomCards.push({
          cardId,
          orientation: orientations[Math.floor(Math.random() * 4)],
          confidence: 0.85 + Math.random() * 0.15,
        });
      }
      
      setDetectedCards(randomCards);
      setScanCount(prev => prev + 1);
      
      // Auto-submit responses
      randomCards.forEach(card => {
        const student = students.find(s => s.cardId === card.cardId);
        if (student && !responses.find(r => r.studentId === student.id && r.questionId === questions[currentQuestionIndex]?.id)) {
          const newResponse: Response = {
            studentId: student.id,
            questionId: questions[currentQuestionIndex]?.id,
            answer: card.orientation,
            correct: card.orientation === questions[currentQuestionIndex]?.correctAnswer,
            timestamp: Date.now(),
          };
          setResponses(prev => [...prev, newResponse]);
        }
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isScanning, cameraActive, students, questions, currentQuestionIndex, responses]);

  const startGame = () => {
    setGameState('playing');
    setCurrentQuestionIndex(0);
    setResponses([]);
    setScanCount(0);
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setDetectedCards([]);
    } else {
      setGameState('results');
      stopCamera();
    }
  };

  const exportCards = () => {
    // Generate PDF for printing
    alert('Đang tạo PDF thẻ Plickers để in...');
    // In production: Generate PDF with all 63 card patterns
  };

  const currentQuestion = questions[currentQuestionIndex];
  const currentResponses = responses.filter(r => r.questionId === currentQuestion?.id);
  const correctCount = currentResponses.filter(r => r.correct).length;
  const responseRate = students.length > 0 ? (currentResponses.length / students.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl text-white shadow-lg">
                <Camera className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  🎯 Plickers Quiz
                </h1>
                <p className="text-gray-600">Quét thẻ - Nhận đáp án - Xem kết quả tức thì</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCardGenerator(true)}
                className="border-purple-300 text-purple-700 hover:bg-purple-50"
              >
                <Download className="h-4 w-4 mr-2" />
                In thẻ
              </Button>
              <Button
                variant="outline"
                onClick={exportCards}
                className="border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                <Upload className="h-4 w-4 mr-2" />
                Xuất PDF
              </Button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Users className="h-8 w-8 text-blue-600" />
                  <div>
                    <div className="text-2xl font-bold">{students.length}</div>
                    <div className="text-xs text-gray-600">Học sinh</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Square className="h-8 w-8 text-purple-600" />
                  <div>
                    <div className="text-2xl font-bold">{questions.length}</div>
                    <div className="text-xs text-gray-600">Câu hỏi</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <div>
                    <div className="text-2xl font-bold">{correctCount}</div>
                    <div className="text-xs text-gray-600">Đúng</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-8 w-8 text-orange-600" />
                  <div>
                    <div className="text-2xl font-bold">{scanCount}</div>
                    <div className="text-xs text-gray-600">Lần quét</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Game Area */}
        <Tabs defaultValue="question" className="mb-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="question">Câu hỏi</TabsTrigger>
            <TabsTrigger value="scan">Quét thẻ</TabsTrigger>
            <TabsTrigger value="results">Kết quả</TabsTrigger>
          </TabsList>

          {/* Question Tab */}
          <TabsContent value="question">
            <Card className="border-2 border-purple-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                    Câu {currentQuestionIndex + 1} / {questions.length}
                  </Badge>
                  {gameState === 'setup' && (
                    <Button onClick={startGame} className="bg-gradient-to-r from-green-500 to-blue-500">
                      <Play className="h-4 w-4 mr-2" />
                      Bắt đầu Quiz
                    </Button>
                  )}
                </div>
                <CardTitle className="text-2xl mt-4">{currentQuestion?.text}</CardTitle>
                <CardDescription>Chọn đáp án bằng cách xoay thẻ Plickers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(currentQuestion?.choices || {}).map(([key, value]) => (
                    <Card
                      key={key}
                      className={`cursor-pointer transition-all hover:shadow-lg ${
                        currentQuestion?.correctAnswer === key
                          ? 'border-2 border-green-500 bg-green-50'
                          : 'border-2 border-gray-200'
                      }`}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl ${
                            currentQuestion?.correctAnswer === key
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-200 text-gray-700'
                          }`}>
                            {key.toUpperCase()}
                          </div>
                          <div className="text-lg">{value}</div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {gameState === 'playing' && (
                  <div className="mt-6 flex justify-between items-center">
                    <Button
                      variant="outline"
                      onClick={nextQuestion}
                      className="border-purple-300 text-purple-700"
                    >
                      {currentQuestionIndex < questions.length - 1 ? 'Câu tiếp theo' : 'Xem kết quả'}
                      <RotateCcw className="h-4 w-4 ml-2" />
                    </Button>
                    <div className="text-sm text-gray-600">
                      {currentResponses.length} / {students.length} học sinh đã trả lời
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Scanner Tab */}
          <TabsContent value="scan">
            <Card className="border-2 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-6 w-6" />
                  Quét thẻ Plickers
                </CardTitle>
                <CardDescription>
                  Hướng camera vào lớp học để quét thẻ trả lời của học sinh
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Camera View */}
                  <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <canvas ref={canvasRef} className="absolute inset-0" />
                    
                    {/* Overlay for detection visualization */}
                    <div className="absolute inset-0 border-4 border-blue-500/30 rounded-xl pointer-events-none">
                      {detectedCards.map((card, i) => (
                        <div
                          key={i}
                          className="absolute bg-green-500/80 text-white px-2 py-1 rounded text-sm"
                          style={{
                            top: `${20 + i * 15}%`,
                            left: `${10 + i * 20}%`,
                          }}
                        >
                          Card {card.cardId}: {card.orientation.toUpperCase()}
                        </div>
                      ))}
                    </div>

                    {!cameraActive && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <Button onClick={startCamera} className="bg-blue-600 hover:bg-blue-700">
                          <Camera className="h-5 w-5 mr-2" />
                          Bật Camera
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Detection Info */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${cameraActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                        <span className="text-sm font-medium">
                          {cameraActive ? 'Đang quét...' : 'Camera tắt'}
                        </span>
                      </div>
                      {cameraActive && (
                        <Button variant="outline" size="sm" onClick={stopCamera}>
                          Dừng quét
                        </Button>
                      )}
                    </div>

                    {/* Response Progress */}
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Tiến độ trả lời</span>
                          <span className="text-sm text-gray-600">
                            {currentResponses.length}/{students.length}
                          </span>
                        </div>
                        <Progress value={responseRate} className="h-3" />
                        <div className="text-xs text-gray-600 mt-1">
                          {responseRate.toFixed(0)}% học sinh đã trả lời
                        </div>
                      </CardContent>
                    </Card>

                    {/* Recent Detections */}
                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-semibold mb-2">Phát hiện gần đây</h4>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {detectedCards.slice(0, 10).map((card, i) => {
                            const student = students.find(s => s.cardId === card.cardId);
                            return (
                              <div key={i} className="flex items-center justify-between text-sm">
                                <span>{student?.name || `Card ${card.cardId}`}</span>
                                <Badge variant={card.orientation === currentQuestion?.correctAnswer ? 'default' : 'secondary'}>
                                  {card.orientation.toUpperCase()}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results">
            <Card className="border-2 border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-6 w-6" />
                  Kết quả Quiz
                </CardTitle>
                <CardDescription>
                  Phân tích kết quả trả lời của học sinh
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Overall Stats */}
                  <div className="space-y-4">
                    <Card>
                      <CardContent className="p-6">
                        <h4 className="font-semibold mb-4">Tổng quan</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span>Tổng số câu hỏi</span>
                            <span className="font-bold">{questions.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Học sinh tham gia</span>
                            <span className="font-bold">{students.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Tổng lượt trả lời</span>
                            <span className="font-bold">{responses.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Đúng</span>
                            <span className="font-bold text-green-600">
                              {responses.filter(r => r.correct).length}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Sai</span>
                            <span className="font-bold text-red-600">
                              {responses.filter(r => !r.correct).length}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Per-question breakdown */}
                  <div>
                    <h4 className="font-semibold mb-4">Chi tiết từng câu</h4>
                    <div className="space-y-3">
                      {questions.map((q, i) => {
                        const qResponses = responses.filter(r => r.questionId === q.id);
                        const correct = qResponses.filter(r => r.correct).length;
                        return (
                          <Card key={q.id}>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium">Câu {i + 1}</span>
                                <Badge variant={correct > qResponses.length / 2 ? 'default' : 'secondary'}>
                                  {correct}/{qResponses.length} đúng
                                </Badge>
                              </div>
                              <Progress value={(correct / qResponses.length) * 100 || 0} className="h-2" />
                              <div className="text-xs text-gray-600 mt-1">
                                {((correct / qResponses.length) * 100 || 0).toFixed(0)}% đúng
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Student Performance */}
                <div className="mt-6">
                  <h4 className="font-semibold mb-4">Thành tích học sinh</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {students.map(student => {
                      const studentResponses = responses.filter(r => r.studentId === student.id);
                      const correct = studentResponses.filter(r => r.correct).length;
                      const percentage = studentResponses.length > 0 ? (correct / studentResponses.length) * 100 : 0;
                      return (
                        <Card key={student.id}>
                          <CardContent className="p-3 text-center">
                            <div className="font-medium text-sm">{student.name}</div>
                            <div className={`text-2xl font-bold ${
                              percentage >= 80 ? 'text-green-600' :
                              percentage >= 50 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {percentage.toFixed(0)}%
                            </div>
                            <div className="text-xs text-gray-600">
                              {correct}/{studentResponses.length} đúng
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-6 flex justify-center gap-4">
                  <Button onClick={() => { setGameState('setup'); setResponses([]); }}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Chơi lại
                  </Button>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Xuất báo cáo
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Card Generator Dialog */}
        <Dialog open={showCardGenerator} onOpenChange={setShowCardGenerator}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>🎴 Thẻ Plickers - In cho học sinh</DialogTitle>
              <DialogDescription>
                Chọn số thẻ cần tạo và in ra cho học sinh. Mỗi thẻ có mã duy nhất.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mt-4">
              {MARKER_PATTERNS.slice(0, 24).map((marker) => (
                <Card key={marker.id} className="cursor-pointer hover:shadow-lg">
                  <CardContent className="p-4 text-center">
                    <div className="font-mono text-xs mb-2">Card {marker.id}</div>
                    <div className="font-mono text-lg leading-none">
                      {marker.pattern.map((row, i) => (
                        <div key={i}>{row.join('')}</div>
                      ))}
                    </div>
                    <div className="mt-2 text-xs text-gray-600">
                      A↑ B→ C↓ D←
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCardGenerator(false)}>
                Đóng
              </Button>
              <Button onClick={exportCards}>
                <Download className="h-4 w-4 mr-2" />
                Tải PDF để in
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
