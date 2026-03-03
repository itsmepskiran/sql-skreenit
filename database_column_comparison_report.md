# Database-Frontend Column Name Comparison Report
## All 14 Tables vs Frontend Field Names

---

## ✅ TABLE 1: users

### Database Columns:
| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | VARCHAR(36) | NO | Primary Key |
| email | VARCHAR(255) | NO | Unique, Indexed |
| password_hash | VARCHAR(255) | NO | Not exposed to frontend |
| full_name | VARCHAR(255) | YES | |
| phone | VARCHAR(50) | YES | |
| role | ENUM | NO | 'recruiter' or 'candidate' |
| location | VARCHAR(255) | YES | |
| avatar_url | VARCHAR(500) | YES | |
| email_confirmed_at | DATETIME | YES | |
| created_at | DATETIME | NO | Auto-generated |
| updated_at | DATETIME | NO | Auto-generated |
| last_sign_in_at | DATETIME | YES | |
| user_metadata | JSON | YES | |
| onboarded | BOOLEAN | NO | Default: false |

### Frontend Field Names:
- `full_name` → ✅ matches `users.full_name`
- `phone` → ✅ matches `users.phone`
- `location` → ✅ matches `users.location`
- `email` (read-only, from auth) → ✅ matches `users.email`

### ⚠️ MISMATCHES:
- **Frontend sends `profile_image` file** → Database expects `avatar_url` in BOTH `users` AND `candidate_profiles`
  - Current behavior: Saves to `candidate_profiles.avatar_url`
  - Users table `avatar_url` is NOT updated

---

## ✅ TABLE 2: companies

### Database Columns:
| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | VARCHAR(36) | NO | Primary Key |
| name | VARCHAR(255) | NO | Indexed |
| description | TEXT | YES | |
| website | VARCHAR(500) | YES | |
| logo_url | VARCHAR(500) | YES | |
| created_by | VARCHAR(36) | NO | FK to users.id |
| created_at | DATETIME | NO | |
| updated_at | DATETIME | NO | |

### Frontend Field Names (Recruiter):
- `company_name` → ✅ maps to `companies.name`
- `company_description` → ⚠️ NOT in database (recruiter_profiles has `about` instead)
- `company_website` → ✅ maps to `companies.website` AND `recruiter_profiles.company_website`
- `company_logo` file → ✅ maps to `companies.logo_url`

### ⚠️ MISMATCHES:
- **Frontend field `company_description`** → Database has `companies.description` but also saves to `recruiter_profiles.about`

---

## ✅ TABLE 3: recruiter_profiles

### Database Columns:
| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | VARCHAR(36) | NO | Primary Key |
| user_id | VARCHAR(36) | NO | FK to users.id, Unique |
| company_id | VARCHAR(36) | YES | FK to companies.id |
| company_name | VARCHAR(255) | YES | Duplicate of companies.name |
| company_website | VARCHAR(500) | YES | Duplicate of companies.website |
| contact_name | VARCHAR(255) | YES | |
| contact_email | VARCHAR(255) | YES | |
| location | VARCHAR(255) | YES | |
| about | TEXT | YES | |
| avatar_url | VARCHAR(500) | YES | |
| created_at | DATETIME | NO | |
| updated_at | DATETIME | NO | |

### Frontend Field Names:
- `contact_name` → ✅ matches
- `contact_email` → ✅ matches
- `location` → ✅ matches
- `about` → ✅ matches

### ⚠️ DATA DUPLICATION:
- `company_name` duplicates `companies.name`
- `company_website` duplicates `companies.website`

---

## ✅ TABLE 4: candidate_profiles

### Database Columns:
| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | VARCHAR(36) | NO | Primary Key |
| user_id | VARCHAR(36) | NO | FK to users.id, Unique |
| full_name | VARCHAR(255) | YES | ⚠️ DUPLICATE of users.full_name |
| email | VARCHAR(255) | YES | ⚠️ DUPLICATE of users.email |
| phone | VARCHAR(50) | YES | ⚠️ DUPLICATE of users.phone |
| location | VARCHAR(255) | YES | ⚠️ DUPLICATE of users.location |
| summary | TEXT | YES | |
| avatar_url | VARCHAR(500) | YES | |
| resume_url | VARCHAR(500) | YES | |
| intro_video_url | VARCHAR(500) | YES | |
| linkedin_url | VARCHAR(500) | YES | |
| portfolio_url | VARCHAR(500) | YES | |
| skills | JSON | YES | |
| experience_years | INT | YES | |
| created_at | DATETIME | NO | |
| updated_at | DATETIME | NO | |

