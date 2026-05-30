/**
 * iap.ts — Apple In-App Purchase (StoreKit 2) wrapper cho bản iOS native.
 *
 * Dùng `cordova-plugin-purchase` v13 (CdvPurchase) — plugin gắn vào project iOS
 * khi build app (`npm i cordova-plugin-purchase && npx cap sync ios`). KHÔNG
 * import npm package ở đây → web bundle KHÔNG phình + chạy no-op trên browser
 * (global `window.CdvPurchase` chỉ tồn tại trong WKWebView sau khi plugin nạp).
 *
 * Luồng mua:
 *   buyPlan(planId)
 *     → store.get(productId).getOffer().order()
 *     → plugin nhận giao dịch StoreKit → callback .approved(transaction)
 *     → POST /api/iap/apple/verify { transactionId } (server xác thực qua
 *       App Store Server API + grantPlan)
 *     → transaction.finish()  → resolve()
 *
 * Server (lib/apple-iap.cjs) là nguồn chân lý: client chỉ chuyển transactionId,
 * server hỏi Apple authoritative rồi mới cấp quyền. KHÔNG tin client.
 */
import { isNative } from './native'
import { api } from '@/services/api'

// planId → Apple Product ID (đảo của IAP_PRODUCT_PLAN_MAP ở lib/apple-iap.cjs).
// school-1y: B2B, KHÔNG bán qua IAP.
export const PLAN_PRODUCT_MAP: Record<string, string> = {
  'basic-1m':   'com.aeroedu.inphysic.teacher.basic.monthly',
  'pro-1m':     'com.aeroedu.inphysic.teacher.pro.monthly',
  'pro-1y':     'com.aeroedu.inphysic.teacher.pro.yearly',
  'student-1m': 'com.aeroedu.inphysic.student.monthly',
  'student-1y': 'com.aeroedu.inphysic.student.yearly',
  'parent-1m':  'com.aeroedu.inphysic.parent.monthly',
  'parent-1y':  'com.aeroedu.inphysic.parent.yearly',
}

export function planIsIapEligible(planId: string): boolean {
  return !!PLAN_PRODUCT_MAP[planId]
}

// ── Minimal typings cho global CdvPurchase (tránh phụ thuộc npm @ build) ──
interface CdvTransaction {
  transactionId?: string
  products?: { id: string }[]
  nativePurchase?: Record<string, unknown>
  finish: () => void
}
interface CdvOffer { order: () => Promise<unknown> }
interface CdvProduct { id: string; title?: string; pricing?: { price?: string }; getOffer: () => CdvOffer | undefined }
interface CdvStore {
  verbosity: number
  register: (defs: { id: string; type: string; platform: string }[]) => void
  initialize: (platforms: string[]) => Promise<void>
  update: () => Promise<void>
  restorePurchases: () => Promise<void>
  get: (productId: string, platform?: string) => CdvProduct | undefined
  when: () => CdvWhen
}
interface CdvWhen {
  approved: (cb: (t: CdvTransaction) => void) => CdvWhen
  verified: (cb: (r: { finish: () => void }) => void) => CdvWhen
  finished: (cb: (t: CdvTransaction) => void) => CdvWhen
}
interface CdvPurchaseNS {
  store: CdvStore
  ProductType: { PAID_SUBSCRIPTION: string }
  Platform: { APPLE_APPSTORE: string }
  LogLevel: { WARNING: number }
}
function ns(): CdvPurchaseNS | null {
  if (typeof window === 'undefined') return null
  return (window as unknown as { CdvPurchase?: CdvPurchaseNS }).CdvPurchase ?? null
}

/** IAP khả dụng = chạy native + plugin đã nạp. */
export function isIapAvailable(): boolean {
  return isNative() && !!ns()
}

let initialized = false
// Resolver theo productId — buyPlan() chờ đến khi .approved+verify xong.
const pending = new Map<string, { resolve: () => void; reject: (e: Error) => void }>()

