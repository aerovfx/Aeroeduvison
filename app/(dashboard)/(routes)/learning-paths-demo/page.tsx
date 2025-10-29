'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Brain, Target, TrendingUp, Clock, Star, Award, Users, Zap,
  BookOpen, Play, CheckCircle, ArrowRight, BarChart3, PieChart,
  Lightbulb, MessageCircle, Trophy, Calendar, Activity, Heart,
  Cpu, Database, Gamepad2, Rocket, Beaker, Sparkles, Eye,
  Calculator, Atom, Dna, Code2, ChevronRight, ChevronLeft
} from 'lucide-react';

export default function LearningPathsDemoPage() {
  const { t } = useLanguage();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<any>({});
  const [showResults, setShowResults] = useState(false);
  const [personalityProfile, setPersonalityProfile] = useState<any>(null);
  const [recommendedPaths, setRecommendedPaths] = useState<any[]>([]);
  const [pathSaved, setPathSaved] = useState(false);

  // Sample XP data (would come from dashboard)
  const userXP = {
    mathematics: 2450,
    physics: 1890,
    chemistry: 1650,
    biology: 1920,
    programming: 3200,
    ai_ml: 2100,
    total: 13210
  };

  const quizQuestions = [
    // E vs I - Năng lượng học tập
    {
      id: 'energy_source',
      question: 'Bạn cảm thấy năng lượng học tập tốt nhất khi nào?',
      options: [
        { value: 'E', label: 'Học nhóm, thảo luận với bạn bè', icon: '👥', description: 'Extraversion' },
        { value: 'I', label: 'Học một mình, tập trung sâu', icon: '🧘', description: 'Introversion' }
      ]
    },
    {
      id: 'social_learning',
      question: 'Bạn thích học như thế nào hơn?',
      options: [
        { value: 'E', label: 'Thuyết trình, chia sẻ ý tưởng', icon: '🎤', description: 'Extraversion' },
        { value: 'I', label: 'Lắng nghe, suy ngẫm cá nhân', icon: '🤔', description: 'Introversion' }
      ]
    },
    
    // S vs N - Cách tiếp nhận thông tin
    {
      id: 'information_style',
      question: 'Bạn thích tiếp nhận thông tin như thế nào?',
      options: [
        { value: 'S', label: 'Chi tiết cụ thể, ví dụ thực tế', icon: '📋', description: 'Sensing' },
        { value: 'N', label: 'Khái niệm tổng quát, ý tưởng mới', icon: '💡', description: 'Intuition' }
      ]
    },
    {
      id: 'learning_approach',
      question: 'Bạn thích cách học nào hơn?',
      options: [
        { value: 'S', label: 'Từng bước một, theo thứ tự logic', icon: '📚', description: 'Sensing' },
        { value: 'N', label: 'Nhảy cóc, khám phá ngẫu nhiên', icon: '🎯', description: 'Intuition' }
      ]
    },
    
    // T vs F - Cách đưa ra quyết định
    {
      id: 'decision_making',
      question: 'Khi gặp bài toán khó, bạn thường:',
      options: [
        { value: 'T', label: 'Phân tích logic, tìm giải pháp tối ưu', icon: '🧮', description: 'Thinking' },
        { value: 'F', label: 'Cân nhắc tác động, tìm cách hài hòa', icon: '❤️', description: 'Feeling' }
      ]
    },
    {
      id: 'feedback_preference',
      question: 'Bạn thích nhận phản hồi như thế nào?',
      options: [
        { value: 'T', label: 'Trực tiếp, khách quan về kết quả', icon: '📊', description: 'Thinking' },
        { value: 'F', label: 'Khuyến khích, chú ý đến nỗ lực', icon: '🌟', description: 'Feeling' }
      ]
    },
    
    // J vs P - Cách tổ chức
    {
      id: 'planning_style',
      question: 'Bạn thích lập kế hoạch học tập như thế nào?',
      options: [
        { value: 'J', label: 'Lịch trình chi tiết, deadline rõ ràng', icon: '📅', description: 'Judging' },
        { value: 'P', label: 'Linh hoạt, thích ứng theo tình huống', icon: '🔄', description: 'Perceiving' }
      ]
    },
    {
      id: 'completion_style',
      question: 'Bạn thích hoàn thành nhiệm vụ như thế nào?',
      options: [
        { value: 'J', label: 'Hoàn thành trước deadline, có thời gian dư', icon: '✅', description: 'Judging' },
        { value: 'P', label: 'Làm việc dưới áp lực, deadline thúc đẩy', icon: '⏰', description: 'Perceiving' }
      ]
    },
    
    // Learning preferences
    {
      id: 'learning_environment',
      question: 'Môi trường học tập lý tưởng của bạn là:',
      options: [
        { value: 'structured', label: 'Có cấu trúc, quy tắc rõ ràng', icon: '🏛️' },
        { value: 'flexible', label: 'Tự do, sáng tạo', icon: '🎨' },
        { value: 'collaborative', label: 'Hợp tác, tương tác', icon: '🤝' },
        { value: 'independent', label: 'Độc lập, tự chủ', icon: '🦅' }
      ]
    },
    {
      id: 'challenge_preference',
      question: 'Bạn thích thử thách ở mức độ nào?',
      options: [
        { value: 'beginner', label: 'Cơ bản, từ từ', icon: '🐌' },
        { value: 'moderate', label: 'Trung bình, ổn định', icon: '🚶' },
        { value: 'advanced', label: 'Nâng cao, thử thách', icon: '🏃' },
        { value: 'expert', label: 'Chuyên gia, đỉnh cao', icon: '🚀' }
      ]
    }
  ];

  const learningPaths = [
    {
      id: "toan-hoc-co-ban",
      title: "Toán học cơ bản",
      description: "Học các khái niệm toán học cơ bản từ lớp 10-12",
      icon: Calculator,
      color: "bg-blue-500",
      difficulty: "beginner",
      timeRequired: "moderate",
      xpRequired: 1000,
      xpReward: 2000,
      skills: ["mathematics", "logical_thinking"],
      personalityMatch: ["logical", "analytical", "achievement"]
    },
    {
      id: "hoa-hoc",
      title: "Hóa học",
      description: "Khám phá thế giới hóa học từ cơ bản đến nâng cao",
      icon: Atom,
      color: "bg-green-500",
      difficulty: "moderate",
      timeRequired: "moderate",
      xpRequired: 1500,
      xpReward: 2500,
      skills: ["chemistry", "hands_on", "analytical"],
      personalityMatch: ["hands_on", "stem", "curiosity"]
    },
    {
      id: "vat-ly",
      title: "Vật lý",
      description: "Hiểu các định luật vật lý và ứng dụng thực tế",
      icon: Zap,
      color: "bg-purple-500",
      difficulty: "advanced",
      timeRequired: "intensive",
      xpRequired: 2000,
      xpReward: 3000,
      skills: ["physics", "mathematics", "logical_thinking"],
      personalityMatch: ["logical", "stem", "advanced"]
    },
    {
      id: "sinh-hoc",
      title: "Sinh học",
      description: "Khám phá sự sống và các quá trình sinh học",
      icon: Dna,
      color: "bg-pink-500",
      difficulty: "moderate",
      timeRequired: "moderate",
      xpRequired: 1200,
      xpReward: 2200,
      skills: ["biology", "analytical", "curiosity"],
      personalityMatch: ["curiosity", "stem", "moderate"]
    },
    {
      id: "python-programming",
      title: "Python Programming",
      description: "Lập trình Python từ cơ bản đến nâng cao cho học sinh STEM",
      icon: Code2,
      color: "bg-orange-500",
      difficulty: "advanced",
      timeRequired: "intensive",
      xpRequired: 2500,
      xpReward: 4000,
      skills: ["programming", "logical_thinking", "problem_solving"],
      personalityMatch: ["logical", "stem", "career"]
    },
    {
      id: "ai-ml-basics",
      title: "AI & Machine Learning",
      description: "Khám phá trí tuệ nhân tạo và học máy cơ bản",
      icon: Brain,
      color: "bg-indigo-500",
      difficulty: "expert",
      timeRequired: "extreme",
      xpRequired: 3000,
      xpReward: 5000,
      skills: ["ai_ml", "programming", "mathematics"],
      personalityMatch: ["expert", "stem", "curiosity"]
    }
  ];

  const handleAnswer = (questionId: string, answer: string) => {
    setQuizAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const nextStep = () => {
    if (currentStep < quizQuestions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      calculatePersonalityProfile();
      setShowResults(true);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const calculatePersonalityProfile = () => {
    // Calculate MBTI type based on answers
    const mbtiScores = {
      E: 0, I: 0,
      S: 0, N: 0,
      T: 0, F: 0,
      J: 0, P: 0
    };

    // Count MBTI preferences
    Object.values(quizAnswers).forEach(answer => {
      if (mbtiScores.hasOwnProperty(answer)) {
        mbtiScores[answer]++;
      }
    });

    // Determine MBTI type
    const mbtiType = 
      (mbtiScores.E > mbtiScores.I ? 'E' : 'I') +
      (mbtiScores.S > mbtiScores.N ? 'S' : 'N') +
      (mbtiScores.T > mbtiScores.F ? 'T' : 'F') +
      (mbtiScores.J > mbtiScores.P ? 'J' : 'P');

    // Get MBTI personality descriptions
    const mbtiDescriptions = {
      'INTJ': { name: 'Architect', traits: ['Strategic', 'Independent', 'Analytical'], learningStyle: 'Deep, systematic learning with clear goals' },
      'INTP': { name: 'Thinker', traits: ['Curious', 'Logical', 'Flexible'], learningStyle: 'Exploratory learning with theoretical focus' },
      'ENTJ': { name: 'Commander', traits: ['Decisive', 'Goal-oriented', 'Leadership'], learningStyle: 'Efficient, results-driven learning' },
      'ENTP': { name: 'Debater', traits: ['Innovative', 'Energetic', 'Adaptable'], learningStyle: 'Dynamic, discussion-based learning' },
      'INFJ': { name: 'Advocate', traits: ['Insightful', 'Creative', 'Determined'], learningStyle: 'Meaningful, purpose-driven learning' },
      'INFP': { name: 'Mediator', traits: ['Idealistic', 'Curious', 'Adaptable'], learningStyle: 'Values-based, creative learning' },
      'ENFJ': { name: 'Protagonist', traits: ['Charismatic', 'Inspiring', 'Natural-born leader'], learningStyle: 'Collaborative, inspiring learning' },
      'ENFP': { name: 'Campaigner', traits: ['Enthusiastic', 'Creative', 'Social'], learningStyle: 'Enthusiastic, people-centered learning' },
      'ISTJ': { name: 'Logistician', traits: ['Practical', 'Fact-focused', 'Reliable'], learningStyle: 'Structured, methodical learning' },
      'ISFJ': { name: 'Protector', traits: ['Supportive', 'Reliable', 'Imaginative'], learningStyle: 'Supportive, detail-oriented learning' },
      'ESTJ': { name: 'Executive', traits: ['Dedicated', 'Strong-willed', 'Direct'], learningStyle: 'Organized, practical learning' },
      'ESFJ': { name: 'Consul', traits: ['Supportive', 'Reliable', 'Patient'], learningStyle: 'Cooperative, structured learning' },
      'ISTP': { name: 'Virtuoso', traits: ['Bold', 'Practical', 'Original'], learningStyle: 'Hands-on, experimental learning' },
      'ISFP': { name: 'Adventurer', traits: ['Flexible', 'Charming', 'Sensitive'], learningStyle: 'Flexible, experiential learning' },
      'ESTP': { name: 'Entrepreneur', traits: ['Smart', 'Energetic', 'Perceptive'], learningStyle: 'Active, practical learning' },
      'ESFP': { name: 'Entertainer', traits: ['Spontaneous', 'Enthusiastic', 'Friendly'], learningStyle: 'Interactive, fun learning' }
    };

    const profile = {
      mbtiType,
      mbtiName: mbtiDescriptions[mbtiType]?.name || 'Unknown',
      mbtiTraits: mbtiDescriptions[mbtiType]?.traits || [],
      learningStyle: mbtiDescriptions[mbtiType]?.learningStyle || 'Balanced learning approach',
      learningEnvironment: quizAnswers.learning_environment,
      challengeLevel: quizAnswers.challenge_preference,
      mbtiScores
    };

    // Calculate recommended paths based on MBTI and XP
    const recommendations = learningPaths.map(path => {
      let score = 0;
      
      // MBTI-based matching (50% weight)
      const mbtiMatch = getMBTIMatch(mbtiType, path);
      score += mbtiMatch * 50;

      // XP-based adjustments (30% weight)
      const userSkillXP = path.skills.reduce((total, skill) => {
        return total + (userXP[skill] || 0);
      }, 0);
      
      if (userSkillXP >= path.xpRequired) score += 30;
      else if (userSkillXP >= path.xpRequired * 0.7) score += 20;
      else if (userSkillXP >= path.xpRequired * 0.4) score += 10;

      // Learning environment matching (10% weight)
      if (path.environment === profile.learningEnvironment) score += 10;

      // Challenge level matching (10% weight)
      if (path.difficulty === profile.challengeLevel) score += 10;

      return {
        ...path,
        matchScore: Math.round(score),
        userSkillXP,
        isRecommended: score >= 60,
        mbtiMatch
      };
    }).sort((a, b) => b.matchScore - a.matchScore);

    setPersonalityProfile(profile);
    setRecommendedPaths(recommendations);
  };

  const getMBTIMatch = (mbtiType: string, path: any) => {
    // Define MBTI preferences for different learning paths
    const mbtiPreferences = {
      'toan-hoc-co-ban': ['ISTJ', 'ESTJ', 'INTJ', 'ENTJ'], // Structured, logical
      'hoa-hoc': ['ISTP', 'ESTP', 'ISFJ', 'ESFJ'], // Hands-on, practical
      'vat-ly': ['INTJ', 'INTP', 'ENTJ', 'ENTP'], // Theoretical, analytical
      'sinh-hoc': ['ISFJ', 'ESFJ', 'INFP', 'ENFP'], // Caring, detail-oriented
      'python-programming': ['INTJ', 'INTP', 'ENTJ', 'ENTP'], // Logical, systematic
      'ai-ml-basics': ['INTJ', 'INTP', 'ENTJ', 'ENTP'] // Complex, theoretical
    };

    const preferences = mbtiPreferences[path.id] || [];
    return preferences.includes(mbtiType) ? 1 : 0.5;
  };

  const getTimeLevel = (timeCommitment: any) => {
    const levels = { light: 1, moderate: 2, intensive: 3, extreme: 4 };
    return levels[timeCommitment] || 2;
  };

  const resetQuiz = () => {
    setCurrentStep(0);
    setQuizAnswers({});
    setShowResults(false);
    setPersonalityProfile(null);
    setRecommendedPaths([]);
    setPathSaved(false);
  };

  const savePath = () => {
    // Save to localStorage
    const savedData = {
      personalityProfile,
      recommendedPaths,
      timestamp: new Date().toISOString(),
      userXP
    };
    localStorage.setItem('learningPath', JSON.stringify(savedData));
    setPathSaved(true);
    
    // Show success message
    alert('✅ Đã lưu lộ trình học tập thành công!\n\nBạn có thể truy cập Learning Planner để xem chi tiết.');
  };

  // Load saved path on mount
  useEffect(() => {
    const savedPath = localStorage.getItem('learningPath');
    if (savedPath) {
      const data = JSON.parse(savedPath);
      setPersonalityProfile(data.personalityProfile);
      setRecommendedPaths(data.recommendedPaths);
      setPathSaved(true);
      setShowResults(false); // Don't show results automatically, show welcome screen instead
    }
  }, []);

  // Show saved path welcome screen
  if (pathSaved && !showResults && personalityProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-6 flex items-center justify-center">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="mb-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Lộ trình đã được lưu!
              </h1>
              <p className="text-lg text-gray-600 mb-6">
                Bạn đã hoàn thành bài quiz tính cách và lưu lộ trình học tập cá nhân hóa
              </p>
            </div>

            <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-6 mb-6">
              <div className="text-center mb-4">
                <div className="text-4xl font-bold text-purple-900 mb-2">
                  {personalityProfile.mbtiType}
                </div>
                <div className="text-xl font-semibold text-purple-700">
                  {personalityProfile.mbtiName}
                </div>
              </div>
              <div className="flex justify-center space-x-2">
                {personalityProfile.mbtiTraits.map((trait, index) => (
                  <span key={index} className="bg-purple-200 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                    {trait}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <a 
                href="/learning-paths-demo/planner"
                className="block w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                🎯 Mở Learning Planner
              </a>
              <button
                onClick={() => setShowResults(true)}
                className="block w-full bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                📊 Xem chi tiết lộ trình
              </button>
              <button
                onClick={resetQuiz}
                className="block w-full bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors"
              >
                🔄 Làm lại quiz
              </button>
            </div>

            <div className="text-sm text-gray-500">
              Lưu lần cuối: {new Date().toLocaleString('vi-VN')}
            </div>
          </div>
        </div>
      
              </div>
    );
  }

  if (showResults && personalityProfile) {
  return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-purple-900 mb-4">
              🎯 Lộ trình học tập cá nhân hóa của bạn
            </h1>
            <p className="text-lg text-gray-700">
              Dựa trên tính cách và XP hiện tại của bạn
            </p>
          </div>

          {/* MBTI Personality Profile */}
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Brain className="w-6 h-6 mr-2 text-purple-600" />
              Hồ sơ tính cách MBTI
            </h2>
            
            {/* MBTI Type Display */}
            <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-6 mb-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-purple-900 mb-2">
                  {personalityProfile.mbtiType}
                </div>
                <div className="text-2xl font-semibold text-purple-700 mb-2">
                  {personalityProfile.mbtiName}
                </div>
                <div className="text-gray-600 mb-4">
                  {personalityProfile.learningStyle}
                </div>
                <div className="flex justify-center space-x-2">
                  {personalityProfile.mbtiTraits.map((trait, index) => (
                    <span key={index} className="bg-purple-200 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                      {trait}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* MBTI Dimensions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <h3 className="font-semibold text-blue-900 mb-2">Năng lượng</h3>
                <div className="text-2xl font-bold text-blue-600">
                  {personalityProfile.mbtiScores.E > personalityProfile.mbtiScores.I ? 'E' : 'I'}
                </div>
                <p className="text-blue-700 text-sm">
                  {personalityProfile.mbtiScores.E > personalityProfile.mbtiScores.I ? 'Extraversion' : 'Introversion'}
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <h3 className="font-semibold text-green-900 mb-2">Thông tin</h3>
                <div className="text-2xl font-bold text-green-600">
                  {personalityProfile.mbtiScores.S > personalityProfile.mbtiScores.N ? 'S' : 'N'}
                </div>
                <p className="text-green-700 text-sm">
                  {personalityProfile.mbtiScores.S > personalityProfile.mbtiScores.N ? 'Sensing' : 'Intuition'}
                </p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <h3 className="font-semibold text-purple-900 mb-2">Quyết định</h3>
                <div className="text-2xl font-bold text-purple-600">
                  {personalityProfile.mbtiScores.T > personalityProfile.mbtiScores.F ? 'T' : 'F'}
                </div>
                <p className="text-purple-700 text-sm">
                  {personalityProfile.mbtiScores.T > personalityProfile.mbtiScores.F ? 'Thinking' : 'Feeling'}
                </p>
              </div>
              <div className="bg-orange-50 rounded-lg p-4 text-center">
                <h3 className="font-semibold text-orange-900 mb-2">Tổ chức</h3>
                <div className="text-2xl font-bold text-orange-600">
                  {personalityProfile.mbtiScores.J > personalityProfile.mbtiScores.P ? 'J' : 'P'}
                </div>
                <p className="text-orange-700 text-sm">
                  {personalityProfile.mbtiScores.J > personalityProfile.mbtiScores.P ? 'Judging' : 'Perceiving'}
                </p>
              </div>
            </div>

            {/* Learning Preferences */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Môi trường học tập</h3>
                <p className="text-gray-700 text-sm">
                  {personalityProfile.learningEnvironment === 'structured' && '🏛️ Có cấu trúc, quy tắc rõ ràng'}
                  {personalityProfile.learningEnvironment === 'flexible' && '🎨 Tự do, sáng tạo'}
                  {personalityProfile.learningEnvironment === 'collaborative' && '🤝 Hợp tác, tương tác'}
                  {personalityProfile.learningEnvironment === 'independent' && '🦅 Độc lập, tự chủ'}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Mức độ thử thách</h3>
                <p className="text-gray-700 text-sm">
                  {personalityProfile.challengeLevel === 'beginner' && '🐌 Cơ bản, từ từ'}
                  {personalityProfile.challengeLevel === 'moderate' && '🚶 Trung bình, ổn định'}
                  {personalityProfile.challengeLevel === 'advanced' && '🏃 Nâng cao, thử thách'}
                  {personalityProfile.challengeLevel === 'expert' && '🚀 Chuyên gia, đỉnh cao'}
                </p>
              </div>
            </div>
          </div>

          {/* XP Analysis */}
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <TrendingUp className="w-6 h-6 mr-2 text-green-600" />
              Phân tích XP hiện tại
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {Object.entries(userXP).filter(([key]) => key !== 'total').map(([skill, xp]) => (
                <div key={skill} className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{xp}</div>
                  <div className="text-sm text-gray-600 capitalize">{skill.replace('_', ' ')}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-center">
              <div className="text-3xl font-bold text-purple-600">{userXP.total} XP</div>
              <div className="text-sm text-gray-600">Tổng XP tích lũy</div>
            </div>
      </div>

          {/* Recommended Learning Paths */}
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Target className="w-6 h-6 mr-2 text-blue-600" />
              Lộ trình được đề xuất
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendedPaths.slice(0, 6).map((path, index) => {
                const IconComponent = path.icon;
                const isRecommended = path.isRecommended;
          
                return (
                  <div 
                    key={path.id} 
                    className={`rounded-xl p-6 border-2 transition-all duration-300 hover:scale-105 cursor-pointer ${
                      isRecommended 
                        ? 'border-green-300 bg-green-50 hover:bg-green-100' 
                        : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-lg ${path.color} text-white`}>
                        {IconComponent && typeof IconComponent === 'function' ? (
                          <IconComponent className="h-6 w-6" />
                        ) : (
                          <BookOpen className="h-6 w-6" />
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">{path.matchScore}%</div>
                        <div className="text-xs text-gray-500">Độ phù hợp</div>
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{path.title}</h3>
                    <p className="text-gray-600 text-sm mb-4">{path.description}</p>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">XP hiện tại:</span>
                        <span className="font-semibold">{path.userSkillXP}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">XP cần thiết:</span>
                        <span className="font-semibold">{path.xpRequired}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">XP nhận được:</span>
                        <span className="font-semibold text-green-600">{path.xpReward}</span>
                      </div>
                  </div>

                    {isRecommended && (
                      <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium mb-4">
                        ⭐ Được đề xuất
                  </div>
                    )}

                    <button className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                      isRecommended
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
                    }`}>
                      {isRecommended ? 'Bắt đầu học' : 'Xem chi tiết'}
                    </button>
                  </div>
          );
        })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="text-center">
            <button 
              onClick={resetQuiz}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors mr-4"
            >
              Làm lại quiz
            </button>
            <a 
              href="/learning-paths-demo/planner"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors mr-4 inline-block"
            >
              Mở Learning Planner
            </a>
            <button 
              onClick={savePath}
              disabled={pathSaved}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                pathSaved 
                  ? 'bg-gray-400 cursor-not-allowed text-white' 
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {pathSaved ? '✅ Đã lưu' : 'Lưu lộ trình'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-purple-900 mb-4">
            🧠 Quiz tính cách học tập
          </h1>
          <p className="text-lg text-gray-700 mb-6">
            Khám phá phong cách học tập của bạn để nhận lộ trình cá nhân hóa
          </p>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
            <div 
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${((currentStep + 1) / quizQuestions.length) * 100}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600">
            Câu {currentStep + 1} / {quizQuestions.length}
          </p>
        </div>

        {/* Quiz Question */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {quizQuestions[currentStep].question}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quizQuestions[currentStep].options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswer(quizQuestions[currentStep].id, option.value)}
                className={`p-6 rounded-xl border-2 transition-all duration-300 hover:scale-105 text-left ${
                  quizAnswers[quizQuestions[currentStep].id] === option.value
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 bg-white hover:border-purple-300'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <span className="text-3xl">{option.icon}</span>
                  <span className="font-medium text-gray-900">{option.label}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <button
              onClick={prevStep}
              disabled={currentStep === 0}
              className="flex items-center space-x-2 px-6 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Trước</span>
            </button>
            
            <button
              onClick={nextStep}
              disabled={!quizAnswers[quizQuestions[currentStep].id]}
              className="flex items-center space-x-2 px-6 py-3 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span>{currentStep === quizQuestions.length - 1 ? 'Xem kết quả' : 'Tiếp theo'}</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}