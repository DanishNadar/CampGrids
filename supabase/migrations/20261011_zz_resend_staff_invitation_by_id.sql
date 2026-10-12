-- The staff card is built from profiles.  Pass that stable profile id to the
-- resend function, rather than relying on a second exact-email lookup that can
-- fail for a legitimate pending account.
drop function if exists public.staff_awaiting_password();

create function public.staff_awaiting_password()
returns table (
  account_id uuid,
  account_email text,
  account_username text,
  account_role public.user_role,
  full_name text,
  invite_sent_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select p.id, p.email::text, p.username::text, p.role,
         (p.first_name || ' ' || p.last_name),
         p.password_invite_sent_at
  from public.profiles p
  where public.is_admin()
    and p.role in ('teacher', 'admin')
    and p.must_change_password
  order by p.password_invite_sent_at nulls first, p.last_name
$$;

grant execute on function public.staff_awaiting_password() to authenticated;
notify pgrst, 'reload schema';
