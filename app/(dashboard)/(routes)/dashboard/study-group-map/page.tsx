"use client";

import { useState, useEffect } from "react";
import { DualMapEngine } from "@/components/study-group-map/DualMapEngine";
import type {
  LearnerMarker,
  StudyGroupMarker,
  StudyMapArc,
  EducationIndicatorRegion,
} from "@/types/study-map";

export default function StudyGroupMapPage() {
  const [learners, setLearners] = useState<LearnerMarker[]>([]);
  const [studyGroups, setStudyGroups] = useState<StudyGroupMarker[]>([]);
  const [arcs, setArcs] = useState<StudyMapArc[]>([]);
  const [educationIndicators, setEducationIndicators] = useState<EducationIndicatorRegion[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("");
  const [interest, setInterest] = useState("");
  const [selectedLearner, setSelectedLearner] = useState<LearnerMarker | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<StudyGroupMarker | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (subject) params.set("subject", subject);
    if (interest) params.set("interest", interest);
    params.set("limit", "80");
    fetch(`/api/study-group-map/learners?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setLearners(data.learners ?? []);
        setStudyGroups(data.studyGroups ?? []);
        setArcs(data.arcs ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [subject, interest]);

  useEffect(() => {
    fetch("/api/study-group-map/indicators")
      .then((r) => r.json())
      .then((data) => setEducationIndicators(data.regions ?? []))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-slate-100 p-4 md:p-6">
      <div className="max-w-[1600px] mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
            Bản đồ học nhóm
          </h1>
          <p className="text-slate-400 mt-1">
            Xem người học cùng sở thích trên bản đồ, chuyển đổi Globe 3D hoặc bản đồ phẳng, và gợi ý học chung.
          </p>
        </header>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="rounded-xl bg-slate-700/60 border border-slate-600 text-slate-200 px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Tất cả môn</option>
            <option value="Toán">Toán</option>
            <option value="Lý">Lý</option>
            <option value="Hóa">Hóa</option>
            <option value="Sinh">Sinh</option>
            <option value="Văn">Văn</option>
            <option value="Anh">Anh</option>
            <option value="STEM">STEM</option>
          </select>
          <select
            value={interest}
            onChange={(e) => setInterest(e.target.value)}
            className="rounded-xl bg-slate-700/60 border border-slate-600 text-slate-200 px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Tất cả sở thích</option>
            <option value="Ôn thi">Ôn thi</option>
            <option value="Lập trình">Lập trình</option>
            <option value="Khoa học">Khoa học</option>
            <option value="STEM">STEM</option>
          </select>
        </div>

        {loading ? (
          <div className="h-[600px] rounded-2xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-center">
            <span className="text-slate-400">Đang tải dữ liệu…</span>
          </div>
        ) : (
          <div className="h-[600px] rounded-2xl overflow-hidden">
            <DualMapEngine
              learners={learners}
              studyGroups={studyGroups}
              arcs={arcs}
              educationIndicators={educationIndicators}
              initialMode="globe"
              onLearnerClick={setSelectedLearner}
              onGroupClick={setSelectedGroup}
            />
          </div>
        )}

        {/* Side panel: selected learner or group */}
        {(selectedLearner || selectedGroup) && (
          <div
            className="mt-4 p-4 rounded-2xl bg-slate-800/60 border border-slate-700/50"
            role="dialog"
            aria-label="Chi tiết"
          >
            {selectedLearner && (
              <>
                <h3 className="font-semibold text-indigo-300">Gợi ý học chung</h3>
                <p className="text-slate-200 mt-1">{selectedLearner.name}</p>
                <p className="text-slate-400 text-sm">
                  Môn: {selectedLearner.subjects.join(", ")} · Sở thích: {selectedLearner.interests.join(", ")}
                  {selectedLearner.matchScore != null && ` · Độ trùng: ${selectedLearner.matchScore}%`}
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedLearner(null)}
                  className="mt-2 text-slate-400 hover:text-white text-sm"
                >
                  Đóng
                </button>
              </>
            )}
            {selectedGroup && !selectedLearner && (
              <>
                <h3 className="font-semibold text-green-300">Nhóm học</h3>
                <p className="text-slate-200 mt-1">{selectedGroup.name}</p>
                <p className="text-slate-400 text-sm">
                  {selectedGroup.memberCount} thành viên · {selectedGroup.subject ?? "—"}
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedGroup(null)}
                  className="mt-2 text-slate-400 hover:text-white text-sm"
                >
                  Đóng
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
