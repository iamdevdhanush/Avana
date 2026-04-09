-- =============================================
-- AVANA SAFETY PLATFORM - DATABASE SCHEMA
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABLE: user_profiles
-- Must match auth.users.id
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    age INTEGER,
    phone TEXT,
    guardian_phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own profile
CREATE POLICY "Users can view own profile"
    ON public.user_profiles
    FOR SELECT
    USING (auth.uid() = id);

-- Policy: Users can insert their own profile (triggered on signup)
CREATE POLICY "Users can insert own profile"
    ON public.user_profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON public.user_profiles
    FOR UPDATE
    USING (auth.uid() = id);

-- =============================================
-- TABLE: emergency_contacts
-- =============================================
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    relationship TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user_id ON public.emergency_contacts(user_id);

ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own emergency contacts"
    ON public.emergency_contacts
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own emergency contacts"
    ON public.emergency_contacts
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own emergency contacts"
    ON public.emergency_contacts
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own emergency contacts"
    ON public.emergency_contacts
    FOR DELETE
    USING (auth.uid() = user_id);

-- =============================================
-- TABLE: sos_alerts
-- =============================================
CREATE TABLE IF NOT EXISTS public.sos_alerts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    lat DECIMAL(10, 8) NOT NULL,
    lng DECIMAL(11, 8) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'TRIGGERED',
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sos_alerts_user_id ON public.sos_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_created_at ON public.sos_alerts(created_at DESC);

ALTER TABLE public.sos_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sos alerts"
    ON public.sos_alerts
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sos alerts"
    ON public.sos_alerts
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- =============================================
-- TABLE: safety_events
-- =============================================
CREATE TABLE IF NOT EXISTS public.safety_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    lat DECIMAL(10, 8) NOT NULL,
    lng DECIMAL(11, 8) NOT NULL,
    risk_level TEXT CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    event_type TEXT DEFAULT 'zone_alert',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_safety_events_user_id ON public.safety_events(user_id);
CREATE INDEX IF NOT EXISTS idx_safety_events_created_at ON public.safety_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_safety_events_location ON public.safety_events(lat, lng);

ALTER TABLE public.safety_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view safety events"
    ON public.safety_events
    FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert own safety events"
    ON public.safety_events
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- =============================================
-- TABLE: evidence
-- =============================================
CREATE TABLE IF NOT EXISTS public.evidence (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    file_url TEXT,
    notes TEXT,
    location TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_user_id ON public.evidence(user_id);

ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own evidence"
    ON public.evidence
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own evidence"
    ON public.evidence
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- =============================================
-- TABLE: community_reports
-- =============================================
CREATE TABLE IF NOT EXISTS public.community_reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    lat DECIMAL(10, 8) NOT NULL,
    lng DECIMAL(11, 8) NOT NULL,
    type TEXT CHECK (type IN ('harassment', 'stalking', 'unsafe_area', 'assault', 'suspicious', 'other')) NOT NULL,
    description TEXT,
    severity TEXT CHECK (severity IN ('low', 'medium', 'high')) DEFAULT 'medium',
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_reports_location ON public.community_reports(lat, lng);
CREATE INDEX IF NOT EXISTS idx_community_reports_type ON public.community_reports(type);
CREATE INDEX IF NOT EXISTS idx_community_reports_created_at ON public.community_reports(created_at DESC);

ALTER TABLE public.community_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view community reports"
    ON public.community_reports
    FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can insert reports"
    ON public.community_reports
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- =============================================
-- TABLE: community_posts (CRITICAL - Main posts table)
-- =============================================
CREATE TABLE IF NOT EXISTS public.community_posts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    location JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_posts_user_id ON public.community_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON public.community_posts(created_at DESC);

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

-- CRITICAL: Anyone can view posts (public feed)
CREATE POLICY "Anyone can view community posts"
    ON public.community_posts
    FOR SELECT
    USING (true);

-- CRITICAL: Authenticated users can create posts
CREATE POLICY "Authenticated users can insert posts"
    ON public.community_posts
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Users can update their own posts
CREATE POLICY "Users can update own posts"
    ON public.community_posts
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own posts
CREATE POLICY "Users can delete own posts"
    ON public.community_posts
    FOR DELETE
    USING (auth.uid() = user_id);

-- =============================================
-- TABLE: post_comments
-- =============================================
CREATE TABLE IF NOT EXISTS public.post_comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    post_id UUID REFERENCES public.community_posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON public.post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_user_id ON public.post_comments(user_id);

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

-- Anyone can view comments
CREATE POLICY "Anyone can view comments"
    ON public.post_comments
    FOR SELECT
    USING (true);

-- Authenticated users can insert comments
CREATE POLICY "Authenticated users can insert comments"
    ON public.post_comments
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
    ON public.post_comments
    FOR DELETE
    USING (auth.uid() = user_id);

-- =============================================
-- FUNCTION: Auto-create user profile on signup
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- REALTIME SUBSCRIPTIONS
-- Enable realtime for these tables
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_reports;
ALTER PUBLICATION supabase_realtime ADD TABLE public.safety_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sos_alerts;

-- =============================================
-- STORAGE BUCKET FOR EVIDENCE
-- Create in Supabase Dashboard > Storage > New bucket
-- =============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('evidence', 'evidence', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'audio/mpeg'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Users can upload own evidence" ON storage.objects;
CREATE POLICY "Users can upload own evidence"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'evidence' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Users can view own evidence files" ON storage.objects;
CREATE POLICY "Users can view own evidence files"
    ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'evidence' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Users can delete own evidence files" ON storage.objects;
CREATE POLICY "Users can delete own evidence files"
    ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'evidence' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- =============================================
-- VERIFICATION CHECK (Run to verify setup)
-- =============================================
-- SELECT 
--     'user_profiles' as table_name,
--     COUNT(*) as policies_count
-- FROM pg_policies WHERE tablename = 'user_profiles'
-- UNION ALL
-- SELECT 
--     'community_posts' as table_name,
--     COUNT(*) as policies_count
-- FROM pg_policies WHERE tablename = 'community_posts';
