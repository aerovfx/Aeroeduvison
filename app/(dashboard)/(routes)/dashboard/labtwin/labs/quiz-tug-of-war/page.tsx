'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Copy,
  Crown,
  Diamond,
  Flag,
  RefreshCcw,
  Swords,
  Square,
  Timer,
  Trash2,
  Triangle,
  Trophy,
  Users,
  XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'react-hot-toast';

const DEFAULT_QUESTIONS = [
  {
    id: 'q1',
    question: 'Lực hấp dẫn giữa hai vật phụ thuộc vào yếu tố nào?',
    options: ['Khối lượng và khoảng cách', 'Màu sắc của vật', 'Nhiệt độ môi trường', 'Ánh sáng xung quanh'],
    correctIndex: 0
  },
  {
    id: 'q2',
    question: 'Đơn vị của công suất là gì?',
    options: ['Watt', 'Newton', 'Joule', 'Pascal'],
    correctIndex: 0
  },
  {
    id: 'q3',
    question: 'Tốc độ ánh sáng trong chân không xấp xỉ bao nhiêu?',
    options: ['3 x 10^8 m/s', '3 x 10^6 m/s', '3 x 10^5 km/s', '1.5 x 10^8 m/s'],
    correctIndex: 0
  },
  {
    id: 'q4',
    question: 'Công thức tính gia tốc là gì?',
    options: ['a = v/t', 'a = s/t', 'a = m/v', 'a = t/s'],
    correctIndex: 0
  },
  {
    id: 'q5',
    question: 'Trong mạch điện, cường độ dòng điện ký hiệu là gì?',
    options: ['I', 'U', 'R', 'P'],
    correctIndex: 0
  },
  {
    id: 'q6',
    question: 'Định luật bảo toàn năng lượng phát biểu gì?',
    options: [
      'Năng lượng không tự sinh ra, không tự mất đi',
      'Năng lượng tỉ lệ với khối lượng',
      'Năng lượng phụ thuộc màu sắc',
      'Năng lượng luôn tăng theo thời gian'
    ],
    correctIndex: 0
  }
];

type Question = typeof DEFAULT_QUESTIONS[number];

type TeamId = 'A' | 'B';
type GameStatus = 'lobby' | 'playing' | 'paused' | 'finished';

type Feedback = {
  correct: boolean;
  correctIndex: number;
};

const TUG_MAX = 5;
const MAX_QUESTIONS = 20;
const OPTION_COUNTS = [2, 4, 6] as const;
const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];
const ANSWER_THEMES = [
  {
    bg: 'bg-red-500',
    hover: 'hover:bg-red-600',
    border: 'border-red-400',
    icon: Triangle
  },
  {
    bg: 'bg-blue-500',
    hover: 'hover:bg-blue-600',
    border: 'border-blue-400',
    icon: Diamond
  },
  {
    bg: 'bg-yellow-500',
    hover: 'hover:bg-yellow-600',
    border: 'border-yellow-400',
    icon: Circle
  },
  {
    bg: 'bg-emerald-500',
    hover: 'hover:bg-emerald-600',
    border: 'border-emerald-400',
    icon: Square
  },
  {
    bg: 'bg-violet-500',
    hover: 'hover:bg-violet-600',
    border: 'border-violet-400',
    icon: Circle
  },
  {
    bg: 'bg-orange-500',
    hover: 'hover:bg-orange-600',
    border: 'border-orange-400',
    icon: Triangle
  }
];

type SavedSet = {
  id: string;
  name: string;
  teacherName: string;
  className: string;
  optionCount: number;
  questions: Question[];
  createdAt: string;
};

