# 🧪 HƯỚNG DẪN TEST LOGIN FLOW - COMPREHENSIVE

## 🎯 MỤC ĐÍCH

Test toàn diện login flow để verify:
1. ✅ Không còn hydration errors
2. ✅ URL redirect đúng format
3. ✅ Response parsing chính xác
4. ✅ Console sạch sẽ
5. ✅ Cross-browser compatibility

---

## 🚀 CHUẨN BỊ

### 1. Stop Server và Clear Cache

```bash
# Stop dev server
Ctrl + C

# Clear Next.js cache
rm -rf .next

# Clear Node modules cache (optional)
rm -rf node_modules/.cache

# Restart server
npm run dev
```

### 2. Clear Browser Data

**Chrome:**
```
1. Cmd+Shift+Delete (Mac) / Ctrl+Shift+Delete (Windows)
2. Chọn "All time"
3. Check:
   ✅ Cookies and other site data
   ✅ Cached images and files
4. Click "Clear data"
```

**Firefox:**
```
1. Cmd+Shift+Delete (Mac) / Ctrl+Shift+Delete (Windows)
2. Chọn "Everything"
3. Check:
   ✅ Cookies
   ✅ Cache
4. Click "Clear Now"
```

---

## 🧪 TEST SUITE

### TEST 1: Verify Hydration Fix ⭐⭐⭐

**Mục đích:** Đảm bảo không còn hydration mismatch errors

**Steps:**
```bash
1. Mở Chrome DevTools (F12)
2. Chuyển sang tab Console
3. Navigate to: http://localhost:3000/auth/login
4. Quan sát console output
```

**Expected Output:**
```
✅ 🔐 [SessionProvider] Mounted with baseUrl: http://localhost:3000
✅ (không có error "Hydration failed")
✅ (không có error "Text content does not match")
✅ (không có error "page-*.js:1")
```

**Fail Indicators:**
```
❌ Hydration failed because...
❌ Text content does not match
❌ Warning: Expected server HTML to contain...
❌ Uncaught Error in page-*.js
```

**Status:** [ ] PASS [ ] FAIL

---

### TEST 2: Login với Valid Credentials ⭐⭐⭐

**Mục đích:** Test login flow hoàn chỉnh

**Credentials:**
```
Email: teacher@example.com
Password: teacher123
```

**Steps:**
```bash
1. Go to: http://localhost:3000/auth/login
2. Enter credentials
3. Click "Login"
4. Observe console logs
5. Wait for redirect
```

**Expected Console Output:**
```
✅ 🔍 [LOGIN-FORM] Raw callbackUrl: /dashboard
✅ 🔍 [LOGIN-FORM] Sanitized callbackUrl: /dashboard
✅ 🔐 [LOGIN] Attempting login... {email: "teacher@example.com", baseUrl: "http://localhost:3000", callbackUrl: "/dashboard"}
✅ 🔐 [NEXTAUTH-CLIENT] signIn wrapper called
✅ [AUTHORIZE] called with: {email: "teacher@example.com", password: "teacher123"}
✅ ✅ [AUTHORIZE] User authenticated: teacher@example.com
✅ [AUTHORIZE] Database sync successful
✅ ✅ [JWT] Token created: {email: "teacher@example.com", role: "TEACHER", id: "..."}
✅ ✅ [SESSION] Session created: {id: "...", email: "teacher@example.com", role: "TEACHER"}
✅ ✅ [NEXTAUTH-CLIENT] signIn response: {ok: true, error: null, url: "/dashboard"}
✅ 📊 [LOGIN] Login result: {ok: true, error: null, url: "/dashboard"}
✅ ✅ [LOGIN] Login successful!
✅ 🔄 [LOGIN] Redirecting to: http://localhost:3000/dashboard
✅ 📍 [LOGIN] Base URL: http://localhost:3000
```

**Check URL Format:**
```
✅ url: "/dashboard"  (relative)
  OR
✅ url: "http://localhost:3000/dashboard"  (absolute)

❌ NOT: "http://localhost:3000/dashboard'}"  (extra quote)
❌ NOT: "http://localhost:3000/dashboard}"   (extra brace)
```

