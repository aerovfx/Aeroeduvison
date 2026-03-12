---
title: "Các Tác Vụ Thường Gặp"
description: "Hướng dẫn thực hiện các công việc phổ biến nhất khi làm việc với dự án"
published: true
---

# 5. Các Tác Vụ Thường Gặp

Hướng dẫn thực hiện các công việc phổ biến nhất khi làm việc với dự án.

## 🔧 Development Tasks

### Tạo Component Mới

#### Bước 1: Tạo File Component

```bash
# Tạo file trong components/
touch components/my-component.tsx
```

#### Bước 2: Viết Component

```tsx
// components/my-component.tsx
export function MyComponent() {
  return (
    <div className="p-4 bg-blue-500 text-white">
      Hello from MyComponent!
    </div>
  )
}
```

#### Bước 3: Sử Dụng Component

```tsx
// app/page.tsx
import { MyComponent } from '@/components/my-component'

export default function Home() {
  return (
    <div>
      <h1>Home Page</h1>
      <MyComponent />
    </div>
  )
}
```

### Tạo Page Mới

#### Bước 1: Tạo Folder và File

```bash
# Tạo folder và file page.tsx
mkdir -p app/about
touch app/about/page.tsx
```

#### Bước 2: Viết Page

```tsx
// app/about/page.tsx
export default function AboutPage() {
  return (
    <div>
      <h1>About Us</h1>
      <p>This is the about page</p>
    </div>
  )
}
```

**Kết quả:** Page sẽ có URL: `http://localhost:3000/about`

### Tạo API Endpoint

#### Bước 1: Tạo File Route

```bash
# Tạo API route
mkdir -p app/api/users
touch app/api/users/route.ts
```

#### Bước 2: Viết API Handler

```tsx
// app/api/users/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  const users = [
    { id: 1, name: 'John' },
    { id: 2, name: 'Jane' }
  ]
  
  return NextResponse.json(users)
}

export async function POST(request: Request) {
  const body = await request.json()
  // Xử lý tạo user mới
  return NextResponse.json({ success: true })
}
```

**Kết quả:** 
- `GET /api/users` → Lấy danh sách users
- `POST /api/users` → Tạo user mới

## 🗄️ Database Tasks

### Thêm Model Mới vào Database

#### Bước 1: Cập Nhật Schema

```prisma
// prisma/schema.prisma
model Post {
  id        String   @id @default(cuid())
  title     String
  content   String
  authorId  String
  author    User     @relation(fields: [authorId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

#### Bước 2: Push Schema

```bash
npm run db:push
```

#### Bước 3: Generate Prisma Client

```bash
npm run db:generate
```

### Query Database

```typescript
// lib/db/queries.ts
import { prisma } from '@/lib/db'

// Lấy tất cả users
export async function getAllUsers() {
  return await prisma.user.findMany()
}

// Lấy user theo ID
export async function getUserById(id: string) {
  return await prisma.user.findUnique({
    where: { id }
  })
}

// Tạo user mới
export async function createUser(data: {
  email: string
  name: string
  password: string
}) {
  return await prisma.user.create({
    data
  })
}
```

### Chạy Migration

```bash
# Tạo migration mới
npm run db:migrate

# Deploy migrations (production)
npm run db:migrate:deploy
```

## 🔐 Authentication Tasks

### Thêm Route Bảo Vệ (Protected Route)

#### Sử dụng Middleware

```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Kiểm tra authentication
  const token = request.cookies.get('auth-token')
  
  if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: '/dashboard/:path*'
}
```

### Kiểm Tra Role trong Component

```tsx
// components/protected-component.tsx
'use client'

import { useSession } from 'next-auth/react'

export function ProtectedComponent() {
  const { data: session } = useSession()
  
  if (!session) {
    return <div>Please login</div>
  }
  
  if (session.user.role !== 'TEACHER') {
    return <div>Access denied</div>
  }
  
  return <div>Teacher content</div>
}
```

## 🎨 Styling Tasks

### Thêm Style với TailwindCSS

```tsx
// Sử dụng utility classes
<div className="flex items-center justify-between p-4 bg-blue-500 text-white rounded-lg">
  Content
</div>
```

### Tạo Custom Component với shadcn/ui

```bash
# Thêm component từ shadcn/ui
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
```

Sử dụng:

```tsx
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export function MyComponent() {
  return (
    <Card>
      <Button>Click me</Button>
    </Card>
  )
}
```

## 🤖 AI Tasks

### Gọi AI Service

```typescript
// lib/ai/generate-content.ts
import { ai } from '@/lib/ai'

export async function generateLesson(topic: string) {
  const prompt = `Create a lesson about ${topic}`
  
  const response = await ai.generate(prompt)
  
  return response
}
```

### Sử dụng trong API Route

```typescript
// app/api/ai/generate/route.ts
import { generateLesson } from '@/lib/ai/generate-content'

export async function POST(request: Request) {
  const { topic } = await request.json()
  
  const lesson = await generateLesson(topic)
  
  return Response.json({ lesson })
}
```

## 🔬 Simulation Tasks

### Tạo Simulation Mới

Xem hướng dẫn chi tiết trong [PYTHON_SIMULATIONS_GUIDE.md](../../Guide/PYTHON_SIMULATIONS_GUIDE.md)

#### Bước 1: Tạo Folder và Files

```bash
mkdir -p python-simulations/my-simulation/output
cd python-simulations/my-simulation
```

#### Bước 2: Tạo `manifest.json`

```json
{
  "id": "my-simulation",
  "name": "Tên Simulation",
  "description": "Mô tả chi tiết",
  "category": "Cơ học",
  "level": "Lớp 10",
  "version": "1.0.0"
}
```

#### Bước 3: Viết `main.py` (Logic Simulation)

```python
import numpy as np

