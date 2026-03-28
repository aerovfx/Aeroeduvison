'use client';

import React, { useState, useEffect } from 'react';
import { 
  Brain, BookOpen, CheckCircle, Circle, Clock, Target, 
  Sparkles, Award, ArrowRight, ArrowLeft, Send, Loader,
  ThumbsUp, ThumbsDown, Star, Zap, Trophy, RefreshCw,
  MessageCircle, AlertCircle, Play, ChevronRight
} from 'lucide-react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
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
  const searchParams = useSearchParams();
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

    // 1. Try to load real lesson data from AI-generated path (localStorage)
    let lesson: any = null;
    try {
      const savedPath = localStorage.getItem('learning-path-ai-generated');
      if (savedPath) {
        const pathData = JSON.parse(savedPath);
        // Search through all weeks/lessons for this lessonId
        for (const week of (pathData.weeks || [])) {
          for (const l of (week.lessons || [])) {
            if (l.id === lessonId) {
              lesson = {
                id: l.id,
                title: l.title || `Bài học ${lessonId}`,
                subject: l.subject || 'mathematics',
                difficulty: l.difficulty || 'intermediate',
                duration: l.duration || 45,
                xpReward: l.xpReward || 100,
                day: l.day || 1,
                date: l.date || new Date().toISOString().split('T')[0],
                bankQuestions: l.bankQuestions || [], // Questions from bank attached during path generation
              };
              break;
            }
          }
          if (lesson) break;
        }
      }
    } catch (err) {
      console.warn('[LESSON] Could not load from saved path:', err);
    }

    // 2. Fallback - use query params if available, otherwise generic defaults
    if (!lesson) {
      const qTitle = searchParams.get('title');
      const qSubject = searchParams.get('subject');
      const qDifficulty = searchParams.get('difficulty');

      lesson = {
        id: lessonId,
        title: qTitle || 'Bài học',
        subject: qSubject || 'mathematics',
        difficulty: qDifficulty || 'intermediate',
        duration: 45,
        xpReward: 100,
        day: 1,
        date: new Date().toISOString().split('T')[0],
        bankQuestions: [],
      };

      console.log(`[LESSON] Loaded from ${qTitle ? 'URL params' : 'defaults'}: title="${lesson.title}", subject="${lesson.subject}"`);
    }

    setLessonData(lesson);
    console.log(`[LESSON] Final lesson data: id="${lesson.id}", title="${lesson.title}", subject="${lesson.subject}"`);

    // Sync lesson start to all modules
    syncLessonStart(
      lessonId,
      lesson.title,
      lesson.subject,
      lesson.difficulty,
      lesson.duration,
      lesson.xpReward
    );

    // Generate lesson content using AI + question bank
    await generateLessonContent(lesson);

    setLoading(false);
  };

  const generateLessonContent = async (lesson: any) => {
    try {
      // Call AI API to generate content (now integrates question bank)
      const response = await fetch('/api/ai-generate-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: lesson.title,
          subject: lesson.subject,
          difficulty: lesson.difficulty,
          duration: lesson.duration,
          lessonId: lesson.id,
          bankQuestions: lesson.bankQuestions || [], // Pass bank questions from path
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.content) {
          console.log(`[LESSON] Content generated via ${data.model}, ${data.questionsFromBank || 0} questions from bank`);
          setLessonContent(data.content);
          return;
        }
      }
      // Fallback to demo content - now dynamic based on lesson info
      setLessonContent(getDemoContent(lesson));
    } catch (error) {
      console.error('[LESSON] Error generating content:', error);
      setLessonContent(getDemoContent(lesson));
    }
  };

  /**
   * Dynamic demo content generator - creates placeholder lesson content
   * based on the actual lesson title and subject instead of hardcoded content.
   */
  const getDemoContent = (lesson?: { title: string; subject: string; difficulty: string }): LessonContent => {
    const title = lesson?.title || lessonData?.title || 'Bài học';
    const subject = lesson?.subject || lessonData?.subject || 'mathematics';
    const difficulty = lesson?.difficulty || lessonData?.difficulty || 'intermediate';

    const subjectLabels: Record<string, string> = {
      physics: 'Vật lý',
      mathematics: 'Toán học',
      chemistry: 'Hóa học',
      biology: 'Sinh học',
      computer_science: 'Tin học',
      literature: 'Ngữ văn',
      english: 'Tiếng Anh',
      history: 'Lịch sử',
      geography: 'Địa lý',
    };
    const subjectLabel = subjectLabels[subject] || 'Khoa học';
    const difficultyLabel = difficulty === 'basic' ? 'Cơ bản' : difficulty === 'advanced' ? 'Nâng cao' : 'Trung bình';

    // --- Check for specific physics topic content ---
    const titleLower = title.toLowerCase().trim();

    if (titleLower.includes('dao động') || titleLower.includes('dao dong')) {
      return getDaoDocCoContent(title, difficultyLabel);
    }
    if (titleLower.includes('sóng cơ') || titleLower.includes('song co')) {
      return getSongCoContent(title, difficultyLabel);
    }
    if (titleLower.includes('đạo hàm') || titleLower.includes('dao ham')) {
      return getDaoHamContent(title, difficultyLabel);
    }

    // --- GENERIC FALLBACK for any topic/subject ---
    return {
      theory: {
        objectives: [
          `Hiểu các khái niệm cơ bản về ${title}`,
          `Nắm vững các công thức và nguyên lý quan trọng liên quan đến ${title}`,
          `Áp dụng kiến thức ${title} vào giải bài tập và tình huống thực tế`,
          `Phân tích và đánh giá các vấn đề liên quan đến ${title}`,
          `Phát triển tư duy logic và khả năng giải quyết vấn đề trong lĩnh vực ${subjectLabel}`
        ],
        knowledge: [
          `Các khái niệm nền tảng của ${title}`,
          `Các công thức và định luật cơ bản liên quan`,
          `Mối liên hệ giữa ${title} với các chủ đề khác trong ${subjectLabel}`,
          `Các ứng dụng thực tiễn của ${title}`,
          `Lịch sử phát triển và ý nghĩa khoa học của ${title}`
        ],
        skills: [
          `Giải các bài toán cơ bản về ${title}`,
          `Phân tích và giải thích các hiện tượng liên quan`,
          `Vận dụng kiến thức vào tình huống thực tế`,
          `Kết nối kiến thức ${title} với các lĩnh vực liên quan`,
          `Trình bày và lập luận logic các vấn đề về ${title}`
        ],
        content: `
# ${title.toUpperCase()}
## Chương trình học AI-Generated - Trình độ: ${difficultyLabel}
### Môn: ${subjectLabel}

---

## 📚 PHẦN 1: GIỚI THIỆU

Bài học này sẽ giúp bạn tìm hiểu về **${title}** - một chủ đề quan trọng trong ${subjectLabel}.

Nội dung bài học được thiết kế phù hợp với trình độ **${difficultyLabel}** của bạn, bao gồm lý thuyết cơ bản, ví dụ minh họa và bài tập thực hành.

---

## 🔢 PHẦN 2: KIẾN THỨC CƠ BẢN

### 2.1. Các khái niệm chính
Trong phần này, bạn sẽ tìm hiểu các khái niệm nền tảng của ${title}, bao gồm định nghĩa, tính chất, và các quy luật cơ bản.

### 2.2. Công thức và nguyên lý
Các công thức quan trọng liên quan đến ${title} sẽ được trình bày chi tiết với ví dụ minh họa cụ thể.

---

## ⚙️ PHẦN 3: VÍ DỤ MINH HỌA

Các ví dụ được chọn lọc để giúp bạn hiểu rõ cách áp dụng kiến thức ${title} vào giải bài tập.

---

## 📈 PHẦN 4: ỨNG DỤNG THỰC TẾ

${title} có nhiều ứng dụng quan trọng trong đời sống và khoa học kỹ thuật. Phần này sẽ giới thiệu một số ứng dụng tiêu biểu.

---

## 🎯 TÓM TẮT BÀI HỌC

✅ Nắm được các khái niệm cơ bản về ${title}
✅ Hiểu các công thức và nguyên lý quan trọng
✅ Biết cách áp dụng vào giải bài tập
✅ Nhận thức ứng dụng thực tế của ${title}

💪 **Hãy làm bài tập để củng cố kiến thức!**
        `
      },
      exercises: getGenericExercises(title, subjectLabel)
    };
  };

  /** Dao động cơ specific content */
  const getDaoDocCoContent = (title: string, difficultyLabel: string): LessonContent => ({
    theory: {
      objectives: [
        'Hiểu khái niệm dao động cơ học và các đại lượng đặc trưng',
        'Nắm vững phương trình dao động điều hòa x = A·cos(ωt + φ)',
        'Phân biệt các loại dao động: tự do, tắt dần, cưỡng bức, cộng hưởng',
        'Áp dụng kiến thức dao động cơ vào giải bài tập và hiện tượng thực tế',
        'Phân tích năng lượng trong dao động điều hòa'
      ],
      knowledge: [
        'Dao động cơ là chuyển động lặp đi lặp lại quanh vị trí cân bằng',
        'Phương trình dao động điều hòa: x = A·cos(ωt + φ)',
        'Chu kỳ T = 2π/ω, tần số f = 1/T = ω/(2π)',
        'Vận tốc: v = -Aω·sin(ωt + φ), Gia tốc: a = -ω²x',
        'Con lắc lò xo: T = 2π·√(m/k), Con lắc đơn: T = 2π·√(l/g)',
        'Năng lượng dao động: W = ½kA² = ½mω²A² (bảo toàn)',
        'Cộng hưởng xảy ra khi f_ngoại = f_riêng → biên độ cực đại'
      ],
      skills: [
        'Viết phương trình dao động từ điều kiện ban đầu',
        'Xác định biên độ, chu kỳ, tần số, pha ban đầu',
        'Tính vận tốc, gia tốc tại thời điểm bất kỳ',
        'Giải bài toán con lắc lò xo và con lắc đơn',
        'Phân tích năng lượng: thế năng, động năng trong dao động'
      ],
      content: `
# ${title.toUpperCase()}
## Chương trình học AI-Generated - Trình độ: ${difficultyLabel}

---

## 📚 PHẦN 1: KHÁI NIỆM DAO ĐỘNG CƠ

### 1.1. Định nghĩa
**Dao động cơ** là chuyển động lặp đi lặp lại quanh một vị trí cân bằng.

**Dao động điều hòa** là dao động mà li độ x biến thiên theo hàm cosin (hoặc sin) của thời gian:

    x = A·cos(ωt + φ)

Trong đó:
- **A** (biên độ): li độ cực đại, A > 0
- **ω** (tần số góc): ω = 2πf = 2π/T (rad/s)
- **φ** (pha ban đầu): xác định trạng thái dao động tại t = 0

### 1.2. Các đại lượng đặc trưng

**🔷 Chu kỳ và tần số:**
- Chu kỳ T: thời gian thực hiện một dao động toàn phần (s)
- Tần số f = 1/T: số dao động trong 1 giây (Hz)
- Tần số góc: ω = 2π/T = 2πf (rad/s)

**🔷 Vận tốc và gia tốc:**

    v = x' = -Aω·sin(ωt + φ)
    a = v' = -Aω²·cos(ωt + φ) = -ω²·x

**📌 Nhận xét:**
- |v_max| = Aω (tại VTCB, x = 0)
- |a_max| = Aω² (tại biên, x = ±A)
- Gia tốc luôn hướng về VTCB: a = -ω²x

---

## 🔢 PHẦN 2: CON LẮC LÒ XO

### 2.1. Công thức chu kỳ
    T = 2π·√(m/k)

### 2.2. Lực phục hồi
    F = -kx → ω² = k/m

**📌 Ví dụ:** m = 100g, k = 40 N/m
    ω = √(k/m) = √(40/0.1) = 20 rad/s
    T = 2π/20 ≈ 0.314 s

---

## ⚙️ PHẦN 3: CON LẮC ĐƠN

    T = 2π·√(l/g)

- Chu kỳ không phụ thuộc vào khối lượng
- Ứng dụng: đo gia tốc trọng trường g

---

## 📈 PHẦN 4: NĂNG LƯỢNG DAO ĐỘNG

- **Động năng:** Wđ = ½mv²
- **Thế năng:** Wt = ½kx²
- **Cơ năng:** W = Wđ + Wt = ½kA² = const

---

## 💡 PHẦN 5: DAO ĐỘNG TẮT DẦN VÀ CƯỠNG BỨC

- **Tắt dần:** biên độ giảm do ma sát
- **Cưỡng bức:** có ngoại lực tuần hoàn
- **Cộng hưởng:** f_ngoại = f_riêng → biên độ cực đại

---

## 🎯 TÓM TẮT

✅ x = A·cos(ωt + φ)
✅ Con lắc lò xo: T = 2π·√(m/k)
✅ Con lắc đơn: T = 2π·√(l/g)
✅ W = ½kA² = const

💪 **Hãy làm bài tập để củng cố kiến thức!**
      `
    },
    exercises: [
      {
        type: 'multiple_choice' as const,
        question: '**Câu 1:** Một vật dao động điều hòa x = 5·cos(4πt + π/3) cm. Biên độ và tần số góc là:\\n\\n_Gợi ý: So sánh với x = A·cos(ωt + φ)_',
        options: ['A. A = 5 cm, ω = 4π rad/s', 'B. A = 5 cm, ω = 4 rad/s', 'C. A = 4π cm, ω = 5 rad/s', 'D. A = 5 cm, ω = π/3 rad/s'],
        correctAnswer: 0,
        points: 15
      },
      {
        type: 'multiple_choice' as const,
        question: '**Câu 2:** Con lắc lò xo m = 200g, k = 80 N/m. Chu kỳ T = ?\\n\\n_Gợi ý: T = 2π·√(m/k)_',
        options: ['A. T ≈ 0.14 s', 'B. T ≈ 0.31 s', 'C. T ≈ 0.50 s', 'D. T ≈ 1.00 s'],
        correctAnswer: 1,
        points: 15
      },
      {
        type: 'multiple_choice' as const,
        question: '**Câu 3:** Trong dao động điều hòa, gia tốc của vật:\\n\\n_Gợi ý: a = -ω²x_',
        options: ['A. Luôn cùng chiều với vận tốc', 'B. Luôn hướng về vị trí cân bằng', 'C. Cực đại tại VTCB', 'D. Bằng 0 tại biên'],
        correctAnswer: 1,
        points: 15
      },
      {
        type: 'multiple_choice' as const,
        question: '**Câu 4:** Cộng hưởng xảy ra khi:',
        options: ['A. Biên độ ngoại lực = biên độ dao động', 'B. Tần số ngoại lực = tần số riêng', 'C. Lực cản = 0', 'D. Dao động tắt dần hoàn toàn'],
        correctAnswer: 1,
        points: 20
      },
      {
        type: 'short_answer' as const,
        question: '**Câu 5:** Con lắc lò xo: A = 10 cm, f = 2 Hz, m = 0.5 kg.\\nTính: a) ω  b) k  c) Cơ năng W\\n\\n_Gợi ý: ω = 2πf, k = mω², W = ½kA²_',
        rubric: 'a) ω = 4π ≈ 12.57 rad/s\\nb) k = mω² ≈ 78.96 N/m\\nc) W = ½kA² ≈ 0.395 J',
        points: 15
      },
      {
        type: 'essay' as const,
        question: '**Câu 6:** Con lắc lò xo nằm ngang k = 100 N/m, m = 400g. Kéo ra 8cm rồi thả nhẹ.\\n\\n**Yêu cầu:**\\n1. Viết phương trình x(t)\\n2. Tính v_max\\n3. Tính Wđ, Wt khi x = 4 cm\\n4. Thời điểm x = 4 cm lần đầu',
        rubric: '1. ω = √(k/m) = √250 ≈ 15.81 rad/s, x = 8·cos(√250·t) cm\\n2. v_max = Aω ≈ 1.265 m/s\\n3. Wt = 0.08 J, W = 0.32 J, Wđ = 0.24 J\\n4. t = π/(3√250) ≈ 0.066 s',
        points: 20
      }
    ]
  });

  /** Sóng cơ specific content */
  const getSongCoContent = (title: string, difficultyLabel: string): LessonContent => ({
    theory: {
      objectives: [
        'Hiểu khái niệm sóng cơ và phân biệt sóng dọc, sóng ngang',
        'Nắm phương trình sóng và các đại lượng đặc trưng',
        'Giải thích hiện tượng giao thoa, nhiễu xạ, phản xạ sóng',
        'Áp dụng kiến thức sóng vào sóng âm và sóng dừng'
      ],
      knowledge: [
        'Sóng cơ là dao động lan truyền trong môi trường vật chất',
        'Phương trình sóng: u = A·cos(2πft - 2πx/λ)',
        'Bước sóng λ = v·T = v/f',
        'Giao thoa: cực đại khi Δd = kλ, cực tiểu khi Δd = (k+0.5)λ',
        'Sóng dừng: khoảng cách 2 nút liên tiếp = λ/2'
      ],
      skills: [
        'Viết phương trình sóng tại một điểm',
        'Tính bước sóng, tần số, vận tốc truyền sóng',
        'Xác định vị trí cực đại, cực tiểu giao thoa',
        'Giải bài toán sóng dừng trên dây'
      ],
      content: `
# ${title.toUpperCase()}
## Chương trình học AI-Generated - Trình độ: ${difficultyLabel}

---

## 📚 PHẦN 1: KHÁI NIỆM SÓNG CƠ

**Sóng cơ** là dao động cơ lan truyền trong một môi trường vật chất.
- **Sóng ngang:** phương dao động ⊥ phương truyền sóng
- **Sóng dọc:** phương dao động // phương truyền sóng

**Các đại lượng:** λ = v·T = v/f

---

## 🔢 PHẦN 2: PHƯƠNG TRÌNH SÓNG

    u(x,t) = A·cos(ωt - 2πx/λ)

---

## ⚙️ PHẦN 3: GIAO THOA SÓNG

- Cực đại: Δd = kλ (k ∈ Z)
- Cực tiểu: Δd = (k + 0.5)λ

---

## 📈 PHẦN 4: SÓNG DỪNG

- Nút sóng + Bụng sóng
- Khoảng cách 2 nút liên tiếp = λ/2

---

## 🎯 TÓM TẮT

✅ λ = v·T = v/f
✅ Giao thoa: cực đại khi Δd = kλ
✅ Sóng dừng: khoảng cách 2 nút = λ/2

💪 **Hãy làm bài tập để củng cố kiến thức!**
      `
    },
    exercises: getGenericExercises(title, 'Vật lý')
  });

  /** Đạo hàm specific content (original content, now properly scoped) */
  const getDaoHamContent = (title: string, difficultyLabel: string): LessonContent => ({
    theory: {
      objectives: [
        'Hiểu sâu về khái niệm đạo hàm và ý nghĩa hình học, vật lý',
        'Nắm vững các công thức và quy tắc tính đạo hàm',
        'Áp dụng đạo hàm để giải bài toán cực trị, tối ưu hóa',
        'Sử dụng đạo hàm để khảo sát và vẽ đồ thị hàm số'
      ],
      knowledge: [
        "Định nghĩa đạo hàm: f'(x₀) = lim[h→0] [f(x₀+h)-f(x₀)]/h",
        "Công thức đạo hàm cơ bản: (xⁿ)', (sin x)', (cos x)', (eˣ)', (ln x)'",
        "Quy tắc tích, thương, hàm hợp",
        "Ứng dụng: cực trị, khảo sát hàm số, tối ưu"
      ],
      skills: [
        'Tính đạo hàm các hàm cơ bản và phức tạp',
        'Giải bài toán cực trị, GTLN-GTNN',
        'Khảo sát hàm số và vẽ đồ thị',
        'Áp dụng vào bài toán thực tế'
      ],
      content: `
# ${title.toUpperCase()}
## Chương trình học AI-Generated - Trình độ: ${difficultyLabel}

---

## 📚 PHẦN 1: KHÁI NIỆM ĐẠO HÀM

f'(x₀) = lim[h→0] [f(x₀+h) - f(x₀)] / h

**Ý nghĩa:** Hệ số góc tiếp tuyến, tốc độ thay đổi

---

## 🔢 PHẦN 2: CÔNG THỨC CƠ BẢN

(xⁿ)' = n·xⁿ⁻¹, (sin x)' = cos x, (eˣ)' = eˣ, (ln x)' = 1/x

---

## ⚙️ PHẦN 3: QUY TẮC

- Tích: (uv)' = u'v + uv'
- Thương: (u/v)' = (u'v - uv')/v²
- Hàm hợp: [f(g(x))]' = f'(g(x))·g'(x)

---

## 📈 PHẦN 4: ỨNG DỤNG

- Khảo sát tính đơn điệu
- Tìm cực trị
- Bài toán tối ưu

---

## 🎯 TÓM TẮT

✅ Đạo hàm = tốc độ thay đổi
✅ Quy tắc: tích, thương, hàm hợp
✅ Ứng dụng: cực trị, khảo sát, tối ưu

💪 **Hãy làm bài tập để củng cố kiến thức!**
      `
    },
    exercises: [
      {
        type: 'multiple_choice' as const,
        question: "**Câu 1:** Cho f(x) = x³ - 3x² + 2. Tính f'(2) = ?",
        options: ["A. f'(2) = 0", "B. f'(2) = 6", "C. f'(2) = 12", "D. f'(2) = 18"],
        correctAnswer: 0,
        points: 15
      },
      {
        type: 'multiple_choice' as const,
        question: "**Câu 2:** Đạo hàm y = sin(2x) + cos(3x):",
        options: ["A. y' = cos(2x) - sin(3x)", "B. y' = 2cos(2x) - 3sin(3x)", "C. y' = -2sin(2x) + 3cos(3x)", "D. y' = cos(2x) + sin(3x)"],
        correctAnswer: 1,
        points: 15
      },
      {
        type: 'multiple_choice' as const,
        question: "**Câu 3:** Hàm y = x³ - 3x² + 2 đạt cực tiểu tại:",
        options: ['A. x = 0', 'B. x = 1', 'C. x = 2', 'D. x = 3'],
        correctAnswer: 2,
        points: 20
      },
      {
        type: 'short_answer' as const,
        question: "**Câu 4:** Tìm đạo hàm f(x) = (x²+1)·eˣ\\n\\n_Gợi ý: quy tắc tích_",
        rubric: "f'(x) = 2x·eˣ + (x²+1)·eˣ = (x+1)²·eˣ",
        points: 20
      },
      {
        type: 'essay' as const,
        question: "**Câu 5:** Bài toán tối ưu: 120m hàng rào rào vườn hình chữ nhật dọc sông (1 cạnh không rào). Tìm kích thước để S lớn nhất.",
        rubric: "x = 30m, y = 60m, S_max = 1800 m²",
        points: 30
      }
    ]
  });

  /** Generic exercises for any topic */
  const getGenericExercises = (title: string, subjectLabel: string): LessonContent['exercises'] => {
    return [
      {
        type: 'multiple_choice' as const,
        question: `**Câu 1:** Câu hỏi kiểm tra kiến thức cơ bản về ${title}.\n\nChọn đáp án đúng nhất.`,
        options: ['A. Đáp án A', 'B. Đáp án B', 'C. Đáp án C', 'D. Đáp án D'],
        correctAnswer: 0,
        points: 15
      },
      {
        type: 'multiple_choice' as const,
        question: `**Câu 2:** Câu hỏi vận dụng kiến thức ${title}.\n\nChọn phương án chính xác nhất.`,
        options: ['A. Đáp án A', 'B. Đáp án B', 'C. Đáp án C', 'D. Đáp án D'],
        correctAnswer: 1,
        points: 15
      },
      {
        type: 'multiple_choice' as const,
        question: `**Câu 3:** Câu hỏi phân tích về ${title}.\n\nXác định đáp án đúng.`,
        options: ['A. Đáp án A', 'B. Đáp án B', 'C. Đáp án C', 'D. Đáp án D'],
        correctAnswer: 2,
        points: 20
      },
      {
        type: 'short_answer' as const,
        question: `**Câu 4:** Trình bày ngắn gọn các khái niệm cơ bản về ${title}.\n\n_Yêu cầu:_\n- Nêu định nghĩa chính xác\n- Giải thích ý nghĩa\n- Cho ví dụ minh họa`,
        rubric: 'Đánh giá: độ chính xác định nghĩa, tính logic giải thích, chất lượng ví dụ.',
        points: 20
      },
      {
        type: 'essay' as const,
        question: `**Câu 5:** Bài tập tổng hợp về ${title}\n\nPhân tích và giải quyết vấn đề liên quan.\n\n**Yêu cầu:**\n1. Xác định dữ kiện\n2. Trình bày phương pháp\n3. Thực hiện tính toán\n4. Kiểm tra kết quả\n5. Kết luận`,
        rubric: 'Rubric: Dữ kiện (6đ), Phương pháp (6đ), Thực hiện (8đ), Kết luận (10đ)',
        points: 30
      }
    ];
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

