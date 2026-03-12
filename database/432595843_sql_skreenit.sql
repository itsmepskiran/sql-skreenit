-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Mar 12, 2026 at 07:36 AM
-- Server version: 11.8.3-MariaDB-log
-- PHP Version: 7.2.34

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `u432595843_sql_skreenit`
--

-- --------------------------------------------------------

--
-- Table structure for table `candidate_profiles`
--

CREATE TABLE `candidate_profiles` (
  `id` varchar(36) NOT NULL DEFAULT uuid(),
  `user_id` varchar(36) NOT NULL,
  `summary` text DEFAULT NULL,
  `resume_url` varchar(500) DEFAULT NULL,
  `intro_video_url` varchar(500) DEFAULT NULL,
  `linkedin_url` varchar(500) DEFAULT NULL,
  `portfolio_url` varchar(500) DEFAULT NULL,
  `skills` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`skills`)),
  `experience_years` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `education` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Education array' CHECK (json_valid(`education`)),
  `experience` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Experience array' CHECK (json_valid(`experience`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `candidate_profiles`
--

INSERT INTO `candidate_profiles` (`id`, `user_id`, `summary`, `resume_url`, `intro_video_url`, `linkedin_url`, `portfolio_url`, `skills`, `experience_years`, `created_at`, `updated_at`, `education`, `experience`) VALUES
('a23e4e28-a414-487b-9f64-952139725910', '431212f0-1e4d-4391-871e-5d487b7f4382', 'Customer Service Associate with 4years of experience', 'https://storage.skreenit.com/datastorage/resumes/20260311_155119_780ec1a0.docx', 'https://storage.skreenit.com/datastorage/videos/20260311_155631_8fc5e328.webm', '', '', '[\"MS Office\"]', NULL, '2026-03-11 10:21:21', '2026-03-11 10:26:33', '[{\"degree\": \"BA\", \"institution\": \"OU\", \"completion_year\": \"2021\"}]', '[{\"job_title\": \"Customer Service Associate\", \"company\": \"Digitide Inc\", \"start_date\": \"2025-07-07\", \"end_date\": \"\", \"description\": \"\"}, {\"job_title\": \"Telecaller\", \"company\": \"BMG Enterprises\", \"start_date\": \"2022-05-10\", \"end_date\": \"2025-06-15\", \"description\": \"Outbound sales of CC and Insurance\"}]');

-- --------------------------------------------------------

--
-- Table structure for table `candidate_videos`
--

