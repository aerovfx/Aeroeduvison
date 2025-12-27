'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MessageCircle, X, Send, Minimize2, Maximize2, Brain, Sparkles,
  Smile, Meh, Frown, Target, Zap, BookOpen, TrendingUp, AlertCircle
} from 'lucide-react';

interface Message {
  id: string;
  type: 'bot' | 'user';
  content: string;
  timestamp: Date;
  actions?: any[];
}

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentFlow, setCurrentFlow] = useState<'idle' | 'emotion' | 'goal' | 'assessment' | 'generating'>('idle');
  const [userContext, setUserContext] = useState({
    emotion: '',
    motivation: 0,
    goal: '',
    level: '',
    todayXP: 0
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addBotMessage = useCallback((content: string, actions?: any[]) => {
    const message: Message = {
      id: `bot-${Date.now()}`,
      type: 'bot',
      content,
      timestamp: new Date(),
      actions
    };
    setMessages(prev => [...prev, message]);
    
    if (!isOpen || isMinimized) {
      setUnreadCount(prev => prev + 1);
    }
  }, [isOpen, isMinimized]);

  useEffect(() => {
    // Welcome message when first opened
    if (isOpen && messages.length === 0) {
      setTimeout(() => {
        addBotMessage(
          "👋 Xin chào! Mình là AI Assistant của bạn.\n\nMình có thể giúp bạn:\n• 📚 Tạo bài học cá nhân hóa\n• 🎯 Gợi ý lộ trình học phù hợp\n• 💡 Trả lời câu hỏi\n• 📊 Theo dõi tiến độ\n\nBạn muốn bắt đầu học hôm nay không?",
          [
            { label: '✨ Bắt đầu học ngay!', action: 'start_daily_checkin' },
            { label: '❓ Hỏi câu hỏi', action: 'ask_question' },
            { label: '📊 Xem tiến độ', action: 'view_progress' }
          ]
        );
      }, 500);
    }
  }, [isOpen, messages.length, addBotMessage]);

  const addUserMessage = (content: string) => {
    const message: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, message]);
  };

  const handleAction = async (action: string, data?: any) => {
    setIsTyping(true);

    switch (action) {
      case 'start_daily_checkin':
        addUserMessage('Bắt đầu học ngay! 💪');
        setTimeout(() => {
          setCurrentFlow('emotion');
          addBotMessage(
            "Tuyệt vời! Trước tiên, hãy cho mình biết cảm giác của bạn hôm nay:",
            [
              { label: '😊 Vui vẻ, năng lượng tốt', action: 'set_emotion', data: { emotion: 'happy', motivation: 90 } },
              { label: '😐 Bình thường', action: 'set_emotion', data: { emotion: 'neutral', motivation: 70 } },
              { label: '😔 Hơi mệt', action: 'set_emotion', data: { emotion: 'tired', motivation: 50 } },
              { label: '😰 Stress', action: 'set_emotion', data: { emotion: 'stressed', motivation: 40 } }
            ]
          );
          setIsTyping(false);
        }, 1000);
        break;

      case 'set_emotion':
        addUserMessage(data.emotion === 'happy' ? '😊 Vui vẻ, năng lượng tốt' :
                      data.emotion === 'neutral' ? '😐 Bình thường' :
                      data.emotion === 'tired' ? '😔 Hơi mệt' : '😰 Stress');
        
        setUserContext(prev => ({ ...prev, emotion: data.emotion, motivation: data.motivation }));
        
        setTimeout(() => {
          setCurrentFlow('goal');
          const encouragement = data.motivation >= 80 ? 
            "🚀 Tuyệt! Hôm nay bạn sẽ học rất hiệu quả!" :
            data.motivation >= 60 ?
            "👍 Ổn đấy! Chúng ta sẽ có kế hoạch phù hợp." :
            "🌱 Không sao! Hôm nay học nhẹ nhàng thôi.";
          
          addBotMessage(
            `${encouragement}\n\nBạn muốn học gì hôm nay?`,
            [
              { label: '📐 Toán học', action: 'set_goal', data: 'mathematics' },
              { label: '⚛️ Vật lý', action: 'set_goal', data: 'physics' },
              { label: '🧪 Hóa học', action: 'set_goal', data: 'chemistry' },
              { label: '💻 Lập trình', action: 'set_goal', data: 'programming' },
              { label: '🎯 Để AI chọn', action: 'set_goal', data: 'auto' }
            ]
          );
          setIsTyping(false);
        }, 1200);
        break;

      case 'set_goal':
        const goalText = data === 'auto' ? '🎯 Để AI chọn' :
                        data === 'mathematics' ? '📐 Toán học' :
                        data === 'physics' ? '⚛️ Vật lý' :
                        data === 'chemistry' ? '🧪 Hóa học' : '💻 Lập trình';
        
        addUserMessage(goalText);
        setUserContext(prev => ({ ...prev, goal: data }));
        
        setTimeout(() => {
          setCurrentFlow('assessment');
          addBotMessage(
            "Bạn tự đánh giá mình ở level nào?",
            [
              { label: '🌱 Beginner', action: 'generate_plan', data: 'beginner' },
              { label: '📚 Intermediate', action: 'generate_plan', data: 'intermediate' },
              { label: '🚀 Advanced', action: 'generate_plan', data: 'advanced' },
              { label: '⚡ Expert', action: 'generate_plan', data: 'expert' }
            ]
          );
          setIsTyping(false);
        }, 1000);
        break;

      case 'generate_plan':
        addUserMessage(data === 'beginner' ? '🌱 Beginner' :
                      data === 'intermediate' ? '📚 Intermediate' :
                      data === 'advanced' ? '🚀 Advanced' : '⚡ Expert');
        
        setUserContext(prev => ({ ...prev, level: data }));
        setCurrentFlow('generating');
        
        addBotMessage("🤖 Đang tạo lộ trình học tối ưu cho bạn...");
        
        // Simulate AI planning
        setTimeout(() => {
          const dailyPlan = {
            lessons: userContext.motivation >= 80 ? 3 : userContext.motivation >= 60 ? 2 : 1,
            totalTime: userContext.motivation >= 80 ? 90 : userContext.motivation >= 60 ? 60 : 30,
            totalXP: data === 'expert' ? 300 : data === 'advanced' ? 200 : 100
          };

          addBotMessage(
            `✅ **Lộ trình hôm nay đã sẵn sàng!**\n\n` +
            `📚 ${dailyPlan.lessons} bài học\n` +
            `⏱️ ${dailyPlan.totalTime} phút\n` +
            `⚡ ${dailyPlan.totalXP} XP\n\n` +
            `Bạn muốn bắt đầu ngay không?`,
            [
              { label: '🚀 Bắt đầu học!', action: 'start_learning' },
              { label: '🔄 Tạo lại lộ trình', action: 'start_daily_checkin' }
            ]
          );
          setCurrentFlow('idle');
          setIsTyping(false);
        }, 2500);
        break;

      case 'start_learning':
        addUserMessage('Bắt đầu học! 🚀');
        setTimeout(() => {
          addBotMessage(
            "Tuyệt! Đang chuyển bạn đến Learning Planner...",
            [
              { label: '📚 Mở Planner', action: 'open_planner' }
            ]
          );
          setIsTyping(false);
          // Auto redirect after 2s
          setTimeout(() => {
            window.location.href = '/learning-paths-demo/planner';
          }, 2000);
        }, 800);
        break;

      case 'open_planner':
        window.location.href = '/learning-paths-demo/planner';
        break;

      case 'ask_question':
        addUserMessage('Tôi có câu hỏi 💭');
        setTimeout(() => {
          addBotMessage(
            "Hãy gõ câu hỏi của bạn vào ô chat bên dưới, mình sẽ cố gắng trả lời nhé! 💬"
          );
          setIsTyping(false);
        }, 800);
        break;

      case 'view_progress':
        addUserMessage('Xem tiến độ 📊');
        setTimeout(() => {
          const totalXP = parseInt(localStorage.getItem('totalXPEarned') || '0');
          const completedLessons = JSON.parse(localStorage.getItem('completedLessons') || '[]');
          
          addBotMessage(
            `📊 **Tiến độ học tập của bạn:**\n\n` +
            `✨ Total XP: ${totalXP}\n` +
            `📚 Bài học đã hoàn thành: ${completedLessons.length}\n` +
            `🔥 Streak: ${localStorage.getItem('learningStreak') || '0'} ngày\n\n` +
            `Tiếp tục phát huy nhé! 💪`,
            [
              { label: '🎯 Học tiếp', action: 'start_daily_checkin' },
              { label: '📈 Xem chi tiết', action: 'open_planner' }
            ]
          );
          setIsTyping(false);
        }, 1000);
        break;

      default:
        setIsTyping(false);
        break;
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    addUserMessage(inputMessage);
    const userMsg = inputMessage;
    setInputMessage('');
    setIsTyping(true);

    // Simple AI response
    setTimeout(() => {
      addBotMessage(
        "Cảm ơn bạn! Mình đang xử lý câu hỏi của bạn. Để được hỗ trợ tốt nhất, bạn có thể:\n\n" +
        "• Click nút bên dưới để bắt đầu\n" +
        "• Hoặc hỏi cụ thể hơn về bài học nào đó",
        [
          { label: '🚀 Bắt đầu học', action: 'start_daily_checkin' },
          { label: '📚 Mở Planner', action: 'open_planner' }
        ]
      );
      setIsTyping(false);
    }, 1200);
  };

  const toggleChatbot = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setUnreadCount(0);
      setIsMinimized(false);
    }
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  return (
    <>
      {/* Chatbot Button */}
      {!isOpen && (
        <button
          onClick={toggleChatbot}
          className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all transform hover:scale-110 z-50"
        >
          <MessageCircle className="w-8 h-8" />
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Chatbot Window */}
      {isOpen && (
        <div 
          className={`fixed bottom-6 right-6 bg-white rounded-2xl shadow-2xl transition-all duration-300 z-50 ${
            isMinimized ? 'w-80' : 'w-96 h-[600px]'
          }`}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <Brain className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold">AI Assistant</h3>
                <p className="text-xs text-purple-100">
                  {currentFlow === 'generating' ? 'Đang tạo lộ trình...' : 'Online'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleMinimize}
                className="hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
              >
                {isMinimized ? <Maximize2 className="w-5 h-5" /> : <Minimize2 className="w-5 h-5" />}
              </button>
              <button
                onClick={toggleChatbot}
                className="hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          {!isMinimized && (
            <>
              <div className="h-[440px] overflow-y-auto p-4 space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl p-3 ${
                        message.type === 'user'
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                      
                      {/* Action Buttons */}
                      {message.actions && message.actions.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {message.actions.map((action, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleAction(action.action, action.data)}
                              className="w-full bg-white hover:bg-gray-50 text-gray-900 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left"
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      )}
                      
                      <div className="mt-1 text-xs opacity-70">
                        {message.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-2xl p-3">
                      <div className="flex space-x-1">
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
              <div className="border-t border-gray-200 p-3">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Gõ câu hỏi..."
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim()}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white p-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Minimized View */}
          {isMinimized && (
            <div className="p-4">
              <p className="text-sm text-gray-600">Chatbot đang minimize</p>
              <p className="text-xs text-gray-400 mt-1">Click để mở lại</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}





