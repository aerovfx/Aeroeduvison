/**
 * English curriculum — Duolingo-style, lứa Mẫu giáo → THPT.
 *
 * Cấu trúc: Band (lứa tuổi) → Unit (chủ đề) → Lesson (bài) → Word (từ/cụm).
 * Bài tập KHÔNG cần soạn tay: lesson player tự sinh nhiều dạng exercise từ
 * danh sách `words` (chọn nghĩa, nghe chọn, ghép cặp, gõ lại, phát âm).
 * → Thêm nội dung = chỉ cần thêm Word, rất gọn & dễ mở rộng.
 *
 * Mỗi Word có `id` ổn định để SRS (lib/srs.ts) lên lịch ôn tập.
 */

export type Band = 'kindergarten' | 'primary' | 'secondary' | 'highschool'

export interface EnWord {
  /** id ổn định cho SRS — KHÔNG đổi sau khi đã phát hành */
  id: string
  /** từ/cụm tiếng Anh */
  en: string
  /** nghĩa tiếng Việt */
  vi: string
  /** phiên âm IPA (tuỳ chọn) */
  ipa?: string
  /** câu ví dụ tiếng Anh */
  example?: string
  /** dịch câu ví dụ */
  exampleVi?: string
  /** emoji minh hoạ (thân thiện trẻ nhỏ) */
  emoji?: string
}

export interface EnLesson {
  id: string
  title: string
  titleVi: string
  /** emoji icon cho node trên skill-tree */
  icon: string
  words: EnWord[]
}

export interface EnUnit {
  id: string
  title: string
  titleVi: string
  band: Band
  /** mức CEFR ước lượng */
  cefr: string
  /** màu accent (hex) cho path */
  color: string
  lessons: EnLesson[]
}

export interface EnBand {
  id: Band
  label: string
  labelVi: string
  /** mô tả lứa tuổi */
  ageVi: string
  cefr: string
  color: string
  emoji: string
  units: EnUnit[]
}

// ─── Helper sinh word gọn ────────────────────────────────────────────────
const w = (
  id: string, en: string, vi: string,
  opts: { ipa?: string; example?: string; exampleVi?: string; emoji?: string } = {},
): EnWord => ({ id, en, vi, ...opts })

