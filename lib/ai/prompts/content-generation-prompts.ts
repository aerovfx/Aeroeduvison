/**
 * Content Generation Prompts for AI-Powered Educational Content Creation
 *
 * Supports:
 * - Lesson generation (Vietnamese & English)
 * - Quiz/Question generation (MCQ, True/False, Short Answer)
 * - Presentation slides generation
 * - Video script generation
 *
 * Aligned with Vietnam's GDPT 2018 curriculum framework
 */

// ============================================================================
// SYSTEM PROMPTS
// ============================================================================

export const CONTENT_GENERATION_SYSTEM_PROMPTS = {
  vietnamese: `Bạn là một chuyên gia thiết kế nội dung giáo dục với hơn 15 năm kinh nghiệm trong việc phát triển tài liệu học tập cho học sinh Việt Nam.

**Nguyên tắc thiết kế:**
1. **Chính xác khoa học**: Nội dung phải chính xác, cập nhật và phù hợp với chương trình GDPT 2018
2. **Phù hợp độ tuổi**: Ngôn ngữ và ví dụ phải phù hợp với cấp học
3. **Dễ hiểu**: Giải thích rõ ràng, sử dụng tiếng Việt chuẩn
4. **Thực tế**: Kết nối với đời sống và ứng dụng thực tế
5. **Tư duy phản biện**: Khuyến khích tư duy phản biện và sáng tạo
6. **Tính tương tác**: Bao gồm hoạt động tương tác và thực hành

**Cấu trúc nội dung:**
- Mục tiêu học tập rõ ràng (SMART)
- Nội dung có tổ chức logic (giới thiệu → nội dung chính → tóm tắt)
- Ví dụ minh họa cụ thể
- Bài tập thực hành (3-5 câu hỏi)
- Tóm tắt và câu hỏi ôn tập

Luôn trả về kết quả dưới dạng JSON hợp lệ.`,

  english: `You are an expert educational content designer with over 15 years of experience in developing learning materials for students.

**Design Principles:**
1. **Scientific Accuracy**: Content must be accurate, up-to-date, and curriculum-aligned
2. **Age-Appropriate**: Language and examples suitable for the grade level
3. **Clear & Understandable**: Clear explanations using standard language
4. **Real-World Connections**: Connect to practical applications and real life
5. **Critical Thinking**: Encourage critical thinking and creativity
6. **Interactive**: Include interactive activities and practice

**Content Structure:**
- Clear learning objectives (SMART goals)
- Logically organized content (introduction → main content → summary)
- Concrete illustrative examples
- Practice exercises (3-5 questions)
- Summary and review questions

Always return results in valid JSON format.`
};

// ============================================================================
// LESSON GENERATION PROMPTS
// ============================================================================

export interface LessonRequest {
  topic: string;
  subject: string;
  grade: string;
  duration?: number; // minutes
  difficulty?: 'easy' | 'medium' | 'hard';
  additionalContext?: string;
  language?: 'vi' | 'en';
  curriculum?: string;
}

export interface LessonContent {
  title: string;
  objectives: string[];
  content: string; // Markdown formatted
  keyPoints: string[];
  exercises: string[];
  summary: string;
  duration: number;
  difficulty: string;
  grade: string;
  subject: string;
}

