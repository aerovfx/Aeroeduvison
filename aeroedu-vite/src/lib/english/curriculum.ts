/**
 * English curriculum — HÀNH TRÌNH VŨ TRỤ (Space Journey) kiểu Duolingo.
 *
 * Lộ trình = chuỗi ĐIỂM ĐẾN (Destination) xếp theo khoảng cách từ Trái Đất:
 *   🌍 Trái Đất → 🌕 Mặt Trăng → ☄️ Sao Hoả → … → 🪐 hành tinh ngoài →
 *   ⭐ ngôi sao gần nhất → 🌌 dải Ngân Hà.
 * Càng đi xa, độ khó (CEFR) càng tăng — như leo level. Mỗi điểm đến chứa vài
 * "nhiệm vụ" (lesson). Bài tập tự sinh từ danh sách Word (xem exercises.ts).
 *
 * Mỗi Word có `id` ổn định cho SRS (lib/srs.ts) — KHÔNG đổi sau khi phát hành.
 */

export type Tier = 'launch' | 'beginner' | 'elementary' | 'intermediate' | 'advanced' | 'expert'

export interface EnWord {
  id: string
  en: string
  vi: string
  ipa?: string
  example?: string
  exampleVi?: string
  emoji?: string
}

export interface EnLesson {
  id: string
  title: string
  titleVi: string
  icon: string
  words: EnWord[]
}

/** Một điểm đến trong hành trình (1 hành tinh / trạm / vì sao) */
export interface Destination {
  id: string
  name: string          // tên tiếng Anh
  nameVi: string        // tên tiếng Việt
  emoji: string
  distanceVi: string    // mô tả khoảng cách (kể chuyện)
  tier: Tier
  cefr: string
  color: string         // accent hex
  blurbVi: string       // câu dẫn truyện ngắn
  lessons: EnLesson[]
}

const w = (
  id: string, en: string, vi: string,
  opts: { ipa?: string; example?: string; exampleVi?: string; emoji?: string } = {},
): EnWord => ({ id, en, vi, ...opts })

// ══════════════════════════════════════════════════════════════════════════
// 🌍 TRÁI ĐẤT — Bệ phóng (Pre-A1): chào hỏi, giới thiệu bản thân
// ══════════════════════════════════════════════════════════════════════════
const L_GREET: EnLesson = {
  id: 'kg-greet-l1', title: 'Greetings', titleVi: 'Lời chào', icon: '👋',
  words: [
    w('en-kg-greet-hello', 'hello', 'xin chào', { ipa: '/həˈloʊ/', emoji: '👋', example: 'Hello! How are you?', exampleVi: 'Xin chào! Bạn khoẻ không?' }),
    w('en-kg-greet-hi', 'hi', 'chào', { ipa: '/haɪ/', emoji: '🙋', example: 'Hi, my friend!', exampleVi: 'Chào, bạn của tôi!' }),
    w('en-kg-greet-bye', 'goodbye', 'tạm biệt', { ipa: '/ˌɡʊdˈbaɪ/', emoji: '👋', example: 'Goodbye, see you!', exampleVi: 'Tạm biệt, hẹn gặp lại!' }),
    w('en-kg-greet-thanks', 'thank you', 'cảm ơn', { ipa: '/ˈθæŋk juː/', emoji: '🙏', example: 'Thank you very much!', exampleVi: 'Cảm ơn rất nhiều!' }),
    w('en-kg-greet-yes', 'yes', 'vâng/có', { ipa: '/jes/', emoji: '✅', example: 'Yes, I can!', exampleVi: 'Vâng, tôi làm được!' }),
    w('en-kg-greet-no', 'no', 'không', { ipa: '/noʊ/', emoji: '❌', example: 'No, thank you.', exampleVi: 'Không, cảm ơn.' }),
  ],
}
const L_ABOUTME: EnLesson = {
  id: 'kg-greet-l2', title: 'About me', titleVi: 'Về tôi', icon: '🧒',
  words: [
    w('en-kg-me-name', 'name', 'tên', { ipa: '/neɪm/', emoji: '🏷️', example: 'My name is Lan.', exampleVi: 'Tên tôi là Lan.' }),
    w('en-kg-me-friend', 'friend', 'bạn', { ipa: '/frend/', emoji: '🧑‍🤝‍🧑', example: 'You are my friend.', exampleVi: 'Bạn là bạn của tôi.' }),
    w('en-kg-me-teacher', 'teacher', 'giáo viên', { ipa: '/ˈtiːtʃər/', emoji: '👩‍🏫', example: 'She is my teacher.', exampleVi: 'Cô ấy là giáo viên của tôi.' }),
    w('en-kg-me-happy', 'happy', 'vui', { ipa: '/ˈhæpi/', emoji: '😄', example: 'I am happy!', exampleVi: 'Tôi vui!' }),
    w('en-kg-me-please', 'please', 'làm ơn', { ipa: '/pliːz/', emoji: '🥺', example: 'Help me, please.', exampleVi: 'Làm ơn giúp tôi.' }),
  ],
}

