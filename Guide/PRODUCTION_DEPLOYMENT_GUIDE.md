# 🚀 Production Deployment Guide

## ✅ Vấn đề đã được sửa

**Lỗi 404 static assets** trên production đã được khắc phục bằng cách:
- ✅ Loại bỏ `assetPrefix` cố định trong `next.config.js`
- ✅ Tạo cấu hình linh hoạt cho các platform khác nhau
- ✅ Test production build thành công

## 🔧 Cấu hình hiện tại

### next.config.js
```javascript
// Output configuration - linh hoạt cho các platform
output: process.env.NODE_ENV === 'production' && process.env.NEXT_OUTPUT ? process.env.NEXT_OUTPUT : 'standalone',

// Asset prefix - chỉ kích hoạt khi cần thiết
assetPrefix: process.env.NODE_ENV === 'production' && process.env.ASSET_PREFIX ? process.env.ASSET_PREFIX : '',
```

## 🌐 Hướng dẫn deploy cho các platform

### 1. Vercel (Khuyến nghị)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# - DATABASE_URL
# - NEXTAUTH_URL=https://your-domain.vercel.app
# - NEXTAUTH_SECRET
# - GOOGLE_CLIENT_ID (optional)
# - GOOGLE_CLIENT_SECRET (optional)
```

**Environment variables cho Vercel:**
```env
DATABASE_URL=your-production-database-url
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=your-secret-key
```

### 2. Netlify
```bash
# Build command
npm run build

# Publish directory
.next

# Environment variables trong Netlify dashboard
```

### 3. Google Cloud Run
```bash
# Build và push image
gcloud builds submit --tag gcr.io/PROJECT_ID/lmsmath
gcloud run deploy --image gcr.io/PROJECT_ID/lmsmath --platform managed

# Set environment variables
gcloud run services update SERVICE_NAME --set-env-vars="NEXTAUTH_URL=https://your-domain.com"
```

### 4. Railway
```bash
# Connect GitHub repository
# Set environment variables trong Railway dashboard
```

## 🔑 Environment Variables cần thiết

### Production (Bắt buộc)
```env
DATABASE_URL=postgresql://user:password@host:port/database
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-secret-key-here
```

### Tùy chọn
```env
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Supabase (nếu sử dụng)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Google Cloud Storage
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_CREDENTIALS=your-service-account-json

# Stripe (nếu cần)
STRIPE_API_KEY=your-stripe-api-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
```

## 📋 Checklist trước khi deploy

- [ ] ✅ Build production thành công: `npm run build`
- [ ] ✅ Test production build locally: `npm run start`
- [ ] ✅ Database production đã sẵn sàng
- [ ] ✅ Environment variables đã được set
- [ ] ✅ Domain đã được cấu hình (nếu có)
- [ ] ✅ SSL certificate đã được setup
- [ ] ✅ Google OAuth redirect URIs đã được cập nhật (nếu sử dụng)

## 🚨 Lưu ý quan trọng

### 1. Database
- **Production database** phải được setup riêng
- **Migrate schema**: `npx prisma migrate deploy`
- **Seed data** nếu cần: `npx prisma db seed`

### 2. Google OAuth (nếu sử dụng)
- Cập nhật **Authorized redirect URIs**:
  ```
  https://your-domain.com/api/auth/callback/google
  ```
- Cập nhật **Authorized JavaScript origins**:
  ```
  https://your-domain.com
  ```

### 3. Domain và SSL
- Đảm bảo domain đã được cấu hình đúng
- SSL certificate phải hoạt động
- `NEXTAUTH_URL` phải match với domain thực

## 🔄 Scripts hữu ích

### Test production build
```bash
node scripts/test-production-build.js
```

### Check OAuth setup
```bash
tsx scripts/setup-oauth.ts
```

### Test authentication
```bash
tsx scripts/test-auth.ts
```

## 📞 Troubleshooting

### Lỗi 404 static assets
- ✅ **Đã sửa**: Loại bỏ `assetPrefix` cố định
- Kiểm tra cấu hình platform deployment

### Lỗi database connection
- Kiểm tra `DATABASE_URL` format
- Đảm bảo database server accessible
- Kiểm tra firewall/network settings

### Lỗi authentication
- Kiểm tra `NEXTAUTH_URL` match với domain
- Verify `NEXTAUTH_SECRET` được set
- Check Google OAuth redirect URIs

### Lỗi build
- Clear cache: `rm -rf .next node_modules`
- Reinstall: `npm install`
- Check environment variables

## 🎯 Kết luận

**Production build đã sẵn sàng!** 

- ✅ Static assets được generate đúng cách
- ✅ Cấu hình linh hoạt cho nhiều platform
- ✅ Authentication system hoạt động tốt
- ✅ Database connection ổn định

**Bạn có thể deploy lên bất kỳ platform nào mà không gặp lỗi 404 static assets!**




