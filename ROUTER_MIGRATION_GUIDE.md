# MySQL Migration - Router Updates

## 🔄 Updated Router Files

I've created new router files that use the MySQL service layer instead of Supabase:

### ✅ New Router Files:
- `routers/applicant_new.py` - Uses `candidate_service`, `video_service`, `recruiter_service`
- `routers/recruiter_new.py` - Uses `recruiter_service`, `user_service`, `candidate_service`
- `routers/dashboard_new.py` - Uses `dashboard_service`, `user_service`
- `routers/notifications_new.py` - Uses `notification_service`

### 🔄 Existing Router Files (Keep):
- `routers/auth.py` - **Keep as-is** (uses Supabase for authentication)
- `routers/video.py` - **Keep as-is** (if exists, may need updates)

## 🚀 Migration Steps:

### 1. Replace Router Imports in main_new.py
```python
# OLD:
from routers import applicant, recruiter, dashboard, notifications

# NEW:
from routers import applicant_new as applicant
from routers import recruiter_new as recruiter  
from routers import dashboard_new as dashboard
from routers import notifications_new as notifications
```

### 2. Update Router Inclusions
```python
# Auth router (Supabase - Keep)
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])

# Data routers (MySQL - New)
app.include_router(applicant.router, prefix="/api/v1/applicant", tags=["Applicant"])
app.include_router(recruiter.router, prefix="/api/v1/recruiter", tags=["Recruiter"])
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["Dashboard"])
app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["Notifications"])
```

### 3. File Upload Configuration
The new routers handle file uploads using Hostinger file system instead of Supabase storage:

```env
# Add to .env file
UPLOAD_BASE_PATH=/home/username/public_html/uploads
RESUME_UPLOAD_PATH=/home/username/public_html/uploads/resumes
VIDEO_UPLOAD_PATH=/home/username/public_html/uploads/videos
PROFILE_IMAGE_UPLOAD_PATH=/home/username/public_html/uploads/profile-images

PUBLIC_BASE_URL=https://yourdomain.com
RESUME_PUBLIC_URL=https://yourdomain.com/uploads/resumes
VIDEO_PUBLIC_URL=https://yourdomain.com/uploads/videos
PROFILE_IMAGE_PUBLIC_URL=https://yourdomain.com/uploads/profile-images
```

## 🔧 Key Changes:

### Authentication Flow:
```
Frontend → Supabase Auth → JWT Token → MySQL Service
```

### Data Flow:
```
Frontend → FastAPI Router → MySQL Service → MySQL Database
```

### File Storage:
```
Frontend → FastAPI → Hostinger File System → Public URL
```

## 📋 Compatibility Notes:

### ✅ What Works:
- All existing API endpoints remain the same
- Authentication still uses Supabase
- Frontend code doesn't need changes
- All CRUD operations use MySQL

### ⚠️ What to Check:
1. **Middleware**: Ensure `middleware/role_required.py` exists
2. **Models**: Verify all Pydantic models are compatible
3. **Environment**: Set all required environment variables
4. **File Paths**: Update Hostinger file paths in .env

### 🔍 Testing Checklist:
- [ ] User registration/login (Supabase)
- [ ] Profile creation/update (MySQL)
- [ ] Job posting (MySQL)
- [ ] Job applications (MySQL)
- [ ] File uploads (Hostinger)
- [ ] Dashboard data (MySQL)

## 🚨 Important:

The existing router files (`applicant.py`, `recruiter.py`, etc.) can remain in the project. The new files (`*_new.py`) use MySQL while the old files use Supabase. This allows you to:

1. **Test gradually**: Switch to new routers one by one
2. **Rollback easily**: Keep old files as backup
3. **Compare performance**: Test MySQL vs Supabase performance

## 🔄 Final Switch:

Once you've tested everything, you can:
1. Rename `applicant_new.py` → `applicant.py`
2. Delete old `applicant.py`
3. Repeat for other routers

This ensures a smooth migration with minimal downtime!