// ══════════════════════════════════════════════════════════════════════════
// 🌕 MẶT TRĂNG (A1): số, màu sắc + từ vựng vũ trụ cơ bản (NEW)
// ══════════════════════════════════════════════════════════════════════════
const L_NUM: EnLesson = {
  id: 'kg-num-l1', title: 'Numbers 1-5', titleVi: 'Số 1-5', icon: '🔢',
  words: [
    w('en-kg-num-one', 'one', 'một', { ipa: '/wʌn/', emoji: '1️⃣' }),
    w('en-kg-num-two', 'two', 'hai', { ipa: '/tuː/', emoji: '2️⃣' }),
    w('en-kg-num-three', 'three', 'ba', { ipa: '/θriː/', emoji: '3️⃣' }),
    w('en-kg-num-four', 'four', 'bốn', { ipa: '/fɔːr/', emoji: '4️⃣' }),
    w('en-kg-num-five', 'five', 'năm', { ipa: '/faɪv/', emoji: '5️⃣' }),
  ],
}
const L_COLOR: EnLesson = {
  id: 'kg-color-l1', title: 'Colors', titleVi: 'Màu sắc', icon: '🎨',
  words: [
    w('en-kg-color-red', 'red', 'màu đỏ', { ipa: '/red/', emoji: '🔴', example: 'The apple is red.', exampleVi: 'Quả táo màu đỏ.' }),
    w('en-kg-color-blue', 'blue', 'màu xanh dương', { ipa: '/bluː/', emoji: '🔵', example: 'The sky is blue.', exampleVi: 'Bầu trời màu xanh.' }),
    w('en-kg-color-green', 'green', 'màu xanh lá', { ipa: '/ɡriːn/', emoji: '🟢', example: 'The leaf is green.', exampleVi: 'Chiếc lá màu xanh lá.' }),
    w('en-kg-color-yellow', 'yellow', 'màu vàng', { ipa: '/ˈjeloʊ/', emoji: '🟡', example: 'The sun is yellow.', exampleVi: 'Mặt trời màu vàng.' }),
    w('en-kg-color-black', 'black', 'màu đen', { ipa: '/blæk/', emoji: '⚫', example: 'Space is black.', exampleVi: 'Vũ trụ màu đen.' }),
    w('en-kg-color-white', 'white', 'màu trắng', { ipa: '/waɪt/', emoji: '⚪', example: 'The moon is white.', exampleVi: 'Mặt trăng màu trắng.' }),
  ],
}
const L_SPACE_BASIC: EnLesson = {
  id: 'moon-space-l1', title: 'Space basics', titleVi: 'Vũ trụ cơ bản', icon: '🌟',
  words: [
    w('en-moon-rocket', 'rocket', 'tên lửa', { ipa: '/ˈrɑːkɪt/', emoji: '🚀', example: 'The rocket flies up.', exampleVi: 'Tên lửa bay lên.' }),
    w('en-moon-star', 'star', 'ngôi sao', { ipa: '/stɑːr/', emoji: '⭐', example: 'I see a star.', exampleVi: 'Tôi thấy một ngôi sao.' }),
    w('en-moon-moon', 'moon', 'mặt trăng', { ipa: '/muːn/', emoji: '🌕', example: 'The moon is bright.', exampleVi: 'Mặt trăng sáng.' }),
    w('en-moon-sun', 'sun', 'mặt trời', { ipa: '/sʌn/', emoji: '☀️', example: 'The sun is hot.', exampleVi: 'Mặt trời nóng.' }),
    w('en-moon-planet', 'planet', 'hành tinh', { ipa: '/ˈplænɪt/', emoji: '🪐', example: 'Earth is a planet.', exampleVi: 'Trái Đất là một hành tinh.' }),
    w('en-moon-sky', 'sky', 'bầu trời', { ipa: '/skaɪ/', emoji: '🌌', example: 'Stars are in the sky.', exampleVi: 'Các ngôi sao ở trên bầu trời.' }),
  ],
}

