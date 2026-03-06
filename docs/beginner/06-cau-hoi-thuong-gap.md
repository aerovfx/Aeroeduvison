---
title: "Câu Hỏi Thường Gặp (FAQ)"
description: "Tổng hợp các câu hỏi thường gặp và câu trả lời chi tiết về AeroEduVison"
published: true
---

# 6. Câu Hỏi Thường Gặp (FAQ)

Tổng hợp các câu hỏi thường gặp và câu trả lời chi tiết.

## 🚀 Setup & Installation

### Q: Làm sao để cài đặt dự án?

**A:** Xem hướng dẫn chi tiết trong [Các Bước Đầu Tiên](./04-buoc-dau-tien.md). Tóm tắt:

1. Clone repository
2. `npm install`
3. Setup `.env.local`
4. Setup database
5. `npm run db:push`
6. `npm run dev`

### Q: Lỗi "Module not found" khi chạy `npm run dev`?

**A:** 
```bash
# Xóa và cài lại dependencies
rm -rf node_modules package-lock.json
npm install
```

### Q: Port 3000 đã được sử dụng?

**A:**
```bash
# Kill process trên port 3000
lsof -ti:3000 | xargs kill -9

# Hoặc chạy trên port khác
npm run dev -- -p 3001
```

### Q: Database connection failed?

**A:** Kiểm tra:
1. PostgreSQL đang chạy
2. `DATABASE_URL` trong `.env.local` đúng
3. Database đã được tạo

```bash
# Test connection
psql $DATABASE_URL
```

## 🗄️ Database

### Q: Làm sao để reset database?

**A:**
```bash
# Reset và seed lại
npm run db:reset
npm run db:seed
```

### Q: Làm sao để xem dữ liệu trong database?

**A:** Sử dụng Prisma Studio:
```bash
npm run db:studio
```

Mở browser tại `http://localhost:5555`

### Q: Làm sao để thêm field mới vào model?

**A:**
1. Cập nhật `prisma/schema.prisma`
2. Chạy `npm run db:push`
3. Chạy `npm run db:generate`

### Q: Migration vs db:push khác nhau như thế nào?

**A:**
- `db:push`: Nhanh, dùng cho development, tự động sync schema
- `db:migrate`: Tạo migration files, dùng cho production, có version control

## 🔐 Authentication

### Q: Làm sao để tạo user mới?

**A:** Có nhiều cách:

1. **Qua UI:** Đăng ký tại `/register`
2. **Qua API:**
```typescript
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "password123",
  "name": "User Name"
}
```
3. **Qua Prisma Studio:** `npm run db:studio`

### Q: Làm sao để đổi password?

**A:** Hiện tại cần implement chức năng này. Có thể:
1. Tạo API endpoint `/api/auth/change-password`
2. Hoặc reset qua Prisma Studio

### Q: Làm sao để set role cho user?

**A:**
```typescript
// Qua Prisma
await prisma.user.update({
  where: { email: 'user@example.com' },
  data: { role: 'TEACHER' }
})
```

## 🎨 Frontend & Components

### Q: Làm sao để tạo component mới?

