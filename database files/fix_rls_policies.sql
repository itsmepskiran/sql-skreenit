-- Fix RLS policies to allow service role access
-- Add these policies to allow backend service operations

-- Allow service role to access users table
CREATE POLICY "Service role can access users" ON public.users
    FOR ALL USING (
        auth.jwt()->>'role' = 'service_role' OR 
        auth.uid() IS NULL
    );

-- Allow service role to access recruiter_profiles table  
CREATE POLICY "Service role can access recruiter_profiles" ON public.recruiter_profiles
    FOR ALL USING (
        auth.jwt()->>'role' = 'service_role' OR 
        auth.uid() IS NULL
    );

-- Allow service role to bypass RLS (alternative approach)
-- Uncomment this if the above doesn't work:
-- ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.recruiter_profiles DISABLE ROW LEVEL SECURITY;
