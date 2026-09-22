-- CampGrids administrator tool
-- ============================================================================
--
-- One script for every administrator problem: adding one, fixing one that cannot
-- sign in, and finding out why. Paste the whole file into the Supabase SQL editor
-- (Dashboard -> SQL Editor -> New query) and run it.
--
-- Edit only the block marked EDIT THIS. Nothing else needs changing.
--
--   v_action = 'check'   Report on the account. Changes nothing. Start here.
--   v_action = 'create'  Create the administrator, or promote an existing account.
--   v_action = 'reset'   Fix an administrator who cannot get in. Clears the
--                        password, reactivates, clears a stuck half-accepted
--                        invitation, ends open sessions, and re-arms the
--                        set-password email.
--
-- No password is ever set or printed. CampGrids accounts are passwordless by
-- design: the person receives a set-password link by email and chooses their own.
-- After 'create' or 'reset', send that email from the admin workspace
-- (People -> Resend invite) or from Authentication -> Users -> Send invitation.
--
-- Safe to run more than once. 'create' on an existing administrator behaves as
-- 'reset' rather than failing.

do $$
declare
  -- ======================== EDIT THIS ========================
  v_action     text := 'check';                          -- 'check' | 'create' | 'reset'
  v_email      text := 'dnadar@hawk.illinoistech.edu';
  v_first      text := 'Danish';
  v_last       text := 'Nadar';
  v_department text := 'MSI Camps';
  -- ===========================================================

  v_user_id    uuid;
  v_username   text;
  v_base       text;
  v_suffix     int := 0;
  v_existed    boolean;
  v_note       text := '';
begin
  v_email := lower(trim(v_email));
  if v_email = '' or position('@' in v_email) = 0 then
    raise exception 'Set v_email to a real address.';
  end if;
  if v_action not in ('check', 'create', 'reset') then
    raise exception 'v_action must be check, create or reset (got %).', v_action;
  end if;

  select id into v_user_id from auth.users where lower(email) = v_email;
  v_existed := v_user_id is not null;

  -- --------------------------------------------------------------------------
  -- check: report only
  -- --------------------------------------------------------------------------
  if v_action = 'check' then
    if not v_existed then
      raise notice 'No account uses %. Set v_action to create.', v_email;
    end if;
    return;
  end if;

  -- --------------------------------------------------------------------------
  -- create: make the login if it is missing
  --
  -- Written with no password and no confirmation, which is the state the
  -- invitation email expects. Supabase fills in the rest of auth.users from its
  -- own defaults, so only the columns that have no default are listed here.
  -- --------------------------------------------------------------------------
  if not v_existed then
    if v_action <> 'create' then
      raise exception 'No account uses %. Use v_action = create first.', v_email;
    end if;

    v_user_id := gen_random_uuid();
    insert into auth.users (
      id, instance_id, aud, role, email,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at
    ) values (
      v_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', v_email,
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      jsonb_build_object('first_name', v_first, 'last_name', v_last),
      now(), now()
    );

    insert into auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at)
    values (
      gen_random_uuid(), v_user_id, v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', v_email),
      'email', now(), now()
    );
    v_note := 'login created';
  else
    /* Reset, or create over an account that already exists. Clearing the password
       and the confirmation returns the account to the state an invitation can be
       sent into - the same stuck half-accepted case reopen_staff_invitation
       handles, done here directly so this script needs no migration applied. */
    update auth.users
    set encrypted_password = null,
        email_confirmed_at = null,
        invited_at         = now(),
        banned_until       = null,
        deleted_at         = null,
        updated_at         = now()
    where id = v_user_id;
    v_note := 'password cleared, invitation reopened';
  end if;

  -- --------------------------------------------------------------------------
  -- A username that is not already taken
  -- --------------------------------------------------------------------------
  select username into v_username from public.profiles where id = v_user_id;
  if v_username is null then
    v_base := lower(left(regexp_replace(v_first, '[^a-zA-Z0-9]', '', 'g'), 1)
                 || regexp_replace(v_last, '[^a-zA-Z0-9]', '', 'g'));
    if length(v_base) < 2 then v_base := 'admin'; end if;
    v_username := v_base;
    while exists (select 1 from public.profiles where username = v_username and id <> v_user_id) loop
      v_suffix := v_suffix + 1;
      v_username := v_base || v_suffix::text;
    end loop;
  end if;

  -- --------------------------------------------------------------------------
  -- The profile. must_change_password is what forces the set-password step and
  -- what keeps is_staff_2fa_verified false until it is done.
  -- --------------------------------------------------------------------------
  insert into public.profiles (id, role, email, username, first_name, last_name, is_active)
  values (v_user_id, 'admin', v_email, v_username, v_first, v_last, true)
  on conflict (id) do update
  set role       = 'admin',
      email      = excluded.email,
      username   = coalesce(public.profiles.username, excluded.username),
      first_name = excluded.first_name,
      last_name  = excluded.last_name,
      is_active  = true,
      updated_at = now();

  update public.profiles
  set must_change_password         = true,
      temporary_password_issued_at = null,
      password_invite_sent_at      = null
  where id = v_user_id;

  -- An administrator is not a camper; a leftover student row would contradict it.
  delete from public.student_profiles where user_id = v_user_id;

  insert into public.admin_profiles (user_id, department)
  values (v_user_id, v_department)
  on conflict (user_id) do update set department = excluded.department;

  -- Any session opened before this ran is no longer trustworthy.
  delete from public.staff_email_2fa_sessions where user_id = v_user_id;
  delete from public.staff_email_2fa_challenges where user_id = v_user_id;
  delete from auth.sessions where user_id = v_user_id;
  -- auth.refresh_tokens.user_id is varchar, not uuid, so it needs the cast.
  delete from auth.refresh_tokens where user_id = v_user_id::text;

  raise notice '% -> % (%), username %', v_email, v_action, v_note, v_username;
