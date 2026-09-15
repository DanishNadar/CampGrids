-- Deterministic temporary passwords and a forced password change that works for
-- every role, not only teachers.
--
-- SECURITY NOTE, read before using this in production.
-- A temporary password derived from a name and a timestamp is predictable to anyone
-- who knows the formula, and the formula is in this repository. It is therefore a
-- delivery convenience, not a secret. What keeps an account safe is the forced change:
-- profiles.must_change_password blocks every staff data path through
-- is_staff_2fa_verified until a personal password is chosen, and staff additionally
-- need an emailed one-time code. Hand these passwords over in person or through a
-- channel you trust, and do not widen the window between provisioning and first
-- sign-in. If you would rather have unguessable temporary passwords, the
-- provision-teachers Edge Function already issues random ones and this migration
-- leaves that path untouched.

-- ---------------------------------------------------------------------------
-- 1. The forced-change flags belong to every account, not just teachers
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists must_change_password boolean not null default false,
  add column if not exists temporary_password_issued_at timestamptz;

-- Carry over anything already recorded against teachers so nobody who is mid-setup
-- loses their pending change.
update public.profiles p
set must_change_password = tp.must_change_password,
    temporary_password_issued_at = tp.temporary_password_issued_at
from public.teacher_profiles tp
where tp.user_id = p.id
  and tp.must_change_password
  and not p.must_change_password;

-- ---------------------------------------------------------------------------
-- 2. The deterministic password
--
--    Shape: MSI-Dnadar-20260914-1432
--    name token + issue date + issue time, so an administrator can recompute a
--    password from data that is already stored rather than having to keep a copy.
--    The timestamp is pinned to UTC, otherwise the same account would produce a
--    different password depending on the session time zone.
-- ---------------------------------------------------------------------------

create or replace function public.temp_password_token(p_first_name text, p_last_name text)
returns text language sql immutable set search_path = public as $$
  select upper(left(coalesce(nullif(regexp_replace(coalesce(p_first_name, ''), '[^a-zA-Z]', '', 'g'), ''), 'X'), 1))
      || lower(coalesce(nullif(regexp_replace(coalesce(p_last_name, ''), '[^a-zA-Z]', '', 'g'), ''), 'user'))
$$;

comment on function public.temp_password_token(text, text) is
  'First initial plus surname, letters only: Danish Nadar -> Dnadar.';

create or replace function public.temp_password_for(
  p_first_name text,
  p_last_name text,
  p_issued timestamptz
)
returns text language sql immutable set search_path = public as $$
  select 'MSI-'
    || public.temp_password_token(p_first_name, p_last_name)
    || '-'
    || to_char(p_issued at time zone 'UTC', 'YYYYMMDD-HH24MI')
$$;

comment on function public.temp_password_for(text, text, timestamptz) is
  'Deterministic temporary password. Predictable by design; safety comes from the forced change.';

-- Look up the temporary password an existing account was given, for an
-- administrator re-reading it off the record instead of storing it anywhere.
create or replace function public.current_temp_password(p_email text)
returns text language plpgsql stable security definer set search_path = public as $$
declare
  row_data record;
begin
  if not (public.is_admin() or auth.role() = 'service_role' or current_setting('request.jwt.claim.role', true) = 'service_role') then
    raise exception 'Only MSI administrators can read temporary passwords';
  end if;
  select first_name, last_name, must_change_password, temporary_password_issued_at
  into row_data
  from public.profiles where email = lower(p_email);
  if row_data is null then raise exception 'No CampGrids account for %', p_email; end if;
  if not row_data.must_change_password or row_data.temporary_password_issued_at is null then
    return null;  -- a personal password is already in place
  end if;
  return public.temp_password_for(row_data.first_name, row_data.last_name, row_data.temporary_password_issued_at);
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Provision one account with that password
--
--    auth.users is written directly because there is no SQL equivalent of the
--    admin createUser API. pgcrypto's bcrypt hash is the format Supabase Auth
--    reads, so a password set this way works for a normal sign-in. The existing
--    on_auth_user_created trigger creates the profile as a student, so the role
--    is corrected afterwards the same way the setAdmin script does it by hand.
-- ---------------------------------------------------------------------------

create or replace function public.provision_user_with_temp_password(
  p_email text,
  p_first_name text,
  p_last_name text,
  p_role public.user_role default 'teacher',
  p_username text default null,
  p_department text default null,
  p_grade text default null
)
returns table (account_email text, account_username text, account_role public.user_role, temporary_password text, change_required boolean)
language plpgsql security definer set search_path = public, auth, extensions as $$
declare
  normalized_email text := lower(trim(p_email));
  issued timestamptz := date_trunc('minute', now());
  password_value text;
  target_id uuid;
  existing_id uuid;
