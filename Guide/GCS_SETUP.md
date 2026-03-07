# Google Cloud Storage Setup Guide for Math LMS

This guide will walk you through setting up Google Cloud Storage (GCS) for video storage and streaming in the Math LMS project.

## Prerequisites

- A Google Cloud Platform (GCP) account
- Google Cloud SDK installed (optional, but recommended)
- A GCP project with billing enabled

## 1. Create a GCS Bucket

1. **Go to Google Cloud Console**: Navigate to the Cloud Storage service
2. **Create Bucket**:
   - Click "Create bucket"
   - **Name**: Choose a unique name (e.g., `math-lms-videos-yourname`)
   - **Location type**: Choose "Region" and select a region close to your users
   - **Storage class**: Standard (for frequently accessed videos)
   - **Access control**: Choose "Uniform" for simpler management
   - **Protection tools**: Configure as needed
   - Click "Create"

## 2. Create a Service Account

1. **Go to IAM & Admin**: Navigate to "Service Accounts"
2. **Create Service Account**:
   - Click "Create Service Account"
   - **Name**: `math-lms-gcs-service`
   - **Description**: Service account for Math LMS GCS operations
   - Click "Create and Continue"
3. **Grant Access**:
   - **Role**: Select "Storage Admin" (for full GCS access)
   - Click "Continue"
4. **Create Key**:
   - Click on the created service account
   - Go to "Keys" tab
   - Click "Add Key" → "Create new key"
   - Choose "JSON" format
   - Download the key file and store it securely

## 3. Configure Bucket Permissions

### For Public Videos (Demo/Development):
```bash
# Make bucket publicly readable
gsutil iam ch allUsers:objectViewer gs://your-bucket-name

# Or make specific objects public
gsutil acl ch -u AllUsers:R gs://your-bucket-name/your-video.mp4
```

### For Private Videos (Production):
Keep bucket private and use signed URLs for access.

## 4. Configure CORS

Create a CORS configuration file `cors.json`:

```json
[
  {
    "origin": ["http://localhost:3000", "https://your-domain.com"],
    "method": ["GET", "POST", "PUT", "DELETE", "HEAD"],
    "responseHeader": ["Content-Type", "Range", "Content-Length"],
    "maxAgeSeconds": 3600
  }
]
```

Apply CORS configuration:
```bash
gsutil cors set cors.json gs://your-bucket-name
```

## 5. Environment Variables

Add the following to your `.env.local` file:

```env
# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT_ID="your-project-id"
GOOGLE_CLOUD_KEY_FILE="path/to/service-account-key.json"
# OR use credentials JSON directly:
GOOGLE_CLOUD_CREDENTIALS='{"type":"service_account","project_id":"your-project",...}'
GCS_BUCKET_NAME="your-bucket-name"
NEXT_PUBLIC_GCS_BUCKET_NAME="your-bucket-name"
```

### Option 1: Using Key File
```env
GOOGLE_CLOUD_PROJECT_ID="math-lms-project"
GOOGLE_CLOUD_KEY_FILE="./service-account-key.json"
GCS_BUCKET_NAME="math-lms-videos-demo"
NEXT_PUBLIC_GCS_BUCKET_NAME="math-lms-videos-demo"
```

### Option 2: Using Credentials JSON
```env
GOOGLE_CLOUD_PROJECT_ID="math-lms-project"
GOOGLE_CLOUD_CREDENTIALS='{"type":"service_account","project_id":"math-lms-project","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}'
GCS_BUCKET_NAME="math-lms-videos-demo"
NEXT_PUBLIC_GCS_BUCKET_NAME="math-lms-videos-demo"
```

## 6. Testing the Setup

1. **Start your development server**:
   ```bash
   npm run dev
   ```

2. **Navigate to the test page**:
   ```
   http://localhost:3000/test-gcs-video
   ```

3. **Test upload and streaming**:
   - Upload a video file
   - Test both public and signed URL streaming
   - Verify video playback works correctly

## 7. Video Streaming Features

### Public URLs
- Direct access to videos without authentication
- Faster loading times
- Good for demo/development

### Signed URLs
- Time-limited access (configurable expiry)
- More secure for private content
- Better for production environments

### Video Player Features
- Custom controls with play/pause, volume, seek
- Fullscreen support
- Progress tracking
- Error handling and loading states

## 8. Production Considerations

### Security
- Use signed URLs for private videos
- Implement proper authentication
- Set appropriate CORS policies
- Monitor access logs

### Performance
- Use CDN for global distribution
- Optimize video formats (MP4, WebM)
- Implement adaptive bitrate streaming
- Consider video compression

### Cost Optimization
- Use appropriate storage classes
- Implement lifecycle policies
- Monitor usage and costs
- Consider regional storage

## 9. Troubleshooting

### Common Issues

1. **Authentication Errors**:
   - Verify service account permissions
   - Check credentials format
   - Ensure project ID is correct

2. **CORS Errors**:
   - Verify CORS configuration
   - Check allowed origins
   - Test with browser dev tools

3. **Upload Failures**:
   - Check bucket permissions
   - Verify file size limits
   - Check network connectivity

4. **Video Playback Issues**:
   - Verify video format compatibility
   - Check URL accessibility
   - Test with different browsers

### Debug Commands
```bash
# Test bucket access
gsutil ls gs://your-bucket-name

# Check bucket permissions
gsutil iam get gs://your-bucket-name

# Test CORS configuration
gsutil cors get gs://your-bucket-name
```

## 10. Next Steps

After successful GCS setup, you can:

1. **Integrate with video processing pipeline**
2. **Implement video analytics**
3. **Add video transcoding**
4. **Set up CDN for global distribution**
5. **Implement video streaming optimization**

---

This setup provides a solid foundation for video storage and streaming in your Math LMS application using Google Cloud Storage.