end $$;

-- ============================================================================
-- The report. Read this rather than trusting the notices above.
--
--   sign_in_ready      everything the portal checks before it will let them in
--   next_step          what to do now, in words
-- ============================================================================

with target as (select lower(trim('dnadar@hawk.illinoistech.edu')) as email)   -- keep in step with v_email
select
  p.email::text                                            as email,
  p.username::text                                         as username,
  p.role::text                                             as role,
  p.is_active                                              as active,
  (u.encrypted_password is not null
   and u.encrypted_password <> '')                         as has_password,
  u.email_confirmed_at is not null                         as email_confirmed,
  p.must_change_password                                   as must_set_password,
  (a.user_id is not null)                                  as has_admin_profile,
  (select count(*) from public.staff_email_2fa_sessions s
    where s.user_id = p.id and s.expires_at > now())       as open_sessions,
  (p.role = 'admin' and p.is_active and a.user_id is not null
   and not p.must_change_password
   and u.encrypted_password is not null)                   as sign_in_ready,
  case
    when p.id is null
      then 'No profile. Run this file with v_action = create.'
    when p.role <> 'admin'
      then 'Not an administrator. Run with v_action = create to promote.'
    when not p.is_active
      then 'Account is deactivated. Run with v_action = reset.'
    when a.user_id is null
      then 'Missing admin_profiles row. Run with v_action = create.'
    when p.must_change_password
      then 'Waiting on the set-password email. Send it from the admin workspace (People -> Resend invite), or Authentication -> Users -> Send invitation. Then open the link and choose a password.'
    when u.encrypted_password is null or u.encrypted_password = ''
      then 'No password set, but the account is not flagged for setup. Run with v_action = reset.'
    else 'Ready. Sign in at /admin/, then enter the emailed verification code.'
  end                                                      as next_step
from target t
left join public.profiles p on lower(p.email::text) = t.email
left join auth.users u on u.id = p.id
left join public.admin_profiles a on a.user_id = p.id;