**Expected Redirect:**
```
✅ Redirects to: http://localhost:3000/dashboard
✅ Dashboard loads successfully
✅ No errors in console after redirect
```

**Status:** [ ] PASS [ ] FAIL

---

### TEST 3: Login với Invalid Credentials ⭐⭐

**Mục đích:** Test error handling

**Credentials:**
```
Email: wrong@example.com
Password: wrongpassword
```

**Steps:**
```bash
1. Go to: http://localhost:3000/auth/login
2. Enter invalid credentials
3. Click "Login"
4. Observe error message
```

**Expected Behavior:**
```
✅ Error toast shows: "Invalid email or password"
✅ Console log: ❌ [LOGIN] Login failed: CredentialsSignin
✅ User stays on login page
✅ Form is not disabled
```

**Status:** [ ] PASS [ ] FAIL

---

### TEST 4: Language Switch Test ⭐⭐

**Mục đích:** Verify LanguageContext không gây hydration errors

**Steps:**
```bash
1. Navigate to: http://localhost:3000/dashboard
2. Click language switcher (VI/EN button)
3. Observe console
4. Refresh page (F5)
5. Check language persists
6. Observe console again
```

**Expected Behavior:**
```
✅ Language switches immediately
✅ No hydration errors after switch
✅ Language persists after refresh
✅ No errors in console
✅ Dashboard re-renders correctly
```

**Status:** [ ] PASS [ ] FAIL

---

### TEST 5: Direct Dashboard Access (No Auth) ⭐⭐

**Mục đích:** Test redirect logic for unauthenticated users

**Steps:**
```bash
1. Logout (if logged in)
2. Clear cookies
3. Navigate to: http://localhost:3000/dashboard
4. Observe redirect
```

**Expected Behavior:**
```
✅ Redirects to: /auth/login?callbackUrl=/dashboard
✅ No errors in console
✅ Login page loads
```

**Status:** [ ] PASS [ ] FAIL

---

### TEST 6: Callback URL Test ⭐⭐

**Mục đích:** Test redirect to specific page after login

**Steps:**
```bash
1. Logout
2. Navigate to: http://localhost:3000/auth/login?callbackUrl=/learning-paths
3. Login with valid credentials
4. Observe redirect
```

**Expected Behavior:**
```
✅ Redirects to: /learning-paths
✅ Not to /dashboard
✅ Console shows correct callbackUrl
```

**Status:** [ ] PASS [ ] FAIL

---

### TEST 7: URL Validation Test ⭐⭐

**Mục đích:** Test security - prevent external redirects

**Steps:**
```bash
1. Logout
2. Try URL: http://localhost:3000/auth/login?callbackUrl=https://evil.com
3. Login
4. Observe redirect
```

**Expected Behavior:**
```
✅ Does NOT redirect to https://evil.com
✅ Redirects to /dashboard instead
✅ Console shows: ⚠️ External URL blocked
```

**Status:** [ ] PASS [ ] FAIL

---

### TEST 8: Localhost Cleanup Test ⭐⭐

**Mục đích:** Verify localhost được remove từ URLs (production prep)

**Steps:**
```bash
1. Set NEXTAUTH_URL=https://inphysic.com in .env.local
2. Restart server
3. Login
4. Check console logs
```

**Expected Console Output:**
```
✅ 🌐 [AUTH] Using NEXTAUTH_URL: https://inphysic.com
✅ No "localhost" in any URLs
✅ baseUrl: https://inphysic.com
```

**Don't forget to change back:**
```bash
NEXTAUTH_URL=http://localhost:3000
```

**Status:** [ ] PASS [ ] FAIL

---

### TEST 9: Cross-Browser Test ⭐

**Mục đích:** Verify compatibility

**Browsers to test:**
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (if on Mac)
- [ ] Edge (optional)

**For each browser:**
```bash
1. Clear cache and cookies
2. Navigate to login page
3. Login
4. Check console for errors
5. Verify redirect works
```

**Status:** [ ] PASS [ ] FAIL

---

### TEST 10: Network Tab Inspection ⭐

**Mục đích:** Verify API responses

