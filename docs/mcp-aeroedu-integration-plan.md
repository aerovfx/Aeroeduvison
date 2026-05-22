# Kế hoạch tích hợp MCP — AeroEdu × Claude × Creative Tools

> **MCP (Model Context Protocol)** là chuẩn mở do Anthropic phát triển để LLM
> (Claude/ChatGPT/Gemini) kết nối với external tools một cách thống nhất.
>
> **Mục tiêu**: Cho GV/HS dùng Claude Desktop / Cursor / Claude.ai web trực
> tiếp thao tác với AeroEdu + tools sáng tạo (DaVinci, CapCut, Photoshop)
> mà không cần switch tab/copy-paste.

---

## 1. KIẾN TRÚC TỔNG QUAN

```
┌─────────────────────────────────────────────────────────────────┐
│                    Claude Desktop / Cursor / Web                  │
│                                                                   │
│   "Tạo đề thi 30 câu Vật lí 11, chương Dòng điện không đổi,      │
│    upload lên AeroEdu, sau đó cắt video 10s mỗi câu bằng CapCut"│
└────────────────────┬─────────────────────────────────────────────┘
                     ↓ MCP Protocol (stdio/SSE)
┌─────────────────────────────────────────────────────────────────┐
│                  AeroEdu MCP Hub (Node.js)                        │
│                                                                   │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │ aeroedu-core │ │  creative   │ │   media     │              │
│  │   (CRUD)     │ │  (DaVinci)   │ │ (CapCut/PS) │              │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘             │
└─────────┼────────────────┼────────────────┼─────────────────────┘
          ↓                ↓                ↓
   inphysic API    DaVinci CLI/lua   CapCut API/UI-auto
   (HTTPS REST)    (local process)   (cloud / browser)
```

### Hub design
- **1 MCP server duy nhất** (`@aeroedu/mcp-hub`) export N tools categorized theo namespace:
  - `aeroedu:*` — thao tác với inphysic.com (course, exam, KG, payment)
  - `creative:davinci:*` — DaVinci Resolve scripting (color grade, edit)
  - `media:capcut:*` — CapCut auto-edit (subtitles, transitions)
  - `design:photoshop:*` — Photoshop UXP plugin proxy
  - `audio:elevenlabs:*` — ElevenLabs voice generation
  - `image:figma:*` — Figma export + asset sync

---

## 2. TOOL CATALOG — 30 TOOLS GIAI ĐOẠN 1

### Namespace `aeroedu:*` (15 tools — V1)

| Tool | Mô tả | Use case |
|------|-------|----------|
| `aeroedu.course.list` | Liệt kê khoá của GV/HS | "Hiện tất cả khoá Toán 11 tôi đã tạo" |
| `aeroedu.course.create` | Tạo khoá mới | "Tạo khoá Vật lí 11 — Dao động cơ" |
| `aeroedu.chapter.add` | Thêm chương | "Thêm chương Sóng cơ vào khoá XYZ" |
| `aeroedu.lesson.add` | Thêm bài học | "Thêm bài Sóng dừng vào chương 1" |
| `aeroedu.block.add_video` | Add video block | "Thêm video YouTube X vào lesson Y" |
| `aeroedu.block.add_pdf` | Add PDF block | "Đính kèm PDF từ URL" |
| `aeroedu.block.add_quiz` | Add quiz block | "Link đề thi ZZZ vào lesson Y" |
| `aeroedu.block.add_lab` | Add lab challenge | "Tạo lab analog circuit cho lesson" |
| `aeroedu.exam.create` | Tạo đề thi | "Tạo đề 30 câu Vật lí 11 Dòng điện" |
| `aeroedu.exam.publish` | Publish đề | "Publish đề ABC cho HS" |
| `aeroedu.question.search` | Tìm câu hỏi | "Tìm 10 câu MCQ Định luật Ohm" |
| `aeroedu.question.create_bulk` | Tạo nhiều câu | "Add 30 câu generated từ AI" |
| `aeroedu.student.list` | Liệt kê HS | "Hiện HS lớp 11A1" |
| `aeroedu.report.exam` | Báo cáo đề | "Phân tích kết quả đề XYZ" |
| `aeroedu.kg.search` | Search KG | "Tìm node liên quan Sóng điện từ" |

