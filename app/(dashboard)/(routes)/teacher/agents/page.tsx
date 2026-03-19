"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Bot,
  ChevronRight,
  MessageCircle,
  Power,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  Square,
  Send,
} from "lucide-react";
import { triggerOpenfangAgent } from "@/lib/openfang-client";

type TemplateCategory = "General" | "Subject" | "Assessment" | "Support";

interface AgentTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  description: string;
}

interface UserAgent {
  id: string;
  name: string;
  version: string;
  status: "running" | "stopped";
}

interface OpenFangStatus {
  running: boolean;
  pid?: number;
  url: string;
}

const TEMPLATES: AgentTemplate[] = [
  {
    id: "tutor-general",
    name: "Tutor",
    category: "General",
    description:
      "A patient educational agent that explains concepts step-by-step and adapts to the learner's level.",
  },
  {
    id: "lesson-planner",
    name: "Lesson Planner",
    category: "Subject",
    description:
      "Helps design lesson plans, learning objectives, and classroom activities aligned with your syllabus.",
  },
  {
    id: "assessment-designer",
    name: "Assessment Designer",
    category: "Assessment",
    description:
      "Assists in creating quizzes and exams, suggesting question types and difficulty levels.",
  },
  {
    id: "feedback-writer",
    name: "Feedback Writer",
    category: "Support",
    description:
      "Generates constructive feedback for students based on their performance and progress.",
  },
  {
    id: "parent-communicator",
    name: "Parent Communicator",
    category: "Support",
    description:
      "Drafts clear, professional messages to parents about student progress and classroom updates.",
  },
  {
    id: "general-assistant",
    name: "General Assistant",
    category: "General",
    description:
      "A versatile conversational agent that helps with everyday teaching tasks and quick questions.",
  },
];