export function buildLessonPrompt(request: LessonRequest): string {
  const {
    topic,
    subject,
    grade,
    duration = 45,
    difficulty = 'medium',
    additionalContext = '',
    language = 'vi',
    curriculum = 'Vietnam GDPT 2018'
  } = request;

  if (language === 'vi') {
    return `Tạo một bài học hoàn chỉnh về chủ đề: "${topic}"

**Thông tin:**
- Môn học: ${subject}
- Lớp: ${grade}
- Thời lượng: ${duration} phút
- Độ khó: ${difficulty}
- Chương trình: ${curriculum}
${additionalContext ? `- Yêu cầu bổ sung: ${additionalContext}` : ''}

**Yêu cầu nội dung:**
1. **Tiêu đề bài học**: Ngắn gọn, hấp dẫn (tối đa 100 ký tự)

2. **Mục tiêu học tập** (3-5 mục tiêu SMART):
   - Sử dụng động từ hành động cụ thể (hiểu, phân tích, áp dụng, tổng hợp, đánh giá)
   - Mỗi mục tiêu nên đo lường được

3. **Nội dung bài học** (Markdown format):
   - **Giới thiệu** (5-10% thời lượng): Tạo hứng thú, kết nối kiến thức cũ
   - **Nội dung chính** (70-80% thời lượng):
     * Chia thành 3-5 phần nhỏ
     * Mỗi phần có giải thích rõ ràng
     * Bao gồm ví dụ minh họa cụ thể
     * Sử dụng hình ảnh, sơ đồ (mô tả bằng text)
   - **Tóm tắt** (10-15% thời lượng): Nhấn mạnh điểm chính

4. **Điểm chính** (5-7 điểm):
   - Các khái niệm quan trọng nhất
   - Công thức, định nghĩa cần nhớ
   - Ngắn gọn, dễ nhớ

5. **Bài tập thực hành** (3-5 câu hỏi):
   - 40% dễ (kiểm tra hiểu biết cơ bản)
   - 40% trung bình (áp dụng kiến thức)
   - 20% khó (phân tích, tổng hợp)

6. **Tóm tắt**: Kết luận bài học, liên kết với bài tiếp theo

**Định dạng JSON:**
\`\`\`json
{
  "title": "Tiêu đề bài học",
  "objectives": ["Mục tiêu 1", "Mục tiêu 2", ...],
  "content": "# Nội dung bài học\\n\\n## Giới thiệu\\n...\\n## Nội dung chính\\n...\\n## Tóm tắt\\n...",
  "keyPoints": ["Điểm chính 1", "Điểm chính 2", ...],
  "exercises": ["Bài tập 1", "Bài tập 2", ...],
  "summary": "Tóm tắt bài học",
  "duration": ${duration},
  "difficulty": "${difficulty}",
  "grade": "${grade}",
  "subject": "${subject}"
}
\`\`\`

Chỉ trả về JSON, không có text bổ sung.`;
  } else {
    return `Create a complete lesson plan for the topic: "${topic}"

**Information:**
- Subject: ${subject}
- Grade: ${grade}
- Duration: ${duration} minutes
- Difficulty: ${difficulty}
- Curriculum: ${curriculum}
${additionalContext ? `- Additional Requirements: ${additionalContext}` : ''}

**Content Requirements:**
1. **Lesson Title**: Concise, engaging (max 100 characters)

2. **Learning Objectives** (3-5 SMART objectives):
   - Use specific action verbs (understand, analyze, apply, synthesize, evaluate)
   - Each objective should be measurable

3. **Lesson Content** (Markdown format):
   - **Introduction** (5-10% of time): Create interest, connect prior knowledge
   - **Main Content** (70-80% of time):
     * Divide into 3-5 sections
     * Each section with clear explanations
     * Include concrete examples
     * Use images, diagrams (describe with text)
   - **Summary** (10-15% of time): Emphasize key points

4. **Key Points** (5-7 points):
   - Most important concepts
   - Formulas, definitions to remember
   - Concise, memorable

5. **Practice Exercises** (3-5 questions):
   - 40% easy (test basic understanding)
   - 40% medium (apply knowledge)
   - 20% hard (analyze, synthesize)

6. **Summary**: Lesson conclusion, link to next lesson

**JSON Format:**
\`\`\`json
{
  "title": "Lesson Title",
  "objectives": ["Objective 1", "Objective 2", ...],
  "content": "# Lesson Content\\n\\n## Introduction\\n...\\n## Main Content\\n...\\n## Summary\\n...",
  "keyPoints": ["Key Point 1", "Key Point 2", ...],
  "exercises": ["Exercise 1", "Exercise 2", ...],
  "summary": "Lesson summary",
  "duration": ${duration},
  "difficulty": "${difficulty}",
  "grade": "${grade}",
  "subject": "${subject}"
}
\`\`\`

Return only JSON, no additional text.`;
  }
}

