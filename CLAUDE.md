# AeroEduVision (inphysic.com) — Workflow rules

## 🚀 Deploy cadence: every 5 commits (NOT every commit)

**Rule chốt với user 2026-05-15:**
> "cứ 5 commit mới deploy"

- Sau mỗi commit, đếm số commit kể từ lần deploy thành công gần nhất
- Khi đếm đạt **5 commit chưa deploy** → mới chạy `./deploy-cloudbuild.sh` + `gcloud run services update-traffic pixiai --region=asia-southeast1 --to-latest` + sound notification
- Trước đó: chỉ commit + push, KHÔNG deploy
- Exception cho phép deploy ngay cả khi chưa đủ 5:
  - User nói rõ "deploy luôn", "deploy ngay", "deploy bản này", "ship now"
  - Bug critical sản xuất 5xx, data loss, security vuln
  - Hotfix khẩn cấp
- Hiển thị "📦 Commit N/5 — deploy sau Y commit nữa" sau mỗi commit để user biết tiến độ

**Tracking trạng thái** (cập nhật mỗi lần commit/deploy):
- Last deployed commit: `93ddbf1` (revision pixiai-00284-xef, 2026-05-17 — RS-Phase 8 Multi-channel Digest LIVE: In-app + Email + Telegram)
- Commits since last deploy: `1/5` (this docs)
- Prev: `bd971e7` → pixiai-00283-xok (Student Daily Plan UI)
- Prev: `9533775` → pixiai-00282-loy (RS-Phase 7 Sprint Dashboard UI)
- Prev: `7073eb9` → pixiai-00281-moh (RS-Phase 7+10 backend — Cold-start + Teacher trending)
- Prev: `48ea1c3` → pixiai-00280-hir (RS-Phase 6 Negative feedback)
- Prev: `bd8cf00` → pixiai-00279-law (RS-Phase 8 Daily digest base — in-app only)
- Prev: `22bdb35` → pixiai-00271-qeh (RS-Phase 1+2 For You feed)
- Prev: `2401573` → pixiai-00270-kon (KG mobile UX cho iPhone 14 Pro Max)
- Prev: `735ca63` → pixiai-00269-gum (KG teacher notification + tabbed sidebar)
- Prev: `8a5b391` → pixiai-00268-nix (KG Phase 5+6+7 — Cross-Subject + Smart Search + Suggestions)
- Prev: `bf50545` → pixiai-00264-zir (Sim 4 critical bug fixes — t.jsCode/extractPinMap/uint8_t/shiftOut)
- Prev: `b100ff7` → pixiai-00263-lip (Save UX redesign — tách Lưu mới vs Cập nhật)
- Prev: `a1f9ea8` → pixiai-00262-bop (Custom mạch simulator "Chạy giả lập")

**KG Roadmap:**
- Phase 1 ✅ MVP viewer (search/expand/filter/drag/zoom + seed Vật lí 11)
- Phase 2 ✅ AI Extract + Similarity linking
- Phase 3 ✅ Personal Mastery Layer (overlay + stats + weak topics)
- Phase 4 ✅ Auto Learning Path (BFS + save-as-LP + estimated time)
- Phase 5 ✅ Cross-Subject (Toán 11 + Hóa 11 + 11 cross-edges)
- Phase 6 ✅ AI Smart Search (Claude NL query → graph slice)
- Phase 7 ✅ Collaborative editing MVP (kg_suggestions table + upvote)
- Phase 8 ⏳ 3D visualization (Three.js force-3D + orbit) — deferred

Khi deploy, reset counter về 0 và update last deployed commit hash.

## 📝 Commit message style

- Tiếng Việt, format conventional commit: `type(scope): mô tả ngắn`
- Body chi tiết "tại sao" + "thay đổi gì", có thể dài
- Footer luôn có:
  ```
  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  ```

## 🔧 Deploy command

```bash
./deploy-cloudbuild.sh && \
gcloud run services update-traffic pixiai --region=asia-southeast1 --to-latest && \
afplay /System/Library/Sounds/Glass.aiff
```

Run trong **background** với `run_in_background: true` (deploy mất 3-5 phút).

## 🌐 Stack quick reference

- FE: `aeroedu-vite/` (React + Vite + TypeScript + Tailwind)
- BE: `server.cjs` (Express, ~10000+ lines, fallback cho Rust microservices)
- DB: PostgreSQL (Neon-compatible) — lazy migration pattern (`ALTER TABLE ADD COLUMN IF NOT EXISTS`)
- Auth: JWT với `ignoreExpiration: true`
- Storage: GCS bucket `aeroedu-media-extreme-lattice-491123-p2` (asia-southeast1, public read)
- Deploy: Cloud Run revision `pixiai-XXX-yyy` ở `asia-southeast1`
- Domain: https://inphysic.com → `pixiai` Cloud Run service

## 🛡 Privacy / PII

- Mã định danh học sinh (Bộ GD&ĐT, 10-12 chữ số) **KHÔNG** hiển thị trên UI bất cứ đâu
- Chỉ xuất hiện khi teacher chủ động bấm "Xuất Excel" trong ClassDetail/GradeBook
- File Excel export luôn có cảnh báo "⚠ File chứa MÃ ĐỊNH DANH CÁ NHÂN — bảo mật theo Luật ATTT 86/2015"

## 🎨 Dark mode inputs

- `index.css` đã có rule global `.dark input/textarea/select` → dark surface + light text
- KHÔNG cần thêm class `dark:bg-...` cho từng input — global CSS đã cover
- Exclude: checkbox, radio, range, file, color, submit, button, reset, image