// ══════════════════════════════════════════════════════════════════════════
// ☄️ SAO HOẢ (A1): con vật, đồ ăn
// ══════════════════════════════════════════════════════════════════════════
const L_ANIMAL: EnLesson = {
  id: 'kg-animal-l1', title: 'Animals', titleVi: 'Con vật', icon: '🐶',
  words: [
    w('en-kg-animal-dog', 'dog', 'con chó', { ipa: '/dɔːɡ/', emoji: '🐶', example: 'The dog is big.', exampleVi: 'Con chó to.' }),
    w('en-kg-animal-cat', 'cat', 'con mèo', { ipa: '/kæt/', emoji: '🐱', example: 'The cat is small.', exampleVi: 'Con mèo nhỏ.' }),
    w('en-kg-animal-fish', 'fish', 'con cá', { ipa: '/fɪʃ/', emoji: '🐟', example: 'I see a fish.', exampleVi: 'Tôi thấy một con cá.' }),
    w('en-kg-animal-bird', 'bird', 'con chim', { ipa: '/bɜːrd/', emoji: '🐦', example: 'The bird can fly.', exampleVi: 'Con chim biết bay.' }),
    w('en-kg-animal-cow', 'cow', 'con bò', { ipa: '/kaʊ/', emoji: '🐮' }),
    w('en-kg-animal-duck', 'duck', 'con vịt', { ipa: '/dʌk/', emoji: '🦆' }),
  ],
}
const L_FOOD: EnLesson = {
  id: 'pr-food-l1', title: 'Food & drink', titleVi: 'Ăn uống', icon: '🍎',
  words: [
    w('en-pr-food-rice', 'rice', 'cơm', { ipa: '/raɪs/', emoji: '🍚', example: 'I eat rice.', exampleVi: 'Tôi ăn cơm.' }),
    w('en-pr-food-water', 'water', 'nước', { ipa: '/ˈwɔːtər/', emoji: '💧', example: 'Drink water.', exampleVi: 'Uống nước.' }),
    w('en-pr-food-apple', 'apple', 'quả táo', { ipa: '/ˈæpl/', emoji: '🍎' }),
    w('en-pr-food-milk', 'milk', 'sữa', { ipa: '/mɪlk/', emoji: '🥛' }),
    w('en-pr-food-bread', 'bread', 'bánh mì', { ipa: '/bred/', emoji: '🍞' }),
    w('en-pr-food-egg', 'egg', 'trứng', { ipa: '/eɡ/', emoji: '🥚' }),
  ],
}

// ══════════════════════════════════════════════════════════════════════════
// ☿️ SAO THUỶ (A1): gia đình, trường học
// ══════════════════════════════════════════════════════════════════════════
const L_FAMILY: EnLesson = {
  id: 'pr-family-l1', title: 'My family', titleVi: 'Gia đình tôi', icon: '👨‍👩‍👧',
  words: [
    w('en-pr-family-mother', 'mother', 'mẹ', { ipa: '/ˈmʌðər/', emoji: '👩', example: 'My mother is kind.', exampleVi: 'Mẹ tôi tốt bụng.' }),
    w('en-pr-family-father', 'father', 'bố', { ipa: '/ˈfɑːðər/', emoji: '👨', example: 'My father works hard.', exampleVi: 'Bố tôi làm việc chăm chỉ.' }),
    w('en-pr-family-sister', 'sister', 'chị/em gái', { ipa: '/ˈsɪstər/', emoji: '👧', example: 'I have one sister.', exampleVi: 'Tôi có một chị gái.' }),
    w('en-pr-family-brother', 'brother', 'anh/em trai', { ipa: '/ˈbrʌðər/', emoji: '👦', example: 'My brother is tall.', exampleVi: 'Anh tôi cao.' }),
    w('en-pr-family-baby', 'baby', 'em bé', { ipa: '/ˈbeɪbi/', emoji: '👶' }),
    w('en-pr-family-grandma', 'grandmother', 'bà', { ipa: '/ˈɡrænmʌðər/', emoji: '👵' }),
  ],
}
const L_SCHOOL: EnLesson = {
  id: 'pr-school-l1', title: 'In class', titleVi: 'Trong lớp', icon: '🏫',
  words: [
    w('en-pr-school-book', 'book', 'quyển sách', { ipa: '/bʊk/', emoji: '📖', example: 'Open your book.', exampleVi: 'Mở sách ra.' }),
    w('en-pr-school-pen', 'pen', 'cây bút', { ipa: '/pen/', emoji: '🖊️', example: 'This is my pen.', exampleVi: 'Đây là bút của tôi.' }),
    w('en-pr-school-desk', 'desk', 'cái bàn', { ipa: '/desk/', emoji: '🪑' }),
    w('en-pr-school-bag', 'bag', 'cặp sách', { ipa: '/bæɡ/', emoji: '🎒' }),
    w('en-pr-school-read', 'read', 'đọc', { ipa: '/riːd/', emoji: '📚', example: 'I read every day.', exampleVi: 'Tôi đọc mỗi ngày.' }),
    w('en-pr-school-write', 'write', 'viết', { ipa: '/raɪt/', emoji: '✍️', example: 'Write your name.', exampleVi: 'Viết tên của bạn.' }),
  ],
}

