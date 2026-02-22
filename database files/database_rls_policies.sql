-- ============================================================
-- SKREENIT ROW LEVEL SECURITY (RLS) POLICIES
-- Enable and configure RLS for all tables
-- ============================================================

-- ============================================================
-- USERS TABLE
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT
    USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE
    USING (auth.uid() = id);

-- Allow service role full access (for backend)
CREATE POLICY "Service role has full access" ON users
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================
-- RECRUITER PROFILES
-- ============================================================

ALTER TABLE recruiter_profiles ENABLE ROW LEVEL SECURITY;

-- Recruiters can view their own profile
CREATE POLICY "Recruiters can view own profile" ON recruiter_profiles
    FOR SELECT
    USING (auth.uid() = user_id);

-- Recruiters can update their own profile
CREATE POLICY "Recruiters can update own profile" ON recruiter_profiles
    FOR ALL
    USING (auth.uid() = user_id);

-- Service role full access
CREATE POLICY "Service role full access on recruiter_profiles" ON recruiter_profiles
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================
-- CANDIDATE PROFILES
-- ============================================================

ALTER TABLE candidate_profiles ENABLE ROW LEVEL SECURITY;

-- Candidates can view/update their own profile
CREATE POLICY "Candidates can view own profile" ON candidate_profiles
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Candidates can update own profile" ON candidate_profiles
    FOR ALL
    USING (auth.uid() = user_id);

-- Recruiters can view candidate profiles (for applications to their jobs)
CREATE POLICY "Recruiters can view candidate profiles for their jobs" ON candidate_profiles
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM job_applications ja
            JOIN jobs j ON ja.job_id = j.id
            WHERE ja.candidate_id = candidate_profiles.user_id
            AND j.created_by = auth.uid()
        )
    );

-- Service role full access
CREATE POLICY "Service role full access on candidate_profiles" ON candidate_profiles
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================
-- CANDIDATE EDUCATION
-- ============================================================

ALTER TABLE candidate_education ENABLE ROW LEVEL SECURITY;

-- Candidates can manage their own education
CREATE POLICY "Candidates can manage own education" ON candidate_education
    FOR ALL
    USING (auth.uid() = candidate_id);

-- Recruiters can view education for their job applicants
CREATE POLICY "Recruiters can view education for their applicants" ON candidate_education
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM job_applications ja
            JOIN jobs j ON ja.job_id = j.id
            WHERE ja.candidate_id = candidate_education.candidate_id
            AND j.created_by = auth.uid()
        )
    );

-- Service role full access
CREATE POLICY "Service role full access on candidate_education" ON candidate_education
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================
-- CANDIDATE EXPERIENCE
-- ============================================================

ALTER TABLE candidate_experience ENABLE ROW LEVEL SECURITY;

-- Candidates can manage their own experience
CREATE POLICY "Candidates can manage own experience" ON candidate_experience
    FOR ALL
    USING (auth.uid() = candidate_id);

-- Recruiters can view experience for their job applicants
CREATE POLICY "Recruiters can view experience for their applicants" ON candidate_experience
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM job_applications ja
            JOIN jobs j ON ja.job_id = j.id
            WHERE ja.candidate_id = candidate_experience.candidate_id
            AND j.created_by = auth.uid()
        )
    );

-- Service role full access
CREATE POLICY "Service role full access on candidate_experience" ON candidate_experience
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================
-- CANDIDATE SKILLS
-- ============================================================

ALTER TABLE candidate_skills ENABLE ROW LEVEL SECURITY;

-- Candidates can manage their own skills
CREATE POLICY "Candidates can manage own skills" ON candidate_skills
    FOR ALL
    USING (auth.uid() = candidate_id);

-- Recruiters can view skills for their job applicants
CREATE POLICY "Recruiters can view skills for their applicants" ON candidate_skills
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM job_applications ja
            JOIN jobs j ON ja.job_id = j.id
            WHERE ja.candidate_id = candidate_skills.candidate_id
            AND j.created_by = auth.uid()
        )
    );

-- Service role full access
CREATE POLICY "Service role full access on candidate_skills" ON candidate_skills
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================
-- COMPANIES
-- ============================================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Anyone can view companies
CREATE POLICY "Anyone can view companies" ON companies
    FOR SELECT
    USING (true);

-- Only company creator can modify
CREATE POLICY "Creator can modify company" ON companies
    FOR ALL
    USING (auth.uid() = created_by);

-- Service role full access
CREATE POLICY "Service role full access on companies" ON companies
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================
-- JOBS
-- ============================================================

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Anyone can view active jobs
CREATE POLICY "Anyone can view active jobs" ON jobs
    FOR SELECT
    USING (status = 'active');

-- Recruiters can view all their own jobs (active or not)
CREATE POLICY "Recruiters can view all their jobs" ON jobs
    FOR SELECT
    USING (created_by = auth.uid());

-- Recruiters can manage their own jobs
CREATE POLICY "Recruiters can manage own jobs" ON jobs
    FOR ALL
    USING (created_by = auth.uid());

-- Service role full access
CREATE POLICY "Service role full access on jobs" ON jobs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================
-- JOB SKILLS
-- ============================================================

ALTER TABLE job_skills ENABLE ROW LEVEL SECURITY;

