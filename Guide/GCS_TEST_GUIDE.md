# 🧪 GCS Upload Test Guide

## ✅ Current Status
- ✅ GCS API endpoint working (returns 401 - authentication required)
- ✅ Environment variables configured
- ✅ Server running on http://localhost:3000

## 🚀 How to Test GCS Upload

### Step 1: Sign In as Teacher
1. Open browser: http://localhost:3000/sign-in
2. Use teacher credentials:
   - **Email:** `teacher@example.com`
   - **Password:** `teacher123`

### Step 2: Test GCS Upload
1. After signing in, go to: http://localhost:3000/test-gcs-video
2. You should see the GCS test page with upload sections
3. Try uploading a small image file (JPG/PNG) in the "Course Image" section
4. Click "Choose File" → Select image → Click "Upload to GCS"

### Step 3: Check Results
- ✅ **Success:** File uploads and shows success message
- ❌ **Error:** Check browser console for error details

## 🔧 Troubleshooting

### If you get "Upload failed: Unexpected token 'G'" error:
This means the API is returning text instead of JSON. Check:

1. **GCS Configuration:**
   ```bash
   # Check if service account file exists
   ls -la ./gen-lang-client-0712182643-47b71bba4d28.json
   
   # Check if bucket exists and is accessible
   gsutil ls gs://mathvideostore
   ```

2. **Server Logs:**
   Check the terminal where `npm run dev` is running for error messages

3. **Environment Variables:**
   Make sure `.env.local` has:
   ```env
   GOOGLE_CLOUD_PROJECT_ID="gen-lang-client-0712182643"
   GOOGLE_CLOUD_KEY_FILE="./gen-lang-client-0712182643-47b71bba4d28.json"
   GCS_BUCKET_NAME="mathvideostore"
   NEXT_PUBLIC_GCS_BUCKET_NAME="mathvideostore"
   ```

### If upload works but video doesn't stream:
1. Check if bucket is publicly readable
2. Verify CORS configuration
3. Test with a small video file first

## 📝 Test Accounts Available
- **Admin:** admin@example.com / admin123
- **Teacher:** teacher@example.com / teacher123  
- **Student:** student@example.com / student123

## 🎯 Expected Behavior
1. **File Upload:** Direct upload to GCS using presigned URLs
2. **Video Streaming:** Public URLs from GCS bucket
3. **Progress Bar:** Shows upload progress
4. **Success Message:** Confirms successful upload

---

**Ready to test!** 🚀
