# 🔐 Hệ thống phân quyền LMS (RBAC + ABAC)

## Tổng quan

Hệ thống LMS sử dụng kết hợp **RBAC (Role-Based Access Control)** và **ABAC (Attribute-Based Access Control)** để quản lý quyền truy cập một cách linh hoạt và bảo mật.

## 🎯 Các loại người dùng

### 1. **ADMIN** 👑
- **Quyền hạn**: Toàn quyền quản lý hệ thống
- **Chức năng chính**:
  - Tạo, sửa, xóa mọi user, course, lesson, quiz, assignment
  - Quản lý phân quyền và thay đổi role của user
  - Xem analytics toàn hệ thống
  - Quản lý enrollment và override progress
  - Upload file ở mọi nơi

### 2. **TEACHER** 👨‍🏫
- **Quyền hạn**: Quản lý nội dung khóa học của mình
- **Chức năng chính**:
  - Tạo, sửa, xóa khóa học do mình sở hữu
  - Quản lý lesson, quiz, assignment trong khóa học của mình
  - Upload video/tài liệu cho course/lesson của mình
  - Xem danh sách học viên đăng ký
  - Xem analytics của các khóa học mình sở hữu
  - Chấm điểm submissions

### 3. **STUDENT** 🎓
- **Quyền hạn**: Học tập và tương tác với nội dung
- **Chức năng chính**:
  - Xem các khóa học đã mua/đăng ký
  - Học lesson, làm quiz, nộp assignment
  - Xem tiến độ học tập cá nhân
  - Thanh toán và mua khóa học
  - Chỉnh sửa profile cá nhân

### 4. **GUEST** 👤
- **Quyền hạn**: Duyệt catalog khóa học
- **Chức năng chính**:
  - Xem danh sách khóa học (không xem nội dung chi tiết)
  - Đăng ký tài khoản để tham gia

## 📊 Ma trận phân quyền chi tiết

| Module | ADMIN | TEACHER | STUDENT | GUEST |
|--------|-------|---------|---------|-------|
| **Users** | Full | Edit (own) | Edit (own) | Create |
| **Courses** | Full | Edit (own) | View (enrolled) | View (catalog) |
| **Lessons** | Full | Edit (own) | View (enrolled) | None |
| **Quizzes** | Full | Edit (own) | View (enrolled) | None |
| **Assignments** | Full | Edit (own) | View (enrolled) | None |
| **Progress** | Full | View (own) | View (own) | None |
| **Payments** | Full | View (own) | View (own) | None |
| **Videos** | Full | Edit (own) | View (enrolled) | None |
| **Analytics** | Full | View (own) | None | None |

## 🔧 Cách sử dụng trong code

### 1. Kiểm tra quyền cơ bản (RBAC)

```typescript
import { isAdmin, isTeacher, isStudent } from '@/lib/permissions';

// Kiểm tra role
if (isAdmin(userRole)) {
  // Admin logic
}

if (isTeacher(userRole)) {
  // Teacher logic
}

if (isStudent(userRole)) {
  // Student logic
}
```

### 2. Kiểm tra quyền với ownership (ABAC)

```typescript
import { 
  canManageCourse, 
  canAccessCourseContent,
  canTakeQuiz,
  canSubmitAssignment 
} from '@/lib/permissions';

// Kiểm tra quyền quản lý khóa học
if (canManageCourse(userRole, userId, courseOwnerId)) {
  // User có thể quản lý khóa học này
}

// Kiểm tra quyền truy cập nội dung khóa học
if (canAccessCourseContent(userRole, userId, courseOwnerId, enrolledUserIds)) {
  // User có thể xem nội dung khóa học
}

// Kiểm tra quyền làm quiz
if (canTakeQuiz(userRole, userId, courseOwnerId, enrolledUserIds)) {
  // Student có thể làm quiz
}
```

### 3. Sử dụng middleware kiểm tra quyền