// ══════════════════════════════════════════════════════════════════════════
// MẪU GIÁO (Pre-A1) — chữ cái, chào hỏi, màu sắc, số, con vật
// ══════════════════════════════════════════════════════════════════════════
const KINDERGARTEN: EnUnit[] = [
  {
    id: 'kg-greet', title: 'Hello!', titleVi: 'Chào hỏi', band: 'kindergarten',
    cefr: 'Pre-A1', color: '#58cc02',
    lessons: [
      {
        id: 'kg-greet-l1', title: 'Greetings', titleVi: 'Lời chào', icon: '👋',
        words: [
          w('en-kg-greet-hello', 'hello', 'xin chào', { ipa: '/həˈloʊ/', emoji: '👋', example: 'Hello! How are you?', exampleVi: 'Xin chào! Bạn khoẻ không?' }),
          w('en-kg-greet-hi', 'hi', 'chào', { ipa: '/haɪ/', emoji: '🙋', example: 'Hi, my friend!', exampleVi: 'Chào, bạn của tôi!' }),
          w('en-kg-greet-bye', 'goodbye', 'tạm biệt', { ipa: '/ˌɡʊdˈbaɪ/', emoji: '👋', example: 'Goodbye, see you!', exampleVi: 'Tạm biệt, hẹn gặp lại!' }),
          w('en-kg-greet-thanks', 'thank you', 'cảm ơn', { ipa: '/ˈθæŋk juː/', emoji: '🙏', example: 'Thank you very much!', exampleVi: 'Cảm ơn rất nhiều!' }),
          w('en-kg-greet-yes', 'yes', 'vâng/có', { ipa: '/jes/', emoji: '✅', example: 'Yes, I can!', exampleVi: 'Vâng, tôi làm được!' }),
          w('en-kg-greet-no', 'no', 'không', { ipa: '/noʊ/', emoji: '❌', example: 'No, thank you.', exampleVi: 'Không, cảm ơn.' }),
        ],
      },
      {
        id: 'kg-greet-l2', title: 'About me', titleVi: 'Về tôi', icon: '🧒',
        words: [
          w('en-kg-me-name', 'name', 'tên', { ipa: '/neɪm/', emoji: '🏷️', example: 'My name is Lan.', exampleVi: 'Tên tôi là Lan.' }),
          w('en-kg-me-friend', 'friend', 'bạn', { ipa: '/frend/', emoji: '🧑‍🤝‍🧑', example: 'You are my friend.', exampleVi: 'Bạn là bạn của tôi.' }),
          w('en-kg-me-teacher', 'teacher', 'giáo viên', { ipa: '/ˈtiːtʃər/', emoji: '👩‍🏫', example: 'She is my teacher.', exampleVi: 'Cô ấy là giáo viên của tôi.' }),
          w('en-kg-me-happy', 'happy', 'vui', { ipa: '/ˈhæpi/', emoji: '😄', example: 'I am happy!', exampleVi: 'Tôi vui!' }),
          w('en-kg-me-please', 'please', 'làm ơn', { ipa: '/pliːz/', emoji: '🥺', example: 'Help me, please.', exampleVi: 'Làm ơn giúp tôi.' }),
        ],
      },
    ],
  },
  {
    id: 'kg-color', title: 'Colors', titleVi: 'Màu sắc', band: 'kindergarten',
    cefr: 'Pre-A1', color: '#ce82ff',
    lessons: [
      {
        id: 'kg-color-l1', title: 'Colors', titleVi: 'Các màu', icon: '🎨',
        words: [
          w('en-kg-color-red', 'red', 'màu đỏ', { ipa: '/red/', emoji: '🔴', example: 'The apple is red.', exampleVi: 'Quả táo màu đỏ.' }),
          w('en-kg-color-blue', 'blue', 'màu xanh dương', { ipa: '/bluː/', emoji: '🔵', example: 'The sky is blue.', exampleVi: 'Bầu trời màu xanh.' }),
          w('en-kg-color-green', 'green', 'màu xanh lá', { ipa: '/ɡriːn/', emoji: '🟢', example: 'The leaf is green.', exampleVi: 'Chiếc lá màu xanh lá.' }),
          w('en-kg-color-yellow', 'yellow', 'màu vàng', { ipa: '/ˈjeloʊ/', emoji: '🟡', example: 'The sun is yellow.', exampleVi: 'Mặt trời màu vàng.' }),
          w('en-kg-color-black', 'black', 'màu đen', { ipa: '/blæk/', emoji: '⚫', example: 'The cat is black.', exampleVi: 'Con mèo màu đen.' }),
          w('en-kg-color-white', 'white', 'màu trắng', { ipa: '/waɪt/', emoji: '⚪', example: 'Milk is white.', exampleVi: 'Sữa màu trắng.' }),
        ],
      },
    ],
  },
  {
    id: 'kg-num', title: 'Numbers', titleVi: 'Con số', band: 'kindergarten',
    cefr: 'Pre-A1', color: '#1cb0f6',
    lessons: [
      {
        id: 'kg-num-l1', title: 'Numbers 1-5', titleVi: 'Số 1-5', icon: '🔢',
        words: [
          w('en-kg-num-one', 'one', 'một', { ipa: '/wʌn/', emoji: '1️⃣' }),
          w('en-kg-num-two', 'two', 'hai', { ipa: '/tuː/', emoji: '2️⃣' }),
          w('en-kg-num-three', 'three', 'ba', { ipa: '/θriː/', emoji: '3️⃣' }),
          w('en-kg-num-four', 'four', 'bốn', { ipa: '/fɔːr/', emoji: '4️⃣' }),
          w('en-kg-num-five', 'five', 'năm', { ipa: '/faɪv/', emoji: '5️⃣' }),
        ],
      },
    ],
  },
  {
    id: 'kg-animal', title: 'Animals', titleVi: 'Con vật', band: 'kindergarten',
    cefr: 'Pre-A1', color: '#ff9600',
    lessons: [
      {
        id: 'kg-animal-l1', title: 'Animals', titleVi: 'Con vật', icon: '🐶',
        words: [
          w('en-kg-animal-dog', 'dog', 'con chó', { ipa: '/dɔːɡ/', emoji: '🐶', example: 'The dog is big.', exampleVi: 'Con chó to.' }),
          w('en-kg-animal-cat', 'cat', 'con mèo', { ipa: '/kæt/', emoji: '🐱', example: 'The cat is small.', exampleVi: 'Con mèo nhỏ.' }),
          w('en-kg-animal-fish', 'fish', 'con cá', { ipa: '/fɪʃ/', emoji: '🐟', example: 'I see a fish.', exampleVi: 'Tôi thấy một con cá.' }),
          w('en-kg-animal-bird', 'bird', 'con chim', { ipa: '/bɜːrd/', emoji: '🐦', example: 'The bird can fly.', exampleVi: 'Con chim biết bay.' }),
          w('en-kg-animal-cow', 'cow', 'con bò', { ipa: '/kaʊ/', emoji: '🐮' }),
          w('en-kg-animal-duck', 'duck', 'con vịt', { ipa: '/dʌk/', emoji: '🦆' }),
        ],
      },
    ],
  },
]

