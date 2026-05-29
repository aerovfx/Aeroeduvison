/**
 * exercises.ts — tự sinh chuỗi bài tập từ danh sách Word của 1 lesson.
 *
 * Các dạng (kiểu Duolingo):
 *   choose-meaning  hiện từ EN (+ audio) → chọn nghĩa VI
 *   choose-word     hiện nghĩa VI → chọn từ EN
 *   listen          nghe audio → chọn từ EN đã nghe
 *   type            gõ lại từ EN theo nghĩa VI (+ audio gợi ý)
 *   match           ghép cặp EN ↔ VI (4 cặp)
 *   repeat          nghe & nhắc lại (tự xác nhận) — luyện phát âm
 */
import type { EnWord } from './curriculum'

export type Exercise =
  | { kind: 'choose-meaning'; word: EnWord; options: string[]; answer: string }
  | { kind: 'choose-word'; word: EnWord; options: string[]; answer: string }
  | { kind: 'listen'; word: EnWord; options: string[]; answer: string }
  | { kind: 'type'; word: EnWord; answer: string }
  | { kind: 'match'; pairs: { id: string; en: string; vi: string }[] }
  | { kind: 'repeat'; word: EnWord }

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Lấy n distractor (khác `answer`) từ pool theo trường `field` */
function distractors(pool: EnWord[], answerWord: EnWord, field: 'en' | 'vi', n: number): string[] {
  const seen = new Set<string>([answerWord[field]])
  const out: string[] = []
  for (const word of shuffle(pool)) {
    const val = word[field]
    if (!seen.has(val)) { seen.add(val); out.push(val) }
    if (out.length >= n) break
  }
  return out
}

/**
 * Sinh chuỗi exercise cho 1 lesson.
 * @param words  từ vựng của lesson
 * @param pool   tập từ rộng hơn để lấy đáp án nhiễu (mặc định = words)
 */
export function generateExercises(words: EnWord[], pool?: EnWord[]): Exercise[] {
  const distractorPool = (pool && pool.length >= 4 ? pool : words)
  const out: Exercise[] = []
  const rotate: Array<'choose-meaning' | 'choose-word' | 'listen'> = ['choose-meaning', 'listen', 'choose-word']

  words.forEach((word, i) => {
    const kind = rotate[i % rotate.length]
    if (kind === 'choose-meaning') {
      const opts = shuffle([word.vi, ...distractors(distractorPool, word, 'vi', 3)])
      out.push({ kind, word, options: opts, answer: word.vi })
    } else if (kind === 'choose-word') {
      const opts = shuffle([word.en, ...distractors(distractorPool, word, 'en', 3)])
      out.push({ kind, word, options: opts, answer: word.en })
    } else {
      const opts = shuffle([word.en, ...distractors(distractorPool, word, 'en', 3)])
      out.push({ kind, word, options: opts, answer: word.en })
    }
  })

  // 1 bài "type" cho từ đầu (gõ chính tả) — nếu từ không quá dài
  const typable = words.find(x => x.en.length <= 12)
  if (typable) out.push({ kind: 'type', word: typable, answer: typable.en })

  // 1 bài "repeat" luyện phát âm cho từ thứ 2 (nếu có)
  if (words[1]) out.push({ kind: 'repeat', word: words[1] })

  let seq = shuffle(out)

  // 1 bài "match" (4 cặp) chèn vào gần cuối — nếu đủ từ
  if (words.length >= 4) {
    const picked = shuffle(words).slice(0, 4)
    const matchEx: Exercise = {
      kind: 'match',
      pairs: picked.map(p => ({ id: p.id, en: p.en, vi: p.vi })),
    }
    const insertAt = Math.max(1, seq.length - 1)
    seq = [...seq.slice(0, insertAt), matchEx, ...seq.slice(insertAt)]
  }

  return seq
}

/** Số câu "chấm điểm" (match + repeat tính theo cách riêng ở UI) */
export function gradableCount(exs: Exercise[]): number {
  return exs.filter(e => e.kind !== 'repeat').length
}
