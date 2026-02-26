# MySQL Migration Guide for Skreenit

## 🎯 Overview
This guide helps you migrate from Supabase to MySQL while keeping Supabase for authentication only.

## 📋 Prerequisites

### 1. Hostinger Database Setup
- Create MySQL database in Hostinger cPanel
- Note database name, username, password, host
- Create database user with full permissions

### 2. Environment Variables
Create `.env` file in backend directory:

```env
# Supabase (Auth Only)
SUPABASE_URL=your-supabase-project-url
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-key

# MySQL (Data Storage)
MYSQL_HOST=your-hostinger-host
MYSQL_PORT=3306
MYSQL_USER=your-mysql-username
MYSQL_PASSWORD=your-mysql-password
MYSQL_DATABASE=skreenit

# File Storage (Hostinger File Manager)
UPLOAD_BASE_PATH=/home/username/public_html/uploads
RESUME_UPLOAD_PATH=/home/username/public_html/uploads/resumes
VIDEO_UPLOAD_PATH=/home/username/public_html/uploads/videos
PROFILE_IMAGE_UPLOAD_PATH=/home/username/public_html/uploads/profile-images

# Public URLs
PUBLIC_BASE_URL=https://yourdomain.com
RESUME_PUBLIC_URL=https://yourdomain.com/uploads/resumes
VIDEO_PUBLIC_URL=https://yourdomain.com/uploads/videos
PROFILE_IMAGE_PUBLIC_URL=https://yourdomain.com/uploads/profile-images

# Email (Resend)
RESEND_API_KEY=your-resend-api-key
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=Skreenit

# JWT
JWT_SECRET_KEY=your-super-secret-jwt-key
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# CORS
ALLOWED_ORIGINS=https://yourdomain.com,http://localhost:3000

# Debug
DEBUG=false
ENVIRONMENT=production
```

## 🗃 Migration Steps

### Step 1: Create Database Tables
1. Login to Hostinger phpMyAdmin
2. Select your database
3. Click "Import" tab
4. Upload `database/schema.sql` file
5. Execute - All 14 tables will be created

### Step 2: Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### Step 3: Update Backend Code
1. Replace `main.py` with `main_new.py`
2. The new main uses MySQL for data, Supabase for auth only

### Step 4: File Storage Setup
1. Create upload directories in Hostinger File Manager:
   - `/uploads/resumes/`
   - `/uploads/videos/`
   - `/uploads/profile-images/`

2. Set proper permissions (755 for directories, 644 for files)

### Step 5: Test Connection
```bash
cd backend
python main_new.py
```

## 📊 Database Schema Overview

| Table | Purpose | Key Fields |
|-------|---------|-------------|
| `users` | User accounts (synced from Supabase) | id, email, role |
| `companies` | Company information | id, name, created_by |
| `recruiter_profiles` | Recruiter profiles | user_id, company_id |
| `candidate_profiles` | Candidate profiles | user_id, skills, resume_url |
| `jobs` | Job postings | id, title, status |
| `job_applications` | Job applications | job_id, candidate_id, intro_video_url |
| `video_responses` | Video answers | application_id, video_url |
| `notifications` | User notifications | created_by, message |

## 🔧 Service Layer Changes

### Before (Supabase)
```python
from services.supabase_client import get_client
supabase = get_client()
data = supabase.table("jobs").select("*").execute()
```

### After (MySQL)
```python
from services.mysql_service import recruiter_service
data = recruiter_service.list_jobs(user_id)
```

## 🎭 Frontend Changes Required

### 1. Update API Calls
No changes needed! The API endpoints remain the same.

### 2. File Upload URLs
Update file upload URLs in frontend to use Hostinger paths:
- Resumes: `https://yourdomain.com/uploads/resumes/`
- Videos: `https://yourdomain.com/uploads/videos/`
- Profile Images: `https://yourdomain.com/uploads/profile-images/`

## 🚀 Deployment

### 1. Backend Deployment
```bash
# Install dependencies
pip install -r requirements.txt

# Start the application
uvicorn main_new:app --host 0.0.0.0 --port 8000
```

### 2. Environment Setup
- Ensure all environment variables are set in production
- Test database connection
- Verify file upload paths

## 🔍 Testing

### 1. Database Connection
```python
from database import get_db_session

with get_db_session() as db:
    print("✅ MySQL connection successful!")
```

### 2. API Endpoints
Test all endpoints to ensure they work with MySQL:
- Authentication (Supabase)
- Job CRUD (MySQL)
- Application submission (MySQL)
- Profile management (MySQL)

## 📝 Migration Checklist

- [ ] MySQL database created in Hostinger
- [ ] Schema.sql executed successfully
- [ ] Environment variables configured
- [ ] Upload directories created
- [ ] Backend dependencies installed
- [ ] Main.py replaced with main_new.py
- [ ] API endpoints tested
- [ ] File uploads working
- [ ] Authentication working with Supabase
- [ ] Data operations working with MySQL

## 🆘 Troubleshooting

### Database Connection Issues
```bash
# Check MySQL credentials
mysql -h HOST -u USER -p DATABASE

# Verify tables exist
mysql -h HOST -u USER -p -e "SHOW TABLES;" DATABASE
```

### File Upload Issues
- Check directory permissions
- Verify public URL accessibility
- Check file size limits in php.ini

### Authentication Issues
- Verify Supabase URL and keys
- Check JWT configuration
- Test token verification

## 📞 Support

If you encounter issues:
1. Check error logs in backend console
2. Verify database connection
3. Test with small data sets first
4. Ensure all environment variables are set

## 🎉 Benefits of Migration

✅ **Better Performance**: MySQL is optimized for read-heavy operations
✅ **Full Control**: Complete database management
✅ **Cost Effective**: No Supabase data storage costs
✅ **Scalability**: Easy to scale with Hostinger
✅ **Security**: Isolated database environment
✅ **Backup Control**: Full backup responsibility
