-- ============================================
-- INCIDENT INTELLIGENCE - SUPABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Create reports table
CREATE TABLE IF NOT EXISTS reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    text TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('crime', 'suspicious', 'infrastructure', 'emergency', 'other')),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
    summary TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Allow all users to SELECT reports (public viewing)
CREATE POLICY "Allow all users to SELECT reports"
ON reports
FOR SELECT
TO public
USING (true);

-- Allow authenticated users to INSERT reports
CREATE POLICY "Allow authenticated users to INSERT reports"
ON reports
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 4. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_category ON reports(category);
CREATE INDEX IF NOT EXISTS idx_reports_severity ON reports(severity);
