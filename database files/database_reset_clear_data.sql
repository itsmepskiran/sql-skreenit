-- ============================================================
-- SKREENIT DATABASE RESET - CLEAR ALL DATA (Keep Tables)
-- This script truncates (empties) all tables while preserving structure
-- Run this first if you want to keep tables but delete all data
-- ============================================================

-- Disable foreign key checks temporarily to allow truncation
-- Note: In PostgreSQL we use DISABLE TRIGGER, but for TRUNCATE with CASCADE is safer

-- Start transaction
BEGIN;

-- Truncate all tables with CASCADE to handle foreign key dependencies
-- Order matters - child tables first, parents last, or use CASCADE

TRUNCATE TABLE 
    -- Video/data tables (most dependent)
    video_responses,
    general_video_interviews,
    
    -- Application-related
    job_applications,
    interview_questions,
    job_skills,
    saved_jobs,
    
    -- Candidate profile details
    candidate_education,
    candidate_experience,
    candidate_skills,
    candidate_profiles,
    
    -- Job-related
    jobs,
    companies,
    
    -- Recruiter profile
    recruiter_profiles,
    
    -- User-related
    notifications,
    audit_log,
    users
CASCADE;

-- Reset any sequences if needed (for auto-increment IDs if you had them)
-- Note: UUIDs don't need sequence reset, but if you have any SERIAL columns:
-- SELECT setval('table_name_id_seq', 1, false);

-- Commit transaction
COMMIT;

-- Verify truncation
SELECT 
    'users' as table_name, COUNT(*) as row_count FROM users
UNION ALL
SELECT 'companies', COUNT(*) FROM companies
UNION ALL
SELECT 'recruiter_profiles', COUNT(*) FROM recruiter_profiles
UNION ALL
SELECT 'candidate_profiles', COUNT(*) FROM candidate_profiles
UNION ALL
SELECT 'candidate_education', COUNT(*) FROM candidate_education
UNION ALL
SELECT 'candidate_experience', COUNT(*) FROM candidate_experience
UNION ALL
SELECT 'candidate_skills', COUNT(*) FROM candidate_skills
UNION ALL
SELECT 'jobs', COUNT(*) FROM jobs
UNION ALL
SELECT 'job_skills', COUNT(*) FROM job_skills
UNION ALL
SELECT 'interview_questions', COUNT(*) FROM interview_questions
UNION ALL
SELECT 'job_applications', COUNT(*) FROM job_applications
UNION ALL
SELECT 'video_responses', COUNT(*) FROM video_responses
UNION ALL
SELECT 'general_video_interviews', COUNT(*) FROM general_video_interviews
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL
SELECT 'audit_log', COUNT(*) FROM audit_log
UNION ALL
SELECT 'saved_jobs', COUNT(*) FROM saved_jobs;

-- ============================================================
-- END OF DATA RESET SCRIPT
-- ============================================================
