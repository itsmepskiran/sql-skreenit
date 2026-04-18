-- Migration: Add analysis_reports table for persistent storage of bulk analysis tasks
-- This table stores task-level data (which applications were analyzed, progress, etc.)
-- Individual video analyses are still stored in video_analysis table

CREATE TABLE IF NOT EXISTS `analysis_reports` (
  `id` varchar(36) NOT NULL DEFAULT uuid(),
  `task_id` varchar(36) NOT NULL,
  `recruiter_id` varchar(36) NOT NULL,
  `job_id` varchar(36) DEFAULT NULL,
  `application_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`application_ids`)),
  `status` enum('pending','running','completed','failed') DEFAULT 'pending',
  `progress` int(11) DEFAULT 0,
  `results` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`results`)),
  `error` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `completed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_task_id` (`task_id`),
  KEY `idx_recruiter_id` (`recruiter_id`),
  KEY `idx_job_id` (`job_id`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
