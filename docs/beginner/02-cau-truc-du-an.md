---
title: "Cấu Trúc Dự Án"
description: "Khám phá cách dự án được tổ chức, các thư mục quan trọng và vai trò của chúng"
published: true
---

# 2. Cấu Trúc Dự Án

Hiểu cấu trúc thư mục giúp bạn nhanh chóng tìm được file cần thiết và hiểu cách dự án được tổ chức.

## 📁 Cấu Trúc Tổng Quan

```
Aeroeduvision/
├── app/                    # Next.js App Router (Frontend + API)
├── components/             # React Components tái sử dụng
├── lib/                    # Utilities, helpers, services
├── prisma/                # Database schema & migrations
├── python-simulations/    # Python simulation servers
├── python-ocr/           # OCR grading service
├── docs/                  # Tài liệu (bạn đang ở đây!)
├── public/                # Static files (images, fonts)
├── scripts/               # Utility scripts
└── Guide/                 # Hướng dẫn chi tiết
```

## 📂 Chi Tiết Từng Thư Mục

### 1. `/app` - Next.js App Router

Đây là thư mục **quan trọng nhất**, chứa toàn bộ frontend và API routes.

```
app/
├── (auth)/                # Auth routes (login, register)
│   ├── login/
│   └── register/
├── (dashboard)/           # Dashboard routes
│   ├── dashboard/
│   ├── courses/
│   └── students/
├── api/                   # API endpoints
│   ├── auth/
│   ├── courses/
│   ├── ai/
│   └── simulations/
├── simulations/           # Simulation pages
├── layout.tsx             # Root layout
└── page.tsx               # Home page
```

**Ví dụ:**
- `app/page.tsx` → Trang chủ
- `app/api/courses/route.ts` → API tạo/lấy khóa học
- `app/(dashboard)/dashboard/page.tsx` → Trang dashboard

### 2. `/components` - React Components

Các component React có thể tái sử dụng.

```
components/
├── ui/                    # UI components (buttons, inputs, etc.)
│   ├── button.tsx
│   ├── input.tsx
│   └── card.tsx
├── auth/                  # Auth-related components
├── dashboard/             # Dashboard components
├── simulations/          # Simulation components
└── shared/                # Shared components
```

**Ví dụ:**
- `components/ui/button.tsx` → Component nút bấm
- `components/auth/login-form.tsx` → Form đăng nhập

### 3. `/lib` - Utilities & Services

Các hàm tiện ích, services, và logic tái sử dụng.

```
lib/
├── ai/                    # AI services
│   ├── index.ts           # Main AI service
│   └── gemini.ts          # Google Gemini integration
├── auth/                  # Auth utilities
├── db/                    # Database helpers
├── utils/                 # General utilities
└── validations/           # Zod schemas
```

**Ví dụ:**
- `lib/ai/index.ts` → Service gọi AI
- `lib/utils.ts` → Các hàm tiện ích (format date, etc.)

### 4. `/prisma` - Database

Schema database và migrations.

```
prisma/
├── schema.prisma          # Database schema
└── migrations/            # Database migrations
```

**Ví dụ:**
- `prisma/schema.prisma` → Định nghĩa các bảng (User, Course, etc.)

### 5. `/python-simulations` - Python Simulations

Các phòng thí nghiệm ảo viết bằng Python. Xem [PYTHON_SIMULATIONS_GUIDE.md](../../Guide/PYTHON_SIMULATIONS_GUIDE.md)

```
python-simulations/
├── build-all.py          # Master build script
├── requirements.txt      # Python dependencies
├── refraction/           # Simulation khúc xạ ánh sáng
│   ├── main.py          # Logic simulation
│   ├── build.py         # Build script
│   ├── manifest.json    # Metadata
│   └── output/
│       └── data.json    # Output data
├── projectile/          # Simulation chuyển động ném
├── motion-tracking/     # Theo dõi chuyển động
└── harmonic-motion/     # Dao động điều hòa
```