export default function TeacherAgentsPage() {
  const { data: session } = useSession();
  const [selectedAgent, setSelectedAgent] = useState<UserAgent | null>({
    id: "tutor-general",
    name: "Tutor",
    version: "tutor-general:latest",
    status: "running",
  });
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "agent"; text: string }[]>([]);
  const [sending, setSending] = useState(false);
  
  // OpenFang service control
  const [openFangStatus, setOpenFangStatus] = useState<OpenFangStatus | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [controllingService, setControllingService] = useState(false);
  const [serviceMessage, setServiceMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);

  // Check OpenFang status on mount
  useEffect(() => {
    checkOpenFangStatus();
    const interval = setInterval(checkOpenFangStatus, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const checkOpenFangStatus = async () => {
    try {
      setCheckingStatus(true);
      const response = await fetch('/api/openfang-service', {
        method: 'GET',
      });
      const data = await response.json();
      setOpenFangStatus(data);
      setServiceMessage(null);
    } catch (error) {
      console.error('Failed to check OpenFang status:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleControlService = async (action: 'start' | 'stop') => {
    try {
      setControllingService(true);
      setServiceMessage(null);
      
      const response = await fetch('/api/openfang-service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setServiceMessage({
          type: 'success',
          text: action === 'start' 
            ? '✅ OpenFang Agent OS đã khởi động thành công!' 
            : '⏹️ OpenFang Agent OS đã dừng.'
        });
        await checkOpenFangStatus();
      } else {
        setServiceMessage({
          type: 'error',
          text: `❌ ${result.error || 'Không thể điều khiển service'}`
        });
      }
    } catch (error) {
      setServiceMessage({
        type: 'error',
        text: `❌ Lỗi: ${error instanceof Error ? error.message : 'Không xác định'}`
      });
    } finally {
      setControllingService(false);
    }
  };

  if (!session || session.user.role !== "TEACHER") {
    return null;
  }

  const handleSelectAgent = (agent: UserAgent) => {
    setSelectedAgent(agent);
  };

  const handleTemplateClick = (tpl: AgentTemplate) => {
    setSelectedAgent({
      id: tpl.id,
      name: tpl.name,
      version: `${tpl.id}:latest`,
      status: "running",
    });
  };

  return (
    <div className="neu-container min-h-screen px-0 sm:px-0 lg:px-0 py-0 grid grid-cols-12 gap-0 bg-[hsl(225,15%,6%)]">
      {/* Sidebar: Agent Selection */}
      <aside className="col-span-12 md:col-span-3 lg:col-span-3 border-r border-[hsl(var(--border))] bg-[hsl(225,15%,8%)]">
        <div className="p-4 border-b border-[hsl(var(--border))]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(245,85%,65%)] to-[hsl(280,75%,60%)] flex items-center justify-center shadow-[0_0_12px_rgba(120,100,255,0.3)]">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[hsl(var(--foreground))]">AI Agents</h2>
              <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Teaching assistants</p>
            </div>
          </div>
        </div>

        <div className="p-3 space-y-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))] mb-3 px-2">
            Available Agents
          </div>

          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => handleTemplateClick(tpl)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-xs transition-all ${
                selectedAgent?.id === tpl.id
                  ? "bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.3)]"
                  : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--foreground)/0.05)] border border-transparent"
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                selectedAgent?.id === tpl.id
                  ? 'bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--secondary))] shadow-[0_0_12px_rgba(120,100,255,0.3)]'
                  : 'bg-[hsl(var(--foreground)/0.05)]'
              }`}>
                <Bot className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-[hsl(var(--foreground))] truncate">{tpl.name}</div>
                <div className="text-[10px] text-[hsl(var(--muted-foreground))] truncate">{tpl.category}</div>
              </div>
              {selectedAgent?.id === tpl.id && (
                <div className="w-2 h-2 rounded-full bg-[hsl(var(--success))] animate-pulse" />
              )}
            </button>
          ))}
        </div>
      </aside>

      {/* Main Chat Panel */}
      <main className="col-span-12 md:col-span-9 lg:col-span-9 flex flex-col h-[100vh]">
        {/* OpenFang Service Control Panel */}
        <div className="border-b border-[hsl(var(--border))] bg-[hsl(225,15%,8%)] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${
                openFangStatus?.running ? 'bg-[hsl(var(--success))]' : 'bg-[hsl(var(--muted))]'
              } ${openFangStatus?.running ? 'animate-pulse' : ''}`} />
              <div>
                <div className="text-xs font-semibold text-[hsl(var(--foreground))]">
                  OpenFang Agent OS
                </div>
                <div className="text-[10px] text-[hsl(var(--muted-foreground))]">
                  {openFangStatus?.running ? (
                    <span className="text-[hsl(var(--success))]">● Online - AI thực tế đang chạy</span>
                  ) : (
                    <span className="text-[hsl(var(--muted))]">● Offline - Nhấn Start để kích hoạt AI</span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {!openFangStatus?.running ? (
                <button
                  onClick={() => handleControlService('start')}
                  disabled={controllingService}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-[hsl(var(--success))] to-[hsl(var(--info))] text-white disabled:opacity-50 flex items-center gap-2"
                  title="Khởi động OpenFang Agent OS để sử dụng AI thực tế"
                >
                  <Play className="w-3 h-3" />
                  {controllingService ? 'Starting...' : 'Start OpenFang'}
                </button>
              ) : (
                <button
                  onClick={() => handleControlService('stop')}
                  disabled={controllingService}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[hsl(var(--destructive)/0.2)] text-[hsl(var(--destructive))] border border-[hsl(var(--destructive)/0.3)] disabled:opacity-50 flex items-center gap-2"
                  title="Dừng OpenFang Agent OS để tiết kiệm tài nguyên"
                >
                  <Square className="w-3 h-3" />
                  {controllingService ? 'Stopping...' : 'Stop OpenFang'}
                </button>
              )}
              <button
                onClick={checkOpenFangStatus}
                disabled={checkingStatus}
                className="p-1.5 rounded-lg hover:bg-[hsl(var(--foreground)/0.05)] disabled:opacity-50"
                title="Kiểm tra lại trạng thái"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checkingStatus ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
          
          {/* Service Message */}
          {serviceMessage && (
            <div className={`mt-3 p-2 rounded-lg text-xs flex items-center gap-2 ${
              serviceMessage.type === 'success'
                ? 'bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]'
                : 'bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--destructive))]'
            }`}>
              {serviceMessage.type === 'success' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
              {serviceMessage.text}
            </div>
          )}
          
          {/* Info Banner */}
          {!openFangStatus?.running && (
            <div className="mt-3 p-2 rounded-lg bg-[hsl(var(--info)/0.1)] border border-[hsl(var(--info)/0.2)] text-[hsl(var(--info))] text-xs flex items-center gap-2">
              <AlertCircle className="w-3 h-3" />
              <span>
                <strong>OpenFang đang tắt</strong> - Nhấn "Start OpenFang" để kích hoạt AI thực tế. Service sẽ chạy nền và tiêu tốn tài nguyên hệ thống.
              </span>
            </div>
          )}
        </div>

        {/* Chat Window */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              openFangStatus?.running ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center max-w-md">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--secondary))] flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(120,100,255,0.3)]">
                      <Bot className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-base font-bold text-[hsl(var(--foreground))] mb-2">
                      🤖 AI thực tế đã sẵn sàng!
                    </h3>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      Hỏi trợ giảng AI bất kỳ câu hỏi nào về giảng dạy, soạn bài, thiết kế đề thi, v.v.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center max-w-md">
                    <div className="w-16 h-16 rounded-2xl bg-[hsl(225,15%,15%)] flex items-center justify-center mx-auto mb-4 border border-[hsl(var(--border))]">
                      <AlertCircle className="w-8 h-8 text-[hsl(var(--muted-foreground))]" />
                    </div>
                    <h3 className="text-base font-bold text-[hsl(var(--foreground))] mb-2">
                      💤 OpenFang đang tắt
                    </h3>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mb-3">
                      Service đang tắt để tiết kiệm tài nguyên hệ thống.
                    </p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      Nhấn nút <strong>"Start OpenFang"</strong> ở trên để kích hoạt AI thực tế.
                    </p>
                  </div>
                </div>
              )
            ) : (
              messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                      m.role === "user"
                        ? "bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--secondary))] text-white shadow-[0_0_12px_rgba(120,100,255,0.3)]"
                        : "bg-[hsl(225,15%,12%)] text-[hsl(var(--foreground))] border border-[hsl(var(--border))]"
                    }`}
                  >
                    <div className="text-xs whitespace-pre-wrap">{m.text}</div>
                    {m.role === "agent" && (
                      <div className="text-[9px] text-[hsl(var(--muted-foreground))] mt-2 flex items-center gap-2">
                        <Bot className="w-2.5 h-2.5" />
                        <span>AI Assistant</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Input Form */}
          <div className="border-t border-[hsl(var(--border))] bg-[hsl(225,15%,8%)] p-4">
            <form
              onSubmit={async (e) => {
                  e.preventDefault();
                  if (!input.trim() || !selectedAgent || sending) return;
                  
                  // Check if OpenFang is running
                  if (!openFangStatus?.running) {
                    setServiceMessage({
                      type: 'error',
                      text: '❌ AI chưa được khởi động. Nhấn nút "Start OpenFang" ở trên để bắt đầu.'
                    });
                    return;
                  }
                  
                  const text = input.trim();
                  setInput("");
                  setMessages((prev) => [...prev, { role: "user", text }]);
                  setSending(true);
                  try {
                    console.log(`[Agent Chat] Sending message to ${selectedAgent.id}:`, text);
                    const res = await triggerOpenfangAgent(selectedAgent.id, "chat", { text });
                    console.log(`[Agent Chat] Response:`, res);
                    const reply =
                      (res && (res.reply || res.content || res.message)) ||
                      "Trợ giảng đang xử lý yêu cầu của bạn.";
                    setMessages((prev) => [...prev, { role: "agent", text: reply }]);
                  } catch (err) {
                    console.error("Teacher agent chat error", err);
                    const errorMessage = err instanceof Error ? err.message : "Unknown error";
                    setMessages((prev) => [
                      ...prev,
                      {
                        role: "agent",
                        text: `❌ Lỗi: ${errorMessage}\n\nVui lòng kiểm tra xem OpenFang đang chạy và thử lại.`
                      },
                    ]);
                  } finally {
                    setSending(false);
                  }
                }}
                className="flex items-center gap-3"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="flex-1 bg-[hsl(225,15%,12%)] border border-[hsl(var(--border))] rounded-xl px-4 py-3 text-xs text-[hsl(var(--foreground))] focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-1 focus:ring-[hsl(var(--primary))] placeholder:text-[hsl(var(--muted-foreground))]"
                  placeholder="Nhập câu hỏi cho trợ giảng AI..."
                  disabled={!openFangStatus?.running || sending}
                />
                <button
                  type="submit"
                  disabled={!openFangStatus?.running || sending || !input.trim()}
                  className="px-6 py-3 rounded-xl text-xs font-semibold bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--secondary))] text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-[0_0_12px_rgba(120,100,255,0.3)] hover:shadow-[0_0_20px_rgba(120,100,255,0.5)] transition-all"
                >
                  {sending ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send</span>
                    </>
                  )}
                </button>
              </form>
          </div>
        </div>
      </main>
    </div>
  );
}