### Namespace `creative:davinci:*` (5 tools)

| Tool | Mô tả |
|------|-------|
| `davinci.project.open` | Mở project Resolve qua local process |
| `davinci.clip.import` | Import clip từ URL/file |
| `davinci.color.apply_lut` | Apply LUT (color grading) |
| `davinci.timeline.export` | Export timeline (MP4/MOV) |
| `davinci.render.start` | Start render queue |

### Namespace `media:capcut:*` (4 tools)

| Tool | Mô tả |
|------|-------|
| `capcut.project.create` | Tạo project mới |
| `capcut.subtitle.auto_gen` | Auto subtitles từ audio |
| `capcut.template.apply` | Apply CapCut template |
| `capcut.export.share` | Export + upload Google Drive |

### Namespace `design:photoshop:*` (3 tools — UXP plugin)

| Tool | Mô tả |
|------|-------|
| `photoshop.psd.open` | Mở file .psd |
| `photoshop.layer.modify` | Sửa text/image layer |
| `photoshop.export.png` | Export PNG/JPG cho web |

### Namespace `audio:elevenlabs:*` + `image:figma:*` (3 tools)

| Tool | Mô tả |
|------|-------|
| `elevenlabs.tts.generate` | TTS Vietnamese voice |
| `figma.frame.export` | Export Figma frame |
| `figma.asset.sync` | Sync design tokens |

---

## 3. AUTHENTICATION

### AeroEdu tools:
- Stored JWT trong `~/.aeroedu/credentials.json` (encrypted với keychain OS)
- Lần đầu chạy: MCP hub mở browser → user login → callback localhost → save JWT

### Creative tools:
- **DaVinci**: dùng local socket (Resolve mở), không cần auth
- **CapCut**: API key user paste vào config 1 lần
- **Photoshop**: UXP plugin built-in trong Photoshop, auth qua Adobe ID
- **ElevenLabs/Figma**: API key user paste

---

## 4. ROADMAP 6 THÁNG

### **Tháng 1: MVP foundation**
- ✅ Setup `@aeroedu/mcp-hub` repo (Node + TypeScript)
- ✅ Implement 5 core tools `aeroedu:course.*`
- ✅ Test với Claude Desktop local
- ✅ Documentation + installer script

### **Tháng 2-3: Scale AeroEdu tools**
- ✅ Complete 15 tools `aeroedu:*`
- ✅ OAuth login flow + JWT caching
- ✅ Beta release cho 50 GV power-users
- ✅ Telemetry tool usage frequency

### **Tháng 4: Creative tools batch 1**
- ✅ DaVinci Resolve integration (Lua script proxy)
- ✅ ElevenLabs TTS
- ✅ Figma frame export

### **Tháng 5: Creative tools batch 2**
- ✅ CapCut (API hoặc UI automation)
- ✅ Photoshop UXP plugin
- ✅ End-to-end demo workflow

### **Tháng 6: Public launch**
- ✅ Open source MCP hub (MIT license, GitHub)
- ✅ Marketplace listing (Anthropic MCP catalog)
- ✅ Tutorial videos + landing page

---

## 5. USE CASES MẪU

### Use case 1: GV soạn khoá học hoàn chỉnh trong 30 phút
**User nói với Claude:**
> "Tạo khoá Vật lí 11 chương Dòng điện không đổi gồm 5 bài: Định luật Ohm,
> Mạch nối tiếp, Mạch song song, Pin và ắc-quy, Bài tập tổng hợp.
> Mỗi bài thêm 1 video YouTube tốt nhất + 5 quiz từ Question Bank +
> 1 lab challenge analog circuit. Publish luôn."

