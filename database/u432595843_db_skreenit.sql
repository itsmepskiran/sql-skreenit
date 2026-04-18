-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Mar 26, 2026 at 05:46 AM
-- Server version: 11.8.6-MariaDB-log
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
  `candidate_display_id` varchar(20) DEFAULT NULL,
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
  `experience` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Experience array' CHECK (json_valid(`experience`)),
  `analysis_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`analysis_data`)),
  `analyzed_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `candidate_profiles`
--

INSERT INTO `candidate_profiles` (`id`, `user_id`, `candidate_display_id`, `summary`, `resume_url`, `intro_video_url`, `linkedin_url`, `portfolio_url`, `skills`, `experience_years`, `created_at`, `updated_at`, `education`, `experience`, `analysis_data`, `analyzed_at`) VALUES
('4ba5486e-8b85-4a6b-ad15-133061aa4ef1', '1abd0a3e-17c1-4fbd-bbb0-7e320084f36a', 'HYD6225481', 'Fresher', 'https://storage.skreenit.com/datastorage/resumes/20260319_211620_c35804ea.docx', 'https://storage.skreenit.com/datastorage/videos/20260324_190043_5cd8cdcb.webm', '', '', '[]', NULL, '2026-03-19 15:46:22', '2026-03-24 13:30:45', '[{\"degree\": \"BSC\", \"institution\": \"Osmania University\", \"completion_year\": \"2024\"}]', '[{\"job_title\": \"Application Developer\", \"company\": \"Skreenit\", \"start_date\": \"2025-01-01\", \"end_date\": \"\", \"description\": \"Application Developer\"}]', NULL, NULL),
('8fd9f57c-c4b3-49c8-8093-1d05f3d2153b', '0539b25b-0e5c-4ffb-8a04-3810605c6f0e', 'BAN1447017', 'Operations Manager', 'https://storage.skreenit.com/datastorage/resumes/20260320_150729_363f6e15.docx', 'https://storage.skreenit.com/datastorage/videos/20260320_150731_ab4b95ae.webm', '', '', '[]', NULL, '2026-03-20 09:37:31', '2026-03-20 09:37:32', '[{\"degree\": \"BCOM\", \"institution\": \"Bangalore University\", \"completion_year\": \"2010\"}]', '[{\"job_title\": \"Operation Manager\", \"company\": \"Fedility\", \"start_date\": \"2025-01-03\", \"end_date\": \"\", \"description\": \"\"}]', NULL, NULL),
('d1b6b7bb-aa6d-499a-a98c-d3a92ac41a54', '900a8a68-04af-4521-9236-97d5b1735e1a', 'WAR2614820', 'HR Professional', 'https://storage.skreenit.com/datastorage/resumes/20260323_073911_959fa8d5.docx', 'https://storage.skreenit.com/datastorage/videos/20260323_073920_e6fadc66.webm', '', '', '[]', NULL, '2026-03-23 07:39:15', '2026-03-23 07:39:23', '[{\"degree\": \"BCOM\", \"institution\": \"Osmania University\", \"completion_year\": \"2020\"}]', '[{\"job_title\": \"HR Executive\", \"company\": \"Ebixcash\", \"start_date\": \"2022-01-01\", \"end_date\": \"2024-12-01\", \"description\": \"HR MIS\"}]', NULL, NULL),
('ee9ef994-5b3e-408b-afce-07d86f2cdcb1', 'e9d819a9-3590-48e8-9967-1eeb11c506b2', 'HYD1606374', 'Working HR Professional', 'https://storage.skreenit.com/datastorage/resumes/20260319_115846_0be67164.docx', 'https://storage.skreenit.com/datastorage/videos/20260319_115855_08388c08.webm', '', '', '[]', NULL, '2026-03-19 11:58:50', '2026-03-21 10:12:06', '[{\"degree\": \"BCOM\", \"institution\": \"Osmania University\", \"completion_year\": \"2020\"}]', '[{\"job_title\": \"HR Executive\", \"company\": \"Ebixcash\", \"start_date\": \"2023-02-02\", \"end_date\": \"2024-03-01\", \"description\": \"Frontline recruiter\"}]', NULL, NULL);

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
('1bff8137-7d62-4493-932c-2985d4d3642e', '0539b25b-0e5c-4ffb-8a04-3810605c6f0e', 'intro', 'https://storage.skreenit.com/datastorage/videos/20260320_150731_ab4b95ae.webm', '20260320_150731_ab4b95ae.webm', '2026-03-20 09:37:32'),
('267bc4ef-e73a-48a8-aa5c-e284a28676ec', '900a8a68-04af-4521-9236-97d5b1735e1a', 'intro', 'https://storage.skreenit.com/datastorage/videos/20260323_073920_e6fadc66.webm', '20260323_073920_e6fadc66.webm', '2026-03-23 07:39:23'),
('567aad70-f2a2-4bf9-a239-bcd96a8a78b0', 'e9d819a9-3590-48e8-9967-1eeb11c506b2', 'intro', 'https://storage.skreenit.com/datastorage/videos/20260319_115855_08388c08.webm', '20260319_115855_08388c08.webm', '2026-03-19 11:58:57'),
('59341081-d00a-4df8-846e-e9c6c4b268aa', '1abd0a3e-17c1-4fbd-bbb0-7e320084f36a', 'intro', 'https://storage.skreenit.com/datastorage/videos/20260324_190043_5cd8cdcb.webm', '20260319_211622_c2fabde5.webm', '2026-03-24 13:30:45');

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
('1fd93f46-9412-450a-9068-1cf68e51e9c2', 'Freelancer', NULL, NULL, '2026-03-19 12:03:28', '2026-03-19 12:03:28', 'd06315da-326f-44b1-9049-bc3a704d8c5f', 'FRE29766', 'Freelancer', NULL),
('3d00d233-6931-42a0-b595-26a83fe6aace', 'Freelance', 'https://www.pskservices.co.in', NULL, '2026-03-22 09:57:46', '2026-03-22 09:57:46', '5c6479bc-157e-4de3-af63-37347cd521d8', 'FREEB83B', 'Freelance', NULL),
('3dd70181-2905-4f41-b074-084c05386b4a', 'BMG Enterprises', NULL, NULL, '2026-03-19 12:24:27', '2026-03-19 12:24:27', 'fd46f8e0-cb83-43d2-a840-d5e26cc72ff9', 'BMG6A996', 'Startup', NULL);

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
-- Table structure for table `interview_responses`
--

