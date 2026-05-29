/**
 * theme.ts — bảng màu module Tiếng Anh.
 *
 * Trước đây mọi nơi dùng 1 màu xanh lá #58cc02 (kiểu Duolingo) → đơn điệu.
 * Nay dùng palette ĐA DẠNG, hiện đại (tham khảo dashboard fintech tối):
 *   - primary  : tím-indigo (màu chủ đạo / progress / CTA chính)
 *   - cyan     : nút nghe / thông tin / lựa chọn đang chọn
 *   - amber/coral: điểm nhấn (streak, badge)
 *   - correct  : XANH LÁ chỉ dành cho trạng thái "đúng" (giữ quy ước UX)
 *   - wrong    : đỏ cho "sai"; gold cho sao.
 */
export const ENG = {
  primary: '#7c5cff',
  primaryDark: '#5b3fd9',
  /** gradient cho progress bar + nút CTA lớn */
  primaryGrad: 'linear-gradient(135deg, #7c5cff 0%, #22d3ee 100%)',
  cyan: '#22d3ee',
  amber: '#f5b301',
  coral: '#ff6b4a',
  correct: '#22c55e',
  wrong: '#ff4b4b',
  gold: '#ffc800',
} as const