begin
  if not (public.is_admin() or auth.role() = 'service_role' or current_setting('request.jwt.claim.role', true) = 'service_role') then
    raise exception 'Only MSI administrators can provision accounts';
  end if;
  if normalized_email is null or normalized_email = '' or position('@' in normalized_email) = 0 then
    raise exception 'A valid email address is required';
  end if;
  if coalesce(trim(p_first_name), '') = '' or coalesce(trim(p_last_name), '') = '' then
    raise exception 'A first and last name are required';
  end if;

  password_value := public.temp_password_for(p_first_name, p_last_name, issued);

  select id into existing_id from auth.users where lower(auth.users.email) = normalized_email;

  if existing_id is null then
    target_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', target_id, 'authenticated', 'authenticated',
      normalized_email, extensions.crypt(password_value, extensions.gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object(
        'first_name', trim(p_first_name),
        'last_name', trim(p_last_name),
        'username', nullif(lower(regexp_replace(coalesce(p_username, ''), '[^a-zA-Z0-9]', '', 'g')), ''),
        'grade', p_grade
      ),
      '', '', '', ''
    );
    -- Password sign-in needs the matching email identity alongside the user row.
    insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
    values (
      normalized_email, target_id,
      jsonb_build_object('sub', target_id::text, 'email', normalized_email, 'email_verified', true, 'phone_verified', false),
      'email', now(), now()
    );
  else
    -- Re-provisioning an existing account resets it to a fresh temporary password
    -- rather than failing, which is what a lockout recovery needs.
    target_id := existing_id;
    update auth.users
    set encrypted_password = extensions.crypt(password_value, extensions.gen_salt('bf')),
        updated_at = now()
    where id = target_id;
  end if;

  -- The trigger inserts a student profile. Correct it to the requested role.
  update public.profiles
  set first_name = trim(p_first_name),
      last_name = trim(p_last_name),
      email = normalized_email,
      role = p_role,
      is_active = true,
      must_change_password = true,
      temporary_password_issued_at = issued,
      username = coalesce(
        nullif(lower(regexp_replace(coalesce(p_username, ''), '[^a-zA-Z0-9]', '', 'g')), ''),
        profiles.username
      )
  where id = target_id;

  if p_role <> 'student' then
    delete from public.student_profiles where student_profiles.user_id = target_id;
  end if;

  if p_role = 'teacher' then
    insert into public.teacher_profiles (user_id, must_change_password, temporary_password_issued_at)
    values (target_id, true, issued)
    on conflict (user_id) do update
      set must_change_password = true, temporary_password_issued_at = issued;
  elsif p_role = 'admin' then
    insert into public.admin_profiles (user_id, department)
    values (target_id, coalesce(nullif(trim(p_department), ''), 'MSI Camps'))
    on conflict (user_id) do update set department = excluded.department;
  elsif p_role = 'student' then
    insert into public.student_profiles (user_id, grade)
    values (target_id, p_grade)
    on conflict (user_id) do update set grade = coalesce(excluded.grade, student_profiles.grade);
  end if;

  return query
    select normalized_email,
           (select pr.username::text from public.profiles pr where pr.id = target_id),
           p_role,
           password_value,
           true;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Finishing the change, for any role
-- ---------------------------------------------------------------------------

create or replace function public.complete_password_setup()
returns boolean language plpgsql security definer set search_path = public as $$
declare
  changed boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Sign in before completing password setup';
  end if;
  -- The teacher trigger refuses changes to its flag unless this marker is set.
  perform set_config('app.teacher_password_setup', 'true', true);

  update public.profiles
  set must_change_password = false, temporary_password_issued_at = null
  where id = auth.uid() and must_change_password;
  changed := found;

  update public.teacher_profiles
  set must_change_password = false, temporary_password_issued_at = null
  where user_id = auth.uid() and must_change_password;

  return changed;
end;
$$;

-- Kept so the existing settings.js call keeps working during rollout.
create or replace function public.complete_teacher_password_setup()
returns boolean language plpgsql security definer set search_path = public as $$
begin
  return public.complete_password_setup();
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. A pending password change blocks staff access for admins too
--
--    The previous version only looked at teacher_profiles, so an administrator
--    holding a temporary password reached every administrative control.
-- ---------------------------------------------------------------------------

create or replace function public.is_staff_2fa_verified()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(exists (
    select 1
    from public.profiles p
    join public.staff_email_2fa_sessions s on s.user_id = p.id
    where p.id = auth.uid()
      and p.role in ('teacher', 'admin')
      and p.is_active
      and not p.must_change_password
      and (p.role <> 'teacher' or not exists (
        select 1 from public.teacher_profiles tp
        where tp.user_id = p.id and tp.must_change_password
      ))
      and s.session_id::text = coalesce(auth.jwt() ->> 'session_id', '')
      and lower(s.email::text) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and s.expires_at > now()
  ), false)
$$;

-- Any signed-in account may read its own pending-change state so the sign-in
-- pages can route to the password form.
create or replace function public.my_password_state()
returns table (change_required boolean, issued_at timestamptz, account_role public.user_role)
language sql stable security definer set search_path = public as $$
  select p.must_change_password, p.temporary_password_issued_at, p.role
  from public.profiles p where p.id = auth.uid()
$$;

-- ---------------------------------------------------------------------------
-- 6. Access
-- ---------------------------------------------------------------------------

grant execute on function public.temp_password_token(text, text) to authenticated;
grant execute on function public.temp_password_for(text, text, timestamptz) to authenticated;
grant execute on function public.current_temp_password(text) to authenticated;
grant execute on function public.provision_user_with_temp_password(text, text, text, public.user_role, text, text, text) to authenticated;
grant execute on function public.complete_password_setup() to authenticated;
grant execute on function public.my_password_state() to authenticated;

notify pgrst, 'reload schema';
