# Hướng Dẫn Sửa Lỗi OCR Text Sai

## 🐛 Vấn Đề

Một số tài liệu có OCR text sai - ví dụ: tài liệu Vật lý nhưng OCR trả về text về lịch sử ("Cách mạng tháng Tám năm 1945...").

## 🔍 Nguyên Nhân

1. **Kết quả cũ từ simulation:** Trước đây OCR API có fallback về simulation text cố định, đã được sửa nhưng kết quả cũ vẫn còn trong database.

2. **File mapping sai:** Có thể do lỗi trong quá trình xử lý nhiều file cùng lúc, kết quả OCR của file này bị gán nhầm cho file khác.

3. **Cache/Queue issue:** Kết quả OCR từ tài liệu trước đó bị cache và hiển thị cho tài liệu hiện tại.

## ✅ Giải Pháp

### 1. Chạy Script Tự Động Sửa

Script sẽ tự động:
- Tìm tất cả documents có OCR text chứa simulation patterns
- Xóa OCR text sai
- Reset status về "Hàng đợi" để có thể số hóa lại

```bash
npx tsx scripts/fix-wrong-ocr-results.ts
```

### 2. Sửa Thủ Công (Nếu Cần)

Nếu muốn sửa thủ công một document cụ thể:

```sql
-- Xem document có OCR text sai
SELECT id, name, displayName, status, LEFT(ocrText, 100) as text_preview
FROM "Document"
WHERE ocrText LIKE '%Cách mạng tháng Tám%'
  AND name NOT LIKE '%lịch sử%'
  AND name NOT LIKE '%history%';

-- Xóa OCR text và reset status
UPDATE "Document"
SET 
  "ocrText" = NULL,
  status = 'Hàng đợi',
  metadata = jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{wrongOcrCleared}',
    'true'::jsonb
  )
WHERE id = 'DOCUMENT_ID_HERE';
```

### 3. Số Hóa Lại

Sau khi sửa, user cần:
1. Vào trang `/teacher/document-digitization`
2. Tìm document đã được sửa (status = "Hàng đợi")
3. Click nút "Số hóa với AI" để xử lý lại

## 🛡️ Biện Pháp Phòng Ngừa

Code đã được cập nhật với các biện pháp bảo vệ:

### 1. Validation Trước Khi Lưu

```typescript
// Check simulation text patterns
const simulationTexts = [
  "Cách mạng tháng Tám năm 1945",
  "Đảng Cộng sản Việt Nam",
  "nhân dân cả nước đoàn kết một lòng"
]

if (hasSimulationText && !isHistoryDocument) {
  throw new Error("Phát hiện text simulation không phù hợp...")
}
```

### 2. File Hash Verification

Mỗi file được xử lý sẽ có hash được lưu trong metadata để verify:

```typescript
metadata: {
  processedFileHash: fileHash.substring(0, 16),
  processedFileName: document.name,
}
```

### 3. Logging Chi Tiết

Mọi bước xử lý đều được log với:
- Document ID
- File name
- File hash
- Text preview

### 4. Reject Simulation Results

OCR API không còn fallback về simulation text. Nếu OCR service không khả dụng, sẽ trả về error thay vì text cố định.

## 📊 Kiểm Tra Kết Quả

Sau khi chạy script, kiểm tra:

```sql
-- Xem documents đã được sửa
SELECT id, name, status, 
       metadata->>'wrongOcrCleared' as cleared,
       metadata->>'clearedAt' as cleared_at
FROM "Document"
WHERE metadata->>'wrongOcrCleared' = 'true';

-- Xem processing logs
SELECT d.name, dpl.stage, dpl.message, dpl.createdAt
FROM "DocumentProcessingLog" dpl
JOIN "Document" d ON d.id = dpl."documentId"
WHERE dpl.message LIKE '%simulation%'
ORDER BY dpl."createdAt" DESC;
```

## 🚀 Kết Luận

- Script tự động sẽ sửa tất cả documents có OCR text sai
- Code mới đã có validation để ngăn chặn lỗi tương tự
- Users cần số hóa lại các documents đã được sửa