// ══════════════════════════════════════════════════════════════════════════
// ♀️ SAO KIM (A2): sinh hoạt hằng ngày + thời tiết (NEW)
// ══════════════════════════════════════════════════════════════════════════
const L_DAILY: EnLesson = {
  id: 'se-daily-l1', title: 'My day', titleVi: 'Một ngày của tôi', icon: '⏰',
  words: [
    w('en-se-daily-wakeup', 'wake up', 'thức dậy', { ipa: '/weɪk ʌp/', emoji: '⏰', example: 'I wake up at six.', exampleVi: 'Tôi thức dậy lúc 6 giờ.' }),
    w('en-se-daily-breakfast', 'breakfast', 'bữa sáng', { ipa: '/ˈbrekfəst/', emoji: '🍳', example: 'I have breakfast.', exampleVi: 'Tôi ăn sáng.' }),
    w('en-se-daily-school', 'go to school', 'đi học', { ipa: '/ɡoʊ tə skuːl/', emoji: '🚸', example: 'I go to school by bike.', exampleVi: 'Tôi đi học bằng xe đạp.' }),
    w('en-se-daily-homework', 'homework', 'bài tập về nhà', { ipa: '/ˈhoʊmwɜːrk/', emoji: '📝', example: 'I do my homework.', exampleVi: 'Tôi làm bài tập.' }),
    w('en-se-daily-sleep', 'go to bed', 'đi ngủ', { ipa: '/ɡoʊ tə bed/', emoji: '🛏️', example: 'I go to bed at ten.', exampleVi: 'Tôi đi ngủ lúc 10 giờ.' }),
  ],
}
const L_WEATHER: EnLesson = {
  id: 'venus-weather-l1', title: 'Weather', titleVi: 'Thời tiết', icon: '🌦️',
  words: [
    w('en-venus-sunny', 'sunny', 'nắng', { ipa: '/ˈsʌni/', emoji: '☀️', example: 'It is sunny today.', exampleVi: 'Hôm nay trời nắng.' }),
    w('en-venus-rainy', 'rainy', 'mưa', { ipa: '/ˈreɪni/', emoji: '🌧️', example: 'It is rainy.', exampleVi: 'Trời mưa.' }),
    w('en-venus-hot', 'hot', 'nóng', { ipa: '/hɑːt/', emoji: '🔥', example: 'Venus is very hot.', exampleVi: 'Sao Kim rất nóng.' }),
    w('en-venus-cold', 'cold', 'lạnh', { ipa: '/koʊld/', emoji: '❄️', example: 'Space is cold.', exampleVi: 'Vũ trụ lạnh.' }),
    w('en-venus-windy', 'windy', 'gió', { ipa: '/ˈwɪndi/', emoji: '💨', example: 'It is windy.', exampleVi: 'Trời có gió.' }),
    w('en-venus-cloud', 'cloud', 'mây', { ipa: '/klaʊd/', emoji: '☁️' }),
  ],
}

