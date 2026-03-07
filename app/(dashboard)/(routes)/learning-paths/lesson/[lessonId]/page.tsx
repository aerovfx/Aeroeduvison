'use client';

import React, { useState, useEffect } from 'react';
import { 
  Brain, BookOpen, CheckCircle, Circle, Clock, Target, 
  Sparkles, Award, ArrowRight, ArrowLeft, Send, Loader,
  ThumbsUp, ThumbsDown, Star, Zap, Trophy, RefreshCw,
  MessageCircle, AlertCircle, Play, ChevronRight
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { syncLessonStart, syncLessonProgress, syncLessonCompletion } from '@/lib/student-data-sync';
import { useLanguage } from '@/contexts/LanguageContext';

interface LessonContent {
  theory: {
    objectives: string[];
    knowledge: string[];
    skills: string[];
    content: string;
  };
  exercises: {
    type: 'multiple_choice' | 'short_answer' | 'essay';
    question: string;
    options?: string[];
    correctAnswer?: string | number;
    rubric?: string;
    points: number;
  }[];
}

interface StudentAnswer {
  exerciseIndex: number;
  answer: string | number;
  score?: number;
  feedback?: string;
}

export default function LessonPage() {
  const { t } = useLanguage();
  
  const params = useParams();
  const router = useRouter();
  const lessonId = params.lessonId as string;

  const [loading, setLoading] = useState(true);
  const [lessonData, setLessonData] = useState<any>(null);
  const [lessonContent, setLessonContent] = useState<LessonContent | null>(null);
  const [currentStep, setCurrentStep] = useState<'theory' | 'exercises' | 'results'>('theory');
  const [currentExercise, setCurrentExercise] = useState(0);
  const [answers, setAnswers] = useState<StudentAnswer[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState<any>(null);

  useEffect(() => {
    loadLessonData();
  }, [lessonId]);

  const loadLessonData = async () => {
    setLoading(true);
    
    // Simulate loading lesson info
    const mockLesson = {
      id: lessonId,
      title: 'Ứng dụng đạo hàm',
      subject: 'mathematics',
      difficulty: 'beginner',
      duration: 68,
      xpReward: 104,
      day: 5,
      date: '2024-10-22'
    };
    
    setLessonData(mockLesson);
    
    // Sync lesson start to all modules
    syncLessonStart(
      lessonId,
      mockLesson.title,
      mockLesson.subject,
      mockLesson.difficulty,
      mockLesson.duration,
      mockLesson.xpReward
    );
    
    // Generate lesson content using AI
    await generateLessonContent(mockLesson);
    
    setLoading(false);
  };

  const generateLessonContent = async (lesson: any) => {
    try {
      // Call AI API to generate content
      const response = await fetch('/api/ai-generate-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: lesson.title,
          subject: lesson.subject,
          difficulty: lesson.difficulty,
          duration: lesson.duration
        })
      });

      if (response.ok) {
        const data = await response.json();
        setLessonContent(data.content);
      } else {
        // Fallback to demo content
        setLessonContent(getDemoContent());
      }
    } catch (error) {
      console.error('Error generating lesson:', error);
      setLessonContent(getDemoContent());
    }
  };

  const getDemoContent = (): LessonContent => {
    return {
      theory: {
        objectives: [
          'Hiểu sâu về khái niệm đạo hàm và ý nghĩa hình học, vật lý của đạo hàm',
          'Nắm vững các công thức và quy tắc tính đạo hàm cơ bản, hàm hợp, hàm ngược',
          'Áp dụng thành thạo đạo hàm để giải các bài toán thực tế về cực trị, tối ưu hóa',
          'Sử dụng đạo hàm để khảo sát và vẽ đồ thị hàm số một cách chính xác',
          'Phát triển tư duy logic và khả năng phân tích vấn đề phức tạp'
        ],
        knowledge: [
          'Định nghĩa đạo hàm tại một điểm theo giới hạn: f\'(x₀) = lim[h→0] [f(x₀+h)-f(x₀)]/h',
          'Các công thức đạo hàm cơ bản: (xⁿ)\', (sin x)\', (cos x)\', (eˣ)\', (ln x)\'',
          'Quy tắc tính đạo hàm: tổng, hiệu, tích, thương',
          'Đạo hàm của hàm hợp: [f(g(x))]\' = f\'(g(x))·g\'(x)',
          'Đạo hàm cấp cao và ý nghĩa hình học của đạo hàm cấp hai',
          'Ứng dụng đạo hàm: tìm cực trị, khảo sát hàm số, bài toán tối ưu',
          'Mối liên hệ giữa dấu đạo hàm và tính đơn điệu của hàm số'
        ],
        skills: [
          'Tính thành thạo đạo hàm của các hàm số cơ bản và phức tạp',
          'Vận dụng quy tắc chuỗi (chain rule) cho hàm hợp',
          'Giải và phân tích bài toán cực trị, tìm GTLN-GTNN',
          'Khảo sát sự biến thiên và vẽ đồ thị hàm số',
          'Áp dụng đạo hàm vào các bài toán thực tế về kinh tế, vật lý, kỹ thuật',
          'Phân tích và giải quyết các bài toán tối ưu hóa có điều kiện ràng buộc',
          'Sử dụng đạo hàm để chứng minh bất đẳng thức'
        ],
        content: `
# ĐẠOHÀM VÀ ỨNG DỤNG
## Chương trình học AI-Generated - Phù hợp với trình độ của bạn

---

## 📚 PHẦN 1: KHÁI NIỆM ĐẠO HÀM

### 1.1. Định nghĩa
Cho hàm số y = f(x) xác định trên khoảng (a,b) và x₀ ∈ (a,b).

**Đạo hàm của f(x) tại x₀** là giới hạn (nếu tồn tại):

    f'(x₀) = lim[h→0] [f(x₀ + h) - f(x₀)] / h

Hoặc viết dưới dạng:

    f'(x₀) = lim[x→x₀] [f(x) - f(x₀)] / (x - x₀)

### 1.2. Ý nghĩa của đạo hàm

**🔷 Ý nghĩa hình học:**
- Đạo hàm f'(x₀) là **hệ số góc** của tiếp tuyến với đồ thị hàm số tại điểm M(x₀, f(x₀))
- Phương trình tiếp tuyến: y - f(x₀) = f'(x₀)(x - x₀)

**🔷 Ý nghĩa vật lý:**
- Nếu s(t) là quãng đường theo thời gian → s'(t) là **vận tốc tức thời**
- Nếu v(t) là vận tốc → v'(t) là **gia tốc**
- Đạo hàm biểu thị **tốc độ thay đổi** của đại lượng

**📌 Ví dụ 1:** Tính đạo hàm của f(x) = x² tại x₀ = 2

    f'(2) = lim[h→0] [(2+h)² - 2²] / h
          = lim[h→0] [4 + 4h + h² - 4] / h
          = lim[h→0] (4h + h²) / h
          = lim[h→0] (4 + h) = 4

---

## 🔢 PHẦN 2: CÁC CÔNG THỨC ĐẠO HÀM CƠ BẢN

### 2.1. Đạo hàm các hàm sơ cấp

| Hàm số | Đạo hàm | Điều kiện |
|--------|---------|-----------|
| c (hằng số) | 0 | ∀x |
| x | 1 | ∀x |
| xⁿ | n·xⁿ⁻¹ | n ∈ ℝ |
| √x | 1/(2√x) | x > 0 |
| 1/x | -1/x² | x ≠ 0 |
| eˣ | eˣ | ∀x |
| aˣ | aˣ·ln(a) | a > 0, a ≠ 1 |
| ln(x) | 1/x | x > 0 |
| logₐ(x) | 1/(x·ln(a)) | x > 0, a > 0, a ≠ 1 |

### 2.2. Đạo hàm các hàm lượng giác

| Hàm số | Đạo hàm |
|--------|---------|
| sin(x) | cos(x) |
| cos(x) | -sin(x) |
| tan(x) | 1/cos²(x) = 1 + tan²(x) |
| cot(x) | -1/sin²(x) = -(1 + cot²(x)) |

**📌 Ví dụ 2:** Tính đạo hàm của y = x³ - 2x² + 5x - 1

    y' = (x³)' - (2x²)' + (5x)' - (1)'
       = 3x² - 4x + 5 - 0
       = 3x² - 4x + 5

---

## ⚙️ PHẦN 3: QUY TẮC TÍNH ĐẠO HÀM

### 3.1. Quy tắc cơ bản
Cho u = u(x), v = v(x) là các hàm số có đạo hàm:

**1️⃣ Quy tắc tổng/hiệu:**
    (u ± v)' = u' ± v'

**2️⃣ Quy tắc tích:**
    (u·v)' = u'·v + u·v'

**3️⃣ Quy tắc thương:**
    (u/v)' = (u'·v - u·v') / v²  (v ≠ 0)

**4️⃣ Quy tắc nhân với hằng số:**
    (k·u)' = k·u'

### 3.2. Đạo hàm hàm hợp (Chain Rule)
Nếu y = f(u) và u = g(x) thì:

    y'ₓ = y'ᵤ · u'ₓ

Hay: **[f(g(x))]' = f'(g(x))·g'(x)**

**📌 Ví dụ 3:** Tính đạo hàm của y = (2x + 1)⁵

    Đặt u = 2x + 1 → y = u⁵
    y'ₓ = y'ᵤ · u'ₓ = 5u⁴ · 2 = 10(2x + 1)⁴

**📌 Ví dụ 4:** Tính đạo hàm của y = sin(3x² + 1)

    y' = cos(3x² + 1) · (3x² + 1)'
       = cos(3x² + 1) · 6x
       = 6x·cos(3x² + 1)

---

## 📈 PHẦN 4: ỨNG DỤNG ĐẠO HÀM

### 4.1. Khảo sát tính đơn điệu của hàm số

**Định lý:**
- Nếu f'(x) > 0 ∀x ∈ (a,b) → f(x) **đồng biến** trên (a,b)
- Nếu f'(x) < 0 ∀x ∈ (a,b) → f(x) **nghịch biến** trên (a,b)
- Nếu f'(x) = 0 ∀x ∈ (a,b) → f(x) **không đổi** trên (a,b)

**Quy trình:**
1. Tìm tập xác định
2. Tính f'(x)
3. Giải f'(x) = 0 và f'(x) không xác định
4. Lập bảng biến thiên
5. Kết luận

### 4.2. Tìm cực trị của hàm số

**🔷 Điều kiện cần:**
Nếu f(x) đạt cực trị tại x₀ → f'(x₀) = 0 hoặc f'(x₀) không tồn tại

**🔷 Điều kiện đủ (Quy tắc I):**
Nếu f'(x) đổi dấu khi x đi qua x₀:
- f'(x) đổi từ (+) sang (-) → x₀ là điểm **cực đại**
- f'(x) đổi từ (-) sang (+) → x₀ là điểm **cực tiểu**

**🔷 Quy tắc II (sử dụng đạo hàm cấp 2):**
Nếu f'(x₀) = 0 và f''(x₀) ≠ 0:
- f''(x₀) < 0 → x₀ là điểm **cực đại**
- f''(x₀) > 0 → x₀ là điểm **cực tiểu**

**📌 Ví dụ 5:** Tìm cực trị của f(x) = x³ - 3x + 1

    Bước 1: f'(x) = 3x² - 3
    Bước 2: f'(x) = 0 ⟺ 3x² - 3 = 0 ⟺ x = ±1
    Bước 3: Lập bảng biến thiên
    
    x      | -∞     -1      1      +∞
    f'(x)  |   +  0  -  0  +
    f(x)   |   ↗  3  ↘  -1  ↗
    
    Kết luận:
    - x = -1: Cực đại, f(-1) = 3
    - x = 1: Cực tiểu, f(1) = -1

### 4.3. Giải bài toán tối ưu

**Phương pháp:**
1. Đặt ẩn và điều kiện ràng buộc
2. Lập hàm mục tiêu f(x)
3. Tìm f'(x) = 0
4. So sánh giá trị tại điểm dừng và biên
5. Kết luận

**📌 Ví dụ 6:** (Bài toán thực tế)
Một người nông dân có 100m hàng rào để rào một mảnh vườn hình chữ nhật dọc theo bờ sông (một cạnh không cần rào). Tìm kích thước để diện tích lớn nhất.

    Giải:
    - Gọi x là chiều rộng (0 < x < 100)
    - Chiều dài: y = 100 - 2x
    - Diện tích: S(x) = x·y = x(100 - 2x) = 100x - 2x²
    
    Tìm max:
    S'(x) = 100 - 4x = 0 ⟺ x = 25
    S''(x) = -4 < 0 → x = 25 là điểm cực đại
    
    Khi x = 25 → y = 50
    Diện tích lớn nhất: S = 1250 m²

---

## 💡 PHẦN 5: MẸO VÀ LƯU Ý

### 5.1. Các sai lầm thường gặp
❌ (u·v)' = u'·v' (SAI!)
✅ (u·v)' = u'·v + u·v' (ĐÚNG)

❌ (u/v)' = u'/v' (SAI!)
✅ (u/v)' = (u'v - uv')/v² (ĐÚNG)

❌ [f(g(x))]' = f'(x)·g'(x) (SAI!)
✅ [f(g(x))]' = f'(g(x))·g'(x) (ĐÚNG)

### 5.2. Mẹo nhớ công thức
📝 **Đạo hàm hàm hợp:** "Đạo hàm ngoài nhân đạo hàm trong"
📝 **Quy tắc tích:** "Cái này nhân đạo hàm cái kia, cộng ngược lại"
📝 **Quy tắc thương:** "Trên trừ dưới, tất cả chia dưới bình phương"

### 5.3. Bài tập tự luyện
Hãy thử tính đạo hàm của các hàm sau:
1. y = (x² + 1)·eˣ
2. y = ln(x² + 2x + 1)
3. y = sin²(3x)
4. y = √(x² + 1)

---

## 🎯 TÓM TẮT BÀI HỌC

✅ Đạo hàm là công cụ quan trọng để nghiên cứu sự biến thiên của hàm số
✅ Nắm vững công thức và quy tắc là nền tảng để giải mọi bài toán
✅ Ứng dụng đa dạng: khảo sát hàm số, tối ưu hóa, vật lý, kinh tế...
✅ Luyện tập nhiều để thành thạo kỹ thuật tính đạo hàm

💪 **Hãy làm bài tập để củng cố kiến thức!**
        `
      },
      exercises: [
        {
          type: 'multiple_choice',
          question: '**Câu 1:** Cho hàm số f(x) = x³ - 3x² + 2. Tính đạo hàm f\'(2) = ?\n\n_Gợi ý: Áp dụng công thức đạo hàm (xⁿ)\' = n·xⁿ⁻¹_',
          options: [
            'A. f\'(2) = 0',
            'B. f\'(2) = 6', 
            'C. f\'(2) = 12',
            'D. f\'(2) = 18'
          ],
          correctAnswer: 0,
          points: 15
        },
        {
          type: 'multiple_choice',
          question: '**Câu 2:** Đạo hàm của hàm số y = sin(2x) + cos(3x) là:\n\n_Gợi ý: Sử dụng quy tắc đạo hàm hàm hợp: [f(g(x))]\' = f\'(g(x))·g\'(x)_',
          options: [
            'A. y\' = cos(2x) - sin(3x)',
            'B. y\' = 2·cos(2x) - 3·sin(3x)',
            'C. y\' = -2·sin(2x) + 3·cos(3x)',
            'D. y\' = cos(2x) + sin(3x)'
          ],
          correctAnswer: 1,
          points: 15
        },
        {
          type: 'multiple_choice',
          question: '**Câu 3:** Hàm số y = x³ - 3x² + 2 đạt cực tiểu tại điểm nào?\n\n_Gợi ý: Tìm y\' = 0, sau đó xét dấu y\' hoặc tính y\'\'_',
          options: [
            'A. x = 0',
            'B. x = 1',
            'C. x = 2',
            'D. x = 3'
          ],
          correctAnswer: 2,
          points: 20
        },
        {
          type: 'multiple_choice',
          question: '**Câu 4:** Cho hàm số f(x) = ln(x² + 1). Đạo hàm f\'(x) bằng:\n\n_Gợi ý: Sử dụng công thức (ln u)\' = u\'/u và quy tắc hàm hợp_',
          options: [
            'A. f\'(x) = 1/(x² + 1)',
            'B. f\'(x) = 2x/(x² + 1)',
            'C. f\'(x) = 2x·ln(x² + 1)',
            'D. f\'(x) = x/(x² + 1)'
          ],
          correctAnswer: 1,
          points: 20
        },
        {
          type: 'short_answer',
          question: '**Câu 5:** Tìm đạo hàm của hàm số f(x) = (x² + 1)·eˣ\n\n_Yêu cầu:_\n- Viết rõ quy tắc sử dụng\n- Trình bày các bước tính toán\n- Viết kết quả dưới dạng khai triển hoặc rút gọn\n\n_Gợi ý: Sử dụng quy tắc tích (u·v)\' = u\'·v + u·v\'_',
          rubric: 'Đáp án đúng: f\'(x) = 2x·eˣ + (x² + 1)·eˣ = (x² + 2x + 1)·eˣ hoặc (x + 1)²·eˣ.\nCó thể chấp nhận cả dạng chưa rút gọn nếu tính toán đúng.',
          points: 15
        },
        {
          type: 'short_answer',
          question: '**Câu 6:** Tính đạo hàm cấp 2 của hàm số y = x⁴ - 2x³ + 1\n\n_Yêu cầu:_\n- Tính y\' trước\n- Sau đó tính y\'\' = (y\')\'  \n- Viết kết quả rút gọn\n\n_Gợi ý: Áp dụng công thức (xⁿ)\' = n·xⁿ⁻¹ hai lần_',
          rubric: 'Đáp án: y\' = 4x³ - 6x², y\'\' = 12x² - 12x = 12x(x - 1)',
          points: 15
        },
        {
          type: 'essay',
          question: '**Câu 7:** Bài toán tối ưu hóa\n\nMột người nông dân có 120m hàng rào muốn rào một mảnh vườn hình chữ nhật dọc theo bờ sông (một cạnh không cần rào, sử dụng bờ sông). Hỏi kích thước của mảnh vườn như thế nào để diện tích lớn nhất?\n\n**Yêu cầu bài làm:**\n1. Đặt ẩn và xác định điều kiện (rõ ràng)\n2. Lập hàm diện tích S(x) theo biến x\n3. Tính đạo hàm S\'(x) và giải S\'(x) = 0\n4. Chứng minh giá trị tìm được là cực đại (dùng S\'\' hoặc lập bảng biến thiên)\n5. Kết luận kích thước tối ưu và diện tích lớn nhất\n\n_Hãy trình bày đầy đủ, rõ ràng từng bước. Giải thích lý do tại sao đó là giá trị lớn nhất._',
          rubric: `
**Rubric chấm điểm (20 điểm):**

1. **Đặt ẩn và điều kiện (4 điểm)**
   - Đặt x là một cạnh (ví dụ: chiều rộng) [1đ]
   - Xác định cạnh còn lại theo x [1đ]
   - Điều kiện 0 < x < 120 [1đ]
   - Vẽ hình minh họa (nếu có) [1đ]

2. **Lập hàm mục tiêu (4 điểm)**
   - Viết công thức diện tích đúng [2đ]
   - Biểu diễn theo 1 biến [2đ]

3. **Tính đạo hàm và giải phương trình (5 điểm)**
   - Tính S\'(x) đúng [2đ]
   - Giải S\'(x) = 0 đúng [2đ]
   - Tính giá trị x [1đ]

4. **Chứng minh cực đại (4 điểm)**
   - Tính S\'\'(x) hoặc lập bảng biến thiên [2đ]
   - Kết luận đúng là cực đại [2đ]

5. **Kết luận (3 điểm)**
   - Nêu kích thước tối ưu [1đ]
   - Tính diện tích lớn nhất [1đ]
   - Giải thích ý nghĩa thực tế [1đ]

**Đáp án mẫu:**
- Chiều rộng: x = 30m
- Chiều dài: y = 60m  
- Diện tích lớn nhất: S = 1800 m²
          `,
          points: 20
        }
      ]
    };
  };

  const handleAnswerChange = (exerciseIndex: number, answer: string | number) => {
    const newAnswers = [...answers];
    const existingIndex = newAnswers.findIndex(a => a.exerciseIndex === exerciseIndex);
    
    if (existingIndex >= 0) {
      newAnswers[existingIndex].answer = answer;
    } else {
      newAnswers.push({ exerciseIndex, answer });
    }
    
    setAnswers(newAnswers);
  };

  const handleNextExercise = () => {
    if (lessonContent && currentExercise < lessonContent.exercises.length - 1) {
      setCurrentExercise(currentExercise + 1);
      
      // Update progress in assignments using sync function
      if (lessonContent) {
        const progress = Math.round(((currentExercise + 1) / lessonContent.exercises.length) * 100);
        syncLessonProgress(lessonId, progress);
      }
    } else {
      submitAllAnswers();
    }
  };

  const handlePrevExercise = () => {
    if (currentExercise > 0) {
      setCurrentExercise(currentExercise - 1);
    }
  };

  const submitAllAnswers = async () => {
    setIsSubmitting(true);
    
    try {
      // Call AI API to grade answers
      const response = await fetch('/api/ai-grade-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId,
          lessonContent,
          answers
        })
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data.results);
        setCurrentStep('results');
      } else {
        // Fallback to demo grading
        const demoResults = gradeDemoAnswers();
        setResults(demoResults);
        setCurrentStep('results');
      }
    } catch (error) {
      console.error('Error grading answers:', error);
      const demoResults = gradeDemoAnswers();
      setResults(demoResults);
      setCurrentStep('results');
    }
    
    setIsSubmitting(false);
  };

  const gradeDemoAnswers = () => {
    if (!lessonContent) return null;

    let totalScore = 0;
    let maxScore = 0;
    const gradedAnswers: StudentAnswer[] = [];

    lessonContent.exercises.forEach((exercise, index) => {
      maxScore += exercise.points;
      const studentAnswer = answers.find(a => a.exerciseIndex === index);
      
      if (!studentAnswer) {
        gradedAnswers.push({
          exerciseIndex: index,
          answer: '',
          score: 0,
          feedback: 'Chưa trả lời câu hỏi này.'
        });
        return;
      }

      if (exercise.type === 'multiple_choice') {
        const isCorrect = studentAnswer.answer === exercise.correctAnswer;
        const score = isCorrect ? exercise.points : 0;
        totalScore += score;
        
        gradedAnswers.push({
          ...studentAnswer,
          score,
          feedback: isCorrect 
            ? '✅ Chính xác! Bạn đã hiểu rất tốt.' 
            : `❌ Chưa đúng. Đáp án đúng là: ${exercise.options?.[exercise.correctAnswer as number]}`
        });
      } else if (exercise.type === 'short_answer') {
        // Simple keyword matching for demo
        const answer = String(studentAnswer.answer).toLowerCase();
        const hasKeywords = answer.includes('eˣ') || answer.includes('e^x');
        const score = hasKeywords ? exercise.points : exercise.points * 0.5;
        totalScore += score;
        
        gradedAnswers.push({
          ...studentAnswer,
          score,
          feedback: hasKeywords
            ? '✅ Đáp án đúng! Bạn đã tính đạo hàm chính xác.'
            : '⚠️ Đáp án chưa hoàn chỉnh. Hãy kiểm tra lại công thức đạo hàm của tích.'
        });
      } else if (exercise.type === 'essay') {
        // AI would grade this in real implementation
        const answer = String(studentAnswer.answer);
        const wordCount = answer.split(' ').length;
        const score = wordCount > 50 ? exercise.points * 0.8 : exercise.points * 0.5;
        totalScore += score;
        
        gradedAnswers.push({
          ...studentAnswer,
          score,
          feedback: `📝 Bài làm của bạn có ${wordCount} từ. ${
            wordCount > 50 
              ? 'Bạn đã trình bày khá đầy đủ. Tuy nhiên, hãy chú ý đến việc giải thích rõ ràng từng bước.' 
              : 'Bài làm còn ngắn. Hãy trình bày chi tiết hơn các bước giải.'
          }`
        });
      }
    });

    const percentage = (totalScore / maxScore) * 100;
    const earnedXP = lessonData ? Math.floor((lessonData.xpReward * percentage) / 100) : 0;

    return {
      totalScore,
      maxScore,
      percentage: Math.round(percentage),
      earnedXP,
      gradedAnswers,
      grade: percentage >= 90 ? 'Xuất sắc' : percentage >= 80 ? 'Giỏi' : percentage >= 70 ? 'Khá' : percentage >= 50 ? 'Trung bình' : 'Cần cố gắng'
    };
  };

  const saveProgressAndReturn = () => {
    if (!results || !lessonData) return;

    // Use centralized sync function to update all modules
    syncLessonCompletion(
      lessonId,
      lessonData.title,
      lessonData.subject,
      results.percentage,
      results.earnedXP,
      lessonData.duration
    );

    router.push('/learning-paths');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-700 text-lg">🤖 AI đang tạo nội dung bài học...</p>
          <p className="text-gray-500 text-sm mt-2">Vui lòng đợi trong giây lát</p>
        
              </div>
      </div>
    );
  }

  if (!lessonContent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-700 text-lg">Không thể tải nội dung bài học</p>
          <Link href="/learning-paths" className="text-purple-600 hover:underline mt-4 inline-block">
            Quay lại Learning Path
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl shadow-xl p-6 mb-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">{lessonData?.title}</h1>
              <p className="text-purple-100">🤖 Bài học được AI tạo riêng cho bạn</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">+{lessonData?.xpReward} XP</div>
              <div className="text-sm text-purple-100">Thời lượng: {lessonData?.duration} phút</div>
            </div>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-2 mt-4">
            <div className={`flex items-center ${currentStep === 'theory' ? 'text-white' : 'text-purple-300'}`}>
              <Circle className={`w-6 h-6 ${currentStep === 'theory' ? 'fill-current' : ''}`} />
              <span className="ml-2">Lý thuyết</span>
            </div>
            <ChevronRight className="w-5 h-5 text-purple-300" />
            <div className={`flex items-center ${currentStep === 'exercises' ? 'text-white' : 'text-purple-300'}`}>
              <Circle className={`w-6 h-6 ${currentStep === 'exercises' ? 'fill-current' : ''}`} />
              <span className="ml-2">Bài tập</span>
            </div>
            <ChevronRight className="w-5 h-5 text-purple-300" />
            <div className={`flex items-center ${currentStep === 'results' ? 'text-white' : 'text-purple-300'}`}>
              <Circle className={`w-6 h-6 ${currentStep === 'results' ? 'fill-current' : ''}`} />
              <span className="ml-2">Kết quả</span>
            </div>
          </div>
        </div>

        {/* Theory Section */}
        {currentStep === 'theory' && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <BookOpen className="w-6 h-6 mr-2 text-blue-500" />
              Nội dung lý thuyết
            </h2>

            <div className="space-y-6">
              {/* Objectives */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <Target className="w-5 h-5 mr-2 text-green-500" />
                  🎯 Mục tiêu
                </h3>
                <ul className="space-y-2">
                  {lessonContent.theory.objectives.map((obj, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{obj}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Knowledge */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <Brain className="w-5 h-5 mr-2 text-purple-500" />
                  📚 Kiến thức
                </h3>
                <ul className="space-y-2">
                  {lessonContent.theory.knowledge.map((know, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-purple-500 mr-2 font-bold">{index + 1}.</span>
                      <span className="text-gray-700">{know}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Skills */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <Award className="w-5 h-5 mr-2 text-yellow-500" />
                  💪 Kỹ năng
                </h3>
                <ul className="space-y-2">
                  {lessonContent.theory.skills.map((skill, index) => (
                    <li key={index} className="flex items-start">
                      <Star className="w-5 h-5 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{skill}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Content */}
              <div className="prose max-w-none">
                <div className="bg-gray-50 p-6 rounded-lg">
                  <pre className="whitespace-pre-wrap font-sans text-gray-700 leading-relaxed">
                    {lessonContent.theory.content}
                  </pre>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={() => setCurrentStep('exercises')}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 transition-colors flex items-center"
              >
                Làm bài tập
                <ArrowRight className="w-5 h-5 ml-2" />
              </button>
            </div>
          </div>
        )}

        {/* Exercises Section */}
        {currentStep === 'exercises' && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <Target className="w-6 h-6 mr-2 text-purple-500" />
                Bài tập {currentExercise + 1}/{lessonContent.exercises.length}
              </h2>
              <span className="text-sm text-gray-600">
                {lessonContent.exercises[currentExercise].points} điểm
              </span>
            </div>

            <div className="mb-8">
              <p className="text-lg text-gray-800 mb-6 leading-relaxed">
                {lessonContent.exercises[currentExercise].question}
              </p>

              {lessonContent.exercises[currentExercise].type === 'multiple_choice' && (
                <div className="space-y-3">
                  {lessonContent.exercises[currentExercise].options?.map((option, index) => (
                    <label
                      key={index}
                      className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        answers.find(a => a.exerciseIndex === currentExercise)?.answer === index
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`exercise-${currentExercise}`}
                        value={index}
                        checked={answers.find(a => a.exerciseIndex === currentExercise)?.answer === index}
                        onChange={() => handleAnswerChange(currentExercise, index)}
                        className="w-5 h-5 text-purple-600"
                      />
                      <span className="ml-3 text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              )}

              {lessonContent.exercises[currentExercise].type === 'short_answer' && (
                <input
                  type="text"
                  value={answers.find(a => a.exerciseIndex === currentExercise)?.answer || ''}
                  onChange={(e) => handleAnswerChange(currentExercise, e.target.value)}
                  placeholder="Nhập câu trả lời của bạn..."
                  className="w-full p-4 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none"
                />
              )}

              {lessonContent.exercises[currentExercise].type === 'essay' && (
                <textarea
                  value={answers.find(a => a.exerciseIndex === currentExercise)?.answer || ''}
                  onChange={(e) => handleAnswerChange(currentExercise, e.target.value)}
                  placeholder="Viết bài luận của bạn tại đây... (Tối thiểu 50 từ)"
                  rows={10}
                  className="w-full p-4 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none resize-none"
                />
              )}
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={handlePrevExercise}
                disabled={currentExercise === 0}
                className="px-6 py-3 rounded-lg font-semibold transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Câu trước
              </button>

              <button
                onClick={handleNextExercise}
                disabled={!answers.find(a => a.exerciseIndex === currentExercise)}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {currentExercise < lessonContent.exercises.length - 1 ? 'Câu tiếp theo' : 'Nộp bài'}
                {isSubmitting ? (
                  <Loader className="w-5 h-5 ml-2 animate-spin" />
                ) : (
                  <ArrowRight className="w-5 h-5 ml-2" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Results Section */}
        {currentStep === 'results' && results && (
          <div className="space-y-6">
            {/* Overall Results */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl shadow-xl p-8 text-white">
              <div className="text-center">
                <Trophy className="w-16 h-16 mx-auto mb-4" />
                <h2 className="text-3xl font-bold mb-2">Hoàn thành bài học!</h2>
                <p className="text-green-100 mb-6">Bạn đã hoàn thành xuất sắc</p>
                
                <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto">
                  <div>
                    <div className="text-4xl font-bold">{results.percentage}%</div>
                    <div className="text-green-100 text-sm">Độ chính xác</div>
                  </div>
                  <div>
                    <div className="text-4xl font-bold">{results.totalScore}/{results.maxScore}</div>
                    <div className="text-green-100 text-sm">Điểm số</div>
                  </div>
                  <div>
                    <div className="text-4xl font-bold flex items-center justify-center">
                      <Zap className="w-8 h-8 mr-1" />
                      {results.earnedXP}
                    </div>
                    <div className="text-green-100 text-sm">XP nhận được</div>
                  </div>
                </div>

                <div className="mt-6 text-2xl font-semibold">
                  Xếp loại: {results.grade}
                </div>
              </div>
            </div>

            {/* Detailed Feedback */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Chi tiết bài làm</h3>
              
              <div className="space-y-6">
                {results.gradedAnswers.map((answer: StudentAnswer, index: number) => (
                  <div key={index} className="border-2 border-gray-200 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-semibold text-gray-900 flex-1">
                        Câu {index + 1}: {lessonContent.exercises[index].question}
                      </h4>
                      <div className="text-right ml-4">
                        <div className="text-lg font-bold text-purple-600">
                          {answer.score}/{lessonContent.exercises[index].points}
                        </div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="text-sm text-gray-600 mb-1">Câu trả lời của bạn:</div>
                      <div className="text-gray-800">
                        {lessonContent.exercises[index].type === 'multiple_choice' 
                          ? lessonContent.exercises[index].options?.[answer.answer as number]
                          : answer.answer}
                      </div>
                    </div>

                    <div className={`p-4 rounded-lg ${
                      answer.score === lessonContent.exercises[index].points
                        ? 'bg-green-50 border border-green-200'
                        : answer.score! > 0
                        ? 'bg-yellow-50 border border-yellow-200'
                        : 'bg-red-50 border border-red-200'
                    }`}>
                      <p className="text-sm">{answer.feedback}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pass/Fail Message */}
            {results.percentage < 60 && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 mb-6">
                <div className="flex items-start">
                  <AlertCircle className="w-6 h-6 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="text-lg font-bold text-red-800 mb-2">⚠️ Chưa đạt yêu cầu</h3>
                    <p className="text-red-700 mb-3">
                      Bạn cần đạt tối thiểu <span className="font-bold">60% (6/10 điểm)</span> để mở khóa bài học tiếp theo.
                    </p>
                    <p className="text-red-600 text-sm">
                      💡 Điểm của bạn: {results.percentage}% - Hãy xem lại phần feedback và học lại bài này để cải thiện!
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {results.percentage >= 60 && results.percentage < 80 && (
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 mb-6">
                <div className="flex items-start">
                  <CheckCircle className="w-6 h-6 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="text-lg font-bold text-green-800 mb-2">✅ Đạt yêu cầu!</h3>
                    <p className="text-green-700">
                      Bạn đã vượt qua ngưỡng 60% và có thể tiếp tục bài học tiếp theo! 
                      {results.percentage >= 70 && ' Làm tốt lắm! 🎉'}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {results.percentage >= 80 && (
              <div className="bg-gradient-to-r from-green-400 to-emerald-400 border-2 border-green-300 rounded-xl p-6 mb-6 text-white">
                <div className="flex items-start">
                  <Trophy className="w-6 h-6 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="text-lg font-bold mb-2">🏆 Xuất sắc!</h3>
                    <p>
                      Bạn đã hoàn thành bài học với kết quả {results.grade}! Hãy tiếp tục phát huy! 🌟
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              {results.percentage >= 60 ? (
                <button
                  onClick={saveProgressAndReturn}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-8 py-4 rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 transition-colors flex items-center justify-center"
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Hoàn thành và tiếp tục
                </button>
              ) : (
                <button
                  onClick={() => typeof window !== 'undefined' && location.reload()}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 text-white px-8 py-4 rounded-lg font-semibold hover:from-orange-600 hover:to-red-600 transition-colors flex items-center justify-center"
                >
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Học lại bài này
                </button>
              )}
              
              <Link
                href="/ai-tutor"
                className="flex-1 bg-white border-2 border-purple-600 text-purple-600 px-8 py-4 rounded-lg font-semibold hover:bg-purple-50 transition-colors flex items-center justify-center"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Nhờ AI Tutor giúp đỡ
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

