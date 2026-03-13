-- SQL script to clear all data except users
-- WARNING: This will permanently delete all application data!

-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;

-- Clear tables in order of dependency (child tables first)
DELETE FROM video_responses;
DELETE FROM notifications;
DELETE FROM job_applications;
DELETE FROM candidate_profiles;
DELETE FROM candidate_videos;
DELETE FROM jobs;
DELETE FROM companies;
DELETE FROM recruiter_profiles;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Reset auto-increment counters
ALTER TABLE video_responses AUTO_INCREMENT = 1;
ALTER TABLE notifications AUTO_INCREMENT = 1;
ALTER TABLE job_applications AUTO_INCREMENT = 1;
ALTER TABLE candidate_profiles AUTO_INCREMENT = 1;
ALTER TABLE candidate_videos AUTO_INCREMENT = 1;
ALTER TABLE jobs AUTO_INCREMENT = 1;
ALTER TABLE companies AUTO_INCREMENT = 1;
ALTER TABLE recruiter_profiles AUTO_INCREMENT = 1;

-- Verify users table still has data
SELECT COUNT(*) as users_count FROM users;

-- Show remaining data in each table (should be 0 except users)
SELECT 'video_responses' as table_name, COUNT(*) as record_count FROM video_responses
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL
SELECT 'job_applications', COUNT(*) FROM job_applications
UNION ALL
SELECT 'candidate_profiles', COUNT(*) FROM candidate_profiles
UNION ALL
SELECT 'candidate_videos', COUNT(*) FROM candidate_videos
UNION ALL
SELECT 'jobs', COUNT(*) FROM jobs
UNION ALL
SELECT 'companies', COUNT(*) FROM companies
UNION ALL
SELECT 'recruiter_profiles', COUNT(*) FROM recruiter_profiles
UNION ALL
SELECT 'users', COUNT(*) FROM users;