// ══════════════════════════════════════════════════════════════════════════
// 🪐 SAO MỘC (A2): động từ hành động
// ══════════════════════════════════════════════════════════════════════════
const L_VERBS: EnLesson = {
  id: 'se-verbs-l1', title: 'Action verbs', titleVi: 'Động từ hành động', icon: '🏃',
  words: [
    w('en-se-verb-eat', 'eat', 'ăn', { ipa: '/iːt/', emoji: '🍽️', example: 'They eat lunch at noon.', exampleVi: 'Họ ăn trưa lúc 12 giờ.' }),
    w('en-se-verb-run', 'run', 'chạy', { ipa: '/rʌn/', emoji: '🏃', example: 'She runs fast.', exampleVi: 'Cô ấy chạy nhanh.' }),
    w('en-se-verb-play', 'play', 'chơi', { ipa: '/pleɪ/', emoji: '⚽', example: 'We play football.', exampleVi: 'Chúng tôi chơi bóng đá.' }),
    w('en-se-verb-study', 'study', 'học', { ipa: '/ˈstʌdi/', emoji: '📖', example: 'He studies English.', exampleVi: 'Anh ấy học tiếng Anh.' }),
    w('en-se-verb-speak', 'speak', 'nói', { ipa: '/spiːk/', emoji: '🗣️', example: 'I speak two languages.', exampleVi: 'Tôi nói hai thứ tiếng.' }),
    w('en-se-verb-listen', 'listen', 'lắng nghe', { ipa: '/ˈlɪsn/', emoji: '👂', example: 'Listen to the teacher.', exampleVi: 'Hãy nghe cô giáo.' }),
  ],
}

// ══════════════════════════════════════════════════════════════════════════
// 🪐 SAO THỔ (B1): địa điểm + phương hướng (NEW)
// ══════════════════════════════════════════════════════════════════════════
const L_PLACE: EnLesson = {
  id: 'se-place-l1', title: 'In the city', titleVi: 'Trong thành phố', icon: '🏙️',
  words: [
    w('en-se-place-hospital', 'hospital', 'bệnh viện', { ipa: '/ˈhɑːspɪtl/', emoji: '🏥', example: 'The hospital is near here.', exampleVi: 'Bệnh viện ở gần đây.' }),
    w('en-se-place-market', 'market', 'chợ', { ipa: '/ˈmɑːrkɪt/', emoji: '🛒', example: 'My mother goes to the market.', exampleVi: 'Mẹ tôi đi chợ.' }),
    w('en-se-place-library', 'library', 'thư viện', { ipa: '/ˈlaɪbreri/', emoji: '📚', example: 'I read in the library.', exampleVi: 'Tôi đọc sách ở thư viện.' }),
    w('en-se-place-station', 'station', 'nhà ga', { ipa: '/ˈsteɪʃn/', emoji: '🚉' }),
    w('en-se-place-park', 'park', 'công viên', { ipa: '/pɑːrk/', emoji: '🏞️', example: 'We walk in the park.', exampleVi: 'Chúng tôi đi dạo trong công viên.' }),
  ],
}
const L_DIRECTION: EnLesson = {
  id: 'saturn-dir-l1', title: 'Directions', titleVi: 'Phương hướng', icon: '🧭',
  words: [
    w('en-saturn-left', 'left', 'bên trái', { ipa: '/left/', emoji: '⬅️', example: 'Turn left.', exampleVi: 'Rẽ trái.' }),
    w('en-saturn-right', 'right', 'bên phải', { ipa: '/raɪt/', emoji: '➡️', example: 'Turn right.', exampleVi: 'Rẽ phải.' }),
    w('en-saturn-near', 'near', 'gần', { ipa: '/nɪr/', emoji: '📍', example: 'The shop is near.', exampleVi: 'Cửa hàng ở gần.' }),
    w('en-saturn-far', 'far', 'xa', { ipa: '/fɑːr/', emoji: '🛰️', example: 'Saturn is far away.', exampleVi: 'Sao Thổ ở rất xa.' }),
    w('en-saturn-between', 'between', 'ở giữa', { ipa: '/bɪˈtwiːn/', emoji: '↔️', example: 'It is between two houses.', exampleVi: 'Nó ở giữa hai ngôi nhà.' }),
    w('en-saturn-straight', 'straight', 'thẳng', { ipa: '/streɪt/', emoji: '⬆️', example: 'Go straight ahead.', exampleVi: 'Đi thẳng phía trước.' }),
  ],
}

