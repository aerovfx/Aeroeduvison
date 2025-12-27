# 🚀 Quick Test Guide - GCS Upload

## ✅ Current Status
- ✅ Server running on http://localhost:3000
- ✅ GCS test page accessible
- ✅ Environment variables configured

## 🧪 **Step-by-Step Test**

### 1. Open Browser
Go to: **http://localhost:3000/test-gcs-video**

### 2. Test Upload (Without Authentication)
- Click "Choose File" in any section (Course Image, Chapter Video, or Attachment)
- Select a small file (image or video)
- Click "Upload to GCS"
- **Expected:** Should show error "Unauthorized" (this is normal - API requires authentication)

### 3. Test with Authentication
1. **Sign In:** Go to http://localhost:3000/sign-in
   - Email: `teacher@example.com`
   - Password: `teacher123`

2. **Return to GCS Test:** Go back to http://localhost:3000/test-gcs-video

3. **Upload File:**
   - Choose a small image file (JPG/PNG under 1MB)
   - Click "Upload to GCS"
   - **Expected:** Should upload successfully and show success message

## 🔧 **If Upload Fails**

### Check Browser Console (F12)
Look for error messages like:
- `"GCS bucket name not configured"` → Environment variable issue
- `"Failed to initialize Google Cloud Storage client"` → GCS credentials issue
- `"Unexpected token 'G'"` → API returning text instead of JSON

### Check Server Logs
In the terminal running `npm run dev`, look for:
- `[GCS_CONFIG_ERROR]` messages
- `[GCS_INIT_ERROR]` messages
- `[GCS_PRESIGNED_URL_ERROR]` messages

## 📝 **Expected Results**

### ✅ Success:
- File uploads to GCS
- Success toast message appears
- Uploaded file URL is displayed
- Video player shows uploaded video (if it's a video file)

### ❌ Common Issues:
1. **Authentication Error (401):** Need to sign in first
2. **Configuration Error (500):** Check `.env.local` file
3. **JSON Parse Error:** API returning text instead of JSON

## 🎯 **Test Files**
- **Small Image:** Use any JPG/PNG under 1MB
- **Small Video:** Use any MP4 under 10MB for testing
- **Avoid:** Large files for initial testing

---

**Ready to test!** 🎬
