'use client';

import React, { useState } from 'react';
import { Send, Bot, User, Sparkles, Brain } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AIChatTestPage() {
  const { t } = useLanguage();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatType, setChatType] = useState<'help' | 'lesson' | 'emotion'>('help');

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          type: chatType,
          context: getContextForType(chatType)
        })
      });

      const data = await response.json();

      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.success ? data.response : data.fallback || 'Xin lỗi, có lỗi xảy ra.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Xin lỗi, tôi không thể kết nối đến AI service. Hãy thử lại sau.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const getContextForType = (type: string) => {
    switch (type) {
      case 'lesson':
        return JSON.stringify({
          subject: 'mathematics',
          topic: 'phương trình bậc hai',
          difficulty: 'intermediate',
          studentLevel: 'high school'
        });
      case 'emotion':
        return JSON.stringify({
          mood: 'happy',
          energy: 85,
          stress: 25,
          engagement: 90
        });
      default:
        return 'General learning context';
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const quickQuestions = {
    help: [
      'Giải thích phương trình bậc hai',
      'Làm sao để học hiệu quả?',
      'Tôi không hiểu bài này',
      'Gợi ý cách làm bài tập'
    ],
    lesson: [
      'Tạo bài học về đạo hàm',
      'Giải thích định luật Newton',
      'Bài học hóa hữu cơ',
      'Lập trình Python cơ bản'
    ],
    emotion: [
      'Tôi cảm thấy mệt mỏi',
      'Làm sao để tăng động lực?',
      'Tôi stress với bài tập',
      'Cảm thấy không tự tin'
    ]
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl shadow-xl p-6 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">🤖 AI Chat Test</h1>
              <p className="text-purple-100">Test AI services với Google AI và xAI (Grok)</p>
            
              </div>
            <div className="flex items-center space-x-2">
              <Brain className="w-6 h-6" />
              <span className="text-sm">AI Powered</span>
            </div>
          </div>
        </div>

        {/* Chat Type Selector */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
          <div className="flex items-center space-x-4">
            <span className="font-medium text-gray-700">Chat Type:</span>
            <div className="flex space-x-2">
              {(['help', 'lesson', 'emotion'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setChatType(type)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    chatType === type
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type === 'help' && '💬 Help'}
                  {type === 'lesson' && '📚 Lesson'}
                  {type === 'emotion' && '💝 Emotion'}
                </button>
              ))}
            </div>
            <button
              onClick={clearChat}
              className="ml-auto px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors"
            >
              Clear Chat
            </button>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 h-96 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <Bot className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>Chọn loại chat và bắt đầu trò chuyện với AI!</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className="flex items-center mb-1">
                      {message.role === 'user' ? (
                        <User className="w-4 h-4 mr-2" />
                      ) : (
                        <Bot className="w-4 h-4 mr-2" />
                      )}
                      <span className="text-xs opacity-75">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg">
                    <div className="flex items-center">
                      <Bot className="w-4 h-4 mr-2" />
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Questions */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">💡 Quick Questions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {quickQuestions[chatType].map((question, index) => (
              <button
                key={index}
                onClick={() => setInputMessage(question)}
                className="text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm transition-colors"
              >
                {question}
              </button>
            ))}
          </div>
        </div>

        {/* Input Area */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex space-x-4">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder={`Ask AI about ${chatType}...`}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* API Status */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>🔗 Connected to: Google AI (Gemini) & xAI (Grok)</p>
          <p>⚡ Real-time AI responses powered by advanced language models</p>
        </div>
      </div>
    </div>
  );
}
