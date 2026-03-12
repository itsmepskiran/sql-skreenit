-- ============================================================
-- CLEAN DATABASE SCHEMA - CONSISTENT UUID REFERENCES
-- ============================================================

-- ============================================================
-- USERS TABLE (Central ID Hub)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NULL,
    location VARCHAR(255) NULL,
    role ENUM('candidate', 'recruiter', 'admin') NOT NULL DEFAULT 'candidate',
    email_verified BOOLEAN DEFAULT FALSE,
    onboarded BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_email (email),
    INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- COMPANIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS companies (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    website VARCHAR(500) NULL,
    description TEXT NULL,
    logo_url VARCHAR(500) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_companies_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- RECRUITER PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS recruiter_profiles (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36) NOT NULL UNIQUE,
    company_id VARCHAR(36) NULL,
    contact_name VARCHAR(255) NULL,
    contact_email VARCHAR(255) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_recruiter_profiles_user_id (user_id),
    INDEX idx_recruiter_profiles_company_id (company_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- CANDIDATE PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS candidate_profiles (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36) NOT NULL UNIQUE,
    summary TEXT NULL,
    resume_url VARCHAR(500) NULL,
    intro_video_url VARCHAR(500) NULL,
    linkedin_url VARCHAR(500) NULL,
    portfolio_url VARCHAR(500) NULL,
    skills JSON NULL,
    experience_years INT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_candidate_profiles_user_id (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- JOBS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS jobs (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    requirements TEXT NULL,
    location VARCHAR(255) NULL,
    job_type ENUM('full-time', 'part-time', 'contract', 'internship') DEFAULT 'full-time',
    salary_min DECIMAL(10,2) NULL,
    salary_max DECIMAL(10,2) NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    is_remote BOOLEAN DEFAULT FALSE,
    status ENUM('active', 'inactive', 'closed') DEFAULT 'active',
    company_id VARCHAR(36) NOT NULL,
    created_by VARCHAR(36) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    expires_at DATETIME NULL,
    INDEX idx_jobs_company_id (company_id),
    INDEX idx_jobs_created_by (created_by),
    INDEX idx_jobs_status (status),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- JOB APPLICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS job_applications (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    job_id VARCHAR(36) NOT NULL,
    candidate_id VARCHAR(36) NOT NULL,
    cover_letter TEXT NULL,
    intro_video_url VARCHAR(500) NULL,
    resume_url VARCHAR(500) NULL,
    custom_answers JSON NULL,
    status ENUM('submitted', 'reviewed', 'shortlisted', 'interview_scheduled', 'interviewing', 'hired', 'rejected') DEFAULT 'submitted',
    ai_score INT NULL,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_job_applications_job_id (job_id),
    INDEX idx_job_applications_candidate_id (candidate_id),
    INDEX idx_job_applications_status (status),
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (candidate_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- INTERVIEW QUESTIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS interview_questions (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    job_id VARCHAR(36) NOT NULL,
    question TEXT NOT NULL,
    question_order INT DEFAULT 0,
    time_limit INT DEFAULT 120,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_interview_questions_job_id (job_id),
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- VIDEO RESPONSES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS video_responses (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    application_id VARCHAR(36) NOT NULL,
    candidate_id VARCHAR(36) NOT NULL,
    question_id VARCHAR(36) NULL,
    question TEXT NOT NULL,
    video_url VARCHAR(500) NOT NULL,
    video_path VARCHAR(500) NOT NULL,
    question_index INT DEFAULT 0,
    duration INT NULL,
    transcript TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_video_responses_application_id (application_id),
    INDEX idx_video_responses_candidate_id (candidate_id),
    INDEX idx_video_responses_question_id (question_id),
    FOREIGN KEY (application_id) REFERENCES job_applications(id) ON DELETE CASCADE,
    FOREIGN KEY (candidate_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES interview_questions(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- CANDIDATE EDUCATION TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS candidate_education (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    candidate_id VARCHAR(36) NOT NULL,
    degree VARCHAR(255) NOT NULL,
    institution VARCHAR(255) NOT NULL,
    completion_year INT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_candidate_education_candidate_id (candidate_id),
    FOREIGN KEY (candidate_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- CANDIDATE EXPERIENCE TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS candidate_experience (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    candidate_id VARCHAR(36) NOT NULL,
    job_title VARCHAR(255) NOT NULL,
    company VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NULL,
    description TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_candidate_experience_candidate_id (candidate_id),
    FOREIGN KEY (candidate_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- CANDIDATE VIDEOS TABLE (Intro videos, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS candidate_videos (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    candidate_id VARCHAR(36) NOT NULL,
    video_type ENUM('intro', 'portfolio', 'other') DEFAULT 'intro',
    video_url VARCHAR(500) NOT NULL,
    video_path VARCHAR(500) NOT NULL,
    title VARCHAR(255) NULL,
    description TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_candidate_videos_candidate_id (candidate_id),
    FOREIGN KEY (candidate_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- KEY RELATIONSHIPS SUMMARY
-- ============================================================
/*
CENTRAL HUB: users.id
├── recruiter_profiles.user_id → users.id
├── candidate_profiles.user_id → users.id
├── jobs.created_by → users.id
├── job_applications.candidate_id → users.id
├── video_responses.candidate_id → users.id
├── candidate_education.candidate_id → users.id
├── candidate_experience.candidate_id → users.id
└── candidate_videos.candidate_id → users.id

SECONDARY HUB: jobs.id
├── job_applications.job_id → jobs.id
└── interview_questions.job_id → jobs.id

TERTIARY HUB: job_applications.id
└── video_responses.application_id → job_applications.id

QUATERNARY HUB: interview_questions.id
└── video_responses.question_id → interview_questions.id

ALL IDS ARE CONSISTENT UUID (VARCHAR(36))
*/
