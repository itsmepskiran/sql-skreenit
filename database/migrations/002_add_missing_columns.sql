-- Migration: Add missing columns to jobs and candidate_profiles tables
-- This migration adds columns that exist in u432595843_sql_skreenit.sql but may be missing from your database
-- Run each section only if the column doesn't exist (check your database first)

-- ============================================================
-- JOBS TABLE - Add missing columns if they don't exist
-- ============================================================

-- Check and add each column individually to avoid errors if some exist
ALTER TABLE `jobs` ADD COLUMN IF NOT EXISTS `department` VARCHAR(100) DEFAULT NULL;
ALTER TABLE `jobs` ADD COLUMN IF NOT EXISTS `role` VARCHAR(100) DEFAULT NULL;
ALTER TABLE `jobs` ADD COLUMN IF NOT EXISTS `employment_type` VARCHAR(50) DEFAULT NULL;
ALTER TABLE `jobs` ADD COLUMN IF NOT EXISTS `location_city` VARCHAR(100) DEFAULT NULL;
ALTER TABLE `jobs` ADD COLUMN IF NOT EXISTS `location_state` VARCHAR(100) DEFAULT NULL;
ALTER TABLE `jobs` ADD COLUMN IF NOT EXISTS `location_country` VARCHAR(100) DEFAULT NULL;
ALTER TABLE `jobs` ADD COLUMN IF NOT EXISTS `experience_min` INT DEFAULT NULL;
ALTER TABLE `jobs` ADD COLUMN IF NOT EXISTS `experience_max` INT DEFAULT NULL;
ALTER TABLE `jobs` ADD COLUMN IF NOT EXISTS `industry` VARCHAR(100) DEFAULT NULL;
ALTER TABLE `jobs` ADD COLUMN IF NOT EXISTS `diversity_hiring` VARCHAR(100) DEFAULT NULL;
ALTER TABLE `jobs` ADD COLUMN IF NOT EXISTS `responsibilities` TEXT DEFAULT NULL;
ALTER TABLE `jobs` ADD COLUMN IF NOT EXISTS `no_of_openings` INT DEFAULT 1;
ALTER TABLE `jobs` ADD COLUMN IF NOT EXISTS `notice_period_days` INT DEFAULT NULL;
ALTER TABLE `jobs` ADD COLUMN IF NOT EXISTS `contact_person_name` VARCHAR(255) DEFAULT NULL;
ALTER TABLE `jobs` ADD COLUMN IF NOT EXISTS `contact_person_email` VARCHAR(255) DEFAULT NULL;

-- Update job_type from enum to VARCHAR to support more types
ALTER TABLE `jobs` MODIFY COLUMN `job_type` VARCHAR(50) NOT NULL DEFAULT 'full-time';

-- Update status enum to include 'draft'
ALTER TABLE `jobs` MODIFY COLUMN `status` ENUM('active', 'closed', 'draft', 'inactive') DEFAULT 'active';

-- ============================================================
-- CANDIDATE_PROFILES TABLE - Add missing columns if they don't exist
-- ============================================================

