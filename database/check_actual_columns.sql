-- Double-check the exact table structure
DESCRIBE companies;

-- Check what columns actually exist
SHOW COLUMNS FROM companies;

-- Try the INSERT without the description column to test
INSERT INTO companies (id, name, website, avatar_url, company_display_id, recruiter_id, created_at, updated_at) 
VALUES (
    'test-company-id', 
    'Test Company', 
    'https://test.com', 
    NULL, 
    'TEST123', 
    '22bd4aca-9c4d-434c-baeb-d55b2b723c7a', 
    NOW(), 
    NOW()
);
