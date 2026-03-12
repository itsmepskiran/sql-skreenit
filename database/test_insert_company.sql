-- Test the exact INSERT that's failing (using the values from the logs)
INSERT INTO companies (id, name, description, website, avatar_url, company_display_id, recruiter_id, created_at, updated_at) 
VALUES (
    'ef1953b2-2c44-467d-a15a-112f9ddafeec', 
    'Skreenit', 
    'AI Driven Hiring Platform', 
    'https://www.skreenit.com', 
    NULL, 
    'SKR4EAA2', 
    '22bd4aca-9c4d-434c-baeb-d55b2b723c7a', 
    NOW(), 
    NOW()
);
