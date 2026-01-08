# Module Số Hoá Tài Liệu - Document Digitization Module

## 📋 Tổng Quan

Module **Số hoá tài liệu** là module đầu tiên trong hệ thống **Khảo thí** (Examination System), cho phép giáo viên upload và số hoá tài liệu (PDF, ảnh) với AI để tạo nền tảng cho các module khác như Ma trận đề, Ngân hàng câu hỏi, và Đề thi.

## 🎯 Tính Năng Chính

### 1. Upload Documents
- **Drag & Drop**: Kéo thả file vào vùng upload
- **File Picker**: Click để chọn file từ máy
- **Multiple Files**: Upload nhiều file cùng lúc
- **File Types**: PDF, JPG, PNG
- **Size Limit**: 50MB/file
- **Group Files**: Nhóm nhiều file thành một thư mục

### 2. Document Management
- **Status Filtering**: 
  - Tất cả
  - Hàng đợi
  - Đang xử lý
  - Hoàn tất
  - Lỗi
- **Search**: Tìm kiếm theo tên tài liệu
- **Breadcrumbs**: Điều hướng theo thư mục (e.g., "SGK toán 9 > Chương 5 > Bài 17")
- **Table View**: Hiển thị danh sách với đầy đủ thông tin

### 3. Document Review
- **Side-by-Side Comparison**: So sánh bản gốc và bản số hoá
- **PDF Viewer**: Xem PDF trực tiếp trong browser
- **Image Viewer**: Xem ảnh với zoom
- **OCR Text Display**: Hiển thị text đã trích xuất
- **Download**: Tải bản số hoá về máy

### 4. AI Processing
- **OCR**: Trích xuất text từ PDF và ảnh
- **Document Structure**: Nhận diện cấu trúc (headings, paragraphs, tables)
- **Content Analysis**: Phân tích nội dung để tạo metadata

## 🗄️ Database Schema

### DocumentFolder
```prisma
model DocumentFolder {
  id          String     @id
  name        String
  parentId    String?    // For nested folders
  userId      String
  path        String     // Full path
  documents   Document[]
  ...
}
```

### Document
```prisma
model Document {
  id            String
  name          String      // Original filename
  displayName   String      // Display name
  type          String      // "VĂN BẢN", "THƯ MỤC", "PDF", "IMAGE"
  originalUrl   String      // URL to original file
  digitizedUrl  String?     // URL to digitized file
  status        String      // "Hàng đợi", "Đang xử lý", "Hoàn tất", "Lỗi"
  ocrText       String?     // Extracted text
  executionTime Int?        // Processing time in seconds
  ...
}
```

### DocumentProcessingLog
```prisma
model DocumentProcessingLog {
  id          String
  documentId  String
  stage       String      // "upload", "ocr", "processing", "completed", "error"
  message     String?
  ...
}
```

## 📁 Cấu Trúc Files

```
app/(dashboard)/(routes)/teacher/document-digitization/
  ├── page.tsx                    # Main page với table và filters
  └── [id]/
      └── review/
          └── page.tsx            # Review page (original vs digitized)

components/document-digitization/
  └── upload-modal.tsx            # Upload modal với drag & drop

app/api/documents/
  ├── route.ts                    # GET /api/documents (list)
  ├── upload/
  │   └── route.ts                # POST /api/documents/upload
  └── [id]/
      └── route.ts                # GET/DELETE /api/documents/[id]
```

## 🔌 API Endpoints

### GET /api/documents
List documents with filters:
- `?status=Hàng đợi` - Filter by status
- `?path=SGK toán 9/Chương 5` - Filter by folder path

### POST /api/documents/upload
Upload documents:
- `Content-Type: multipart/form-data`
- `files: File[]` - Array of files

### GET /api/documents/[id]
Get document details with processing logs

### DELETE /api/documents/[id]
Delete document

## 🎨 UI Components

### Main Page Features
- **Status Tabs**: Filter documents by processing status
- **Search Bar**: Real-time search
- **Action Buttons**: "Thư mục" và "Số hoá"
- **Table**: 
  - Checkbox for selection
  - Document name with icon
  - Type badge
  - Timestamps
  - Status with icon and badge
  - Action buttons (View, Edit, Delete)

### Upload Modal
- **Left Panel**: 
  - File picker button
  - Group button
  - Drag & drop zone
  - File list with preview
  - Upload button
- **Right Panel**:
  - Instructions
  - Supported formats
  - Size limits

### Review Page
- **Left Panel**: Original document (PDF/Image viewer)
- **Right Panel**: Digitized version with OCR text
- **Footer**: Timestamps and download button

## 🚀 Next Steps

1. **OCR Integration**: 
   - Integrate PaddleOCR hoặc Google Gemini Vision
   - Queue system for async processing
   - Progress tracking

2. **Folder Management**:
   - Create/edit/delete folders
   - Nested folder structure
   - Breadcrumb navigation

3. **Batch Operations**:
   - Select multiple documents
   - Bulk delete
   - Bulk processing

4. **Advanced Features**:
   - Document preview thumbnails
   - Page navigation for multi-page PDFs
   - Text editing after OCR
   - Export options (PDF, DOCX, TXT)

## 📝 Notes

- Files are stored locally in `uploads/documents/{userId}/` (development)
- In production, should use S3/GCS for storage
- OCR processing should be queued (BullMQ or similar)
- Status updates via WebSocket or polling
