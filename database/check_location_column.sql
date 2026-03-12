-- Check if location column exists in recruiter_profiles table
DESCRIBE recruiter_profiles;

-- Check what columns actually exist
SHOW COLUMNS FROM recruiter_profiles;

-- Check current recruiter profile data
SELECT * FROM recruiter_profiles WHERE user_id = '22bd4aca-9c4d-434c-baeb-d55b2b723c7a';
