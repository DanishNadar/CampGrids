-- CampGrids administrator tool
-- ============================================================================
--
-- One file for every administrator problem: adding one, giving one a password,
-- repairing one who cannot sign in, and finding out what is actually wrong.
--
-- Paste the whole file into the Supabase SQL editor (SQL Editor -> New query) and
-- run it. Edit only the block marked EDIT THIS.
--
--   v_action = 'check'       Report on the account. Changes nothing. Start here.
--
--   v_action = 'create'      Create the administrator, or promote an existing
--                            account. Set v_password to give them a password now;
--                            leave it blank to use the emailed set-password link.
--
--   v_action = 'password'    Set or replace the password on an existing account,
--                            and nothing else. This is the one to use when a
--                            password has stopped working.
--
--   v_action = 'repair'      For an administrator who cannot get in: reactivate,
--                            lift a ban, clear a stuck half-accepted invitation,
--                            re-create a missing admin_profiles row, and end every
--                            open session. Keeps an existing password.
--
--   v_action = 'deactivate'  Block every sign-in at once, keeping the record.
--
-- IMPORTANT: no action removes a working password unless you ask for it. The
-- previous version of this script cleared encrypted_password on every run, which
-- is what made a password appear to be "forgotten" after each use. Only 'password'
-- replaces one, and only 'repair' with v_force_passwordless = true removes one.
--
-- Safe to run repeatedly. 'create' on an existing administrator repairs it rather
-- than failing.

do $$
declare
  -- ======================== EDIT THIS ========================
  v_action     text := 'check';         -- check | create | password | repair | deactivate
  v_email      text := 'dnadar@hawk.illinoistech.edu';
  v_first      text := 'Danish';
  v_last       text := 'Nadar';
  v_department text := 'MSI Camps';

  -- Only read by 'create' and 'password'. Minimum 12 characters, matching the
  -- rule the application enforces. Leave blank to keep the account passwordless
  -- and use the emailed set-password link instead.
  v_password   text := '';

  -- Only read by 'repair'. Deliberately separate: removing a password locks the
  -- person out until they follow an email, so it must be asked for, not implied.
  v_force_passwordless boolean := false;
  -- ===========================================================

  v_user_id   uuid;
  v_username  text;
  v_base      text;
  v_suffix    int := 0;
  v_had_pw    boolean;
  v_created   boolean := false;
  v_note      text := '';
