-- ============================================================
-- SKREENIT DATABASE DESTROY - DROP ALL TABLES
-- WARNING: This will DELETE ALL TABLES and ALL DATA permanently!
-- Use this only if you want a completely fresh start
-- ============================================================

-- Start transaction
BEGIN;

-- Drop views first (depend on tables)
DROP VIEW IF EXISTS v_job_applications;
DROP VIEW IF EXISTS v_candidate_profiles;
DROP VIEW IF EXISTS v_recruiter_stats;

-- Drop tables with CASCADE to handle dependencies
-- Order: dependent/child tables first, then parents

-- Video tables
DROP TABLE IF EXISTS video_responses CASCADE;
DROP TABLE IF EXISTS general_video_interviews CASCADE;

-- Application and related tables
DROP TABLE IF EXISTS job_applications CASCADE;
DROP TABLE IF EXISTS interview_questions CASCADE;
DROP TABLE IF EXISTS job_skills CASCADE;
DROP TABLE IF EXISTS saved_jobs CASCADE;

-- Candidate detail tables
DROP TABLE IF EXISTS candidate_education CASCADE;
DROP TABLE IF EXISTS candidate_experience CASCADE;
DROP TABLE IF EXISTS candidate_skills CASCADE;
DROP TABLE IF EXISTS candidate_profiles CASCADE;

-- Job and company tables
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS companies CASCADE;

-- Recruiter profile
DROP TABLE IF EXISTS recruiter_profiles CASCADE;

-- User-related tables
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS audit_log CASCADE;

-- Main users table (drop last due to foreign keys)
DROP TABLE IF EXISTS users CASCADE;

-- Drop the updated_at trigger function if no longer needed
-- (Keep it if you might recreate tables, or drop it:)
-- DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Commit transaction
COMMIT;

-- Verify all tables are dropped
SELECT 
    table_name 
FROM 
    information_schema.tables 
WHERE 
    table_schema = 'public' 
    AND table_type = 'BASE TABLE'
ORDER BY 
    table_name;

-- If the above query returns no rows, all tables have been dropped successfully!

-- ============================================================
-- END OF DESTROY SCRIPT - Ready to run new schema SQL
-- ============================================================