CREATE TABLE `interview_responses` (
  `id` varchar(36) NOT NULL,
  `application_id` varchar(36) NOT NULL,
  `candidate_id` varchar(36) NOT NULL,
  `question` text DEFAULT NULL,
  `video_url` varchar(500) NOT NULL,
  `status` enum('pending_review','reviewed','approved','rejected') NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
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
  `expires_at` datetime DEFAULT NULL,
  `skills` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`skills`)),
  `education_qualification` varchar(50) DEFAULT NULL,
  `work_location_preference` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `jobs`
--

INSERT INTO `jobs` (`id`, `job_title`, `description`, `requirements`, `location`, `job_type`, `salary_min`, `salary_max`, `currency`, `is_remote`, `status`, `company_id`, `created_by`, `created_at`, `updated_at`, `expires_at`, `skills`, `education_qualification`, `work_location_preference`) VALUES
('182e0739-bb42-4c9f-9870-c35ac315b399', 'Full Stack Developer', 'Your potential, unleashed.\n\nIndias impact on the global economy has increased at an exponential rate and Deloitte presents an opportunity to unleash and realise your potential amongst cutting edge leaders, and organizations shaping the future of the region, and indeed, the world beyond.\n\n\nAt Deloitte, your whole self to work, every day. Combine that with our drive to propel with purpose and you have the perfect playground to collaborate, innovate, grow, and make an impact that matters.\n\n\nThe team\n\nThe Digital Excellence Centre is responsible for building products and platforms for Deloitte India that focuses on providing extraordinary customer experience by putting design thinking with trailblazing technology in the center of what they do. The diverse team consists of subject matter experts, technology specialists, quality engineers, user experience researchers & designers, data scientists and product managers.\n\nInspiring - Leading with integrity to build inclusion and motivation\nCommitted to creating purpose - Creating a sense of vision and purpose\nAgile - Achieving high-quality results through collaboration and Team unity\nSkilled at building diverse capability - Developing diverse capabilities for the future\nPersuasive / Influencing - Persuading and influencing stakeholders\nCollaborating - Partnering to build new solutions\nDelivering value - Showing commercial acumen\nCommitted to expanding business - Leveraging new business opportunities\nAnalytical Acumen - Leveraging data to recommend impactful approach and solutions through the power of analysis and visualization\nEffective communication Must be well abled to have well-structured and well-articulated conversations to achieve win-win possibilities\nEngagement Management / Delivery Excellence - Effectively managing engagement(s) to ensure timely and proactive execution as well as course correction for\nthe success of engagement(s)\n\nManaging change - Responding to changing environment with resilience\nManaging Quality & Risk - Delivering high quality results and mitigating risks with utmost integrity and precision\nStrategic Thinking & Problem Solving - Applying strategic mindset to solve business issues and complex problems\nTech Savvy - Leveraging ethical technology practices to deliver high impact for clients and for Deloitte\nEmpathetic leadership and inclusivity - creating a safe and thriving environment where everyone\'s valued for who they are, use empathy to understand others to adapt our behaviours and attitudes to become more inclusive.', 'As a prospective candidate, you should possess:\n\nExperience: 2 to 5 years\n2+ years of relevant experience in software development and building web applications.\nExperience in leading a team of developers\nSound knowledge on Data Structures, Algorithms and excellent problem solving skills.\nShould have experience in Python, JavaScript/Typescript and SQL.\nDemonstrated technical capability in developing applications using any industry-standard RDBMS/NoSQL Databases.\nExperience in JavaScript dialects like ES6 TypeScript.\nExperience in writing reusable, testable, and efficient code\nDesign and implementation of low-latency, high-availability, and performant applications\nImplementation of security and data protection best practices.\nHands on experience on React.js, Node.js, FastAPI frameworks.\nExperience in building applications on cloud platforms like AWS/Azure/GCP.\nExperience in writing unit test cases using Jest, Mocha and PyTest frameworks\nComfortable working in Agile methodology, eager to learn and grow.', 'Bangalore, Karnataka', 'full-time', 500000.00, 800000.00, 'INR', 0, 'active', '3d00d233-6931-42a0-b595-26a83fe6aace', '5c6479bc-157e-4de3-af63-37347cd521d8', '2026-03-22 13:27:26', '2026-03-22 13:27:26', NULL, NULL, 'bachelors', 'hybrid'),
('23b80807-37b8-492a-a141-4096514f5657', 'Application Developer', 'Application Developer with experience in Python, FastAPI etc\nExperience in front-end is advantage', 'Graduate with 1year relevant experience', 'Hyderabad, Telangana', 'full-time', 500000.00, 800000.00, 'INR', 0, 'active', '3dd70181-2905-4f41-b074-084c05386b4a', 'fd46f8e0-cb83-43d2-a840-d5e26cc72ff9', '2026-03-21 08:54:55', '2026-03-21 08:54:55', NULL, NULL, 'bachelors', 'wfo'),
('58fbb89e-8f56-4725-9d1d-8dd31ef3baf8', 'Testing Executive', 'Testing Application frontend and Backend', 'Graduate with 1year experience in Testing scripts and codes', 'Hyderabad, Telangana', '', 300000.00, 500000.00, 'INR', 0, 'active', '3dd70181-2905-4f41-b074-084c05386b4a', 'fd46f8e0-cb83-43d2-a840-d5e26cc72ff9', '2026-03-24 06:27:45', '2026-03-24 06:27:45', NULL, NULL, 'bachelors', 'flexible');

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
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `interview_questions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`interview_questions`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `job_applications`
--

INSERT INTO `job_applications` (`id`, `job_id`, `candidate_id`, `cover_letter`, `intro_video_url`, `resume_url`, `custom_answers`, `status`, `ai_score`, `applied_at`, `updated_at`, `interview_questions`) VALUES
('24483304-410b-4bd0-b7b8-a1b70e4b2869', '58fbb89e-8f56-4725-9d1d-8dd31ef3baf8', '900a8a68-04af-4521-9236-97d5b1735e1a', NULL, NULL, NULL, 'null', '', NULL, '2026-03-26 04:33:04', '2026-03-26 04:33:04', NULL),
('41c08214-87f9-4285-a0fc-65b025a11c46', '23b80807-37b8-492a-a141-4096514f5657', '0539b25b-0e5c-4ffb-8a04-3810605c6f0e', NULL, NULL, NULL, 'null', 'interviewing', NULL, '2026-03-21 09:03:54', '2026-03-26 05:10:39', '[\"What is your overall experience\", \"What exactly an Application Developer works on\"]'),
('768ac583-2946-4e5a-84e2-6a2d11840fac', '23b80807-37b8-492a-a141-4096514f5657', 'e9d819a9-3590-48e8-9967-1eeb11c506b2', NULL, NULL, NULL, 'null', 'interviewing', NULL, '2026-03-21 10:11:18', '2026-03-26 05:39:47', '[\"What is your overall experience\", \"What exactly an Application Developer works on\"]');

-- --------------------------------------------------------

--
-- Table structure for table `job_skills`
--

CREATE TABLE `job_skills` (
  `id` varchar(36) NOT NULL DEFAULT uuid(),
  `job_id` varchar(36) NOT NULL,
  `skill_name` varchar(100) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` varchar(36) NOT NULL,
  `created_by` varchar(36) NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `message` text NOT NULL,
  `category` varchar(50) NOT NULL,
  `related_id` varchar(36) DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL,
  `notification_metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`notification_metadata`)),
  `created_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`id`, `created_by`, `title`, `message`, `category`, `related_id`, `is_read`, `notification_metadata`, `created_at`) VALUES
