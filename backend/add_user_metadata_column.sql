-- Migration script to add missing columns to users table
-- Run this script on your MySQL database to fix the registration error

-- Add password_hash column (if not exists)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) NOT NULL DEFAULT '' 
AFTER email;

-- Add user_metadata column (if not exists)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS user_metadata JSON NULL 
AFTER last_sign_in_at;

-- Add onboarded column (if not exists)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS onboarded BOOLEAN DEFAULT FALSE 
AFTER user_metadata;

-- Verify columns were added
DESCRIBE users;