// ══════════════════════════════════════════════════════════════════════════
// 🔵 SAO THIÊN VƯƠNG (B1): động từ học thuật
// ══════════════════════════════════════════════════════════════════════════
const L_ACADEMIC: EnLesson = {
  id: 'hs-academic-l1', title: 'Academic verbs', titleVi: 'Động từ học thuật', icon: '🎓',
  words: [
    w('en-hs-acad-analyze', 'analyze', 'phân tích', { ipa: '/ˈænəlaɪz/', emoji: '🔬', example: 'We analyze the data.', exampleVi: 'Chúng tôi phân tích dữ liệu.' }),
    w('en-hs-acad-describe', 'describe', 'mô tả', { ipa: '/dɪˈskraɪb/', emoji: '🖊️', example: 'Describe the chart.', exampleVi: 'Hãy mô tả biểu đồ.' }),
    w('en-hs-acad-compare', 'compare', 'so sánh', { ipa: '/kəmˈper/', emoji: '⚖️', example: 'Compare the two ideas.', exampleVi: 'So sánh hai ý tưởng.' }),
    w('en-hs-acad-explain', 'explain', 'giải thích', { ipa: '/ɪkˈspleɪn/', emoji: '💡', example: 'Explain your answer.', exampleVi: 'Giải thích câu trả lời của bạn.' }),
    w('en-hs-acad-suggest', 'suggest', 'đề xuất', { ipa: '/səˈdʒest/', emoji: '🙋', example: 'I suggest a new plan.', exampleVi: 'Tôi đề xuất một kế hoạch mới.' }),
    w('en-hs-acad-conclude', 'conclude', 'kết luận', { ipa: '/kənˈkluːd/', emoji: '✅', example: 'We conclude that it works.', exampleVi: 'Chúng tôi kết luận rằng nó hiệu quả.' }),
  ],
}

// ══════════════════════════════════════════════════════════════════════════
// 🔵 SAO HẢI VƯƠNG (B2): môi trường
// ══════════════════════════════════════════════════════════════════════════
const L_ENV: EnLesson = {
  id: 'hs-env-l1', title: 'Environment', titleVi: 'Môi trường', icon: '🌍',
  words: [
    w('en-hs-env-pollution', 'pollution', 'ô nhiễm', { ipa: '/pəˈluːʃn/', emoji: '🏭', example: 'Air pollution is a problem.', exampleVi: 'Ô nhiễm không khí là một vấn đề.' }),
    w('en-hs-env-climate', 'climate change', 'biến đổi khí hậu', { ipa: '/ˈklaɪmət tʃeɪndʒ/', emoji: '🌡️', example: 'Climate change affects us all.', exampleVi: 'Biến đổi khí hậu ảnh hưởng tất cả chúng ta.' }),
    w('en-hs-env-recycle', 'recycle', 'tái chế', { ipa: '/ˌriːˈsaɪkl/', emoji: '♻️', example: 'We should recycle plastic.', exampleVi: 'Chúng ta nên tái chế nhựa.' }),
    w('en-hs-env-renewable', 'renewable energy', 'năng lượng tái tạo', { ipa: '/rɪˈnuːəbl ˈenərdʒi/', emoji: '🔋', example: 'Solar is renewable energy.', exampleVi: 'Năng lượng mặt trời là năng lượng tái tạo.' }),
    w('en-hs-env-reduce', 'reduce', 'giảm thiểu', { ipa: '/rɪˈduːs/', emoji: '📉', example: 'Reduce, reuse, recycle.', exampleVi: 'Giảm thiểu, tái sử dụng, tái chế.' }),
  ],
}

// ══════════════════════════════════════════════════════════════════════════
// ⭐ ALPHA CENTAURI (B2): công nghệ
// ══════════════════════════════════════════════════════════════════════════
const L_TECH: EnLesson = {
  id: 'hs-tech-l1', title: 'Technology', titleVi: 'Công nghệ', icon: '💻',
  words: [
    w('en-hs-tech-device', 'device', 'thiết bị', { ipa: '/dɪˈvaɪs/', emoji: '📱', example: 'A phone is a device.', exampleVi: 'Điện thoại là một thiết bị.' }),
    w('en-hs-tech-software', 'software', 'phần mềm', { ipa: '/ˈsɔːftwer/', emoji: '🧩', example: 'I install new software.', exampleVi: 'Tôi cài phần mềm mới.' }),
    w('en-hs-tech-ai', 'artificial intelligence', 'trí tuệ nhân tạo', { ipa: '/ˌɑːrtɪfɪʃl ɪnˈtelɪdʒəns/', emoji: '🤖', example: 'Artificial intelligence is powerful.', exampleVi: 'Trí tuệ nhân tạo rất mạnh mẽ.' }),
    w('en-hs-tech-data', 'data', 'dữ liệu', { ipa: '/ˈdeɪtə/', emoji: '📊', example: 'We collect data.', exampleVi: 'Chúng tôi thu thập dữ liệu.' }),
    w('en-hs-tech-network', 'network', 'mạng lưới', { ipa: '/ˈnetwɜːrk/', emoji: '🌐' }),
  ],
}