('019b17c5-3801-4a9d-b549-e111d46eec88', 'e9d819a9-3590-48e8-9967-1eeb11c506b2', NULL, 'Your application for a position has been received successfully!', 'application_received', NULL, 1, '{\"type\": \"application_received\", \"job_id\": \"23b80807-37b8-492a-a141-4096514f5657\", \"job_title\": \"a position\"}', '2026-03-21 10:11:18'),
('2551de51-4aca-4e32-8747-b9ef5f86a7f4', '900a8a68-04af-4521-9236-97d5b1735e1a', NULL, 'Your application for a position has been received successfully!', 'application_received', NULL, 1, '{\"type\": \"application_received\", \"job_id\": \"58fbb89e-8f56-4725-9d1d-8dd31ef3baf8\", \"job_title\": \"a position\"}', '2026-03-26 04:33:04'),
('6b5ec151-ebcc-4fdb-8618-a90c17522338', '0539b25b-0e5c-4ffb-8a04-3810605c6f0e', NULL, 'Your application for a position has been received successfully!', 'application_received', NULL, 0, '{\"type\": \"application_received\", \"job_id\": \"23b80807-37b8-492a-a141-4096514f5657\", \"job_title\": \"a position\"}', '2026-03-21 09:03:56'),
('90985f8b-1955-42ef-9512-077690aa92b8', 'fd46f8e0-cb83-43d2-a840-d5e26cc72ff9', 'Interview Responses Submitted', 'Rakshita P has submitted video interview responses for \'Application Developer\'', 'interview_submitted', NULL, 0, '{\"application_id\": \"768ac583-2946-4e5a-84e2-6a2d11840fac\", \"job_id\": \"23b80807-37b8-492a-a141-4096514f5657\", \"candidate_id\": \"e9d819a9-3590-48e8-9967-1eeb11c506b2\", \"candidate_name\": \"Rakshita P\", \"job_title\": \"Application Developer\"}', '2026-03-26 05:39:48');

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
('19997372-6c42-4215-8edd-9d66a6607a85', 'fd46f8e0-cb83-43d2-a840-d5e26cc72ff9', '3dd70181-2905-4f41-b074-084c05386b4a', 'Sheetal Paidimarri', 'sheetal@bmgone.com', '2026-03-19 12:24:29', '2026-03-19 12:24:29', NULL),
('54fc7f0b-b85a-473c-a2ab-cbb44a1580b4', '5c6479bc-157e-4de3-af63-37347cd521d8', '3d00d233-6931-42a0-b595-26a83fe6aace', 'Sheetal Paidimarri', 'itsmepskiran@yahoo.com', '2026-03-22 09:57:48', '2026-03-22 09:57:48', NULL),
('d71df458-e113-4e2b-a0b3-ae126efe3d33', 'd06315da-326f-44b1-9049-bc3a704d8c5f', '1fd93f46-9412-450a-9068-1cf68e51e9c2', 'Sheetal Paidimarri', 'itsmepskiran84@gmail.com', '2026-03-19 12:03:30', '2026-03-19 12:03:30', NULL);

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
('0539b25b-0e5c-4ffb-8a04-3810605c6f0e', 'testing3@bmgone.com', '$2b$12$/8KqHccfJvcJU1CwFAWTkuia9lQjMS0VVtkuw8GNs2thmSe4sxnie', 'Arul Kumar', '7385345976', 'candidate', 'Bangalore', NULL, '2026-03-20 09:34:44', '2026-03-20 09:33:23', '2026-03-24 14:37:43', '2026-03-24 14:37:43', '{}', 1, '{\"registration_source\": \"web\", \"onboarded\": false}'),
('0c6a8f0c-97e8-44cf-ab7f-b95434c65cf8', 'aditya.p@zeroharm.in', '$2b$12$IkXKjXMkP1hUGpSWQRf0eeuJThDggFzlbo9WNyHFsfS2ffBUmfwp.', 'Aditya', '8106733550', 'recruiter', 'Hyderabad', NULL, '2026-03-14 11:08:25', '2026-03-14 05:35:13', '2026-03-14 05:40:00', '2026-03-14 05:40:00', '{}', 0, '{\"registration_source\": \"web\", \"onboarded\": false}'),
('1abd0a3e-17c1-4fbd-bbb0-7e320084f36a', 'testing1@bmgone.com', '$2b$12$/ziYWbsDX1EKJGCAfrrWBuA5RfVJa8dtj9TT7y7n12C3GB/fgezJu', 'Prashasthi Naga Sai', '8125098875', 'candidate', 'Hyderabad', 'https://storage.skreenit.com/datastorage/profilepics/20260319_211829_405dd01f.png', '2026-03-19 15:44:08', '2026-03-19 15:43:11', '2026-03-24 16:49:59', '2026-03-24 16:50:00', '{}', 1, '{\"registration_source\": \"web\", \"onboarded\": false}'),
('5c6479bc-157e-4de3-af63-37347cd521d8', 'itsmepskiran@yahoo.com', '$2b$12$NRfhwohPdauyYmMbfSnolu7plkXEXkNagH.WW/sE8rD2pcmlXhZue', 'Sheetal Paidimarri', '9885608730', 'recruiter', 'Hyderabad', NULL, '2026-03-22 09:54:00', '2026-03-22 09:52:48', '2026-03-23 06:57:09', '2026-03-23 06:57:09', '{}', 1, '{\"registration_source\": \"web\", \"onboarded\": false}'),
('900a8a68-04af-4521-9236-97d5b1735e1a', 'testing5@bmgone.com', '$2b$12$Zi6qBRR9b525s6qVxe39kuwkB3Cwx/YNVTymFsHXXbcvSaSnwc/ea', 'Sreelatha Banoth', '8008113421', 'candidate', 'Warangal', NULL, '2026-03-23 07:27:33', '2026-03-23 07:26:48', '2026-03-26 04:32:55', '2026-03-26 04:32:55', '{}', 1, '{\"registration_source\": \"web\", \"onboarded\": false}'),
('9a0c1d6d-386b-4883-8591-e2073d2295cf', 'manasa.kalyana@gmail.com', '$2b$12$BpGjo3A6IaMhZ5wCjmZOQe1.8JvSNjD9FFJ0Dn.IoxByciL7IQ1NW', 'manasa kalyana', '8978213395', 'recruiter', 'Hyderabad', NULL, NULL, '2026-03-13 06:00:35', '2026-03-13 06:00:35', NULL, '{}', 0, '{\"registration_source\": \"web\", \"onboarded\": false}'),
('b855cb5c-24a6-41db-b7f2-0f098b6a7f60', 'testing2@bmgone.com', '$2b$12$3Sh28DY98L6jQ8HyTf7GCeOujJPEDG5FoUxwibw/zsJ16ZZbD4XhW', 'Praveen Pothuru', '9550011321', 'candidate', 'Chennai', NULL, '2026-03-20 09:00:35', '2026-03-20 08:56:42', '2026-03-24 14:36:57', '2026-03-24 14:36:57', '{}', 0, '{\"registration_source\": \"web\", \"onboarded\": false}'),
('d06315da-326f-44b1-9049-bc3a704d8c5f', 'itsmepskiran84@gmail.com', '$2b$12$pjfVCmQc5kcfXzy0j7W70.OV8ggErVdbX7sn6sQIcfJX1MSTggT1q', 'Sheetal Paidimarri', '9652369658', 'recruiter', 'Hyderabad', NULL, '2026-03-19 12:01:14', '2026-03-19 12:00:40', '2026-03-19 12:03:36', '2026-03-19 12:01:32', '{}', 1, '{\"registration_source\": \"web\", \"onboarded\": false}'),
('e9d819a9-3590-48e8-9967-1eeb11c506b2', 'testing9@bmgone.com', '$2b$12$hIYzXzntfibC2ID0T6A.tebknvrmuXM33jDM7rVxadQIAhqogqJqW', 'Rakshita P', '8121314151', 'candidate', 'Hyderabad', NULL, '2026-03-18 13:10:05', '2026-03-18 13:09:12', '2026-03-26 05:19:36', '2026-03-26 05:19:37', '{}', 1, '{\"registration_source\": \"web\", \"onboarded\": false}'),
('f93e3c1a-dc50-4975-90e8-a826757f9c94', 'bmg@bmgone.com', '$2b$12$OOnNtF/NXgulAkzcuxLbTuqBcaANPJv3VHXsECrXQ5S5xRVMW9Qii', 'Mallesh Goud', '9808400500', 'recruiter', 'Hyderabad', NULL, NULL, '2026-03-17 09:46:19', '2026-03-17 09:46:19', NULL, '{}', 0, '{\"registration_source\": \"web\", \"onboarded\": false}'),
('fd46f8e0-cb83-43d2-a840-d5e26cc72ff9', 'sheetal@bmgone.com', '$2b$12$jjl2LyUh.tvrAW/Lb0/ftO5LuJ.0Y96M3QPeezh8hb7IjvDpvCGjG', 'Sheetal Paidimarri', '9885608730', 'recruiter', 'Bangalore', NULL, '2026-03-19 17:44:16', '2026-03-17 09:47:16', '2026-03-26 04:38:10', '2026-03-26 04:38:10', '{}', 1, '{\"registration_source\": \"web\", \"onboarded\": false}');

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
-- Table structure for table `video_analysis`
--

