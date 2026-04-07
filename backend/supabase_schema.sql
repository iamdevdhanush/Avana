-- =============================================
-- AVANA SAFETY PLATFORM - DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABLE: user_profiles
-- =============================================
-- Extended user profile data beyond Firebase auth

CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY,
    name TEXT,
    age INTEGER,
    phone TEXT,
    guardian_phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON public.user_profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id OR id IS NULL);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- =============================================
-- TABLE: emergency_contacts
-- =============================================
-- User's emergency contacts

CREATE TABLE IF NOT EXISTS public.emergency_contacts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    relationship TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_emergency_contacts_user_id ON public.emergency_contacts(user_id);

ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own emergency contacts" ON public.emergency_contacts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert emergency contacts" ON public.emergency_contacts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete emergency contacts" ON public.emergency_contacts
    FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- TABLE: sos_alerts
-- =============================================
-- SOS emergency alerts

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

CREATE INDEX idx_sos_alerts_user_id ON public.sos_alerts(user_id);
CREATE INDEX idx_sos_alerts_created_at ON public.sos_alerts(created_at DESC);

ALTER TABLE public.sos_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sos alerts" ON public.sos_alerts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert sos alerts" ON public.sos_alerts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

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

CREATE INDEX idx_safety_events_user_id ON public.safety_events(user_id);
CREATE INDEX idx_safety_events_created_at ON public.safety_events(created_at DESC);
CREATE INDEX idx_safety_events_location ON public.safety_events(lat, lng);

ALTER TABLE public.safety_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all safety events" ON public.safety_events
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert own safety events" ON public.safety_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);

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

CREATE INDEX idx_evidence_user_id ON public.evidence(user_id);

ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own evidence" ON public.evidence
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own evidence" ON public.evidence
    FOR INSERT WITH CHECK (auth.uid() = user_id);

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

CREATE INDEX idx_community_reports_location ON public.community_reports(lat, lng);
CREATE INDEX idx_community_reports_type ON public.community_reports(type);
CREATE INDEX idx_community_reports_created_at ON public.community_reports(created_at DESC);

ALTER TABLE public.community_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert reports" ON public.community_reports
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Anyone can view community reports" ON public.community_reports
    FOR SELECT USING (true);

-- =============================================
-- TABLE: community_posts
-- =============================================
-- Real-time community posts/alerts

CREATE TABLE IF NOT EXISTS public.community_posts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    location JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_community_posts_created_at ON public.community_posts(created_at DESC);

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view community posts" ON public.community_posts
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert posts" ON public.community_posts
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- =============================================
-- TABLE: post_comments
-- =============================================
-- Comments on community posts

CREATE TABLE IF NOT EXISTS public.post_comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    post_id UUID REFERENCES public.community_posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_post_comments_post_id ON public.post_comments(post_id);

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comments" ON public.post_comments
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert comments" ON public.post_comments
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- =============================================
-- REALTIME SUBSCRIPTIONS
-- =============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.community_reports;
ALTER PUBLICATION supabase_realtime ADD TABLE public.safety_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sos_alerts;

-- =============================================
-- STORAGE BUCKET
-- =============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('evidence', 'evidence', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own evidence" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'evidence' AND 
        (auth.uid()::text = (storage.foldername(name))[1])
    );

CREATE POLICY "Users can view own evidence files" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'evidence' AND 
        (auth.uid()::text = (storage.foldername(name))[1])
    );

-- =============================================
-- SAMPLE DATA
-- =============================================

INSERT INTO public.community_reports (lat, lng, type, description, severity) VALUES
(12.9716, 77.5946, 'unsafe_area', 'Poor lighting at night', 'medium'),
(12.9352, 77.6245, 'harassment', 'Reported multiple incidents', 'high'),
(12.9585, 77.6091, 'suspicious', 'Suspicious activities observed', 'medium'),
(12.9450, 77.5872, 'unsafe_area', 'Isolated area - avoid at night', 'high'),
(12.9700, 77.5800, 'harassment', 'Verbal harassment reported', 'medium');
