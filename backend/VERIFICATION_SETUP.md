# Email Verification & Welcome Flow - Implementation Guide

## Changes Made

### 1. **Updated Email Verification Flow**
   - **File**: `controllers/authController.js`
   - **Change**: Modified the `verifyEmail` function to:
     - Send a **welcome email** after successful verification
     - **Redirect** to frontend success page instead of returning JSON
     - Handle errors by redirecting to error page

### 2. **Dynamic Frontend URL Configuration**
   - **File**: `controllers/authController.js`
   - **Verification URL**: Now uses `process.env.FRONTEND_URL` instead of hardcoded `localhost:3000`
   - Applied to both:
     - Verification email link in `registerUser`
     - Welcome email link in `verifyEmail`
     - Redirect URLs after verification

### 3. **Environment Configuration**
   - **File**: `.env.example` (created)
   - Added `FRONTEND_URL` configuration variable

---

## Setup Instructions

### Step 1: Update Your `.env` File

Add this line to your `.env` file:

```
FRONTEND_URL=http://localhost:3000
```

Or if deploying to production:

```
FRONTEND_URL=https://yourdomain.com
```

### Step 2: Environment Variables Reference

```env
# Database Configuration
MONGODB_URI=your_mongodb_connection_string

# Email Configuration
EMAIL_USER=your_gmail_address@gmail.com
EMAIL_PASS=your_app_specific_password

# JWT Secret
JWT_SECRET=your_jwt_secret_key

# Port
PORT=5000

# Frontend URL (for email verification and redirects)
FRONTEND_URL=http://localhost:3000

# Cloudinary Configuration
CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

---

## Email Verification Flow

### Registration Flow:
1. User registers with email and password
2. Receives **verification email** with link to: `{FRONTEND_URL}/verify-email/{token}`
3. User clicks link → Backend verifies token

### Email Verification Flow:
1. Backend verifies the email token
2. Marks user as verified (`isVerified = true`)
3. Sends **welcome email** with login instructions
4. **Redirects** to: `{FRONTEND_URL}/verify-success`

### Error Handling:
- Invalid/expired token → Redirects to: `{FRONTEND_URL}/verify-error?message=...`
- Server error → Redirects to: `{FRONTEND_URL}/verify-error?message=Server error during verification`

---

## Frontend Requirements

You need to create these pages on your frontend:

### 1. Verify Email Page
   - **Route**: `/verify-email/:token`
   - Extracts token from URL
   - Calls backend: `GET /api/v1/auth/verify-email/{token}`
   - Backend handles the redirect

### 2. Success Page
   - **Route**: `/verify-success`
   - Shows confirmation message
   - Offers link to login page

### 3. Error Page
   - **Route**: `/verify-error`
   - Shows error message (from query param `message`)
   - Offers option to resend verification email

---

## Email Examples

### Verification Email
```
Hi [FirstName],

Your email has been verified successfully!

You can now log in to your account using your email and password.

[Click here to log in] → {FRONTEND_URL}/login

Thank you for joining UNI NEX!
```

---

## API Endpoints

### Register User
- **Endpoint**: `POST /api/v1/auth/register`
- **Response**: User data + JWT token
- **Email Sent**: Verification email with link

### Verify Email
- **Endpoint**: `GET /api/v1/auth/verify-email/:token`
- **Response**: Redirects to frontend
- **Email Sent**: Welcome email with login instructions

### Login User
- **Endpoint**: `POST /api/v1/auth/login`
- **Requirement**: User must be verified (`isVerified = true`)
- **Response**: User data + JWT token

---

## Testing

### Test Registration:
```bash
POST /api/v1/auth/register
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "1234567890",
  "password": "password123",
  "confirmPassword": "password123",
  "role": "student",
  "studentId": "STU123",
  "faculty": "Computing"
}
```

### Check Emails:
- User should receive 2 emails:
  1. **Verification Email** - with link to verify account
  2. **Welcome Email** - (after clicking verification link) - with login instructions

### Test Verification:
- Wait for verification email
- Click the link in the email
- Should be redirected to: `{FRONTEND_URL}/verify-success`
- User should now be able to login

---

## Notes

- ✅ Verification tokens are one-time use (deleted after verification)
- ✅ Users cannot login until email is verified
- ✅ Frontend URL is configurable via environment variable
- ✅ Works with any frontend domain (local, staging, production)
- ⚠️ Make sure `FRONTEND_URL` matches your actual frontend URL
