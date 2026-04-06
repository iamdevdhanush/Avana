-- =============================================
-- AVANA SAFETY PLATFORM - DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABLE: users (extends Supabase auth.users)
-- =============================================
-- Note: We use Supabase Auth for authentication
-- This table stores additional user profile data

CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    display_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Trigger: Create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- TABLE: safety_events
-- =============================================
-- Stores user safety events (zone alerts, SOS triggers)

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

-- Index for faster queries
CREATE INDEX idx_safety_events_user_id ON public.safety_events(user_id);
CREATE INDEX idx_safety_events_created_at ON public.safety_events(created_at DESC);
CREATE INDEX idx_safety_events_location ON public.safety_events(lat, lng);

-- Enable RLS
ALTER TABLE public.safety_events ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can insert their own events
CREATE POLICY "Users can insert own safety events" ON public.safety_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Authenticated users can view all events (for heatmap)
CREATE POLICY "Users can view all safety events" ON public.safety_events
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy: Users can view their own events
CREATE POLICY "Users can view own events" ON public.safety_events
    FOR SELECT USING (auth.uid() = user_id);

-- =============================================
-- TABLE: evidence
-- =============================================
-- Stores user-submitted evidence

CREATE TABLE IF NOT EXISTS public.evidence (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    file_url TEXT,
    notes TEXT,
    location TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX idx_evidence_user_id ON public.evidence(user_id);

-- Enable RLS
ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own evidence
CREATE POLICY "Users can view own evidence" ON public.evidence
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own evidence" ON public.evidence
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================
-- TABLE: community_reports
-- =============================================
-- Stores community-reported unsafe areas

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

-- Indexes
CREATE INDEX idx_community_reports_location ON public.community_reports(lat, lng);
CREATE INDEX idx_community_reports_type ON public.community_reports(type);
CREATE INDEX idx_community_reports_created_at ON public.community_reports(created_at DESC);

-- Enable RLS
ALTER TABLE public.community_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can insert reports
CREATE POLICY "Authenticated users can insert reports" ON public.community_reports
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy: Anyone can view community reports
CREATE POLICY "Anyone can view community reports" ON public.community_reports
    FOR SELECT USING (true);

-- =============================================
-- REALTIME SUBSCRIPTIONS
-- =============================================
-- Enable realtime for community reports

ALTER PUBLICATION supabase_realtime ADD TABLE public.community_reports;
ALTER PUBLICATION supabase_realtime ADD TABLE public.safety_events;

-- =============================================
-- STORAGE BUCKET
-- =============================================
-- Create storage bucket for evidence files

INSERT INTO storage.buckets (id, name, public)
VALUES ('evidence', 'evidence', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: Users can upload to their folder
CREATE POLICY "Users can upload own evidence" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'evidence' AND 
        (auth.uid()::text = (storage.foldername(name))[1])
    );

-- Policy: Users can view evidence in their folder
CREATE POLICY "Users can view own evidence files" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'evidence' AND 
        (auth.uid()::text = (storage.foldername(name))[1])
    );

-- =============================================
-- SAMPLE DATA (Optional - for testing)
-- =============================================

-- Insert sample community reports for Bangalore area
INSERT INTO public.community_reports (lat, lng, type, description, severity) VALUES
(12.9716, 77.5946, 'unsafe_area', 'Poor lighting at night', 'medium'),
(12.9352, 77.6245, 'harassment', 'Reported multiple incidents', 'high'),
(12.9585, 77.6091, 'suspicious', 'Suspicious activities observed', 'medium'),
(12.9450, 77.5872, 'unsafe_area', 'Isolated area - avoid at night', 'high'),
(12.9700, 77.5800, 'harassment', 'Verbal harassment reported', 'medium');