// ══════════════════════════════════════════════════════════════════════════
// TIỂU HỌC (A1) — gia đình, trường học, đồ ăn, cơ thể
// ══════════════════════════════════════════════════════════════════════════
const PRIMARY: EnUnit[] = [
  {
    id: 'pr-family', title: 'Family', titleVi: 'Gia đình', band: 'primary',
    cefr: 'A1', color: '#58cc02',
    lessons: [
      {
        id: 'pr-family-l1', title: 'My family', titleVi: 'Gia đình tôi', icon: '👨‍👩‍👧',
        words: [
          w('en-pr-family-mother', 'mother', 'mẹ', { ipa: '/ˈmʌðər/', emoji: '👩', example: 'My mother is kind.', exampleVi: 'Mẹ tôi tốt bụng.' }),
          w('en-pr-family-father', 'father', 'bố', { ipa: '/ˈfɑːðər/', emoji: '👨', example: 'My father works hard.', exampleVi: 'Bố tôi làm việc chăm chỉ.' }),
          w('en-pr-family-sister', 'sister', 'chị/em gái', { ipa: '/ˈsɪstər/', emoji: '👧', example: 'I have one sister.', exampleVi: 'Tôi có một chị gái.' }),
          w('en-pr-family-brother', 'brother', 'anh/em trai', { ipa: '/ˈbrʌðər/', emoji: '👦', example: 'My brother is tall.', exampleVi: 'Anh tôi cao.' }),
          w('en-pr-family-baby', 'baby', 'em bé', { ipa: '/ˈbeɪbi/', emoji: '👶' }),
          w('en-pr-family-grandma', 'grandmother', 'bà', { ipa: '/ˈɡrænmʌðər/', emoji: '👵' }),
        ],
      },
    ],
  },
  {
    id: 'pr-school', title: 'School', titleVi: 'Trường học', band: 'primary',
    cefr: 'A1', color: '#1cb0f6',
    lessons: [
      {
        id: 'pr-school-l1', title: 'In class', titleVi: 'Trong lớp', icon: '🏫',
        words: [
          w('en-pr-school-book', 'book', 'quyển sách', { ipa: '/bʊk/', emoji: '📖', example: 'Open your book.', exampleVi: 'Mở sách ra.' }),
          w('en-pr-school-pen', 'pen', 'cây bút', { ipa: '/pen/', emoji: '🖊️', example: 'This is my pen.', exampleVi: 'Đây là bút của tôi.' }),
          w('en-pr-school-desk', 'desk', 'cái bàn', { ipa: '/desk/', emoji: '🪑' }),
          w('en-pr-school-bag', 'bag', 'cặp sách', { ipa: '/bæɡ/', emoji: '🎒' }),
          w('en-pr-school-read', 'read', 'đọc', { ipa: '/riːd/', emoji: '📚', example: 'I read every day.', exampleVi: 'Tôi đọc mỗi ngày.' }),
          w('en-pr-school-write', 'write', 'viết', { ipa: '/raɪt/', emoji: '✍️', example: 'Write your name.', exampleVi: 'Viết tên của bạn.' }),
        ],
      },
    ],
  },
  {
    id: 'pr-food', title: 'Food', titleVi: 'Đồ ăn', band: 'primary',
    cefr: 'A1', color: '#ff9600',
    lessons: [
      {
        id: 'pr-food-l1', title: 'Food & drink', titleVi: 'Ăn uống', icon: '🍎',
        words: [
          w('en-pr-food-rice', 'rice', 'cơm', { ipa: '/raɪs/', emoji: '🍚', example: 'I eat rice.', exampleVi: 'Tôi ăn cơm.' }),
          w('en-pr-food-water', 'water', 'nước', { ipa: '/ˈwɔːtər/', emoji: '💧', example: 'Drink water.', exampleVi: 'Uống nước.' }),
          w('en-pr-food-apple', 'apple', 'quả táo', { ipa: '/ˈæpl/', emoji: '🍎' }),
          w('en-pr-food-milk', 'milk', 'sữa', { ipa: '/mɪlk/', emoji: '🥛' }),
          w('en-pr-food-bread', 'bread', 'bánh mì', { ipa: '/bred/', emoji: '🍞' }),
          w('en-pr-food-egg', 'egg', 'trứng', { ipa: '/eɡ/', emoji: '🥚' }),
        ],
      },
    ],
  },
]

