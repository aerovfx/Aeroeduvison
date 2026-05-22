# @aeroedu/mcp-hub

> MCP (Model Context Protocol) server cho phép Claude Desktop / Cursor /
> bất kỳ MCP client nào thao tác trực tiếp với **AeroEdu (inphysic.com)**.

**Version**: v0.2.0 — 10 tools / 2 namespaces
**SDK**: @modelcontextprotocol/sdk v1.x (McpServer + registerTool API)
**Roadmap**: `docs/mcp-aeroedu-integration-plan.md`

---

## 1. 10 Tools

### Namespace `aeroedu_course_*` — Quản lý khoá học

| Tool | Mô tả | Read-only |
|------|-------|-----------|
| `aeroedu_course_list` | Liệt kê khoá học (filter + pagination) | ✓ |
| `aeroedu_course_create` | Tạo khoá học mới (draft) | — |
| `aeroedu_chapter_add` | Thêm chương vào khoá | — |
| `aeroedu_lesson_add` | Thêm bài học (video/đọc/quiz/bài tập/lab) | — |
| `aeroedu_exam_create` | Tạo đề thi (MCQ / Đ-S 4 mệnh đề / ngắn / tự luận + LaTeX) | — |

### Namespace `aeroedu_kg_*` — Knowledge Graph

| Tool | Mô tả | Read-only |
|------|-------|-----------|
| `aeroedu_kg_search` | Tìm kiếm ngữ nghĩa (AI, NL query, filter môn/lớp) | ✓ |
| `aeroedu_kg_node_detail` | Xem chi tiết node + tài liệu + mastery stats | ✓ |
| `aeroedu_kg_path_find` | Tìm lộ trình học tập A→B (BFS + thời gian ước tính) | ✓ |
| `aeroedu_kg_record_visit` | Ghi nhận HS đã học node → cập nhật mastery | — |
| `aeroedu_kg_extract` | Trích xuất KG từ văn bản/tài liệu (AI-powered) | — |

---

## 2. Cài đặt & Config

