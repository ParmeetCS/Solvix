-- ==============================================================================
-- Migration: 001_crm_sales_module.sql
-- Description: Adds CRM/Sales enhancements to leads, follow_ups, and adds
--              whatsapp_enquiries table while strictly preserving existing schema.
-- ==============================================================================

-- 1. Extend lead sources constraint if needed
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_source_check;
ALTER TABLE leads ADD CONSTRAINT leads_source_check 
  CHECK (source IN ('whatsapp','phone','website','walkin','referral','social_media','other'));

-- 2. Extend lead status constraint
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_status_check 
  CHECK (status IN ('new','contacted','follow_up_required','qualified','survey_requested','proposal_sent','quotation_sent','negotiation','converted','lost','disqualified'));

-- 3. Add CRM specific columns to leads table (preserving all existing columns)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS customer_name text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS system_type text DEFAULT 'on-grid' CHECK (system_type IN ('on-grid','off-grid','hybrid'));
ALTER TABLE leads ADD COLUMN IF NOT EXISTS expected_capacity_kw numeric(6,2);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS monthly_electricity_bill numeric(12,2);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS additional_requirements text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent'));
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lost_reason text;

-- 4. Extend follow-up types
ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS follow_up_type text DEFAULT 'phone_call' 
  CHECK (follow_up_type IN ('phone_call','whatsapp','email','meeting','other'));

-- 5. WhatsApp Enquiries Table
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_priority ON leads(priority);
CREATE INDEX IF NOT EXISTS idx_follow_ups_status_sched ON follow_ups(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_enquiries_phone ON whatsapp_enquiries(phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_enquiries_lead ON whatsapp_enquiries(lead_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_enquiries_status ON whatsapp_enquiries(status);

-- RLS for whatsapp_enquiries
ALTER TABLE whatsapp_enquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS whatsapp_enquiries_read ON whatsapp_enquiries;
CREATE POLICY whatsapp_enquiries_read ON whatsapp_enquiries FOR SELECT USING (
  auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS whatsapp_enquiries_write ON whatsapp_enquiries;
CREATE POLICY whatsapp_enquiries_write ON whatsapp_enquiries FOR ALL USING (
  auth.uid() IS NOT NULL
) WITH CHECK (
  auth.uid() IS NOT NULL
);
