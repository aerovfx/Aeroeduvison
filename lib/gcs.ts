import { Storage } from '@google-cloud/storage';

// Initialize GCS client with better error handling
let storage: Storage;

try {
  if (process.env.GOOGLE_CLOUD_CREDENTIALS) {
    // Use credentials from environment variable
    try {
      const credentials = JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS);
      storage = new Storage({
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
        credentials,
      });
    } catch (parseError) {
      console.warn('[GCS_CONFIG_WARNING] Invalid JSON in GOOGLE_CLOUD_CREDENTIALS, using default auth');
      storage = new Storage({
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      });
    }
  } else if (process.env.GOOGLE_CLOUD_KEY_FILE) {
    // Use key file path
    storage = new Storage({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE,
    });
  } else {
    // Fallback for local development with gcloud auth application-default login
    storage = new Storage({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || 'default-project',
    });
  }
} catch (error) {
  console.error('[GCS_INIT_ERROR]', error);
  throw new Error('Failed to initialize Google Cloud Storage client');
}

export async function getSignedUploadUrl(
  bucketName: string,
  fileName: string,
  contentType: string,
  expiresIn: number = 3600 // 1 hour
) {
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(fileName);

  const [signedUrl] = await file.getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: Date.now() + expiresIn * 1000,
    contentType,
  });

  return signedUrl;
}

export async function getSignedDownloadUrl(
  bucketName: string,
  fileName: string,
  expiresIn: number = 3600 // 1 hour
) {
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(fileName);

  const [signedUrl] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + expiresIn * 1000,
  });

  return signedUrl;
}

export async function getPublicUrl(bucketName: string, fileName: string) {
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(fileName);
  
  return `https://storage.googleapis.com/${bucketName}/${fileName}`;
}

export async function makeFilePublic(bucketName: string, fileName: string) {
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(fileName);
  
  await file.makePublic();
  return `https://storage.googleapis.com/${bucketName}/${fileName}`;
}

export { storage };
