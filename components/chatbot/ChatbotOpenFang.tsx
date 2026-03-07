'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MessageCircle, X, Send, Minimize2, Maximize2, Brain, Sparkles,
  Search, MessageSquare
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
  const [activeAgent, setActiveAgent] = useState<'tutor' | 'researcher'>('tutor');

  const clientRef = useRef<OpenFangClient>(new OpenFangClient());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Find or create agents on mount
  useEffect(() => {
    const initAgents = async () => {
      try {
        const agents = await clientRef.current.listAgents();
        console.log('Available agents:', agents.map(a => a.name));
      } catch (error) {
        console.error('Failed to initialize Open Fang agents:', error);
      }
    };

    initAgents();
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
          "👋 Chào bạn! Mình là trợ lý học tập thông minh từ Open Fang.\n\nBạn có thể hỏi mình bài tập (Tutor) hoặc nhờ mình tra cứu tài liệu chuyên sâu (Researcher) nhé!"
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

      const response = await clientRef.current.chat(userMsg, activeAgent, history);
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
          className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-indigo-600 via-blue-600 to-purple-600 hover:scale-110 text-white rounded-2xl shadow-[0_10px_40px_rgba(79,70,229,0.3)] flex items-center justify-center transition-all duration-300 z-50 group border border-white/20"
        >
          <div className="absolute inset-0 bg-white/10 rounded-2xl group-hover:opacity-0 transition-opacity"></div>
          <Sparkles className="w-8 h-8 group-hover:rotate-12 transition-transform" />
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white animate-bounce">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Chatbot Window */}
      {isOpen && (
        <div 
          className={`fixed bottom-6 right-6 bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.15)] transition-all duration-500 z-50 flex flex-col border border-white overflow-hidden ${
            isMinimized ? 'w-80 h-16' : 'w-96 h-[600px] ring-1 ring-black/[0.05]'
          }`}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-gray-900 to-indigo-900 text-white p-5 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                {activeAgent === 'tutor' ? <Brain className="w-6 h-6" /> : <Search className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm tracking-tight">Open Fang AI</h3>
                    <div className="flex p-0.5 bg-white/10 rounded-lg">
                        <button 
                            onClick={() => setActiveAgent('tutor')}
                            className={`px-1.5 py-0.5 text-[9px] font-bold rounded-md transition-all ${activeAgent === 'tutor' ? 'bg-white text-indigo-900' : 'text-white/60 hover:text-white'}`}
                        >
                            Tutor
                        </button>
                        <button 
                            onClick={() => setActiveAgent('researcher')}
                            className={`px-1.5 py-0.5 text-[9px] font-bold rounded-md transition-all ${activeAgent === 'researcher' ? 'bg-white text-indigo-900' : 'text-white/60 hover:text-white'}`}
                        >
                            Researcher
                        </button>
                    </div>
                </div>
                <p className="text-[10px] text-gray-400 font-medium">Kernel v0.1.0 • Stable</p>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <button onClick={toggleMinimize} className="hover:bg-white/10 p-2 rounded-xl transition-all">
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>
              <button onClick={toggleChatbot} className="hover:bg-white/10 p-2 rounded-xl transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/30">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-[1.5rem] px-4 py-3 shadow-md border ${
                        message.type === 'user'
                          ? 'bg-indigo-600 text-white rounded-tr-none border-indigo-500'
                          : 'bg-white text-gray-800 border-gray-100 rounded-tl-none'
                      }`}
                    >
                      <div className="text-[13px] leading-relaxed whitespace-pre-wrap">{message.content}</div>
                      <div className={`mt-1.5 text-[9px] font-medium ${message.type === 'user' ? 'text-indigo-100' : 'text-gray-400'}`}>
                        {message.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm rounded-tl-none">
                      <div className="flex space-x-1.5">
                        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 bg-white border-t border-gray-50">
                <div className="flex items-end space-x-2 bg-gray-50 rounded-2xl p-2.5 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all border border-gray-100">
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
                    placeholder={`Hỏi ${activeAgent === 'tutor' ? 'Tutor' : 'Researcher'}...`}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-[13px] py-1.5 px-2 resize-none max-h-32 text-gray-700 placeholder:text-gray-400"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isTyping}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-xl transition-all disabled:opacity-30 shadow-lg shadow-indigo-200"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-center gap-4 mt-3">
                   <p className="text-[10px] text-gray-400 font-medium">Open Fang Agent OS Integration</p>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