**Workflow:**
1. Viết logic trong `main.py`
2. Build với `build.py` → tạo `output/data.json`
3. `build-all.py` copy data vào `public/labs/`
4. Next.js hiển thị trong browser

**Ví dụ:**
- `python-simulations/projectile/main.py` → Logic tính toán quỹ đạo
- `public/labs/projectile/data.json` → Data sau khi build

### 6. `/python-ocr` - OCR Service

Dịch vụ nhận diện và chấm bài tự động.

```
python-ocr/
├── main.py               # OCR server
├── models/               # ML models
└── requirements.txt      # Python dependencies
```

### 7. `/docs` - Tài Liệu

Tài liệu dự án (bạn đang ở đây!).

```
docs/
├── beginner/             # Module cho người mới (đây!)
├── getting-started/      # Hướng dẫn bắt đầu
├── authentication/       # Tài liệu về auth
├── simulations/          # Tài liệu về simulations
└── deployment/           # Tài liệu về deployment
```

### 8. `/public` - Static Files

Các file tĩnh (hình ảnh, fonts, icons).

```
public/
├── images/               # Hình ảnh
├── fonts/                # Fonts
└── icons/                # Icons
```

### 9. `/scripts` - Utility Scripts

Các script tiện ích.

```
scripts/
├── add-students.ts       # Script thêm học sinh
├── setup-db.ts           # Script setup database
└── deploy.sh             # Script deploy
```

## 🔍 Cách Tìm File Nhanh

### Tìm Component
- **UI component** → `components/ui/`
- **Auth component** → `components/auth/`
- **Dashboard component** → `components/dashboard/`

### Tìm API Route
- **Auth API** → `app/api/auth/`
- **Course API** → `app/api/courses/`
- **AI API** → `app/api/ai/`

### Tìm Service
- **AI service** → `lib/ai/`
- **Database helper** → `lib/db/`
- **Utility function** → `lib/utils.ts`

### Tìm Page
- **Home page** → `app/page.tsx`
- **Dashboard** → `app/(dashboard)/dashboard/page.tsx`
- **Login** → `app/(auth)/login/page.tsx`

## 📝 Quy Ước Đặt Tên

### Files
- **Components**: `kebab-case.tsx` (ví dụ: `login-form.tsx`)
- **Pages**: `page.tsx` (Next.js App Router)
- **API Routes**: `route.ts` (Next.js App Router)
- **Utilities**: `camelCase.ts` (ví dụ: `formatDate.ts`)

### Folders
- **Components**: `kebab-case/` (ví dụ: `auth/`, `dashboard/`)
- **Pages**: `(group)/` cho route groups

## 🎯 Các File Quan Trọng

### Root Level
- `package.json` → Dependencies và scripts
- `tsconfig.json` → TypeScript config
- `next.config.js` → Next.js config
- `.env.local` → Environment variables (không commit!)

### App Level
- `app/layout.tsx` → Root layout
- `app/page.tsx` → Home page
- `middleware.ts` → Middleware (auth, etc.)

### Config
- `prisma/schema.prisma` → Database schema
- `tailwind.config.js` → TailwindCSS config
- `components.json` → shadcn/ui config

## 💡 Mẹo

1. **Sử dụng search trong IDE**: `Cmd/Ctrl + P` để tìm file nhanh
2. **Xem import statements**: Import sẽ chỉ đường đến file
3. **Check route structure**: URL path thường match với folder structure
4. **Read error messages**: Error thường chỉ rõ file và dòng lỗi

## 🚀 Bước Tiếp Theo

Bây giờ bạn đã hiểu cấu trúc dự án, hãy tiếp tục với:

👉 **[Khái Niệm Cơ Bản](./03-khai-niem-co-ban.md)** - Học các thuật ngữ quan trọng

---

**Câu hỏi?** Xem [FAQ](./06-cau-hoi-thuong-gap.md) hoặc quay lại [Mục Lục](./index.md)