**Steps:**
```bash
1. Open DevTools → Network tab
2. Login
3. Find request to: /api/auth/callback/credentials
4. Check Response
```

**Expected Response Headers:**
```
Status: 200 OK
Content-Type: application/json
```

**Expected Response Body:**
```json
{
  "url": "http://localhost:3000/dashboard"
}
```

**NOT expected:**
```json
{
  "url": "http://localhost:3000/dashboard'}"
}
```

**Status:** [ ] PASS [ ] FAIL

---

## 🔧 CURL TESTING

### Test API Endpoint Directly

```bash
# 1. Get CSRF token
curl -c cookies.txt http://localhost:3000/api/auth/csrf

# 2. Extract token from cookies.txt
# Look for: next-auth.csrf-token

# 3. Test login
curl -b cookies.txt -X POST \
  http://localhost:3000/api/auth/callback/credentials \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@example.com",
    "password": "teacher123",
    "callbackUrl": "/dashboard"
  }'
```

**Expected Response:**
```json
{
  "url": "http://localhost:3000/dashboard"
}
```

**Check for:**
- ✅ Valid JSON
- ✅ No syntax errors
- ✅ No extra characters in "url" value
- ✅ Status 200

---

## 📊 TEST RESULTS SUMMARY

### Overall Status

| Test | Priority | Status | Notes |
|------|----------|--------|-------|
| 1. Hydration Fix | ⭐⭐⭐ | [ ] | |
| 2. Valid Login | ⭐⭐⭐ | [ ] | |
| 3. Invalid Login | ⭐⭐ | [ ] | |
| 4. Language Switch | ⭐⭐ | [ ] | |
| 5. Direct Access | ⭐⭐ | [ ] | |
| 6. Callback URL | ⭐⭐ | [ ] | |
| 7. URL Validation | ⭐⭐ | [ ] | |
| 8. Localhost Cleanup | ⭐⭐ | [ ] | |
| 9. Cross-Browser | ⭐ | [ ] | |
| 10. Network Inspection | ⭐ | [ ] | |

**Pass Rate:** ___/10 (___%)

---

## 🐛 TROUBLESHOOTING

### Issue: Still seeing hydration errors

**Solution:**
```bash
# Nuclear clean
rm -rf .next
rm -rf node_modules/.cache
rm -rf .turbo

# Clear browser completely
# Chrome: Settings → Clear browsing data → All time → Everything

# Restart
npm run dev
```

### Issue: Redirect not working

**Check:**
```bash
# 1. Verify NEXTAUTH_URL in .env.local
cat .env.local | grep NEXTAUTH_URL

# 2. Check middleware is running
# Should see logs in console

# 3. Verify session cookie is set
# DevTools → Application → Cookies
# Look for: next-auth.session-token
```

### Issue: Console shows wrong URL format

**This is usually:**
- DevTools display artifact (not real error)
- Copy/paste issue
- Browser extension interference

**Verify by:**
```javascript
// Add in login-form.tsx after line 130:
console.log('URL type:', typeof result?.url);
console.log('URL length:', result?.url?.length);
console.log('URL chars:', Array.from(result?.url || ''));

// Should show:
// URL type: "string"
// URL length: 25 (or similar)
// URL chars: ['/', 'd', 'a', 's', 'h', 'b', 'o', 'a', 'r', 'd'] (no extra quotes)
```

---

## ✅ COMPLETION CHECKLIST

After all tests pass:

- [ ] All 10 tests PASS
- [ ] No console errors
- [ ] No hydration warnings
- [ ] Redirect works smoothly
- [ ] Language switch works
- [ ] Cross-browser tested
- [ ] Documentation updated
- [ ] Ready for git commit

---

## 🎉 SUCCESS CRITERIA

**ALL of these must be true:**

✅ No "Hydration failed" errors
✅ No "page-*.js" errors
✅ Login redirects correctly
✅ Console output is clean
✅ URL format is correct (no extra quotes)
✅ Language switch doesn't cause errors
✅ Security checks pass (no external redirects)
✅ Works in Chrome AND Firefox
✅ Network responses are valid JSON

---

**🚀 READY TO TEST! HÃY BẮT ĐẦU TỪNG TEST MỘT! 🚀**