ALTER TABLE `candidate_profiles` ADD COLUMN IF NOT EXISTS `date_of_birth` DATE DEFAULT NULL;
ALTER TABLE `candidate_profiles` ADD COLUMN IF NOT EXISTS `gender` VARCHAR(20) DEFAULT NULL;
ALTER TABLE `candidate_profiles` ADD COLUMN IF NOT EXISTS `marital_status` VARCHAR(20) DEFAULT NULL;
ALTER TABLE `candidate_profiles` ADD COLUMN IF NOT EXISTS `current_address` TEXT DEFAULT NULL;
ALTER TABLE `candidate_profiles` ADD COLUMN IF NOT EXISTS `current_city` VARCHAR(100) DEFAULT NULL;
ALTER TABLE `candidate_profiles` ADD COLUMN IF NOT EXISTS `current_state` VARCHAR(100) DEFAULT NULL;
ALTER TABLE `candidate_profiles` ADD COLUMN IF NOT EXISTS `current_country` VARCHAR(100) DEFAULT NULL;
ALTER TABLE `candidate_profiles` ADD COLUMN IF NOT EXISTS `permanent_address` TEXT DEFAULT NULL;
ALTER TABLE `candidate_profiles` ADD COLUMN IF NOT EXISTS `permanent_city` VARCHAR(100) DEFAULT NULL;
ALTER TABLE `candidate_profiles` ADD COLUMN IF NOT EXISTS `permanent_state` VARCHAR(100) DEFAULT NULL;
ALTER TABLE `candidate_profiles` ADD COLUMN IF NOT EXISTS `permanent_country` VARCHAR(100) DEFAULT NULL;
ALTER TABLE `candidate_profiles` ADD COLUMN IF NOT EXISTS `current_salary` INT DEFAULT NULL;
ALTER TABLE `candidate_profiles` ADD COLUMN IF NOT EXISTS `expected_salary` INT DEFAULT NULL;
ALTER TABLE `candidate_profiles` ADD COLUMN IF NOT EXISTS `notice_period_days` INT DEFAULT NULL;
ALTER TABLE `candidate_profiles` ADD COLUMN IF NOT EXISTS `highest_qualification` VARCHAR(100) DEFAULT NULL;
ALTER TABLE `candidate_profiles` ADD COLUMN IF NOT EXISTS `personal_projects` TEXT DEFAULT NULL;
ALTER TABLE `candidate_profiles` ADD COLUMN IF NOT EXISTS `personal_blogs` TEXT DEFAULT NULL;
ALTER TABLE `candidate_profiles` ADD COLUMN IF NOT EXISTS `schooling` VARCHAR(255) DEFAULT NULL;
ALTER TABLE `candidate_profiles` ADD COLUMN IF NOT EXISTS `schooling_year` INT DEFAULT NULL;
ALTER TABLE `candidate_profiles` ADD COLUMN IF NOT EXISTS `schooling_percentage` INT DEFAULT NULL;
ALTER TABLE `candidate_profiles` ADD COLUMN IF NOT EXISTS `pre_university` VARCHAR(255) DEFAULT NULL;
ALTER TABLE `candidate_profiles` ADD COLUMN IF NOT EXISTS `pre_university_year` INT DEFAULT NULL;
ALTER TABLE `candidate_profiles` ADD COLUMN IF NOT EXISTS `pre_university_percentage` INT DEFAULT NULL;
ALTER TABLE `candidate_profiles` ADD COLUMN IF NOT EXISTS `graduation` VARCHAR(255) DEFAULT NULL;
ALTER TABLE `candidate_profiles` ADD COLUMN IF NOT EXISTS `graduation_year` INT DEFAULT NULL;
ALTER TABLE `candidate_profiles` ADD COLUMN IF NOT EXISTS `graduation_percentage` INT DEFAULT NULL;
ALTER TABLE `candidate_profiles` ADD COLUMN IF NOT EXISTS `post_graduation` VARCHAR(255) DEFAULT NULL;
ALTER TABLE `candidate_profiles` ADD COLUMN IF NOT EXISTS `post_graduation_year` INT DEFAULT NULL;
ALTER TABLE `candidate_profiles` ADD COLUMN IF NOT EXISTS `post_graduation_percentage` INT DEFAULT NULL;
ALTER TABLE `candidate_profiles` ADD COLUMN IF NOT EXISTS `spoken_languages` JSON DEFAULT NULL;
ALTER TABLE `candidate_profiles` ADD COLUMN IF NOT EXISTS `certifications` JSON DEFAULT NULL;
ALTER TABLE `candidate_profiles` ADD COLUMN IF NOT EXISTS `current_company` VARCHAR(255) DEFAULT NULL;
ALTER TABLE `candidate_profiles` ADD COLUMN IF NOT EXISTS `current_designation` VARCHAR(255) DEFAULT NULL;
ALTER TABLE `candidate_profiles` ADD COLUMN IF NOT EXISTS `current_doj` DATE DEFAULT NULL;
ALTER TABLE `candidate_profiles` ADD COLUMN IF NOT EXISTS `current_dol` DATE DEFAULT NULL;
