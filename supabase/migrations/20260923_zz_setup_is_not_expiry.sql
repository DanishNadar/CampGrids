-- Being mid-password-setup is not an expired session.
--
-- is_staff_2fa_verified() answers false for two unrelated reasons: the ten-hour
-- identification has lapsed, or the account still has a password to choose. The
-- navigation treated both as "expired" and signed the person out - on every page,
-- because site.js personalises the navigation everywhere.
--
-- So anyone activating an account was signed out while typing their new password,
-- and saving it failed with "Auth session missing!". That covered every first-time
-- route: an IT-issued password on settings.html, an invited teacher on
-- account-setup.html, and a recovery on reset-password.html.
--
-- The database is the only place that knows which of the two it is, so it now says.

drop function if exists public.staff_session_state();
create function public.staff_session_state()
returns table (
  is_staff boolean,
  verified boolean,
  password_setup_pending boolean,
  verified_at timestamptz,
  expires_at timestamptz,
  seconds_remaining integer
)
language sql stable security definer set search_path = public as $$
  select
    coalesce(p.role in ('teacher', 'admin'), false),
    public.is_staff_2fa_verified(),
    /* True while a password is still to be chosen. The caller must leave the
       session alone in that case: it is a step that has not finished, not an
       identification that has run out. */
    coalesce(p.must_change_password, false)
      or coalesce((select tp.must_change_password from public.teacher_profiles tp where tp.user_id = p.id), false),
    s.verified_at,
    least(s.expires_at, s.verified_at + public.staff_session_limit()),
    greatest(0, extract(epoch from
      least(s.expires_at, s.verified_at + public.staff_session_limit()) - now()
    )::integer)
  from public.profiles p
  left join public.staff_email_2fa_sessions s
    on s.user_id = p.id
   and s.session_id::text = coalesce(auth.jwt() ->> 'session_id', '')
  where p.id = auth.uid()
$$;

comment on function public.staff_session_state() is
  'Whether a staff session still stands, and whether a password is still being set. '
  'A caller must not end a session merely because verified is false: check '
  'password_setup_pending first, or it will sign people out mid-activation.';

grant execute on function public.staff_session_state() to authenticated;

notify pgrst, 'reload schema';
