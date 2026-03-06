# Phase 1 - Kiến trúc Modular Monolith

## 🎯 Mục tiêu
Hoàn thiện Modular Monolith với boundaries rõ ràng và multi-tenancy.

## 📊 Hiện trạng
- ✅ Có cấu trúc modular cơ bản
- ❌ Chưa có multi-tenancy (school_id)
- ❌ Chưa có boundaries rõ ràng
- ❌ Chưa có shared kernel

## 🏗️ Kiến trúc mục tiêu

```
src/
├── shared/                    # Shared Kernel
│   ├── auth/                 # Authentication & Authorization
│   ├── logging/              # Centralized Logging
│   ├── errors/               # Error Handling
│   ├── types/                # Shared Types
│   └── utils/                # Shared Utilities
├── modules/
│   ├── user/                 # User Management Module
│   │   ├── domain/
│   │   ├── application/
│   │   ├── infrastructure/
│   │   └── presentation/
│   ├── course/               # Course Management Module
│   ├── quiz/                 # Quiz System Module
│   ├── assignment/           # Assignment Module
│   ├── video/                # Video Platform Module
│   ├── learning-path/        # Learning Path Module
│   ├── chat/                 # Live Chat Module
│   ├── competition/          # Competition Module
│   ├── stem/                 # STEM Projects Module
│   └── calendar/             # Calendar & Tasks Module
└── app/                      # Next.js App Router
    ├── api/                  # API Routes
    ├── (auth)/               # Auth Pages
    ├── (dashboard)/          # Dashboard Pages
    └── admin/                # Admin Pages
```

## 🔧 Multi-tenancy Implementation

### Database Schema Updates
```sql
-- Add school_id to all main entities
ALTER TABLE "User" ADD COLUMN "schoolId" TEXT;
ALTER TABLE "Course" ADD COLUMN "schoolId" TEXT;
ALTER TABLE "Chapter" ADD COLUMN "schoolId" TEXT;
-- ... other tables

-- Create School table
CREATE TABLE "School" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "domain" TEXT UNIQUE,
  "settings" JSONB,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);
```

### Context-based School Resolution
```typescript
// lib/school-context.ts
export interface SchoolContext {
  schoolId: string;
  school: School;
  isMultiTenant: boolean;
}

export function getSchoolFromRequest(req: Request): SchoolContext {
  // Resolve from subdomain, header, or JWT
}
```

## 🚧 Module Boundaries

### 1. User Module
- **Domain**: User, Role, Permission entities
- **Application**: User management services
- **Infrastructure**: User repository, auth providers
- **Presentation**: User management UI

### 2. Course Module
- **Domain**: Course, Chapter, Lesson entities
- **Application**: Course management services
- **Infrastructure**: Course repository, file storage
- **Presentation**: Course management UI

### 3. Quiz Module
- **Domain**: Quiz, Question, Answer entities
- **Application**: Quiz creation, grading services
- **Infrastructure**: Quiz repository, grading engine
- **Presentation**: Quiz interface UI

## 🔐 Cross-cutting Concerns

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (RBAC)
- Attribute-based access control (ABAC)
- School-level permissions

### Logging
- Structured logging with Winston
- Request/response logging
- Error tracking
- Performance monitoring

### Error Handling
- Global error boundary
- API error responses
- User-friendly error messages
- Error reporting

## 📈 Implementation Timeline

### Week 1-2: Database & Multi-tenancy
- [ ] Update Prisma schema for multi-tenancy
- [ ] Create migration scripts
- [ ] Implement school context resolution
- [ ] Update all queries to include schoolId

### Week 3-4: Module Boundaries
- [ ] Restructure code into module boundaries
- [ ] Create shared kernel
- [ ] Implement module interfaces
- [ ] Add module-level tests

### Week 5-6: Cross-cutting Concerns
- [ ] Implement centralized logging
- [ ] Add error handling framework
- [ ] Enhance authentication system
- [ ] Add monitoring and metrics

## 🧪 Testing Strategy

### Unit Tests
- Module-level unit tests
- Service layer tests
- Repository tests

### Integration Tests
- API endpoint tests
- Database integration tests
- Authentication flow tests

### E2E Tests
- Critical user journeys
- Multi-tenant scenarios
- Error handling flows

## 📊 Success Metrics

- [ ] All modules have clear boundaries
- [ ] Multi-tenancy works correctly
- [ ] 90%+ test coverage
- [ ] < 200ms API response times
- [ ] Zero data leakage between schools
- [ ] Centralized logging working
- [ ] Error handling standardized

