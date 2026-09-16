-- Passwordless provisioning for staff.
--
-- Replaces the deterministic temporary password from
-- 20260914_zz_deterministic_temp_passwords.sql. An account is now created with no
-- password at all, and the person sets their own by following an emailed link. That
-- removes the weakness of the previous approach: a password derived from a name and
-- a timestamp was predictable to anyone who had read the repository, and it existed
-- in chat logs, spreadsheets, and CSV reports on its way to the recipient.
--
-- A null encrypted_password means Supabase Auth refuses every password sign-in for
-- that account, so the emailed link is the only way in. email_confirmed_at is set
-- because Auth will not send a recovery email to an unconfirmed address.
--
-- Students are deliberately untouched. provision-students already creates them
-- without a password, against a synthetic address (username@students.campgrids.local)
-- that cannot receive mail, and campers sign in with a class code and username. There
-- is no student password to reset and no student inbox to reset it through.

-- ---------------------------------------------------------------------------
-- 1. Record when the set-password link was last sent
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists password_invite_sent_at timestamptz;

comment on column public.profiles.password_invite_sent_at is
  'When the set-password email was last sent. Used to show progress and to rate-limit resends.';

-- ---------------------------------------------------------------------------
-- 2. Create an account with no password
--
--    auth.users is written directly because there is no SQL equivalent of the
--    admin createUser API. The browser sends the set-password email afterwards
--    with resetPasswordForEmail, which needs no service-role key and no deployed
--    Edge Function.
-- ---------------------------------------------------------------------------

create or replace function public.provision_user_pending_password(
  p_email text,
  p_first_name text,
  p_last_name text,
  p_role public.user_role default 'teacher',
  p_username text default null,
  p_department text default null,
  p_title text default null
)
returns table (
  account_email text,
  account_username text,
  account_role public.user_role,
  change_required boolean,
  was_created boolean
)
language plpgsql security definer set search_path = public, auth, extensions as $$
declare
  normalized_email text := lower(trim(p_email));
  target_id uuid;
  existing_id uuid;
  resolved_username text;
  created boolean := false;
begin
  if not (public.is_admin() or auth.role() = 'service_role' or current_setting('request.jwt.claim.role', true) = 'service_role') then
    raise exception 'Only MSI administrators can provision accounts';
  end if;
  if normalized_email is null or normalized_email = '' or position('@' in normalized_email) = 0 then
    raise exception 'A valid work email address is required';
  end if;
  if coalesce(trim(p_first_name), '') = '' or coalesce(trim(p_last_name), '') = '' then
    raise exception 'A first and last name are required';
  end if;
  -- A staff account has to be reachable by email, because the emailed link is now
  -- the only way it can ever be signed into.
  if normalized_email like '%@students.campgrids.local' then
    raise exception 'That is an internal camper address and cannot receive mail. Use a real work email address.';
  end if;
  if p_role = 'student' then
    raise exception 'Campers are provisioned by the roster import and sign in with a class code and username, without a password.';
  end if;

  select id into existing_id from auth.users where lower(auth.users.email) = normalized_email;

  if existing_id is null then
    target_id := gen_random_uuid();
    created := true;
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', target_id, 'authenticated', 'authenticated',
      normalized_email,
      -- No password. Every password sign-in for this account is refused until the
      -- person sets one through the emailed link.
      null,
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object(
        'first_name', trim(p_first_name),
        'last_name', trim(p_last_name),
        'username', nullif(lower(regexp_replace(coalesce(p_username, ''), '[^a-zA-Z0-9]', '', 'g')), '')
      ),
      '', '', '', ''
    );
    insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
    values (
      normalized_email, target_id,
      jsonb_build_object('sub', target_id::text, 'email', normalized_email, 'email_verified', true, 'phone_verified', false),
      'email', now(), now()
    );
  else
    -- Re-running this on an existing account clears its password, which is what a
    -- lockout recovery needs: the old password stops working and the only way back
    -- in is the fresh emailed link.
    target_id := existing_id;
    update auth.users
    set encrypted_password = null, updated_at = now()
    where id = target_id;
  end if;

  -- protect_profile_identity() only generates a login name for administrators, so
  -- every other role needs one resolved here. generate_available_username appends a
  -- numeral on collision (dnadar, dnadar1, dnadar2...).
  resolved_username := nullif(lower(regexp_replace(coalesce(p_username, ''), '[^a-zA-Z0-9]', '', 'g')), '');
  if resolved_username is null then
    select pr.username::text into resolved_username from public.profiles pr where pr.id = target_id;
  end if;
  if resolved_username is null then
    resolved_username := public.generate_available_username(trim(p_first_name), trim(p_last_name), target_id);
  end if;

  insert into public.profiles (id, role, email, first_name, last_name)
  values (target_id, p_role, normalized_email, trim(p_first_name), trim(p_last_name))
  on conflict (id) do nothing;

  update public.profiles
  set first_name = trim(p_first_name),
      last_name  = trim(p_last_name),
      email      = normalized_email,
      role       = p_role,
      is_active  = true,
      username   = resolved_username,
      must_change_password         = true,
      temporary_password_issued_at = null
  where id = target_id;

  delete from public.student_profiles where student_profiles.user_id = target_id;

  if p_role = 'teacher' then
    insert into public.teacher_profiles (user_id, title, must_change_password, temporary_password_issued_at)
    values (target_id, nullif(trim(p_title), ''), true, null)
    on conflict (user_id) do update
      set title = coalesce(excluded.title, teacher_profiles.title),
          must_change_password = true,
          temporary_password_issued_at = null;
  elsif p_role = 'admin' then
    insert into public.admin_profiles (user_id, department)
    values (target_id, coalesce(nullif(trim(p_department), ''), 'MSI Camps'))
    on conflict (user_id) do update set department = excluded.department;
  end if;

  return query select normalized_email, resolved_username, p_role, true, created;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Record that the link went out
