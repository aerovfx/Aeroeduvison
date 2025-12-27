# 🧪 Quiz Quality Test Guide

## 🎯 Test các câu hỏi AI đã được cải thiện

Hãy test các câu hỏi AI mới để xem sự khác biệt về chất lượng!

---

## 🚀 Test Scenarios

### **Test 1: Toán học - Phương trình bậc hai**
```
1. Truy cập: http://localhost:3001/teacher/ai-content-generator
2. Chọn:
   - Môn học: Toán học
   - Lớp: 10
   - Chủ đề: "Phương trình bậc hai"
   - Loại: Quiz
   - AI Model: Demo Mode (để test nhanh)
3. Click "Tạo nội dung với AI"
4. Expected: 3 câu hỏi cụ thể về phương trình bậc hai
```

**Expected Questions:**
```
Q1: Phương trình bậc hai có dạng tổng quát là gì?
A. ax² + bx + c = 0 (a ≠ 0) ✅
B. ax + b = 0
C. ax³ + bx² + cx + d = 0
D. a/x + b = 0

Q2: Nghiệm của phương trình x² - 5x + 6 = 0 là:
A. x = 2 và x = 3 ✅
B. x = 1 và x = 6
C. x = -2 và x = -3
D. x = 0 và x = 5

Q3: Điều kiện để phương trình bậc hai có nghiệm kép là:
A. Δ = 0 ✅
B. Δ > 0
C. Δ < 0
D. a = 0
```

### **Test 2: Vật lý - Định luật Newton**
```
1. Chọn:
   - Môn học: Vật lý
   - Lớp: 10
   - Chủ đề: "Định luật Newton"
   - Loại: Quiz
   - AI Model: Demo Mode
2. Tạo nội dung
3. Expected: 3 câu hỏi về định luật Newton
```

**Expected Questions:**
```
Q1: Định luật I Newton (định luật quán tính) phát biểu:
A. Một vật sẽ giữ nguyên trạng thái đứng yên hoặc chuyển động thẳng đều nếu không có lực nào tác dụng ✅
B. Gia tốc của vật tỉ lệ thuận với lực tác dụng
C. Mọi lực tác dụng đều có phản lực
D. Lực hấp dẫn tỉ lệ nghịch với bình phương khoảng cách

Q2: Khi một chiếc xe đang chạy đột ngột phanh gấp, hành khách bị ngã về phía trước do:
A. Quán tính ✅
B. Lực ma sát
C. Trọng lực
D. Lực đẩy

Q3: Công thức của định luật II Newton là:
A. F = ma ✅
B. F = mv
C. F = mgh
D. F = mv²/r
```

### **Test 3: Toán học - Hàm số**
```
1. Chọn:
   - Môn học: Toán học
   - Lớp: 10
   - Chủ đề: "Hàm số"
   - Loại: Quiz
   - AI Model: Demo Mode
2. Tạo nội dung
3. Expected: 2 câu hỏi về hàm số
```

### **Test 4: Vật lý - Điện học**
```
1. Chọn:
   - Môn học: Vật lý
   - Lớp: 11
   - Chủ đề: "Điện học"
   - Loại: Quiz
   - AI Model: Demo Mode
2. Tạo nội dung
3. Expected: 1 câu hỏi về điện học
```

### **Test 5: Hóa học - Phản ứng**
```
1. Chọn:
   - Môn học: Hóa học
   - Lớp: 10
   - Chủ đề: "Phản ứng hóa học"
   - Loại: Quiz
   - AI Model: Demo Mode
2. Tạo nội dung
3. Expected: 1 câu hỏi về phản ứng hóa học
```

### **Test 6: Generic Topic**
```
1. Chọn:
   - Môn học: Sinh học
   - Lớp: 10
   - Chủ đề: "Photosynthesis"
   - Loại: Quiz
   - AI Model: Demo Mode
2. Tạo nội dung
3. Expected: 2 câu hỏi generic nhưng có ý nghĩa
```

---

## 🎊 Expected Improvements

### **Before Fix (Generic)**
```
❌ "Câu hỏi 1 về Định luật I Newton: Khái niệm cơ bản là gì?"
❌ "A. Đáp án đúng về khái niệm cơ bản"
❌ "B. Đáp án sai 1"
❌ "C. Đáp án sai 2"
❌ "D. Đáp án sai 3"
❌ "💡 Giải thích: Đáp án A đúng vì..."
```

### **After Fix (Specific)**
```
✅ "Định luật I Newton (định luật quán tính) phát biểu:"
✅ "A. Một vật sẽ giữ nguyên trạng thái đứng yên hoặc chuyển động thẳng đều nếu không có lực nào tác dụng"
✅ "B. Gia tốc của vật tỉ lệ thuận với lực tác dụng"
✅ "C. Mọi lực tác dụng đều có phản lực"
✅ "D. Lực hấp dẫn tỉ lệ nghịch với bình phương khoảng cách"
✅ "💡 Giải thích: Định luật I Newton nói về tính quán tính: vật giữ nguyên trạng thái chuyển động khi không có lực tác dụng."
```

---

## 🎯 Quality Checklist

### **Question Quality**
- ✅ **Specific**: Câu hỏi cụ thể về chủ đề
- ✅ **Meaningful**: Có ý nghĩa giáo dục
- ✅ **Accurate**: Đáp án chính xác
- ✅ **Educational**: Giúp học sinh hiểu sâu hơn

### **Answer Options**
- ✅ **Realistic**: Đáp án hợp lý và thực tế
- ✅ **Plausible**: Các đáp án sai nhưng có thể gây nhầm lẫn
- ✅ **Clear**: Rõ ràng và dễ hiểu
- ✅ **Educational**: Giúp phân biệt đúng/sai

### **Explanations**
- ✅ **Detailed**: Giải thích chi tiết
- ✅ **Accurate**: Chính xác về mặt khoa học
- ✅ **Educational**: Giúp hiểu sâu hơn
- ✅ **Clear**: Rõ ràng và dễ hiểu

---

## 🚀 Ready to Test!

**Hãy test ngay và so sánh chất lượng câu hỏi!**

1. **Test với Demo Mode** để xem câu hỏi mới
2. **So sánh với câu hỏi cũ** để thấy sự khác biệt
3. **Thử các môn học khác nhau** để test coverage
4. **Check accuracy** của đáp án và giải thích

**Expected: Cải thiện đáng kể về chất lượng câu hỏi! 🎉**
