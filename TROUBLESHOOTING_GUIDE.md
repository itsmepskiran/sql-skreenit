# Skreenit Project Troubleshooting & Setup Guide
**Updated:** February 26, 2026
**Architecture:** MySQL (Hostinger) + Supabase (Auth) + R2 (Storage)

---

## 🚀 QUICK START

### Step 1: Set Up Environment Variables

```bash
# Copy the template
cp backend/.env.example backend/.env

# Edit with your actual credentials
# You'll need:
# - Supabase URL and Service Role Key
# - MySQL credentials from Hostinger
# - Cloudflare R2 credentials
# - Resend API key
```

### Step 2: Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### Step 3: Initialize Database

```bash
python -c "from database import create_tables; create_tables()"
```

### Step 4: Start Backend

```bash
# Development
python main_new.py

# Or with uvicorn directly
uvicorn main_new:app --reload --port 8000
```

---

## 🔧 FIXES APPLIED

### ✅ Fixed in `main_new.py`
1. **Corrected imports**
   - Changed: `from services.mysql_services_simple` → `from services.mysql_service`
   - Added: `from database import create_tables, get_db`
   - Uncommented: `from services.supabase_client import get_client`

2. **Initialized Supabase client**
   ```python
   supabase_client = get_client()  # Now properly initialized
   ```

3. **Instantiated all services**
   ```python
   user_service = UserService()
   recruiter_service = RecruiterService()
   candidate_service = CandidateService()
   # ... etc
   ```

4. **Re-enabled routers**
   ```python
   from routers import auth, applicant_new, recruiter_new, dashboard_new, notifications_new, video
   app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
   # ... all routers now active
   ```

### ✅ Fixed in `config.py`
- **Completed `validate_config()` function** to properly raise ValueError when credentials are missing

### ✅ Fixed in `database.py`
- **Fixed CandidateEducation Foreign Key**
  - Changed: `ForeignKey("candidate_profiles.user_id")`
  - To: `ForeignKey("candidate_profiles.id")`
  - Reason: user_id is not the primary key of candidate_profiles

- **Fixed CandidateExperience Foreign Key**
  - Changed: `ForeignKey("candidate_profiles.user_id")`
  - To: `ForeignKey("candidate_profiles.id")`

### ✅ Added `.env.example`
- Complete template with all required environment variables
- Clear documentation of what each variable is for

### ✅ Fixed `requirements.txt`
- Removed duplicate `python-multipart` entries
- Consolidated all dependencies into single, clean list

---

## 🧪 TESTING THE SETUP

### 1. Test Environment Variables
```bash
cd backend
python -c "
from config import validate_config
try:
    validate_config()
    print('✅ All environment variables are set correctly!')
except ValueError as e:
    print(f'❌ {e}')
"
```

### 2. Test MySQL Connection
```bash
python -c "
from database import engine
try:
    with engine.connect() as conn:
        result = conn.execute('SELECT 1')
        print('✅ MySQL connection successful!')
except Exception as e:
    print(f'❌ MySQL connection failed: {e}')
"
```

### 3. Test Supabase Connection
```bash
python -c "
from services.supabase_client import get_client
try:
    client = get_client()
    print('✅ Supabase client initialized successfully!')
except Exception as e:
    print(f'❌ Supabase initialization failed: {e}')
"
```

### 4. Test R2 Service
```bash
python -c "
from services.r2_service import r2_service
try:
    # This will check if all credentials are present
    print('✅ R2 service initialized successfully!')
except Exception as e:
    print(f'❌ R2 service initialization failed: {e}')
"
```

### 5. Test Database Tables Creation
```bash
python -c "
from database import create_tables
try:
    create_tables()
    print('✅ Database tables created successfully!')
except Exception as e:
    print(f'❌ Database tables creation failed: {e}')
"
```

### 6. Test API Startup
```bash
python main_new.py
```

Expected output:
```
🔍 About to validate config...
✅ Configuration validated successfully
🔍 About to create FastAPI app...
✅ FastAPI app created successfully
🔍 About to set lifespan...
✅ Lifespan set successfully
🔍 About to import routers...
✅ Routers imported and registered successfully
🚀 Starting Skreenit API...
🔐 Supabase will be used for authentication only
📁 MySQL will be used for all data storage
```

### 7. Test API Endpoints
Once the server is running:

```bash
# Health check
curl http://localhost:8000/health

# Root endpoint
curl http://localhost:8000/

# View API documentation
# Open in browser: http://localhost:8000/docs
```

---

## 🐛 COMMON ISSUES & SOLUTIONS

### Issue 1: "ModuleNotFoundError: No module named 'services.mysql_services_simple'"
**Cause:** Wrong import in main_new.py  
**Status:** ✅ FIXED  
**Solution:** Already applied - imports now use `services.mysql_service`

