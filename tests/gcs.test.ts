import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Storage } from '@google-cloud/storage';
import { getSignedUploadUrl, getSignedDownloadUrl, getPublicUrl, makeFilePublic, storage } from '@/lib/gcs';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

// Test configuration
const TEST_BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'aeroedu-test-bucket';
const TEST_PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID || 'gen-lang-client-0712182643';

// Test file data
const TEST_FILE_CONTENT = 'This is a test file for GCS operations';
const TEST_FILE_NAME = `test-${randomUUID()}.txt`;
const TEST_FILE_PATH = path.join(__dirname, 'temp-test-file.txt');

describe('Google Cloud Storage Tests', () => {
  let testBucket: any;
  let testFile: any;

  beforeAll(async () => {
    // Verify environment variables
    expect(TEST_BUCKET_NAME).toBeDefined();
    expect(TEST_PROJECT_ID).toBeDefined();
    
    // Initialize test bucket
    testBucket = storage.bucket(TEST_BUCKET_NAME);
    
    // Create test file locally
    fs.writeFileSync(TEST_FILE_PATH, TEST_FILE_CONTENT);
  });

  afterAll(async () => {
    // Cleanup test file locally
    if (fs.existsSync(TEST_FILE_PATH)) {
      fs.unlinkSync(TEST_FILE_PATH);
    }
    
    // Cleanup test files in GCS
    try {
      const [files] = await testBucket.getFiles({ prefix: 'test-' });
      await Promise.all(files.map((file: any) => file.delete()));
    } catch (error) {
      console.warn('Failed to cleanup test files:', error);
    }
  });

  beforeEach(() => {
    // Generate unique test file name for each test
    testFile = testBucket.file(`test-${randomUUID()}.txt`);
  });

  describe('Storage Client Initialization', () => {
    it('should initialize storage client successfully', () => {
      expect(storage).toBeDefined();
      expect(storage.projectId).toBe(TEST_PROJECT_ID);
    });

    it('should have access to test bucket', async () => {
      const [exists] = await testBucket.exists();
      expect(exists).toBe(true);
    });
  });

  describe('File Upload Operations', () => {
    it('should upload file to GCS bucket', async () => {
      const fileName = `test-upload-${randomUUID()}.txt`;
      const file = testBucket.file(fileName);
      
      await file.save(TEST_FILE_CONTENT, {
        metadata: {
          contentType: 'text/plain',
          metadata: {
            uploadedBy: 'test-user',
            testType: 'upload'
          }
        }
      });

      const [exists] = await file.exists();
      expect(exists).toBe(true);
    });

    it('should upload file with custom metadata', async () => {
      const fileName = `test-metadata-${randomUUID()}.txt`;
      const file = testBucket.file(fileName);
      
      const metadata = {
        contentType: 'text/plain',
        metadata: {
          uploadedBy: 'test-user',
          courseId: 'course-123',
          chapterId: 'chapter-456',
          uploadType: 'course-image'
        }
      };

      await file.save(TEST_FILE_CONTENT, { metadata });

      const [fileMetadata] = await file.getMetadata();
      expect(fileMetadata.metadata.uploadedBy).toBe('test-user');
      expect(fileMetadata.metadata.courseId).toBe('course-123');
      expect(fileMetadata.metadata.uploadType).toBe('course-image');
    });

    it('should handle large file uploads', async () => {
      const fileName = `test-large-${randomUUID()}.txt`;
      const file = testBucket.file(fileName);
      
      // Create a larger test file (1MB)
      const largeContent = 'A'.repeat(1024 * 1024);
      
      await file.save(largeContent, {
        metadata: {
          contentType: 'text/plain'
        }
      });

      const [exists] = await file.exists();
      expect(exists).toBe(true);
      
      const [fileMetadata] = await file.getMetadata();
      expect(parseInt(fileMetadata.size)).toBeGreaterThan(1000000);
    });
  });

  describe('Signed URL Generation', () => {
    it('should generate signed upload URL', async () => {
      const fileName = `test-signed-upload-${randomUUID()}.txt`;
      
      const signedUrl = await getSignedUploadUrl(
        TEST_BUCKET_NAME,
        fileName,
        'text/plain',
        3600 // 1 hour
      );

      expect(signedUrl).toBeDefined();
      expect(signedUrl).toContain('storage.googleapis.com');
      expect(signedUrl).toContain(TEST_BUCKET_NAME);
      expect(signedUrl).toContain(fileName);
      expect(signedUrl).toContain('X-Goog-Algorithm=GOOG4-RSA-SHA256');
    });

    it('should generate signed download URL', async () => {
      // First upload a file
      const fileName = `test-signed-download-${randomUUID()}.txt`;
      const file = testBucket.file(fileName);
      await file.save(TEST_FILE_CONTENT);

      const signedUrl = await getSignedDownloadUrl(
        TEST_BUCKET_NAME,
        fileName,
        3600 // 1 hour
      );

      expect(signedUrl).toBeDefined();
      expect(signedUrl).toContain('storage.googleapis.com');
      expect(signedUrl).toContain(TEST_BUCKET_NAME);
      expect(signedUrl).toContain(fileName);
      expect(signedUrl).toContain('X-Goog-Algorithm=GOOG4-RSA-SHA256');
    });

    it('should generate public URL', async () => {
      const fileName = `test-public-${randomUUID()}.txt`;
      
      const publicUrl = await getPublicUrl(TEST_BUCKET_NAME, fileName);
      
      expect(publicUrl).toBe(`https://storage.googleapis.com/${TEST_BUCKET_NAME}/${fileName}`);
    });

    it('should handle different expiration times', async () => {
      const fileName = `test-expiration-${randomUUID()}.txt`;
      
      // Test 1 hour expiration
      const url1h = await getSignedUploadUrl(TEST_BUCKET_NAME, fileName, 'text/plain', 3600);
      expect(url1h).toBeDefined();
      
      // Test 24 hours expiration
      const url24h = await getSignedUploadUrl(TEST_BUCKET_NAME, fileName, 'text/plain', 86400);
      expect(url24h).toBeDefined();
      
      // URLs should be different due to different expiration times
      expect(url1h).not.toBe(url24h);
    });
  });

  describe('File Download Operations', () => {
    it('should download file from GCS bucket', async () => {
      const fileName = `test-download-${randomUUID()}.txt`;
      const file = testBucket.file(fileName);
      
      // Upload file first
      await file.save(TEST_FILE_CONTENT);

      // Download file
      const [contents] = await file.download();
      const downloadedContent = contents.toString();

      expect(downloadedContent).toBe(TEST_FILE_CONTENT);
    });

    it('should download file with specific encoding', async () => {
      const fileName = `test-encoding-${randomUUID()}.txt`;
      const file = testBucket.file(fileName);
      
      const testContent = 'Hello 世界! 🌍';
      await file.save(testContent, {
        metadata: {
          contentType: 'text/plain; charset=utf-8'
        }
      });

      const [contents] = await file.download();
      const downloadedContent = contents.toString('utf-8');

      expect(downloadedContent).toBe(testContent);
    });

    it('should handle partial downloads', async () => {
      const fileName = `test-partial-${randomUUID()}.txt`;
      const file = testBucket.file(fileName);
      
      const largeContent = 'A'.repeat(10000);
      await file.save(largeContent);

      // Download only first 1000 bytes
      const [contents] = await file.download({
        start: 0,
        end: 999
      });

      expect(contents.length).toBe(1000);
      expect(contents.toString()).toBe('A'.repeat(1000));
    });
  });

  describe('File Permissions and Access Control', () => {
    it('should make file public', async () => {
      const fileName = `test-public-${randomUUID()}.txt`;
      const file = testBucket.file(fileName);
      
      // Upload file first
      await file.save(TEST_FILE_CONTENT);

      // Make file public
      const publicUrl = await makeFilePublic(TEST_BUCKET_NAME, fileName);
      
      expect(publicUrl).toBe(`https://storage.googleapis.com/${TEST_BUCKET_NAME}/${fileName}`);
      
      // Verify file is public
      const [acl] = await file.acl.get();
      const publicAcl = acl.find((rule: any) => rule.entity === 'allUsers');
      expect(publicAcl).toBeDefined();
      expect(publicAcl.role).toBe('READER');
    });

    it('should set custom ACL permissions', async () => {
      const fileName = `test-acl-${randomUUID()}.txt`;
      const file = testBucket.file(fileName);
      
      await file.save(TEST_FILE_CONTENT);

      // Set custom ACL
      await file.acl.add({
        entity: 'allUsers',
        role: 'READER'
      });

      const [acl] = await file.acl.get();
      const publicAcl = acl.find((rule: any) => rule.entity === 'allUsers');
      expect(publicAcl).toBeDefined();
      expect(publicAcl.role).toBe('READER');
    });

    it('should handle private file access', async () => {
      const fileName = `test-private-${randomUUID()}.txt`;
      const file = testBucket.file(fileName);
      
      await file.save(TEST_FILE_CONTENT);

      // File should be private by default
      const [acl] = await file.acl.get();
      const publicAcl = acl.find((rule: any) => rule.entity === 'allUsers');
      expect(publicAcl).toBeUndefined();
    });
  });

  describe('File Management Operations', () => {
    it('should delete file from bucket', async () => {
      const fileName = `test-delete-${randomUUID()}.txt`;
      const file = testBucket.file(fileName);
      
      // Upload file first
      await file.save(TEST_FILE_CONTENT);
      
      // Verify file exists
      const [existsBefore] = await file.exists();
      expect(existsBefore).toBe(true);
      
      // Delete file
      await file.delete();
      
      // Verify file is deleted
      const [existsAfter] = await file.exists();
      expect(existsAfter).toBe(false);
    });

    it('should copy file within bucket', async () => {
      const sourceFileName = `test-copy-source-${randomUUID()}.txt`;
      const destFileName = `test-copy-dest-${randomUUID()}.txt`;
      
      const sourceFile = testBucket.file(sourceFileName);
      const destFile = testBucket.file(destFileName);
      
      // Upload source file
      await sourceFile.save(TEST_FILE_CONTENT);
      
      // Copy file
      await sourceFile.copy(destFile);
      
      // Verify both files exist
      const [sourceExists] = await sourceFile.exists();
      const [destExists] = await destFile.exists();
      
      expect(sourceExists).toBe(true);
      expect(destExists).toBe(true);
      
      // Verify content is the same
      const [destContents] = await destFile.download();
      expect(destContents.toString()).toBe(TEST_FILE_CONTENT);
    });

    it('should move file within bucket', async () => {
      const sourceFileName = `test-move-source-${randomUUID()}.txt`;
      const destFileName = `test-move-dest-${randomUUID()}.txt`;
      
      const sourceFile = testBucket.file(sourceFileName);
      const destFile = testBucket.file(destFileName);
      
      // Upload source file
      await sourceFile.save(TEST_FILE_CONTENT);
      
      // Move file
      await sourceFile.move(destFile);
      
      // Verify source file is deleted and dest file exists
      const [sourceExists] = await sourceFile.exists();
      const [destExists] = await destFile.exists();
      
      expect(sourceExists).toBe(false);
      expect(destExists).toBe(true);
      
      // Verify content is preserved
      const [destContents] = await destFile.download();
      expect(destContents.toString()).toBe(TEST_FILE_CONTENT);
    });

    it('should list files in bucket', async () => {
      const fileName = `test-list-${randomUUID()}.txt`;
      const file = testBucket.file(fileName);
      
      await file.save(TEST_FILE_CONTENT);
      
      // List files with prefix
      const [files] = await testBucket.getFiles({ prefix: 'test-list-' });
      
      expect(files.length).toBeGreaterThan(0);
      const testFile = files.find((f: any) => f.name === fileName);
      expect(testFile).toBeDefined();
    });

    it('should get file metadata', async () => {
      const fileName = `test-metadata-${randomUUID()}.txt`;
      const file = testBucket.file(fileName);
      
      const metadata = {
        contentType: 'text/plain',
        metadata: {
          uploadedBy: 'test-user',
          courseId: 'course-123'
        }
      };
      
      await file.save(TEST_FILE_CONTENT, { metadata });
      
      const [fileMetadata] = await file.getMetadata();
      
      expect(fileMetadata.name).toBe(fileName);
      expect(fileMetadata.contentType).toBe('text/plain');
      expect(fileMetadata.metadata.uploadedBy).toBe('test-user');
      expect(fileMetadata.metadata.courseId).toBe('course-123');
      expect(fileMetadata.size).toBeDefined();
      expect(fileMetadata.timeCreated).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent bucket', async () => {
      const nonExistentBucket = 'non-existent-bucket-12345';
      
      await expect(
        getSignedUploadUrl(nonExistentBucket, 'test.txt', 'text/plain')
      ).rejects.toThrow();
    });

    it('should handle invalid file names', async () => {
      const invalidFileName = '../../../etc/passwd';
      
      await expect(
        getSignedUploadUrl(TEST_BUCKET_NAME, invalidFileName, 'text/plain')
      ).rejects.toThrow();
    });

    it('should handle network errors gracefully', async () => {
      // This test would require mocking network failures
      // For now, we'll test with invalid credentials scenario
      const originalCredentials = process.env.GOOGLE_CLOUD_CREDENTIALS;
      
      try {
        // Temporarily set invalid credentials
        process.env.GOOGLE_CLOUD_CREDENTIALS = '{"invalid": "json"}';
        
        // Re-import the module to get new instance with invalid credentials
        const { getSignedUploadUrl: getSignedUploadUrlWithInvalidCreds } = await import('@/lib/gcs');
        
        await expect(
          getSignedUploadUrlWithInvalidCreds(TEST_BUCKET_NAME, 'test.txt', 'text/plain')
        ).rejects.toThrow();
      } finally {
        // Restore original credentials
        process.env.GOOGLE_CLOUD_CREDENTIALS = originalCredentials;
      }
    });

    it('should handle expired signed URLs', async () => {
      const fileName = `test-expired-${randomUUID()}.txt`;
      
      // Generate URL with very short expiration (1 second)
      const signedUrl = await getSignedUploadUrl(
        TEST_BUCKET_NAME,
        fileName,
        'text/plain',
        1 // 1 second
      );
      
      expect(signedUrl).toBeDefined();
      
      // Wait for URL to expire
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Attempt to use expired URL should fail
      const response = await fetch(signedUrl, {
        method: 'PUT',
        body: TEST_FILE_CONTENT,
        headers: {
          'Content-Type': 'text/plain'
        }
      });
      
      expect(response.status).toBe(403); // Forbidden due to expired signature
    });
  });

  describe('API Integration Tests', () => {
    it('should test GCS presigned URL API endpoint', async () => {
      const response = await fetch('http://localhost:3000/api/upload/gcs-presigned-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Note: In real tests, you'd need proper authentication headers
        },
        body: JSON.stringify({
          filename: 'test-api.txt',
          contentType: 'text/plain',
          uploadType: 'course-image'
        })
      });

      // This test will fail without proper authentication
      // In a real test environment, you'd mock the authentication
      expect(response.status).toBe(401); // Unauthorized without proper auth
    });

    it('should test image signed URL API endpoint', async () => {
      const testGcsUrl = `https://storage.googleapis.com/${TEST_BUCKET_NAME}/test-image.jpg`;
      
      const response = await fetch(
        `http://localhost:3000/api/image-signed-url?url=${encodeURIComponent(testGcsUrl)}`
      );

      // This should work without authentication
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.signedUrl).toBeDefined();
      expect(data.signedUrl).toContain('storage.googleapis.com');
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent uploads', async () => {
      const uploadPromises = [];
      const fileCount = 10;
      
      for (let i = 0; i < fileCount; i++) {
        const fileName = `test-concurrent-${i}-${randomUUID()}.txt`;
        const file = testBucket.file(fileName);
        
        uploadPromises.push(
          file.save(`Concurrent upload ${i}`, {
            metadata: {
              contentType: 'text/plain'
            }
          })
        );
      }
      
      const startTime = Date.now();
      await Promise.all(uploadPromises);
      const endTime = Date.now();
      
      console.log(`Uploaded ${fileCount} files in ${endTime - startTime}ms`);
      
      // All uploads should complete successfully
      expect(uploadPromises.length).toBe(fileCount);
    });

    it('should handle concurrent downloads', async () => {
      // First upload some files
      const fileCount = 5;
      const uploadedFiles = [];
      
      for (let i = 0; i < fileCount; i++) {
        const fileName = `test-concurrent-download-${i}-${randomUUID()}.txt`;
        const file = testBucket.file(fileName);
        await file.save(`Download test ${i}`);
        uploadedFiles.push(file);
      }
      
      // Now download them concurrently
      const downloadPromises = uploadedFiles.map(file => file.download());
      
      const startTime = Date.now();
      const results = await Promise.all(downloadPromises);
      const endTime = Date.now();
      
      console.log(`Downloaded ${fileCount} files in ${endTime - startTime}ms`);
      
      expect(results.length).toBe(fileCount);
      results.forEach(([contents], index) => {
        expect(contents.toString()).toBe(`Download test ${index}`);
      });
    });
  });
});