// ══════════════════════════════════════════════════════════════════════════
// THCS (A2-B1) — sinh hoạt hằng ngày, thì hiện tại, địa điểm
// ══════════════════════════════════════════════════════════════════════════
const SECONDARY: EnUnit[] = [
  {
    id: 'se-daily', title: 'Daily routine', titleVi: 'Sinh hoạt hằng ngày', band: 'secondary',
    cefr: 'A2', color: '#58cc02',
    lessons: [
      {
        id: 'se-daily-l1', title: 'My day', titleVi: 'Một ngày của tôi', icon: '⏰',
        words: [
          w('en-se-daily-wakeup', 'wake up', 'thức dậy', { ipa: '/weɪk ʌp/', emoji: '⏰', example: 'I wake up at six.', exampleVi: 'Tôi thức dậy lúc 6 giờ.' }),
          w('en-se-daily-breakfast', 'breakfast', 'bữa sáng', { ipa: '/ˈbrekfəst/', emoji: '🍳', example: 'I have breakfast.', exampleVi: 'Tôi ăn sáng.' }),
          w('en-se-daily-school', 'go to school', 'đi học', { ipa: '/ɡoʊ tə skuːl/', emoji: '🚸', example: 'I go to school by bike.', exampleVi: 'Tôi đi học bằng xe đạp.' }),
          w('en-se-daily-homework', 'homework', 'bài tập về nhà', { ipa: '/ˈhoʊmwɜːrk/', emoji: '📝', example: 'I do my homework.', exampleVi: 'Tôi làm bài tập.' }),
          w('en-se-daily-sleep', 'go to bed', 'đi ngủ', { ipa: '/ɡoʊ tə bed/', emoji: '🛏️', example: 'I go to bed at ten.', exampleVi: 'Tôi đi ngủ lúc 10 giờ.' }),
        ],
      },
    ],
  },
  {
    id: 'se-verbs', title: 'Common verbs', titleVi: 'Động từ thông dụng', band: 'secondary',
    cefr: 'A2', color: '#ce82ff',
    lessons: [
      {
        id: 'se-verbs-l1', title: 'Action verbs', titleVi: 'Động từ hành động', icon: '🏃',
        words: [
          w('en-se-verb-eat', 'eat', 'ăn', { ipa: '/iːt/', emoji: '🍽️', example: 'They eat lunch at noon.', exampleVi: 'Họ ăn trưa lúc 12 giờ.' }),
          w('en-se-verb-run', 'run', 'chạy', { ipa: '/rʌn/', emoji: '🏃', example: 'She runs fast.', exampleVi: 'Cô ấy chạy nhanh.' }),
          w('en-se-verb-play', 'play', 'chơi', { ipa: '/pleɪ/', emoji: '⚽', example: 'We play football.', exampleVi: 'Chúng tôi chơi bóng đá.' }),
          w('en-se-verb-study', 'study', 'học', { ipa: '/ˈstʌdi/', emoji: '📖', example: 'He studies English.', exampleVi: 'Anh ấy học tiếng Anh.' }),
          w('en-se-verb-speak', 'speak', 'nói', { ipa: '/spiːk/', emoji: '🗣️', example: 'I speak two languages.', exampleVi: 'Tôi nói hai thứ tiếng.' }),
          w('en-se-verb-listen', 'listen', 'lắng nghe', { ipa: '/ˈlɪsn/', emoji: '👂', example: 'Listen to the teacher.', exampleVi: 'Hãy nghe cô giáo.' }),
        ],
      },
    ],
  },
  {
    id: 'se-place', title: 'Places', titleVi: 'Địa điểm', band: 'secondary',
    cefr: 'B1', color: '#1cb0f6',
    lessons: [
      {
        id: 'se-place-l1', title: 'In the city', titleVi: 'Trong thành phố', icon: '🏙️',
        words: [
          w('en-se-place-hospital', 'hospital', 'bệnh viện', { ipa: '/ˈhɑːspɪtl/', emoji: '🏥', example: 'The hospital is near here.', exampleVi: 'Bệnh viện ở gần đây.' }),
          w('en-se-place-market', 'market', 'chợ', { ipa: '/ˈmɑːrkɪt/', emoji: '🛒', example: 'My mother goes to the market.', exampleVi: 'Mẹ tôi đi chợ.' }),
          w('en-se-place-library', 'library', 'thư viện', { ipa: '/ˈlaɪbreri/', emoji: '📚', example: 'I read in the library.', exampleVi: 'Tôi đọc sách ở thư viện.' }),
          w('en-se-place-station', 'station', 'nhà ga', { ipa: '/ˈsteɪʃn/', emoji: '🚉' }),
          w('en-se-place-park', 'park', 'công viên', { ipa: '/pɑːrk/', emoji: '🏞️', example: 'We walk in the park.', exampleVi: 'Chúng tôi đi dạo trong công viên.' }),
        ],
      },
    ],
  },
]