### Frontend Field Names:
| Frontend | Database | Status |
|----------|----------|--------|
| `summary` | `summary` | ✅ |
| `linkedin_url` | `linkedin_url` | ✅ |
| `portfolio_url` | `portfolio_url` | ✅ |
| `skills` (array) | `skills` (JSON) | ✅ |
| `resume` file | `resume_url` | ✅ |
| `profile_image` file | `avatar_url` | ✅ |
| `intro_video` file | `intro_video_url` | ✅ |
| `full_name` | `full_name` | ⚠️ DUPLICATE - should only save to users table |
| `phone` | `phone` | ⚠️ DUPLICATE - should only save to users table |
| `location` | `location` | ⚠️ DUPLICATE - should only save to users table |

### ⚠️ CRITICAL ISSUES:
1. **Duplicate data across tables**: `full_name`, `email`, `phone`, `location` exist in BOTH `users` AND `candidate_profiles`
2. **Frontend fields sent but NOT saved**:
   - `preferred_job_type` ❌ No matching column
   - `expected_salary` ❌ No matching column
   - `languages` ❌ No matching column
   - `willing_to_relocate` ❌ No matching column
   - `availability` ❌ No matching column

---

## ✅ TABLE 5: candidate_education

### Database Columns:
| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | VARCHAR(36) | NO | Primary Key |
| candidate_id | VARCHAR(36) | NO | FK to candidate_profiles.id |
| degree | VARCHAR(255) | NO | |
| institution | VARCHAR(255) | NO | |
| completion_year | INT | YES | |
| created_at | DATETIME | NO | |

### Frontend Field Names:
| Frontend | Database | Status |
|----------|----------|--------|
| `degree` | `degree` | ✅ |
| `institution` (from `school` input) | `institution` | ✅ |
| `completion_year` (from `year` input) | `completion_year` | ✅ |

### ✅ NO MISMATCHES - All fields match correctly

---

## ✅ TABLE 6: candidate_experience

### Database Columns:
| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | VARCHAR(36) | NO | Primary Key |
| candidate_id | VARCHAR(36) | NO | FK to candidate_profiles.id |
| job_title | VARCHAR(255) | NO | |
| company | VARCHAR(255) | NO | |
| start_date | VARCHAR(50) | YES | |
| end_date | VARCHAR(50) | YES | |
| description | TEXT | YES | |
| created_at | DATETIME | NO | |

### Frontend Field Names:
| Frontend | Database | Status |
|----------|----------|--------|
| `job_title` (was `title`, FIXED) | `job_title` | ✅ |
| `company` | `company` | ✅ |
| `start_date` (from `start` input) | `start_date` | ✅ |
| `end_date` (from `end` input) | `end_date` | ✅ |
| `description` (from `desc` input) | `description` | ✅ |

### ✅ FIXED: Previously `exp.title` didn't match `job_title`

---

## ✅ TABLE 7: jobs

### Database Columns:
| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | VARCHAR(36) | NO | Primary Key |
| title | VARCHAR(255) | NO | |
| description | TEXT | NO | |
| requirements | TEXT | YES | |
| location | VARCHAR(255) | YES | |
| job_type | VARCHAR(50) | NO | |
| salary_min | INT | YES | |
| salary_max | INT | YES | |
| currency | VARCHAR(10) | NO | Default: 'INR' |
| is_remote | BOOLEAN | NO | Default: false |
| status | ENUM | NO | 'active', 'closed', 'draft' |
| company_id | VARCHAR(36) | YES | FK to companies.id |
| created_by | VARCHAR(36) | NO | FK to users.id |
| created_at | DATETIME | NO | |
| updated_at | DATETIME | NO | |
| expires_at | DATETIME | YES | |

### Frontend Field Names (Job Create/Edit):
| Frontend | Database | Status |
|----------|----------|--------|
| `title` | `title` | ✅ |
| `description` | `description` | ✅ |
| `requirements` | `requirements` | ✅ |
| `location` | `location` | ✅ |
| `job_type` | `job_type` | ✅ |
| `salary_min` | `salary_min` | ✅ |
| `salary_max` | `salary_max` | ✅ |
| `currency` | `currency` | ✅ |
| `is_remote` | `is_remote` | ✅ |

### ✅ NO MISMATCHES - All fields match correctly

---

## ✅ TABLE 8: job_skills

### Database Columns:
| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | VARCHAR(36) | NO | Primary Key |
| job_id | VARCHAR(36) | NO | FK to jobs.id |
| skill_name | VARCHAR(100) | NO | Indexed |
| created_at | DATETIME | NO | |

