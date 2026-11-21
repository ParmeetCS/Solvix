-- ==============================================================================
-- SOLVIX: Grant Full Permissions to anon, authenticated & service_role
-- Fixes: "permission denied for table profiles" and any other permission errors.
-- Run this in your Supabase SQL Editor.
-- ==============================================================================

-- 1. Grant usage and create on public schema
GRANT USAGE, CREATE ON SCHEMA public TO anon, authenticated, service_role, postgres;

-- 2. Grant all privileges on all existing tables in public schema
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role, postgres;

-- 3. Grant all privileges on all existing sequences (for auto-increment IDs)
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role, postgres;

-- 4. Grant all privileges on all routines / functions
GRANT ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role, postgres;

-- 5. Set default privileges so any future tables created also have full access
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role, postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role, postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role, postgres;

-- 6. Also ensure RLS is disabled across all tables
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

-- 7. Reload Supabase PostgREST cache immediately
NOTIFY pgrst, 'reload schema';
