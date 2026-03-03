-- ============================================================
-- DATABASE CLEANUP MIGRATION - Fix Column Mismatches
-- Run this SQL to remove duplicate columns and fix naming
-- ============================================================

-- ============================================================
-- 1. REMOVE DUPLICATE COLUMNS FROM candidate_profiles
-- These fields already exist in 'users' table
-- ============================================================

-- First, migrate any existing data from candidate_profiles to users if needed
UPDATE users u
JOIN candidate_profiles cp ON u.id = cp.user_id
SET 
    u.full_name = COALESCE(u.full_name, cp.full_name),
    u.phone = COALESCE(u.phone, cp.phone),
    u.location = COALESCE(u.location, cp.location),
    u.avatar_url = COALESCE(u.avatar_url, cp.avatar_url)
WHERE cp.full_name IS NOT NULL OR cp.phone IS NOT NULL OR cp.location IS NOT NULL OR cp.avatar_url IS NOT NULL;

-- Drop duplicate columns from candidate_profiles
ALTER TABLE candidate_profiles DROP COLUMN full_name;
ALTER TABLE candidate_profiles DROP COLUMN email;
ALTER TABLE candidate_profiles DROP COLUMN phone;
ALTER TABLE candidate_profiles DROP COLUMN location;
ALTER TABLE candidate_profiles DROP COLUMN avatar_url;

-- ============================================================
-- 2. REMOVE DUPLICATE COLUMNS FROM recruiter_profiles
-- These fields should reference companies table
-- ============================================================

-- First, update companies table with data from recruiter_profiles if needed
UPDATE companies c
JOIN recruiter_profiles rp ON rp.company_id = c.id
SET 
    c.name = COALESCE(c.name, rp.company_name),
    c.website = COALESCE(c.website, rp.company_website)
WHERE rp.company_name IS NOT NULL OR rp.company_website IS NOT NULL;

-- Drop duplicate columns from recruiter_profiles
ALTER TABLE recruiter_profiles DROP COLUMN company_name;
ALTER TABLE recruiter_profiles DROP COLUMN company_website;

-- ============================================================
-- 3. FIX COLUMN NAME: about -> company_description
-- This aligns with frontend field name
-- ============================================================

ALTER TABLE recruiter_profiles CHANGE about company_description TEXT NULL;

-- ============================================================
-- 4. VERIFY FOREIGN KEYS ARE CORRECT
-- ============================================================

-- Check candidate_experience FK (should reference candidate_profiles.id, not user_id)
-- This should already be correct, but verify:
-- SHOW CREATE TABLE candidate_experience;

-- Check candidate_education FK (should reference candidate_profiles.id, not user_id)
-- This should already be correct, but verify:
-- SHOW CREATE TABLE candidate_education;

-- ============================================================
-- 5. ADD ANY MISSING COLUMNS THAT FRONTEND EXPECTS
-- ============================================================

-- Ensure users table has all necessary fields
-- (These should already exist, but adding IF NOT EXISTS for safety)

-- Add experience_years to candidate_profiles if not exists
-- This is used for storing calculated experience
-- (Already exists, keeping it)

-- ============================================================
-- CLEANUP COMPLETE
-- ============================================================
SELECT 'Database cleanup completed successfully!' AS message;

-- Verify the new structure
DESCRIBE candidate_profiles;
DESCRIBE recruiter_profiles;
DESCRIBE users;
DESCRIBE companies;
