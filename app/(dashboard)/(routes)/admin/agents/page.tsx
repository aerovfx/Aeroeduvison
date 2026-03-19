"use client";

import { useRouter } from "next/navigation";
import {
  Bot,
  ChevronRight,
  MessageCircle,
} from "lucide-react";

type TemplateCategory = "GENERAL" | "DEVELOPMENT" | "BUSINESS" | "RESEARCH" | "WRITING";

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

const YOUR_AGENTS: UserAgent[] = [
  {
    id: "writer",
    name: "Writer",
    version: "edu-assistant:latest",
    status: "running",
  },
  {
    id: "general-assistant",
    name: "General Assistant",
    version: "edu-assistant:latest",
    status: "running",
  },
];

const TEMPLATES: AgentTemplate[] = [
  {
    id: "general-assistant",
    name: "General Assistant",
    category: "GENERAL",
    description:
      "A versatile conversational agent that can help with everyday tasks, answer questions, and provide recommendations.",
  },
  {
    id: "code-helper",
    name: "Code Helper",
    category: "DEVELOPMENT",
    description:
      "A programming-focused agent that writes, reviews, and debugs code across multiple languages.",
  },
  {
    id: "researcher",
    name: "Researcher",
    category: "RESEARCH",
    description:
      "An analytical agent that breaks down complex topics, synthesizes information, and provides cited summaries.",
  },
  {
    id: "writer",
    name: "Writer",
    category: "WRITING",
    description:
      "A creative writing agent that helps with drafting, editing, and improving written content of all kinds.",
  },
  {
    id: "data-analyst",
    name: "Data Analyst",
    category: "DEVELOPMENT",
    description:
      "A data-focused agent that helps analyze datasets, create queries, and interpret statistical results.",
  },
  {
    id: "devops",
    name: "DevOps Engineer",
    category: "DEVELOPMENT",
    description:
      "A systems-focused agent for CI/CD, infrastructure, Docker, and deployment troubleshooting.",
  },
  {
    id: "customer-support",
    name: "Customer Support",
    category: "BUSINESS",
    description:
      "A professional, empathetic agent for handling customer inquiries and resolving issues.",
  },
  {
    id: "tutor",
    name: "Tutor",
    category: "GENERAL",
    description:
      "A patient educational agent that explains concepts step-by-step and adapts to the learner's level.",
  },
  {
    id: "api-designer",
    name: "API Designer",
    category: "DEVELOPMENT",
    description:
      "An agent specialized in RESTful API design, OpenAPI specs, and integration architecture.",
  },
  {
    id: "meeting-notes",
    name: "Meeting Notes",
    category: "BUSINESS",
    description:
      "Summarizes meeting transcripts into structured notes with action items and key decisions.",
  },
];

export default function AdminAgentsPage() {
  const router = useRouter();

  const handleOpenChat = (agentId: string) => {
    router.push(`/admin/agents/chat?agent=${encodeURIComponent(agentId)}`);
  };

  return (
    <div className="neu-container min-h-screen px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
            style={{ background: "var(--gradient-primary)", boxShadow: "var(--glow-primary)" }}
          >
            <MessageCircle className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold gradient-text tracking-tight">
              Chat
            </h1>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Manage and start agents that work for your school.
            </p>
          </div>
        </div>
      </div>

      {/* YOUR AGENTS */}
      <section className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))] mb-2">
          Your Agents
        </h2>
        <div className="flex flex-wrap gap-3">
          {YOUR_AGENTS.map((agent) => (
            <button
              key={agent.id}
              type="button"
              onClick={() => handleOpenChat(agent.id)}
              className="glass-card neu-card rounded-xl px-4 py-3 flex items-center justify-between min-w-[220px] text-left hover:border-[hsl(var(--primary)/0.2)] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-[hsl(var(--accent))] flex items-center justify-center text-[hsl(var(--foreground))]">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[hsl(var(--foreground))]">
                    {agent.name}
                  </p>
                  <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                    {agent.version}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-[hsl(var(--success))]">
                {agent.status === "running" ? "RUNNING" : "STOPPED"}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* OR START A NEW AGENT */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))] mb-3">
          Or Start a New Agent
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => handleOpenChat(tpl.id)}
              className="glass-card neu-card rounded-xl p-4 flex flex-col justify-between text-left hover:border-[hsl(var(--primary)/0.2)] transition-colors"
            >
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))] mb-1">
                  {tpl.category}
                </p>
                <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-1">
                  {tpl.name}
                </h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  {tpl.description}
                </p>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[11px] font-medium text-[hsl(var(--primary))] inline-flex items-center gap-1">
                  Use template
                  <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

