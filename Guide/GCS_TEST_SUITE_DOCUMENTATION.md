# Google Cloud Storage (GCS) Test Suite

## Overview

This comprehensive test suite validates Google Cloud Storage bucket operations for the AeroEdu platform, including upload/download functionality, signed URLs, file permissions, and error handling.

## Test Coverage

### 1. Storage Client Initialization
- ✅ Storage client initialization
- ✅ Bucket access verification
- ✅ Project ID validation

### 2. File Upload Operations
- ✅ Basic file upload to GCS bucket
- ✅ File upload with custom metadata
- ✅ Large file upload handling (>1MB)
- ✅ Content type validation
- ✅ Metadata preservation

### 3. Signed URL Generation
- ✅ Signed upload URL generation
- ✅ Signed download URL generation
- ✅ Public URL generation
- ✅ Different expiration times (1h, 24h)
- ✅ URL format validation
- ✅ Signature verification

### 4. File Download Operations
- ✅ Basic file download from GCS
- ✅ File download with specific encoding
- ✅ Partial file downloads (range requests)
- ✅ Content integrity verification

### 5. File Permissions and Access Control
- ✅ Making files public
- ✅ Custom ACL permissions
- ✅ Private file access (default)
- ✅ Permission verification
- ✅ Access control validation

### 6. File Management Operations
- ✅ File deletion from bucket
- ✅ File copying within bucket
- ✅ File moving within bucket
- ✅ File listing with filters
- ✅ File metadata retrieval
- ✅ File existence checks

### 7. Error Handling
- ✅ Non-existent bucket handling
- ✅ Invalid file name handling
- ✅ Network error simulation
- ✅ Expired signed URL handling
- ✅ Authentication error handling
- ✅ Graceful error recovery

### 8. API Integration Tests
- ✅ GCS presigned URL API endpoint
- ✅ Image signed URL API endpoint
- ✅ Authentication requirements
- ✅ Request/response validation

### 9. Performance Tests
- ✅ Concurrent uploads (10 files)
- ✅ Concurrent downloads (5 files)
- ✅ Large file handling
- ✅ Performance metrics collection
- ✅ Resource usage monitoring

## Test Configuration

### Environment Variables Required

```bash
# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT_ID="gen-lang-client-0712182643"
GCS_BUCKET_NAME="aeroedu-test-bucket"

# Authentication (choose one)
GOOGLE_CLOUD_CREDENTIALS='{"type":"service_account",...}'
# OR
GOOGLE_CLOUD_KEY_FILE="path/to/service-account-key.json"
# OR
GOOGLE_APPLICATION_CREDENTIALS="path/to/service-account-key.json"
```

### Test Bucket Setup

1. **Create Test Bucket**:
   ```bash
   gsutil mb gs://aeroedu-test-bucket
   ```

2. **Set Bucket Permissions**:
   ```bash
   gsutil iam ch allUsers:objectViewer gs://aeroedu-test-bucket
   ```

3. **Configure CORS** (if needed):
   ```json
   [
     {
       "origin": ["http://localhost:3000"],
       "method": ["GET", "POST", "PUT", "DELETE"],
       "responseHeader": ["Content-Type", "Authorization"],
       "maxAgeSeconds": 3600
     }
   ]
   ```

## Running Tests

### 1. Run All Tests
```bash
npm run test:gcs:comprehensive
```

### 2. Run Specific Test Categories
```bash
# Unit tests only
npx vitest run tests/gcs.test.ts

# With coverage
npx vitest run tests/gcs.test.ts --coverage

# Watch mode
npx vitest tests/gcs.test.ts --watch
```

### 3. Run Test Runner Script
```bash
node scripts/test-gcs-comprehensive.js
```

## Test Results

### Expected Output
```
Google Cloud Storage Test Runner
================================

============================================================
  Environment Check
============================================================
✓ Node.js Version
  Current: v18.17.0 (requires Node.js 16+)
✓ Google Cloud Project ID
  Project: gen-lang-client-0712182643
✓ GCS Bucket Name
  Bucket: aeroedu-test-bucket
✓ Google Cloud Credentials
  Credentials configured via environment variables
✓ Vitest Available
  Vitest test runner is available

============================================================
  Running GCS Tests
============================================================
Running comprehensive GCS test suite...

✓ Storage Client Initialization (5 tests)
✓ File Upload Operations (3 tests)
✓ Signed URL Generation (4 tests)
✓ File Download Operations (3 tests)
✓ File Permissions and Access Control (3 tests)
✓ File Management Operations (5 tests)
✓ Error Handling (4 tests)
✓ API Integration Tests (2 tests)
✓ Performance Tests (2 tests)

Test execution completed in 45.23s

============================================================
  Test Summary
============================================================
Total execution time: 47.15s
Environment check: PASS
GCS operations: PASS
API integration: SKIP
Performance tests: PASS
Cleanup: PASS

✅ GCS tests completed successfully!
```

