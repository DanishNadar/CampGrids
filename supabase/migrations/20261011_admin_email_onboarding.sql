-- Email-backed administrator onboarding.
--
-- The IT provisioning command sends an administrator a one-time Supabase recovery
-- link in a Gmail message that also contains the temporary credentials requested
-- for the live demo. The link proves mailbox control; its independent, hashed
-- onboarding nonce prevents a holder of only the temporary password from using
-- the recovery page to bypass the normal email-code check.

alter table public.profiles
  add column if not exists admin_onboarding_verified_at timestamptz;

create table if not exists public.admin_onboarding_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.admin_onboarding_tokens enable row level security;

comment on table public.admin_onboarding_tokens is
  'Hashes of opaque administrator-onboarding nonces. The plaintext appears only in '
  'the one-time recovery link sent by the provisioning command.';

create index if not exists admin_onboarding_tokens_user_pending_idx
  on public.admin_onboarding_tokens (user_id, expires_at)
  where used_at is null;

-- The recovery link plus the nonce above is equivalent to the mailbox proof made
-- by an invitation link. It is an alternative to (not a weakening of) the normal
-- email-code requirement for an IT-issued temporary password.
create or replace function public.complete_password_setup()
returns boolean language plpgsql security definer set search_path = public as $$
declare
  changed boolean := false;
  issued_at timestamptz;
  onboarding_verified_at timestamptz;
  window_hours integer := greatest(1, (extract(epoch from public.admin_password_setup_window()) / 3600)::integer);
begin
  if auth.uid() is null then
    raise exception 'Sign in before completing password setup';
  end if;

  select p.temporary_password_issued_at, p.admin_onboarding_verified_at
    into issued_at, onboarding_verified_at
  from public.profiles p where p.id = auth.uid();

  if issued_at is not null then
    if issued_at < now() - public.admin_password_setup_window() then
      raise exception
        'This password was issued more than % hours ago and can no longer be used to set up the account. Ask IT for a new one.',
        window_hours;
    end if;

    if onboarding_verified_at is null
       or onboarding_verified_at < now() - interval '30 minutes' then
      if not exists (
        select 1 from public.staff_email_2fa_sessions s
        where s.user_id = auth.uid()
          and lower(s.email::text) = lower(coalesce(auth.jwt() ->> 'email', ''))
          and s.verified_at > now() - public.staff_session_limit()
      ) then
        raise exception
          'Open the one-time administrator onboarding link, or confirm the verification code sent to your MSI email before choosing a password.';
      end if;
    end if;
  end if;

  perform set_config('app.teacher_password_setup', 'true', true);

  update public.profiles
  set must_change_password = false,
      temporary_password_issued_at = null,
      temporary_password_first_used_at = null,
      admin_onboarding_verified_at = null
  where id = auth.uid() and must_change_password;
  changed := found;

  update public.teacher_profiles
  set must_change_password = false, temporary_password_issued_at = null
  where user_id = auth.uid() and must_change_password;

  return changed;
end;
$$;

notify pgrst, 'reload schema';
