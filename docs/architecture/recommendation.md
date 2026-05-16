# ADR-001: Recommendation System (X For You-inspired pipeline)

* Status: **Accepted** (2026-05-16)
* Decider: bo + Claude
* Reference impl: [X For You algorithm](https://github.com/x/algorithm) (open-sourced 2026-05-15)

## 1. Bối cảnh

AeroEdu hiện chỉ liệt kê nội dung (đề, bài viết, khoá học) theo `createdAt DESC`
hoặc filter cứng. Không có cá nhân hoá:

- `/student/exam-prep` — hiển thị **toàn bộ** đề từ GV, 1 HS lớp 10 thấy
  đề lớp 12 nâng cao ở top
- `/dashboard/home` — feed cùng nội dung cho mọi user
- `/student/career` — hiện danh sách career hardcoded
- `/dashboard/courses` — sort theo enrollment count, không match level HS

Hệ quả:
- Engagement thấp (HS không click đề mà sợ vì khó/dễ quá)
- Không tận dụng được lịch sử làm bài để gợi ý
- AI Tutor không biết câu nào HS đã thuộc / câu nào cần ôn

## 2. Quyết định

Adopt **pipeline-based recommendation architecture** từ X For You, port sang
TypeScript + Python theo phase tăng dần (heuristic → embedding → ML).

### 2.1 Kiến trúc 4-stage

```
RecoContext (user, history, weakTopics)
    │
    ▼
┌─── SOURCES (parallel) ─────────────────────┐
│  TeacherFollow  WeakTopic  Peer  Embedding │  → gộp + dedupe
└────────────────────────────────────────────┘
    │
    ▼
┌─── HYDRATORS (sequential) ────────────────┐
│  TakerCount   Difficulty   TopicTag        │  → enrich metadata
└────────────────────────────────────────────┘
    │
    ▼
┌─── FILTERS (predicate) ───────────────────┐
│  AlreadyMastered  NotTooOld  HasQuestions │  → drop unsuitable
└────────────────────────────────────────────┘
    │
    ▼
┌─── SCORERS (parallel, weighted sum) ──────┐
│  WeakTopic·0.4  Peer·0.3  Recency·0.2     │
│  Difficulty·0.1  Diversity·0.1            │  → score 0..1
└────────────────────────────────────────────┘
    │
    ▼
Sort DESC · Top K · attach __reasons → render
```

Mỗi stage là **trait/interface** — plug-in mới không sửa core mixer.

### 2.2 Phase rollout

| Phase | Khi nào | Tech | Use case |
|---|---|---|---|
| **0 — Framework** | Tuần 1 | TS `lib/reco/` | Skeleton, không có user-facing change |
| **1 — Heuristic** | Tuần 1-2 | TS scorer (sigmoid/log) | `ExamPrep` reorder + reason chips |
| **2 — Embedding** | Tuần 3-4 | Python + sentence-transformers + FAISS | "Đề tương tự" gợi ý |
| **3 — ML** | Tháng 2-3 | LightGBM offline train | Predict P(complete & ≥70%) |
| **4 — Transformer** | ≥100K user | Phoenix-style 4-layer 256-dim | Production-ready ranker |

Phase 0+1 KHÔNG cần BE thay đổi (client-side reco với data đã load qua
react-query). Phase 2+ cần Python service riêng + endpoint `/api/reco/*`.

### 2.3 Use cases ưu tiên

1. **ExamPrep gợi ý đề** — ✅ Phase 1 ship
2. **AI Tutor spaced repetition** (SM-2) — ✅ Phase 1 ship (lib `srs.ts`)
3. **Course similarity** — Phase 2
4. **Career profile match** — Phase 3
5. **Home feed personalization** — Phase 3

## 3. Cấu trúc thư mục

```
aeroedu-vite/src/lib/reco/
├── types.ts                # CandidateStage, Source, Hydrator, Filter, Scorer, MixerConfig
├── mixer.ts                # mix() + createMixer() — orchestration
├── context.ts              # buildContext(), readLocalHistory(), pushHistory()
├── examPrepMixer.ts        # rankExams() — high-level API cho ExamPrep
├── index.ts                # barrel export
└── stages/
    ├── sources.ts          # 5 sources: recent, weak-topic, peer, top-rated, cached
    ├── filters.ts          # 3 filters: has-questions, already-mastered, not-too-old
    └── scorers.ts          # 5 scorers: weak-topic, peer, recency, difficulty, diversity

aeroedu-vite/src/lib/srs.ts                          # SM-2 spaced repetition
aeroedu-vite/src/components/srs/SrsReviewPanel.tsx   # UI "X câu cần ôn"

embedding-service/                                    # Phase 2 — Python
├── main.py                 # FastAPI + sentence-transformers + FAISS
├── batch_embed.py          # Cron job embed exam mới
├── requirements.txt
├── Dockerfile              # Cloud Run image
└── README.md
```

## 4. API contracts

### 4.1 Mixer signature
```typescript
import { rankExams, buildContext } from '@/lib/reco'

const ctx = buildContext({
  userId: user?.id ?? null,
  weakTopics: stats?.weakTopics ?? [],
  grade: '10',
})
const ranked = await rankExams(teacherExams, ctx, { topK: 30 })
// ranked: Array<TeacherExam & { __score: number; __reasons: string[] }>
```

### 4.2 SRS signature
```typescript
import { recordReview, getDueCards, percentageToRating } from '@/lib/srs'

// Sau khi HS làm xong câu hỏi với điểm 80%
recordReview(questionId, percentageToRating(80), { subject: 'Toán' })

// Lấy 20 câu cần ôn hôm nay
const dueCards = getDueCards(Date.now(), { subject: 'Toán', limit: 20 })
```

### 4.3 Embedding service
```
POST /embed       — text → vector
POST /similar     — query → top-K similar items
POST /index/upsert — add new items to FAISS
```

## 5. Alternatives đã cân nhắc

### A. Dùng nguyên Phoenix (Grok-based transformer)
- ❌ 100B param model, cần GPU H100 cluster
- ❌ Quá overkill cho < 100K user

### B. Dùng managed service (Vertex AI Search/Reco)
- ⚠ Vendor lock-in, $$$ ($200+/month chỉ riêng index)
- ⚠ Không linh hoạt với schema VN-specific (topic, grade taxonomy)
- ✅ Có thể migrate trong Phase 3 nếu scale > 100K

### C. Tự build từ đầu không reference X
- ❌ Tốn 3-6 tháng R&D
- ❌ Mất đi học từ system production-grade

→ **Chọn**: Adopt X's modular pattern, port simplified, scale theo phase.

## 6. Consequences

### Tích cực
- ✅ Mỗi use case mới chỉ cần compose Source/Filter/Scorer — không sửa core
- ✅ A/B test scorer dễ dàng (toggle `enable` predicate)
- ✅ Phase rollout incremental — value ngay từ Phase 1
- ✅ SRS algo (SM-2) đã production-proven (Anki, Mnemosyne)
- ✅ Cùng pattern dùng được cho ExamPrep, Course, Career, AI Tutor

### Tiêu cực
- ⚠ Thêm 8 file mới (~600 LOC) — cần maintain
- ⚠ Phase 2+ cần thêm Python service (1 thêm runtime để monitor)
- ⚠ Heuristic scorer cần tune weights thủ công cho đến Phase 3
- ⚠ Client-side reco (Phase 1) phụ thuộc localStorage — clear cache mất history

### Trung tính
- Reco logic chạy mỗi render trang (5-10ms cho 100 items) — chấp nhận được
- Reason chips có thể overwhelm UI — limit max 2-3 chips/card

## 7. Metrics đo lường thành công

| Metric | Baseline (trước) | Target Phase 1 | Target Phase 3 |
|---|---|---|---|
| Avg đề HS làm/tuần | 1.2 | 1.8 (+50%) | 3.0 (+150%) |
| % HS click đề được gợi ý | N/A | 35% | 55% |
| Hoàn thành đề (completion rate) | 42% | 50% | 65% |
| SRS retention sau 30 ngày | N/A | 60% | 80% |

Track qua endpoint mới `/api/reco/log-event` (impression/click/complete) →
dashboard analytics riêng.

## 8. Implementation status (tracking)

- ✅ Phase 0: Framework — `lib/reco/{types,mixer,context,index}.ts`
- ✅ Phase 1a: Heuristic scorers — `stages/{sources,filters,scorers}.ts`
- ✅ Phase 1b: ExamPrep wired — reason chips trên card đề
- ✅ Phase 1c: SRS lib + UI panel — `lib/srs.ts` + `SrsReviewPanel.tsx`
- 🟡 Phase 1d: Hook SRS vào AI Tutor (cần tích hợp vào AiTutor.tsx)
- 🔵 Phase 2: Embedding service scaffold xong (`embedding-service/`)
  — chưa deploy, chờ DB infra ổn định
- ⬜ Phase 3: LightGBM training pipeline
- ⬜ Phase 4: Transformer ranker

## 9. Tham khảo

- `/Users/pixidev/Aeroeduvison/algorithm/README.md` — X For You overview
- `/Users/pixidev/Aeroeduvison/algorithm/candidate-pipeline/` — Rust trait design
- `/Users/pixidev/Aeroeduvison/algorithm/phoenix/` — ML retrieval + ranking
- [SM-2 algorithm spec](https://en.wikipedia.org/wiki/SuperMemo#Algorithm_SM-2)
- [sentence-transformers VN model](https://huggingface.co/keepitreal/vietnamese-sbert)
