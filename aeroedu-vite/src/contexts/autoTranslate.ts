/**
 * autoTranslate.ts — Dịch toàn app theo DOM (không cần sửa từng file).
 *
 * Cách hoạt động: khi người dùng chọn EN, quét các text-node tiếng Việt trên
 * trang, nếu khớp CHÍNH XÁC (đã trim) một mục trong từ điển VI→EN thì thay thế,
 * và lưu lại bản gốc để khôi phục khi chuyển về VI. Dùng MutationObserver để
 * tự dịch nội dung mới render (React re-render, điều hướng…).
 *
 * Ưu: phủ toàn bộ UI tĩnh app-wide ngay, mở rộng bằng cách thêm từ điển.
 * Hạn: chỉ dịch chuỗi KHỚP nguyên cụm (chuỗi có nội suy động sẽ giữ tiếng Việt);
 * không dịch placeholder/title (thuộc tính) — sẽ bổ sung sau nếu cần.
 */
let DICT: Record<string, string> = {}
let enabled = false
let observer: MutationObserver | null = null
let scheduled = 0
const orig = new WeakMap<Text, string>()
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE', 'PRE', 'NOSCRIPT'])

function handleNode(node: Text) {
  const parent = node.parentElement
  if (!parent || SKIP_TAGS.has(parent.tagName)) return
  const raw = node.nodeValue
  if (!raw) return
  const key = raw.trim()
  if (!key || key.length > 200) return
  if (enabled) {
    const en = DICT[key]
    if (en && en !== key) {
      if (!orig.has(node)) orig.set(node, raw)
      const next = raw.replace(key, en)
      if (node.nodeValue !== next) node.nodeValue = next
    }
  } else {
    const o = orig.get(node)
    if (o != null && node.nodeValue !== o) node.nodeValue = o
  }
}

function walk(root: Node) {
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let n: Node | null
  // eslint-disable-next-line no-cond-assign
  while ((n = tw.nextNode())) handleNode(n as Text)
}

function schedule() {
  if (scheduled) return
  scheduled = requestAnimationFrame(() => {
    scheduled = 0
    if (document.body) walk(document.body)
  })
}

/** Cập nhật từ điển + bật/tắt dịch. Gọi mỗi khi đổi ngôn ngữ. */
export function setAutoTranslate(dict: Record<string, string>, on: boolean) {
  DICT = dict
  enabled = on
  if (typeof document === 'undefined' || !document.body) return
  walk(document.body)
  if (!observer) {
    observer = new MutationObserver(() => schedule())
    observer.observe(document.body, { childList: true, characterData: true, subtree: true })
  }
}
