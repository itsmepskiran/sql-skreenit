-- Add this to your schema to fix the recruiter profile issue
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role user_role NOT NULL DEFAULT 'candidate',
    avatar_url TEXT,
    phone TEXT,
    location TEXT,
    company TEXT, -- for recruiters
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recruiter Profiles table (if not already properly defined)
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

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruiter_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Recruiters can view own profile" ON public.recruiter_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Recruiters can update own profile" ON public.recruiter_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Recruiters can insert own profile" ON public.recruiter_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);
