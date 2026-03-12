-- Test direct database update for location field
UPDATE recruiter_profiles 
SET location = 'Test Location' 
WHERE user_id = '22bd4aca-9c4d-434c-baeb-d55b2b723c7a';

-- Check if the update worked
SELECT user_id, location, contact_name, contact_email 
FROM recruiter_profiles 
WHERE user_id = '22bd4aca-9c4d-434c-baeb-d55b2b723c7a';