// ══════════════════════════════════════════════════════════════════════════
// 🌌 DẢI NGÂN HÀ (B2+): khám phá vũ trụ (NEW — chủ đề đỉnh hành trình)
// ══════════════════════════════════════════════════════════════════════════
const L_SPACE_ADV: EnLesson = {
  id: 'galaxy-space-l1', title: 'Space exploration', titleVi: 'Khám phá vũ trụ', icon: '🌌',
  words: [
    w('en-gal-astronaut', 'astronaut', 'phi hành gia', { ipa: '/ˈæstrənɔːt/', emoji: '👨‍🚀', example: 'The astronaut floats in space.', exampleVi: 'Phi hành gia lơ lửng trong không gian.' }),
    w('en-gal-orbit', 'orbit', 'quỹ đạo', { ipa: '/ˈɔːrbɪt/', emoji: '🔄', example: 'The Earth orbits the Sun.', exampleVi: 'Trái Đất quay quanh Mặt Trời.' }),
    w('en-gal-gravity', 'gravity', 'trọng lực', { ipa: '/ˈɡrævəti/', emoji: '🍎', example: 'There is no gravity in space.', exampleVi: 'Không có trọng lực trong không gian.' }),
    w('en-gal-telescope', 'telescope', 'kính thiên văn', { ipa: '/ˈtelɪskoʊp/', emoji: '🔭', example: 'We watch stars with a telescope.', exampleVi: 'Chúng tôi ngắm sao bằng kính thiên văn.' }),
    w('en-gal-galaxy', 'galaxy', 'thiên hà', { ipa: '/ˈɡæləksi/', emoji: '🌌', example: 'Our galaxy is the Milky Way.', exampleVi: 'Thiên hà của chúng ta là Dải Ngân Hà.' }),
    w('en-gal-comet', 'comet', 'sao chổi', { ipa: '/ˈkɑːmɪt/', emoji: '☄️', example: 'A comet has a long tail.', exampleVi: 'Sao chổi có cái đuôi dài.' }),
    w('en-gal-satellite', 'satellite', 'vệ tinh', { ipa: '/ˈsætəlaɪt/', emoji: '🛰️', example: 'The satellite sends signals.', exampleVi: 'Vệ tinh gửi tín hiệu.' }),
    w('en-gal-mission', 'mission', 'sứ mệnh', { ipa: '/ˈmɪʃn/', emoji: '🚩', example: 'The space mission was a success.', exampleVi: 'Sứ mệnh vũ trụ đã thành công.' }),
  ],
}

