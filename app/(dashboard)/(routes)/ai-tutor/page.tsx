'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Brain, MessageCircle, Send, Sparkles, Target, Heart, Zap,
  TrendingUp, BookOpen, Award, Clock, CheckCircle, AlertCircle,
  ThumbsUp, ThumbsDown, RefreshCw, Lightbulb, Play, Star,
  Smile, Meh, Frown, Battery, Coffee, Flame, Activity
} from 'lucide-react';
import { TeacherOnlyFeature } from '@/components/teacher-only-feature';
// Force rebuild after adding Activity icon

interface Message {
  id: string;
  type: 'bot' | 'user';
  content: string;
  timestamp: Date;
  emotion?: string;
  actions?: any[];
}

interface DailyPlan {
  lessons: any[];
  totalTime: number;
  totalXP: number;
  difficulty: string;
  focus: string[];
}

export default function AiTutorPage() {
  const { data: session, status } = useSession();
  const { t } = useLanguage();
  const router = useRouter();
  
  // ✅ Block students from accessing AI Tutor
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }
  
  if (session?.user?.role === "STUDENT") {
    return (
      <TeacherOnlyFeature
        featureName="AI Tutor"
        description="Trợ lý AI thông minh giúp giáo viên tạo lộ trình học tập cá nhân hóa và phân tích tiến độ học sinh."
        redirectUrl="/dashboard"
        autoRedirect={false}
      />
    );
  }
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentStep, setCurrentStep] = useState<'welcome' | 'emotion' | 'goals' | 'assessment' | 'plan' | 'learning'>('welcome');
  const [userState, setUserState] = useState({
    emotion: '',
    motivation: 0,
    goals: [],
    currentXP: 0,
    skillLevel: 'beginner'
  });
  const [dailyPlan, setDailyPlan] = useState<DailyPlan | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [learningSession, setLearningSession] = useState({
    active: false,
    startTime: null as Date | null,
    currentLesson: 0,
    earnedXP: 0,
    completedLessons: 0
  });
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Welcome message
    if (messages.length === 0) {
      addBotMessage(
        "👋 Xin chào! Mình là AI Tutor của bạn.\n\nMỗi ngày, mình sẽ giúp bạn:\n• Xác định mục tiêu học tập\n• Đánh giá năng lực hiện tại\n• Tạo lộ trình học cá nhân hóa\n• Theo dõi tiến độ và động viên bạn\n\nHãy bắt đầu với một vài câu hỏi nhé! 🚀",
        [
          { label: 'Bắt đầu ngay! 💪', action: 'start_checkin' }
        ]
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addBotMessage = (content: string, actions?: any[], emotion?: string) => {
    const message: Message = {
      id: `bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'bot',
      content,
      timestamp: new Date(),
      emotion,
      actions
    };
    setMessages(prev => [...prev, message]);
  };

  const addUserMessage = (content: string) => {
    const message: Message = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'user',
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, message]);
  };

  const handleAction = async (action: string, data?: any) => {
    setIsTyping(true);

    switch (action) {
      case 'start_checkin':
        addUserMessage('Bắt đầu ngày học mới! 💪');
        setTimeout(() => {
          setCurrentStep('emotion');
          addBotMessage(
            "Tuyệt vời! Đầu tiên, hãy cho mình biết cảm giác của bạn hôm nay nhé:",
            [
              { label: '😊 Vui vẻ, tràn đầy năng lượng', action: 'set_emotion', data: { emotion: 'happy', motivation: 90 } },
              { label: '😐 Bình thường, ổn định', action: 'set_emotion', data: { emotion: 'neutral', motivation: 70 } },
              { label: '😔 Hơi mệt mỏi, thiếu động lực', action: 'set_emotion', data: { emotion: 'tired', motivation: 50 } },
              { label: '😰 Áp lực, căng thẳng', action: 'set_emotion', data: { emotion: 'stressed', motivation: 40 } }
            ]
          );
          setIsTyping(false);
        }, 1000);
        break;

      case 'set_emotion':
        addUserMessage(data.emotion === 'happy' ? '😊 Vui vẻ, tràn đầy năng lượng' :
                      data.emotion === 'neutral' ? '😐 Bình thường, ổn định' :
                      data.emotion === 'tired' ? '😔 Hơi mệt mỏi' :
                      '😰 Áp lực, căng thẳng');
        
        setUserState(prev => ({ ...prev, emotion: data.emotion, motivation: data.motivation }));
        
        setTimeout(() => {
          setCurrentStep('goals');
          const encouragement = data.motivation >= 80 ? 
            "Tuyệt vời! Năng lượng tích cực sẽ giúp bạn học rất hiệu quả! 🚀" :
            data.motivation >= 60 ?
            "Ổn đấy! Chúng ta sẽ chọn bài học phù hợp với trạng thái này. 👍" :
            "Mình hiểu rồi. Hôm nay chúng ta sẽ học nhẹ nhàng, không áp lực nhé! 🌱";
          
          addBotMessage(
            `${encouragement}\n\nBây giờ, bạn muốn học gì hôm nay?`,
            [
              { label: '📐 Toán học', action: 'set_goal', data: 'mathematics' },
              { label: '⚛️ Vật lý', action: 'set_goal', data: 'physics' },
              { label: '🧪 Hóa học', action: 'set_goal', data: 'chemistry' },
              { label: '💻 Lập trình', action: 'set_goal', data: 'programming' },
              { label: '🤖 AI/ML', action: 'set_goal', data: 'ai_ml' },
              { label: '🎯 Để AI chọn cho mình', action: 'set_goal', data: 'auto' }
            ]
          );
          setIsTyping(false);
        }, 1500);
        break;

      case 'set_goal':
        const goalText = data === 'auto' ? '🎯 Để AI chọn cho mình' :
                        data === 'mathematics' ? '📐 Toán học' :
                        data === 'physics' ? '⚛️ Vật lý' :
                        data === 'chemistry' ? '🧪 Hóa học' :
                        data === 'programming' ? '💻 Lập trình' : '🤖 AI/ML';
        
        addUserMessage(goalText);
        setUserState(prev => ({ ...prev, goals: [data] }));
        
        setTimeout(() => {
          setCurrentStep('assessment');
          addBotMessage(
            "Tuyệt! Bây giờ mình cần đánh giá nhanh năng lực của bạn.\n\nBạn tự đánh giá mình ở level nào?",
            [
              { label: '🌱 Beginner - Mới bắt đầu', action: 'set_level', data: 'beginner' },
              { label: '📚 Intermediate - Có kiến thức cơ bản', action: 'set_level', data: 'intermediate' },
              { label: '🚀 Advanced - Khá vững vàng', action: 'set_level', data: 'advanced' },
              { label: '⚡ Expert - Chuyên sâu', action: 'set_level', data: 'expert' }
            ]
          );
          setIsTyping(false);
        }, 1000);
        break;

      case 'set_level':
        const levelText = data === 'beginner' ? '🌱 Beginner' :
                         data === 'intermediate' ? '📚 Intermediate' :
                         data === 'advanced' ? '🚀 Advanced' : '⚡ Expert';
        
        addUserMessage(levelText);
        setUserState(prev => ({ ...prev, skillLevel: data }));
        
        // Generate daily plan with AI
        await generateDailyPlan(userState.goals[0] || 'auto', data, userState.motivation);
        break;

      case 'start_lesson':
        setLearningSession({
          active: true,
          startTime: new Date(),
          currentLesson: 0,
          earnedXP: 0,
          completedLessons: 0
        });
        setCurrentStep('learning');
        addUserMessage('🚀 Bắt đầu học ngay!');
        
        setTimeout(() => {
          if (dailyPlan && dailyPlan.lessons.length > 0) {
            addBotMessage(
              `✨ **Bài học 1/${dailyPlan.lessons.length}**\n\n` +
              `📖 ${dailyPlan.lessons[0].title}\n` +
              `⏱️ ${dailyPlan.lessons[0].time} phút\n` +
              `⚡ ${dailyPlan.lessons[0].xp} XP\n\n` +
              `Tôi sẽ theo dõi tiến độ của bạn. Nếu gặp khó khăn, hãy nói với tôi nhé! 💪\n\n` +
              `Hoàn thành bài này chưa?`,
              [
                { label: '✅ Đã hoàn thành!', action: 'complete_lesson', data: 0 },
                { label: '😅 Gặp khó khăn, cần trợ giúp', action: 'need_help', data: 0 },
                { label: '⏸️ Nghỉ giải lao', action: 'take_break' }
              ]
            );
          }
          setIsTyping(false);
        }, 1000);
        break;

      case 'complete_lesson':
        const lessonIndex = data;
        const completedLesson = dailyPlan?.lessons[lessonIndex];
        
        if (completedLesson) {
          const newEarnedXP = learningSession.earnedXP + completedLesson.xp;
          const newCompleted = learningSession.completedLessons + 1;
          
          // Update progress in database
          try {
            const response = await fetch('/api/update-learning-progress', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                lessonId: completedLesson.id,
                lessonTitle: completedLesson.title,
                earnedXP: completedLesson.xp,
                timeSpent: completedLesson.time,
                difficulty: dailyPlan?.difficulty || 'intermediate',
                subject: dailyPlan?.focus[0] || 'general',
                completionStatus: 'completed'
              })
            });

            if (response.ok) {
              console.log('Progress updated successfully');
            }
          } catch (error) {
            console.log('Could not update progress:', error);
          }
          
          setLearningSession(prev => ({
            ...prev,
            earnedXP: newEarnedXP,
            completedLessons: newCompleted,
            currentLesson: lessonIndex + 1
          }));

          addUserMessage('✅ Đã hoàn thành!');
          
          setTimeout(() => {
            // Adaptive feedback based on progress
            const encouragement = newCompleted === 1 ? 
              `Tuyệt vời! Bước đầu tiên luôn là quan trọng nhất! 🎉` :
              newCompleted === Math.floor((dailyPlan?.lessons.length || 0) / 2) ?
              `Wow! Bạn đã hoàn thành một nửa rồi! Tiếp tục phát huy! 🔥` :
              `Xuất sắc! Tiếp tục momentum này! 💪`;

            addBotMessage(
              `${encouragement}\n\n` +
              `✨ **+${completedLesson.xp} XP**\n` +
              `🏆 Tổng XP hôm nay: ${newEarnedXP} XP\n` +
              `📊 Hoàn thành: ${newCompleted}/${dailyPlan?.lessons.length || 0} bài\n\n` +
              (lessonIndex + 1 < (dailyPlan?.lessons.length || 0) ?
                `Sẵn sàng cho bài tiếp theo chưa?` :
                `🎊 Chúc mừng! Bạn đã hoàn thành tất cả bài học hôm nay!`),
              lessonIndex + 1 < (dailyPlan?.lessons.length || 0) ? [
                { label: '▶️ Bài học tiếp theo', action: 'next_lesson', data: lessonIndex + 1 },
                { label: '⏸️ Nghỉ giải lao 5 phút', action: 'take_break' },
                { label: '📊 Xem tiến độ', action: 'show_progress' }
              ] : [
                { label: '🎯 Xem tổng kết', action: 'show_summary' },
                { label: '🔄 Học thêm nội dung mới', action: 'start_checkin' },
                { label: '📊 Xem thống kê', action: 'show_stats' }
              ]
            );
            setIsTyping(false);
          }, 1000);
        }
        break;

      case 'next_lesson':
        const nextIndex = data;
        const nextLesson = dailyPlan?.lessons[nextIndex];
        
        if (nextLesson) {
          addUserMessage('▶️ Tiếp tục học!');
          
          setTimeout(() => {
            addBotMessage(
              `✨ **Bài học ${nextIndex + 1}/${dailyPlan?.lessons.length}**\n\n` +
              `📖 ${nextLesson.title}\n` +
              `⏱️ ${nextLesson.time} phút\n` +
              `⚡ ${nextLesson.xp} XP\n\n` +
              `Bạn đang học rất tốt! Hãy tiếp tục nhé! 🚀`,
              [
                { label: '✅ Đã hoàn thành!', action: 'complete_lesson', data: nextIndex },
                { label: '😅 Cần trợ giúp', action: 'need_help', data: nextIndex },
                { label: '⏸️ Nghỉ giải lao', action: 'take_break' }
              ]
            );
            setIsTyping(false);
          }, 1000);
        }
        break;

      case 'need_help':
        addUserMessage('😅 Cần trợ giúp với bài này');
        
        setTimeout(() => {
          const helpLesson = dailyPlan?.lessons[data];
          addBotMessage(
            `Mình hiểu rồi! Đây là một số gợi ý:\n\n` +
            `💡 **Mẹo học tập:**\n` +
            `• Đọc lại phần lý thuyết một lần nữa\n` +
            `• Thử làm ví dụ đơn giản trước\n` +
            `• Tìm video giải thích trên YouTube\n` +
            `• Hỏi trong diễn đàn học tập\n\n` +
            `🎯 **Điều chỉnh:**\n` +
            `Bạn muốn chuyển sang bài dễ hơn, hay thử lại bài này sau?`,
            [
              { label: '🔄 Thử lại bài này', action: 'retry_lesson', data },
              { label: '⏭️ Chuyển bài khác', action: 'skip_lesson', data },
              { label: '📚 Xem tài liệu hỗ trợ', action: 'show_resources' }
            ]
          );
          setIsTyping(false);
        }, 1000);
        break;

      case 'take_break':
        addUserMessage('⏸️ Nghỉ giải lao');
        
        setTimeout(() => {
          addBotMessage(
            `⏸️ **Giải lao 5 phút**\n\n` +
            `Nghỉ ngơi rất quan trọng! Hãy:\n` +
            `• Đứng dậy vận động\n` +
            `• Uống nước\n` +
            `• Thư giãn mắt\n` +
            `• Hít thở sâu\n\n` +
            `Sẵn sàng tiếp tục chưa?`,
            [
              { label: '✨ Tiếp tục học', action: 'resume_learning' },
              { label: '⏰ Nghỉ thêm 5 phút', action: 'extend_break' }
            ]
          );
          setIsTyping(false);
        }, 1000);
        break;

      case 'resume_learning':
        addUserMessage('✨ Sẵn sàng tiếp tục!');
        
        setTimeout(() => {
          const currentIndex = learningSession.currentLesson;
          const currentLesson = dailyPlan?.lessons[currentIndex];
          
          if (currentLesson) {
            addBotMessage(
              `Tuyệt! Tiếp tục với bài học hiện tại nhé:\n\n` +
              `📖 ${currentLesson.title}`,
              [
                { label: '✅ Đã hoàn thành!', action: 'complete_lesson', data: currentIndex },
                { label: '😅 Cần trợ giúp', action: 'need_help', data: currentIndex }
              ]
            );
          }
          setIsTyping(false);
        }, 800);
        break;

      case 'show_summary':
        addUserMessage('🎯 Xem tổng kết');
        
        setTimeout(() => {
          const duration = learningSession.startTime ? 
            Math.round((new Date().getTime() - learningSession.startTime.getTime()) / 60000) : 0;
          
          addBotMessage(
            `🎊 **Tổng kết buổi học hôm nay**\n\n` +
            `✅ Hoàn thành: ${learningSession.completedLessons}/${dailyPlan?.lessons.length} bài\n` +
            `⚡ Tổng XP: ${learningSession.earnedXP} XP\n` +
            `⏱️ Thời gian: ${duration} phút\n` +
            `🎯 Tỷ lệ hoàn thành: ${Math.round((learningSession.completedLessons / (dailyPlan?.lessons.length || 1)) * 100)}%\n\n` +
            `**Phản hồi của AI:**\n` +
            (learningSession.completedLessons === dailyPlan?.lessons.length ?
              `🌟 Xuất sắc! Bạn đã hoàn thành 100% kế hoạch!\n` +
              `💪 Engagement của bạn đang rất cao!\n` +
              `🚀 Ngày mai có thể thử độ khó cao hơn!` :
              `👍 Tốt lắm! Bạn đã cố gắng rất nhiều!\n` +
              `💡 Mẹo: Học đều đặn mỗi ngày sẽ giúp bạn tiến bộ nhanh hơn\n` +
              `🎯 Tiếp tục như vậy, bạn sẽ đạt mục tiêu!`),
            [
              { label: '🏠 Về Dashboard', action: 'go_dashboard' },
              { label: '🔄 Học buổi mới', action: 'start_checkin' },
              { label: '📊 Xem Learning Analytics', action: 'show_analytics' }
            ]
          );
          setIsTyping(false);
        }, 1000);
        break;

      case 'show_progress':
        addUserMessage('📊 Xem tiến độ');
        
        setTimeout(() => {
          addBotMessage(
            `📊 **Tiến độ hiện tại**\n\n` +
            `✅ Đã hoàn thành: ${learningSession.completedLessons} bài\n` +
            `⚡ XP đã nhận: ${learningSession.earnedXP} XP\n` +
            `🎯 Còn lại: ${(dailyPlan?.lessons.length || 0) - learningSession.completedLessons} bài\n` +
            `📈 Tỷ lệ: ${Math.round((learningSession.completedLessons / (dailyPlan?.lessons.length || 1)) * 100)}%\n\n` +
            `Bạn đang làm rất tốt! 💪`,
            [
              { label: '▶️ Tiếp tục học', action: 'resume_learning' },
              { label: '⏸️ Tạm dừng', action: 'take_break' }
            ]
          );
          setIsTyping(false);
        }, 800);
        break;

      case 'go_dashboard':
        router.push('/dashboard');
        break;

      case 'show_analytics':
        router.push('/learning-paths-demo/planner');
        break;

      case 'regenerate_plan':
        addUserMessage('🔄 Tạo lại lộ trình');
        handleAction('start_checkin');
        break;

      case 'retry_message':
        // Retry sending the message
        if (data) {
          setInputMessage(data);
          setTimeout(() => handleSendMessage(), 100);
        }
        break;

      case 'continue_chat':
        // Just acknowledge, user can type new message
        addUserMessage('💬 Tiếp tục trò chuyện');
        break;

      case 'show_learning_path':
        addUserMessage('📚 Xem lộ trình học');
        router.push('/learning-paths');
        break;

      default:
        break;
    }
  };

  const generateDailyPlan = async (subject: string, level: string, motivation: number) => {
    setIsGeneratingPlan(true);
    setIsTyping(true);

    addBotMessage("🤖 Đang phân tích và tạo lộ trình học tốt nhất cho bạn...");

    try {
      const response = await fetch('/api/generate-daily-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          level,
          motivation,
          emotion: userState.emotion,
          currentXP: userState.currentXP
        })
      });

      const data = await response.json();

      if (data.success) {
        setDailyPlan(data.plan);
        setAiAnalysis(data.analysis);
        setCurrentStep('plan');
        
        setTimeout(() => {
          // Show AI Analysis first
          addBotMessage(
            `🤖 **Phân tích AI của bạn**\n\n` +
            `📊 **Competency Score:** ${data.analysis.competency}/100\n` +
            `💪 **Engagement:** ${Math.round(data.analysis.engagement)}%\n` +
            `😊 **Emotion Score:** ${data.analysis.emotionScore}/100\n` +
            `🚀 **Learning Velocity:** ${Math.round(data.analysis.learningVelocity)}%\n\n` +
            `**Đề xuất thông minh:**\n${data.plan.adaptiveRecommendations.map((r: string) => `• ${r}`).join('\n')}`
          );
          
          setTimeout(() => {
            addBotMessage(
              `🎯 **Lộ trình học hôm nay của bạn**\n\n` +
              `📚 **${data.plan.lessons.length} bài học** được chọn\n` +
              `⏱️ **Thời gian:** ${data.plan.totalTime} phút\n` +
              `⚡ **XP dự kiến:** ${data.plan.totalXP} XP\n` +
              `🎚️ **Độ khó:** ${data.plan.difficulty}\n` +
              `🎯 **Focus:** ${data.plan.focus.join(', ')}\n\n` +
              `**Chi tiết bài học:**\n` +
              data.plan.lessons.map((lesson: any, i: number) => 
                `${i + 1}. ${lesson.title} (${lesson.time}p, ${lesson.xp} XP)`
              ).join('\n') +
              `\n\nSẵn sàng bắt đầu chưa? 🚀`,
              [
                { label: '🚀 Bắt đầu học ngay!', action: 'start_lesson' },
                { label: '🔄 Tạo lại lộ trình khác', action: 'regenerate_plan' },
                { label: '📊 Xem phân tích chi tiết', action: 'show_analysis' }
              ]
            );
            setIsTyping(false);
            setIsGeneratingPlan(false);
          }, 1500);
        }, 1000);
      } else {
        throw new Error('Failed to generate plan');
      }
    } catch (error) {
      console.error('Error generating plan:', error);
      // Fallback plan
      const fallbackPlan = {
        lessons: [
          { title: 'Bài học cơ bản', time: 30, xp: 100 },
          { title: 'Bài tập thực hành', time: 20, xp: 80 }
        ],
        totalTime: 50,
        totalXP: 180,
        difficulty: level,
        focus: [subject]
      };
      
      setDailyPlan(fallbackPlan);
      setCurrentStep('plan');
      
      setTimeout(() => {
        addBotMessage(
          `🎯 **Lộ trình học hôm nay** (Smart Recommendation)\n\n` +
          `📚 ${fallbackPlan.lessons.length} bài học\n` +
          `⏱️ ${fallbackPlan.totalTime} phút\n` +
          `⚡ ${fallbackPlan.totalXP} XP\n\n` +
          `Sẵn sàng bắt đầu chưa? 🚀`,
          [
            { label: '🚀 Bắt đầu học ngay!', action: 'start_lesson' },
            { label: '🔄 Tạo lại lộ trình', action: 'start_checkin' }
          ]
        );
        setIsTyping(false);
        setIsGeneratingPlan(false);
      }, 1500);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    addUserMessage(inputMessage);
    const userMsg = inputMessage;
    setInputMessage('');
    setIsTyping(true);

    try {
      console.log('[AI Tutor] Sending message to AI:', userMsg);
      
      // Call real AI API
      const response = await fetch('/api/ai-tutor-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          conversationHistory: messages.slice(-10), // Last 10 messages for context
          userState: {
            emotion: userState.emotion,
            motivation: userState.motivation,
            skillLevel: userState.skillLevel,
            goals: userState.goals,
            currentXP: learningSession.earnedXP
          },
          preferredModel: 'auto' // Let system choose best model
        })
      });

      if (!response.ok) {
        throw new Error('AI response failed');
      }

      const data = await response.json();
      console.log('[AI Tutor] Received response from:', data.aiModel);
      console.log('[AI Tutor] Detected emotion:', data.emotion);

      // Update emotion if detected
      if (data.emotion && data.emotion !== 'neutral') {
        setUserState(prev => ({ ...prev, emotion: data.emotion }));
      }

      // Add AI response with actions
      addBotMessage(data.response, data.actions || [
        { label: '💬 Tiếp tục trò chuyện', action: 'continue_chat' }
      ]);

      setIsTyping(false);

    } catch (error: any) {
      console.error('[AI Tutor] Error:', error);
      
      // Fallback response
      addBotMessage(
        "Xin lỗi, mình đang gặp chút vấn đề kỹ thuật. 😅\n\n" +
        "Nhưng đừng lo! Bạn có thể:\n" +
        "• Thử lại sau vài giây\n" +
        "• Dùng các nút gợi ý bên dưới\n" +
        "• Hoặc tiếp tục với lộ trình học đã có\n\n" +
        "Mình sẽ cố gắng phục hồi ngay! 💪",
        [
          { label: '🔄 Thử lại', action: 'retry_message', data: userMsg },
          { label: '📚 Xem lộ trình học', action: 'show_learning_path' }
        ]
      );
      
      setIsTyping(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
                <Brain className="w-10 h-10 text-white" />
              
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">AI Daily Learning Assistant</h1>
                <p className="text-gray-600">Your personal adaptive tutor, powered by AI</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm text-gray-500">Today&apos;s Progress</div>
                <div className="text-2xl font-bold text-purple-600">{learningSession.earnedXP} XP</div>
                {learningSession.active && (
                  <div className="text-xs text-green-600 flex items-center justify-end mt-1">
                    <Activity className="w-3 h-3 mr-1 animate-pulse" />
                    Learning in progress
                  </div>
                )}
              </div>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                learningSession.active ? 'bg-green-100' : 'bg-purple-100'
              }`}>
                <Sparkles className={`w-6 h-6 ${learningSession.active ? 'text-green-600' : 'text-purple-600'}`} />
              </div>
            </div>
          </div>
        </div>

        {/* Learning Session Stats */}
        {learningSession.active && dailyPlan && (
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl shadow-xl p-6 mb-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2">📚 Buổi học đang diễn ra</h3>
                <div className="flex items-center space-x-4 text-sm">
                  <span>✅ {learningSession.completedLessons}/{dailyPlan.lessons.length} bài</span>
                  <span>⚡ {learningSession.earnedXP} XP</span>
                  <span>🎯 {Math.round((learningSession.completedLessons / dailyPlan.lessons.length) * 100)}%</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">{Math.round((learningSession.completedLessons / dailyPlan.lessons.length) * 100)}%</div>
                <div className="text-xs opacity-90">Hoàn thành</div>
              </div>
            </div>
            {/* Progress Bar */}
            <div className="mt-4 bg-white/20 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-white h-full rounded-full transition-all duration-500"
                style={{ width: `${(learningSession.completedLessons / dailyPlan.lessons.length) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Chat Container */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Messages */}
          <div className="h-[600px] overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl p-4 ${
                    message.type === 'user'
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  
                  {/* Action Buttons */}
                  {message.actions && message.actions.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {message.actions.map((action, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleAction(action.action, action.data)}
                          className="w-full bg-white hover:bg-gray-50 text-gray-900 px-4 py-2 rounded-lg font-medium transition-colors text-left"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  <div className="mt-2 text-xs opacity-70">
                    {message.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl p-4">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Gõ câu hỏi hoặc chia sẻ suy nghĩ của bạn..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim()}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-3 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Send className="w-5 h-5" />
                <span>Gửi</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

