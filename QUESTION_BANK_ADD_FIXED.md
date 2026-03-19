# Thêm Câu Hỏi Thủ Công - Quick Guide

## ✅ Fixed: Add Question Page

### URLs hoạt động:
- ✅ `/teacher/question-bank/add` - Redirects to create page
- ✅ `/teacher/question-bank/create` - Create page chính
- ✅ `/teacher/question-bank/list` - Danh sách câu hỏi (có nút "Thêm câu hỏi")
- ✅ `/teacher/question-bank` - Trang chính (có nút "Thêm câu hỏi")

### Cách truy cập:

#### Cách 1: Từ menu
```
http://localhost:3000/teacher/question-bank
→ Click "Thêm câu hỏi" trong "Thao tác nhanh"
→ http://localhost:3000/teacher/question-bank/add
```

#### Cách 2: Từ danh sách
```
http://localhost:3000/teacher/question-bank/list
→ Click nút "Thêm câu hỏi" (header)
→ http://localhost:3000/teacher/question-bank/add
```

#### Cách 3: Trực tiếp
```
http://localhost:3000/teacher/question-bank/add
→ Tự động redirect đến /teacher/question-bank/create
```

## 📝 Form tạo câu hỏi

### Thông tin cơ bản (bắt buộc):
- ✅ Nội dung câu hỏi
- ✅ Loại câu hỏi (MCQ, True/False, Short Answer, Essay)
- ✅ Môn học (Toán, Lý, Hóa, Văn, Anh, ...)
- ✅ Khối lớp (6-12)

### Thông tin tùy chọn:
- ⭕ Độ khó (Dễ/Trung bình/Khó)
- ⭕ Mức độ nhận thức (Biết/Hiểu/Vận dụng/...)
- ⭕ Chủ đề
- ⭕ Giải thích chi tiết

### Phương án trả lời:
**Với MCQ (Nhiều lựa chọn):**
- Nhập 4 phương án A, B, C, D (hoặc thêm nhiều hơn)
- Chọn đáp án đúng từ dropdown

**Với True/False (Đúng/Sai):**
- Chọn Đúng hoặc Sai

**Với Short Answer/Essay:**
- Nhập đáp án mẫu
- Có thể dùng "Gen đáp án AI" để tạo tự động

### Từ khóa & Mục tiêu:
- Thêm từ khóa để dễ tìm kiếm
- Thêm mục tiêu học tập

## 🎯 Luồng tạo câu hỏi

```
1. Truy cập /teacher/question-bank/add
   ↓
2. Nhập nội dung câu hỏi
   ↓
3. Chọn loại câu hỏi
   ↓
4. Chọn môn và khối
   ↓
5. Nhập phương án (nếu MCQ/True/False)
   ↓
6. Chọn đáp án đúng
   ↓
7. Nhập giải thích (optional)
   ↓
8. Thêm từ khóa (optional)
   ↓
9. Click "Tạo câu hỏi"
   ↓
10. Redirect về danh sách
```

## ✨ Tính năng AI

### Generate Answer (Đáp án AI)
- **Áp dụng**: Câu hỏi Tự luận, Trả lời ngắn
- **Cách dùng**: Click "Gen đáp án AI"
- **Yêu cầu**: Đã nhập nội dung câu hỏi
- **Kết quả**: AI đề xuất đáp án mẫu

## 🎨 UI Components

### Glass Card Design
- Bo tròn, shadow mềm mại
- Gradient backgrounds
- Hover effects

### Form Elements
- **AI Native Input**: Rounded-xl, focus rings
- **Select**: Custom styling với theme
- **Textarea**: Auto-resize
- **Buttons**: Gradient purple

## 📋 Validation

### BẮT BUỘC:
- ✅ Nội dung > 0 ký tự
- ✅ Loại câu hỏi
- ✅ Môn học
- ✅ Khối lớp
- ✅ Đáp án đúng (với MCQ/True/False)

### ĐIỀU KIỆN:
- MCQ: Cần ≥ 2 phương án
- True/False: Phải chọn Đúng/Sai

## 🔄 Redirect Map

```
/teacher/question-bank/add
  → /teacher/question-bank/create (redirect)

/teacher/question-bank/create
  → Form tạo câu hỏi

Sau khi tạo thành công:
  → /teacher/question-bank (trang chính)
  → /teacher/question-bank/list (danh sách)
```

## 📁 Files

```
app/(dashboard)/(routes)/teacher/question-bank/
├── add/page.tsx          # Redirect page → /create
├── create/page.tsx       # Create form (760 lines)
├── edit/[id]/page.tsx    # Edit form
├── list/page.tsx         # Question list
└── page.tsx              # Main page (2-column layout)

components/question-bank/
├── import-modal.tsx      # Import from Excel/Word
└── bulk-generate-modal.tsx # AI bulk generation
```

## 🐛 Bug Fixes

### Fixed:
- ✅ `/add` route now works (redirects to `/create`)
- ✅ All buttons link correctly
- ✅ Form validation complete
- ✅ AI Generate Answer working
- ✅ Redirects after create/edit

## 💡 Tips

1. **Sử dụng AI**: Click "Gen đáp án AI" cho câu tự luận
2. **Thêm nhiều phương án**: Có thể thêm > 4 options cho MCQ
3. **Từ khóa**: Thêm 3-5 từ khóa để dễ search sau này
4. **Giải thích**: Nên nhập để học sinh hiểu khi ôn tập
5. **Độ khó**: Chọn phù hợp với đối tượng học sinh

## 🔗 Quick Links

- **Add**: http://localhost:3000/teacher/question-bank/add
- **List**: http://localhost:3000/teacher/question-bank/list
- **Main**: http://localhost:3000/teacher/question-bank
- **Import**: Click "Import từ file" trong Quick Actions
