-- ============================================================
-- MIGRATION: Alter existing interview tables for structured system
-- ============================================================
-- Run this script to add new columns to your existing tables

-- ============================================================
-- STEP 1: Alter interview_questions table
-- ============================================================

-- Add candidate_id column (NULL for now, will be populated for candidate-specific questions)
ALTER TABLE interview_questions 
ADD COLUMN candidate_id VARCHAR(36) NULL AFTER job_id;

-- Add index for candidate_id for better performance
CREATE INDEX idx_interview_questions_candidate_id ON interview_questions(candidate_id);

-- Rename existing 'question' column to 'question_text' for consistency
ALTER TABLE interview_questions 
CHANGE COLUMN question question_text TEXT NOT NULL;

-- ============================================================
-- STEP 2: Alter video_responses table
-- ============================================================

-- Add question_id column to link responses to specific questions (VARCHAR(36) for foreign key)
ALTER TABLE video_responses 
ADD COLUMN question_id VARCHAR(36) NULL AFTER candidate_id;

-- Add index for question_id for better performance
CREATE INDEX idx_video_responses_question_id ON video_responses(question_id);

-- Add question_text column for context
ALTER TABLE video_responses 
ADD COLUMN question_text TEXT NULL AFTER question;

-- Add question_index column for question order
ALTER TABLE video_responses 
ADD COLUMN question_index INT NULL AFTER question_text;

-- ============================================================
-- STEP 3: Drop unwanted columns from video_responses table
-- ============================================================

-- Drop the specified columns from video_responses
ALTER TABLE video_responses 
DROP COLUMN transcript;

ALTER TABLE video_responses 
DROP COLUMN duration;

ALTER TABLE video_responses 
DROP COLUMN status;

ALTER TABLE video_responses 
DROP COLUMN ai_analysis;

-- ============================================================
-- STEP 4: Data Migration (if you have existing data)
-- ============================================================

-- No data migration needed for interview_questions since we renamed the column
-- If you have existing video responses, populate question_index based on question order
-- This is a basic example - you may need to adjust based on your data
UPDATE video_responses 
SET question_index = 1 
WHERE question_index IS NULL;

-- ============================================================
-- STEP 5: Optional - Clean up old columns (run after data migration)
-- ============================================================

-- Uncomment these lines AFTER you've verified everything works correctly
-- ALTER TABLE video_responses DROP COLUMN question;

-- ============================================================
-- STEP 6: Add foreign key constraints (optional but recommended)
-- ============================================================

-- Add foreign key for candidate_id (references users table)
-- Note: Make sure your users table has an id column of type VARCHAR(36)
-- ALTER TABLE interview_questions 
-- ADD CONSTRAINT fk_interview_questions_candidate_id 
-- FOREIGN KEY (candidate_id) REFERENCES users(id) ON DELETE CASCADE;

-- Add foreign key for question_id 
-- ALTER TABLE video_responses 
-- ADD CONSTRAINT fk_video_responses_question_id 
-- FOREIGN KEY (question_id) REFERENCES interview_questions(id) ON DELETE CASCADE;

-- ============================================================
-- STEP 7: Verification
-- ============================================================

-- Check the updated table structures
DESCRIBE interview_questions;
DESCRIBE video_responses;

-- Check the new indexes
SHOW INDEX FROM interview_questions;
SHOW INDEX FROM video_responses;

-- Sample queries to verify data
SELECT id, job_id, candidate_id, question_text, question_order FROM interview_questions LIMIT 5;
SELECT id, application_id, candidate_id, question_id, question, question_text, question_index FROM video_responses LIMIT 5;
