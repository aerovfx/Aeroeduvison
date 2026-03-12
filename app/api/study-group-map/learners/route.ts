import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import type { LearnerMarker, StudyGroupMarker, StudyMapArc } from "@/types/study-map";

/**
 * GET /api/study-group-map/learners
 * Returns learners with optional geo + interests for the study group map.
 * Query: subject?, interest?, limit=50
 * If current user is student, also returns suggested buddies (same interests) and arcs.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const subject = searchParams.get("subject") ?? undefined;
    const interest = searchParams.get("interest") ?? undefined;
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 200);

    const users = await db.user.findMany({
      where: {
        role: "STUDENT",
        id: { not: session.user.id },
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        schoolId: true,
      },
      take: limit * 2,
    });

    // Demo: assign fake lat/lng by hash of id so same user always same position
    const hash = (s: string) => {
      let h = 0;
      for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
      return Math.abs(h);
    };
    const learners: LearnerMarker[] = users.slice(0, limit).map((u) => {
      const lat = 10 + (hash(u.id) % 200) / 10 - 10;
      const lng = 100 + (hash(u.id + "x") % 200) / 10 - 10;
      const subjects = ["Toán", "Lý", "Hóa", "Sinh", "Văn", "Anh"];
      const interests = ["Ôn thi", "Lập trình", "Khoa học", "STEM"];
      const sub = subjects[hash(u.id) % subjects.length];
      const int = interests[hash(u.id + "i") % interests.length];
      return {
        id: u.id,
        name: u.name ?? u.email ?? "Học sinh",
        email: u.email,
        image: u.image,
        lat,
        lng,
        locationLabel: "Việt Nam",
        subjects: [sub],
        interests: [int],
        level: ["beginner", "intermediate", "advanced"][hash(u.id) % 3],
        matchScore: 60 + (hash(u.id) % 40),
        studyGroupId: null,
        online: hash(u.id) % 3 === 0,
      };
    });

    const studyGroups: StudyGroupMarker[] = [
      {
        id: "sg1",
        name: "Nhóm Toán 12",
        lat: 21.0,
        lng: 105.8,
        memberCount: 5,
        subject: "Toán",
        interests: ["Ôn thi"],
        isOpen: true,
      },
      {
        id: "sg2",
        name: "Nhóm Lập trình",
        lat: 20.9,
        lng: 106.1,
        memberCount: 3,
        subject: "STEM",
        interests: ["Lập trình"],
        isOpen: true,
      },
    ];

    const currentLearner: LearnerMarker = {
      id: session.user.id,
      name: session.user.name ?? session.user.email ?? "Bạn",
      email: session.user.email ?? undefined,
      image: session.user.image ?? undefined,
      lat: 21.0,
      lng: 105.8,
      locationLabel: "Vị trí của bạn",
      subjects: ["Toán", "Lý"],
      interests: ["Ôn thi", "Khoa học"],
      level: "intermediate",
      studyGroupId: null,
      online: true,
    };

    const arcs: StudyMapArc[] = learners.slice(0, 5).map((l) => ({
      id: `arc-${currentLearner.id}-${l.id}`,
      from: [currentLearner.lat, currentLearner.lng],
      to: [l.lat, l.lng],
      color: [102, 126, 234],
      weight: 1,
    }));

    const filteredLearners = [
      currentLearner,
      ...learners.filter((l) => {
        if (subject && !l.subjects.includes(subject)) return false;
        if (interest && !l.interests.includes(interest)) return false;
        return true;
      }),
    ];

    return NextResponse.json({
      learners: filteredLearners,
      studyGroups,
      arcs,
    });
  } catch (e) {
    console.error("[study-group-map/learners]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}