CREATE TABLE `candidate_videos` (
  `id` varchar(36) NOT NULL DEFAULT uuid(),
  `candidate_id` varchar(36) NOT NULL,
  `video_type` enum('intro','portfolio','other') DEFAULT 'intro',
  `video_url` varchar(500) NOT NULL,
  `video_path` varchar(500) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `candidate_videos`
--

INSERT INTO `candidate_videos` (`id`, `candidate_id`, `video_type`, `video_url`, `video_path`, `created_at`) VALUES
('85a043ad-a6d4-420c-9284-68aa82184356', '431212f0-1e4d-4391-871e-5d487b7f4382', 'intro', 'https://storage.skreenit.com/datastorage/videos/20260311_155631_8fc5e328.webm', '20260311_155631_8fc5e328.webm', '2026-03-11 10:26:33');

-- --------------------------------------------------------

--
-- Table structure for table `companies`
--

CREATE TABLE `companies` (
  `id` varchar(36) NOT NULL DEFAULT uuid(),
  `name` varchar(255) NOT NULL,
  `website` varchar(500) DEFAULT NULL,
  `avatar_url` varchar(500) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `recruiter_id` varchar(36) DEFAULT NULL COMMENT 'Recruiter user_id from recruiter_profiles table',
  `company_display_id` varchar(8) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `companies`
--

INSERT INTO `companies` (`id`, `name`, `website`, `avatar_url`, `created_at`, `updated_at`, `recruiter_id`, `company_display_id`, `description`, `location`) VALUES
('04a97154-d49d-4cea-ba2b-6d944c712736', 'Skreenit', 'https://www.skreenit.com', NULL, '2026-03-12 04:31:12', '2026-03-12 04:57:03', '22bd4aca-9c4d-434c-baeb-d55b2b723c7a', 'SKRB978A', 'AI Driven Hiring Platform', 'Secunderabad');

-- --------------------------------------------------------

--
-- Table structure for table `interview_questions`
--

CREATE TABLE `interview_questions` (
  `id` varchar(36) NOT NULL DEFAULT uuid(),
  `job_id` varchar(36) NOT NULL,
  `question_id` varchar(36) DEFAULT NULL,
  `question_order` int(11) DEFAULT 0,
  `time_limit` int(11) DEFAULT 120,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `jobs`
--

CREATE TABLE `jobs` (
  `id` varchar(36) NOT NULL DEFAULT uuid(),
  `job_title` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `requirements` text DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `job_type` enum('full-time','part-time','contract','internship') DEFAULT 'full-time',
  `salary_min` decimal(10,2) DEFAULT NULL,
  `salary_max` decimal(10,2) DEFAULT NULL,
  `currency` varchar(3) DEFAULT 'USD',
  `is_remote` tinyint(1) DEFAULT 0,
  `status` enum('active','inactive','closed') DEFAULT 'active',
  `company_id` varchar(36) NOT NULL,
  `created_by` varchar(36) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `expires_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `job_applications`
--

CREATE TABLE `job_applications` (
  `id` varchar(36) NOT NULL DEFAULT uuid(),
  `job_id` varchar(36) NOT NULL,
  `candidate_id` varchar(36) NOT NULL,
  `cover_letter` text DEFAULT NULL,
  `intro_video_url` varchar(500) DEFAULT NULL,
  `resume_url` varchar(500) DEFAULT NULL,
  `custom_answers` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`custom_answers`)),
  `status` enum('submitted','reviewed','shortlisted','interview_scheduled','interviewing','hired','rejected') DEFAULT 'submitted',
  `ai_score` int(11) DEFAULT NULL,
  `applied_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `recruiter_profiles`
--

CREATE TABLE `recruiter_profiles` (
  `id` varchar(36) NOT NULL DEFAULT uuid(),
  `user_id` varchar(36) NOT NULL,
  `company_id` varchar(36) DEFAULT NULL,
  `contact_name` varchar(255) DEFAULT NULL,
  `contact_email` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `location` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `recruiter_profiles`
--

INSERT INTO `recruiter_profiles` (`id`, `user_id`, `company_id`, `contact_name`, `contact_email`, `created_at`, `updated_at`, `location`) VALUES
('bf267003-cd8c-4201-8686-0eec025b7b11', '22bd4aca-9c4d-434c-baeb-d55b2b723c7a', '04a97154-d49d-4cea-ba2b-6d944c712736', 'Sheetal Paidimarri', 'testing2@bmgone.com', '2026-03-11 10:37:37', '2026-03-12 04:57:03', 'Secunderabad');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` varchar(36) NOT NULL DEFAULT uuid(),
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL DEFAULT '',
  `full_name` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `role` enum('recruiter','candidate') DEFAULT 'candidate',
  `location` varchar(255) DEFAULT NULL,
  `avatar_url` varchar(500) DEFAULT NULL,
  `email_confirmed_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `last_sign_in_at` datetime DEFAULT NULL,
  `user_metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`user_metadata`)),
  `onboarded` tinyint(1) DEFAULT 0,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `email`, `password_hash`, `full_name`, `phone`, `role`, `location`, `avatar_url`, `email_confirmed_at`, `created_at`, `updated_at`, `last_sign_in_at`, `user_metadata`, `onboarded`, `metadata`) VALUES
('22bd4aca-9c4d-434c-baeb-d55b2b723c7a', 'testing2@bmgone.com', '$2b$12$1TLPkUwDJKyYS/euohBKQOevJ9e3s.pSKqBxeU8WAjY86GWf519i2', 'Sheetal Paidimarri', '9885608730', 'recruiter', 'Hyderabad', NULL, '2026-03-09 07:00:16', '2026-03-09 06:58:44', '2026-03-12 04:57:04', '2026-03-12 04:48:38', '{}', 1, NULL),
('431212f0-1e4d-4391-871e-5d487b7f4382', 'testing1@bmgone.com', '$2b$12$BBCkUJfJ5uB2pDB5s8IVa.hynoGe1xAkOQ5zhUfrAxwI8bLYqGMjW', 'Prashanthi Sistla', '9966630349', 'candidate', 'Hyderabad', 'https://storage.skreenit.com/datastorage/profilepics/20260311_155120_241b085b.jpg', '2026-03-07 11:02:11', '2026-03-07 11:00:42', '2026-03-11 10:33:51', '2026-03-11 10:33:51', '{}', 1, NULL),
('f4bfa309-deaf-4349-aa79-509024adb2c4', 'testing3@bmgone.com', '$2b$12$t24g44MnjVZYLhqPVOsdlOMXtQVwQT.E46WzZCLsvoxzcuMSTuwPy', 'Naga Sai Prashasthi', '8125098875', 'candidate', 'Hyderabad', NULL, '2026-03-08 13:18:32', '2026-03-08 13:12:13', '2026-03-11 10:04:59', '2026-03-10 07:17:53', '{}', 0, NULL),
('fd209e79-ec73-4f4d-b7ab-0c42f403a6a0', 'testing4@bmgone.com', '$2b$12$bWcX4qAlgcIBBn8MDVJ7TOPk120cyBuEuBlGEBtMIGQSkxFv8Cpzy', 'Raghava', '8499008241', 'recruiter', 'Hyderabad', NULL, '2026-03-09 06:34:55', '2026-03-09 06:33:58', '2026-03-11 10:05:03', '2026-03-10 16:08:52', '{}', 0, NULL);

--
-- Triggers `users`
--
DELIMITER $$
CREATE TRIGGER `users_updated_at` BEFORE UPDATE ON `users` FOR EACH ROW BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `video_responses`
--

CREATE TABLE `video_responses` (
  `id` varchar(36) NOT NULL DEFAULT uuid(),
  `job_id` varchar(36) NOT NULL,
  `application_id` varchar(36) NOT NULL,
  `candidate_id` varchar(36) NOT NULL,
  `question_id` varchar(36) DEFAULT NULL,
  `question` text NOT NULL,
  `video_url` varchar(500) NOT NULL,
  `video_path` varchar(500) NOT NULL,
  `question_index` int(11) DEFAULT 0,
  `duration` int(11) DEFAULT NULL,
  `transcript` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `candidate_profiles`
--
ALTER TABLE `candidate_profiles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`),
  ADD KEY `idx_candidate_profiles_user_id` (`user_id`);

--
-- Indexes for table `candidate_videos`
--
ALTER TABLE `candidate_videos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_candidate_videos_candidate_id` (`candidate_id`);

--
-- Indexes for table `companies`
--
ALTER TABLE `companies`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_companies_name` (`name`),
  ADD KEY `companies_ibfk_recruiter_id` (`recruiter_id`),
  ADD KEY `idx_companies_display_id` (`company_display_id`);

--
-- Indexes for table `interview_questions`
--
ALTER TABLE `interview_questions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_interview_questions_job_id` (`job_id`);

--
-- Indexes for table `jobs`
--
ALTER TABLE `jobs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_jobs_company_id` (`company_id`),
  ADD KEY `idx_jobs_created_by` (`created_by`),
  ADD KEY `idx_jobs_status` (`status`);

--
-- Indexes for table `job_applications`
--
ALTER TABLE `job_applications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_job_applications_job_id` (`job_id`),
  ADD KEY `idx_job_applications_candidate_id` (`candidate_id`),
  ADD KEY `idx_job_applications_status` (`status`);

--
-- Indexes for table `recruiter_profiles`
--
ALTER TABLE `recruiter_profiles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`),
  ADD KEY `idx_recruiter_profiles_user_id` (`user_id`),
  ADD KEY `idx_recruiter_profiles_company_id` (`company_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_users_email` (`email`),
  ADD KEY `idx_users_role` (`role`);

--
-- Indexes for table `video_responses`
--
ALTER TABLE `video_responses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_video_responses_application_id` (`application_id`),
  ADD KEY `idx_video_responses_candidate_id` (`candidate_id`),
  ADD KEY `idx_video_responses_question_id` (`question_id`);

--
-- Constraints for dumped tables
--

--
-- Constraints for table `candidate_profiles`
--
ALTER TABLE `candidate_profiles`
  ADD CONSTRAINT `candidate_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `candidate_videos`
--
ALTER TABLE `candidate_videos`
  ADD CONSTRAINT `candidate_videos_ibfk_1` FOREIGN KEY (`candidate_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `companies`
--
ALTER TABLE `companies`
  ADD CONSTRAINT `companies_ibfk_recruiter_id` FOREIGN KEY (`recruiter_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `interview_questions`
--
ALTER TABLE `interview_questions`
  ADD CONSTRAINT `interview_questions_ibfk_1` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `jobs`
--
ALTER TABLE `jobs`
  ADD CONSTRAINT `jobs_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `jobs_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `job_applications`
--
ALTER TABLE `job_applications`
  ADD CONSTRAINT `job_applications_ibfk_1` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `job_applications_ibfk_2` FOREIGN KEY (`candidate_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `recruiter_profiles`
--
ALTER TABLE `recruiter_profiles`
  ADD CONSTRAINT `recruiter_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `recruiter_profiles_ibfk_2` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `video_responses`
--
ALTER TABLE `video_responses`
  ADD CONSTRAINT `video_responses_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `job_applications` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `video_responses_ibfk_2` FOREIGN KEY (`candidate_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `video_responses_ibfk_3` FOREIGN KEY (`question_id`) REFERENCES `interview_questions` (`id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