--
--    The browser sends the email, so it reports back here. Kept separate from
--    provisioning because a resend must be possible without touching the account.
-- ---------------------------------------------------------------------------

create or replace function public.note_password_invite_sent(p_email text)
returns timestamptz
language plpgsql security definer set search_path = public as $$
declare
  sent_at timestamptz := now();
begin
  if not (public.is_admin() or auth.role() = 'service_role' or current_setting('request.jwt.claim.role', true) = 'service_role') then
    raise exception 'Only MSI administrators can record invitations';
  end if;
  update public.profiles
  set password_invite_sent_at = sent_at
  where email = lower(trim(p_email));
  if not found then raise exception 'No CampGrids account for %', p_email; end if;
  return sent_at;
end;
$$;

-- Staff awaiting their first password, so an administrator can chase them up.
create or replace function public.staff_awaiting_password()
returns table (
  account_email text,
  account_username text,
  account_role public.user_role,
  full_name text,
  invite_sent_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select p.email::text, p.username::text, p.role,
         (p.first_name || ' ' || p.last_name),
         p.password_invite_sent_at
  from public.profiles p
  where public.is_admin()
    and p.role in ('teacher', 'admin')
    and p.must_change_password
  order by p.password_invite_sent_at nulls first, p.last_name
$$;

-- ---------------------------------------------------------------------------
-- 4. The deterministic temporary password is withdrawn
--
--    Dropped rather than left in place, so nothing can keep issuing a guessable
--    password by accident. complete_password_setup, my_password_state and
--    is_staff_2fa_verified from the previous migration are unchanged and still do
--    the work of gating access until a personal password exists.
-- ---------------------------------------------------------------------------

drop function if exists public.provision_user_with_temp_password(text, text, text, public.user_role, text, text, text);
drop function if exists public.current_temp_password(text);
drop function if exists public.temp_password_for(text, text, timestamptz);
drop function if exists public.temp_password_token(text, text);

-- ---------------------------------------------------------------------------
-- 5. Access
-- ---------------------------------------------------------------------------

grant execute on function public.provision_user_pending_password(text, text, text, public.user_role, text, text, text) to authenticated;
grant execute on function public.note_password_invite_sent(text) to authenticated;
grant execute on function public.staff_awaiting_password() to authenticated;

notify pgrst, 'reload schema';