// ============================================================================
// QUIZ/QUESTION GENERATION PROMPTS
// ============================================================================

export interface QuizRequest {
  topic: string;
  subject: string;
  grade: string;
  questionCount?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  questionTypes?: ('MCQ' | 'TRUE_FALSE' | 'SHORT_ANSWER')[];
  additionalContext?: string;
  language?: 'vi' | 'en';
}

export interface QuizQuestion {
  question: string;
  type: 'MCQ' | 'TRUE_FALSE' | 'SHORT_ANSWER';
  options?: string[]; // For MCQ
  correctAnswer: number | string; // Index for MCQ, boolean for TRUE_FALSE, string for SHORT_ANSWER
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  learningObjective?: string;
}

export interface QuizContent {
  title: string;
  questions: QuizQuestion[];
  metadata: {
    subject: string;
    grade: string;
    topic: string;
    totalQuestions: number;
    estimatedTime: number; // minutes
  };
}

export function buildQuizPrompt(request: QuizRequest): string {
  const {
    topic,
    subject,
    grade,
    questionCount = 10,
    difficulty = 'medium',
    questionTypes = ['MCQ'],
    additionalContext = '',
    language = 'vi'
  } = request;

  const difficultyDistribution = {
    easy: { easy: 80, medium: 15, hard: 5 },
    medium: { easy: 40, medium: 40, hard: 20 },
    hard: { easy: 20, medium: 40, hard: 40 }
  }[difficulty];

  if (language === 'vi') {
    return `Tạo ${questionCount} câu hỏi trắc nghiệm về chủ đề: "${topic}"

**Thông tin:**
- Môn học: ${subject}
- Lớp: ${grade}
- Số câu hỏi: ${questionCount}
- Độ khó tổng thể: ${difficulty}
- Loại câu hỏi: ${questionTypes.join(', ')}
${additionalContext ? `- Yêu cầu bổ sung: ${additionalContext}` : ''}

**Phân bố độ khó:**
- ${difficultyDistribution.easy}% câu dễ (kiến thức cơ bản, ghi nhớ)
- ${difficultyDistribution.medium}% câu trung bình (hiểu và áp dụng)
- ${difficultyDistribution.hard}% câu khó (phân tích, tổng hợp, đánh giá)

**Yêu cầu cho mỗi câu hỏi:**

1. **Câu hỏi rõ ràng**:
   - Ngắn gọn, dễ hiểu
   - Không mơ hồ hoặc gây nhầm lẫn
   - Tránh sử dụng phủ định kép

2. **Đáp án (với MCQ)**:
   - 4 lựa chọn (A, B, C, D)
   - 1 đáp án đúng duy nhất
   - 3 đáp án sai hợp lý (không quá dễ loại trừ)
   - Các lựa chọn có độ dài tương đương
   - Tránh "Tất cả các đáp án trên" hoặc "Không có đáp án nào đúng"

3. **Giải thích chi tiết**:
   - Tại sao đáp án đúng là đúng
   - Tại sao các đáp án khác sai
   - Kiến thức liên quan
   - Độ dài 2-4 câu

4. **Chất lượng câu hỏi**:
   - Kiểm tra hiểu biết sâu, không chỉ ghi nhớ
   - Phân biệt được học sinh giỏi và yếu
   - Không có manh mối gợi ý đáp án đúng
   - Phù hợp với cấp học

**Định dạng JSON:**
\`\`\`json
{
  "title": "Bài kiểm tra: ${topic}",
  "questions": [
    {
      "question": "Nội dung câu hỏi?",
      "type": "MCQ",
      "options": ["A. Đáp án 1", "B. Đáp án 2", "C. Đáp án 3", "D. Đáp án 4"],
      "correctAnswer": 0,
      "explanation": "Giải thích chi tiết tại sao đáp án A đúng và các đáp án khác sai.",
      "difficulty": "easy",
      "tags": ["tag1", "tag2"],
      "learningObjective": "Học sinh có thể..."
    }
  ],
  "metadata": {
    "subject": "${subject}",
    "grade": "${grade}",
    "topic": "${topic}",
    "totalQuestions": ${questionCount},
    "estimatedTime": ${Math.ceil(questionCount * 1.5)}
  }
}
\`\`\`

Chỉ trả về JSON, không có text bổ sung.`;
  } else {
    return `Create ${questionCount} quiz questions about: "${topic}"

**Information:**
- Subject: ${subject}
- Grade: ${grade}
- Question Count: ${questionCount}
- Overall Difficulty: ${difficulty}
- Question Types: ${questionTypes.join(', ')}
${additionalContext ? `- Additional Requirements: ${additionalContext}` : ''}

**Difficulty Distribution:**
- ${difficultyDistribution.easy}% easy (basic knowledge, recall)
- ${difficultyDistribution.medium}% medium (understanding and application)
- ${difficultyDistribution.hard}% hard (analysis, synthesis, evaluation)

**Requirements for Each Question:**

1. **Clear Question**:
   - Concise, easy to understand
   - No ambiguity or confusion
   - Avoid double negatives

2. **Answer Options (for MCQ)**:
   - 4 choices (A, B, C, D)
   - 1 correct answer only
   - 3 reasonable distractors (not obviously wrong)
   - Options of similar length
   - Avoid "All of the above" or "None of the above"

3. **Detailed Explanation**:
   - Why the correct answer is correct
   - Why other answers are wrong
   - Related knowledge
   - 2-4 sentences

4. **Question Quality**:
   - Test deep understanding, not just memorization
   - Discriminate between high and low performers
   - No clues pointing to correct answer
   - Age-appropriate

**JSON Format:**
\`\`\`json
{
  "title": "Quiz: ${topic}",
  "questions": [
    {
      "question": "Question content?",
      "type": "MCQ",
      "options": ["A. Option 1", "B. Option 2", "C. Option 3", "D. Option 4"],
      "correctAnswer": 0,
      "explanation": "Detailed explanation of why A is correct and others are wrong.",
      "difficulty": "easy",
      "tags": ["tag1", "tag2"],
      "learningObjective": "Students can..."
    }
  ],
  "metadata": {
    "subject": "${subject}",
    "grade": "${grade}",
    "topic": "${topic}",
    "totalQuestions": ${questionCount},
    "estimatedTime": ${Math.ceil(questionCount * 1.5)}
  }
}
\`\`\`

Return only JSON, no additional text.`;
  }
}