## Test Data Management

### Test File Patterns
- Upload tests: `test-upload-{uuid}.txt`
- Download tests: `test-download-{uuid}.txt`
- Permission tests: `test-permission-{uuid}.txt`
- Performance tests: `test-concurrent-{index}-{uuid}.txt`

### Cleanup Strategy
- All test files are automatically cleaned up after tests
- Files are prefixed with `test-` for easy identification
- Cleanup runs in `afterAll` hooks
- Manual cleanup available via test runner script

## Error Scenarios Tested

### 1. Authentication Errors
- Invalid credentials
- Expired service account keys
- Missing authentication

### 2. Network Errors
- Connection timeouts
- DNS resolution failures
- SSL/TLS errors

### 3. Permission Errors
- Insufficient bucket permissions
- File access denied
- ACL modification failures

### 4. Resource Errors
- Non-existent buckets
- Non-existent files
- Quota exceeded
- Rate limiting

## Performance Benchmarks

### Upload Performance
- Small files (<1MB): <100ms per file
- Medium files (1-10MB): <500ms per file
- Large files (>10MB): <2s per file
- Concurrent uploads: 10 files in <5s

### Download Performance
- Small files (<1MB): <50ms per file
- Medium files (1-10MB): <200ms per file
- Large files (>10MB): <1s per file
- Concurrent downloads: 5 files in <2s

### Signed URL Generation
- Upload URLs: <50ms
- Download URLs: <50ms
- Batch generation: 100 URLs in <1s

## Security Considerations

### 1. Signed URL Security
- URLs expire after specified time
- URLs are cryptographically signed
- No unauthorized access possible
- Proper content type validation

### 2. File Access Control
- Private by default
- Explicit public access when needed
- ACL-based permissions
- Service account isolation

### 3. Data Protection
- Encryption in transit (HTTPS)
- Encryption at rest (GCS default)
- No sensitive data in URLs
- Proper error message sanitization

## Troubleshooting

### Common Issues

1. **Authentication Failed**
   ```bash
   # Check credentials
   gcloud auth application-default login
   # Or set environment variable
   export GOOGLE_APPLICATION_CREDENTIALS="path/to/key.json"
   ```

2. **Bucket Not Found**
   ```bash
   # Create bucket
   gsutil mb gs://your-bucket-name
   # Check permissions
   gsutil iam get gs://your-bucket-name
   ```

3. **Permission Denied**
   ```bash
   # Grant necessary permissions
   gsutil iam ch serviceAccount:your-service-account@project.iam.gserviceaccount.com:objectAdmin gs://your-bucket-name
   ```

4. **Network Timeouts**
   - Check firewall settings
   - Verify DNS resolution
   - Test with smaller files first

### Debug Mode
```bash
# Enable debug logging
export DEBUG=gcs:*
npm run test:gcs:comprehensive
```

## Integration with CI/CD

### GitHub Actions Example
```yaml
name: GCS Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm install
      - name: Run GCS tests
        run: npm run test:gcs:comprehensive
        env:
          GOOGLE_CLOUD_PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}
          GOOGLE_CLOUD_CREDENTIALS: ${{ secrets.GCP_CREDENTIALS }}
          GCS_BUCKET_NAME: ${{ secrets.GCS_BUCKET_NAME }}
```

## Maintenance

### Regular Tasks
- Update test dependencies monthly
- Review and update test data quarterly
- Monitor test performance metrics
- Update security configurations as needed

### Test Data Refresh
- Clean up old test files weekly
- Rotate test credentials quarterly
- Update performance benchmarks annually

## Support

For issues or questions regarding the GCS test suite:
1. Check the troubleshooting section above
2. Review test logs and error messages
3. Verify environment configuration
4. Contact the development team

---

**Last Updated**: December 2024  
**Test Suite Version**: 1.0.0  
**Compatible with**: Node.js 16+, Google Cloud Storage API v1
