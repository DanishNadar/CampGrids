-- A hard ten-hour limit on a verified staff session.
--
-- Two things were wrong. The session was issued for eight hours, not ten. And the
-- limit was carried only by staff_email_2fa_sessions.expires_at, a value written
-- once at verification time - so a row created under an older, longer expiry stayed
-- honoured for as long as that row said, and nothing re-checked the age of the
-- verification itself.
--
-- verified_at is now the authority. expires_at is still written and still checked,
-- but a session older than the limit is refused whatever that column says, so the
-- cap cannot be outlived by a stale row and changing it takes effect immediately
-- for sessions already open.

-- ---------------------------------------------------------------------------
-- 1. The limit, in one place
-- ---------------------------------------------------------------------------

create or replace function public.staff_session_limit()
returns interval language sql immutable set search_path = public as $$
  select interval '10 hours'
$$;

comment on function public.staff_session_limit() is
  'How long a staff member stays identified after email two-factor verification. '
  'Changing this takes effect immediately, including for sessions already open.';

-- ---------------------------------------------------------------------------
-- 2. Verification issues a session of exactly that length
--
--    Only the expiry line changes; the checks above it are unchanged from
--    20260823_zz_staff_email_2fa.sql.
-- ---------------------------------------------------------------------------

create or replace function public.verify_staff_email_2fa(p_ticket text)
returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare
  session_value uuid;
  email_value text;
begin
  if auth.uid() is null then
    raise exception 'Sign in before verifying your email';
  end if;
  if p_ticket !~ '^[a-f0-9]{64}$' then raise exception 'The verification request is invalid'; end if;
  session_value := (auth.jwt() ->> 'session_id')::uuid;
  email_value := lower(auth.jwt() ->> 'email');

  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('teacher', 'admin')
      and p.is_active
      and lower(p.email::text) = email_value
  ) then
    raise exception 'This email is not attached to an active staff account';
  end if;

  update public.staff_email_2fa_challenges
  set consumed_at = now()
  where user_id = auth.uid()
    and ticket_hash = encode(digest(p_ticket, 'sha256'), 'hex')
    and expires_at > now()
    and consumed_at is null;
  if not found then raise exception 'This verification request has expired or was already used'; end if;

  delete from public.staff_email_2fa_sessions where expires_at <= now();
  insert into public.staff_email_2fa_sessions (session_id, user_id, email, expires_at)
  values (session_value, auth.uid(), email_value, now() + public.staff_session_limit())
  on conflict (session_id) do update
  set user_id = excluded.user_id,
      email = excluded.email,
      -- Re-verifying restarts the clock, which is the whole point of re-identifying.
      verified_at = now(),
      expires_at = excluded.expires_at;
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. The age of the verification is checked on every call
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
      -- The cap itself, independent of what the row was issued with.
      and s.verified_at > now() - public.staff_session_limit()
  ), false)
$$;

-- ---------------------------------------------------------------------------
-- 4. What the browser needs to know
--
--    The navigation shows a person's name on every page from their Supabase
--    session, which outlives the staff verification. It needs to be able to ask
--    whether the identification still stands, and how long is left, without
--    guessing from a timestamp it would have to be trusted to compare.
-- ---------------------------------------------------------------------------

create or replace function public.staff_session_state()
returns table (
  is_staff boolean,
  verified boolean,
  verified_at timestamptz,
  expires_at timestamptz,
  seconds_remaining integer
)
language sql stable security definer set search_path = public as $$
  select
    coalesce(p.role in ('teacher', 'admin'), false),
    public.is_staff_2fa_verified(),
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

grant execute on function public.staff_session_limit() to authenticated;
grant execute on function public.staff_session_state() to authenticated;

-- Sessions verified longer ago than the limit are already refused by the check
-- above; clearing them keeps the table honest rather than relying on the next
-- verification to sweep them.
delete from public.staff_email_2fa_sessions
where verified_at <= now() - public.staff_session_limit();

notify pgrst, 'reload schema';
