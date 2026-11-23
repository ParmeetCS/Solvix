-- Installation module now stores everything in the database.
-- Run this once in the Supabase SQL editor if you set up the database before this patch
-- (it is already included in solvix_schema.sql). Safe to run more than once.
alter table installations add column if not exists verified_serials text[] not null default '{}';
alter table installations add column if not exists system_type text default 'on-grid';
alter table installations add column if not exists site_address text;
alter table installations add column if not exists planned_installation_date date;
alter table installations add column if not exists expected_completion_date date;
alter table installations add column if not exists equipment_verified boolean default false;
alter table installations add column if not exists equipment_verification_notes text;
alter table installations add column if not exists exception_recorded boolean default false;
alter table installations add column if not exists exception_notes text;
alter table installations add column if not exists commissioning_data jsonb default '{}'::jsonb;
alter table installations add column if not exists notes text;
notify pgrst, 'reload schema';
