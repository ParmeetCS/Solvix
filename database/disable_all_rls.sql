-- ==============================================================================
-- SOLVIX: Disable Row Level Security (RLS) On All Public Tables
-- Run this in your Supabase SQL Editor to disable RLS across all tables at once.
-- ==============================================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY;', r.tablename);
    END LOOP;
END $$;

-- Refresh Supabase PostgREST schema cache
NOTIFY pgrst, 'reload schema';
