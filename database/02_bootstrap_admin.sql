-- ==============================================================================
-- SOLVIX - create the first Administrator
--
-- Run AFTER solvix_schema.sql.
--
-- 1. Supabase dashboard -> Authentication -> Users -> "Add user" -> "Create new user".
--    Enter the administrator's email and a strong password and tick "Auto Confirm User".
-- 2. Replace the email below with that same address and run this file.
--
-- Nothing here contains a password. Administrator accounts cannot be created
-- from the public sign-up forms; this script is the only way to make one.
-- ==============================================================================

insert into profiles (auth_user_id, email, full_name, account_type, role_id, is_active)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'full_name', 'Administrator'),
  'admin',
  (select id from roles where code = 'admin'),
  true
from auth.users u
where lower(u.email) = lower('parmeetsinghvirdi005@gmail.com')
on conflict (auth_user_id) do update
  set account_type = 'admin',
      role_id      = (select id from roles where code = 'admin'),
      is_active    = true;

-- Confirm exactly one row was created/updated:
select p.email, p.account_type, r.code as role
from profiles p
left join roles r on r.id = p.role_id
where lower(p.email) = lower('parmeetsinghvirdi005@gmail.com');

-- ------------------------------------------------------------------------------
-- Approving an employee (normally done in the Admin console -> Employees & Access).
-- An employee can only reach a dashboard after a department is assigned:
--
--   update profiles
--   set department_id = (select id from departments where code = 'SALES')
--   where lower(email) = lower('employee@company.com');
--
-- Department codes: SALES, SURVEY, INSTALLATION, WAREHOUSE, SUPPORT, FINANCE, SUBSIDY
-- ------------------------------------------------------------------------------
