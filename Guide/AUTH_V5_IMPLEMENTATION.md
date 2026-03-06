# 🔐 NextAuth.js v5 Authorization Implementation

## ✅ Đã hoàn thành

### 1. Cấu hình Authentication
- **`auth.config.ts`** - Cấu hình providers (Google OAuth + Credentials)
- **`schemas/index.ts`** - Validation schemas cho forms
- **`data/user.ts`** - Database queries cho user

### 2. Authorization Components
- **`components/auth/role-gate.tsx`** - Component bảo vệ theo role
- **`components/form-error.tsx`** - Component hiển thị lỗi

### 3. Hooks
- **`hooks/use-current-role.ts`** - Hook lấy role hiện tại
- **`hooks/use-current-user.ts`** - Hook lấy user hiện tại

### 4. Route Protection
- **`routes.ts`** - Định nghĩa public/auth/protected routes
- **`middleware-new.ts`** - Middleware mới với NextAuth v5
- **`lib/auth-server.ts`** - Server-side auth utilities

### 5. Server Actions & API Routes
- **`actions/admin.ts`** - Server action với role checking
- **`app/api/admin/route.ts`** - API route với authorization

## 🚀 Cách sử dụng

### 1. Bảo vệ Component theo Role
```tsx
import { RoleGate } from "@/components/auth/role-gate";
import { UserRole } from "@prisma/client";

function AdminPage() {
  return (
    <RoleGate allowedRole={UserRole.ADMIN}>
      <div>Chỉ admin mới thấy được</div>
    </RoleGate>
  );
}
```

### 2. Sử dụng Hooks
```tsx
import { useCurrentRole, useCurrentUser } from "@/hooks/use-current-role";

function MyComponent() {
  const role = useCurrentRole();
  const user = useCurrentUser();
  
  return (
    <div>
      <p>Role: {role}</p>
      <p>User: {user?.email}</p>
    </div>
  );
}
```

### 3. Server-side Authorization
```tsx
import { currentRole } from "@/lib/auth-server";

export async function adminAction() {
  const role = await currentRole();
  
  if (role !== UserRole.ADMIN) {
    return { error: "Forbidden!" };
  }
  
  // Admin logic here
}
```

## 🔄 Migration từ Middleware cũ

Để áp dụng middleware mới:

1. **Backup middleware hiện tại:**
   ```bash
   mv middleware.ts middleware-old.ts
   ```

2. **Sử dụng middleware mới:**
   ```bash
   mv middleware-new.ts middleware.ts
   ```

3. **Cập nhật routes trong `routes.ts`** nếu cần

## 📋 Các Route được bảo vệ

### Public Routes (không cần auth)
- `/` - Trang chủ
- `/pricing` - Bảng giá
- `/privacy` - Chính sách bảo mật
- `/terms` - Điều khoản
- `/auth/new-verification` - Xác thực email

### Auth Routes (redirect nếu đã login)
- `/sign-in` - Đăng nhập
- `/sign-up` - Đăng ký
- `/auth/error` - Lỗi auth
- `/auth/reset` - Reset password
- `/auth/new-password` - Password mới

### Protected Routes (cần auth)
- Tất cả routes khác đều cần đăng nhập
- Redirect về `/sign-in` nếu chưa đăng nhập

## 🎯 Next Steps

1. **Test authorization** với các role khác nhau
2. **Cập nhật UI components** để sử dụng RoleGate
3. **Thêm role-based navigation** trong header/sidebar
4. **Implement fine-grained permissions** nếu cần

## 🔧 Troubleshooting

### Lỗi "Module not found"
- Đảm bảo đã cài đặt `zod`: `npm install zod`
- Kiểm tra import paths

### Middleware không hoạt động
- Kiểm tra `NEXTAUTH_SECRET` trong env
- Đảm bảo `auth.config.ts` được import đúng

### Role không được lưu
- Kiểm tra JWT callback trong `lib/auth.ts`
- Đảm bảo role được set trong database
