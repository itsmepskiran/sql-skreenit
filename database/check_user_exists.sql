-- Check if the user exists in the users table
SELECT id, email, full_name, role FROM users WHERE id = '22bd4aca-9c4d-434c-baeb-d55b2b723c7a';

-- Check if there are any users in the system
SELECT COUNT(*) as total_users FROM users;

-- Show all users (for debugging)
SELECT id, email, full_name, role, created_at FROM users LIMIT 5;
