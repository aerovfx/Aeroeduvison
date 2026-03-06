# Test Accounts for LMSMath

## Available Test Accounts

### Admin Account
- **Email**: `admin@example.com`
- **Password**: `admin123`
- **Role**: ADMIN

### Teacher Accounts
- **Email**: `teacher@example.com` or `teacher2@example.com`
- **Password**: `teacher123`
- **Role**: TEACHER

### Student Accounts
- **Email**: `student@example.com`, `student2@example.com`, `student3@example.com`, `student4@example.com`
- **Password**: `student123`
- **Role**: STUDENT

## Login URL
Production: https://inphysic.com/auth/login
Cloud Run: https://lmsmath-app-442514522574.asia-east2.run.app/auth/login

## Notes
- These accounts are created when running `npm run db:seed`
- Make sure the database has been seeded before trying to login
- If you get 401 error, the user might not exist in the database yet

