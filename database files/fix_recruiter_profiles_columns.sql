-- Add missing columns to recruiter_profiles table
-- Run this if the table exists but columns are missing

ALTER TABLE public.recruiter_profiles 
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS company_website TEXT,
ADD COLUMN IF NOT EXISTS contact_name TEXT,
ADD COLUMN IF NOT EXISTS contact_email TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS about_company TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS position TEXT,
ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Ensure user_id has proper constraint
ALTER TABLE public.recruiter_profiles 
ADD CONSTRAINT recruiter_profiles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Ensure uniqueness
ALTER TABLE public.recruiter_profiles 
ADD CONSTRAINT recruiter_profiles_user_id_key 
UNIQUE (user_id);

-- Drop trigger if it exists and recreate it
DROP TRIGGER IF EXISTS update_recruiter_profiles_updated_at ON public.recruiter_profiles;
CREATE TRIGGER update_recruiter_profiles_updated_at 
BEFORE UPDATE ON public.recruiter_profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create index if not exists
CREATE INDEX IF NOT EXISTS idx_recruiter_profiles_user 
ON public.recruiter_profiles(user_id);