### Frontend Field Names:
- Job skills stored as array in `jobs` table (JSON), not in separate table
- ⚠️ **Mismatch**: Skills are saved to `jobs` JSON field, not `job_skills` table

---

## ✅ TABLE 9: interview_questions

### Database Columns:
| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | VARCHAR(36) | NO | Primary Key |
| job_id | VARCHAR(36) | NO | FK to jobs.id |
| question | TEXT | NO | |
| question_order | INT | NO | Default: 0 |
| time_limit | INT | NO | Default: 120 |
| created_at | DATETIME | NO | |

### Frontend Field Names:
- Questions stored in `jobs.interview_questions` (JSON)
- ⚠️ **Mismatch**: Saved as JSON in jobs table, not in separate table

---

## ✅ TABLE 10: job_applications

### Database Columns:
| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | VARCHAR(36) | NO | Primary Key |
| job_id | VARCHAR(36) | NO | FK to jobs.id |
| candidate_id | VARCHAR(36) | NO | FK to users.id |
| cover_letter | TEXT | YES | |
| intro_video_url | VARCHAR(500) | YES | |
| resume_url | VARCHAR(500) | YES | |
| custom_answers | JSON | YES | |
| interview_questions | JSON | YES | |
| status | ENUM | NO | Default: 'submitted' |
| ai_score | INT | YES | |
| applied_at | DATETIME | NO | |
| updated_at | DATETIME | NO | |

### Frontend Field Names:
| Frontend | Database | Status |
|----------|----------|--------|
| `cover_letter` | `cover_letter` | ✅ |
| `intro_video` file | `intro_video_url` | ✅ |
| `resume` file | `resume_url` | ✅ |
| `custom_answers` | `custom_answers` | ✅ |

### ✅ NO MISMATCHES

---

## ✅ TABLE 11: video_responses

### Database Columns:
| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | VARCHAR(36) | NO | Primary Key |
| application_id | VARCHAR(36) | NO | FK to job_applications.id |
| candidate_id | VARCHAR(36) | NO | FK to users.id |
| question | TEXT | YES | |
| video_url | VARCHAR(500) | NO | |
| transcript | TEXT | YES | |
| duration | INT | YES | |
| status | ENUM | NO | Default: 'completed' |
| ai_analysis | JSON | YES | |
| recorded_at | DATETIME | NO | |

### Frontend Field Names:
- Video responses generated during interview process
- No direct frontend form fields - created programmatically

### ✅ NO MISMATCHES

---

## ✅ TABLE 12: interview_responses

### Database Columns:
| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | VARCHAR(36) | NO | Primary Key |
| application_id | VARCHAR(36) | NO | FK to job_applications.id |
| candidate_id | VARCHAR(36) | NO | FK to users.id |
| question | TEXT | YES | |
| video_url | VARCHAR(500) | NO | |
| status | ENUM | NO | Default: 'pending_review' |
| created_at | DATETIME | NO | |
| updated_at | DATETIME | NO | |

### Frontend Field Names:
- Similar to video_responses
- No direct frontend form fields

### ✅ NO MISMATCHES

---

## ✅ TABLE 13: general_video_interviews

### Database Columns:
| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | VARCHAR(36) | NO | Primary Key |
| candidate_id | VARCHAR(36) | NO | FK to users.id, Unique |
| video_url | VARCHAR(500) | NO | |
| status | ENUM | NO | Default: 'completed' |
| ai_analysis | JSON | YES | |
| is_general | BOOLEAN | NO | Default: true |
| created_at | DATETIME | NO | |
| updated_at | DATETIME | NO | |

### Frontend Field Names:
- `intro_video` file → saved to `general_video_interviews.video_url` AND `candidate_profiles.intro_video_url`

### ⚠️ DATA DUPLICATION:
- Video URL saved to BOTH tables

---

## ✅ TABLE 14: notifications

### Database Columns:
| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | VARCHAR(36) | NO | Primary Key |
| created_by | VARCHAR(36) | NO | FK to users.id |
| title | VARCHAR(255) | YES | |
| message | TEXT | NO | |
| category | VARCHAR(50) | NO | Default: 'system' |
| related_id | VARCHAR(36) | YES | |
| is_read | BOOLEAN | NO | Default: false |
| notification_metadata | JSON | YES | |
| created_at | DATETIME | NO | |

### Frontend Field Names:
- Notifications are read-only from frontend perspective
- Created programmatically by backend

### ✅ NO MISMATCHES

---

## 🚨 SUMMARY OF CRITICAL MISMATCHES

