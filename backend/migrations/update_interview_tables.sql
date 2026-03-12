-- Migration script to update interview tables for structured interview system
-- Run this script to update your existing database structure

-- ============================================================
-- STEP 1: Update interview_questions table
-- ============================================================

-- Add candidate_id column to make questions candidate-specific
ALTER TABLE interview_questions 
ADD COLUMN candidate_id VARCHAR(36) NULL AFTER job_id;

-- Add foreign key constraint for candidate_id (references users table)
ALTER TABLE interview_questions 
ADD CONSTRAINT fk_interview_questions_candidate_id 
FOREIGN KEY (candidate_id) REFERENCES users(id) ON DELETE CASCADE;

-- Add index for candidate_id for better performance
CREATE INDEX idx_interview_questions_candidate_id ON interview_questions(candidate_id);

-- Rename 'question' column to 'question_text' for consistency
ALTER TABLE interview_questions 
CHANGE COLUMN question question_text TEXT NOT NULL;

-- ============================================================
-- STEP 2: Update video_responses table  
-- ============================================================

-- Add question_id column to link responses to specific questions
ALTER TABLE video_responses 
ADD COLUMN question_id VARCHAR(36) NULL AFTER candidate_id;

-- Add foreign key constraint for question_id
ALTER TABLE video_responses 
ADD CONSTRAINT fk_video_responses_question_id 
FOREIGN KEY (question_id) REFERENCES interview_questions(id) ON DELETE CASCADE;

-- Add index for question_id for better performance
CREATE INDEX idx_video_responses_question_id ON video_responses(question_id);

-- Add question_text column to store the question text for context
ALTER TABLE video_responses 
ADD COLUMN question_text TEXT NULL AFTER question;

-- Add question_index column to store the order of question in interview
ALTER TABLE video_responses 
ADD COLUMN question_index INT NULL AFTER question_text;

-- ============================================================
-- STEP 3: Clean up interview_responses table (if it exists and is redundant)
-- ============================================================

-- Check if interview_responses table exists and is redundant with video_responses
-- If interview_responses is no longer needed, you can optionally drop it:
-- DROP TABLE IF EXISTS interview_responses;

-- Or if you want to keep it for backward compatibility, add the same columns:
-- ALTER TABLE interview_responses 
-- ADD COLUMN question_id VARCHAR(36) NULL AFTER candidate_id;

-- ALTER TABLE interview_responses 
-- ADD COLUMN question_text TEXT NULL AFTER question;

-- ALTER TABLE interview_responses 
-- ADD COLUMN question_index INT NULL AFTER question_text;

-- ============================================================
-- STEP 4: Update existing data (optional - for migration of current data)
-- ============================================================

-- If you have existing data and want to migrate it to the new structure,
-- you would need to write data migration scripts based on your current data

-- Example: Update existing video responses to include question index
-- UPDATE video_responses SET question_index = 1 WHERE question_index IS NULL;

-- ============================================================
-- STEP 5: Verify the changes
-- ============================================================

-- Check the updated table structures
DESCRIBE interview_questions;
DESCRIBE video_responses;

-- Check the new indexes
SHOW INDEX FROM interview_questions;
SHOW INDEX FROM video_responses;