// ══════════════════════════════════════════════════════════════════════════
// THPT (B1-B2) — học thuật, môi trường, công nghệ, từ vựng luyện thi
// ══════════════════════════════════════════════════════════════════════════
const HIGHSCHOOL: EnUnit[] = [
  {
    id: 'hs-academic', title: 'Academic verbs', titleVi: 'Động từ học thuật', band: 'highschool',
    cefr: 'B1', color: '#58cc02',
    lessons: [
      {
        id: 'hs-academic-l1', title: 'Academic verbs', titleVi: 'Động từ học thuật', icon: '🎓',
        words: [
          w('en-hs-acad-analyze', 'analyze', 'phân tích', { ipa: '/ˈænəlaɪz/', emoji: '🔬', example: 'We analyze the data.', exampleVi: 'Chúng tôi phân tích dữ liệu.' }),
          w('en-hs-acad-describe', 'describe', 'mô tả', { ipa: '/dɪˈskraɪb/', emoji: '🖊️', example: 'Describe the chart.', exampleVi: 'Hãy mô tả biểu đồ.' }),
          w('en-hs-acad-compare', 'compare', 'so sánh', { ipa: '/kəmˈper/', emoji: '⚖️', example: 'Compare the two ideas.', exampleVi: 'So sánh hai ý tưởng.' }),
          w('en-hs-acad-explain', 'explain', 'giải thích', { ipa: '/ɪkˈspleɪn/', emoji: '💡', example: 'Explain your answer.', exampleVi: 'Giải thích câu trả lời của bạn.' }),
          w('en-hs-acad-suggest', 'suggest', 'đề xuất', { ipa: '/səˈdʒest/', emoji: '🙋', example: 'I suggest a new plan.', exampleVi: 'Tôi đề xuất một kế hoạch mới.' }),
          w('en-hs-acad-conclude', 'conclude', 'kết luận', { ipa: '/kənˈkluːd/', emoji: '✅', example: 'We conclude that it works.', exampleVi: 'Chúng tôi kết luận rằng nó hiệu quả.' }),
        ],
      },
    ],
  },
  {
    id: 'hs-environment', title: 'Environment', titleVi: 'Môi trường', band: 'highschool',
    cefr: 'B2', color: '#ff9600',
    lessons: [
      {
        id: 'hs-env-l1', title: 'Environment', titleVi: 'Môi trường', icon: '🌍',
        words: [
          w('en-hs-env-pollution', 'pollution', 'ô nhiễm', { ipa: '/pəˈluːʃn/', emoji: '🏭', example: 'Air pollution is a problem.', exampleVi: 'Ô nhiễm không khí là một vấn đề.' }),
          w('en-hs-env-climate', 'climate change', 'biến đổi khí hậu', { ipa: '/ˈklaɪmət tʃeɪndʒ/', emoji: '🌡️', example: 'Climate change affects us all.', exampleVi: 'Biến đổi khí hậu ảnh hưởng tất cả chúng ta.' }),
          w('en-hs-env-recycle', 'recycle', 'tái chế', { ipa: '/ˌriːˈsaɪkl/', emoji: '♻️', example: 'We should recycle plastic.', exampleVi: 'Chúng ta nên tái chế nhựa.' }),
          w('en-hs-env-renewable', 'renewable energy', 'năng lượng tái tạo', { ipa: '/rɪˈnuːəbl ˈenərdʒi/', emoji: '🔋', example: 'Solar is renewable energy.', exampleVi: 'Năng lượng mặt trời là năng lượng tái tạo.' }),
          w('en-hs-env-reduce', 'reduce', 'giảm thiểu', { ipa: '/rɪˈduːs/', emoji: '📉', example: 'Reduce, reuse, recycle.', exampleVi: 'Giảm thiểu, tái sử dụng, tái chế.' }),
        ],
      },
    ],
  },
  {
    id: 'hs-tech', title: 'Technology', titleVi: 'Công nghệ', band: 'highschool',
    cefr: 'B2', color: '#1cb0f6',
    lessons: [
      {
        id: 'hs-tech-l1', title: 'Technology', titleVi: 'Công nghệ', icon: '💻',
        words: [
          w('en-hs-tech-device', 'device', 'thiết bị', { ipa: '/dɪˈvaɪs/', emoji: '📱', example: 'A phone is a device.', exampleVi: 'Điện thoại là một thiết bị.' }),
          w('en-hs-tech-software', 'software', 'phần mềm', { ipa: '/ˈsɔːftwer/', emoji: '🧩', example: 'I install new software.', exampleVi: 'Tôi cài phần mềm mới.' }),
          w('en-hs-tech-ai', 'artificial intelligence', 'trí tuệ nhân tạo', { ipa: '/ˌɑːrtɪfɪʃl ɪnˈtelɪdʒəns/', emoji: '🤖', example: 'Artificial intelligence is powerful.', exampleVi: 'Trí tuệ nhân tạo rất mạnh mẽ.' }),
          w('en-hs-tech-data', 'data', 'dữ liệu', { ipa: '/ˈdeɪtə/', emoji: '📊', example: 'We collect data.', exampleVi: 'Chúng tôi thu thập dữ liệu.' }),
          w('en-hs-tech-network', 'network', 'mạng lưới', { ipa: '/ˈnetwɜːrk/', emoji: '🌐' }),
        ],
      },
    ],
  },
]

