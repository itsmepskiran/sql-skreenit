-- Check the actual structure of the companies table
DESCRIBE companies;

-- Check if company_display_id column exists
SHOW COLUMNS FROM companies LIKE 'company_display_id';

-- Check existing companies to see what's there
SELECT id, name, recruiter_id, company_display_id FROM companies LIMIT 5;

-- Check if there are any constraints on the companies table
SHOW CREATE TABLE companies;