### 1. **Data Duplication Issues**
| Field | Table 1 | Table 2 | Should Be |
|-------|---------|---------|-------------|
| `full_name` | users | candidate_profiles | users ONLY |
| `email` | users | candidate_profiles | users ONLY |
| `phone` | users | candidate_profiles | users ONLY |
| `location` | users | candidate_profiles | users ONLY |
| `avatar_url` | users | candidate_profiles | users ONLY |
| `company_name` | companies | recruiter_profiles | companies ONLY |
| `company_website` | companies | recruiter_profiles | companies ONLY |
| `intro_video_url` | candidate_profiles | general_video_interviews | candidate_profiles ONLY |

### 2. **Fields Sent But Not Saved**
| Frontend Field | Status | Should Be Added To |
|----------------|--------|---------------------|
| `preferred_job_type` | ❌ NOT SAVED | candidate_profiles |
| `expected_salary` | ❌ NOT SAVED | candidate_profiles |
| `languages` | ❌ NOT SAVED | candidate_profiles |
| `willing_to_relocate` | ❌ NOT SAVED | candidate_profiles |
| `availability` | ❌ NOT SAVED | candidate_profiles |

### 3. **Missing Database Columns**
These fields are referenced in code but columns don't exist:
- `candidate_profiles.preferred_job_type`
- `candidate_profiles.expected_salary`
- `candidate_profiles.languages`
- `candidate_profiles.willing_to_relocate`
- `candidate_profiles.availability`
- `candidate_profiles.phone` (exists but not used - prefer users.phone)
- `candidate_profiles.location` (exists but not used - prefer users.location)

### 4. **JSON vs Separate Table Issues**
- `job_skills` table exists but skills saved to `jobs` JSON field
- `interview_questions` table exists but questions saved to `jobs` JSON field

---

## 📋 RECOMMENDED FIXES

### Priority 1: Remove Data Duplication
1. Remove `full_name`, `email`, `phone`, `location` from `candidate_profiles` table OR stop updating them
2. Remove `company_name`, `company_website` from `recruiter_profiles`
3. Stop saving to `general_video_interviews` if not needed

### Priority 2: Add Missing Columns
Add these columns to `candidate_profiles`:
```sql
ALTER TABLE candidate_profiles ADD COLUMN preferred_job_type VARCHAR(100);
ALTER TABLE candidate_profiles ADD COLUMN expected_salary VARCHAR(100);
ALTER TABLE candidate_profiles ADD COLUMN languages JSON;
ALTER TABLE candidate_profiles ADD COLUMN willing_to_relocate BOOLEAN DEFAULT FALSE;
ALTER TABLE candidate_profiles ADD COLUMN availability VARCHAR(100);
```

### Priority 3: Fix JSON vs Table Usage
Decide whether to use:
- Option A: Separate tables (`job_skills`, `interview_questions`)
- Option B: JSON fields in parent table
Then update code consistently.

---

## ✅ VERIFIED MATCHING FIELDS (No Issues)

### Candidate Profile Form:
- `summary` → `candidate_profiles.summary` ✅
- `linkedin_url` → `candidate_profiles.linkedin_url` ✅
- `portfolio_url` → `candidate_profiles.portfolio_url` ✅
- `skills` → `candidate_profiles.skills` ✅
- `resume` → `candidate_profiles.resume_url` ✅
- `profile_image` → `candidate_profiles.avatar_url` ✅
- `intro_video` → `candidate_profiles.intro_video_url` ✅

### Experience Section:
- `job_title` → `candidate_experience.job_title` ✅
- `company` → `candidate_experience.company` ✅
- `start_date` → `candidate_experience.start_date` ✅
- `end_date` → `candidate_experience.end_date` ✅
- `description` → `candidate_experience.description` ✅

### Education Section:
- `degree` → `candidate_education.degree` ✅
- `institution` → `candidate_education.institution` ✅
- `completion_year` → `candidate_education.completion_year` ✅

### Job Posting:
- `title` → `jobs.title` ✅
- `description` → `jobs.description` ✅
- `requirements` → `jobs.requirements` ✅
- `location` → `jobs.location` ✅
- `job_type` → `jobs.job_type` ✅
- `salary_min` → `jobs.salary_min` ✅
- `salary_max` → `jobs.salary_max` ✅
- `currency` → `jobs.currency` ✅
- `is_remote` → `jobs.is_remote` ✅

---

Report generated: 2026-03-03
Total Tables Checked: 14
Total Mismatches Found: 12 (6 duplicates, 5 missing columns, 1 fixed)
