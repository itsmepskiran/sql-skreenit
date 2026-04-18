-- Migration 003: Add Reference Tables for Dropdowns
-- Creates tables for departments, roles, employment types, industries, job types, education levels, salary ranges, experience levels

-- ============================================================================
-- DEPARTMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS departments (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE,
    description TEXT,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_departments_active (is_active),
    INDEX idx_departments_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO departments (id, name, slug, sort_order) VALUES
(UUID(), 'Engineering', 'engineering', 1),
(UUID(), 'Product', 'product', 2),
(UUID(), 'Design', 'design', 3),
(UUID(), 'Marketing', 'marketing', 4),
(UUID(), 'Sales', 'sales', 5),
(UUID(), 'Human Resources', 'hr', 6),
(UUID(), 'Finance', 'finance', 7),
(UUID(), 'Operations', 'operations', 8),
(UUID(), 'Customer Support', 'customer-support', 9),
(UUID(), 'IT', 'it', 10),
(UUID(), 'Legal', 'legal', 11),
(UUID(), 'Quality Assurance', 'qa', 12),
(UUID(), 'Data Science', 'data-science', 13),
(UUID(), 'Research & Development', 'rnd', 14),
(UUID(), 'Other', 'other', 99)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- ============================================================================
-- ROLES
-- ============================================================================
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE,
    department_id VARCHAR(36),
    level INT DEFAULT 0,
    description TEXT,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_roles_active (is_active),
    INDEX idx_roles_department (department_id),
    INDEX idx_roles_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO roles (id, name, slug, level, sort_order) VALUES
(UUID(), 'Intern', 'intern', 1, 1),
(UUID(), 'Trainee', 'trainee', 2, 2),
(UUID(), 'Junior', 'junior', 3, 3),
(UUID(), 'Mid-Level', 'mid-level', 4, 4),
(UUID(), 'Senior', 'senior', 5, 5),
(UUID(), 'Lead', 'lead', 6, 6),
(UUID(), 'Principal', 'principal', 7, 7),
(UUID(), 'Manager', 'manager', 8, 8),
(UUID(), 'Senior Manager', 'senior-manager', 9, 9),
(UUID(), 'Associate Director', 'associate-director', 10, 10),
(UUID(), 'Director', 'director', 11, 11),
(UUID(), 'Senior Director', 'senior-director', 12, 12),
(UUID(), 'VP', 'vp', 13, 13),
(UUID(), 'Senior VP', 'senior-vp', 14, 14),
(UUID(), 'C-Level Executive', 'c-level', 15, 15),
(UUID(), 'CEO', 'ceo', 16, 16),
(UUID(), 'CTO', 'cto', 16, 17),
(UUID(), 'CFO', 'cfo', 16, 18),
(UUID(), 'COO', 'coo', 16, 19),
(UUID(), 'Other', 'other', 0, 99)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- ============================================================================
-- EMPLOYMENT TYPES
-- ============================================================================
CREATE TABLE IF NOT EXISTS employment_types (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE,
    description TEXT,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_employment_types_active (is_active),
    INDEX idx_employment_types_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO employment_types (id, name, slug, sort_order) VALUES
(UUID(), 'Full-Time', 'full-time', 1),
(UUID(), 'Part-Time', 'part-time', 2),
(UUID(), 'Contract', 'contract', 3),
(UUID(), 'Freelance', 'freelance', 4),
(UUID(), 'Internship', 'internship', 5),
(UUID(), 'Temporary', 'temporary', 6),
(UUID(), 'Remote', 'remote', 7)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- ============================================================================
-- INDUSTRIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS industries (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE,
    description TEXT,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_industries_active (is_active),
    INDEX idx_industries_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO industries (id, name, slug, sort_order) VALUES
(UUID(), 'IT / Software', 'it', 1),
(UUID(), 'Finance / Banking', 'finance', 2),
(UUID(), 'Healthcare', 'healthcare', 3),
(UUID(), 'Education', 'education', 4),
(UUID(), 'Manufacturing', 'manufacturing', 5),
(UUID(), 'Retail / E-commerce', 'retail', 6),
(UUID(), 'Consulting', 'consulting', 7),
(UUID(), 'Media / Entertainment', 'media', 8),
(UUID(), 'Real Estate', 'real-estate', 9),
(UUID(), 'Automotive', 'automotive', 10),
(UUID(), 'Telecommunications', 'telecom', 11),
(UUID(), 'Energy / Utilities', 'energy', 12),
(UUID(), 'Transportation / Logistics', 'transportation', 13),
(UUID(), 'Hospitality / Tourism', 'hospitality', 14),
(UUID(), 'Food & Beverage', 'food-beverage', 15),
(UUID(), 'Pharmaceutical', 'pharmaceutical', 16),
(UUID(), 'Aerospace / Defense', 'aerospace', 17),
(UUID(), 'Construction', 'construction', 18),
(UUID(), 'Agriculture', 'agriculture', 19),
(UUID(), 'Non-Profit / NGO', 'nonprofit', 20),
(UUID(), 'Government', 'government', 21),
(UUID(), 'Other', 'other', 99)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- ============================================================================
-- JOB TYPES (Work Mode)
-- ============================================================================
CREATE TABLE IF NOT EXISTS job_types (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE,
    description TEXT,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_job_types_active (is_active),
    INDEX idx_job_types_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO job_types (id, name, slug, sort_order) VALUES
(UUID(), 'On-site', 'onsite', 1),
(UUID(), 'Remote', 'remote', 2),
(UUID(), 'Hybrid', 'hybrid', 3)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- ============================================================================
-- EDUCATION LEVELS
-- ============================================================================
CREATE TABLE IF NOT EXISTS education_levels (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE,
    level INT DEFAULT 0,
    description TEXT,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_education_levels_active (is_active),
    INDEX idx_education_levels_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO education_levels (id, name, slug, level, sort_order) VALUES
(UUID(), 'High School', 'high-school', 1, 1),
(UUID(), 'Diploma', 'diploma', 2, 2),
(UUID(), 'Associate Degree', 'associate', 3, 3),
(UUID(), 'Bachelor\'s Degree', 'bachelors', 4, 4),
(UUID(), 'Master\'s Degree', 'masters', 5, 5),
(UUID(), 'Post Graduate', 'pg', 5, 6),
(UUID(), 'PhD / Doctorate', 'phd', 6, 7),
(UUID(), 'Professional Degree', 'professional', 5, 8),
(UUID(), 'Certification', 'certification', 2, 9),
(UUID(), 'Any Education', 'any', 0, 99)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- ============================================================================
-- SALARY RANGES
-- ============================================================================
CREATE TABLE IF NOT EXISTS salary_ranges (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE,
    min_lpa DECIMAL(10,2) DEFAULT 0,
    max_lpa DECIMAL(10,2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'INR',
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_salary_ranges_active (is_active),
    INDEX idx_salary_ranges_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO salary_ranges (id, name, slug, min_lpa, max_lpa, sort_order) VALUES
(UUID(), '0-3 LPA', '0-3', 0, 3, 1),
(UUID(), '3-6 LPA', '3-6', 3, 6, 2),
(UUID(), '6-10 LPA', '6-10', 6, 10, 3),
(UUID(), '10-15 LPA', '10-15', 10, 15, 4),
(UUID(), '15-20 LPA', '15-20', 15, 20, 5),
(UUID(), '20-30 LPA', '20-30', 20, 30, 6),
(UUID(), '30-50 LPA', '30-50', 30, 50, 7),
(UUID(), '50-75 LPA', '50-75', 50, 75, 8),
(UUID(), '75+ LPA', '75+', 75, 999, 9),
(UUID(), 'Negotiable', 'negotiable', 0, 0, 10)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- ============================================================================
-- EXPERIENCE LEVELS
-- ============================================================================
CREATE TABLE IF NOT EXISTS experience_levels (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE,
    min_years INT DEFAULT 0,
    max_years INT DEFAULT 0,
    description TEXT,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_experience_levels_active (is_active),
    INDEX idx_experience_levels_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO experience_levels (id, name, slug, min_years, max_years, sort_order) VALUES
(UUID(), 'Fresher', 'fresher', 0, 0, 1),
(UUID(), '0-1 Years', '0-1', 0, 1, 2),
(UUID(), '1-3 Years', '1-3', 1, 3, 3),
(UUID(), '3-5 Years', '3-5', 3, 5, 4),
(UUID(), '5-8 Years', '5-8', 5, 8, 5),
(UUID(), '8-12 Years', '8-12', 8, 12, 6),
(UUID(), '12-15 Years', '12-15', 12, 15, 7),
(UUID(), '15-20 Years', '15-20', 15, 20, 8),
(UUID(), '20+ Years', '20+', 20, 99, 9)
ON DUPLICATE KEY UPDATE name=VALUES(name);
