# Teacher LaTeX Export Module

## Overview
Module dành cho giáo viên để lưu trữ và xuất các đề thi đã tạo từ ma trận sang định dạng LaTeX.

## Features

### 1. Export from Exam Matrix
- **Location**: `/teacher/exam-matrix/[id]`
- **Feature**: Button "Xuất LaTeX" trong trang chi tiết ma trận
- **Requirements**: Ma trận phải có status "Hoàn tất"
- **Flow**:
  1. Giáo viên xem chi tiết ma trận đã hoàn tất
  2. Nhấn nút "Xuất LaTeX" 
  3. Hệ thống tự động tạo LaTeX project từ các câu hỏi đã chọn trong ma trận
  4. Redirect đến trang chỉnh sửa LaTeX để xem và tùy chỉnh

### 2. LaTeX Document Management
- **Location**: `/teacher/latex-documents`
- **Features**:
  - Danh sách tất cả tài liệu LaTeX
  - Tạo tài liệu mới
  - Chỉnh sửa, xóa tài liệu
  - Tìm kiếm theo tiêu đề
  - Thống kê: tổng tài liệu, cập nhật tuần này, tài liệu cũ

### 3. LaTeX Editor
- **Location**: `/teacher/latex-documents/[id]`
- **Features**:
  - Soạn thảo LaTeX với syntax highlighting
  - Xem trước PDF real-time
  - Biên dịch LaTeX sang PDF
  - Tải xuống PDF
  - In PDF
  - Lịch sử phiên bản
  - Chia sẻ với cộng tác viên (VIEW/EDIT)
  - Auto-save (2.5s debounce)
  - Templates có sẵn

## API Endpoints

### Export from Matrix
```
POST /api/latex-projects/export-from-matrix
Body: { matrixId: string }
Response: { id: string, title: string, createdAt: string }
```

### Export from Exam (for future use)
```
POST /api/latex-projects/export-from-exam
Body: { examId: string }
Response: { id: string, title: string, createdAt: string }
```

### LaTeX Projects CRUD
```
GET    /api/latex-projects              - List projects
POST   /api/latex-projects              - Create project
GET    /api/latex-projects/[id]         - Get project details
PUT    /api/latex-projects/[id]         - Update project
DELETE /api/latex-projects/[id]         - Delete project
```

### Versions & Collaboration
```
GET    /api/latex-projects/[id]/versions           - Get version history
POST   /api/latex-projects/[id]/versions/restore   - Restore version
GET    /api/latex-projects/[id]/collaborators      - Get collaborators
POST   /api/latex-projects/[id]/collaborators      - Add collaborator
DELETE /api/latex-projects/[id]/collaborators/[id] - Remove collaborator
```

### Compile
```
POST /api/latex-projects/compile - Compile LaTeX to PDF
```

## Database Schema

### LatexProject
```prisma
model LatexProject {
  id            String
  userId        String
  title         String
  mainContent   String
  folderId      String?
  extraFiles    Json?
  createdAt     DateTime
  updatedAt     DateTime
  User          User
  folder        DocumentFolder?
  versions      LatexProjectVersion[]
  collaborators LatexProjectCollaborator[]
}
```

### LatexProjectVersion
```prisma
model LatexProjectVersion {
  id            String
  projectId     String
  mainContent   String
  titleSnapshot String?
  trigger       String  // "save" | "compile"
  createdAt     DateTime
  LatexProject  LatexProject
}
```

### LatexProjectCollaborator
```prisma
model LatexProjectCollaborator {
  id           String
  projectId    String
  userId       String
  role         String  // "VIEW" | "EDIT"
  createdAt    DateTime
  LatexProject LatexProject
  User         User
}
```

## Usage Example

### From Exam Matrix
1. Truy cập `/teacher/exam-matrix/[id]` với ma trận đã hoàn tất
2. Nhấn "Xuất LaTeX" 
3. Chờ hệ thống xử lý và redirect
4. Chỉnh sửa nội dung LaTeX nếu cần
5. Biên dịch sang PDF
6. Tải xuống hoặc in

### From LaTeX Documents List
1. Truy cập `/teacher/latex-documents`
2. Xem danh sách tài liệu đã có
3. Tạo mới hoặc chỉnh sửa tài liệu hiện có
4. Sử dụng editor để soạn thảo

## Technical Stack
- **Frontend**: Next.js 14, React, TypeScript
- **UI Components**: shadcn/ui
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **LaTeX Compilation**: Docker TeX Live (via API)

## Future Enhancements
- [ ] Export from Exam detail page (when exam detail page is created)
- [ ] Batch export multiple matrices/exams
- [ ] Template customization
- [ ] Export to Word format
- [ ] Version comparison
- [ ] Comment/annotation system
- [ ] Integration with question bank for auto-update

## Files Modified/Created
- `/app/(dashboard)/(routes)/teacher/exam-matrix/[id]/page.tsx` - Added export button
- `/app/(dashboard)/(routes)/teacher/latex-documents/page.tsx` - List page (existing)
- `/app/(dashboard)/(routes)/teacher/latex-documents/[id]/page.tsx` - Editor page (existing)
- `/app/api/latex-projects/export-from-matrix/route.ts` - Export API (existing)
- `/app/api/latex-projects/export-from-exam/route.ts` - Export from exam API (existing)

## Notes
- Module yêu cầu Docker TeX Live để biên dịch PDF
- Auto-save được debounce 2.5 giây để tránh request quá nhiều
- Version history được tạo khi save và compile
- Chia sẻ cộng tác viên chỉ dành cho chủ sở hữu tài liệu
