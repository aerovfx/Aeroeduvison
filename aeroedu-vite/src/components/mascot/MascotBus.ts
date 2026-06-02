/**
 * MascotBus — event bus nhỏ để mọi nơi báo cho mascot Aero phản ứng.
 *
 *   import { mascot } from '@/components/mascot/MascotBus'
 *   mascot.emit('correct')                      // trả lời đúng
 *   mascot.emit('levelUp', { text: 'Lên cấp 5!' })
 *
 * Mascot.tsx lắng nghe và đổi biểu cảm + bong bóng thoại + confetti.
 */
export type MascotEvent =
  | 'welcome' | 'correct' | 'wrong' | 'lessonDone' | 'levelUp'
  | 'hint' | 'idle' | 'celebrate' | 'sad' | 'think'

export interface MascotPayload {
  text?: string        // câu nói tuỳ chỉnh (mặc định theo reactions.ts)
  durationMs?: number  // thời gian hiện bong bóng
}

type Listener = (event: MascotEvent, payload: MascotPayload) => void
const listeners = new Set<Listener>()

export const mascot = {
  on(fn: Listener): () => void { listeners.add(fn); return () => listeners.delete(fn) },
  emit(event: MascotEvent, payload: MascotPayload = {}) {
    listeners.forEach((l) => { try { l(event, payload) } catch { /* ignore */ } })
  },
}