-- Anyone can view job skills
CREATE POLICY "Anyone can view job skills" ON job_skills
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM jobs 
            WHERE jobs.id = job_skills.job_id 
            AND jobs.status = 'active'
        )
    );

-- Recruiters can manage skills for their jobs
CREATE POLICY "Recruiters can manage skills for their jobs" ON job_skills
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM jobs 
            WHERE jobs.id = job_skills.job_id 
            AND jobs.created_by = auth.uid()
        )
    );

-- Service role full access
CREATE POLICY "Service role full access on job_skills" ON job_skills
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================
-- INTERVIEW QUESTIONS
-- ============================================================

ALTER TABLE interview_questions ENABLE ROW LEVEL SECURITY;

-- Anyone can view interview questions for active jobs
CREATE POLICY "Anyone can view interview questions" ON interview_questions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM jobs 
            WHERE jobs.id = interview_questions.job_id 
            AND jobs.status = 'active'
        )
    );

-- Recruiters can manage questions for their jobs
CREATE POLICY "Recruiters can manage questions for their jobs" ON interview_questions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM jobs 
            WHERE jobs.id = interview_questions.job_id 
            AND jobs.created_by = auth.uid()
        )
    );

-- Service role full access
CREATE POLICY "Service role full access on interview_questions" ON interview_questions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================
-- JOB APPLICATIONS
-- ============================================================

ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

-- Candidates can view their own applications
CREATE POLICY "Candidates can view own applications" ON job_applications
    FOR SELECT
    USING (candidate_id = auth.uid());

-- Candidates can create applications
CREATE POLICY "Candidates can create applications" ON job_applications
    FOR INSERT
    WITH CHECK (candidate_id = auth.uid());

-- Candidates can update their own applications (withdraw)
CREATE POLICY "Candidates can update own applications" ON job_applications
    FOR UPDATE
    USING (candidate_id = auth.uid());

-- Recruiters can view applications for their jobs
CREATE POLICY "Recruiters can view applications for their jobs" ON job_applications
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM jobs 
            WHERE jobs.id = job_applications.job_id 
            AND jobs.created_by = auth.uid()
        )
    );

-- Recruiters can update applications for their jobs (change status)
CREATE POLICY "Recruiters can update applications for their jobs" ON job_applications
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM jobs 
            WHERE jobs.id = job_applications.job_id 
            AND jobs.created_by = auth.uid()
        )
    );

-- Service role full access
CREATE POLICY "Service role full access on job_applications" ON job_applications
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================
-- VIDEO RESPONSES
-- ============================================================

ALTER TABLE video_responses ENABLE ROW LEVEL SECURITY;

-- Candidates can view their own video responses
CREATE POLICY "Candidates can view own video responses" ON video_responses
    FOR SELECT
    USING (candidate_id = auth.uid());

-- Candidates can create their own video responses
CREATE POLICY "Candidates can create own video responses" ON video_responses
    FOR INSERT
    WITH CHECK (candidate_id = auth.uid());

-- Recruiters can view video responses for their job applications
CREATE POLICY "Recruiters can view video responses for their applications" ON video_responses
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM job_applications ja
            JOIN jobs j ON ja.job_id = j.id
            WHERE ja.id = video_responses.application_id
            AND j.created_by = auth.uid()
        )
    );

-- Service role full access
CREATE POLICY "Service role full access on video_responses" ON video_responses
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================
-- GENERAL VIDEO INTERVIEWS
-- ============================================================

ALTER TABLE general_video_interviews ENABLE ROW LEVEL SECURITY;

-- Candidates can manage their own general video
CREATE POLICY "Candidates can manage own general video" ON general_video_interviews
    FOR ALL
    USING (candidate_id = auth.uid());

-- Recruiters can view general video of applicants to their jobs
CREATE POLICY "Recruiters can view general video of their applicants" ON general_video_interviews
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM job_applications ja
            JOIN jobs j ON ja.job_id = j.id
            WHERE ja.candidate_id = general_video_interviews.candidate_id
            AND j.created_by = auth.uid()
        )
    );

-- Service role full access
CREATE POLICY "Service role full access on general_video_interviews" ON general_video_interviews
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT
    USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE
    USING (user_id = auth.uid());

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications" ON notifications
    FOR DELETE
    USING (user_id = auth.uid());

-- Service role full access
CREATE POLICY "Service role full access on notifications" ON notifications
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================
-- SAVED JOBS
-- ============================================================

ALTER TABLE saved_jobs ENABLE ROW LEVEL SECURITY;

-- Candidates can manage their saved jobs
CREATE POLICY "Candidates can manage saved jobs" ON saved_jobs
    FOR ALL
    USING (candidate_id = auth.uid());

-- Service role full access
CREATE POLICY "Service role full access on saved_jobs" ON saved_jobs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================
-- AUDIT LOG
-- ============================================================

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own audit logs
CREATE POLICY "Users can view own audit logs" ON audit_log
    FOR SELECT
    USING (user_id = auth.uid());

-- Service role full access
CREATE POLICY "Service role full access on audit_log" ON audit_log
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================
-- ENABLE REALTIME PUBLICATIONS (Optional)
-- ============================================================

-- Add tables to realtime publication for live updates
-- ALTER PUBLICATION supabase_realtime ADD TABLE jobs;
-- ALTER PUBLICATION supabase_realtime ADD TABLE job_applications;
-- ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ============================================================
-- END OF RLS POLICIES
-- ============================================================