// ============================================================================
// PRESENTATION SLIDES GENERATION PROMPTS
// ============================================================================

export interface SlidesRequest {
  topic: string;
  subject: string;
  grade: string;
  slideCount?: number;
  duration?: number; // minutes
  additionalContext?: string;
  language?: 'vi' | 'en';
}

export interface Slide {
  slideNumber: number;
  title: string;
  content: string[];
  speakerNotes?: string;
  imagePrompt?: string; // Description for image generation
  layout: 'title' | 'content' | 'image' | 'split' | 'quote';
}

export interface SlidesContent {
  title: string;
  subtitle?: string;
  slides: Slide[];
  metadata: {
    subject: string;
    grade: string;
    topic: string;
    totalSlides: number;
    estimatedTime: number;
  };
}

export function buildSlidesPrompt(request: SlidesRequest): string {
  const {
    topic,
    subject,
    grade,
    slideCount = 10,
    duration = 20,
    additionalContext = '',
    language = 'vi'
  } = request;

  if (language === 'vi') {
    return `Tạo ${slideCount} slides thuyết trình về chủ đề: "${topic}"

**Thông tin:**
- Môn học: ${subject}
- Lớp: ${grade}
- Số slides: ${slideCount}
- Thời lượng: ${duration} phút
${additionalContext ? `- Yêu cầu bổ sung: ${additionalContext}` : ''}

**Cấu trúc slides:**
1. **Slide 1 - Tiêu đề**: Tên chủ đề, môn học, lớp
2. **Slide 2 - Mục tiêu**: 3-5 mục tiêu học tập
3. **Slide 3 - Động lực**: Tại sao chủ đề này quan trọng?
4. **Slides 4-${slideCount - 3} - Nội dung chính**:
   - Mỗi slide một ý chính
   - 3-5 bullet points mỗi slide
   - Kết hợp hình ảnh minh họa
5. **Slide ${slideCount - 2} - Ví dụ thực tế**: Ứng dụng trong đời sống
6. **Slide ${slideCount - 1} - Tóm tắt**: Điểm chính cần nhớ
7. **Slide ${slideCount} - Câu hỏi thảo luận**: 2-3 câu hỏi mở

**Yêu cầu cho mỗi slide:**
1. **Tiêu đề**: Ngắn gọn, thu hút (tối đa 60 ký tự)
2. **Nội dung**:
   - Bullet points ngắn (tối đa 10 từ/bullet)
   - Tối đa 5 bullets/slide
   - Sử dụng font lớn, dễ đọc
3. **Speaker Notes**: Ghi chú cho giảng viên (2-3 câu)
4. **Image Prompt**: Mô tả hình ảnh minh họa (nếu cần)
5. **Layout**: title | content | image | split | quote

**Định dạng JSON:**
\`\`\`json
{
  "title": "${topic}",
  "subtitle": "Môn ${subject} - Lớp ${grade}",
  "slides": [
    {
      "slideNumber": 1,
      "title": "Tiêu đề slide",
      "content": ["Điểm 1", "Điểm 2", "Điểm 3"],
      "speakerNotes": "Ghi chú cho giảng viên",
      "imagePrompt": "Mô tả hình ảnh cần minh họa",
      "layout": "content"
    }
  ],
  "metadata": {
    "subject": "${subject}",
    "grade": "${grade}",
    "topic": "${topic}",
    "totalSlides": ${slideCount},
    "estimatedTime": ${duration}
  }
}
\`\`\`

Chỉ trả về JSON, không có text bổ sung.`;
  } else {
    return `Create ${slideCount} presentation slides about: "${topic}"

**Information:**
- Subject: ${subject}
- Grade: ${grade}
- Slide Count: ${slideCount}
- Duration: ${duration} minutes
${additionalContext ? `- Additional Requirements: ${additionalContext}` : ''}

**Slide Structure:**
1. **Slide 1 - Title**: Topic name, subject, grade
2. **Slide 2 - Objectives**: 3-5 learning objectives
3. **Slide 3 - Motivation**: Why is this topic important?
4. **Slides 4-${slideCount - 3} - Main Content**:
   - One main idea per slide
   - 3-5 bullet points per slide
   - Include illustrative images
5. **Slide ${slideCount - 2} - Real Example**: Real-world application
6. **Slide ${slideCount - 1} - Summary**: Key points to remember
7. **Slide ${slideCount} - Discussion**: 2-3 open-ended questions

**Requirements for Each Slide:**
1. **Title**: Concise, engaging (max 60 characters)
2. **Content**:
   - Short bullet points (max 10 words/bullet)
   - Max 5 bullets/slide
   - Use large, readable font
3. **Speaker Notes**: Notes for presenter (2-3 sentences)
4. **Image Prompt**: Image description (if needed)
5. **Layout**: title | content | image | split | quote

**JSON Format:**
\`\`\`json
{
  "title": "${topic}",
  "subtitle": "${subject} - Grade ${grade}",
  "slides": [
    {
      "slideNumber": 1,
      "title": "Slide Title",
      "content": ["Point 1", "Point 2", "Point 3"],
      "speakerNotes": "Notes for presenter",
      "imagePrompt": "Description of image to illustrate",
      "layout": "content"
    }
  ],
  "metadata": {
    "subject": "${subject}",
    "grade": "${grade}",
    "topic": "${topic}",
    "totalSlides": ${slideCount},
    "estimatedTime": ${duration}
  }
}
\`\`\`

Return only JSON, no additional text.`;
  }
}

