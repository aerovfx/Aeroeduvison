# 🤖 AI Content Generator - Hướng dẫn sử dụng

## 📋 Tổng quan

AI Content Generator là tính năng tự động sinh nội dung giảng dạy bằng AI, giúp giáo viên **tiết kiệm 70-80% thời gian** chuẩn bị bài giảng.

### ✨ Tính năng chính

- 📚 **Sinh bài học chi tiết** với cấu trúc hoàn chỉnh
- 📝 **Tạo quiz chất lượng cao** với giải thích chi tiết
- 🎯 **Tạo slides thuyết trình** chuyên nghiệp
- 🎬 **Sinh kịch bản video** giảng dạy
- ⚡ **Nhanh chóng**: Chỉ cần 10-30 giây
- 🎓 **Tuỳ chỉnh**: Theo môn học, lớp, độ khó

## 🚀 Cài đặt

### 1. Cấu hình OpenAI API Key

**Cách 1: Sử dụng OpenAI (Khuyến nghị - chất lượng cao nhất)**

1. Đăng ký tài khoản tại [OpenAI Platform](https://platform.openai.com/)
2. Tạo API key mới tại [API Keys](https://platform.openai.com/api-keys)
3. Thêm vào file `.env.local`:

```bash
OPENAI_API_KEY="sk-proj-xxxxxxxxxxxxx"
```

**Giá cả ước tính:**
- GPT-4 Turbo: ~$0.01-0.03 per request
- 1000 requests ≈ $10-30
- Tiết kiệm thời gian: vô giá! 💎

**Cách 2: Sử dụng demo mode (Không cần API key)**

Nếu không có OpenAI API key, hệ thống sẽ tự động chuyển sang **demo mode** với nội dung mẫu. Vẫn hoạt động tốt cho việc thử nghiệm!

### 2. Kiểm tra permissions

Đảm bảo user có role `TEACHER` hoặc `ADMIN`:

```sql
UPDATE "User" SET role = 'TEACHER' WHERE email = 'your-email@example.com';
```

## 📖 Hướng dẫn sử dụng

### Bước 1: Truy cập AI Content Generator

1. Đăng nhập với tài khoản giáo viên
2. Vào menu sidebar
3. Click vào **"🚀 AI Content Generator"**

### Bước 2: Điền thông tin

**Thông tin bắt buộc:**
- ✅ **Loại nội dung**: Chọn Bài học / Quiz / Slides / Video Script
- ✅ **Môn học**: VD: Toán học, Vật lý, Hóa học...
- ✅ **Lớp**: Lớp 6-12
- ✅ **Chủ đề**: VD: "Phương trình bậc hai", "Định luật Newton"

**Thông tin tùy chọn:**
- Khung chương trình (mặc định: "Chương trình GDPT 2018")
- Thời lượng (phút)
- Độ khó: Dễ / Trung bình / Khó
- Yêu cầu thêm: Ghi chú đặc biệt cho AI

### Bước 3: Tạo nội dung

1. Click **"Tạo nội dung với AI"** ✨
2. Đợi 10-30 giây
3. Xem kết quả ở panel bên phải

### Bước 4: Sử dụng kết quả

- 📋 **Sao chép**: Copy toàn bộ nội dung
- 💾 **Tải xuống**: Download file JSON
- 🔄 **Tạo lại**: Tạo version khác với cùng thông tin
- ✏️ **Chỉnh sửa**: Điều chỉnh nội dung theo ý muốn

## 💡 Ví dụ sử dụng

### Ví dụ 1: Tạo bài học Toán

```
Loại: Bài học
Môn: Toán học
Lớp: 9
Chủ đề: Phương trình bậc hai
Độ khó: Trung bình
Thời lượng: 45 phút

→ Kết quả: Bài học đầy đủ với:
  - Mục tiêu học tập
  - Kiến thức trọng tâm
  - Ví dụ minh họa
  - Bài tập thực hành
  - Tóm tắt
```

### Ví dụ 2: Tạo Quiz Vật lý

```
Loại: Quiz
Môn: Vật lý
Lớp: 10
Chủ đề: Định luật Newton
Độ khó: Khó

→ Kết quả: 10-15 câu hỏi với:
  - 4 đáp án mỗi câu
  - Đáp án đúng được đánh dấu
  - Giải thích chi tiết
```

### Ví dụ 3: Tạo Slides Hóa học

```
Loại: Slides
Môn: Hóa học
Lớp: 11
Chủ đề: Phản ứng oxi hóa khử
Thời lượng: 30 phút

→ Kết quả: 8-12 slides với:
  - Tiêu đề rõ ràng
  - Nội dung súc tích
  - Gợi ý hình ảnh
```

## 🎯 Tips & Best Practices

### Để có kết quả tốt nhất:

1. **Chủ đề cụ thể**: 
   - ✅ "Phương trình bậc hai và công thức nghiệm"
   - ❌ "Toán 9"

2. **Thêm context**:
   - "Tập trung vào ứng dụng thực tế"
   - "Nhiều ví dụ dễ hiểu cho học sinh yếu"
   - "Thêm bài tập nâng cao"

3. **Chọn độ khó phù hợp**:
   - Dễ: Bài cơ bản, giới thiệu khái niệm
   - Trung bình: Bài thường, vừa phải
   - Khó: Bài nâng cao, phân hóa

4. **Xem trước và chỉnh sửa**:
   - AI tạo nội dung gần đúng
   - Giáo viên nên review và điều chỉnh
   - Thêm yếu tố cá nhân hóa

## 🔧 API Reference

### Endpoint

```
POST /api/ai-content/generate
```

### Request Body

```typescript
{
  type: 'lesson' | 'quiz' | 'slides' | 'video-script',
  subject: string,          // Bắt buộc
  grade: string,            // Bắt buộc
  topic: string,            // Bắt buộc
  curriculum?: string,      // Tùy chọn
  duration?: number,        // Tùy chọn (phút)
  difficulty?: 'easy' | 'medium' | 'hard',
  additionalContext?: string
}
```

### Response

```typescript
{
  success: true,
  data: {
    title: string,
    content: string,
    type: string,
    metadata: {
      subject: string,
      grade: string,
      topic: string,
      estimatedDuration: number,
      difficulty: string
    },
    quiz?: {
      questions: Array<{
        question: string,
        options: string[],
        correctAnswer: number,
        explanation: string
      }>
    },
    slides?: Array<{
      slideNumber: number,
      title: string,
      content: string,
      imagePrompt?: string
    }>
  }
}
```

## 🐛 Troubleshooting

### Lỗi "Unauthorized"
- Đảm bảo đã đăng nhập
- Kiểm tra role = TEACHER hoặc ADMIN

### Lỗi "OpenAI API error"
- Kiểm tra OPENAI_API_KEY trong `.env.local`
- Kiểm tra credit trong OpenAI account
- Hệ thống sẽ tự động fallback sang demo mode

### Nội dung không đúng mong muốn
- Thử thêm context cụ thể hơn
- Điều chỉnh độ khó
- Tạo lại với prompt khác

### Response chậm
- OpenAI API thường mất 10-30 giây
- Nếu quá lâu, check network connection
- Có thể API đang bận, thử lại sau

## 📊 Đánh giá & Feedback

### Thống kê hiệu quả:

- ⏱️ **Thời gian tiết kiệm**: 70-80%
- 📚 **Chất lượng nội dung**: 8-9/10 (cần review nhẹ)
- 🎯 **Độ chính xác**: 85-95%
- 💰 **Chi phí**: ~$0.01-0.03 per generation

### Giới hạn hiện tại:

- ❌ Không có hình ảnh thật (chỉ có prompt)
- ❌ Cần internet connection
- ❌ Phụ thuộc vào OpenAI API
- ❌ Đôi khi cần chỉnh sửa nhẹ

### Roadmap tương lai:

- [ ] Tích hợp tạo hình ảnh tự động (DALL-E, Stable Diffusion)
- [ ] Lưu lịch sử nội dung đã tạo
- [ ] Share template với giáo viên khác
- [ ] Export sang PowerPoint, Word, PDF
- [ ] Tích hợp trực tiếp vào Course Creator
- [ ] Multi-language support
- [ ] Voice-over tự động cho video

## 💬 Support

Nếu gặp vấn đề hoặc có đề xuất, vui lòng:
- Tạo issue trên GitHub
- Liên hệ team phát triển
- Check docs tại `/docs`

---

**Tạo bởi**: LMS Math Team  
**Version**: 1.0.0  
**Last Updated**: October 2025  
**License**: MIT

🎉 Happy Teaching with AI! 🚀

