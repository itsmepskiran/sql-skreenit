-- ============================================================
-- SKREENIT DATABASE SCHEMA - IDEMPOTENT VERSION
-- Safe to run even if some tables already exist
-- ============================================================

-- ============================================================
-- CORE USER MANAGEMENT (Supabase Auth Integration)
-- ============================================================

-- Main users table (synced with Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(20),
    location VARCHAR(255),
    avatar_url TEXT,
    role VARCHAR(20) NOT NULL CHECK (role IN ('candidate', 'recruiter', 'admin')),
    onboarded BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for users table (safe to create if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_email') THEN
        CREATE INDEX idx_users_email ON users(email);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_role') THEN
        CREATE INDEX idx_users_role ON users(role);
    END IF;
END $$;

-- ============================================================
-- COMPANY MANAGEMENT
-- ============================================================

CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    website VARCHAR(500),
    logo_url TEXT,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_companies_created_by') THEN
        CREATE INDEX idx_companies_created_by ON companies(created_by);
    END IF;
END $$;

-- ============================================================
-- RECRUITER PROFILES
-- ============================================================

CREATE TABLE IF NOT EXISTS recruiter_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255),
    company_website VARCHAR(500),
    contact_name VARCHAR(255),
    contact_email VARCHAR(255),
    location VARCHAR(255),
    about_company TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_recruiter_profiles_user_id') THEN
        CREATE INDEX idx_recruiter_profiles_user_id ON recruiter_profiles(user_id);
    END IF;
END $$;

-- ============================================================
-- CANDIDATE PROFILES
-- ============================================================

CREATE TABLE IF NOT EXISTS candidate_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bio TEXT,
    resume_url TEXT,
    linkedin_url VARCHAR(500),
    portfolio_url VARCHAR(500),
    experience_years INTEGER,
    expected_salary_min INTEGER,
    expected_salary_max INTEGER,
    currency VARCHAR(3) DEFAULT 'INR',
    is_remote_preferred BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_candidate_profiles_user_id') THEN
        CREATE INDEX idx_candidate_profiles_user_id ON candidate_profiles(user_id);
    END IF;
END $$;

-- ============================================================
-- CANDIDATE EDUCATION
-- ============================================================

CREATE TABLE IF NOT EXISTS candidate_education (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    degree VARCHAR(255) NOT NULL,
    institution VARCHAR(255) NOT NULL,
    completion_year INTEGER NOT NULL,
    field_of_study VARCHAR(255),
    grade VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_candidate_education_candidate_id') THEN
        CREATE INDEX idx_candidate_education_candidate_id ON candidate_education(candidate_id);
    END IF;
END $$;

-- ============================================================
-- CANDIDATE EXPERIENCE
-- ============================================================

CREATE TABLE IF NOT EXISTS candidate_experience (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    company VARCHAR(255) NOT NULL,
    start_date DATE,
    end_date DATE,
    is_current BOOLEAN DEFAULT FALSE,
    description TEXT,
    location VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_candidate_experience_candidate_id') THEN
        CREATE INDEX idx_candidate_experience_candidate_id ON candidate_experience(candidate_id);
    END IF;
END $$;

-- ============================================================
-- CANDIDATE SKILLS
-- ============================================================

CREATE TABLE IF NOT EXISTS candidate_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_name VARCHAR(100) NOT NULL,
    proficiency_level VARCHAR(20) CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    years_of_experience INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_candidate_skills_candidate_id') THEN
        CREATE INDEX idx_candidate_skills_candidate_id ON candidate_skills(candidate_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_candidate_skills_skill_name') THEN
        CREATE INDEX idx_candidate_skills_skill_name ON candidate_skills(skill_name);
    END IF;
END $$;

-- ============================================================
-- JOB POSTINGS
-- ============================================================

CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    requirements TEXT,
    location VARCHAR(255) NOT NULL,
    job_type VARCHAR(20) NOT NULL CHECK (job_type IN ('full-time', 'part-time', 'contract', 'internship', 'freelance', 'remote', 'onsite', 'hybrid')),
    salary_min INTEGER,
    salary_max INTEGER,
    currency VARCHAR(3) DEFAULT 'INR',
    is_remote BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'closed', 'draft')),
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    views_count INTEGER DEFAULT 0,
    applications_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_jobs_created_by') THEN
        CREATE INDEX idx_jobs_created_by ON jobs(created_by);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_jobs_company_id') THEN
        CREATE INDEX idx_jobs_company_id ON jobs(company_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_jobs_status') THEN
        CREATE INDEX idx_jobs_status ON jobs(status);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_jobs_job_type') THEN
        CREATE INDEX idx_jobs_job_type ON jobs(job_type);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_jobs_created_at') THEN
        CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);
    END IF;
END $$;

-- ============================================================
-- JOB SKILLS
-- ============================================================

CREATE TABLE IF NOT EXISTS job_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    skill_name VARCHAR(100) NOT NULL,
    is_required BOOLEAN DEFAULT TRUE,
    proficiency_level VARCHAR(20) CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_job_skills_job_id') THEN
        CREATE INDEX idx_job_skills_job_id ON job_skills(job_id);
    END IF;
END $$;

-- ============================================================
-- INTERVIEW QUESTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS interview_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_order INTEGER DEFAULT 0,
    time_limit_seconds INTEGER DEFAULT 180,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_interview_questions_job_id') THEN
        CREATE INDEX idx_interview_questions_job_id ON interview_questions(job_id);
    END IF;
END $$;

-- ============================================================
-- JOB APPLICATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS job_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'reviewing', 'interviewing', 'interview_submitted', 'completed', 'hired', 'rejected', 'withdrawn')),
    cover_letter TEXT,
    custom_answers JSONB,
    interview_questions JSONB,
    current_stage VARCHAR(50),
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    UNIQUE(job_id, candidate_id)
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_job_applications_job_id') THEN
        CREATE INDEX idx_job_applications_job_id ON job_applications(job_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_job_applications_candidate_id') THEN
        CREATE INDEX idx_job_applications_candidate_id ON job_applications(candidate_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_job_applications_status') THEN
        CREATE INDEX idx_job_applications_status ON job_applications(status);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_job_applications_applied_at') THEN
        CREATE INDEX idx_job_applications_applied_at ON job_applications(applied_at DESC);
    END IF;
END $$;

-- ============================================================
-- VIDEO RESPONSES
-- ============================================================

CREATE TABLE IF NOT EXISTS video_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    video_url TEXT NOT NULL,
    video_storage_path TEXT,
    transcript TEXT,
    duration_seconds INTEGER,
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('not_started', 'in_progress', 'completed', 'failed')),
    ai_analysis JSONB,
    ai_score JSONB,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_video_responses_application_id') THEN
        CREATE INDEX idx_video_responses_application_id ON video_responses(application_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_video_responses_candidate_id') THEN
        CREATE INDEX idx_video_responses_candidate_id ON video_responses(candidate_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_video_responses_recorded_at') THEN
        CREATE INDEX idx_video_responses_recorded_at ON video_responses(recorded_at);
    END IF;
END $$;

-- ============================================================
-- GENERAL VIDEO INTERVIEWS
-- ============================================================

CREATE TABLE IF NOT EXISTS general_video_interviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    video_url TEXT NOT NULL,
    video_storage_path TEXT,
    transcript TEXT,
    duration_seconds INTEGER,
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('not_started', 'in_progress', 'completed', 'failed')),
    ai_analysis JSONB,
    ai_score JSONB,
    is_general BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_general_video_interviews_candidate_id') THEN
        CREATE INDEX idx_general_video_interviews_candidate_id ON general_video_interviews(candidate_id);
    END IF;
END $$;

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notifications_user_id') THEN
        CREATE INDEX idx_notifications_user_id ON notifications(user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notifications_is_read') THEN
        CREATE INDEX idx_notifications_is_read ON notifications(is_read);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notifications_created_at') THEN
        CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
    END IF;
END $$;

-- ============================================================
-- AUDIT LOG
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_audit_log_user_id') THEN
        CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_audit_log_entity') THEN
        CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_audit_log_created_at') THEN
        CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);
    END IF;
END $$;

-- ============================================================
-- SAVED JOBS
-- ============================================================

CREATE TABLE IF NOT EXISTS saved_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(candidate_id, job_id)
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_saved_jobs_candidate_id') THEN
        CREATE INDEX idx_saved_jobs_candidate_id ON saved_jobs(candidate_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_saved_jobs_job_id') THEN
        CREATE INDEX idx_saved_jobs_job_id ON saved_jobs(job_id);
    END IF;
END $$;

-- ============================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers only if they don't exist
DO $$
BEGIN
    -- Users table
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
        CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- Companies table
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_companies_updated_at') THEN
        CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- Recruiter profiles
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_recruiter_profiles_updated_at') THEN
        CREATE TRIGGER update_recruiter_profiles_updated_at BEFORE UPDATE ON recruiter_profiles
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- Candidate profiles
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_candidate_profiles_updated_at') THEN
        CREATE TRIGGER update_candidate_profiles_updated_at BEFORE UPDATE ON candidate_profiles
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- Education
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_candidate_education_updated_at') THEN
        CREATE TRIGGER update_candidate_education_updated_at BEFORE UPDATE ON candidate_education
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- Experience
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_candidate_experience_updated_at') THEN
        CREATE TRIGGER update_candidate_experience_updated_at BEFORE UPDATE ON candidate_experience
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- Jobs
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_jobs_updated_at') THEN
        CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- Interview questions
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_interview_questions_updated_at') THEN
        CREATE TRIGGER update_interview_questions_updated_at BEFORE UPDATE ON interview_questions
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- Job applications
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_job_applications_updated_at') THEN
        CREATE TRIGGER update_job_applications_updated_at BEFORE UPDATE ON job_applications
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- Video responses
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_video_responses_updated_at') THEN
        CREATE TRIGGER update_video_responses_updated_at BEFORE UPDATE ON video_responses
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- General video interviews
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_general_video_interviews_updated_at') THEN
        CREATE TRIGGER update_general_video_interviews_updated_at BEFORE UPDATE ON general_video_interviews
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ============================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================

-- Drop and recreate views to ensure they match current schema
DROP VIEW IF EXISTS v_job_applications;
CREATE VIEW v_job_applications AS
SELECT 
    ja.id,
    ja.job_id,
    ja.candidate_id,
    ja.status,
    ja.cover_letter,
    ja.applied_at,
    ja.updated_at,
    j.title as job_title,
    j.location as job_location,
    j.job_type,
    c.name as company_name,
    u.full_name as candidate_name,
    u.email as candidate_email,
    u.phone as candidate_phone
FROM job_applications ja
JOIN jobs j ON ja.job_id = j.id
LEFT JOIN companies c ON j.company_id = c.id
JOIN users u ON ja.candidate_id = u.id;

DROP VIEW IF EXISTS v_candidate_profiles;
CREATE VIEW v_candidate_profiles AS
SELECT 
    u.id as user_id,
    u.full_name,
    u.email,
    u.phone,
    u.location,
    u.avatar_url,
    cp.bio,
    cp.resume_url,
    cp.linkedin_url,
    cp.portfolio_url,
    cp.experience_years,
    (SELECT COUNT(*) FROM candidate_education WHERE candidate_id = u.id) as education_count,
    (SELECT COUNT(*) FROM candidate_experience WHERE candidate_id = u.id) as experience_count,
    (SELECT string_agg(skill_name, ', ') FROM candidate_skills WHERE candidate_id = u.id) as skills
FROM users u
LEFT JOIN candidate_profiles cp ON u.id = cp.user_id
WHERE u.role = 'candidate';

DROP VIEW IF EXISTS v_recruiter_stats;
CREATE VIEW v_recruiter_stats AS
SELECT 
    u.id as recruiter_id,
    rp.company_name,
    (SELECT COUNT(*) FROM jobs WHERE created_by = u.id AND status = 'active') as active_jobs_count,
    (SELECT COUNT(*) FROM jobs WHERE created_by = u.id) as total_jobs_count,
    (SELECT COUNT(*) FROM job_applications ja 
     JOIN jobs j ON ja.job_id = j.id 
     WHERE j.created_by = u.id) as total_applications_count,
    (SELECT COUNT(DISTINCT ja.candidate_id) FROM job_applications ja 
     JOIN jobs j ON ja.job_id = j.id 
     WHERE j.created_by = u.id) as total_candidates_count
FROM users u
LEFT JOIN recruiter_profiles rp ON u.id = rp.user_id
WHERE u.role = 'recruiter';

-- ============================================================
-- END OF IDEMPOTENT SCHEMA
-- ============================================================