// ══════════════════════════════════════════════════════════════════════════
// HÀNH TRÌNH — xếp theo khoảng cách, độ khó tăng dần
// ══════════════════════════════════════════════════════════════════════════
export const JOURNEY: Destination[] = [
  {
    id: 'earth', name: 'Earth', nameVi: 'Trái Đất', emoji: '🌍',
    distanceVi: 'Bệ phóng — 0 km', tier: 'launch', cefr: 'Pre-A1', color: '#58cc02',
    blurbVi: 'Khởi hành! Học những câu chào đầu tiên trước khi rời mặt đất.',
    lessons: [L_GREET, L_ABOUTME],
  },
  {
    id: 'moon', name: 'Moon', nameVi: 'Mặt Trăng', emoji: '🌕',
    distanceVi: '384.400 km', tier: 'beginner', cefr: 'A1', color: '#c0c0d0',
    blurbVi: 'Trạm dừng đầu tiên ngoài Trái Đất. Đếm số, gọi tên màu & vũ trụ.',
    lessons: [L_NUM, L_COLOR, L_SPACE_BASIC],
  },
  {
    id: 'mars', name: 'Mars', nameVi: 'Sao Hoả', emoji: '🔴',
    distanceVi: '~1,5 AU', tier: 'beginner', cefr: 'A1', color: '#ff6b3d',
    blurbVi: 'Hành tinh Đỏ. Mang theo con vật & thức ăn cho chuyến đi dài.',
    lessons: [L_ANIMAL, L_FOOD],
  },
  {
    id: 'mercury', name: 'Mercury', nameVi: 'Sao Thuỷ', emoji: '☿️',
    distanceVi: '~0,4 AU', tier: 'elementary', cefr: 'A1', color: '#b5a642',
    blurbVi: 'Gần Mặt Trời nhất. Kể về gia đình & lớp học của em.',
    lessons: [L_FAMILY, L_SCHOOL],
  },
  {
    id: 'venus', name: 'Venus', nameVi: 'Sao Kim', emoji: '🟡',
    distanceVi: '~0,7 AU', tier: 'elementary', cefr: 'A2', color: '#e8b04b',
    blurbVi: 'Hành tinh nóng nhất. Nói về một ngày & thời tiết.',
    lessons: [L_DAILY, L_WEATHER],
  },
  {
    id: 'jupiter', name: 'Jupiter', nameVi: 'Sao Mộc', emoji: '🪐',
    distanceVi: '~5,2 AU', tier: 'intermediate', cefr: 'A2', color: '#d8a06a',
    blurbVi: 'Hành tinh lớn nhất. Luyện các động từ hành động.',
    lessons: [L_VERBS],
  },
  {
    id: 'saturn', name: 'Saturn', nameVi: 'Sao Thổ', emoji: '🪐',
    distanceVi: '~9,5 AU', tier: 'intermediate', cefr: 'B1', color: '#e3d59e',
    blurbVi: 'Hành tinh có vành đai. Tìm đường giữa các địa điểm.',
    lessons: [L_PLACE, L_DIRECTION],
  },
  {
    id: 'uranus', name: 'Uranus', nameVi: 'Sao Thiên Vương', emoji: '🔵',
    distanceVi: '~19 AU', tier: 'advanced', cefr: 'B1', color: '#7fd8e8',
    blurbVi: 'Băng giá và xa xôi. Dùng động từ học thuật như nhà khoa học.',
    lessons: [L_ACADEMIC],
  },
  {
    id: 'neptune', name: 'Neptune', nameVi: 'Sao Hải Vương', emoji: '🔵',
    distanceVi: '~30 AU', tier: 'advanced', cefr: 'B2', color: '#3b6fe0',
    blurbVi: 'Hành tinh xa nhất Hệ Mặt Trời. Bàn về môi trường & khí hậu.',
    lessons: [L_ENV],
  },
  {
    id: 'alpha-centauri', name: 'Alpha Centauri', nameVi: 'Alpha Centauri', emoji: '⭐',
    distanceVi: '4,2 năm ánh sáng', tier: 'expert', cefr: 'B2', color: '#ffd166',
    blurbVi: 'Ngôi sao gần nhất ngoài Hệ Mặt Trời. Khám phá công nghệ.',
    lessons: [L_TECH],
  },
  {
    id: 'milky-way', name: 'Milky Way', nameVi: 'Dải Ngân Hà', emoji: '🌌',
    distanceVi: '100.000 năm ánh sáng', tier: 'expert', cefr: 'B2+', color: '#a06bff',
    blurbVi: 'Đích đến cuối: cả thiên hà. Làm chủ từ vựng khám phá vũ trụ.',
    lessons: [L_SPACE_ADV],
  },
]

// ─── Lookups ──────────────────────────────────────────────────────────────
export function getDestination(id: string): Destination | undefined {
  return JOURNEY.find(d => d.id === id)
}

export function getLesson(lessonId: string): { destination: Destination; lesson: EnLesson } | undefined {
  for (const destination of JOURNEY) {
    const lesson = destination.lessons.find(l => l.id === lessonId)
    if (lesson) return { destination, lesson }
  }
  return undefined
}

/** Tất cả lesson theo đúng thứ tự hành trình (để khoá tuần tự) */
export function allLessonsInOrder(): EnLesson[] {
  const out: EnLesson[] = []
  for (const d of JOURNEY) out.push(...d.lessons)
  return out
}

export function allWords(): EnWord[] {
  const out: EnWord[] = []
  for (const d of JOURNEY) for (const l of d.lessons) out.push(...l.words)
  return out
}

export function wordById(): Record<string, EnWord> {
  const m: Record<string, EnWord> = {}
  for (const word of allWords()) m[word.id] = word
  return m
}

export function journeyStats() {
  let lessons = 0, words = 0
  for (const d of JOURNEY) for (const l of d.lessons) { lessons++; words += l.words.length }
  return { destinations: JOURNEY.length, lessons, words }
}
