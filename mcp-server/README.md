# @aeroedu/mcp-hub

> MCP (Model Context Protocol) server cho phép Claude Desktop / Cursor /
> bất kỳ MCP client nào thao tác trực tiếp với **AeroEdu (inphysic.com)**.

**Status**: MVP Tháng 1 — 5 core tools `aeroedu_course_*`
**Roadmap đầy đủ**: xem `docs/mcp-aeroedu-integration-plan.md` ở repo gốc.

---

## 1. 5 tools MVP

| Tool | Mô tả | Endpoint |
|------|-------|----------|
| `aeroedu_course_list` | Liệt kê khoá học của teacher | `GET /api/instructor/courses` |
| `aeroedu_course_create` | Tạo khoá học mới (draft) | `POST /api/instructor/courses` |
| `aeroedu_chapter_add` | Thêm chương vào khoá | `POST /api/instructor/courses/:id/chapters` |
| `aeroedu_lesson_add` | Thêm bài học (video/đọc/quiz/bài tập/lab) | `POST /api/instructor/chapters/:id/lessons` |
| `aeroedu_exam_create` | Tạo đề thi (MCQ / Đ-S 4 mệnh đề / trả lời ngắn / tự luận) | `POST /api/instructor/exams` |

---

## 2. Cài đặt

### Yêu cầu
- Node.js ≥ 18
- Tài khoản teacher hoặc admin trên inphysic.com
- Claude Desktop (https://claude.ai/download)

### Build
```bash
cd mcp-server
npm install
npm run build
```

Sau khi build, file `dist/index.js` sẵn sàng chạy.

### Lấy JWT token

1. Mở https://inphysic.com → đăng nhập tài khoản teacher
2. Mở DevTools (Cmd+Opt+I) → tab **Console**
3. Chạy:
   ```js
   copy(localStorage.getItem('auth_token'))
   ```
4. Token đã được copy vào clipboard (dạng `eyJhbGc...`)

### Config Claude Desktop

Mở file:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Thêm vào `mcpServers`:

```json
{
  "mcpServers": {
    "aeroedu": {
      "command": "node",
      "args": ["/absolute/path/to/aeroedu/mcp-server/dist/index.js"],
      "env": {
        "AEROEDU_JWT": "eyJhbGciOiJIUzI1NiIs...",
        "AEROEDU_API_URL": "https://inphysic.com"
      }
    }
  }
}
```

**Lưu ý:**
- Đổi `/absolute/path/...` thành đường dẫn thực tế trên máy bạn
- `AEROEDU_API_URL` có thể set thành `http://localhost:3000` khi dev local

Restart Claude Desktop.

### Kiểm tra hoạt động

Trong Claude Desktop chat:
```
@aeroedu liệt kê 5 khoá học mới nhất của tôi
```

Hoặc:
```
@aeroedu tạo cho tôi khoá "Vật lí 11 — Dao động cơ" môn physics lớp 11 (draft, miễn phí)
```

Claude sẽ tự chọn tool phù hợp và xin xác nhận trước khi gọi.

---

## 3. Dev locally

```bash
# Watch mode (auto-rebuild khi sửa code)
npm run dev

# Test với MCP Inspector (CLI debug tool của Anthropic)
npx @modelcontextprotocol/inspector node dist/index.js
```

MCP Inspector mở trình duyệt → bạn có thể call từng tool với args tuỳ ý để test.

---

## 4. Use case ví dụ

### A. Soạn nguyên 1 khoá học bằng chat

```
User → Claude Desktop:
  "Tạo khoá 'Hoá 12 — Polymer cơ bản' lớp 12 môn chemistry. Sau đó thêm
   3 chương: 'Polymer là gì?', 'Phản ứng trùng hợp', 'Ứng dụng'. Mỗi
   chương 2 bài video (15 phút mỗi bài). Cuối khoá thêm đề thi 20 câu MCQ."

Claude tự gọi:
  1. aeroedu_course_create({title, subject, grade, …}) → courseId
  2. aeroedu_chapter_add({courseId, title}) × 3 → 3 chapterIds
  3. aeroedu_lesson_add({chapterId, title, type:'video', durationMinutes:15}) × 6
  4. aeroedu_exam_create({title, courseId, durationMinutes:45, questions:[...]})

→ Khoá hoàn chỉnh trên inphysic.com sau ~1 phút.
```

### B. Bulk-import đề thi từ Word/PDF

```
User: "Đây là file đề thi Word [paste content], hãy tạo đề trên AeroEdu."

Claude tự:
  1. Parse câu hỏi từ text
  2. aeroedu_exam_create({title, questions:[...]}) với LaTeX preserved
```

---

## 5. Roadmap

**Tháng 2** — thêm `aeroedu_kg_*` (Knowledge Graph 5 tools): suggest, link,
mastery_update, search, extract_from_doc.

**Tháng 3** — `creative_davinci_*` (5 tools): render video từ script bằng
DaVinci Resolve.

**Tháng 4+** — CapCut auto-edit, Photoshop batch, ElevenLabs TTS multi-voice,
Figma component sync, OAuth device flow thay JWT cứng.

Chi tiết: `docs/mcp-aeroedu-integration-plan.md` (30 tools / 5 namespaces).

---

## 6. Security notes

- **JWT cứng trong env**: chỉ phù hợp cho 1 user / 1 máy. Tháng 4 chuyển
  sang OAuth device flow.
- **stdio transport**: chỉ Claude Desktop local kết nối được. Cloud Run
  remote-MCP qua HTTP/SSE planning Tháng 5.
- **Rate limit**: chưa có. Khi mở public, sẽ thêm bucket 100 req/phút/user.
- **Audit log**: chưa ghi. Tháng 3 sẽ ghi mọi tool call vào `mcp_audit_log`
  table trên Neon Postgres.

---

## 7. Troubleshooting

### "AEROEDU_JWT chưa được thiết lập"
→ Env var không set. Check lại file `claude_desktop_config.json`.

### "HTTP 401: Unauthorized"
→ JWT hết hạn. Login lại, copy token mới, update config.

### Claude Desktop không thấy tools
→ Restart Claude Desktop. Check log:
  - macOS: `~/Library/Logs/Claude/mcp*.log`

### "Cannot find module '@modelcontextprotocol/sdk'"
→ Chưa chạy `npm install` trong `mcp-server/`.

---

## 8. License

MIT © AeroEduVision (inphysic.com)
