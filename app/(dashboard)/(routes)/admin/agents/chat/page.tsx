"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { MessageCircle, Bot } from "lucide-react";
import { triggerOpenfangAgent } from "@/lib/openfang-client";

interface ChatMessage {
  role: "user" | "agent";
  text: string;
}

export default function AdminAgentChatPage() {
  const searchParams = useSearchParams();
  const agentId = searchParams.get("agent") || "general-assistant";
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setSending(true);
    try {
      const res = await triggerOpenfangAgent(agentId, "chat", { text });
      const reply =
        (res && (res.reply || res.content || res.message)) ||
        "Agent is processing your request.";
      setMessages((prev) => [...prev, { role: "agent", text: reply }]);
    } catch (err) {
      console.error("Admin agent chat error", err);
      setMessages((prev) => [
        ...prev,
        { role: "agent", text: "Sorry, the agent is unavailable. Please try again later." },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="neu-container min-h-screen px-4 sm:px-6 lg:px-8 py-6 md:py-8 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
          style={{ background: "var(--gradient-primary)", boxShadow: "var(--glow-primary)" }}
        >
          <MessageCircle className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-lg md:text-xl font-bold gradient-text tracking-tight">
            Chat with Agent
          </h1>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Agent ID: {agentId}
          </p>
        </div>
      </div>

      <div className="glass-card neu-card rounded-xl p-4 flex flex-col flex-1 h-[70vh]">
        <header className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[hsl(var(--accent))] flex items-center justify-center text-[hsl(var(--foreground))]">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
                Agent
              </p>
              <h2 className="text-sm font-semibold text-[hsl(var(--foreground))]">
                {agentId}
              </h2>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto text-xs text-[hsl(var(--muted-foreground))] space-y-2 pr-1">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <p>No messages yet. Start the conversation below.</p>
            </div>
          ) : (
            messages.map((m, idx) => (
              <div
                key={idx}
                className={`max-w-[80%] rounded-xl px-3 py-2 mb-1 ${
                  m.role === "user"
                    ? "ml-auto bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--foreground))]"
                    : "mr-auto bg-[hsl(var(--accent))] text-[hsl(var(--foreground))]"
                }`}
              >
                {m.text}
              </div>
            ))
          )}
        </div>

        <form className="mt-3 flex items-center gap-2" onSubmit={handleSubmit}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="ai-input neu-input flex-1 px-3 py-2 rounded-xl text-xs"
            placeholder="Type a message..."
          />
          <button
            type="submit"
            className="ai-button-primary rounded-xl px-3 py-2 text-xs font-semibold disabled:opacity-60"
            disabled={sending}
          >
            {sending ? "Sending..." : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}