// ══════════════════════════════════════════════════════════════════════════
export const CURRICULUM: EnBand[] = [
  {
    id: 'kindergarten', label: 'Kindergarten', labelVi: 'Mẫu giáo',
    ageVi: '3–5 tuổi', cefr: 'Pre-A1', color: '#58cc02', emoji: '🧸', units: KINDERGARTEN,
  },
  {
    id: 'primary', label: 'Primary', labelVi: 'Tiểu học',
    ageVi: 'Lớp 1–5', cefr: 'A1', color: '#1cb0f6', emoji: '🎒', units: PRIMARY,
  },
  {
    id: 'secondary', label: 'Secondary', labelVi: 'THCS',
    ageVi: 'Lớp 6–9', cefr: 'A2–B1', color: '#ce82ff', emoji: '📘', units: SECONDARY,
  },
  {
    id: 'highschool', label: 'High school', labelVi: 'THPT',
    ageVi: 'Lớp 10–12', cefr: 'B1–B2', color: '#ff9600', emoji: '🎓', units: HIGHSCHOOL,
  },
]

// ─── Lookups ──────────────────────────────────────────────────────────────
export function getBand(bandId: Band): EnBand | undefined {
  return CURRICULUM.find(b => b.id === bandId)
}

export function getLesson(lessonId: string): { band: EnBand; unit: EnUnit; lesson: EnLesson } | undefined {
  for (const band of CURRICULUM) {
    for (const unit of band.units) {
      const lesson = unit.lessons.find(l => l.id === lessonId)
      if (lesson) return { band, unit, lesson }
    }
  }
  return undefined
}

/** Tất cả word (phẳng) — dùng cho flashcard "ôn tất cả" + tra cứu SRS */
export function allWords(): EnWord[] {
  const out: EnWord[] = []
  for (const band of CURRICULUM)
    for (const unit of band.units)
      for (const lesson of unit.lessons)
        out.push(...lesson.words)
  return out
}

/** Map id → word, để SRS due-card resolve nội dung */
export function wordById(): Record<string, EnWord> {
  const m: Record<string, EnWord> = {}
  for (const word of allWords()) m[word.id] = word
  return m
}

/** Đếm tổng lesson / word cho thống kê UI */
export function curriculumStats() {
  let lessons = 0, words = 0
  for (const band of CURRICULUM)
    for (const unit of band.units)
      for (const lesson of unit.lessons) { lessons++; words += lesson.words.length }
  return { bands: CURRICULUM.length, lessons, words }
}
