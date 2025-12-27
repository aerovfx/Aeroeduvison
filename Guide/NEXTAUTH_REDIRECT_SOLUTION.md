# NextAuth.js Role-Based Redirects - Complete Solution

## Vấn đề thường gặp và Giải pháp

### Vấn đề 1: Client không tự redirect khi gọi API bằng fetch/signIn với redirect: false

**Nguyên nhân:** Khi sử dụng `redirect: false`, NextAuth không tự động redirect, cần xử lý thủ công.

**Giải pháp:** Đã cập nhật `components/auth/login-form.tsx` để:
- Sử dụng `redirect: false` 
- Fetch session sau khi đăng nhập thành công
- Sử dụng utility function để xác định URL redirect dựa trên role
- Thực hiện redirect thủ công bằng `router.push()`

### Vấn đề 2: Server middleware/getServerSideProps không đọc session/token đúng để redirect theo role

**Nguyên nhân:** Middleware và server-side code cần logic rõ ràng để xử lý role-based redirects.

**Giải pháp:** 
1. **Middleware** (`middleware.ts`): Sử dụng utility functions để kiểm tra permissions và redirect
2. **getServerSideProps**: Cung cấp các helper functions để xử lý authentication và redirects
3. **NextAuth callbacks**: Thêm redirect callback để xử lý server-side redirects

## Các File Đã Được Cập Nhật

### 1. `/lib/auth.ts` - NextAuth Configuration
```typescript
callbacks: {
  async redirect({ url, baseUrl }) {
    // Xử lý redirect logic
    if (url.startsWith("/")) {
      return `${baseUrl}${url}`
    }
    if (url.startsWith(baseUrl)) {
      return url
    }
    // Default redirect to dashboard (middleware sẽ xử lý role-based routing)
    return `${baseUrl}/dashboard`
  },
  // ... other callbacks
}
```

### 2. `/lib/auth-redirect.ts` - Utility Functions
Các utility functions để xử lý role-based redirects:

- `getDashboardUrl(role)`: Lấy URL dashboard theo role
- `getRedirectUrl(role, callbackUrl)`: Xác định URL redirect cuối cùng
- `hasRoutePermission(role, pathname)`: Kiểm tra quyền truy cập route
- `getFallbackUrl(role)`: URL fallback khi không có quyền
- `redirectToDashboard(role, router)`: Client-side redirect
- `getServerSideRedirect(role, callbackUrl)`: Server-side redirect

### 3. `/components/auth/login-form.tsx` - Login Form
```typescript
const onSubmit = async (values: LoginFormData) => {
  const result = await signIn("credentials", {
    email: values.email,
    password: values.password,
    redirect: false, // Quan trọng: không để NextAuth tự redirect
    callbackUrl,
  });

  if (result?.ok) {
    // Fetch session để lấy role
    const response = await fetch('/api/auth/session');
    const session = await response.json();
    
    if (session?.user?.role) {
      const redirectUrl = getRedirectUrl(session.user.role, callbackUrl);
      router.push(redirectUrl); // Redirect thủ công
    }
  }
};
```

### 4. `/middleware.ts` - Middleware
```typescript
// Sử dụng utility functions
if (token && (isMarketingRoute || isAuthRoute)) {
  const dashboardUrl = getDashboardUrl(token.role as any)
  return NextResponse.redirect(new URL(dashboardUrl, request.url))
}

// Kiểm tra permissions
if (token) {
  const hasPermission = hasRoutePermission(token.role as any, pathname)
  if (!hasPermission) {
    const fallbackUrl = getFallbackUrl(token.role as any)
    return NextResponse.redirect(new URL(fallbackUrl, request.url))
  }
}
```

### 5. `/lib/auth-server-side.ts` - Server-Side Helpers
Cung cấp các helper functions cho getServerSideProps:

- `getServerSidePropsWithAuth`: Bảo vệ page và redirect theo role
- `getServerSidePropsAdminOnly`: Chỉ admin mới truy cập được
- `getServerSidePropsTeacherOrAdmin`: Teacher hoặc Admin
- `getServerSidePropsPublicWithRole`: Public page với role info

## Cách Sử Dụng

### 1. Client-Side Redirect (Trong Components)
```typescript
import { redirectToDashboard } from '@/lib/auth-redirect'

const handleLogin = async () => {
  const result = await signIn("credentials", {
    email, password,
    redirect: false
  });
  
  if (result?.ok) {
    const session = await fetch('/api/auth/session').then(r => r.json());
    redirectToDashboard(session.user.role, router);
  }
};
```

### 2. Server-Side Redirect (Trong Pages)
```typescript
// pages/admin/dashboard.tsx
import { getServerSidePropsAdminOnly } from '@/lib/auth-server-side'

export const getServerSideProps = getServerSidePropsAdminOnly

export default function AdminDashboard({ session }) {
  return <div>Admin Dashboard</div>
}
```

### 3. Middleware Protection
Middleware sẽ tự động:
- Redirect authenticated users từ marketing pages đến dashboard phù hợp
- Kiểm tra permissions cho protected routes
- Redirect unauthenticated users đến login page

## Role Mapping

| Role | Dashboard URL | Permissions |
|------|---------------|-------------|
| ADMIN | `/admin/dashboard` | Tất cả routes |
| TEACHER | `/teacher/dashboard` | `/teacher/*`, `/dashboard`, `/learning-paths`, `/ai-tutor` |
| STUDENT | `/dashboard` | `/dashboard`, `/learning-paths`, `/ai-tutor`, `/courses` |

## Testing

### Test Accounts (từ auth-simple.ts)
- **Teacher**: `teacher@example.com` / `teacher123`
- **Student**: `student@example.com` / `student123`

### Test Scenarios
1. **Login với redirect: false** - Kiểm tra client-side redirect
2. **Truy cập protected routes** - Kiểm tra middleware protection
3. **Role-based access** - Kiểm tra permissions
4. **Server-side redirects** - Kiểm tra getServerSideProps

## Troubleshooting

### Vấn đề: Client không redirect sau login
**Giải pháp:** Đảm bảo sử dụng `redirect: false` và xử lý redirect thủ công

### Vấn đề: Middleware không hoạt động
**Giải pháp:** Kiểm tra `NEXTAUTH_SECRET` và cookie configuration

### Vấn đề: Session không có role
**Giải pháp:** Kiểm tra JWT và session callbacks trong auth configuration

## Lưu Ý Quan Trọng

1. **Cookie Security**: Đảm bảo `NEXTAUTH_SECRET` được set đúng
2. **Domain Configuration**: Cập nhật domain trong cookie options cho production
3. **Error Handling**: Luôn có fallback redirect khi có lỗi
4. **Performance**: Middleware chạy trên mọi request, tránh logic phức tạp

## Kết Luận

Giải pháp này cung cấp:
- ✅ Client-side redirects với `redirect: false`
- ✅ Server-side redirects trong middleware và getServerSideProps  
- ✅ Role-based access control
- ✅ Utility functions tái sử dụng được
- ✅ Error handling và fallbacks
- ✅ Type safety với TypeScript

Tất cả các vấn đề thường gặp với NextAuth.js role-based redirects đã được giải quyết một cách toàn diện.
