# Skreenit Project Error Analysis & Troubleshooting Report
**Date:** February 26, 2026  
**Architecture:** Hostinger MySQL + Supabase (Auth Only) + Cloudflare R2

---

## 🚨 CRITICAL ERRORS FOUND

### 1. **Missing Imports in `main_new.py`** (BLOCKING)
**File:** [backend/main_new.py](backend/main_new.py)

**Issues:**
- **Line 17:** Importing from non-existent module `services.mysql_services_simple`
  ```python
  from services.mysql_services_simple import user_service, recruiter_service, ...
  ```
  **Should be:**
  ```python
  from services.mysql_service import UserService, RecruiterService, CandidateService, ...
  ```

- **Line 19:** `from services.supabase_client import get_client` is commented out
- **Line 51:** References `create_tables()` but the function is not imported
  ```python
  # Missing: from database import create_tables
  ```

**Impact:** Application won't start because of import errors.

---

### 2. **Uninitialized Supabase Client** (BLOCKING)
**File:** [backend/main_new.py](backend/main_new.py)

**Issues:**
- **Line 19:** Import is commented out
  ```python
  # from services.supabase_client import get_client
  ```
- **Line 53:** Client initialization is commented out
  ```python
  # supabase_client = get_client()  
  ```
- **Line 92:** Function `get_current_user()` tries to use undefined `supabase_client`
  ```python
  user = supabase_client.auth.get_user(token)  # ❌ supabase_client is not defined
  ```

**Impact:** Authentication middleware will fail with `NameError: name 'supabase_client' is not defined`

---

