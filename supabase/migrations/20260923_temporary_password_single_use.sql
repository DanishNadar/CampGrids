-- A temporary password is usable once.
--
-- Until now an IT-issued password kept working for its whole 72-hour window. Sign
-- in, close the tab without choosing a password, come back, and the same password
-- let you straight back to the verification step - as many times as you liked.
--
-- That is the wrong shape for a credential someone else chose and sent to you. It
-- is a shared secret from the moment it is issued, and every reuse is another
-- chance for whoever else saw it. "Must change on first sign-in" should mean the
-- password stops working after that sign-in, not that a change is merely requested.
--
-- What this does not change: the temporary password never granted data access.
-- must_change_password keeps is_staff_2fa_verified() false, and every sign-in still
-- needs a fresh emailed code. So the old behaviour was untidy rather than a breach.
-- It is closed anyway, because a secret with a 72-hour life and unlimited uses has
-- no reason to exist when a 15-minute single use does the same job.

-- ---------------------------------------------------------------------------
-- 1. When first use happened
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists temporary_password_first_used_at timestamptz;

comment on column public.profiles.temporary_password_first_used_at is
  'When an IT-issued password was first used to sign in. After the reuse grace it '
  'stops working, whatever the outer issue window says.';

/* How long after first use the issued password keeps working. This exists so a
   dropped connection or a closed tab does not immediately need a new credential;
   set it to zero for strictly one sign-in. It is deliberately far shorter than
   admin_password_setup_window(), which governs a password nobody has touched. */
create or replace function public.temporary_password_reuse_grace()
returns interval language sql immutable set search_path = public as $$
  select interval '15 minutes'
$$;

-- ---------------------------------------------------------------------------
-- 2. Starting setup, which is what consumes the password
--
--    Separate from my_password_state(), which stays read-only: the password-change
--    page calls that one and must not mark anything as used by rendering itself.
--    Only the two sign-in paths call this.
-- ---------------------------------------------------------------------------

create or replace function public.begin_password_setup()
returns table (change_required boolean, blocked boolean, reason text)
language plpgsql security definer set search_path = public, auth as $$
declare
  p record;
  deadline timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Sign in before starting password setup';
  end if;

  select pr.must_change_password, pr.temporary_password_issued_at, pr.temporary_password_first_used_at
    into p
  from public.profiles pr where pr.id = auth.uid();

  if p is null or not p.must_change_password then
    return query select false, false, null::text;
    return;
  end if;

  /* An invited account has no issued password: it arrived through a link sent to
     its own mailbox and sets a password from there. Nothing to consume. */
  if p.temporary_password_issued_at is null then
    return query select true, false, null::text;
    return;
  end if;

  if p.temporary_password_issued_at < now() - public.admin_password_setup_window() then
    perform public.retire_temporary_password(auth.uid());
    return query select true, true,
      'This temporary password has expired. Use the set-password link on the sign-in page to choose your own.'::text;
    return;
  end if;

  if p.temporary_password_first_used_at is null then
    -- First use. From here the clock runs and the password is on its way out.
    update public.profiles
    set temporary_password_first_used_at = now()
    where id = auth.uid();
    return query select true, false, null::text;
    return;
  end if;

  deadline := p.temporary_password_first_used_at + public.temporary_password_reuse_grace();
  if now() > deadline then
    perform public.retire_temporary_password(auth.uid());
    return query select true, true,
      'This temporary password has already been used and no longer works. Use the set-password link on the sign-in page to choose your own.'::text;
    return;
  end if;

  return query select true, false, null::text;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Retiring it for real
--
--    Refusing in the browser alone would leave the credential live in Auth, so the
--    refusal would be a suggestion. This removes it. The account stays intact and
--    is recovered by the set-password email, which needs no administrator.
-- ---------------------------------------------------------------------------

create or replace function public.retire_temporary_password(p_user_id uuid)
returns boolean language plpgsql security definer set search_path = public, auth as $$
begin
  -- Only ever a password that is still pending replacement; never a real one.
  if not exists (
    select 1 from public.profiles
    where id = p_user_id and must_change_password and temporary_password_issued_at is not null
  ) then
    return false;
  end if;

  update auth.users set encrypted_password = null, updated_at = now() where id = p_user_id;
  update public.profiles
  set temporary_password_issued_at = null, temporary_password_first_used_at = null
  where id = p_user_id;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (p_user_id, 'temporary_password_retired', 'admin', p_user_id,
          jsonb_build_object('at', now()));
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. The same limit at the point the password is actually replaced
--
--    begin_password_setup() runs at sign-in; this runs at the end. Checking both
--    means a page left open past the grace cannot still complete.
-- ---------------------------------------------------------------------------

create or replace function public.complete_password_setup()
returns boolean language plpgsql security definer set search_path = public as $$
declare
  changed boolean := false;
  issued_at timestamptz;
  first_used_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Sign in before completing password setup';
  end if;

  select p.temporary_password_issued_at, p.temporary_password_first_used_at
    into issued_at, first_used_at
  from public.profiles p where p.id = auth.uid();

  if issued_at is not null then
    if issued_at < now() - public.admin_password_setup_window() then
      raise exception
        'This password was issued more than % ago and can no longer be used to set up the account. Use the set-password link on the sign-in page.',
        public.admin_password_setup_window();
    end if;
    if first_used_at is not null
       and now() > first_used_at + public.temporary_password_reuse_grace() then
      raise exception
        'This temporary password was used more than % ago and no longer works. Use the set-password link on the sign-in page.',
        public.temporary_password_reuse_grace();
    end if;

    /* An issued password is a shared secret until it is replaced, so replacing it
       has to prove more than possession of that secret. Matched to the account
       rather than one session id, because updating a password can rotate the
       session and the point is that a code reached this mailbox recently. */
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
  set must_change_password = false,
      temporary_password_issued_at = null,
      temporary_password_first_used_at = null
  where id = auth.uid() and must_change_password;
  changed := found;

  update public.teacher_profiles
  set must_change_password = false, temporary_password_issued_at = null
  where user_id = auth.uid() and must_change_password;

  return changed;
end;
$$;

-- my_password_state() stays read-only, and now reports the deadline so the
-- password-change page can say how long is left rather than failing at the end.
-- Dropped first because the extra output columns change its return type, which
-- create or replace cannot do.
drop function if exists public.my_password_state();
create function public.my_password_state()
returns table (
  change_required boolean,
  issued_at timestamptz,
  account_role public.user_role,
  first_used_at timestamptz,
  setup_deadline timestamptz
)
language sql stable security definer set search_path = public as $$
  select p.must_change_password, p.temporary_password_issued_at, p.role,
         p.temporary_password_first_used_at,
         case
           when p.temporary_password_issued_at is null then null
           when p.temporary_password_first_used_at is null
             then p.temporary_password_issued_at + public.admin_password_setup_window()
           else least(
             p.temporary_password_issued_at + public.admin_password_setup_window(),
             p.temporary_password_first_used_at + public.temporary_password_reuse_grace())
         end
  from public.profiles p where p.id = auth.uid()
$$;

grant execute on function public.temporary_password_reuse_grace() to authenticated;
grant execute on function public.begin_password_setup() to authenticated;
grant execute on function public.my_password_state() to authenticated;
-- Retiring is reached through begin_password_setup(); nothing calls it directly
-- from a browser, so it is not granted to a browser role.
revoke execute on function public.retire_temporary_password(uuid) from public;
revoke execute on function public.retire_temporary_password(uuid) from anon;
revoke execute on function public.retire_temporary_password(uuid) from authenticated;

notify pgrst, 'reload schema';