### Yêu cầu
- Node.js ≥ 18
- Tài khoản teacher/admin trên inphysic.com
- Claude Desktop (https://claude.ai/download)

### Build
```bash
cd mcp-server
npm install
npm run build
# → dist/index.js ready
```

### Lấy JWT token
```js
// Trong DevTools Console tại https://inphysic.com (đã đăng nhập teacher):
copy(localStorage.getItem('auth_token'))
```

### Config Claude Desktop
`~/Library/Application Support/Claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "aeroedu": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server/dist/index.js"],
      "env": {
        "AEROEDU_JWT": "eyJhbGciOiJIUzI1NiIs...",
        "AEROEDU_API_URL": "https://inphysic.com"
      }
    }
  }
}
```

Restart Claude Desktop → chat `@aeroedu liệt kê khoá học của tôi`.

### Dev mode
```bash
npm run dev   # tsx watch — auto-reload khi sửa src/
```

### Test với MCP Inspector
```bash
npx @modelcontextprotocol/inspector node dist/index.js
# → mở browser, call từng tool với args bất kỳ
```

---

## 3. Audit Log

Mọi tool call được ghi vào `~/.aeroedu-mcp/audit-YYYY-MM-DD.jsonl`:
```json
{"ts":"2026-05-22T07:12:00Z","tool":"http.get","args":"/api/instructor/courses","ok":true,"ms":142}
```
- 1 file / ngày (tự rotate)
- Sensitive values (token, password, key) bị redact tự động
- Phase 2: sync lên backend `POST /api/mcp/audit`

---

## 4. Use Cases

### A. Soạn khoá học từ A-Z bằng chat
```
"Tạo khoá Hoá 12 — Polymer cơ bản, 3 chương, mỗi chương 2 bài video 15p,
 cuối khoá thêm đề thi 20 câu MCQ."

→ Claude tự gọi:
  1. aeroedu_course_create → courseId
  2. aeroedu_chapter_add × 3 → 3 chapterIds
  3. aeroedu_lesson_add × 6 (type='video', durationMinutes=15)
  4. aeroedu_exam_create (20 MCQ)
→ Khoá hoàn chỉnh trong ~1 phút.
```

### B. Tìm lộ trình học tập
```
"Học sinh biết đại số cơ bản, muốn học đến Tích phân lớp 12. Tìm lộ trình."

→ Claude:
  1. aeroedu_kg_search("đại số cơ bản") → node A id
  2. aeroedu_kg_search("tích phân lớp 12") → node B id
  3. aeroedu_kg_path_find(from=A, to=B) → path 8 bước, ước tính 24h
```

### C. Mở rộng Knowledge Graph từ sách giáo khoa
```
"Đây là bài Sóng cơ học SGK Vật lí 11 [paste nội dung]. Trích xuất KG."

→ Claude:
  1. aeroedu_kg_extract(text, subject='physics', grade=11, auto_add=false)
  → preview 12 node mới
  2. (User confirm) aeroedu_kg_extract(..., auto_add=true)
  → thêm 12 node vào KG
```

---

## 5. Kiến trúc kỹ thuật

```
src/
  index.ts              McpServer (SDK v1.x) + StdioTransport
  lib/
    api-client.ts       AeroEduApiClient (undici, JWT auth, actionable errors)
    audit.ts            JSONL audit log (local file, daily rotation)
  tools/
    course.ts           5 course/exam tools với registerTool + annotations
    kg.ts               5 KG tools với structuredContent responses
```

**Annotations per tool** (theo MCP best practices):
- `readOnlyHint: true` cho list/search/detail tools
- `destructiveHint: false` cho tất cả (không xoá dữ liệu)
- `idempotentHint: true` cho GET operations
- `openWorldHint: false` (data bounded trong AeroEdu)

**Response format**: mỗi tool trả về cả `content[text]` lẫn `structuredContent`
→ clients cũ xài text, clients mới (Claude Desktop v2+) xài structured data.

---

## 6. Roadmap

| Giai đoạn | Tools | Status |
|-----------|-------|--------|
| Tháng 1 | 5 course tools | ✅ Done |
| Tháng 2 | +5 KG tools, audit log | ✅ Done |
| Tháng 3 | +5 creative tools (DaVinci script-to-video) | ⏳ |
| Tháng 4 | OAuth device flow, HTTP/SSE transport | ⏳ |
| Tháng 5 | CapCut, Photoshop, ElevenLabs tools | ⏳ |
| Tháng 6 | Public npm package, rate limit, admin dashboard | ⏳ |

---

## 7. Security

- **JWT scope**: 1 user / 1 machine. OAuth device flow sẽ thay thế ở Tháng 4.
- **stdio transport**: chỉ Claude Desktop local kết nối được (không expose ra internet).
- **Input sanitization**: Zod validates all inputs trước khi gọi API.
- **Audit redaction**: token/password/key fields bị redact trước khi ghi log.
- **Rate limiting**: chưa có (planned Tháng 6 khi public).

---

## 8. Troubleshooting

| Lỗi | Nguyên nhân | Giải pháp |
|-----|------------|-----------|
| `AEROEDU_JWT chưa thiết lập` | Env var missing | Xem mục "Lấy JWT" ở trên |
| `[HTTP 401]` | JWT hết hạn | Login lại, copy token mới |
| `[HTTP 403]` | Không đủ quyền | Dùng tài khoản teacher hoặc admin |
| `[HTTP 404]` | ID không tồn tại | Kiểm tra lại courseId/chapterId/nodeId |
| Claude không thấy tools | Server chưa khởi động | Restart Claude Desktop |
| Lỗi TypeScript | SDK incompatible | `npm install @modelcontextprotocol/sdk@latest` |

---

## 9. License

MIT © AeroEduVision (inphysic.com)
