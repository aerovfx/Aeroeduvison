'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MessageCircle, X, Send, Minimize2, Maximize2, Brain, Sparkles,
  Minimize2 as Minimize, Maximize2 as Maximize
} from 'lucide-react';
import { OpenFangClient, OpenFangMessage } from '@/lib/openfang';

interface Message {
  id: string;
  type: 'bot' | 'user';
  content: string;
  timestamp: Date;
}

export default function ChatbotOpenFang() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [agentId, setAgentId] = useState<string | null>(null);
  
  const clientRef = useRef<OpenFangClient>(new OpenFangClient());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Find or create the tutor agent on mount
  useEffect(() => {
    const initAgent = async () => {
      try {
        const agents = await clientRef.current.listAgents();
        const tutor = agents.find(a => a.name === 'tutor');
        if (tutor) {
          setAgentId(tutor.id);
        } else {
          // If not found, look for template or spawn with default
          console.warn('Tutor agent not found, will attempt to find by name on first message');
        }
      } catch (error) {
        console.error('Failed to initialize Open Fang agent:', error);
      }
    };

    initAgent();
  }, []);

  const addBotMessage = useCallback((content: string) => {
    const message: Message = {
      id: `bot-${Date.now()}`,
      type: 'bot',
      content,
      timestamp: new Date(),
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
          "👋 Chào bạn! Mình là Tutor, trợ lý học tập thông minh từ Open Fang.\n\nMình có thể giúp bạn giải đáp thắc mắc, lập kế hoạch học tập hoặc giải thích các khái niệm khó. Bạn cần mình hỗ trợ gì hôm nay?"
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

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMsg = inputMessage;
    addUserMessage(userMsg);
    setInputMessage('');
    setIsTyping(true);

    try {
      const history: OpenFangMessage[] = messages.map(m => ({
        role: m.type === 'user' ? 'user' : 'assistant',
        content: m.content
      }));

      // Determine target ID (use fixed 'tutor' if ID map is not ready)
      const targetId = agentId || 'tutor';
      
      const response = await clientRef.current.chat(userMsg, targetId, history);
      addBotMessage(response.response);
    } catch (error) {
      console.error('Open Fang chat error:', error);
      addBotMessage("Xin lỗi, mình đang gặp sự cố kết nối với hệ thống Open Fang. Vui lòng thử lại sau nhé!");
    } finally {
      setIsTyping(false);
    }
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
          className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all transform hover:scale-110 z-50"
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
          className={`fixed bottom-6 right-6 bg-white rounded-2xl shadow-2xl transition-all duration-300 z-50 flex flex-col ${
            isMinimized ? 'w-80 h-16' : 'w-96 h-[600px]'
          }`}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-t-2xl flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <Brain className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Open Fang Tutor</h3>
                <p className="text-[10px] text-blue-100 italic">Powered by Open Fang OS</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button onClick={toggleMinimize} className="hover:bg-white/20 p-1.5 rounded-lg transition-colors">
                {isMinimized ? <Maximize className="w-4 h-4" /> : <Minimize className="w-4 h-4" />}
              </button>
              <button onClick={toggleChatbot} className="hover:bg-white/20 p-1.5 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm ${
                        message.type === 'user'
                          ? 'bg-blue-600 text-white rounded-tr-none'
                          : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                      }`}
                    >
                      <div className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</div>
                      <div className={`mt-1 text-[10px] ${message.type === 'user' ? 'text-blue-100' : 'text-gray-400'}`}>
                        {message.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm rounded-tl-none">
                      <div className="flex space-x-1.5">
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div>
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 bg-white rounded-b-2xl border-t border-gray-100">
                <div className="flex items-end space-x-2 bg-gray-50 rounded-xl p-2 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                  <textarea
                    rows={1}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Nhập câu hỏi cho Tutor..."
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-1.5 px-2 resize-none max-h-32"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isTyping}
                    className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-all disabled:opacity-40 disabled:grayscale shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[9px] text-gray-400 mt-2 text-center">
                  Tutor có thể mắc lỗi. Vui lòng kiểm tra lại thông tin quan trọng.
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
