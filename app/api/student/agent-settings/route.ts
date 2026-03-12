import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/** Default settings for student agents (AEROEDUVISION_AGENTS_ARCHITECTURE) */
export const DEFAULT_STUDENT_AGENT_SETTINGS = {
  "ai-tutor": {
    explanationDepth: "medium" as "short" | "medium" | "detailed",
    difficulty: "medium" as "easy" | "medium" | "hard",
    learningStyle: "mixed" as "visual" | "auditory" | "kinesthetic" | "mixed",
    preferredSubjects: ["Toán", "Lý", "Hóa", "Sinh", "Văn", "Anh"],
    defaultSubject: "Toán",
    useSocraticMethod: true,
    temperature: 0.7,
    maxTokens: 2048,
  },
  "study-planner": {
    reminderTime: "08:00",
    dailyGoalMinutes: 120,
    weekdaysOnly: false,
    reminderBeforeMinutes: 30,
  },
  "progress-tracker": {
    shareWithParents: true,
    shareWithTeachers: true,
    weeklyDigest: true,
  },
  "exam-prep": {
    defaultSubject: "Toán",
    preferredDifficulty: "medium",
    sessionMinutes: 45,
  },
  "career-advisor": {
    sharePerformance: true,
    interests: [] as string[],
  },
} as const;

export type StudentAgentSettingsMap = typeof DEFAULT_STUDENT_AGENT_SETTINGS;

/** GET /api/student/agent-settings - Lấy cài đặt agents của student */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const row = await db.userAgentSettings.findUnique({
      where: { userId: session.user.id },
    });

    const settings =
      row && typeof row.settings === "object" && row.settings !== null
        ? (row.settings as Record<string, unknown>)
        : {};

    const merged: Record<string, unknown> = {};
    for (const key of Object.keys(DEFAULT_STUDENT_AGENT_SETTINGS)) {
      const defaultBlock = (DEFAULT_STUDENT_AGENT_SETTINGS as Record<string, unknown>)[key];
      merged[key] = { ...(defaultBlock as object), ...(settings[key] as object) || {} };
    }

    return NextResponse.json({ settings: merged });
  } catch (e) {
    console.error("[agent-settings] GET", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load settings" },
      { status: 500 }
    );
  }
}

/** PUT /api/student/agent-settings - Cập nhật cài đặt (partial per agent) */
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const existing = await db.userAgentSettings.findUnique({
      where: { userId: session.user.id },
    });

    const currentSettings =
      existing?.settings && typeof existing.settings === "object"
        ? (existing.settings as Record<string, unknown>)
        : {};

    const nextSettings: Record<string, unknown> = { ...currentSettings };
    for (const agentKey of Object.keys(body)) {
      if (!(agentKey in DEFAULT_STUDENT_AGENT_SETTINGS)) continue;
      const defaultBlock = (DEFAULT_STUDENT_AGENT_SETTINGS as Record<string, unknown>)[agentKey];
      nextSettings[agentKey] = {
        ...(defaultBlock as object),
        ...(currentSettings[agentKey] as object) || {},
        ...(body[agentKey] as object) || {},
      };
    }

    await db.userAgentSettings.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        role: "STUDENT",
        settings: nextSettings,
      },
      update: { settings: nextSettings, role: "STUDENT" },
    });

    return NextResponse.json({ settings: nextSettings });
  } catch (e) {
    console.error("[agent-settings] PUT", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to save settings" },
      { status: 500 }
    );
  }
}
