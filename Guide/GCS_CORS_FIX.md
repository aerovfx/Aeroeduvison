# 🔧 Fix GCS Upload Network Error

## ❌ **Problem:**
- Network error during GCS upload
- CORS policy not configured for GCS bucket

## ✅ **Solution:**

### **1. Install Google Cloud SDK (if not installed):**
```bash
# macOS
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
gcloud init
```

### **2. Authenticate:**
```bash
gcloud auth login
gcloud auth application-default login
```

### **3. Set CORS Policy:**
```bash
# Run this command to set CORS policy
gsutil cors set cors.json gs://mathvideostore
```

### **4. Verify CORS Policy:**
```bash
gsutil cors get gs://mathvideostore
```

## 🚀 **Alternative: Use Google Cloud Console**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **Cloud Storage** → **Buckets**
3. Click on your bucket `mathvideostore`
4. Go to **Permissions** tab
5. Click **Edit CORS configuration**
6. Add this CORS policy:

```json
[
  {
    "origin": ["http://localhost:3000", "http://localhost:3001"],
    "method": ["GET", "PUT", "POST", "DELETE", "HEAD", "OPTIONS"],
    "responseHeader": ["Content-Type", "Access-Control-Allow-Origin"],
    "maxAgeSeconds": 3600
  }
]
```

## 🔍 **Debug Steps:**

1. **Check browser console** for detailed error messages
2. **Verify GCS bucket permissions** - ensure your service account has Storage Object Admin role
3. **Test with small file** first (like a 1MB image)
4. **Check network tab** in browser dev tools for actual HTTP status codes

## 📝 **Expected Behavior After Fix:**
- ✅ File uploads to GCS successfully
- ✅ Progress bar shows upload progress
- ✅ Success toast message appears
- ✅ Public URL is generated and returned

---

**After setting CORS policy, try uploading again!** 🎬
