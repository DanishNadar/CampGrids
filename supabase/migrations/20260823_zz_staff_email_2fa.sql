-- Replace the retired phone flow with password + emailed-code verification for
-- every staff account. Students remain passwordless and cannot use staff data.
-- Run this migration after the earlier 20260823 phone migrations.

-- Remove functions that depend on the retired phone tables before dropping
-- them. `is_admin` is replaced immediately below with the email-verified rule.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select false
$$;

drop function if exists public.activate_admin_phone_login();
drop function if exists public.assert_allowed_admin_mfa_phone(text);
drop table if exists public.admin_phone_login_sessions;
drop table if exists public.admin_mfa_phone_allowlist;

create table if not exists public.staff_email_2fa_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  password_session_id uuid not null,
  ticket_hash text not null unique check (ticket_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.staff_email_2fa_sessions (
  session_id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  email citext not null,
  verified_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists staff_email_2fa_challenges_user_idx
  on public.staff_email_2fa_challenges(user_id, expires_at desc);
create index if not exists staff_email_2fa_sessions_user_idx
  on public.staff_email_2fa_sessions(user_id, expires_at desc);

alter table public.staff_email_2fa_challenges enable row level security;
alter table public.staff_email_2fa_sessions enable row level security;

-- First half: only a valid password session for an active teacher/admin can
-- generate a random, ten-minute ticket. Only the ticket hash is persisted.
create or replace function public.begin_staff_email_2fa()
returns table (email text, ticket text)
language plpgsql security definer set search_path = public, extensions as $$
declare
  session_value uuid;
  email_value text;
  ticket_value text;
begin
  if auth.uid() is null then raise exception 'Sign in with your password first'; end if;
  if coalesce(auth.jwt() ->> 'session_id', '') !~ '^[0-9a-fA-F-]{36}$' then
    raise exception 'The authentication session is invalid';
  end if;
  if not exists (
    select 1 from jsonb_array_elements(coalesce(auth.jwt() -> 'amr', '[]'::jsonb)) as method
    where method ->> 'method' = 'password'
  ) then
    raise exception 'Sign in with your password before requesting an email code';
  end if;
  session_value := (auth.jwt() ->> 'session_id')::uuid;
  select p.email::text into email_value
  from public.profiles p
  where p.id = auth.uid() and p.role in ('teacher', 'admin') and p.is_active;
  if email_value is null then
    raise exception 'An active teacher or MSI administrator account with an email address is required';
  end if;

  delete from public.staff_email_2fa_challenges
  where expires_at <= now()
     or (user_id = auth.uid() and password_session_id = session_value and consumed_at is null);
  ticket_value := encode(gen_random_bytes(32), 'hex');
  insert into public.staff_email_2fa_challenges (user_id, password_session_id, ticket_hash, expires_at)
  values (auth.uid(), session_value, encode(digest(ticket_value, 'sha256'), 'hex'), now() + interval '10 minutes');
  return query select email_value, ticket_value;
end;
$$;

-- Second half: an email OTP creates a new Supabase session. The ticket binds
-- that OTP session to the password session that requested the code.
create or replace function public.complete_staff_email_2fa(p_ticket text)
returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare
  session_value uuid;
  email_value text;
begin
  if auth.uid() is null then raise exception 'A verified email session is required'; end if;
  if coalesce(auth.jwt() ->> 'session_id', '') !~ '^[0-9a-fA-F-]{36}$' then
    raise exception 'The authentication session is invalid';
  end if;
  if coalesce(auth.jwt() ->> 'email', '') = '' then raise exception 'The verified email is missing'; end if;
  if not exists (
    select 1 from jsonb_array_elements(coalesce(auth.jwt() -> 'amr', '[]'::jsonb)) as method
    where method ->> 'method' = 'otp'
  ) then
    raise exception 'Open the verification link sent to your email';
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
  values (session_value, auth.uid(), email_value, now() + interval '8 hours')
  on conflict (session_id) do update
  set user_id = excluded.user_id,
      email = excluded.email,
      verified_at = now(),
      expires_at = excluded.expires_at;
  return true;
end;
$$;

create or replace function public.is_staff_2fa_verified()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(exists (
    select 1
    from public.profiles p
    join public.staff_email_2fa_sessions s on s.user_id = p.id
    where p.id = auth.uid()
      and p.role in ('teacher', 'admin')
      and p.is_active
      and s.session_id::text = coalesce(auth.jwt() ->> 'session_id', '')
      and lower(s.email::text) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and s.expires_at > now()
  ), false)
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin' and p.is_active
  ) and public.is_staff_2fa_verified(), false)
$$;

create or replace function public.is_teacher_of(p_class_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    public.is_admin() or (
      public.is_staff_2fa_verified() and exists (
        select 1 from public.classes c
        left join public.class_teachers ct on ct.class_id = c.id
        where c.id = p_class_id and (c.owner_id = auth.uid() or ct.teacher_id = auth.uid())
      )
    ), false
  )
$$;

create or replace function public.create_class(
  p_name text,
  p_starts_on date default null,
  p_ends_on date default null,
  p_notes text default null
)
returns table (
  id uuid,
  code varchar,
  name text,
  status public.class_status,
  starts_on date,
  ends_on date,
  notes text,
  created_at timestamptz
)
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not (
    (public.current_role() = 'teacher' and public.is_staff_2fa_verified())
    or public.is_admin()
  ) then
    raise exception 'An active teacher or MSI administrator account with email verification is required to create a class';
  end if;
  if nullif(trim(p_name), '') is null then raise exception 'A class name is required'; end if;
  if p_ends_on is not null and p_starts_on is not null and p_ends_on < p_starts_on then
    raise exception 'The class end date must be on or after the start date';
  end if;
  return query
  insert into public.classes (name, owner_id, status, starts_on, ends_on, notes)
  values (trim(p_name), auth.uid(), 'active', p_starts_on, p_ends_on, nullif(trim(p_notes), ''))
  returning classes.id, classes.code, classes.name, classes.status, classes.starts_on, classes.ends_on, classes.notes, classes.created_at;
end;
$$;

create or replace function public.record_audit_event(
  p_action text, p_entity_type text, p_entity_id uuid default null, p_metadata jsonb default '{}'::jsonb
)
returns bigint language plpgsql security definer set search_path = public as $$
declare audit_id bigint;
begin
  if not public.is_staff_2fa_verified() then
    raise exception 'Only email-verified teachers and MSI administrators can record an audit event';
  end if;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, coalesce(p_metadata, '{}'::jsonb))
  returning id into audit_id;
  return audit_id;
end;
$$;

drop policy if exists "classes: teachers create" on public.classes;
create policy "classes: teachers create" on public.classes for insert with check (
  owner_id = auth.uid()
  and ((public.current_role() = 'teacher' and public.is_staff_2fa_verified()) or public.is_admin())
);

revoke all on function public.begin_staff_email_2fa(), public.complete_staff_email_2fa(text) from public, anon;
grant execute on function public.begin_staff_email_2fa(), public.complete_staff_email_2fa(text), public.is_staff_2fa_verified() to authenticated;