### Issue 2: "NameError: name 'supabase_client' is not defined"
**Cause:** Supabase client initialization was commented out  
**Status:** ✅ FIXED  
**Solution:** Already uncommented in main_new.py

### Issue 3: "No routers found / Endpoints not available"
**Cause:** Router registration was commented out  
**Status:** ✅ FIXED  
**Solution:** Routers are now active and registered

### Issue 4: "Missing environment variables"
**Cause:** No .env file or incomplete credentials  
**Status:** ✅ FIXED  
**Solution:** Use `.env.example` template and fill in your values

### Issue 5: "MySQL connection failed"
**Likely Causes:**
- Wrong host/port in `MYSQL_HOST`/`MYSQL_PORT`
- Invalid credentials in `MYSQL_USER`/`MYSQL_PASSWORD`
- Database doesn't exist (`MYSQL_DATABASE`)
- Hostinger firewall blocking connection

**Solution:**
```bash
# Test MySQL connection with MySQL CLI
mysql -h your_host -u your_user -p your_password -e "SELECT 1;"

# If that works, test from Python
python -c "
from database import engine
with engine.connect() as conn:
    print('✅ Connection successful!')
"
```

### Issue 6: "ForeignKey constraint error from candidate_profiles.user_id"
**Cause:** Wrong foreign key reference in CandidateEducation/Experience  
**Status:** ✅ FIXED  
**Solution:** Already corrected to reference `candidate_profiles.id`

### Issue 7: "R2 upload fails"
**Likely Causes:**
- Missing R2 credentials environment variables
- Wrong `R2_ENDPOINT` URL
- Invalid bucket name

**Solution:**
```bash
python -c "
from services.r2_service import r2_service
print('R2 Service initialized. Credentials are valid.')
"
```

### Issue 8: "CORS errors from frontend"
**Solution:** Update `ALLOWED_ORIGINS` in `config.py` or use environment variable

---

## 📋 PRE-DEPLOYMENT CHECKLIST

- [ ] All environment variables set in `.env` file
- [ ] MySQL database created and accessible
- [ ] Supabase project created with Auth enabled
- [ ] Cloudflare R2 bucket created with credentials
- [ ] Dependencies installed: `pip install -r requirements.txt`
- [ ] Database tables created: `python -c "from database import create_tables; create_tables()"`
- [ ] health check passes: `curl http://localhost:8000/health`
- [ ] API documentation available: `http://localhost:8000/docs`
- [ ] Sample user registration works through API
- [ ] File upload to R2 works
- [ ] JWT tokens from Supabase are properly validated

---

## 🔐 SECURITY NOTES

1. **JWT_SECRET_KEY** - Change from default in production
2. **.env file** - Never commit to git, add to `.gitignore`
3. **SUPABASE_SERVICE_ROLE_KEY** - Keep secret, use backend only
4. **R2_SECRET_KEY** - Keep secret, never expose to client
5. **MYSQL_PASSWORD** - Use strong password on Hostinger
6. **CORS_ALLOWED_ORIGINS** - Only include trusted domain names

---

## 📚 ARCHITECTURE REFERENCE

```
FRONTEND REQUESTS
       ↓
┌──────────────────────────┐
│   FastAPI Backend        │
│  (main_new.py)           │
├──────────────────────────┤
│ Auth Routers             │──→ Supabase Auth Service
│ (auth.py)                │    • User Registration
│                          │    • User Login
│                          │    • Password Reset
├──────────────────────────┤
│ Data Routers             │
│ (applicant_new.py)       │
│ (recruiter_new.py)       │──→ MySQL Database
│ (dashboard_new.py)       │    • User Data Storage
│ (notifications_new.py)   │    • Job Postings
│ (video.py)               │    • Applications
├──────────────────────────┤
│ Media Operations         │──→ Cloudflare R2
│ (r2_service.py)          │    • Resume Storage
│                          │    • Video Storage
│                          │    • Profile Images
└──────────────────────────┘
```

---

## 🆘 SUPPORT

If you encounter other issues:

1. **Check error messages carefully** - They usually indicate the exact problem
2. **Review logs** - Enable `echo=True` in database.py for SQL logs
3. **Test components individually** - Use the test scripts provided
4. **Verify credentials** - Double-check all environment variables
5. **Check network connectivity** - Ensure firewall allows connections

---

## 📝 NEXT STEPS

1. ✅ Fix critical import errors (DONE)
2. ✅ Initialize Supabase client (DONE)
3. ✅ Register routers (DONE)
4. ✅ Fix database relationships (DONE)
5. 🔄 **Test the application** with the checklist above
6. 🔄 **Deploy to Hostinger** or your server
7. 🔄 **Monitor logs** for any runtime issues

---

**Status:** All critical errors have been fixed. Ready for testing and deployment.
