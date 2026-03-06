"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

interface CompetitionProblem {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: 'programming' | 'mathematics';
  points: number;
  timeLimit: number; // in minutes
  testCases: Array<{
    input: string;
    expectedOutput: string;
    isHidden: boolean;
  }>;
  sampleInput: string;
  sampleOutput: string;
  constraints: string;
  hints: string[];
  tags: string[];
}

interface CompetitionSubmission {
  id: string;
  competitionId: string;
  problemId: string;
  userId: string;
  userName: string;
  code: string;
  language: 'python' | 'javascript' | 'java' | 'cpp';
  status: 'pending' | 'accepted' | 'wrong-answer' | 'time-limit' | 'runtime-error' | 'compilation-error';
  score: number;
  executionTime: number; // in milliseconds
  memoryUsed: number; // in MB
  submittedAt: string;
  feedback?: string;
}

interface Competition {
  id: string;
  title: string;
  description: string;
  type: 'programming' | 'mathematics' | 'mixed';
  status: 'upcoming' | 'active' | 'ended' | 'cancelled';
  startDate: string;
  endDate: string;
  duration: number; // in minutes
  maxParticipants: number;
  currentParticipants: number;
  problems: CompetitionProblem[];
  submissions: CompetitionSubmission[];
  leaderboard: Array<{
    rank: number;
    userId: string;
    userName: string;
    totalScore: number;
    totalTime: number;
    problemsSolved: number;
    submissions: number;
  }>;
  rules: string[];
  prizes: Array<{
    position: number;
    title: string;
    description: string;
    value: string;
  }>;
  isPublic: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface CompetitionContextType {
  competitions: Competition[];
  addCompetition: (competition: Omit<Competition, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateCompetition: (id: string, competition: Partial<Competition>) => void;
  deleteCompetition: (id: string) => void;
  getCompetition: (id: string) => Competition | undefined;
  submitSolution: (competitionId: string, problemId: string, submission: Omit<CompetitionSubmission, 'id' | 'submittedAt'>) => void;
  getLeaderboard: (competitionId: string) => Competition['leaderboard'];
  getMySubmissions: (competitionId: string, userId: string) => CompetitionSubmission[];
}

const CompetitionContext = createContext<CompetitionContextType | undefined>(undefined);

export const useCompetition = () => {
  const context = useContext(CompetitionContext);
  if (context === undefined) {
    throw new Error('useCompetition must be used within a CompetitionProvider');
  }
  return context;
};

// Mock data - Cuộc thi lập trình và toán học
const initialCompetitions: Competition[] = [
  {
    id: "comp_1",
    title: "Cuộc thi Lập trình Python cơ bản",
    description: "Cuộc thi lập trình Python dành cho học sinh mới bắt đầu. Thử thách với các bài toán thuật toán cơ bản.",
    type: "programming",
    status: "active",
    startDate: "2024-01-15T09:00:00Z",
    endDate: "2024-01-15T12:00:00Z",
    duration: 180,
    maxParticipants: 100,
    currentParticipants: 45,
    problems: [
      {
        id: "prob_1",
        title: "Tính tổng hai số",
        description: "Viết chương trình nhập vào hai số nguyên và in ra tổng của chúng.",
        difficulty: "easy",
        category: "programming",
        points: 10,
        timeLimit: 1,
        testCases: [
          { input: "5\n3", expectedOutput: "8", isHidden: false },
          { input: "10\n20", expectedOutput: "30", isHidden: true },
          { input: "-5\n3", expectedOutput: "-2", isHidden: true }
        ],
        sampleInput: "5\n3",
        sampleOutput: "8",
        constraints: "1 ≤ a, b ≤ 1000",
        hints: ["Sử dụng hàm input() để nhập dữ liệu", "Sử dụng hàm int() để chuyển đổi kiểu dữ liệu"],
        tags: ["python", "basic", "arithmetic"]
      },
      {
        id: "prob_2",
        title: "Kiểm tra số nguyên tố",
        description: "Viết chương trình kiểm tra một số có phải là số nguyên tố hay không.",
        difficulty: "medium",
        category: "programming",
        points: 20,
        timeLimit: 2,
        testCases: [
          { input: "17", expectedOutput: "True", isHidden: false },
          { input: "15", expectedOutput: "False", isHidden: true },
          { input: "2", expectedOutput: "True", isHidden: true }
        ],
        sampleInput: "17",
        sampleOutput: "True",
        constraints: "1 ≤ n ≤ 10000",
        hints: ["Số nguyên tố chỉ chia hết cho 1 và chính nó", "Kiểm tra từ 2 đến sqrt(n)"],
        tags: ["python", "algorithm", "prime"]
      }
    ],
    submissions: [],
    leaderboard: [
      { rank: 1, userId: "user_1", userName: "Nguyễn Văn An", totalScore: 30, totalTime: 45, problemsSolved: 2, submissions: 3 },
      { rank: 2, userId: "user_2", userName: "Trần Thị Bình", totalScore: 20, totalTime: 60, problemsSolved: 1, submissions: 2 },
      { rank: 3, userId: "user_3", userName: "Lê Văn Cường", totalScore: 10, totalTime: 30, problemsSolved: 1, submissions: 1 }
    ],
    rules: [
      "Thời gian thi: 3 giờ",
      "Được phép sử dụng tài liệu tham khảo",
      "Không được trao đổi với thí sinh khác",
      "Nộp bài trước khi hết thời gian"
    ],
    prizes: [
      { position: 1, title: "Giải Nhất", description: "Học bổng 1 triệu VNĐ", value: "1,000,000 VNĐ" },
      { position: 2, title: "Giải Nhì", description: "Học bổng 500,000 VNĐ", value: "500,000 VNĐ" },
      { position: 3, title: "Giải Ba", description: "Học bổng 300,000 VNĐ", value: "300,000 VNĐ" }
    ],
    isPublic: true,
    createdBy: "admin_1",
    createdAt: "2024-01-10T00:00:00Z",
    updatedAt: "2024-01-10T00:00:00Z"
  },
  {
    id: "comp_2",
    title: "Olympic Toán học THPT",
    description: "Cuộc thi toán học dành cho học sinh THPT với các bài toán từ cơ bản đến nâng cao.",
    type: "mathematics",
    status: "upcoming",
    startDate: "2024-02-01T08:00:00Z",
    endDate: "2024-02-01T11:00:00Z",
    duration: 180,
    maxParticipants: 200,
    currentParticipants: 120,
    problems: [
      {
        id: "math_1",
        title: "Giải phương trình bậc hai",
        description: "Giải phương trình ax² + bx + c = 0 và tìm nghiệm.",
        difficulty: "easy",
        category: "mathematics",
        points: 15,
        timeLimit: 5,
        testCases: [
          { input: "1 -5 6", expectedOutput: "x1 = 3, x2 = 2", isHidden: false },
          { input: "1 2 1", expectedOutput: "x = -1", isHidden: true },
          { input: "1 1 1", expectedOutput: "Vô nghiệm", isHidden: true }
        ],
        sampleInput: "1 -5 6",
        sampleOutput: "x1 = 3, x2 = 2",
        constraints: "a ≠ 0, |a|, |b|, |c| ≤ 100",
        hints: ["Sử dụng công thức nghiệm", "Xét trường hợp Δ = b² - 4ac"],
        tags: ["math", "quadratic", "equation"]
      },
      {
        id: "math_2",
        title: "Tính tích phân",
        description: "Tính tích phân của hàm f(x) = x² + 2x + 1 từ 0 đến 2.",
        difficulty: "hard",
        category: "mathematics",
        points: 25,
        timeLimit: 10,
        testCases: [
          { input: "", expectedOutput: "26/3", isHidden: false },
          { input: "", expectedOutput: "26/3", isHidden: true }
        ],
        sampleInput: "",
        sampleOutput: "26/3",
        constraints: "Sử dụng công thức tích phân cơ bản",
        hints: ["Tìm nguyên hàm của f(x)", "Áp dụng định lý cơ bản của tích phân"],
        tags: ["math", "calculus", "integral"]
      }
    ],
    submissions: [],
    leaderboard: [],
    rules: [
      "Thời gian thi: 3 giờ",
      "Được sử dụng máy tính cầm tay",
      "Không được sử dụng điện thoại",
      "Nộp bài đúng thời gian quy định"
    ],
    prizes: [
      { position: 1, title: "Huy chương Vàng", description: "Học bổng 2 triệu VNĐ", value: "2,000,000 VNĐ" },
      { position: 2, title: "Huy chương Bạc", description: "Học bổng 1.5 triệu VNĐ", value: "1,500,000 VNĐ" },
      { position: 3, title: "Huy chương Đồng", description: "Học bổng 1 triệu VNĐ", value: "1,000,000 VNĐ" }
    ],
    isPublic: true,
    createdBy: "admin_1",
    createdAt: "2024-01-20T00:00:00Z",
    updatedAt: "2024-01-20T00:00:00Z"
  },
  {
    id: "comp_3",
    title: "Hackathon AI & Machine Learning",
    description: "Cuộc thi lập trình AI và Machine Learning dành cho sinh viên và học sinh THPT.",
    type: "mixed",
    status: "ended",
    startDate: "2024-01-01T09:00:00Z",
    endDate: "2024-01-01T18:00:00Z",
    duration: 540,
    maxParticipants: 50,
    currentParticipants: 35,
    problems: [
      {
        id: "ai_1",
        title: "Phân loại ảnh chó và mèo",
        description: "Xây dựng mô hình AI để phân loại ảnh chó và mèo với độ chính xác cao nhất.",
        difficulty: "hard",
        category: "programming",
        points: 50,
        timeLimit: 60,
        testCases: [
          { input: "dog_image.jpg", expectedOutput: "Dog", isHidden: false },
          { input: "cat_image.jpg", expectedOutput: "Cat", isHidden: true }
        ],
        sampleInput: "sample_dog.jpg",
        sampleOutput: "Dog",
        constraints: "Sử dụng Python, TensorFlow hoặc PyTorch",
        hints: ["Sử dụng Convolutional Neural Network", "Data augmentation có thể giúp cải thiện kết quả"],
        tags: ["ai", "machine-learning", "computer-vision", "python"]
      }
    ],
    submissions: [
      {
        id: "sub_1",
        competitionId: "comp_3",
        problemId: "ai_1",
        userId: "user_1",
        userName: "Nguyễn Văn An",
        code: "import tensorflow as tf\n# Model code here...",
        language: "python",
        status: "accepted",
        score: 50,
        executionTime: 1200,
        memoryUsed: 512,
        submittedAt: "2024-01-01T15:30:00Z",
        feedback: "Mô hình hoạt động tốt với độ chính xác 95%"
      }
    ],
    leaderboard: [
      { rank: 1, userId: "user_1", userName: "Nguyễn Văn An", totalScore: 50, totalTime: 120, problemsSolved: 1, submissions: 1 },
      { rank: 2, userId: "user_4", userName: "Phạm Thị Dung", totalScore: 45, totalTime: 150, problemsSolved: 1, submissions: 2 },
      { rank: 3, userId: "user_5", userName: "Hoàng Văn Đức", totalScore: 40, totalTime: 180, problemsSolved: 1, submissions: 3 }
    ],
    rules: [
      "Thời gian thi: 9 giờ",
      "Được sử dụng thư viện AI/ML",
      "Làm việc theo nhóm tối đa 3 người",
      "Trình bày kết quả cuối buổi"
    ],
    prizes: [
      { position: 1, title: "Giải Nhất", description: "Laptop gaming + 5 triệu VNĐ", value: "15,000,000 VNĐ" },
      { position: 2, title: "Giải Nhì", description: "Tablet + 3 triệu VNĐ", value: "8,000,000 VNĐ" },
      { position: 3, title: "Giải Ba", description: "Điện thoại + 2 triệu VNĐ", value: "5,000,000 VNĐ" }
    ],
    isPublic: true,
    createdBy: "admin_1",
    createdAt: "2023-12-15T00:00:00Z",
    updatedAt: "2024-01-01T18:00:00Z"
  }
];

export const CompetitionProvider = ({ children }: { children: React.ReactNode }) => {
  const [competitions, setCompetitions] = useState<Competition[]>(initialCompetitions);

  // Load competitions from localStorage
  useEffect(() => {
    const savedCompetitions = localStorage.getItem('competitions');
    if (savedCompetitions) {
      try {
        const parsed = JSON.parse(savedCompetitions);
        setCompetitions(parsed);
      } catch (error) {
        console.error('Error loading competitions from localStorage:', error);
      }
    }
  }, []);

  // Save competitions to localStorage
  useEffect(() => {
    localStorage.setItem('competitions', JSON.stringify(competitions));
  }, [competitions]);

  const addCompetition = (competition: Omit<Competition, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newCompetition: Competition = {
      ...competition,
      id: `comp_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setCompetitions(prev => [...prev, newCompetition]);
  };

  const updateCompetition = (id: string, updates: Partial<Competition>) => {
    setCompetitions(prev => prev.map(comp => 
      comp.id === id 
        ? { ...comp, ...updates, updatedAt: new Date().toISOString() }
        : comp
    ));
  };

  const deleteCompetition = (id: string) => {
    setCompetitions(prev => prev.filter(comp => comp.id !== id));
  };

  const getCompetition = (id: string) => {
    return competitions.find(comp => comp.id === id);
  };

  const submitSolution = (competitionId: string, problemId: string, submission: Omit<CompetitionSubmission, 'id' | 'submittedAt'>) => {
    const newSubmission: CompetitionSubmission = {
      ...submission,
      id: `sub_${Date.now()}`,
      submittedAt: new Date().toISOString()
    };

    setCompetitions(prev => prev.map(comp => 
      comp.id === competitionId 
        ? { 
            ...comp, 
            submissions: [...comp.submissions, newSubmission],
            updatedAt: new Date().toISOString()
          }
        : comp
    ));
  };

  const getLeaderboard = (competitionId: string) => {
    const competition = competitions.find(comp => comp.id === competitionId);
    return competition?.leaderboard || [];
  };

  const getMySubmissions = (competitionId: string, userId: string) => {
    const competition = competitions.find(comp => comp.id === competitionId);
    return competition?.submissions.filter(sub => sub.userId === userId) || [];
  };

  return (
    <CompetitionContext.Provider value={{
      competitions,
      addCompetition,
      updateCompetition,
      deleteCompetition,
      getCompetition,
      submitSolution,
      getLeaderboard,
      getMySubmissions
    }}>
      {children}
    </CompetitionContext.Provider>
  );
};