/** Gọi server xác thực 1 giao dịch đã được Apple duyệt. */
async function verifyOnServer(t: CdvTransaction): Promise<void> {
  const np = (t.nativePurchase || {}) as Record<string, unknown>
  // cordova-plugin-purchase v13 trên iOS dùng StoreKit 1 → THƯỜNG chỉ có
  // transactionId (KHÔNG có JWS). Vẫn dò các field JWS phòng khi plugin/StoreKit 2
  // cấp — server ưu tiên transactionId (hỏi App Store Server API authoritative).
  const jws = (np.jwsRepresentation || np.signedTransaction || np.transactionReceipt || null) as string | null
  // Debug device: chỉ log TÊN field + transactionId (không log nội dung receipt
  // nhạy cảm) để xác nhận đúng field plugin trả về khi test sandbox thật.
  try { console.info('[iap] nativePurchase keys:', Object.keys(np), '· transactionId:', t.transactionId, '· jws?', !!jws) } catch { /* noop */ }
  await api.post('/iap/apple/verify', {
    transactionId: t.transactionId,
    ...(jws ? { signedTransaction: jws } : {}),
  })
}

/**
 * Khởi tạo store: đăng ký 7 product + gắn handler. Idempotent.
 * An toàn gọi nhiều lần; no-op trên web.
 */
export async function initIap(): Promise<boolean> {
  if (!isIapAvailable()) return false
  if (initialized) return true
  const C = ns()!
  const { store, ProductType, Platform, LogLevel } = C
  try {
    store.verbosity = LogLevel.WARNING
    store.register(
      Object.values(PLAN_PRODUCT_MAP).map(id => ({
        id,
        type: ProductType.PAID_SUBSCRIPTION,
        platform: Platform.APPLE_APPSTORE,
      })),
    )
    store.when()
      .approved((t: CdvTransaction) => {
        const pid = t.products?.[0]?.id
        verifyOnServer(t)
          .then(() => {
            t.finish()
            if (pid && pending.has(pid)) { pending.get(pid)!.resolve(); pending.delete(pid) }
          })
          .catch((e: unknown) => {
            const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
              || (e as Error)?.message || 'Xác thực giao dịch thất bại'
            if (pid && pending.has(pid)) { pending.get(pid)!.reject(new Error(msg)); pending.delete(pid) }
          })
      })
    await store.initialize([Platform.APPLE_APPSTORE])
    initialized = true
    return true
  } catch (e) {
    console.warn('[iap] init failed', e)
    return false
  }
}

/** Sản phẩm StoreKit đã nạp (để hiển thị giá thật của Apple). null nếu chưa có. */
export function getProductInfo(planId: string): { price?: string; title?: string } | null {
  if (!isIapAvailable()) return null
  const productId = PLAN_PRODUCT_MAP[planId]
  if (!productId) return null
  const p = ns()!.store.get(productId, ns()!.Platform.APPLE_APPSTORE)
  if (!p) return null
  return { price: p.pricing?.price, title: p.title }
}

/**
 * Mua 1 gói qua StoreKit. Resolve khi server đã cấp quyền; reject nếu lỗi/huỷ.
 * Chỉ chạy native — caller phải kiểm isIapAvailable() trước.
 */
export async function buyPlan(planId: string): Promise<void> {
  if (!isIapAvailable()) throw new Error('IAP không khả dụng trên thiết bị này')
  const productId = PLAN_PRODUCT_MAP[planId]
  if (!productId) throw new Error('Gói này không bán qua App Store')
  await initIap()
  const product = ns()!.store.get(productId, ns()!.Platform.APPLE_APPSTORE)
  const offer = product?.getOffer()
  if (!offer) throw new Error('Không tìm thấy sản phẩm trên App Store (thử lại sau)')
  return new Promise<void>((resolve, reject) => {
    pending.set(productId, { resolve, reject })
    const timeout = window.setTimeout(() => {
      if (pending.has(productId)) { pending.delete(productId); reject(new Error('Hết thời gian chờ giao dịch')) }
    }, 180_000)
    const done = (fn: () => void) => { window.clearTimeout(timeout); fn() }
    // bọc resolver để clear timeout
    pending.set(productId, {
      resolve: () => done(resolve),
      reject: (e) => done(() => reject(e)),
    })
    offer.order().catch((e: unknown) => {
      pending.delete(productId)
      window.clearTimeout(timeout)
      const code = (e as { code?: number })?.code
      // 6777006 / "cancelled" — user huỷ, không coi là lỗi nghiêm trọng.
      reject(new Error(code ? `Giao dịch không hoàn tất (mã ${code})` : ((e as Error)?.message || 'Giao dịch thất bại')))
    })
  })
}

/** Khôi phục giao dịch đã mua (Apple yêu cầu có nút "Restore Purchases"). */
export async function restorePurchases(): Promise<void> {
  if (!isIapAvailable()) throw new Error('IAP không khả dụng')
  await initIap()
  await ns()!.store.restorePurchases()
}
