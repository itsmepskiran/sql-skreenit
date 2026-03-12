-- Check existing companies to see if there are duplicates
SELECT id, name, recruiter_id, company_display_id, created_at FROM companies;

-- Check if there's already a company with this recruiter_id
SELECT * FROM companies WHERE recruiter_id = '22bd4aca-9c4d-434c-baeb-d55b2b723c7a';

-- Check if there's already a company with this display_id
SELECT * FROM companies WHERE company_display_id = 'SKR4EAA2';

-- Check recruiter profile to see current company association
SELECT * FROM recruiter_profiles WHERE user_id = '22bd4aca-9c4d-434c-baeb-d55b2b723c7a';
