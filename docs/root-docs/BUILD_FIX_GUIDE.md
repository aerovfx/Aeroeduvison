# Hướng dẫn sửa lỗi Build cho AeroeduVision

## Tình hình hiện tại

Ứng dụng AeroeduVision có một số lỗi build cần được sửa trước khi có thể deployment:

### 1. Lỗi JSX trong các file page React

**File bị ảnh hưởng:**
- `app/(dashboard)/(routes)/dashboard/labtwin/labs/light-propagation/page.tsx`
- `app/(dashboard)/(routes)/dashboard/labtwin/labs/light-shadows/page.tsx`
- `app/(dashboard)/(routes)/dashboard/labtwin/labs/mechaforce/page.tsx`

**Vấn đề:** Cấu trúc HTML không cân bằng - có thẻ `<div>` thừa hoặc thiếu

**Giải pháp:** Cần kiểm tra toàn bộ cấu trúc JSX trong các file này và đảm bảo cân bằng các thẻ mở/đóng

### 2. Lỗi Import Module không tìm thấy

**File bị ảnh hưởng:**
- `app/api/grading/[id]/route.ts` - import từ `@/lib/prisma` (không tồn tại)
- `lib/exam-matrix/exam-generator.ts` - import từ `@/lib/logger` (không tồn tại)

**Giải pháp (đã áp dụng):**
- Sửa import từ `@/lib/prisma` → `@/lib/db`
- Sửa import từ `@/lib/logger` → `@/lib/logging-simple`

### 3. Lỗi ContentLayer

**Vấn đề:** 77 file `.md` ở thư mục gốc không được cấu hình trong ContentLayer

**Giải pháp:** 
- Di chuyển các file `.md` tài liệu vào thư mục con riêng, hoặc
- Cập nhật cấu hình `contentlayer.config.ts` để xử lý các file này

### 4. Lỗi Missing Module `meilisearch`

**File bị ảnh hưởng:**
- `lib/search/meilisearch.ts`

**Giải pháp (tạm thời):**
- Đã vô hiệu hóa endpoint `/api/search` để tránh import module không tồn tại

## Các bước sửa chi tiết

### Step 1: Sửa cấu trúc JSX

Hãy kiểm tra từng file React bị lỗi:

```bash
# Kiểm tra file light-propagation
npm run build 2>&1 | grep "light-propagation"
```

Sau đó, cần kiểm tra toàn bộ cấu trúc HTML/JSX trong return statement và đảm bảo:
- Mỗi thẻ mở `<div>` có thẻ đóng tương ứng `</div>`
- Không có thẻ JSX component bị kỳ lạ (như VisionThemeWrapper)

### Step 2: Di chuyển các file tài liệu

```bash
# Tạo thư mục documentation
mkdir -p docs/root-docs

# Di chuyển các file .md từ gốc vào docs
mv *.md docs/root-docs/ 2>/dev/null || true
```

### Step 3: Cập nhật ContentLayer config

Sửa `contentlayer.config.ts` để thêm support cho các file .md khác:

```typescript
// Thêm document type mới cho các file .md ở root
export const RootDoc = defineDocumentType(() => ({
  name: "RootDoc",
  filePathPattern: `*.md`,
  contentType: "mdx",
  // ... các field khác
}))

export default makeSource({
  documentTypes: [Doc, RootDoc],
  // ...
})
```

### Step 4: Thêm Meilisearch (tuỳ chọn)

Nếu bạn muốn sử dụng search:

```bash
npm install meilisearch
```

Sau đó, enable lại endpoint `/api/search`

## Deployment sau khi sửa

Sau khi sửa tất cả các lỗi trên, chạy:

```bash
./deploy-aeroeduvision.sh
```

## Kiểm tra build cục bộ

Để kiểm tra build cục bộ trước khi deployment:

```bash
npm run build
```

Nếu build thành công, bạn sẽ thấy:
```
✓ Ready in 5.2s
```

## Lưu ý

- Deployment script đã được tạo và cấu hình sẵn cho project `gen-lang-client-0712182643`
- Tất cả các biến môi trường cần được set trong `.env.local`
- Hãy kiểm tra Docker daemon đang chạy trước khi chạy deployment script