```typescript
import { checkCourseManagementPermission } from '@/lib/permission-middleware';

export async function POST(request: NextRequest) {
  // Kiểm tra quyền trước khi xử lý
  const permissionCheck = await checkCourseManagementPermission(request, courseId);
  if (permissionCheck) return permissionCheck;
  
  // Logic xử lý tiếp theo...
}
```

## 🛡️ Bảo mật

### 1. Middleware bảo vệ routes

```typescript
// middleware.ts
if (pathname.startsWith('/admin')) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token || token.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }
}
```

### 2. Kiểm tra quyền trong API routes

```typescript
// app/api/courses/[courseId]/route.ts
export async function PATCH(req: Request, { params }) {
  const { courseId } = await params;
  
  // Kiểm tra quyền quản lý khóa học
  const permissionCheck = await checkCourseManagementPermission(req, courseId);
  if (permissionCheck) return permissionCheck;
  
  // Xử lý cập nhật khóa học...
}
```

### 3. Kiểm tra ownership trong database queries

```typescript
// Đảm bảo teacher chỉ có thể sửa khóa học của mình
const course = await db.course.update({
  where: {
    id: courseId,
    userId: session.user.id // Chỉ sửa được khóa học của mình
  },
  data: { ...values }
});
```

## 🧪 Testing

### Chạy test hệ thống phân quyền

```bash
npx tsx scripts/test-permissions.ts
```

Test sẽ kiểm tra:
- ✅ RBAC: Phân quyền dựa trên role
- ✅ ABAC: Phân quyền dựa trên ownership
- ✅ Admin: Toàn quyền truy cập
- ✅ Teacher: Quyền truy cập khóa học của mình
- ✅ Student: Quyền truy cập khóa học đã đăng ký

## 📝 Best Practices

### 1. Luôn kiểm tra quyền ở cả frontend và backend

```typescript
// Frontend: Ẩn/hiện UI elements
{canManageCourse(userRole, userId, courseOwnerId) && (
  <EditCourseButton />
)}

// Backend: Kiểm tra quyền trong API
const permissionCheck = await checkCourseManagementPermission(request, courseId);
if (permissionCheck) return permissionCheck;
```

### 2. Sử dụng helper functions thay vì kiểm tra trực tiếp

```typescript
// ❌ Không nên
if (userRole === 'TEACHER' && userId === courseOwnerId) {
  // logic
}

// ✅ Nên dùng
if (canManageCourse(userRole, userId, courseOwnerId)) {
  // logic
}
```

### 3. Kiểm tra quyền ở nhiều lớp

1. **Middleware**: Bảo vệ routes
2. **API routes**: Kiểm tra quyền cụ thể
3. **Database queries**: Đảm bảo ownership
4. **Frontend**: Ẩn/hiện UI elements

## 🔄 Cập nhật hệ thống

### Thêm role mới

1. Cập nhật `DEFAULT_ROLES` trong `lib/permissions.ts`
2. Thêm helper functions cho role mới
3. Cập nhật middleware nếu cần
4. Test với script `test-permissions.ts`

### Thêm module mới

1. Thêm module vào `ModulePermissions` interface
2. Cập nhật `DEFAULT_ROLES` với quyền cho module mới
3. Tạo helper functions cho module
4. Thêm middleware kiểm tra quyền
5. Cập nhật API routes

## 🚨 Lưu ý quan trọng

1. **Không bao giờ tin tưởng frontend**: Luôn kiểm tra quyền ở backend
2. **Kiểm tra ownership**: Đảm bảo user chỉ truy cập được resource của mình
3. **Logging**: Ghi log các hoạt động quan trọng để audit
4. **Regular testing**: Chạy test định kỳ để đảm bảo hệ thống hoạt động đúng
5. **Documentation**: Cập nhật tài liệu khi thay đổi hệ thống phân quyền

---

**Hệ thống phân quyền này đảm bảo tính bảo mật và linh hoạt cho LMS, cho phép quản lý quyền truy cập một cách chi tiết và an toàn.**
