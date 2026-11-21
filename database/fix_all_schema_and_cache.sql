-- ==============================================================================
-- SOLVIX: Complete Schema Sync & PostgREST Cache Reload Script
-- Run this in your Supabase Project -> SQL Editor to resolve all schema errors in one go.
-- It is idempotent (safe to run multiple times) and will not delete any existing data.
-- ==============================================================================

-- 1. PROFILES TABLE FIXES
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_type text DEFAULT 'customer';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS department_requested text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS employee_id text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Update account_type constraint safely
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_account_type_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_account_type_check 
  CHECK (account_type IN ('customer', 'employee', 'admin'));

-- 2. CUSTOMERS TABLE FIXES
ALTER TABLE customers ADD COLUMN IF NOT EXISTS contact_name text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_name text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_type text DEFAULT 'residential';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- Synchronize contact_name and customer_name
UPDATE customers SET customer_name = contact_name WHERE customer_name IS NULL AND contact_name IS NOT NULL;
UPDATE customers SET contact_name = customer_name WHERE contact_name IS NULL AND customer_name IS NOT NULL;

-- 3. LEADS TABLE FIXES
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_source_check;
ALTER TABLE leads ADD CONSTRAINT leads_source_check 
  CHECK (source IN ('whatsapp','phone','website','walkin','referral','social_media','other'));

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_status_check 
  CHECK (status IN ('new','contacted','follow_up_required','qualified','survey_requested','proposal_sent','quotation_sent','negotiation','converted','lost','disqualified'));

ALTER TABLE leads ADD COLUMN IF NOT EXISTS customer_name text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS system_type text DEFAULT 'on-grid';
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_system_type_check;
ALTER TABLE leads ADD CONSTRAINT leads_system_type_check CHECK (system_type IN ('on-grid','off-grid','hybrid'));

ALTER TABLE leads ADD COLUMN IF NOT EXISTS expected_capacity_kw numeric(6,2);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS monthly_electricity_bill numeric(12,2);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS additional_requirements text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium';
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_priority_check;
ALTER TABLE leads ADD CONSTRAINT leads_priority_check CHECK (priority IN ('low','medium','high','urgent'));

ALTER TABLE leads ADD COLUMN IF NOT EXISTS lost_reason text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- 4. FOLLOW_UPS TABLE FIXES
ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS follow_up_type text DEFAULT 'phone_call';
ALTER TABLE follow_ups DROP CONSTRAINT IF EXISTS follow_ups_follow_up_type_check;
ALTER TABLE follow_ups ADD CONSTRAINT follow_ups_follow_up_type_check 
  CHECK (follow_up_type IN ('phone_call','whatsapp','email','meeting','other'));

-- 5. WHATSAPP ENQUIRIES TABLE
CREATE TABLE IF NOT EXISTS whatsapp_enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_name text NOT NULL,
  phone text NOT NULL,
  message text NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','in_conversation','converted_to_lead','resolved','spam')),
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

-- RLS for whatsapp_enquiries
ALTER TABLE whatsapp_enquiries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS whatsapp_enquiries_all ON whatsapp_enquiries;
CREATE POLICY whatsapp_enquiries_all ON whatsapp_enquiries FOR ALL USING (true) WITH CHECK (true);

-- 6. ENSURE LEAD ASSIGNMENTS TABLE EXISTS
CREATE TABLE IF NOT EXISTS lead_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  assigned_to uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  notes text
);

-- 7. ENSURE CUSTOMER INTERACTIONS TABLE EXISTS
CREATE TABLE IF NOT EXISTS customer_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  interaction_type text NOT NULL DEFAULT 'call'
    CHECK (interaction_type IN ('call','email','meeting','site_visit','whatsapp','other')),
  subject text NOT NULL,
  summary text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 8. DISPATCHES TABLE (Safety fix for created_by)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'dispatches') THEN
    ALTER TABLE dispatches ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 9. REFRESH SUPABASE SCHEMA CACHE
-- Forces Supabase PostgREST cache to reload immediately and recognize the new columns
NOTIFY pgrst, 'reload schema';