**MCP tools sequence**:
1. `aeroedu.course.create("Vật lí 11 — Dòng điện không đổi")`
2. `aeroedu.chapter.add("Chương 1")`
3. Lặp 5 lần: `aeroedu.lesson.add` + `aeroedu.block.add_video` + `aeroedu.block.add_quiz` + `aeroedu.block.add_lab`
4. `aeroedu.course.publish`

### Use case 2: Edit video bài giảng + upload
**User**: "Cắt 5 phút đầu của video bài giảng `bai-dao-dong.mp4`, thêm sub
tiếng Việt, color grade ấm rồi upload làm block video cho lesson Dao động"

**Sequence**:
1. `davinci.project.open` + `davinci.clip.import("bai-dao-dong.mp4")`
2. `davinci.timeline.trim(0, 300)` (5 phút)
3. `davinci.color.apply_lut("warm-classroom.cube")`
4. `davinci.timeline.export("/tmp/cut.mp4")`
5. `capcut.subtitle.auto_gen("/tmp/cut.mp4")` → `cut-with-sub.mp4`
6. `aeroedu.block.add_video(lessonId, url)` (upload qua GCS signed URL)

### Use case 3: Sinh ảnh thumbnail + đăng
**User**: "Tạo 5 thumbnail đẹp cho 5 lesson trên Photoshop, mỗi cái có
title bài + icon, export PNG rồi gán làm cover từng lesson"

**Sequence**:
1. `photoshop.psd.open("lesson-thumb-template.psd")`
2. Lặp 5 lần: `photoshop.layer.modify(text: "...")`+ `photoshop.export.png`
3. `aeroedu.lesson.set_thumbnail(lessonId, pngUrl)` × 5

---

## 6. NGÂN SÁCH

| Hạng mục | Chi phí | Ghi chú |
|----------|---------|---------|
| Senior dev fulltime 6 tháng | 540 triệu | 90tr/tháng |
| Server dev API (cho creative tools) | 50 triệu | DigitalOcean droplets |
| API costs (ElevenLabs, Anthropic) | 30 triệu | Test tier |
| Documentation + tutorial videos | 40 triệu | Outsource |
| Marketing launch | 60 triệu | Booth event, Facebook ads |
| **TỔNG** | **720 triệu** | 6 tháng |

**Doanh thu dự kiến (12 tháng sau launch)**:
- 500 GV pro user × 199k/tháng × 12 = **1.2 tỷ**
- Enterprise licensing 5 đơn vị × 50tr/năm = **250 triệu**
- Sponsor (Anthropic Vietnam, GCP) = **150 triệu**
- **Tổng: ~1.6 tỷ — ROI 2.2x trong năm đầu**

---

## 7. RỦI RO + GIẢM THIỂU

| Rủi ro | Mức độ | Giảm thiểu |
|--------|--------|-----------|
| Adobe đổi UXP API breaking | Trung | Version lock + abstract layer |
| CapCut block automation | Cao | Fallback dùng cloud API hoặc Premiere |
| User mất JWT/key | Cao | OS keychain + 2FA refresh flow |
| Anthropic đổi MCP protocol | Trung | Active follow MCP spec changelog |
| Quota Claude rate limit | Trung | Caching tool results + batch ops |

---

## 8. BƯỚC TIẾP THEO NGAY HÔM NAY

1. **Tuần 1**: Setup repo `aeroedu/mcp-hub` GitHub + scaffold Node TS
2. **Tuần 2**: Implement `aeroedu.course.list` + `aeroedu.course.create` (2 tools demo)
3. **Tuần 3**: Internal test với Claude Desktop, 5 GV thử nghiệm
4. **Tuần 4**: Demo cho leadership → quyết định scale
5. Tham khảo: https://modelcontextprotocol.io/docs (Anthropic official)

*Cập nhật lần cuối: 2026-05-22*
