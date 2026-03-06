# AWS S3 Setup Guide for Math LMS

This guide will help you set up AWS S3 for file uploads in the Math LMS application.

## 1. Create S3 Bucket

1. Go to [AWS S3 Console](https://s3.console.aws.amazon.com/)
2. Click "Create bucket"
3. Choose a unique bucket name (e.g., `lmsmath-uploads-yourname`)
4. Select a region (e.g., `us-east-1`)
5. Keep default settings for now
6. Click "Create bucket"

## 2. Create IAM User

1. Go to [AWS IAM Console](https://console.aws.amazon.com/iam/)
2. Click "Users" → "Create user"
3. Enter username: `lmsmath-s3-user`
4. Click "Next"
5. Select "Attach policies directly"
6. Search and select: `AmazonS3FullAccess`
7. Click "Next" → "Create user"

## 3. Create Access Keys

1. Click on the created user
2. Go to "Security credentials" tab
3. Click "Create access key"
4. Select "Application running outside AWS"
5. Click "Next" → "Create access key"
6. **IMPORTANT**: Copy the Access Key ID and Secret Access Key

## 4. Configure Environment Variables

Add these to your `.env.local` file:

```env
# AWS S3 Configuration
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-access-key-id-here"
AWS_SECRET_ACCESS_KEY="your-secret-access-key-here"
AWS_S3_BUCKET_NAME="your-bucket-name-here"
```

## 5. Configure S3 Bucket Policy

1. Go to your S3 bucket
2. Click "Permissions" tab
3. Scroll down to "Bucket policy"
4. Click "Edit"
5. Add this policy (replace `YOUR_BUCKET_NAME`):

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/*"
        }
    ]
}
```

## 6. Configure CORS (Optional)

If you plan to upload directly from the browser:

1. Go to your S3 bucket
2. Click "Permissions" tab
3. Scroll down to "Cross-origin resource sharing (CORS)"
4. Click "Edit"
5. Add this configuration:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": []
    }
]
```

## 7. Test the Setup

1. Start your development server: `npm run dev`
2. Go to `http://localhost:3000/test-s3-upload`
3. Try uploading a file
4. Check if the file appears in your S3 bucket

## 8. Security Best Practices

### For Production:

1. **Restrict IAM Permissions**: Instead of `AmazonS3FullAccess`, create a custom policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:PutObjectAcl"
            ],
            "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/*"
        }
    ]
}
```

2. **Use Environment Variables**: Never hardcode AWS credentials in your code
3. **Enable Bucket Versioning**: For backup and recovery
4. **Set up Lifecycle Policies**: To manage storage costs
5. **Use CloudFront**: For better performance and caching

## 9. Troubleshooting

### Common Issues:

1. **"Access Denied" Error**:
   - Check IAM user permissions
   - Verify bucket policy
   - Ensure access keys are correct

2. **"Invalid Signature" Error**:
   - Check AWS region setting
   - Verify access key format

3. **"Bucket Not Found" Error**:
   - Verify bucket name
   - Check AWS region

4. **CORS Issues**:
   - Configure CORS policy
   - Check browser console for errors

### Debug Steps:

1. Check server logs for AWS SDK errors
2. Verify environment variables are loaded
3. Test with AWS CLI: `aws s3 ls s3://your-bucket-name`
4. Check IAM user permissions in AWS Console

## 10. Cost Optimization

- Use S3 Standard for frequently accessed files
- Use S3 Infrequent Access for older files
- Set up lifecycle policies to automatically move files
- Monitor usage with AWS Cost Explorer

## Support

If you encounter issues:
1. Check AWS CloudTrail for API call logs
2. Review S3 access logs
3. Test with a simple file upload first
4. Verify all environment variables are set correctly
