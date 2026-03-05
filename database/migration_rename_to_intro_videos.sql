-- Migration: Rename general_video_interviews to intro_videos and simplify structure
-- Date: 2026-03-04

-- 1. Drop the old table if it exists
DROP TABLE IF EXISTS general_video_interviews;

-- 2. Create the new simplified intro_videos table
CREATE TABLE IF NOT EXISTS intro_videos (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    candidate_id VARCHAR(36) NOT NULL UNIQUE,
    video_url VARCHAR(500) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_intro_videos_candidate_id (candidate_id),
    FOREIGN KEY (candidate_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
