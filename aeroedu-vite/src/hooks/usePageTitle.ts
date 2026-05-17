/**
 * usePageTitle — set document.title cho từng page.
 *
 * Pattern: gọi 1 lần ở đầu component, suffix tự thêm "| AeroEduVision".
 * Khi unmount → restore tiêu đề mặc định (giữ UX clean khi navigate
 * sang trang chưa khai báo title).
 *
 * SEO note: vì là SPA, search engine crawlers thấy title từ React render
 * (Google bot có thể chạy JS). Đối với crawlers cũ, vẫn cần SSR / meta
 * inject — nhưng việc này nằm ngoài scope hook.
 */
import { useEffect } from 'react'

const DEFAULT_TITLE = 'AeroEduVision — Nền tảng STEM thông minh cho trường học Việt Nam'
const SUFFIX = ' | AeroEduVision'

export function usePageTitle(title: string | undefined) {
  useEffect(() => {
    if (!title) return
    const prev = document.title
    document.title = title.endsWith(SUFFIX) ? title : `${title}${SUFFIX}`
    return () => {
      document.title = prev || DEFAULT_TITLE
    }
  }, [title])
}

export default usePageTitle
