/**
 * shuffleQuestions — Util xáo trộn câu hỏi + đáp án cho exam mode
 *
 * 2 chế độ độc lập (lưu localStorage):
 *   - shuffleQuestions: đảo thứ tự questions[]
 *   - shuffleOptions:   đảo A/B/C/D bên trong từng câu, KEEP correctAnswer
 *                        consistency (letter mapping được tự động cập nhật)
 *
 * Dùng Fisher-Yates O(n). Seed cố định theo (examId + studentId) sẽ giữ
 * stable shuffle nếu reload, để học sinh không thấy thứ tự câu khác nhau
 * mỗi lần refresh giữa chừng.
 */

// Minimal contract — chỉ require fields mà shuffle cần đụng tới.
// Dùng generic <T extends QuestionShape> để giữ nguyên type của caller.
interface QuestionShape {
  questionType?: string
  options?: string[] | readonly string[]
  correctAnswer?: string
}

/** Fisher-Yates shuffle (immutable — trả về mảng mới). */
function fyShuffle<T>(arr: readonly T[], rng: () => number = Math.random): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Tạo seeded RNG từ string — output deterministic trong session. */
function seedRng(seed: string): () => number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return () => {
    // xorshift32
    h ^= h << 13; h >>>= 0
    h ^= h >>> 17; h >>>= 0
    h ^= h << 5;  h >>>= 0
    return (h >>> 0) / 0x1_0000_0000
  }
}

/**
 * Shuffle 1 câu hỏi MCQ:
 *   - Giữ ID, content, explanation
 *   - Đảo options[] random
 *   - correctAnswer: nếu là letter "A"/"B"/"C"/"D" → cập nhật theo vị trí mới
 *     của option correct cũ
 *   - Nếu correctAnswer là text khác (short answer) → giữ nguyên
 *   - Cũng strip prefix "A. " "B. " ở đầu mỗi option và prepend lại letter mới
 *     để A/B/C/D label đúng vị trí mới (vd ban đầu "B. -9", sau shuffle ở vị
 *     trí 0 → "A. -9").
 */
export function shuffleOneQuestion<T extends QuestionShape>(q: T, rng: () => number = Math.random): T {
  const opts = q.options ?? []
  if (opts.length < 2) return q
  const type = (q.questionType || '').toUpperCase()
  if (type !== 'MULTIPLE_CHOICE' && type !== 'SINGLE_CHOICE') return q

  // Tách prefix letter để track mapping
  // Original: ["A. 13", "B. -9", "C. 0", "D. 5/2"]
  // Strip:    [{letter:"A", text:"13"}, {letter:"B", text:"-9"}, ...]
  const stripped = opts.map((opt) => {
    const m = String(opt).match(/^([A-Z])\s*[.)]\s*(.*)$/s)
    return m
      ? { origLetter: m[1].toUpperCase(), text: m[2].trim() }
      : { origLetter: String.fromCharCode(65 + opts.indexOf(opt)), text: String(opt).trim() }
  })

  const shuffled = fyShuffle(stripped, rng)

  // Re-attach NEW letter prefix theo vị trí mới
  const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']
  const newOptions = shuffled.map((s, i) => `${LETTERS[i]}. ${s.text}`)

  // Map correctAnswer cũ → letter mới
  let newCorrectAnswer = q.correctAnswer
  if (q.correctAnswer) {
    const origLetter = String(q.correctAnswer).match(/^([A-Z])/)?.[1]?.toUpperCase()
    if (origLetter) {
      const newPos = shuffled.findIndex((s) => s.origLetter === origLetter)
      if (newPos >= 0) newCorrectAnswer = LETTERS[newPos]
    }
  }

  return { ...q, options: newOptions, correctAnswer: newCorrectAnswer }
}

/**
 * Shuffle danh sách questions[] + (optional) shuffle options trong từng câu.
 * Cùng seed → cùng output → stable cross-reload.
 */
export function shuffleQuestions<T extends QuestionShape>(
  questions: T[],
  opts: { shuffleOrder?: boolean; shuffleOptions?: boolean; seed?: string } = {},
): T[] {
  const { shuffleOrder = false, shuffleOptions = false, seed } = opts
  const rng = seed ? seedRng(seed) : Math.random
  let result = questions
  if (shuffleOptions) result = result.map((q) => shuffleOneQuestion(q, rng))
  if (shuffleOrder) result = fyShuffle(result, rng)
  return result
}

/** Read prefs từ localStorage (đặt trong ExamModes). */
export function readShufflePrefs(): { shuffleOrder: boolean; shuffleOptions: boolean } {
  try {
    const raw = localStorage.getItem('exam-prefs-v1')
    if (!raw) return { shuffleOrder: false, shuffleOptions: false }
    const p = JSON.parse(raw)
    return {
      shuffleOrder: !!p.shuffleOrder,
      shuffleOptions: !!p.shuffleOptions,
    }
  } catch { return { shuffleOrder: false, shuffleOptions: false } }
}
