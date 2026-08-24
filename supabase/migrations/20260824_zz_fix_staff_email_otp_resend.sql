-- Preserve the active CampGrids verification ticket when Supabase Auth rejects
-- a resend during its per-recipient email cooldown. Without this, a teacher or
-- administrator could receive the first code but be unable to use it after
-- pressing "Resend code" too soon.
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

  delete from public.staff_email_2fa_challenges where expires_at <= now();
  ticket_value := encode(gen_random_bytes(32), 'hex');
  insert into public.staff_email_2fa_challenges (user_id, password_session_id, ticket_hash, expires_at)
  values (auth.uid(), session_value, encode(digest(ticket_value, 'sha256'), 'hex'), now() + interval '10 minutes');
  return query select email_value, ticket_value;
end;
$$;
