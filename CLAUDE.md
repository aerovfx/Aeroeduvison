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
- Last deployed commit: `128c9d0` (revision pixiai-00357-nih, 2026-05-20 — PDF split-panel khi điền đáp án + Professional KG GV/Admin)
- Commits since last deploy: `0/5`
- Prev: `128c9d0` → pixiai-00357-nih (PDF split-panel khi điền đáp án — đề thi bên cạnh bubble sheet)
- Prev: `ab669c7` → pixiai-00357-nih (Professional KG — Cây tri thức phát triển chuyên môn GV/Admin — same deploy)
- Prev: `a1db1b9` → pixiai-00357-nih (Báo cáo tiến bộ HS theo các thời kỳ + xuất Excel/JSON — same deploy)
- Prev: `1e36179` → pixiai-00357-nih (Import điểm Excel/JSON vào GradeBook — same deploy)
- Prev: `2b4481b` → pixiai-00357-nih (Sidebar tooltip + lớp Trường/Trung tâm — same deploy)
- Prev: `a28dad9` → pixiai-00356-jas (Drag-drop attach for assignments — same deploy)
- Prev: `85b61b3` → pixiai-00355-cew (Aura light mode)
- Prev: `124489a` → pixiai-00355-cew (PDF zoom max x10 — same deploy)
- Prev: `d76301f` → pixiai-00355-cew (Pixel Odyssey light mode — same deploy)
- Prev: `8724ef1` → pixiai-00355-cew (LabTwin light mode — same deploy)
- Prev: `3897fee` → pixiai-00355-cew (IoT Lab light mode — same deploy)
- Prev: `ae4688b` → pixiai-00354-dol (Chấm hàng loạt ≤100 + Báo cáo phổ điểm + IndexedDB PDF + Zoom PDF)
- Prev: `89805d2` → pixiai-00354-dol (Persist PDF qua F5 — same deploy)
- Prev: `e29127a` → pixiai-00354-dol (Chấm hàng loạt ≤100 phiếu Vision AI — same deploy)
- Prev: `cc112cb` → pixiai-00354-dol (Zoom in/out PDF tham chiếu — same deploy)
- Prev: `5ad7dbd` → pixiai-00353-vog (PDF tham chiếu cột trái ExamGrading)
- Prev: `f1c776b` → pixiai-00353-vog (Danh mục đơn vị KT 4 cấp Bộ GD&ĐT — same deploy)
- Prev: `348125d` → pixiai-00353-vog (5 mẫu import Excel/CSV/JSON/Markdown/Word — same deploy)
- Prev: `5267253` → pixiai-00353-vog (Câu Đúng/Sai 4 mệnh đề + LaTeX — same deploy)
- Prev: `2aa9e1b` → pixiai-00353-vog (Word-like editor + LaTeX cho exam — same deploy)
- Prev: `1c2a8ce` → pixiai-00352-zem (KG sidebar widgets theme-aware)
- Prev: `ab54d5c` → pixiai-00351-jan (KG UI chrome theme-aware)
- Prev: `8cf573b` → pixiai-00351-jan (Help system drawer + tooltip — same deploy)
- Prev: `9bf5520` → pixiai-00351-jan (light mode chữ ĐẬM v3 foreground 4%L — same deploy)
- Prev: `aeb1b75` → pixiai-00351-jan (global light-mode.css 20 rule sets — same deploy)
- Prev: `75e3c72` → pixiai-00351-jan (taodethi 4 bugs — same deploy)
- Prev: `706fd3b` → pixiai-00350-nof (ExamPrep cards light mode + 8 opacity variants)
- Prev: `09710a4` → pixiai-00350-nof (CoursePlayer light mode ~69 patterns — same deploy)
- Prev: `55ce953` → pixiai-00349-hok (Achievements semantic tokens)
- Prev: `b25ae71` → pixiai-00349-hok (text-white/X opacity retune cho light contrast — same deploy)
- Prev: `72b50cf` → pixiai-00348-taf (Comprehensive light mode 7 student/dashboard pages +275, smart HSL→Tailwind mapper)
- Prev: `43ce43e` → pixiai-00348-taf (Achievements 26 HSL accents — same deploy)
- Prev: `6b0b2bd` → pixiai-00347-ced (Light mode batch 10 pages: IoTLab/GraphLab/KnowledgeGraph + 6 khác)
- Prev: `981743f` → pixiai-00346-not (ForYou 48 patterns + revert bg-card2 → bg-secondary)
- Prev: `f36f333` → pixiai-00346-not (GalaxyHero description visible trên light)
- Prev: `0e72ab5` → pixiai-00346-not (14 student/dashboard pages light mode)
- Prev: `eaebddd` → pixiai-00345-som (ExamReports báo cáo trên cùng, list dưới)
- Prev: `1e4415c` → pixiai-00344-xum (ExamReports card list view)
- Prev: `d8e8038` → pixiai-00344-xum (Question Bank taxonomy + Fix LaTeX — same deploy)
- Prev: `59568d6` → pixiai-00343-wef (ExamDetail drag-drop ngân hàng đề + AiExamDialog light mode)
- Prev: `2853256` → pixiai-00343-wef (ExamDetail: kéo-thả + multi-select add câu từ ngân hàng — included in same deploy)
- Prev: `785afda` → pixiai-00342-yat (StudentRequests light mode aware)
- Prev: `1d2a269` → pixiai-00341-lor (CreateExam light mode)
- Prev: `67f72a7` → pixiai-00340-jep (Camera wall/topbar/right-panel theme-aware)
- Prev: `5c176c7` → pixiai-00339-cay (React #310 crash fix + QuestionBank dark cards)
- Prev: `406b884` → pixiai-00338-xek (16 teacher pages light-mode aware qua CSS variables --td-*)
- Prev: `641d846` → pixiai-00337-boj (QR/Link invite HS vào lớp + GV xác thực)
- Prev: `4dc4572` → pixiai-00337-boj (Camera permission + webcam HS làm bài — included in same deploy)
- Prev: `55091b9` → pixiai-00337-boj (Light mode contrast — included in same deploy)
- Prev: `9bab5c1` → pixiai-00337-boj (Learning Path: nút Tạo Module lên top — included in same deploy)
- Prev: `1891997` → pixiai-00337-boj (KG role-aware v2: HS learn/GV monitor/Admin recorder — included in same deploy)
- Prev: `0b3989f` → pixiai-00330-lak (Transcript đa ngôn ngữ + Claude API auto-translate 6 ngôn ngữ)
- Prev: `15eadcf` → pixiai-00329-yec (Course player Udemy-style: section grouping + collapsible + progress badge)
- Prev: `8dded66` → pixiai-00328-pux (AI Dashboard: cards lớp tôi quản lí + filter theo lớp)
- Prev: `2e22a01` → pixiai-00327-xos (KG role-aware: HS/GV/Admin bộ não cá nhân + class mastery + workflow snapshots)
- Prev: `f345a32` → pixiai-00326-qaj (Mobile LMS fix: overlay false-positive + drawer sidebar + 44px touch)
- Prev: `2f4c3a4` → pixiai-00325-luy (RHF values: form không bị xoá + description video)
- Prev: `fc11caf` → pixiai-00324-run (LMS anti-copy: watermark + chống OBS/QuickTime)
- Prev: `d1d4c5d` → pixiai-00323-giw (Player crash fix: alias url→videoUrl + defensive guard)
- Prev: `a702e4b` → pixiai-00322-dim (Learning endpoint thực: videos+assets từ DB thay [] stub)
- Prev: `bba0284` → pixiai-00321-nux (Tiptap underline + CourseAsset upload endpoint)
- Prev: `db7ee11` → pixiai-00320-yeg (auto-save video sau upload + IAM signBlob granted)
- Prev: `255d3b4` → pixiai-00318-xiz (KG nhạc nền + bubble pop + SFX)
- Prev: `9fb9d5f` → pixiai-00316-cel (fix getVTeacher return string — sửa upload video 404)
- Prev: `dc134f2` → pixiai-00315-num (NodeExplorer — phân nhóm liên môn highlight tím)
- Prev: `52c1178` → pixiai-00314-div (KG 3D popup + labels readable)
- Prev: `0b8ca78` → pixiai-00313-cim (trackpad fix + fullscreen + nav 1-click)
- Prev: `4908bc9` → pixiai-00311-lib (KG 2D fix: SVG slice + center marker + loading branded)
- Prev: `6a185e7` → pixiai-00310-zab (KG 3D UX overhaul + lớp 4)
- Prev: `08f7c40` → pixiai-00309-gul (bundle 8: Mĩ thuật+KTPL+HĐTN+F Focus+Tin học+Lớp 1+2+3)
- Prev: `c0225c4` → pixiai-00308-nus (KG Công nghệ Công nghiệp 10/11/12)
- Prev: `ca6b319` → pixiai-00307-yom (🧠 KG Brain v2 Phoenix-style pipeline LIVE)
- Prev: `97ece65` → pixiai-00306-voz (KG Công nghệ Chăn nuôi 10/11/12)
- Prev: `aa978bd` → pixiai-00305-gev (KG Địa lí 10/11/12 — HOÀN TẤT 6 môn GDPT)
- Prev: `a03b726` → pixiai-00304-nag (KG Lịch sử 10/11/12)
- Prev: `ebc475f` → pixiai-00303-cup (KG Toán 10/11/12 mở rộng)
- Prev: `a19026b` → pixiai-00302-qev (KG 🎯 Center reset + Sinh học 10/11/12)
- Prev: `51d0748` → pixiai-00301-kap (KG rename "Cây Sự Sống" + đường mòn + 3D labels)
- Prev: `2c76933` → pixiai-00300-tuf (KG Brain: Notes + Discussion per node — 🎉 revision 300!)
- Prev: `b9efbd1` → pixiai-00299-lib (KG 3D Neural Network view)
- Prev: `d218581` → pixiai-00298-nag (KG physics extension: Quang học + VLHĐ + Phenomenon + Application)
- Prev: `544c1e8` → pixiai-00297-lak (URL fix + time badge + lastCareer LS persist)
- Prev: `4677a76` → pixiai-00296-puv (Games hub polish: completion CTA + deep-link + dailyLife list + scroll-top)
- Prev: `ed01f05` → pixiai-00295-fif (Games hub /student/games + career search + ScrollToTopButton)
- Prev: `04ea6e0` → pixiai-00294-not (Odyssey polish: tutorial + modal key block + achievement toast)
- Prev: `ab1eb69` → pixiai-00293-ced (Pixel games: mobile D-pad + perf off-screen + position save)
- Prev: `0a42917` → pixiai-00292-yex (MetroCity character library + NPC/player picker)
- Prev: `b2411ee` → pixiai-00291-cof (2 Pixel Games: Pixel Agent v2 keyboard + Pixel Odyssey)
- Prev: `1edfce5` → pixiai-00290-bih (Career Pixel Sim 1-day)
- Prev: `6d5d3c5` → pixiai-00289-zom (RS bug fix localStorage userId + adaptive UX parity)
- Prev: `0069a96` → pixiai-00288-sar (RS-Phase 10 enhanced Cold-start Onboarding)
- Prev: `298dfad` → pixiai-00287-cel (RS-Phase 9 A/B Testing Framework)
- Prev: `6b9a8aa` → pixiai-00286-kad (Daily/Sprint UX polish: lastSentAt + progress footer + localStorage)
- Prev: `d984880` → pixiai-00285-xan (RS-Phase 8 Ops: scheduler script + audience-aware digest)
- Prev: `93ddbf1` → pixiai-00284-xef (RS-Phase 8 Multi-channel digest: In-app + Email + Telegram)
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