begin
  v_email := lower(btrim(v_email));
  if v_email = '' or position('@' in v_email) = 0 then
    raise exception 'Set v_email to a real address.';
  end if;
  if v_action not in ('check', 'create', 'password', 'repair', 'deactivate') then
    raise exception 'v_action must be check, create, password, repair or deactivate (got %).', v_action;
  end if;
  if v_password <> '' and char_length(v_password) < 12 then
    raise exception 'v_password must be at least 12 characters, to match the rule the application enforces.';
  end if;
  if v_action = 'password' and v_password = '' then
    raise exception 'v_action = password needs v_password set.';
  end if;

  select u.id, (u.encrypted_password is not null and u.encrypted_password <> '')
    into v_user_id, v_had_pw
  from auth.users u where lower(u.email) = v_email;

  -- ------------------------------------------------------------------ check --
  if v_action = 'check' then
    if v_user_id is null then
      raise notice 'No account uses %. Set v_action to create.', v_email;
    end if;
    return;
  end if;

  if v_user_id is null and v_action <> 'create' then
    raise exception 'No account uses %. Use v_action = create first.', v_email;
  end if;

  -- ----------------------------------------------------------------- create --
  -- Only the columns without a usable default are listed; Supabase fills the rest.
  if v_user_id is null then
    v_user_id := gen_random_uuid();
    /* confirmation_token, recovery_token, email_change_token_new and email_change
       have no column default, so a hand-written insert leaves them NULL - and the
       Auth service reads them into non-nullable strings. A NULL there does not
       fail the insert; it makes every later sign-in for that address answer
       "500 Database error querying schema", including with the wrong password,
       because the row cannot be read at all. Every account Supabase creates itself
       carries '' in all four. Verified against this project. */
    insert into auth.users (
      id, instance_id, aud, role, email,
      encrypted_password, email_confirmed_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values (
      v_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', v_email,
      case when v_password = '' then null
           else extensions.crypt(v_password, extensions.gen_salt('bf', 10)) end,
      -- A password given here means the account is usable immediately, so the
      -- address is confirmed. Without one the invitation confirms it instead, and
      -- pre-confirming would make Auth refuse to send that invitation at all.
      case when v_password = '' then null else now() end,
      '', '', '', '',
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
    v_created := true;
    v_had_pw := v_password <> '';
    v_note := case when v_password = '' then 'login created, awaiting the set-password email'
                   else 'login created with the password supplied' end;
  end if;

  -- --------------------------------------------------------------- password --
  if v_password <> '' and not v_created then
    update auth.users
    set encrypted_password = extensions.crypt(v_password, extensions.gen_salt('bf', 10)),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        banned_until       = null,
        -- Heals a row written by an older version of this script, which left these
        -- NULL and made the account unreadable to the Auth service.
        confirmation_token     = coalesce(confirmation_token, ''),
        recovery_token         = coalesce(recovery_token, ''),
        email_change_token_new = coalesce(email_change_token_new, ''),
        email_change           = coalesce(email_change, ''),
        updated_at         = now()
    where id = v_user_id;
    v_had_pw := true;
    v_note := 'password set';
  end if;

  -- ----------------------------------------------------------------- repair --
  if v_action = 'repair' then
    update auth.users
    set banned_until = null,
        deleted_at   = null,
        -- A confirmed address with no password is the stuck half-accepted
        -- invitation: Auth refuses to invite it again until this is cleared. An
        -- account that has a password is left exactly as it is.
        email_confirmed_at = case when v_had_pw then email_confirmed_at else null end,
        encrypted_password = case when v_force_passwordless then null else encrypted_password end,
        invited_at   = case when v_had_pw then invited_at else now() end,
        -- The most common cause of an account that exists but cannot sign in.
        confirmation_token     = coalesce(confirmation_token, ''),
        recovery_token         = coalesce(recovery_token, ''),
        email_change_token_new = coalesce(email_change_token_new, ''),
        email_change           = coalesce(email_change, ''),
        updated_at   = now()
    where id = v_user_id;
    if v_force_passwordless then
      v_had_pw := false;
      v_note := 'repaired; password removed as requested';
    else
      v_note := coalesce(nullif(v_note, ''), 'repaired');
    end if;
  end if;

  -- ------------------------------------------------------------- deactivate --
  if v_action = 'deactivate' then
    update public.profiles set is_active = false, updated_at = now() where id = v_user_id;
    delete from public.staff_email_2fa_sessions where user_id = v_user_id;
    delete from auth.sessions where user_id = v_user_id;
    delete from auth.refresh_tokens where user_id = v_user_id::text;
    raise notice '% deactivated. Every sign-in is now blocked; the record is kept.', v_email;
    return;
  end if;

  -- --------------------------------------------------------------- username --
  select username into v_username from public.profiles where id = v_user_id;
  if v_username is null then
    -- campgrids.accounts requires ^[a-z0-9]{2,80}$, so the same shape is produced
    -- here rather than something that only works on Supabase.
    v_base := lower(left(regexp_replace(v_first, '[^a-zA-Z0-9]', '', 'g'), 1)
                 || regexp_replace(v_last, '[^a-zA-Z0-9]', '', 'g'));
    if char_length(v_base) < 2 then v_base := 'admin'; end if;
    v_base := left(v_base, 78);
    v_username := v_base;
    while exists (select 1 from public.profiles where username = v_username and id <> v_user_id) loop
      v_suffix := v_suffix + 1;
      v_username := v_base || v_suffix::text;
    end loop;
  end if;

  -- ---------------------------------------------------------------- profile --
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

  /* must_change_password is what forces the set-password step and what keeps
     is_staff_2fa_verified() false until it is done. An account that now has a
     password has nothing left to set, so leaving this true would send the person
     into a setup flow they have already completed. */
  update public.profiles
  set must_change_password         = not v_had_pw,
      temporary_password_issued_at = null,
      password_invite_sent_at      = case when v_had_pw then password_invite_sent_at else null end
  where id = v_user_id;

  delete from public.student_profiles where user_id = v_user_id;

  insert into public.admin_profiles (user_id, department)
  values (v_user_id, v_department)
  on conflict (user_id) do update set department = excluded.department;

  -- Any session opened before this ran predates the change and is not trustworthy.
  delete from public.staff_email_2fa_sessions where user_id = v_user_id;
  delete from public.staff_email_2fa_challenges where user_id = v_user_id;
  delete from auth.sessions where user_id = v_user_id;
  delete from auth.refresh_tokens where user_id = v_user_id::text;

  /* Recorded in the shape campgrids.account_audit_events accepts, so the history
     survives the move to RDS: event_type matches ^[a-z][a-z0-9_]{2,80}$ and
     entity_id is the account the event is about. */
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (null,
          'admin_account_' || v_action,
          'admin',
          v_user_id,
          jsonb_build_object('email', v_email, 'created', v_created,
                             'password_set', v_password <> '', 'note', v_note));

  raise notice '% -> % (%), username %', v_email, v_action, v_note, v_username;
end $$;

-- ============================================================================
-- The report. Read this rather than the notices above.
--
--   sign_in_ready   everything the portal checks before it will let them in
--   next_step       what to do now, in words
--   portability     whether the row would load into campgrids.accounts as-is
-- ============================================================================

with target as (select lower(btrim('dnadar@hawk.illinoistech.edu')) as email)  -- keep in step with v_email
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
   and u.encrypted_password is not null
   and u.encrypted_password <> '')                         as sign_in_ready,
  case
    when p.id is null
      then 'No profile. Run this file with v_action = create.'
    when p.role <> 'admin'
      then 'Not an administrator. Run with v_action = create to promote.'
    when not p.is_active
      then 'Deactivated. Run with v_action = repair.'
    when a.user_id is null
      then 'Missing admin_profiles row. Run with v_action = repair.'
    when u.encrypted_password is null or u.encrypted_password = ''
      then 'No password. Either send the set-password email (People -> Resend invite), or run this file with v_action = password and v_password set.'
    when p.must_change_password
      then 'Has a password but is still flagged for setup, so sign-in is blocked. Run with v_action = repair.'
    when u.banned_until is not null and u.banned_until > now()
      then 'Banned in Supabase Auth until ' || u.banned_until::text || '. Run with v_action = repair.'
    when u.confirmation_token is null or u.recovery_token is null
      or u.email_change_token_new is null or u.email_change is null
      then 'Auth cannot read this row: NULL token columns from a hand-written insert. Every sign-in answers 500 regardless of the password. Run with v_action = repair.'
    else 'Ready. Sign in at /admin/, then enter the emailed verification code.'
  end                                                      as next_step,
  case
    when p.id is null then 'n/a'
    when p.email is null then 'BLOCKED: campgrids.accounts requires an email on every non-student'
    when p.username is null or p.username::text !~ '^[a-z0-9]{2,80}$'
      then 'BLOCKED: username must match ^[a-z0-9]{2,80}$'
    else 'loads into campgrids.accounts as-is'
  end                                                      as portability
from target t
left join public.profiles p on lower(p.email::text) = t.email
left join auth.users u on u.id = p.id
left join public.admin_profiles a on a.user_id = p.id;