### 3. **Disabled Routers** (BLOCKING)
**File:** [backend/main_new.py](backend/main_new.py#L120-L127)

**Issue:**
```python
# Include routers
# from routers import auth, applicant_new as applicant, recruiter_new as recruiter, ...
# app.include_router(auth.router, ...)
# app.include_router(applicant.router, ...)
# etc.
```

**Impact:** No API endpoints available. All routes are commented out.

---

### 4. **Database Relationship Configuration Issues** 
**File:** [backend/database.py](backend/database.py)

**Issues Found:**

#### a) Circular/Duplicate Relationships
- **Class `User`** (lines 70-78):
  ```python
  jobs: Mapped[List["Job"]] = relationship("Job", back_populates="creator")
  ```
- **Class `Company`** (lines 100-104):
  ```python
  creator: Mapped["User"] = relationship("User", back_populates="jobs")
  jobs: Mapped[List["Job"]] = relationship("Job", back_populates="company")
  ```

**Problem:** `User.jobs` references `Job.creator`, but `Company` also has `jobs` relation to `Job`. This creates confusion about which relationship is primary.

#### b) Foreign Key Reference Inconsistency
- **Job Table** (line 175):
  ```python
  created_by: Mapped[str] = mapped_column(VARCHAR(36), ForeignKey("users.id", ondelete="CASCADE"), ...)
  ```
- **Job Relationship**:
  ```python
  creator: Mapped["User"] = relationship("User", back_populates="jobs")
  company: Mapped[Optional["Company"]] = relationship("Company", back_populates="jobs")
  ```

**Problem:** Both `created_by` (User FK) and `company_id` (Company FK) define relationships, but the back_populates should be distinct.

#### c) CandidateEducation Foreign Key Issue
- **Line 138:**
  ```python
  candidate_id: Mapped[str] = mapped_column(
      VARCHAR(36), 
      ForeignKey("candidate_profiles.user_id", ondelete="CASCADE"),  # ❌ Wrong reference
      nullable=False, 
      index=True
  )
  ```

**Problem:** Should reference `candidate_profiles.id`, not `candidate_profiles.user_id` (which is also a foreign key).

---

### 5. **Async Lifespan Not Properly Integrated**
**File:** [backend/main_new.py](backend/main_new.py#L43-L65)

**Issue:**
```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # initialization code
    yield
    # shutdown code

app.lifespan = lifespan
```

**Problem:** The lifespan context manager is async, but some initialization code may block or not execute properly during startup. The `create_tables()` function should have error handling.

---

### 6. **Missing Environment Variables Configuration**
**File:** [backend/config.py](backend/config.py#L95-L107)

**Issue:**
```python
def validate_config():
    """Validate required environment variables."""
    required_vars = {
        "SUPABASE_URL": SUPABASE_URL,
        "SUPABASE_SERVICE_ROLE_KEY": SUPABASE_SERVICE_ROLE_KEY,
        "MYSQL_HOST": MYSQL_HOST,
        "MYSQL_USER": MYSQL_USER,
        "MYSQL_PASSWORD": MYSQL_PASSWORD,
        "MYSQL_DATABASE": MYSQL_DATABASE
    }
    
    missing_vars = [var for var, value in required_vars.items() if not value]
```

**Problem:** The function checks for missing vars but doesn't raise an error if any are missing. The function returns `None` (incomplete).

**Impact:** No validation is actually happening. Missing credentials won't be caught at startup.

---

### 7. **R2 Service Credentials Validation**
**File:** [backend/services/r2_service.py](backend/services/r2_service.py#L23-L39)

**Status:** ✅ GOOD - Properly validates R2 credentials and raises ValueError if any are missing.

---

### 8. **Deprecated Router Files**
**Issue:** There are router files with both old and new naming:
- `applicant.py` vs `applicant_new.py`
- `recruiter.py` vs `recruiter_new.py` 
- `dashboard.py` vs `dashboard_new.py`

**Impact:** Confusion about which version to use. The new versions are in the code but old versions still exist.

---

## 🟡 NON-CRITICAL ISSUES

### 1. **Redundant Imports in requirements.txt**
```
python-multipart>=0.0.5,<0.0.21  # Line 15
python-multipart>=0.0.6,<0.0.21  # Line 10
```
These are duplicated with slightly different version ranges.

### 2. **Database Pool Configuration**
**File:** [backend/database.py](backend/database.py#L30-L35)
```python
engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    echo=False
)
```

**Suggestion:** Consider adjusting `pool_size` and `max_overflow` based on expected concurrent connections. For Hostinger shared hosting, reducing to `pool_size=5, max_overflow=10` might be safer.

### 3. **No .env File Template**
No `.env.example` or template file exists for developers/deployment to know what environment variables are required.

---

## ✅ CORRECTLY IMPLEMENTED

### 1. **R2 Service Configuration**
- ✅ Proper boto3 S3 client setup
- ✅ Validation of all required credentials
- ✅ Content-type detection
- ✅ Public URL generation
- ✅ Error handling with logging

### 2. **Supabase Auth Integration**
- ✅ Singleton pattern for Supabase client
- ✅ Proper error logging
- ✅ Configuration validation

### 3. **MySQL SQLAlchemy Setup**
- ✅ Proper connection string construction
- ✅ Session management with context managers
- ✅ Model relationships defined
- ✅ UUID generation for IDs

---

## 🔧 RECOMMENDED FIXES (Priority Order)

### Priority 1: CRITICAL (Blocking)
1. **Fix imports in main_new.py** - Import from `mysql_service` not `mysql_services_simple`
2. **Uncomment Supabase client initialization** in main_new.py
3. **Uncomment and fix router registrations** in main_new.py
4. **Complete config validation** in config.py
5. **Fix database relationships** - especially CandidateEducation FK

### Priority 2: HIGH (Functional Issues)
1. **Clean up router duplication** - Remove old router files
2. **Remove duplicate python-multipart** from requirements.txt
3. **Add .env.example** file with all required variables
4. **Add lifespan error handling** for startup failures

### Priority 3: MEDIUM (Best Practices)
1. **Add logging for database initialization**
2. **Optimize connection pool settings** for shared hosting
3. **Add migration helpers** for syncing Supabase to MySQL data

---

## 🌍 ENVIRONMENT VARIABLES REQUIRED

Create `.env` file with:

```env
# Supabase (Auth Only)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# MySQL (Hostinger)
MYSQL_HOST=your_hostinger_db_host
MYSQL_PORT=3306
MYSQL_USER=your_db_user
MYSQL_PASSWORD=your_db_password
MYSQL_DATABASE=skreenit

# Cloudflare R2
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_R2_ACCESS_KEY=your_access_key
CLOUDFLARE_R2_SECRET_KEY=your_secret_key
R2_BUCKET_NAME=your_bucket_name
R2_ENDPOINT=https://yourdomain.com

# Application
ENVIRONMENT=production
DEBUG=false
PORT=9999
FRONTEND_BASE_URL=https://login.skreenit.com

# Email
RESEND_API_KEY=your_resend_api_key
FROM_EMAIL=noreply@skreenit.com
FROM_NAME=Skreenit
```

---

## 📊 ARCHITECTURE SUMMARY

```
┌─────────────────────┐
│   Frontend Apps     │
│  (login, dashboard) │
└──────────┬──────────┘
           │
           ▼
┌──────────────────────────────────┐
│   FastAPI Backend (main.py)      │
├──────────────────────────────────┤
│  • Auth Routers  ────────────┐   │
│  • User Routers  ────────┐   │   │
│  • Job Routers   ────┐   │   │   │
└──────┬──────┬────────┼───┼───┼───┘
       │      │        │   │   │
       ▼      ▼        │   │   │
    ┌──────────────┐   │   │   │
    │ Supabase     │◄──┘   │   │
    │ (Auth Only)  │       │   │
    └──────────────┘       │   │
                           │   │
       ┌───────────────────┘   │
       ▼                       │
    ┌──────────────┐           │
    │ MySQL        │◄──────────┘
    │ (Hostinger)  │
    └──────────────┘
       
       ┌──────────────┐
       │ Cloudflare R2│◄─── File Uploads/Videos/Resumes
       │ (Storage)    │
       └──────────────┘
```

---

## 🧪 TESTING CHECKLIST

- [ ] Environment variables all set correctly
- [ ] MySQL database connectivity working
- [ ] Supabase auth client initializing without errors
- [ ] R2 file upload working
- [ ] All routers registered and endpoints accessible
- [ ] User registration and login flow working
- [ ] Database schema created successfully
- [ ] CORS properly configured for all frontend domains