CREATE TABLE `video_analysis` (
  `id` varchar(36) NOT NULL DEFAULT uuid(),
  `candidate_id` varchar(36) NOT NULL,
  `video_url` varchar(500) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `analysis_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`analysis_data`)),
  `analyzed_at` datetime DEFAULT NULL,
  `video_type` enum('intro','response') DEFAULT 'intro',
  `video_hash` varchar(64) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `video_analysis`
--

INSERT INTO `video_analysis` (`id`, `candidate_id`, `video_url`, `created_at`, `analysis_data`, `analyzed_at`, `video_type`, `video_hash`) VALUES
('1274653d-278f-11f1-9e0a-b903e15f38fb', '0539b25b-0e5c-4ffb-8a04-3810605c6f0e', 'https://storage.skreenit.com/datastorage/videos/20260320_150731_ab4b95ae.webm', '2026-03-24 14:38:06', '{\"candidate_id\": \"0539b25b-0e5c-4ffb-8a04-3810605c6f0e\", \"video_url\": \"https://storage.skreenit.com/datastorage/videos/20260320_150731_ab4b95ae.webm\", \"analyzed_at\": \"2026-03-24T14:38:06.812374+00:00\", \"transcription\": {\"transcript\": \"\", \"word_count\": 0, \"duration_seconds\": 0, \"wpm\": 0, \"filler_words\": 0, \"language\": \"en\"}, \"visual_analysis\": {\"emotion_distribution\": {\"neutral\": 50.0, \"angry\": 25.0, \"happy\": 25.0}, \"dominant_emotion\": \"neutral\", \"face_presence_rate\": 100.0, \"avg_confidence\": 75.8, \"total_frames_analyzed\": 4, \"face_detected_frames\": 4, \"duration_seconds\": 0}, \"summary\": {\"speaking_pace\": 0, \"word_count\": 0, \"duration\": 0, \"filler_words\": 0, \"confidence_score\": 75.8, \"dominant_emotion\": \"neutral\", \"face_presence\": 100.0, \"overall_score\": 90}}', '2026-03-24 14:38:06', 'intro', '339861ea574170cdb0c180de0660f13f72d4565ce52d31967f2f570cd10e155a'),
('5ff7bfce-278f-11f1-9e0a-b903e15f38fb', '900a8a68-04af-4521-9236-97d5b1735e1a', 'https://storage.skreenit.com/datastorage/videos/20260323_073920_e6fadc66.webm', '2026-03-24 14:40:16', '{\"candidate_id\": \"900a8a68-04af-4521-9236-97d5b1735e1a\", \"video_url\": \"https://storage.skreenit.com/datastorage/videos/20260323_073920_e6fadc66.webm\", \"analyzed_at\": \"2026-03-24T16:58:46.078417+00:00\", \"transcription\": {\"transcript\": \"\", \"word_count\": 0, \"duration_seconds\": 0, \"wpm\": 0, \"filler_words\": 0, \"language\": \"en\"}, \"visual_analysis\": {\"emotion_distribution\": {\"neutral\": 100.0}, \"dominant_emotion\": \"neutral\", \"face_presence_rate\": 100.0, \"avg_confidence\": 99.8, \"total_frames_analyzed\": 1, \"face_detected_frames\": 1, \"duration_seconds\": 7.0}, \"summary\": {\"speaking_pace\": 0, \"word_count\": 0, \"duration\": 7.0, \"filler_words\": 0, \"confidence_score\": 99.8, \"dominant_emotion\": \"neutral\", \"face_presence\": 100.0, \"overall_score\": 95}}', '2026-03-24 16:58:46', 'intro', 'b1e3e40cd00fe5dd5697332dfef2eff9a0bc886d4ec31d0baa185ed0499eb508'),
('64e78a63-27a1-11f1-9e0a-b903e15f38fb', 'e9d819a9-3590-48e8-9967-1eeb11c506b2', 'https://storage.skreenit.com/datastorage/videos/20260319_115855_08388c08.webm', '2026-03-24 16:49:16', '{\"candidate_id\": \"e9d819a9-3590-48e8-9967-1eeb11c506b2\", \"video_url\": \"https://storage.skreenit.com/datastorage/videos/20260319_115855_08388c08.webm\", \"analyzed_at\": \"2026-03-24T16:59:30.171743+00:00\", \"transcription\": {\"transcript\": \"\", \"word_count\": 0, \"duration_seconds\": 0, \"wpm\": 0, \"filler_words\": 0, \"language\": \"en\"}, \"visual_analysis\": {\"emotion_distribution\": {\"sad\": 33.3, \"neutral\": 26.7, \"angry\": 6.7, \"happy\": 20.0, \"fear\": 13.3}, \"dominant_emotion\": \"sad\", \"face_presence_rate\": 100.0, \"avg_confidence\": 76.9, \"total_frames_analyzed\": 15, \"face_detected_frames\": 15, \"duration_seconds\": 0}, \"summary\": {\"speaking_pace\": 0, \"word_count\": 0, \"duration\": 0, \"filler_words\": 0, \"confidence_score\": 76.9, \"dominant_emotion\": \"sad\", \"face_presence\": 100.0, \"overall_score\": 90}}', '2026-03-24 16:59:30', 'intro', 'dc2e2f214e9ef2db6e5c5ce5a7531c83869283814bdfe6bb5b7b14a2629cce30'),
('7cb76e92-2783-11f1-9e0a-b903e15f38fb', '1abd0a3e-17c1-4fbd-bbb0-7e320084f36a', 'https://storage.skreenit.com/datastorage/videos/20260324_190043_5cd8cdcb.webm', '2026-03-24 13:15:11', '{\"candidate_id\": \"1abd0a3e-17c1-4fbd-bbb0-7e320084f36a\", \"video_url\": \"https://storage.skreenit.com/datastorage/videos/20260324_190043_5cd8cdcb.webm\", \"analyzed_at\": \"2026-03-24T16:56:14.838974+00:00\", \"transcription\": {\"transcript\": \"My name is Nagasayutra Shastri, I am 25 years old, I am from Hyderabad. I have completed my graduation in 2020. I started learning coding and application development in 2020 right after my graduation. After completion of my couple of courses, I joined with this company as an application developer. Here I am working on in-house application, now I am working on front-end and backing.\", \"word_count\": 65, \"duration_seconds\": 0, \"wpm\": 0, \"filler_words\": 1, \"language\": \"en\"}, \"visual_analysis\": {\"emotion_distribution\": {\"neutral\": 90.0, \"happy\": 5.0, \"fear\": 5.0}, \"dominant_emotion\": \"neutral\", \"face_presence_rate\": 100.0, \"avg_confidence\": 97.4, \"total_frames_analyzed\": 20, \"face_detected_frames\": 20, \"duration_seconds\": 38.5}, \"summary\": {\"speaking_pace\": 101, \"word_count\": 65, \"duration\": 38.5, \"filler_words\": 1, \"confidence_score\": 97.4, \"dominant_emotion\": \"neutral\", \"face_presence\": 100.0, \"overall_score\": 90}}', '2026-03-24 16:56:14', 'intro', 'a8245b1153759680be668a12739c1b48db3ed9de75d023d788abce76f64f93d2');

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
  ADD KEY `idx_candidate_profiles_user_id` (`user_id`),
  ADD KEY `idx_candidate_display_id` (`candidate_display_id`);

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
-- Indexes for table `interview_responses`
--
ALTER TABLE `interview_responses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `candidate_id` (`candidate_id`),
  ADD KEY `ix_interview_responses_application_id` (`application_id`);

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
-- Indexes for table `job_skills`
--
ALTER TABLE `job_skills`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_job_skills_job_id` (`job_id`),
  ADD KEY `idx_job_skills_skill_name` (`skill_name`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ix_notifications_is_read` (`is_read`),
  ADD KEY `ix_notifications_created_by` (`created_by`),
  ADD KEY `ix_notifications_created_at` (`created_at`);

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
-- Indexes for table `video_analysis`
--
ALTER TABLE `video_analysis`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `candidate_id` (`candidate_id`),
  ADD UNIQUE KEY `idx_video_hash` (`video_hash`),
  ADD KEY `idx_intro_videos_candidate_id` (`candidate_id`);

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
-- Constraints for table `interview_responses`
--
ALTER TABLE `interview_responses`
  ADD CONSTRAINT `interview_responses_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `job_applications` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `interview_responses_ibfk_2` FOREIGN KEY (`candidate_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

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
-- Constraints for table `job_skills`
--
ALTER TABLE `job_skills`
  ADD CONSTRAINT `job_skills_ibfk_1` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `recruiter_profiles`
--
ALTER TABLE `recruiter_profiles`
  ADD CONSTRAINT `recruiter_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `recruiter_profiles_ibfk_2` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `video_analysis`
--
ALTER TABLE `video_analysis`
  ADD CONSTRAINT `video_analysis_ibfk_1` FOREIGN KEY (`candidate_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

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
