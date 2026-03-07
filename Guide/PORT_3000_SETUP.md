# 🚀 Server Setup - Port 3000

## ✅ Hoàn Thành

Tất cả ports đã được clear. Ready để start trên port 3000!

---

## 🎯 Start Server

### Option 1: Script Tự Động (Khuyến Nghị)

```bash
./start-port-3000.sh
```

### Option 2: Manual

```bash
PORT=3000 npm run dev
```

---

## 🔍 Kiểm Tra

### Verify ports đã clear:
```bash
lsof -i :3000 -i :3001
# Should show nothing or only port 3000 after starting
```

### Check server đang chạy:
```bash
curl http://localhost:3000
# Should return HTML
```

---

## 🧪 Test URLs

Sau khi server start, test tại:

### Sign Up
```
http://localhost:3000/sign-up
```

### Sign In
```
http://localhost:3000/sign-in
```

### Dashboard
```
http://localhost:3000/dashboard
```

### Test Auth (API)
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"Test123!","role":"STUDENT"}'
```

---

## ✅ Environment Setup

### .env
```env
NEXTAUTH_URL="http://localhost:3000"
DATABASE_URL="file:./dev.db"
```

### .env.local
```env
DATABASE_URL="file:./dev.db"
```

---

## 📋 Status

| Item | Status |
|------|--------|
| Port 3000 | ✅ Clear |
| Port 3001 | ✅ Cleared |
| All Next.js servers | ✅ Stopped |
| NEXTAUTH_URL | ✅ Updated to :3000 |
| Start script | ✅ Created |
| Database URL | ✅ Correct |

---

## 🔧 Nếu Có Lỗi

### Port already in use:
```bash
# Kill port 3000
lsof -ti :3000 | xargs kill -9

# Or use the fix script
./fix-and-restart.sh
```

### Clear cache:
```bash
rm -rf .next
npm run dev
```

---

## 🎉 Ready!

Chạy lệnh này để start:

```bash
./start-port-3000.sh
```

Hoặc:

```bash
npm run dev
```

Server sẽ chạy tại: **http://localhost:3000** 🚀

---

**Created:** October 7, 2025  
**Status:** ✅ Ready to Start


