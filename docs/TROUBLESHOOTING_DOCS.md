# 🔧 Troubleshooting Docs Routes

## Vấn Đề: Docs Redirect Về Trang Chủ

### Nguyên Nhân
Middleware đang chặn route `/docs` vì không có trong danh sách public routes.

### ✅ Đã Sửa

1. **Middleware** (`middleware.ts`):
   - ✅ Thêm `/docs` vào public routes
   - ✅ Docs routes giờ luôn public (không cần auth)

2. **Auth Redirect** (`lib/auth-redirect.ts`):
   - ✅ Thêm `/docs` vào permissions cho authenticated users

3. **Frontmatter**:
   - ✅ Đã thêm frontmatter vào tất cả file trong `docs/beginner/`

### 🔄 Cần Làm

1. **Restart Dev Server:**
```bash
# Stop server (Ctrl+C)
# Start lại
npm run dev
```

2. **Rebuild Contentlayer** (nếu cần):
```bash
# Xóa cache
rm -rf .contentlayer

# Restart server (contentlayer sẽ tự rebuild)
npm run dev
```

3. **Kiểm Tra Routes:**
- ✅ `http://localhost:3000/docs` - Docs home
- ✅ `http://localhost:3000/docs/beginner/index` - Module beginner
- ✅ `http://localhost:3000/docs/beginner/01-gioi-thieu` - Giới thiệu

### 🐛 Nếu Vẫn Không Hoạt Động

1. **Kiểm tra middleware logs:**
   - Xem console khi truy cập `/docs`
   - Tìm log: `✅ [MIDDLEWARE] ... accessing /docs`

2. **Kiểm tra contentlayer:**
```bash
# Xem file generated
cat .contentlayer/generated/Doc/_index.json

# Nếu rỗng, rebuild
rm -rf .contentlayer
npm run dev
```

3. **Kiểm tra route structure:**
   - File: `app/(docs)/docs/[[...slug]]/page.tsx`
   - Đảm bảo không có conflict

4. **Clear browser cache:**
   - Hard refresh: `Cmd+Shift+R` (Mac) hoặc `Ctrl+Shift+R` (Windows)

### 📝 Notes

- Docs routes giờ là **public** - không cần đăng nhập
- Authenticated users vẫn có thể truy cập docs
- Contentlayer cần rebuild sau khi thêm frontmatter
