-- Security layer for IT-issued administrator passwords.
--
-- Handing a new administrator a password the IT manager chose introduces a risk
-- the passwordless invite flow did not have: the password is known to someone
-- other than its owner, and it travels by whatever channel IT used.
--
-- The existing protection was only that must_change_password keeps
-- is_staff_2fa_verified() false until the password is replaced. That stops data
-- being read, but it does not stop a takeover. The administrator sign-in ran:
--
--     signInWithPassword  ->  my_password_state  ->  change_required?
--                                                     -> go and set a new password
--
-- Email two-factor came *after* that branch, so anyone holding the issued password
-- could set a new one without ever proving they control the MSI mailbox, and lock
-- the real administrator out of their own account.
--
-- Three things close that, and none of them affect the invited-teacher flow:
--
--   1. complete_password_setup() now requires a recent verified email code, but
--      only for an account whose password was issued by IT. An invited account has
--      temporary_password_issued_at null and reaches the page through an emailed
--      link, which already proves mailbox control.
--   2. An issued password expires. After the window it no longer opens anything,
--      whether or not anyone has used it.
--   3. The password itself is held to a policy, checked in the database so the
--      provisioning script cannot skip it.

-- ---------------------------------------------------------------------------
-- 1. How long an issued password is good for
-- ---------------------------------------------------------------------------

create or replace function public.admin_password_setup_window()
returns interval language sql immutable set search_path = public as $$
  select interval '72 hours'
$$;

comment on function public.admin_password_setup_window() is
  'How long an IT-issued password may be used to complete setup. After this it is '
  'refused and the account needs a fresh one.';

-- ---------------------------------------------------------------------------
-- 2. The password policy, enforced where it cannot be bypassed
--
--    Returns the reason it is unacceptable, or null when it passes. Written as a
--    function so the provisioning script, and anything added later, share one rule.
-- ---------------------------------------------------------------------------

create or replace function public.password_policy_violation(
  p_password text,
  p_email text default null,
  p_first_name text default null,
  p_last_name text default null
)
returns text language plpgsql immutable set search_path = public as $$
declare
  local_part text := split_part(coalesce(p_email, ''), '@', 1);
  lowered text := lower(coalesce(p_password, ''));
begin
  if char_length(coalesce(p_password, '')) < 12 then
    return 'must be at least 12 characters';
  end if;
  if char_length(p_password) > 72 then
    -- bcrypt silently ignores anything past 72 bytes, so a longer password would
    -- not be fully checked at sign-in.
    return 'must be 72 characters or fewer';
  end if;
  if p_password ~ '\s$' or p_password ~ '^\s' then
    return 'must not start or end with a space, which is easily lost in transit';
  end if;
  if lowered !~ '[a-z]' or lowered !~ '[0-9]' then
    return 'must contain at least one letter and one digit';
  end if;
  -- A password built from the person's own details is guessable by anyone who can
  -- read a staff directory.
  if local_part <> '' and char_length(local_part) >= 3 and position(lower(local_part) in lowered) > 0 then
    return 'must not contain the email address';
  end if;
  if coalesce(p_first_name, '') <> '' and char_length(p_first_name) >= 3
     and position(lower(p_first_name) in lowered) > 0 then
    return 'must not contain the first name';
  end if;
  if coalesce(p_last_name, '') <> '' and char_length(p_last_name) >= 3
     and position(lower(p_last_name) in lowered) > 0 then
    return 'must not contain the last name';
  end if;
  if lowered ~ '(password|campgrids|welcome|changeme|letmein|qwerty|msichicago|^msi|123456|admin123)' then
    return 'must not contain an obvious word such as password, welcome, changeme, admin123 or the organisation name';
  end if;
  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Replacing an issued password requires the email code
--
--    Only for accounts IT issued a password to. The invite flow is untouched: it
--    arrives with temporary_password_issued_at null, through a link that was itself
--    sent to the mailbox.
-- ---------------------------------------------------------------------------

create or replace function public.complete_password_setup()
returns boolean language plpgsql security definer set search_path = public as $$
declare
  changed boolean := false;
  issued_at timestamptz;
  account_role public.user_role;
begin
  if auth.uid() is null then
    raise exception 'Sign in before completing password setup';
  end if;

  select p.temporary_password_issued_at, p.role
    into issued_at, account_role
  from public.profiles p where p.id = auth.uid();

  if issued_at is not null then
    -- An issued password is a shared secret until it is replaced, so replacing it
    -- has to prove more than possession of that secret.
    if issued_at < now() - public.admin_password_setup_window() then
      raise exception
        'This password was issued more than % ago and can no longer be used to set up the account. Ask IT for a new one.',
        public.admin_password_setup_window();
    end if;

    /* Checked against the account rather than the current JWT session id:
       updating a password can rotate the session, and the point is that a code
       reached this person's mailbox recently, not which session received it. */
    if not exists (
      select 1 from public.staff_email_2fa_sessions s
      where s.user_id = auth.uid()
        and lower(s.email::text) = lower(coalesce(auth.jwt() ->> 'email', ''))
        and s.verified_at > now() - public.staff_session_limit()
    ) then
      raise exception
        'Confirm the verification code sent to your MSI email before choosing a password.';
    end if;
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

-- ---------------------------------------------------------------------------
-- 4. Expiring issued passwords that were never used
--
--    must_change_password already blocks the data, but the credential itself stays
--    valid until it is removed. This removes it, leaving the account intact and
--    recoverable by the normal set-password email.
-- ---------------------------------------------------------------------------

create or replace function public.expire_stale_issued_passwords()
returns table (account_email text, issued_at timestamptz)
language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then
    raise exception 'Only MSI administrators can expire issued passwords';
  end if;

  return query
  with stale as (
    select p.id, p.email::text as account_email, p.temporary_password_issued_at as issued
    from public.profiles p
    where p.must_change_password
      and p.temporary_password_issued_at is not null
      and p.temporary_password_issued_at < now() - public.admin_password_setup_window()
  ), cleared as (
    update auth.users u
    set encrypted_password = null, updated_at = now()
    from stale where u.id = stale.id
    returning stale.account_email, stale.issued
  )
  select cleared.account_email, cleared.issued from cleared;
end;
$$;

grant execute on function public.admin_password_setup_window() to authenticated;
grant execute on function public.password_policy_violation(text, text, text, text) to authenticated;
grant execute on function public.expire_stale_issued_passwords() to authenticated;

notify pgrst, 'reload schema';
