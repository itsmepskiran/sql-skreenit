-- Recruiter Profiles table
-- This table stores additional profile information for recruiters
CREATE TABLE public.recruiter_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    company_name TEXT,
    company_website TEXT,
    contact_name TEXT,
    contact_email TEXT,
    location TEXT,
    about_company TEXT,
    phone TEXT,
    position TEXT,
    linkedin_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.recruiter_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recruiter_profiles
CREATE POLICY "Recruiters can view own profile" ON public.recruiter_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Recruiters can update own profile" ON public.recruiter_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Recruiters can insert own profile" ON public.recruiter_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_recruiter_profiles_updated_at BEFORE UPDATE ON public.recruiter_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_recruiter_profiles_user ON public.recruiter_profiles(user_id);
