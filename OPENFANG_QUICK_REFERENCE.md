# ✅ OpenFang Mock Mode - Quick Reference

## 🎉 Problem Solved!

The OpenFang Agent error has been fixed by enabling **Mock Mode** for development.

---

## ⚡ What You Need to Do

### 1. **Hard Refresh Your Browser**
```
macOS: Cmd + Shift + R
Windows: Ctrl + Shift + R
```

### 2. **Or Clear Cache and Reload**
```
macOS: Cmd + Option + R
Windows: Ctrl + Shift + Delete
```

### 3. **Verify It's Working**

Open browser console (F12) and look for:
```javascript
[OpenFang Client] Configuration: {
  OPENFANG_BASE_URL: "http://127.0.0.1:4200",
  OPENFANG_MOCK_MODE: true,
  NODE_ENV: "development"
}
```

Then when you send a message:
```javascript
[OpenFang Client] Mock mode enabled, returning mock response
```

---

## 📝 What Changed

### Files Modified:
- ✅ `lib/openfang-client.ts` - Added mock mode support
- ✅ `.env.local` - Added `OPENFANG_MOCK_MODE=true`
- ✅ `.env.example` - Documented OpenFang config
- ✅ `.env.local.example` - Added complete config section

### New Documentation:
- ✅ `OPENFANG_DEV_SETUP.md` - Complete setup guide
- ✅ `OPENFANG_TROUBLESHOOTING.md` - Updated with mock mode
- ✅ `OPENFANG_QUICK_REFERENCE.md` - This file!

---

## 🧪 Test the Agent Chat

1. **Go to**: `/teacher/agents`
2. **Select**: "Tutor" agent
3. **Type**: "Xin chào"
4. **Expected Response**:
```
Chào bạn! Tôi là Trợ giảng AI. Tôi có thể giúp gì cho bạn hôm nay? 

(Ghi chú: Đây là phản hồi mock. Để sử dụng trợ giảng AI thực tế, vui lòng khởi động OpenFang Agent OS.)
```

---

## 🔧 If It's Still Not Working

### Check 1: Environment Variable
```bash
grep OPENFANG_MOCK_MODE /Users/pixibox/Aeroeduvison/.env.local
# Should output: OPENFANG_MOCK_MODE=true
```

### Check 2: Server Restarted
The dev server must be restarted after changing `.env.local`:
```bash
# Stop server
pkill -f next-server

# Start server
npm run dev
```

### Check 3: Browser Console
Look for these logs:
```javascript
[OpenFang Client] Configuration: { ... OPENFANG_MOCK_MODE: true ... }
[OpenFang Client] Mock mode enabled, returning mock response
```

If you see:
```javascript
[OpenFang Client] Triggering agent: tutor-general
```
→ Mock mode is NOT enabled, server needs restart!

### Check 4: Clear Next.js Cache
```bash
rm -rf .next
npm run dev
```

---

## 🎯 Quick Commands

### Restart Dev Server (After .env changes)
```bash
pkill -f next-server && npm run dev
```

### Clear All Caches
```bash
rm -rf .next node_modules/.cache
npm run dev
```

### Check Environment Variables
```bash
# In browser console
console.log(process.env.OPENFANG_MOCK_MODE)
```

---

## 📊 Mock vs Real Mode

| Feature | Mock Mode | Real Service |
|---------|-----------|--------------|
| Setup | Instant | Requires Rust |
| Response Time | ~500ms | 2-10 seconds |
| Response Quality | Predefined | AI-generated |
| Best For | Dev/Testing | Production |
| Service Required | None | OpenFang @ 4200 |

---

## 🚀 Switch to Real Service (Optional)

When you want real AI responses:

### 1. Start OpenFang
```bash
cd openfang-core
cargo run --release
```

### 2. Update .env.local
```bash
OPENFANG_MOCK_MODE=false
```

### 3. Restart Server
```bash
pkill -f next-server && npm run dev
```

---

## 💡 Pro Tips

### 1. Create Toggle Script
Save as `toggle-mock.sh`:
```bash
#!/bin/bash
if grep -q "OPENFANG_MOCK_MODE=true" .env.local; then
  sed -i '' 's/OPENFANG_MOCK_MODE=true/OPENFANG_MOCK_MODE=false/' .env.local
  echo "❌ Switched to REAL service mode"
else
  sed -i '' 's/OPENFANG_MOCK_MODE=false/OPENFANG_MOCK_MODE=true/' .env.local
  echo "✅ Switched to MOCK mode"
fi
echo "Restart server: pkill -f next-server && npm run dev"
```

### 2. Add UI Indicator
In your agent page component:
```typescript
const isMockMode = process.env.OPENFANG_MOCK_MODE === 'true';

{isMockMode && (
  <div className="bg-yellow-500/20 text-yellow-500 px-3 py-1 rounded-lg text-xs font-semibold mb-4">
    🧪 Mock Mode - Development Only
  </div>
)}
```

### 3. Check Mode in Console
```javascript
// Browser console
console.log('Mock Mode:', process.env.OPENFANG_MOCK_MODE);
```

---

## 📞 Still Having Issues?

1. **Check server logs** for errors
2. **Verify .env.local** has correct syntax (no spaces around =)
3. **Try incognito mode** to rule out cache issues
4. **Check browser console** for detailed error messages

---

## ✅ Success Checklist

- [ ] `.env.local` contains `OPENFANG_MOCK_MODE=true`
- [ ] Dev server restarted after adding variable
- [ ] Browser hard refreshed (Cmd+Shift+R)
- [ ] Console shows `OPENFANG_MOCK_MODE: true`
- [ ] Agent chat returns mock response
- [ ] No 400 errors in console

---

**Last Updated:** 2026-03-16  
**Status:** ✅ Mock Mode Enabled  
**Next Step:** Hard refresh browser (Cmd+Shift+R)
