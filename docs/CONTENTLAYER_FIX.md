# 🔧 Fix Contentlayer Import Error

## Vấn Đề

Lỗi: `Module not found: Package path ./generated is not exported from package contentlayer`

## Nguyên Nhân

Contentlayer 0.3.4 không export `./generated` trong package.json exports field. Files được generate trong `.contentlayer/generated/` nhưng package không expose path này.

## ✅ Đã Sửa

### 1. Webpack Alias (next.config.js)
Thêm alias để map `contentlayer/generated` → `.contentlayer/generated/index.mjs`:

```js
webpack: (config) => {
  config.resolve.alias = {
    ...config.resolve.alias,
    "contentlayer/generated": path.resolve(__dirname, ".contentlayer/generated/index.mjs"),
  };
  return config;
}
```

### 2. Import với Fallback (page.tsx)
Import với error handling:

```ts
let allDocs: Doc[] = []
try {
  const generated = require("contentlayer/generated")
  allDocs = generated.allDocs || []
} catch {
  try {
    const generated = require("../../../../.contentlayer/generated/index.mjs")
    allDocs = generated.allDocs || []
  } catch {
    allDocs = []
  }
}
```

## 🔄 Cần Làm

1. **Restart Dev Server:**
```bash
npm run dev
```

2. **Đợi Contentlayer Generate:**
- Contentlayer sẽ tự động generate files khi dev server chạy
- Đợi vài giây sau khi server start
- Files sẽ được tạo trong `.contentlayer/generated/`

3. **Kiểm Tra:**
```bash
# Xem files đã được generate chưa
ls -la .contentlayer/generated/Doc/

# Nếu rỗng, xóa cache và restart
rm -rf .contentlayer/.cache
npm run dev
```

## 📝 Notes

- Webpack alias chỉ hoạt động khi webpack được sử dụng (dev mode)
- Trong production build, Next.js có thể xử lý khác
- Nếu vẫn lỗi, có thể cần update contentlayer hoặc dùng alternative

## 🆘 Nếu Vẫn Lỗi

1. Check contentlayer version: `npm list contentlayer`
2. Xóa và reinstall: `rm -rf node_modules/.contentlayer && npm install`
3. Clear cache: `rm -rf .contentlayer && npm run dev`
