-- Finishing setup is not reusing a password.
--
-- temporary_password_reuse_grace() answers one question: may this temporary
-- password start another sign-in? It was also being used to answer a different
-- one - may this session still finish choosing a password? - and those are not
-- the same thing.
--
-- The consequence was worst at the setting that should have been safest. With the
-- grace at zero, meaning "one sign-in only", begin_password_setup() stamps
-- first_used_at at sign-in and complete_password_setup() then refused every
-- submission a second later:
--
--     This temporary password was used more than 00:00:00 ago and no longer works.
--
-- so the account could never be activated at all. Even at fifteen minutes it meant
-- someone who took longer than that to choose a password was sent back to the start.
--
-- By the time this function runs the person has signed in with the temporary
-- password and confirmed a code sent to their mailbox. Nothing is gained by also
-- holding them to a deadline meant for a different purpose. The two checks that do
-- belong here stay: the outer window in which an issued password is usable at all,
-- and the emailed code.

create or replace function public.complete_password_setup()
returns boolean language plpgsql security definer set search_path = public as $$
declare
  changed boolean := false;
  issued_at timestamptz;
  window_hours integer := greatest(1, (extract(epoch from public.admin_password_setup_window()) / 3600)::integer);
begin
  if auth.uid() is null then
    raise exception 'Sign in before completing password setup';
  end if;

  select p.temporary_password_issued_at into issued_at
  from public.profiles p where p.id = auth.uid();

  if issued_at is not null then
    /* The outer window. Stated in hours because an interval renders as 72:00:00,
       which reads like a clock time rather than a duration. */
    if issued_at < now() - public.admin_password_setup_window() then
      raise exception
        'This password was issued more than % hours ago and can no longer be used to set up the account. Use the set-password link on the sign-in page.',
        window_hours;
    end if;

    /* The emailed code. An issued password is known to whoever issued it, so
       replacing it has to prove more than possession of that password. Matched to
       the account rather than one session id, because updating a password can
       rotate the session. */
    if not exists (
      select 1 from public.staff_email_2fa_sessions s
      where s.user_id = auth.uid()
        and lower(s.email::text) = lower(coalesce(auth.jwt() ->> 'email', ''))
        and s.verified_at > now() - public.staff_session_limit()
    ) then
      raise exception
        'Confirm the verification code sent to your MSI email before choosing a password.';
    end if;

    /* Deliberately no reuse-grace check. That grace governs whether the temporary
       password may open another sign-in, which begin_password_setup() enforces at
       the door. Applying it here locked people out of the session they were
       already in. */
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

comment on function public.complete_password_setup() is
  'Finishes a password change for the signed-in account. Gated by the issue window '
  'and the emailed code, never by the reuse grace: that governs starting another '
  'sign-in, not finishing the one already in progress.';

notify pgrst, 'reload schema';
