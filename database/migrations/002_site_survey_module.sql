-- ==============================================================================
-- Migration: 002_site_survey_module.sql
-- Description: Enhances site survey, assignment, photos, reports & approval tables
--              to fulfill SOLVIX Site Survey and Solar Feasibility Module.
-- ==============================================================================

-- 1. Extend site_surveys table
ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending','assigned','scheduled','in_progress','submitted','approved','rejected','revisit_required'));

ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium'
  CHECK (priority IN ('low','medium','high','urgent'));

ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS scheduled_date date;
ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS scheduled_time text;

-- Property & connection details
ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS property_type text DEFAULT 'residential'
  CHECK (property_type IN ('residential','commercial','industrial','agricultural','institutional','other'));

ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS electricity_connection_type text DEFAULT 'single_phase'
  CHECK (electricity_connection_type IN ('single_phase','three_phase','lt','ht','other'));

ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS monthly_electricity_bill numeric(12,2);
ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS sanctioned_load_kw numeric(6,2);
ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS consumer_number text;
ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS meter_number text;
ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS site_address text;
ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS pincode text;

-- Roof assessment details
ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS roof_type text DEFAULT 'rcc_flat'
  CHECK (roof_type IN ('rcc_flat','metal_sheet','tiled','asbestos','shed','curved','ground','other'));

ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS available_installation_area_sqm numeric(10,2);
ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS roof_condition text DEFAULT 'good'
  CHECK (roof_condition IN ('excellent','good','fair','needs_repair','unsuitable'));

ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS structural_concerns text;

-- Electrical assessment details
ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS grid_availability text DEFAULT 'stable'
  CHECK (grid_availability IN ('stable','frequent_outages','highly_intermittent','off_grid'));

ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS existing_meter_info text;
ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS main_panel_condition text DEFAULT 'good'
  CHECK (main_panel_condition IN ('good','acceptable','aged_needs_upgrade','dangerous'));

ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS earthing_availability text DEFAULT 'adequate'
  CHECK (earthing_availability IN ('adequate','inadequate','not_available','dedicated_needed'));

ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS other_technical_observations text;

-- Installation feasibility & recommendations
ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS estimated_usable_area_sqm numeric(10,2);
ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS recommended_capacity_kw numeric(6,2);
ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS recommended_system_type text DEFAULT 'on-grid'
  CHECK (recommended_system_type IN ('on-grid','off-grid','hybrid'));

ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS potential_constraints text;
ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS additional_requirements text;

-- Form draft & completion tracking
ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS is_draft boolean NOT NULL DEFAULT false;
ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS draft_data jsonb;
ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS surveyor_notes text;
ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS revisit_notes text;

-- 2. Extend survey_assignments table
ALTER TABLE survey_assignments ADD COLUMN IF NOT EXISTS status text DEFAULT 'assigned'
  CHECK (status IN ('assigned','rescheduled','completed','cancelled'));

ALTER TABLE survey_assignments ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;
ALTER TABLE survey_assignments ADD COLUMN IF NOT EXISTS notes text;

-- 3. Extend survey_photos table
ALTER TABLE survey_photos ADD COLUMN IF NOT EXISTS file_name text;
ALTER TABLE survey_photos ADD COLUMN IF NOT EXISTS file_size_bytes bigint;
ALTER TABLE survey_photos ADD COLUMN IF NOT EXISTS file_type text;
ALTER TABLE survey_photos ADD COLUMN IF NOT EXISTS description text;

-- 4. Extend survey_reports table
ALTER TABLE survey_reports ADD COLUMN IF NOT EXISTS executive_summary text;
ALTER TABLE survey_reports ADD COLUMN IF NOT EXISTS feasibility_rating text DEFAULT 'feasible'
  CHECK (feasibility_rating IN ('feasible','partially_feasible','not_feasible','requires_special_engineering'));

ALTER TABLE survey_reports ADD COLUMN IF NOT EXISTS shading_assessment text;
ALTER TABLE survey_reports ADD COLUMN IF NOT EXISTS electrical_assessment text;
ALTER TABLE survey_reports ADD COLUMN IF NOT EXISTS installation_constraints text;
ALTER TABLE survey_reports ADD COLUMN IF NOT EXISTS calculation_assumptions text;

-- 5. Extend survey_approvals table
ALTER TABLE survey_approvals DROP CONSTRAINT IF EXISTS survey_approvals_status_check;
ALTER TABLE survey_approvals ADD CONSTRAINT survey_approvals_status_check
  CHECK (status IN ('pending','approved','rejected','revision_requested','revisit_required'));

-- 6. Indexes for survey querying and scheduling
CREATE INDEX IF NOT EXISTS idx_site_surveys_status ON site_surveys(status);
CREATE INDEX IF NOT EXISTS idx_site_surveys_priority ON site_surveys(priority);
CREATE INDEX IF NOT EXISTS idx_site_surveys_assigned_to ON site_surveys(assigned_to);
CREATE INDEX IF NOT EXISTS idx_site_surveys_scheduled_date ON site_surveys(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_survey_assignments_assigned_to ON survey_assignments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_survey_assignments_survey ON survey_assignments(survey_id);

-- 7. Supabase Storage bucket for survey documents and photos
-- Bucket name: 'survey-attachments' (private, authenticated)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'survey-attachments',
  'survey-attachments',
  false,
  10485760, -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760;

-- Storage RLS policies:
-- Only authenticated users with survey, sales, or admin role can access survey files
DROP POLICY IF EXISTS "Survey files viewable by authorized employees" ON storage.objects;
CREATE POLICY "Survey files viewable by authorized employees"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'survey-attachments'
  AND auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Survey files uploadable by survey engineers and admins" ON storage.objects;
CREATE POLICY "Survey files uploadable by survey engineers and admins"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'survey-attachments'
  AND auth.role() = 'authenticated'
);
