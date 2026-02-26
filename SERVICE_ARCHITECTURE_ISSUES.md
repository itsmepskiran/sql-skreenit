# Skreenit Service Architecture Issues & Resolution

## 🔴 DUPLICATE SERVICE CLASSES FOUND

The project has **duplicate service implementations** causing confusion:

### Problem Overview

There are **two versions** of the same services:

| Service | mysql_service.py (✅ Correct - Uses MySQL) | Standalone File (❌ Old - Uses Supabase) |
|---------|-----|-----|
| **NotificationService** | Uses MySQL via MySQLService | notification_service.py uses Supabase |
| **VideoService** | Uses MySQL via MySQLService | video_service.py uses Supabase |
| **DashboardService** | Uses MySQL via MySQLService | dashboard_service.py uses Supabase |

---

## ✅ RECOMMENDED SERVICE USAGE

Use **ONLY** the MySQL versions from `services/mysql_service.py`:

```python
# ✅ CORRECT WAY
from services.mysql_service import (
    UserService,
    RecruiterService,
    CandidateService,
    DashboardService,      # ← Uses MySQL
    NotificationService,   # ← Uses MySQL
    VideoService           # ← Uses MySQL
)

# ❌ DO NOT USE THESE
from services.notification_service import NotificationService  # Uses Supabase
from services.video_service import VideoService               # Uses Supabase  
from services.dashboard_service import DashboardService       # Uses Supabase
```

---

## 🧹 CLEANUP RECOMMENDATIONS

### Option 1: Remove Old Standalone Files (RECOMMENDED)
Delete these files since they're deprecated and use Supabase instead of MySQL:
- `backend/services/notification_service.py` - Has old Supabase implementation
- `backend/services/video_service.py` - Has old Supabase implementation
- `backend/services/dashboard_service.py` - Has old Supabase implementation

**Why?** They're confusing developers and still reference Supabase for data storage, which conflicts with the MySQL+Supabase Auth architecture.

### Option 2: Keep Both But Clearly Document
If you want to keep both versions (not recommended):
1. Create a clear mapping in a `services/__init__.py`:
   ```python
   # services/__init__.py
   from services.mysql_service import (
       UserService,
       RecruiterService, 
       CandidateService,
       DashboardService,
       NotificationService,
       VideoService
   )
   
   # Deprecated Supabase-based services (for reference only)
   # from services.video_service import VideoService as VideoServiceLegacy
   ```

2. Add a README in services folder explaining which to use

---

## 📋 CURRENT main_new.py IMPORTS (CORRECT)

```python
from services.mysql_service import (
    UserService,
    RecruiterService,
    CandidateService,
    DashboardService,
    NotificationService,
    VideoService
)
```

This is **already correct** - the main_new.py file is using the right services from mysql_service.py.

---

## 🔍 SERVICE COMPARISON

### Notification Service
| Aspect | mysql_service.py | notification_service.py |
|--------|----------------|----------------------|
| Data Storage | MySQL Database | Supabase Table |
| Constructor | `__init__(self)` | `__init__(self, client)` |
| Architecture | Follows project spec | Legacy implementation |

### Video Service
| Aspect | mysql_service.py | video_service.py |
|--------|----------------|----------------------|
| Video Storage | R2 (via main upload) | Supabase Storage |
| Data Storage | MySQL | Supabase |
| Constructor | `__init__(self)` | `__init__(self, supabase_client)` |

### Dashboard Service
| Aspect | mysql_service.py | dashboard_service.py |
|--------|----------------|----------------------|
| Data Source | MySQL Database | Supabase Tables |
| Constructor | `__init__(self)` | `__init__(self, client)` |
| Implementation | Native SQLAlchemy | Supabase RPC calls |

---

## ✅ ACTION ITEMS

### Completed
- ✅ main_new.py is correctly importing from mysql_service.py
- ✅ All service classes exist in mysql_service.py with MySQL backend
- ✅ Services follow project architecture (MySQL + Supabase Auth + R2)

### For Production
- 🟡 **OPTIONAL:** Remove old standalone service files to avoid confusion
- 🟡 **OPTIONAL:** Create clear documentation of service architecture
- 🟡 **OPTIONAL:** Add deprecation warnings if keeping old files

---

## 📚 CORRECT SERVICE INSTANTIATION

Already done in main_new.py:

```python
# Initialize services (from mysql_service.py)
user_service = UserService()
recruiter_service = RecruiterService()
candidate_service = CandidateService()
dashboard_service = DashboardService()
notification_service = NotificationService()
video_service = VideoService()
```

All services:
- Use **MySQLService** as base class
- Have parameterless constructors (no Supabase client needed)
- Use MySQL for all data operations
- Follow the MySQL + Supabase Auth + R2 architecture

---

## 🚀 No Changes Needed

The project **is correctly configured**. The service imports in main_new.py are using the right versions.

The standalone files (notification_service.py, video_service.py, dashboard_service.py) are **legacy implementations** that should be removed or renamed to clarify they're deprecated.

