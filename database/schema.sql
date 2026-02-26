-- Skreenit MySQL Database Schema
-- Complete schema for migrating from Supabase to MySQL

-- Create database if not exists (uncomment if needed)
-- CREATE DATABASE IF NOT EXISTS skreenit CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE skreenit;

-- ============================================================
-- USERS TABLE (Synced from Supabase Auth)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NULL,
    phone VARCHAR(50) NULL,
    role ENUM('recruiter', 'candidate') DEFAULT 'candidate',
    avatar_url VARCHAR(500) NULL,
    email_confirmed_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_sign_in_at DATETIME NULL,
    metadata JSON NULL,
    INDEX idx_users_email (email),
    INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- COMPANIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS companies (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    website VARCHAR(500) NULL,
    logo_url VARCHAR(500) NULL,
    created_by VARCHAR(36) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_companies_name (name),
    INDEX idx_companies_created_by (created_by),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- RECRUITER PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS recruiter_profiles (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36) NOT NULL UNIQUE,
    company_id VARCHAR(36) NULL,
    company_name VARCHAR(255) NULL,
    company_website VARCHAR(500) NULL,
    contact_name VARCHAR(255) NULL,
    contact_email VARCHAR(255) NULL,
    location VARCHAR(255) NULL,
    about TEXT NULL,
    avatar_url VARCHAR(500) NULL,
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
    full_name VARCHAR(255) NULL,
    email VARCHAR(255) NULL,
    phone VARCHAR(50) NULL,
    location VARCHAR(255) NULL,
    summary TEXT NULL,
    avatar_url VARCHAR(500) NULL,
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
    FOREIGN KEY (candidate_id) REFERENCES candidate_profiles(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- CANDIDATE EXPERIENCE TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS candidate_experience (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    candidate_id VARCHAR(36) NOT NULL,
    job_title VARCHAR(255) NOT NULL,
    company VARCHAR(255) NOT NULL,
    start_date VARCHAR(50) NULL,
    end_date VARCHAR(50) NULL,
    description TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_candidate_experience_candidate_id (candidate_id),
    FOREIGN KEY (candidate_id) REFERENCES candidate_profiles(user_id) ON DELETE CASCADE
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
    job_type VARCHAR(50) NOT NULL,
    salary_min INT NULL,
    salary_max INT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    is_remote BOOLEAN DEFAULT FALSE,
    status ENUM('active', 'closed', 'draft') DEFAULT 'active',
    company_id VARCHAR(36) NULL,
    created_by VARCHAR(36) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    expires_at DATETIME NULL,
    INDEX idx_jobs_status (status),
    INDEX idx_jobs_created_by (created_by),
    INDEX idx_jobs_company_id (company_id),
    INDEX idx_jobs_created_at (created_at),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- JOB SKILLS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS job_skills (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    job_id VARCHAR(36) NOT NULL,
    skill_name VARCHAR(100) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_job_skills_job_id (job_id),
    INDEX idx_job_skills_skill_name (skill_name),
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
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
    interview_questions JSON NULL,
    status ENUM('submitted', 'reviewed', 'shortlisted', 'interview_scheduled', 'interviewing', 'hired', 'rejected') DEFAULT 'submitted',
    ai_score INT NULL,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_job_applications_job_id (job_id),
    INDEX idx_job_applications_candidate_id (candidate_id),
    INDEX idx_job_applications_status (status),
    INDEX idx_job_applications_applied_at (applied_at),
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (candidate_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- VIDEO RESPONSES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS video_responses (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    application_id VARCHAR(36) NOT NULL,
    candidate_id VARCHAR(36) NOT NULL,
    question TEXT NULL,
    video_url VARCHAR(500) NOT NULL,
    transcript TEXT NULL,
    duration INT NULL,
    status ENUM('not_started', 'in_progress', 'completed', 'failed') DEFAULT 'completed',
    ai_analysis JSON NULL,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_video_responses_application_id (application_id),
    INDEX idx_video_responses_candidate_id (candidate_id),
    FOREIGN KEY (application_id) REFERENCES job_applications(id) ON DELETE CASCADE,
    FOREIGN KEY (candidate_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- INTERVIEW RESPONSES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS interview_responses (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    application_id VARCHAR(36) NOT NULL,
    candidate_id VARCHAR(36) NOT NULL,
    question TEXT NULL,
    video_url VARCHAR(500) NOT NULL,
    status ENUM('pending_review', 'reviewed', 'approved', 'rejected') DEFAULT 'pending_review',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_interview_responses_application_id (application_id),
    INDEX idx_interview_responses_candidate_id (candidate_id),
    FOREIGN KEY (application_id) REFERENCES job_applications(id) ON DELETE CASCADE,
    FOREIGN KEY (candidate_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- GENERAL VIDEO INTERVIEWS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS general_video_interviews (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    candidate_id VARCHAR(36) NOT NULL UNIQUE,
    video_url VARCHAR(500) NOT NULL,
    status ENUM('not_started', 'in_progress', 'completed', 'failed') DEFAULT 'completed',
    ai_analysis JSON NULL,
    is_general BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_general_video_interviews_candidate_id (candidate_id),
    FOREIGN KEY (candidate_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    created_by VARCHAR(36) NOT NULL,
    title VARCHAR(255) NULL,
    message TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'system',
    related_id VARCHAR(36) NULL,
    is_read BOOLEAN DEFAULT FALSE,
    metadata JSON NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_notifications_created_by (created_by),
    INDEX idx_notifications_is_read (is_read),
    INDEX idx_notifications_created_at (created_at),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================

DELIMITER //

CREATE TRIGGER IF NOT EXISTS users_updated_at 
BEFORE UPDATE ON users
FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END//

CREATE TRIGGER IF NOT EXISTS companies_updated_at 
BEFORE UPDATE ON companies
FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END//

CREATE TRIGGER IF NOT EXISTS recruiter_profiles_updated_at 
BEFORE UPDATE ON recruiter_profiles
FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END//

CREATE TRIGGER IF NOT EXISTS candidate_profiles_updated_at 
BEFORE UPDATE ON candidate_profiles
FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END//

CREATE TRIGGER IF NOT EXISTS jobs_updated_at 
BEFORE UPDATE ON jobs
FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END//

CREATE TRIGGER IF NOT EXISTS job_applications_updated_at 
BEFORE UPDATE ON job_applications
FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END//

CREATE TRIGGER IF NOT EXISTS interview_responses_updated_at 
BEFORE UPDATE ON interview_responses
FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END//

CREATE TRIGGER IF NOT EXISTS general_video_interviews_updated_at 
BEFORE UPDATE ON general_video_interviews
FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END//

DELIMITER ;

-- ============================================================
-- SUCCESS MESSAGE
-- ============================================================
SELECT 'Skreenit database schema created successfully!' AS message;