class MySimulation:
    def __init__(self, param1, param2):
        self.param1 = param1
        self.param2 = param2
        
    def calculate(self):
        return self.param1 * self.param2
    
    def to_dict(self):
        return {
            "param1": self.param1,
            "param2": self.param2,
            "result": self.calculate()
        }

def generate_animation_frames(num_frames=50):
    frames = []
    for i in range(num_frames):
        sim = MySimulation(param1=i, param2=100)
        frames.append(sim.to_dict())
    return frames
```

#### Bước 4: Viết `build.py`

```python
import json
import os
from main import generate_animation_frames

def build():
    simulation_data = {
        "title": "My Simulation",
        "type": "my-simulation",
        "frames": generate_animation_frames(50)
    }
    
    os.makedirs("output", exist_ok=True)
    with open("output/data.json", "w", encoding="utf-8") as f:
        json.dump(simulation_data, f, ensure_ascii=False, indent=2)
    
    print("✅ Build completed!")

if __name__ == "__main__":
    build()
```

#### Bước 5: Build và Test

```bash
cd python-simulations
python3 build-all.py
```

#### Bước 6: Tạo Next.js Page

```tsx
// app/(dashboard)/(routes)/dashboard/labtwin/labs/my-simulation/page.tsx
import { MySimulationViewer } from "@/components/simulations/my-simulation-viewer";

async function getSimulationData() {
  const response = await fetch('/labs/my-simulation/data.json', {
    cache: 'no-store'
  });
  return response.json();
}

export default async function MySimulationPage() {
  const data = await getSimulationData();
  return (
    <div className="container mx-auto p-8">
      <h1>My Simulation</h1>
      <MySimulationViewer data={data} />
    </div>
  );
}
```

## 📝 Testing Tasks

### Chạy Tests

```bash
# Auth tests (comprehensive)
npm run test:auth

# Prisma database tests
npm run test:prisma

# API endpoint tests (cần dev server chạy)
npm run test:auth:api

# Tất cả tests
npm run test:auth:all

# Quick verification
npm run test:auth:verify
```

### Test Users (Có sẵn)

| Role | Email | Password |
|------|-------|----------|
| 👨‍🎓 Student | `student.test@example.com` | `StudentPass123!` |
| 👨‍🏫 Teacher | `teacher.test@example.com` | `TeacherPass123!` |
| 👑 Admin | `admin.test@example.com` | `AdminPass123!` |

### Viết Test Mới

Xem [TESTING_QUICK_REFERENCE.md](../../Guide/TESTING_QUICK_REFERENCE.md) để biết chi tiết.

```typescript
// scripts/test-my-feature.ts
import { prisma } from '@/lib/db'

async function testMyFeature() {
  console.log('Testing my feature...')
  
  // Test logic here
  const result = await myFunction()
  
  if (result.success) {
    console.log('✅ Test passed!')
  } else {
    console.log('❌ Test failed!')
    process.exit(1)
  }
}

testMyFeature()
```

## 🚀 Deployment Tasks

### Build cho Production

```bash
# Build ứng dụng
npm run build

# Test production build locally
npm start
```

### Deploy lên Cloud Run

```bash
# Build Docker image
docker build -t aeroeduvison .

# Push to Google Container Registry
docker tag aeroeduvison gcr.io/PROJECT_ID/aeroeduvison
docker push gcr.io/PROJECT_ID/aeroeduvison

# Deploy to Cloud Run
gcloud run deploy aeroeduvison \
  --image gcr.io/PROJECT_ID/aeroeduvison \
  --platform managed \
  --region us-central1
```

## 🔍 Debugging Tasks

### Debug trong VS Code

1. Tạo file `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node-terminal",
      "request": "launch",
      "command": "npm run dev"
    }
  ]
}
```

2. Set breakpoints trong code
3. Chạy debug (F5)

### Xem Logs

```bash
# Development logs
npm run dev

# Production logs (Cloud Run)
gcloud run services logs read aeroeduvison --region us-central1
```

## 📦 Package Management Tasks

### Thêm Package Mới

```bash
# Thêm dependency
npm install package-name

# Thêm dev dependency
npm install -D package-name
```

### Cập Nhật Packages

```bash
# Kiểm tra packages cũ
npm outdated

# Cập nhật tất cả
npm update

# Cập nhật package cụ thể
npm install package-name@latest
```

## 🎯 Best Practices

### Code Organization
- ✅ Đặt components trong `components/`
- ✅ Đặt utilities trong `lib/`
- ✅ Đặt types trong `types/`
- ✅ Đặt hooks trong `hooks/`

### Naming Conventions
- ✅ Components: PascalCase (`MyComponent.tsx`)
- ✅ Files: kebab-case (`my-component.tsx`)
- ✅ Functions: camelCase (`getUserById`)
- ✅ Constants: UPPER_SNAKE_CASE (`API_BASE_URL`)

### Git Workflow
```bash
# Tạo branch mới
git checkout -b feature/my-feature

# Commit changes
git add .
git commit -m "feat: add new feature"

# Push to remote
git push origin feature/my-feature
```

## 🚀 Bước Tiếp Theo

Bây giờ bạn đã biết các tác vụ thường gặp, hãy xem:

👉 **[Câu Hỏi Thường Gặp](./06-cau-hoi-thuong-gap.md)** - Tìm câu trả lời cho thắc mắc

---

**Câu hỏi?** Xem [FAQ](./06-cau-hoi-thuong-gap.md) hoặc quay lại [Mục Lục](./index.md)
