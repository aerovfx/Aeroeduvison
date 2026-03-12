# Đánh giá thực hiện lộ trình LaTeX (Overleaf-like)

Đánh giá mức độ hoàn thành các giai đoạn theo kế hoạch ứng dụng LaTeX kiểu Overleaf vào Aeroeduvison.

---

## Giai đoạn 1: Model + API CRUD + trang list + editor (Monaco) + template cơ bản — không compile

| Hạng mục | Kế hoạch | Thực hiện | Đánh giá |
|----------|-----------|-----------|----------|
| **Data model** | LatexProject (id, userId, title, mainContent, folderId, extraFiles) | Model trong `prisma/schema.prisma`, quan hệ User + DocumentFolder, đã migrate (db push) | **Hoàn thành** |
| **API CRUD** | POST/GET/PUT/DELETE cho latex-projects | `GET/POST /api/latex-projects`, `GET/PUT/DELETE /api/latex-projects/[id]`, kiểm tra session và quyền sở hữu | **Hoàn thành** |
| **Trang danh sách** | /teacher/latex-documents, list + tạo mới + mở + xóa | Trang list, tìm kiếm, nút Tạo tài liệu mới, Mở, Xóa, EmptyState | **Hoàn thành** |
| **Trang editor** | Monaco, mainContent, auto-save, toolbar | `/teacher/latex-documents/[id]`, Monaco (dynamic import), auto-save debounce 2.5s, Lưu, tên tài liệu chỉnh được | **Hoàn thành** |
| **Template cơ bản** | Article Việt + Đề thi trắc nghiệm | `lib/latex-templates.ts`: "Article cơ bản (Tiếng Việt)", "Đề thi trắc nghiệm" (4 lựa chọn A–D) | **Hoàn thành** |
| **Không compile** | Giai đoạn 1 không có biên dịch PDF | Nút Biên dịch đã có nhưng giai đoạn 1 chỉ cần editor + lưu; compile thuộc giai đoạn 2 | **Đạt** |

**Kết luận Giai đoạn 1:** **100%** — Đủ model, API, list, editor (Monaco), 2 template; không yêu cầu compile trong giai đoạn này.

---

## Giai đoạn 2: Service compile (Docker/API) + API compile + preview PDF + download + báo lỗi

| Hạng mục | Kế hoạch | Thực hiện | Đánh giá |
|----------|-----------|-----------|----------|
| **Dịch vụ biên dịch** | Docker TeX Live (xelatex) hoặc API ngoài | `lib/latex-compile.ts`: Docker `texlive/texlive:latest`, xelatex, thư mục tạm, timeout 90s, cleanup | **Hoàn thành** |
| **API compile** | POST /api/latex-projects/compile, projectId hoặc content | Route có xác thực, lấy nội dung từ DB hoặc body, giới hạn 500KB, trả PDF binary hoặc JSON lỗi (503/422) | **Hoàn thành** |
| **Preview PDF** | Hiển thị PDF trong app (iframe hoặc viewer) | Layout chia đôi: trái editor, phải panel PDF; iframe blob URL khi biên dịch thành công | **Hoàn thành** |
| **Download** | Nút tải PDF | Nút "Tải xuống" trong thanh công cụ panel PDF, download với tên tài liệu | **Hoàn thành** |
| **Báo lỗi** | Hiển thị lỗi biên dịch (log) | Toast khi 503/422, state compileError (log), API trả error + code + log | **Hoàn thành** |

**Kết luận Giai đoạn 2:** **100%** — Đủ service compile (Docker), API compile, preview trong panel, download, và báo lỗi. Điều kiện vận hành (Docker + image TeX Live) được ghi trong tài liệu kiến trúc.

---

## Giai đoạn 3: Template "Hướng dẫn giải" chuẩn + tích hợp sidebar/luồng GV + (optional) đa file

| Hạng mục | Kế hoạch | Thực hiện | Đánh giá |
|----------|-----------|-----------|----------|
| **Template Hướng dẫn giải** | Cấu trúc article, babel vietnamese, Phần I/II/III | Template "Hướng dẫn giải đề Vật lý" trong `latex-templates.ts`: Ghi chú, Đáp án tóm tắt, Phần I (trắc nghiệm), II (đúng/sai), III (bài toán) | **Hoàn thành** |
| **Tích hợp sidebar** | Mục Soạn LaTeX / Tài liệu LaTeX → /teacher/latex-documents | Sidebar teacher: "Soạn LaTeX" với icon FileEdit, href `/teacher/latex-documents` | **Hoàn thành** |
| **Luồng GV** | GV vào từ sidebar, tạo/sửa tài liệu LaTeX | Một luồng rõ: Danh sách → Tạo mới / Mở → Editor + PDF preview | **Hoàn thành** |
| **Đa file (optional)** | extraFiles, preamble.tex, v.v. | Schema có `extraFiles` Json; API đọc/ghi được; **chưa có UI** thêm file phụ hay chọn file khi biên dịch | **Chưa thực hiện** (optional) |

**Kết luận Giai đoạn 3:** **Khoảng 95%** — Template hướng dẫn giải và tích hợp sidebar/luồng GV đạt đủ; phần optional đa file chưa có giao diện (chỉ có nền tảng schema/API).

---

## Giai đoạn 4 (optional): Version history, collaboration, xuất .tex từ đề/ma trận

| Hạng mục | Kế hoạch | Thực hiện | Đánh giá |
|----------|-----------|-----------|----------|
| **Version history** | Snapshot mainContent mỗi lần Save/Compile, xem/khôi phục | Không có bảng version, không lưu lịch sử phiên bản | **Chưa thực hiện** |
| **Collaboration** | Real-time nhiều user (OT/CRDT, WebSocket) | Không có | **Chưa thực hiện** |
| **Xuất .tex từ đề/ma trận** | Từ đề thi/ma trận sinh sẵn .tex, mở trong editor | Không có API hay nút "Xuất LaTeX" từ exam-matrix / question-bank | **Chưa thực hiện** |

**Kết luận Giai đoạn 4:** **0%** — Toàn bộ giai đoạn 4 là optional và chưa được triển khai, đúng với kế hoạch “tùy chọn”.

---

## Tổng hợp

| Giai đoạn | Mức hoàn thành | Ghi chú |
|-----------|----------------|--------|
| **1** | 100% | Đủ theo kế hoạch. |
| **2** | 100% | Đủ; cần Docker + TeX Live để chạy biên dịch. |
| **3** | ~95% | Thiếu phần optional đa file (UI). |
| **4** | 0% | Optional, chưa làm. |

**Điểm mạnh:** Model và API nhất quán, editor + preview PDF dùng được ngay, ba template (article, đề thi, hướng dẫn giải) đủ cho giáo viên, biên dịch cách ly qua Docker, bảo mật và giới hạn đầu vào rõ ràng.

**Đề xuất bước tiếp (nếu mở rộng):**
- **Giai đoạn 3:** Thêm UI quản lý file phụ (extraFiles) và gửi kèm khi compile nếu cần.
- **Giai đoạn 4:** Ưu tiên version history (bảng snapshot + nút “Khôi phục”); collaboration và xuất .tex từ đề/ma trận có thể làm sau khi có nhu cầu rõ ràng.