**A:** Xem [Các Tác Vụ Thường Gặp - Tạo Component](./05-cac-tac-vu-thuong-gap.md#tạo-component-mới)

### Q: Làm sao để thêm route/page mới?

**A:** 
1. Tạo folder trong `app/`
2. Tạo file `page.tsx` trong folder đó
3. URL sẽ tự động match với folder structure

Ví dụ: `app/about/page.tsx` → `/about`

### Q: Làm sao để style component?

**A:** Sử dụng TailwindCSS:
```tsx
<div className="p-4 bg-blue-500 text-white rounded">
  Content
</div>
```

### Q: Làm sao để sử dụng shadcn/ui components?

**A:**
```bash
# Thêm component
npx shadcn-ui@latest add button

# Sử dụng
import { Button } from '@/components/ui/button'
```

## 🤖 AI Features

### Q: Làm sao để sử dụng AI features?

**A:** 
1. Setup API key trong `.env.local`:
```env
GEMINI_API_KEY="your-api-key"
```
Lấy API key từ: https://aistudio.google.com/

2. Sử dụng OCR Grading:
```
http://localhost:3000/dashboard/labtwin/labs/ocr-grading
```

3. Sử dụng trong code:
```typescript
import { ai } from '@/lib/ai'
const response = await ai.generate(prompt)
```

### Q: AI không hoạt động?

**A:** Kiểm tra:
1. API key đúng và có credit
2. API key đã được set trong `.env.local` (tên biến: `GEMINI_API_KEY`)
3. Restart dev server sau khi thay đổi `.env.local`
4. Check API status indicator trên trang OCR Grading (phải xanh 🟢)

### Q: OCR Grading ở đâu?

**A:** 
- URL: `http://localhost:3000/dashboard/labtwin/labs/ocr-grading`
- Xem hướng dẫn: [OCR_GRADING_COMPLETE_GUIDE.md](../../Guide/OCR_GRADING_COMPLETE_GUIDE.md)

## 🔬 Simulations

### Q: Làm sao để chạy simulations?

**A:**
```bash
# 1. Cài đặt dependencies
cd python-simulations
pip install -r requirements.txt

# 2. Build simulations
npm run simulations:build

# 3. Xem trong browser
# http://localhost:3000/dashboard/labtwin/labs
```

### Q: Simulation không load?

**A:** Kiểm tra:
1. Đã build simulations: `npm run simulations:build`
2. Data files có trong `public/labs/`
3. Restart Next.js dev server
4. Check browser console logs
5. Verify JSON format trong data files

## 🐛 Debugging

### Q: Làm sao để debug?

**A:**
1. **Console logs:** `console.log()`
2. **Browser DevTools:** F12 → Console
3. **VS Code Debugger:** Setup `.vscode/launch.json`
4. **React DevTools:** Install extension

### Q: Lỗi TypeScript?

**A:**
```bash
# Check TypeScript errors
npm run type-check

# Fix auto-fixable errors
npm run lint -- --fix
```

### Q: Lỗi build?

**A:**
```bash
# Clear Next.js cache
rm -rf .next

# Rebuild
npm run build
```

## 🚀 Deployment

### Q: Làm sao để deploy?

**A:** Xem [CLOUD_RUN_QUICK_REFERENCE.md](../../Guide/CLOUD_RUN_QUICK_REFERENCE.md)

Tóm tắt:
1. Build: `npm run build`
2. Test: `npm start`
3. Deploy to Cloud Run:
```bash
gcloud run deploy lmsmath \
  --region=asia-southeast1 \
  --source=. \
  --allow-unauthenticated
```

### Q: Environment variables trong production?

**A:** Sử dụng Google Secret Manager:
```bash
# Tạo secret
echo -n "secret-value" | gcloud secrets create SECRET_NAME --data-file=-

# Mount vào service
gcloud run services update lmsmath --region=asia-southeast1 \
  --set-secrets="DATABASE_URL=DATABASE_URL:latest"
```

Xem chi tiết: [CLOUD_RUN_QUICK_REFERENCE.md](../../Guide/CLOUD_RUN_QUICK_REFERENCE.md)

## 📚 Learning Resources

### Q: Tài liệu ở đâu?

**A:** Dự án có **299 file tài liệu** trong `Guide/`:

**Module này:**
- `docs/beginner/` - Module cho người mới (bạn đang ở đây)

**Getting Started:**
- `docs/getting-started/` - Hướng dẫn cài đặt
- `Guide/QUICK_START_LOCAL_DB.md` - Setup database nhanh
- `Guide/SETUP_LOCAL_DATABASE.md` - Setup database chi tiết

**Testing:**
- `Guide/TESTING_QUICK_REFERENCE.md` - Hướng dẫn testing
- `Guide/AUTH_QUICK_REFERENCE.md` - Auth testing

**Features:**
- `Guide/PYTHON_SIMULATIONS_GUIDE.md` - Simulations
- `Guide/OCR_GRADING_COMPLETE_GUIDE.md` - OCR Grading
- `Guide/AI_GENERATOR_COMPLETE_GUIDE.md` - AI Content Generator

**Deployment:**
- `Guide/CLOUD_RUN_QUICK_REFERENCE.md` - Cloud Run deployment
- `Guide/CLOUD_RUN_DEPLOYMENT_GUIDE.md` - Deployment chi tiết

**Xem tất cả:** `Guide/README.md` - Mục lục 299 files

### Q: Làm sao để học Next.js?

**A:**
- [Next.js Docs](https://nextjs.org/docs)
- [Next.js Learn](https://nextjs.org/learn)
- Xem code trong `app/` folder

### Q: Làm sao để học React?

**A:**
- [React Docs](https://react.dev)
- [React Tutorial](https://react.dev/learn)
- Xem components trong `components/` folder

## 🔧 Technical Questions

### Q: Server Component vs Client Component?

**A:**
- **Server Component** (default): Chạy trên server, không có JavaScript
- **Client Component** (`'use client'`): Chạy trên browser, có thể tương tác

### Q: Khi nào dùng API Route vs Server Action?

**A:**
- **API Route:** Khi cần REST API, webhooks, external integrations
- **Server Action:** Khi chỉ cần form submission, mutations từ client

### Q: Làm sao để optimize performance?

**A:**
1. Sử dụng Server Components khi có thể
2. Image optimization với `next/image`
3. Code splitting tự động
4. Caching với `revalidate`

## 💡 Best Practices

### Q: Code style guidelines?

**A:**
- Sử dụng TypeScript
- Follow ESLint rules
- Component naming: PascalCase
- File naming: kebab-case
- Functions: camelCase

### Q: Git workflow?

**A:**
1. Tạo branch: `git checkout -b feature/my-feature`
2. Commit: `git commit -m "feat: description"`
3. Push: `git push origin feature/my-feature`
4. Create PR

### Q: Testing strategy?

**A:**
- Unit tests cho utilities
- Integration tests cho API
- E2E tests cho critical flows

## 🆘 Getting Help

### Q: Không tìm thấy câu trả lời?

**A:**
1. Kiểm tra [Troubleshooting Guide](../troubleshooting/common-issues.md)
2. Tìm trong codebase (grep, search)
3. Hỏi team trên GitHub Issues
4. Xem logs để debug

### Q: Báo lỗi như thế nào?

**A:** Tạo GitHub Issue với:
- Mô tả lỗi
- Steps to reproduce
- Expected vs actual behavior
- Screenshots/logs
- Environment info

## 📝 Miscellaneous

### Q: Làm sao để contribute?

**A:**
1. Fork repository
2. Tạo branch mới
3. Make changes
4. Test thoroughly
5. Create Pull Request

### Q: License?

**A:** Proprietary and confidential. Xem `README.md`

### Q: Có roadmap không?

**A:** Xem các file trong `Guide/` folder hoặc GitHub Projects

---

## 🎯 Không Tìm Thấy Câu Trả Lời?

Nếu bạn không tìm thấy câu trả lời ở đây:

1. **Tìm trong codebase:** Sử dụng search trong IDE
2. **Xem tài liệu khác:** [Mục Lục](./index.md)
3. **Hỏi team:** Tạo issue hoặc liên hệ trực tiếp

---

**Quay lại:** [Mục Lục](./index.md)
