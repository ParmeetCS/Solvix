-- ==============================================================================
-- SOLVIX: Installation, Technician Assignment & Project Execution Schema Update
-- Run this in your Supabase Project -> SQL Editor to update installation constraints and columns.
-- Idempotent and safe to run multiple times.
-- ==============================================================================

-- 1. EXPAND INSTALLATION STATUS CHECK CONSTRAINT
-- Allows all required prompt 9 statuses:
-- pending, assigned, scheduled, in_progress, on_hold, inspection_required, completed, cancelled, failed
DO $$
BEGIN
  ALTER TABLE installations DROP CONSTRAINT IF EXISTS installations_status_check;
  ALTER TABLE installations ADD CONSTRAINT installations_status_check 
    CHECK (status IN ('pending', 'assigned', 'scheduled', 'in_progress', 'on_hold', 'inspection_required', 'completed', 'cancelled', 'failed'));
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 2. ENHANCE INSTALLATIONS TABLE COLUMNS
ALTER TABLE installations ADD COLUMN IF NOT EXISTS system_type text DEFAULT 'on-grid';
ALTER TABLE installations ADD COLUMN IF NOT EXISTS site_address text;
ALTER TABLE installations ADD COLUMN IF NOT EXISTS planned_installation_date date;
ALTER TABLE installations ADD COLUMN IF NOT EXISTS expected_completion_date date;
ALTER TABLE installations ADD COLUMN IF NOT EXISTS equipment_verified boolean DEFAULT false;
ALTER TABLE installations ADD COLUMN IF NOT EXISTS equipment_verification_notes text;
ALTER TABLE installations ADD COLUMN IF NOT EXISTS exception_recorded boolean DEFAULT false;
ALTER TABLE installations ADD COLUMN IF NOT EXISTS exception_notes text;
ALTER TABLE installations ADD COLUMN IF NOT EXISTS commissioning_data jsonb DEFAULT '{}'::jsonb;
ALTER TABLE installations ADD COLUMN IF NOT EXISTS notes text;

-- 3. ENHANCE TECHNICIANS TABLE COLUMNS
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS full_name text;

-- 4. ENHANCE INSTALLATION TASKS TABLE COLUMNS
ALTER TABLE installation_tasks ADD COLUMN IF NOT EXISTS remarks text;
ALTER TABLE installation_tasks ADD COLUMN IF NOT EXISTS photo_storage_path text;
ALTER TABLE installation_tasks ADD COLUMN IF NOT EXISTS order_index integer DEFAULT 0;

-- 5. ENHANCE INSTALLATION PHOTOS TABLE COLUMNS
DO $$
BEGIN
  ALTER TABLE installation_photos DROP CONSTRAINT IF EXISTS installation_photos_photo_type_check;
  ALTER TABLE installation_photos ADD CONSTRAINT installation_photos_photo_type_check
    CHECK (photo_type IN ('pre_install', 'progress', 'completion', 'panel', 'inverter', 'earthing', 'wiring', 'other'));
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 6. REFRESH SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
