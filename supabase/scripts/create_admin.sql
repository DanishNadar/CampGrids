-- Create or promote one MSI administrator, and issue the deterministic temporary
-- password they will be forced to replace on first sign-in.
--
-- Safe to run on an email that does not exist yet (it is created), on one that
-- exists as a student (it is promoted), and on one that is already an admin (the
-- temporary password is reissued, which is what a lockout recovery needs).
--
-- Edit the three values in the DECLARE block, then run the whole file.
--
-- This script does not depend on 20260914_zz_deterministic_temp_passwords.sql. It
-- adds the two forced-change columns itself if they are missing, and inlines the
-- same password formula, so it works on a project where that migration has not been
-- applied yet. If the migration IS applied, prefer the one-liner:
--   select * from public.provision_user_with_temp_password(
--     p_email => '...', p_first_name => '...', p_last_name => '...', p_role => 'admin');

begin;

-- The SQL editor runs as postgres with no JWT. This marks the session as
-- service_role for any policy or helper that checks it, and puts pgcrypto's
-- crypt()/gen_salt() and the auth schema on the search path.
select set_config('request.jwt.claim.role', 'service_role', true);
select set_config('search_path', 'public, extensions, auth', true);

-- No-ops once the migration has been applied.
alter table public.profiles
  add column if not exists must_change_password boolean not null default false,
  add column if not exists temporary_password_issued_at timestamptz;

do $$
declare
  -- ---- edit these three ----
  v_email      text := 'dnadar@hawk.illinoistech.edu';
  v_first      text := 'Danish';
  v_last       text := 'Nadar';
  v_department text := 'MSI Camps';
  -- --------------------------
  v_issued   timestamptz := date_trunc('minute', now());
  v_password text;
  v_username text;
  v_id       uuid;
begin
  v_email := lower(trim(v_email));
  if position('@' in v_email) = 0 then
    raise exception 'That does not look like an email address: %', v_email;
  end if;

  -- Same formula as public.temp_password_for, inlined so this script stands alone.
  v_password := 'MSI-'
    || upper(left(coalesce(nullif(regexp_replace(v_first, '[^a-zA-Z]', '', 'g'), ''), 'X'), 1))
    || lower(coalesce(nullif(regexp_replace(v_last, '[^a-zA-Z]', '', 'g'), ''), 'user'))
    || '-' || to_char(v_issued at time zone 'UTC', 'YYYYMMDD-HH24MI');

  v_username := lower(
    left(regexp_replace(v_first, '[^a-zA-Z]', '', 'g'), 1)
    || regexp_replace(v_last, '[^a-zA-Z]', '', 'g')
  );

  select id into v_id from auth.users where lower(auth.users.email) = v_email;

  if v_id is null then
    v_id := gen_random_uuid();
    -- There is no SQL equivalent of the admin createUser API, so the row is written
    -- directly. Supabase Auth reads a bcrypt hash, which is what crypt(..., bf) makes.
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
      v_email, crypt(v_password, gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('first_name', v_first, 'last_name', v_last, 'username', v_username),
      '', '', '', ''
    );
    -- A password sign-in needs the matching email identity beside the user row.
    insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
    values (
      v_email, v_id,
      jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true, 'phone_verified', false),
      'email', now(), now()
    );
    raise notice 'Created % and issued temporary password %', v_email, v_password;
  else
    update auth.users
    set encrypted_password = crypt(v_password, gen_salt('bf')), updated_at = now()
    where id = v_id;
    raise notice 'Reissued temporary password % for existing account %', v_password, v_email;
  end if;

  -- on_auth_user_created already inserts a student profile for a new user. This is
  -- the safety net for an auth user that somehow has no profile row.
  insert into public.profiles (id, role, email, first_name, last_name)
  values (v_id, 'admin', v_email, v_first, v_last)
  on conflict (id) do nothing;

  update public.profiles
  set first_name = v_first,
      last_name  = v_last,
      email      = v_email,
      role       = 'admin',
      is_active  = true,
      username   = coalesce(profiles.username, v_username),
      must_change_password         = true,
      temporary_password_issued_at = v_issued
  where id = v_id;

  -- An administrator is not a camper.
  delete from public.student_profiles where student_profiles.user_id = v_id;

  insert into public.admin_profiles (user_id, department)
  values (v_id, coalesce(nullif(trim(v_department), ''), 'MSI Camps'))
  on conflict (user_id) do update set department = excluded.department;
end $$;

-- The password is recomputed from the stored issue time rather than kept anywhere.
select p.email,
       p.username,
       p.role,
       p.is_active,
       p.must_change_password as change_required_on_first_sign_in,
       a.department,
       'MSI-'
         || upper(left(regexp_replace(p.first_name, '[^a-zA-Z]', '', 'g'), 1))
         || lower(regexp_replace(p.last_name, '[^a-zA-Z]', '', 'g'))
         || '-' || to_char(p.temporary_password_issued_at at time zone 'UTC', 'YYYYMMDD-HH24MI')
         as temporary_password
from public.profiles p
join public.admin_profiles a on a.user_id = p.id
where p.email = lower('dnadar@hawk.illinoistech.edu');

commit;