export default function QuizTugOfWarPage() {
  const [teamAName, setTeamAName] = useState('Đội A');
  const [teamBName, setTeamBName] = useState('Đội B');
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [tugPosition, setTugPosition] = useState(0);
  const [selectedTeam, setSelectedTeam] = useState<TeamId>('A');
  const [questions, setQuestions] = useState<Question[]>(DEFAULT_QUESTIONS);
  const [playQuestions, setPlayQuestions] = useState<Question[]>(DEFAULT_QUESTIONS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [autoSwitchTeam, setAutoSwitchTeam] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [optionCount, setOptionCount] = useState<(typeof OPTION_COUNTS)[number]>(4);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(true);
  const [gameStatus, setGameStatus] = useState<GameStatus>('lobby');
  const [questionTimeSec, setQuestionTimeSec] = useState(20);
  const [timeLeft, setTimeLeft] = useState(20);
  const [teacherName, setTeacherName] = useState('');
  const [className, setClassName] = useState('');
  const [setName, setSetName] = useState('');
  const [savedSets, setSavedSets] = useState<SavedSet[]>([]);
  const [lobbyCode, setLobbyCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [playerTeam, setPlayerTeam] = useState<TeamId>('A');
  const [players, setPlayers] = useState<{ id: string; name: string; team: TeamId }[]>([]);
  const [lobbyError, setLobbyError] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [pendingJoin, setPendingJoin] = useState<{ name: string; team: TeamId } | null>(null);
  const [teacherToken, setTeacherToken] = useState('');
  const [remoteGameState, setRemoteGameState] = useState<{
    question_index: number;
    total_questions: number;
    time_left: number;
    question_time: number;
    score_a: number;
    score_b: number;
    tug_position: number;
    is_finished: boolean;
    status?: GameStatus;
    question_text: string;
    options: string[];
    questions_preview?: { question: string; options: string[] }[];
  } | null>(null);

  const rustBaseUrl = process.env.NEXT_PUBLIC_RUST_BACKEND_URL || 'http://127.0.0.1:8090';
  const wsRef = useRef<WebSocket | null>(null);
  const [wsStatus, setWsStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [rustBackendAvailable, setRustBackendAvailable] = useState<boolean>(false);
  const normalizedToken = useMemo(() => teacherToken.trim().replace(/^Bearer\s+/i, ''), [teacherToken]);
  const hasToken = normalizedToken.length > 0;

  const checkBackend = useCallback(async () => {
    try {
      const response = await fetch(`${rustBaseUrl}/health`, { method: 'GET', mode: 'cors' });
      setRustBackendAvailable(response.ok);
    } catch {
      setRustBackendAvailable(false);
    }
  }, [rustBaseUrl]);

  // Check if Rust backend is available (auto-refresh)
  useEffect(() => {
    checkBackend();
    const interval = setInterval(() => {
      checkBackend();
    }, 5000);
    return () => clearInterval(interval);
  }, [checkBackend]);

  const toWsUrl = (base: string) => {
    const trimmed = base.replace(/\/+$/, '');
    if (trimmed.startsWith('https://')) {
      return trimmed.replace('https://', 'wss://');
    }
    if (trimmed.startsWith('http://')) {
      return trimmed.replace('http://', 'ws://');
    }
    return `ws://${trimmed}`;
  };

  const sendWsMessage = (message: object) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify(message));
  };

  const isHost = hasToken;
  const currentQuestion = playQuestions[currentIndex];
  const totalQuestions = playQuestions.length;
  const computedFinished = currentIndex >= totalQuestions;
  const isFinished = gameStatus === 'finished' || computedFinished;
  const isGameActive = gameStatus === 'playing';
  const isPaused = gameStatus === 'paused';
  const hasBlockingErrors = validationErrors.length > 0;

  const previewQuestions = useMemo(
    () => playQuestions.map((q) => ({ question: q.question, options: q.options })),
    [playQuestions]
  );
  const estimatedMinutes = useMemo(() => Math.max(1, Math.ceil((questions.length * questionTimeSec) / 60)), [
    questions.length,
    questionTimeSec
  ]);

  const wireQuestions = useMemo(
    () =>
      playQuestions.map((q) => ({
        id: q.id,
        question: q.question,
        options: q.options,
        correct_index: q.correctIndex
      })),
    [playQuestions]
  );

  // Display variables - must be defined before ranking useMemo
  const displayScoreA = isHost ? scoreA : remoteGameState?.score_a ?? scoreA;
  const displayScoreB = isHost ? scoreB : remoteGameState?.score_b ?? scoreB;
  const displayTugPosition = isHost ? tugPosition : remoteGameState?.tug_position ?? tugPosition;
  const displayTimeLeft = isHost ? timeLeft : remoteGameState?.time_left ?? timeLeft;
  const displayQuestionTime = isHost ? questionTimeSec : remoteGameState?.question_time ?? questionTimeSec;
  const displayQuestionText = isHost ? currentQuestion?.question : remoteGameState?.question_text;
  const displayOptions = isHost ? currentQuestion?.options || [] : remoteGameState?.options || [];
  const displayQuestionIndex = isHost ? currentIndex : remoteGameState?.question_index ?? currentIndex;
  const displayTotalQuestions = isHost ? totalQuestions : remoteGameState?.total_questions ?? totalQuestions;
  const displayIsFinished = isHost
    ? isFinished
    : remoteGameState?.status === 'finished' || remoteGameState?.is_finished || isFinished;
  const displayStatus: GameStatus = isHost
    ? gameStatus
    : (remoteGameState?.status as GameStatus) || (displayIsFinished ? 'finished' : isGameActive ? 'playing' : 'lobby');
  const displayPreviewQuestions = isHost
    ? previewQuestions
    : remoteGameState?.questions_preview || [];

  const ranking = useMemo(() => {
    const rankingItems = [
      { id: 'A', name: teamAName, score: displayScoreA },
      { id: 'B', name: teamBName, score: displayScoreB }
    ];
    return rankingItems.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.id === 'A' && b.id === 'B') return displayTugPosition > 0 ? -1 : 1;
      if (a.id === 'B' && b.id === 'A') return displayTugPosition < 0 ? -1 : 1;
      return 0;
    });
  }, [displayScoreA, displayScoreB, teamAName, teamBName, displayTugPosition]);

  const statusLabel = useMemo(() => {
    switch (displayStatus) {
      case 'playing':
        return 'Đang thi';
      case 'paused':
        return 'Tạm dừng';
      case 'finished':
        return 'Hoàn tất';
      default:
        return 'Chờ bắt đầu';
    }
  }, [displayStatus]);

  const tugPercent = useMemo(() => {
    const maxShift = 40;
    const safePosition = Math.max(-TUG_MAX, Math.min(TUG_MAX, displayTugPosition));
    return 50 - (safePosition / TUG_MAX) * maxShift;
  }, [displayTugPosition]);

  const winner = useMemo(() => {
    if (!displayIsFinished) return null;
    if (displayScoreA > displayScoreB) return 'A';
    if (displayScoreB > displayScoreA) return 'B';
    if (displayTugPosition > 0) return 'A';
    if (displayTugPosition < 0) return 'B';
    return 'draw';
  }, [displayIsFinished, displayScoreA, displayScoreB, displayTugPosition]);

  const resetGame = () => {
    setScoreA(0);
    setScoreB(0);
    setTugPosition(0);
    setSelectedTeam('A');
    setCurrentIndex(0);
    setSelectedOption(null);
    setFeedback(null);
    setGameStatus('lobby');
    setTimeLeft(questionTimeSec);
  };

  const applyAnswer = (optionIndex: number) => {
    if (!isHost) return;
    if (!isGameActive) return;
    if (!currentQuestion || feedback) return;

    const correct = optionIndex === currentQuestion.correctIndex;

    if (selectedTeam === 'A') {
      if (correct) {
        setScoreA((prev) => prev + 1);
        setTugPosition((prev) => Math.min(TUG_MAX, prev + 1));
      } else {
        setScoreA((prev) => prev - 1);
      }
    } else {
      if (correct) {
        setScoreB((prev) => prev + 1);
        setTugPosition((prev) => Math.max(-TUG_MAX, prev - 1));
      } else {
        setScoreB((prev) => prev - 1);
      }
    }

    setSelectedOption(optionIndex);
    setFeedback({ correct, correctIndex: currentQuestion.correctIndex });
  };

  const applyTimeout = () => {
    if (!isHost) return;
    if (!isGameActive) return;
    if (!currentQuestion || feedback) return;
    if (selectedTeam === 'A') {
      setScoreA((prev) => prev - 1);
    } else {
      setScoreB((prev) => prev - 1);
    }
    setSelectedOption(null);
    setFeedback({ correct: false, correctIndex: currentQuestion.correctIndex });
  };

  const nextQuestion = () => {
    if (isPaused) return;
    if (!feedback) return;

    const nextIndex = currentIndex + 1;
    if (nextIndex >= totalQuestions) {
      setCurrentIndex(nextIndex);
      setGameStatus('finished');
      return;
    }

    setCurrentIndex(nextIndex);
    setSelectedOption(null);
    setFeedback(null);
    setTimeLeft(questionTimeSec);

    if (autoSwitchTeam) {
      setSelectedTeam((prev) => (prev === 'A' ? 'B' : 'A'));
    }
  };

  const updateQuestionText = (index: number, value: string) => {
    setQuestions((prev) => {
      const next = prev.map((q, i) => (i === index ? { ...q, question: value } : q));
      syncPlayQuestions(next);
      return next;
    });
  };

  const updateOptionText = (qIndex: number, optIndex: number, value: string) => {
    setQuestions((prev) => {
      const next = prev.map((q, i) => {
        if (i !== qIndex) return q;
        const nextOptions = [...q.options];
        nextOptions[optIndex] = value;
        return { ...q, options: nextOptions };
      });
      syncPlayQuestions(next);
      return next;
    });
  };

  const updateCorrectIndex = (qIndex: number, correctIndex: number) => {
    setQuestions((prev) => {
      const next = prev.map((q, i) => (i === qIndex ? { ...q, correctIndex } : q));
      syncPlayQuestions(next);
      return next;
    });
  };

  const addQuestion = () => {
    const nextId = `q${questions.length + 1}`;
    if (questions.length >= MAX_QUESTIONS) {
      setValidationErrors([`Giới hạn tối đa ${MAX_QUESTIONS} câu hỏi.`]);
      return;
    }
    setQuestions((prev) => {
      const next = [
        ...prev,
        {
          id: nextId,
          question: 'Câu hỏi mới',
          options: Array.from({ length: optionCount }, (_, index) => `Đáp án ${OPTION_LABELS[index]}`),
          correctIndex: 0
        }
      ];
      syncPlayQuestions(next);
      return next;
    });
  };

  const removeQuestion = (index: number) => {
    setQuestions((prev) => {
      const next = prev.filter((_, i) => i !== index);
      syncPlayQuestions(next);
      return next;
    });
    if (currentIndex >= totalQuestions - 1) {
      setCurrentIndex(Math.max(0, totalQuestions - 2));
    }
  };

  const moveQuestion = (from: number, direction: -1 | 1) => {
    setQuestions((prev) => {
      const nextIndex = from + direction;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(nextIndex, 0, item);
      syncPlayQuestions(next);
      return next;
    });
  };

  const duplicateQuestion = (index: number) => {
    setQuestions((prev) => {
      const source = prev[index];
      if (!source) return prev;
      const next = [...prev];
      const copy = {
        ...source,
        id: `q${Date.now()}-${Math.random().toString(16).slice(2)}`
      };
      next.splice(index + 1, 0, copy);
      syncPlayQuestions(next);
      return next;
    });
  };

  const clearQuestions = () => {
    setQuestions([]);
    syncPlayQuestions([]);
    setCurrentIndex(0);
  };

  const normalizeOptionsCount = (items: Question[], targetCount: number) => {
    return items.map((q) => {
      const nextOptions = [...q.options];
      while (nextOptions.length < targetCount) {
        nextOptions.push(`Đáp án ${OPTION_LABELS[nextOptions.length]}`);
      }
      return {
        ...q,
        options: nextOptions.slice(0, targetCount),
        correctIndex: Math.min(targetCount - 1, Math.max(0, q.correctIndex))
      };
    });
  };

  const inferOptionCount = (items: Question[]) => {
    const maxOptions = items.reduce((max, q) => Math.max(max, q.options.length), 0);
    if (maxOptions <= 2) return 2;
    if (maxOptions <= 4) return 4;
    return 6;
  };

  const mapWireQuestions = (
    items: Array<{
      id?: string;
      question?: string;
      options?: string[];
      correct_index?: number;
      correctIndex?: number;
    }>
  ) =>
    items.map((q, index) => ({
      id: q.id || `q${index + 1}`,
      question: q.question || '',
      options: q.options || [],
      correctIndex: typeof q.correct_index === 'number' ? q.correct_index : q.correctIndex ?? 0
    }));

  const syncPlayQuestions = (items: Question[]) => {
    if (gameStatus === 'lobby' || gameStatus === 'finished') {
      setPlayQuestions(items);
    }
  };

  const applyQuestionsSet = (items: Question[]) => {
    setQuestions(items);
    setPlayQuestions(items);
    resetGame();
  };

  const validateQuestions = (items: Question[]) => {
    const errors: string[] = [];
    if (items.length === 0) {
      errors.push('Cần ít nhất 1 câu hỏi.');
    }
    if (items.length > MAX_QUESTIONS) {
      errors.push(`Số câu hỏi vượt quá giới hạn (${MAX_QUESTIONS}).`);
    }
    items.forEach((q, index) => {
      if (!q.question.trim()) {
        errors.push(`Câu ${index + 1}: Nội dung câu hỏi không được để trống.`);
      }
      const emptyOptions = q.options.filter((opt) => !opt.trim());
      if (emptyOptions.length > 0) {
        errors.push(`Câu ${index + 1}: Tất cả đáp án phải có nội dung.`);
      }
      if (q.correctIndex < 0 || q.correctIndex > q.options.length - 1) {
        errors.push(`Câu ${index + 1}: Đáp án đúng phải trong khoảng 0-${q.options.length - 1}.`);
      }
    });
    return errors;
  };

  const exportAsJson = () => {
    const payload = JSON.stringify(questions, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'labtwin-quiz-questions.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportAsCsv = () => {
    const header = ['question', ...OPTION_LABELS.slice(0, optionCount).map((label) => `option${label}`), 'correctIndex'];
    const lines = questions.map((q) => {
      const row = [
        q.question,
        ...q.options.slice(0, optionCount),
        String(q.correctIndex)
      ];
      return row
        .map((cell) => {
          const safe = String(cell ?? '');
          if (safe.includes(',') || safe.includes('\"') || safe.includes('\\n')) {
            return `\"${safe.replace(/\"/g, '\"\"')}\"`;
          }
          return safe;
        })
        .join(',');
    });
    const payload = [header.join(','), ...lines].join('\\n');
    const blob = new Blob([payload], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'labtwin-quiz-questions.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const parseCsvLine = (line: string) => {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '\"') {
        if (inQuotes && line[i + 1] === '\"') {
          current += '\"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }
      if (char === ',' && !inQuotes) {
        cells.push(current.trim());
        current = '';
        continue;
      }
      current += char;
    }
    cells.push(current.trim());
    return cells;
  };

  const normalizeQuestions = (raw: any[]): Question[] => {
    return raw
      .map((item, index) => {
        const question = String(item.question || '').trim();
        const options = Array.isArray(item.options) ? item.options.map((opt: any) => String(opt || '').trim()) : [];
        const correctIndex = Number.isFinite(item.correctIndex) ? Number(item.correctIndex) : Number(item.correctIndex || 0);

        const filledOptions = [...options];
        while (filledOptions.length < optionCount) {
          filledOptions.push(`Đáp án ${OPTION_LABELS[filledOptions.length]}`);
        }

        return {
          id: `q${index + 1}`,
          question,
          options: filledOptions.slice(0, optionCount),
          correctIndex: Math.min(optionCount - 1, Math.max(0, Number.isNaN(correctIndex) ? 0 : correctIndex))
        };
      })
      .filter((q) => q.question.length > 0);
  };

  const importQuestions = () => {
    setImportError(null);
    setImportSuccess(null);
    setValidationErrors([]);

    const content = importText.trim();
    if (!content) {
      setImportError('Vui lòng dán JSON hoặc CSV trước khi import.');
      return;
    }

    try {
      let rawQuestions: any[] = [];

      if (content.startsWith('[') || content.startsWith('{')) {
        const parsed = JSON.parse(content);
        rawQuestions = Array.isArray(parsed) ? parsed : parsed.questions || [];
      } else {
        const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
        if (lines.length === 0) {
          setImportError('CSV rỗng hoặc không hợp lệ.');
          return;
        }

        const header = parseCsvLine(lines[0]).map((cell) => cell.toLowerCase());
        const hasHeader = header.includes('question');
        const dataLines = hasHeader ? lines.slice(1) : lines;

        rawQuestions = dataLines.map((line) => {
          const cells = parseCsvLine(line);
          const question = cells[0] || '';
          const correctIndex = cells[cells.length - 1];
          const options = cells.slice(1, Math.max(2, cells.length - 1));
          return {
            question,
            options,
            correctIndex: Number(correctIndex || 0)
          };
        });
      }

      const normalized = normalizeQuestions(rawQuestions);
      const errors = validateQuestions(normalized);
      if (errors.length > 0) {
        setValidationErrors(errors);
        return;
      }
      if (normalized.length === 0) {
        setImportError('Không tìm thấy câu hỏi hợp lệ.');
        return;
      }

      applyQuestionsSet(normalized);
      setImportSuccess(`Đã import ${normalized.length} câu hỏi.`);
    } catch (error) {
      setImportError('Không thể parse dữ liệu. Hãy kiểm tra lại định dạng JSON/CSV.');
    }
  };

  const handleFileImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      setImportText(result);
    };
    reader.readAsText(file);
  };

  const shuffleArray = <T,>(input: T[]) => {
    const arr = [...input];
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const buildPlayQuestions = () => {
    let base = normalizeOptionsCount(questions, optionCount);
    if (shuffleQuestions) {
      base = shuffleArray(base);
    }
    if (shuffleOptions) {
      base = base.map((q) => {
        const paired = q.options.map((opt, index) => ({ opt, index }));
        const shuffled = shuffleArray(paired);
        const newOptions = shuffled.map((item) => item.opt);
        const newCorrectIndex = shuffled.findIndex((item) => item.index === q.correctIndex);
        return { ...q, options: newOptions, correctIndex: Math.max(0, newCorrectIndex) };
      });
    }
    setPlayQuestions(base);
  };

  const saveQuestionSet = () => {
    setValidationErrors([]);
    setImportError(null);
    setImportSuccess(null);

    if (!setName.trim()) {
      setValidationErrors(['Vui lòng nhập tên bộ câu hỏi.']);
      return;
    }
    if (!teacherName.trim() || !className.trim()) {
      setValidationErrors(['Vui lòng nhập đầy đủ giáo viên và lớp.']);
      return;
    }

    const normalized = normalizeOptionsCount(questions, optionCount);
    const errors = validateQuestions(normalized);
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    const newSet: SavedSet = {
      id: `${Date.now()}`,
      name: setName.trim(),
      teacherName: teacherName.trim(),
      className: className.trim(),
      optionCount,
      questions: normalized,
      createdAt: new Date().toISOString()
    };

    const nextSets = [newSet, ...savedSets].slice(0, 20);
    setSavedSets(nextSets);
    setImportSuccess(`Đã lưu bộ câu hỏi: ${newSet.name}.`);
  };

  const loadQuestionSet = (set: SavedSet) => {
    setOptionCount(set.optionCount as (typeof OPTION_COUNTS)[number]);
    applyQuestionsSet(normalizeOptionsCount(set.questions, set.optionCount));
    setImportSuccess(`Đã tải bộ câu hỏi: ${set.name}.`);
    setImportError(null);
    setValidationErrors([]);
  };

  const deleteQuestionSet = (setId: string) => {
    const nextSets = savedSets.filter((set) => set.id !== setId);
    setSavedSets(nextSets);
  };

  const createLobby = async () => {
    setLobbyError(null);
    
    // If no token, create offline lobby
    if (!hasToken) {
      const offlineCode = 'OFFLINE-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      setLobbyCode(offlineCode);
      setJoinCode(offlineCode);
      setPlayers([]);
      setLobbyError(null);
      toast.success('Đã tạo phòng offline (chế độ đơn)');
      return;
    }
    
    // Try to create online lobby with backend
    try {
      const response = await fetch(`${rustBaseUrl}/api/labtwin/quiz/lobby/create`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${normalizedToken}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const backendMessage = errorData.error || errorData.message;
        if (response.status === 401 || response.status === 403) {
          throw new Error('Token không hợp lệ hoặc không đủ quyền giáo viên.');
        }
        if (response.status >= 500 && backendMessage) {
          throw new Error(backendMessage);
        }
        throw new Error(backendMessage || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      setLobbyCode(data.code);
      setJoinCode(data.code);
      setPlayers([]);
      setLobbyError(null);
      toast.success(`Đã tạo phòng: ${data.code}`);
    } catch (error: any) {
      console.error('Create lobby error:', error);
      setLobbyError(
        `Không thể tạo phòng: ${error.message || 'Backend không phản hồi'}. Hãy kiểm tra token hoặc backend (auth-service/rust).`
      );
    }
  };

  const joinLobby = async () => {
    setLobbyError(null);
    if (!joinCode.trim()) {
      setLobbyError('Vui lòng nhập mã phòng.');
      return;
    }
    if (!playerName.trim()) {
      setLobbyError('Vui lòng nhập tên người chơi.');
      return;
    }

    const normalizedCode = joinCode.trim().toUpperCase();
    setLobbyCode(normalizedCode);

    if (wsStatus !== 'connected') {
      setPendingJoin({ name: playerName.trim(), team: playerTeam });
      setLobbyError('Đang kết nối realtime... Vui lòng bấm Join lại nếu chưa tự vào.');
      return;
    }

    sendWsMessage({
      type: 'join',
      name: playerName.trim(),
      team: playerTeam
    });
    setPlayerName('');
  };

  const removePlayer = async (targetPlayerId: string) => {
    if (!lobbyCode) return;
    if (wsStatus === 'connected') {
      sendWsMessage({ type: 'leave', player_id: targetPlayerId });
    }
    if (playerId === targetPlayerId) {
      setPlayerId(null);
    }
  };

  const startGame = () => {
    if (hasBlockingErrors) return;
    setScoreA(0);
    setScoreB(0);
    setTugPosition(0);
    setSelectedOption(null);
    setFeedback(null);
    setCurrentIndex(0);
    setGameStatus('playing');
    setTimeLeft(questionTimeSec);
    buildPlayQuestions();
  };

  const pauseGame = () => {
    if (!isHost) return;
    if (!isGameActive) return;
    setGameStatus('paused');
  };

  const resumeGame = () => {
    if (!isHost) return;
    if (!isPaused) return;
    setGameStatus('playing');
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem('labtwin_quiz_sets');
      if (raw) {
        const parsed = JSON.parse(raw) as SavedSet[];
        setSavedSets(parsed);
      }
    } catch {
      setSavedSets([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('labtwin_quiz_sets', JSON.stringify(savedSets));
  }, [savedSets]);

  useEffect(() => {
    const errors = validateQuestions(normalizeOptionsCount(questions, optionCount));
    setValidationErrors(errors);
  }, [questions, optionCount]);

  useEffect(() => {
    const normalized = normalizeOptionsCount(questions, optionCount);
    setQuestions(normalized);
    syncPlayQuestions(normalized);
  }, [optionCount]);

  useEffect(() => {
    if (gameStatus === 'lobby' || gameStatus === 'finished') {
      buildPlayQuestions();
    }
  }, [questions, shuffleQuestions, shuffleOptions, optionCount, gameStatus]);

  useEffect(() => {
    if (!lobbyCode) return;
    if (!rustBackendAvailable) {
      setWsStatus('disconnected');
      setLobbyError('Chưa kết nối Rust backend. Tính năng realtime không khả dụng.');
      return;
    }
    
    const raw = hasToken
      ? `?token=${encodeURIComponent(normalizedToken)}`
      : '';
    const wsUrl = `${toWsUrl(rustBaseUrl)}/api/labtwin/quiz/lobby/${lobbyCode}/ws${raw}`;
    setWsStatus('connecting');

    if (wsRef.current) {
      wsRef.current.close();
    }

    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      setWsStatus('connected');
      sendWsMessage({ type: 'ping' });
      setLobbyError(null);
    };

    socket.onclose = () => {
      setWsStatus('disconnected');
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setWsStatus('disconnected');
      setLobbyError('Không thể kết nối realtime. Vui lòng kiểm tra Rust backend.');
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'state') {
          setPlayers(payload.players || []);
        }
        if (payload.type === 'joined') {
          setPlayerId(payload.player_id || null);
          setLobbyError(null);
        }
        if (payload.type === 'game_state') {
          setRemoteGameState(payload.game_state || null);
        }
        if (payload.type === 'host_snapshot') {
          let normalizedSnapshot: Question[] | null = null;
          if (payload.questions && Array.isArray(payload.questions)) {
            const restored = mapWireQuestions(payload.questions);
            const inferredCount = inferOptionCount(restored);
            const normalized = normalizeOptionsCount(restored, inferredCount);
            setOptionCount(inferredCount);
            setQuestions(normalized);
            setPlayQuestions(normalized);
            normalizedSnapshot = normalized;
          }
          if (payload.game_state) {
            const state = payload.game_state;
            setScoreA(state.score_a ?? 0);
            setScoreB(state.score_b ?? 0);
            setTugPosition(state.tug_position ?? 0);
            const maxIndex = normalizedSnapshot ? normalizedSnapshot.length : totalQuestions;
            const nextIndex = Math.min(state.question_index ?? 0, Math.max(0, maxIndex));
            setCurrentIndex(nextIndex);
            setTimeLeft(state.time_left ?? questionTimeSec);
            setQuestionTimeSec(state.question_time ?? questionTimeSec);
            setGameStatus(
              (state.status as GameStatus) || (state.is_finished ? 'finished' : state.question_index > 0 ? 'playing' : 'lobby')
            );
            setSelectedOption(null);
            setFeedback(null);
            setRemoteGameState(state);
          }
        }
        if (payload.type === 'error') {
          setLobbyError(payload.error || 'Lỗi lobby realtime.');
        }
      } catch (parseError) {
        console.error('Error parsing WebSocket message:', parseError);
      }
    };

    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [lobbyCode, rustBaseUrl, teacherToken, rustBackendAvailable]);

  useEffect(() => {
    if (wsStatus !== 'connected' || !pendingJoin || !lobbyCode) return;
    sendWsMessage({
      type: 'join',
      name: pendingJoin.name,
      team: pendingJoin.team
    });
    setPendingJoin(null);
  }, [wsStatus, pendingJoin, lobbyCode]);

  useEffect(() => {
    if (!isHost || !isGameActive || isFinished || feedback) return;
    setTimeLeft(questionTimeSec);
    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [currentIndex, isGameActive, isFinished, feedback, questionTimeSec, isHost]);

  useEffect(() => {
    if (!isHost || !isGameActive || isFinished || feedback) return;
    if (timeLeft > 0) return;
    applyTimeout();
    const timeout = setTimeout(() => {
      nextQuestion();
    }, 1500);
    return () => clearTimeout(timeout);
  }, [timeLeft, isGameActive, isFinished, feedback, isHost]);

  useEffect(() => {
    if (!isHost || wsStatus !== 'connected' || !lobbyCode) return;
    const activeQuestion = currentQuestion ?? playQuestions[0];
    sendWsMessage({
      type: 'host_state',
      game_state: {
        question_index: currentIndex,
        total_questions: totalQuestions,
        time_left: timeLeft,
        question_time: questionTimeSec,
        score_a: scoreA,
        score_b: scoreB,
        tug_position: tugPosition,
        is_finished: isFinished,
        status: gameStatus,
        question_text: activeQuestion?.question || '',
        options: activeQuestion?.options || [],
        questions_preview: previewQuestions
      },
      questions: wireQuestions
    });
  }, [
    isHost,
    wsStatus,
    lobbyCode,
    currentIndex,
    totalQuestions,
    timeLeft,
    scoreA,
    scoreB,
    tugPosition,
    isFinished,
    currentQuestion,
    questionTimeSec,
    gameStatus,
    previewQuestions,
    wireQuestions,
    playQuestions
  ]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fef9c3,_#fef3c7_35%,_#ecfccb_70%,_#dcfce7_100%)]">
      <div className="container mx-auto px-4 py-8">
        <Link
          href="/dashboard/labtwin/labs"
          className="inline-flex items-center text-emerald-700 hover:text-emerald-800 mb-6 font-medium"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Quay lại LabTwin
        </Link>

        {/* Backend Status Warning */}
        {!rustBackendAvailable && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900">Rust Backend không khả dụng</h3>
                <p className="text-sm text-amber-700 mt-1">
                  Trò chơi vẫn hoạt động ở chế độ offline (không có realtime multiplayer). 
                  Để sử dụng tính năng lobby/realtime, vui lòng khởi động Rust backend tại: <code className="bg-amber-100 px-2 py-0.5 rounded">{rustBaseUrl}</code>
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-emerald-500 to-lime-500 rounded-2xl text-white shadow-lg">
                <Trophy className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Quiz Kéo Co Hai Đội</h1>
                <p className="text-gray-600 mt-1">
                  Thi đấu trắc nghiệm giữa hai đội. Đội trả lời đúng kéo dây về phía mình.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowEditor((prev) => !prev)}>
                {showEditor ? 'Ẩn biên tập câu hỏi' : 'Biên tập câu hỏi'}
              </Button>
              <Button onClick={resetGame} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <RefreshCcw className="mr-2 h-4 w-4" />
                Làm mới trận
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1 border-2 border-emerald-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-emerald-600" />
                  Thiết lập đội
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Tên đội A (trái)</label>
                  <Input value={teamAName} onChange={(e) => setTeamAName(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Tên đội B (phải)</label>
                  <Input value={teamBName} onChange={(e) => setTeamBName(e.target.value)} />
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    id="auto-switch"
                    type="checkbox"
                    checked={autoSwitchTeam}
                    onChange={(e) => setAutoSwitchTeam(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600"
                  />
                  <label htmlFor="auto-switch">Tự đổi đội sau mỗi câu</label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={shuffleQuestions}
                      onChange={(e) => setShuffleQuestions(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-emerald-600"
                    />
                    Auto-shuffle câu hỏi
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={shuffleOptions}
                      onChange={(e) => setShuffleOptions(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-emerald-600"
                    />
                    Auto-shuffle đáp án
                  </label>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <span>Số lựa chọn:</span>
                  {OPTION_COUNTS.map((count) => (
                    <Button
                      key={`opt-${count}`}
                      size="sm"
                      variant={optionCount === count ? 'default' : 'outline'}
                      onClick={() => setOptionCount(count)}
                      className={optionCount === count ? 'bg-emerald-600 text-white hover:bg-emerald-700' : ''}
                    >
                      {count} đáp án
                    </Button>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <span>Thời gian mỗi câu (giây):</span>
                  <Input
                    type="number"
                    min={5}
                    max={120}
                    value={questionTimeSec}
                    onChange={(e) => {
                      const value = Math.max(5, Math.min(120, Number(e.target.value || 20)));
                      setQuestionTimeSec(value);
                      setTimeLeft(value);
                    }}
                    className="w-24"
                  />
                </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-100 text-emerald-800 border-0">
                      {displayTotalQuestions} câu hỏi
                    </Badge>
                    <Badge className="bg-yellow-100 text-yellow-800 border-0">
                      Điểm sai: -1
                    </Badge>
                    <Badge className="bg-gray-100 text-gray-700 border-0">
                    {optionCount} lựa chọn
                  </Badge>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-white p-4">
                  <div className="font-semibold text-emerald-900 mb-3">Lobby/Join</div>
                  <div className="mb-3 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                    <p className="text-sm text-emerald-800">
                      <strong>Chế độ offline:</strong> Không cần token, chơi trực tiếp trên máy này.
                      <br />
                      <strong>Chế độ online:</strong> Nhập token giáo viên để tạo phòng realtime.
                      <br />
                      Có thể dán token dạng <code className="bg-white px-1 rounded">Bearer xxx</code> hoặc chỉ token.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                    <Input
                      placeholder="Token giáo viên (optional - để trống nếu chơi offline)"
                      value={teacherToken}
                      onChange={(e) => setTeacherToken(e.target.value)}
                    />
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Badge className={isHost ? 'bg-emerald-100 text-emerald-800 border-0' : 'bg-gray-100 text-gray-700 border-0'}>
                        {isHost ? 'Chế độ giáo viên' : 'Chế độ offline'}
                      </Badge>
                    </div>
                  </div>
                  {hasToken && (
                    <div className="mb-2 text-xs text-emerald-700">
                      Token đã nhận ({normalizedToken.slice(0, 8)}...{normalizedToken.slice(-6)})
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <Button onClick={createLobby} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                      {isHost ? 'Tạo phòng online' : 'Tạo phòng offline'}
                    </Button>
                    <Badge className="bg-emerald-100 text-emerald-800 border-0">
                      Mã phòng: {lobbyCode || '---'}
                    </Badge>
                    <Badge className={wsStatus === 'connected' ? 'bg-green-100 text-green-800 border-0' : 'bg-gray-100 text-gray-700 border-0'}>
                      Realtime: {wsStatus === 'connected' ? 'Online' : wsStatus === 'connecting' ? 'Đang kết nối' : 'Offline'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                    <Input
                      placeholder="Nhập mã phòng"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    />
                    <Input
                      placeholder="Tên người chơi"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <Button
                      size="sm"
                      variant={playerTeam === 'A' ? 'default' : 'outline'}
                      onClick={() => setPlayerTeam('A')}
                      className={playerTeam === 'A' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : ''}
                    >
                      Đội A
                    </Button>
                    <Button
                      size="sm"
                      variant={playerTeam === 'B' ? 'default' : 'outline'}
                      onClick={() => setPlayerTeam('B')}
                      className={playerTeam === 'B' ? 'bg-orange-500 text-white hover:bg-orange-600' : ''}
                    >
                      Đội B
                    </Button>
                    <Button size="sm" onClick={joinLobby}>
                      Join
                    </Button>
                  </div>
                  {lobbyError && <div className="text-sm text-red-600">{lobbyError}</div>}
                  {players.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {players.map((player) => (
                        <div key={player.id} className="flex items-center justify-between text-sm">
                          <span>
                            {player.name} • {player.team === 'A' ? teamAName : teamBName}
                          </span>
                          <Button variant="outline" size="sm" onClick={() => removePlayer(player.id)}>
                            Xóa
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  {displayPreviewQuestions.length > 0 && (
                    <div className="mt-4">
                      <div className="text-sm font-semibold text-emerald-900 mb-2">Lobby preview câu hỏi</div>
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {displayPreviewQuestions.map((question, index) => (
                          <div key={`preview-${index}`} className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-2">
                            <div className="flex items-start gap-2">
                              <Badge className="bg-white text-emerald-700 border-0">#{index + 1}</Badge>
                              <div>
                                <div className="text-sm font-medium text-gray-800">{question.question}</div>
                                <div className="text-xs text-gray-500 mt-1">{question.options.join(' • ')}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 border-2 border-emerald-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Swords className="h-5 w-5 text-emerald-600" />
                  Bảng thi đấu
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-emerald-700">{teamAName}</div>
                        <div className="text-3xl font-bold text-emerald-900">{displayScoreA}</div>
                      </div>
                      <Flag className="h-6 w-6 text-emerald-600" />
                    </div>
                  </div>
                  <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-orange-700">{teamBName}</div>
                        <div className="text-3xl font-bold text-orange-900">{displayScoreB}</div>
                      </div>
                      <Flag className="h-6 w-6 text-orange-600" />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between text-sm text-gray-600">
                    <span>{teamAName}</span>
                    <span>{teamBName}</span>
                  </div>
                  <div className="relative h-4 rounded-full bg-gradient-to-r from-emerald-300 via-gray-200 to-orange-300">
                    <div className="absolute inset-y-0 left-1/2 w-0.5 bg-gray-600/60" />
                    <div
                      className="absolute -top-3 flex items-center"
                      style={{ left: `calc(${tugPercent}% - 14px)` }}
                    >
                      <div className="h-10 w-10 rounded-full bg-white border-2 border-gray-300 shadow flex items-center justify-center">
                        <Trophy className="h-5 w-5 text-emerald-600" />
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">Kéo dây về phía đội thắng.</div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700">Đội đang trả lời:</span>
                  <Button
                    variant={selectedTeam === 'A' ? 'default' : 'outline'}
                    onClick={() => setSelectedTeam('A')}
                    className={selectedTeam === 'A' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : ''}
                    disabled={!isHost}
                  >
                    {teamAName}
                  </Button>
                  <Button
                    variant={selectedTeam === 'B' ? 'default' : 'outline'}
                    onClick={() => setSelectedTeam('B')}
                    className={selectedTeam === 'B' ? 'bg-orange-500 text-white hover:bg-orange-600' : ''}
                    disabled={!isHost}
                  >
                    {teamBName}
                  </Button>
                </div>

                {((isHost && feedback) || (!isHost && remoteGameState)) && !displayIsFinished && (
                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <div className="text-sm text-gray-500 mb-2">Xếp hạng tạm thời</div>
                    <div className="space-y-2">
                      {ranking.map((team, index) => (
                        <div key={team.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-gray-100 text-gray-700 border-0">#{index + 1}</Badge>
                            <span className="font-medium text-gray-800">{team.name}</span>
                          </div>
                          <span className="font-semibold text-gray-900">{team.score} điểm</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border-2 border-emerald-100">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Vòng câu hỏi</span>
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-100 text-emerald-800 border-0">
                    {displayIsFinished ? 'Hoàn tất' : `Câu ${displayQuestionIndex + 1}/${displayTotalQuestions}`}
                  </Badge>
                  <Badge className="bg-gray-100 text-gray-700 border-0">{statusLabel}</Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {displayIsFinished ? (
                <div className="text-center py-8">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                    <Crown className="h-8 w-8 text-emerald-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Kết quả</h3>
                  {winner === 'draw' ? (
                    <p className="text-gray-600">Hai đội hòa nhau. Hãy chơi thêm vòng phụ!</p>
                  ) : (
                    <p className="text-gray-600">
                      Đội chiến thắng: <span className="font-semibold">{winner === 'A' ? teamAName : teamBName}</span>
                    </p>
                  )}
                  <div className="mt-4 flex justify-center gap-2">
                    <Button onClick={resetGame} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                      Chơi lại
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {hasBlockingErrors && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                      Vui lòng sửa lỗi trong bộ câu hỏi trước khi bắt đầu.
                    </div>
                  )}
                  <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <div className="text-sm uppercase tracking-widest text-gray-400">Câu hỏi</div>
                        <h3 className="text-2xl md:text-3xl font-semibold text-gray-900 mt-2">
                          {displayQuestionText}
                        </h3>
                      </div>
                      <div className="flex items-center gap-3 rounded-full bg-gray-100 px-4 py-2 text-sm text-gray-600">
                        <Timer className="h-4 w-4" />
                        <span>{displayTimeLeft}s</span>
                        <div className="h-2 w-24 rounded-full bg-white">
                          <div
                            className="h-2 rounded-full bg-emerald-500 transition-all"
                            style={{ width: `${Math.max(0, Math.min(100, (displayTimeLeft / Math.max(1, displayQuestionTime)) * 100))}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={`grid grid-cols-1 ${optionCount > 4 ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
                    {displayOptions.map((option, index) => {
                      const isSelected = selectedOption === index;
                      const isCorrect = feedback?.correctIndex === index;
                      const theme = ANSWER_THEMES[index % ANSWER_THEMES.length];
                      const Icon = theme.icon;

                      return (
                        <Button
                          key={`option-${index}`}
                          variant="outline"
                          className={`h-auto py-6 px-5 text-left justify-start border-2 text-white rounded-2xl shadow-md ${
                            feedback
                              ? isCorrect
                                ? 'border-emerald-200 bg-emerald-500/90'
                                : isSelected
                                  ? 'border-red-200 bg-red-500/90'
                                  : 'border-gray-200 bg-gray-200 text-gray-500'
                              : `${theme.bg} ${theme.hover} ${theme.border}`
                          }`}
                          onClick={() => applyAnswer(index)}
                          disabled={!!feedback || hasBlockingErrors || !isHost || !isGameActive}
                        >
                          <div className="flex items-center gap-4 w-full">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white">
                              <Icon className="h-6 w-6" />
                            </div>
                            <div className="flex-1 text-base md:text-lg font-semibold">
                              {OPTION_LABELS[index]}. {option}
                            </div>
                          </div>
                          {feedback && isCorrect && <CheckCircle2 className="ml-auto h-5 w-5" />}
                          {feedback && isSelected && !isCorrect && <XCircle className="ml-auto h-5 w-5" />}
                        </Button>
                      );
                    })}
                  </div>

                  {feedback && (
                    <div className={`rounded-2xl p-4 ${feedback.correct ? 'bg-emerald-50' : 'bg-red-50'}`}>
                      <div className="flex items-center gap-2">
                        {feedback.correct ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                        <span className="font-medium">
                          {feedback.correct ? 'Chính xác!' : 'Sai rồi!'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Đội {selectedTeam === 'A' ? teamAName : teamBName} {feedback.correct ? 'kéo dây về phía mình.' : 'bị trừ 1 điểm.'}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      {isHost
                        ? `Lượt trả lời: ${selectedTeam === 'A' ? teamAName : teamBName}`
                        : 'Chế độ theo dõi trực tiếp'}
                    </div>
                    <div className="flex items-center gap-2">
                      {(displayStatus === 'lobby' || displayStatus === 'finished') && (
                        <Button
                          onClick={startGame}
                          disabled={hasBlockingErrors || !isHost}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          Bắt đầu trận
                        </Button>
                      )}
                      {isPaused && (
                        <Button
                          onClick={resumeGame}
                          disabled={!isHost}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          Tiếp tục
                        </Button>
                      )}
                      {isGameActive && (
                        <Button variant="outline" onClick={pauseGame} disabled={!isHost}>
                          Tạm dừng
                        </Button>
                      )}
                      <Button
                        onClick={nextQuestion}
                        disabled={!feedback || !isHost || isPaused}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {displayQuestionIndex + 1 >= displayTotalQuestions ? 'Xem kết quả' : 'Câu tiếp theo'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {showEditor && (
            <Card className="border-2 border-emerald-100">
              <CardHeader>
                <CardTitle>Biên tập câu hỏi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl border border-emerald-200 bg-white p-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <div className="text-sm uppercase tracking-widest text-gray-400">Tổng quan bộ câu hỏi</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge className="bg-emerald-100 text-emerald-800 border-0">
                          {questions.length} câu
                        </Badge>
                        <Badge className="bg-gray-100 text-gray-700 border-0">
                          {optionCount} lựa chọn
                        </Badge>
                        <Badge className="bg-yellow-100 text-yellow-800 border-0">
                          {questionTimeSec}s/câu
                        </Badge>
                        <Badge className="bg-sky-100 text-sky-800 border-0">~{estimatedMinutes} phút</Badge>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={addQuestion} disabled={questions.length >= MAX_QUESTIONS}>
                        + Thêm câu hỏi
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => duplicateQuestion(Math.max(0, questions.length - 1))}
                        disabled={questions.length === 0}
                      >
                        Nhân bản câu cuối
                      </Button>
                      <Button variant="outline" onClick={clearQuestions} disabled={questions.length === 0}>
                        Xóa tất cả
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-gray-500">
                    Gợi ý: Bật auto-shuffle để học sinh nhận thứ tự câu hỏi/đáp án khác nhau khi bắt đầu trận.
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
                    <div className="font-semibold text-emerald-900">Import câu hỏi (JSON hoặc CSV)</div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setImportText(JSON.stringify(DEFAULT_QUESTIONS, null, 2))}
                    >
                      Dán mẫu JSON
                    </Button>
                  </div>
                  <textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    className="w-full h-32 rounded-lg border border-emerald-200 p-3 text-sm bg-white"
                    placeholder="Dán JSON hoặc CSV tại đây..."
                  />
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <input
                      type="file"
                      accept=".json,.csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileImport(file);
                      }}
                      className="text-sm"
                    />
                    <Button onClick={importQuestions} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                      Import câu hỏi
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        applyQuestionsSet(normalizeOptionsCount(DEFAULT_QUESTIONS, optionCount));
                        setImportSuccess('Đã dùng bộ câu hỏi mặc định.');
                        setImportError(null);
                        setValidationErrors([]);
                      }}
                    >
                      Dùng bộ mặc định
                    </Button>
                    <Button variant="outline" onClick={exportAsJson}>
                      Export JSON
                    </Button>
                    <Button variant="outline" onClick={exportAsCsv}>
                      Export CSV
                    </Button>
                  </div>
                  {importError && <div className="text-sm text-red-600 mt-2">{importError}</div>}
                  {importSuccess && <div className="text-sm text-emerald-700 mt-2">{importSuccess}</div>}
                  {validationErrors.length > 0 && (
                    <div className="mt-3 space-y-1 text-sm text-red-600">
                      {validationErrors.map((error, index) => (
                        <div key={`err-${index}`}>• {error}</div>
                      ))}
                    </div>
                  )}
                  <div className="text-xs text-emerald-700 mt-2">
                    CSV cột: question, optionA...option{OPTION_LABELS[optionCount - 1]}, correctIndex (0-{optionCount - 1}).
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 p-4 bg-white">
                  <div className="font-semibold text-gray-800 mb-3">Lưu bộ câu hỏi theo lớp/giáo viên</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
                    <Input
                      placeholder="Tên bộ câu hỏi"
                      value={setName}
                      onChange={(e) => setSetName(e.target.value)}
                    />
                    <Input
                      placeholder="Tên giáo viên"
                      value={teacherName}
                      onChange={(e) => setTeacherName(e.target.value)}
                    />
                    <Input
                      placeholder="Lớp"
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={saveQuestionSet} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                      Lưu bộ câu hỏi
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSetName('');
                        setTeacherName('');
                        setClassName('');
                      }}
                    >
                      Làm trống
                    </Button>
                  </div>
                </div>

                {savedSets.length > 0 && (
                  <div className="rounded-2xl border border-gray-200 p-4 bg-white">
                    <div className="font-semibold text-gray-800 mb-3">Bộ câu hỏi đã lưu</div>
                    <div className="space-y-2">
                      {savedSets.map((set) => (
                        <div
                          key={set.id}
                          className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 rounded-lg border border-gray-200 p-3"
                        >
                          <div>
                            <div className="font-medium text-gray-900">{set.name}</div>
                            <div className="text-xs text-gray-600">
                              {set.teacherName} • {set.className} • {set.questions.length} câu • {set.optionCount} đáp án
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => loadQuestionSet(set)}>
                              Tải
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => deleteQuestionSet(set.id)}>
                              Xóa
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {questions.map((q, qIndex) => {
                    const hasEmptyQuestion = !q.question.trim();
                    const emptyOptions = q.options.filter((opt) => !opt.trim()).length;
                    const hasError = hasEmptyQuestion || emptyOptions > 0;

                    return (
                      <div
                        key={q.id}
                        className={`rounded-2xl border p-4 bg-white ${hasError ? 'border-red-200' : 'border-gray-200'}`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-emerald-100 text-emerald-800 border-0">Câu {qIndex + 1}</Badge>
                            {hasError && (
                              <span className="text-xs text-red-600">
                                {hasEmptyQuestion ? 'Thiếu nội dung câu hỏi' : `Thiếu ${emptyOptions} đáp án`}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => moveQuestion(qIndex, -1)}
                              disabled={qIndex === 0}
                            >
                              <ChevronUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => moveQuestion(qIndex, 1)}
                              disabled={qIndex === questions.length - 1}
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => duplicateQuestion(qIndex)}>
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => removeQuestion(qIndex)}>
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </div>
                        <Input
                          value={q.question}
                          onChange={(e) => updateQuestionText(qIndex, e.target.value)}
                          className="mb-3"
                          placeholder="Nhập nội dung câu hỏi..."
                        />
                        <div className={`grid grid-cols-1 ${optionCount > 4 ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-2`}>
                          {q.options.map((option, optIndex) => (
                            <label
                              key={`${q.id}-opt-${optIndex}`}
                              className={`flex items-center gap-2 border rounded-lg p-2 ${
                                q.correctIndex === optIndex ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`correct-${q.id}`}
                                checked={q.correctIndex === optIndex}
                                onChange={() => updateCorrectIndex(qIndex, optIndex)}
                              />
                              <Input
                                value={option}
                                onChange={(e) => updateOptionText(qIndex, optIndex, e.target.value)}
                              />
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="text-xs text-gray-500">Giới hạn tối đa {MAX_QUESTIONS} câu hỏi.</div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