// ============================================================================
// VIDEO SCRIPT GENERATION PROMPTS
// ============================================================================

export interface VideoScriptRequest {
  topic: string;
  subject: string;
  grade: string;
  duration?: number; // minutes
  tone?: 'formal' | 'casual' | 'enthusiastic';
  additionalContext?: string;
  language?: 'vi' | 'en';
}

export interface ScriptSegment {
  timestamp: string; // "00:00-01:30"
  scene: string;
  narration: string;
  visuals: string;
  onScreenText?: string;
}

export interface VideoScriptContent {
  title: string;
  hook: string; // Opening hook (first 30 seconds)
  segments: ScriptSegment[];
  callToAction: string;
  metadata: {
    subject: string;
    grade: string;
    topic: string;
    totalDuration: number;
    tone: string;
  };
}

export function buildVideoScriptPrompt(request: VideoScriptRequest): string {
  const {
    topic,
    subject,
    grade,
    duration = 5,
    tone = 'enthusiastic',
    additionalContext = '',
    language = 'vi'
  } = request;

  const segmentCount = Math.ceil(duration / 1.5); // ~1.5 min per segment

  if (language === 'vi') {
    return `Tạo kịch bản video giáo dục ${duration} phút về chủ đề: "${topic}"

**Thông tin:**
- Môn học: ${subject}
- Lớp: ${grade}
- Thời lượng: ${duration} phút
- Giọng điệu: ${tone}
${additionalContext ? `- Yêu cầu bổ sung: ${additionalContext}` : ''}

**Cấu trúc kịch bản:**

1. **Hook (30 giây đầu)**:
   - Thu hút sự chú ý ngay lập tức
   - Đặt câu hỏi hoặc tình huống thú vị
   - Nêu rõ video sẽ giúp gì cho người xem

2. **Nội dung chính (${segmentCount - 2} phân đoạn)**:
   Mỗi phân đoạn (~1-2 phút) bao gồm:
   - **Scene**: Mô tả cảnh quay (close-up, wide shot, animation, etc.)
   - **Narration**: Lời thoại của người dẫn (tự nhiên, dễ hiểu)
   - **Visuals**: Hình ảnh, đồ họa, animation cần hiển thị
   - **On-Screen Text**: Text quan trọng cần hiển thị trên màn hình

3. **Tóm tắt & Call-to-Action (30 giây cuối)**:
   - Nhắc lại điểm chính
   - Kêu gọi hành động (làm bài tập, đăng ký, chia sẻ)

**Yêu cầu kịch bản:**
- Ngôn ngữ tự nhiên, gần gũi
- Tránh thuật ngữ phức tạp (hoặc giải thích rõ)
- Sử dụng ví dụ cụ thể, dễ hình dung
- Tốc độ nói: 150-160 từ/phút
- Đảm bảo hấp dẫn, không nhàm chán

**Định dạng JSON:**
\`\`\`json
{
  "title": "${topic}",
  "hook": "30 giây đầu thu hút (câu hỏi hoặc tình huống thú vị)...",
  "segments": [
    {
      "timestamp": "00:00-01:30",
      "scene": "Mô tả cảnh quay",
      "narration": "Lời thoại của người dẫn...",
      "visuals": "Hình ảnh, đồ họa cần hiển thị...",
      "onScreenText": "Text quan trọng trên màn hình"
    }
  ],
  "callToAction": "Kêu gọi hành động cuối video...",
  "metadata": {
    "subject": "${subject}",
    "grade": "${grade}",
    "topic": "${topic}",
    "totalDuration": ${duration},
    "tone": "${tone}"
  }
}
\`\`\`

Chỉ trả về JSON, không có text bổ sung.`;
  } else {
    return `Create a ${duration}-minute educational video script about: "${topic}"

**Information:**
- Subject: ${subject}
- Grade: ${grade}
- Duration: ${duration} minutes
- Tone: ${tone}
${additionalContext ? `- Additional Requirements: ${additionalContext}` : ''}

**Script Structure:**

1. **Hook (First 30 seconds)**:
   - Grab attention immediately
   - Ask a question or present interesting scenario
   - State what the video will help viewers learn

2. **Main Content (${segmentCount - 2} segments)**:
   Each segment (~1-2 minutes) includes:
   - **Scene**: Shot description (close-up, wide shot, animation, etc.)
   - **Narration**: Speaker dialogue (natural, easy to understand)
   - **Visuals**: Images, graphics, animations to display
   - **On-Screen Text**: Important text to display on screen

3. **Summary & Call-to-Action (Last 30 seconds)**:
   - Recap key points
   - Call to action (do exercises, subscribe, share)

**Script Requirements:**
- Natural, friendly language
- Avoid complex jargon (or explain clearly)
- Use concrete, easy-to-visualize examples
- Speaking rate: 150-160 words/minute
- Engaging, not boring

**JSON Format:**
\`\`\`json
{
  "title": "${topic}",
  "hook": "First 30 seconds hook (question or interesting scenario)...",
  "segments": [
    {
      "timestamp": "00:00-01:30",
      "scene": "Shot description",
      "narration": "Speaker dialogue...",
      "visuals": "Images, graphics to display...",
      "onScreenText": "Important on-screen text"
    }
  ],
  "callToAction": "Final call to action...",
  "metadata": {
    "subject": "${subject}",
    "grade": "${grade}",
    "topic": "${topic}",
    "totalDuration": ${duration},
    "tone": "${tone}"
  }
}
\`\`\`

Return only JSON, no additional text.`;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse JSON response from AI, handling markdown code blocks
 */
export function parseContentJSON<T>(response: string): T {
  try {
    // Remove markdown code blocks if present
    let cleaned = response.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/```\n?/g, '');
    }

    return JSON.parse(cleaned) as T;
  } catch (error) {
    throw new Error(`Failed to parse content JSON: ${error}`);
  }
}

/**
 * Validate lesson content structure
 */
export function validateLessonContent(content: any): content is LessonContent {
  return (
    typeof content.title === 'string' &&
    Array.isArray(content.objectives) &&
    typeof content.content === 'string' &&
    Array.isArray(content.keyPoints) &&
    Array.isArray(content.exercises) &&
    typeof content.summary === 'string'
  );
}

/**
 * Validate quiz content structure
 */
export function validateQuizContent(content: any): content is QuizContent {
  return (
    typeof content.title === 'string' &&
    Array.isArray(content.questions) &&
    content.questions.every((q: any) =>
      typeof q.question === 'string' &&
      typeof q.explanation === 'string'
    ) &&
    typeof content.metadata === 'object'
  );
}

/**
 * Validate slides content structure
 */
export function validateSlidesContent(content: any): content is SlidesContent {
  return (
    typeof content.title === 'string' &&
    Array.isArray(content.slides) &&
    content.slides.every((s: any) =>
      typeof s.slideNumber === 'number' &&
      typeof s.title === 'string' &&
      Array.isArray(s.content)
    ) &&
    typeof content.metadata === 'object'
  );
}

/**
 * Validate video script content structure
 */
export function validateVideoScriptContent(content: any): content is VideoScriptContent {
  return (
    typeof content.title === 'string' &&
    typeof content.hook === 'string' &&
    Array.isArray(content.segments) &&
    content.segments.every((s: any) =>
      typeof s.timestamp === 'string' &&
      typeof s.narration === 'string' &&
      typeof s.visuals === 'string'
    ) &&
    typeof content.callToAction === 'string' &&
    typeof content.metadata === 'object'
  );
}

/**
 * Calculate estimated tokens for a request
 */
export function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters for English, 2-3 for Vietnamese
  const avgCharsPerToken = 3.5;
  return Math.ceil(text.length / avgCharsPerToken);
}

/**
 * Get system prompt based on language
 */
export function getSystemPrompt(language: 'vi' | 'en' = 'vi'): string {
  return CONTENT_GENERATION_SYSTEM_PROMPTS[language];
}
